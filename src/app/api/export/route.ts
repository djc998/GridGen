import { NextRequest, NextResponse } from 'next/server'
import JSZip from 'jszip'
import { createObjectCsvStringifier } from 'csv-writer'
import sharp from 'sharp'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

async function fetchAndConvertToJpg(url: string): Promise<Buffer> {
  try {
    const response = await fetch(url)
    const arrayBuffer = await response.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    
    // Create a sharp instance with better error handling and format support
    const image = sharp(buffer, {
      failOn: 'none',
      limitInputPixels: false
    })

    // Get image metadata to determine format
    const metadata = await image.metadata()
    
    // Convert to JPEG with specific options for better compatibility
    return image
      .toFormat('jpeg', { 
        quality: 90,
        chromaSubsampling: '4:4:4',
        force: true 
      })
      .toBuffer()
  } catch (error) {
    console.error(`Error processing image from URL ${url}:`, error)
    throw new Error(`Failed to process image: ${error.message}`)
  }
}

export async function POST(request: NextRequest) {
  try {
    const { images } = await request.json()
    
    // Create a new ZIP file
    const zip = new JSZip()
    
    // Create CSV content
    const csvStringifier = createObjectCsvStringifier({
      header: [
        { id: 'category', title: 'Category' },
        { id: 'name', title: 'Name' },
        { id: 'original', title: 'Original Image' },
        { id: 'grid15', title: '15x15 Image' },
        { id: 'grid10', title: '10x10 Image' },
        { id: 'grid5', title: '5x5 Image' },
      ]
    })

    const records = images.map((image: any, index: number) => {
      const sequentialNumber = String(index + 1).padStart(3, '0')
      const fileName = `${sequentialNumber}_${image.name}_${image.id}`
      return {
        category: image.category,
        name: image.name,
        original: `original/${fileName}.jpg`,
        grid15: `grid15/${fileName}.jpg`,
        grid10: `grid10/${fileName}.jpg`,
        grid5: `grid5/${fileName}.jpg`,
      }
    })

    const csvContent = csvStringifier.getHeaderString() + csvStringifier.stringifyRecords(records)
    zip.file('images.csv', csvContent)

    // Process and add images to ZIP with error handling for individual images
    const results = await Promise.allSettled(images.map(async (image: any, index: number) => {
      try {
        const sequentialNumber = String(index + 1).padStart(3, '0')
        const fileName = `${sequentialNumber}_${image.name}_${image.id}`
        
        // Convert and add each image with individual error handling
        const [originalJpg, grid15Jpg, grid10Jpg, grid5Jpg] = await Promise.all([
          fetchAndConvertToJpg(image.original_url),
          fetchAndConvertToJpg(image.grid15_url),
          fetchAndConvertToJpg(image.grid10_url),
          fetchAndConvertToJpg(image.grid5_url)
        ])

        zip.file(`original/${fileName}.jpg`, originalJpg)
        zip.file(`grid15/${fileName}.jpg`, grid15Jpg)
        zip.file(`grid10/${fileName}.jpg`, grid10Jpg)
        zip.file(`grid5/${fileName}.jpg`, grid5Jpg)

        return { success: true, name: image.name }
      } catch (error) {
        console.error(`Error processing image ${image.name}:`, error)
        return { success: false, name: image.name, error: error.message }
      }
    }))

    // Check for any failed images
    const failedImages = results
      .filter((result): result is PromiseRejectedResult => result.status === 'rejected')
      .map(result => result.reason.name)

    if (failedImages.length > 0) {
      return NextResponse.json({
        error: `Failed to process some images: ${failedImages.join(', ')}`,
        partialSuccess: true
      }, { status: 207 })
    }

    // Generate ZIP file
    const zipBuffer = await zip.generateAsync({
      type: 'nodebuffer',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 }
    })

    // Return ZIP file
    return new NextResponse(zipBuffer, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename=exported_images_${new Date().toISOString().split('T')[0]}.zip`
      }
    })
  } catch (error) {
    console.error('Export error:', error)
    return NextResponse.json({ 
      error: 'Failed to export images',
      details: error.message 
    }, { status: 500 })
  }
} 