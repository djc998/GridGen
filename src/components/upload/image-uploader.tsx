'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { processImage as processImageServer } from '@/lib/image-processor'
import { processImage as processImageBrowser } from '@/lib/image-processor.browser'
import { useAuth } from '@/components/providers/auth-provider'
import { useToast } from '@/components/ui/toast'
import LoadingSpinner from '@/components/ui/loading-spinner'
import ErrorBoundary from '@/components/ui/error-boundary'

const ALLOWED_FILE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/tiff'
]

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

interface UploadedImages {
  original: string
  grid15: string
  grid10: string
  grid5: string
}

interface Category {
  id: string
  name: string
}

interface Tag {
  id: string
  name: string
}

interface ImageUploaderProps {
  editId?: string | null
}

function ImageUploaderContent({ editId }: ImageUploaderProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [images, setImages] = useState<UploadedImages | null>(null)
  const [isLocalProcessing, setIsLocalProcessing] = useState(false)
  const { user } = useAuth()
  const router = useRouter()
  const { showToast } = useToast()
  const [imageName, setImageName] = useState('')
  const [category, setCategory] = useState('')
  const [categories, setCategories] = useState<Category[]>([])
  const [tags, setTags] = useState<Tag[]>([])
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [newTag, setNewTag] = useState('')
  const [lastUploadedFile, setLastUploadedFile] = useState<File | null>(null)
  const [isPublished, setIsPublished] = useState(false)

  // Fetch categories on component mount
  useEffect(() => {
    const fetchCategories = async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('name')

      if (error) {
        console.error('Error fetching categories:', error)
        return
      }

      setCategories(data || [])
    }

    fetchCategories()
  }, [])

  // Fetch tags on component mount
  useEffect(() => {
    const fetchTags = async () => {
      const { data, error } = await supabase
        .from('tags')
        .select('*')
        .order('name')

      if (error) {
        console.error('Error fetching tags:', error)
        return
      }

      setTags(data || [])
    }

    fetchTags()
  }, [])

  // Fetch image data if editing
  useEffect(() => {
    const fetchImageData = async () => {
      if (!editId) return

      console.log('Fetching image data for ID:', editId)

      try {
        const { data: image, error } = await supabase
          .from('images')
          .select(`
            *,
            image_tags (
              tag_name
            )
          `)
          .eq('id', editId)
          .single()

        if (error) {
          console.error('Fetch error:', error)
          throw error
        }

        console.log('Raw image data:', image)

        if (image) {
          // Explicitly handle the boolean conversion
          const publishedState = image.published === true

          console.log('Published state details:', {
            rawValue: image.published,
            convertedValue: publishedState,
            typeOfRaw: typeof image.published
          })

          setImageName(image.name)
          setCategory(image.category)
          setIsPublished(publishedState)
          setSelectedTags(image.image_tags.map((tag: any) => tag.tag_name))
          setImages({
            original: image.original_url,
            grid15: image.grid15_url,
            grid10: image.grid10_url,
            grid5: image.grid5_url,
          })
        }
      } catch (error) {
        console.error('Error fetching image:', error)
        showToast('Error loading image data', 'error')
      }
    }

    fetchImageData()
  }, [editId, showToast])

  const validateFile = (file: File): string | null => {
    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      return 'Unsupported file type. Please upload a JPEG, PNG, WebP, GIF, or TIFF image.'
    }
    if (file.size > MAX_FILE_SIZE) {
      return 'File is too large. Maximum size is 10MB.'
    }
    return null
  }

  const processLocally = async (file: File): Promise<UploadedImages> => {
    try {
      const processed = await processImageBrowser(file)
      
      // Create download links and trigger downloads
      const timestamp = Date.now()
      const downloads = {
        original: `original-${timestamp}.webp`,
        grid15: `grid15-${timestamp}.webp`,
        grid10: `grid10-${timestamp}.webp`,
        grid5: `grid5-${timestamp}.webp`
      }

      const urls = {
        original: URL.createObjectURL(processed.original),
        grid15: URL.createObjectURL(processed.grid15),
        grid10: URL.createObjectURL(processed.grid10),
        grid5: URL.createObjectURL(processed.grid5)
      }

      // Create download links
      Object.entries(processed).forEach(([key, blob]) => {
        const a = document.createElement('a')
        a.href = URL.createObjectURL(blob)
        a.download = downloads[key as keyof typeof downloads]
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
      })

      showToast('Images processed successfully', 'success')
      return urls
    } catch (error) {
      showToast('Failed to process images locally', 'error')
      throw error
    }
  }

  const processOnServer = async (file: File, save: boolean = false): Promise<UploadedImages> => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('name', imageName || file.name.split('.')[0])
    formData.append('category', category)
    formData.append('tags', JSON.stringify(selectedTags))
    formData.append('save', save.toString())
    formData.append('published', isPublished.toString())

    const response = await fetch('/api/process-image', {
      method: 'POST',
      body: formData,
      headers: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to process image')
    }

    const data = await response.json()
    return data.urls
  }

  const uploadImage = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const file = event.target.files?.[0]
      if (!file) return

      setLastUploadedFile(file) // Store the file for later use

      const validationError = validateFile(file)
      if (validationError) {
        showToast(validationError, 'error')
        return
      }

      if (!user) {
        router.push('/login')
        return
      }

      if (isUploading) return
      setIsUploading(true)

      let urls: UploadedImages
      if (isLocalProcessing) {
        urls = await processLocally(file)
      } else {
        urls = await processOnServer(file)
        showToast('Images processed successfully', 'success')
      }

      setImages(urls)
    } catch (error) {
      console.error('Upload failed:', error)
      showToast(
        error instanceof Error ? error.message : 'Upload failed. Please try again.',
        'error'
      )
    } finally {
      setIsUploading(false)
    }
  }

  // Cleanup object URLs when component unmounts or new images are generated
  useEffect(() => {
    return () => {
      if (images && isLocalProcessing) {
        Object.values(images).forEach(url => URL.revokeObjectURL(url))
      }
    }
  }, [images, isLocalProcessing])

  const openPreviewWindow = () => {
    if (!images) return

    const previewUrl = `/preview?${new URLSearchParams({
      original: images.original,
      grid15: images.grid15,
      grid10: images.grid10,
      grid5: images.grid5,
    })}`

    window.open(previewUrl, '_blank', 'width=500,height=600')
  }

  const handleAddTag = async () => {
    if (!newTag.trim()) return

    const tagName = newTag.trim().toLowerCase()
    
    // Check if tag already exists in selected tags
    if (selectedTags.includes(tagName)) {
      showToast('Tag already added', 'error')
      return
    }

    // Add to database if it's a new tag
    const { error } = await supabase
      .from('tags')
      .upsert({ name: tagName })
      .select()
      .single()

    if (error) {
      showToast('Error adding tag', 'error')
      return
    }

    setSelectedTags([...selectedTags, tagName])
    setNewTag('')
  }

  const removeTag = (tagToRemove: string) => {
    setSelectedTags(selectedTags.filter(tag => tag !== tagToRemove))
  }

  const handleSave = async () => {
    if (!images) {
      showToast('Please process an image first', 'error')
      return
    }

    try {
      if (editId) {
        const updateData = {
          name: imageName,
          category: category,
          published: isPublished,
        }

        console.log('EditId:', editId)
        console.log('Update data:', updateData)

        // First verify the record exists and user owns it
        const { data: existingImage } = await supabase
          .from('images')
          .select('*')
          .eq('id', editId)
          .eq('user_id', user?.id)
          .single()

        console.log('Existing image:', existingImage)

        if (!existingImage) {
          throw new Error('Image not found or access denied')
        }

        // Perform the update with explicit conditions
        const { error: updateError } = await supabase
          .from('images')
          .update({
            name: imageName,
            category: category,
            published: isPublished,
            updated_at: new Date().toISOString()
          })
          .eq('id', editId)
          .eq('user_id', user?.id)

        if (updateError) {
          console.error('Update error:', updateError)
          throw updateError
        }

        // Verify the update with explicit conditions
        const { data: verifyData } = await supabase
          .from('images')
          .select('*')
          .eq('id', editId)
          .eq('user_id', user?.id)
          .single()

        console.log('Verified data after update:', verifyData)

        if (verifyData?.published !== isPublished) {
          console.error('Update verification failed - published state mismatch')
          throw new Error('Failed to update published state')
        }

        // Update tags
        await supabase
          .from('image_tags')
          .delete()
          .eq('image_id', editId)

        if (selectedTags.length > 0) {
          const { error: tagError } = await supabase
            .from('image_tags')
            .insert(
              selectedTags.map(tag => ({
                image_id: editId,
                tag_name: tag
              }))
            )

          if (tagError) {
            console.error('Tag update error:', tagError)
          }
        }

        showToast('Image updated successfully', 'success')
      } else {
        // Create new image
        await processOnServer(lastUploadedFile!, true)
      }
      
      router.push('/dashboard')
    } catch (error) {
      console.error('Error saving image:', error)
      showToast('Error saving image', 'error')
    }
  }

  return (
    <div className="space-y-6">
      {/* Processing Mode Selection */}
      <div className="flex items-center gap-4">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={isLocalProcessing}
            onChange={(e) => setIsLocalProcessing(e.target.checked)}
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="text-sm text-gray-700">
            Process locally (no upload to server)
          </span>
        </label>
      </div>

      {/* Image Details Form */}
      <div className="space-y-4">
        <div>
          <label htmlFor="imageName" className="block text-sm font-medium text-gray-700 mb-1">
            Image Name <span className="text-red-500">*</span>
          </label>
          <input
            id="imageName"
            type="text"
            value={imageName}
            onChange={(e) => setImageName(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            required
            placeholder="Enter image name"
          />
        </div>

        <div>
          <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
            Category <span className="text-red-500">*</span>
          </label>
          <select
            id="category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            required
          >
            <option value="">Select a category</option>
            <option value="Guess the Character">Guess the Character</option>
            <option value="Guess the Celebrity">Guess the Celebrity</option>
            <option value="Guess the Car">Guess the Car</option>
            <option value="Guess the Animal">Guess the Animal</option>
            <option value="Guess the Movie">Guess the Movie</option>
            <option value="Guess the TV Show">Guess the TV Show</option>
          </select>
        </div>

        {/* Add Published Toggle */}
        <div className="flex items-center gap-2 mt-4">
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={isPublished}
              onChange={async (e) => {
                const newPublishedState = e.target.checked
                console.log('Published state changing to:', newPublishedState)

                if (editId) {
                  try {
                    // First update the state optimistically
                    setIsPublished(newPublishedState)

                    // Use the Supabase client instance
                    const { error } = await supabase
                      .from('images')
                      .update({ published: newPublishedState })
                      .eq('id', editId) // Use eq instead of match

                    if (error) {
                      console.error('Error updating published state:', error)
                      showToast('Error updating published state', 'error')
                      // Revert the state if update failed
                      setIsPublished(!newPublishedState)
                      return
                    }

                    showToast(
                      `Image ${newPublishedState ? 'published' : 'unpublished'} successfully`,
                      'success'
                    )
                  } catch (error) {
                    console.error('Unexpected error:', error)
                    showToast('Error updating published state', 'error')
                    // Revert the state
                    setIsPublished(!newPublishedState)
                  }
                } else {
                  // If we're not in edit mode, just update the local state
                  setIsPublished(newPublishedState)
                }
              }}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            <span className="ml-3 text-sm font-medium text-gray-700">
              {isPublished ? 'Published' : 'Unpublished'}
            </span>
          </label>
        </div>
      </div>

      {/* Upload Section */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Upload Image</h2>
        <input
          type="file"
          accept={ALLOWED_FILE_TYPES.join(',')}
          onChange={uploadImage}
          disabled={isUploading}
          className="block w-full text-sm text-gray-500
            file:mr-4 file:py-2 file:px-4
            file:rounded-full file:border-0
            file:text-sm file:font-semibold
            file:bg-blue-50 file:text-blue-700
            hover:file:bg-blue-100"
        />
        {isUploading && (
          <div className="flex items-center gap-2 text-blue-600">
            <LoadingSpinner size="small" />
            <p>{isLocalProcessing ? 'Processing locally...' : 'Processing and uploading...'}</p>
          </div>
        )}
      </div>

      {/* Tags Section */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Tags</h2>
        <div className="flex flex-wrap gap-2 mb-4">
          {selectedTags.map(tag => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
            >
              {tag}
              <button
                onClick={() => removeTag(tag)}
                className="hover:text-blue-600"
              >
                ×
              </button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <div className="flex-1">
            <input
              type="text"
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  handleAddTag()
                }
              }}
              placeholder="Add a tag"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <button
            onClick={handleAddTag}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Add
          </button>
        </div>
        <div className="mt-2">
          <p className="text-sm text-gray-600 mb-2">Suggested tags:</p>
          <div className="flex flex-wrap gap-2">
            {tags.map(tag => (
              <button
                key={tag.id}
                onClick={() => {
                  if (!selectedTags.includes(tag.name)) {
                    setSelectedTags([...selectedTags, tag.name])
                  }
                }}
                className="px-2 py-1 text-sm border border-gray-300 rounded-full hover:bg-gray-50"
              >
                {tag.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Generated Links and Preview Button */}
      {images && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Generated Images</h2>
            <div className="flex gap-2">
              <button
                onClick={openPreviewWindow}
                className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
              >
                Open Animation Preview
              </button>
              <button
                onClick={handleSave}
                className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700"
              >
                Save
              </button>
            </div>
          </div>
          <div className="space-y-2">
            {Object.entries(images).map(([key, url]) => (
              <a
                key={key}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="block p-4 bg-white shadow rounded-lg hover:bg-gray-50 transition-colors"
              >
                {key === 'original' ? 'Original Image' : `${key.replace('grid', '')}x${key.replace('grid', '')} Grid`}
                <span className="ml-2 text-blue-600">↗</span>
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// Export the wrapped component
const ImageUploader = ({ editId }: ImageUploaderProps) => {
  return (
    <ErrorBoundary>
      <ImageUploaderContent editId={editId} />
    </ErrorBoundary>
  )
}

export default ImageUploader 