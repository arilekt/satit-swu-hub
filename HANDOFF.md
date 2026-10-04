# HANDOFF · UX/UI v0.4 (2026-10-04)

**Goal:** iPad-first redesign for พอใจ (spec in project thread "ปรับหน้าตาเว็บพอใจ"). Login, progress, quiz submit, Google Sheet sync unchanged.

**Done (on main):**
- Boot: `app.js boot()` loads config → `MissionSync.init(config, start)`; app renders only after access granted (`body.locked` hides everything else). Fixes blank page from the old `AppInit` deferral.
- marked / js-yaml / DOMPurify vendored in `vendor/` (no CDN wait). Tailwind CDN removed.
- Theme gray-red, 19px body, 48px targets, 20–22px gutters, real logo `images/swu-satit-logo.png` (3083×1000), logo → dashboard.
- Dashboard: Thai date with พ.ศ., daily boost (`Dashboard.BOOSTS`, by Bangkok date), 3 key-date cards, journey rows (math→science→thai→social→english), month plan calendar.
- Plan: `js/plan.js` fixed schedule from `config.daily_plan.start_date` (2026-10-05), `rest_weekdays` [0], `items_per_day` 1, subjects take turns, never shifts on completion.
- Lesson room: header above video, Markdown summary under video, menu PART → ↳ ข้อสอบท้ายบท, mock exams separate. Missing title/file → "รอชื่อบท"/"รอเนื้อหา"/"รอข้อสอบ".

**Testing:** Playwright on localhost with Google GIS + Apps Script mocked by `page.route` (no bypass code in repo). YouTube/real Google login cannot load from cloud.

**Next / open:** chapter titles + quiz files come from the content job (do not invent). Adjust plan pace in config if พี่ wants.
