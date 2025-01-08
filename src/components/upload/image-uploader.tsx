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

function ImageUploaderContent() {
  const [isUploading, setIsUploading] = useState(false)
  const [images, setImages] = useState<UploadedImages | null>(null)
  const [isLocalProcessing, setIsLocalProcessing] = useState(false)
  const { user } = useAuth()
  const router = useRouter()
  const { showToast } = useToast()
  const [imageName, setImageName] = useState('')
  const [category, setCategory] = useState('Other')
  const [categories, setCategories] = useState<Category[]>([])

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

  const processOnServer = async (file: File): Promise<UploadedImages> => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('name', imageName || file.name.split('.')[0]) // Use file name if no custom name
    formData.append('category', category)

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
        showToast('Images uploaded successfully', 'success')
      }

      setImages(urls)
      router.push('/dashboard')
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

  return (
    <div className="space-y-8 max-w-4xl mx-auto p-4">
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
        <h2 className="text-xl font-semibold">Image Details</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label htmlFor="imageName" className="block text-sm font-medium text-gray-700">
              Image Name
            </label>
            <input
              type="text"
              id="imageName"
              value={imageName}
              onChange={(e) => setImageName(e.target.value)}
              placeholder="Enter image name"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="category" className="block text-sm font-medium text-gray-700">
              Category
            </label>
            <select
              id="category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            >
              {categories.map((cat) => (
                <option key={cat.id} value={cat.name}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>
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

      {/* Generated Links and Preview Button */}
      {images && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Generated Images</h2>
            <button
              onClick={openPreviewWindow}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              Open Animation Preview
            </button>
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
const ImageUploader = () => {
  return (
    <ErrorBoundary>
      <ImageUploaderContent />
    </ErrorBoundary>
  )
}

export default ImageUploader 