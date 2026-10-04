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
// Returns {date:[{subject,step,minutes}]} for every planned day, or null when no start date is set.
function schedule(config){
  const plan=config.daily_plan||{},start=plan.start_date;
  if(typeof start!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(start))return null;
  const rest=Array.isArray(plan.rest_weekdays)?plan.rest_weekdays:[0],perDay=Math.max(1,Math.min(4,Number(plan.items_per_day)||1));
  const session=Math.max(5,Math.min(60,Number(plan.session_minutes)||20));
  const days={};let n=dayNumber(start);
  const items=queue(config);
  for(let i=0;i<items.length;n++){
    if(rest.includes(new Date(n*86400000).getUTCDay()))continue;
    const date=isoDay(n);days[date]=[];
    for(let k=0;k<perDay&&i<items.length;k++,i++){const {subject,step}=items[i];days[date].push({subject,step,minutes:Math.min(session,Number(step.study_minutes)||session)});}
  }
  return days;
}
window.StudyPlan={ORDER,ordered,queue,schedule};
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
    for(const {subject,step,minutes} of items){
      const parent=Catalog.parentOf(subject,step.id),lesson=parent||step;
      const a=node('a',undefined,'plan-item'+(tracker.has(step.id)?' done':step.file?'':' waiting'));a.href='#'+subject.id+'/'+step.id;
      a.append(document.createTextNode(subject.icon+' '+subject.name+' '+lesson.title+(parent?' · ข้อสอบท้ายบท':step.type==='exam'?' · '+step.title:'')));
      a.append(node('small',(step.type==='lesson'?(step.chapter_title||'รอชื่อบท')+' · ':'')+(step.file?'~'+minutes+' นาที':'รอเนื้อหา')));
      cell.append(a);
    }
    if(!items.length&&!keyDates[date]&&(config.daily_plan.rest_weekdays||[0]).includes(new Date(Date.UTC(y,m-1,d)).getUTCDay()))cell.append(node('small','วันพัก ☁️','muted'));
    grid.append(cell);
  }
  box.append(grid);
  const legend=node('div',undefined,'plan-legend');legend.append(node('span','✓ = ทำภารกิจแล้ว'),node('span','กรอบเส้นประ = บทที่ยังรอเนื้อหา'),node('span','แผนคงที่ ไม่เลื่อนตามการติ๊กเรียนจบ'));box.append(legend);
}
function shift(n){if(!month)return;const [y,m]=month.split('-').map(Number),d=new Date(Date.UTC(y,m-1+n,1));month=d.getUTCFullYear()+'-'+pad(d.getUTCMonth()+1);if(last)render(...last);}
document.getElementById('plan-prev')?.addEventListener('click',()=>shift(-1));
document.getElementById('plan-next')?.addEventListener('click',()=>shift(1));
document.getElementById('plan-today')?.addEventListener('click',()=>{month=null;if(last)render(...last);});
window.PlanCalendar={render};
})();
