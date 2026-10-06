/* Local-only progress. Storage failures are always visible to the learner. */
(() => {
  'use strict';
  const Catalog = window.Catalog;
  const KEY = 'satit-swu-hub:v1';
  const blank = () => ({version:1, completed:[], attempts:[], examDate:null, resultDate:null, marks:{}, settingsAt:{}});
  const EPOCH = '1970-01-01T00:00:00.000Z';
  const cleanMarks = raw => {const marks={};if(raw&&typeof raw==='object'&&!Array.isArray(raw))for(const [id,m] of Object.entries(raw))if(m&&typeof m.done==='boolean'&&typeof m.at==='string'&&!isNaN(new Date(m.at).getTime()))marks[id]={done:m.done,at:m.at};return marks;};
  const cleanSettingsAt = raw => {const out={};for(const key of ['examDate','resultDate'])if(raw&&typeof raw[key]==='string'&&!isNaN(new Date(raw[key]).getTime()))out[key]=raw[key];return out;};
  let state = blank(), writable = true, sheetDates = {};
  const dateValid = value => {if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;const date=new Date(value+'T00:00:00Z');return !isNaN(date.getTime())&&date.toISOString().slice(0,10)===value;};
  function warning(message) { window.dispatchEvent(new CustomEvent('storage-warning', {detail:message})); }
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const data = JSON.parse(raw);
      if (!data || data.version !== 1 || !Array.isArray(data.completed) || !Array.isArray(data.attempts)) throw new Error('invalid state');
      state = {version:1, completed:[...new Set(data.completed.filter(x=>typeof x==='string'))], attempts:data.attempts.filter(x=>x && typeof x.id==='string' && typeof x.date==='string' && Number.isFinite(x.score) && Number.isInteger(x.total) && x.total>0 && x.score>=0 && x.score<=x.total).slice(-100), examDate:dateValid(data.examDate)?data.examDate:null, resultDate:dateValid(data.resultDate)?data.resultDate:null, marks:cleanMarks(data.marks), settingsAt:cleanSettingsAt(data.settingsAt)};
    }
  } catch (_) {
    writable = false;
    setTimeout(()=>warning('อ่านข้อมูลเดิมไม่ได้ ใช้งานชั่วคราวได้ แต่ยังบันทึกไม่ได้ กรุณาตรวจการอนุญาตพื้นที่จัดเก็บใน Safari หรือสำรองข้อมูลเดิมก่อนล้างข้อมูลเว็บ'),0);
  }
  function save(source) {
    if (writable) {
      try { localStorage.setItem(KEY,JSON.stringify(state)); }
      catch (_) { warning('บันทึกไม่สำเร็จ ความคืบหน้ารอบนี้อยู่ชั่วคราว กรุณาเปิดพื้นที่จัดเก็บหรือออกจากโหมดส่วนตัว'); }
    } else warning('ข้อมูลรอบนี้ยังไม่ถูกบันทึกลงเครื่อง');
    window.dispatchEvent(new CustomEvent('progress-changed',{detail:{source:source||'local'}}));
  }
  function validateBackup(data) {
    if(!data||data.version!==1||!Array.isArray(data.completed)||!data.completed.every(x=>typeof x==='string')||!Array.isArray(data.attempts)||data.attempts.length>100)throw Error('ไฟล์สำรองผลเรียนไม่ถูกต้อง');
    for(const a of data.attempts){
      if(!a||typeof a.id!=='string'||typeof a.title!=='string'||typeof a.date!=='string'||isNaN(new Date(a.date).getTime())||!Number.isFinite(a.score)||!Number.isInteger(a.total)||a.total<=0||a.score<0||a.score>a.total)throw Error('ประวัติข้อสอบในไฟล์ไม่ถูกต้อง');
      if(a.answers!==undefined&&(!Array.isArray(a.answers)||a.answers.length!==a.total||a.answers.some(x=>!x||typeof x.question!=='string'||!Number.isInteger(x.correct)||x.correct<0||(x.selected!==null&&(!Number.isInteger(x.selected)||x.selected<0)))))throw Error('ข้อมูลคำตอบรายข้อไม่ถูกต้อง');
    }
    if(data.examDate!=null&&!dateValid(data.examDate)||data.resultDate!=null&&!dateValid(data.resultDate))throw Error('วันสอบในไฟล์ไม่ถูกต้อง');
    return JSON.parse(JSON.stringify({version:1,completed:[...new Set(data.completed)],attempts:data.attempts,examDate:data.examDate||null,resultDate:data.resultDate||null,marks:cleanMarks(data.marks),settingsAt:cleanSettingsAt(data.settingsAt)}));
  }

  window.Tracker = {
    validateBackup,
    restore(data) {if(!writable)throw Error("พื้นที่จัดเก็บยังไม่พร้อม กรุณาตรวจการอนุญาตก่อน");const next=validateBackup(data);localStorage.setItem(KEY,JSON.stringify(next));state=next;window.dispatchEvent(new Event("progress-changed"));},
    has:id=>state.completed.includes(id)||state.attempts.some(a=>a.id===id),
    toggle(id) { const done=!this.has(id);state.completed = done?[...state.completed,id]:state.completed.filter(x=>x!==id);state.marks={...state.marks,[id]:{done,at:new Date().toISOString()}}; save(); },
    addAttempt(attempt) { if(typeof attempt.id==='string'&&!attempt.id.endsWith(':mini')){state.completed=[...new Set([...state.completed,attempt.id])];state.marks={...state.marks,[attempt.id]:{done:true,at:new Date().toISOString()}};}state.attempts.push({...attempt,date:new Date().toISOString()});state.attempts=state.attempts.slice(-100);save(); },
    attempts:()=>JSON.parse(JSON.stringify(state.attempts)),
    /* Sync with the Google Sheet backend: every completion carries a timestamp so the newest change wins. */
    syncPayload() {
      const marks={};for(const id of state.completed)marks[id]={done:true,at:EPOCH};Object.assign(marks,state.marks);
      const settings={};for(const key of ['examDate','resultDate'])if(state.settingsAt[key])settings[key]={value:state[key],at:state.settingsAt[key]};
      return JSON.parse(JSON.stringify({marks,attempts:state.attempts,settings}));
    },
    applyRemote(remote) {
      if(!remote||typeof remote!=='object')throw Error('ข้อมูลจาก Google Sheet ไม่ถูกต้อง');
      const marks=cleanMarks(remote.marks),seen=new Set(),attempts=[];
      for(const a of [...state.attempts,...(Array.isArray(remote.attempts)?remote.attempts:[])]){if(!a||typeof a.id!=='string'||typeof a.date!=='string'||!Number.isFinite(a.score)||!Number.isInteger(a.total)||a.total<=0||a.score<0||a.score>a.total)continue;const key=a.id+'|'+a.date;if(!seen.has(key)){seen.add(key);attempts.push(a);}}
      attempts.sort((x,y)=>new Date(x.date)-new Date(y.date));
      for(const [id,m] of Object.entries(state.marks))if(!marks[id]||new Date(m.at)>new Date(marks[id].at))marks[id]=m;
      const completed=new Set(state.completed.filter(id=>!marks[id]));for(const [id,m] of Object.entries(marks))if(m.done)completed.add(id);
      const next={...state,completed:[...completed],attempts:attempts.slice(-100),marks};
      for(const key of ['examDate','resultDate']){const r=remote.settings&&remote.settings[key];if(r&&typeof r.at==='string'&&(!state.settingsAt[key]||new Date(r.at)>new Date(state.settingsAt[key]))&&(r.value===null||dateValid(r.value))){next[key]=r.value;next.settingsAt={...next.settingsAt,[key]:r.at};}}
      state=next;save('remote');
    },
    exportData:()=>JSON.parse(JSON.stringify({...state,exported_at:new Date().toISOString()})),
    examDate:()=>sheetDates.exam_date||state.examDate,
    setExamDate(value) {state.examDate=dateValid(value)?value:null;state.settingsAt={...state.settingsAt,examDate:new Date().toISOString()};save();},
    resultDate:()=>sheetDates.result_date||state.resultDate,
    /* Dates typed in the Sheet override this device's own, but are never written back to it. */
    setSheetDates(dates) {sheetDates={};if(dates&&typeof dates==='object')for(const key of ['exam_date','result_date'])if(dateValid(dates[key]))sheetDates[key]=dates[key];},
    setResultDate(value) {state.resultDate=dateValid(value)?value:null;state.settingsAt={...state.settingsAt,resultDate:new Date().toISOString()};save();},
    stats(config) { const ids=config.subjects.flatMap(s=>Catalog.items(s).map(x=>x.id));const done=ids.filter(id=>this.has(id)).length;return {done,total:ids.length,percent:Math.round(done/ids.length*100)}; },
    summary(config) { const all=this.stats(config);return ['สรุปภารกิจของ'+config.learner,'เรียนจบ '+all.done+'/'+all.total+' ภารกิจ ('+all.percent+'%)',...config.subjects.map(s=>{const all=Catalog.items(s);return s.name+': '+all.filter(x=>this.has(x.id)).length+'/'+all.length;}),...state.attempts.slice(-5).map(a=>'ข้อสอบ '+a.title+': '+a.score+'/'+a.total+' ('+new Date(a.date).toLocaleDateString('th-TH',{timeZone:'Asia/Bangkok'})+')')].join('\n'); }
  };
})();