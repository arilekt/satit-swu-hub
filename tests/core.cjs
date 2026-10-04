/* Run: node tests/core.cjs */
const fs = require('node:fs');
const vm = require('node:vm');
const {URL} = require('node:url');
const assert = require('node:assert/strict');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const read = name => fs.readFileSync(path.join(root,name),'utf8');
for(const name of ['app','tracker','quiz-engine','catalog'])new vm.Script(read('js/'+name+'.js'));
const config=JSON.parse(read('data/config.json'));
assert.deepEqual(config.subjects.map(s=>s.steps.length),[14,11,7,9,12]);
const catalogContext={window:{}};vm.createContext(catalogContext);vm.runInContext(read('js/catalog.js'),catalogContext);const Catalog=catalogContext.window.Catalog;
for(const subject of config.subjects)for(const step of [...Catalog.items(subject),...subject.exams])if(step.file)assert.ok(fs.existsSync(path.join(root,step.file)));
const stored=new Map();
function tracker(){
  const c={localStorage:{getItem:k=>stored.get(k)||null,setItem:(k,v)=>stored.set(k,v)},window:{dispatchEvent(){}},CustomEvent:class{},Event:class{},setTimeout(){}};
  c.window.Catalog=Catalog;vm.createContext(c);vm.runInContext(read('js/tracker.js'),c);return c.window.Tracker;
}
let t=tracker();t.toggle('social-part01');t.addAttempt({id:'mock',title:'mock',score:1,total:2,answers:[{question:'Q',selected:0,correct:1}]});
t=tracker();assert.equal(t.has('social-part01'),true);assert.equal(t.stats(config).done,1);assert.equal(t.attempts()[0].score,1);assert.equal(t.exportData().attempts[0].answers[0].selected,0);
t.toggle('social-part01');assert.equal(t.stats(config).done,0);
class Node {
  constructor(tag){this.tag=tag;this.children=[];this.textContent='';}
  append(...nodes){this.children.push(...nodes);}
  replaceChildren(...nodes){this.children=nodes;}
}
let now=0,tick,attempts=[],listeners=new Map(),cleared=0;
const c={
  window:{},document:{createElement:tag=>new Node(tag),addEventListener:(event,fn)=>listeners.set(event,fn),removeEventListener:event=>listeners.delete(event)},
  Tracker:{addAttempt:a=>attempts.push(a)},Date:{now:()=>now},
  setInterval:fn=>{tick=fn;return 1;},clearInterval:()=>cleared++,
  confirm:()=>true
};
vm.createContext(c);vm.runInContext(read('js/quiz-engine.js'),c);
const q=[{question:'Q',options:['A','B'],answer:1,explanation:'Because B'}];
assert.throws(()=>c.window.QuizEngine.validate([{...q[0],answer:2}]));
const panel=new Node('section');c.window.QuizEngine.mount(panel,{id:'mock',title:'mock',time_limit_minutes:1},q);
const startButton=panel.children[1];assert.match(startButton.textContent,/เริ่ม/);startButton.onclick();assert.equal(c.window.QuizEngine.isActive(),true);
const [bar,form]=panel.children;assert.match(bar.children[1].textContent,/00:00 \/ 01:00/);
form.children[0].children[2].children[0].onchange();assert.match(bar.children[0].textContent,/1\/1/);
now=95000;tick();assert.match(bar.children[1].textContent,/เกินเวลา 00:35/);assert.equal(c.window.QuizEngine.isActive(),true,'going over the time never submits by itself');
form.onsubmit({preventDefault(){}});assert.equal(attempts[0].score,1);assert.equal(attempts[0].total,1);assert.equal(attempts[0].elapsed_seconds,95);assert.equal(attempts[0].timedOut,true);assert.equal(c.window.QuizEngine.isActive(),false);
const review=panel.children[2].children[0],texts=JSON.stringify(review.children.map(n=>n.children?n.children.map(x=>x.textContent):n.textContent));
assert.match(texts,/พอใจตอบข้อนี้ ถูกต้อง/);assert.match(JSON.stringify(review.children.at(-1).children.map(x=>x.textContent)),/Because B/);assert.match(panel.children[0].children[1].textContent,/1 \/ 1/);
form.onsubmit({preventDefault(){}});assert.equal(attempts.length,1);
now=0;const second=new Node('section');c.window.QuizEngine.mount(second,{id:'two',title:'two',time_limit_minutes:1},q);second.children[1].onclick();
now=30000;second.children[0].children[2].onclick();assert.equal(attempts[1].score,0);assert.equal(attempts[1].answers[0].selected,null);assert.equal(attempts[1].timedOut,false);
assert.match(JSON.stringify(second.children[2].children[0].children.map(n=>n.children?n.children.map(x=>x.textContent):'')),/ข้อที่ถูก/);
const abandoned=new Node('section');c.window.QuizEngine.mount(abandoned,{id:'leave',title:'leave',time_limit_minutes:1},q);abandoned.children[1].onclick();c.window.QuizEngine.dispose();
assert.equal(attempts.length,2);assert.equal(listeners.size,0);assert.ok(cleared>0);
console.log('PASS: syntax, content-and-exam catalogue, file paths, persistence, undo, filtered progress, detailed export, schema, scoring, single submit, count-up timer that may run over, review shows chosen/correct/reason, abandonment cleanup');

const dates={window:{}};
vm.createContext(dates);vm.runInContext(read('js/countdown.js'),dates);
const countdown=dates.window.Countdown;
assert.equal(countdown.text('2027-02-07','2026-10-03'),'อีก 4 เดือน 4 วัน');
assert.equal(countdown.text('2026-11-29','2026-10-03'),'อีก 1 เดือน 26 วัน');
assert.equal(countdown.text('2027-02-28','2027-01-31'),'อีก 1 เดือน 0 วัน');
assert.equal(countdown.text('2028-02-29','2028-01-31'),'อีก 1 เดือน 0 วัน');
assert.equal(countdown.remaining('2027-02-07','2027-02-07').state,'today');
assert.equal(countdown.remaining('2027-02-07','2027-02-08').state,'past');
assert.throws(()=>countdown.remaining('2027-02-30','2027-01-01'));
assert.equal(config.admissions.programs.find(p=>p.id==='regular').exam_date,'2027-02-07');
assert.ok(countdown.label('2027-02-07').includes('2570'));
console.log('PASS: calendar months/days, month-end clamping, leap year, exam day, past dates, Thai Buddhist year and primary date');

const regular=config.admissions.programs.find(p=>p.id==='regular');
assert.equal(countdown.milestone(regular,null,'2026-10-03').phase,'pretest');
assert.equal(countdown.milestone(regular,null,'2026-11-29').phase,'pretest');
assert.equal(countdown.milestone({...regular,pretest_results_date:null},null,'2026-11-30').phase,'results-unknown');
assert.equal(countdown.milestone(regular,null,'2026-12-08').phase,'results-today');
assert.equal(countdown.milestone(regular,'2026-12-05','2026-11-30').phase,'results-future');
assert.equal(countdown.milestone(regular,'2026-12-05','2026-12-05').phase,'results-today');
assert.equal(countdown.milestone(regular,'2026-12-05','2026-12-06').phase,'results-past');
assert.equal(countdown.text(regular.exam_date,'2026-11-30'),'อีก 2 เดือน 8 วัน');
const withResult={...regular,pretest_results_date:'2026-12-06'};
assert.equal(countdown.milestone(withResult,null,'2026-11-30').date,'2026-12-06');
assert.equal(countdown.milestone(withResult,'2026-12-07','2026-11-30').date,'2026-12-07');
t.setResultDate('2026-12-05');
assert.equal(tracker().resultDate(),'2026-12-05');
t.setResultDate('2027-02-30');assert.equal(t.resultDate(),null);
t.setResultDate(null);assert.equal(tracker().resultDate(),null);
console.log('PASS: Pre-Test priority, post-test unknown date, future/today/past result reminders, concurrent real-exam countdown, date override persistence and reset');

const calendarContext={window:{},TextEncoder};
vm.createContext(calendarContext);vm.runInContext(read('js/calendar.js'),calendarContext);
const calendar=calendarContext.window.MissionCalendar;
const activities=JSON.parse(read('data/activities.json'));
assert.equal(activities.events.length,5);
const noResultConfig={...config,admissions:{...config.admissions,programs:config.admissions.programs.map(p=>p.id==='regular'?{...p,pretest_results_date:null}:p)}};
const calendarEvents=calendar.list(noResultConfig,activities,{resultDate:()=>null,examDate:()=>null});
assert.equal(calendarEvents.length,7);
assert.equal(calendar.list(config,activities,{resultDate:()=>null,examDate:()=>null}).length,8);
assert.equal(calendarEvents[0].id,'regular-pretest');
const resultEvents=calendar.list(noResultConfig,activities,{resultDate:()=>'2026-12-05',examDate:()=>null});
assert.equal(resultEvents.length,8);
const exported=calendar.ics(calendarEvents,new Date('2026-10-03T00:00:00Z'));
assert.equal((exported.match(/BEGIN:VEVENT/g)||[]).length,7);
assert.ok(exported.includes('DTSTART:20261212T013000Z'));
assert.ok(exported.includes('DTEND:20261212T083000Z'));
assert.ok(exported.includes('DTSTART;VALUE=DATE:20261129'));
assert.ok(exported.includes('DTEND;VALUE=DATE:20261130'));
for(const line of exported.split('\r\n'))assert.ok(new TextEncoder().encode(line).length<=75);
const escaped=calendar.ics([{id:'escape',date:'2026-12-12',title:'A,B;C\\D\nE'}]);
assert.ok(escaped.includes('SUMMARY:A\\,B\\;C\\\\D\\nE'));
console.log('PASS: 5 fair activities, sorted primary exam/result calendar, Bangkok-to-UTC times, exclusive all-day end, ICS escaping and UTF-8 folding');

for(const name of ['dashboard','parent','calendar','countdown'])new vm.Script(read('js/'+name+'.js'));
const dashboardContext={window:{Catalog},Countdown:countdown};
vm.createContext(dashboardContext);vm.runInContext(read('js/dashboard.js'),dashboardContext);
const dashboard=dashboardContext.window.Dashboard;
const fresh={has:()=>false};
const socialOnly={...config,subjects:config.subjects.filter(s=>s.id==='social')}; // other subjects gain ready content over time
assert.equal(dashboard.recommendation(socialOnly,fresh,'2026-10-03').step.id,'social-part01');
assert.equal(dashboard.recommendation(socialOnly,fresh,'2026-10-03').minutes,20); // PDF lessons carry the clip length, not study_minutes, so the 20-minute session applies
assert.equal(dashboard.recommendation(socialOnly,{has:id=>id==='social-part01'},'2026-10-03').step.id,'social-part01-quiz'); // its end-of-chapter quiz is ready now
assert.ok(dashboard.recommendation(config,fresh,'2026-10-03').step.file,'recommends only ready content');
assert.ok(dashboard.recommendation(config,{has:()=>true},'2026-10-03').review);
assert.equal(dashboard.recommendation({...config,subjects:config.subjects.map(s=>({...s,steps:s.steps.map(step=>({...step,file:null,quiz:step.quiz&&{...step.quiz,file:null}}))}))},fresh,'2026-10-03'),null); // no lesson and no exam ready
assert.equal(dashboard.subjectTarget(config.subjects[1],fresh).id,'english-part01');
const editorStorage=new Map();
function editor(){const context={window:{dispatchEvent(){}},localStorage:{getItem:k=>editorStorage.get(k)||null,setItem:(k,v)=>editorStorage.set(k,v),removeItem:k=>editorStorage.delete(k)},CustomEvent:class{}};
 vm.createContext(context);vm.runInContext(read('js/parent.js'),context);context.window.ParentTools.init(activities);return context.window.ParentTools;}
let editorTools=editor();
assert.throws(()=>editorTools.validate({events:[{id:'bad',title:'Bad',date:'2026-02-30'}]}));
assert.throws(()=>editorTools.validate({events:[{id:'bad',title:'Bad',date:'2026-12-12',start:'12:00',end:'11:00'}]}));
assert.throws(()=>editorTools.validate({events:[activities.events[0],activities.events[0]]}));
editorTools.upsert({id:'custom',title:'Read together',date:'2026-10-10'});
assert.equal(editor().activities().events.length,6);
editorTools.upsert({id:'custom',title:'Read later',date:'2026-10-11'});
assert.equal(editorTools.activities().events.find(e=>e.id==='custom').title,'Read later');
editorTools.remove('custom');assert.equal(editorTools.activities().events.length,5);
editorTools.upsert({id:'custom',title:'Read together',date:'2026-10-10'});editorTools.reset();assert.equal(editorTools.activities().events.length,5);
const validBackup={version:1,completed:['social-part01'],attempts:[{id:'mock',title:'Mock',date:'2026-10-03T00:00:00Z',score:1,total:1,answers:[{question:'Q',selected:0,correct:0}]}],examDate:null,resultDate:null};
t.restore(validBackup);assert.equal(tracker().has('social-part01'),true);
assert.throws(()=>t.restore({...validBackup,attempts:[{...validBackup.attempts[0],score:9}]}));
assert.equal(tracker().attempts()[0].score,1);
assert.throws(()=>t.restore({...validBackup,resultDate:'2026-02-30'}));
console.log('PASS: ready-only daily recommendations, next/review/empty states, durations, activity schema/date/time/id validation, event CRUD persistence/reset and validated progress restore');

new vm.Script(read('js/build-info.js'));
const build=JSON.parse(read('data/build.json'));assert.ok(read('index.html').includes('data-build-id=\"'+build.build_id+'\"'));assert.ok(read('index.html').includes('./js/app.js?v='+build.build_id));console.log('PASS: stamped build manifest and loaded HTML/asset identity');

const socialVideos=["O1nzUrNctik","Oh7BB9fiWxk","lwrMYO1pP40","ljLU4tBXzZw","YB9_6Y31dq0","9MLokAEhwmc","jDN12vdh84w","mKc5TNy4034","Gk7naGQTzD0","vHeBan42X7E","H1eALn71IBU","jTc5Cyj4jiY","4mxEfGB8IPw"];
for(let i=0;i<socialVideos.length;i++){
 const step=config.subjects[0].steps.find(s=>s.id==='social-part'+String(i+1).padStart(2,'0'));
 const content=read(step.file.slice(2));
 assert.ok(content.includes('video_url: "https://www.youtube.com/watch?v='+socialVideos[i]+'"'));
}
const appSource=read('js/app.js');
const videoSource=appSource.slice(appSource.indexOf('function video(url)'),appSource.indexOf('function show(kind)'));
class MediaNode{constructor(tag){this.tag=tag;this.children=[];this.attrs={};}append(...n){this.children.push(...n);}setAttribute(k,v){this.attrs[k]=v;}}
const mediaContext={URL,element:(tag,text,cls)=>{const n=new MediaNode(tag);n.textContent=text;n.className=cls;return n;}};
vm.createContext(mediaContext);vm.runInContext(videoSource+';this.makeVideo=video;',mediaContext);
for(const id of socialVideos){
 const media=mediaContext.makeVideo('https://www.youtube.com/watch?v='+id),iframe=media.box.children[0],url=new URL(iframe.src);
 assert.equal(iframe.tag,'iframe');assert.equal(url.pathname,'/embed/'+id);
 assert.equal(url.searchParams.get('controls'),'1');assert.equal(url.searchParams.get('playsinline'),'1');assert.equal(url.searchParams.get('autoplay'),'0');
 assert.equal(url.searchParams.get('origin'),null);assert.equal(media.link.href,'https://www.youtube.com/watch?v='+id);
 assert.equal(iframe.referrerPolicy,'strict-origin-when-cross-origin');
}
assert.throws(()=>mediaContext.makeVideo('http://example.com/video.mp4'));
console.log('PASS: all 13 Social Markdown/config video mappings, iframe controls/inline/no-autoplay, referrer and fallback links');

assert.equal(config.subjects.reduce((n,s)=>n+s.steps.length,0),53);
assert.ok(config.subjects.every(s=>s.steps.every(step=>!/-intro$|-pdf-guide$/.test(step.id))));
assert.equal(dashboard.recommendation(socialOnly,{has:id=>id.startsWith('social-part')},'2026-10-03').step.id,'social-mock01');
stored.set('satit-swu-hub:v1',JSON.stringify({version:1,completed:['social-intro','social-pdf-guide','social-part01'],attempts:[{id:'social-mock01',title:'Old mock',score:0,total:1,date:'2026-10-01T00:00:00Z'}],examDate:null,resultDate:null}));
let migrated=tracker();assert.equal(migrated.stats(config).done,2);assert.equal(migrated.stats(config).total,105);
assert.equal(migrated.has('social-part01'),true);assert.equal(migrated.has('social-mock01'),true);
migrated.addAttempt({id:'social-mock01',title:'Mock again',score:1,total:1});assert.equal(migrated.stats(config).done,2);
migrated.addAttempt({id:'social-part02:mini',title:'Mini',score:1,total:1});assert.equal(migrated.has('social-part02'),false);
for(let i=0;i<101;i++)migrated.addAttempt({id:'other-mock-'+i,title:'Other',score:1,total:1});
assert.equal(tracker().has('social-mock01'),true);assert.equal(tracker().stats(config).done,2);
console.log('PASS: no intro/PDF steps, 53 total units, old PART progress retained, historical exam migration, repeated exams counted once, mini-quiz excluded and exam completion retained after history rotation');

const lessons=config.subjects.flatMap(s=>s.steps.filter(step=>step.type==='lesson'));
assert.equal(lessons.length,52);
for(const lesson of lessons){assert.match(lesson.title,/^PART \d{2}$/);assert.equal(lesson.quiz.id,lesson.id+'-quiz');assert.equal(lesson.quiz.type,'exam');assert.equal(lesson.quiz.questions,20);}
const socialItems=Catalog.items(config.subjects[0]).map(x=>x.id);
assert.deepEqual(socialItems.slice(0,4),['social-part01','social-part01-quiz','social-part02','social-part02-quiz']);
assert.equal(socialItems.at(-1),'social-mock01');
assert.equal(Catalog.parentOf(config.subjects[0],'social-part05-quiz').id,'social-part05');
assert.equal(Catalog.parentOf(config.subjects[0],'social-mock01'),null);
const withQuiz={...socialOnly,subjects:socialOnly.subjects.map(s=>({...s,steps:s.steps.map(step=>step.id==='social-part01'?{...step,quiz:{...step.quiz,file:'./data/exams/x.md'}}:step)}))};
assert.equal(dashboard.recommendation(withQuiz,{has:id=>id==='social-part01'},'2026-10-03').step.id,'social-part01-quiz');
assert.equal(dashboard.subjectTarget(withQuiz.subjects[0],{has:id=>id==='social-part01'}).id,'social-part01-quiz');
for(let i=1;i<=13;i++){const meta=read('data/content/social-part'+String(i).padStart(2,'0')+'.md');assert.match(meta,/\nvideo_match:\n  status: "(confirmed|partial|unconfirmed)"\n  evidence: "/);assert.match(meta,/\nanalysis_status: "(sample-unverified|pending|pdf-draft|pdf-verified)"/);}
for(const s of config.subjects)for(const step of s.steps)if(step.quiz&&step.quiz.file)assert.notEqual(step.quiz.file,step.file,step.quiz.id+' must point to an exam file, not the lesson');
for(const s of config.subjects)for(const step of s.steps)if(step.file&&fs.existsSync(step.file.replace('./','')))assert.ok(!read(step.file.replace('./','')).includes('dQw4w9WgXcQ'),step.id+' has a placeholder video');
for(const s of config.subjects.filter(s=>s.id!=='social'))for(const step of s.steps.filter(x=>x.type==='lesson'))assert.match(step.video_url||'',/^https:\/\/www\.youtube\.com\/watch\?v=[\w-]{11}$/,step.id+' video');
console.log('PASS: 52 PART lessons each followed by a 20-question end-of-chapter quiz, 105 progress units, quiz recommended after its lesson once ready, video-match evidence and analysis status on every Social PART');

/* Google Sheet sync: Apps Script backend against an in-memory spreadsheet, plus tracker merge. */
function fakeAppsScript(claimsFor){
 const tabs=new Map(),props={GOOGLE_CLIENT_ID:'client-1.apps.googleusercontent.com',ALLOWED_EMAILS:'dad@example.com, Porjai@Example.com'};
 const cell=v=>typeof v==='string'&&v.startsWith("'")?v.slice(1):v;
 function tab(name){const rows=[];return {rows,appendRow:r=>rows.push(r.map(cell)),setFrozenRows(){},setColumnWidth(){},getLastRow:()=>rows.length,
  getDataRange:()=>({getValues:()=>rows.map(r=>[...r])}),
  getRange:(row,col,n,w)=>({getValues:()=>rows.slice(row-1,row-1+n).map(r=>r.slice(col-1,col-1+w)),setValues:vals=>vals.forEach((v,i)=>{rows[row-1+i]=v.map(cell);})})};}
 const ctx={JSON,Date,Object,Array,String,Number,Math,isFinite,isNaN,encodeURIComponent,
  SpreadsheetApp:{getActiveSpreadsheet:()=>({getSheetByName:n=>tabs.get(n)||null,insertSheet:n=>{const t=tab(n);tabs.set(n,t);return t;}})},
  PropertiesService:{getScriptProperties:()=>({getProperty:k=>props[k]||null})},
  CacheService:{getScriptCache:()=>({get:()=>null,put(){}})},
  Utilities:{base64EncodeWebSafe:x=>String(x),computeDigest:(_,s)=>s,DigestAlgorithm:{SHA_256:1}},
  UrlFetchApp:{fetch:url=>{const claims=claimsFor(decodeURIComponent(url.split('id_token=')[1]));return {getResponseCode:()=>claims?200:400,getContentText:()=>JSON.stringify(claims)};}},
  LockService:{getScriptLock:()=>({waitLock(){},releaseLock(){}})},
  ContentService:{MimeType:{JSON:'json'},createTextOutput:text=>({setMimeType(){return this;},text})}};
 vm.createContext(ctx);vm.runInContext(read('backend/apps-script/Code.gs'),ctx);
 ctx.post=body=>JSON.parse(ctx.doPost({postData:{contents:JSON.stringify(body)}}).text);ctx.tabs=tabs;return ctx;
}
const future=Math.floor(Date.UTC(2030,0,1)/1000);
const claimsFor=t=>({dad:{aud:'client-1.apps.googleusercontent.com',iss:'https://accounts.google.com',email:'dad@example.com',email_verified:'true',exp:String(future)},
 kid:{aud:'client-1.apps.googleusercontent.com',iss:'accounts.google.com',email:'porjai@example.com',email_verified:true,exp:future},
 stranger:{aud:'client-1.apps.googleusercontent.com',iss:'accounts.google.com',email:'x@example.com',email_verified:'true',exp:String(future)},
 otherapp:{aud:'other',iss:'accounts.google.com',email:'dad@example.com',email_verified:'true',exp:String(future)},
 expired:{aud:'client-1.apps.googleusercontent.com',iss:'accounts.google.com',email:'dad@example.com',email_verified:'true',exp:'1000'}}[(t.match(/^tok-([a-z]+)/)||[])[1]]||null);
const gs=fakeAppsScript(claimsFor);
for(const [tok,msg] of [['tok-stranger-0000000000','ยังไม่ได้รับอนุญาต'],['tok-otherapp-0000000000','ไม่ได้ออกให้เว็บนี้'],['tok-expired-00000000000','หมดอายุ'],['tok-garbage-xxxxxxxxxx','token ไม่ถูกต้อง'],['', 'เข้าสู่ระบบ']]){const r=gs.post({action:'sync',id_token:tok,state:{}});assert.equal(r.ok,false);assert.ok(r.error.includes(msg),r.error);}
assert.equal(gs.tabs.size,0);
assert.equal(gs.post({action:'whoami',id_token:'tok-kid-0000000000000'}).email,'porjai@example.com');
// iPad: completes PART 01 and does a quiz
stored.clear();const ipad=tracker();ipad.toggle('social-part01');ipad.addAttempt({id:'social-mock01',title:'Mock',score:3,total:5,answers:[]});ipad.setExamDate('2027-02-08');
let r1=gs.post({action:'sync',id_token:'tok-kid-0000000000000',state:ipad.syncPayload()});assert.equal(r1.ok,true);
assert.equal(r1.state.attempts.length,1);assert.equal(r1.state.marks['social-part01'].done,true);assert.equal(r1.state.settings.examDate.value,'2027-02-08');
// Same payload again does not duplicate rows
gs.post({action:'sync',id_token:'tok-kid-0000000000000',state:ipad.syncPayload()});assert.equal(gs.tabs.get('attempts').rows.length,2);assert.equal(gs.tabs.get('marks').rows.length,3);
// Dad's computer starts empty, pulls the iPad's work, then un-marks PART 01 later
stored.clear();const pc=tracker();assert.equal(pc.has('social-part01'),false);
let r2=gs.post({action:'sync',id_token:'tok-dad-00000000000000',state:pc.syncPayload()});pc.applyRemote(r2.state);
assert.equal(pc.has('social-part01'),true);assert.equal(pc.has('social-mock01'),true);assert.equal(pc.examDate(),'2027-02-08');assert.equal(pc.attempts().length,1);
{const t0=Date.now();while(Date.now()<=t0+1){}}pc.toggle('social-part01');assert.equal(pc.has('social-part01'),false);
r2=gs.post({action:'sync',id_token:'tok-dad-00000000000000',state:pc.syncPayload()});assert.equal(r2.state.marks['social-part01'].done,false);
// Older iPad mark loses to the newer un-mark; iPad picks up the change
ipad.applyRemote(r2.state);assert.equal(ipad.has('social-part01'),false);
assert.equal(gs.tabs.get('marks').rows.find(r=>r[0]==='social-part01')[3],'dad@example.com');
assert.ok(gs.tabs.get('log').rows.length>=4);
// Malformed payload pieces are dropped, not stored
gs.post({action:'sync',id_token:'tok-dad-00000000000000',state:{marks:{'BAD ID':{done:true,at:'2026-01-01T00:00:00Z'},'x':{done:'yes',at:'2026'}},attempts:[{id:'a',title:'t',score:9,total:1,date:'2026-01-01T00:00:00Z'}],settings:{examDate:{value:'2027-02-30x',at:'2026-01-01T00:00:00Z'}}}});
assert.equal(gs.tabs.get('attempts').rows.length,2);assert.ok(!gs.tabs.get('marks').rows.some(r=>r[0]==='BAD ID'));
// Legacy progress without timestamps still uploads and stays done
stored.set('satit-swu-hub:v1',JSON.stringify({version:1,completed:['social-part05'],attempts:[],examDate:null,resultDate:null}));
const legacy=tracker();assert.equal(legacy.syncPayload().marks['social-part05'].done,true);
legacy.applyRemote(gs.post({action:'sync',id_token:'tok-kid-0000000000000',state:legacy.syncPayload()}).state);assert.equal(legacy.has('social-part05'),true);assert.equal(legacy.has('social-mock01'),true);
new vm.Script(read('js/sync.js'));
const syncContext={window:{},document:{},atob:s=>Buffer.from(s,'base64').toString('binary')};vm.createContext(syncContext);vm.runInContext(read('js/sync.js'),syncContext);
const fakeJwt='x.'+Buffer.from(JSON.stringify({email:'พอใจ@example.com',exp:1})).toString('base64url')+'.y';
assert.equal(syncContext.window.MissionSync._decode(fakeJwt).email,'พอใจ@example.com');
assert.deepEqual(config.sync&&Object.keys(config.sync).slice(0,2),['google_client_id','apps_script_url']);
console.log('PASS: Google Sheet sync rejects unlisted/other-app/expired/invalid tokens, allows listed accounts, merges two devices (newest mark wins, attempts union without duplicates, dates), drops malformed data, uploads legacy progress');

/* Study plan: fixed schedule from config, Sheet plan tabs seeded to match it, parser rejects bad rows. */
{
 const planContext={window:{Catalog},document:{getElementById:()=>null},Countdown:countdown};vm.createContext(planContext);vm.runInContext(read('js/plan.js'),planContext);
 const plan=planContext.window.StudyPlan,days=plan.schedule(config),dates=Object.keys(days).sort(),pretest=config.admissions.programs.find(p=>p.id==='regular').pretest_date;
 const total=config.subjects.reduce((n,s)=>n+Catalog.items(s).length,0);
 assert.equal(dates.reduce((n,d)=>n+days[d].length,0),total);
 const finish=plan.finishDates(days);
 for(const id of ['math','science','thai','social'])assert.ok(finish[id]<pretest,id+' must end before Pre-Test');
 for(const d of dates){assert.notEqual(new Date(d+'T00:00:00Z').getUTCDay(),0,'no study on Sunday');
  for(const x of days[d]){if(x.subject.id==='english')assert.ok(d>pretest,'English waits until after Pre-Test');assert.equal(x.minutes,plan.minutes(x.step,config.daily_plan));}}
 // a PART takes its real length (clip + reading), a long PART still gets a day of its own, days start at the period time
 const sci3=Object.values(days).flat().find(x=>x.step.id==='science-part03');assert.equal(sci3.minutes,178+10);
 assert.equal(days['2026-10-05'][0].slot.time,'09:00');assert.ok(Object.values(days).every(list=>list.length===1||list.reduce((n,x)=>n+x.minutes,0)<=180));
 for(const d of dates.filter(d=>d>='2026-11-01'))assert.equal(days[d][0].slot.time,'17:00');
 // a lesson always comes before its own quiz
 const at={};for(const d of dates)days[d].forEach((x,i)=>at[x.step.id]=d+i);for(const s of config.subjects)for(const step of s.steps)if(step.quiz)assert.ok(at[step.id]<at[step.quiz.id]);
 assert.equal(plan.recurring(config.daily_plan,'2026-12-28').length,1);assert.equal(plan.recurring(config.daily_plan,'2027-01-04').length,0,'English class ends Dec 2026');
 const sheetBackend=fakeAppsScript(claimsFor);sheetBackend.post({action:'login',id_token:'tok-dad-0000000000000'});
 for(const name of ['แผน-วิธีใช้','แผน-ตั้งค่า','แผน-ช่วงเวลา','แผน-วิชา','แผน-วันพิเศษ','แผน-คลาส'])assert.ok(sheetBackend.tabs.get(name).rows.length>1,name+' seeded');
 const remote=sheetBackend.post({action:'sync',id_token:'tok-dad-0000000000000',state:{marks:{},attempts:[],settings:{}}}).plan;
 assert.equal(remote.start_date,config.daily_plan.start_date);
 assert.deepEqual(JSON.parse(JSON.stringify(remote.recurring_events)),config.daily_plan.recurring_events);
 const fromSheet=plan.schedule({...config,daily_plan:{...config.daily_plan,...remote}}),key=d=>Object.keys(d).map(x=>x+':'+d[x].map(y=>y.step.id+'@'+y.slot.time).join(','));
 assert.deepEqual(key(fromSheet),key(days),'Sheet seed gives the same plan as config');
 assert.equal(sheetBackend.parsePlan([['วันเริ่มแผน','2026-13-40'],['นาทีเรียนต่อวัน','9999']],[['x','2026-11-02','2026-11-01','09:00',60]],[['c','zz','19:00']],[['xx','1','1','','']],[['nope','หยุด','','']]),null);
 // Thai dates (พ.ศ.), subject order/weight/start date/note and special days from the Sheet
 assert.equal(sheetBackend.parseDate('12/10/2569'),'2026-10-12');assert.equal(sheetBackend.parseDate('2569-10-12'),'2026-10-12');assert.equal(sheetBackend.parseDate('31/02/2026'),'');
 const custom=sheetBackend.parsePlan([['วันเริ่มแผน','5/10/2569']],[],[],[['อังกฤษ','1','2','','อ่านออกเสียงด้วยนะ'],['คณิต','2','1','',''],['ภาษาไทย','3','','1/11/2569',''],['xx','4','1','','']],
  [['12/10/2569','หยุด','',''+'ไปเที่ยว'],['13/10/2569','60','13:00',''],['ตัวอย่าง 14/10/2569','หยุด','','']]);
 assert.equal(custom.start_date,'2026-10-05');assert.equal(JSON.stringify(custom.subjects.map(x=>[x.id,x.weight,x.from||''])),JSON.stringify([['english',2,''],['math',1,''],['thai',1,'2026-11-01']]));
 assert.equal(JSON.stringify(custom.days),JSON.stringify({'2026-10-12':{note:'ไปเที่ยว',minutes:0},'2026-10-13':{note:'',minutes:60,start:'13:00'}}));
 const customPlan={...config,daily_plan:{...config.daily_plan,...custom}},cd=plan.schedule(customPlan);
 assert.deepEqual(cd['2026-10-05'].map(x=>x.subject.id).slice(0,2).join(),'english,english');
 assert.ok(!cd['2026-10-12'],'day off');assert.equal(cd['2026-10-13'][0].slot.time,'13:00');assert.equal(cd['2026-10-13'].length,1);assert.equal(plan.note(customPlan,'english'),'อ่านออกเสียงด้วยนะ');
 assert.ok(Object.keys(cd).filter(d=>cd[d].some(x=>x.subject.id==='thai')).every(d=>d>='2026-11-01'),'subject start date');
 assert.equal(Object.values(cd).reduce((n,d)=>n+d.length,0),total,'nothing dropped when days are off');
 const st=plan.standing(days,config.subjects.find(x=>x.id==='math'),{has:()=>false},'2026-10-08');assert.ok(st.behind>0&&st.ahead===0);
 // ticking lessons done never moves the plan
 assert.deepEqual(Object.keys(plan.schedule(config)),dates);
 console.log('PASS: study plan fills days with whole PARTs by real length, math/science/thai/social before Pre-Test, English after, class ends Dec, Sheet tabs seeded to the same plan, special days and subject settings, bad rows ignored');
}
