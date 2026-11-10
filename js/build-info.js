(() => {
  'use strict';
  // Login page + footer show the version from js/version.js (single source); this line was lost in v1.6.x.
  if(window.AppVersion){
    const v=document.getElementById('version-display');if(v)v.textContent=window.AppVersion.display();
    const f=document.getElementById('build-info');if(f)f.textContent=window.AppVersion.full();
  }
  // The GitHub Actions deploy (.github/workflows/pages.yml) replaces the placeholder with the commit being published.
  // If it is still the placeholder, this copy was not deployed by the workflow.
  const COMMIT='__COMMIT_SHA__';
  const vd=document.getElementById('version-display');
  if(vd){
    const line=document.createElement('span');line.style.display='block';
    line.textContent=/^[0-9a-f]{7}$/.test(COMMIT)?'commit '+COMMIT:'commit ไม่ระบุ (ไม่ได้ deploy ผ่าน Actions)';
    vd.append(line);
  }
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