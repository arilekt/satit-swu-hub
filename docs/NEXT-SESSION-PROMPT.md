# Prompt for the next content session (Thai → Social → English)

Copy everything below the line into a new session (a smaller model is fine).

---

ทำเนื้อหาวิชาถัดไปของเว็บ satit-swu-hub (repo `arilekt/satit-swu-hub`, เครื่องนี้อยู่ที่ `D:\DEV_WORKSPACE\satit-mission-hub`) ให้เหมือนที่ทำ Math และ Science ไปแล้ว

**ลำดับวิชา:** Math ✅ → Science ✅ (v0.9.0) → Thai ✅ (v0.10.0) → **Social (ทำตอนนี้, 13 PART, มีบน main แล้ว ต้องตรวจ)** → English (11 PART)

**อ่านก่อนเริ่ม:** `HANDOFF.md` (สถานะทุกวิชา + กฎเว็บ) และ commit `0a38d54` (ตัวอย่างงาน Science ที่ทำเสร็จ)

**ขั้นตอนต่อ 1 วิชา (เช่น thai):**
1. เริ่มจาก main ล่าสุด: `git fetch origin main` แล้วทำงานบน branch ใหม่จาก `origin/main`
2. ฉบับร่างจาก PDF อยู่ใน `local/private/data/content/thai-partNN.md` และ `local/private/data/exams/thai-partNN-exam.md` (ห้าม commit โฟลเดอร์ `local/` และห้ามเอา PDF เข้า repo เพราะ GitHub Pages เปิดสาธารณะ)
3. อ่านทุกข้อสอบเอง แล้วหาคำตอบใหม่ทีละข้อ เฉลย (`answer` เป็น index 0–3) ต้องถูก 100% และคำอธิบายตัวลวงต้องตรงกับตัวเลือก ถ้าเจอข้อผิดให้แก้แล้วจดไว้
4. คัดลอกไปที่ `data/content/thai-partNN.md` โดยเพิ่ม 2 บรรทัดใน frontmatter ต่อจาก `video_url`:
   `chapter_title: "<ชื่อบทหลัง 'PART NN · '>"` และ `analysis_status: "pdf-verified"`
5. คัดลอกข้อสอบไปที่ `data/exams/thai-partNN-exam.md` และเปลี่ยน `id: thai-partNN-exam` เป็น `id: thai-partNN-quiz`
6. แก้ `data/config.json` ที่ step ของ PART นั้น: `chapter_title` = ชื่อบท, `quiz.file` = `./data/exams/thai-partNN-exam.md`, `quiz.study_minutes` = 30 (ห้ามแก้ `video_url` และ `source_duration_minutes`)
7. ตรวจ: `python local/tools/validate_content.py --subject thai` ต้อง errors 0 และตรวจว่าทุกข้อมี 4 ตัวเลือก
8. `python tools/stamp_build.py --version 0.10.0` (เลขถัดไป)
9. แก้ส่วนของวิชานั้นใน `HANDOFF.md` (ห้ามลบส่วน Website / UX)
10. รัน test: บนเครื่อง Windows นี้ git แปลงบรรทัดเป็น CRLF ทำให้ test ข้อวิดีโอสังคมล้มเฉพาะบนเครื่อง ให้ commit ก่อน แล้วรันบนสำเนา LF:
    `git -c core.autocrlf=false archive HEAD | tar -x -C <scratch-dir>` แล้ว `node tests/core.cjs` ใน scratch-dir ต้อง PASS ครบ 11 บรรทัด
11. commit (conventional commit) แล้ว push ไป `main` (พี่อนุญาตให้ push main ได้สำหรับงานเนื้อหา) และ push branch ของ session ด้วย

**กฎ:** สรุปเนื้อหาต้องเขียนใหม่ ไม่คัดลอก PDF ทั้งย่อหน้า · ห้ามแต่งชื่อบทหรือ video id เอง · ไม่มีชื่อ/เลขประจำตัว/เลขที่นั่งสอบของน้องบนเว็บ · ถ้า PDF ไม่ครบหรือโครงสร้างไม่ตรง ให้หยุดแล้วบอกพี่

เสร็จแล้วรายงานสั้น ๆ: จำนวนข้อที่ตรวจ ข้อที่แก้ เวอร์ชัน และ commit
