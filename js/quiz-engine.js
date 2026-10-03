(() => {
  'use strict';
  let active = null;
  const el = (tag,text,cls) => {const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;};
  function shuffle(list) { const copy=[...list];for(let i=copy.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[copy[i],copy[j]]=[copy[j],copy[i]];}return copy; }
  function validate(questions) {
    if (!Array.isArray(questions)||!questions.length) throw new Error('ชุดข้อสอบไม่มีคำถาม');
    questions.forEach(q=>{if(!q || typeof q.question!=='string'||!Array.isArray(q.options)||q.options.length<2||!q.options.every(x=>typeof x==='string')||!Number.isInteger(q.answer)||q.answer<0||q.answer>=q.options.length||typeof q.explanation!=='string')throw new Error('รูปแบบคำถามไม่ถูกต้อง');});
  }
  function mount(container,meta,questions) {
    validate(questions);
    const minutes=Number(meta.time_limit_minutes||10);
    if(!Number.isFinite(minutes)||minutes<=0||minutes>180)throw new Error('เวลาข้อสอบต้องอยู่ระหว่าง 0 ถึง 180 นาที');
    const start=el('button','เริ่มทำข้อสอบ','primary');container.append(start);
    start.onclick=()=>{
      window.QuizEngine.dispose();
      const ordered=shuffle(questions),answers=new Array(ordered.length).fill(null),deadline=Date.now()+minutes*60000;
      container.replaceChildren();
      const toolbar=el('div',undefined,'quiz-toolbar'),timer=el('span',undefined,'timer'),form=el('form'),submit=el('button','ส่งคำตอบและดูเฉลย','primary');
      toolbar.append(el('span',ordered.length+' ข้อ · เลือกคำตอบที่ถูกที่สุด'),timer);container.append(toolbar,form);
      ordered.forEach((q,i)=>{
        const field=el('fieldset',undefined,'question');field.append(el('legend',(i+1)+'. '+q.question));
        q.options.forEach((option,j)=>{const label=el('label',undefined,'option'),radio=el('input');radio.type='radio';radio.name='q'+i;radio.value=String(j);radio.onchange=()=>{answers[i]=j;};label.append(radio,el('span',option));field.append(label);});form.append(field);
      });
      submit.type='submit';form.append(submit);
      let finished=false,interval;
      function finish(timedOut=false) {
        if(finished)return;finished=true;clearInterval(interval);document.removeEventListener('visibilitychange',tick);active=null;
        const score=ordered.filter((q,i)=>answers[i]===q.answer).length;
        Tracker.addAttempt({id:meta.id,title:meta.title,score,total:ordered.length,answers:ordered.map((q,i)=>({question:q.question,selected:answers[i],correct:q.answer})),elapsed_seconds:Math.min(Math.round(minutes*60),Math.max(0,Math.round((Date.now()-(deadline-minutes*60000))/1000))),timedOut});
        container.replaceChildren(el('h3',(timedOut?'หมดเวลา · ':'')+'ได้ '+score+' / '+ordered.length+' คะแนน'),el('p',score===ordered.length?'เยี่ยมเลย! ลองอธิบายเหตุผลให้คุณพ่อฟังนะ':'ทุกข้อที่พลาดคือโอกาสเรียนรู้ มาทบทวนด้วยกันนะ'));
        ordered.forEach((q,i)=>{const box=el('div',undefined,'answer'+(answers[i]===q.answer?'':' wrong'));box.append(el('strong',(i+1)+'. '+q.question),el('p','คำตอบของพอใจ: '+(answers[i]===null?'ยังไม่ได้ตอบ':q.options[answers[i]])),el('p','คำตอบที่ถูก: '+q.options[q.answer]),el('p',q.explanation));container.append(box);});
        const retry=el('button','ลองอีกครั้ง','secondary');retry.onclick=()=>{container.replaceChildren();mount(container,meta,questions);};container.append(retry);
      }
      function tick(){const secs=Math.max(0,Math.ceil((deadline-Date.now())/1000));timer.textContent='เหลือ '+Math.floor(secs/60)+':'+String(secs%60).padStart(2,'0');if(!secs)finish(true);}
      form.onsubmit=e=>{e.preventDefault();if(Date.now()>=deadline){finish(true);return;}const missing=answers.filter(a=>a===null).length;if(missing&&!confirm('ยังไม่ได้ตอบ '+missing+' ข้อ ต้องการส่งคำตอบเลยไหม?'))return;finish(Date.now()>=deadline);};
      interval=setInterval(tick,500);document.addEventListener('visibilitychange',tick);active={dispose:()=>{clearInterval(interval);document.removeEventListener('visibilitychange',tick);}};tick();
    };
  }
  window.QuizEngine={mount,validate,isActive:()=>!!active,dispose(){if(active){active.dispose();active=null;}}};
})();