(() => {
'use strict';
let config,current=null,page='dashboard',request=0,lastHash='',statusTimeout;
const $=id=>document.getElementById(id);
const element=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;};
function notify(text){$('status').textContent=text;clearTimeout(statusTimeout);statusTimeout=setTimeout(()=>$('status').textContent='',10000);}
window.addEventListener('storage-warning',e=>notify(e.detail));
async function get(path,json=false){const response=await fetch(path,{cache:'no-store'});if(!response.ok)throw Error('โหลดไฟล์ไม่ได้ ('+response.status+')');return json?response.json():response.text();}
function parse(source){const match=source.replace(/^\uFEFF/,'').replace(/\r\n/g,'\n').match(/^---\n([\s\S]*?)\n---(?:\n|$)([\s\S]*)$/);if(!match)throw Error('ไม่พบ YAML Frontmatter');const meta=jsyaml.load(match[1]);if(!meta||typeof meta!=='object'||Array.isArray(meta)||typeof meta.title!=='string')throw Error('Frontmatter ต้องมี title');return {meta,body:match[2]};}
async function ensureMarkdown(){const ready=()=>window.marked&&window.jsyaml&&window.DOMPurify&&window.katex;if(ready())return;await new Promise((resolve,reject)=>{const start=Date.now();const timer=setInterval(()=>{if(ready()){clearInterval(timer);resolve();}else if(Date.now()-start>10000){clearInterval(timer);reject(Error("โหลดเครื่องมืออ่านบทเรียนไม่สำเร็จ ตรวจอินเทอร์เน็ตแล้วลองอีกครั้ง"));}},100);});}
function renderMarkdown(body){const box=element('article',undefined,'prose');const html=DOMPurify.sanitize(marked.parse(body),{FORBID_TAGS:['iframe','style','form','input','button'],FORBID_ATTR:['style']});box.innerHTML=html;box.querySelectorAll('a').forEach(a=>a.rel='noopener noreferrer');renderKatex(box);return box;}
function renderKatex(container){if(!window.katex)return;const walker=document.createTreeWalker(container,NodeFilter.SHOW_TEXT,null,false);const nodesToReplace=[];let node;while(node=walker.nextNode()){let text=node.textContent;if(text.includes('$')){nodesToReplace.push(node);}}
nodesToReplace.forEach(textNode=>{const text=textNode.textContent;const parts=[];let lastIdx=0,inMath=false;for(let i=0;i<text.length;i++){if(text[i]==='$'&&(i===0||text[i-1]!=='\\')){if(!inMath&&i+1<text.length&&text[i+1]!==' '){inMath=true;if(i>lastIdx)parts.push({type:'text',content:text.substring(lastIdx,i)});lastIdx=i+1;}else if(inMath){inMath=false;try{parts.push({type:'math',content:text.substring(lastIdx,i)});}catch(_){parts.push({type:'text',content:text.substring(lastIdx-1,i+1)});}lastIdx=i+1;}}}
if(lastIdx<text.length)parts.push({type:'text',content:text.substring(lastIdx)});const fragment=document.createDocumentFragment();parts.forEach(part=>{if(part.type==='text'){if(part.content)fragment.appendChild(document.createTextNode(part.content));}else{const span=element('span',undefined,'math-inline');try{span.innerHTML=window.katex.renderToString(part.content,{throwOnError:false});}catch(_){span.textContent='$'+part.content+'$';}fragment.appendChild(span);}});textNode.replaceWith(fragment);});}
const subjectsInOrder=()=>window.StudyPlan?StudyPlan.ordered(config):config.subjects;
const partName=step=>step.title+': '+(step.chapter_title||'รอชื่อบท');
function updateSidebar(){
  if(!current)return;
  $('subjects').replaceChildren();
  subjectsInOrder().forEach(subject=>{const lessons=subject.steps.filter(s=>s.type==='lesson'),link=element('a',undefined,'subject'+(subject.id===current.subject.id?' active':''));link.href='#'+subject.id+'/'+Dashboard.subjectTarget(subject,Tracker).id;link.append(element('span',subject.icon+' '+subject.name),element('small',lessons.filter(s=>Tracker.has(s.id)).length+'/'+lessons.length));if(subject.id===current.subject.id)link.setAttribute('aria-current','true');$('subjects').append(link);});
  $('lesson-heading').textContent=current.subject.icon+' '+current.subject.name+' · บทเรียนและข้อสอบท้ายบท';
  $('lessons').replaceChildren();
  const link=(step,label,cls,waitText)=>{const done=Tracker.has(step.id),a=element('a',undefined,cls+(step.id===current.step.id?' active':'')+(step.file?'':' pending'));a.href='#'+current.subject.id+'/'+step.id;const circle=element('span',done?'✓':'','circle'+(done?' done':''));circle.setAttribute('aria-hidden','true');a.append(circle,label);if(done)a.append(element('small',step.type==='exam'?'ทำแล้ว':'จบแล้ว','done-tag'));else if(!step.file)a.append(element('small',waitText,'pending-tag'));if(step.id===current.step.id)a.setAttribute('aria-current','page');return a;};
  const extras=[];
  current.subject.steps.forEach(step=>{
   if(step.type!=='lesson'){extras.push(step);return;}
   const group=element('div',undefined,'part-group');
   const label=element('span',undefined,'part-label');label.append(element('strong',step.title));
   const chapter=element('span',step.chapter_title||'รอชื่อบท','part-chapter'+(step.chapter_title?'':' muted'));if(step.chapter_title&&step.chapter_status!=='confirmed')chapter.append(element('em',' · รอยืนยัน'));label.append(chapter);
   group.append(link(step,label,'lesson part','รอเนื้อหา'));
   if(step.quiz)group.append(link(step.quiz,element('span','↳ ข้อสอบท้ายบท','quiz-label'),'lesson quiz-link','รอข้อสอบ'));
   $('lessons').append(group);
  });
  const more=[...extras,...(current.subject.exams||[])];
  if(more.length){$('lessons').append(element('div','ข้อสอบจำลองรวมทั้งวิชา','lesson-subheading'));more.forEach(step=>$('lessons').append(link(step,element('span',step.title,'quiz-label'),'lesson','รอข้อสอบ')));}
}
// "สำหรับคุณพ่อ": everything shown comes from progress on this device plus what the Sheet delivered with the last sync.
function renderParent(){
 const today=Countdown.today(),activities=ParentTools.activities();
 ParentDashboard.render($('pd-root'),{config,tracker:Tracker,schedule:window.StudyPlan?StudyPlan.schedule(config):{},today,subjectsInOrder:subjectsInOrder(),extras:latestExtras,
  nextActivity:Dashboard.eventGroups(activities,today)[0]||null,activityCount:activities.events.length,boostText:Dashboard.boost(),examDate:Tracker.examDate(),resultDate:Tracker.resultDate()});
}
document.addEventListener('click',e=>{const button=e.target.closest&&e.target.closest('[data-copy]');if(!button)return;navigator.clipboard.writeText(button.dataset.copy).then(()=>notify('คัดลอกคำสั่งแล้ว'),()=>notify('คัดลอกไม่ได้ ลองเลือกข้อความเอง'));});
function update(){
 if(!config)return;
 Dashboard.render(config,ParentTools.activities(),Tracker);
 if(page==='parent')renderParent();
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
const ANALYSIS_LABELS={'pdf-verified':'สรุปจาก PDF ตรวจแล้ว',completed:'สรุปจาก PDF แล้ว','pdf-draft':'สรุปจาก PDF รอผู้ใหญ่ตรวจ','sample-unverified':'ตัวอย่างเดิม ยังไม่ได้ตรวจกับ PDF/วิดีโอ',pending:'รอวิเคราะห์จาก PDF'};
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
 for(const id of ['dashboard','lesson','quiz','parent'])$(id+'-page').hidden=id!==kind;
 for(const [id,kindName] of [['dashboard','dashboard'],['learn','lesson'],['parent','parent']]){const a=$('nav-'+id);if(kind===kindName||(kind==='quiz'&&kindName==='lesson'))a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');}
}
// Exams get their own page with no lesson summary next to them; the answers stay hidden until "ส่งข้อสอบ".
async function quizPage(subject,step,token){
 const box=$('quiz-content'),parent=Catalog.parentOf(subject,step.id);
 const back=parent?{href:'#'+subject.id+'/'+parent.id,label:'← กลับไปบทเรียน '+partName(parent)}:{href:'#'+subject.id+'/'+Dashboard.subjectTarget(subject,Tracker).id,label:'← กลับไปห้องเรียน'+subject.name};
 const backLink=()=>{const a=element('a',back.label,'secondary-link quiz-back');a.href=back.href;return a;};
 const head=element('header',undefined,'quiz-head');
 head.append(element('span',subject.icon+' '+subject.name+' · '+(parent?parent.title+' · ข้อสอบท้ายบท':'ข้อสอบจำลองรวมทั้งวิชา'),'tag'),element('h2',parent?'ข้อสอบท้ายบท · '+partName(parent):step.title,'title'));
 box.replaceChildren(backLink(),head,element('p','กำลังเปิดข้อสอบ…'));
 if(!step.file){box.replaceChildren(backLink(),head,element('p',parent?'ข้อสอบท้ายบทของ '+parent.title+' ยังไม่พร้อม เมื่อเตรียมเสร็จจะขึ้นที่นี่ ระหว่างนี้กลับไปทบทวนบทเรียนก่อนนะ':'ข้อสอบชุดนี้ยังไม่พร้อม','notice'));return;}
 try{
  await ensureMarkdown();if(token!==request)return;
  const data=parse(await get(step.file));if(token!==request)return;
  if(data.meta.id!==step.id)throw Error('id ในข้อสอบไม่ตรงกับ config');
  QuizEngine.validate(data.meta.questions);
  const minutes=Number(data.meta.time_limit_minutes)||(window.StudyPlan?StudyPlan.minutes(step):30);
  if(!parent)head.querySelector('h2').textContent=data.meta.title;
  head.append(element('span',data.meta.questions.length+' ข้อ · เวลาแนะนำ '+minutes+' นาที','meta'));
  const panel=element('section',undefined,'quiz-panel');
  box.replaceChildren(backLink(),head,panel);
  const last=Tracker.attempts().filter(a=>a.id===step.id).pop();
  QuizEngine.mount(panel,{id:step.id,title:data.meta.title,time_limit_minutes:minutes,history:()=>Tracker.attempts().filter(a=>a.id===step.id),last:last?{score:last.score,total:last.total,elapsed_seconds:last.elapsed_seconds}:null,back,
   onstart:()=>{box.firstChild.hidden=true;head.classList.add('compact');window.scrollTo({top:0,behavior:'auto'});},
   onfinish:()=>{box.firstChild.hidden=false;head.classList.remove('compact');window.scrollTo({top:0,behavior:'auto'});update();}},data.meta.questions);
 }catch(error){if(token!==request)return;box.replaceChildren(backLink(),head,element('p','ยังเปิดข้อสอบไม่ได้: '+error.message,'notice'));const retry=element('button','ลองอีกครั้ง','secondary');retry.onclick=route;box.append(retry);}
}
async function route(){
 if(!config)return;
 if(QuizEngine.isActive()&&location.hash!==lastHash&&!confirm('เปลี่ยนหน้าตอนนี้ไหม? ข้อสอบรอบที่ยังไม่ส่งจะไม่ถูกบันทึก')){history.replaceState(null,'',lastHash);return;}
 QuizEngine.dispose();lastHash=location.hash;const token=++request;
 const [subjectId,stepId]=location.hash.slice(1).split('/');
 if(!subjectId||subjectId==='dashboard'||subjectId==='main'){show('dashboard');update();return;}
 if(subjectId==='parent'){show('parent');update();return;}
 const subject=subjectId==='learn'?(current?.subject||subjectsInOrder().find(s=>s.steps.some(x=>x.file))||subjectsInOrder()[0]):config.subjects.find(s=>s.id===subjectId);
 if(!subject){show('dashboard');update();notify('ไม่พบหน้านี้ กลับหน้าหลักก่อนนะ');return;}
 const step=[...Catalog.items(subject),...(subject.exams||[])].find(s=>s.id===stepId)||(subjectId==='learn'&&current?current.step:Dashboard.subjectTarget(subject,Tracker));
 current={subject,step};
 if(step.type==='exam'){show('quiz');update();await quizPage(subject,step,token);return;}
 show('lesson');update();
 const main=$('lesson-content');main.replaceChildren(element('p','กำลังเปิดภารกิจ…'));
 try{
  // Lessons only: every exam step goes to quizPage() above, which shares QuizEngine with the mini check below.
  if(!step.file){ // no summary yet: the clip (from config) can still be watched
   main.replaceChildren(element('span',subject.icon+' '+subject.name+' · '+step.title,'tag'),element('h2',partName(step),'title'));
   if(step.video_url){const media=video(step.video_url),stage=element('section',undefined,'video-stage');stage.append(media.box);if(media.link)stage.append(media.link);main.append(stage,element('p','สรุปเนื้อหาบทนี้กำลังตามมา ดูคลิปไปก่อนได้เลย','notice'));}
   else main.append(element('p','บทนี้ยังรอเนื้อหา ลองเลือกบทที่พร้อมก่อนนะ','notice'));
   return;}
  await ensureMarkdown();if(token!==request)return;
  const data=parse(await get(step.file));if(token!==request)return;
  if(data.meta.id!==step.id)throw Error('id ในบทเรียนไม่ตรงกับ config');
  if(data.meta.quick_quiz)QuizEngine.validate(data.meta.quick_quiz);
  const head=element('header',undefined,'lesson-head'),clip=step.source_duration_minutes?'คลิป '+step.source_duration_minutes+' นาที':null;
  const total=window.StudyPlan?StudyPlan.minutes(step,config.daily_plan||{}):null;
  head.append(element('span',subject.icon+' '+subject.name+' · '+step.title,'tag'),element('h2',data.meta.title,'title'),element('span',[total?'ใช้เวลาประมาณ '+total+' นาที':null,clip].filter(Boolean).join(' · '),'meta'));
  const media=video(data.meta.video_url||step.video_url),stage=element('section',undefined,'video-stage');stage.append(media.box);if(media.link)stage.append(media.link);
  main.replaceChildren(head,stage);
  const heading=element('div',undefined,'analysis-heading');heading.append(element('h3','📖 สรุปเนื้อหา'),analysisBadge(data.meta.analysis_status));main.append(heading);
  main.append(data.body.trim()?renderMarkdown(data.body):element('p','รอสรุปเนื้อหาจาก PDF','notice'));
  const match=videoMatch(data.meta.video_match);if(match)main.append(match);
  if(data.meta.quick_quiz){const panel=element('section',undefined,'quiz-panel');panel.append(element('h3','เช็กความเข้าใจเล็ก ๆ'));main.append(panel);QuizEngine.mount(panel,{id:step.id+':mini',title:data.meta.title,time_limit_minutes:data.meta.time_limit_minutes||5,start_label:'เริ่มเช็กความเข้าใจ ▶'},data.meta.quick_quiz);}
  const complete=element('button',undefined,'primary complete');complete.id='complete-button';complete.onclick=()=>{Tracker.toggle(step.id);notify(Tracker.has(step.id)?'สำเร็จอีกหนึ่งก้าวแล้วพอใจ! 🌱':'ยกเลิกสถานะเรียนจบแล้ว');};main.append(complete);
  if(step.quiz){const next=element('a',step.quiz.file?'ต่อด้วยแบบทดสอบท้ายบท →':'แบบทดสอบท้ายบท (รอข้อสอบ) →','next-quiz');next.href='#'+subject.id+'/'+step.quiz.id;main.append(next);}
  update();
 }catch(error){if(token!==request)return;main.replaceChildren(element('h2','ยังเปิดภารกิจไม่ได้'),element('p',error.message,'notice'));const retry=element('button','ลองอีกครั้ง','secondary');retry.onclick=route;main.append(retry);}
}
window.addEventListener('progress-changed',update);
window.addEventListener('hashchange',()=>{const intendedHash=location.hash;route().then(()=>{if(location.hash===intendedHash){$('main').focus({preventScroll:true});window.scrollTo({top:0,behavior:'auto'});}});});
document.addEventListener('visibilitychange',()=>{if(!document.hidden)update();});
window.addEventListener('beforeunload',e=>{if(QuizEngine.isActive()){e.preventDefault();e.returnValue='';}});
document.querySelector('.skip').onclick=e=>{e.preventDefault();$('main').focus();};
$('download-calendar').onclick=()=>{if(config)MissionCalendar.download(MissionCalendar.list(config,ParentTools.activities(),Tracker));};
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
// Study plan: data/config.json is the default; the plan tabs in Google Sheet override it after sync.
const PLAN_KEY='satit-swu-hub:plan';let defaultPlan=null;
function applyPlan(remote,save){
 if(!remote||typeof remote!=='object'||Array.isArray(remote))return false;
 const allowed=['start_date','start_time','day_minutes','break_minutes','reading_minutes','rest_weekdays','periods','recurring_events','subjects','days'],next={...defaultPlan,source:'sheet'};
 for(const key of allowed)if(remote[key]!==undefined)next[key]=remote[key];
 if(next.periods&&!Array.isArray(next.periods))return false;
 // periods from older Sheet tabs (slot lists, no minutes per day) would squeeze the plan: keep the default ones
 if(Array.isArray(remote.periods)&&!remote.periods.every(p=>p&&Number.isFinite(Number(p.day_minutes))))next.periods=defaultPlan.periods;
 if(next.subjects&&!Array.isArray(next.subjects))return false;
 if(next.days&&(typeof next.days!=='object'||Array.isArray(next.days)))return false;
 config.daily_plan=next;
 if(save)try{localStorage.setItem(PLAN_KEY,JSON.stringify(remote));}catch(_){/* keep in memory */}
 return true;
}
window.addEventListener('plan-remote',e=>{if(!config||!defaultPlan)return;
 if(e.detail===null){try{localStorage.removeItem(PLAN_KEY);}catch(_){/* ignore */}if(config.daily_plan.source!=='default'){config.daily_plan=defaultPlan;update();}return;}
 if(applyPlan(e.detail,true))update();});
// Sync button on the plan calendar: pull the latest plan and progress from Google Sheet without reloading.
document.getElementById('plan-sync')?.addEventListener('click',async e=>{
 const button=e.currentTarget,status=document.getElementById('plan-sync-status');
 button.disabled=true;button.textContent='⏳ กำลังซิงก์…';status.className='plan-sync-status busy';status.textContent='';
 let result;try{result=await window.MissionSync.sync();}catch(error){result={ok:false,error:error.message};}
 button.disabled=false;button.textContent='🔄 ซิงก์';
 const time=new Date().toLocaleTimeString('th-TH',{timeZone:'Asia/Bangkok',hour:'2-digit',minute:'2-digit'});
 status.className='plan-sync-status '+(result&&result.ok?'ok':'error');
 status.textContent=result&&result.ok?'✅ อัปเดตแล้ว '+time+' น. · '+(config.daily_plan.source==='sheet'?'แผนจาก Sheet':'แผนตั้งต้น'):'⚠️ ซิงก์ไม่สำเร็จ'+(result&&result.error?' ('+result.error+')':'')+' · ใช้แผนเดิมในเครื่อง';});
// Dates, activities and daily messages typed into the Google Sheet: cached for the next visit, applied on every sync.
const EXTRAS_KEY='satit-swu-hub:extras:v1';let started=false,latestExtras=null;
function applyExtras(extras,save){
 if(!extras||typeof extras!=='object')return false;
 latestExtras=extras;
 try{ParentTools.setRemote(Array.isArray(extras.activities)?{title:'กิจกรรมของพอใจ',source_note:'จาก Google Sheet',events:extras.activities}:null);}catch(_){/* keep the previous activities */}
 Tracker.setSheetDates(extras.dates||null);Dashboard.setBoosts(extras.mottos||null);ExamStats.setGrading(extras.grading||null);
 if(save)try{localStorage.setItem(EXTRAS_KEY,JSON.stringify(extras));}catch(_){/* keep in memory */}
 return true;
}
window.addEventListener('extras-remote',e=>{if(applyExtras(e.detail,true)&&started)update();});
async function start(){
 defaultPlan={...config.daily_plan,source:'default'};config.daily_plan=defaultPlan;
 try{const cached=JSON.parse(localStorage.getItem(PLAN_KEY)||'null');if(cached)applyPlan(cached,false);}catch(_){/* use default */}
 let activities={title:'กิจกรรมของพอใจ',events:[]};try{activities=await get('./data/activities.json',true);}catch(_){notify('โหลดกิจกรรมไม่สำเร็จ แสดงวันสอบก่อน ลองเปิดเว็บใหม่เพื่อโหลดกิจกรรม');}
 ParentTools.init(activities);
 try{applyExtras(JSON.parse(localStorage.getItem(EXTRAS_KEY)||'null'),false);}catch(_){/* no cached Sheet data */}
 started=true;await route();setInterval(update,60000);
}
// The app renders nothing until MissionSync confirms the signed-in account is allowed.
async function boot(){
 try{
 config=await get('./data/config.json',true);if(!Array.isArray(config.subjects)||!config.subjects.length)throw Error('config ไม่ถูกต้อง');
 MissionSync.init(config,()=>start().catch(error=>notify(error.message)));
 }catch(error){$('login-status').textContent='เริ่มต้นเว็บไม่ได้: '+error.message;}
}
boot();
})();
