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
panel.children[0].onclick();assert.equal(c.window.QuizEngine.isActive(),true);
const form=panel.children[1];form.children[0].children[2].children[0].onchange();
form.onsubmit({preventDefault(){}});assert.equal(attempts[0].score,1);assert.equal(attempts[0].total,1);assert.equal(c.window.QuizEngine.isActive(),false);
form.onsubmit({preventDefault(){}});assert.equal(attempts.length,1);
const timed=new Node('section');c.window.QuizEngine.mount(timed,{id:'timed',title:'timed',time_limit_minutes:1},q);timed.children[0].onclick();
now=61000;tick();assert.equal(attempts[1].timedOut,true);assert.equal(attempts[1].score,0);assert.equal(attempts[1].answers[0].selected,null);
const abandoned=new Node('section');c.window.QuizEngine.mount(abandoned,{id:'leave',title:'leave',time_limit_minutes:1},q);abandoned.children[0].onclick();c.window.QuizEngine.dispose();
assert.equal(attempts.length,2);assert.equal(listeners.size,0);assert.ok(cleared>0);
console.log('PASS: syntax, content-and-exam catalogue, file paths, persistence, undo, filtered progress, detailed export, schema, scoring, single submit, deadline, abandonment cleanup');

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
assert.equal(countdown.milestone(regular,null,'2026-11-30').phase,'results-unknown');
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
const calendarEvents=calendar.list(config,activities,{resultDate:()=>null,examDate:()=>null});
assert.equal(calendarEvents.length,7);
assert.equal(calendarEvents[0].id,'regular-pretest');
const resultEvents=calendar.list(config,activities,{resultDate:()=>'2026-12-05',examDate:()=>null});
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
assert.equal(dashboard.recommendation(config,fresh,'2026-10-03').step.id,'social-part01');
assert.equal(dashboard.recommendation(config,fresh,'2026-10-03').minutes,15);
assert.equal(dashboard.recommendation(config,{has:id=>id==='social-part01'},'2026-10-03').step.id,'social-part02');
assert.ok(dashboard.recommendation(config,{has:()=>true},'2026-10-03').review);
assert.equal(dashboard.recommendation({...config,subjects:config.subjects.map(s=>({...s,steps:s.steps.map(step=>({...step,file:null}))}))},fresh,'2026-10-03'),null);
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
assert.equal(dashboard.recommendation(config,{has:id=>id.startsWith('social-part')},'2026-10-03').step.id,'social-mock01');
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
const withQuiz={...config,subjects:config.subjects.map((s,i)=>i?s:{...s,steps:s.steps.map(step=>step.id==='social-part01'?{...step,quiz:{...step.quiz,file:'./data/exams/x.md'}}:step)})};
assert.equal(dashboard.recommendation(withQuiz,{has:id=>id==='social-part01'},'2026-10-03').step.id,'social-part01-quiz');
assert.equal(dashboard.subjectTarget(withQuiz.subjects[0],{has:id=>id==='social-part01'}).id,'social-part01-quiz');
for(let i=1;i<=13;i++){const meta=read('data/content/social-part'+String(i).padStart(2,'0')+'.md');assert.match(meta,/\nvideo_match:\n  status: "(confirmed|partial|unconfirmed)"\n  evidence: "/);assert.match(meta,/\nanalysis_status: "(sample-unverified|pending|pdf-draft|pdf-verified)"/);}
console.log('PASS: 52 PART lessons each followed by a 20-question end-of-chapter quiz, 105 progress units, quiz recommended after its lesson once ready, video-match evidence and analysis status on every Social PART');
