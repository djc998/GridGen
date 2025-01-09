'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { UserImage } from '@/types/database'
import { Modal } from '@/components/ui/modal'
import { GuessGame } from '@/components/view/guess-game'

interface GroupedImages {
  [category: string]: UserImage[]
}

export default function ViewPage() {
  const [groupedImages, setGroupedImages] = useState<GroupedImages>({})
  const [selectedImage, setSelectedImage] = useState<UserImage | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchPublishedImages = async () => {
      try {
        const { data, error } = await supabase
          .from('images')
          .select('*')
          .eq('published', true)
          .order('created_at', { ascending: false })

        if (error) throw error

        // Group images by category
        const grouped = data.reduce((acc: GroupedImages, image: UserImage) => {
          if (!acc[image.category]) {
            acc[image.category] = []
          }
          acc[image.category].push(image)
          return acc
        }, {})

        setGroupedImages(grouped)
      } catch (error) {
        console.error('Error fetching images:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchPublishedImages()
  }, [])

  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-8">Image Guessing Game</h1>
      
      {isLoading ? (
        <div className="flex justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      ) : (
        Object.entries(groupedImages).map(([category, images]) => (
          <div key={category} className="mb-12">
            <h2 className="text-2xl font-semibold mb-4">{category}</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {images.map((image) => (
                <button
                  key={image.id}
                  onClick={() => setSelectedImage(image)}
                  className="aspect-square relative overflow-hidden rounded-lg hover:opacity-90 transition-opacity"
                >
                  <img
                    src={image.grid15_url}
                    alt="Guess the image"
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          </div>
        ))
      )}

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