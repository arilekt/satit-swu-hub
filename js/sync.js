/* Google Sign-In + Google Sheet sync through the Apps Script web app in backend/apps-script.
   Only public values (OAuth client ID, web app URL) live in config; the backend checks every request.
   A verified Google login is exchanged once for a 90-day device session kept in localStorage, so the
   family is not asked to sign in again every hour. */
(() => {
  'use strict';
  const SESSION_KEY = 'satit-swu-hub:session';
  const RETRY_DELAYS = [700, 1800];
  const transientStatus = status => status === 404 || status === 408 || status === 429 || status >= 500;
  const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
  let onAuthorized = null, settings = null, token = null, session = null, email = null, timer = null, busy = false, lastSync = null, lastError = '', errorKind = '', gisReady = null, accessGranted = false, loginValidated = false;
  const $ = id => document.getElementById(id);

  function decode(jwt) {
    try {
      const part = jwt.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
      return JSON.parse(decodeURIComponent(atob(part).split('').map(c => '%' + c.charCodeAt(0).toString(16).padStart(2, '0')).join('')));
    } catch (_) { return null; }
  }
  const valid = jwt => { const claims = jwt && decode(jwt); return !!claims && claims.exp * 1000 > Date.now() + 60000; };
  const configured = () => !!(settings && settings.google_client_id && /^https:\/\/script\.google\.com\/macros\/s\/[\w-]+\/exec$/.test(settings.apps_script_url || ''));
  const signedIn = () => !!(token || session);
  const failure = (message, props) => Object.assign(Error(message), props);

  /* POST to the Apps Script web app. Google answers 404/5xx now and then for a perfectly good request, so those
     (and network errors) are retried; a real answer from our backend is never retried. Throws an Error with
     `transient` (gave up retrying) or `code` (auth | denied | session_expired | config | error). */
  async function post(url, payload, io = {}) {
    const doFetch = io.fetch || ((u, o) => fetch(u, o)), wait = io.sleep || sleep;
    let last;
    for (let attempt = 0; attempt <= RETRY_DELAYS.length; attempt++) {
      if (attempt) await wait(RETRY_DELAYS[attempt - 1]);
      let response;
      try { response = await doFetch(url, {method: 'POST', headers: {'Content-Type': 'text/plain;charset=utf-8'}, body: JSON.stringify(payload)}); }
      catch (_) { last = failure('เชื่อมต่อ Google Sheet ไม่ได้ (ไม่มีอินเทอร์เน็ตหรือ Google ไม่ตอบ)', {transient: true}); continue; }
      if (!response.ok) {
        const message = 'เชื่อมต่อ Google Sheet ไม่ได้ (' + response.status + ')';
        if (transientStatus(response.status)) { last = failure(message, {transient: true}); continue; }
        throw failure(message, {transient: false});
      }
      let data;
      try { data = await response.json(); } catch (_) { last = failure('Google Sheet ตอบกลับไม่ถูกต้อง', {transient: true}); continue; }
      if (!data || data.ok !== true) throw failure((data && data.error) || 'Google Sheet ตอบกลับผิดพลาด', {code: data && data.code || 'error', transient: false});
      return data;
    }
    throw last;
  }

  function loadSession() {
    try {
      const saved = JSON.parse(localStorage.getItem(SESSION_KEY) || 'null');
      if (saved && /^[0-9a-f]{64}$/.test(saved.token) && new Date(saved.expires_at) > Date.now()) return saved;
    } catch (_) { /* storage blocked or corrupt */ }
    return null;
  }
  function saveSession(value) {
    session = value;
    try { value ? localStorage.setItem(SESSION_KEY, JSON.stringify(value)) : localStorage.removeItem(SESSION_KEY); } catch (_) { /* keep in memory only */ }
  }

  function deviceLabel() {
    const ua = (typeof navigator !== 'undefined' && navigator.userAgent) || '';
    const os = /iPad|iPhone/.test(ua) ? 'iPad/iPhone' : /Android/.test(ua) ? 'Android' : /Windows/.test(ua) ? 'Windows' : /Mac/.test(ua) ? 'Mac' : 'อื่น ๆ';
    const browser = /Edg\//.test(ua) ? 'Edge' : /Firefox\//.test(ua) ? 'Firefox' : /Chrome\//.test(ua) ? 'Chrome' : /Safari\//.test(ua) ? 'Safari' : 'เบราว์เซอร์';
    return os + ' · ' + browser;
  }

  function render() {
    const chip = $('sync-chip'), status = $('sync-status'), now = $('sync-now'), out = $('sign-out'), outAll = $('sign-out-all'), retry = $('login-retry');
    const gating = $('login-gating');
    if (!chip) return;
    const authenticated = configured() && signedIn() && accessGranted && loginValidated;
    const unreachable = errorKind === 'network' && !accessGranted;
    let text, state;
    if (!configured()) { text = 'ยังไม่ได้ตั้งค่า Google Sheet'; state = 'off'; }
    else if (!signedIn()) { text = (lastError ? lastError + ' · ' : '') + 'ยังไม่ได้เข้าสู่ระบบ ผลเรียนเก็บเฉพาะเครื่องนี้'; state = 'signed-out'; }
    else if (unreachable) { text = 'ติดต่อ Google Sheet ไม่ได้ในตอนนี้ (' + lastError + ') กดลองอีกครั้งได้เลย บัญชีของคุณยังไม่ถูกปฏิเสธ'; state = 'error'; }
    else if (!loginValidated) { text = 'กำลังตรวจสอบการเข้าถึง…'; state = 'busy'; }
    else if (!accessGranted) { text = 'ไม่มีสิทธิ์เข้าดู'; state = 'denied'; }
    else if (busy) { text = 'กำลังซิงก์…'; state = 'busy'; }
    else if (lastError) { text = 'ซิงก์ไม่สำเร็จ: ' + lastError; state = 'error'; }
    else if (lastSync) { text = 'ซิงก์กับ Google Sheet แล้ว ' + lastSync.toLocaleTimeString('th-TH', {timeZone: 'Asia/Bangkok', hour: '2-digit', minute: '2-digit'}) + ' น.'; state = 'ok'; }
    else { text = 'เข้าสู่ระบบแล้ว'; state = 'ok'; }
    chip.hidden = !configured();
    chip.textContent = state === 'ok' ? '☁️ ซิงก์แล้ว' : state === 'busy' ? '☁️ กำลังซิงก์' : state === 'error' ? '⚠️ ซิงก์ไม่สำเร็จ' : state === 'denied' ? '🚫 ไม่มีสิทธิ์' : '☁️ เข้าสู่ระบบ';
    chip.className = 'sync-chip sync-' + state;
    chip.title = text;
    if (status) status.textContent = (email ? email + ' · ' : '') + text;
    if (now) now.hidden = !authenticated;
    if (out) out.hidden = !signedIn();
    if (outAll) outAll.hidden = !session;
    if (retry) retry.hidden = authenticated || !unreachable;
    if (gating) gating.hidden = authenticated;
    document.body.classList.toggle('locked', !authenticated);
    const login = $('login-status');
    if (login) login.textContent = authenticated ? '' : !configured() ? 'ยังไม่ได้ตั้งค่าการเข้าสู่ระบบ' : unreachable ? 'ติดต่อ Google Sheet ไม่ได้ในตอนนี้ กดลองอีกครั้งได้เลย (' + lastError + ')' : (signedIn() && !loginValidated) ? 'กำลังตรวจสอบสิทธิ์…' : (signedIn() && !accessGranted) ? 'บัญชีนี้ยังไม่มีสิทธิ์เข้าใช้ ' + (lastError ? '(' + lastError + ')' : '') : lastError;
    if (authenticated && onAuthorized) { const start = onAuthorized; onAuthorized = null; start(); }
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
      google.accounts.id.initialize({client_id: settings.google_client_id, callback: response => googleSignedIn(response.credential), auto_select: true, cancel_on_tap_outside: true, use_fedcm_for_prompt: true});
      const box = $('google-button');
      if (box) {
        box.replaceChildren();
        google.accounts.id.renderButton(box, {theme: 'outline', size: 'large', text: 'signin_with', shape: 'pill', locale: 'th'});
        // Check if button rendered successfully; if not, show fallback
        setTimeout(() => {
          const hasGoogleButton = box.querySelector('div[role="button"], iframe[title*="gsi"]') || box.children.length > 0;
          const fallback = $('fallback-google-signin');
          if (!fallback) return;
          if (!hasGoogleButton) { fallback.style.display = 'block'; fallback.onclick = () => google.accounts.id.prompt(); }
          else fallback.style.display = 'none';
        }, 100);
      }
      if (!signedIn()) google.accounts.id.prompt();
    } catch (error) { lastError = error.message; render(); }
  }

  /* Every backend call: the device session when we have one, else the fresh Google token. */
  function call(action, payload, auth) {
    const credentials = auth || (session ? {session: session.token} : {id_token: token});
    return post(settings.apps_script_url, {action, ...credentials, ...payload});
  }

  /* A Google login (or a stored session) was refused or could not be checked. Only "denied"/"auth"/
     "session_expired" mean the account really lost access; a transient failure keeps everything so retry works. */
  function authFailed(error) {
    accessGranted = false; lastError = error.message;
    if (error.transient) { errorKind = 'network'; loginValidated = false; return; }
    saveSession(null);
    if (error.code === 'denied') { errorKind = 'denied'; loginValidated = true; return; } // keep the account on screen with a denial and a sign-out button
    errorKind = 'auth'; loginValidated = false; token = null; email = null;
    if (error.code === 'session_expired') lastError = 'หมดเวลาเข้าสู่ระบบ กรุณาเข้าสู่ระบบด้วย Google อีกครั้ง';
    if (window.google?.accounts?.id) google.accounts.id.prompt();
  }

  /* Google token -> device session. */
  async function exchange(credential) {
    busy = true; render();
    try {
      const data = await call('login', {device: deviceLabel()}, {id_token: credential});
      saveSession({token: data.session, expires_at: data.expires_at});
      token = null; email = data.email || email; accessGranted = true; loginValidated = true; lastError = ''; errorKind = '';
    } catch (error) { authFailed(error); }
    finally { busy = false; render(); }
  }

  /* Stored session -> still valid? */
  async function resume() {
    busy = true; render();
    try {
      const data = await call('whoami');
      email = data.email || email; accessGranted = true; loginValidated = true; lastError = ''; errorKind = '';
    } catch (error) { authFailed(error); }
    finally { busy = false; render(); }
  }

  function googleSignedIn(credential) {
    if (!valid(credential)) { lastError = 'token จาก Google ไม่ถูกต้อง'; errorKind = 'auth'; render(); return; }
    token = credential; email = decode(credential).email || null; lastError = ''; errorKind = ''; loginValidated = false; accessGranted = false;
    render(); exchange(credential).then(() => { if (accessGranted) sync(); });
  }

  function clearLocal() {
    token = null; email = null; lastSync = null; lastError = ''; errorKind = ''; accessGranted = false; loginValidated = false;
    saveSession(null);
    if (window.google?.accounts?.id) google.accounts.id.disableAutoSelect();
    render();
  }

  function signOut() {
    const mine = session;
    clearLocal();
    if (mine && configured()) post(settings.apps_script_url, {action: 'logout', session: mine.token}).catch(() => { /* the session expires on its own */ });
  }

  async function signOutAll() {
    if (!session) return {ok: false, error: 'ยังไม่ได้เข้าสู่ระบบ'};
    try { await call('logout_all'); } catch (error) { lastError = error.message; render(); return {ok: false, error: error.message}; }
    clearLocal();
    return {ok: true};
  }

  function retry() {
    if (busy || !configured()) return;
    if (session) resume().then(() => { if (accessGranted) sync(); });
    else if (token && valid(token)) exchange(token).then(() => { if (accessGranted) sync(); });
    else { lastError = ''; errorKind = ''; token = null; render(); if (window.google?.accounts?.id) google.accounts.id.prompt(); }
  }

  async function sync() {
    if (!configured() || !signedIn()) return {ok: false, error: 'ยังไม่ได้เข้าสู่ระบบ'};
    if (busy) return {ok: false, error: 'กำลังซิงก์อยู่ ลองอีกครั้ง'};
    busy = true; render();
    try {
      const data = await call('sync', {state: Tracker.syncPayload()});
      Tracker.applyRemote(data.state);
      window.dispatchEvent(new CustomEvent('plan-remote', {detail: data.plan && typeof data.plan === 'object' ? data.plan : null}));
      if (data.extras && typeof data.extras === 'object') window.dispatchEvent(new CustomEvent('extras-remote', {detail: data.extras})); // absent on an older backend, null if the tabs could not be read
      email = data.email || email; lastSync = new Date(); lastError = ''; errorKind = '';
    } catch (error) {
      if (error.code === 'session_expired' || error.code === 'denied') { busy = false; authFailed(error); render(); return {ok: false, error: lastError}; }
      lastError = error.message;
    }
    finally { busy = false; render(); }
    return lastError ? {ok: false, error: lastError} : {ok: true};
  }

  function schedule() { clearTimeout(timer); timer = setTimeout(sync, 2000); }

  function init(config, authorized) {
    settings = config.sync || null; onAuthorized = authorized || null;
    render();
    if (!configured()) return;
    const saved = loadSession();
    if (saved) { session = saved; }
    window.addEventListener('progress-changed', e => { if (signedIn() && accessGranted && e.detail?.source !== 'remote') schedule(); });
    document.addEventListener('visibilitychange', () => { if (!document.hidden && signedIn() && accessGranted && (!lastSync || Date.now() - lastSync > 60000)) sync(); });
    $('sync-now')?.addEventListener('click', sync);
    $('sign-out')?.addEventListener('click', signOut);
    $('sign-out-all')?.addEventListener('click', () => { if (confirm('ออกจากระบบในทุกเครื่องที่เคยเข้าสู่ระบบไว้ใช่ไหม')) signOutAll(); });
    $('login-retry')?.addEventListener('click', retry);
    setupButton();
    if (session) resume().then(() => { if (accessGranted) sync(); });
  }

  window.MissionSync = {init, sync, signOut, signOutAll, retry, configured: () => configured(), _decode: decode, _post: post};
})();
