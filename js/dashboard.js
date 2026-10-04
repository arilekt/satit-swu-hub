(() => {
'use strict';
const Catalog=window.Catalog;
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
function counters(container,date){
  container.replaceChildren();
  const node=(tag,text,cls)=>{const e=document.createElement(tag);e.textContent=text;if(cls)e.className=cls;return e;};
  if(!date){container.append(node('span','รอยืนยันวันที่','counter-state'));return;}
  const left=Countdown.remaining(date);
  if(left.state!=='future'){container.append(node('span',left.state==='today'?'วันนี้แล้ว สู้ ๆ นะ!':'ถึงวันนัดหมายแล้ว','counter-state'));return;}
  for(const [value,label] of [[left.months,'เดือน'],[left.days,'วัน']]){const part=node('div','','counter-part');part.append(node('strong',String(value)),node('span',label));container.append(part);}
}
function render(config,activities,tracker){
  const $=id=>document.getElementById(id),node=(tag,text,cls)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(cls)e.className=cls;return e;};
  $('today-date').textContent='📅 วันนี้ '+new Intl.DateTimeFormat('th-TH',{timeZone:'Asia/Bangkok',weekday:'long',day:'numeric',month:'long',year:'numeric'}).format(new Date());
  const regular=config.admissions.programs.find(p=>p.id===config.admissions.primary_program);
  const focus=Countdown.milestone(regular,tracker.resultDate());
  $('pretest-title').textContent=focus.phase==='pretest'?'Pre-Test · สนามซ้อม':'เตือนตรวจผล Pre-Test';
  $('pretest-date').textContent=focus.date?Countdown.label(focus.date)+' · ภาคปกติ':'ยังไม่ทราบวันประกาศผล';
  $('pretest-message').textContent=focus.message||'ลองสนามซ้อม แล้วค่อย ๆ เติมความมั่นใจ';
  counters($('pretest-counter'),focus.date);
  const exam=tracker.examDate()||regular.exam_date;
  $('real-exam-date').textContent=Countdown.label(exam)+' · ประสานมิตร ภาคปกติ';
  counters($('exam-counter'),exam);
  if($('result-notice').textContent!==focus.message)$('result-notice').textContent=focus.message;
  $('result-notice').hidden=!focus.message;
  const stats=tracker.stats(config);$('overall-caption').textContent='จบแล้ว '+stats.done+' / '+stats.total+' ภารกิจ';
  $('subject-progress').replaceChildren();
  config.subjects.forEach(subject=>{
    const all=Catalog.items(subject),done=all.filter(s=>tracker.has(s.id)).length,percent=Math.round(done/all.length*100),ready=all.some(s=>s.file);
    const card=node('a',undefined,'subject-card');card.href='#'+subject.id+'/'+subjectTarget(subject,tracker).id;
    card.append(node('span',subject.icon,'subject-icon'),node('h3',subject.name));
    const meta=node('div',undefined,'subject-meta');meta.append(node('span',done+' / '+all.length+' ภารกิจ'),node('strong',percent+'%'));card.append(meta);
    const progress=node('progress');progress.max=all.length;progress.value=done;progress.setAttribute('aria-label','ความคืบหน้า'+subject.name);card.append(progress,node('span',ready?'เข้าห้องเรียน →':'กำลังเตรียมบทเรียน','subject-state'));$('subject-progress').append(card);
  });
  const choice=recommendation(config,tracker),mission=$('daily-mission');mission.replaceChildren();
  if(choice){
    const card=node('div',undefined,'mission'),content=node('div',undefined,'mission-content');
    content.append(node('span',choice.review?'ทบทวนสิ่งที่เรียนแล้ว':choice.step.type==='exam'?'สนามซ้อมแนะนำวันนี้':'ภารกิจแนะนำวันนี้','mission-number'),node('h3',choice.subject.name+' · '+choice.step.title),node('p','ใช้เวลาประมาณ '+choice.minutes+' นาที'+(choice.review?' · เล่าเรื่องที่จำได้ให้คุณพ่อฟัง':choice.step.type==='exam'?' · ทำข้อสอบ แล้วอ่านเหตุผลของคำตอบ':' · อ่านหรือดูวิดีโอ แล้วจดสิ่งที่จำได้ 3 ข้อ')));
    const action=node('a',choice.review?'ทบทวนกัน →':'เริ่มภารกิจ →','primary');action.href='#'+choice.subject.id+'/'+choice.step.id;card.append(node('span',choice.subject.icon,'mission-icon'),content,action);mission.append(card);
  }else mission.append(node('p','บทเรียนกำลังเตรียม ระหว่างนี้ลองอ่านหนังสือที่ชอบ 15 นาที แล้วเล่าให้คุณพ่อฟัง','notice'));
  const summary=$('activity-summary');summary.replaceChildren();
  const upcoming=activities.events.filter(e=>e.date>=Countdown.today()).sort((a,b)=>a.date.localeCompare(b.date));
  const groups=new Map();for(const e of upcoming){if(!groups.has(e.date))groups.set(e.date,[]);groups.get(e.date).push(e);}
  if(!groups.size)summary.append(node('p','ยังไม่มีวันนัดอื่น ๆ ตอนนี้','muted'));
  let i=0;
  for(const [date,events] of groups){if(i++>=3)break;const row=node('div',undefined,'activity-row'),tile=node('div',undefined,'date-tile'),parts=new Intl.DateTimeFormat('th-TH',{timeZone:'UTC',day:'numeric',month:'short'}).formatToParts(new Date(date+'T00:00:00Z'));tile.append(node('strong',parts.find(p=>p.type==='day').value),node('span',parts.find(p=>p.type==='month').value));const content=node('div');content.append(node('h3',events.length>1?(events.every(e=>e.id.startsWith('fair-'))?'SATIT ACADEMIC FAIR · นิทรรศการและสัมมนา':'วันนัดของเรา · '+events.length+' กิจกรรม'):events[0].title),node('p',Countdown.label(date)));row.append(tile,content);summary.append(row);}
  MissionCalendar.render($('calendar-events'),activities.events.map(e=>({...e,source_note:e.source_note||activities.source_note})).sort((a,b)=>(a.date+(a.start||'')).localeCompare(b.date+(b.start||''))));
  $('other-schedules').replaceChildren();config.admissions.programs.filter(p=>p.id!==regular.id).forEach(program=>{const row=node('div',undefined,'other-program');row.append(node('h3',program.name),node('p','Pre-Test · '+Countdown.label(program.pretest_date)),node('p','สอบจริง · '+Countdown.label(program.exam_date)));$('other-schedules').append(row);});
  $('schedule-source').textContent=config.admissions.source_note;
}
window.Dashboard={recommendation,subjectTarget,render};
})();