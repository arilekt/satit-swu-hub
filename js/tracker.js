/* Local-only progress. Storage failures are always visible to the learner. */
(() => {
  'use strict';
  const Catalog = window.Catalog;
  const KEY = 'satit-swu-hub:v1';
  const blank = () => ({version:1, completed:[], attempts:[], examDate:null, resultDate:null});
  let state = blank(), writable = true;
  const dateValid = value => {if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;const date=new Date(value+'T00:00:00Z');return !isNaN(date.getTime())&&date.toISOString().slice(0,10)===value;};
  function warning(message) { window.dispatchEvent(new CustomEvent('storage-warning', {detail:message})); }
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const data = JSON.parse(raw);
      if (!data || data.version !== 1 || !Array.isArray(data.completed) || !Array.isArray(data.attempts)) throw new Error('invalid state');
      state = {version:1, completed:[...new Set(data.completed.filter(x=>typeof x==='string'))], attempts:data.attempts.filter(x=>x && typeof x.id==='string' && typeof x.date==='string' && Number.isFinite(x.score) && Number.isInteger(x.total) && x.total>0 && x.score>=0 && x.score<=x.total).slice(-100), examDate:dateValid(data.examDate)?data.examDate:null, resultDate:dateValid(data.resultDate)?data.resultDate:null};
    }
  } catch (_) {
    writable = false;
    setTimeout(()=>warning('อ่านข้อมูลเดิมไม่ได้ ใช้งานชั่วคราวได้ แต่ยังบันทึกไม่ได้ กรุณาตรวจการอนุญาตพื้นที่จัดเก็บใน Safari หรือสำรองข้อมูลเดิมก่อนล้างข้อมูลเว็บ'),0);
  }
  function save() {
    if (writable) {
      try { localStorage.setItem(KEY,JSON.stringify(state)); }
      catch (_) { warning('บันทึกไม่สำเร็จ ความคืบหน้ารอบนี้อยู่ชั่วคราว กรุณาเปิดพื้นที่จัดเก็บหรือออกจากโหมดส่วนตัว'); }
    } else warning('ข้อมูลรอบนี้ยังไม่ถูกบันทึกลงเครื่อง');
    window.dispatchEvent(new Event('progress-changed'));
  }
  function validateBackup(data) {
    if(!data||data.version!==1||!Array.isArray(data.completed)||!data.completed.every(x=>typeof x==='string')||!Array.isArray(data.attempts)||data.attempts.length>100)throw Error('ไฟล์สำรองผลเรียนไม่ถูกต้อง');
    for(const a of data.attempts){
      if(!a||typeof a.id!=='string'||typeof a.title!=='string'||typeof a.date!=='string'||isNaN(new Date(a.date).getTime())||!Number.isFinite(a.score)||!Number.isInteger(a.total)||a.total<=0||a.score<0||a.score>a.total)throw Error('ประวัติข้อสอบในไฟล์ไม่ถูกต้อง');
      if(a.answers!==undefined&&(!Array.isArray(a.answers)||a.answers.length!==a.total||a.answers.some(x=>!x||typeof x.question!=='string'||!Number.isInteger(x.correct)||x.correct<0||(x.selected!==null&&(!Number.isInteger(x.selected)||x.selected<0)))))throw Error('ข้อมูลคำตอบรายข้อไม่ถูกต้อง');
    }
    if(data.examDate!=null&&!dateValid(data.examDate)||data.resultDate!=null&&!dateValid(data.resultDate))throw Error('วันสอบในไฟล์ไม่ถูกต้อง');
    return JSON.parse(JSON.stringify({version:1,completed:[...new Set(data.completed)],attempts:data.attempts,examDate:data.examDate||null,resultDate:data.resultDate||null}));
  }

  window.Tracker = {
    validateBackup,
    restore(data) {if(!writable)throw Error("พื้นที่จัดเก็บยังไม่พร้อม กรุณาตรวจการอนุญาตก่อน");const next=validateBackup(data);localStorage.setItem(KEY,JSON.stringify(next));state=next;window.dispatchEvent(new Event("progress-changed"));},
    has:id=>state.completed.includes(id)||state.attempts.some(a=>a.id===id),
    toggle(id) { state.completed = this.has(id)?state.completed.filter(x=>x!==id):[...state.completed,id]; save(); },
    addAttempt(attempt) { if(typeof attempt.id==='string'&&!attempt.id.endsWith(':mini'))state.completed=[...new Set([...state.completed,attempt.id])];state.attempts.push({...attempt,date:new Date().toISOString()});state.attempts=state.attempts.slice(-100);save(); },
    attempts:()=>JSON.parse(JSON.stringify(state.attempts)),
    exportData:()=>JSON.parse(JSON.stringify({...state,exported_at:new Date().toISOString()})),
    examDate:()=>state.examDate,
    setExamDate(value) {state.examDate=dateValid(value)?value:null;save();},
    resultDate:()=>state.resultDate,
    setResultDate(value) {state.resultDate=dateValid(value)?value:null;save();},
    stats(config) { const ids=config.subjects.flatMap(s=>Catalog.items(s).map(x=>x.id));const done=ids.filter(id=>this.has(id)).length;return {done,total:ids.length,percent:Math.round(done/ids.length*100)}; },
    summary(config) { const all=this.stats(config);return ['สรุปภารกิจของ'+config.learner,'เรียนจบ '+all.done+'/'+all.total+' ภารกิจ ('+all.percent+'%)',...config.subjects.map(s=>{const all=Catalog.items(s);return s.name+': '+all.filter(x=>this.has(x.id)).length+'/'+all.length;}),...state.attempts.slice(-5).map(a=>'ข้อสอบ '+a.title+': '+a.score+'/'+a.total+' ('+new Date(a.date).toLocaleDateString('th-TH',{timeZone:'Asia/Bangkok'})+')')].join('\n'); }
  };
})();