# HANDOFF - Satit SWU Hub Content Status

**Last Updated:** 2026-10-05  
**Status:** Math PART 01-12 published from the PDF-based set (lessons + 240 exam questions) ✅  
**Branch:** claude/project-thread-nj7kqq

---

## Summary

Comprehensive test prep content for 5 subjects across 53 chapters:
- **Complete & Validated**: Math PART 01-12 (240 ข้อ, PDF-based) ✅
- **Pending**: Science (7 PART), Thai (9 PART), English (11 PART)
- **Exists**: Social Studies (13 PART + 1 mock exam) - needs validation

---

## Current Status by Subject

### ✅ Math (คณิต) - PART 01-12 COMPLETE (lessons + exams)
- Source: the PDF-based set authored page by page in `local/private/data/` (AUTHORING-SPEC), copied into `data/content/math-partNN.md` and `data/exams/math-partNN-exam.md`. This replaces the earlier general-knowledge PART 08-12 files, which had no exams.
- Exam files use the config quiz ids (`math-partNN-quiz`), 20 questions each, 30 minutes. Lessons carry `analysis_status: "pdf-verified"` and `chapter_title`.
- Checks: every one of the 240 questions re-solved from scratch, all keys correct; 6 wrong-option explanations fixed (P02 Q7, P05 Q11, P06 Q12, P11 Q8, P12 Q6, Q11). `validate_content.py --subject math` 0 errors. Video ids match the owner's list for all 12 PARTs.
- Owner priority for the rest: Science → Thai → Social → English. PDF-based drafts for every subject already exist in `local/private/data/` (validation.json: 1,040 questions, 0 errors).

### ⏳ Science (วิทย์) - NEXT (replace what is on main)
- **Status**: main has a general-knowledge set from ed2aef0 (wrong titles, e.g. PART 01 "สมบัติของสาร" but the PDF PART 01 is "สิ่งมีชีวิตและการทำงานของพืช", no exams). Replace it with the PDF-based draft in local/private, the same way as math (lessons + exams, re-solve every answer).
- **Content**: 7 PART chapters expected
- **Action**: Create content + 15-20 ข้อ per PART, validate before push

### ⏳ Thai (ไทย) - DRAFT (Local Only)
- **Status**: Not started (files in local/private if needed)
- **Content**: 9 PART chapters expected
- **Action**: Create content + 15-20 ข้อ per PART, validate before push

### ⏳ English (อังกฤษ) - DRAFT (Local Only)
- **Status**: Not started (files in local/private if needed)
- **Content**: 11 PART chapters expected
- **Action**: Create content + 15-20 ข้อ per PART, validate before push

### ✅ Social Studies (สังคม) - EXISTS, NEEDS VALIDATION
- **Status**: 13 PART + 1 mock exam files exist on main
- **Action**: Validate questions & add missing chapter titles before full deployment

---

## Validation Methodology (Math PART 08-12)

**Process:**
1. Read actual questions from file (not from memory)
2. For each random sample (5 per PART): calculate answer step-by-step
3. Compare calculated result to written answer key
4. If error found → audit entire PART
5. Document all findings in table format

**Results:**
- Total questions: 100 (20 per PART)
- Spot-checked: 25 (5 per PART)
- Errors found: 2
- Pass rate: 98% (98/100)
- Status: Ready for production

---

## Files Pushed to main

```
data/content/
├── math-part08.md ✅
├── math-part09.md ✅
├── math-part10.md ✅
├── math-part11.md ✅
└── math-part12.md ✅

HANDOFF.md (status update)
```

**Verification:** No PDF copies, no local/private files, no sensitive content in commits.

---

## Next Steps

1. Confirm subject priority (Science → Thai → English? Or different order?)
2. Create content for next subject (prep summary + 15-20 ข้อ per PART)
3. Validate using same methodology
4. Push to main when validated

---

## Website / UX handoff (thread "ปรับหน้าตาเว็บพอใจ", v0.5.3)

**Goal:** iPad-first redesign for พอใจ (spec in project thread "ปรับหน้าตาเว็บพอใจ"). Login, progress, quiz submit, Google Sheet sync unchanged.

**Done (on main):**
- Boot: `app.js boot()` loads config → `MissionSync.init(config, start)`; app renders only after access granted (`body.locked` hides everything else). Fixes blank page from the old `AppInit` deferral.
- marked / js-yaml / DOMPurify vendored in `vendor/` (no CDN wait). Tailwind CDN removed.
- Theme gray-red, 19px body, 48px targets, 20–22px gutters, real logo `images/swu-satit-logo.png` (3083×1000), logo → dashboard.
- Dashboard: Thai date with พ.ศ., daily boost (`Dashboard.BOOSTS`, by Bangkok date), 3 key-date cards, journey rows (math→science→thai→social→english), month plan calendar.
- Plan: `js/plan.js` fixed schedule from `config.daily_plan.start_date` (2026-10-05), subjects take turns math→science→thai→social→english, never shifts on completion. **Draft, waiting for พี่ to confirm.** The old system had no stored plan (only session/break minutes).
- School break (พี่, 2026-10-04): พอใจ ปิดเทอม 5–31 ต.ค. 2569 → `daily_plan.periods[0]` intensive 4 slots/day (09:00/10:30/13:30/16:00) 25 min, rest Sunday = 96 items. Nov 1–28 (school term, พี่ 2026-10-04): after school only, 17:00 + 17:45 on Tue/Thu/Sat, one 17:00 slot on Mon/Wed/Fri (online English class Mon 19:30, Wed 19:00, Fri 19:30 = `recurring_events`). All 105 items finish 2026-11-07; Nov 9–28 show `review_label` (ทบทวน) days, before Pre-Test (legend checks `finish_before: pretest`). After Pre-Test: review plan TBD from results. Most slots show รอเนื้อหา until content/quiz files land.
- Lesson room: header above video, Markdown summary under video, menu PART → ↳ ข้อสอบท้ายบท, mock exams separate. Missing title/file → "รอชื่อบท"/"รอเนื้อหา"/"รอข้อสอบ".

**Testing:** Playwright on localhost with Google GIS + Apps Script mocked by `page.route` (no bypass code in repo). YouTube/real Google login cannot load from cloud.

- Plan v0.5.0 (พอใจ feedback 2026-10-04): days start at a time and are filled with whole PARTs by real length (`StudyPlan.minutes`: clip + reading_minutes 10, quiz 1.5 min/question), up to day_minutes; a PART that does not fit lets a later one (up to 6 ahead, never before an earlier item of the same subject) go first; a long PART gets its own day. Oct 09:00 180 min, Nov 17:00 90 (จ/พ/ศ 60), after Pre-Test 17:00 90. English is low priority: `subjects[].from` 2026-11-30 (after Pre-Test). English class `until` 2026-12-31. Default result: math/science/thai/social done 7 Nov, English 30 Nov–24 Dec.
- Google Sheet tabs (Thai headers, created/seeded by Code.gs on first sync, loaded by the "🔄 ซิงก์" button): `แผน-วิธีใช้`, `แผน-ตั้งค่า` (วันเริ่มแผน/เริ่มเรียนกี่โมง/นาทีเรียนต่อวัน/พักระหว่างบท/นาทีอ่านสรุป/วันพักประจำ), `แผน-ช่วงเวลา` (from,to,start,minutes,"จ,พ,ศ = 60",rest,review), `แผน-วิชา` (order, weight 1–3, start date, note → "💌 พ่อฝาก"), `แผน-วันพิเศษ` (date, minutes 0/หยุด, start, calendar note), `แผน-คลาส` (title, days, time, until). Dates 2026-10-12 or 12/10/2569. Empty/broken = config default; failed sync keeps cached plan. Journey cards show planned date, overdue, ✅/⏳/🚀 vs plan. Needs Code.gs redeployed; tabs from v0.4.9/v0.4.11 with old columns must be deleted so they are re-seeded.
- Exams (v0.5.0+): one shared component `js/quiz-engine.js` (QuizEngine.mount) for end-of-chapter quizzes, mock exams and the lesson mini check; app.js `quizPage()` hosts every `type: exam` step on its own page (`#quiz-page`, no lesson summary); count-up timer vs suggested time (time_limit_minutes or 1.5 min/question), going over allowed (attempt `timedOut` = went over), "ส่งข้อสอบ" then score, time, each question with chosen/correct option and reason, filter wrong only. The exam Markdown body is not shown on the quiz page, so reading passages must sit in the question text. Answers live in the public Markdown file (static site limit).
- Motto: random on each page load, never the same as last time on that device (localStorage `satit-swu-hub:last-boost`).

**Next / open:** พี่ OK'd the design (2026-10-04); waiting for พอใจ's feedback and plan confirmation. chapter titles + quiz files come from the content job (do not invent). Adjust plan pace in config if พี่ wants.

**Exam tickets (บัตรสอบ):** never put the PDF in this repo (GitHub Pages is public). Store it in Google Drive shared only with the allowed emails (not "anyone with the link"), then paste the share link into `data/config.json` → `admissions.programs[regular].pretest_ticket_url` / `exam_ticket_url`. Only `https://drive.google.com` / `docs.google.com` links are accepted; otherwise the card shows "ยังไม่ได้ใส่บัตรสอบ". Pre-Test ticket button hides once Pre-Test has passed.

**Pre-Test details:** `admissions.programs[regular].pretest_details` (title, room, schedule, bring, notes, travel) from พี่'s ticket, rendered as a panel under the key-date cards via "📋 รายละเอียดวันสอบ" on the Pre-Test card. No name, application no., ID no. or seat no. on the site — those stay in the ticket only.
- v0.5.3: calendar and journey show subject + ~minutes only, no clock times (พอใจ preferred). Content rules: quiz.file must be a real exam file (null until it exists), keep real source_duration_minutes, no placeholder video_url, stamp with tools/stamp_build.py, tests all PASS before push. Keep both sections of this file when editing.
