# Satit SWU Mission Hub

แดชบอร์ดเตรียมสอบเข้า ม.1 สำหรับพอใจ ใช้ Safari บน iPad เป็นหลัก Static SPA ไม่ต้อง build หรือมี backend เนื้อหาในชุดเริ่มต้นเป็นตัวอย่าง ไม่ใช่ข้อสอบหรือหลักสูตรทางการของโรงเรียน

## โครงสร้าง

- `index.html` — Dashboard และพื้นที่แสดงบทเรียน
- `css/style.css` — Prompt, responsive layout, ปุ่มสัมผัสขนาดอย่างน้อย 48px
- `js/app.js` — hash router, fetch Markdown, YAML metadata, วิดีโอ, สรุปส่งคุณพ่อ
- `js/tracker.js` — LocalStorage progress และประวัติข้อสอบล่าสุด 100 ครั้ง
- `js/quiz-engine.js` — สุ่มลำดับคำถาม จับเวลาตาม deadline ตรวจคะแนนและเฉลย
- `data/config.json` — 62 steps: สังคม 15 อังกฤษ 13 วิทย์ 9 ไทย 11 คณิต 14
- `data/content/` — ตัวอย่างบทสังคม 4 บท
- `data/exams/social-mock01.md` — ข้อสอบตัวอย่าง 5 ข้อ

ไฟล์อยู่ที่ root ของ repository ได้เลย ไม่ต้องสร้างโฟลเดอร์ satit-swu-hub ซ้อนอีกชั้น PDF ที่มีใน workspace ไม่ถูกอ่านหรือสรุปเป็นบทเรียนนี้ และถูกกันไม่ให้เพิ่มเข้า Git ด้วย .gitignore

## เปิดทดสอบ

ต้องเปิดผ่าน HTTP เพราะ fetch ใช้กับ file:// ไม่ได้ หากมี Python:

```powershell
python -m http.server 8080
```

เปิด http://localhost:8080 บนเครื่อง หรือ http://IP-ของเครื่อง:8080 บน iPad ที่อยู่ Wi-Fi เดียวกัน ใช้อินเทอร์เน็ตสำหรับ Tailwind CDN, marked, js-yaml, DOMPurify และ Google Fonts CSS หลักมีรูปแบบสำรองเมื่อ Tailwind ไม่พร้อม แต่ Markdown engine ต้องโหลด CDN สำเร็จ

## เพิ่มบทที่พี่อัปโหลด

1. ใส่ Markdown ใน data/content หรือ data/exams
2. แก้ step ที่มีอยู่ใน config: ตั้ง title และ file เช่น `./data/content/english-part01.md`
3. ใช้ id เดิมของ step ใน Frontmatter เพื่อไม่ให้ประวัติสูญหาย ตั้ง type เป็น lesson หรือ exam
4. ถ้ายังไม่มีเนื้อหาให้ file เป็น null เว็บจะแสดงว่ากำลังเตรียมและไม่ให้ติ๊กจบ

ตัวอย่างบทเรียน:

```yaml
---
id: english-part01
title: "English PART 01"
duration: "15 นาที"
video_url: ""
time_limit_minutes: 5
quick_quiz:
  - question: "Which word is a greeting?"
    options: ["Hello", "Table", "Blue"]
    answer: 0
    explanation: "Hello ใช้ทักทาย"
---
## Key Takeaways
- สรุปบทเรียนที่ต้องการ
```

answer เป็นเลข index เริ่มที่ 0 ไม่ใช่ 1 คำถามและคำอธิบายเป็น plain text สำหรับข้อสอบให้เปลี่ยน quick_quiz เป็น questions และตั้ง type: exam ใน config ทุกคำถามต้องมี question, options อย่างน้อยสองตัวเลือก, answer ที่อยู่ในช่วง, explanation

video_url รองรับ YouTube watch/share/embed, HTTPS .mp4 และ URL HTTPS อื่นเป็นลิงก์เปิดใหม่ ยังไม่มีวิดีโอจริงในตัวอย่าง เว็บกรอง HTML ด้วย DOMPurify ก่อนแสดง ไม่อนุญาต iframe ดิบจาก Markdown

## วันสอบและข้อมูลบน iPad

exam_date ใน config เป็น null เพราะยังไม่มีวันสอบที่ยืนยัน ใส่ YYYY-MM-DD เมื่อทราบวันจริง หรือเลือกวันที่ใน Header บน iPad (ค่านี้มีผลเฉพาะเครื่อง) นับถอยหลังตามวันของ Asia/Bangkok

ข้อมูลอยู่ใน LocalStorage key satit-swu-hub:v1 ไม่ซิงก์ข้ามเครื่อง ไม่ส่งขึ้นเซิร์ฟเวอร์ การล้างข้อมูล Safari เปลี่ยนโดเมน/พอร์ต หรือใช้โหมดส่วนตัวอาจทำให้ประวัติหาย คัดลอกสรุปส่งคุณพ่อเป็นระยะ หาก Clipboard API ใช้ไม่ได้ เว็บแสดงกล่องข้อความให้เลือกคัดลอกเอง การออกระหว่างทำข้อสอบไม่บันทึกรอบที่ยังไม่ส่ง

## ตรวจด้วยมือก่อนใช้งาน

- เปิดเว็บใน Safari แนวตั้งและแนวนอน เลือกครบ 5 วิชา และเปิดบทตัวอย่างทุกบท
- ติ๊กเรียนจบแล้ว refresh: วงกลมและจำนวนรวมต้องคงเดิม ยกเลิกได้
- ตรวจบทที่ file เป็น null: ไม่มีปุ่มเรียนจบ
- ทำ mini-quiz และ mock: ตรวจเฉลย คะแนน ประวัติ และการทำซ้ำ
- ทดสอบหมดเวลาและสลับแอปกลับ: เวลาคำนวณจาก deadline ไม่หยุดเมื่ออยู่เบื้องหลัง
- เปลี่ยนบทระหว่างข้อสอบ: มีคำถามยืนยัน ยกเลิกแล้วยังทำต่อได้
- ตั้งวันสอบ ลองวันวันนี้/อดีต/อนาคต และคัดลอกสรุป
- จำลอง CDN หรือไฟล์ Markdown โหลดไม่สำเร็จ: ต้องแสดงข้อความผิดพลาด

## ส่งขึ้น main

ใช้จากโฟลเดอร์โปรเจกต์ กรณีเป็นโฟลเดอร์ใหม่และ remote ยังไม่มีประวัติ:

```powershell
git init
git branch -M main
git remote add origin https://github.com/arilekt/satit-swu-hub.git
git add index.html css js data tools tests README.md VALIDATION.md .gitignore .nojekyll
git commit -m "Build Satit SWU Mission Hub"
git push -u origin main
```

ถ้ามี origin อยู่แล้ว ใช้ `git remote -v` ตรวจ หากต้องแก้ URL ใช้ `git remote set-url origin https://github.com/arilekt/satit-swu-hub.git` แทน remote add หาก remote มีประวัติอยู่แล้ว ให้ clone และนำไฟล์ไปใส่ใน checkout นั้นก่อน commit อย่า force push

หาก Git แจ้งว่าไม่มีชื่อผู้ commit ให้ตั้ง git config user.name และ user.email ด้วยข้อมูลของพี่

## GitHub Pages

ใน repository เลือก Settings → Pages → Deploy from a branch → main → /(root) → Save เมื่อ deploy สำเร็จเปิด https://arilekt.github.io/satit-swu-hub/

เส้นทางไฟล์เป็น relative และ routing ใช้ hash จึงรองรับ project subpath ของ GitHub Pages และการ reload หน้าบทเรียน ไม่มี PDF ตัวเต็มใน Git

## AI และเครื่องมือ local

ดู [tools/README.md](tools/README.md) สำหรับรับ PDF/ภาพ สร้าง draft บทเรียน/ข้อสอบ ตรวจและนำเข้าเว็บ และวิเคราะห์ไฟล์ผลเรียน JSON จาก iPad ค่าเริ่มต้นเป็น manual AI packet; API ทำงานเฉพาะเมื่อสั่ง --use-api ไม่มี backend หรือ API key ในเว็บ

เวลา git add ให้เพิ่ม tools ด้วย: `git add tools`

## รายการจากภาพคอร์ส

แต่ละวิชาใช้ 2 steps แรกเป็นคำแนะนำและคู่มือเอกสาร แล้วตามด้วย PART: สังคม 13, อังกฤษ 11, วิทย์ 7, ไทย 9, คณิต 12 ข้อสอบอยู่ใน subjects[].exams แยกจาก steps ไม่เพิ่ม Overall % เวลาของอังกฤษ/วิทย์/ไทย/คณิตใน config ถอดจากภาพเป็น source_duration_minutes ไม่ใช่เวลาของบทสรุป Markdown ตัวอย่าง ยังไม่มีภาพรายการ PART สังคมครบจึงไม่กำหนดเวลาสังคม

วางเอกสารต้นฉบับใน local/inbox/social, local/inbox/english, local/inbox/science, local/inbox/thai, local/inbox/math โฟลเดอร์ local ถูก ignore ทั้งหมด หาก clone ใหม่ สร้างโฟลเดอร์ด้วย `New-Item -ItemType Directory -Force local/inbox/social,local/inbox/english,local/inbox/science,local/inbox/thai,local/inbox/math`

## Automated core checks

รัน `node tests/core.cjs` ตรวจ syntax, catalogue, persistence, คะแนน, deadline, การออกจากข้อสอบ และส่งออกผลรายข้อ โดยใช้ mock DOM การทดสอบนี้ไม่ยืนยัน layout หรือ Safari จริง
