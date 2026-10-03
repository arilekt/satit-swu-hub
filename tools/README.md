# Local AI authoring & measurement

เครื่องมือทำงานเมื่อคุณพ่อสั่งจากเครื่องเท่านั้น ไม่เปิด backend server บน iPad และไม่ทำงานบน GitHub Pages

## ติดตั้ง (Python 3.10+)

```powershell
python -m venv .venv
.\.venv\Scripts\python -m pip install -r tools/requirements.txt
```

## เอกสาร/ภาพ → AI → บทเรียน/ข้อสอบ

1. วางไฟล์ต้นฉบับใน local/inbox (PDF, PNG, JPG, WEBP, TXT, MD; ไม่เกิน 20 MB ต่อไฟล์)
2. สั่ง generate พร้อมระบุ step ที่มีใน config และคำขอ
3. ค่าเริ่มต้นสร้าง request.md และ manifest พร้อม SHA256 โดยไม่เรียก API คุณพ่อแนบต้นฉบับกับ request.md ไปยัง AI ที่เลือก หรืออัปโหลดในแชตนี้ให้ AI ช่วยอ่านและแก้ได้
4. บันทึกคำตอบ AI เป็น local/drafts/.../draft.md ตรวจเนื้อหา เฉลย แหล่งที่มา และส่วนที่อ่านไม่ชัด
5. validate แล้ว import ลง data พร้อมอัปเดต config สคริปต์สำรองไฟล์เดิมใน local/backups เสมอ ไม่ commit/push เอง

```powershell
.\.venv\Scripts\python tools/mission_cli.py generate local/inbox/social/lesson.pdf --step social-part01 --request "สรุปให้เด็ก 11 ขวบ พร้อมตัวอย่างและ mini-quiz 5 ข้อ"
.\.venv\Scripts\python tools/mission_cli.py generate local/inbox/social/page.jpg --step social-mock01 --kind exam --questions 10 --request "สร้างข้อสอบใหม่จากภาพ พร้อมเฉลยเหตุผล"
.\.venv\Scripts\python tools/mission_cli.py validate local/drafts/RUN/draft.md
.\.venv\Scripts\python tools/mission_cli.py import local/drafts/RUN/draft.md --step social-part01 --replace
```

RUN คือชื่อโฟลเดอร์ที่สคริปต์พิมพ์ออกมา สำหรับ exam เพิ่ม --kind exam ใน import ด้วย --replace คือคำสั่งอนุญาตแทนที่บทเดิม ใช้ id เดิมเมื่อปรับบท ไม่เพิ่มจำนวน steps โดยอัตโนมัติ ตรวจ Git diff และหน้าเว็บก่อนส่งขึ้น main

## เรียก OpenAI API (ตัวเลือก)

เฉพาะเมื่อใส่ --use-api สคริปต์จะส่งเนื้อหาเอกสาร/ภาพไป OpenAI และมีค่าใช้จ่ายตาม API ใส่ key ผ่าน environment ของ terminal เท่านั้น เลือก model ที่บัญชีใช้ได้และรองรับชนิดไฟล์ มี store=False และไม่สร้าง remote file ค้างไว้ สคริปต์ไม่ OCR เอง: PDF/ภาพส่งตรงให้โมเดลอ่าน การอ่านภาพอาจผิด ต้องตรวจ draft

```powershell
$env:OPENAI_API_KEY = "ใส่-key-เฉพาะ-terminal-local"
.\.venv\Scripts\python tools/mission_cli.py generate local/inbox/social/page.jpg --step social-part02 --request "ปรับบทให้ตรงภาพ เน้นจุดที่ควรจำ" --use-api --model MODEL_NAME
```

MODEL_NAME เป็นชื่อโมเดลที่พี่เลือก ไม่ใช่ค่าพร้อมใช้ API key ห้ามใส่ใน HTML/JS/config หรือ commit ไฟล์ .env เครื่องมือนี้ไม่ส่งข้อมูลใดอัตโนมัติและไม่เรียก AI บนเว็บของเด็ก

อ้างอิงรูปแบบ input: [OpenAI file inputs](https://developers.openai.com/api/docs/guides/file-inputs), [image inputs](https://developers.openai.com/api/docs/guides/images-vision)

## วิเคราะห์ผลจาก iPad

กด “ส่งออกผลเรียน JSON” บน Dashboard แล้วเก็บไฟล์ไว้ใน local/inbox บนเครื่องพี่ จากนั้น:

```powershell
.\.venv\Scripts\python tools/mission_cli.py analyze local/inbox/satit-progress.json
```

รายงาน local/reports มีคะแนนรวมแบบถ่วงตามจำนวนข้อ จำนวนครั้งต่อชุด และคำถามที่ผิด/ไม่ได้ตอบบ่อย นำรายงานแนบ AI ขอแผนทบทวนหรือข้อสอบชุดถัดไปได้ การทำชุดเดิมซ้ำมีผลจากความจำ จึงไม่ใช้คะแนนเป็นความน่าจะสอบเข้าได้

local/, .venv/, PDF และ secrets ถูก ignore ทั้งหมด ประวัติผู้เรียนไม่ถูกอัปโหลดเข้า repository เว็บสาธารณะควรมีเฉพาะบทเรียนที่คุณพ่ออนุมัติ ข้อมูลใน LocalStorage ไม่ใช่หลักฐานกันแก้ไข

## ขอบเขตการตรวจ

validate ตรวจ schema, id, เฉลย index และเวลา ไม่พิสูจน์ความถูกต้องทางวิชาการ ผู้ใหญ่ตรวจเนื้อหาและสิทธิ์การเผยแพร่ก่อน import การใช้ manual packet ไม่ต้องมี key และใช้กับ AI ผู้ให้บริการอื่นได้
