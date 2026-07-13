# JCMS Courier Scanner - Production Deployment Guide

Follow this step-by-step guide to move your application to the cloud so it runs 24/7 on a secure domain for free, accessible from any mobile or laptop worldwide!

---

## Part 1: MongoDB Atlas Free Cloud Database Setup

1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) and register a free account.
2. Click **Create** to deploy a free Shared Cluster (M0 Sandbox).
3. Under **Security Quickstart**:
   - Create a **Database User** (e.g., username `jcms_admin`, choose a secure password).
   - Under **IP Access List**, add **`0.0.0.0/0`** (this allows cloud hosting platforms like Render to connect to your database from anywhere).
4. Click on **Database** -> **Connect** -> **Compass/Drivers**.
5. Copy your **Connection String**. It should look like this:
   `mongodb+srv://jcms_admin:<password>@cluster0.xxxx.mongodb.net/jcms_secure_auth?retryWrites=true&w=majority`
6. Replace `<password>` with the database user password you created.
7. Open your backend `.env` file and replace `MONGODB_URI` with this connection string.

---

## Part 2: Backend Cloud Deployment (Render - Free Hosting)

1. Sign up for a free account at [Render](https://render.com/).
2. Click **New +** -> **Web Service**.
3. Link your GitHub repository containing the project files, or upload it.
4. Set the following details:
   - **Name**: `jcms-courier-scanner-backend`
   - **Root Directory**: `backend`
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js`
5. Click **Advanced** and add all variables from your local `.env` as **Environment Variables**:
   - `MONGODB_URI` = *[Your MongoDB Atlas Cloud URI]*
   - `JWT_ACCESS_SECRET` = *[Your Access Key]*
   - `JWT_REFRESH_SECRET` = *[Your Refresh Key]*
   - `USE_HTTPS` = `false` *(Keep false on cloud, Render automatically supplies HTTPS over port 443!)*
6. Click **Deploy Web Service**. Once deployed, Render will provide a public URL (e.g., `https://jcms-backend.onrender.com`). Copy this URL!

---

## Part 3: Frontend Deployment (Vercel - Free Hosting)

1. Sign up at [Vercel](https://vercel.com/) (using your GitHub/GitLab account).
2. Click **Add New** -> **Project**.
3. Select the same repository.
4. Under **Project Settings**:
   - **Framework Preset**: `Other` or `Vanilla HTML/CSS/JS`
   - **Root Directory**: `Frontend`
5. Click **Deploy**.
6. Once deployed, Vercel will provide your final live website URL (e.g., `https://jain-courier-scanner.vercel.app`).

### 🔗 Connecting Frontend & Backend:
To connect your Vercel frontend to the Render backend:
1. Open `Frontend/app.js` and `Frontend/auth.js`.
2. Find the `API_BASE` lines:
   `const API_BASE = window.location.origin.includes('5000') ? '' : 'http://localhost:5000';`
3. Replace `'http://localhost:5000'` with your Render live backend URL:
   `const API_BASE = window.location.origin.includes('5000') ? '' : 'https://jcms-backend.onrender.com';`
4. Re-push/Re-deploy, and your cloud system is completely live!
