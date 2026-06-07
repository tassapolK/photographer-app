# PhotoPro — คู่มือการติดตั้งและ Deploy

## โครงสร้างโปรเจค
```
photographer-app/
├── backend/     → Node.js + Express API
└── frontend/    → React PWA
```

---

## 1. สมัครบริการฟรีที่จำเป็น

### MongoDB Atlas (ฐานข้อมูล — ฟรี 512MB)
1. ไปที่ https://www.mongodb.com/atlas
2. สมัครและสร้าง Cluster ฟรี (M0)
3. สร้าง Database User → จำ username/password
4. Network Access → Allow 0.0.0.0/0
5. คัดลอก Connection String: `mongodb+srv://user:pass@cluster.mongodb.net/photographer-app`

### Cloudinary (เก็บรูปภาพ — ฟรี 25GB)
1. ไปที่ https://cloudinary.com
2. สมัครฟรี
3. ดู Dashboard → คัดลอก Cloud Name, API Key, API Secret

---

## 2. Deploy Backend ไปที่ Render.com

1. ไปที่ https://render.com → สมัครด้วย GitHub
2. Push โค้ด `backend/` ไปที่ GitHub repo
3. New → Web Service → เลือก repo
4. ตั้งค่า:
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Plan:** Free
5. เพิ่ม Environment Variables:
   ```
   MONGODB_URI=mongodb+srv://...
   JWT_SECRET=ใส่ random string ยาวๆ
   CLOUDINARY_CLOUD_NAME=...
   CLOUDINARY_API_KEY=...
   CLOUDINARY_API_SECRET=...
   FRONTEND_URL=https://your-app.vercel.app
   ```
6. Deploy → จด URL เช่น `https://photographer-backend.onrender.com`

> **หมายเหตุ:** Render Free tier จะ sleep หลังจาก 15 นาทีไม่มีใช้งาน
> ครั้งแรกที่เรียกอาจช้า 30-60 วินาที

---

## 3. Deploy Frontend ไปที่ Vercel

1. ไปที่ https://vercel.com → สมัครด้วย GitHub
2. Push โค้ด `frontend/` ไปที่ GitHub repo
3. Import Project
4. เพิ่ม Environment Variable:
   ```
   VITE_API_URL=https://photographer-backend.onrender.com/api
   ```
5. Deploy → ได้ URL เช่น `https://photographer-app.vercel.app`
6. กลับไปที่ Render แก้ `FRONTEND_URL` ให้ตรง

---

## 4. รัน Local (สำหรับทดสอบ)

```bash
# Backend
cd backend
cp .env.example .env
# แก้ไข .env ใส่ค่าจริง
npm install
npm run dev   # port 5000

# Frontend
cd frontend
cp .env.example .env.local
# แก้ VITE_API_URL=http://localhost:5000/api
npm install
npm run dev   # port 5173
```

---

## การใช้งาน

### ช่างภาพ
1. เปิด URL → สมัครสมาชิก / เข้าสู่ระบบ
2. สร้าง Event ใหม่ (ชื่องาน, วันที่)
3. อัพโหลดรูป (รองรับหลายรูปพร้อมกัน สูงสุดครั้งละ 50 รูป)
4. กดไอคอน QR → ดาวน์โหลด QR Code ให้ลูกค้าสแกน

### ลูกค้า
1. สแกน QR Code → เปิดกล้อง Gallery
2. เห็นรูปทั้งหมดใน Event
3. กด **"ค้นหารูปตัวเอง"** → สแกนใบหน้า → กรองเฉพาะรูปที่มีตัวเอง
4. เลือกรูปที่ต้องการ หรือดาวน์โหลดทั้งหมด
5. iOS: ดาวน์โหลดเป็น ZIP หรือกดค้างที่รูปเพื่อบันทึก
6. Android: ดาวน์โหลดตรงได้เลย

---

## PWA (ติดตั้งเป็นแอปบนมือถือ)
- **iOS Safari:** แตะ Share → Add to Home Screen
- **Android Chrome:** แตะเมนู → Add to Home Screen / Install App

---

## Tech Stack
| Component | Service | Plan |
|-----------|---------|------|
| Backend | Render.com | Free |
| Frontend | Vercel | Free |
| Database | MongoDB Atlas | Free (512MB) |
| Image Storage | Cloudinary | Free (25GB) |
| Face Detection | face-api.js | Open Source |
