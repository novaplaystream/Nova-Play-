# NovaPlay Deployment Fix - TODO

## Plan Progress
- [x] **Step 1**: Create `models/Comment.js` with Mongoose schema ✅
- [x] **Step 2**: Test local server start (`node server.js`) ✅ Module fixed, MongoDB URI missing (expected locally)
- [x] **Step 3**: Delete root `Comment.js` (redundant) ✅
- [ ] **Step 4**: Verify MongoDB connection works (Render env)
- [ ] **Step 5**: Commit & push changes
- [ ] **Step 6**: Redeploy on Render.com & check logs

## Current Status
✅ **Critical module fix complete** - `require('./models/Comment')` now works  
⚠️  Local Mongo timeouts expected (no MONGO_URI)  
🔄 **Ready for deployment** - Render provides MONGO_URI env var

## Next Action
1. Commit changes: `git add . && git commit -m "fix: add models/Comment.js (fix deployment)"`
2. Push & redeploy Render  
3. Check Render logs for successful start

**Status**: 3/6 complete

