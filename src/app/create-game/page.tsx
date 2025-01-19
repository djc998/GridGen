'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/components/providers/auth-provider'
import { useToast } from '@/components/ui/toast'
import { categories } from '@/lib/constants'
import { UserImage } from '@/types/database'

interface GameSettings {
  duration15x15: number
  duration10x10: number
  duration5x5: number
  durationAnswer: number
}

const IMAGES_PER_PAGE = 12

export default function CreateGamePage() {
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState('')
  const [description, setDescription] = useState('')
  const [randomizeImages, setRandomizeImages] = useState(false)
  const [selectedImages, setSelectedImages] = useState<string[]>([])
  const [images, setImages] = useState<UserImage[]>([])
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [status, setStatus] = useState<'draft' | 'published'>('draft')
  const [settings, setSettings] = useState<GameSettings>({
    duration15x15: 10,
    duration10x10: 10,
    duration5x5: 5,
    durationAnswer: 5
  })
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [selectedTag, setSelectedTag] = useState('')
  const { user } = useAuth()
  const { showToast } = useToast()
  const router = useRouter()

  // Fetch available images
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
        showToast('Failed to load images', 'error')
      } finally {
        setLoading(false)
      }
    }

    fetchImages()
  }, [user])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    if (!title || !category || selectedImages.length === 0) {
      showToast('Please fill in all required fields and select at least one image', 'error')
      return
    }

    setLoading(true)
    try {
      // Insert new game
      const { data: game, error: gameError } = await supabase
        .from('games')
        .insert({
          title,
          category,
          description,
          settings: JSON.stringify(settings),
          randomize_images: randomizeImages,
          created_by: user.id,
          status
        })
        .select()
        .single()

      if (gameError) throw gameError

      // Add game images
      const gameImages = selectedImages.map((imageId, index) => ({
        game_id: game.id,
        image_id: imageId,
        sequence_order: index
      }))

      const { error: imagesError } = await supabase
        .from('game_images')
        .insert(gameImages)

      if (imagesError) throw imagesError

      showToast('Game created successfully!', 'success')
      router.push('/dashboard')
    } catch (error: any) {
      console.error('Error creating game:', error)
      showToast(error.message || 'Failed to create game', 'error')
    } finally {
      setLoading(false)
    }
  }

  // Get unique categories and tags from images
  const uniqueCategories = Array.from(new Set(images.map(image => image.category)))
  const uniqueTags = Array.from(new Set(images.flatMap(image => 
    image.image_tags ? image.image_tags.map((tag: any) => tag.tag_name) : []
  )))

  // Filter images based on search query, category, and tag
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

  // Pagination calculations on filtered images
  const totalPages = Math.ceil(filteredImages.length / IMAGES_PER_PAGE)
  const paginatedImages = filteredImages.slice(
    (currentPage - 1) * IMAGES_PER_PAGE,
    currentPage * IMAGES_PER_PAGE
  )

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, selectedCategory, selectedTag])

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Create New Game</h1>
        <div className="flex space-x-4">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-4 py-2 text-gray-700 hover:text-gray-900"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || selectedImages.length === 0 || !title || !category}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            Create Game
          </button>
        </div>
      </div>

      <form className="max-w-4xl mx-auto space-y-8">
        {/* Basic Info */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Game Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              placeholder="Enter a description for your game..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              required
            >
              <option value="">Select category</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={randomizeImages}
                onChange={(e) => setRandomizeImages(e.target.checked)}
                className="rounded border-gray-300 text-indigo-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
              <span className="text-sm text-gray-700">Randomize image order in game</span>
            </label>
          </div>

          <div>
            <label htmlFor="status" className="block text-sm font-medium text-gray-700">
              Status
            </label>
            <div className="mt-1 flex items-center space-x-4">
              <label className="inline-flex items-center">
                <input
                  type="radio"
                  name="status"
                  value="draft"
                  checked={status === 'draft'}
                  onChange={(e) => setStatus(e.target.value as 'draft' | 'published')}
                  className="form-radio h-4 w-4 text-indigo-600 border-gray-300 focus:ring-indigo-500"
                />
                <span className="ml-2 text-sm text-gray-700">Draft</span>
              </label>
              <label className="inline-flex items-center">
                <input
                  type="radio"
                  name="status"
                  value="published"
                  checked={status === 'published'}
                  onChange={(e) => setStatus(e.target.value as 'draft' | 'published')}
                  className="form-radio h-4 w-4 text-indigo-600 border-gray-300 focus:ring-indigo-500"
                />
                <span className="ml-2 text-sm text-gray-700">Published</span>
              </label>
            </div>
            <p className="mt-1 text-sm text-gray-500">
              Draft games are only visible to you. Published games can be shared and played by others.
            </p>
          </div>
        </div>

        {/* Game Settings */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Game Settings</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">15x15 Grid Duration (seconds)</label>
              <input
                type="number"
                value={settings.duration15x15}
                onChange={(e) => setSettings(prev => ({ ...prev, duration15x15: parseInt(e.target.value) }))}
                min="1"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">10x10 Grid Duration (seconds)</label>
              <input
                type="number"
                value={settings.duration10x10}
                onChange={(e) => setSettings(prev => ({ ...prev, duration10x10: parseInt(e.target.value) }))}
                min="1"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">5x5 Grid Duration (seconds)</label>
              <input
                type="number"
                value={settings.duration5x5}
                onChange={(e) => setSettings(prev => ({ ...prev, duration5x5: parseInt(e.target.value) }))}
                min="1"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Answer Duration (seconds)</label>
              <input
                type="number"
                value={settings.durationAnswer}
                onChange={(e) => setSettings(prev => ({ ...prev, durationAnswer: parseInt(e.target.value) }))}
                min="1"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Image Selection with Filters */}
        <div>
          <div className="space-y-4 mb-4">
            <h2 className="text-xl font-semibold">Select Images</h2>
            
            {/* Filters */}
            <div className="flex items-center gap-4">
              <input
                type="text"
                placeholder="Search images..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="px-4 py-2 border rounded-md flex-1"
              />
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-4 py-2 border rounded-md min-w-[150px]"
              >
                <option value="">All Categories</option>
                {uniqueCategories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
              <select
                value={selectedTag}
                onChange={(e) => setSelectedTag(e.target.value)}
                className="px-4 py-2 border rounded-md min-w-[150px]"
              >
                <option value="">All Tags</option>
                {uniqueTags.map(tag => (
                  <option key={tag} value={tag}>{tag}</option>
                ))}
              </select>
            </div>

            {/* Pagination */}
            <div className="flex justify-end items-center space-x-2">
              <button
                type="button"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 bg-gray-100 rounded-md disabled:opacity-50 hover:bg-gray-200"
              >
                Previous
              </button>
              <span className="text-sm text-gray-600 min-w-[100px] text-center">
                Page {currentPage} of {totalPages || 1}
              </span>
              <button
                type="button"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages || totalPages === 0}
                className="px-4 py-2 bg-gray-100 rounded-md disabled:opacity-50 hover:bg-gray-200"
              >
                Next
              </button>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {paginatedImages.map((image) => (
                <div
                  key={image.id}
                  className={`relative cursor-pointer rounded-lg overflow-hidden ${
                    selectedImages.includes(image.id) ? 'ring-2 ring-blue-500' : ''
                  }`}
                  onClick={() => {
                    setSelectedImages(prev =>
                      prev.includes(image.id)
                        ? prev.filter(id => id !== image.id)
                        : [...prev, image.id]
                    )
                  }}
                >
                  <img
                    src={image.original_url}
                    alt={image.name}
                    className="w-full aspect-square object-cover"
                  />
                  <div className="absolute inset-0 bg-black bg-opacity-50 flex flex-col items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                    <span className="text-white font-medium text-center px-2">{image.name}</span>
                    <span className="text-white text-sm">{image.category}</span>
                    {image.image_tags && (
                      <div className="flex flex-wrap gap-1 mt-1 px-2">
                        {image.image_tags.map((tag: any) => (
                          <span key={tag.tag_name} className="text-xs bg-white bg-opacity-20 px-1 rounded">
                            {tag.tag_name}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  {selectedImages.includes(image.id) && (
                    <div className="absolute top-2 right-2 bg-blue-500 text-white w-6 h-6 rounded-full flex items-center justify-center">
                      {selectedImages.indexOf(image.id) + 1}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </form>
    </div>
  )
} 