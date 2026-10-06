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
// A new boost each time the page opens, never the same one twice in a row on this device.
const BOOST_KEY='satit-swu-hub:last-boost';let pickedBoost=null,sheetBoosts=null;
// Messages from the Sheet's กำลังใจ tab: [{text, date?}]. A dated one is shown only that day; the rest rotate. Empty = built-in list.
function setBoosts(list){sheetBoosts=Array.isArray(list)?list.filter(m=>m&&typeof m.text==='string'&&m.text).map(m=>({text:m.text,date:m.date})):null;if(sheetBoosts&&!sheetBoosts.length)sheetBoosts=null;pickedBoost=null;}
function boost(random=Math.random,today=Countdown.today()){
  const dated=sheetBoosts&&sheetBoosts.find(m=>m.date&&m.date===today);if(dated)return dated.text;
  const pool=sheetBoosts&&sheetBoosts.some(m=>!m.date)?sheetBoosts.filter(m=>!m.date).map(m=>m.text):BOOSTS;
  if(pickedBoost!==null&&pickedBoost<pool.length)return pool[pickedBoost];
  let last=-1;try{last=Number(localStorage.getItem(BOOST_KEY));}catch(_){/* no storage */}
  let i=Math.floor(random()*pool.length)%pool.length;if(i===last&&pool.length>1)i=(i+1)%pool.length;
  pickedBoost=i;try{localStorage.setItem(BOOST_KEY,String(i));}catch(_){/* no storage */}
  return pool[i];
}
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
  for(const e of activities.events){const key=e.series?'s:'+e.series:e.id.includes('-')?e.id.split('-')[0]:e.id;if(!series.has(key))series.set(key,[]);series.get(key).push(e);}
  const out=[];
  for(const events of series.values()){
    const dates=[...new Set(events.map(e=>e.date))].sort();if(dates[dates.length-1]<from)continue;
    const title=events.length>1?(events[0].series||activities.title||events[0].title):events[0].title;
    const first=dates[0],last=dates[dates.length-1];
    const range=first===last?shortDate(first):first.slice(0,7)===last.slice(0,7)?shortDate(first,{day:'numeric'})+'–'+shortDate(last):shortDate(first)+' – '+shortDate(last);
    out.push({title,first,last,range,dates});
  }
  return out.sort((a,b)=>a.first.localeCompare(b.first));
}
const shortDay=date=>new Intl.DateTimeFormat('th-TH',{timeZone:'UTC',weekday:'short',day:'numeric',month:'short'}).format(new Date(date+'T00:00:00Z'));
// Plan line for the next lesson: when it is scheduled, or that it is overdue.
function planWhen(at,today){
  if(!at)return null;
  if(at.date<today)return node('span','⚠️ เลยกำหนดตามแผน ('+shortDay(at.date)+')','plan-when late');
  return node('span','📅 ตามแผน: '+(at.date===today?'วันนี้':shortDay(at.date)),'plan-when');
}
function journeyRow(config,subject,tracker,plan){
  const lessons=subject.steps.filter(s=>s.type==='lesson'),done=lessons.filter(s=>tracker.has(s.id)).length;
  const percent=lessons.length?Math.round(done/lessons.length*100):0;
  const row=node('article',undefined,'subject-row'),summary=node('div',undefined,'subject-summary');
  summary.append(node('h3',subject.icon+' '+subject.name));
  const meta=node('div',undefined,'subject-meta');meta.append(node('span','จบ '+done+'/'+lessons.length+' บท'),node('strong',percent+'%'));
  const bar=node('progress');bar.max=lessons.length||1;bar.value=done;bar.setAttribute('aria-label','ความคืบหน้า'+subject.name);
  summary.append(meta,bar);
  if(plan&&plan.days){const {behind,ahead}=StudyPlan.standing(plan.days,subject,tracker,plan.today);
    summary.append(node('span',behind?'⏳ ช้ากว่าแผน '+behind+' ภารกิจ':ahead?'🚀 เร็วกว่าแผน '+ahead+' ภารกิจ':'✅ ตามแผน','plan-status '+(behind?'late':ahead?'ahead':'ok')));}
  const index=lessons.findIndex(s=>!tracker.has(s.id)),current=index<0?null:lessons[index];
  const steps=node('div',undefined,'subject-steps');
  const side=(step,label)=>{if(!step)return node('div','','step-side empty');const a=node('a',undefined,'step-side');a.href='#'+subject.id+'/'+step.id;a.append(document.createTextNode(label),node('strong',partName(step)));return a;};
  const prev=index<0?lessons[lessons.length-1]:index>0?lessons[index-1]:null;
  const shownPrev=prev&&tracker.has(prev.id)?prev:null;if(!shownPrev)steps.classList.add('no-prev');steps.append(side(shownPrev,'✓ เรียนแล้ว'));
  const now=node('div',undefined,'step-now'+(current&&!current.file?' waiting':'')),text=node('div',undefined,'step-now-text');
  if(current){
    text.append(node('span',current.file?'บทที่ควรเรียนต่อ':'บทถัดไป · รอเนื้อหา','label'),node('h4',partName(current)));
    const total=window.StudyPlan?StudyPlan.minutes(current,config.daily_plan||{}):Number(current.study_minutes)||30;
    const time=['ใช้เวลาประมาณ '+total+' นาที',current.source_duration_minutes?'คลิป '+current.source_duration_minutes+' นาที + อ่านสรุป':null].filter(Boolean).join(' · ');
    text.append(node('span',time,'time'));
    const when=plan&&plan.index?planWhen(plan.index[current.id],plan.today):null;if(when)text.append(when);
    now.append(text);
    if(current.file){const go=node('a','เข้าเรียน →','primary');go.href='#'+subject.id+'/'+current.id;now.append(go);}
  }else{text.append(node('span','จบครบทุกบทแล้ว 🎉','label'),node('h4','ทบทวนหรือทำข้อสอบท้ายบทได้เลย'));now.append(text);}
  steps.append(now,side(index>=0?lessons[index+1]:null,'ต่อไป'));
  row.append(summary,steps);
  const message=window.StudyPlan?StudyPlan.note(config,subject.id):'';
  if(message){const box=node('p',undefined,'subject-note');box.append(node('b','💌 พ่อฝาก: '),document.createTextNode(message));row.append(box);}
  return row;
}
// Exam tickets hold personal data: only a link to a private Google Drive file is accepted, never a file in this repo.
function ticketUrl(value){try{const u=new URL(value);return u.protocol==='https:'&&['drive.google.com','docs.google.com'].includes(u.hostname)?u.href:null;}catch(_){return null;}}
const httpsUrl=value=>{try{const u=new URL(value);return u.protocol==='https:'?u.href:null;}catch(_){return null;}};
function ticket(container,value,show){
  container.replaceChildren();if(!show)return;
  const url=ticketUrl(value);
  if(!url){container.append(node('span','ยังไม่ได้ใส่บัตรสอบ','ticket-missing'));return;}
  const a=node('a','🎫 เปิดบัตรสอบ','ticket-link');a.href=url;a.target='_blank';a.rel='noopener noreferrer';container.append(a);
}
function pretestDetails(box,d,subjects,ticketHref,resultsHref){
  box.replaceChildren();
  const head=node('header',undefined,'pd-head');head.append(node('span','รายละเอียดวันสอบ Pre-Test','eyebrow'),node('h2',d.title||'Pre-Test'));if(d.school)head.append(node('p',d.school,'muted'));box.append(head);
  const facts=node('div',undefined,'pd-facts');
  for(const [icon,label,value] of [['📅','วันสอบ',d.date_text&&d.time_text?d.date_text+' · '+d.time_text:d.date_text],['🏫','อาคารสอบ',d.building],['🚪','ห้องสอบ',d.room],['📣','ประกาศผลสอบ',d.results_text]])if(value){const f=node('div',undefined,'pd-fact');f.append(node('span',icon+' '+label,'pd-label'),node('strong',value));facts.append(f);}
  box.append(facts);
  if(Array.isArray(d.schedule)&&d.schedule.length){
    box.append(node('h3','⏰ ตารางสอบ'));const list=node('ol',undefined,'pd-schedule');
    for(const row of d.schedule){const subject=subjects.find(s=>s.id===row.subject_id),li=node('li',undefined,row.break?'pd-break':'');li.append(node('span',row.time,'pd-time'),node('span',(subject?subject.icon+' ':row.break?'🍱 ':'')+row.subject,'pd-subject'),node('span',row.minutes+' นาที','pd-min'));list.append(li);}
    box.append(list);
  }
  const cols=node('div',undefined,'pd-cols');
  const listBox=(title,items,cls)=>{if(!Array.isArray(items)||!items.length)return;const sec=node('section',undefined,'pd-box '+cls);sec.append(node('h3',title));const ul=node('ul');items.forEach(x=>ul.append(node('li',x)));sec.append(ul);cols.append(sec);};
  listBox('🎒 ต้องนำไปด้วย',d.bring,'pd-bring');listBox('💡 ข้อควรรู้',d.notes,'pd-notes');box.append(cols);
  if(d.about||d.eligibility||(Array.isArray(d.awards)&&d.awards.length)){
    const det=node('details',undefined,'pd-travel pd-awards');det.append(node('summary','🏆 เกี่ยวกับโครงการ วิชาที่สอบ และรางวัล'));
    if(d.about)det.append(node('p',d.about));
    if(d.eligibility)det.append(node('p','คุณสมบัติ: '+d.eligibility,'muted'));
    if(Array.isArray(d.subjects)&&d.subjects.length){det.append(node('h4','วิชาที่สอบ'));const ul=node('ul');d.subjects.forEach(x=>ul.append(node('li',x)));det.append(ul);}
    if(Array.isArray(d.awards)&&d.awards.length){det.append(node('h4','รางวัล'));const ul=node('ul',undefined,'pd-award-list');for(const a of d.awards){const li=node('li');li.append(node('strong',a.rank),node('span',' '+a.detail));ul.append(li);}det.append(ul);det.append(node('p','สอบเพื่อดูว่าเราพร้อมแค่ไหน ทำเต็มที่ก็เก่งแล้ว รางวัลเป็นของแถมนะ 😊','pd-cheer'));}
    box.append(det);
  }
  if(Array.isArray(d.travel)&&d.travel.length){const det=node('details',undefined,'pd-travel');det.append(node('summary','🚇 การเดินทางไปสนามสอบ'));const ul=node('ul');for(const t of d.travel){const li=node('li');li.append(node('strong',t.mode),node('span',' '+t.how));ul.append(li);}det.append(ul);box.append(det);}
  const foot=node('div',undefined,'pd-foot');
  const btns=node('div',undefined,'actions');
  if(ticketHref){const a=node('a','🎫 เปิดบัตรสอบจริง','primary');a.href=ticketHref;a.target='_blank';a.rel='noopener noreferrer';btns.append(a);}
  if(resultsHref){const a=node('a','🌐 เว็บไซต์ประกาศผลสอบ','secondary');a.href=resultsHref;a.target='_blank';a.rel='noopener noreferrer';btns.append(a);}
  foot.append(btns);
  if(d.privacy_note)foot.append(node('p','🔒 '+d.privacy_note,'fine-print'));
  if(d.source_note)foot.append(node('p',d.source_note,'fine-print'));
  box.append(foot);
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
  const resultDate=tracker.resultDate()||regular.pretest_results_date,resultsHref=httpsUrl(regular.results_url);
  $('pretest-results').textContent=focus.phase==='pretest'?(resultDate?'📣 ประกาศผล '+Countdown.label(resultDate):'📣 วันประกาศผล: รอยืนยัน'):'';
  ticket($('pretest-ticket'),regular.pretest_ticket_url,focus.phase==='pretest');
  if(focus.phase!=='pretest'&&resultsHref){const a=node('a','🌐 ดูผลสอบที่เว็บโรงเรียน','ticket-link');a.href=resultsHref;a.target='_blank';a.rel='noopener noreferrer';$('pretest-ticket').append(a);}
  const details=regular.pretest_details,more=$('pretest-more'),panel=$('pretest-details');
  more.hidden=!(details&&focus.phase==='pretest');if(more.hidden)panel.hidden=true;
  if(!more.hidden){pretestDetails(panel,details,config.subjects,ticketUrl(regular.pretest_ticket_url),httpsUrl(regular.results_url));if(!more.onclick)more.onclick=()=>{panel.hidden=!panel.hidden;more.setAttribute('aria-expanded',String(!panel.hidden));more.textContent=panel.hidden?'📋 รายละเอียดวันสอบ':'✕ ปิดรายละเอียด';if(!panel.hidden)panel.scrollIntoView({behavior:'smooth',block:'start'});};}
  ticket($('exam-ticket'),regular.exam_ticket_url,true);
  $('result-notice').hidden=true;
  const groups=eventGroups(activities,Countdown.today()),list=$('activity-summary');list.replaceChildren();
  if(!groups.length)list.append(node('li','ยังไม่มีกิจกรรมอื่นตอนนี้','muted'));
  for(const g of groups.slice(0,3)){const li=node('li');li.append(node('span',g.title),node('span',g.range,'when'));list.append(li);}
  const stats=tracker.stats(config);$('overall-caption').textContent='รวมทุกวิชา จบแล้ว '+stats.done+'/'+stats.total+' ภารกิจ';
  const planDays=window.StudyPlan?StudyPlan.schedule(config):null,plan=planDays?{days:planDays,index:StudyPlan.index(planDays),today:Countdown.today()}:null;
  $('subject-progress').replaceChildren(...ORDER()(config).map(subject=>journeyRow(config,subject,tracker,plan)));
  MissionCalendar.render($('calendar-events'),activities.events.map(e=>({...e,source_note:e.source_note||activities.source_note})).sort((a,b)=>(a.date+(a.start||'')).localeCompare(b.date+(b.start||''))));
  $('other-schedules').replaceChildren();config.admissions.programs.filter(p=>p.id!==regular.id).forEach(program=>{const row=node('div',undefined,'other-program');row.append(node('h3',program.name),node('p','Pre-Test · '+Countdown.label(program.pretest_date)+' · สอบจริง · '+Countdown.label(program.exam_date)));$('other-schedules').append(row);});
  $('schedule-source').textContent=config.admissions.source_note;
  if(window.PlanCalendar)PlanCalendar.render(config,activities,tracker,groups);
}
window.Dashboard={ticketUrl,recommendation,subjectTarget,render,boost,setBoosts,eventGroups,BOOSTS};
})();
