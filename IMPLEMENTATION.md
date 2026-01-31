# Image Editor Implementation Guide

## Overview
This is a frontend-only React image editor that allows users to upload, crop, and merge images with a template. All image processing happens entirely in the browser using Canvas API and Konva.js.

## Key Features

### 1. Image Upload & Scaling
- **File Size Validation**: Enforces a soft 5MB max size
- **Automatic Fit-to-Viewport**: When an image is uploaded, it's automatically scaled down to fit entirely within the editor viewport while maintaining aspect ratio
- **No Overflow**: Large images (4K, phone photos) are never rendered at natural resolution
- **Centered Display**: Images are centered within the viewport on load

### 2. Interactive Cropping (Konva.js Based)
- **Free-form Cropping**: Users can drag corners and edges to resize the crop box in any direction
- **Aspect Ratio Locking**: Three modes:
  - **Free**: No aspect ratio constraint
  - **Square**: 1:1 aspect ratio
  - **Rectangle**: 4:3 aspect ratio
- **Move Crop Area**: Drag inside the crop box to reposition it
- **Visual Feedback**: Blue dashed border with 8 resize handles (4 corners + 4 edges)

### 3. Image Pan & Zoom
- **Mouse Wheel Zoom**: Scroll to zoom in/out (0.5x to 3x)
- **Drag to Pan**: Click and drag the image to reposition it
- **Zoom Controls**: Buttons for precise zoom control
- **Fit Button**: Reset image to fit viewport while maintaining visibility

### 4. Canvas-Based Merging
When user clicks "Preview Result":
1. Extract the cropped region from the uploaded image using canvas
2. Scale it to fit the template region (defined by 4 corner points)
3. Center the scaled image within the template region
4. Draw both images onto a single canvas
5. Display preview and allow download

### 5. Export & Download
- **Format**: PNG
- **Filename**: `merged-image-{timestamp}.png`
- **Browser Download**: Triggered automatically

## Technical Architecture

### Component Structure
```
ImageCropper (Main Component)
├── Upload Section (file input)
├── Editor Section (Konva canvas with cropping)
│   ├── Crop Instructions
│   ├── Aspect Ratio Controls
│   ├── Konva Stage
│   │   ├── Uploaded Image (scaled & positioned)
│   │   ├── Crop Box (rectangle with handles)
│   │   └── Resize Handles (8 interactive squares)
│   ├── Zoom Controls
│   └── Action Buttons
├── Preview Section (merged image result)
└── Hidden Canvas (for image merging)
```

### State Management
```javascript
uploadedImage     // Native Image object loaded from file
imageState        // { x, y, scale } - image position & zoom
cropBox          // { x, y, width, height } - crop area
aspectRatio      // null | 1 | 0.75 - aspect ratio lock
mergedImage      // Data URL of final merged image
isDragging       // For crop box resizing
dragHandle       // Which handle is being dragged
```

### Key Algorithms

#### 1. Fit Image to Viewport
```javascript
const scaleX = STAGE_WIDTH / imgWidth
const scaleY = STAGE_HEIGHT / imgHeight
const fitScale = Math.min(scaleX, scaleY, 1) // Don't upscale

// Center in viewport
const x = (STAGE_WIDTH - imgWidth * fitScale) / 2
const y = (STAGE_HEIGHT - imgHeight * fitScale) / 2
```

#### 2. Crop Box Resizing
- 8 handles allow resize from corners and edges
- Each handle constrains movement in specific directions:
  - Corner handles (TL, TR, BL, BR): Resize diagonally
  - Edge handles (T, B, L, R): Resize in one dimension
- Minimum crop size: 100x100 pixels
- Aspect ratio maintained if locked

#### 3. Canvas Merge Process
```javascript
// 1. Extract cropped region from user image
const croppedCanvas = document.createElement('canvas')
croppedCtx.drawImage(
  userImg,
  cropX, cropY,        // Source position
  cropWidth, cropHeight, // Source size
  0, 0,                // Destination position
  cropWidth, cropHeight  // Destination size
)

// 2. Calculate scale to fit template region
const regionWidth = TEMPLATE_REGION.p2.x - TEMPLATE_REGION.p1.x
const regionHeight = TEMPLATE_REGION.p3.y - TEMPLATE_REGION.p1.y
const scale = Math.min(regionWidth / cropWidth, regionHeight / cropHeight)

// 3. Draw onto template
ctx.drawImage(
  croppedCanvas,
  TEMPLATE_REGION.p3.x + offsetX,
  TEMPLATE_REGION.p3.y + offsetY,
  cropWidth * scale,
  cropHeight * scale
)
```

## Template Region Definition
The template image has 4 corner points defining where the cropped image should be placed:
```javascript
TEMPLATE_REGION = {
  p1: { x: 1021, y: 1839 }, // Bottom-left
  p2: { x: 1699, y: 1839 }, // Bottom-right
  p3: { x: 1007, y: 1020 }, // Top-left
  p4: { x: 1706, y: 1016 }  // Top-right
}
```

## Responsive Design
- Mobile-optimized CSS with flex layouts
- Touch-friendly controls
- Responsive image scaling
- Readable on screens from 320px to 2560px+

## Performance Considerations
1. **Canvas Rendering**: Only drawn on merge, not during editing
2. **Konva Rendering**: Optimized stage only redraws changed elements
3. **Image Scaling**: Applied on load, prevents rendering at native resolution
4. **No Backend**: All processing in browser, instant feedback

## Browser Compatibility
- Modern browsers (Chrome, Firefox, Safari, Edge)
- Requires Canvas API support
- Requires FileReader API support
- Tested on React 19.2.0

## File Structure
```
src/
├── App.jsx          # Main component with Konva canvas
├── App.css          # All styling (responsive)
├── main.jsx         # Entry point
├── index.css        # Global styles
└── assets/
    └── template.jpeg # Template image
```

## Future Enhancements (Not Implemented)
- Rotate image function
- Flip image (horizontal/vertical)
- Image filters (brightness, contrast)
- Undo/Redo stack
- Touch support optimizations
- Drag & drop file upload
