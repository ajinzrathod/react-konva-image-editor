import { useState, useRef, useEffect } from 'react'
import { Stage, Layer, Image as KonvaImage, Rect } from 'react-konva'
import './App.css'
import templateImage from './assets/template.png'

// ===== CONFIGURATION =====
// Update these values when changing template image
const CONFIG = {
  // Template region coordinates (4 corner points defining the target area)
  templateRegion: {
    // p1: { x: 900, y: 1900 },
    // p2: { x: 1810, y: 1900 },
    // p3: { x: 900, y: 1000 },
    // p4: { x: 1810, y: 1000 }

    p1: { x: 1007, y: 1839 }, 
    p2: { x: 1699, y: 1839 }, 
    p3: { x: 1007, y: 1020 }, 
    p4: { x: 1699, y: 1020 }
  },
  // Text region coordinates (name/label area)
  textRegion: {
    p1: { x: 1021, y: 1839 },
    p2: { x: 1700, y: 1839 },
    p3: { x: 1700, y: 1962 },
    p4: { x: 1021, y: 1962 }
  },
  textLabel: 'Ajinkya Rathod',
  textBgColor: '#ed7f02',
  textFgColor: '#FFFFFF', // White text
  handleSize: 10,
  gridColor: '#667eea',
  maxScale: 3.0 // Prevent excessive zoom-in
}

// Calculate aspect ratio from template region
const TEMPLATE_REGION = CONFIG.templateRegion
const TEMPLATE_REGION_WIDTH = Math.abs(TEMPLATE_REGION.p2.x - TEMPLATE_REGION.p1.x)
const TEMPLATE_REGION_HEIGHT = Math.abs(TEMPLATE_REGION.p1.y - TEMPLATE_REGION.p3.y)
const CROP_ASPECT_RATIO = TEMPLATE_REGION_WIDTH / TEMPLATE_REGION_HEIGHT

const HANDLE_SIZE = CONFIG.handleSize
const GRID_COLOR = CONFIG.gridColor
const MAX_SCALE = CONFIG.maxScale

// Handle types for resize
const HANDLES = {
  TL: 'tl', TR: 'tr', BL: 'bl', BR: 'br',
  T: 't', B: 'b', L: 'l', R: 'r'
}

function ImageCropper() {
  const [uploadedImage, setUploadedImage] = useState(null)
  const [cropBox, setCropBox] = useState({ x: 50, y: 50, width: 300, height: 400 })
  const [imageState, setImageState] = useState({ x: 0, y: 0, scale: 1 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragHandle, setDragHandle] = useState(null)
  const [mergedImage, setMergedImage] = useState(null)
  const [stageDimensions, setStageDimensions] = useState({ width: 800, height: 500 })
  const [imageScale, setImageScale] = useState(1) // Fixed scale for image
  const fileInputRef = useRef(null)
  const canvasRef = useRef(null)
  const imageRef = useRef(null)
  const stageRef = useRef(null)

  const STAGE_WIDTH = stageDimensions.width
  const STAGE_HEIGHT = stageDimensions.height

  // Dynamic canvas sizing based on viewport
  useEffect(() => {
    const calculateDimensions = () => {
      const headerHeight = 80 // Title
      const instructionsHeight = 50 // Instructions
      const actionButtonsHeight = 50 // Action buttons
      const padding = 40 // Total padding/margins
      
      const availableHeight = window.innerHeight - headerHeight - instructionsHeight - actionButtonsHeight - padding
      const availableWidth = window.innerWidth - 40 // Left/right margins
      
      // Detect orientation and adjust canvas size accordingly
      const isPortrait = window.innerHeight > window.innerWidth
      
      let width, height
      
      if (isPortrait) {
        // Portrait mode: prioritize height, use reasonable width
        height = Math.min(availableHeight, 600)
        width = Math.min(availableWidth, 500)
        // Fit to narrower dimension
        const aspectX = availableWidth / availableHeight
        if (aspectX < 0.7) {
          // Very narrow portrait
          width = Math.min(availableWidth, height * 0.6)
        }
      } else {
        // Landscape mode: maintain 16:10 aspect ratio
        width = Math.min(availableWidth, 900)
        height = Math.min(availableHeight, 500)
        
        // Maintain 16:10 aspect ratio
        const targetAspect = 900 / 500 // 1.8
        const currentAspect = width / height
        
        if (currentAspect > targetAspect) {
          width = height * targetAspect
        } else {
          height = width / targetAspect
        }
      }
      
      setStageDimensions({ width: Math.floor(width), height: Math.floor(height) })
    }
    
    calculateDimensions()
    
    // Handle window resize and orientation change
    window.addEventListener('resize', calculateDimensions)
    window.addEventListener('orientationchange', calculateDimensions)
    
    return () => {
      window.removeEventListener('resize', calculateDimensions)
      window.removeEventListener('orientationchange', calculateDimensions)
    }
  }, [])

  // Recalculate image scale when stage dimensions change (contain behavior)
  useEffect(() => {
    if (uploadedImage) {
      const STAGE_WIDTH = stageDimensions.width
      const STAGE_HEIGHT = stageDimensions.height
      const imgWidth = uploadedImage.width
      const imgHeight = uploadedImage.height
      
      // Scale to fit entirely in viewport (contain behavior)
      const scaleX = STAGE_WIDTH / imgWidth
      const scaleY = STAGE_HEIGHT / imgHeight
      // fitScale ensures image fits in viewport (scale up or down as needed)
      const fitScale = Math.min(scaleX, scaleY)
      // Clamp to max zoom, but allow any scale down (no min limit for large images)
      const clampedScale = Math.min(fitScale, MAX_SCALE)
      
      const scaledWidth = imgWidth * clampedScale
      const scaledHeight = imgHeight * clampedScale
      
      // Center image in viewport
      const imgX = (STAGE_WIDTH - scaledWidth) / 2
      const imgY = (STAGE_HEIGHT - scaledHeight) / 2
      
      setImageScale(clampedScale)
      setImageState({ x: imgX, y: imgY, scale: clampedScale })
      
      // Initialize crop box with sensible margins
      const margin = 0.08 // 8% margin on each side
      const cropWidth = scaledWidth * (1 - 2 * margin)
      const cropHeight = scaledHeight * (1 - 2 * margin)
      const cropX = imgX + scaledWidth * margin
      const cropY = imgY + scaledHeight * margin
      setCropBox({ x: cropX, y: cropY, width: cropWidth, height: cropHeight })
    }
  }, [stageDimensions, uploadedImage])

  // Handle image upload
  const handleImageUpload = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 5 * 1024 * 1024) {
      alert('Image size exceeds 5MB. Please choose a smaller image.')
      return
    }

    const reader = new FileReader()
    reader.onload = (event) => {
      const img = new window.Image()
      img.onload = () => {
        // Calculate scale to fit image inside canvas while maintaining aspect ratio
        const imgWidth = img.width
        const imgHeight = img.height
        
        const scaleX = STAGE_WIDTH / imgWidth
        const scaleY = STAGE_HEIGHT / imgHeight
        const fitScale = Math.min(scaleX, scaleY) // Fit to viewport (scale up or down)
        
        // Clamp scale to max zoom, but allow any scale down (no min limit for large images)
        const clampedScale = Math.min(fitScale, MAX_SCALE)
        
        // Center the image in the viewport
        const scaledWidth = imgWidth * clampedScale
        const scaledHeight = imgHeight * clampedScale
        const imgX = (STAGE_WIDTH - scaledWidth) / 2
        const imgY = (STAGE_HEIGHT - scaledHeight) / 2

        // Calculate initial crop box that fits entirely within the image bounds
        // Leave 8% margin on each side for flexibility
        const margin = 0.08
        const initialCropWidth = scaledWidth * (1 - 2 * margin)
        const initialCropHeight = scaledHeight * (1 - 2 * margin)
        const initialCropX = imgX + scaledWidth * margin
        const initialCropY = imgY + scaledHeight * margin

        setUploadedImage(img)
        setImageScale(clampedScale) // Store fixed scale
        setImageState({ x: imgX, y: imgY, scale: clampedScale })
        setCropBox({
          x: initialCropX,
          y: initialCropY,
          width: initialCropWidth,
          height: initialCropHeight
        })
        setMergedImage(null)
      }
      img.src = event.target.result
    }
    reader.readAsDataURL(file)
  }

  // Handle crop box changes with boundary clamping and aspect ratio constraint
  const handleCropBoxChange = (x, y, width, height) => {
    // Calculate image bounds in canvas coordinates using imageState.scale
    const scale = imageState.scale || imageScale || 1
    const imgWidth = uploadedImage.width * scale
    const imgHeight = uploadedImage.height * scale
    const imgLeft = imageState.x
    const imgTop = imageState.y
    const imgRight = imgLeft + imgWidth
    const imgBottom = imgTop + imgHeight

    // Enforce aspect ratio constraint
    const calculatedHeight = width / CROP_ASPECT_RATIO
    let clampedWidth = width
    let clampedHeight = calculatedHeight

    // Clamp crop box within image bounds
    let clampedX = Math.max(imgLeft, Math.min(x, imgRight - clampedWidth))
    let clampedY = Math.max(imgTop, Math.min(y, imgBottom - clampedHeight))
    clampedWidth = Math.min(clampedWidth, imgRight - clampedX)
    clampedHeight = Math.min(clampedHeight, imgBottom - clampedY)

    // Re-adjust width to maintain aspect ratio if height was clamped
    clampedWidth = clampedHeight * CROP_ASPECT_RATIO

    // Ensure minimum size (at least 1/3 of the smaller dimension or 80px)
    const minSize = Math.min(Math.max(80, Math.min(imgWidth, imgHeight) / 3), 150)
    const minWidth = minSize
    const minHeight = minSize / CROP_ASPECT_RATIO

    if (clampedWidth < minWidth) {
      clampedWidth = minWidth
      clampedHeight = clampedWidth / CROP_ASPECT_RATIO
    }

    // Re-clamp position after enforcing minimum size and aspect ratio
    clampedX = Math.max(imgLeft, Math.min(clampedX, imgRight - clampedWidth))
    clampedY = Math.max(imgTop, Math.min(clampedY, imgBottom - clampedHeight))

    setCropBox({
      x: clampedX,
      y: clampedY,
      width: clampedWidth,
      height: clampedHeight
    })
  }

  // Handle mouse down on crop box
  const handleMouseDown = (e, handle) => {
    e.evt.preventDefault()
    setIsDragging(true)
    setDragHandle(handle)
  }

  // Handle mouse move
  const handleMouseMove = (e) => {
    if (!isDragging || !dragHandle) return

    const stage = stageRef.current
    const pos = stage.getPointerPosition()

    if (dragHandle === 'move') {
      handleCropBoxChange(pos.x - cropBox.width / 2, pos.y - cropBox.height / 2, cropBox.width, cropBox.height)
    } else {
      let { x, y, width, height } = cropBox
      const minSize = Math.min(Math.max(80, Math.min(uploadedImage.width * imageScale, uploadedImage.height * imageScale) / 3), 150)

      switch (dragHandle) {
        case HANDLES.TL:
          x = pos.x
          y = pos.y
          width = cropBox.x + cropBox.width - x
          height = cropBox.y + cropBox.height - y
          break
        case HANDLES.TR:
          y = pos.y
          width = pos.x - x
          height = cropBox.y + cropBox.height - y
          break
        case HANDLES.BL:
          x = pos.x
          width = cropBox.x + cropBox.width - x
          height = pos.y - y
          break
        case HANDLES.BR:
          width = pos.x - x
          height = pos.y - y
          break
        case HANDLES.T:
          y = pos.y
          height = cropBox.y + cropBox.height - y
          break
        case HANDLES.B:
          height = pos.y - y
          break
        case HANDLES.L:
          x = pos.x
          width = cropBox.x + cropBox.width - x
          break
        case HANDLES.R:
          width = pos.x - x
          break
      }

      width = Math.max(minSize, width)
      height = Math.max(minSize, height)

      handleCropBoxChange(x, y, width, height)
    }
  }

  const handleMouseUp = () => {
    setIsDragging(false)
    setDragHandle(null)
  }

  // Merge images
  const handleMergeImages = async () => {
    if (!uploadedImage) {
      alert('Please upload an image first')
      return
    }

    try {
      const templateImg = new window.Image()
      templateImg.onload = () => {
        const canvas = canvasRef.current
        canvas.width = templateImg.width
        canvas.height = templateImg.height

        const ctx = canvas.getContext('2d')

        // Calculate crop region on the uploaded image
        const imgX = (cropBox.x - imageState.x) / imageState.scale
        const imgY = (cropBox.y - imageState.y) / imageState.scale
        const imgWidth = cropBox.width / imageState.scale
        const imgHeight = cropBox.height / imageState.scale

        const croppedCanvas = document.createElement('canvas')
        croppedCanvas.width = imgWidth
        croppedCanvas.height = imgHeight
        const croppedCtx = croppedCanvas.getContext('2d')
        croppedCtx.drawImage(uploadedImage, imgX, imgY, imgWidth, imgHeight, 0, 0, imgWidth, imgHeight)

        // Calculate scale to fill the template region (use Math.max to cover the area)
        const regionWidth = Math.abs(TEMPLATE_REGION.p2.x - TEMPLATE_REGION.p1.x)
        const regionHeight = Math.abs(TEMPLATE_REGION.p3.y - TEMPLATE_REGION.p1.y)

        const scaleX = regionWidth / imgWidth
        const scaleY = regionHeight / imgHeight
        // Use Math.max to fill the region (may overflow slightly)
        const scale = Math.max(scaleX, scaleY)

        const scaledWidth = imgWidth * scale
        const scaledHeight = imgHeight * scale
        const offsetX = (regionWidth - scaledWidth) / 2
        const offsetY = (regionHeight - scaledHeight) / 2

        // Draw cropped user image
        ctx.drawImage(
          croppedCanvas,
          TEMPLATE_REGION.p3.x + offsetX,
          TEMPLATE_REGION.p3.y + offsetY,
          scaledWidth,
          scaledHeight
        )

        // Draw template on top (its transparency will show user image behind)
        ctx.drawImage(templateImg, 0, 0)

        // Draw text region with background
        const textRegion = CONFIG.textRegion
        const textX = textRegion.p1.x
        const textY = textRegion.p1.y
        const textWidth = textRegion.p2.x - textRegion.p1.x
        const textHeight = textRegion.p3.y - textRegion.p1.y

        // Draw background rectangle
        ctx.fillStyle = CONFIG.textBgColor
        ctx.fillRect(textX, textY, textWidth, textHeight)

        // Calculate dynamic font size to fit text in region
        const padding = 20 // padding on sides
        const availableWidth = textWidth - (padding * 2)
        const availableHeight = textHeight - 10
        
        // Start with a reasonable font size and adjust down if needed
        let fontSize = Math.min(availableHeight * 0.7, availableWidth / (CONFIG.textLabel.length * 0.55))
        
        // Try the calculated font size and adjust if text is still too wide
        let attempts = 0
        while (attempts < 5) {
          ctx.font = `bold ${Math.round(fontSize)}px Arial`
          const metrics = ctx.measureText(CONFIG.textLabel)
          if (metrics.width <= availableWidth) break
          fontSize *= 0.9 // Reduce by 10% if too wide
          attempts++
        }

        // Draw text centered
        ctx.fillStyle = CONFIG.textFgColor
        ctx.font = `bold ${Math.round(fontSize)}px Arial`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(CONFIG.textLabel, textX + textWidth / 2, textY + textHeight / 2)

        const mergedDataUrl = canvas.toDataURL('image/png')
        setMergedImage(mergedDataUrl)
      }
      templateImg.src = templateImage
    } catch (error) {
      console.error('Error merging images:', error)
      alert('Error merging images')
    }
  }

  const handleExportImage = () => {
    if (!mergedImage) return
    const link = document.createElement('a')
    link.href = mergedImage
    link.download = `merged-image-${Date.now()}.png`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleRetake = () => {
    setUploadedImage(null)
    setImageState({ x: 0, y: 0, scale: 1 })
    setCropBox({ x: 50, y: 50, width: 300, height: 400 })
    setMergedImage(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <div className="app">
      <div className="container">

        {!uploadedImage ? (
          <div className="upload-section">
            <div className="upload-box">
              <p>Upload an image to get started</p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="file-input"
              />
              <button onClick={() => fileInputRef.current?.click()} className="upload-btn">
                Choose Image
              </button>
              <p className="file-size-note">Max size: 5MB</p>
            </div>
          </div>
        ) : !mergedImage ? (
          <div className="editor-section">
            <div className="crop-instructions">
              <p>🖱️ Drag corners or edges to resize • Drag inside box to move</p>
            </div>

            <div
              className="crop-editor"
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            >
              <Stage
                width={STAGE_WIDTH}
                height={STAGE_HEIGHT}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                ref={stageRef}
              >
                <Layer>
                  {/* Background image */}
                  {uploadedImage && (
                    <KonvaImage
                      image={uploadedImage}
                      x={imageState.x}
                      y={imageState.y}
                      scaleX={imageScale}
                      scaleY={imageScale}
                      opacity={0.8}
                    />
                  )}

                  {/* Crop box with overlay and border */}
                  {/* Darkened areas outside crop box */}
                  <Rect
                    x={0}
                    y={0}
                    width={STAGE_WIDTH}
                    height={cropBox.y}
                    fill="#000000"
                    opacity={0.3}
                  />
                  <Rect
                    x={0}
                    y={cropBox.y}
                    width={cropBox.x}
                    height={cropBox.height}
                    fill="#000000"
                    opacity={0.3}
                  />
                  <Rect
                    x={cropBox.x + cropBox.width}
                    y={cropBox.y}
                    width={STAGE_WIDTH - cropBox.x - cropBox.width}
                    height={cropBox.height}
                    fill="#000000"
                    opacity={0.3}
                  />
                  <Rect
                    x={0}
                    y={cropBox.y + cropBox.height}
                    width={STAGE_WIDTH}
                    height={STAGE_HEIGHT - cropBox.y - cropBox.height}
                    fill="#000000"
                    opacity={0.3}
                  />

                  {/* Main crop box outline */}
                  <Rect
                    x={cropBox.x}
                    y={cropBox.y}
                    width={cropBox.width}
                    height={cropBox.height}
                    fill="transparent"
                    stroke={GRID_COLOR}
                    strokeWidth={3}
                    dash={[8, 4]}
                    onMouseDown={(e) => handleMouseDown(e, 'move')}
                    cursor="move"
                  />

                  {/* Corner handles - larger and more visible */}
                  <Rect
                    x={cropBox.x - HANDLE_SIZE / 2}
                    y={cropBox.y - HANDLE_SIZE / 2}
                    width={HANDLE_SIZE}
                    height={HANDLE_SIZE}
                    fill={GRID_COLOR}
                    stroke="white"
                    strokeWidth={2}
                    cornerRadius={2}
                    onMouseDown={(e) => handleMouseDown(e, HANDLES.TL)}
                    cursor="nwse-resize"
                    opacity={isDragging && dragHandle === HANDLES.TL ? 1 : 0.9}
                  />
                  <Rect
                    x={cropBox.x + cropBox.width - HANDLE_SIZE / 2}
                    y={cropBox.y - HANDLE_SIZE / 2}
                    width={HANDLE_SIZE}
                    height={HANDLE_SIZE}
                    fill={GRID_COLOR}
                    stroke="white"
                    strokeWidth={2}
                    cornerRadius={2}
                    onMouseDown={(e) => handleMouseDown(e, HANDLES.TR)}
                    cursor="nesw-resize"
                    opacity={isDragging && dragHandle === HANDLES.TR ? 1 : 0.9}
                  />
                  <Rect
                    x={cropBox.x - HANDLE_SIZE / 2}
                    y={cropBox.y + cropBox.height - HANDLE_SIZE / 2}
                    width={HANDLE_SIZE}
                    height={HANDLE_SIZE}
                    fill={GRID_COLOR}
                    stroke="white"
                    strokeWidth={2}
                    cornerRadius={2}
                    onMouseDown={(e) => handleMouseDown(e, HANDLES.BL)}
                    cursor="nesw-resize"
                    opacity={isDragging && dragHandle === HANDLES.BL ? 1 : 0.9}
                  />
                  <Rect
                    x={cropBox.x + cropBox.width - HANDLE_SIZE / 2}
                    y={cropBox.y + cropBox.height - HANDLE_SIZE / 2}
                    width={HANDLE_SIZE}
                    height={HANDLE_SIZE}
                    fill={GRID_COLOR}
                    stroke="white"
                    strokeWidth={2}
                    cornerRadius={2}
                    onMouseDown={(e) => handleMouseDown(e, HANDLES.BR)}
                    cursor="nwse-resize"
                    opacity={isDragging && dragHandle === HANDLES.BR ? 1 : 0.9}
                  />

                  {/* Edge handles - slightly smaller and less opaque */}
                  <Rect
                    x={cropBox.x + cropBox.width / 2 - HANDLE_SIZE / 2}
                    y={cropBox.y - HANDLE_SIZE / 2}
                    width={HANDLE_SIZE}
                    height={HANDLE_SIZE}
                    fill={GRID_COLOR}
                    stroke="white"
                    strokeWidth={1.5}
                    cornerRadius={1}
                    opacity={isDragging && dragHandle === HANDLES.T ? 1 : 0.6}
                    onMouseDown={(e) => handleMouseDown(e, HANDLES.T)}
                    cursor="ns-resize"
                  />
                  <Rect
                    x={cropBox.x + cropBox.width / 2 - HANDLE_SIZE / 2}
                    y={cropBox.y + cropBox.height - HANDLE_SIZE / 2}
                    width={HANDLE_SIZE}
                    height={HANDLE_SIZE}
                    fill={GRID_COLOR}
                    stroke="white"
                    strokeWidth={1.5}
                    cornerRadius={1}
                    opacity={isDragging && dragHandle === HANDLES.B ? 1 : 0.6}
                    onMouseDown={(e) => handleMouseDown(e, HANDLES.B)}
                    cursor="ns-resize"
                  />
                  <Rect
                    x={cropBox.x - HANDLE_SIZE / 2}
                    y={cropBox.y + cropBox.height / 2 - HANDLE_SIZE / 2}
                    width={HANDLE_SIZE}
                    height={HANDLE_SIZE}
                    fill={GRID_COLOR}
                    stroke="white"
                    strokeWidth={1.5}
                    cornerRadius={1}
                    opacity={isDragging && dragHandle === HANDLES.L ? 1 : 0.6}
                    onMouseDown={(e) => handleMouseDown(e, HANDLES.L)}
                    cursor="ew-resize"
                  />
                  <Rect
                    x={cropBox.x + cropBox.width - HANDLE_SIZE / 2}
                    y={cropBox.y + cropBox.height / 2 - HANDLE_SIZE / 2}
                    width={HANDLE_SIZE}
                    height={HANDLE_SIZE}
                    fill={GRID_COLOR}
                    stroke="white"
                    strokeWidth={1.5}
                    cornerRadius={1}
                    opacity={isDragging && dragHandle === HANDLES.R ? 1 : 0.6}
                    onMouseDown={(e) => handleMouseDown(e, HANDLES.R)}
                    cursor="ew-resize"
                  />
                </Layer>
              </Stage>
            </div>



            <div className="action-buttons">
              <button onClick={handleMergeImages} className="btn btn-primary">
                Preview Result
              </button>
              <button onClick={handleRetake} className="btn btn-secondary">
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="preview-section">
            <img src={mergedImage} alt="Merged result" className="preview-image" />

            <div className="action-buttons">
              <button onClick={handleExportImage} className="btn btn-primary">
                Looks Good - Download
              </button>
              <button onClick={handleRetake} className="btn btn-secondary">
                Retake
              </button>
            </div>
          </div>
        )}
      </div>

      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </div>
  )
}

export default ImageCropper
