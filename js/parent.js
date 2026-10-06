(() => {
'use strict';
const KEY='satit-swu-hub:activities:v1';
let base={title:'กิจกรรมของพอใจ',events:[]},override=null,remote=null,blocked=false;
const clone=x=>JSON.parse(JSON.stringify(x));
function validate(data){
  if(!data||typeof data!=='object'||!Array.isArray(data.events)||data.events.length>200)throw Error('ไฟล์กิจกรรมต้องมี events ไม่เกิน 200 รายการ');
  const ids=new Set();
  const events=data.events.map(e=>{
    if(!e||typeof e.id!=='string'||!/^[a-z0-9-]{1,100}$/.test(e.id)||ids.has(e.id))throw Error('id กิจกรรมไม่ถูกต้องหรือซ้ำ');
    ids.add(e.id);
    if(typeof e.title!=='string'||!e.title.trim()||e.title.length>200)throw Error('กรุณาใส่ชื่อกิจกรรม (ไม่เกิน 200 ตัวอักษร)');
    if(!/^\d{4}-\d{2}-\d{2}$/.test(e.date||''))throw Error('วันที่กิจกรรมไม่ถูกต้อง');
    const date=new Date(e.date+'T00:00:00Z');if(isNaN(date)||date.toISOString().slice(0,10)!==e.date)throw Error('วันที่กิจกรรมไม่มีอยู่จริง');
    const hasTime=!!(e.start||e.end);
    if(hasTime&&(!/^([01]\d|2[0-3]):[0-5]\d$/.test(e.start||'')||!/^([01]\d|2[0-3]):[0-5]\d$/.test(e.end||'')||e.end<=e.start))throw Error('เวลาเริ่มและสิ้นสุดต้องครบ และสิ้นสุดหลังเวลาเริ่มในวันเดียวกัน');
    const result={id:e.id,date:e.date,title:e.title.trim()};
    for(const key of ['location','description','source_note']){if(e[key]!==undefined&&(typeof e[key]!=='string'||e[key].length>2000))throw Error('รายละเอียดกิจกรรมไม่ถูกต้อง');if(e[key])result[key]=e[key];}
    if(e.series!==undefined){if(typeof e.series!=='string'||e.series.length>200)throw Error('ชื่อชุดกิจกรรมไม่ถูกต้อง');if(e.series)result.series=e.series;}
    if(hasTime){result.start=e.start;result.end=e.end;}
    return result;
  });
  return {title:typeof data.title==='string'?data.title.slice(0,200):'กิจกรรมของพอใจ',source_note:typeof data.source_note==='string'?data.source_note.slice(0,2000):'กิจกรรมที่คุณพ่อตั้ง',events};
}
function save(data){if(blocked)throw Error('อ่านข้อมูลกิจกรรมเดิมไม่ได้ กรุณาสำรองข้อมูลและตรวจพื้นที่จัดเก็บก่อน');const clean=validate(data);localStorage.setItem(KEY,JSON.stringify(clean));override=clean;}
function init(data){base=validate(data);try{const raw=localStorage.getItem(KEY);if(raw)override=validate(JSON.parse(raw));}catch(_){blocked=true;window.dispatchEvent(new CustomEvent('storage-warning',{detail:'อ่านกิจกรรมที่บันทึกไว้ไม่ได้ ข้อมูลจากเว็บยังแสดงได้ แต่ยังแก้ข้อมูลบนเครื่องไม่ได้'}));}}
function activities(){return clone(remote||override||base);}
// Activities typed into the Google Sheet win over the website's own file; null (or no rows) goes back to it.
function setRemote(data){remote=data?validate(data):null;}
function upsert(event){const data=clone(override||base),index=data.events.findIndex(e=>e.id===event.id);if(index<0)data.events.push({...event,source_note:event.source_note||'กิจกรรมที่คุณพ่อตั้งบนเครื่อง'});else data.events[index]=event;save(data);}
function remove(id){const data=clone(override||base);data.events=data.events.filter(e=>e.id!==id);save(data);}
function reset(){if(blocked)throw Error('ข้อมูลเก่าอ่านไม่ได้ กรุณาสำรองก่อนล้างข้อมูล');localStorage.removeItem(KEY);override=null;}
function downloadJSON(value,name){const url=URL.createObjectURL(new Blob([JSON.stringify(value,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);}
function render(config,tracker){
 const $=id=>document.getElementById(id);
 const regular=config.admissions.programs.find(p=>p.id===config.admissions.primary_program);
 $('exam-date').value=tracker.examDate()||regular.exam_date;$('result-date').value=tracker.resultDate()||regular.pretest_results_date||'';
 $('activity-storage-note').textContent=override?'กำลังใช้ไฟล์กิจกรรมที่แก้บนเครื่องนี้ · ส่งออก activities.json แล้วแทนไฟล์ data/activities.json เพื่อเผยแพร่ทุกเครื่อง':'กำลังใช้กิจกรรมจากไฟล์กลางบนเว็บ';
 $('managed-events').replaceChildren();
 for(const event of activities().events.sort((a,b)=>(a.date+(a.start||'')).localeCompare(b.date+(b.start||'')))){
  const row=document.createElement('div');row.className='managed-event';const title=document.createElement('strong');title.textContent=event.title;const date=document.createElement('p');date.textContent=Countdown.label(event.date)+(event.start?' · '+event.start+'–'+event.end:'');const actions=document.createElement('div');actions.className='actions';
  const edit=document.createElement('button');edit.className='secondary';edit.textContent='แก้ไข';edit.onclick=()=>{for(const key of ['id','title','date','location','start','end','description'])$('event-'+key).value=event[key]||'';$('event-title').focus();$('event-form').scrollIntoView({block:'center'});};
  const del=document.createElement('button');del.className='secondary';del.textContent='ลบ';del.onclick=()=>{if(confirm('ลบกิจกรรม “'+event.title+'” บนเครื่องนี้ไหม?')){try{remove(event.id);window.dispatchEvent(new Event('activities-changed'));}catch(e){window.dispatchEvent(new CustomEvent('storage-warning',{detail:e.message}));}}};
  actions.append(edit,del);row.append(title,date,actions);$('managed-events').append(row);
 }
}
window.ParentTools={init,validate,setRemote,activities,upsert,remove,reset,replace:save,downloadJSON,render};
})();