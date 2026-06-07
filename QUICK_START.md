# Quick Start — Deploy PhotoPro in 10 Minutes

**Goal:** ขึ้น Production ได้ใช้งานจริง

---

## Prerequisites ✅

- GitHub Account (ฟรี) → https://github.com
- Vercel Account (ฟรี) → https://vercel.com
- Render Account (ฟรี) → https://render.com
- MongoDB Atlas Account (ฟรี) → https://mongodb.com/atlas
- Cloudinary Account (ฟรี) → https://cloudinary.com

---

## Step 1: GitHub Push (2 min) 📤

### 1.1 สร้าง Repository

https://github.com/new
- ชื่อ: `photographer-app`
- Description: "Photographer photo management with face detection"
- Public ✅

### 1.2 Push Code

```bash
cd "D:\ERP INVENTORY\photographer-app"

git remote add origin https://github.com/YOUR_USERNAME/photographer-app.git
git branch -M main
git push -u origin main
```

✅ Code ขึ้น GitHub แล้ว

---

## Step 2: Setup Services (2 min) 🔑

### 2.1 MongoDB Connection String

1. https://cloud.mongodb.com → Cluster → Connect
2. Network Access → IP Whitelist: `0.0.0.0/0`
3. Database Users → Copy Connection String
   ```
   mongodb+srv://user:password@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```

### 2.2 Cloudinary Keys

https://cloudinary.com/console
- Cloud Name ✅
- API Key ✅
- API Secret ✅

### 2.3 JWT Secret

สร้าง random string (copy ไปใช้):
```
photopro_secret_2024_production_key_xyz123abc
```

---

## Step 3: Deploy Frontend → Vercel (3 min) 🚀

1. https://vercel.com/new
2. **Import Git Repository** → เลือก `photographer-app`
3. **Framework:** Auto-detected (Vite)
4. **Root Directory:** `frontend`
5. **Environment Variable:**
   ```
   VITE_API_URL = https://photographer-backend.onrender.com/api
   ```
   > (อัพเดตหลังจาก Step 4)
6. **Deploy** ✅
7. บันทึก URL: `https://your-app.vercel.app`

---

## Step 4: Deploy Backend → Render (3 min) 🛠️

1. https://render.com/dashboard → **New** → **Web Service**
2. เลือก `photographer-app` repository
3. ตั้งค่า:
   - Name: `photographer-backend`
   - Root Directory: `backend`
   - Build Command: `npm install`
   - Start Command: `npm start`
   - Plan: **Free**
4. **Environment Variables** (Add All):
   ```
   MONGODB_URI = mongodb+srv://user:password@cluster0.xxxxx.mongodb.net/photographer-app?retryWrites=true&w=majority
   JWT_SECRET = photopro_secret_2024_production_key_xyz123abc
   CLOUDINARY_CLOUD_NAME = your_cloud_name
   CLOUDINARY_API_KEY = your_api_key
   CLOUDINARY_API_SECRET = your_api_secret
   FRONTEND_URL = https://your-app.vercel.app
   NODE_ENV = production
   ```
5. **Create Web Service** → รอ 5-10 นาที ✅
6. บันทึก URL: `https://photographer-backend.onrender.com`

---

## Step 5: Update Vercel (1 min) 🔗

1. https://vercel.com → photographer-app → **Settings**
2. **Environment Variables** → แก้ `VITE_API_URL`
   ```
   VITE_API_URL = https://photographer-backend.onrender.com/api
   ```
3. **Redeploy** ✅

---

## Step 6: Test ✅

### 6.1 Backend Health
```bash
curl https://photographer-backend.onrender.com/health
```

### 6.2 Open App
https://your-app.vercel.app

### 6.3 Test Flow
1. **Register** ช่างภาพ
2. **Create Event**
3. **Upload photos**
4. **Generate QR Code** → Download
5. **Open Gallery** (สแกน QR)
6. **Download photos** (ZIP)

✅ ทั้งหมดทำได้ → Success!

---

## URLs ที่ได้

```
Frontend:  https://your-app.vercel.app
Backend:   https://photographer-backend.onrender.com
Database:  MongoDB Atlas (cloud.mongodb.com)
Storage:   Cloudinary (cloudinary.com)
```

---

## Troubleshooting 🐛

| Problem | Solution |
|---------|----------|
| **Vercel shows 404** | ตรวจสอบ Root Directory = `frontend` |
| **Backend error** | ตรวจสอบ MongoDB Connection String + IP Whitelist |
| **Upload ล้มเหลว** | ตรวจสอบ Cloudinary API keys |
| **Slow ครั้งแรก** | Render Free tier sleep → ตรวจสอบ logs |

---

## Next: Monitoring & Maintenance 📊

- **Backend Logs:** https://render.com/dashboard
- **Frontend Logs:** https://vercel.com/dashboard
- **Database:** https://cloud.mongodb.com
- **Storage:** https://cloudinary.com/console

---

## Support

📚 **Full Docs:**
- README.md — Overview
- SETUP.md — Local development
- DEPLOY.md — Detailed deployment

🐛 **Debug Tips:**
- Check backend health: `curl /health`
- Check browser console (F12)
- Check Render/Vercel logs
- Try incognito mode

---

## 🎉 Done!

App สด พร้อมให้ลูกค้าใช้งานจริง

**Next steps:**
1. ชวนช่างภาพสมัครสมาชิก
2. อัพโหลดรูปจากงาน
3. แชร์ QR Code ให้ลูกค้า
4. ลูกค้าดาวน์โหลดรูปจากมือถือ

---

Happy Deploying! 🚀
