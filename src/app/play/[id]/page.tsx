'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { UserImage } from '@/types/database'
import LoadingSpinner from '@/components/ui/loading-spinner'
import { GuessGame } from '@/components/view/guess-game'

export default function PlayPage({ params }: { params: { id: string } }) {
  const [currentImage, setCurrentImage] = useState<UserImage | null>(null)
  const [categoryImages, setCategoryImages] = useState<UserImage[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const fetchImage = async () => {
      try {
        // Fetch current image
        const { data: imageData, error: imageError } = await supabase
          .from('images')
          .select('*')
          .eq('id', params.id)
          .single()

        if (imageError) throw imageError

        const currentImage = imageData as UserImage
        setCurrentImage(currentImage)

        // Fetch all images in the same category
        const { data: categoryData, error: categoryError } = await supabase
          .from('images')
          .select('*')
          .eq('category', currentImage.category)
          .eq('published', true)
          .order('created_at', { ascending: false })

        if (categoryError) throw categoryError

        setCategoryImages(categoryData as UserImage[])
      } catch (error) {
        console.error('Error fetching image:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchImage()
  }, [params.id])

  const handleNext = () => {
    if (!currentImage || categoryImages.length <= 1) return

    const currentIndex = categoryImages.findIndex(img => img.id === currentImage.id)
    const nextIndex = (currentIndex + 1) % categoryImages.length
    const nextImage = categoryImages[nextIndex]
    
    router.push(`/play/${nextImage.id}`)
  }

  const handlePrevious = () => {
    if (!currentImage || categoryImages.length <= 1) return

    const currentIndex = categoryImages.findIndex(img => img.id === currentImage.id)
    const previousIndex = (currentIndex - 1 + categoryImages.length) % categoryImages.length
    const previousImage = categoryImages[previousIndex]
    
    router.push(`/play/${previousImage.id}`)
  }

  if (isLoading || !currentImage) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="large" />
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Category Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">
            {currentImage.category}
          </h1>
          <p className="text-gray-500">
            Image {categoryImages.findIndex(img => img.id === currentImage.id) + 1} of {categoryImages.length}
          </p>
        </div>

        {/* Game Component */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <GuessGame
            image={currentImage}
            onClose={() => router.push('/view')}
          />
        </div>

        {/* Navigation Buttons */}
        <div className="flex justify-between mt-6">
          <button
            onClick={handlePrevious}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
            disabled={categoryImages.length <= 1}
          >
            Previous Image
          </button>
          <button
            onClick={handleNext}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            disabled={categoryImages.length <= 1}
          >
            Next Image
          </button>
        </div>
      </div>
    </div>
  )
} 