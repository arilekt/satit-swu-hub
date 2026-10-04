# HANDOFF · UX/UI v0.4 (2026-10-04)

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
- Exams (v0.5.0): every `type: exam` step opens its own page (`#quiz-page`, no lesson summary); count-up timer vs suggested time (time_limit_minutes or 1.5 min/question), going over allowed (attempt `timedOut` = went over), "ส่งข้อสอบ" then score, time, each question with chosen/correct option and reason, filter wrong only. The exam Markdown body is not shown on the quiz page, so reading passages must sit in the question text. Answers live in the public Markdown file (static site limit).
- Motto: random on each page load, never the same as last time on that device (localStorage `satit-swu-hub:last-boost`).

**Next / open:** พี่ OK'd the design (2026-10-04); waiting for พอใจ's feedback and plan confirmation. chapter titles + quiz files come from the content job (do not invent). Adjust plan pace in config if พี่ wants.

**Exam tickets (บัตรสอบ):** never put the PDF in this repo (GitHub Pages is public). Store it in Google Drive shared only with the allowed emails (not "anyone with the link"), then paste the share link into `data/config.json` → `admissions.programs[regular].pretest_ticket_url` / `exam_ticket_url`. Only `https://drive.google.com` / `docs.google.com` links are accepted; otherwise the card shows "ยังไม่ได้ใส่บัตรสอบ". Pre-Test ticket button hides once Pre-Test has passed.

**Pre-Test details:** `admissions.programs[regular].pretest_details` (title, room, schedule, bring, notes, travel) from พี่'s ticket, rendered as a panel under the key-date cards via "📋 รายละเอียดวันสอบ" on the Pre-Test card. No name, application no., ID no. or seat no. on the site — those stay in the ticket only.
