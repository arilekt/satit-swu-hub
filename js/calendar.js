(() => {
'use strict';
const escape = value => String(value).replace(/\\/g,'\\\\').replace(/\r?\n/g,'\\n').replace(/;/g,'\\;').replace(/,/g,'\\,');
function fold(line){let result='',bytes=0;for(const char of line){const size=new TextEncoder().encode(char).length;if(bytes+size>75){result+='\r\n ';bytes=1;}result+=char;bytes+=size;}return result;}
const utc = date => date.toISOString().replace(/[-:]/g,'').replace(/\.\d{3}Z$/,'Z');
function ics(events, now=new Date()){
  const lines=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Satit SWU Mission Hub//Calendar//TH','CALSCALE:GREGORIAN','METHOD:PUBLISH'];
  for(const event of events){
    lines.push('BEGIN:VEVENT','UID:'+event.id+'@satit-swu-hub','DTSTAMP:'+utc(now));
    if(event.start){lines.push('DTSTART:'+utc(new Date(event.date+'T'+event.start+':00+07:00')),'DTEND:'+utc(new Date(event.date+'T'+event.end+':00+07:00')));}
    else{const next=new Date(event.date+'T00:00:00Z');next.setUTCDate(next.getUTCDate()+1);lines.push('DTSTART;VALUE=DATE:'+event.date.replace(/-/g,''),'DTEND;VALUE=DATE:'+next.toISOString().slice(0,10).replace(/-/g,''));}
    lines.push('SUMMARY:'+escape(event.title),'DESCRIPTION:'+escape((event.description||'')+'\n'+(event.source_note||'')));
    if(event.location)lines.push('LOCATION:'+escape(event.location));
    lines.push('TRANSP:TRANSPARENT','END:VEVENT');
  }
  lines.push('END:VCALENDAR');return lines.map(fold).join('\r\n')+'\r\n';
}
function download(events){const url=URL.createObjectURL(new Blob([ics(events)],{type:'text/calendar;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='porjai-calendar.ics';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);}
function list(config,activities,tracker){
  const regular=config.admissions.programs.find(p=>p.id===config.admissions.primary_program);
  const result=tracker.resultDate()||regular.pretest_results_date;
  const events=[{id:'regular-pretest',date:regular.pretest_date,title:'พอใจ · Pre-Test ภาคปกติ',description:'ยังไม่ระบุเวลาสอบ · ตรวจประกาศโรงเรียน',source_note:config.admissions.source_note},{id:'regular-exam',date:tracker.examDate()||regular.exam_date,title:'พอใจ · สอบจริงภาคปกติ',description:'ยังไม่ระบุเวลาสอบ · ตรวจประกาศโรงเรียน',source_note:config.admissions.source_note},...activities.events.map(e=>({...e,source_note:e.source_note||activities.source_note}))];
  if(result)events.push({id:'regular-results',date:result,title:'พอใจ · เตือนตรวจผล Pre-Test',description:'ตรวจประกาศโรงเรียน · วันที่จากข้อมูลกลางหรือวันที่คุณพ่อตั้งบนเครื่อง'});
  return events.sort((a,b)=>(a.date+(a.start||'')).localeCompare(b.date+(b.start||'')));
}
function render(container,events){
  const node=(tag,text,cls)=>{const e=document.createElement(tag);e.textContent=text;if(cls)e.className=cls;return e;};
  container.replaceChildren();let previous='';
  for(const event of events){
    if(previous!==event.date){container.append(node('h3',Countdown.label(event.date),'calendar-date'));previous=event.date;}
    const card=node('article','','calendar-event');card.append(node('span',event.start?event.start+'–'+event.end+' น. · onsite':'ทั้งวัน · ยังไม่ระบุเวลา','calendar-time'),node('strong',event.title),node('p',event.location||event.description||''),node('small',event.source_note||''));
    const button=node('button','เพิ่มลงปฏิทิน (.ics)','secondary');button.onclick=()=>download([event]);card.append(button);container.append(card);
  }
}
window.MissionCalendar={ics,list,render,download};
})();