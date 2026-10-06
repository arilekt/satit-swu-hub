/* Exam runner: a count-up timer against the suggested time (going over is allowed, never cut off),
   one "ส่งข้อสอบ" button, then the chosen answer, the right answer, the reason and the score. */
(() => {
  'use strict';
  let active = null;
  const el = (tag,text,cls) => {const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;};
  const LETTERS=['ก','ข','ค','ง','จ','ฉ'];
  function shuffle(list) { const copy=[...list];for(let i=copy.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[copy[i],copy[j]]=[copy[j],copy[i]];}return copy; }
  function validate(questions) {
    if (!Array.isArray(questions)||!questions.length) throw new Error('ชุดข้อสอบไม่มีคำถาม');
    questions.forEach(q=>{if(!q || typeof q.question!=='string'||!Array.isArray(q.options)||q.options.length<2||!q.options.every(x=>typeof x==='string')||!Number.isInteger(q.answer)||q.answer<0||q.answer>=q.options.length||typeof q.explanation!=='string')throw new Error('รูปแบบคำถามไม่ถูกต้อง');});
  }
  const clock=seconds=>{const s=Math.max(0,Math.round(seconds)),h=Math.floor(s/3600),m=Math.floor(s%3600/60),pad=n=>String(n).padStart(2,'0');return (h?h+':'+pad(m):pad(m))+':'+pad(s%60);};
  // Shared by every exam (end-of-chapter, mock exams) and the mini check in lessons.
  // meta: {id, title, time_limit_minutes, last?: {score,total,elapsed_seconds}, back?: {href,label}, start_label?, onstart?, onfinish?}
  function mount(container,meta,questions) {
    validate(questions);
    const minutes=Number(meta.time_limit_minutes||Math.ceil(questions.length*1.5));
    if(!Number.isFinite(minutes)||minutes<=0||minutes>180)throw new Error('เวลาข้อสอบต้องอยู่ระหว่าง 0 ถึง 180 นาที');
    const limit=Math.round(minutes*60);
    const intro=el('div',undefined,'quiz-intro'),rules=el('ul',undefined,'quiz-rules');
    for(const text of [questions.length+' ข้อ · ข้อละ 1 คะแนน · เลือกคำตอบที่ถูกที่สุด','⏱ เวลาแนะนำ '+minutes+' นาที นาฬิกานับขึ้น ถ้าเกินเวลาทำต่อได้ จะได้รู้ว่าใช้เวลาเท่าไร','🔀 ลำดับคำถามสลับทุกครั้ง','📝 กด “ส่งข้อสอบ” แล้วจะเห็นข้อที่เลือก ข้อที่ถูก เหตุผล และคะแนน'])rules.append(el('li',text));
    intro.append(rules);
    // history (an array, or a function returning one) = this exam's earlier attempts: show the statistics component
    if(meta.history&&window.ExamStats)intro.append(window.ExamStats.render(typeof meta.history==='function'?meta.history():meta.history));
    else if(meta.last)intro.append(el('p','ครั้งล่าสุด: '+meta.last.score+'/'+meta.last.total+' คะแนน'+(Number.isFinite(meta.last.elapsed_seconds)?' · ใช้เวลา '+clock(meta.last.elapsed_seconds):''),'quiz-last'));
    const start=el('button',meta.start_label||'เริ่มทำข้อสอบ ▶','primary quiz-start');start.type='button';
    container.append(intro,start);
    start.onclick=()=>run();
    function run(){
      window.QuizEngine.dispose();
      const ordered=shuffle(questions),answers=new Array(ordered.length).fill(null),began=Date.now();
      container.replaceChildren();
      const bar=el('div',undefined,'quiz-bar'),count=el('span',undefined,'quiz-count'),timer=el('span',undefined,'quiz-timer'),barSubmit=el('button','ส่งข้อสอบ','primary quiz-submit');barSubmit.type='button';
      bar.append(count,timer,barSubmit);
      const form=el('form',undefined,'quiz-form'),labels=[];
      ordered.forEach((q,i)=>{
        const field=el('fieldset',undefined,'question'),legend=el('legend');legend.append(el('span',String(i+1),'q-no'),el('span',q.question,'q-text'));field.append(legend);labels[i]=[];
        q.options.forEach((option,j)=>{
          const label=el('label',undefined,'option'),radio=el('input');radio.type='radio';radio.name='q'+i;radio.value=String(j);
          radio.onchange=()=>{answers[i]=j;labels[i].forEach((l,k)=>{l.className='option'+(k===j?' chosen':'');});update();};
          label.append(radio,el('span',LETTERS[j]||String(j+1),'opt-letter'),el('span',option,'opt-text'));labels[i].push(label);field.append(label);
        });
        form.append(field);
      });
      const submit=el('button','ส่งข้อสอบ','primary quiz-submit big');submit.type='submit';form.append(submit);
      container.append(bar,form);
      let finished=false,interval;
      const elapsed=()=>Math.max(0,Math.round((Date.now()-began)/1000));
      function update(){count.textContent='ตอบแล้ว '+answers.filter(a=>a!==null).length+'/'+ordered.length+' ข้อ';}
      function tick(){const s=elapsed(),over=s>limit;timer.textContent='⏱ '+clock(s)+(over?' · เกินเวลา '+clock(s-limit):' / '+clock(limit));timer.className='quiz-timer'+(over?' over':'');}
      function finish(){
        if(finished)return;finished=true;clearInterval(interval);document.removeEventListener('visibilitychange',tick);active=null;
        const used=elapsed(),score=ordered.filter((q,i)=>answers[i]===q.answer).length;
        Tracker.addAttempt({id:meta.id,title:meta.title,score,total:ordered.length,answers:ordered.map((q,i)=>({question:q.question,selected:answers[i],correct:q.answer})),elapsed_seconds:used,timedOut:used>limit});
        result(ordered,answers,score,used);
      }
      function send(){const missing=answers.filter(a=>a===null).length;if(missing&&!confirm('ยังไม่ได้ตอบ '+missing+' ข้อ ส่งข้อสอบเลยไหม?'))return;finish();}
      form.onsubmit=e=>{e.preventDefault();send();};barSubmit.onclick=send;
      interval=setInterval(tick,1000);document.addEventListener('visibilitychange',tick);
      active={dispose:()=>{clearInterval(interval);document.removeEventListener('visibilitychange',tick);}};
      update();tick();if(typeof meta.onstart==='function')meta.onstart();
    }
    function result(ordered,answers,score,used){
      container.replaceChildren();
      const wrong=ordered.filter((q,i)=>answers[i]!==null&&answers[i]!==q.answer).length,skipped=answers.filter(a=>a===null).length,pct=Math.round(score/ordered.length*100);
      const stats=window.ExamStats,level=stats?stats.levelFor(score*100/ordered.length):null,grade=stats?stats.tier(level,stats.grading()):null;
      const card=el('section',undefined,'quiz-score '+(grade!==null?(grade>=2?'great':grade===1?'good':'low'):pct>=80?'great':pct>=50?'good':'low'));
      card.append(el('span','คะแนน','label'),el('strong',score+' / '+ordered.length,'score'),el('span',pct+'% · ถูก '+score+' · ผิด '+wrong+(skipped?' · ไม่ได้ตอบ '+skipped:''),'detail'),
        el('span','⏱ ใช้เวลา '+clock(used)+(used>limit?' · เกินเวลาแนะนำ '+clock(used-limit):' · เวลาแนะนำ '+clock(limit)),'detail'+(used>limit?' over':'')),
        el('p',score===ordered.length?'เยี่ยมมาก! ลองอธิบายเหตุผลให้คุณพ่อฟังนะ':'ข้อที่พลาดคือโอกาสเรียนรู้ อ่านเหตุผลด้านล่างแล้วลองใหม่ได้เลย','cheer'));
      if(stats)card.insertBefore(stats.badge(level),card.children[2]);
      const filters=el('div',undefined,'quiz-filter'),all=el('button','ดูทุกข้อ','secondary active'),missed=el('button','เฉพาะข้อที่พลาด ('+(wrong+skipped)+')','secondary');all.type='button';missed.type='button';filters.append(all,missed);
      const list=el('div',undefined,'quiz-review'),cards=[];
      const option=(kind,text,j,tag)=>{const row=el('div',undefined,'review-option'+(kind?' '+kind:''));row.append(el('span',LETTERS[j]||String(j+1),'opt-letter'),el('span',text,'opt-text'));if(tag)row.append(el('span',tag,'tag'));return row;};
      ordered.forEach((q,i)=>{
        const ok=answers[i]===q.answer,box=el('article',undefined,'review '+(ok?'right':answers[i]===null?'skipped':'wrong')),head=el('div',undefined,'review-head');
        head.append(el('span',String(i+1),'q-no'),el('span',q.question,'q-text'),el('span',ok?'✓ ถูก':answers[i]===null?'— ไม่ได้ตอบ':'✗ ผิด','verdict'));box.append(head);
        q.options.forEach((text,j)=>{const chosen=answers[i]===j,correct=q.answer===j;box.append(option(correct?'correct':chosen?'chosen-wrong':'',text,j,correct&&chosen?'✓ พอใจตอบข้อนี้ ถูกต้อง':correct?'✓ ข้อที่ถูก':chosen?'✗ ข้อที่พอใจเลือก':''));});
        const why=el('p',undefined,'why');why.append(el('b','💡 เหตุผล: '),el('span',q.explanation));box.append(why);cards.push({box,ok});list.append(box);
      });
      all.onclick=()=>{all.className='secondary active';missed.className='secondary';list.replaceChildren(...cards.map(c=>c.box));};
      missed.onclick=()=>{missed.className='secondary active';all.className='secondary';list.replaceChildren(...cards.filter(c=>!c.ok).map(c=>c.box));};
      const again=el('button','ทำอีกครั้ง','secondary');again.type='button';again.onclick=()=>{container.replaceChildren();mount(container,{...meta,last:{score,total:ordered.length,elapsed_seconds:used}},questions);};
      const actions=el('div',undefined,'quiz-actions');actions.append(again);
      if(meta.back){const a=el('a',meta.back.label,'secondary-link');a.href=meta.back.href;actions.append(a);}
      container.append(card,filters,list,actions);
      if(typeof meta.onfinish==='function')meta.onfinish();
    }
  }
  window.QuizEngine={mount,validate,clock,isActive:()=>!!active,dispose(){if(active){active.dispose();active=null;}}};
})();
