'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { UserImage } from '@/types/database'
import LoadingSpinner from '@/components/ui/loading-spinner'
import { useRouter } from 'next/navigation'
import { Play } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

interface Game {
  id: string
  title: string
  category: string
  description: string
  created_at: string
  created_by: string
  status: 'draft' | 'published'
  game_images: {
    image_id: string
    sequence_order: number
    image: UserImage
  }[]
}

export default function ViewPage() {
  const [games, setGames] = useState<Game[]>([])
  const [filteredGames, setFilteredGames] = useState<Game[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [categories, setCategories] = useState<Set<string>>(new Set())
  const router = useRouter()

  // Fetch published games and build category list
  useEffect(() => {
    const fetchGames = async () => {
      try {
        const { data, error } = await supabase
          .from('games')
          .select(`
            *,
            game_images (
              image_id,
              sequence_order,
              image:images (*)
            )
          `)
          .eq('status', 'published')
          .order('created_at', { ascending: false })

        if (error) throw error

        const gameData = data as Game[]
        setGames(gameData)
        setFilteredGames(gameData)

        // Build unique categories list
        const uniqueCategories = new Set(gameData.map(game => game.category))
        setCategories(uniqueCategories)
      } catch (error) {
        console.error('Error fetching games:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchGames()
  }, [])

  // Filter games when category changes
  useEffect(() => {
    if (selectedCategory === 'all') {
      setFilteredGames(games)
    } else {
      setFilteredGames(games.filter(game => game.category === selectedCategory))
    }
  }, [selectedCategory, games])

  // Group games by category
  const groupGamesByCategory = (games: Game[]) => {
    const grouped = new Map<string, Game[]>()
    games.forEach(game => {
      if (!grouped.has(game.category)) {
        grouped.set(game.category, [])
      }
      grouped.get(game.category)?.push(game)
    })
    return grouped
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
                ({games.length})
              </span>
            </button>
            {Array.from(categories).sort().map(category => {
              const count = games.filter(game => game.category === category).length
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

      {/* Game Grid with Categories */}
      <div className="space-y-12">
        {selectedCategory === 'all' ? (
          Array.from(groupGamesByCategory(filteredGames)).map(([category, categoryGames]) => (
            <div key={category}>
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                {category}
                <span className="ml-2 text-lg font-normal text-gray-500">
                  ({categoryGames.length})
                </span>
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {categoryGames.map((game) => (
                  <div key={game.id} className="bg-white rounded-lg shadow-md overflow-hidden">
                    <div className="aspect-square relative">
                      {game.game_images && game.game_images[0] && (
                        <img
                          src={game.game_images[0].image.grid15_url}
                          alt={game.title}
                          className="w-full h-full object-cover"
                        />
                      )}
                      <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => router.push(`/play/${game.id}`)}
                          className="bg-blue-600 text-white px-6 py-3 rounded-full hover:bg-blue-700 flex items-center space-x-2"
                        >
                          <Play className="w-5 h-5" />
                          <span>Play Game</span>
                        </button>
                      </div>
                    </div>
                    <div className="p-4">
                      <h3 className="font-semibold text-lg mb-2">{game.title}</h3>
                      {game.description && (
                        <p className="text-sm text-gray-600 mb-2 line-clamp-2">{game.description}</p>
                      )}
                      <p className="text-xs text-gray-500">
                        Created {formatDistanceToNow(new Date(game.created_at))} ago
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        ) : (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              {selectedCategory}
              <span className="ml-2 text-lg font-normal text-gray-500">
                ({filteredGames.length})
              </span>
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredGames.map((game) => (
                <div key={game.id} className="bg-white rounded-lg shadow-md overflow-hidden">
                  <div className="aspect-square relative">
                    {game.game_images && game.game_images[0] && (
                      <img
                        src={game.game_images[0].image.grid15_url}
                        alt={game.title}
                        className="w-full h-full object-cover"
                      />
                    )}
                    <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => router.push(`/play/${game.id}`)}
                        className="bg-blue-600 text-white px-6 py-3 rounded-full hover:bg-blue-700 flex items-center space-x-2"
                      >
                        <Play className="w-5 h-5" />
                        <span>Play Game</span>
                      </button>
                    </div>
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold text-lg mb-2">{game.title}</h3>
                    {game.description && (
                      <p className="text-sm text-gray-600 mb-2 line-clamp-2">{game.description}</p>
                    )}
                    <p className="text-xs text-gray-500">
                      Created {formatDistanceToNow(new Date(game.created_at))} ago
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Empty State */}
      {filteredGames.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">
            No games found in this category
          </p>
        </div>
      )}
    </div>
  )
} 