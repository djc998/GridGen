'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/components/providers/auth-provider'
import { useToast } from '@/components/ui/toast'
import { categories } from '@/lib/constants'
import { UserImage } from '@/types/database'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'

interface GameSettings {
  duration15x15: number
  duration10x10: number
  duration5x5: number
  durationAnswer: number
}

interface GameImage {
  image_id: string
  sequence_order: number
  image: UserImage
}

export default function EditGamePage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const { showToast } = useToast()

  const [title, setTitle] = useState('')
  const [category, setCategory] = useState('')
  const [description, setDescription] = useState('')
  const [randomizeImages, setRandomizeImages] = useState(false)
  const [gameImages, setGameImages] = useState<GameImage[]>([])
  const [loading, setLoading] = useState(true)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [status, setStatus] = useState<'draft' | 'published'>('draft')
  const [settings, setSettings] = useState<GameSettings>({
    duration15x15: 10,
    duration10x10: 10,
    duration5x5: 5,
    durationAnswer: 5
  })

  useEffect(() => {
    const fetchData = async () => {
      if (!user || !params.id) return

      try {
        // Fetch game data
        const { data: game, error: gameError } = await supabase
          .from('games')
          .select(`
            *,
            game_images (
              image_id,
              sequence_order,
              image:images (*)
            )
          `)
          .eq('id', params.id)
          .single()

        if (gameError) throw gameError

        if (game.created_by !== user.id) {
          showToast('You can only edit your own games', 'error')
          router.push('/dashboard')
          return
        }

        // Set states
        setTitle(game.title)
        setCategory(game.category)
        setDescription(game.description || '')
        setRandomizeImages(game.randomize_images || false)
        setSettings(typeof game.settings === 'string' ? JSON.parse(game.settings) : game.settings)
        setGameImages(game.game_images)
        setStatus(game.status || 'draft')
      } catch (error: any) {
        console.error('Error fetching data:', error)
        showToast(error.message || 'Failed to load game', 'error')
        router.push('/dashboard')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [user, params.id])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !params.id) return

    if (!title || !category) {
      showToast('Please fill in all required fields', 'error')
      return
    }

    setLoading(true)
    try {
      // Update game data only
      const { error: updateError } = await supabase
        .from('games')
        .update({
          title,
          category,
          description,
          settings: JSON.stringify(settings),
          randomize_images: randomizeImages,
          status
        })
        .eq('id', params.id)

      if (updateError) throw updateError

      showToast('Game updated successfully!', 'success')
      router.push('/dashboard')
    } catch (error: any) {
      console.error('Error updating game:', error)
      showToast(error.message || 'Failed to update game', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!user || !params.id) return

    setLoading(true)
    try {
      // Delete game images first (foreign key constraint)
      const { error: deleteImagesError } = await supabase
        .from('game_images')
        .delete()
        .eq('game_id', params.id)

      if (deleteImagesError) throw deleteImagesError

      // Delete the game
      const { error: deleteGameError } = await supabase
        .from('games')
        .delete()
        .eq('id', params.id)

      if (deleteGameError) throw deleteGameError

      showToast('Game deleted successfully', 'success')
      router.push('/dashboard')
    } catch (error: any) {
      console.error('Error deleting game:', error)
      showToast(error.message || 'Failed to delete game', 'error')
    } finally {
      setLoading(false)
      setShowDeleteConfirm(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900" />
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Edit Game</h1>
        <button
          type="button"
          onClick={() => setShowDeleteConfirm(true)}
          className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
        >
          Delete Game
        </button>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="space-y-4">
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700">
              Title *
            </label>
            <input
              type="text"
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              required
            />
          </div>

          <div>
            <label htmlFor="category" className="block text-sm font-medium text-gray-700">
              Category *
            </label>
            <select
              id="category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              required
            >
              <option value="">Select a category</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="status" className="block text-sm font-medium text-gray-700">
              Game Status *
            </label>
            <div className="mt-2 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div className="flex items-center space-x-6">
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
              <p className="mt-2 text-sm text-gray-500">
                Draft games are only visible to you. Published games can be shared and played by others.
              </p>
            </div>
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700">
              Description
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            />
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

          <div className="space-y-4">
            <h3 className="text-lg font-medium">Game Settings</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="duration15x15" className="block text-sm font-medium text-gray-700">
                  15x15 Grid Duration (seconds)
                </label>
                <input
                  type="number"
                  id="duration15x15"
                  value={settings.duration15x15}
                  onChange={(e) => setSettings({ ...settings, duration15x15: parseInt(e.target.value) })}
                  min="1"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label htmlFor="duration10x10" className="block text-sm font-medium text-gray-700">
                  10x10 Grid Duration (seconds)
                </label>
                <input
                  type="number"
                  id="duration10x10"
                  value={settings.duration10x10}
                  onChange={(e) => setSettings({ ...settings, duration10x10: parseInt(e.target.value) })}
                  min="1"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label htmlFor="duration5x5" className="block text-sm font-medium text-gray-700">
                  5x5 Grid Duration (seconds)
                </label>
                <input
                  type="number"
                  id="duration5x5"
                  value={settings.duration5x5}
                  onChange={(e) => setSettings({ ...settings, duration5x5: parseInt(e.target.value) })}
                  min="1"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label htmlFor="durationAnswer" className="block text-sm font-medium text-gray-700">
                  Answer Duration (seconds)
                </label>
                <input
                  type="number"
                  id="durationAnswer"
                  value={settings.durationAnswer}
                  onChange={(e) => setSettings({ ...settings, durationAnswer: parseInt(e.target.value) })}
                  min="1"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-medium">Game Images</h3>
            <p className="text-sm text-gray-500">These are the images currently used in your game. Hover over an image to see its answer. To modify the images, please create a new game.</p>
            
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {gameImages.map((gameImage) => (
                <div
                  key={gameImage.image_id}
                  className="relative aspect-square rounded-lg overflow-hidden group"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={gameImage.image.grid15_url}
                    alt={gameImage.image.name}
                    className="w-full h-full object-cover transition-opacity duration-300 group-hover:opacity-0"
                  />
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={gameImage.image.original_url}
                    alt={`Answer: ${gameImage.image.name}`}
                    className="w-full h-full object-cover absolute top-0 left-0 transition-opacity duration-300 opacity-0 group-hover:opacity-100"
                  />
                  <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-xs p-2">
                    {gameImage.image.name}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-end space-x-4">
          <button
            type="button"
            onClick={() => router.push('/dashboard')}
            className="px-4 py-2 border rounded-md hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
          >
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>

      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDelete}
        title="Delete Game"
        message="Are you sure you want to delete this game? This action cannot be undone."
      />
    </div>
  )
} 