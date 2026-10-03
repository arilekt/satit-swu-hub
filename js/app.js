(() => {
  'use strict';
  let config,current=null,request=0,lastHash='',statusTimeout;
  const $=id=>document.getElementById(id);
  const element=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;};
  function notify(text){$('status').textContent=text;clearTimeout(statusTimeout);statusTimeout=setTimeout(()=>$('status').textContent='',9000);}
  window.addEventListener('storage-warning',e=>notify(e.detail));
  async function get(path,json=false){const response=await fetch(path);if(!response.ok)throw new Error('โหลดไฟล์ไม่ได้ ('+response.status+')');return json?response.json():response.text();}
  function parse(source){const normalized=source.replace(/^\uFEFF/,'').replace(/\r\n/g,'\n');const match=normalized.match(/^---\n([\s\S]*?)\n---(?:\n|$)([\s\S]*)$/);if(!match)throw new Error('ไม่พบ YAML Frontmatter');const meta=jsyaml.load(match[1]);if(!meta||typeof meta!=='object'||Array.isArray(meta)||typeof meta.title!=='string')throw new Error('Frontmatter ต้องมี title');return {meta,body:match[2]};}
  function renderMarkdown(body){const box=element('article',undefined,'prose');box.innerHTML=DOMPurify.sanitize(marked.parse(body),{FORBID_TAGS:['iframe','style','form','input','button'],FORBID_ATTR:['style']});box.querySelectorAll('a').forEach(a=>{a.rel='noopener noreferrer';});return box;}
  function update(){
    if(!config)return;const stats=Tracker.stats(config);$('overall').textContent=stats.percent+'%';$('overall-bar').max=stats.total;$('overall-bar').value=stats.done;$('completed-count').textContent=stats.done+' / '+stats.total+' ภารกิจ';
    const nav=$('subjects');nav.replaceChildren();
    config.subjects.forEach(s=>{const link=element('a',undefined,'subject'+(current&&s.id===current.subject.id?' active':''));link.href='#'+s.id+'/'+s.steps[0].id;if(current&&s.id===current.subject.id)link.setAttribute('aria-current','true');link.append(element('span',s.icon+' '+s.name),element('small',s.steps.filter(x=>Tracker.has(x.id)).length+'/'+s.steps.length));nav.append(link);});
    if(current){$('lessons').replaceChildren();[...current.subject.steps,...(current.subject.exams||[])].forEach(step=>{const done=step.type==='exam'?Tracker.attempts().some(a=>a.id===step.id):Tracker.has(step.id),link=element('a',undefined,'lesson'+(step.id===current.step.id?' active':''));link.href='#'+current.subject.id+'/'+step.id;const circle=element('span',done?'✓':'', 'circle'+(done?' done':''));circle.setAttribute('aria-hidden','true');link.append(circle,element('span',step.title+(step.source_duration_minutes?' ('+step.source_duration_minutes+' นาที)':'')+(done?' · เรียนจบแล้ว':'')));if(step.id===current.step.id)link.setAttribute('aria-current','page');$('lessons').append(link);});}
    const date=Tracker.examDate()||config.exam_date;$('exam-date').value=date||'';
    if(date){const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Bangkok',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());const dateParts=Object.fromEntries(parts.map(p=>[p.type,p.value]));const today=dateParts.year+'-'+dateParts.month+'-'+dateParts.day;const days=Math.round((new Date(date+'T00:00:00+07:00')-new Date(today+'T00:00:00+07:00'))/86400000);$('countdown').textContent=days>0?'อีก '+days+' วัน สู่วันสอบ':days===0?'วันนี้คือวันสอบ สู้ ๆ นะ!':'ผ่านวันสอบเป้าหมายแล้ว';}else $('countdown').textContent='ตั้งวันสอบเพื่อเริ่มนับถอยหลัง';
    const button=$('complete-button');if(button&&current)button.textContent=Tracker.has(current.step.id)?'✓ เรียนจบแล้ว · คลิกเพื่อยกเลิก':'เรียนจบแล้ว..คลิก ✓';
  }
  function video(url){
    const box=element('div',undefined,'video');
    if(url){let u;try{u=new URL(url);}catch(_){throw new Error('video_url ไม่ถูกต้อง');}
      if(u.protocol!=='https:')throw new Error('วิดีโอต้องใช้ HTTPS');
      let id=null;if(u.hostname==='youtu.be')id=u.pathname.slice(1);else if(['www.youtube.com','youtube.com','www.youtube-nocookie.com'].includes(u.hostname))id=u.searchParams.get('v')||(u.pathname.match(/^\/embed\/([^/]+)$/)||[])[1];
      if(id&&/^[\w-]{11}$/.test(id)){const frame=element('iframe');frame.src='https://www.youtube-nocookie.com/embed/'+id;frame.title='วิดีโอประกอบบทเรียน';frame.allow='fullscreen; picture-in-picture';frame.setAttribute('allowfullscreen','');frame.referrerPolicy='strict-origin-when-cross-origin';box.append(frame);}
      else if(/\.mp4$/i.test(u.pathname)){const player=element('video');player.controls=true;player.playsInline=true;player.preload='metadata';player.src=u.href;box.append(player);}
      else{const link=element('a','เปิดวิดีโอประกอบบทเรียน');link.href=u.href;link.target='_blank';link.rel='noopener noreferrer';box.append(link);}
    }else box.append(element('span','▷','play'),element('strong','พื้นที่วิดีโอของบทเรียน'),element('small','อ่านสรุปด้านล่างได้เลย · เพิ่มลิงก์วิดีโอได้ภายหลัง'));
    return box;
  }
  async function route(){
    if(!config)return;
    if(QuizEngine.isActive()&&location.hash!==lastHash){if(!confirm('กำลังทำข้อสอบ หากเปลี่ยนบท คำตอบรอบนี้จะไม่ถูกบันทึก ต้องการออกไหม?')){history.replaceState(null,'',lastHash);return;}}
    QuizEngine.dispose();lastHash=location.hash;const token=++request;
    const [subjectId,stepId]=location.hash.slice(1).split('/');const subject=config.subjects.find(s=>s.id===subjectId)||config.subjects[0];const step=[...subject.steps,...(subject.exams||[])].find(s=>s.id===stepId)||subject.steps[0];current={subject,step};update();
    const main=$('main');main.replaceChildren(element('p','กำลังโหลดภารกิจ…'));
    try {
      if(!step.file){main.replaceChildren(element('span',subject.name,'tag'),element('h2',step.title,'title'),element('p','บทนี้กำลังเตรียมเนื้อหา ยังไม่สามารถติ๊กเรียนจบได้'+(step.source_duration_minutes?' · เวลาในคอร์สต้นทาง '+step.source_duration_minutes+' นาที':''),'notice'));return;}
      const data=parse(await get(step.file));if(token!==request)return;
      if(data.meta.id!==step.id)throw new Error('id ในบทเรียนไม่ตรงกับ config');
      if(step.type==='exam')QuizEngine.validate(data.meta.questions);
      if(data.meta.quick_quiz)QuizEngine.validate(data.meta.quick_quiz);
      main.replaceChildren(element('span',subject.name+' / '+(step.type==='exam'?'สนามซ้อม': 'MISSION '+String(subject.steps.indexOf(step)+1).padStart(2,'0')),'tag'),element('h2',data.meta.title,'title'),element('p','⏱ '+(data.meta.duration||'เรียนตามจังหวะของพอใจ')+' · ทีละก้าวก็ไปถึงได้','meta'));
      if(step.type!=='exam')main.append(video(data.meta.video_url));
      main.append(renderMarkdown(data.body));
      if(step.type==='exam'||data.meta.quick_quiz){const panel=element('section',undefined,'quiz-panel');panel.append(element('h3',step.type==='exam'?'สนามซ้อมข้อสอบ':'เช็กความเข้าใจเล็ก ๆ'));main.append(panel);QuizEngine.mount(panel,{id:step.id+(step.type==='exam'?'':':mini'),title:data.meta.title,time_limit_minutes:data.meta.time_limit_minutes||5},step.type==='exam'?data.meta.questions:data.meta.quick_quiz);}
      if(step.type!=='exam'){const complete=element('button',undefined,'primary complete');complete.id='complete-button';complete.onclick=()=>{Tracker.toggle(step.id);notify(Tracker.has(step.id)?'เก่งมาก! ทำภารกิจสำเร็จอีกหนึ่งก้าว 🌱':'ยกเลิกสถานะเรียนจบแล้ว');};main.append(complete);update();}
    }catch(error){if(token!==request)return;main.replaceChildren(element('h2','เปิดภารกิจไม่ได้'),element('p',error.message,'notice'));const retry=element('button','ลองโหลดใหม่','secondary');retry.onclick=route;main.append(retry);}
  }
  window.addEventListener('progress-changed',()=>{
    update();
  });
  window.addEventListener('hashchange',route);
  window.addEventListener('beforeunload',e=>{if(QuizEngine.isActive()){e.preventDefault();e.returnValue='';}});
  $('exam-date').onchange=e=>Tracker.setExamDate(e.target.value);
  $('copy-summary').onclick=async()=>{if(!config)return;const text=Tracker.summary(config);try{await navigator.clipboard.writeText(text);notify('คัดลอกแล้ว ส่งให้คุณพ่อได้เลย');}catch(_){const area=element('textarea');area.value=text;area.setAttribute('aria-label','สรุปสำหรับคุณพ่อ');area.readOnly=true;area.style.width='100%';$('main').prepend(area);area.focus();area.select();notify('แตะค้างที่ข้อความแล้วเลือกคัดลอก');}};
  $('export-progress').onclick=()=>{const blob=new Blob([JSON.stringify(Tracker.exportData(),null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const link=element('a');link.href=url;link.download='satit-progress.json';document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);notify('ส่งออกผลเรียนแล้ว เก็บไฟล์ส่งให้คุณพ่อเพื่อวิเคราะห์ได้');};
  $('history-button').onclick=()=>{if(!config)return;if(QuizEngine.isActive()&&!confirm('ออกจากข้อสอบเพื่อดูประวัติไหม? รอบนี้จะไม่ถูกบันทึก'))return;QuizEngine.dispose();request++;const main=$('main');main.replaceChildren(element('h2','ประวัติสนามซ้อม','title'));const attempts=Tracker.attempts().reverse();if(!attempts.length)main.append(element('p','ยังไม่มีประวัติ ลองทำ mini-quiz แรกกันนะ'));attempts.forEach(a=>{const card=element('div',undefined,'answer');card.append(element('strong',a.title+' · '+a.score+'/'+a.total),element('p',new Date(a.date).toLocaleString('th-TH',{timeZone:'Asia/Bangkok'})));main.append(card);});const back=element('button','กลับไปบทเรียน','secondary');back.onclick=route;main.append(back);};
  async function init(){try{if(!window.marked||!window.jsyaml||!window.DOMPurify)throw new Error('โหลดเครื่องมือจาก CDN ไม่สำเร็จ ตรวจอินเทอร์เน็ตแล้วลองใหม่');config=await get('./data/config.json',true);if(!Array.isArray(config.subjects)||!config.subjects.length)throw new Error('config ไม่ถูกต้อง');await route();setInterval(update,60000);}catch(error){$('main').replaceChildren(element('h2','เริ่มต้นเว็บไม่ได้'),element('p',error.message,'notice'));}}
  init();
})();