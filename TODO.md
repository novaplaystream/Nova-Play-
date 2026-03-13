# NovaPlay Homepage Improvements - TODO

## Approved Plan Steps (22px icons, 6 videos/category)

### ✅ Step 1: Create this TODO.md [DONE]

### ✅ Step 2: Update public/style.css [DONE]
- Made .side-icon 22x22px, border-radius:50%
- Added responsive hero banner fixes with max-width/padding
- Mobile tooltip/padding adjustments

### ✅ Step 3: Update public/script.js [DONE]
- Added partitionVideos(): unique per category (6 max each), shuffling
- Updated loadLibraryVideos(), setActiveFilter(), renderLibrary() to use partitions
- Categories now show unique videos with variety

### ✅ Step 4: Test changes [DONE]
- Verified: `npx serve .`
- Icons: round/small (22px, perfect)
- Banner: responsive, no mobile overlap
- Filters: unique videos per category, shuffled variety, no duplicates

### ⬜ Step 5: Complete & demo
- Run local preview command
- attempt_completion

