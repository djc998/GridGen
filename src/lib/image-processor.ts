import sharp, { OverlayOptions } from 'sharp'

export async function processImage(file: File): Promise<{
  original: Buffer
  grid15: Buffer
  grid10: Buffer
  grid5: Buffer
}> {
  try {
    const buffer = await file.arrayBuffer()
    const imageBuffer = Buffer.from(buffer)

    // Log initial buffer info
    console.log('Initial buffer info:', {
      size: buffer.byteLength,
      type: file.type
    })

    // First convert to PNG to ensure format compatibility
    const normalizedImage = await sharp(imageBuffer)
      .png()
      .toBuffer()

    // Validate image format
    const metadata = await sharp(normalizedImage).metadata()
    console.log('Image metadata:', metadata)

    if (!metadata.format) {
      throw new Error('Unsupported image format')
    }

    // Resize the normalized image
    let resizedImage: Buffer
    try {
      resizedImage = await sharp(normalizedImage)
        .rotate() // Auto-rotate based on EXIF data
        .resize(1000, 1000, {
          fit: 'inside',
          withoutEnlargement: true
        })
        .png() // Keep as PNG for processing
        .toBuffer()
    } catch (resizeError) {
      console.error('Resize error:', resizeError)
      throw new Error(`Failed to resize image: ${resizeError.message}`)
    }

    // Process original (convert to WebP for final output)
    let original: Buffer
    try {
      original = await sharp(resizedImage)
        .webp({ quality: 90 })
        .toBuffer()
    } catch (originalError) {
      console.error('Original processing error:', originalError)
      throw new Error(`Failed to process original image: ${originalError.message}`)
    }

    // Create grid versions
    let grid15: Buffer, grid10: Buffer, grid5: Buffer
    try {
      grid15 = await createGridImage(resizedImage, 15)
    } catch (error) {
      console.error('Grid 15x15 error:', error)
      throw new Error(`Failed to create 15x15 grid: ${error.message}`)
    }

    try {
      grid10 = await createGridImage(resizedImage, 10)
    } catch (error) {
      console.error('Grid 10x10 error:', error)
      throw new Error(`Failed to create 10x10 grid: ${error.message}`)
    }

    try {
      grid5 = await createGridImage(resizedImage, 5)
    } catch (error) {
      console.error('Grid 5x5 error:', error)
      throw new Error(`Failed to create 5x5 grid: ${error.message}`)
    }

    return {
      original,
      grid15,
      grid10,
      grid5,
    }
  } catch (error) {
    console.error('Image processing error:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    })
    throw error
  }
}

async function createGridImage(imageBuffer: Buffer, gridSize: number): Promise<Buffer> {
  try {
    const metadata = await sharp(imageBuffer).metadata()
    if (!metadata.width || !metadata.height) {
      throw new Error('Unable to get image dimensions')
    }

    // Calculate grid cell dimensions
    const cellWidth = Math.floor(metadata.width / gridSize)
    const cellHeight = Math.floor(metadata.height / gridSize)

    // Create array of all grid positions
    const positions = []
    for (let y = 0; y < gridSize; y++) {
      for (let x = 0; x < gridSize; x++) {
        positions.push({ x, y })
      }
    }

    // Create a deep copy for shuffling
    const shuffledPositions = [...positions]
    // Fisher-Yates shuffle
    for (let i = shuffledPositions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffledPositions[i], shuffledPositions[j]] = [shuffledPositions[j], shuffledPositions[i]]
    }

    // Create a blank white canvas
    const canvas = await sharp({
      create: {
        width: metadata.width,
        height: metadata.height,
        channels: 4,
        background: { r: 255, g: 255, b: 255, alpha: 1 }
      }
    })
    .png()
    .toBuffer()

    // Extract and shuffle grid cells
    const compositeOperations = []
    for (let i = 0; i < positions.length; i++) {
      const sourcePos = positions[i]
      const targetPos = shuffledPositions[i]

      // Extract the cell from the original position
      const cellBuffer = await sharp(imageBuffer)
        .extract({
          left: sourcePos.x * cellWidth,
          top: sourcePos.y * cellHeight,
          width: cellWidth,
          height: cellHeight
        })
        .png()
        .toBuffer()

      // Add to composite operations with shuffled position
      compositeOperations.push({
        input: cellBuffer,
        left: targetPos.x * cellWidth,
        top: targetPos.y * cellHeight,
        blend: 'over'
      })
    }

    // Create the scrambled image
    const scrambledImage = await sharp(canvas)
      .composite(compositeOperations as OverlayOptions[])
      .png()
      .toBuffer()

    // Add grid lines
    const gridLines = await createGridLines(metadata.width, metadata.height, gridSize)
    
    // Composite the grid lines over the scrambled image
    const finalImage = await sharp(scrambledImage)
      .composite([{
        input: gridLines,
        blend: 'over'
      }])
      .webp({ quality: 90 })
      .toBuffer()

    return finalImage
  } catch (error) {
    console.error('Grid creation error:', error)
    throw error
  }
}

// Helper function to create grid lines
async function createGridLines(width: number, height: number, gridSize: number): Promise<Buffer> {
  const cellWidth = Math.floor(width / gridSize)
  const cellHeight = Math.floor(height / gridSize)
  
  // Create a transparent canvas
  const svg = `
    <svg width="${width}" height="${height}">
      <defs>
        <pattern id="grid" width="${cellWidth}" height="${cellHeight}" patternUnits="userSpaceOnUse">
          <path d="M ${cellWidth} 0 L 0 0 0 ${cellHeight}" 
                fill="none" 
                stroke="black" 
                stroke-width="2"
                stroke-opacity="0.2"/>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#grid)" />
    </svg>
  `

  return await sharp(Buffer.from(svg))
    .png()
    .toBuffer()
} 