# ระบบประกันคุณภาพการศึกษา · วิทยาลัยพยาบาลกองทัพเรือ (QA 2570)

เว็บไซต์รวม **Dashboard + แผนการดำเนินงาน Gantt + คลังหลักฐาน** ประจำปี **ต.ค. 2569–ก.ย. 2570** พร้อมโลโก้สถาบัน, การ์ดสรุป, ตัวกรอง, มุมมอง Gantt/ตาราง/รายการ และแบบฟอร์มเพิ่มหรือแก้ไขกิจกรรม

## UX/UI

- **Sarabun** ภาษาไทย/อังกฤษ ทั้งระบบ โหลดจาก Google Fonts CDN (ไม่แนบไฟล์ฟอนต์)
- ขนาด: Desktop หัวข้อ 30–32px / เนื้อหา 17px / ปุ่มและตัวกรอง 15–16px; Tablet หัวข้อ 27px; Mobile หัวข้อ 24px / เนื้อหา 16px
- สีสถาบัน: กรมท่า–ส้ม, สมศ. = น้ำเงิน, EdPEx = ส้ม, สภาการพยาบาล = เขียว, AUN-QA = ม่วง
- รองรับ PC/Tablet/Mobile; Gantt เลื่อนแนวนอนเฉพาะพื้นที่กราฟ
- รายการหลักชื่อย่อ; คลิกดูรายละเอียด วันที่ ผู้รับผิดชอบ สถานะ และเอกสาร

## ข้อมูลเริ่มต้น

มี **21 กิจกรรม** ตรงตามตารางที่ผู้ใช้งานให้ (สมศ. 13 / EdPEx 8) รวมรายละเอียด วันเริ่มและสิ้นสุด ผู้รับผิดชอบ สภาการพยาบาลและ AUN-QA เพิ่มเป็นหมวดว่างรอใช้ในอนาคต ไม่ใส่กิจกรรมสมมติลงในสองหมวดนี้

## ไฟล์สำคัญ

| ไฟล์ | หน้าที่ |
|---|---|
| `index.html` | หน้าเว็บไซต์และโลโก้ |
| `styles.css` | ธีม Sarabun, 3 breakpoints, Gantt UI |
| `app.js` | UI, filtering, dialogs, actions |
| `assets/rtncn-logo.png` | โลโก้จากธีมต้นฉบับ |
| `data/activities.json` | กิจกรรมตั้งต้นและเอกสารแนบหลังบันทึก |
| `api/*.js` | Vercel serverless endpoints |
| `lib/storage.js` | อ่าน/บันทึกข้อมูลบน GitHub |
| `vercel.json` | การตั้งค่า Vercel |
| `.env.example` | ชื่อตัวแปรระบบ (ไม่มี Token จริง) |

## อัปโหลด GitHub

1. สร้าง Repository ชื่อ `qa70-rtncn` ในบัญชีที่ต้องการ (Public/Private ตามนโยบาย)
2. แตก ZIP แล้วเปิด Terminal/PowerShell ภายใน **โฟลเดอร์** `qa70-rtncn-sarabun`
3. คำสั่ง:

```bash
git init
git add .
git commit -m "QA 2570 Sarabun responsive site"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/qa70-rtncn.git
git push -u origin main
```

ไฟล์ ZIP มีโปรเจกต์ครบถ้วน นำขึ้น GitHub ผ่าน **Add file → Upload files** ได้เช่นกัน โดยเลือก **เนื้อหาภายในโฟลเดอร์** ไม่ใช่ ZIP ไฟล์เพียงไฟล์เดียว

## Deploy ไป Vercel (สำหรับการบันทึกข้อมูลจริง)

1. Vercel → **Add New → Project** → Import Git Repository ที่สร้าง
2. Framework Preset: **Other**; Root Directory: `./`
3. สร้าง GitHub **Fine-grained Personal Access Token** โดยให้สิทธิ์ `Contents: Read and Write` **เฉพาะ Repository นี้**
4. เพิ่ม Environment Variables ใน Vercel Project Settings:

```env
ADMIN_PIN=12345
GITHUB_TOKEN=<GitHub Token - keep private>
GITHUB_OWNER=YOUR_USERNAME
GITHUB_REPO=qa70-rtncn
GITHUB_BRANCH=main
```

5. Redeploy หลังตั้งค่า Environment Variables เมื่อสำเร็จเว็บจะอ่านและเขียนข้อมูลผ่าน GitHub API โดย API จะตรวจสอบ PIN **บนเซิร์ฟเวอร์** ไม่ใช่เฉพาะฝั่งหน้าเว็บ

> **หมายเหตุความปลอดภัย:** `12345` เป็นรหัสที่เดาง่าย เพราะเป็นตัวเลขที่ผู้ใช้ระบุ หากเปิดเว็บสาธารณะควรเปลี่ยนเป็นรหัสที่แข็งแรงขึ้นก่อนใช้งานจริง, เพิ่ม Rate Limiting ระดับ Edge และระบบบัญชีผู้ใช้ในระยะถัดไป ระบบนี้ยังไม่มีการระบุตัวตน/แยกสิทธิ์ผู้ใช้งาน และไม่เหมาะกับเอกสารที่มีข้อมูลผู้ป่วยหรือข้อมูลส่วนบุคคลอ่อนไหว

## ไฟล์เอกสารแนบและ Google Drive

- **คลังหลักฐาน**: ลิงก์ไปยัง Google Drive หลักและโฟลเดอร์ย่อยเดิม (สมศ., EdPEx, สภาการพยาบาล); AUN-QA ยังไม่กำหนดโฟลเดอร์
- **เอกสารแนบรายกิจกรรม**: สามารถเพิ่ม/แก้ไขชื่อ/แทนที่/ลบเอกสาร หรือเพิ่มลิงก์ Google Drive ด้วย PIN
- เมื่อ Vercel API ตั้งค่าครบ **ไฟล์ที่อัปโหลดขนาดไม่เกิน 2 MB** จะเก็บเป็นไฟล์ใน GitHub Repository ใต้ `data/evidence/` ไม่ใช่อัปโหลดเข้า Google Drive โดยตรง
- สำหรับไฟล์เกิน 2 MB แนะนำอัปโหลดไว้ใน Google Drive แล้วกด **เพิ่มลิงก์เอกสาร** ในกิจกรรมนั้น (บันทึกลง GitHub แบบส่วนกลาง)
- การเข้าถึงลิงก์ Drive ต้องมีสิทธิ์อ่านไฟล์ตามการแชร์จริงของ Google Drive
- หากต้องการอัปโหลดไฟล์ตรงเข้า Google Drive และกำหนดสิทธิ์รายบุคคล จะต้องพัฒนา Google OAuth / Google Drive API เพิ่ม

**คำเตือน:** การลบเอกสารจากหน้าเว็บจะลบการอ้างอิง และระบบจะพยายามลบไฟล์ปัจจุบัน แต่ประวัติ Git ของ Repository สามารถเก็บไฟล์เวอร์ชันก่อนหน้าไว้ได้ จึงไม่ควรเก็บเอกสารลับ/ข้อมูลสุขภาพใน GitHub แบบนี้

## Demo เทียบกับ Live

- เปิด `index.html` ในเครื่อง หรือ Deploy บน **GitHub Pages**: ใช้งานหน้าจอและทดลองฟังก์ชันได้ แต่ข้อมูลเพิ่ม/แก้ไขจะไม่ถูกบันทึกถาวร (โหมด Preview)
- Deploy บน **Vercel** โดยตั้งค่า Environment Variables ถูกต้อง: เพิ่ม/แก้ไข/บันทึกข้อมูลจริงผ่าน GitHub Repository ทำให้ข้อมูลส่วนกลางตรงกันทุกเครื่อง
- ถ้า Vercel ยังไม่ตั้งค่าตัวแปร ระบบจะอยู่ใน Preview และมีข้อความแจ้งท้าย Gantt

## การทดลองในเครื่อง

ต้องมี Node.js 20+ ไม่มี dependency ที่ต้องติดตั้ง

```bash
npm run dev
# เปิด http://127.0.0.1:3000
npm test
```

Font ใช้การโหลดผ่าน Google Fonts ดังนั้นเครื่องที่บล็อก CDN จะใช้ฟอนต์สำรอง
