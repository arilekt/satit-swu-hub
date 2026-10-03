/* Run: node tests/core.cjs */
const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const read = name => fs.readFileSync(path.join(root,name),'utf8');
for(const name of ['app','tracker','quiz-engine'])new vm.Script(read('js/'+name+'.js'));
const config=JSON.parse(read('data/config.json'));
assert.deepEqual(config.subjects.map(s=>s.steps.length),[15,13,9,11,14]);
for(const subject of config.subjects)for(const step of [...subject.steps,...subject.exams])if(step.file)assert.ok(fs.existsSync(path.join(root,step.file)));
const stored=new Map();
function tracker(){
  const c={localStorage:{getItem:k=>stored.get(k)||null,setItem:(k,v)=>stored.set(k,v)},window:{dispatchEvent(){}},CustomEvent:class{},Event:class{},setTimeout(){}};
  vm.createContext(c);vm.runInContext(read('js/tracker.js'),c);return c.window.Tracker;
}
let t=tracker();t.toggle('social-intro');t.addAttempt({id:'mock',title:'mock',score:1,total:2,answers:[{question:'Q',selected:0,correct:1}]});
t=tracker();assert.equal(t.has('social-intro'),true);assert.equal(t.stats(config).done,1);assert.equal(t.attempts()[0].score,1);assert.equal(t.exportData().attempts[0].answers[0].selected,0);
t.toggle('social-intro');assert.equal(t.stats(config).done,0);
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
console.log('PASS: syntax, 62-step catalogue, file paths, persistence, undo, separate exam progress, detailed export, schema, scoring, single submit, deadline, abandonment cleanup');
