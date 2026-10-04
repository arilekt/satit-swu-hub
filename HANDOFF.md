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

- Dynamic plan (v0.4.9, พี่ 2026-10-04): Google Sheet tabs `plan_settings` (key/value), `plan_periods` (name, from, to, slots "09:00 เช้า, 10:30 สาย", weekday_slots "จ,พ,ศ = 17:00 หลังเลิกเรียน", session_minutes, rest_days "อา", review_label) and `plan_classes` (title, days "จ,ศ", time) override `config.daily_plan` after login (sync response `plan`, cached in localStorage `satit-swu-hub:plan`). Tabs are created and seeded with the config plan by Code.gs on first sync. Empty/broken tabs or offline = config default. Needs Code.gs redeployed (new version, same URL). The "🔄 ซิงก์" button on the plan calendar (v0.4.10) calls MissionSync.sync() and re-renders; a sync with no plan resets to the config default and clears the cache.

**Next / open:** พี่ OK'd the design (2026-10-04); waiting for พอใจ's feedback and plan confirmation. chapter titles + quiz files come from the content job (do not invent). Adjust plan pace in config if พี่ wants.

**Exam tickets (บัตรสอบ):** never put the PDF in this repo (GitHub Pages is public). Store it in Google Drive shared only with the allowed emails (not "anyone with the link"), then paste the share link into `data/config.json` → `admissions.programs[regular].pretest_ticket_url` / `exam_ticket_url`. Only `https://drive.google.com` / `docs.google.com` links are accepted; otherwise the card shows "ยังไม่ได้ใส่บัตรสอบ". Pre-Test ticket button hides once Pre-Test has passed.

**Pre-Test details:** `admissions.programs[regular].pretest_details` (title, room, schedule, bring, notes, travel) from พี่'s ticket, rendered as a panel under the key-date cards via "📋 รายละเอียดวันสอบ" on the Pre-Test card. No name, application no., ID no. or seat no. on the site — those stay in the ticket only.
