(() => {
'use strict';
const Catalog=window.Catalog;
// Written for this site (not quotes). One per day, same text all day.
const BOOSTS=[
 'วันนี้ไม่ต้องเก่งทุกอย่าง แค่ลองทีละข้อก็เก่งขึ้นแล้ว',
 'สงสัยตรงไหน ถามได้เลย คำถามคือประตูสู่เรื่องใหม่',
 'ทำผิดไม่เป็นไร เพราะเราเพิ่งรู้ว่าตรงไหนต้องฝึกเพิ่ม',
 'เรียนครบรอบแล้วพักสายตา ลุกยืดตัว แล้วค่อยมาต่อ',
 'ค่อย ๆ อ่านโจทย์ช้า ๆ บางทีคำตอบซ่อนอยู่ในคำถาม',
 'เมื่อวานยาก วันนี้ลองใหม่ อาจง่ายขึ้นกว่าที่คิด',
 'สมองชอบการพักพอ ๆ กับการฝึก อย่าลืมดื่มน้ำนะ',
 'ลองเล่าสิ่งที่เรียนให้คนในบ้านฟัง จะจำได้แม่นขึ้น',
 'ความพยายามวันนี้ คือความมั่นใจของวันสอบ',
 'ถ้าติดอยู่ ลองข้ามไปก่อน แล้วค่อยกลับมาใหม่',
 'ทุกคำถามที่ตอบผิด สอนเรามากกว่าคำถามที่ตอบถูก',
 'เริ่มแค่ 10 นาทีก่อนก็ได้ พอเริ่มแล้วจะไปต่อง่ายขึ้น',
 'วันนี้อยากรู้เรื่องอะไรเป็นพิเศษ ลองจดไว้แล้วไปหาคำตอบกัน',
 'ไม่ต้องรีบ เข้าใจทีละนิดดีกว่าจำทั้งหมดแบบงง ๆ',
 'เหนื่อยก็พักได้ พักแล้วกลับมาใหม่คือความเก่งอีกแบบ',
 'ลองวาดรูปหรือแผนภาพช่วยจำ สมองชอบภาพมาก',
 'ขีดเส้นใต้คำสำคัญในโจทย์ ช่วยให้ไม่พลาดเรื่องเล็ก',
 'ภูมิใจกับตัวเองได้เลย ที่วันนี้เปิดมาเรียนต่อ',
 'อะไรที่ยังไม่เข้าใจ ไม่ได้แปลว่าทำไม่ได้ แค่ยังไม่ถึงเวลา',
 'ลองตั้งคำถามว่า “ทำไม” กับเรื่องที่เรียน แล้วจะสนุกขึ้น',
 'นอนหลับให้พอ สมองจะช่วยเก็บสิ่งที่เรียนไว้ให้เอง',
 'ทำข้อที่มั่นใจก่อน แล้วค่อยกลับมาคิดข้อที่ยาก',
 'วันนี้ลองอธิบายด้วยคำพูดของตัวเองดูนะ',
 'เก่งขึ้นทีละนิดทุกวัน รวมกันแล้วไกลมาก',
 'ผิดซ้ำได้ ลองใหม่ได้ ห้องเรียนนี้ไม่มีใครตัดคะแนน',
 'ฟังคลิปแล้วหยุดคิดตามสักหน่อย ช่วยให้เข้าใจลึกขึ้น',
 'ยิ้มก่อนเริ่มเรียนสักนิด สมองจะพร้อมกว่าเดิม',
 'จดสิ่งที่เรียนได้ 3 ข้อ แค่นี้ก็ถือว่าสำเร็จแล้ว',
 'ความสงสัยเล็ก ๆ วันนี้ อาจกลายเป็นเรื่องโปรดในวันหน้า',
 'เรียนเสร็จแล้วออกไปมองไกล ๆ ให้ตาได้พักบ้าง',
 'วันนี้ทำได้เท่าไหร่ก็เท่านั้น พรุ่งนี้ค่อยต่ออีกนิด'
];
const ORDER=()=>window.StudyPlan?window.StudyPlan.ordered:(c=>c.subjects);
const node=(tag,text,cls)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(cls)e.className=cls;return e;};
const dayIndex=day=>Math.round(Date.parse(day+'T00:00:00Z')/86400000);
function boost(day=Countdown.today()){return BOOSTS[((dayIndex(day)%BOOSTS.length)+BOOSTS.length)%BOOSTS.length];}
function recommendation(config,tracker,day=Countdown.today()){
  const session=Math.max(5,Math.min(30,Number(config.daily_plan?.session_minutes)||20));
  const candidates=config.subjects.map(subject=>{
    const all=Catalog.items(subject),step=all.find(s=>s.file&&!tracker.has(s.id));
    return {subject,step,ratio:all.filter(s=>tracker.has(s.id)).length/all.length};
  }).filter(x=>x.step);
  const rotation=Math.floor(new Date(day+'T00:00:00Z').getTime()/86400000)%config.subjects.length;
  candidates.sort((a,b)=>a.ratio-b.ratio||((config.subjects.indexOf(a.subject)-rotation+config.subjects.length)%config.subjects.length)-((config.subjects.indexOf(b.subject)-rotation+config.subjects.length)%config.subjects.length));
  if(candidates.length){const choice=candidates[0];return {...choice,review:false,minutes:Math.min(session,Number(choice.step.study_minutes)||session)};}
  const subject=config.subjects.find(s=>s.steps.some(step=>step.file&&step.type!=='exam'));
  if(!subject)return null;
  const step=subject.steps.find(s=>s.file&&s.type!=='exam');
  return {subject,step,review:true,minutes:Math.min(session,Number(step.study_minutes)||session)};
}
function subjectTarget(subject,tracker){const all=Catalog.items(subject);return all.find(s=>s.file&&!tracker.has(s.id))||all.find(s=>s.file)||all[0];}
const partName=step=>step.title+': '+(step.chapter_title||'รอชื่อบท');
function counters(container,date){
  container.replaceChildren();
  if(!date){container.append(node('span','รอยืนยันวันที่','counter-state'));return;}
  const left=Countdown.remaining(date);
  if(left.state!=='future'){container.append(node('span',left.state==='today'?'วันนี้แล้ว สู้ ๆ นะ!':'ถึงวันนัดหมายแล้ว','counter-state'));return;}
  for(const [value,label] of [[left.months,'เดือน'],[left.days,'วัน']]){if(!value&&label==='เดือน')continue;const part=node('div','','counter-part');part.append(node('strong',String(value)),node('span',label));container.append(part);}
}
function todayLabel(container){
  const parts=new Intl.DateTimeFormat('th-TH',{timeZone:'Asia/Bangkok',weekday:'long',day:'numeric',month:'long',year:'numeric'}).formatToParts(new Date());
  const get=type=>(parts.find(p=>p.type===type)||{}).value||'';
  container.replaceChildren(node('strong',get('weekday')),document.createTextNode(get('day')+' '+get('month')+' พ.ศ. '+get('year').replace(/\D/g,'')));
}
const shortDate=(date,opts={day:'numeric',month:'short'})=>new Intl.DateTimeFormat('th-TH',{timeZone:'UTC',...opts}).format(new Date(date+'T00:00:00Z'));
// Group events from the same series (id prefix) into one line with a date range.
function eventGroups(activities,from){
  const series=new Map();
  for(const e of activities.events){const key=e.id.includes('-')?e.id.split('-')[0]:e.id;if(!series.has(key))series.set(key,[]);series.get(key).push(e);}
  const out=[];
  for(const events of series.values()){
    const dates=[...new Set(events.map(e=>e.date))].sort();if(dates[dates.length-1]<from)continue;
    const title=events.length>1?(activities.title||events[0].title):events[0].title;
    const first=dates[0],last=dates[dates.length-1];
    const range=first===last?shortDate(first):first.slice(0,7)===last.slice(0,7)?shortDate(first,{day:'numeric'})+'–'+shortDate(last):shortDate(first)+' – '+shortDate(last);
    out.push({title,first,last,range,dates});
  }
  return out.sort((a,b)=>a.first.localeCompare(b.first));
}
function journeyRow(config,subject,tracker){
  const lessons=subject.steps.filter(s=>s.type==='lesson'),done=lessons.filter(s=>tracker.has(s.id)).length;
  const percent=lessons.length?Math.round(done/lessons.length*100):0;
  const row=node('article',undefined,'subject-row'),summary=node('div',undefined,'subject-summary');
  summary.append(node('h3',subject.icon+' '+subject.name));
  const meta=node('div',undefined,'subject-meta');meta.append(node('span','จบ '+done+'/'+lessons.length+' บท'),node('strong',percent+'%'));
  const bar=node('progress');bar.max=lessons.length||1;bar.value=done;bar.setAttribute('aria-label','ความคืบหน้า'+subject.name);
  summary.append(meta,bar);
  const index=lessons.findIndex(s=>!tracker.has(s.id)),current=index<0?null:lessons[index];
  const steps=node('div',undefined,'subject-steps');
  const side=(step,label)=>{if(!step)return node('div','','step-side empty');const a=node('a',undefined,'step-side');a.href='#'+subject.id+'/'+step.id;a.append(document.createTextNode(label),node('strong',partName(step)));return a;};
  const prev=index<0?lessons[lessons.length-1]:index>0?lessons[index-1]:null;
  const shownPrev=prev&&tracker.has(prev.id)?prev:null;if(!shownPrev)steps.classList.add('no-prev');steps.append(side(shownPrev,'✓ เรียนแล้ว'));
  const now=node('div',undefined,'step-now'+(current&&!current.file?' waiting':'')),text=node('div',undefined,'step-now-text');
  if(current){
    text.append(node('span',current.file?'บทที่ควรเรียนต่อ':'บทถัดไป · รอเนื้อหา','label'),node('h4',partName(current)));
    const session=Math.max(5,Math.min(60,Number(config.daily_plan?.session_minutes)||20));
    const time=[current.source_duration_minutes?'คลิป '+current.source_duration_minutes+' นาที':null,'เรียนครั้งละประมาณ '+Math.min(session,Number(current.study_minutes)||session)+' นาที'].filter(Boolean).join(' · ');
    text.append(node('span',time,'time'));now.append(text);
    if(current.file){const go=node('a','เข้าเรียน →','primary');go.href='#'+subject.id+'/'+current.id;now.append(go);}
  }else{text.append(node('span','จบครบทุกบทแล้ว 🎉','label'),node('h4','ทบทวนหรือทำข้อสอบท้ายบทได้เลย'));now.append(text);}
  steps.append(now,side(index>=0?lessons[index+1]:null,'ต่อไป'));
  row.append(summary,steps);return row;
}
// Exam tickets hold personal data: only a link to a private Google Drive file is accepted, never a file in this repo.
function ticketUrl(value){try{const u=new URL(value);return u.protocol==='https:'&&['drive.google.com','docs.google.com'].includes(u.hostname)?u.href:null;}catch(_){return null;}}
function ticket(container,value,show){
  container.replaceChildren();if(!show)return;
  const url=ticketUrl(value);
  if(!url){container.append(node('span','ยังไม่ได้ใส่บัตรสอบ','ticket-missing'));return;}
  const a=node('a','🎫 เปิดบัตรสอบ','ticket-link');a.href=url;a.target='_blank';a.rel='noopener noreferrer';container.append(a);
}
function render(config,activities,tracker){
  const $=id=>document.getElementById(id);
  todayLabel($('today-date'));$('daily-boost').textContent=boost();
  const regular=config.admissions.programs.find(p=>p.id===config.admissions.primary_program);
  const focus=Countdown.milestone(regular,tracker.resultDate());
  $('pretest-title').textContent=focus.phase==='pretest'?'Pre-Test · สนามซ้อม':'ประกาศผล Pre-Test';
  $('pretest-date').textContent=focus.date?Countdown.label(focus.date):'รอยืนยันวันประกาศผล';
  $('pretest-message').textContent=focus.phase==='pretest'?'ลองสนามซ้อม แล้วค่อย ๆ เติมความมั่นใจ':focus.message;
  counters($('pretest-counter'),focus.date);
  const exam=tracker.examDate()||regular.exam_date;
  $('real-exam-date').textContent=Countdown.label(exam);
  counters($('exam-counter'),exam);
  ticket($('pretest-ticket'),regular.pretest_ticket_url,focus.phase==='pretest');
  ticket($('exam-ticket'),regular.exam_ticket_url,true);
  $('result-notice').hidden=true;
  const groups=eventGroups(activities,Countdown.today()),list=$('activity-summary');list.replaceChildren();
  if(!groups.length)list.append(node('li','ยังไม่มีกิจกรรมอื่นตอนนี้','muted'));
  for(const g of groups.slice(0,3)){const li=node('li');li.append(node('span',g.title),node('span',g.range,'when'));list.append(li);}
  const stats=tracker.stats(config);$('overall-caption').textContent='รวมทุกวิชา จบแล้ว '+stats.done+'/'+stats.total+' ภารกิจ';
  $('subject-progress').replaceChildren(...ORDER()(config).map(subject=>journeyRow(config,subject,tracker)));
  MissionCalendar.render($('calendar-events'),activities.events.map(e=>({...e,source_note:e.source_note||activities.source_note})).sort((a,b)=>(a.date+(a.start||'')).localeCompare(b.date+(b.start||''))));
  $('other-schedules').replaceChildren();config.admissions.programs.filter(p=>p.id!==regular.id).forEach(program=>{const row=node('div',undefined,'other-program');row.append(node('h3',program.name),node('p','Pre-Test · '+Countdown.label(program.pretest_date)+' · สอบจริง · '+Countdown.label(program.exam_date)));$('other-schedules').append(row);});
  $('schedule-source').textContent=config.admissions.source_note;
  if(window.PlanCalendar)PlanCalendar.render(config,activities,tracker,groups);
}
window.Dashboard={ticketUrl,recommendation,subjectTarget,render,boost,eventGroups,BOOSTS};
})();
