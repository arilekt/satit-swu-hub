(() => {
  'use strict';
  // Login page + footer show the version from js/version.js (single source); this line was lost in v1.6.x.
  if(window.AppVersion){
    const v=document.getElementById('version-display');if(v)v.textContent=window.AppVersion.display();
    const f=document.getElementById('build-info');if(f)f.textContent=window.AppVersion.full();
  }
  // A page cannot contain the hash of its own commit, so ask GitHub (public repo) which commit main is at now.
  // Compare it with the commit shown in the repo to tell whether the deploy is the latest. Silent when offline/rate limited.
  const vd=document.getElementById('version-display');
  if(vd)fetch('https://api.github.com/repos/arilekt/satit-swu-hub/commits/main',{headers:{Accept:'application/vnd.github+json'}}).then(r=>r.ok?r.json():Promise.reject()).then(c=>{
    if(!c||typeof c.sha!=='string'||!/^[0-9a-f]{40}$/.test(c.sha))return;
    const line=document.createElement('span');line.style.display='block';
    line.textContent='commit ล่าสุดบน main · '+c.sha.slice(0,7);
    vd.append(line);
  }).catch(()=>{});
  const label=document.getElementById('build-info');
  fetch('./data/build.json',{cache:'no-store'}).then(response=>{
    if(!response.ok)throw Error('Build manifest unavailable');
    return response.json();
  }).then(info=>{
    if(typeof info.build_id!=='string'||!/^\d{8}-\d{6}$/.test(info.build_id)||info.build_id<=label.dataset.buildId)return;
    const message=document.getElementById('build-update');
    message.hidden=false;
    message.textContent='มี build ใหม่แล้ว · ';
    const link=document.createElement('a');
    link.textContent='เปิดเวอร์ชันล่าสุด';
    link.href=location.pathname+'?build='+encodeURIComponent(info.build_id)+location.hash;
    message.append(link);
  }).catch(()=>{/* Keep the build stamped in the actual loaded HTML when offline. */});
})();