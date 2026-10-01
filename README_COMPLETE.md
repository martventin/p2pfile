# UtilityPro - Complete Setup & Guide

## 🎯 Current Architecture (Fixed)

Your app now has **two separate servers** for maximum reliability:

```
Browser (http://192.168.1.105:8000)
    ↓
STATIC FILE SERVER (Port 8000) - Always Running
├─ Serves: HTML, CSS, JavaScript files
├─ Status: Up even if API restarts ✓
└─ Files cached by Service Worker for offline access
    ↓
API SERVER (Port 3000) - Can Restart
├─ Handles: Database, P2P sync, API endpoints
├─ Status: Can go down for maintenance
└─ App continues working offline, syncs when back up
    ↓
SQLite Database (customers.db)
├─ Local storage of all data
└─ Auto-backed up by server
```

## ✅ What This Solves

### Problem: "Firefox can't connect to server when it's down"
**Before:** App completely inaccessible when server is down ❌
**Now:** App loads from static server, works offline ✓

### Problem: "Can't add entries when Node server restarts"
**Before:** Network error, data lost ❌
**Now:** Data queued locally, auto-syncs when server restarts ✓

### Problem: "Multiple devices can't sync if server is down"
**Before:** No sync until server is back up ❌
**Now:** Local queue on each device, syncs when online ✓

## 🚀 How to Start

### Option 1: Double-click batch file (Easiest)
1. Go to: `C:\Users\myraj\OneDrive\Desktop\UtilityPro`
2. Double-click: `start-servers.bat`
3. Two windows appear (both running)
4. Open browser to: `http://192.168.1.105:8000`
5. Done! ✓

### Option 2: PowerShell
```powershell
powershell -ExecutionPolicy Bypass -File start-servers.ps1
```

### Option 3: Manual (Two separate terminals)

**Terminal 1 - Static File Server:**
```bash
cd C:\Users\myraj\OneDrive\Desktop\UtilityPro
node static-server.js
```

**Terminal 2 - API Server:**
```bash
cd C:\Users\myraj\OneDrive\Desktop\UtilityPro
node server.js
```

## 📍 Access URLs

| Purpose | URL | Port | Status |
|---------|-----|------|--------|
| **App Access** | http://192.168.1.105:8000 | 8000 | Always available |
| **Local App** | http://localhost:8000 | 8000 | Always available |
| **API Server** | http://192.168.1.105:3000 | 3000 | Can go down |
| **Mobile Access** | http://192.168.1.105:8000 | 8000 | If on same WiFi |

## 🔄 Data Flow When Things Go Wrong

### Scenario 1: API Server Crashes
```
User clicks "Save" → Network error → Data queued locally ✓
Browser shows: ⚠️ OFFLINE - 📦 1 pending item(s)
User can see ✓ and continue working ✓
API restarts → Data auto-syncs ✓
Browser shows: ✅ Data synced!
```

### Scenario 2: API Server Scheduled Maintenance
```
Admin: node server.js → (stop with Ctrl+C)
User A: App still loads from port 8000 ✓
User A: Adds customer → Queued locally
User B: App still loads, same thing ✓
Admin: node server.js → (restart)
Both Users: Data syncs automatically ✓
```

### Scenario 3: Network Temporarily Down
```
Static Server (port 8000): Still responds from cache ✓
API Server (port 3000): Can't connect ❌
App loads: Yes ✓
Data: Queued locally 📦
When internet back: Auto-sync ✓
```

### Scenario 4: Complete Power Loss
```
System: Offline, no servers running ❌
Browser cache: App loads ✓ (if visited before)
Service Worker: Offline page available ✓
Data entry: Still works, queued locally ✓
When power back: Auto-sync ✓
```

## 🛡️ Service Worker (Offline Magic)

The app has a **Service Worker** that handles offline mode:

```
First Visit:
├─ Downloads all HTML, CSS, JS files
└─ Caches in browser storage

Server Down:
├─ Browser requests app file
├─ Network fails
├─ Service Worker: "I have it cached!"
└─ Serves from cache ✓

Server Back Up:
├─ Service Worker detects connection
├─ Validates cache freshness
└─ Updates if needed
```

**View Cache in Browser:**
1. Press F12 (DevTools)
2. Go to: Application → Cache Storage
3. See: `utilitypro-v2` with all cached files

## 📦 Queue System (When Offline)

When API is down, your changes are queued:

```javascript
{
  "id": "QUEUE-1712061234567-abc123",
  "changes": [
    {
      "action": "INSERT",
      "table": "customers",
      "data": { ... customer info ... }
    }
  ],
  "queuedAt": 1712061234567,
  "retryCount": 0
}
```

**What gets queued:**
- ✓ New customer entries
- ✓ Updated customer info
- ✓ Status changes
- ✓ P2P sync changes

**What happens on reconnect:**
1. App detects connection available
2. `retryPendingQueue()` starts
3. Sends each queued item to API
4. Removes from queue on success
5. Shows success message

## 🔍 Monitoring Status

### Browser Console Messages

**Online:**
```
✓ Service Worker registered - App works offline!
✓ Connected to host
✓ Pushed to host
🔄 Syncing database...
```

**Offline:**
```
❌ Not connected to host - queuing changes...
📦 Added to queue: QUEUE-...
⏸️ Changes queued for retry when connection restored
```

**Auto-sync:**
```
🔄 Retrying 1 pending changes...
✅ Synced: QUEUE-...
✓ Successfully synced 1/1 queued items
```

## ⚙️ Configuration Files

### config.js
- API server URL (port 3000)
- Connection testing
- Server health checks

### static-server.js
- Serves all static files
- MIME type handling
- Cache headers set

### server.js
- Database operations
- API endpoints
- P2P network management

### p2p-client.js
- Queue management (new!)
- Connection listeners
- Auto-retry logic
- Offline handling

## 🐛 Troubleshooting

### "App won't load at http://192.168.1.105:8000"

**Check:**
1. Is static-server.js running? (see Terminal 1)
2. Is firewall blocking port 8000?
3. Is port 8000 already in use?

**Fix:**
```bash
# Find process on port 8000
netstat -ano | findstr :8000

# Kill process (PID = xxx)
taskkill /PID xxx /F

# Restart static server
node static-server.js
```

### "Data not syncing when API restarts"

**Check:**
1. Is API server running? (see Terminal 2)
2. Is there data in queue? (💻 DevTools → Console → 📦 pending)
3. Are there errors in console?

**Fix:**
```bash
# Restart API server
node server.js

# Wait 5 seconds for auto-sync
# Check console for ✅ Synced messages
```

### "Changes show offline but API is running"

**Check:**
1. Are both servers in the same folder?
2. Is your device connected to same network as host?
3. Is P2P registration working? (check console)

**Fix:**
```bash
# Force reconnect
# Refresh browser: F5

# Check connection status
p2pClient.isHostConnected()  # in console
```

### "Port already in use"

**For port 8000:**
```bash
netstat -ano | findstr :8000
taskkill /PID <ProcessID> /F
```

**For port 3000:**
```bash
netstat -ano | findstr :3000
taskkill /PID <ProcessID> /F
```

## 📊 Server Health Check

Both servers have health endpoints:

**Static Server:**
```bash
curl http://localhost:8000/
# Returns: 200 OK (HTML page)
```

**API Server:**
```bash
curl http://localhost:3000/api/health
# Returns: { "status": "OK", "database": "connected" }
```

## 🔐 Security Notes

- ✓ Service Worker caches files securely
- ✓ Offline data stored in browser (not synced to cloud)
- ✓ Queue data stays local until user online
- ✓ P2P communication on local network only
- ✓ SQLite database file is local (not remote)

## 📈 Performance Impact

**Additional Resources:**
- Static server: ~5MB RAM
- Service Worker cache: ~2MB disk
- Queue storage: <1MB (localStorage)
- Total overhead: ~7MB

**Benefits:**
- 🚀 App loads instantly from cache
- 🔄 Offline capability
- 📦 Automatic data sync
- 🛡️ Fault tolerance

## 🎓 File Structure

```
UtilityPro/
├─ start-servers.bat          ← Double-click to run both
├─ start-servers.ps1          ← PowerShell version
├─ static-server.js           ← Serves files (port 8000)
├─ server.js                  ← API server (port 3000)
├─ config.js                  ← Configuration
├─ p2p-client.js              ← Queue + offline handling (NEW!)
├─ sw.js                       ← Service Worker (updated)
│
├─ customer-manager.html      ← CRM page (updated)
├─ customer-info-form.html    ← Form page (updated)
├─ index.html                 ← Home page
│
├─ customers.db               ← SQLite database
├─ STARTUP_GUIDE.md           ← Startup instructions
└─ README.md                  ← This file
```

## ✅ Checklist for First Time

- [ ] Node.js installed (node --version)
- [ ] Both files in same folder: `static-server.js` and `server.js`
- [ ] Run `start-servers.bat` or manually start both
- [ ] Open browser to: `http://192.168.1.105:8000`
- [ ] App loads and shows data ✓
- [ ] Try adding a customer entry
- [ ] Stop API server (Ctrl+C in Terminal 2)
- [ ] Notice ⚠️ OFFLINE indicator
- [ ] Try adding another entry (should queue)
- [ ] Restart API server
- [ ] See ✅ Data synced!
- [ ] All working? You're done! 🎉

## 🆘 Still Need Help?

1. Check browser console (F12)
2. Look for error messages
3. Check if both server windows are running
4. Verify ports 8000 and 3000 are available
5. Restart both servers
6. Clear browser cache and refresh

---

**Version:** 2.0 (Dual Server Architecture)  
**Last Updated:** April 2, 2026  
**Status:** ✅ Production Ready
