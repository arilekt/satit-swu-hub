# Satit SWU Mission Hub

เว็บเตรียมสอบ ม.1 ของพอใจ อายุ 11 ปี เน้น Safari บน iPad ธีมเทา–แดงที่ได้แรงบันดาลใจจาก มศว ไม่ใช่เว็บทางการของโรงเรียน

## หน้าและการใช้งาน

- `#dashboard` (หน้าแรก): วันปัจจุบันของกรุงเทพฯ, Pre-Test เด่นที่สุด, สอบจริงนับถอยหลังคู่กัน, progress 5 วิชา, ภารกิจวันนี้ และวันกิจกรรมอื่น
- `#learn` หรือ `#social/social-part01`: ห้องเรียนเต็มความกว้างจอ วิดีโออยู่บนสุด สรุปจากการวิเคราะห์อยู่ใต้คลิป เมนูแบ่งตาม PART และมีแบบทดสอบท้ายบท (`#social/social-part01-quiz`) ใต้ทุก PART
- `#parent`: เพิ่ม/แก้/ลบกิจกรรม ตั้งวันสอบ/ประกาศผล ส่งออกไฟล์กิจกรรม/config สำรองและกู้คืนผลเรียน ดูประวัติข้อสอบ และคู่มือ local AI

หลังวัน Pre-Test ส่วนหลักเปลี่ยนเป็นเตือนตรวจผล หากยังไม่กำหนดวันประกาศผล จะแสดงรอยืนยันวันที่ ไม่มีการเดาวันที่ การเตือนอยู่ในหน้าเว็บขณะเปิด ไม่ส่ง push notification เมื่อปิดเว็บ

เข้าสู่ระบบด้วย Google แล้วผลเรียนซิงก์ลง Google Sheet ผ่าน Apps Script (ตั้งค่าตาม [docs/GOOGLE-SHEET-SYNC.md](docs/GOOGLE-SHEET-SYNC.md)) ถ้ายังไม่ตั้งค่าหรือไม่ได้เข้าสู่ระบบ เว็บทำงานแบบเก็บบนเครื่องเหมือนเดิม ห้ามใส่ API key หรือ GitHub token ลงหน้าเว็บ

## โครงสร้างข้อมูล

- `data/config.json`: รายวิชา 53 บท: สังคม 14 (เนื้อหา 13 + ข้อสอบ 1), อังกฤษ 11, วิทย์ 7, ไทย 9, คณิต 12 ทุก PART มี `quiz` (แบบทดสอบท้ายบท 20 ข้อ, file เป็น null จนกว่าจะสร้างจาก PDF) และ `chapter_title`/`chapter_status` รวมเป็น 105 ภารกิจ, กำหนดสอบ และ daily_plan
- `data/content/*.md`: YAML frontmatter + Markdown; บทสังคม PART 01–13; สรุป PART 01–02 เป็นตัวอย่าง ไม่ได้สรุปจาก PDF ต้นฉบับ
- `data/exams/*.md`: ข้อสอบพร้อม answer index เริ่มที่ 0 และเฉลย
- `data/activities.json`: กิจกรรม เช่น SATIT ACADEMIC FAIR 12–13 ธันวาคม 2569
- `data/build.json`: เวอร์ชัน build และเวลาอัปเดต
- `js/dashboard.js`: เลือกบทที่มีไฟล์และยังไม่จบ โดยพิจารณาสัดส่วน progress; วิชาเท่ากันหมุนตามวัน หากเรียนบทพร้อมทั้งหมดแล้วแนะนำทบทวน
- `js/parent.js`: ตรวจ schema กิจกรรมและเก็บรายการที่แก้บนเครื่อง
- `js/app.js`: hash router, หน้าบทเรียน, UI handlers
- `js/tracker.js`: progress, ประวัติข้อสอบ 100 ครั้งล่าสุด, JSON backup/restore

`js/catalog.js` เรียงภารกิจเป็น PART → แบบทดสอบท้ายบท → PART ถัดไป ใช้ทั้งเมนู, progress และภารกิจแนะนำ

ภารกิจวันนี้ใช้เวลาโดยประมาณจาก study_minutes ใน config และจำกัดตาม daily_plan.session_minutes (ค่าเริ่มต้น 20 นาที) ไม่ใช่การประเมินจาก AI หรือหลักฐานว่าเด็กอ่อนวิชานั้น ไม่แนะนำบทที่ file เป็น null เนื้อหาและข้อสอบอยู่ใน subjects[].steps และนับ progress ด้วยกัน ส่งข้อสอบจบหนึ่งรอบถือว่าจบหนึ่งบท ไม่กำหนดคะแนนผ่านและการทำซ้ำไม่นับเพิ่ม

## วิธีเก็บข้อมูลบน GitHub Pages

GitHub Pages ให้บริการ static HTML/CSS/JS ไม่มี backend database ในตัว เลือกใช้ JSON/Markdown เป็นข้อมูลกลางและ LocalStorage เป็นข้อมูลบนเครื่อง ดู [การออกแบบข้อมูล](docs/DATA-ARCHITECTURE.md)

- Progress ใช้ key `satit-swu-hub:v1` เดิม รักษาความคืบหน้าก่อนปรับ Dashboard
- กิจกรรมที่แก้ผ่านเมนูคุณพ่อใช้ key `satit-swu-hub:activities:v1` บนเครื่องนั้น
- แก้กิจกรรมบนคอมพิวเตอร์จะยังไม่เปลี่ยน iPad โดยอัตโนมัติ ให้ส่งออก activities.json แล้วแทนไฟล์ data/activities.json และ commit/push
- หากเคยแก้กิจกรรมบน iPad ให้กดกลับไปใช้กิจกรรมจากเว็บหลังเผยแพร่ไฟล์กลาง
- ตั้งวันสอบ/วันผลบนเครื่องแล้วส่งออก config.json ได้เพื่อนำไปแทนไฟล์กลาง
- ผลเรียนไม่ถูกส่งขึ้น repository สำรอง JSON แล้วกู้คืนบนอีกเครื่องจากเมนูคุณพ่อได้ การกู้คืนแทนข้อมูลเดิม ต้องสำรองก่อน
- LocalStorage อาจหายเมื่อล้างข้อมูล Safari หรือปิดโหมดส่วนตัว จึงควรสำรองเป็นระยะ

## เอกสารและ AI บนเครื่อง

วางเอกสารใน local/inbox/social, english, science, thai หรือ math แล้วใช้ [tools/README.md](tools/README.md) รับ PDF/ภาพ สร้าง AI draft ตรวจและนำเข้า Markdown หรือวิเคราะห์ผลข้อสอบ

local/, .venv/, PDF และ .env ถูก ignore ไม่เก็บ PDF ตัวเต็มหรือประวัติส่วนตัวใน Git

video_url รองรับ YouTube watch/share/embed, HTTPS MP4 และลิงก์ HTTPS อื่น ถ้า Embed แสดงไม่ได้ มีลิงก์เปิด YouTube ประกอบ เนื้อหา Markdown กรองด้วย DOMPurify คำถาม/กิจกรรมใช้ textContent

## เปิดทดสอบ

```powershell
python -m http.server 8080
```

เปิด http://localhost:8080 หรือ IP ของคอมพิวเตอร์บน Wi-Fi เดียวกันผ่าน iPad ใช้ HTTP แทน file:// เพราะต้อง fetch ไฟล์ หน้า Dashboard ใช้ CSS หลักของโปรเจกต์ ส่วน CDN ที่โหลดไม่สำเร็จไม่บล็อก Dashboard; หน้าบทเรียนต้องโหลด marked, js-yaml และ DOMPurify ได้

```powershell
node tests/core.cjs
```

ตรวจครบทั้งข้อมูลเดิมและ modules ใหม่ รายละเอียดตรวจจริง/ข้อจำกัดอยู่ใน [VALIDATION.md](VALIDATION.md)

## Build และการเผยแพร่

ท้ายหน้าแสดง version, build id และเวลาไทยจาก HTML ที่โหลดจริง ไม่ใช้เวลาที่เปิดหน้าเว็บ หาก manifest บอกว่ามี build ใหม่ จะแสดงลิงก์เปิดเวอร์ชันล่าสุด

ทุกครั้งหลังแก้โค้ดและทดสอบ ให้ stamp ก่อน commit:

```powershell
python tools/stamp_build.py --version 0.2.0
git add index.html css js data tools tests docs README.md VALIDATION.md
git commit -m "Redesign Porjai dashboard and add parent tools"
git push origin main
```

สคริปต์ stamp ไม่ต้องมี dependencies เพิ่ม เปลี่ยนเวอร์ชันเมื่อออก release ใหม่และสร้าง build id ตามเวลาไทย พร้อม cache version ของ CSS/JS

ถ้าเริ่ม repository ใหม่ ใช้ git init, git branch -M main และ git remote add origin https://github.com/arilekt/satit-swu-hub.git ก่อนคำสั่งด้านบน หาก remote มีประวัติ ให้ใช้ checkout ที่ clone มาและอย่า force push

GitHub Settings → Pages → Deploy from a branch → main → /(root) เมื่อ deploy สำเร็จเปิด https://arilekt.github.io/satit-swu-hub/ เทียบ build ท้ายหน้ากับ data/build.json ของ release นั้น

## วิดีโอสังคม PART 01–13

ใส่ครบตามรหัส YouTube ที่คุณพ่อส่ง ทุก PART มีไฟล์ Markdown และกดเรียนจบได้ PART 03–13 มีวิดีโอและแนวทางจดโน้ต ส่วนสรุป/mini-quiz ยังเตรียมอยู่ PART 01–02 เป็นสรุปตัวอย่างเดิม ยังไม่ได้ตรวจเทียบกับวิดีโอ

สร้าง iframe ของเว็บเราเอง ใช้ controls=1, playsinline=1, autoplay=0 พร้อมลิงก์เปิด YouTube ไม่คัดลอก origin/widget_referrer ของเว็บคอร์สภายนอก [YouTube player parameters](https://developers.google.com/youtube/player_parameters) การแมป URL ผ่านการทดสอบ ยังไม่ยืนยันการเล่นหรือสิทธิ์ Embed ทั้ง 13 คลิป
