/* Fixed study plan: subjects take turns from daily_plan.start_date, one item per study day.
   The schedule depends only on config, so ticking a lesson done never moves anything. */
(() => {
'use strict';
const ORDER=['math','science','thai','social','english'];
// Subject settings from the Sheet (แผน-วิชา): [{id, order, weight, note}].
const settings=config=>{const out={};for(const x of (Array.isArray(config.daily_plan?.subjects)?config.daily_plan.subjects:[]))if(x&&typeof x.id==='string')out[x.id]=x;return out;};
function ordered(config){
  const set=settings(config),listed=Object.keys(set).length,base=id=>(ORDER.indexOf(id)<0?99:ORDER.indexOf(id)+1)+(listed?100:0);
  const rank=id=>set[id]&&Number.isFinite(Number(set[id].order))?Number(set[id].order):base(id);
  return [...config.subjects].sort((a,b)=>rank(a.id)-rank(b.id)||ORDER.indexOf(a.id)-ORDER.indexOf(b.id));
}
// Subjects take turns; a subject with weight 2 gets two items per turn.
function queue(config){
  const set=settings(config),lists=ordered(config).map(subject=>({w:Math.max(1,Math.min(3,Math.floor(Number(set[subject.id]?.weight))||1)),items:window.Catalog.items(subject).map(step=>({subject,step}))}));
  const out=[];for(let round=0;lists.some(list=>round*list.w<list.items.length);round++)for(const list of lists)out.push(...list.items.slice(round*list.w,(round+1)*list.w));
  return out;
}
const note=(config,id)=>settings(config)[id]?.note||'';
const dayNumber=date=>Math.round(Date.parse(date+'T00:00:00Z')/86400000);
const isoDay=n=>new Date(n*86400000).toISOString().slice(0,10);
// A period (e.g. school break) can override rest days, slots per day and session length for a date range.
// A day in daily_plan.days (แผน-วันพิเศษ) overrides everything: no slots = day off, remaining items move on.
function rules(plan,date){
  const period=(Array.isArray(plan.periods)?plan.periods:[]).find(p=>p&&p.from<=date&&date<=p.to)||{};
  const pick=(key,fallback)=>period[key]!==undefined?period[key]:plan[key]!==undefined?plan[key]:fallback;
  const perDay=Math.max(1,Math.min(6,Number(plan.items_per_day)||1));
  const weekday=new Date(date+'T00:00:00Z').getUTCDay(),special=period.weekday_slots&&period.weekday_slots[String(weekday)];
  const day=plan.days&&typeof plan.days==='object'&&plan.days[date]&&typeof plan.days[date]==='object'?plan.days[date]:null;
  const slots=day?(Array.isArray(day.slots)?day.slots.slice(0,6):[]):Array.isArray(special)?special.slice(0,6):Array.isArray(period.slots)&&period.slots.length?period.slots.slice(0,6):Array.from({length:perDay},()=>null);
  const rest=pick('rest_weekdays',[0]),off=day?!slots.length:Array.isArray(rest)&&rest.includes(weekday);
  return {period:period.name||null,slots,rest,off,note:day&&typeof day.note==='string'?day.note:'',special:!!day,session:Math.max(5,Math.min(60,Number(pick('session_minutes',20))||20))};
}
// Returns {date:[{subject,step,minutes,slot,period}]} for every planned day, or null when no start date is set.
function schedule(config){
  const plan=config.daily_plan||{},start=plan.start_date;
  if(typeof start!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(start))return null;
  const days={},items=queue(config);let n=dayNumber(start);
  for(let i=0;i<items.length;n++){
    const date=isoDay(n),rule=rules(plan,date);
    if(rule.off){if(n-dayNumber(start)>800)break;continue;}
    days[date]=[];
    for(const slot of rule.slots){if(i>=items.length)break;const {subject,step}=items[i++];days[date].push({subject,step,slot,period:rule.period,minutes:Math.min(rule.session,Number(step.study_minutes)||rule.session)});}
  }
  return days;
}
const slotLabel=slot=>!slot?'':typeof slot==='string'?slot:[slot.time,slot.name].filter(Boolean).join(' ');
// Weekly fixed commitments (e.g. online English class) shown on the calendar from start_date on.
function recurring(plan,date){if(!plan.start_date||date<plan.start_date)return [];const day=new Date(date+'T00:00:00Z').getUTCDay();return (Array.isArray(plan.recurring_events)?plan.recurring_events:[]).filter(e=>Array.isArray(e.weekdays)&&e.weekdays.includes(day));}
// Where each step sits in the plan, and how a subject stands against it today.
function index(days){const out={};for(const date of Object.keys(days||{}))for(const x of days[date])out[x.step.id]={date,slot:x.slot};return out;}
function standing(days,subject,tracker,today){
  let behind=0,ahead=0;
  for(const date of Object.keys(days||{}))for(const x of days[date])if(x.subject.id===subject.id){const done=tracker.has(x.step.id);if(date<today&&!done)behind++;if(date>today&&done)ahead++;}
  return {behind,ahead};
}
window.StudyPlan={ORDER,ordered,queue,schedule,rules,slotLabel,recurring,index,standing,note};
})();

/* Month view of the plan on the dashboard. */
(() => {
'use strict';
let month=null,last=null;
const node=(tag,text,cls)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(cls)e.className=cls;return e;};
const pad=n=>String(n).padStart(2,'0');
function render(config,activities,tracker,groups){
  last=[config,activities,tracker,groups];
  const today=Countdown.today();if(!month)month=today.slice(0,7);
  const [y,m]=month.split('-').map(Number);
  document.getElementById('plan-title').textContent='ปฏิทินแผนการเรียน · '+new Intl.DateTimeFormat('th-TH',{timeZone:'UTC',month:'long',year:'numeric'}).format(new Date(Date.UTC(y,m-1,1)));
  const box=document.getElementById('plan-calendar');box.replaceChildren();
  const plan=StudyPlan.schedule(config);
  if(!plan){box.append(node('p','ยังไม่ได้กำหนดวันเริ่มแผนการเรียน (daily_plan.start_date ใน config)','notice'));return;}
  const regular=config.admissions.programs.find(p=>p.id===config.admissions.primary_program);
  const keyDates={};const mark=(date,label)=>{if(date)(keyDates[date]=keyDates[date]||[]).push(label);};
  mark(regular.pretest_date,'🎯 Pre-Test');mark(tracker.examDate()||regular.exam_date,'🏁 สอบจริง');mark(tracker.resultDate()||regular.pretest_results_date,'📣 ประกาศผล Pre-Test');
  for(const g of groups||[])for(const d of g.dates)mark(d,'📅 '+g.title);
  const grid=node('div',undefined,'month-grid');
  for(const d of ['จ.','อ.','พ.','พฤ.','ศ.','ส.','อา.'])grid.append(node('div',d,'dow'));
  const first=new Date(Date.UTC(y,m-1,1)),offset=(first.getUTCDay()+6)%7,days=new Date(Date.UTC(y,m,0)).getUTCDate();
  for(let i=0;i<offset;i++)grid.append(node('div','','day outside'));
  for(let d=1;d<=days;d++){
    const date=y+'-'+pad(m)+'-'+pad(d),items=plan[date]||[],cell=node('div',undefined,'day'+(date===today?' today':date<today?' past':'')+(!items.length&&!keyDates[date]?' empty':''));
    if(date===today)cell.setAttribute('aria-current','date');
    const num=node('div',undefined,'day-num');num.append(node('span',String(d)+(date===today?' · วันนี้':'')));
    const allDone=items.length&&items.every(x=>tracker.has(x.step.id));if(allDone)num.append(node('span','✓','done-mark'));
    cell.append(num);
    for(const label of keyDates[date]||[])cell.append(node('span',label,'plan-item event'));
    for(const {subject,step,minutes,slot} of items){
      const parent=Catalog.parentOf(subject,step.id),lesson=parent||step;
      const a=node('a',undefined,'plan-item'+(tracker.has(step.id)?' done':step.file?'':' waiting'));a.href='#'+subject.id+'/'+step.id;
      const top=node('span',undefined,'plan-line');if(slot)top.append(node('b',StudyPlan.slotLabel(slot)+' ','slot'));top.append(document.createTextNode(subject.icon+' '+subject.name));
      a.append(top,node('span',parent?lesson.title+' · ข้อสอบ':step.type==='exam'?step.title:step.title,'plan-line'));
      const info=[step.type==='lesson'&&step.chapter_title?step.chapter_title:null,step.file?'~'+minutes+' นาที':'รอเนื้อหา'].filter(Boolean).join(' · ');
      a.append(node('small',info));
      cell.append(a);
    }
    for(const e of StudyPlan.recurring(config.daily_plan||{},date))cell.append(node('span',(e.time?e.time+' ':'')+'🎧 '+e.title,'plan-item class'));
    const rule=StudyPlan.rules(config.daily_plan||{},date);
    const period=(config.daily_plan.periods||[]).find(p=>p.from<=date&&date<=p.to);
    if(rule.note)cell.insertBefore(node('span','📝 '+rule.note,'plan-item note'),cell.children[1]||null);
    if(!items.length&&period&&period.review_label&&!rule.off)cell.insertBefore(node('span',(rule.slots[0]&&rule.slots[0].time?rule.slots[0].time+' ':'')+'🔁 '+period.review_label,'plan-item review'),cell.children[1]||null);
    if(!items.length&&!keyDates[date]&&rule.off)cell.append(node('small',rule.special?'งดเรียนวันนี้ ☁️':'วันพัก ☁️','muted'));
    grid.append(cell);
  }
  box.append(grid);
  const legend=node('div',undefined,'plan-legend');
  for(const p of config.daily_plan.periods||[])if(p.from.slice(0,7)<=month&&month<=p.to.slice(0,7))legend.append(node('span','ช่วง'+p.name+' '+Countdown.label(p.from)+' – '+Countdown.label(p.to)+' · วันละ '+(p.slots||[]).length+' ช่วง'+(p.weekday_slots?' ('+Object.keys(p.weekday_slots).map(k=>['อา.','จ.','อ.','พ.','พฤ.','ศ.','ส.'][k]+' '+p.weekday_slots[k].length).join(' ')+' ช่วง)':''),'period-note'));
  const planDays=Object.keys(plan).sort(),lastDay=planDays[planDays.length-1];
  if(config.daily_plan.finish_before==='pretest'&&lastDay)legend.append(node('span',lastDay<regular.pretest_date?'✅ เรียนครบทุกบทตามแผน '+Countdown.label(lastDay)+' ก่อน Pre-Test':'⚠️ แผนยังจบหลัง Pre-Test ('+Countdown.label(lastDay)+')',lastDay<regular.pretest_date?'period-note ok':'period-note'));
  legend.append(node('span',config.daily_plan.source==='sheet'?'📄 แผนจาก Google Sheet (แท็บ แผน-…)':'แผนตั้งต้นจากเว็บ · แก้ได้ที่ Google Sheet แท็บ แผน-…'));legend.append(node('span','✓ = ทำภารกิจแล้ว'),node('span','กรอบเส้นประ = บทที่ยังรอเนื้อหา'),node('span','แผนคงที่ ไม่เลื่อนตามการติ๊กเรียนจบ'));box.append(legend);
}
function shift(n){if(!month)return;const [y,m]=month.split('-').map(Number),d=new Date(Date.UTC(y,m-1+n,1));month=d.getUTCFullYear()+'-'+pad(d.getUTCMonth()+1);if(last)render(...last);}
document.getElementById('plan-prev')?.addEventListener('click',()=>shift(-1));
document.getElementById('plan-next')?.addEventListener('click',()=>shift(1));
document.getElementById('plan-today')?.addEventListener('click',()=>{month=null;if(last)render(...last);});
window.PlanCalendar={render};
})();
