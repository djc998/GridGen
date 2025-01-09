'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { UserImage } from '@/types/database'
import { Modal } from '@/components/ui/modal'
import { GuessGame } from '@/components/view/guess-game'
import Link from 'next/link'

export default function HomePage() {
  const [featuredImages, setFeaturedImages] = useState<UserImage[]>([])
  const [selectedImage, setSelectedImage] = useState<UserImage | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const fetchFeaturedImages = async () => {
      try {
        const { data, error } = await supabase
          .from('images')
          .select(`
            id,
            name,
            grid15_url,
            grid10_url,
            grid5_url,
            original_url,
            category,
            published,
            created_at,
            user_id
          `)
          .eq('published', true)
          .order('created_at', { ascending: false })
          .limit(12)

        if (error) {
          console.error('Fetch error:', error)
          throw error
        }

        console.log('Fetched images:', data)
        setFeaturedImages(data as UserImage[] || [])
      } catch (error) {
        console.error('Error fetching images:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchFeaturedImages()
  }, [])

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className="bg-white">
        <div className="max-w-7xl mx-auto py-16 px-4 sm:py-24 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl font-extrabold text-gray-900 sm:text-5xl sm:tracking-tight lg:text-6xl">
              Welcome to ScramPixs
            </h1>
            <p className="mt-4 max-w-xl mx-auto text-3xl text-gray-500">
              Mix. Match. Solve.
            </p>
            <p className="mt-4 max-w-xl mx-auto text-xl text-gray-500">
              Test your knowledge by guessing images as they become clearer over time.
            </p>
            <div className="mt-8 flex justify-center gap-4">
              <Link
                href="/view"
                className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                Play Game
              </Link>
              <Link
                href="/signup"
                className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-blue-600 bg-blue-100 hover:bg-blue-200"
              >
                Create Account
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Featured Images Grid */}
      <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-8">Featured Images</h2>
        {isLoading ? (
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {featuredImages.map((image) => (
              <button
                key={image.id}
                onClick={() => setSelectedImage(image)}
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
        )}
      </div>

      {/* Game Modal */}
      <Modal
        isOpen={!!selectedImage}
        onClose={() => setSelectedImage(null)}
        title="Guess the Image"
      >
        {selectedImage && (
          <GuessGame
            image={selectedImage}
            onClose={() => setSelectedImage(null)}
          />
        )}
      </Modal>
    </div>
  )
} 