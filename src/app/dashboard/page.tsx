'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { UserImage } from '@/types/database'
import Link from 'next/link'
import { useAuth } from '@/components/providers/auth-provider'
import { Edit } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { ShareButtons } from '@/components/ui/share-buttons'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { useToast } from '@/components/ui/toast'

export default function DashboardPage() {
  const [images, setImages] = useState<UserImage[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [deleteImageId, setDeleteImageId] = useState<string | null>(null)
  const { user } = useAuth()
  const { showToast } = useToast()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [selectedTag, setSelectedTag] = useState('')
  const [selectedImages, setSelectedImages] = useState<string[]>([])

  useEffect(() => {
    const fetchImages = async () => {
      if (!user) return

      try {
        const { data, error } = await supabase
          .from('images')
          .select(`
            *,
            image_tags (
              tag_name
            )
          `)
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })

        if (error) throw error

        setImages(data || [])
      } catch (error) {
        console.error('Error fetching images:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchImages()
  }, [user])

  const handleDelete = async (imageId: string) => {
    setDeleteImageId(imageId)
  }

  const handleConfirmDelete = async () => {
    if (!deleteImageId) return

    try {
      const imageToDelete = images.find(img => img.id === deleteImageId)
      if (imageToDelete) {
        const imagePaths = [
          imageToDelete.original_url,
          imageToDelete.grid15_url,
          imageToDelete.grid10_url,
          imageToDelete.grid5_url
        ].map(url => url.split('/').pop())

        await Promise.all(
          imagePaths.map(path => {
            if (path) {
              return supabase.storage
                .from('images')
                .remove([path])
            }
            return Promise.resolve()
          })
        )

        const { error: deleteError } = await supabase
          .from('images')
          .delete()
          .eq('id', deleteImageId)

        if (deleteError) throw deleteError

        setImages(images.filter(img => img.id !== deleteImageId))
        showToast('Image deleted successfully', 'success')
      }
    } catch (error) {
      console.error('Error deleting image:', error)
      showToast('Failed to delete image', 'error')
    } finally {
      setDeleteImageId(null)
    }
  }

  const uniqueCategories = Array.from(new Set(images.map(image => image.category)))
  const uniqueTags = Array.from(new Set(images.flatMap(image => image.image_tags ? image.image_tags.map((tag: any) => tag.tag_name) : [])))

  const filteredImages = images.filter(image => {
    const query = searchQuery.toLowerCase()
    const matchesQuery =
      image.name.toLowerCase().includes(query) ||
      image.category.toLowerCase().includes(query) ||
      (image.image_tags && image.image_tags.some((tag: any) => tag.tag_name.toLowerCase().includes(query)))

    const matchesCategory = selectedCategory ? image.category === selectedCategory : true
    const matchesTag = selectedTag ? image.image_tags && image.image_tags.some((imageTag: any) => imageTag.tag_name === selectedTag) : true

    return matchesQuery && matchesCategory && matchesTag
  })

  const handleImageSelect = (imageId: string) => {
    setSelectedImages(prev => 
      prev.includes(imageId) 
        ? prev.filter(id => id !== imageId)
        : [...prev, imageId]
    )
  }

  const handleExport = async () => {
    if (selectedImages.length === 0) {
      showToast('Please select at least one image to export', 'error')
      return
    }

    try {
      const selectedImageData = images.filter(img => selectedImages.includes(img.id))
      
      const response = await fetch('/api/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ images: selectedImageData }),
      })

      if (!response.ok) throw new Error('Export failed')

      // Get the blob from the response
      const blob = await response.blob()
      
      // Create a download link and trigger it
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `exported_images_${new Date().toISOString().split('T')[0]}.zip`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      showToast('Export completed successfully', 'success')
    } catch (error) {
      console.error('Export error:', error)
      showToast('Failed to export images', 'error')
    }
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">My Images</h1>
        <div className="flex items-center gap-4">
          <input
            type="text"
            placeholder="Search images..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="border px-4 py-2 rounded-md"
          />
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="border px-4 py-2 rounded-md"
          >
            <option value="">All Categories</option>
            {uniqueCategories.map(category => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>
          <select
            value={selectedTag}
            onChange={(e) => setSelectedTag(e.target.value)}
            className="border px-4 py-2 rounded-md"
          >
            <option value="">All Tags</option>
            {uniqueTags.map(tag => (
              <option key={tag} value={tag}>{tag}</option>
            ))}
          </select>
          <button
            onClick={handleExport}
            disabled={selectedImages.length === 0}
            className={`px-4 py-2 rounded-md ${
              selectedImages.length === 0
                ? 'bg-gray-300 cursor-not-allowed'
                : 'bg-green-600 hover:bg-green-700 text-white'
            }`}
          >
            Export Selected ({selectedImages.length})
          </button>
          <Link
            href="/upload"
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
          >
            Upload New Image
          </Link>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredImages.map((image) => (
            <div
              key={image.id}
              className={`bg-white rounded-lg shadow-md overflow-hidden group relative ${
                selectedImages.includes(image.id) ? 'ring-2 ring-blue-500' : ''
              }`}
              onClick={() => handleImageSelect(image.id)}
            >
              <div className="absolute top-2 left-2 z-10">
                <input
                  type="checkbox"
                  checked={selectedImages.includes(image.id)}
                  onChange={() => handleImageSelect(image.id)}
                  onClick={(e) => e.stopPropagation()}
                  className="h-5 w-5 rounded border-gray-300"
                />
              </div>
              <div className="aspect-square relative">
                <img
                  src={image.grid15_url}
                  alt={image.name}
                  className="w-full h-full object-cover transition-opacity duration-300 group-hover:opacity-0"
                />
                <img
                  src={image.original_url}
                  alt={image.name}
                  className="w-full h-full object-cover absolute top-0 left-0 transition-opacity duration-300 opacity-0 group-hover:opacity-100"
                />
                <div className="absolute top-2 right-2">
                  <span className={`
                    px-2 py-1 rounded-full text-sm font-medium
                    ${image.published 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-gray-100 text-gray-800'}
                  `}>
                    {image.published ? 'Published' : 'Draft'}
                  </span>
                </div>
              </div>

              <div className="p-4">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-semibold text-lg">{image.name}</h3>
                    <p className="text-sm text-gray-500">
                      Created {formatDistanceToNow(new Date(image.created_at || ''))} ago
                    </p>
                  </div>
                  <Link
                    href={`/upload?edit=${image.id}`}
                    className="p-2 rounded-full hover:bg-gray-100 transition-colors"
                  >
                    <Edit className="w-4 h-4 text-gray-600" />
                  </Link>
                </div>

                <div className="space-y-2">
                  <div className="flex flex-wrap gap-2">
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                      {image.category}
                    </span>
                  </div>

                  {image.image_tags && image.image_tags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {image.image_tags.map((tag: any) => (
                        <span
                          key={tag.tag_name}
                          className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-sm"
                        >
                          {tag.tag_name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-between items-center mt-2">
                <div className="flex space-x-2">
                  <Link
                    href={`/upload?edit=${image.id}`}
                    className="p-2 rounded-full hover:bg-gray-100 transition-colors"
                  >
                    <Edit className="w-4 h-4 text-gray-600" />
                  </Link>
                  <button
                    type="button"
                    onClick={() => handleDelete(image.id)}
                    className="ml-1 hover:text-red-600"
                    aria-label="Delete image"
                    title="Delete image"
                  >
                    ×
                  </button>
                </div>
                <ShareButtons image={image} />
              </div>
            </div>
          ))}
        </div>
      )}

      {!isLoading && images.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">
            No images uploaded yet
          </p>
        </div>
      )}

      <ConfirmDialog
        isOpen={!!deleteImageId}
        onClose={() => setDeleteImageId(null)}
        onConfirm={handleConfirmDelete}
        title="Delete Image"
        message="Are you sure you want to delete this image? This action cannot be undone."
      />
    </div>
  )
} 