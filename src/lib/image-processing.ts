function loadImage(file: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = URL.createObjectURL(file)
  })
}

function createGridImage(img: HTMLImageElement, gridSize: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')!

    // Set canvas size to the original image size
    canvas.width = img.width
    canvas.height = img.height

    // Calculate the size of each grid cell
    const cellWidth = img.width / gridSize
    const cellHeight = img.height / gridSize

    // Create an array to hold the grid cells
    const grid: { x: number, y: number }[] = []

    // Fill the grid with the original positions
    for (let y = 0; y < gridSize; y++) {
      for (let x = 0; x < gridSize; x++) {
        grid.push({ x, y })
      }
    }

    // Shuffle the grid
    for (let i = grid.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[grid[i], grid[j]] = [grid[j], grid[i]]
    }

    // Draw the scrambled image
    grid.forEach(({ x, y }, index) => {
      const srcX = (index % gridSize) * cellWidth
      const srcY = Math.floor(index / gridSize) * cellHeight
      const destX = x * cellWidth
      const destY = y * cellHeight

      ctx.drawImage(
        img,
        srcX, srcY, cellWidth, cellHeight,
        destX, destY, cellWidth, cellHeight
      )
    })

    // Convert the canvas to a Blob
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob)
      } else {
        reject(new Error('Failed to create grid image'))
      }
    }, 'image/webp', 0.9)
  })
}

export async function processImage(file: File): Promise<{
  original: Blob
  grid15: Blob
  grid10: Blob
  grid5: Blob
}> {
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

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
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