# PhotoPro — Photographer Photo Management App

ระบบจัดการรูปภาพสำหรับช่างภาพ พร้อมสแกนใบหน้า + QR Code ให้ลูกค้าดาวน์โหลด

## Features ✨

- **ช่างภาพ**: สร้าง Event → อัพโหลดรูป → สร้าง QR Code
- **ลูกค้า**: สแกน QR → ดูรูปทั้งหมด → สแกนใบหน้าเพื่อดูเฉพาะรูปตัวเอง
- **Face Detection**: ใช้ face-api.js (ทำงานเบราว์เซอร์)
- **Download**: เลือกรูป → ดาวน์โหลดแบบ ZIP (iOS + Android)
- **PWA**: ติดตั้งเป็นแอปบนมือถือ

## Tech Stack

| Layer | Tech | Hosting |
|-------|------|---------|
| Frontend | React + Vite + Tailwind | Vercel |
| Backend | Node.js + Express | Render.com |
| Database | MongoDB Atlas | ฟรี 512MB |
| Storage | Cloudinary | ฟรี 25GB |

## Quick Deploy 🚀

### 1. Push to GitHub

```bash
cd photographer-app
git add .
git commit -m "Initial PhotoPro app"
git remote add origin https://github.com/YOUR_USERNAME/photographer-app.git
git branch -M main
git push -u origin main
```

### 2. Deploy Frontend → Vercel

1. ไปที่ https://vercel.com
2. Import project → เลือก `photographer-app` repo
3. เลือก root → `frontend`
4. Environment Variable: `VITE_API_URL=https://your-backend.onrender.com/api`
5. Deploy ✅

### 3. Deploy Backend → Render.com

1. ไปที่ https://render.com
2. New Web Service → เลือก repo
3. Settings:
   - **Name:** photographer-backend
   - **Root Directory:** `backend`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Plan:** Free

4. Environment Variables:
```env
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/photographer-app?retryWrites=true&w=majority
JWT_SECRET=your_secret_key_here
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
FRONTEND_URL=https://your-app.vercel.app
NODE_ENV=production
```

5. Deploy ✅

### 4. Setup Services (ฟรี)

#### MongoDB Atlas
- สมัครที่ https://www.mongodb.com/atlas
- สร้าง Cluster ฟรี (M0)
- Network Access: `0.0.0.0/0`
- Database User: คัดลอก Connection String

#### Cloudinary
- สมัครที่ https://cloudinary.com
- Dashboard → Cloud Name, API Key, Secret

## Local Development 💻

```bash
# Backend
cd backend
cp .env.example .env
# แก้ไข .env ใส่ MongoDB + Cloudinary
npm install
npm run dev  # port 5000

# Frontend (tab ใหม่)
cd frontend
cp .env.example .env.local
# แก้ VITE_API_URL=http://localhost:5000/api
npm install
npm run dev  # port 5173
```

## Usage Guide

### สำหรับช่างภาพ
1. สมัครสมาชิก / เข้าสู่ระบบ
2. สร้าง Event (ชื่องาน, วันที่)
3. อัพโหลดรูป (สูงสุด 50 รูปต่อครั้ง)
4. กดไอคอน QR → ดาวน์โหลด QR Code ให้ลูกค้าสแกน

### สำหรับลูกค้า
1. สแกน QR Code ด้วยกล้องมือถือ
2. เห็นรูปทั้งหมด + กดเลือก
3. **"ค้นหารูปตัวเอง"** → สแกนใบหน้า → กรองเฉพาะรูปที่มีตัวเอง
4. ดาวน์โหลดรูปที่เลือก (หรือทั้งหมด ZIP)
5. iOS: บันทึกลง Photos
6. Android: ดาวน์โหลดตรงได้เลย

## File Structure

```
photographer-app/
├── frontend/
│   ├── src/
│   │   ├── pages/          ← UI หลัก
│   │   ├── components/
│   │   ├── hooks/
│   │   └── utils/
│   ├── package.json
│   └── vite.config.js
├── backend/
│   ├── src/
│   │   ├── index.js        ← Real backend (MongoDB)
│   │   ├── index-mock.js   ← Mock backend (ไม่ต้อง DB)
│   │   ├── routes/
│   │   ├── models/
│   │   └── middleware/
│   ├── package.json
│   └── .env.example
├── SETUP.md                ← Setup guide
└── README.md               ← This file
```

## Testing

### ทดสอบ Backend Health
```bash
curl http://localhost:5000/health
```

### ทดสอบ Register
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","email":"test@test.com","password":"test123"}'
```

## Troubleshooting

### Backend connection error
- ตรวจสอบ MongoDB Connection String ใน `.env`
- ตรวจสอบ Network Access ใน MongoDB Atlas (0.0.0.0/0)
- ตรวจสอบ Cloudinary API keys

### Face detection ช้า
- ครั้งแรกต้อง download models (~30MB) ใช้เวลา
- ครั้งถัดไปจะอยู่ใน browser cache

### Vercel deploy ล้มเหลว
- ตรวจสอบ `VITE_API_URL` environment variable
- ตรวจสอบ CORS ใน backend

## License

MIT - Free to use
