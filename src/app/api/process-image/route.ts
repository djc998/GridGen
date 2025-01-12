import { NextRequest, NextResponse } from 'next/server'
import sharp from 'sharp'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('image') as Blob
    const format = (formData.get('format') as string) || 'jpg'
    
    console.log('Received image processing request:', {
      format,
      fileSize: file?.size
    })

    if (!file) {
      return NextResponse.json(
        { error: 'No image provided' },
        { status: 400 }
      )
    }

    // Convert File to Buffer
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    console.log('Processing image with sharp...')

    // Process all versions
    const [original, grid15, grid10, grid5] = await Promise.all([
      (sharp(buffer) as any)[format === 'jpg' ? 'jpeg' : format]({ quality: 90 })
        .toBuffer(),
      createGridImage(buffer, 15, format),
      createGridImage(buffer, 10, format),
      createGridImage(buffer, 5, format)
    ])

    console.log('Image processing complete:', {
      originalSize: original.length,
      grid15Size: grid15.length,
      grid10Size: grid10.length,
      grid5Size: grid5.length
    })

    return NextResponse.json({
      original,
      grid15,
      grid10,
      grid5
    })
  } catch (error) {
    console.error('Image processing error:', error)
    return NextResponse.json(
      { error: 'Failed to process image' },
      { status: 500 }
    )
  }
}

async function createGridImage(buffer: Buffer, gridSize: number, format: string): Promise<Buffer> {
  const image = sharp(buffer)
  const metadata = await image.metadata()
  
  if (!metadata.width || !metadata.height) {
    throw new Error('Unable to get image dimensions')
  }

  // Create pixelated effect by resizing down and up
  return (image as any)
    .resize(gridSize, Math.floor((metadata.height / metadata.width) * gridSize), {
      fit: 'fill'
    })
    .resize(metadata.width, metadata.height, {
      fit: 'fill',
      kernel: 'nearest'
    })
    [format === 'jpg' ? 'jpeg' : format]({ quality: 90 })
    .toBuffer()
} 