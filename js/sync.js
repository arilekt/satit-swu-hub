/* Google Sign-In + Google Sheet sync through the Apps Script web app in backend/apps-script.
   Only public values (OAuth client ID, web app URL) live in config; the backend checks every token. */
(() => {
  'use strict';
  const TOKEN_KEY = 'satit-swu-hub:google-id-token';
  let settings = null, token = null, email = null, timer = null, busy = false, lastSync = null, lastError = '', gisReady = null;
  const $ = id => document.getElementById(id);

  function decode(jwt) {
    try {
      const part = jwt.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
      return JSON.parse(decodeURIComponent(atob(part).split('').map(c => '%' + c.charCodeAt(0).toString(16).padStart(2, '0')).join('')));
    } catch (_) { return null; }
  }
  const valid = jwt => { const claims = jwt && decode(jwt); return !!claims && claims.exp * 1000 > Date.now() + 60000; };
  const configured = () => !!(settings && settings.google_client_id && /^https:\/\/script\.google\.com\/macros\/s\/[\w-]+\/exec$/.test(settings.apps_script_url || ''));

  function render() {
    const chip = $('sync-chip'), status = $('sync-status'), now = $('sync-now'), out = $('sign-out');
    if (!chip) return;
    let text, state;
    if (!configured()) { text = 'ยังไม่ได้ตั้งค่า Google Sheet'; state = 'off'; }
    else if (!token) { text = (lastError ? lastError + ' · ' : '') + 'ยังไม่ได้เข้าสู่ระบบ ผลเรียนเก็บเฉพาะเครื่องนี้'; state = 'signed-out'; }
    else if (busy) { text = 'กำลังซิงก์…'; state = 'busy'; }
    else if (lastError) { text = 'ซิงก์ไม่สำเร็จ: ' + lastError; state = 'error'; }
    else if (lastSync) { text = 'ซิงก์กับ Google Sheet แล้ว ' + lastSync.toLocaleTimeString('th-TH', {timeZone: 'Asia/Bangkok', hour: '2-digit', minute: '2-digit'}) + ' น.'; state = 'ok'; }
    else { text = 'เข้าสู่ระบบแล้ว'; state = 'ok'; }
    chip.hidden = !configured();
    chip.textContent = state === 'ok' ? '☁️ ซิงก์แล้ว' : state === 'busy' ? '☁️ กำลังซิงก์' : state === 'error' ? '⚠️ ซิงก์ไม่สำเร็จ' : '☁️ เข้าสู่ระบบ';
    chip.className = 'sync-chip sync-' + state;
    chip.title = text;
    if (status) status.textContent = (email ? email + ' · ' : '') + text;
    if (now) now.hidden = !token;
    if (out) out.hidden = !token;
  }

  function loadGis() {
    if (gisReady) return gisReady;
    gisReady = new Promise((resolve, reject) => {
      if (window.google?.accounts?.id) { resolve(); return; }
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => { gisReady = null; reject(Error('โหลดปุ่ม Google ไม่สำเร็จ ตรวจอินเทอร์เน็ตแล้วลองใหม่')); };
      document.head.append(script);
    });
    return gisReady;
  }

  async function setupButton() {
    try {
      await loadGis();
      google.accounts.id.initialize({client_id: settings.google_client_id, callback: response => signedIn(response.credential), auto_select: true, cancel_on_tap_outside: true, use_fedcm_for_prompt: true});
      const box = $('google-button');
      if (box) { box.replaceChildren(); google.accounts.id.renderButton(box, {theme: 'outline', size: 'large', text: 'signin_with', shape: 'pill', locale: 'th'}); }
      if (!token) google.accounts.id.prompt();
    } catch (error) { lastError = error.message; render(); }
  }

  function signedIn(credential) {
    if (!valid(credential)) { lastError = 'token จาก Google ไม่ถูกต้อง'; render(); return; }
    token = credential; email = decode(credential).email || null; lastError = '';
    try { sessionStorage.setItem(TOKEN_KEY, credential); } catch (_) { /* keep in memory only */ }
    render(); sync();
  }

  function signOut() {
    token = null; email = null; lastSync = null; lastError = '';
    try { sessionStorage.removeItem(TOKEN_KEY); } catch (_) { /* ignore */ }
    if (window.google?.accounts?.id) google.accounts.id.disableAutoSelect();
    render();
  }

  async function call(action, payload) {
    const response = await fetch(settings.apps_script_url, {method: 'POST', headers: {'Content-Type': 'text/plain;charset=utf-8'}, body: JSON.stringify({action, id_token: token, ...payload})});
    if (!response.ok) throw Error('เชื่อมต่อ Google Sheet ไม่ได้ (' + response.status + ')');
    const data = await response.json();
    if (!data.ok) throw Error(data.error || 'Google Sheet ตอบกลับผิดพลาด');
    return data;
  }

  async function sync() {
    if (!configured() || !token || busy) return;
    if (!valid(token)) { signOut(); lastError = 'หมดเวลาเข้าสู่ระบบ กรุณาเข้าสู่ระบบอีกครั้ง'; render(); if (window.google?.accounts?.id) google.accounts.id.prompt(); return; }
    busy = true; render();
    try {
      const data = await call('sync', {state: Tracker.syncPayload()});
      Tracker.applyRemote(data.state);
      email = data.email || email; lastSync = new Date(); lastError = '';
    } catch (error) { lastError = error.message; }
    finally { busy = false; render(); }
  }

  function schedule() { clearTimeout(timer); timer = setTimeout(sync, 2000); }

  function init(config) {
    settings = config.sync || null;
    render();
    if (!configured()) return;
    try { const saved = sessionStorage.getItem(TOKEN_KEY); if (valid(saved)) { token = saved; email = decode(saved).email || null; } } catch (_) { /* storage blocked */ }
    window.addEventListener('progress-changed', e => { if (token && e.detail?.source !== 'remote') schedule(); });
    document.addEventListener('visibilitychange', () => { if (!document.hidden && token && (!lastSync || Date.now() - lastSync > 60000)) sync(); });
    $('sync-now')?.addEventListener('click', sync);
    $('sign-out')?.addEventListener('click', signOut);
    setupButton();
    if (token) sync();
  }

  window.MissionSync = {init, sync, signOut, configured: () => configured(), _decode: decode};
})();
