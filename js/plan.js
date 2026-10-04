/* Fixed study plan: subjects take turns from daily_plan.start_date, one item per study day.
   The schedule depends only on config, so ticking a lesson done never moves anything. */
(() => {
'use strict';
const ORDER=['math','science','thai','social','english'];
function ordered(config){return [...config.subjects].sort((a,b)=>{const i=ORDER.indexOf(a.id),j=ORDER.indexOf(b.id);return (i<0?99:i)-(j<0?99:j);});}
function queue(config){
  const lists=ordered(config).map(subject=>window.Catalog.items(subject).map(step=>({subject,step})));
  const out=[];for(let round=0;lists.some(list=>round<list.length);round++)for(const list of lists)if(list[round])out.push(list[round]);
  return out;
}
const dayNumber=date=>Math.round(Date.parse(date+'T00:00:00Z')/86400000);
const isoDay=n=>new Date(n*86400000).toISOString().slice(0,10);
// A period (e.g. school break) can override rest days, slots per day and session length for a date range.
function rules(plan,date){
  const period=(Array.isArray(plan.periods)?plan.periods:[]).find(p=>p&&p.from<=date&&date<=p.to)||{};
  const pick=(key,fallback)=>period[key]!==undefined?period[key]:plan[key]!==undefined?plan[key]:fallback;
  const perDay=Math.max(1,Math.min(6,Number(plan.items_per_day)||1));
  const weekday=String(new Date(date+'T00:00:00Z').getUTCDay()),special=period.weekday_slots&&period.weekday_slots[weekday];
  const slots=Array.isArray(special)?special.slice(0,6):Array.isArray(period.slots)&&period.slots.length?period.slots.slice(0,6):Array.from({length:perDay},()=>null);
  return {period:period.name||null,slots,rest:pick('rest_weekdays',[0]),session:Math.max(5,Math.min(60,Number(pick('session_minutes',20))||20))};
}
// Returns {date:[{subject,step,minutes,slot,period}]} for every planned day, or null when no start date is set.
function schedule(config){
  const plan=config.daily_plan||{},start=plan.start_date;
  if(typeof start!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(start))return null;
  const days={},items=queue(config);let n=dayNumber(start);
  for(let i=0;i<items.length;n++){
    const date=isoDay(n),rule=rules(plan,date);
    if(rule.rest.includes(new Date(n*86400000).getUTCDay()))continue;
    days[date]=[];
    for(const slot of rule.slots){if(i>=items.length)break;const {subject,step}=items[i++];days[date].push({subject,step,slot,period:rule.period,minutes:Math.min(rule.session,Number(step.study_minutes)||rule.session)});}
  }
  return days;
}
const slotLabel=slot=>!slot?'':typeof slot==='string'?slot:[slot.time,slot.name].filter(Boolean).join(' ');
// Weekly fixed commitments (e.g. online English class) shown on the calendar from start_date on.
function recurring(plan,date){if(!plan.start_date||date<plan.start_date)return [];const day=new Date(date+'T00:00:00Z').getUTCDay();return (Array.isArray(plan.recurring_events)?plan.recurring_events:[]).filter(e=>Array.isArray(e.weekdays)&&e.weekdays.includes(day));}
window.StudyPlan={ORDER,ordered,queue,schedule,rules,slotLabel,recurring};
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
    if(!items.length&&period&&period.review_label&&!rule.rest.includes(new Date(Date.UTC(y,m-1,d)).getUTCDay()))cell.insertBefore(node('span',(rule.slots[0]&&rule.slots[0].time?rule.slots[0].time+' ':'')+'🔁 '+period.review_label,'plan-item review'),cell.children[1]||null);if(!items.length&&!keyDates[date]&&rule.rest.includes(new Date(Date.UTC(y,m-1,d)).getUTCDay()))cell.append(node('small','วันพัก ☁️','muted'));
    grid.append(cell);
  }
  box.append(grid);
  const legend=node('div',undefined,'plan-legend');
  for(const p of config.daily_plan.periods||[])if(p.from.slice(0,7)<=month&&month<=p.to.slice(0,7))legend.append(node('span','ช่วง'+p.name+' '+Countdown.label(p.from)+' – '+Countdown.label(p.to)+' · วันละ '+(p.slots||[]).length+' ช่วง'+(p.weekday_slots?' (จ./พ./ศ. 1 ช่วง)':''),'period-note'));
  const planDays=Object.keys(plan).sort(),lastDay=planDays[planDays.length-1];
  if(config.daily_plan.finish_before==='pretest'&&lastDay)legend.append(node('span',lastDay<regular.pretest_date?'✅ เรียนครบทุกบทตามแผน '+Countdown.label(lastDay)+' ก่อน Pre-Test':'⚠️ แผนยังจบหลัง Pre-Test ('+Countdown.label(lastDay)+')',lastDay<regular.pretest_date?'period-note ok':'period-note'));
  legend.append(node('span','ร่างแผนรอคุณพ่อยืนยัน'));legend.append(node('span','✓ = ทำภารกิจแล้ว'),node('span','กรอบเส้นประ = บทที่ยังรอเนื้อหา'),node('span','แผนคงที่ ไม่เลื่อนตามการติ๊กเรียนจบ'));box.append(legend);
}
function shift(n){if(!month)return;const [y,m]=month.split('-').map(Number),d=new Date(Date.UTC(y,m-1+n,1));month=d.getUTCFullYear()+'-'+pad(d.getUTCMonth()+1);if(last)render(...last);}
document.getElementById('plan-prev')?.addEventListener('click',()=>shift(-1));
document.getElementById('plan-next')?.addEventListener('click',()=>shift(1));
document.getElementById('plan-today')?.addEventListener('click',()=>{month=null;if(last)render(...last);});
window.PlanCalendar={render};
})();
