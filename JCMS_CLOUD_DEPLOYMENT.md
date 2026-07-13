# Jain Courier Management System (JCMS) Cloud Deployment Guide

Bhai, is guide ko follow karke aap apni website ko Amazon ki tarah ek **permanent public URL** par live kar sakte hain. Iske baad aapko local Wi-Fi, computer on rakhne, ya kisi terminal command ki zaroorat nahi padegi. Aapka staff direct ek single URL se mobile ya laptop par scan kar sakega.

---

## Step 1: Free Online Database Setup (MongoDB Atlas)
Aapka data (manifests, scans, users) hamesha ke liye cloud par safe aur persistent rahega.

1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas/register) aur free account banayein.
2. Ek **Free Shared Cluster (M0)** select karein aur create karein.
3. Database access user banayein (Jaise username: `jain_admin` and password: `JainPassword2026`).
4. Network Access mein click karke **"Allow access from anywhere" (IP `0.0.0.0/0`)** add karein.
5. "Database" section mein jaakar **"Connect"** par click karein -> **"Drivers"** select karein.
6. Aapko ek connection string (URI) milegi, jaise:
   `mongodb+srv://jain_admin:JainPassword2026@cluster0.xxxxx.mongodb.net/jcms?retryWrites=true&w=majority`
   *(Ise copy karke save kar lein).*

---

## Step 2: Push Code to GitHub
Aapka project files (Code) internet par save ho jayenge taaki hosting platform use fetch kar sake.

1. Go to [GitHub](https://github.com/) aur sign up / login karein.
2. Ek naya private/public repository banayein jiska naam rakhein: `courier-scanner`
3. Apne computer par project directory ke andar jaakar Git Command Prompt (ya terminal) open karein aur ye commands run karein:
   ```bash
   # Initialize repository
   git init

   # Add all files (node_modules aur db files auto-excluded hain)
   git add .

   # Commit
   git commit -m "Initial commit for cloud deployment"

   # Link to your GitHub repository (apne URL se replace karein)
   git remote add origin https://github.com/APNA-USERNAME/courier-scanner.git

   # Push code
   git push -u origin main
   ```

---

## Step 3: Expose/Host App on Render.com (Bilkul Free)
Render aapke code ko fetch karke use automatic ek public web service mein deploy kar dega.

1. Go to [Render.com](https://render.com/) aur GitHub account ke sath login karein.
2. Dashboard par click karein **"New" -> "Web Service"**.
3. Apne repository `courier-scanner` ko link/select karein.
4. Settings page par details enter karein:
   *   **Name**: `jain-courier` (ya jo aap chahein)
   *   **Language**: `Node`
   *   **Build Command**: `npm install && npm run build` (agar package root project me setup hai)
       *   *Note: Hamara start script backend folder ke andar chalega.*
       *   *Root package build configuration:*
           *   **Root Directory**: `backend` (इसे Settings page par "Root Directory" option mein `backend` set kar dein).
           *   **Build Command**: `npm install`
           *   **Start Command**: `node server.js`
5. **Environment Variables** section par click karein aur ye teen settings add karein:
   *   `PORT` = `10000` (Render default is ports dynamically handle karta hai)
   *   `MONGODB_URI` = `mongodb+srv://jain_admin:JainPassword2026@cluster0.xxxxx.mongodb.net/jcms?retryWrites=true&w=majority` *(Step 1 wali apni connection string dalein)*
   *   `JWT_SECRET` = `JainCourierSecureSecret2026` *(Kuch bhi strong code likh dein)*
   *   `OWNER_EMAIL` = `mansijain10503@gmail.com`
   *   `OWNER_PASSWORD` = `Jaincourier@123`
6. Click karein **"Deploy Web Service"**!

---

## 🎉 Done!
Render aapka project build karke deploy kar dega aur aapko ek link mil jayegi:
👉 **`https://jain-courier.onrender.com`**

Aap aur aapka staff is link ko pure internet par kahin se bhi access kar sakte hain. Aapki login credentials lock rahengi:
*   **Email**: `mansijain10503@gmail.com`
*   **Password**: `Jaincourier@123`

---

*Agar aapko kisi bhi step mein problem aaye, toh mujhe batayein, main continuous help karunga!*
