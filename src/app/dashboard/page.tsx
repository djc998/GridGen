'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { UserImage } from '@/types/database'
import Link from 'next/link'
import { useAuth } from '@/components/providers/auth-provider'
import { Edit, Play } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { ShareButtons } from '@/components/ui/share-buttons'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { useToast } from '@/components/ui/toast'

interface Game {
  id: string
  title: string
  category: string
  settings: GameSettings
  created_at: string
  status: 'published' | 'draft'
  created_by: string
  game_images: {
    game_id: string
    image_id: string
    sequence_order: number
    image: UserImage
  }[]
}

interface GameSettings {
  duration15x15: number
  duration10x10: number
  duration5x5: number
  durationAnswer: number
}

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState<'images' | 'games'>('games')
  const [images, setImages] = useState<UserImage[]>([])
  const [games, setGames] = useState<Game[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [deleteImageId, setDeleteImageId] = useState<string | null>(null)
  const [deleteGameId, setDeleteGameId] = useState<string | null>(null)
  const { user } = useAuth()
  const { showToast } = useToast()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [selectedTag, setSelectedTag] = useState('')
  const [selectedImages, setSelectedImages] = useState<string[]>([])
  const [selectedGames, setSelectedGames] = useState<string[]>([])

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return

      setIsLoading(true)
      try {
        // Fetch images
        const { data: imageData, error: imageError } = await supabase
          .from('images')
          .select(`
            *,
            image_tags (
              tag_name
            )
          `)
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })

        if (imageError) throw imageError
        setImages(imageData || [])

        // Fetch games
        const { data: gameData, error: gameError } = await supabase
          .from('games')
          .select(`
            *,
            game_images (
              image_id,
              sequence_order,
              image:images (*)
            )
          `)
          .eq('created_by', user.id)
          .order('created_at', { ascending: false })

        if (gameError) throw gameError
        setGames(gameData || [])
      } catch (error) {
        console.error('Error fetching data:', error)
        showToast('Failed to load data', 'error')
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
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

  const handleGameSelect = (gameId: string) => {
    setSelectedGames(prev => 
      prev.includes(gameId) 
        ? prev.filter(id => id !== gameId)
        : [...prev, gameId]
    )
  }

  const handleExportGames = async () => {
    if (selectedGames.length === 0) {
      showToast('Please select at least one game to export', 'error')
      return
    }

    try {
      // Get all images from selected games
      const selectedGamesData = games.filter(game => selectedGames.includes(game.id))
      const allGameImages = selectedGamesData.flatMap(game => 
        game.game_images.map(gi => ({
          ...gi.image,
          game_title: game.title,
          game_category: game.category
        }))
      )
      
      const response = await fetch('/api/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ images: allGameImages }),
      })

      if (!response.ok) throw new Error('Export failed')

      // Get the blob from the response
      const blob = await response.blob()
      
      // Create a download link and trigger it
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `exported_games_${new Date().toISOString().split('T')[0]}.zip`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      showToast('Export completed successfully', 'success')
    } catch (error) {
      console.error('Export error:', error)
      showToast('Failed to export games', 'error')
    }
  }

  const handleDeleteGame = async (gameId: string) => {
    setDeleteGameId(gameId)
  }

  const handleConfirmDeleteGame = async () => {
    if (!deleteGameId || !user) return

    try {
      // First check if we have permission to delete this game
      const { data: gameToDelete, error: checkError } = await supabase
        .from('games')
        .select('id')
        .eq('id', deleteGameId)
        .eq('created_by', user.id)
        .single()

      if (checkError || !gameToDelete) {
        console.error('Error checking game permissions:', checkError)
        throw new Error('You do not have permission to delete this game')
      }

      // First delete from game_images table
      const { error: gameImagesError } = await supabase
        .from('game_images')
        .delete()
        .eq('game_id', deleteGameId)
        .eq('game_id', gameToDelete.id) // Extra check to ensure we're deleting the correct game's images

      if (gameImagesError) {
        console.error('Error deleting from game_images:', gameImagesError)
        throw gameImagesError
      }

      // Then delete from games table
      const { error: gameError } = await supabase
        .from('games')
        .delete()
        .eq('id', deleteGameId)
        .eq('created_by', user.id) // Ensure we can only delete our own games

      if (gameError) {
        console.error('Error deleting from games:', gameError)
        throw gameError
      }

      // Update local state
      setGames(prevGames => prevGames.filter(game => game.id !== deleteGameId))
      showToast('Game deleted successfully', 'success')

      // Refetch games to ensure state is in sync
      const { data: gameData, error: fetchError } = await supabase
        .from('games')
        .select(`
          *,
          game_images (
            image_id,
            sequence_order,
            image:images (*)
          )
        `)
        .eq('created_by', user.id)
        .order('created_at', { ascending: false })

      if (fetchError) {
        console.error('Error fetching games:', fetchError)
      } else {
        setGames(gameData || [])
      }
    } catch (error) {
      console.error('Error deleting game:', error)
      showToast('Failed to delete game', 'error')
    } finally {
      setDeleteGameId(null)
    }
  }

  return (
    <div className="container mx-auto py-8 px-4">
      {/* Tabs */}
      <div className="flex space-x-4 mb-8">
        <button
          onClick={() => setActiveTab('games')}
          className={`px-4 py-2 rounded-md ${
            activeTab === 'games'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 hover:bg-gray-200'
          }`}
        >
          My Games
        </button>
        <button
          onClick={() => setActiveTab('images')}
          className={`px-4 py-2 rounded-md ${
            activeTab === 'images'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 hover:bg-gray-200'
          }`}
        >
          My Images
        </button>
      </div>

      {activeTab === 'games' ? (
        <div>
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold">My Games</h1>
            <div className="flex items-center gap-4">
              <button
                onClick={handleExportGames}
                disabled={selectedGames.length === 0}
                className={`px-4 py-2 rounded-md ${
                  selectedGames.length === 0
                    ? 'bg-gray-300 cursor-not-allowed'
                    : 'bg-green-600 hover:bg-green-700 text-white'
                }`}
              >
                Export Selected ({selectedGames.length})
              </button>
              <Link
                href="/create-game"
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
              >
                Create New Game
              </Link>
            </div>
          </div>

          {isLoading ? (
            <div className="flex justify-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {games.map((game) => (
                <div
                  key={game.id}
                  className={`bg-white rounded-lg shadow-md overflow-hidden group relative ${
                    selectedGames.includes(game.id) ? 'ring-2 ring-blue-500' : ''
                  }`}
                  onClick={() => handleGameSelect(game.id)}
                >
                  <div className="absolute top-2 left-2 z-10">
                    <input
                      type="checkbox"
                      checked={selectedGames.includes(game.id)}
                      onChange={() => handleGameSelect(game.id)}
                      onClick={(e) => e.stopPropagation()}
                      className="h-5 w-5 rounded border-gray-300"
                    />
                  </div>
                  <div className="aspect-square relative">
                    {game.game_images && game.game_images[0] && (
                      <img
                        src={game.game_images[0].image.grid15_url}
                        alt={game.title}
                        className="w-full h-full object-cover"
                      />
                    )}
                    <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                      <div className="flex flex-col space-y-2">
                        <Link
                          href={`/play/${game.id}`}
                          className="bg-blue-600 text-white px-4 py-2 rounded-full hover:bg-blue-700 flex items-center space-x-2"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Play className="w-4 h-4" />
                          <span>Play Game</span>
                        </Link>
                        <Link
                          href={`/edit-game/${game.id}`}
                          className="bg-gray-600 text-white px-4 py-2 rounded-full hover:bg-gray-700 flex items-center space-x-2"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Edit className="w-4 h-4" />
                          <span>Edit Game</span>
                        </Link>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDeleteGame(game.id)
                          }}
                          className="bg-red-600 text-white px-4 py-2 rounded-full hover:bg-red-700 flex items-center space-x-2"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                          <span>Delete Game</span>
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold text-lg mb-1">{game.title}</h3>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-sm text-gray-600">{game.category}</span>
                      <span className="text-sm">•</span>
                      <span className={`text-sm px-2 py-0.5 rounded-full ${
                        game.status === 'published' 
                          ? 'bg-green-100 text-green-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {game.status === 'published' ? 'Published' : 'Draft'}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500">
                      Created {game.created_at ? formatDistanceToNow(new Date(game.created_at)) : 'recently'} ago
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div>
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
                {Array.from(new Set(images.map(image => image.category))).map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
              <select
                value={selectedTag}
                onChange={(e) => setSelectedTag(e.target.value)}
                className="border px-4 py-2 rounded-md"
              >
                <option value="">All Tags</option>
                {Array.from(new Set(images.flatMap(image => 
                  image.image_tags ? image.image_tags.map((tag: any) => tag.tag_name) : []
                ))).map(tag => (
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
              {images.filter(image => {
                const query = searchQuery.toLowerCase()
                const matchesQuery =
                  image.name.toLowerCase().includes(query) ||
                  image.category.toLowerCase().includes(query) ||
                  (image.image_tags && image.image_tags.some((tag: any) => tag.tag_name.toLowerCase().includes(query)))

                const matchesCategory = selectedCategory ? image.category === selectedCategory : true
                const matchesTag = selectedTag ? image.image_tags && image.image_tags.some((imageTag: any) => imageTag.tag_name === selectedTag) : true

                return matchesQuery && matchesCategory && matchesTag
              }).map((image) => (
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
                    <div className="absolute top-2 right-2 z-10 flex space-x-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDelete(image.id)
                        }}
                        className="p-2 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                      </button>
                      <Link
                        href={`/edit-image/${image.id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="p-2 bg-gray-600 text-white rounded-full hover:bg-gray-700 transition-colors"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                        </svg>
                      </Link>
                    </div>
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold text-lg mb-1">{image.name}</h3>
                    <p className="text-sm text-gray-600 mb-2">{image.category}</p>
                    <div className="flex flex-wrap gap-1 mb-2">
                      {image.image_tags && image.image_tags.map((tag: any) => (
                        <span
                          key={tag.tag_name}
                          className="bg-gray-100 text-gray-600 px-2 py-1 rounded-full text-xs"
                        >
                          {tag.tag_name}
                        </span>
                      ))}
                    </div>
                    <p className="text-xs text-gray-500">
                      Uploaded {image.created_at ? formatDistanceToNow(new Date(image.created_at)) : 'recently'} ago
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <ConfirmDialog
        isOpen={!!deleteImageId || !!deleteGameId}
        onClose={() => {
          setDeleteImageId(null)
          setDeleteGameId(null)
        }}
        onConfirm={deleteImageId ? handleConfirmDelete : handleConfirmDeleteGame}
        title={deleteImageId ? "Delete Image" : "Delete Game"}
        message={deleteImageId 
          ? "Are you sure you want to delete this image? This action cannot be undone."
          : "Are you sure you want to delete this game? This action cannot be undone."
        }
      />
    </div>
  )
} 