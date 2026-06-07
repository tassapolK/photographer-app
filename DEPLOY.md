# Deploy Guide — PhotoPro to Production

ขั้นตอนทีละขั้นเพื่ออัพ PhotoPro ไปใช้งานจริง

---

## Phase 1: GitHub 📤

### 1.1 สร้าง GitHub Repository

1. ไปที่ https://github.com/new
2. ตั้งชื่อ `photographer-app`
3. เลือก **Public** (ถ้าอยากให้ทุกคนเห็น)
4. **Create repository** ✅

### 1.2 Push Code ขึ้น GitHub

```bash
cd "D:\ERP INVENTORY\photographer-app"

# สามารถ Add GitHub CLI token หรือ SSH key
# หรือใช้ HTTPS + personal access token

git add .
git commit -m "Initial PhotoPro - Photographer app with face detection"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/photographer-app.git
git push -u origin main
```

> ✅ Code อยู่ GitHub แล้ว

---

## Phase 2: Setup Services (ฟรี) ☁️

### 2.1 MongoDB Atlas

**ทำสิ่งที่เคยตั้งค่าแล้วจากรูป:**

1. ไปที่ https://cloud.mongodb.com/v2/dashboard
2. ไปที่ Cluster → Connect
3. Network Access → Add IP 0.0.0.0/0
4. Database Access → Copy Connection String
   ```
   mongodb+srv://user:password@cluster0.xxxxx.mongodb.net/photographer-app?retryWrites=true&w=majority
   ```

### 2.2 Cloudinary

1. ไปที่ https://cloudinary.com/console
2. Dashboard → ดู:
   - Cloud Name
   - API Key
   - API Secret

### 2.3 JWT Secret

สร้าง random string ยาวๆ (Copy 1 ใน 3 นี้):
```
photopro_prod_secret_key_2024_abc123xyz_very_long_string
```

---

## Phase 3: Deploy Frontend → Vercel 🚀

### 3.1 Sign in to Vercel

1. ไปที่ https://vercel.com/dashboard
2. Sign in with GitHub (connect account)

### 3.2 Import Project

1. **+ Add New** → **Project**
2. **Import Git Repository** → เลือก `photographer-app`
3. ตรวจสอบให้เรียบร้อย → **Import** ✅

### 3.3 Configure Build

**Root Directory:** frontend

**Environment Variables (เพิ่ม):**
```
VITE_API_URL = https://photographer-backend.onrender.com/api
```

> ⏳ ตอนนี้ใส่ URL temporer ก่อน จะแก้หลังจาก Render deploy

### 3.4 Deploy

กด **Deploy** → รอ 2-5 นาที → ✅ บันทึก URL เช่น:
```
https://photographer-app-seven.vercel.app
```

---

## Phase 4: Deploy Backend → Render.com 🛠️

### 4.1 Sign in to Render

1. ไปที่ https://render.com/dashboard
2. Sign in with GitHub

### 4.2 Create Web Service

1. **New +** → **Web Service**
2. **Connect GitHub account**
3. เลือก `photographer-app` repository
4. **Connect** ✅

### 4.3 Configure Service

| Setting | Value |
|---------|-------|
| **Name** | photographer-backend |
| **Environment** | Node |
| **Build Command** | `npm install` |
| **Start Command** | `npm start` |
| **Root Directory** | `backend` |
| **Plan** | Free |

### 4.4 Environment Variables

เพิ่ม 7 ตัวแปร:

| Key | Value |
|-----|-------|
| `MONGODB_URI` | `mongodb+srv://user:password@cluster0.xxxxx.mongodb.net/photographer-app?retryWrites=true&w=majority` |
| `JWT_SECRET` | `photopro_prod_secret_key_2024_xxx...` |
| `CLOUDINARY_CLOUD_NAME` | จาก Cloudinary Dashboard |
| `CLOUDINARY_API_KEY` | จาก Cloudinary Dashboard |
| `CLOUDINARY_API_SECRET` | จาก Cloudinary Dashboard |
| `FRONTEND_URL` | `https://photographer-app-seven.vercel.app` (จากขั้นตอน 3.4) |
| `NODE_ENV` | `production` |

**Save** ✅

### 4.5 Deploy & Wait

Render จะ:
1. Pull code จาก GitHub
2. Install dependencies
3. Start server

รอ 5-10 นาที → บันทึก URL เช่น:
```
https://photographer-backend.onrender.com
```

> ⚠️ **Render Free Tier**: Sleep หลังจาก 15 นาที ไม่มีใช้ → ครั้งแรก 30-60 วินาทีค่อนข้างช้า

### 4.6 Update Vercel Frontend URL

1. ไปที่ Vercel Dashboard → photographer-app
2. **Settings** → **Environment Variables**
3. แก้ `VITE_API_URL` → `https://photographer-backend.onrender.com/api`
4. **Save** → **Redeploy** ✅

---

## Phase 5: Test Everything ✅

### 5.1 Health Check

```bash
curl https://photographer-backend.onrender.com/health
# Response: {"status":"ok"}
```

### 5.2 Register Test Account

```bash
curl -X POST https://photographer-backend.onrender.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"TestPhotographer","email":"test@photo.com","password":"test123456"}'
```

### 5.3 Open Frontend

ไปที่ `https://photographer-app-seven.vercel.app` (URL จำเป็นต้องเปลี่ยน)

### 5.4 Full Flow Test

1. **Register** ช่างภาพ
2. **Create Event** ใหม่
3. **Upload photos** (เลือกไฟล์ local)
4. **Generate QR Code** → ดาวน์โหลด
5. **Open QR Link** → เห็น Gallery
6. **Test Face Scan** (ถ้า GPU มี)
7. **Download photos** (ZIP)

---

## Phase 6: Maintenance 🔧

### Logs

**Backend logs (Render):**
- ไปที่ Render Dashboard → photographer-backend → **Logs**

**Frontend logs (Vercel):**
- ไปที่ Vercel Dashboard → photographer-app → **Deployments**

### Update Code

```bash
# Local
git add .
git commit -m "Update feature"
git push origin main

# Vercel + Render จะ auto-redeploy
```

### Database Admin

MongoDB Compass:
```bash
# ใช้ Connection String จาก MongoDB Atlas
# ดึงข้อมูลตรงจาก DB ได้
```

---

## Costs 💰

| Service | Plan | Cost |
|---------|------|------|
| Vercel | Pro | **$20/month** (ปกติได้ free สำหรับ hobby projects) |
| Render | Free Web Service | **FREE** (อาจช้า) |
| MongoDB Atlas | Free (512MB) | **FREE** |
| Cloudinary | Free (25GB) | **FREE** |
| **Total** | | **~$20/month หรือ FREE** |

> 💡 Vercel free tier ใช้ได้เหมือนกัน สำหรับ projects เล็ก

---

## Troubleshooting 🐛

### Vercel shows 404
- ตรวจสอบ Root Directory = `frontend`
- ตรวจสอบ environment variable `VITE_API_URL`

### Backend shows MongoDB error
- ตรวจสอบ Connection String ถูกต้อง
- ตรวจสอบ MongoDB IP Whitelist (0.0.0.0/0)
- ตรวจสอบ database user password

### Face detection ใช้ไม่ได้
- ล้างเบราว์เซอร์ cache
- ลองใน Incognito mode
- ตรวจสอบ browser รองรับ WebGL

### Upload slow/timeout
- เช็คขนาดไฟล์ (max 20MB/file)
- Cloudinary free tier มี monthly limit
- ลองรัน local ก่อนดู speed

---

## Next Steps 🎯

1. ✅ Code พร้อม
2. ✅ GitHub
3. ✅ Services setup (MongoDB, Cloudinary)
4. ✅ Deploy Vercel + Render
5. ✅ Test
6. 🎉 **Go Live!**

---

## Support & Issues

- 📚 Doc: ดู `README.md`
- 🔧 Setup: ดู `SETUP.md`
- 🐛 Bugs: เช็ค logs ใน Vercel/Render dashboard
- 💬 Questions: GitHub Issues

**Happy Deploying!** 🚀
