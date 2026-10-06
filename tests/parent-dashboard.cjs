/* Run: node tests/parent-dashboard.cjs — the numbers behind the parent dashboard (js/parent-dashboard.js). */
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const read = name => fs.readFileSync(path.join(root, name), 'utf8').split('\r\n').join('\n');

const ctx = {window: {}, document: {getElementById: () => null}};
vm.createContext(ctx);
for (const file of ['catalog', 'countdown']) vm.runInContext(read('js/' + file + '.js'), ctx);
vm.runInContext(read('js/parent-dashboard.js'), ctx);
const PD = ctx.window.ParentDashboard;
const plain = x => JSON.parse(JSON.stringify(x)); // values built inside the vm have another Array prototype
const eq = (actual, expected, message) => assert.deepEqual(plain(actual), plain(expected), message);

const mk = id => ({id, type: 'lesson', quiz: {id: id + '-quiz', type: 'exam'}});
const config = {
  admissions: {primary_program: 'regular', programs: [{id: 'regular', pretest_date: '2026-11-29', pretest_results_date: '2026-12-08', exam_date: '2027-02-07'}]},
  subjects: [
    {id: 'math', name: 'คณิตศาสตร์', steps: [mk('math-part01'), mk('math-part02'), mk('math-part03')]},
    {id: 'science', name: 'วิทยาศาสตร์', steps: [mk('science-part01'), mk('science-part02')]},
    {id: 'english', name: 'ภาษาอังกฤษ', steps: [mk('english-part01')]}
  ]
};
// math: 6 items (3 lessons + 3 quizzes), science: 4, english: 2
const schedule = {
  '2026-10-05': [{subject: {id: 'math'}, step: {id: 'math-part01'}}, {subject: {id: 'math'}, step: {id: 'math-part01-quiz'}}],
  '2026-10-06': [{subject: {id: 'math'}, step: {id: 'math-part02'}}, {subject: {id: 'science'}, step: {id: 'science-part01'}}],
  '2026-10-07': [{subject: {id: 'math'}, step: {id: 'math-part02-quiz'}}, {subject: {id: 'science'}, step: {id: 'science-part01-quiz'}}],
  '2026-12-01': [{subject: {id: 'english'}, step: {id: 'english-part01'}}]
};
const done = new Set(['math-part01', 'math-part01-quiz', 'math-part02', 'math-part02-quiz', 'math-part03']);
const attempt = (id, score, total, date, answers) => ({id, title: id, score, total, date, ...(answers ? {answers} : {})});
const wrong = (q, selected = 1) => ({question: q, selected, correct: 0});
const right = q => ({question: q, selected: 0, correct: 0});
const attempts = [
  attempt('math-part01-quiz', 6, 10, '2026-10-01T03:00:00.000Z', [wrong('เศษส่วนใหญ่กว่า'), right('ร้อยละ')]),
  attempt('math-part01-quiz', 7, 10, '2026-10-02T03:00:00.000Z', [wrong('เศษส่วนใหญ่กว่า'), wrong('ร้อยละ', null)]),
  attempt('science-part01-quiz', 8, 10, '2026-10-03T03:00:00.000Z', [wrong('แรง'), right('มวล')]),
  attempt('math-part02-quiz', 8, 10, '2026-10-04T03:00:00.000Z'),
  attempt('math-part02:mini', 1, 1, '2026-10-04T04:00:00.000Z'),
  attempt('science-part01-quiz', 9, 10, '2026-10-05T03:00:00.000Z', [wrong('เศษส่วนใหญ่กว่า'), right('แรง')]),
  attempt('math-part03-quiz', 10, 10, '2026-10-06T03:00:00.000Z')
];
// 2026-10-05 17:30Z is already 6 Oct in Bangkok; the epoch mark is legacy data without a real time
const marks = {
  'math-part01': {done: true, at: '2026-10-05T02:00:00.000Z'}, 'math-part01-quiz': {done: true, at: '2026-10-05T03:00:00.000Z'},
  'math-part02': {done: true, at: '2026-10-05T17:30:00.000Z'}, 'math-part02-quiz': {done: true, at: '2026-10-06T05:00:00.000Z'},
  'math-part03': {done: true, at: '2026-10-06T06:00:00.000Z'}, 'science-part01': {done: false, at: '2026-10-06T06:30:00.000Z'},
  'science-part02': {done: true, at: '1970-01-01T00:00:00.000Z'}
};
const tracker = {has: id => done.has(id), attempts: () => attempts, exportData: () => ({marks, attempts}), examDate: () => null, resultDate: () => null};
const run = (overrides, today = '2026-10-06') => PD.compute({config, tracker: {...tracker, ...overrides}, schedule, today});
const model = run({});

// 1. per-subject progress against the plan
const [math, science, english] = model.subjects;
eq([math.done, math.total, math.planned, math.state, math.label], [5, 6, 3, 'ok', 'นำ 2 ภารกิจ']);
eq([science.done, science.total, science.planned, science.state, science.label], [0, 4, 1, 'warn', 'ช้า 1 ภารกิจ']);
eq([english.done, english.total, english.planned, english.state], [0, 2, 0, 'idle']);
assert.match(english.label, /เริ่ม 1 ธ\.ค\./);
eq([model.overall.done, model.overall.total, model.overall.percent, model.overall.planned, model.overall.state], [5, 12, 42, 4, 'ok']);
assert.equal(PD.compute({config, tracker: {...tracker, has: () => false}, schedule: {}, today: '2026-10-06'}).subjects[0].label, 'ยังไม่เริ่ม');

// 2. exam results (mini-quizzes are not exams)
assert.equal(model.exams.count, 6);
assert.equal(model.exams.average, 80);
eq([model.exams.last.score, model.exams.last.total], [10, 10]);
assert.equal(model.exams.trend, 24, 'last five (84%) against the one before them (60%)');
eq(model.exams.bySubject.map(s => [s.id, s.count, [...s.values]]), [['math', 4, [60, 70, 80, 100]], ['science', 2, [80, 90]]]);
assert.equal(model.exams.recent.length, 5);
assert.equal(model.exams.recent[0].score, 10);
assert.equal(run({attempts: () => attempts.slice(0, 2)}).exams.trend, null, 'no trend until there are six attempts');
assert.equal(run({attempts: () => []}).exams.count, 0);
assert.equal(run({attempts: () => []}).exams.average, null);

// 3. questions missed more than once (unanswered counts as missed); the subject is where it first appeared
eq(model.weak.map(w => [w.question, w.count, w.subject]), [['เศษส่วนใหญ่กว่า', 3, 'คณิตศาสตร์']]);

// 4. this week (Monday first, Bangkok days), rest on Sunday, streak
eq([...model.week.days.map(d => d.date)], ['2026-10-05', '2026-10-06', '2026-10-07', '2026-10-08', '2026-10-09', '2026-10-10', '2026-10-11']);
eq([...model.week.days.map(d => d.count)], [2, 3, 0, 0, 0, 0, 0]);
eq([...model.week.days.map(d => d.state)], ['past', 'today', 'future', 'future', 'future', 'future', 'rest']);
assert.equal(model.week.activeDays, 2);
assert.equal(model.week.streak, 2);
const at = date => ({done: true, at: date + 'T03:00:00.000Z'});
const streak = days => run({exportData: () => ({marks: Object.fromEntries(days.map((d, i) => ['m' + i, at(d)])), attempts: []})}).week.streak;
assert.equal(streak(['2026-10-03', '2026-10-04', '2026-10-05', '2026-10-06']), 4, 'a Sunday with activity counts');
assert.equal(streak(['2026-10-03', '2026-10-05', '2026-10-06']), 3, 'an empty Sunday does not break the streak');
assert.equal(streak(['2026-10-02', '2026-10-06']), 1, 'an empty weekday does');
assert.equal(streak(['2026-10-05']), 1, 'nothing yet today keeps yesterday’s streak');
assert.equal(streak([]), 0);

// 5. recent activity: lessons and quiz attempts, newest first; quiz marks, undone marks and legacy marks are not events
assert.equal(model.timeline.length, 6);
assert.equal(model.timeline[0].at, '2026-10-06T06:00:00.000Z');
assert.equal(model.timeline[0].kind, 'lesson');
assert.ok(model.timeline.every((e, i, all) => i === 0 || all[i - 1].at >= e.at));
assert.ok(!model.timeline.some(e => e.kind === 'lesson' && /วิทยาศาสตร์|ภาษาอังกฤษ/.test(e.text)));
assert.ok(model.timeline.some(e => e.kind === 'lesson' && /คณิตศาสตร์/.test(e.text)));
assert.ok(model.timeline.some(e => e.kind === 'exam' && /10\/10/.test(e.text)));
assert.ok(!model.timeline.some(e => /mini/.test(e.text)));

// 6. countdowns: only dates that have not passed
eq(model.countdowns.map(c => [c.key, c.days]), [['pretest', 54], ['result', 63], ['exam', 124]]);
eq(run({}, '2026-12-09').countdowns.map(c => c.key), ['exam']);
eq(run({examDate: () => '2027-03-01', resultDate: () => '2026-12-20'}).countdowns.map(c => [c.key, c.date]), [['pretest', '2026-11-29'], ['result', '2026-12-20'], ['exam', '2027-03-01']]);

// 7. Sheet links only to Google Sheets over https
const sheet = (url, tabs = {}) => ({sheet: {url, tabs}});
assert.equal(PD.sheetLink(sheet('https://docs.google.com/spreadsheets/d/abc_DEF-1/edit', {'กิจกรรม': 123}), 'กิจกรรม'), 'https://docs.google.com/spreadsheets/d/abc_DEF-1/edit#gid=123');
assert.equal(PD.sheetLink(sheet('https://docs.google.com/spreadsheets/d/abc_DEF-1/edit#gid=9'), 'กิจกรรม'), 'https://docs.google.com/spreadsheets/d/abc_DEF-1/edit');
assert.equal(PD.sheetLink(sheet('https://evil.example/spreadsheets/d/abc/edit'), 'กิจกรรม'), null);
assert.equal(PD.sheetLink(sheet('javascript:alert(1)'), 'กิจกรรม'), null);
assert.equal(PD.sheetLink(null, 'กิจกรรม'), null);

console.log('PASS: parent dashboard numbers: progress vs plan, exam stats/trend/per-subject, repeated misses, week/streak (Bangkok days, Sunday rest), recent activity, countdowns, safe Sheet links');
