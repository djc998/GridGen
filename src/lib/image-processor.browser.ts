interface ProcessedImages {
  original: Blob
  grid15: Blob
  grid10: Blob
  grid5: Blob
}

export async function processImage(file: File): Promise<ProcessedImages> {
  // Create a canvas to work with the image
  const createCanvas = (width: number, height: number) => {
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    return canvas
  }

  // Load image and get its dimensions
  const loadImage = (src: string | Blob): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => resolve(img)
      img.onerror = reject
      img.src = src instanceof Blob ? URL.createObjectURL(src) : src
    })
  }

  // Create grid effect
  const createGridImage = async (img: HTMLImageElement, gridSize: number): Promise<Blob> => {
    const canvas = createCanvas(img.width, img.height)
    const ctx = canvas.getContext('2d')!
    
    const cellWidth = Math.floor(img.width / gridSize)
    const cellHeight = Math.floor(img.height / gridSize)

    // Create array of positions
    const positions = []
    for (let y = 0; y < gridSize; y++) {
      for (let x = 0; x < gridSize; x++) {
        positions.push({ x, y })
      }
    }

    // Shuffle positions
    const shuffledPositions = [...positions]
    for (let i = shuffledPositions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffledPositions[i], shuffledPositions[j]] = [shuffledPositions[j], shuffledPositions[i]]
    }

    // Draw scrambled grid
    for (let i = 0; i < positions.length; i++) {
      const sourcePos = positions[i]
      const targetPos = shuffledPositions[i]

      // Draw cell
      ctx.drawImage(
        img,
        sourcePos.x * cellWidth,
        sourcePos.y * cellHeight,
        cellWidth,
        cellHeight,
        targetPos.x * cellWidth,
        targetPos.y * cellHeight,
        cellWidth,
        cellHeight
      )
    }

    // Draw grid lines
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)'
    ctx.lineWidth = 1

    for (let x = 0; x <= gridSize; x++) {
      ctx.beginPath()
      ctx.moveTo(x * cellWidth, 0)
      ctx.lineTo(x * cellWidth, img.height)
      ctx.stroke()
    }

    for (let y = 0; y <= gridSize; y++) {
      ctx.beginPath()
      ctx.moveTo(0, y * cellHeight)
      ctx.lineTo(img.width, y * cellHeight)
      ctx.stroke()
    }

    return new Promise((resolve) => {
      canvas.toBlob(blob => resolve(blob!), 'image/webp', 0.9)
    })
  }

  try {
    // Load and resize image
    const img = await loadImage(file)
    
    // Create a canvas for the resized image
    const maxSize = 1000
    let width = img.width
    let height = img.height
    
    if (width > maxSize || height > maxSize) {
      const ratio = Math.min(maxSize / width, maxSize / height)
      width = Math.floor(width * ratio)
      height = Math.floor(height * ratio)
    }

    const canvas = createCanvas(width, height)
    const ctx = canvas.getContext('2d')!
    ctx.drawImage(img, 0, 0, width, height)

    // Get original as WebP
    const original = await new Promise<Blob>((resolve) => {
      canvas.toBlob(blob => resolve(blob!), 'image/webp', 0.9)
    })

    // Create grid versions
    const resizedImg = await loadImage(original)
    const [grid15, grid10, grid5] = await Promise.all([
      createGridImage(resizedImg, 15),
      createGridImage(resizedImg, 10),
      createGridImage(resizedImg, 5)
    ])

    return {
      original,
      grid15,
      grid10,
      grid5
    }
  } catch (error) {
    console.error('Browser image processing error:', error)
    throw error
  }
} 