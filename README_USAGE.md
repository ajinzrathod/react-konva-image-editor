# Image Editor - Frontend React App

A modern, browser-based image editor that lets you upload an image, crop it interactively, and merge it with a template image. All processing happens entirely in the browser with no backend or server required.

**🔗 Live URL**: http://localhost:5174

## Features

### ✅ What Works
- **Upload Image** - Select any image file (soft max 5MB)
- **Automatic Scaling** - Large images (4K, phone photos) automatically fit in viewport
- **Interactive Cropping** - Drag corners/edges to resize, drag inside to move
- **Three Crop Modes** - Free, Square (1:1), or Rectangle (4:3) aspect ratios
- **Zoom & Pan** - Scroll to zoom, drag to pan the image
- **Live Preview** - See merged result before downloading
- **Export** - Download final image as PNG
- **Responsive Design** - Works on desktop and mobile

## How to Use

### Step 1: Upload Image
1. Click "Choose Image" button
2. Select an image from your device (JPG, PNG, WebP, etc.)
3. Image automatically scales to fit the editor

### Step 2: Adjust Image
- **Zoom**: Scroll mouse wheel or use Zoom In/Out buttons (50% - 300%)
- **Pan**: Click and drag the image to reposition
- **Fit**: Click the "Fit" button to reset to viewport-fitted size
- **Zoom Level**: Displayed in the center of zoom controls

### Step 3: Crop
1. Choose aspect ratio:
   - **Free** - No constraint, any size
   - **Square** - 1:1 ratio (perfect squares)
   - **Rectangle** - 4:3 ratio (classic portrait/landscape)

2. Resize crop box:
   - **Drag corners** - Resize diagonally
   - **Drag edges** - Resize horizontally or vertically
   - **Drag inside** - Move the entire crop box

3. The blue dashed box with handles shows your crop area

### Step 4: Preview & Export
1. Click "Preview Result" to see merged image
2. If satisfied, click "Looks Good - Download" to save as PNG
3. Click "Retake" to start over with new edits

## Technical Stack

| Component | Purpose |
|-----------|---------|
| **React** | UI framework (functional components + hooks) |
| **Konva.js** | Canvas rendering & interaction (crop handles, zoom) |
| **HTML5 Canvas** | Image merging & export |
| **Vite** | Build tool & dev server |

## Key Implementation Details

### Image Scaling Algorithm
When you upload an image, it's automatically scaled to fit inside the 800×500 editor:
```javascript
const scaleX = 800 / imageWidth
const scaleY = 500 / imageHeight
const fitScale = Math.min(scaleX, scaleY, 1) // Don't upscale

// Image is centered in viewport
const x = (800 - imageWidth * fitScale) / 2
const y = (500 - imageHeight * fitScale) / 2
```

**Why**: Phone photos (4000×3000px) or 4K images would overflow the editor. Scaling them down ensures the full image is always visible and responsive.

### Crop Box Resizing
8 interactive handles enable full control:
- **4 Corners** - Resize diagonally (NW, NE, SW, SE)
- **4 Edges** - Resize in single direction (N, S, E, W)
- **Minimum size**: 100×100 pixels
- **Aspect ratio**: Maintained if locked mode is selected

### Canvas Merging Process
When you click "Preview Result":
1. **Extract** - Crops the region you selected from your image
2. **Calculate** - Determines scale to fit inside template region
3. **Merge** - Draws both images onto a canvas
4. **Export** - Converts to PNG for download

The template region is defined by 4 corner points:
```javascript
P1 (1021, 1839) --- P2 (1699, 1839)
  |                      |
P3 (1007, 1020) --- P4 (1706, 1016)
```

## File Structure
```
image-editor/
├── src/
│   ├── App.jsx              # Main component (cropper logic)
│   ├── App.css              # Styling (responsive)
│   ├── main.jsx             # Entry point
│   ├── index.css            # Global styles
│   └── assets/
│       └── template.jpeg    # Template image
├── package.json             # Dependencies
├── vite.config.js          # Vite config
├── IMPLEMENTATION.md        # Technical docs
└── README.md               # This file
```

## Available Scripts

```bash
# Start development server (http://localhost:5174)
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Run ESLint
npm lint
```

## Browser Requirements

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Canvas API support
- FileReader API support

## Performance Notes

✅ **Optimized**:
- Image only rendered once at fit size on load
- Canvas merge only happens on preview (not real-time)
- Konva only redraws changed elements
- No backend calls - instant feedback

⚠️ **Limitations**:
- Maximum recommended image size: 10MB (soft limit is 5MB)
- Maximum zoom: 300%
- Crop resolution limited by canvas rendering

## Troubleshooting

### Image doesn't fit the viewport?
- Make sure you're using the latest version
- Clear browser cache and reload
- Try a different image format

### Export is taking too long?
- Check browser console for errors
- Try with a smaller crop area
- Very large images may take 2-3 seconds

### Crop handles not showing?
- Refresh the page
- Check if browser zoom is at 100%
- Try a different browser

## Keyboard Shortcuts
Currently not implemented, but would be easy to add:
- `C` - Switch to Free crop mode
- `S` - Switch to Square crop mode  
- `R` - Switch to Rectangle crop mode
- `Z` - Zoom in
- `X` - Zoom out
- `F` - Fit to viewport

## Future Enhancements
- Image rotation (90°, 180°, 270°)
- Horizontal/vertical flip
- Brightness & contrast adjustment
- Multiple crop presets
- Undo/Redo functionality
- Touch-optimized controls
- Drag & drop file upload

## Browser Compatibility
| Browser | Version | Status |
|---------|---------|--------|
| Chrome | 90+ | ✅ Full |
| Firefox | 88+ | ✅ Full |
| Safari | 14+ | ✅ Full |
| Edge | 90+ | ✅ Full |

## License
MIT

## Questions?
Check [IMPLEMENTATION.md](IMPLEMENTATION.md) for technical details about the canvas merging, crop algorithms, and state management.
