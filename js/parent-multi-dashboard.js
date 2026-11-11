/* Multi-student parent dashboard: per learner progress, exam results and login activity.
   compute() is pure; render() builds DOM with textContent only, never HTML strings. */
(() => {
'use strict';

const HOUR = 3600000, DAY = 86400000;
const bangkok = t => new Date(t + 7 * HOUR);
const fmtTime = t => { const d = bangkok(t); return String(d.getUTCHours()).padStart(2, '0') + ':' + String(d.getUTCMinutes()).padStart(2, '0') + ' น.'; };
const fmtDate = t => new Intl.DateTimeFormat('th-TH', {timeZone: 'UTC', day: 'numeric', month: 'short'}).format(bangkok(t));
const dayOf = t => Math.floor((t + 7 * HOUR) / DAY);

// "วันนี้ 08:30 น." / "เมื่อวาน 19:05 น." / "3 วันก่อน · 7 พ.ย." / "ยังไม่เคย"
function when(iso, now = Date.now()) {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return {text: 'ยังไม่เคย', days: null};
  const days = dayOf(now) - dayOf(t);
  if (days <= 0) return {text: 'วันนี้ ' + fmtTime(t), days: 0};
  if (days === 1) return {text: 'เมื่อวาน ' + fmtTime(t), days};
  return {text: days + ' วันก่อน · ' + fmtDate(t), days};
}

function compute({students, trackers, config, today, subjectsInOrder, scheduleFor, activity = {}, now = Date.now()}) {
  if (!Array.isArray(students) || !Array.isArray(trackers)) return null;
  const results = students.map((email, i) => {
    const tracker = trackers[i];
    if (!tracker) return null;
    try {
      const schedule = typeof scheduleFor === 'function' ? scheduleFor(tracker) : {};
      const base = window.ParentDashboard.compute({config, tracker, schedule, today, subjectsInOrder});
      const a = activity[email] || {};
      return {
        email, ...base,
        activity: {
          lastLogin: when(a.last_login, now), lastSync: when(a.last_sync, now), lastSeen: when(a.last_seen, now),
          logins: a.logins || 0, activeSessions: a.active_sessions || 0, known: !!activity[email]
        }
      };
    } catch (_) { return null; }
  }).filter(Boolean);
  return results.length ? {students: results} : null;
}

const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text !== undefined) n.textContent = text; return n; };
const row = (label, value, tone) => { const r = el('div', 'sc-row'); r.append(el('span', 'sc-k', label), el('span', 'sc-v' + (tone ? ' sc-' + tone : ''), value)); return r; };

function render(root, data, {selected, nameOf = e => e.split('@')[0], onSelect} = {}) {
  if (!root || !data) return;
  root.textContent = '';
  const container = el('div', 'parent-multi-dashboard');
  const head = el('div', 'pm-head');
  head.append(el('h2', undefined, 'ความคืบหน้าของผู้เรียน'));
  if (data.students.length > 1) {
    const label = el('label', 'pm-picker'); label.append(el('span', undefined, 'ดูของ '));
    const select = el('select'); select.setAttribute('aria-label', 'เลือกผู้เรียน');
    data.students.forEach(s => { const o = el('option', undefined, nameOf(s.email)); o.value = s.email; if (s.email === selected) o.selected = true; select.append(o); });
    select.addEventListener('change', () => onSelect && onSelect(select.value));
    label.append(select); head.append(label);
  }
  container.append(head);
  const cards = el('div', 'student-cards');
  data.students.forEach(s => {
    const card = el('article', 'student-card' + (s.email === selected ? ' is-selected' : ''));
    if (onSelect) { card.tabIndex = 0; card.setAttribute('role', 'button'); card.addEventListener('click', () => onSelect(s.email)); card.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(s.email); } }); }
    card.append(el('h3', undefined, nameOf(s.email)), el('div', 'sc-email', s.email));
    const stats = el('div', 'student-stats');
    stats.append(el('div', 'stat-percent', s.overall.percent + '%'), el('div', 'stat-label', 'จบ ' + s.overall.done + '/' + s.overall.total + ' ภารกิจ · ' + s.overall.label));
    card.append(stats);
    const a = s.activity, never = a.known && a.lastLogin.days === null;
    const box = el('div', 'sc-rows');
    box.append(row('ล็อกอินล่าสุด', a.known ? (never ? 'ยังไม่เคยเข้าสู่ระบบ' : a.lastLogin.text) : 'ไม่มีข้อมูล', never ? 'warn' : a.lastLogin.days != null && a.lastLogin.days >= 3 ? 'warn' : ''));
    if (a.known && !never) box.append(row('ซิงก์ล่าสุด', a.lastSync.text), row('จำนวนครั้งที่ล็อกอิน', a.logins + ' ครั้ง'));
    const e = s.exams;
    if (a.known && !never && s.overall.done === 0 && !e.count) box.append(row('สถานะ', 'เปิดเว็บแล้ว แต่ยังไม่ได้ทำภารกิจ/ข้อสอบ', 'warn'));
    box.append(row('ข้อสอบที่ทำแล้ว', e.count ? e.count + ' ครั้ง · เฉลี่ย ' + e.average + '%' : 'ยังไม่ได้ทำ'));
    if (e.last) box.append(row('ล่าสุด', e.last.score + '/' + e.last.total + ' · ' + (e.last.title || '')));
    card.append(box);
    cards.append(card);
  });
  container.append(cards);
  root.append(container);
}

window.ParentMultiDashboard = {compute, render, when};
})();
