/* Fixed study plan: each day starts at a set time and is filled with whole PARTs by their real length
   (clip + reading the summary, or the quiz time) until the day's minutes are used; long PARTs still get
   a slot of their own and พอใจ takes breaks herself. Subjects take turns. The schedule depends only on
   config / the Google Sheet plan, so ticking a lesson done never moves anything. */
(() => {
'use strict';
const ORDER=['math','science','thai','social','english'];
// Subject settings from the Sheet (แผน-วิชา): [{id, order, weight, from, note}].
const settings=config=>{const out={};for(const x of (Array.isArray(config.daily_plan?.subjects)?config.daily_plan.subjects:[]))if(x&&typeof x.id==='string')out[x.id]=x;return out;};
function ordered(config){
  const set=settings(config),listed=Object.keys(set).length,base=id=>(ORDER.indexOf(id)<0?99:ORDER.indexOf(id)+1)+(listed?100:0);
  const rank=id=>set[id]&&Number.isFinite(Number(set[id].order))?Number(set[id].order):base(id);
  return [...config.subjects].sort((a,b)=>rank(a.id)-rank(b.id)||ORDER.indexOf(a.id)-ORDER.indexOf(b.id));
}
const note=(config,id)=>settings(config)[id]?.note||'';
const DATE=/^\d{4}-\d{2}-\d{2}$/,TIME=/^([01]\d|2[0-3]):[0-5]\d$/;
const clamp=(v,lo,hi,fallback)=>{const n=Number(v);return Number.isFinite(n)&&v!==''&&v!==null?Math.max(lo,Math.min(hi,Math.round(n))):fallback;};
// Minutes one item takes: lesson = clip + reading the summary (or its own estimate), quiz = 1.5 min a question.
function minutes(step,plan={}){
  if(step.type==='exam')return clamp(step.time_limit_minutes,5,180,Math.round((Number(step.questions)||20)*1.5));
  const clip=Number(step.source_duration_minutes);
  return clip>0?Math.round(clip)+clamp(plan.reading_minutes,0,60,10):clamp(step.study_minutes,5,240,30);
}
// Rules for one date. Priority: a special day (แผน-วันพิเศษ) > the period it falls in > plan settings.
function rules(plan,date){
  const period=(Array.isArray(plan.periods)?plan.periods:[]).find(p=>p&&p.from<=date&&date<=p.to)||{};
  const pick=(key,fallback)=>period[key]!==undefined?period[key]:plan[key]!==undefined?plan[key]:fallback;
  const weekday=new Date(date+'T00:00:00Z').getUTCDay();
  const day=plan.days&&typeof plan.days==='object'&&plan.days[date]&&typeof plan.days[date]==='object'?plan.days[date]:null;
  const byWeekday=period.weekday_minutes&&period.weekday_minutes[String(weekday)];
  const rest=pick('rest_weekdays',[0]);
  let budget=byWeekday!==undefined?clamp(byWeekday,0,720,0):clamp(pick('day_minutes',90),0,720,90);
  if(day)budget=clamp(day.minutes,0,720,budget);
  const start=day&&TIME.test(day.start||'')?day.start:TIME.test(pick('start_time','')||'')?pick('start_time'):'17:00';
  const off=day?budget===0:(Array.isArray(rest)&&rest.includes(weekday))||budget===0;
  return {period:period.name||null,review_label:period.review_label||'',start,minutes:budget,off,rest,brk:clamp(pick('break_minutes',10),0,60,10),note:day&&typeof day.note==='string'?day.note:'',special:!!day};
}
const dayNumber=date=>Math.round(Date.parse(date+'T00:00:00Z')/86400000);
const isoDay=n=>new Date(n*86400000).toISOString().slice(0,10);
const clock=(start,add)=>{const [h,m]=start.split(':').map(Number),t=h*60+m+add;return String(Math.floor(t/60)%24).padStart(2,'0')+':'+String(t%60).padStart(2,'0');};
// Returns {date:[{subject,step,minutes,slot:{time,end},period}]} for every planned day, or null when no start date is set.
// Days are filled in queue order; when the next PART does not fit what is left of the day, a later one that fits
// may go first (looking a few items ahead, never before an earlier item of the same subject).
function schedule(config){
  const plan=config.daily_plan||{},start=plan.start_date;
  if(typeof start!=='string'||!DATE.test(start))return null;
  const set=settings(config),pending=[];
  const lists=ordered(config).map(subject=>({subject,w:clamp(set[subject.id]?.weight,1,3,1),from:DATE.test(set[subject.id]?.from||'')?set[subject.id].from:'',items:window.Catalog.items(subject)}));
  for(let round=0;lists.some(l=>round*l.w<l.items.length);round++)for(const l of lists)for(const step of l.items.slice(round*l.w,(round+1)*l.w))pending.push({subject:l.subject,step,from:l.from,minutes:minutes(step,plan)});
  const days={};
  for(let n=dayNumber(start),guard=0;pending.length&&guard<1500;n++,guard++){
    const date=isoDay(n),rule=rules(plan,date);if(rule.off)continue;
    let used=0;
    while(used<rule.minutes){
      const blocked=new Set();let pick=-1,looked=0;
      for(let i=0;i<pending.length&&looked<6;i++){
        const x=pending[i];if(blocked.has(x.subject.id))continue;blocked.add(x.subject.id);
        if(x.from&&x.from>date)continue;looked++;
        if(!days[date]||used+x.minutes<=rule.minutes){pick=i;break;}
      }
      if(pick<0)break;
      const x=pending.splice(pick,1)[0];
      (days[date]=days[date]||[]).push({subject:x.subject,step:x.step,minutes:x.minutes,slot:{time:clock(rule.start,used),end:clock(rule.start,used+x.minutes)},period:rule.period});
      used+=x.minutes+rule.brk;
    }
  }
  return days;
}
const slotLabel=slot=>!slot?'':typeof slot==='string'?slot:slot.end?slot.time+'–'+slot.end:[slot.time,slot.name].filter(Boolean).join(' ');
// Weekly fixed commitments (e.g. online English class) shown from start_date until their end date.
function recurring(plan,date){if(!plan.start_date||date<plan.start_date)return [];const day=new Date(date+'T00:00:00Z').getUTCDay();return (Array.isArray(plan.recurring_events)?plan.recurring_events:[]).filter(e=>Array.isArray(e.weekdays)&&e.weekdays.includes(day)&&(!e.until||date<=e.until));}
// Where each step sits in the plan, and how a subject stands against it today.
function index(days){const out={};for(const date of Object.keys(days||{}))for(const x of days[date])out[x.step.id]={date,slot:x.slot,minutes:x.minutes};return out;}
function standing(days,subject,tracker,today){
  let behind=0,ahead=0;
  for(const date of Object.keys(days||{}))for(const x of days[date])if(x.subject.id===subject.id){const done=tracker.has(x.step.id);if(date<today&&!done)behind++;if(date>today&&done)ahead++;}
  return {behind,ahead};
}
// Last planned date per subject.
function finishDates(days){const out={};for(const date of Object.keys(days||{}).sort())for(const x of days[date])out[x.subject.id]=date;return out;}
window.StudyPlan={ORDER,ordered,schedule,rules,minutes,slotLabel,recurring,index,standing,note,finishDates,settings};
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
      const top=node('span',subject.icon+' '+subject.name,'plan-line subject-line');
      a.append(top,node('span',parent?lesson.title+' · ข้อสอบ':step.title,'plan-line'));
      const info=[step.type==='lesson'&&step.chapter_title?step.chapter_title:null,'~'+minutes+' นาที'+(step.file?'':' · รอเนื้อหา')].filter(Boolean).join(' · ');
      a.append(node('small',info));
      cell.append(a);
    }
    for(const e of StudyPlan.recurring(config.daily_plan||{},date))cell.append(node('span',(e.time?e.time+' ':'')+'🎧 '+e.title,'plan-item class'));
    const rule=StudyPlan.rules(config.daily_plan||{},date);
    if(rule.note)cell.insertBefore(node('span','📝 '+rule.note,'plan-item note'),cell.children[1]||null);
    if(!items.length&&rule.review_label&&!rule.off)cell.insertBefore(node('span','🔁 '+rule.review_label,'plan-item review'),cell.children[1]||null);
    if(!items.length&&!keyDates[date]&&rule.off)cell.append(node('small',rule.special?'งดเรียนวันนี้ ☁️':'วันพัก ☁️','muted'));
    grid.append(cell);
  }
  box.append(grid);
  const legend=node('div',undefined,'plan-legend'),hours=m=>m%60?(m/60).toFixed(1).replace('.0','')+' ชม.':m/60+' ชม.';
  for(const p of config.daily_plan.periods||[])if(p.from.slice(0,7)<=month&&month<=p.to.slice(0,7)){
    const extra=p.weekday_minutes?Object.keys(p.weekday_minutes).map(k=>['อา.','จ.','อ.','พ.','พฤ.','ศ.','ส.'][k]+' '+hours(Number(p.weekday_minutes[k]))).join(' '):'';
    legend.append(node('span','ช่วง'+p.name+' '+Countdown.label(p.from)+' – '+Countdown.label(p.to)+' · เรียนวันละ ~'+hours(Number(p.day_minutes||config.daily_plan.day_minutes||90))+(extra?' ('+extra+')':''),'period-note'));}
  const finish=StudyPlan.finishDates(plan),set=StudyPlan.settings(config),pre=regular.pretest_date;
  const before=StudyPlan.ordered(config).filter(s=>finish[s.id]&&!(set[s.id]?.from>pre)),later=StudyPlan.ordered(config).filter(s=>finish[s.id]&&set[s.id]?.from>pre);
  if(config.daily_plan.finish_before==='pretest'&&before.length){const end=before.map(s=>finish[s.id]).sort().pop(),ok=end<pre;
    legend.append(node('span',(ok?'✅ ':'⚠️ ')+before.map(s=>s.name).join(' ')+(ok?' ครบตามแผน '+Countdown.label(end)+' ก่อน Pre-Test':' ยังจบหลัง Pre-Test ('+Countdown.label(end)+')'),ok?'period-note ok':'period-note'));}
  for(const s of later)legend.append(node('span',s.icon+' '+s.name+' เริ่มหลัง Pre-Test '+Countdown.label(set[s.id].from)+' · ครบ '+Countdown.label(finish[s.id]),'period-note'));
  legend.append(node('span',config.daily_plan.source==='sheet'?'📄 แผนจาก Google Sheet (แท็บ แผน-…)':'แผนตั้งต้นจากเว็บ · แก้ได้ที่ Google Sheet แท็บ แผน-…'));legend.append(node('span','✓ = ทำภารกิจแล้ว'),node('span','กรอบเส้นประ = บทที่ยังรอเนื้อหา'),node('span','แผนคงที่ ไม่เลื่อนตามการติ๊กเรียนจบ'));box.append(legend);
}
function shift(n){if(!month)return;const [y,m]=month.split('-').map(Number),d=new Date(Date.UTC(y,m-1+n,1));month=d.getUTCFullYear()+'-'+pad(d.getUTCMonth()+1);if(last)render(...last);}
document.getElementById('plan-prev')?.addEventListener('click',()=>shift(-1));
document.getElementById('plan-next')?.addEventListener('click',()=>shift(1));
document.getElementById('plan-today')?.addEventListener('click',()=>{month=null;if(last)render(...last);});
window.PlanCalendar={render};
})();
