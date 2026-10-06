/* Parent dashboard ("สำหรับคุณพ่อ"): progress against the plan, exam results, weak spots, the week, and links to the Sheet tabs.
   compute() is pure (tests/parent-dashboard.cjs); render() builds DOM with textContent only, never HTML strings. */
(() => {
'use strict';
const DAY = 86400000;
const dayNumber = date => Math.floor(Date.parse(date + 'T00:00:00Z') / DAY);
const dateOf = n => new Date(n * DAY).toISOString().slice(0, 10);
const bangkokDate = iso => { const t = Date.parse(iso); return Number.isFinite(t) ? new Date(t + 7 * 3600000).toISOString().slice(0, 10) : ''; };
const bangkokTime = iso => new Date(Date.parse(iso) + 7 * 3600000).toISOString().slice(11, 16);
const shortDate = date => new Intl.DateTimeFormat('th-TH', {timeZone: 'UTC', day: 'numeric', month: 'short'}).format(new Date(date + 'T00:00:00Z'));
const percentOf = a => a.total > 0 ? Math.round(a.score / a.total * 100) : 0;
const average = list => list.length ? Math.round(list.reduce((sum, x) => sum + x, 0) / list.length) : null;
const isMini = id => /:mini$/.test(id);
const WEEKDAYS = ['จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส', 'อา'];

function standing(done, planned, firstDate) {
  if (done === 0 && planned === 0) return {state: 'idle', label: firstDate ? 'เริ่ม ' + shortDate(firstDate) : 'ยังไม่เริ่ม'};
  const diff = done - planned;
  return diff > 0 ? {state: 'ok', label: 'นำ ' + diff + ' ภารกิจ'} : diff === 0 ? {state: 'ok', label: 'ตามแผน'} : {state: 'warn', label: 'ช้า ' + (-diff) + ' ภารกิจ'};
}

function compute({config, tracker, schedule = {}, today, subjectsInOrder}) {
  const subjects = subjectsInOrder || config.subjects;
  const Catalog = window.Catalog;
  const subjectOf = id => subjects.find(s => id === s.id || id.startsWith(s.id + '-')) || null;

  // progress against the plan: how many items the schedule has already asked for by today
  const planned = {}, first = {};
  for (const date of Object.keys(schedule).sort()) for (const x of schedule[date]) {
    const id = x.subject.id;
    if (!first[id]) first[id] = date;
    if (date <= today) planned[id] = (planned[id] || 0) + 1;
  }
  const rows = subjects.map(subject => {
    const items = Catalog.items(subject), total = items.length, done = items.filter(item => tracker.has(item.id)).length, due = Math.min(planned[subject.id] || 0, total);
    return {id: subject.id, name: subject.name, icon: subject.icon || '', done, total, planned: due, ...standing(done, due, first[subject.id])};
  });
  const sum = key => rows.reduce((n, r) => n + r[key], 0);
  const overall = {done: sum('done'), total: sum('total'), planned: sum('planned')};
  overall.percent = overall.total ? Math.round(overall.done / overall.total * 100) : 0;
  Object.assign(overall, standing(overall.done, overall.planned));

  // exams (mini-quizzes inside a lesson are not exams)
  const attempts = tracker.attempts().filter(a => !isMini(a.id)).sort((a, b) => Date.parse(a.date) - Date.parse(b.date));
  const pct = attempts.map(percentOf), n = attempts.length;
  const exams = {
    count: n, average: average(pct), last: n ? {title: attempts[n - 1].title, score: attempts[n - 1].score, total: attempts[n - 1].total, date: attempts[n - 1].date} : null,
    trend: n >= 6 ? average(pct.slice(-5)) - average(pct.slice(Math.max(0, n - 10), n - 5)) : null,
    bySubject: subjects.map(s => {
      const mine = attempts.filter(a => subjectOf(a.id) === s);
      return {id: s.id, name: s.name, count: mine.length, values: mine.slice(-8).map(percentOf), last: mine.length ? {score: mine[mine.length - 1].score, total: mine[mine.length - 1].total} : null};
    }).filter(s => s.count),
    recent: attempts.slice(-5).reverse().map(a => ({title: a.title || a.id, score: a.score, total: a.total, date: a.date, percent: percentOf(a), subjectId: (subjectOf(a.id) || {}).id || ''}))
  };

  // questions missed more than once, counted across every attempt (unanswered counts as missed)
  const missed = new Map();
  for (const a of attempts) for (const answer of Array.isArray(a.answers) ? a.answers : []) {
    if (!answer || typeof answer.question !== 'string' || answer.selected === answer.correct) continue;
    const entry = missed.get(answer.question) || {question: answer.question, count: 0, subject: (subjectOf(a.id) || {}).name || '', title: a.title || a.id};
    entry.count += 1; missed.set(answer.question, entry);
  }
  const weak = [...missed.values()].filter(w => w.count >= 2).sort((a, b) => b.count - a.count || a.question.localeCompare(b.question)).slice(0, 5);

  // the week (Monday first, Bangkok days) and the streak; an empty Sunday is a rest day, not a gap
  const marks = tracker.exportData().marks || {}, counts = {};
  for (const m of Object.values(marks)) if (m && m.done) { const d = bangkokDate(m.at); if (d) counts[d] = (counts[d] || 0) + 1; }
  const todayN = dayNumber(today), monday = todayN - (new Date(todayN * DAY).getUTCDay() + 6) % 7;
  const days = WEEKDAYS.map((label, i) => {
    const date = dateOf(monday + i), count = counts[date] || 0;
    return {date, label, count, state: date === today ? 'today' : i === 6 && !count ? 'rest' : date < today ? 'past' : 'future'};
  });
  let cursor = counts[today] ? todayN : todayN - 1, streak = 0;
  for (let i = 0; i < 366; i++, cursor--) {
    if (counts[dateOf(cursor)] > 0) streak++;
    else if (new Date(cursor * DAY).getUTCDay() !== 0) break;
  }
  const week = {days, activeDays: days.filter(d => d.count > 0).length, streak};

  // recent activity: finished lessons (quiz completions are covered by the attempts) and exams taken
  const lessons = {};
  for (const subject of subjects) for (const item of Catalog.items(subject)) lessons[item.id] = item.type === 'lesson' ? {subject, step: item} : null;
  const events = [];
  for (const [id, m] of Object.entries(marks)) {
    const info = lessons[id];
    if (m && m.done && info && bangkokDate(m.at) > '1970-01-01') events.push({at: m.at, kind: 'lesson', text: 'จบ ' + info.subject.name + ' · ' + (info.step.title || info.step.id)});
  }
  for (const a of attempts) events.push({at: a.date, kind: 'exam', text: 'ทำข้อสอบ ' + (a.title || a.id) + ' ได้ ' + a.score + '/' + a.total});
  const timeline = events.sort((a, b) => Date.parse(b.at) - Date.parse(a.at)).slice(0, 6).map(e => ({...e, day: bangkokDate(e.at), time: bangkokTime(e.at)}));

  // upcoming dates only
  const program = config.admissions.programs.find(p => p.id === config.admissions.primary_program) || config.admissions.programs[0];
  const countdowns = [
    {key: 'pretest', label: 'ถึง Pre-Test', date: program.pretest_date},
    {key: 'result', label: 'ถึงประกาศผล Pre-Test', date: tracker.resultDate() || program.pretest_results_date},
    {key: 'exam', label: 'ถึงสอบจริง', date: tracker.examDate() || program.exam_date}
  ].filter(c => c.date).map(c => ({...c, days: dayNumber(c.date) - todayN})).filter(c => c.days >= 0);

  return {today, subjects: rows, overall, exams, weak, week, timeline, countdowns};
}

const SHEET_URL = /^https:\/\/docs\.google\.com\/spreadsheets\/d\/[\w-]+(?:\/[\w.-]*)?(?:[?#].*)?$/;
function sheetLink(extras, tab) {
  const sheet = extras && extras.sheet;
  if (!sheet || typeof sheet.url !== 'string' || !SHEET_URL.test(sheet.url)) return null;
  const base = sheet.url.split('#')[0], gid = sheet.tabs && sheet.tabs[tab];
  return Number.isInteger(gid) ? base + '#gid=' + gid : base;
}

/* ---------- DOM ---------- */
const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e; };
const svg = (tag, attrs) => { const e = document.createElementNS('http://www.w3.org/2000/svg', tag); for (const [k, v] of Object.entries(attrs || {})) e.setAttribute(k, v); return e; };
const card = (eyebrow, title, ...children) => { const c = el('section', 'pd-card'); c.append(el('div', 'pd-eyebrow', eyebrow), el('h2', undefined, title), ...children); return c; };
const when = (event, today) => event.day === today ? 'วันนี้ ' + event.time : event.day === dateOf(dayNumber(today) - 1) ? 'เมื่อวาน' : shortDate(event.day);

function ring(percent) {
  const R = 56, C = 2 * Math.PI * R, box = el('div', 'pd-ring'), s = svg('svg', {width: 132, height: 132, viewBox: '0 0 132 132', 'aria-hidden': 'true'});
  const arc = svg('circle', {cx: 66, cy: 66, r: R, class: 'pd-arc', 'stroke-dasharray': C, 'stroke-dashoffset': C});
  s.append(svg('circle', {cx: 66, cy: 66, r: R, class: 'pd-arc-track'}), arc);
  const label = el('b', undefined, percent + '%'); label.setAttribute('role', 'img'); label.setAttribute('aria-label', 'เรียนจบ ' + percent + ' เปอร์เซ็นต์');
  box.append(s, label);
  requestAnimationFrame(() => setTimeout(() => arc.setAttribute('stroke-dashoffset', C * (1 - percent / 100)), 60));
  return box;
}

function sparkline(values) {
  const w = 220, h = 34, lo = Math.max(0, Math.min(...values) - 10), hi = Math.min(100, Math.max(...values) + 10), span = Math.max(20, hi - lo);
  const x = i => values.length < 2 ? w / 2 : 4 + i * (w - 8) / (values.length - 1), y = v => h - 4 - (v - lo) / span * (h - 8);
  const s = svg('svg', {viewBox: '0 0 ' + w + ' ' + h, preserveAspectRatio: 'none', 'aria-hidden': 'true', class: 'pd-spark'});
  s.append(svg('polyline', {points: values.map((v, i) => x(i) + ',' + y(v)).join(' '), 'vector-effect': 'non-scaling-stroke'}));
  return s;
}

function renderHero(model) {
  const left = card('ภาพรวมวันนี้ · ' + window.Countdown.label(model.today), 'พอใจเรียนถึงไหนแล้ว');
  const text = el('div'), pillLine = el('p');
  pillLine.append(el('span', 'pd-pill pd-' + model.overall.state, model.overall.label));
  text.append(el('p', 'pd-big', 'เรียนจบ ' + model.overall.done + ' จาก ' + model.overall.total + ' ภารกิจ'), pillLine, el('p', 'pd-muted', 'สัปดาห์นี้เรียน ' + model.week.activeDays + ' วัน' + (model.week.streak > 1 ? ' · ต่อเนื่อง 🔥 ' + model.week.streak + ' วัน' : '')));
  const status = el('div', 'pd-status'); status.append(ring(model.overall.percent), text); left.append(status);
  const right = card('นับถอยหลัง', 'นัดสำคัญ'), counts = el('div', 'pd-counts');
  for (const c of model.countdowns) {
    const row = el('div', 'pd-count' + (c.key === 'exam' ? ' pd-alt' : '')), label = el('div');
    label.append(el('em', undefined, 'วัน '), document.createTextNode(c.label), el('span', undefined, window.Countdown.label(c.date)));
    row.append(el('strong', undefined, String(c.days)), label); counts.append(row);
  }
  if (!model.countdowns.length) counts.append(el('p', 'pd-muted', 'ไม่มีวันนัดที่ยังไม่ถึง · ตรวจวันที่ในแท็บ กำหนดการ'));
  right.append(counts);
  const wrap = el('div', 'pd-hero'); wrap.append(left, right); return wrap;
}

function renderSubjects(model) {
  const list = el('div', 'pd-subjects');
  for (const s of model.subjects) {
    const row = el('div', 'pd-subj pd-s-' + s.id), name = el('div', 'pd-name'), num = el('div', 'pd-num'), track = el('div', 'pd-track'), fill = el('div', 'pd-fill');
    name.append(el('i', 'pd-dot'), document.createTextNode(s.name));
    num.append(el('b', undefined, String(s.done)), document.createTextNode('/' + s.total + ' '), el('span', 'pd-pill pd-' + s.state, s.label));
    track.setAttribute('role', 'img'); track.setAttribute('aria-label', s.name + ' เรียนจบ ' + s.done + ' จาก ' + s.total + ' ภารกิจ แผนอยู่ที่ ' + s.planned);
    const tick = el('div', 'pd-plan'); tick.style.left = 'calc(' + (s.total ? s.planned / s.total * 100 : 0) + '% - 1px)';
    track.append(fill, tick); row.append(name, num, track); list.append(row);
    requestAnimationFrame(() => setTimeout(() => { fill.style.width = (s.total ? s.done / s.total * 100 : 0) + '%'; }, 60));
  }
  return card('ความคืบหน้ารายวิชา', 'เทียบกับแผนที่ตั้งไว้', list, el('p', 'pd-legend', 'แท่งสี = ภารกิจที่เรียนจบ · เส้นดำ = ตำแหน่งที่ควรถึงตามแผนของวันนี้'));
}

function renderExams(model) {
  const e = model.exams, body = [];
  if (!e.count) body.push(el('p', 'pd-muted', 'ยังไม่มีผลข้อสอบ เมื่อพอใจทำข้อสอบท้ายบท ผลจะมาแสดงที่นี่'));
  else {
    const kpis = el('div', 'pd-kpis');
    for (const [value, label] of [[e.average + '%', 'คะแนนเฉลี่ย'], [e.last.score + '/' + e.last.total, 'ครั้งล่าสุด'], [e.trend === null ? '–' : (e.trend > 0 ? '+' : '') + e.trend + '%', 'เทียบ 5 ครั้งก่อน']]) { const k = el('div', 'pd-kpi'); k.append(el('b', undefined, value), el('span', undefined, label)); kpis.append(k); }
    body.push(kpis);
    for (const s of e.bySubject) {
      const row = el('div', 'pd-spark-row pd-s-' + s.id), last = el('span', 'pd-last', s.last.score + '/' + s.last.total);
      last.append(el('small', undefined, s.count + ' ครั้ง')); row.append(el('span', 'pd-name', s.name), sparkline(s.values), last); body.push(row);
    }
    const table = el('table'), head = el('tr'), thead = el('thead'), tbody = el('tbody');
    for (const t of ['วันที่', 'ชุดข้อสอบ', 'คะแนน']) head.append(el('th', undefined, t));
    thead.append(head);
    for (const a of e.recent) {
      const tr = el('tr'), score = el('td', 'pd-score', a.score + '/' + a.total), bar = el('span', 'pd-mini pd-s-' + a.subjectId), fill = el('i');
      fill.style.width = a.percent + '%'; bar.append(fill); score.append(bar);
      tr.append(el('td', undefined, shortDate(bangkokDate(a.date))), el('td', undefined, a.title), score); tbody.append(tr);
    }
    table.append(thead, tbody); body.push(table);
  }
  return card('ผลข้อสอบ', e.count ? 'ทำข้อสอบไปแล้ว ' + e.count + ' ครั้ง' : 'ผลข้อสอบ', ...body);
}

function renderWeak(model) {
  const list = el('ul', 'pd-weak');
  for (const w of model.weak) {
    const li = el('li'), d = el('div'), q = w.question.length > 90 ? w.question.slice(0, 88) + '…' : w.question;
    d.append(document.createTextNode(q), el('small', undefined, w.subject + (w.subject ? ' · ' : '') + w.title)); li.append(el('span', 'pd-n', w.count + ' ครั้ง'), d); list.append(li);
  }
  return card('ควรช่วยทบทวน', 'ข้อที่ผิดบ่อย', model.weak.length ? list : el('p', 'pd-muted', 'ยังไม่มีข้อที่ผิดซ้ำ 🎉'), el('p', 'pd-legend', 'นับจากคำตอบรายข้อในประวัติข้อสอบทั้งหมด (ข้อที่ผิดตั้งแต่ 2 ครั้ง)'));
}

function renderWeek(model) {
  const strip = el('div', 'pd-week'), timeline = el('ul', 'pd-timeline');
  for (const d of model.week.days) { const cell = el('div', 'pd-day pd-' + d.state + (d.count ? ' pd-on' : '')); cell.append(document.createTextNode(d.label), el('i', undefined, d.state === 'rest' ? 'พัก' : d.count || '–')); strip.append(cell); }
  for (const ev of model.timeline) { const li = el('li'); li.append(el('time', undefined, when(ev, model.today)), el('span', undefined, ev.text)); timeline.append(li); }
  const wrap = el('div', 'pd-cols');
  wrap.append(card('สัปดาห์นี้', 'เรียนกี่ภารกิจในแต่ละวัน', strip, el('p', 'pd-legend', 'ตัวเลข = ภารกิจที่กดเรียนจบในวันนั้น · วันอาทิตย์เป็นวันพัก · กรอบแดง = วันนี้')),
    card('ล่าสุด', 'กิจกรรมของพอใจ', model.timeline.length ? timeline : el('p', 'pd-muted', 'ยังไม่มีกิจกรรม')));
  return wrap;
}

function renderSheets(ctx) {
  const {config, extras, nextActivity, activityCount, boostText} = ctx, plan = config.daily_plan || {};
  const program = config.admissions.programs.find(p => p.id === config.admissions.primary_program) || config.admissions.programs[0];
  const exam = ctx.examDate || program.exam_date, result = ctx.resultDate || program.pretest_results_date;
  const cards = [
    {tab: 'กำหนดการ', icon: '📅', title: 'กำหนดการ', lines: ['สอบจริง ' + (exam ? window.Countdown.label(exam) : 'ยังไม่ระบุ'), 'ประกาศผล Pre-Test ' + (result ? window.Countdown.label(result) : 'ยังไม่ระบุ')]},
    {tab: 'กิจกรรม', icon: '📌', title: 'กิจกรรม', lines: [nextActivity ? 'ถัดไป: ' + nextActivity.title + ' · ' + nextActivity.range : 'ไม่มีกิจกรรมที่ยังไม่ถึง', 'มีทั้งหมด ' + activityCount + ' รายการ']},
    {tab: 'กำลังใจ', icon: '✨', title: 'กำลังใจ', lines: ['วันนี้: “' + (boostText.length > 34 ? boostText.slice(0, 32) + '…' : boostText) + '”', extras && extras.mottos ? 'ข้อความจาก Sheet ' + extras.mottos.length + ' ข้อ' : 'ใช้ชุดตั้งต้นของเว็บ']},
    {tab: 'แผน-ช่วงเวลา', icon: '🗓️', title: 'แผนการเรียน', lines: [(plan.periods || []).length + ' ช่วงเวลา · ' + (plan.subjects || []).length + ' วิชา', 'วันพิเศษ ' + Object.keys(plan.days || {}).length + ' วัน · คลาสประจำ ' + (plan.recurring_events || []).length + ' คลาส · ' + (plan.source === 'sheet' ? 'แผนจาก Sheet' : 'แผนตั้งต้นของเว็บ')]}
  ];
  const grid = el('div', 'pd-sheets');
  for (const c of cards) {
    const href = sheetLink(extras, c.tab), a = el(href ? 'a' : 'div', 'pd-sheet' + (href ? '' : ' pd-off'));
    if (href) { a.href = href; a.target = '_blank'; a.rel = 'noopener noreferrer'; }
    a.append(el('span', 'pd-ic', c.icon), el('b', undefined, c.title), ...c.lines.map(t => el('p', undefined, t)), el('span', 'pd-go', href ? 'เปิดแท็บ ↗' : 'เปิดได้หลังซิงก์กับ Google Sheet'));
    grid.append(a);
  }
  const section = el('section', 'pd-manage');
  section.append(el('div', 'pd-eyebrow', 'จัดการข้อมูล'), el('h2', undefined, 'แก้ใน Google Sheet เว็บอัปเดตเองเมื่อซิงก์'), el('p', 'pd-sub', 'ไม่ต้องกรอกฟอร์มบนเว็บและไม่ต้อง deploy · เปิดแท็บแล้วแก้เหมือน Excel'), grid);
  return section;
}

/* Rebuilt only when the words on screen change, so the once-a-minute refresh does not replay the bar animations. */
function render(root, input) {
  const model = compute(input), exams = el('div', 'pd-cols'), next = el('div');
  exams.append(renderExams(model), renderWeak(model));
  next.append(renderHero(model), renderSubjects(model), exams, renderWeek(model), renderSheets(input));
  const text = next.textContent + '|' + [...next.querySelectorAll('a')].map(a => a.href).join(',');
  if (root.dataset.text !== text) { root.dataset.text = text; root.replaceChildren(...next.childNodes); }
  return model;
}

window.ParentDashboard = {compute, sheetLink, render};
})();
