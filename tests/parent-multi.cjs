/* Run: node tests/parent-multi.cjs — login-activity wording on the multi-student dashboard. */
const fs = require('node:fs'), vm = require('node:vm'), assert = require('node:assert');
const win = {}; vm.runInNewContext(fs.readFileSync('js/parent-multi-dashboard.js', 'utf8'), {window: win, document: {}, Intl, Date, Number, Math});
const now = Date.parse('2026-11-10T03:00:00Z'); // 10:00 Bangkok
const w = i => win.ParentMultiDashboard.when(i, now);
assert.strictEqual(w('2026-11-10T01:30:00Z').text, 'วันนี้ 08:30 น.');
assert.strictEqual(w('2026-11-09T12:05:00Z').text, 'เมื่อวาน 19:05 น.');
assert.strictEqual(w('2026-11-07T01:00:00Z').days, 3);
assert.strictEqual(w('').text, 'ยังไม่เคย'); assert.strictEqual(w(undefined).days, null);
console.log('parent-multi ok');
