(() => {
  'use strict';
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