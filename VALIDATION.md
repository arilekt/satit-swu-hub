# Validation status — dashboard v0.2.0

## Passed

- All seven feature JavaScript modules plus build-info.js: syntax checked.
- Node core harness: 53-step content/exam catalogue, Markdown file paths, original LocalStorage reload/undo, combined lesson/exam progress, detailed result export.
- Quiz engine: invalid answer index, score, duplicate submit, deadline, abandoned-attempt cleanup.
- Calendar countdown: calendar months/days, month ends, leap year, Bangkok calendar-day source, today/past dates and Thai Buddhist year.
- Milestones: Pre-Test through exam day, next-day transition, unknown/future/today/past results, simultaneous real-exam countdown.
- Recommendation logic: only ready lessons, next incomplete lesson, approximate study duration, review and no-content states.
- Parent event editor: invalid/impossible dates, incomplete/reversed times, duplicate IDs, add/update/delete, reload persistence, reset.
- Progress restore: validated replacement, rejected bad scores/dates without overwriting valid stored data.
- Calendar export: 5 fair entries, sorted exam/result entries, Bangkok-to-UTC time, exclusive all-day end, ICS text escaping and UTF-8 folding.
- Python build stamping: three unittest cases, manifest/HTML consistency, versioned assets, Thai timezone, invalid version and missing marker rejection.

## Browser checks actually run

Headless installed Chrome using a local HTTP server at the GitHub Pages project subpath:

- Dashboard loads, shows correct Thai date, primary Pre-Test, real exam, 5 progress links and ready lesson recommendation.
- No horizontal overflow at 1024×1366 and 390×844; screenshots inspected.
- Dashboard/lesson/parent navigation and parent menu separation.
- Added activity persists after full reload and appears on Dashboard.
- Activities JSON download works.
- Personal result date persists after reload and reset works.
- Invalid imported activity date is rejected without replacing existing events.
- Simulated 30 Nov 2026: unknown result date is shown, exam countdown continues; supplied 5 Dec result date is counted.
- Footer shows stamped loaded build; simulated newer manifest shows refresh link without changing loaded build label.
- No browser page errors in the tested paths.

## Limits

- External CDNs and Google Fonts could not be reached in this environment; their requests were blocked in the browser checks. Dashboard and parent tools use project CSS/JS and passed without them. Actual Markdown rendering, video playback and quiz UI with the CDN libraries were not integration tested here. The classroom displayed the intended error/retry state.
- Actual Safari on iPad has not been tested. Browser layout checks used Chrome with touch-sized viewports.
- Native Apple Calendar import not tested.
- Python mission_cli runtime needs tools/requirements.txt; bundled runtime lacks PyYAML. Python syntax passed previously, but full AI authoring/import workflow is not verified.
- No AI API request was sent. Source PDF analysis not run; existing social lessons are examples.
- Existing progress key retained. Parent activity/config edits are local until exported and deployed.
- Git commit, push and GitHub Pages deployment have not been performed for this redesign.

## Repeatable checks

```powershell
node tests/core.cjs
python -m unittest discover -s tests -p test_build.py
```

Before release: try Safari portrait/landscape, load Social PART 01 video, complete/undo a lesson, reload progress, submit a quiz, export/restore a backup and compare the displayed build ID after deployment.

## Social video release

All 13 ID → Markdown/config mappings PASS. Renderer tested for correct iframe ID, controls, inline playback parameter, no autoplay, referrer and fallback links. Actual YouTube playback not verified. PART 03–13 summaries pending; PART 01–02 summaries labeled unverified against videos.

## Content/exam-only progress

Intro and PDF guide steps removed in every subject. Counts: Social 14 (13 PART + 1 mock), English 11, Science 7, Thai 9, Math 12, total 53. Tests PASS for retained old PART completions, ignored removed-step records, historical exam attempt completion, repeat exams counted once, mini-quiz excluded, persistent exam completion after 100-history rotation, and recommending the mock after ready lessons.

## v0.3.0 lesson room, PART menu, chapter quizzes

- `node tests/core.cjs` PASS รวมชุดใหม่: 52 PART มีแบบทดสอบท้ายบท 20 ข้อ, รวม 105 ภารกิจ, แนะนำแบบทดสอบต่อจากบทเมื่อไฟล์พร้อม, ทุก PART สังคมมี video_match/analysis_status
- Chromium (Playwright) ผ่าน local server โดยใช้ marked/js-yaml/DOMPurify จาก npm แทน CDN: 1680×1000, 1024×1366, 768×1024, 390×844 ไม่มี horizontal overflow และไม่มี page error วิดีโออยู่บนสุดของเนื้อหา YouTube ถูกบล็อกในสภาพแวดล้อมทดสอบ จึงยังไม่ได้ยืนยันการเล่นคลิป
- mission_cli: ทดสอบ outline กับ PDF สังเคราะห์ 6 หน้า (หาหัว PART 3 จุด, ไม่นับคำว่า PART กลางประโยค), generate --kind quiz, validate ปฏิเสธ 19 ข้อ, import quiz อัปเดต config, import บทเรียนเก็บ video_url/video_match เดิม ยังไม่ได้รันกับ PDF จริง
- ชื่อคลิป (YouTube oEmbed ผ่าน noembed, 3 ต.ค. 2569): Oh7BB9fiWxk = “สรุปเนื้อหาสังคมศึกษา Part 02”, lwrMYO1pP40 = “สรุปเนื้อหาสังคมศึกษา Part 03” ช่อง BBA ตรงกับเลข PART คลิปอื่นยังตรวจแบบตรงตัวไม่ได้
