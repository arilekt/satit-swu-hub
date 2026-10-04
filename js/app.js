(() => {
'use strict';
let config,current=null,page='dashboard',request=0,lastHash='',statusTimeout;
const $=id=>document.getElementById(id);
const element=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;};
function notify(text){$('status').textContent=text;clearTimeout(statusTimeout);statusTimeout=setTimeout(()=>$('status').textContent='',10000);}
window.addEventListener('storage-warning',e=>notify(e.detail));
async function get(path,json=false){const response=await fetch(path,{cache:'no-store'});if(!response.ok)throw Error('โหลดไฟล์ไม่ได้ ('+response.status+')');return json?response.json():response.text();}
function parse(source){const match=source.replace(/^\uFEFF/,'').replace(/\r\n/g,'\n').match(/^---\n([\s\S]*?)\n---(?:\n|$)([\s\S]*)$/);if(!match)throw Error('ไม่พบ YAML Frontmatter');const meta=jsyaml.load(match[1]);if(!meta||typeof meta!=='object'||Array.isArray(meta)||typeof meta.title!=='string')throw Error('Frontmatter ต้องมี title');return {meta,body:match[2]};}
async function ensureMarkdown(){const ready=()=>window.marked&&window.jsyaml&&window.DOMPurify;if(ready())return;await new Promise((resolve,reject)=>{const start=Date.now();const timer=setInterval(()=>{if(ready()){clearInterval(timer);resolve();}else if(Date.now()-start>8000){clearInterval(timer);reject(Error("โหลดเครื่องมืออ่านบทเรียนไม่สำเร็จ ตรวจอินเทอร์เน็ตแล้วลองอีกครั้ง"));}},100);});}
function renderMarkdown(body){const box=element('article',undefined,'prose');box.innerHTML=DOMPurify.sanitize(marked.parse(body),{FORBID_TAGS:['iframe','style','form','input','button'],FORBID_ATTR:['style']});box.querySelectorAll('a').forEach(a=>a.rel='noopener noreferrer');return box;}
function updateSidebar(){
  if(!current)return;
  $('subjects').replaceChildren();
  config.subjects.forEach(subject=>{const link=element('a',undefined,'subject'+(subject.id===current.subject.id?' active':''));link.href='#'+subject.id+'/'+Dashboard.subjectTarget(subject,Tracker).id;link.append(element('span',subject.icon+' '+subject.name),element('small',Catalog.items(subject).filter(s=>Tracker.has(s.id)).length+'/'+Catalog.items(subject).length));if(subject.id===current.subject.id)link.setAttribute('aria-current','true');$('subjects').append(link);});
  $('lessons').replaceChildren();
  const link=(step,label,cls)=>{const done=Tracker.has(step.id),a=element('a',undefined,cls+(step.id===current.step.id?' active':'')+(step.file?'':' pending'));a.href='#'+current.subject.id+'/'+step.id;const circle=element('span',done?'✓':'','circle'+(done?' done':''));circle.setAttribute('aria-hidden','true');a.append(circle,label);if(done)a.append(element('small','จบแล้ว','done-tag'));else if(!step.file)a.append(element('small','รอเนื้อหา','pending-tag'));if(step.id===current.step.id)a.setAttribute('aria-current','page');return a;};
  const extras=[];
  current.subject.steps.forEach(step=>{
   if(step.type!=='lesson'){extras.push(step);return;}
   const group=element('div',undefined,'part-group');
   const label=element('span',undefined,'part-label');label.append(element('strong',step.title));
   const chapter=element('span',step.chapter_title||'รอชื่อบทจาก PDF','part-chapter'+(step.chapter_title?'':' muted'));if(step.chapter_title&&step.chapter_status!=='confirmed')chapter.append(element('em',' · รอยืนยัน'));label.append(chapter);
   group.append(link(step,label,'lesson part'));
   if(step.quiz)group.append(link(step.quiz,element('span','📝 สอบท้ายบท','quiz-label'),'lesson quiz-link'));
   $('lessons').append(group);
  });
  const more=[...extras,...(current.subject.exams||[])];
  if(more.length){$('lessons').append(element('div','สนามซ้อมรวม','lesson-subheading'));more.forEach(step=>$('lessons').append(link(step,element('span',step.title),'lesson')));}
}
function update(){
 if(!config)return;
 Dashboard.render(config,ParentTools.activities(),Tracker);
 if(page==='parent')ParentTools.render(config,Tracker);
 if(page==='lesson'){updateSidebar();const button=$('complete-button');if(button)button.textContent=Tracker.has(current.step.id)?'✓ เรียนจบแล้ว · คลิกเพื่อยกเลิก':'เรียนจบแล้ว..คลิก ✓';}
}
function video(url){
 const box=element('div',undefined,'video');
 if(!url){box.append(element('span','▷','play'),element('strong','ยังไม่มีวิดีโอในบทนี้'),element('small','อ่านสรุปด้านล่างได้เลย'));return {box};}
 let u;try{u=new URL(url);}catch(_){throw Error('video_url ไม่ถูกต้อง');}
 if(u.protocol!=='https:')throw Error('วิดีโอต้องใช้ HTTPS');
 let id=null;if(u.hostname==='youtu.be')id=u.pathname.slice(1);else if(['www.youtube.com','youtube.com','www.youtube-nocookie.com'].includes(u.hostname))id=u.searchParams.get('v')||(u.pathname.match(/^\/embed\/([^/]+)$/)||[])[1];
 if(id&&/^[\w-]{11}$/.test(id)){const frame=element('iframe');frame.src='https://www.youtube-nocookie.com/embed/'+id+'?autoplay=0&controls=1&playsinline=1&rel=0';frame.title='วิดีโอประกอบบทเรียน';frame.allow='accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen; web-share';frame.setAttribute('allowfullscreen','');frame.referrerPolicy='strict-origin-when-cross-origin';box.append(frame);const link=element('a','เปิดบน YouTube หากวิดีโอไม่แสดง ↗','video-link');link.href='https://www.youtube.com/watch?v='+id;link.target='_blank';link.rel='noopener noreferrer';return {box,link};}
 if(/\.mp4$/i.test(u.pathname)){const player=element('video');player.controls=true;player.playsInline=true;player.preload='metadata';player.src=u.href;box.append(player);}
 else{const link=element('a','เปิดวิดีโอประกอบบทเรียน ↗');link.href=u.href;link.target='_blank';link.rel='noopener noreferrer';box.append(link);}
 return {box};
}
const MATCH_LABELS={confirmed:'ยืนยันแล้ว',partial:'ยืนยันบางส่วน',unconfirmed:'ยังไม่ยืนยัน'};
const ANALYSIS_LABELS={'pdf-verified':'สรุปจาก PDF ตรวจแล้ว','pdf-draft':'สรุปจาก PDF รอผู้ใหญ่ตรวจ','sample-unverified':'ตัวอย่างเดิม ยังไม่ได้ตรวจกับ PDF/วิดีโอ',pending:'รอวิเคราะห์จาก PDF'};
function analysisBadge(status){const key=ANALYSIS_LABELS[status]?status:'pending';return element('span',ANALYSIS_LABELS[key],'badge analysis-'+key);}
function videoMatch(match){
 if(!match||typeof match!=='object')return null;
 const status=MATCH_LABELS[match.status]?match.status:'unconfirmed',box=element('details',undefined,'video-match match-'+status);
 box.append(element('summary','การจับคู่วิดีโอกับบทเรียน: '+MATCH_LABELS[status]));
 if(typeof match.evidence==='string'&&match.evidence)box.append(element('p','หลักฐาน: '+match.evidence));
 if(typeof match.unconfirmed==='string'&&match.unconfirmed)box.append(element('p','ยังไม่ยืนยัน: '+match.unconfirmed));
 return box;
}
function show(kind){
 page=kind;
 for(const id of ['dashboard','lesson','parent'])$(id+'-page').hidden=id!==kind;
 for(const [id,kindName] of [['dashboard','dashboard'],['learn','lesson'],['parent','parent']]){const a=$('nav-'+id);if(kind===kindName)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');}
}
async function route(){
 if(!config)return;
 if(QuizEngine.isActive()&&location.hash!==lastHash&&!confirm('เปลี่ยนหน้าตอนนี้ไหม? ข้อสอบรอบที่ยังไม่ส่งจะไม่ถูกบันทึก')){history.replaceState(null,'',lastHash);return;}
 QuizEngine.dispose();lastHash=location.hash;const token=++request;
 const [subjectId,stepId]=location.hash.slice(1).split('/');
 if(!subjectId||subjectId==='dashboard'||subjectId==='main'){show('dashboard');update();return;}
 if(subjectId==='parent'){show('parent');update();return;}
 const subject=subjectId==='learn'?(current?.subject||config.subjects[0]):config.subjects.find(s=>s.id===subjectId);
 if(!subject){show('dashboard');update();notify('ไม่พบหน้านี้ กลับบ้านของพอใจก่อนนะ');return;}
 const step=[...Catalog.items(subject),...(subject.exams||[])].find(s=>s.id===stepId)||(subjectId==='learn'&&current?current.step:Dashboard.subjectTarget(subject,Tracker));
 current={subject,step};show('lesson');update();
 const main=$('lesson-content');main.replaceChildren(element('p','กำลังเปิดภารกิจ…'));
 try{
  const parent=Catalog.parentOf(subject,step.id);
  if(!step.file){main.replaceChildren(element('span',subject.name+(parent?' / แบบทดสอบท้ายบท':''),'tag'),element('h2',step.title,'title'),element('p',parent?'แบบทดสอบ '+(step.questions||20)+' ข้อของ '+parent.title+' กำลังเตรียมจาก PDF เมื่อพร้อมจะขึ้นที่นี่เลย ระหว่างนี้กลับไปทบทวนบทเรียนก่อนนะ':'บทนี้กำลังเตรียมเนื้อหา ลองเลือกบทที่พร้อมก่อนนะ','notice'));if(parent){const back=element('a','← กลับไป '+parent.title,'secondary-link');back.href='#'+subject.id+'/'+parent.id;main.append(back);}return;}
  await ensureMarkdown();if(token!==request)return;
  const data=parse(await get(step.file));if(token!==request)return;
  if(data.meta.id!==step.id)throw Error('id ในบทเรียนไม่ตรงกับ config');
  if(step.type==='exam')QuizEngine.validate(data.meta.questions);
  if(data.meta.quick_quiz)QuizEngine.validate(data.meta.quick_quiz);
  const head=element('header',undefined,'lesson-head');head.append(element('span',subject.name+' / '+(step.type==='exam'?(parent?'แบบทดสอบท้ายบท · '+parent.title:'สนามซ้อม'):step.title),'tag'),element('h2',data.meta.title,'title'),element('p','⏱ '+(data.meta.duration||'เรียนตามจังหวะของเรา'),'meta'));
  if(step.type!=='exam'){
   const media=video(data.meta.video_url),stage=element('section',undefined,'video-stage');stage.append(media.box);if(media.link)stage.append(media.link);
   main.replaceChildren(stage,head);const match=videoMatch(data.meta.video_match);if(match)main.append(match);
   const heading=element('div',undefined,'analysis-heading');heading.append(element('h3','📖 สรุปเนื้อหาจากการวิเคราะห์'),analysisBadge(data.meta.analysis_status));main.append(heading);
  }else main.replaceChildren(head);
  main.append(renderMarkdown(data.body));
  if(step.type==='exam'||data.meta.quick_quiz){const panel=element('section',undefined,'quiz-panel');panel.append(element('h3',step.type==='exam'?'สนามซ้อมข้อสอบ':'เช็กความเข้าใจเล็ก ๆ'));main.append(panel);QuizEngine.mount(panel,{id:step.id+(step.type==='exam'?'':':mini'),title:data.meta.title,time_limit_minutes:data.meta.time_limit_minutes||5},step.type==='exam'?data.meta.questions:data.meta.quick_quiz);}
  if(step.type!=='exam'){const complete=element('button',undefined,'primary complete');complete.id='complete-button';complete.onclick=()=>{Tracker.toggle(step.id);notify(Tracker.has(step.id)?'สำเร็จอีกหนึ่งก้าวแล้วพอใจ! 🌱':'ยกเลิกสถานะเรียนจบแล้ว');};main.append(complete);if(step.quiz){const next=element('a','ต่อด้วย 📝 แบบทดสอบท้ายบท '+(step.quiz.questions||20)+' ข้อ →','next-quiz');next.href='#'+subject.id+'/'+step.quiz.id;main.append(next);}update();}
 }catch(error){if(token!==request)return;main.replaceChildren(element('h2','ยังเปิดภารกิจไม่ได้'),element('p',error.message,'notice'));const retry=element('button','ลองอีกครั้ง','secondary');retry.onclick=route;main.append(retry);}
}
function parentRefresh(){update();notify('บันทึกกิจกรรมบนเครื่องนี้แล้ว');}
window.addEventListener('progress-changed',update);
window.addEventListener('activities-changed',parentRefresh);
window.addEventListener('hashchange',()=>{const intendedHash=location.hash;route().then(()=>{if(location.hash===intendedHash){$('main').focus({preventScroll:true});window.scrollTo({top:0,behavior:'auto'});}});});
document.addEventListener('visibilitychange',()=>{if(!document.hidden)update();});
window.addEventListener('beforeunload',e=>{if(QuizEngine.isActive()){e.preventDefault();e.returnValue='';}});
document.querySelector('.skip').onclick=e=>{e.preventDefault();$('main').focus();};
$('exam-date').onchange=e=>Tracker.setExamDate(e.target.value);
$('result-date').onchange=e=>Tracker.setResultDate(e.target.value);
$('reset-exam-date').onclick=()=>Tracker.setExamDate(null);
$('reset-result-date').onclick=()=>Tracker.setResultDate(null);
$('download-calendar').onclick=()=>{if(config)MissionCalendar.download(MissionCalendar.list(config,ParentTools.activities(),Tracker));};
$('cancel-edit-event').onclick=()=>{$('event-form').reset();$('event-id').value='';};
$('event-form').onsubmit=e=>{
 e.preventDefault();try{
 const id=$('event-id').value||'event-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,7);
 const existing=ParentTools.activities().events.find(x=>x.id===id)||{};
 const event={...existing,id};for(const key of ['title','date','location','start','end','description'])event[key]=$('event-'+key).value;
 ParentTools.upsert(event);$('event-form').reset();$('event-id').value='';parentRefresh();
 }catch(error){notify('ยังบันทึกไม่ได้: '+error.message);}
};
$('export-config').onclick=()=>{const next=JSON.parse(JSON.stringify(config)),regular=next.admissions.programs.find(p=>p.id===next.admissions.primary_program);regular.exam_date=Tracker.examDate()||regular.exam_date;regular.pretest_results_date=Tracker.resultDate()||regular.pretest_results_date;next.exam_date=regular.exam_date;ParentTools.downloadJSON(next,'config.json');};
$('export-activities').onclick=()=>ParentTools.downloadJSON(ParentTools.activities(),'activities.json');
$('reset-activities').onclick=()=>{if(confirm('กลับไปใช้กิจกรรมจากเว็บไหม? การแก้บนเครื่องนี้จะถูกล้าง ควรส่งออกก่อน'))try{ParentTools.reset();update();notify('ใช้กิจกรรมจากเว็บแล้ว');}catch(error){notify(error.message);}};
$('import-activities').onchange=async e=>{
 const file=e.target.files[0];if(!file)return;
 try{if(file.size>1024*1024)throw Error('ไฟล์ใหญ่เกิน 1 MB');const data=ParentTools.validate(JSON.parse(await file.text()));if(!confirm('นำเข้า '+data.events.length+' กิจกรรมแทนรายการบนเครื่องนี้ไหม? ควรส่งออกของเดิมก่อน'))return;ParentTools.replace(data);parentRefresh();}catch(error){notify('นำเข้าไม่ได้: '+error.message);}finally{e.target.value='';}
};
$('copy-summary').onclick=async()=>{if(!config)return;const text=Tracker.summary(config);try{await navigator.clipboard.writeText(text);notify('คัดลอกสรุปแล้ว');}catch(_){$('summary-fallback').hidden=false;$('summary-fallback').value=text;$('summary-fallback').focus();$('summary-fallback').select();notify('แตะค้างแล้วเลือกคัดลอกข้อความ');}};
$('export-progress').onclick=()=>ParentTools.downloadJSON(Tracker.exportData(),'satit-progress.json');
$('import-progress').onchange=async e=>{
 const file=e.target.files[0];if(!file)return;
 try{if(file.size>2*1024*1024)throw Error('ไฟล์ใหญ่เกิน 2 MB');const data=JSON.parse(await file.text());Tracker.validateBackup(data);if(!confirm('กู้คืนผลเรียนจากไฟล์แทนข้อมูลเครื่องนี้ไหม? กรุณากดสำรองผลเรียนก่อน'))return;Tracker.restore(data);notify('กู้คืนผลเรียนแล้ว');}catch(error){notify('กู้คืนไม่ได้: '+error.message);}finally{e.target.value='';}
};
$('history-button').onclick=()=>{
 const list=$('quiz-history');list.replaceChildren(element('h3','ประวัติสนามซ้อม'));
 const attempts=Tracker.attempts().reverse();if(!attempts.length)list.append(element('p','ยังไม่มีประวัติข้อสอบ','muted'));
 for(const attempt of attempts){const row=element('div',undefined,'answer');row.append(element('strong',attempt.title+' · '+attempt.score+'/'+attempt.total),element('p',new Date(attempt.date).toLocaleString('th-TH',{timeZone:'Asia/Bangkok'})));list.append(row);}
};
async function init(){
 try{
 config=await get('./data/config.json',true);if(!Array.isArray(config.subjects)||!config.subjects.length)throw Error('config ไม่ถูกต้อง');
 let activities={title:'กิจกรรมของพอใจ',events:[]};try{activities=await get('./data/activities.json',true);}catch(_){notify('โหลดกิจกรรมไม่สำเร็จ แสดงวันสอบก่อน ลองเปิดเว็บใหม่เพื่อโหลดกิจกรรม');}
 ParentTools.init(activities);if(window.MissionSync)MissionSync.init(config);await route();setInterval(update,60000);
 }catch(error){$('daily-mission').replaceChildren(element('p','เริ่มต้นเว็บไม่ได้: '+error.message,'notice'));notify(error.message);}
}
const gating=document.getElementById('login-gating');if(gating?.hidden) window.AppInit=init; else if(gating) init();
})();