# Deployment Guide: Round 1 Online Assessment Platform

This application is packaged as a unified, production-ready full-stack Node.js + React system with:
- **Built-in Frontend Serving**: The Express server automatically serves the built React frontend (`client/dist`).
- **Embedded SQLite Database**: Zero database configuration needed; works out of the box.
- **24-Hour Auto-Purge Worker**: Runs automatically in the background to delete records older than 24 hours.

---

## 🚀 Option 1: Free 1-Click Deployment on Render.com (Recommended)

1. Push this project directory to a GitHub repository:
   ```bash
   git init
   git add .
   git commit -m "Initial commit for Round 1 Assessment Platform"
   git remote add origin <your-github-repo-url>
   git push -u origin main
   ```
2. Go to **[Render.com](https://render.com/)** and sign in.
3. Click **New +** &rarr; **Web Service**.
4. Connect your GitHub repository.
5. Set the following settings:
   - **Name**: `round1-assessment-platform`
   - **Environment**: `Node`
   - **Build Command**:
     ```bash
     npm run install:all && npm run build
     ```
   - **Start Command**:
     ```bash
     npm start
     ```
6. In **Environment Variables**, add:
   - `NODE_ENV`: `production`
   - `JWT_SECRET`: `your_random_secure_secret_key_123`
   - `RETENTION_HOURS`: `24`
7. Click **Create Web Service**. Your live public URL will be ready in 2 minutes!

---

## ⚡ Option 2: Deploy on Railway.app

1. Go to **[Railway.app](https://railway.app/)** and click **New Project** &rarr; **Deploy from GitHub repo**.
2. Select your repository.
3. Railway will automatically detect the Dockerfile or Node runtime.
4. Add environment variables (`JWT_SECRET`, `RETENTION_HOURS=24`).
5. Click **Deploy**. Railway will generate a live HTTPS domain automatically.

---

## 💻 Option 3: Running Locally or on a VPS (Ubuntu / Linux)

1. Clone or copy the folder to your server:
   ```bash
   cd online-assessment-round1
   ```
2. Install all dependencies and build:
   ```bash
   npm run install:all
   npm run build
   ```
3. Start the production server:
   ```bash
   npm start
   ```
   The app will run on `http://localhost:5000`.

*(Optional)* Run continuously in background with PM2:
```bash
npm install -g pm2
pm2 start server/src/index.js --name "assessment-platform"
pm2 save
pm2 startup
```
