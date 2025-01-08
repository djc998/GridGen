'use client'

import ProtectedRoute from '@/components/auth/protected-route'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/providers/auth-provider'
import { supabase } from '@/lib/supabase'
import type { UserImage } from '@/types/database'
import Link from 'next/link'
import LoadingSpinner from '@/components/ui/loading-spinner'
import { useToast } from '@/components/ui/toast'
import { Modal } from '@/components/ui/modal'
import { ModalPreview } from '@/components/preview/modal-preview'

function DashboardContent() {
  const [images, setImages] = useState<UserImage[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const { user } = useAuth()
  const { showToast } = useToast()
  const [selectedImage, setSelectedImage] = useState<{
    url: string
    title: string
  } | null>(null)
  const [showPreview, setShowPreview] = useState(false)
  const [previewImage, setPreviewImage] = useState<UserImage | null>(null)

  useEffect(() => {
    const fetchImages = async () => {
      if (!user) return
      setIsLoading(true)

      try {
        const { data, error } = await supabase
          .from('images')
          .select('id, created_at, name, category, original_url, grid15_url, grid10_url, grid5_url')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })

        if (error) throw error

        // Use a Map to ensure uniqueness by ID
        const uniqueImagesMap = new Map(
          data?.map(image => [image.id, image]) || []
        )

        setImages(Array.from(uniqueImagesMap.values()))
      } catch (error) {
        showToast('Error fetching images', 'error')
        console.error('Error fetching images:', error)
      } finally {
        setIsLoading(false)
      }
    }

    if (user) {
      fetchImages()
    }
  }, [user, showToast])

  const handleDeleteImage = async (id: string) => {
    try {
      const { error } = await supabase
        .from('images')
        .delete()
        .match({ id })

      if (error) throw error

      setImages(images.filter(img => img.id !== id))
      showToast('Image deleted successfully', 'success')
    } catch (error) {
      showToast('Error deleting image', 'error')
      console.error('Error deleting image:', error)
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner size="large" />
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold text-gray-900">My Images</h1>
        <div className="flex items-center gap-4">
          {user && <span className="text-gray-600">{user.email}</span>}
          <button
            onClick={() => supabase.auth.signOut()}
            className="text-sm text-red-600 hover:text-red-500"
          >
            Sign out
          </button>
          <Link
            href="/upload"
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
          >
            Upload New Image
          </Link>
        </div>
      </div>

      {images.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">No images uploaded yet.</p>
          <Link
            href="/upload"
            className="mt-4 inline-block text-blue-600 hover:text-blue-500"
          >
            Upload your first image
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {images.map((image) => (
            <div
              key={image.id}
              className="bg-white rounded-lg shadow overflow-hidden"
            >
              <div className="relative aspect-video">
                <img
                  src={image.original_url}
                  alt={image.name}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="p-4 space-y-4">
                <div className="space-y-2">
                  <h3 className="text-lg font-medium text-gray-900">{image.name}</h3>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    {image.category}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm text-gray-500">
                  <span>{new Date(image.created_at).toLocaleDateString()}</span>
                  <button
                    onClick={() => handleDeleteImage(image.id)}
                    className="text-red-600 hover:text-red-500"
                  >
                    Delete
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setSelectedImage({
                      url: image.grid15_url,
                      title: '15x15 Grid'
                    })}
                    className="text-center text-sm text-blue-600 hover:text-blue-500 px-3 py-2 border border-gray-200 rounded-md hover:bg-gray-50"
                  >
                    15x15 Grid
                  </button>
                  <button
                    onClick={() => setSelectedImage({
                      url: image.grid10_url,
                      title: '10x10 Grid'
                    })}
                    className="text-center text-sm text-blue-600 hover:text-blue-500 px-3 py-2 border border-gray-200 rounded-md hover:bg-gray-50"
                  >
                    10x10 Grid
                  </button>
                  <button
                    onClick={() => setSelectedImage({
                      url: image.grid5_url,
                      title: '5x5 Grid'
                    })}
                    className="text-center text-sm text-blue-600 hover:text-blue-500 px-3 py-2 border border-gray-200 rounded-md hover:bg-gray-50"
                  >
                    5x5 Grid
                  </button>
                  <button
                    onClick={() => {
                      setPreviewImage(image)
                      setShowPreview(true)
                    }}
                    className="text-center text-sm text-blue-600 hover:text-blue-500 px-3 py-2 border border-gray-200 rounded-md hover:bg-gray-50"
                  >
                    Preview
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Image Modal */}
      <Modal
        isOpen={!!selectedImage && !showPreview}
        onClose={() => setSelectedImage(null)}
        title={selectedImage?.title}
      >
        {selectedImage && (
          <div className="flex justify-center">
            <img
              src={selectedImage.url}
              alt={selectedImage.title}
              className="max-w-full max-h-[70vh] object-contain"
            />
          </div>
        )}
      </Modal>

      {/* Preview Modal */}
      <Modal
        isOpen={showPreview}
        onClose={() => {
          setShowPreview(false)
          setPreviewImage(null)
        }}
        title="Animation Preview"
      >
        {previewImage && <ModalPreview image={previewImage} />}
      </Modal>
    </div>
  )
}

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <DashboardContent />
    </ProtectedRoute>
  )
} 