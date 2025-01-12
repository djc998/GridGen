import { supabase } from '@/lib/supabase'
import { processImage } from '@/lib/image-processing'

export async function uploadImage(file: File, userId: string, name: string, category: string, isPublished: boolean) {
  // Generate a unique filename
  const timestamp = Date.now()
  const uniqueFileName = `${timestamp}_${file.name}`

  try {
    // Upload original image first
    const { data: originalUpload, error: originalError } = await supabase.storage
      .from('images')
      .upload(`original/${uniqueFileName}`, new Blob([file]), {
        contentType: file.type || 'image/jpeg',
        cacheControl: '3600',
        upsert: false
      })

    if (originalError) {
      console.error('Original upload error:', originalError)
      throw originalError
    }

    console.log('Original uploaded successfully', originalUpload)

    // Process image to create grid versions
    const processedData = await processImage(file)

    // Upload grid versions with unique filenames
    const [grid15Result, grid10Result, grid5Result] = await Promise.all([
      supabase.storage
        .from('images')
        .upload(`grid15/${uniqueFileName}`, new Blob([processedData.grid15]), {
          contentType: 'image/jpeg',
          cacheControl: '3600',
          upsert: false
        }),
      supabase.storage
        .from('images')
        .upload(`grid10/${uniqueFileName}`, new Blob([processedData.grid10]), {
          contentType: 'image/jpeg',
          cacheControl: '3600',
          upsert: false
        }),
      supabase.storage
        .from('images')
        .upload(`grid5/${uniqueFileName}`, new Blob([processedData.grid5]), {
          contentType: 'image/jpeg',
          cacheControl: '3600',
          upsert: false
        })
    ])

    // Generate public URLs
    const originalUrl = supabase.storage.from('images').getPublicUrl(originalUpload.path).data.publicUrl
    const grid15Path = grid15Result.data?.path;
    if (!grid15Path) {
      throw new Error('Failed to get path for grid15 image');
    }
    const grid15Url = supabase.storage.from('images').getPublicUrl(grid15Path).data.publicUrl;

    const grid10Path = grid10Result.data?.path;
    if (!grid10Path) {
      throw new Error('Failed to get path for grid10 image');
    }
    const grid10Url = supabase.storage.from('images').getPublicUrl(grid10Path).data.publicUrl;

    const grid5Path = grid5Result.data?.path;
    if (!grid5Path) {
      throw new Error('Failed to get path for grid5 image');
    }
    const grid5Url = supabase.storage.from('images').getPublicUrl(grid5Path).data.publicUrl;

    console.log('Generated URLs:', { originalUrl, grid15Url, grid10Url, grid5Url })

    // Save to database
    console.log('Saving to database...')
    const { data: imageData, error: insertError } = await supabase
      .from('images')
      .insert({
        user_id: userId,
        name,
        category,
        original_url: originalUrl,
        grid15_url: grid15Url,
        grid10_url: grid10Url,
        grid5_url: grid5Url,
        published: isPublished
      })
      .select()
      .single()

    if (insertError) {
      console.error('Database insert error:', insertError)
      throw insertError
    }

    console.log('Image saved successfully:', imageData)
    return imageData
  } catch (error) {
    console.error('Error processing image:', error)
    throw error
  }
} 