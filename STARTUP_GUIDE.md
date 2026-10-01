# 🚀 UtilityPro Startup Guide

## Architecture

```
┌─────────────────────────────────┐
│  STATIC FILE SERVER (Port 8000) │  ← Always running (serves HTML/CSS/JS)
│  node static-server.js          │     Even if API server restarts!
└─────────────────────────────────┘
              ↓
┌─────────────────────────────────┐
│   API SERVER (Port 3000)        │  ← Can restart without affecting UI
│   node server.js                │     Handles database operations
└─────────────────────────────────┘
              ↓
┌─────────────────────────────────┐
│   SQLite Database               │
│   customers.db                  │
└─────────────────────────────────┘
```

## To Start the System

### Terminal 1: Start Static File Server (serves the app)
```bash
cd C:\Users\myraj\OneDrive\Desktop\UtilityPro
node static-server.js
```

**Output:**
```
============================================================
📁 STATIC FILE SERVER RUNNING
============================================================
🌐 Access app at: http://192.168.1.105:8000
🌐 Access app at: http://localhost:8000

✓ THIS SERVER STAYS RUNNING EVEN IF API SERVER (port 3000) RESTARTS
✓ Service Worker caches all files for offline access
============================================================
```

### Terminal 2: Start API Server (handles database)
```bash
cd C:\Users\myraj\OneDrive\Desktop\UtilityPro
node server.js
```

**Output:**
```
🚀 UtilityPro Server Running!
📊 SQLite Database: C:\Users\myraj\OneDrive\Desktop\UtilityPro\customers.db
🌐 API Server: http://192.168.1.105:3000
📱 P2P Network: Enabled
🔄 Auto-sync: Every 5 seconds
✓ Server ready!
```

## Quick Start (Single Command)

If you want to run both from one terminal:

### Windows (PowerShell)
```powershell
# Start both servers (will run simultaneously)
$proc1 = Start-Process node -ArgumentList "static-server.js" -PassThru
$proc2 = Start-Process node -ArgumentList "server.js" -PassThru
```

### Linux/Mac
```bash
# Start both servers in background
node static-server.js &
node server.js &
```

## Access the App

### Normal Access (Server Running)
```
http://192.168.1.105:8000
```

### When API Server Down (Offline Mode)
```
App still loads from cache! ✅
You can keep working offline
Data syncs automatically when server restarts
```

## What Happens in Different Scenarios

### ✅ Both Servers Running (Normal Mode)
- App loads from: Port 8000 ✓
- Data syncs to database: Port 3000 ✓
- Multi-device sync: Working ✓
- Export/Import: Working ✓

### ⚠️ Static Server Up, API Server Down (Offline Mode)
- App loads from: Port 8000 ✓ (cached)
- Data syncs to database: ❌ (queued locally)
- Offline indicator: Shows ⚠️ OFFLINE
- Queue status: Shows 📦 X pending item(s)
- Multi-device sync: ⏸️ (queued for later)

### ❌ Static Server Down (Can't Access App)
- Solution: Restart both servers
- Check Windows Task Manager if port is stuck

## Important Notes

### Port Already in Use?

If port 8000 or 3000 is already in use:

**Find process using port 8000:**
```bash
netstat -ano | findstr :8000
taskkill /PID <PID> /F
```

**Find process using port 3000:**
```bash
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

### Service Worker Caching

- Files are cached in browser on first visit
- Subsequent visits load from cache even if server is down
- Cache updates when you restart the server
- Clear cache in Settings → Storage → Clear All

### Multi-Device Access

**From same computer:**
```
http://localhost:8000
http://127.0.0.1:8000
```

**From another computer on network:**
```
http://192.168.1.105:8000
(Replace 192.168.1.105 with your actual IP)
```

## Troubleshooting

### "Firefox can't connect to 192.168.1.105:8000"
- Check if static-server.js is running in Terminal 1
- Check Windows Firewall (port 8000 might be blocked)
- Check router/network settings

### Changes not reflecting
- Clear browser cache: Ctrl+Shift+Delete
- Close and reopen browser
- Restart static-server.js

### API calls failing but app loads
- API server (port 3000) is down
- This is normal! App shows ⚠️ OFFLINE
- Your entries are queued and will sync when API restarts

### Database file not found
- Make sure both servers are in: `C:\Users\myraj\OneDrive\Desktop\UtilityPro`
- Database is auto-created on first API server start

## For Production

For production deployment:
1. Use Nginx to serve static files (replaces static-server.js)
2. Use PM2 to keep both processes running
3. Set up SSL/HTTPS certificates
4. Configure auto-restart on server crash
5. Set up logging and monitoring

## Support

If servers don't start:
1. Check Node.js is installed: `node --version`
2. Check required files exist:
   - server.js
   - static-server.js
   - customers.db (auto-created)
3. Reinstall dependencies: `npm install`
