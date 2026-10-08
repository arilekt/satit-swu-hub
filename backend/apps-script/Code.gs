/**
 * SPSM เส้นทางสู่ ม.1 sync backend (Google Apps Script bound to one Google Sheet).
 * Generated: 2026-10-05 01:52 Bangkok
 *
 * Every request carries a Google ID token from the website's Sign-In button. The token is
 * verified with Google, its audience must equal GOOGLE_CLIENT_ID and its email must be in
 * ALLOWED_EMAILS (Script properties). Nothing secret lives in the website itself.
 *
 * Script properties (Project Settings → Script properties):
 *   GOOGLE_CLIENT_ID  OAuth Web client ID used by the site
 *   ALLOWED_EMAILS    comma separated, e.g. dad@gmail.com,porjai@gmail.com
 */

function setupAllSheets() {
  var book = SpreadsheetApp.getActiveSpreadsheet();
  Object.keys(SHEETS).forEach(function (name) {
    if (!book.getSheetByName(name)) {
      sheet(name);
      Logger.log('Created sheet: ' + name);
    }
  });
  return 'เสร็จสิ้น: สร้างแท็บที่ขาดหายไปครบทุกแท็บแล้ว';
}

var SHEETS = {
  marks: ['step_id', 'done', 'updated_at', 'email'],
  attempts: ['key', 'id', 'title', 'score', 'total', 'date', 'elapsed_seconds', 'timed_out', 'answers_json', 'email'],
  settings: ['key', 'value', 'updated_at', 'email'],
  log: ['time', 'email', 'action', 'detail'],
  sessions: ['hash', 'email', 'created_at', 'expires_at', 'last_seen', 'device', 'revoked'],
  'กำหนดการ': ['หัวข้อ', 'วันที่', 'คำอธิบาย'],
  'กิจกรรม': ['วันที่', 'เริ่ม', 'สิ้นสุด', 'ชื่อกิจกรรม', 'สถานที่', 'รายละเอียด', 'ชุดเดียวกัน', 'แสดง'],
  'กำลังใจ': ['ข้อความ', 'วันที่ (ไม่บังคับ)'],
  'เกณฑ์คะแนน': ['ระดับ', 'เปอร์เซ็นต์', 'เงื่อนไข', 'ไอคอน'],
  'แผน-วิธีใช้': ['วิธีปรับแผนการเรียนของพอใจ (แท็บนี้อ่านอย่างเดียว ไม่มีผลกับแผน)'],
  'แผน-ตั้งค่า': ['หัวข้อ', 'ค่า', 'คำอธิบาย'],
  'แผน-ช่วงเวลา': ['ชื่อช่วง', 'ตั้งแต่วันที่', 'ถึงวันที่', 'เริ่มเรียนกี่โมง', 'นาทีเรียนต่อวัน', 'นาทีเฉพาะบางวัน', 'วันพัก', 'ข้อความวันทบทวน'],
  'แผน-วิชา': ['วิชา', 'ลำดับ', 'บทต่อรอบ', 'เริ่มเรียนตั้งแต่วันที่', 'ข้อความจากพ่อถึงพอใจ'],
  'แผน-วันพิเศษ': ['วันที่', 'นาทีเรียนวันนั้น', 'เริ่มกี่โมง', 'ข้อความบนปฏิทิน'],
  'แผน-คลาส': ['ชื่อคลาส', 'วัน', 'เวลา', 'ถึงวันที่']
};
/* Hover notes on each header cell of the plan tabs. */
var HEADER_NOTES = {
  'กำหนดการ': ['วันสอบจริง หรือ วันประกาศผล Pre-Test (แก้เฉพาะคอลัมน์ วันที่)', 'เช่น 2027-02-07 หรือ 7/2/2570 เว้นว่าง = ใช้วันตามข้อมูลกลางของเว็บ', 'โน้ตของคุณพ่อ เว็บไม่อ่านคอลัมน์นี้'],
  'กิจกรรม': ['1 แถว = 1 กิจกรรม เช่น 2026-12-12 หรือ 12/12/2569', 'เว้นว่างได้ เช่น 08:30', 'ต้องหลังเวลาเริ่ม เว้นว่างได้', 'ชื่อที่โชว์บนหน้าแรกและปฏิทิน', 'เว้นว่างได้', 'เว้นว่างได้', 'ใส่ชื่อชุดเดียวกัน (เช่น SATIT ACADEMIC FAIR 2026) เพื่อรวมหลายแถวเป็นบรรทัดเดียวบนหน้าแรก เว้นว่าง = กิจกรรมเดี่ยว', 'พิมพ์ ซ่อน เพื่อซ่อนไว้ก่อนโดยไม่ต้องลบแถว เว้นว่าง = แสดง'],
  'กำลังใจ': ['ข้อความที่สุ่มโชว์บนหน้าแรก ยาวไม่เกิน 200 ตัวอักษร', 'ใส่วันที่ = โชว์ข้อความนี้เฉพาะวันนั้น เว้นว่าง = สุ่มโชว์ได้ทุกวัน'],
  'เกณฑ์คะแนน': ['ชื่อระดับ (แถวที่เริ่มที่ 0 = ยังไม่ผ่านเกณฑ์) ต้องมีอย่างน้อย 2 ระดับ', 'เปอร์เซ็นต์ของคะแนนเต็ม 0–100', 'ตั้งแต่ = เท่ากับหรือมากกว่า · เกิน = มากกว่า (เช่น ดีมาก เกิน 80 หมายความว่า 80 พอดียังไม่ใช่ ดีมาก)', 'อีโมจิหน้าชื่อระดับ เว้นว่างได้'],
  'แผน-ช่วงเวลา': ['ชื่อที่จะโชว์ใต้ปฏิทิน', 'เช่น 2026-10-05 หรือ 5/10/2569', 'เช่น 2026-10-31 หรือ 31/10/2569', 'เวลาเริ่มบทแรกของวัน เช่น 09:00', 'เวลาเรียนรวมต่อวัน เว็บจะเรียงทีละ PART ตามความยาวจริงจนเต็ม (PART ที่ยาวเกินได้วันของตัวเอง)', 'ถ้าบางวันเรียนน้อย/มากกว่า เช่น จ,พ,ศ = 60 (หลายกลุ่มคั่นด้วย ;)', 'เช่น อา หรือ ส,อา', 'ข้อความในวันที่เรียนครบทุกบทแล้ว'],
  'แผน-วิชา': ['คณิต วิทย์ ไทย สังคม อังกฤษ', 'ลำดับที่หมุนเรียน 1 = เรียนก่อน', '1 = ปกติ, 2 = เรียนถี่ขึ้น 2 เท่า (สูงสุด 3)', 'เว้นว่าง = เริ่มพร้อมแผน หรือใส่วันที่ เช่น 30/11/2569 = เริ่มหลัง Pre-Test', 'จะโชว์ในการ์ดวิชานี้ หน้าเส้นทางการเรียน'],
  'แผน-วันพิเศษ': ['วันที่ เช่น 2026-10-12 หรือ 12/10/2569', '0 หรือ หยุด = งดเรียนทั้งวัน, หรือใส่นาที เช่น 60 = วันนั้นเรียนน้อยลง (เว้นว่าง = ปกติ)', 'เว้นว่าง = ตามปกติ หรือใส่เวลา เช่น 13:00', 'โชว์ในช่องวันนั้นบนปฏิทิน เช่น ไปเที่ยว'],
  'แผน-คลาส': ['ชื่อที่โชว์บนปฏิทิน', 'เช่น จ หรือ จ,พ,ศ', 'เช่น 19:30', 'วันสุดท้ายของคลาส เว้นว่าง = ไม่มีกำหนด']
};
/* Study plan tabs are edited by hand in the Sheet. They start with these rows; the website's
   data/config.json daily_plan stays the fallback when a tab is empty or a row is invalid. */
var PLAN_SEED = {
  'แผน-วิธีใช้': [
    ['1. แก้ค่าในแท็บ แผน-… แล้วกดปุ่ม 🔄 ซิงก์ ที่ปฏิทินบนเว็บ แผนจะเปลี่ยนทันที ไม่ต้อง deploy'],
    ['2. แต่ละวันเริ่มตาม "เริ่มเรียนกี่โมง" แล้วเรียงทีละ PART ตามความยาวจริง (คลิป + อ่านสรุป, ข้อสอบท้ายบท 1.5 นาที/ข้อ) จนครบ "นาทีเรียนต่อวัน"'],
    ['3. แผน-ตั้งค่า: วันเริ่มแผน, ค่าปกตินอกช่วงเวลา, พักระหว่างบท, นาทีอ่านสรุป'],
    ['4. แผน-ช่วงเวลา: ช่วงปิดเทอม/เปิดเทอม/หลัง Pre-Test แต่ละช่วงกำหนดเวลาเริ่มและนาทีต่อวันเอง'],
    ['5. แผน-วิชา: สลับลำดับวิชา ให้วิชาไหนเรียนถี่ขึ้น เลื่อนวันเริ่มวิชา (เช่น อังกฤษหลัง Pre-Test) และฝากข้อความถึงพอใจ'],
    ['6. แผน-วันพิเศษ: วันไปเที่ยว/ป่วย ให้หยุด หรือเรียนน้อยลงเฉพาะวัน บทที่เหลือจะเลื่อนไปวันถัดไปเอง'],
    ['7. แผน-คลาส: คลาสประจำสัปดาห์ พร้อมวันสุดท้ายของคลาส'],
    ['8. กำหนดการ: วันสอบจริง และวันประกาศผล Pre-Test (เว้นว่าง = ใช้วันตามข้อมูลกลางของเว็บ)'],
    ['9. กิจกรรม: 1 แถว = 1 กิจกรรม · ใส่ชื่อ “ชุดเดียวกัน” เพื่อรวมหลายวันเป็นบรรทัดเดียวบนหน้าแรก · พิมพ์ ซ่อน ในช่อง แสดง เพื่อซ่อนชั่วคราว'],
    ['10. กำลังใจ: ข้อความที่สุ่มโชว์บนหน้าแรกของพอใจ · ใส่วันที่ = โชว์เฉพาะวันนั้น · ถ้าลบจนว่าง เว็บใช้ชุดตั้งต้นของเว็บ'],
    ['11. เกณฑ์คะแนน: ระดับของผลข้อสอบ (ผ่านเกณฑ์ ตั้งแต่ 60% · ดีมาก เกิน 80% · ยอดเยี่ยม 100%) แก้ตัวเลขได้ ใช้กับข้อสอบทุกชุด'],
    ['วันที่พิมพ์ได้ทั้ง 2026-10-12 และ 12/10/2569 · วันใช้ อา จ อ พ พฤ ศ ส · ชี้ที่หัวคอลัมน์เพื่อดูคำอธิบาย'],
    ['ถ้าลบแถวจนแท็บว่าง หรือพิมพ์ผิดรูปแบบ เว็บจะใช้แผนตั้งต้นในส่วนนั้นแทน · ติ๊กเรียนจบแล้วแผนไม่เลื่อน']
  ],
  'แผน-ตั้งค่า': [
    ['วันเริ่มแผน', "'2026-10-05", 'วันแรกของแผน'],
    ['เริ่มเรียนกี่โมง', "'17:00", 'ใช้กับวันที่ไม่อยู่ในแท็บ แผน-ช่วงเวลา'],
    ['นาทีเรียนต่อวัน', 90, 'ใช้กับวันที่ไม่อยู่ในแท็บ แผน-ช่วงเวลา'],
    ['พักระหว่างบท', 10, 'นาทีพักระหว่าง PART'],
    ['นาทีอ่านสรุป', 10, 'บวกเพิ่มจากความยาวคลิปของแต่ละ PART'],
    ['วันพักประจำ', 'อา', 'เช่น อา หรือ ส,อา']
  ],
  'แผน-ช่วงเวลา': [
    ['ปิดเทอม', "'2026-10-05", "'2026-10-31", "'09:00", 180, '', 'อา', ''],
    ['เปิดเทอม ก่อน Pre-Test', "'2026-11-01", "'2026-11-28", "'17:00", 90, "'จ,พ,ศ = 60", 'อา', 'ทบทวนบทที่ยังไม่มั่นใจ / ทำข้อสอบท้ายบทซ้ำ'],
    ['หลัง Pre-Test', "'2026-11-30", "'2027-02-06", "'17:00", 90, "'จ,พ,ศ = 60", 'อา', 'ทบทวนตามผล Pre-Test']
  ],
  'แผน-วิชา': [['คณิต', 1, 1, '', ''], ['วิทย์', 2, 1, '', ''], ['ไทย', 3, 1, '', ''], ['สังคม', 4, 1, '', ''], ['อังกฤษ', 5, 1, "'2026-11-30", '']],
  'แผน-วันพิเศษ': [
    ['ตัวอย่าง 12/10/2569', 'หยุด', '', 'ไปเที่ยวกับครอบครัว (แถวตัวอย่าง ไม่มีผล ลบได้)'],
    ['ตัวอย่าง 13/10/2569', 60, "'13:00", 'ไปหาหมอตอนเช้า (แถวตัวอย่าง ไม่มีผล ลบได้)']
  ],
  'กำหนดการ': [
    ['วันสอบจริง', "'2027-02-07", 'วันสอบภาคปกติ · เว้นว่าง = ใช้วันตามข้อมูลกลางของเว็บ'],
    ['วันประกาศผล Pre-Test', "'2026-12-08", 'เว้นว่าง = ใช้วันตามข้อมูลกลางของเว็บ']
  ],
  'กิจกรรม': [
    ["'2026-12-12", "'08:30", "'15:30", "SATIT ACADEMIC FAIR · ลงทะเบียนเข้าร่วมงานนิทรรศการ (วันที่ 1)", "ยังไม่ระบุจุดลงทะเบียนในภาพ", "กิจกรรม onsite · ลงทะเบียนเข้าร่วมงาน", "SATIT ACADEMIC FAIR 2026", ""],
    ["'2026-12-12", "'10:00", "'12:00", "Literacy Without Borders: Connecting Educators, Culturem and ideas", "เวทีกลาง ห้อง Hall 8 ชั้น LG ศูนย์ประชุมแห่งชาติสิริกิติ์", "การบรรยายพิเศษ · onsite · ชื่อภาษาอังกฤษถอดตามภาพ ควรตรวจชื่อกับผู้จัดอีกครั้ง", "SATIT ACADEMIC FAIR 2026", ""],
    ["'2026-12-13", "'08:30", "'15:30", "SATIT ACADEMIC FAIR · ลงทะเบียนเข้าร่วมงานนิทรรศการ (วันที่ 2)", "ยังไม่ระบุจุดลงทะเบียนในภาพ", "กิจกรรม onsite · ลงทะเบียนเข้าร่วมงาน", "SATIT ACADEMIC FAIR 2026", ""],
    ["'2026-12-13", "'09:00", "'10:30", "แนวคิดการจัดการเรียนรู้เพื่อส่งเสริมความฉลาดรู้ของผู้เรียนในศตวรรษที่ 21", "เวทีกลาง ห้อง Hall 8 ชั้น LG ศูนย์ประชุมแห่งชาติสิริกิติ์", "การเสวนาทางวิชาการ · onsite", "SATIT ACADEMIC FAIR 2026", ""],
    ["'2026-12-13", "'13:00", "'14:00", "Smart Talk กับ Gen Alpha: สื่อสารอย่างฉลาดรู้สำหรับครูและผู้ปกครองยุคใหม่", "เวทีกลาง ห้อง Hall 8 ชั้น LG ศูนย์ประชุมแห่งชาติสิริกิติ์", "การบรรยายพิเศษ · onsite", "SATIT ACADEMIC FAIR 2026", ""]
  ],
  'กำลังใจ': [
    ["วันนี้ไม่ต้องเก่งทุกอย่าง แค่ลองทีละข้อก็เก่งขึ้นแล้ว", ''],
    ["สงสัยตรงไหน ถามได้เลย คำถามคือประตูสู่เรื่องใหม่", ''],
    ["ทำผิดไม่เป็นไร เพราะเราเพิ่งรู้ว่าตรงไหนต้องฝึกเพิ่ม", ''],
    ["เรียนครบรอบแล้วพักสายตา ลุกยืดตัว แล้วค่อยมาต่อ", ''],
    ["ค่อย ๆ อ่านโจทย์ช้า ๆ บางทีคำตอบซ่อนอยู่ในคำถาม", ''],
    ["เมื่อวานยาก วันนี้ลองใหม่ อาจง่ายขึ้นกว่าที่คิด", ''],
    ["สมองชอบการพักพอ ๆ กับการฝึก อย่าลืมดื่มน้ำนะ", ''],
    ["ลองเล่าสิ่งที่เรียนให้คนในบ้านฟัง จะจำได้แม่นขึ้น", ''],
    ["ความพยายามวันนี้ คือความมั่นใจของวันสอบ", ''],
    ["ถ้าติดอยู่ ลองข้ามไปก่อน แล้วค่อยกลับมาใหม่", ''],
    ["ทุกคำถามที่ตอบผิด สอนเรามากกว่าคำถามที่ตอบถูก", ''],
    ["เริ่มแค่ 10 นาทีก่อนก็ได้ พอเริ่มแล้วจะไปต่อง่ายขึ้น", ''],
    ["วันนี้อยากรู้เรื่องอะไรเป็นพิเศษ ลองจดไว้แล้วไปหาคำตอบกัน", ''],
    ["ไม่ต้องรีบ เข้าใจทีละนิดดีกว่าจำทั้งหมดแบบงง ๆ", ''],
    ["เหนื่อยก็พักได้ พักแล้วกลับมาใหม่คือความเก่งอีกแบบ", ''],
    ["ลองวาดรูปหรือแผนภาพช่วยจำ สมองชอบภาพมาก", ''],
    ["ขีดเส้นใต้คำสำคัญในโจทย์ ช่วยให้ไม่พลาดเรื่องเล็ก", ''],
    ["ภูมิใจกับตัวเองได้เลย ที่วันนี้เปิดมาเรียนต่อ", ''],
    ["อะไรที่ยังไม่เข้าใจ ไม่ได้แปลว่าทำไม่ได้ แค่ยังไม่ถึงเวลา", ''],
    ["ลองตั้งคำถามว่า “ทำไม” กับเรื่องที่เรียน แล้วจะสนุกขึ้น", ''],
    ["นอนหลับให้พอ สมองจะช่วยเก็บสิ่งที่เรียนไว้ให้เอง", ''],
    ["ทำข้อที่มั่นใจก่อน แล้วค่อยกลับมาคิดข้อที่ยาก", ''],
    ["วันนี้ลองอธิบายด้วยคำพูดของตัวเองดูนะ", ''],
    ["เก่งขึ้นทีละนิดทุกวัน รวมกันแล้วไกลมาก", ''],
    ["ผิดซ้ำได้ ลองใหม่ได้ ห้องเรียนนี้ไม่มีใครตัดคะแนน", ''],
    ["ฟังคลิปแล้วหยุดคิดตามสักหน่อย ช่วยให้เข้าใจลึกขึ้น", ''],
    ["ยิ้มก่อนเริ่มเรียนสักนิด สมองจะพร้อมกว่าเดิม", ''],
    ["จดสิ่งที่เรียนได้ 3 ข้อ แค่นี้ก็ถือว่าสำเร็จแล้ว", ''],
    ["ความสงสัยเล็ก ๆ วันนี้ อาจกลายเป็นเรื่องโปรดในวันหน้า", ''],
    ["เรียนเสร็จแล้วออกไปมองไกล ๆ ให้ตาได้พักบ้าง", ''],
    ["วันนี้ทำได้เท่าไหร่ก็เท่านั้น พรุ่งนี้ค่อยต่ออีกนิด", '']
  ],
  'เกณฑ์คะแนน': [
    ['ต้องฝึกเพิ่ม', 0, 'ตั้งแต่', '🌱'],
    ['ผ่านเกณฑ์', 60, 'ตั้งแต่', '✅'],
    ['ดีมาก', 80, 'เกิน', '🌟'],
    ['ยอดเยี่ยม', 100, 'ตั้งแต่', '🏆']
  ],
  'แผน-คลาส': [
    ['เรียนอังกฤษออนไลน์', 'จ', "'19:30", "'2026-12-31"],
    ['เรียนอังกฤษออนไลน์', 'พ', "'19:00", "'2026-12-31"],
    ['เรียนอังกฤษออนไลน์', 'ศ', "'19:30", "'2026-12-31"]
  ]
};
var COLUMN_WIDTHS = {'เกณฑ์คะแนน': [160, 110, 140, 90], 'กำหนดการ': [200, 150, 420], 'กิจกรรม': [110, 70, 70, 360, 240, 300, 220, 70], 'กำลังใจ': [620, 170]};
var SETTING_ALIASES = {'วันเริ่มแผน': 'start_date', 'เริ่มเรียนกี่โมง': 'start_time', 'นาทีเรียนต่อวัน': 'day_minutes', 'พักระหว่างบท': 'break_minutes',
  'นาทีอ่านสรุป': 'reading_minutes', 'วันพักประจำ': 'rest_days'};
var SUBJECT_ALIASES = {'คณิต': 'math', 'คณิตศาสตร์': 'math', 'math': 'math', 'วิทย์': 'science', 'วิทยาศาสตร์': 'science', 'science': 'science',
  'ไทย': 'thai', 'ภาษาไทย': 'thai', 'thai': 'thai', 'สังคม': 'social', 'สังคมศึกษา': 'social', 'social': 'social',
  'อังกฤษ': 'english', 'ภาษาอังกฤษ': 'english', 'english': 'english'};
var DAY_CODES = {'อา': 0, 'จ': 1, 'อ': 2, 'พ': 3, 'พฤ': 4, 'ศ': 5, 'ส': 6};
var SETTING_KEYS = ['examDate', 'resultDate'];
var MAX_ATTEMPTS_RETURNED = 100;
var SESSION_DAYS = 90;
var SESSION_RENEW_MS = 24 * 60 * 60 * 1000; // renew the expiry at most once a day
var SESSION_EXPIRED = 'หมดเวลาเข้าสู่ระบบ กรุณาเข้าสู่ระบบด้วย Google อีกครั้ง';
var SESSION_PATTERN = /^[0-9a-f]{64}$/;

/* ---------- pure helpers (unit tested in tests/core.cjs) ---------- */

/** Errors carry a machine-readable code the website uses: auth | denied | session_expired | config | error. */
function authError(code, message) { var e = new Error(message); e.code = code; return e; }

/** May this stored session row be used now? Returns {email, renew} or throws session_expired / denied. */
function checkSession(row, allowed, nowMs) {
  if (!row || row.revoked || !(new Date(row.expires_at).getTime() > nowMs)) throw authError('session_expired', SESSION_EXPIRED);
  if (allowed.indexOf(row.email) < 0) throw authError('denied', 'บัญชี ' + row.email + ' ยังไม่ได้รับอนุญาต');
  return {email: row.email, renew: !(nowMs - new Date(row.last_seen).getTime() < SESSION_RENEW_MS)};
}

function attemptKey(a) { return a.id + '|' + a.date; }

function validDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  var d = new Date(value + 'T00:00:00Z');
  return !isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

/** "2026-10-12", "12/10/2026" or "12/10/2569" (พ.ศ.) → "2026-10-12", else "" */
function parseDate(value) {
  var v = String(value || '').trim(), m = v.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) v = m[3] + '-' + ('0' + m[2]).slice(-2) + '-' + ('0' + m[1]).slice(-2);
  var y = Number(v.slice(0, 4));
  if (y > 2400) v = (y - 543) + v.slice(4); // พ.ศ.
  return validDate(v) ? v : '';
}

function validTime(value) { return typeof value === 'string' && !isNaN(new Date(value).getTime()); }

/** Reject anything that is not a well-formed client payload before touching the sheet. */
function cleanPayload(state) {
  if (!state || typeof state !== 'object') throw new Error('ข้อมูลที่ส่งมาไม่ถูกต้อง');
  var marks = {}, attempts = [], settings = {};
  var rawMarks = state.marks && typeof state.marks === 'object' ? state.marks : {};
  Object.keys(rawMarks).slice(0, 2000).forEach(function (id) {
    var m = rawMarks[id];
    if (/^[a-z0-9:-]{1,100}$/.test(id) && m && typeof m.done === 'boolean' && validTime(m.at)) marks[id] = {done: m.done, at: m.at};
  });
  (Array.isArray(state.attempts) ? state.attempts.slice(-500) : []).forEach(function (a) {
    if (!a || typeof a.id !== 'string' || typeof a.title !== 'string' || !validTime(a.date)) return;
    if (!isFinite(a.score) || !(a.total > 0) || a.total % 1 !== 0 || a.score < 0 || a.score > a.total) return;
    attempts.push({
      id: a.id.slice(0, 100), title: a.title.slice(0, 300), score: Number(a.score), total: a.total, date: a.date,
      elapsed_seconds: isFinite(a.elapsed_seconds) ? Number(a.elapsed_seconds) : null, timedOut: a.timedOut === true,
      answers: Array.isArray(a.answers) ? a.answers.slice(0, 200) : undefined
    });
  });
  var rawSettings = state.settings && typeof state.settings === 'object' ? state.settings : {};
  SETTING_KEYS.forEach(function (key) {
    var s = rawSettings[key];
    if (s && validTime(s.at) && (s.value === null || validDate(s.value))) settings[key] = {value: s.value, at: s.at};
  });
  return {marks: marks, attempts: attempts, settings: settings};
}

/** Merge a client state into the stored one. Newer mark/setting wins; attempts are a union. */
function mergeState(stored, incoming) {
  var merged = {marks: {}, attempts: [], settings: {}}, changed = {marks: [], attempts: [], settings: []};
  Object.keys(stored.marks).forEach(function (id) { merged.marks[id] = stored.marks[id]; });
  Object.keys(incoming.marks).forEach(function (id) {
    var mine = incoming.marks[id], theirs = merged.marks[id];
    if (!theirs || new Date(mine.at) > new Date(theirs.at)) { merged.marks[id] = mine; changed.marks.push(id); }
  });
  var seen = {};
  stored.attempts.forEach(function (a) { seen[attemptKey(a)] = true; merged.attempts.push(a); });
  incoming.attempts.forEach(function (a) {
    if (!seen[attemptKey(a)]) { seen[attemptKey(a)] = true; merged.attempts.push(a); changed.attempts.push(a); }
  });
  merged.attempts.sort(function (x, y) { return new Date(x.date) - new Date(y.date); });
  SETTING_KEYS.forEach(function (key) {
    var mine = incoming.settings[key], theirs = stored.settings[key];
    if (mine && (!theirs || new Date(mine.at) > new Date(theirs.at))) { merged.settings[key] = mine; changed.settings.push(key); }
    else if (theirs) merged.settings[key] = theirs;
  });
  return {merged: merged, changed: changed};
}

function responseState(merged) {
  return {marks: merged.marks, attempts: merged.attempts.slice(-MAX_ATTEMPTS_RETURNED), settings: merged.settings, synced_at: new Date().toISOString()};
}

function parseDays(value) {
  var out = [];
  String(value || '').split(/[,\s]+/).forEach(function (code) {
    code = code.replace(/\./g, '');
    if (DAY_CODES.hasOwnProperty(code) && out.indexOf(DAY_CODES[code]) < 0) out.push(DAY_CODES[code]);
  });
  return out;
}

function parseTime(value) { var m = String(value || '').trim().match(/^(\d{1,2})[:.](\d{2})/); return m && Number(m[1]) < 24 && Number(m[2]) < 60 ? ('0' + m[1]).slice(-2) + ':' + m[2] : ''; }
function minutesIn(value, max) { var v = String(value === undefined || value === null ? '' : value).trim(), n = Number(v); return v !== '' && isFinite(n) && n >= 0 && n <= max ? Math.round(n) : null; }

/** Turn the plan tabs (rows already as text) into a daily_plan object, or null if nothing usable. */
function parsePlan(settingRows, periodRows, classRows, subjectRows, dayRows) {
  var plan = {}, any = false, clean = function (v, n) { return String(v === undefined || v === null ? '' : v).trim().slice(0, n); };
  (settingRows || []).forEach(function (r) {
    var key = SETTING_ALIASES[clean(r[0], 40)], value = clean(r[1], 40);
    if (key === 'start_date' && parseDate(value)) { plan.start_date = parseDate(value); any = true; }
    if (key === 'start_time' && parseTime(value)) { plan.start_time = parseTime(value); any = true; }
    if (key === 'day_minutes' && minutesIn(value, 720) !== null) { plan.day_minutes = minutesIn(value, 720); any = true; }
    if (key === 'break_minutes' && minutesIn(value, 60) !== null) { plan.break_minutes = minutesIn(value, 60); any = true; }
    if (key === 'reading_minutes' && minutesIn(value, 60) !== null) { plan.reading_minutes = minutesIn(value, 60); any = true; }
    if (key === 'rest_days') { plan.rest_weekdays = parseDays(value); any = true; }
  });
  var periods = [];
  (periodRows || []).forEach(function (r) {
    var from = parseDate(r[1]), to = parseDate(r[2]), start = parseTime(r[3]), mins = minutesIn(r[4], 720);
    if (!from || !to || from > to || !start || mins === null) return;
    var period = {name: clean(r[0], 60), from: from, to: to, start_time: start, day_minutes: mins, rest_weekdays: parseDays(r[6])};
    var special = {};
    String(r[5] || '').split(';').forEach(function (group) {
      var bits = group.split('='), days = parseDays(bits[0]), m = minutesIn(bits[1], 720);
      if (days.length && m !== null) days.forEach(function (d) { special[String(d)] = m; });
    });
    if (Object.keys(special).length) period.weekday_minutes = special;
    if (clean(r[7], 120)) period.review_label = clean(r[7], 120);
    periods.push(period);
  });
  if (periods.length) { plan.periods = periods; any = true; }
  var classes = [];
  (classRows || []).forEach(function (r) {
    var days = parseDays(r[1]);
    if (!clean(r[0], 80) || !days.length) return;
    var item = {title: clean(r[0], 80), weekdays: days, time: parseTime(r[2])};
    if (parseDate(r[3])) item.until = parseDate(r[3]);
    classes.push(item);
  });
  if (classes.length) { plan.recurring_events = classes; any = true; }
  var subjects = [], seen = {};
  (subjectRows || []).forEach(function (r, i) {
    var id = SUBJECT_ALIASES[clean(r[0], 40).toLowerCase()];
    if (!id || seen[id]) return; seen[id] = true;
    var order = Number(r[1]), weight = Math.floor(Number(r[2]));
    var item = {id: id, order: isFinite(order) && clean(r[1], 10) !== '' ? order : 100 + i, weight: weight >= 1 && weight <= 3 ? weight : 1, note: clean(r[4], 300)};
    if (parseDate(r[3])) item.from = parseDate(r[3]);
    subjects.push(item);
  });
  if (subjects.length) { plan.subjects = subjects; any = true; }
  var days = {};
  (dayRows || []).forEach(function (r) {
    var date = parseDate(r[0]), amount = clean(r[1], 40), day = {note: clean(r[3], 120)};
    if (!date) return;
    if (/^(หยุด|งด)/.test(amount)) day.minutes = 0; else if (minutesIn(amount, 720) !== null) day.minutes = minutesIn(amount, 720);
    if (parseTime(r[2])) day.start = parseTime(r[2]);
    days[date] = day;
  });
  if (Object.keys(days).length) { plan.days = days; any = true; }
  return any ? plan : null;
}

var MAX_EVENTS = 200;
var MAX_MOTTOS = 100;

function cleanText(value, max) { return String(value === undefined || value === null ? '' : value).trim().slice(0, max); }

/** Short stable hash (base 36) so an activity keeps its id when rows move. */
function hashText(text) {
  var h = 5381;
  for (var i = 0; i < text.length; i++) h = ((h * 33) ^ text.charCodeAt(i)) >>> 0;
  return h.toString(36);
}

/**
 * Turn the กำหนดการ / กิจกรรม / กำลังใจ tabs (rows already as text) into what the website needs.
 * Each part is null when its tab holds nothing usable, so the website keeps its own built-in data.
 * An activities tab with rows that are all hidden gives [] (deliberately empty).
 */
/** Score levels from the เกณฑ์คะแนน tab, lowest first; null unless there are at least two usable rows. */
function parseGrading(rows) {
  var levels = [];
  (rows || []).forEach(function (r) {
    var label = cleanText(r[0], 30), raw = cleanText(r[1], 10).replace('%', ''), percent = Number(raw);
    if (!label || raw === '' || !isFinite(percent) || percent < 0 || percent > 100) return;
    levels.push({label: label, percent: percent, above: /^(เกิน|มากกว่า|>)/.test(cleanText(r[2], 20)), icon: cleanText(r[3], 8)});
  });
  levels.sort(function (a, b) { return a.percent - b.percent; });
  return levels.length >= 2 ? levels.slice(0, 8) : null;
}

function parseExtras(dateRows, activityRows, mottoRows, gradingRows) {
  var out = {dates: null, activities: null, mottos: null, grading: parseGrading(gradingRows)}, dates = {};
  (dateRows || []).forEach(function (r) {
    var label = cleanText(r[0], 80), date = parseDate(r[1]);
    if (!date) return;
    if (/สอบจริง/.test(label)) dates.exam_date = date;
    else if (/ประกาศผล/.test(label)) dates.result_date = date;
  });
  if (Object.keys(dates).length) out.dates = dates;

  var events = [], seen = {}, anyRow = false;
  (activityRows || []).forEach(function (r) {
    if (!cleanText(r.join(''), 10)) return;
    anyRow = true;
    if (/^(ซ่อน|ไม่|no|false|0)/i.test(cleanText(r[7], 10)) || events.length >= MAX_EVENTS) return;
    var date = parseDate(r[0]), title = cleanText(r[3], 200);
    if (!date || !title) return;
    var start = parseTime(r[1]), end = parseTime(r[2]), series = cleanText(r[6], 200);
    var id = (series ? 'g' + hashText(series) + '-' : 'e') + hashText(date + '|' + start + '|' + title), n = 1, base = id;
    while (seen[id]) id = base + 'x' + (++n);
    seen[id] = true;
    var event = {id: id, date: date, title: title};
    if (start && end && end > start) { event.start = start; event.end = end; }
    if (cleanText(r[4], 300)) event.location = cleanText(r[4], 300);
    if (cleanText(r[5], 2000)) event.description = cleanText(r[5], 2000);
    if (series) event.series = series;
    events.push(event);
  });
  if (anyRow) out.activities = events;

  var mottos = [];
  (mottoRows || []).forEach(function (r) {
    var text = cleanText(r[0], 200);
    if (!text || mottos.length >= MAX_MOTTOS) return;
    var item = {text: text}, date = parseDate(r[1]);
    if (date) item.date = date;
    mottos.push(item);
  });
  if (mottos.length) out.mottos = mottos;
  return out;
}

function checkClaims(claims, clientId, allowed, nowSeconds) {
  if (!claims || claims.aud !== clientId) throw authError('auth', 'token ไม่ได้ออกให้เว็บนี้');
  if (['accounts.google.com', 'https://accounts.google.com'].indexOf(claims.iss) < 0) throw authError('auth', 'ผู้ออก token ไม่ถูกต้อง');
  if (String(claims.email_verified) !== 'true') throw authError('auth', 'อีเมลยังไม่ยืนยันกับ Google');
  if (!(Number(claims.exp) > nowSeconds)) throw authError('auth', 'token หมดอายุ กรุณาเข้าสู่ระบบใหม่');
  var email = String(claims.email || '').toLowerCase();
  if (allowed.indexOf(email) < 0) throw authError('denied', 'บัญชี ' + email + ' ยังไม่ได้รับอนุญาต');
  return email;
}

/* ---------- Apps Script runtime ---------- */

function doGet() { return json({ok: true, service: 'satit-swu-hub-sync'}); }

/**
 * Actions:
 *   login       {id_token, device}  Google token -> new 90-day device session {session, expires_at}
 *   whoami      {session | id_token}
 *   sync        {session | id_token, state}
 *   logout      {session}           revoke this device
 *   logout_all  {session}           revoke every device of this account
 * Only a SHA-256 hash of a session is stored in the sheet; the allowlist is re-checked on every call.
 */
function doPost(e) {
  try {
    var body = JSON.parse(e.postData.contents);
    if (body.action === 'login') return doLogin(verify(body.id_token), body);
    if (body.action === 'logout' || body.action === 'logout_all') return doLogout(body, body.action === 'logout_all');
    var email = authenticate(body);
    if (body.action === 'whoami') return json({ok: true, email: email});
    if (body.action !== 'sync') throw new Error('ไม่รู้จักคำสั่ง');
    var lock = LockService.getScriptLock();
    lock.waitLock(20000);
    try {
      Object.keys(SHEETS).forEach(function (name) {
        if (!SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name)) sheet(name);
      });
      var incoming = cleanPayload(body.state);
      var result = mergeState(readState(), incoming);
      writeChanges(result.changed, incoming, email);
      appendLog(email, 'sync', result.changed.marks.length + ' marks, ' + result.changed.attempts.length + ' attempts, ' + result.changed.settings.length + ' settings');
      return json({ok: true, email: email, state: responseState(result.merged), plan: readPlan(), extras: readExtras()});
    } finally { lock.releaseLock(); }
  } catch (error) {
    return json({ok: false, error: String(error && error.message || error), code: error && error.code || 'error'});
  }
}

function authenticate(body) {
  if (body.session !== undefined && body.session !== null) return useSession(body.session);
  return verify(body.id_token);
}

function doLogin(email, body) {
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    Object.keys(SHEETS).forEach(function (name) { sheet(name); });
    var now = new Date(), token = newSessionToken(), device = String(body.device || '').slice(0, 80);
    var session = {hash: hashSession(token), email: email, created_at: now.toISOString(), last_seen: now.toISOString(),
      expires_at: new Date(now.getTime() + SESSION_DAYS * 86400000).toISOString(), device: device, revoked: false};
    sheet('sessions').appendRow(sessionValues(session));
    appendLog(email, 'login', 'new session ' + device.slice(0, 40));
    return json({ok: true, email: email, session: token, expires_at: session.expires_at});
  } finally { lock.releaseLock(); }
}

function doLogout(body, everywhere) {
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var token = String(body.session || ''), mine = SESSION_PATTERN.test(token) ? findSession(hashSession(token)) : null;
    if (!mine) return json({ok: true, revoked: 0}); // already gone: logging out is idempotent
    var revoked = 0;
    readSessions().forEach(function (s) {
      if ((everywhere ? s.email === mine.email : s.hash === mine.hash) && !s.revoked) { s.revoked = true; writeSession(s); revoked++; }
    });
    appendLog(mine.email, everywhere ? 'logout_all' : 'logout', revoked + ' sessions');
    return json({ok: true, revoked: revoked});
  } finally { lock.releaseLock(); }
}

function newSessionToken() { return (Utilities.getUuid() + Utilities.getUuid()).replace(/-/g, ''); }
function hashSession(token) { return Utilities.base64EncodeWebSafe(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, token)); }

function sessionValues(s) { return [s.hash, s.email, text(s.created_at), text(s.expires_at), text(s.last_seen), text(s.device || ''), s.revoked === true]; }

function readSessions() {
  var values = sheet('sessions').getDataRange().getValues(), out = [];
  for (var i = 1; i < values.length; i++) {
    var r = values[i];
    if (r[0]) out.push({n: i + 1, hash: String(r[0]), email: String(r[1]).toLowerCase(), created_at: iso(r[2]), expires_at: iso(r[3]), last_seen: iso(r[4]),
      device: String(r[5] === undefined ? '' : r[5]), revoked: r[6] === true || r[6] === 'TRUE'});
  }
  return out;
}

function findSession(hash) {
  var all = readSessions();
  for (var i = 0; i < all.length; i++) { if (all[i].hash === hash) return all[i]; }
  return null;
}

function writeSession(s) { sheet('sessions').getRange(s.n, 1, 1, 7).setValues([sessionValues(s)]); }

function useSession(token) {
  if (typeof token !== 'string' || !SESSION_PATTERN.test(token)) throw authError('session_expired', SESSION_EXPIRED);
  var hash = hashSession(token), found = checkSession(findSession(hash), allowedEmails(), Date.now());
  if (found.renew) {
    var lock = LockService.getScriptLock();
    lock.waitLock(10000);
    try {
      var fresh = findSession(hash); // re-read under the lock: it may have been revoked meanwhile
      checkSession(fresh, allowedEmails(), Date.now());
      var now = new Date();
      fresh.last_seen = now.toISOString(); fresh.expires_at = new Date(now.getTime() + SESSION_DAYS * 86400000).toISOString();
      writeSession(fresh);
    } finally { lock.releaseLock(); }
  }
  return found.email;
}

function allowedEmails() {
  var allowed = String(PropertiesService.getScriptProperties().getProperty('ALLOWED_EMAILS') || '').split(',').map(function (x) { return x.trim().toLowerCase(); }).filter(String);
  if (!allowed.length) throw authError('config', 'ยังไม่ได้ตั้งค่า ALLOWED_EMAILS ใน Script properties');
  return allowed;
}

function verify(idToken) {
  if (typeof idToken !== 'string' || idToken.length < 20) throw authError('auth', 'กรุณาเข้าสู่ระบบด้วย Google ก่อน');
  var clientId = PropertiesService.getScriptProperties().getProperty('GOOGLE_CLIENT_ID'), allowed = allowedEmails();
  if (!clientId) throw authError('config', 'ยังไม่ได้ตั้งค่า GOOGLE_CLIENT_ID ใน Script properties');
  var cache = CacheService.getScriptCache();
  var cacheKey = 'tok:' + Utilities.base64EncodeWebSafe(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, idToken));
  var cached = cache.get(cacheKey);
  var claims = cached ? JSON.parse(cached) : null;
  if (!claims) {
    var response = UrlFetchApp.fetch('https://oauth2.googleapis.com/tokeninfo?id_token=' + encodeURIComponent(idToken), {muteHttpExceptions: true});
    if (response.getResponseCode() !== 200) throw authError('auth', 'token ไม่ถูกต้อง กรุณาเข้าสู่ระบบใหม่');
    claims = JSON.parse(response.getContentText());
  }
  var email = checkClaims(claims, clientId, allowed, Date.now() / 1000);
  if (!cached) cache.put(cacheKey, JSON.stringify(claims), 300);
  return email;
}

/** A tab that is missing, or was created by hand and left empty, gets its header row (and starter rows). */
function sheet(name) {
  var book = SpreadsheetApp.getActiveSpreadsheet();
  var tab = book.getSheetByName(name) || book.insertSheet(name);
  if (tab.getLastRow() === 0) initTab(tab, name);
  return tab;
}

function initTab(tab, name) {
  tab.appendRow(SHEETS[name]); tab.setFrozenRows(1);
  (PLAN_SEED[name] || []).forEach(function (row) { tab.appendRow(row); });
  if (PLAN_SEED[name]) {
    try { // cosmetic only: bold header, hover notes, wider columns
      var header = tab.getRange(1, 1, 1, SHEETS[name].length);
      header.setFontWeight('bold').setBackground('#f3d6da');
      if (HEADER_NOTES[name]) header.setNotes([HEADER_NOTES[name]]);
      for (var c = 1; c <= SHEETS[name].length; c++) tab.setColumnWidth(c, name === 'แผน-วิธีใช้' ? 760 : (COLUMN_WIDTHS[name] || [])[c - 1] || 170);
    } catch (_) { /* formatting is optional */ }
  }
}

function rows(name) {
  var values = sheet(name).getDataRange().getValues();
  return values.slice(1);
}

function text(value) { return "'" + value; } // keep timestamps as exact text, never parsed by Sheets

function iso(value) { return value instanceof Date ? value.toISOString() : String(value); }

function readState() {
  var state = {marks: {}, attempts: [], settings: {}};
  rows('marks').forEach(function (r) { if (r[0]) state.marks[r[0]] = {done: r[1] === true || r[1] === 'TRUE', at: iso(r[2])}; });
  rows('attempts').forEach(function (r) {
    if (!r[0]) return;
    var answers;
    try { answers = r[8] ? JSON.parse(r[8]) : undefined; } catch (_) { answers = undefined; }
    state.attempts.push({id: String(r[1]), title: String(r[2]), score: Number(r[3]), total: Number(r[4]), date: iso(r[5]),
      elapsed_seconds: r[6] === '' ? null : Number(r[6]), timedOut: r[7] === true || r[7] === 'TRUE', answers: answers});
  });
  rows('settings').forEach(function (r) { if (SETTING_KEYS.indexOf(r[0]) >= 0) state.settings[r[0]] = {value: r[1] ? iso(r[1]).slice(0, 10) : null, at: iso(r[2])}; });
  return state;
}

function upsert(name, key, row) {
  var tab = sheet(name), keys = tab.getLastRow() > 1 ? tab.getRange(2, 1, tab.getLastRow() - 1, 1).getValues() : [];
  for (var i = 0; i < keys.length; i++) {
    if (keys[i][0] === key) { tab.getRange(i + 2, 1, 1, row.length).setValues([row]); return; }
  }
  tab.appendRow(row);
}

function writeChanges(changed, incoming, email) {
  changed.marks.forEach(function (id) { upsert('marks', id, [id, incoming.marks[id].done, text(incoming.marks[id].at), email]); });
  if (changed.attempts.length) {
    var tab = sheet('attempts');
    var values = changed.attempts.map(function (a) {
      return [attemptKey(a), a.id, a.title, a.score, a.total, text(a.date), a.elapsed_seconds === null ? '' : a.elapsed_seconds, a.timedOut, a.answers ? JSON.stringify(a.answers) : '', email];
    });
    tab.getRange(tab.getLastRow() + 1, 1, values.length, values[0].length).setValues(values);
  }
  changed.settings.forEach(function (key) { upsert('settings', key, [key, incoming.settings[key].value ? text(incoming.settings[key].value) : '', text(incoming.settings[key].at), email]); });
}

/** Sheets may turn typed dates/times into Date objects; read them back as the text the parent typed. */
function cellText(value, pattern) {
  if (value instanceof Date) return Utilities.formatDate(value, Session.getScriptTimeZone(), value.getFullYear() < 1901 ? 'HH:mm' : pattern); // a typed time alone is a Date in 1899
  return String(value === null || value === undefined ? '' : value);
}

function sheetText(name, patterns) { return rows(name).map(function (r) { return r.map(function (v, i) { return cellText(v, patterns[i] || 'yyyy-MM-dd'); }); }); }

/** Dates, activities and daily messages the parent edits by hand in the Sheet; null if the tabs cannot be read. */
function readExtras() {
  try {
    var dates = [], acts = [], mottos = [], grading = [];
    try { dates = sheetText('กำหนดการ', ['', 'yyyy-MM-dd']); } catch (_) {}
    try { acts = sheetText('กิจกรรม', ['yyyy-MM-dd', 'HH:mm', 'HH:mm']); } catch (_) {}
    try { mottos = sheetText('กำลังใจ', ['', 'yyyy-MM-dd']); } catch (_) {}
    try { grading = sheetText('เกณฑ์คะแนน', []); } catch (_) {}
    var extras = parseExtras(dates, acts, mottos, grading);
    extras.sheet = sheetLinks(['กำหนดการ', 'กิจกรรม', 'กำลังใจ', 'แผน-ช่วงเวลา', 'แผน-ตั้งค่า', 'แผน-วิชา', 'แผน-วันพิเศษ', 'แผน-คลาส']);
    return extras;
  } catch (error) { return null; }
}

/** Where the parent's tabs are, so the website can offer "open this tab" (sent only to allowed accounts). */
function sheetLinks(names) {
  try {
    var book = SpreadsheetApp.getActiveSpreadsheet(), tabs = {};
    names.forEach(function (name) { var tab = book.getSheetByName(name); if (tab) tabs[name] = tab.getSheetId(); });
    return {url: book.getUrl(), tabs: tabs};
  } catch (error) { return null; }
}

function readPlan() {
  try {
    var asText = sheetText;
    sheet('แผน-วิธีใช้');
    return parsePlan(asText('แผน-ตั้งค่า', ['', '']), asText('แผน-ช่วงเวลา', ['', 'yyyy-MM-dd', 'yyyy-MM-dd', 'HH:mm', '']), asText('แผน-คลาส', ['', '', 'HH:mm', 'yyyy-MM-dd']),
      asText('แผน-วิชา', ['', '', '', 'yyyy-MM-dd']), asText('แผน-วันพิเศษ', ['yyyy-MM-dd', '', 'HH:mm']));
  } catch (error) { return null; }
}

function appendLog(email, action, detail) { sheet('log').appendRow([text(new Date().toISOString()), email, action, text(detail)]); }

function json(data) { return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON); }
