# ตั้งค่าเข้าสู่ระบบ Google + บันทึกผลเรียนลง Google Sheet

เว็บยังเป็น static บน GitHub Pages เหมือนเดิม ส่วนที่บันทึกข้อมูลคือ Google Apps Script ที่ผูกกับ Google Sheet ของคุณพ่อ ทุกคำขอส่ง Google ID token ไปด้วย Apps Script ตรวจกับ Google ว่า token ออกให้เว็บนี้ (`aud`) ยังไม่หมดอายุ อีเมลยืนยันแล้ว และอยู่ในรายชื่อที่อนุญาต ก่อนอ่าน/เขียน Sheet

ในหน้าเว็บมีแค่ค่าสาธารณะ 2 ค่า (OAuth Client ID และ URL ของ web app) ไม่มี API key หรือรหัสลับ

## สิ่งที่ถูกบันทึก

| แท็บใน Sheet | ข้อมูล |
| --- | --- |
| `marks` | บท/แบบทดสอบที่เรียนจบหรือยกเลิก พร้อมเวลาและอีเมลคนกด (เวลาใหม่กว่าชนะ) |
| `attempts` | ทุกครั้งที่ส่งข้อสอบ คะแนน เวลา และคำตอบรายข้อ (ไม่ซ้ำ ไม่ถูกลบ) |
| `settings` | วันสอบจริง/วันประกาศผลที่ตั้งเองในเมนูคุณพ่อ |
| `log` | เวลา อีเมล และจำนวนรายการที่เปลี่ยนในแต่ละครั้งที่ซิงก์ |

แท็บถูกสร้างอัตโนมัติในการซิงก์ครั้งแรก กิจกรรมในเมนูคุณพ่อยังไม่ซิงก์ (ใช้ส่งออก activities.json เหมือนเดิม)

## ขั้นตอน (ทำครั้งเดียว ประมาณ 15 นาที)

1. **สร้าง Google Sheet** ใหม่ในบัญชีคุณพ่อ เช่นชื่อ `Porjai Mission Hub`
2. **Apps Script**: ใน Sheet เลือก Extensions → Apps Script
   - วางโค้ดจาก `backend/apps-script/Code.gs` แทนของเดิม
   - Project Settings → เปิด “Show appsscript.json” แล้ววางเนื้อหา `backend/apps-script/appsscript.json`
3. **OAuth Client ID**: ที่ [Google Cloud Console → APIs & Services → Credentials](https://console.cloud.google.com/apis/credentials)
   - ถ้ายังไม่มี ให้ตั้งค่า OAuth consent screen แบบ External, ใส่ชื่อแอปและอีเมล, เพิ่มอีเมลของคุณพ่อ/พอใจเป็น Test users
   - Create credentials → OAuth client ID → Web application
   - Authorized JavaScript origins: `https://arilekt.github.io` และ `http://localhost:8080` (ไว้ทดสอบบนเครื่อง)
   - คัดลอก Client ID (ลงท้าย `.apps.googleusercontent.com`)
4. **Script properties** (Apps Script → Project Settings → Script properties)
   - `GOOGLE_CLIENT_ID` = Client ID จากข้อ 3
   - `ALLOWED_EMAILS` = อีเมลที่อนุญาต คั่นด้วย comma เช่น `dad@gmail.com,porjai@gmail.com`
5. **Deploy**: Deploy → New deployment → Web app → Execute as **Me**, Who has access **Anyone** → อนุญาตสิทธิ์ → คัดลอก URL ที่ลงท้าย `/exec`
   - “Anyone” จำเป็นเพื่อให้เว็บเรียกได้ การป้องกันจริงคือการตรวจ token และ `ALLOWED_EMAILS` ในโค้ด
6. **ใส่ค่าใน `data/config.json`** ส่วน `sync` แล้ว stamp/commit/push ตามปกติ
   ```json
   "sync": {"google_client_id": "xxxx.apps.googleusercontent.com", "apps_script_url": "https://script.google.com/macros/s/XXXX/exec"}
   ```
7. เปิดเว็บ → สำหรับคุณพ่อ → กด “Sign in with Google” ผลเรียนเดิมบนเครื่องจะถูกส่งขึ้น Sheet แล้วรวมกับของเครื่องอื่น

แก้โค้ด Apps Script ภายหลังต้อง Deploy → Manage deployments → Edit → New version เพื่อให้ URL เดิมใช้โค้ดใหม่

## การทำงานบนเว็บ

- ซิงก์อัตโนมัติ 2 วินาทีหลังกดเรียนจบหรือส่งข้อสอบ ตอนเปิดเว็บ และตอนกลับมาที่แท็บ (ห่างกันเกิน 1 นาที) และมีปุ่ม “ซิงก์ตอนนี้”
- token เก็บใน sessionStorage และหมดอายุประมาณ 1 ชั่วโมง เมื่อหมดอายุ Google จะพยายามเข้าสู่ระบบให้อัตโนมัติ ถ้าไม่ได้จะขอให้กดปุ่มอีกครั้ง
- ไม่ได้เข้าสู่ระบบ/ออฟไลน์ ยังเรียนได้ปกติ ผลเก็บใน LocalStorage แล้วซิงก์ทีหลัง
- ป้ายมุมขวาบน: ☁️ ซิงก์แล้ว / ⚠️ ซิงก์ไม่สำเร็จ (กดเพื่อไปหน้าคุณพ่อ)

## ข้อจำกัด

- เนื้อหาบทเรียนยังเปิดดูได้สาธารณะเพราะอยู่บน GitHub Pages การล็อกอินคุ้มครองเฉพาะข้อมูลใน Sheet
- เมนูคุณพ่อยังไม่ถูกล็อก ใครเปิดเว็บก็เห็นปุ่ม แต่ไม่สามารถอ่าน/เขียน Sheet ได้ถ้าบัญชีไม่อยู่ใน `ALLOWED_EMAILS`
- ระหว่างที่ OAuth consent screen อยู่โหมด Testing ใช้ได้เฉพาะ Test users ที่เพิ่มไว้ ซึ่งพอสำหรับครอบครัว
- Safari ที่ปิด third-party cookies อาจไม่แสดง One Tap แต่ปุ่ม Sign in with Google ยังใช้ได้
