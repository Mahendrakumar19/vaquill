# 🚀 How to Run AI Judge

**Simple 3-step guide to get your system running!**

---

## ✅ Step 1: Get FREE API Key (2 minutes)

### Google Gemini (Recommended - FREE)

1. Go to: **https://makersuite.google.com/app/apikey**
2. Sign in with your Google account
3. Click **"Create API Key"**
4. Copy the entire key

**That's it! No credit card required!**

---

## ✅ Step 2: Setup Environment Variables (1 minute)

```powershell
# Navigate to backend folder
cd D:\Vaquill\ai-judge\backend

# Copy the example .env file
Copy-Item .env.example .env

# Open .env file in notepad
notepad .env
```

**Edit the `.env` file** and update these values:

```env
# Paste your Gemini API key here
LLM_PROVIDER=gemini
GEMINI_API_KEY=paste_your_actual_key_here

# Redis is OPTIONAL (for caching only)
# Leave commented out if you don't have Redis:
# REDIS_HOST=localhost
# REDIS_PORT=6379
```

**Save and close** the file.

**Note:** No database installation needed! SQLite database will be created automatically at `backend/data/ai_judge.db`

---

## ✅ Step 3: Run the Application! 🎉

### Terminal 1: Start Backend

```powershell
# Navigate to backend
cd D:\Vaquill\ai-judge\backend

# Install dependencies (first time only)
npm install

# Start backend server
npm run dev
```

**You should see:**
```
info: ✅ Using Google Gemini (FREE)
info: ✅ SQLite database loaded
info: ✅ SQLite database schema initialized successfully
info: Server running on http://localhost:3001
```

### Terminal 2: Start Frontend

**Open a NEW PowerShell window:**

```powershell
# Navigate to frontend
cd D:\Vaquill\ai-judge\frontend

# Install dependencies (first time only)
npm install

# Start frontend
npm run dev
```

**You should see:**
```
  VITE v5.x.x  ready in xxx ms

  ➜  Local:   http://localhost:3000/
  ➜  Network: use --host to expose
```

---

## 🎯 Access the Application

**Open your browser and go to:**

```
http://localhost:3000
```

You should see the AI Judge interface! 🏛️

---

## 📝 Test It Out

1. **Fill in Side A (Plaintiff):**
   - Summary: "I lent $5000 to John Doe on January 1, 2024. He promised to repay within 6 months but hasn't paid anything."
   - Evidence: "Bank transfer receipt showing $5000 sent to John Doe"

2. **Fill in Side B (Defendant):**
   - Summary: "The $5000 was a gift for helping with a business project, not a loan."
   - Evidence: "Email showing discussion about business partnership"

3. **Select:**
   - Jurisdiction: India
   - Case Type: Civil

4. **Click "Submit Case"**

5. **Watch the AI generate a judgment!** ⚖️

6. **Try the argument feature** - Both sides can argue up to 5 times!

---

## ❓ Troubleshooting

### "Cannot connect to database"

**Not applicable** - SQLite is file-based, no server needed! Database file is created automatically.

If you see database errors:
```powershell
# Delete and recreate the database
cd D:\Vaquill\ai-judge\backend
Remove-Item -Force data\ai_judge.db
npm run dev
# Database will be recreated automatically
```

### "Redis connection failed"

**This is OK!** Redis is optional. The app works fine without it.

To disable Redis warnings, edit `backend/.env`:
```env
# Comment out these lines:
# REDIS_HOST=localhost
# REDIS_PORT=6379
```

### "GEMINI_API_KEY is required"

```powershell
# Make sure you:
# 1. Created .env file (not .env.example)
# 2. Pasted your actual API key
# 3. No extra spaces around the key
# 4. Saved the file

# Restart the backend server after editing .env
```

### "Module not found" errors

```powershell
# Reinstall dependencies

# Backend:
cd D:\Vaquill\ai-judge\backend
Remove-Item -Recurse -Force node_modules
Remove-Item package-lock.json
npm install

# Frontend:
cd D:\Vaquill\ai-judge\frontend
Remove-Item -Recurse -Force node_modules
Remove-Item package-lock.json
npm install
```

### Port already in use

```powershell
# If port 3001 (backend) or 3000 (frontend) is busy:

# Find what's using the port:
netstat -ano | findstr :3001

# Kill the process (replace PID with actual number):
taskkill /PID <PID> /F

# Or change port in .env (backend):
PORT=3002

# Or in frontend/vite.config.ts:
server: { port: 3001 }
```

---

## 🎥 For Your Demo Video

Once everything is running:

1. **Record your screen** showing:
   - VS Code with the project structure
   - Browser with the application running
   - Submitting a case
   - AI generating judgment
   - Both sides making arguments

2. **Explain while recording:**
   - "Using Google Gemini API for free AI integration"
   - "Multi-provider architecture supports Claude, GPT-4, etc."
   - "PostgreSQL for persistent storage, Redis for caching"
   - "React frontend with TypeScript and TailwindCSS"
   - "Production-ready with Docker and Kubernetes configs"

3. **Upload to YouTube** as unlisted

4. **Add link to README.md**

---

## 📚 Next Steps

- ✅ **Read**: [AI_COMPARISON.md](./AI_COMPARISON.md) - Understand different AI providers
- ✅ **Read**: [ARCHITECTURE.md](./ARCHITECTURE.md) - Learn system design
- ✅ **Read**: [DEPLOYMENT.md](./DEPLOYMENT.md) - Deploy to cloud
- ✅ **Explore**: Try different jurisdictions and case types
- ✅ **Test**: Upload PDF/Word documents as evidence

---

## 💡 Quick Commands Reference

```powershell
# Start everything (run in separate terminals):

# Terminal 1 - Backend
cd D:\Vaquill\ai-judge\backend
npm run dev

# Terminal 2 - Frontend  
cd D:\Vaquill\ai-judge\frontend
npm run dev

# Terminal 3 - Redis (if using WSL)
wsl
sudo service redis-server start
```

---

**You're all set! Enjoy your AI Judge system! 🏛️⚖️**

Need help? Check the troubleshooting section above or review the documentation files.
