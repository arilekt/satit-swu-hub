/* Run: node tests/exam-stats.cjs — grading levels and per-exam statistics (js/exam-stats.js). */
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');

const ctx = {window: {}, document: {}};
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(root, 'js/exam-stats.js'), 'utf8').split('\r\n').join('\n'), ctx);
const ES = ctx.window.ExamStats;
const plain = x => JSON.parse(JSON.stringify(x));
const eq = (actual, expected, message) => assert.deepEqual(plain(actual), plain(expected), message);
const G = ES.DEFAULT_GRADING;

// 1. levels: pass from 60%, "very good" only ABOVE 80%, perfect is 100%
const level = (score, total, grading = G) => (ES.levelFor(score * 100 / total, grading) || {}).label;
assert.equal(level(0, 20), 'ต้องฝึกเพิ่ม');
assert.equal(level(11, 20), 'ต้องฝึกเพิ่ม');
assert.equal(level(12, 20), 'ผ่านเกณฑ์', '60% exactly passes');
assert.equal(level(16, 20), 'ผ่านเกณฑ์', '80% exactly is not above 80%');
assert.equal(level(24, 30), 'ผ่านเกณฑ์', '24/30 is exactly 80%');
assert.equal(level(17, 20), 'ดีมาก');
assert.equal(level(25, 30), 'ดีมาก');
assert.equal(level(19, 20), 'ดีมาก');
assert.equal(level(20, 20), 'ยอดเยี่ยม');
assert.equal(level(1, 1), 'ยอดเยี่ยม');
assert.equal(ES.levelFor(40, [{label: 'a', percent: 50, above: false}, {label: 'b', percent: 90, above: false}]), null, 'below the lowest level');
assert.equal(ES.isPass(ES.levelFor(60, G), G), true);
assert.equal(ES.isPass(ES.levelFor(59, G), G), false);
assert.equal(ES.levelFor(50, G).index, 0);
assert.equal(ES.levelFor(100, G).index, 3);

// 2. grading from the Sheet is validated; anything unusable falls back to the defaults
eq(ES.grading(), G);
ES.setGrading([{label: 'ผ่าน', percent: 50, above: false, icon: ''}, {label: 'เก่ง', percent: 90, above: true, icon: '⭐'}]);
eq(ES.grading().map(l => l.label), ['ผ่าน', 'เก่ง']);
ES.setGrading([{label: 'x', percent: 'a'}]); eq(ES.grading(), G);
ES.setGrading([{label: 'only one', percent: 10}]); eq(ES.grading(), G, 'needs at least two levels');
ES.setGrading([{label: 'b', percent: 80}, {label: 'a', percent: 20}, {label: '', percent: 50}, {label: 'c', percent: 140}]);
eq(ES.grading().map(l => l.label), ['a', 'b'], 'sorted, bad rows dropped');
ES.setGrading(null); eq(ES.grading(), G);
assert.equal(ES.legend(G), 'ผ่านเกณฑ์ ตั้งแต่ 60% · ดีมาก เกิน 80% · ยอดเยี่ยม 100%');

// 3. statistics for one exam
const q = (text, selected) => ({question: text, selected, correct: 0});
const attempts = [
  {id: 'math-part01-quiz', title: 't', score: 14, total: 20, date: '2026-10-02T03:00:00.000Z', elapsed_seconds: 1500, answers: [q('ข้อ ก', 1), q('ข้อ ข', 0), q('ข้อ ค', 0)]},
  {id: 'math-part01-quiz', title: 't', score: 8, total: 20, date: '2026-10-01T03:00:00.000Z', elapsed_seconds: 1092, answers: [q('ข้อ ก', 1), q('ข้อ ข', null), q('ข้อ ค', 0)]},
  {id: 'math-part01-quiz', title: 't', score: 18, total: 20, date: '2026-10-05T03:00:00.000Z', answers: [q('ข้อ ก', 0), q('ข้อ ข', 0), q('ข้อ ค', 2)]}
];
const S = ES.summarize(attempts, G);
assert.equal(S.count, 3);
eq([S.last.score, S.last.percent, S.last.level.label, S.last.wrong], [18, 90, 'ดีมาก', 2]);
eq([S.best.score, S.best.level.label], [18, 'ดีมาก']);
assert.equal(S.average, 67);
eq(S.bars.map(b => b.percent), [40, 70, 90], 'oldest to newest');
eq(S.rows.map(r => [r.score, r.level.label]), [[18, 'ดีมาก'], [14, 'ผ่านเกณฑ์'], [8, 'ต้องฝึกเพิ่ม']], 'newest first');
assert.equal(S.rows[0].seconds, null);
assert.equal(S.rows[1].seconds, 1500);
eq(S.weak, {kind: 'repeat', items: [{question: 'ข้อ ก', missed: 2, of: 3}]}, 'unanswered counts as missed; only repeats are listed');
const one = ES.summarize([attempts[1]], G);
eq(one.weak, {kind: 'last', items: [{question: 'ข้อ ก', missed: 1, of: 1}, {question: 'ข้อ ข', missed: 1, of: 1}]});
assert.equal(ES.summarize([], G), null);
assert.equal(ES.summarize([{id: 'x', title: 't', score: 1, total: 2, date: 'bad'}], G).count, 1, 'a broken date does not break the summary');
const many = Array.from({length: 9}, (_, i) => ({id: 'x', title: 't', score: i + 1, total: 10, date: '2026-10-0' + (i + 1) + 'T03:00:00.000Z'}));
const M = ES.summarize(many, G);
assert.equal(M.rows.length, 5);
assert.equal(M.bars.length, 6);
assert.equal(M.rows[0].score, 9);

console.log('PASS: exam stats: 60% pass / above 80% very good / 100% perfect (exact boundaries), Sheet grading validated with defaults, per-exam count/best/average/bars/history/repeated misses');
