import { NextRequest, NextResponse } from 'next/server'
import { processImage } from '@/lib/image-processor'
import { createClient } from '@/lib/supabase/middleware'

const processedRequests = new Set<string>()

export async function POST(request: NextRequest) {
  const requestId = `${Date.now()}-${Math.random()}`
  console.log(`[${requestId}] Starting new request`)

  // Check if we've already processed this request
  if (processedRequests.has(requestId)) {
    console.log(`[${requestId}] Duplicate request detected`)
    return NextResponse.json(
      { error: 'Duplicate request' },
      { status: 400 }
    )
  }

  processedRequests.add(requestId)
  
  try {
    const { supabase } = createClient(request)

    // Get authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      console.error(`[${requestId}] Auth error:`, userError)
      return NextResponse.json(
        { error: 'Authentication error' },
        { status: 401 }
      )
    }

    console.log(`[${requestId}] Processing for user:`, user.id)

    // Get the form data
    const formData = await request.formData()
    const file = formData.get('file') as File
    const name = formData.get('name') as string
    const category = formData.get('category') as string
    const tags = JSON.parse(formData.get('tags') as string) as string[]
    const shouldSave = formData.get('save') === 'true'
    const published = formData.get('published') === 'true'

    if (!file || !name || !category) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Process the image
    const processed = await processImage(file)
    console.log(`[${requestId}] Image processed successfully`)

    // Generate unique filename with user ID to prevent collisions
    const timestamp = Date.now()
    const filename = `${user.id}_${timestamp}.webp`

    try {
      console.log(`[${requestId}] Starting file uploads`)
      // Upload to Supabase Storage
      const [originalUpload, grid15Upload, grid10Upload, grid5Upload] = await Promise.all([
        supabase.storage
          .from('images')
          .upload(`original/${filename}`, processed.original, {
            contentType: 'image/webp',
            upsert: false
          }),
        supabase.storage
          .from('images')
          .upload(`grid15/${filename}`, processed.grid15, {
            contentType: 'image/webp',
            upsert: false
          }),
        supabase.storage
          .from('images')
          .upload(`grid10/${filename}`, processed.grid10, {
            contentType: 'image/webp',
            upsert: false
          }),
        supabase.storage
          .from('images')
          .upload(`grid5/${filename}`, processed.grid5, {
            contentType: 'image/webp',
            upsert: false
          }),
      ])

      console.log(`[${requestId}] Files uploaded successfully`)

      // Check for upload errors
      const uploadErrors = [
        originalUpload.error,
        grid15Upload.error,
        grid10Upload.error,
        grid5Upload.error
      ].filter(Boolean)

      if (uploadErrors.length > 0) {
        console.error(`[${requestId}] Upload errors:`, uploadErrors)
        throw new Error('Failed to upload one or more images')
      }

      // Get public URLs
      const urls = {
        original: supabase.storage.from('images').getPublicUrl(`original/${filename}`).data.publicUrl,
        grid15: supabase.storage.from('images').getPublicUrl(`grid15/${filename}`).data.publicUrl,
        grid10: supabase.storage.from('images').getPublicUrl(`grid10/${filename}`).data.publicUrl,
        grid5: supabase.storage.from('images').getPublicUrl(`grid5/${filename}`).data.publicUrl,
      }

      let imageId = null

      // Only save to database if shouldSave is true
      if (shouldSave) {
        const uploadId = `${user.id}_${timestamp}`
        const { data: insertedImage, error: dbError } = await supabase
          .from('images')
          .upsert({
            user_id: user.id,
            upload_id: uploadId,
            name: name,
            category: category,
            published: published,
            original_url: urls.original,
            grid15_url: urls.grid15,
            grid10_url: urls.grid10,
            grid5_url: urls.grid5,
          }, {
            onConflict: 'upload_id',
            ignoreDuplicates: true
          })
          .select()
          .single()

        if (dbError) {
          console.error(`[${requestId}] Database error:`, dbError)
          // Clean up uploaded files if database insert fails
          await Promise.all([
            supabase.storage.from('images').remove([`original/${filename}`]),
            supabase.storage.from('images').remove([`grid15/${filename}`]),
            supabase.storage.from('images').remove([`grid10/${filename}`]),
            supabase.storage.from('images').remove([`grid5/${filename}`]),
          ])
          throw dbError
        }

        imageId = insertedImage.id

        // Add tags
        if (tags.length > 0) {
          await supabase
            .from('image_tags')
            .insert(
              tags.map(tag => ({
                image_id: imageId,
                tag_name: tag
              }))
            )
        }
      }

      return NextResponse.json({
        urls,
        imageId
      })

    } catch (uploadError) {
      console.error(`[${requestId}] Upload/database error:`, uploadError)
      processedRequests.delete(requestId)
      return NextResponse.json(
        { error: uploadError instanceof Error ? uploadError.message : 'Failed to upload images' },
        { status: 500 }
      )
    }

  } catch (error) {
    console.error(`[${requestId}] Processing error:`, error)
    processedRequests.delete(requestId)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to process image' },
      { status: 500 }
    )
  }
}

export const config = {
  api: {
    bodyParser: false,
  },
} 