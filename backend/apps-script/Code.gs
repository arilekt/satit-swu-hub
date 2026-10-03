/**
 * Satit SWU Mission Hub sync backend (Google Apps Script bound to one Google Sheet).
 *
 * Every request carries a Google ID token from the website's Sign-In button. The token is
 * verified with Google, its audience must equal GOOGLE_CLIENT_ID and its email must be in
 * ALLOWED_EMAILS (Script properties). Nothing secret lives in the website itself.
 *
 * Script properties (Project Settings → Script properties):
 *   GOOGLE_CLIENT_ID  OAuth Web client ID used by the site
 *   ALLOWED_EMAILS    comma separated, e.g. dad@gmail.com,porjai@gmail.com
 */

var SHEETS = {
  marks: ['step_id', 'done', 'updated_at', 'email'],
  attempts: ['key', 'id', 'title', 'score', 'total', 'date', 'elapsed_seconds', 'timed_out', 'answers_json', 'email'],
  settings: ['key', 'value', 'updated_at', 'email'],
  log: ['time', 'email', 'action', 'detail']
};
var SETTING_KEYS = ['examDate', 'resultDate'];
var MAX_ATTEMPTS_RETURNED = 100;

/* ---------- pure helpers (unit tested in tests/core.cjs) ---------- */

function attemptKey(a) { return a.id + '|' + a.date; }

function validDate(value) { return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value); }

function validTime(value) { return typeof value === 'string' && !isNaN(new Date(value).getTime()); }

/** Reject anything that is not a well-formed client payload before touching the sheet. */
function cleanPayload(state) {
  if (!state || typeof state !== 'object') throw new Error('ข้อมูลที่ส่งมาไม่ถูกต้อง');
  var marks = {}, attempts = [], settings = {};
  var rawMarks = state.marks && typeof state.marks === 'object' ? state.marks : {};
  Object.keys(rawMarks).slice(0, 2000).forEach(function (id) {
    var m = rawMarks[id];
    if (/^[a-z0-9:-]{1,100}$/.test(id) && m && typeof m.done === 'boolean' && validTime(m.at)) marks[id] = {done: m.done, at: m.at};
  });
  (Array.isArray(state.attempts) ? state.attempts.slice(-500) : []).forEach(function (a) {
    if (!a || typeof a.id !== 'string' || typeof a.title !== 'string' || !validTime(a.date)) return;
    if (!isFinite(a.score) || !(a.total > 0) || a.total % 1 !== 0 || a.score < 0 || a.score > a.total) return;
    attempts.push({
      id: a.id.slice(0, 100), title: a.title.slice(0, 300), score: Number(a.score), total: a.total, date: a.date,
      elapsed_seconds: isFinite(a.elapsed_seconds) ? Number(a.elapsed_seconds) : null, timedOut: a.timedOut === true,
      answers: Array.isArray(a.answers) ? a.answers.slice(0, 200) : undefined
    });
  });
  var rawSettings = state.settings && typeof state.settings === 'object' ? state.settings : {};
  SETTING_KEYS.forEach(function (key) {
    var s = rawSettings[key];
    if (s && validTime(s.at) && (s.value === null || validDate(s.value))) settings[key] = {value: s.value, at: s.at};
  });
  return {marks: marks, attempts: attempts, settings: settings};
}

/** Merge a client state into the stored one. Newer mark/setting wins; attempts are a union. */
function mergeState(stored, incoming) {
  var merged = {marks: {}, attempts: [], settings: {}}, changed = {marks: [], attempts: [], settings: []};
  Object.keys(stored.marks).forEach(function (id) { merged.marks[id] = stored.marks[id]; });
  Object.keys(incoming.marks).forEach(function (id) {
    var mine = incoming.marks[id], theirs = merged.marks[id];
    if (!theirs || new Date(mine.at) > new Date(theirs.at)) { merged.marks[id] = mine; changed.marks.push(id); }
  });
  var seen = {};
  stored.attempts.forEach(function (a) { seen[attemptKey(a)] = true; merged.attempts.push(a); });
  incoming.attempts.forEach(function (a) {
    if (!seen[attemptKey(a)]) { seen[attemptKey(a)] = true; merged.attempts.push(a); changed.attempts.push(a); }
  });
  merged.attempts.sort(function (x, y) { return new Date(x.date) - new Date(y.date); });
  SETTING_KEYS.forEach(function (key) {
    var mine = incoming.settings[key], theirs = stored.settings[key];
    if (mine && (!theirs || new Date(mine.at) > new Date(theirs.at))) { merged.settings[key] = mine; changed.settings.push(key); }
    else if (theirs) merged.settings[key] = theirs;
  });
  return {merged: merged, changed: changed};
}

function responseState(merged) {
  return {marks: merged.marks, attempts: merged.attempts.slice(-MAX_ATTEMPTS_RETURNED), settings: merged.settings, synced_at: new Date().toISOString()};
}

function checkClaims(claims, clientId, allowed, nowSeconds) {
  if (!claims || claims.aud !== clientId) throw new Error('token ไม่ได้ออกให้เว็บนี้');
  if (['accounts.google.com', 'https://accounts.google.com'].indexOf(claims.iss) < 0) throw new Error('ผู้ออก token ไม่ถูกต้อง');
  if (String(claims.email_verified) !== 'true') throw new Error('อีเมลยังไม่ยืนยันกับ Google');
  if (!(Number(claims.exp) > nowSeconds)) throw new Error('token หมดอายุ กรุณาเข้าสู่ระบบใหม่');
  var email = String(claims.email || '').toLowerCase();
  if (allowed.indexOf(email) < 0) throw new Error('บัญชี ' + email + ' ยังไม่ได้รับอนุญาต');
  return email;
}

/* ---------- Apps Script runtime ---------- */

function doGet() { return json({ok: true, service: 'satit-swu-hub-sync'}); }

function doPost(e) {
  try {
    var body = JSON.parse(e.postData.contents);
    var email = verify(body.id_token);
    if (body.action === 'whoami') return json({ok: true, email: email});
    if (body.action !== 'sync') throw new Error('ไม่รู้จักคำสั่ง');
    var lock = LockService.getScriptLock();
    lock.waitLock(20000);
    try {
      var incoming = cleanPayload(body.state);
      var result = mergeState(readState(), incoming);
      writeChanges(result.changed, incoming, email);
      appendLog(email, 'sync', result.changed.marks.length + ' marks, ' + result.changed.attempts.length + ' attempts, ' + result.changed.settings.length + ' settings');
      return json({ok: true, email: email, state: responseState(result.merged)});
    } finally { lock.releaseLock(); }
  } catch (error) {
    return json({ok: false, error: String(error && error.message || error)});
  }
}

function verify(idToken) {
  if (typeof idToken !== 'string' || idToken.length < 20) throw new Error('กรุณาเข้าสู่ระบบด้วย Google ก่อน');
  var props = PropertiesService.getScriptProperties();
  var clientId = props.getProperty('GOOGLE_CLIENT_ID');
  var allowed = String(props.getProperty('ALLOWED_EMAILS') || '').split(',').map(function (x) { return x.trim().toLowerCase(); }).filter(String);
  if (!clientId || !allowed.length) throw new Error('ยังไม่ได้ตั้งค่า GOOGLE_CLIENT_ID หรือ ALLOWED_EMAILS ใน Script properties');
  var cache = CacheService.getScriptCache();
  var cacheKey = 'tok:' + Utilities.base64EncodeWebSafe(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, idToken));
  var cached = cache.get(cacheKey);
  var claims = cached ? JSON.parse(cached) : null;
  if (!claims) {
    var response = UrlFetchApp.fetch('https://oauth2.googleapis.com/tokeninfo?id_token=' + encodeURIComponent(idToken), {muteHttpExceptions: true});
    if (response.getResponseCode() !== 200) throw new Error('token ไม่ถูกต้อง กรุณาเข้าสู่ระบบใหม่');
    claims = JSON.parse(response.getContentText());
  }
  var email = checkClaims(claims, clientId, allowed, Date.now() / 1000);
  if (!cached) cache.put(cacheKey, JSON.stringify(claims), 300);
  return email;
}

function sheet(name) {
  var book = SpreadsheetApp.getActiveSpreadsheet();
  var tab = book.getSheetByName(name);
  if (!tab) { tab = book.insertSheet(name); tab.appendRow(SHEETS[name]); tab.setFrozenRows(1); }
  return tab;
}

function rows(name) {
  var values = sheet(name).getDataRange().getValues();
  return values.slice(1);
}

function text(value) { return "'" + value; } // keep timestamps as exact text, never parsed by Sheets

function iso(value) { return value instanceof Date ? value.toISOString() : String(value); }

function readState() {
  var state = {marks: {}, attempts: [], settings: {}};
  rows('marks').forEach(function (r) { if (r[0]) state.marks[r[0]] = {done: r[1] === true || r[1] === 'TRUE', at: iso(r[2])}; });
  rows('attempts').forEach(function (r) {
    if (!r[0]) return;
    var answers;
    try { answers = r[8] ? JSON.parse(r[8]) : undefined; } catch (_) { answers = undefined; }
    state.attempts.push({id: String(r[1]), title: String(r[2]), score: Number(r[3]), total: Number(r[4]), date: iso(r[5]),
      elapsed_seconds: r[6] === '' ? null : Number(r[6]), timedOut: r[7] === true || r[7] === 'TRUE', answers: answers});
  });
  rows('settings').forEach(function (r) { if (SETTING_KEYS.indexOf(r[0]) >= 0) state.settings[r[0]] = {value: r[1] ? iso(r[1]).slice(0, 10) : null, at: iso(r[2])}; });
  return state;
}

function upsert(name, key, row) {
  var tab = sheet(name), keys = tab.getLastRow() > 1 ? tab.getRange(2, 1, tab.getLastRow() - 1, 1).getValues() : [];
  for (var i = 0; i < keys.length; i++) {
    if (keys[i][0] === key) { tab.getRange(i + 2, 1, 1, row.length).setValues([row]); return; }
  }
  tab.appendRow(row);
}

function writeChanges(changed, incoming, email) {
  changed.marks.forEach(function (id) { upsert('marks', id, [id, incoming.marks[id].done, text(incoming.marks[id].at), email]); });
  if (changed.attempts.length) {
    var tab = sheet('attempts');
    var values = changed.attempts.map(function (a) {
      return [attemptKey(a), a.id, a.title, a.score, a.total, text(a.date), a.elapsed_seconds === null ? '' : a.elapsed_seconds, a.timedOut, a.answers ? JSON.stringify(a.answers) : '', email];
    });
    tab.getRange(tab.getLastRow() + 1, 1, values.length, values[0].length).setValues(values);
  }
  changed.settings.forEach(function (key) { upsert('settings', key, [key, incoming.settings[key].value ? text(incoming.settings[key].value) : '', text(incoming.settings[key].at), email]); });
}

function appendLog(email, action, detail) { sheet('log').appendRow([text(new Date().toISOString()), email, action, detail]); }

function json(data) { return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON); }
