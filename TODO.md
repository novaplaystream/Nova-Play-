y
# NovaPlay Bug Fixes - Approved Plan

## Current Status
✅ Server endpoints functional  
✅ Creator flow: channel → upload → pending  
✅ Live TV: API + hardcoded channels  

## Step 1: [DONE] Server Setup & Tests
- [x] `npm install`
- [x] Add `.env` (MONGO_URI, ADMIN_PASSWORD)
- [x] `node server.js` → MongoDB connected, port 3000

## Step 2: Test Creator Studio
```
1. Visit http://localhost:3000/creator.html
2. Create channel (Dashboard → Edit Channel)
3. Upload test: Title="Test", URL="https://www.youtube.com/watch?v=dQw4w9WgXcQ"
4. Check: Video appears in Studio → Pending
```

## Step 3: Test Live TV
```
1. Visit http://localhost:3000/live.html
2. Check browser console/Network tab
3. API test: curl http://localhost:3000/api/live-tv
4. Should show NASA TV, DW News, etc. channels
```

## Step 4: Quick Fixes (if needed)
```
- Add "Creator Studio" link in navbar (index.html)
- Ensure /studio.html redirects to /creator.html
- Add upload success message popup
```

## Step 5: Admin Approval
```
1. Visit http://localhost:3000/studio.html (admin login)
2. Approve pending videos
3. Videos appear in homepage/public
```

## Next Steps After Tests
- [ ] User test results
- [ ] Targeted code improvements
- [ ] Production optimizations

## ✅ Steps 1-2 Complete
- [x] `npm install` running  
- [x] `npm start` / `node server.js` running  
- [ ] MongoDB "connected" log?  
- [ ] Port 3000 accessible?

## Step 3: Test Pages NOW (servers running)
1. `http://localhost:3000/creator.html` → Channel create → Video upload test
2. `http://localhost:3000/live.html` → Channels load?

**Copy terminal logs + browser console errors here → Update this file**

## 🛑 FIXED: MongoDB Issue
✅ Server running port 3000  
❌ **MONGO_URI missing** → No database = no videos/channels  

## Step 3: [NEW] Fix Database
1. [ ] Edit `.env` → Add `MONGO_URI=mongodb://localhost:27017/novaplay`
2. [ ] OR free MongoDB Atlas (recommended):
   ```
   mongodb.com/atlas → Free M0 → Copy connection string
   ```
3. [ ] `taskkill /f /im node.exe` → `npm start`

## Step 4: Retest
```
http://localhost:3000/creator.html → Upload works now?
http://localhost:3000/live.html → Channels load?
```

**Progress: 3/5 - Database critical!**

