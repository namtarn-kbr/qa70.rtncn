# QA 2570 – ฐานข้อมูล Google Sheets / หลักฐาน Google Drive

เว็บไซต์: https://namtarn-qa70-rtncn.vercel.app

ฐานข้อมูล: https://docs.google.com/spreadsheets/d/1eHfeDHKDOvxD4usf4rlkDH_NXwG5v0UFfCPPqiSu-6c/edit

## สถานะการเชื่อมต่อ

ซอร์สโค้ดรองรับ Google Sheets API แล้ว แต่ **ระบบจะใช้ข้อมูลตัวอย่าง 21 กิจกรรมชั่วคราวจนกว่า Google Cloud Service Account จะได้รับอนุญาต** และมีการตั้งค่า Environment Variables ทั้งหมดบน Vercel

## โครงสร้างฐานข้อมูล

- `Plans`: แผน 4 ประเภท สี และลิงก์โฟลเดอร์
- `Activities`: ชื่อกิจกรรม รายละเอียด วันเริ่ม/สิ้นสุด ผู้รับผิดชอบ สถานะ รหัสกิจกรรม
- `Attachments`: รหัสกิจกรรม ชื่อเอกสาร และ HTTPS Google Drive URL เท่านั้น ไม่อัปโหลดไบนารี
- `Audit_Log`: ประวัติการเพิ่ม/แก้ไขกิจกรรม และลิงก์เอกสาร

ระบบจะอ่านกิจกรรมและเอกสารแนบจาก Google Sheets เมื่อเปิดหน้าเว็บ โดยอัปเดตผ่าน Vercel API หลังได้รับการยืนยันรหัสผ่าน

## การเปิดใช้งาน Google Cloud

1. เปิด https://console.cloud.google.com และเลือกหรือสร้าง Google Cloud Project ของหน่วยงาน
2. เปิด APIs & Services → Library → เปิด **Google Sheets API**
3. ไปที่ IAM & Admin → Service Accounts → Create service account (เช่น `qa70-sheets-access`)
4. สร้าง JSON key ของ Service Account **ภายใต้การควบคุมของผู้ดูแล** (หากนโยบายองค์กรอนุญาต) และจัดเก็บอย่างปลอดภัย
5. เปิด Google Sheets ฐานข้อมูล กด Share และเพิ่มอีเมล Service Account (`...@...iam.gserviceaccount.com`) เป็น **Editor** เฉพาะชีตนี้ ไม่ต้องแชร์สาธารณะ

> หาก Google Cloud ของหน่วยงานห้ามสร้าง Service Account keys ควรพิจารณา Workload Identity Federation / โซลูชันไร้กุญแจแทน และปรับส่วนยืนยันตัวตนใน API ก่อนใช้งาน

## Vercel Environment Variables

Project → Settings → Environment Variables:

- `GOOGLE_SHEET_ID`: ID ของไฟล์ชีต (เป็นค่าที่ไม่เป็นความลับ ตั้งไว้แล้ว)
- `GOOGLE_CLIENT_EMAIL`: ค่า `client_email` จาก JSON key
- `GOOGLE_PRIVATE_KEY`: ค่า `private_key` จาก JSON key (**Secret**, เก็บใน Vercel เท่านั้น; รองรับทั้ง newline จริงและ escaped `\n`)
- `EDIT_PIN`: รหัสสำหรับแก้ไขข้อมูล (ตั้งค่าไว้แล้วในโปรเจกต์นี้)

เพิ่มค่า Secret ใน Vercel เอง ไม่ส่ง Private Key เข้าห้องสนทนา ไม่ commit หรือวางใน HTML / JavaScript ฝั่งเบราว์เซอร์

ตั้งค่าครบแล้ว Deploy ใหม่ และทดสอบ `GET /api/activities` ว่าส่ง `persistent: true` และ 21 กิจกรรม จากนั้นลองเพิ่มกิจกรรมทดสอบและตรวจใน Sheets

## ข้อจำกัด / ความปลอดภัย

- เว็บไซต์เปิดให้อ่านได้ แต่การแก้ไขต้องใช้ PIN ซึ่งยังไม่ใช่ระบบบัญชีผู้ใช้รายบุคคล
- `Audit_Log.Actor` จึงระบุได้แค่ผู้ดูแลผ่านรหัส ไม่ใช่ชื่อคนจริง
- การเขียน Google Sheets ไม่ใช่ธุรกรรมฐานข้อมูลแบบ atomic; หากหลายคนแก้ไขพร้อมกันควรเพิ่มกลไกป้องกันความขัดแย้ง
- ต้องกำหนดสิทธิ์ Google Drive ของแต่ละไฟล์ตามนโยบายหน่วยงาน การมีลิงก์ไม่เท่ากับมีสิทธิ์เปิดดู
- ไม่มีการจัดเก็บไฟล์ไบนารีใน GitHub หรือ Google Sheets; ผู้ดูแลอัปโหลดไฟล์ไป Drive ก่อนแล้วเพิ่มลิงก์ในเว็บไซต์
