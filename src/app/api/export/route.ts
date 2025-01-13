import { NextRequest, NextResponse } from 'next/server'
import JSZip from 'jszip'
import { createObjectCsvStringifier } from 'csv-writer'
import sharp from 'sharp'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

async function fetchAndConvertToJpg(url: string): Promise<Buffer> {
  const response = await fetch(url)
  const arrayBuffer = await response.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)
  
  return sharp(buffer)
    .jpeg({ quality: 90 })
    .toBuffer()
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

    // Process and add images to ZIP
    await Promise.all(images.map(async (image: any, index: number) => {
      try {
        const sequentialNumber = String(index + 1).padStart(3, '0')
        const fileName = `${sequentialNumber}_${image.name}_${image.id}`
        
        // Convert and add original image
        const originalJpg = await fetchAndConvertToJpg(image.original_url)
        zip.file(`original/${fileName}.jpg`, originalJpg)

        // Convert and add grid images
        const grid15Jpg = await fetchAndConvertToJpg(image.grid15_url)
        zip.file(`grid15/${fileName}.jpg`, grid15Jpg)

        const grid10Jpg = await fetchAndConvertToJpg(image.grid10_url)
        zip.file(`grid10/${fileName}.jpg`, grid10Jpg)

        const grid5Jpg = await fetchAndConvertToJpg(image.grid5_url)
        zip.file(`grid5/${fileName}.jpg`, grid5Jpg)
      } catch (error) {
        console.error(`Error processing image ${image.name}:`, error)
        throw error
      }
    }))

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
    return NextResponse.json({ error: 'Failed to export images' }, { status: 500 })
  }
} 