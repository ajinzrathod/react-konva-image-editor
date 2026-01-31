# 🚀 Quick Start Guide

## Get Started in 30 Seconds

### Option 1: Running Locally
```bash
cd /Users/ajinkyarathod/Documents/coding/git-repos/image-editor
npm run dev
```
Then open: **http://localhost:5174**

### Option 2: Build for Production
```bash
npm run build
npm run preview
```

## What You'll See

### 1. Upload Page
- Click "Choose Image" button
- Select any image from your computer
- Max 5MB (check file size)

### 2. Edit Page (Automatic)
Your image will:
- ✅ Automatically fit in the editor
- ✅ Be centered on screen
- ✅ Show full image (no overflow)

### 3. Crop Controls
**Aspect Ratio** (pick one):
- `Free` - Any size/shape
- `Square` - Perfect 1:1 ratio
- `Rect` - Classic 4:3 ratio

**Move & Resize**:
- Drag inside box → Move crop area
- Drag corners → Resize diagonally  
- Drag edges → Resize one direction

**Zoom & Pan**:
- Scroll mouse wheel → Zoom in/out
- Click & drag image → Pan around
- Click "Fit" → Reset to viewport

### 4. Export
- Click "Preview Result" → See merged image
- Click "Looks Good - Download" → Save as PNG
- Click "Retake" → Edit again

## File Size Note
The app enforces a **5MB soft limit**, but will still process larger files. For best performance:
- **Smartphone photos**: Usually OK (2-4MB)
- **4K images**: Usually OK (5-8MB)
- **Professional photos**: May exceed limit

## Supported Image Formats
✅ JPEG / JPG
✅ PNG
✅ WebP
✅ GIF
✅ BMP
✅ Most formats browsers support

## Common Issues

### Issue: Image doesn't fit viewport
- **Fix**: Refresh the page
- Check if browser zoom is 100% (Ctrl+0)

### Issue: Can't resize crop box
- **Fix**: Make sure handles are visible (blue squares)
- Try dragging from the corners first

### Issue: Download doesn't start
- **Fix**: Check browser download settings
- Try clicking "Looks Good - Download" again

### Issue: Large image is slow
- **Fix**: Try a smaller image first
- Crop a smaller area before preview

## Keyboard Tips
- Browser back button always works
- F12 to open developer console if needed
- Ctrl+Shift+Delete to clear cache if issues persist

## Architecture at a Glance

```
┌─ React Component (App.jsx)
│  ├─ State Management (upload, crop, image position)
│  ├─ Konva Canvas (interactive crop handles)
│  ├─ HTML5 Canvas (merge images)
│  └─ File API (read & export)
│
├─ Styling (App.css)
│  └─ Responsive design
│
└─ Template Image (assets/template.jpeg)
   └─ Target region: P1-P4 coordinates
```

## Technical Stack
- **Frontend**: React 19
- **Canvas**: Konva.js + HTML5 Canvas API
- **Build**: Vite 7
- **Styling**: CSS3 Flexbox

## Performance
- ⚡ Instant upload (no server needed)
- ⚡ Real-time crop handles
- ⚡ Fast image merge (<1 second)
- ⚡ Instant download

## Where's the Code?

| File | Purpose |
|------|---------|
| `src/App.jsx` | Main component (cropping logic) |
| `src/App.css` | All styling |
| `src/assets/template.jpeg` | Template image |
| `package.json` | Dependencies |

## Next Steps
1. ✅ Start dev server (`npm run dev`)
2. ✅ Open in browser (http://localhost:5174)
3. ✅ Upload an image
4. ✅ Try cropping with different aspect ratios
5. ✅ Zoom and pan around
6. ✅ Export your result

## Troubleshooting Commands
```bash
# Clear npm cache
npm cache clean --force

# Reinstall dependencies
rm -rf node_modules && npm install

# Restart dev server
# Just stop (Ctrl+C) and run: npm run dev

# Check Node version
node --version  # Should be 16+
npm --version   # Should be 8+
```

## Need Help?
1. Check `IMPLEMENTATION.md` for technical details
2. Check `README_USAGE.md` for feature documentation  
3. Look at `COMPLETE_SUMMARY.md` for architecture overview
4. Check browser console (F12) for errors

---

**Status**: ✅ Ready to Use  
**Last Updated**: January 31, 2026
