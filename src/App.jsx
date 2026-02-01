import { useState, useRef, useEffect } from 'react'
import { Stage, Layer, Image as KonvaImage, Rect } from 'react-konva'
import './App.css'
import templateImage from './assets/template.png'

// Cache clear marker - v2
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
  const [userName, setUserName] = useState('') // User name state
  const [errorMessage, setErrorMessage] = useState('') // Error message state
  const [isProcessing, setIsProcessing] = useState(false) // Loading state
  const [isCameraActive, setIsCameraActive] = useState(false) // Camera state
  const [cameraFacing, setCameraFacing] = useState('environment') // 'environment' (back) or 'user' (front)
  const fileInputRef = useRef(null)
  const cameraInputRef = useRef(null)
  const canvasRef = useRef(null)
  const imageRef = useRef(null)
  const stageRef = useRef(null)
  const videoRef = useRef(null)
  const streamRef = useRef(null)

  // Show error message
  const showError = (message) => {
    setErrorMessage(message)
    setTimeout(() => setErrorMessage(''), 4000) // Auto-clear after 4 seconds
  }

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

    if (file.size > 10 * 1024 * 1024) {
      showError('Image size exceeds 10MB. Please choose a smaller image.')
      return
    }

    // Validate name from input
    if (!userName.trim()) {
      showError('Please enter your name first')
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

  // Handle mouse/touch down on crop box
  const handleMouseDown = (e) => {
    e.preventDefault()
  }



  // Handle pointer move on any handle
  const handlePointerMove = (e) => {
    if (!isDragging || !dragHandle) return

    const stage = stageRef.current
    if (!stage) return

    const pos = stage.getPointerPosition()
    if (!pos) return

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

  const handlePointerUp = () => {
    setIsDragging(false)
    setDragHandle(null)
  }

  // Merge images
  const handleMergeImages = async () => {
    if (!uploadedImage) {
      showError('Please upload an image first')
      return
    }

    setIsProcessing(true)
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
        let fontSize = Math.min(availableHeight * 0.85, availableWidth / (userName.length * 0.55))
        
        // Try the calculated font size and adjust if text is still too wide
        let attempts = 0
        while (attempts < 5) {
          ctx.font = `bold ${Math.round(fontSize)}px Arial`
          const metrics = ctx.measureText(userName)
          if (metrics.width <= availableWidth) break
          fontSize *= 0.9 // Reduce by 10% if too wide
          attempts++
        }

        // Draw text centered (both horizontally and vertically)
        ctx.fillStyle = CONFIG.textFgColor
        ctx.font = `bold ${Math.round(fontSize)}px Arial`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        // Center point of the text region
        const centerX = textX + textWidth / 2
        const centerY = textY + textHeight / 2
        ctx.fillText(userName, centerX, centerY)

        const mergedDataUrl = canvas.toDataURL('image/png')
        setMergedImage(mergedDataUrl)
      }
      templateImg.src = templateImage
    } catch (error) {
      console.error('Error merging images:', error)
      showError('Error merging images. Please try again.')
    } finally {
      setIsProcessing(false)
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
    // Keep userName - don't clear it
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
    if (cameraInputRef.current) {
      cameraInputRef.current.value = ''
    }
  }

  const startCamera = async (facing = 'environment') => {
    try {
      setErrorMessage('')
      setCameraFacing(facing)
      
      // Stop existing stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
      }
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facing }
      })
      streamRef.current = stream
      setIsCameraActive(true)
      
      // Set video src after a brief delay to ensure element is mounted
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream
        }
      }, 100)
    } catch (err) {
      if (err.name === 'NotAllowedError') {
        showError('Camera permission denied. Please allow camera access.')
      } else if (err.name === 'NotFoundError') {
        showError('No camera found on this device.')
      } else if (err.name === 'NotReadableError') {
        showError('Camera is already in use by another app.')
      } else {
        showError('Unable to access camera. ' + err.message)
      }
    }
  }

  const toggleCamera = () => {
    const newFacing = cameraFacing === 'environment' ? 'user' : 'environment'
    startCamera(newFacing)
  }

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    setIsCameraActive(false)
  }

  const capturePhoto = () => {
    if (!videoRef.current) return
    
    const canvas = document.createElement('canvas')
    canvas.width = videoRef.current.videoWidth
    canvas.height = videoRef.current.videoHeight
    const ctx = canvas.getContext('2d')
    ctx.drawImage(videoRef.current, 0, 0)
    
    const dataUrl = canvas.toDataURL('image/jpeg')
    const img = new window.Image()
    img.onload = () => {
      setUploadedImage(img)
      const scaleX = STAGE_WIDTH / img.width
      const scaleY = STAGE_HEIGHT / img.height
      const fitScale = Math.min(scaleX, scaleY)
      const clampedScale = Math.min(fitScale, MAX_SCALE)
      
      const scaledWidth = img.width * clampedScale
      const scaledHeight = img.height * clampedScale
      const imgX = (STAGE_WIDTH - scaledWidth) / 2
      const imgY = (STAGE_HEIGHT - scaledHeight) / 2

      setImageScale(clampedScale)
      setImageState({ x: imgX, y: imgY, scale: clampedScale })
      
      const margin = 0.08
      const cropWidth = scaledWidth * (1 - 2 * margin)
      const cropHeight = scaledHeight * (1 - 2 * margin)
      const cropX = imgX + scaledWidth * margin
      const cropY = imgY + scaledHeight * margin
      
      setCropBox({ x: cropX, y: cropY, width: cropWidth, height: cropHeight })
      setMergedImage(null)
      stopCamera()
    }
    img.src = dataUrl
  }

  return (
    <div className="app">
      {isCameraActive && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: '#000',
          zIndex: 1000,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center'
        }}>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover'
            }}
          />
          <div style={{
            position: 'absolute',
            bottom: '20px',
            display: 'flex',
            gap: '15px',
            zIndex: 1001,
            flexWrap: 'wrap',
            justifyContent: 'center'
          }}>
            <button
              onClick={toggleCamera}
              style={{
                padding: '12px 30px',
                fontSize: '16px',
                backgroundColor: '#9b59b6',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: 'bold'
              }}
            >
              🔄 {cameraFacing === 'environment' ? 'Front' : 'Back'}
            </button>
            <button
              onClick={capturePhoto}
              style={{
                padding: '12px 30px',
                fontSize: '16px',
                backgroundColor: '#667eea',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: 'bold'
              }}
            >
              📸 Capture
            </button>
            <button
              onClick={stopCamera}
              style={{
                padding: '12px 30px',
                fontSize: '16px',
                backgroundColor: '#e74c3c',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: 'bold'
              }}
            >
              ✕ Cancel
            </button>
          </div>
        </div>
      )}
      <div className="container">
        <h1 className="app-title">✨ Swaminarayan Editor ✨</h1>

        <div className="app-content">
          {!uploadedImage ? (
          <div className="upload-section">
            <div className="upload-box">
              {errorMessage && (
                <div className="error-banner">
                  {errorMessage}
                </div>
              )}
              <p>Enter your name</p>
              <input
                type="text"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                placeholder=""
                maxLength="30"
                className="name-input"
              />
              <p>Upload an image to get started</p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="file-input"
              />
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleImageUpload}
                className="file-input"
              />
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                <button 
                  onClick={() => {
                    if (!userName.trim()) {
                      showError('Please enter your name first')
                      return
                    }
                    fileInputRef.current?.click()
                  }} 
                  className="upload-btn btn-large">
                  Choose Image
                </button>
                <button 
                  onClick={() => {
                    if (!userName.trim()) {
                      showError('Please enter your name first')
                      return
                    }
                    startCamera()
                  }} 
                  className="upload-btn btn-large">
                  📷 Take Photo
                </button>
              </div>
              <p className="file-size-note">📦 Max size: 10MB</p>
            </div>
          </div>
        ) : !mergedImage ? (
          <div className="editor-section">
            <div className="crop-instructions">
              <p>🖱️ Drag the 4 corners to resize</p>
            </div>

            <div
              className="crop-editor"
              style={{ touchAction: 'none' }}
            >
              <Stage
                width={STAGE_WIDTH}
                height={STAGE_HEIGHT}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
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

                  {/* Draggable crop box area */}
                  <Rect
                    x={cropBox.x}
                    y={cropBox.y}
                    width={cropBox.width}
                    height={cropBox.height}
                    fill="transparent"
                    stroke={GRID_COLOR}
                    strokeWidth={2}
                    onPointerDown={(e) => {
                      e.cancelBubble = true
                      setIsDragging(true)
                      setDragHandle('move')
                    }}
                    cursor="grab"
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
                    onPointerDown={(e) => {
                      e.cancelBubble = true
                      setIsDragging(true)
                      setDragHandle(HANDLES.TL)
                    }}
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
                    onPointerDown={(e) => {
                      e.cancelBubble = true
                      setIsDragging(true)
                      setDragHandle(HANDLES.TR)
                    }}
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
                    onPointerDown={(e) => {
                      e.cancelBubble = true
                      setIsDragging(true)
                      setDragHandle(HANDLES.BL)
                    }}
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
                    onPointerDown={(e) => {
                      e.cancelBubble = true
                      setIsDragging(true)
                      setDragHandle(HANDLES.BR)
                    }}
                    cursor="nwse-resize"
                    opacity={isDragging && dragHandle === HANDLES.BR ? 1 : 0.9}
                  />
                </Layer>
              </Stage>
            </div>
          </div>
        ) : (
          <div className="preview-section">
            <img src={mergedImage} alt="Merged result" className="preview-image" />
          </div>
        )}
        </div>

        {uploadedImage && !mergedImage && (
          <div className="action-buttons">
            {isProcessing ? (
              <div className="loader-container">
                <div className="spinner"></div>
                <p>Rendering preview...</p>
              </div>
            ) : (
              <>
                <button onClick={handleMergeImages} className="btn btn-primary btn-download">
                  Preview Result
                </button>
                <button onClick={handleRetake} className="btn btn-secondary">
                  Cancel
                </button>
              </>
            )}
          </div>
        )}

        {mergedImage && (
          <div className="action-buttons">
            {isProcessing ? (
              <div className="loader-container">
                <div className="spinner"></div>
                <p>Processing...</p>
              </div>
            ) : (
              <>
                <button onClick={handleExportImage} className="btn btn-primary btn-download">
                  📥 Download
                </button>
                <button onClick={handleRetake} className="btn btn-secondary">
                  🔄 Retake
                </button>
              </>
            )}
          </div>
        )}
      </div>

      <div className="app-footer">
        Made with ❤️ &nbsp; by AJ
      </div>

      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </div>
  )
}

export default ImageCropper
