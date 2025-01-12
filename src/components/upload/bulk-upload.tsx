'use client'

import { useState, useRef } from 'react'
import { useToast } from '@/components/ui/toast'
import { processImage } from '@/lib/image-processing'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/components/providers/auth-provider'
import { categories } from '@/lib/constants'
import { useRouter } from 'next/navigation'
import { uploadImage } from '@/lib/upload-utils'

interface BulkImageItem {
  file: File
  name: string
  category: string
  previewUrl: string
  status: 'pending' | 'processing' | 'success' | 'error'
  tags: string[]
  newTag: string
  isPublished: boolean
  error?: string
}

export function BulkUpload() {
  const [images, setImages] = useState<BulkImageItem[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { showToast } = useToast()
  const { user } = useAuth()
  const router = useRouter()

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (!files.length) return

    const newImages: BulkImageItem[] = await Promise.all(
      files.map(async (file) => ({
        file,
        name: '',
        category: '',
        previewUrl: URL.createObjectURL(file),
        status: 'pending',
        tags: [],
        newTag: '',
        isPublished: false
      }))
    )

    setImages([...images, ...newImages])
  }

  const handleAddTag = (index: number) => {
    setImages(prevImages => {
      const updatedImages = [...prevImages]
      const image = updatedImages[index]
      if (image.newTag && !image.tags.includes(image.newTag)) {
        image.tags.push(image.newTag)
        image.newTag = ''
      }
      return updatedImages
    })
  }

  const handleRemoveTag = (index: number, tagToRemove: string) => {
    setImages(prevImages => {
      const updatedImages = [...prevImages]
      const image = updatedImages[index]
      image.tags = image.tags.filter(tag => tag !== tagToRemove)
      return updatedImages
    })
  }

  const handleUpload = async () => {
    if (!user) return

    // Validate all images have required fields
    const incomplete = images.find(img => !img.name || !img.category)
    if (incomplete) {
      showToast('Please fill in all fields', 'error')
      return
    }

    setIsUploading(true)

    try {
      await Promise.all(images.map(async (image) => {
        const imageData = await uploadImage(image.file, user.id, image.name, image.category, image.isPublished)

        // Save tags to the database
        if (image.tags.length > 0) {
          const { error: tagError } = await supabase
            .from('image_tags')
            .insert(
              image.tags.map(tag => ({
                image_id: imageData.id,
                tag_name: tag
              }))
            )

          if (tagError) throw tagError
        }

        setImages(prev => prev.map(img => img.file === image.file ? { ...img, status: 'success' } : img))
      }))
      showToast('All images uploaded successfully!', 'success')
      router.push('/dashboard')
    } catch (error) {
      console.error('Error processing images:', error)
      showToast('Failed to upload some images', 'error')
    } finally {
      setIsUploading(false)
    }
  }

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, idx) => idx !== index))
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          Select Images
        </button>
        {images.length > 0 && (
          <button
            onClick={handleUpload}
            disabled={isUploading}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
          >
            Upload All ({images.length})
          </button>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleFileSelect}
        className="hidden"
      />

      {images.map((image, index) => (
        <div key={index} className="border p-4 rounded-md space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <img src={image.previewUrl} alt="Preview" className="w-16 h-16 object-cover rounded-md" />
              <div>
                <input
                  type="text"
                  value={image.name}
                  onChange={(e) => setImages(prev => prev.map((img, idx) => idx === index ? { ...img, name: e.target.value } : img))}
                  placeholder="Image name"
                  className="w-full px-3 py-2 border rounded-md"
                  disabled={isUploading}
                />
                <select
                  value={image.category}
                  onChange={(e) => setImages(prev => prev.map((img, idx) => idx === index ? { ...img, category: e.target.value } : img))}
                  className="w-full px-3 py-2 border rounded-md mt-2"
                  disabled={isUploading}
                >
                  <option value="">Select category</option>
                  {categories.map(category => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <button
              onClick={() => removeImage(index)}
              className="text-red-600 hover:text-red-800"
            >
              Remove
            </button>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Tags</label>
            <div className="flex gap-2 mt-1">
              <input
                type="text"
                value={image.newTag}
                onChange={(e) => setImages(prev => prev.map((img, idx) => idx === index ? { ...img, newTag: e.target.value } : img))}
                onKeyPress={(e) => e.key === 'Enter' && handleAddTag(index)}
                className="flex-1 px-3 py-2 border rounded-md"
                placeholder="Add a tag"
                disabled={isUploading}
              />
              <button
                type="button"
                onClick={() => handleAddTag(index)}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                disabled={isUploading}
              >
                Add
              </button>
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              {image.tags.map(tag => (
                <span
                  key={tag}
                  className="px-2 py-1 bg-gray-100 rounded-full text-sm flex items-center gap-1"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(index, tag)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              checked={image.isPublished}
              onChange={(e) => setImages(prev => prev.map((img, idx) => idx === index ? { ...img, isPublished: e.target.checked } : img))}
              className="mr-2"
              disabled={isUploading}
            />
            <label className="text-gray-700">Published</label>
          </div>
        </div>
      ))}
    </div>
  )
} 