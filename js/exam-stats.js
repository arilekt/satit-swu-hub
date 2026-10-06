/* Exam statistics shown before an exam starts (and the level badge after it): when it was taken, the score,
   which level that is, and which questions keep going wrong. One component for every exam page.
   The levels come from the Sheet tab "เกณฑ์คะแนน"; these defaults are used until it has valid rows. */
(() => {
'use strict';
// "above" = strictly more than percent ("เกิน 80%"); otherwise "from" (">="). The lowest level at 0% means "not passed yet".
const DEFAULT_GRADING = [
  {label: 'ต้องฝึกเพิ่ม', percent: 0, above: false, icon: '🌱'},
  {label: 'ผ่านเกณฑ์', percent: 60, above: false, icon: '✅'},
  {label: 'ดีมาก', percent: 80, above: true, icon: '🌟'},
  {label: 'ยอดเยี่ยม', percent: 100, above: false, icon: '🏆'}
];
let grading = DEFAULT_GRADING;

function clean(list) {
  if (!Array.isArray(list)) return null;
  const levels = list.filter(l => l && typeof l.label === 'string' && l.label.trim() && Number.isFinite(Number(l.percent)) && l.percent !== '' && l.percent !== null && Number(l.percent) >= 0 && Number(l.percent) <= 100)
    .map(l => ({label: l.label.trim().slice(0, 30), percent: Number(l.percent), above: l.above === true, icon: typeof l.icon === 'string' ? l.icon.slice(0, 8) : ''}))
    .sort((a, b) => a.percent - b.percent).slice(0, 8);
  return levels.length >= 2 ? levels : null;
}
const setGrading = list => { grading = clean(list) || DEFAULT_GRADING; };
const currentGrading = () => grading;

function levelFor(percent, g = grading) {
  for (let i = g.length - 1; i >= 0; i--) if (g[i].above ? percent > g[i].percent : percent >= g[i].percent) return {...g[i], index: i};
  return null;
}
const passFrom = g => g[0].percent === 0 ? 1 : 0;
const isPass = (level, g = grading) => !!level && level.index >= passFrom(g);
const tier = (level, g) => level ? Math.round(level.index / (g.length - 1) * 3) : 0;

function legend(g = grading) {
  return g.filter((l, i) => !(i === 0 && l.percent === 0)).map(l => l.label + ' ' + (l.percent >= 100 && !l.above ? '100%' : (l.above ? 'เกิน ' : 'ตั้งแต่ ') + l.percent + '%')).join(' · ');
}

function summarize(attempts, g = grading) {
  const list = (attempts || []).filter(a => a && Number.isFinite(a.score) && a.total > 0)
    .sort((x, y) => (Date.parse(y.date) || 0) - (Date.parse(x.date) || 0));
  if (!list.length) return null;
  const info = a => { const exact = a.score * 100 / a.total; return {score: a.score, total: a.total, percent: Math.round(exact), exact, level: levelFor(exact, g), date: a.date, seconds: Number.isFinite(a.elapsed_seconds) ? a.elapsed_seconds : null, wrong: a.total - a.score}; };
  const all = list.map(info), best = all.reduce((top, x) => x.exact > top.exact ? x : top, all[0]);

  // questions missed: repeats first; with no repeat, what went wrong last time
  const tally = new Map();
  for (const a of list) for (const x of Array.isArray(a.answers) ? a.answers : []) {
    if (!x || typeof x.question !== 'string') continue;
    const t = tally.get(x.question) || {question: x.question, missed: 0, of: 0};
    t.of += 1; if (x.selected !== x.correct) t.missed += 1; tally.set(x.question, t);
  }
  const repeats = [...tally.values()].filter(t => t.missed >= 2).sort((a, b) => b.missed - a.missed || a.question.localeCompare(b.question)).slice(0, 3);
  const lastWrong = (Array.isArray(list[0].answers) ? list[0].answers : []).filter(x => x && typeof x.question === 'string' && x.selected !== x.correct).map(x => tally.get(x.question)).slice(0, 3);
  const weak = repeats.length ? {kind: 'repeat', items: repeats} : lastWrong.length ? {kind: 'last', items: lastWrong} : null;

  return {
    count: all.length, last: all[0], best, average: Math.round(all.reduce((s, x) => s + x.exact, 0) / all.length),
    bars: all.slice(0, 6).reverse().map(x => ({percent: x.percent, level: x.level, date: x.date})),
    rows: all.slice(0, 5), weak
  };
}

/* ---------- DOM ---------- */
const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e; };
const clock = seconds => { const s = Math.max(0, Math.round(seconds)), h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), pad = n => String(n).padStart(2, '0'); return (h ? h + ':' + pad(m) : pad(m)) + ':' + pad(s % 60); };
function when(iso) {
  const t = Date.parse(iso); if (!Number.isFinite(t)) return '';
  const bkk = new Date(t + 7 * 3600000).toISOString(), day = bkk.slice(0, 10), now = Date.now() + 7 * 3600000;
  const time = bkk.slice(11, 16);
  if (day === new Date(now).toISOString().slice(0, 10)) return 'วันนี้ ' + time;
  if (day === new Date(now - 86400000).toISOString().slice(0, 10)) return 'เมื่อวาน ' + time;
  return new Intl.DateTimeFormat('th-TH', {timeZone: 'UTC', day: 'numeric', month: 'short'}).format(new Date(day + 'T00:00:00Z')) + ' ' + time;
}
function badge(level, g = grading) {
  return el('span', 'es-badge es-t' + tier(level, g), level ? (level.icon ? level.icon + ' ' : '') + level.label : 'ยังไม่ถึงเกณฑ์');
}

function render(attempts, opts = {}) {
  const g = opts.grading || grading, S = summarize(attempts, g), box = el('section', 'es');
  box.setAttribute('aria-label', 'สถิติของข้อสอบนี้');
  if (!S) { box.classList.add('es-empty'); box.append(el('p', 'es-line', 'ยังไม่เคยทำข้อสอบชุดนี้ · เกณฑ์: ' + legend(g))); return box; }
  const line = el('p', 'es-line');
  line.append(badge(S.last.level, g), el('span', undefined, ' ทำมาแล้ว ' + S.count + ' ครั้ง · ล่าสุด ' + S.last.score + '/' + S.last.total + ' (' + S.last.percent + '%)' + (S.count > 1 ? ' · ดีที่สุด ' + S.best.score + '/' + S.best.total : '')));
  const more = el('details', 'es-more'), body = el('div', 'es-body'), top = el('div', 'es-top');
  more.append(el('summary', undefined, 'ดูสถิติและประวัติ'), body);

  const passAt = g[passFrom(g)].percent, bars = el('div', 'es-bars');
  bars.setAttribute('role', 'img'); bars.setAttribute('aria-label', 'ผลย้อนหลัง ' + S.bars.map(b => b.percent + '%').join(', ') + ' เส้นประคือเกณฑ์ผ่าน ' + passAt + '%');
  for (const b of S.bars) { const bar = el('div', 'es-bar es-t' + tier(b.level, g)); bar.style.height = Math.max(4, b.percent) + '%'; bar.title = when(b.date) + ' · ' + b.percent + '%'; bars.append(bar); }
  const mark = el('i', 'es-pass'); mark.style.bottom = passAt + '%'; bars.append(mark);

  const table = el('ol', 'es-history');
  for (const r of S.rows) {
    const li = el('li'), time = r.seconds === null ? '' : '⏱ ' + clock(r.seconds);
    li.append(el('time', undefined, when(r.date)), el('b', undefined, r.score + '/' + r.total), badge(r.level, g), el('span', 'es-time', time)); table.append(li);
  }
  top.append(bars, table); body.append(top);
  if (S.weak) {
    const weak = el('div', 'es-weak'), list = el('ul');
    weak.append(el('h4', undefined, S.weak.kind === 'repeat' ? 'ข้อที่ผิดซ้ำ' : 'ข้อที่ผิดครั้งล่าสุด'));
    for (const w of S.weak.items) { const li = el('li'); li.append(document.createTextNode(w.question.length > 90 ? w.question.slice(0, 88) + '…' : w.question), el('small', undefined, ' ผิด ' + w.missed + ' จาก ' + w.of + ' ครั้ง')); list.append(li); }
    weak.append(list); body.append(weak);
  }
  body.append(el('p', 'es-legend', 'เกณฑ์: ' + legend(g)));
  box.append(line, more);
  return box;
}

window.ExamStats = {DEFAULT_GRADING, setGrading, grading: currentGrading, levelFor, isPass, tier, legend, summarize, render, badge};
})();
