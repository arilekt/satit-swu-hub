(() => {
'use strict';
function parse(v){if(typeof v!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(v))throw Error('Invalid date');const [y,m,d]=v.split('-').map(Number);const date=new Date(Date.UTC(y,m-1,d));if(date.getUTCFullYear()!==y||date.getUTCMonth()!==m-1||date.getUTCDate()!==d)throw Error('Invalid date');return date;}
function today(){const p=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Bangkok',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());const v=Object.fromEntries(p.map(x=>[x.type,x.value]));return v.year+'-'+v.month+'-'+v.day;}
function addMonths(d,n){const y=d.getUTCFullYear(),m=d.getUTCMonth()+n;return new Date(Date.UTC(y,m,Math.min(d.getUTCDate(),new Date(Date.UTC(y,m+1,0)).getUTCDate())));}
function remaining(target,from=today()){const end=parse(target),start=parse(from);if(end<start)return {state:'past',months:0,days:0};if(+end===+start)return {state:'today',months:0,days:0};let months=(end.getUTCFullYear()-start.getUTCFullYear())*12+end.getUTCMonth()-start.getUTCMonth();if(addMonths(start,months)>end)months--;return {state:'future',months,days:Math.round((end-addMonths(start,months))/86400000)};}
function text(target,from){const v=remaining(target,from);return v.state==='past'?'ผ่านวันนัดหมายแล้ว':v.state==='today'?'วันนี้แล้ว · สู้ ๆ นะพอใจ!':'อีก '+v.months+' เดือน '+v.days+' วัน';}
function label(v){return new Intl.DateTimeFormat('th-TH',{timeZone:'UTC',day:'numeric',month:'long',year:'numeric'}).format(parse(v));}

function milestone(program, resultDate=null, from=today()){
  if(remaining(program.pretest_date,from).state!=='past')return {phase:'pretest',title:'Pre-Test ภาคปกติ · ภารกิจใกล้ที่สุด',date:program.pretest_date,message:''};
  const date=resultDate||program.pretest_results_date;
  if(!date)return {phase:'results-unknown',title:'หลัง Pre-Test · รอวันประกาศผล',date:null,message:'Pre-Test ผ่านแล้ว · ยังไม่ทราบวันประกาศผล คุณพ่อเพิ่มวันที่ได้ด้านล่าง'};
  const state=remaining(date,from).state;
  return {phase:'results-'+state,title:'เตือนตรวจผล Pre-Test · ภาคปกติ',date,message:state==='future'?'Pre-Test ผ่านแล้ว · เตรียมตรวจผลตามวันที่กำหนด':state==='today'?'วันนี้ถึงกำหนดประกาศผล Pre-Test · อย่าลืมตรวจประกาศโรงเรียน':'ถึงกำหนดตรวจผล Pre-Test แล้ว · ตรวจประกาศโรงเรียนได้เลย'};
}

window.Countdown={remaining,text,label,today,milestone};
})();