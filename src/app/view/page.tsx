'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { UserImage } from '@/types/database'
import { GuessGame } from '@/components/view/guess-game'
import LoadingSpinner from '@/components/ui/loading-spinner'
import { useRouter } from 'next/navigation'

export default function ViewPage() {
  const [images, setImages] = useState<UserImage[]>([])
  const [filteredImages, setFilteredImages] = useState<UserImage[]>([])
  const [selectedImage, setSelectedImage] = useState<UserImage | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [categories, setCategories] = useState<Set<string>>(new Set())
  const router = useRouter()

  // Fetch images and build category list
  useEffect(() => {
    const fetchImages = async () => {
      try {
        const { data, error } = await supabase
          .from('images')
          .select('*')
          .eq('published', true)
          .order('created_at', { ascending: false })

        if (error) throw error

        const imageData = data as UserImage[]
        setImages(imageData)
        setFilteredImages(imageData)

        // Build unique categories list
        const uniqueCategories = new Set(imageData.map(img => img.category))
        setCategories(uniqueCategories)
      } catch (error) {
        console.error('Error fetching images:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchImages()
  }, [])

  // Filter images when category changes
  useEffect(() => {
    if (selectedCategory === 'all') {
      setFilteredImages(images)
    } else {
      setFilteredImages(images.filter(img => img.category === selectedCategory))
    }
  }, [selectedCategory, images])

  // Group images by category
  const groupImagesByCategory = (images: UserImage[]) => {
    const grouped = new Map<string, UserImage[]>()
    images.forEach(image => {
      if (!grouped.has(image.category)) {
        grouped.set(image.category, [])
      }
      grouped.get(image.category)?.push(image)
    })
    return grouped
  }

  const handleImageClick = (image: UserImage) => {
    router.push(`/play/${image.id}`)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="large" />
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 px-4">
      {/* Category Filter */}
      <div className="mb-8">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-lg font-medium text-gray-900 mb-4">
            Choose a Category
          </h2>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors
                ${selectedCategory === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
            >
              All Categories
              <span className="ml-2 text-xs">
                ({images.length})
              </span>
            </button>
            {Array.from(categories).sort().map(category => {
              const count = images.filter(img => img.category === category).length
              return (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors
                    ${selectedCategory === category
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                >
                  {category}
                  <span className="ml-2 text-xs">
                    ({count})
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Image Grid with Categories */}
      <div className="space-y-12">
        {selectedCategory === 'all' ? (
          Array.from(groupImagesByCategory(filteredImages)).map(([category, categoryImages]) => (
            <div key={category}>
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                {category}
                <span className="ml-2 text-lg font-normal text-gray-500">
                  ({categoryImages.length})
                </span>
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {categoryImages.map((image) => (
                  <button
                    key={image.id}
                    onClick={() => handleImageClick(image)}
                    className="group aspect-square relative overflow-hidden rounded-lg bg-gray-100 hover:opacity-90 transition-all duration-300 transform hover:scale-105"
                  >
                    <img
                      src={image.grid15_url}
                      alt="Guess the image"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-opacity flex items-center justify-center">
                      <span className="text-white opacity-0 group-hover:opacity-100 font-medium">
                        Play Now
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))
        ) : (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              {selectedCategory}
              <span className="ml-2 text-lg font-normal text-gray-500">
                ({filteredImages.length})
              </span>
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {filteredImages.map((image) => (
                <button
                  key={image.id}
                  onClick={() => handleImageClick(image)}
                  className="group aspect-square relative overflow-hidden rounded-lg bg-gray-100 hover:opacity-90 transition-all duration-300 transform hover:scale-105"
                >
                  <img
                    src={image.grid15_url}
                    alt="Guess the image"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-opacity flex items-center justify-center">
                    <span className="text-white opacity-0 group-hover:opacity-100 font-medium">
                      Play Now
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Game Modal */}
      {selectedImage && (
        <GuessGame
          image={selectedImage}
          onClose={() => setSelectedImage(null)}
        />
      )}

      {/* Empty State */}
      {filteredImages.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">
            No images found in this category
          </p>
        </div>
      )}
    </div>
  )
} 