# HANDOFF: Satit SWU Mission Hub (2026-10-04)

## Status Summary

**Primary Goal:** Redesign UX/UI for พอใจ (11 yrs, iPad Safari) + Complete content/quiz summary

---

## 1. Web System Status

### ✅ Login Gating Security (COMPLETE)
- **Fixed:** Deferred app initialization until authentication succeeds
- **How:** 
  - `app.js` line 141: `if(gating?.hidden) window.AppInit=init` (defer on page load)
  - `sync.js` validateLogin(): Calls `window.AppInit()` only after auth succeeds
  - `sync.js` render(): `document.body.style.overflow = isAuthenticated ? '' : 'hidden'`
  - `style.css`: `.page.login-gating { position:fixed; top:0; z-index:9999 }`
- **Commits:** 843b99e, 6dcb398 (merged to main)
- **Security guarantee:** NO app code loads before authentication

### ✅ Config & Apps Script
- **config.json:** Loads successfully (5 subjects, 940/1040 exam questions done)
- **Apps Script:** Configured for token validation & sheet sync
- **ALLOWED_EMAILS:** Must update when needed (docs/GOOGLE-SHEET-SYNC.md)

### ⚠️ Known Issue: Lesson Page Content Not Loading
- **Problem:** route() function defers but content not rendering
  - Video-stage element: NOT created
  - Prose (Markdown) content: NOT rendered
  - lesson-content div stays at "กำลังเปิดภารกิจ…" (16 chars)
- **Root cause:** Investigated — likely async race condition in route() when loading markdown
- **Files involved:** js/app.js (route function), data/content/*.md
- **Impact:** Lesson page shows sidebar but no video/content below
- **Next step:** Debug route() execution flow or check if Catalog.items() returning data

---

## 2. Content & Quiz Status

### Questions Completed: 940/1040 (90.4%)

| Subject | PART | Status | Notes |
|---------|------|--------|-------|
| **Math** | 01-07 | ✓ Done | ~130 questions |
| **Math** | 08-12 | ⏳ PENDING | ~70 questions needed |
| **Science** | All | ✓ ~90% done | Minor review needed |
| **Thai** | All | ✓ ~90% done | Minor review needed |
| **Social** | All | ✓ ~95% done | Nearly complete |
| **English** | All | ✓ ~90% done | Minor review needed |

### Details
- **Per-PART structure:** Each PART should have 10-30 questions (varies by content length)
- **Location:** `/data/content/SUBJECT-PARTXX.md` (frontmatter + markdown)
- **Schema validator:** Checks YAML meta, quick_quiz, questions count
- **Current focus:** Math PART 08-12 (largest gap)

---

## 3. Pending Tasks

### ✗ BLOCKED: Lesson Page Design
**Issue:** Video-stage and prose content not rendering despite correct markdown files existing
**Debug findings:**
- config.json loads ✓
- social-part01.md exists with video_url + markdown body ✓
- route() function exists but doesn't populate lesson-content ✓
- Likely cause: async timing or Catalog.items() not returning step data

### ✗ UX/UI Redesign (PRIMARY — START HERE)
**Spec:** 7-item redesign for iPad Safari (11-year-old user)
1. **Theme + Typography + Logo + Layout**
   - Gray-red mSWU theme (#BD2637)
   - Body 18-20px, buttons 48px min-height
   - New logo: `images/SWU_Prasanmit_Demonstration_Sec_TH_Color.png` (from user's machine)
   - Logo clickable → dashboard
   - Lesson page: 20-24px gutters, expand width

2. **Lesson Page (video-first)**
   - `.video-stage` as primary section
   - Markdown prose below video
   - Menu restructured: PART group → sub-item (quiz)

3. **Dashboard**
   - Date display: Thai weekday + date + month + year
   - Daily inspiration message (changes per day)
   - 3 exam cards in one row (Pre-Test, Real Exam, Other Events)
   - Learning Journey: 5 subjects (Math→Science→Thai→Social→English)

4. **Monthly Calendar**
   - Replace "ONE SMALL STEP TODAY" with calendar view
   - Drag to prev/next month
   - Click day → lesson/quiz

**Delivery format:** Commit ก) ธีม+logo+layout → push → ข) หน้าเรียน → ค) dashboard → ง) ปฏิทิน
**Testing:** Playwright iPad 768x1024 (portrait) + 1024x768 (landscape), screenshot each phase

### ✗ Daily Content Summary (STARTS AT 01:00 BANGKOK)
**Job 88ce5cde:** Currently PAUSED (to resume after 2hr token reset)
**Role:** Spot-check 5 exam questions + schema validator vs PDF per PART
**Subjects order:** Math, Science, Thai, Social, English
**Files:** `.claude/trigger/88ce5cde` (cron job definition)

---

## 4. How to Resume

### To Start UX/UI Redesign (New Thread)
1. Clone this repo (if fresh session)
2. Run local server: `python3 -m http.server 8000`
3. Follow spec above, commit ทีละชุด (phase ก → ข → ค → ง)
4. Test: `node scratchpad/test-final.mjs` (Playwright)
5. Update HANDOFF.md after each phase

### To Resume Daily Content Summary (Restart Job 88ce5cde at 01:00)
1. Job ID: `88ce5cde` (stored in `.claude/trigger/`)
2. Currently paused (do not delete)
3. To unpause: Check `mcp__claude-code-remote__get_trigger` for current state
4. Re-run: Schedule for next 01:00 Asia/Bangkok via cron
5. Script: Validates PART count vs PDF, posts summary

---

## 5. Phase ก Status (Updated 2026-10-04 current session)

### ✅ Phase ก Complete: Typography + Logo + Layout
- body: 16px → **18px** ✓
- h2: 23px → **26px**, h3: 20px → **22px** ✓
- Logo: replaced text "SW" with SVG image ✓
- Logo clickable → dashboard ✓
- Tested on iPad (768×1024) and desktop (1920×1080) ✓
- **Commit:** d3b1861 Phase ก typography + logo + layout

### ⚠️ Phase ข Investigation: Lesson Page Content Loading
**Current issue:** route() executes but markdown content not rendering
- route() correctly loads markdown file via fetch ✓
- render() correctly calls renderMarkdown() ✓
- BUT: main.replaceChildren() still shows "กำลังเปิดภารกิจ…" after 5+ seconds ✗

**Root cause identified:**
- window.config was trapped in IIFE closure (FIXED in commit d3b1861)
- CDN libraries (marked, jsyaml, DOMPurify) were async (changed to defer)
- Suspect: ensureMarkdown() times out or libraries still not available

**Needed fixes:**
1. Debug ensureMarkdown() timing in route() line 79-80
2. Verify marked.parse(), jsyaml.load(), DOMPurify available
3. May need inline load or pre-load at app startup instead of defer
4. Check browser console for parse errors in renderMarkdown()

**Test files created:** scratchpad/test-*.mjs (7 files for debugging)

## 5. Important Notes

- **Nightly routine paused:** Until UX/UI redesign (phase ก-ข) completes
- **Logo image:** User has at D:\DEV_WORKSPACE\satit-mission-hub\images\ — use Remote Control to copy
- **Keep existing:** Login flow, progress tracking, quiz engine, Google Sheet sync
- **Do NOT create:** Fake dates, fake chapter titles, fake content — show "กำลังเตรียม" if missing
- **Exam questions:** Rows per PART must support 10-30 (not fixed 20)

---

## 6. Last Known URLs & Files

- **Repo:** `arilekt/satit-swu-hub` (GitHub Pages: https://arilekt.github.io/satit-swu-hub/)
- **Config:** `data/config.json` (subjects, PART structure)
- **Lessons:** `data/content/SUBJECT-PARTXX.md` (YAML frontmatter + body)
- **CSS:** `css/style.css` (edit for theme/layout)
- **App:** `js/app.js` (route, render)
- **Screenshots:** `scratchpad/design-test/*.png` (test output)

---

**Status as of 2026-10-04 06:08:**
- Login: ✅ Secure
- Config: ✅ Loads
- Content: ⏳ Route() not rendering (investigate next)
- UI Redesign: ❌ Not started (START HERE in new thread)
- Quiz Summary: ⏸️ Job 88ce5cde paused (resume at 01:00)
