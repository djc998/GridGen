'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/components/providers/auth-provider'
import { useToast } from '@/components/ui/toast'

interface GameImage {
  image_id: string
  sequence_order: number
  image: {
    id: string
    name: string
    original_url: string
    grid15_url: string
    grid10_url: string
    grid5_url: string
  }
}

interface Game {
  id: string
  title: string
  category: string
  description: string
  randomize_images: boolean
  settings: {
    duration15x15: number
    duration10x10: number
    duration5x5: number
    durationAnswer: number
  }
  game_images: GameImage[]
}

type GridSize = '15x15' | '10x10' | '5x5' | 'answer'

export default function PlayGamePage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const { showToast } = useToast()
  
  const [game, setGame] = useState<Game | null>(null)
  const [loading, setLoading] = useState(true)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [currentGridSize, setCurrentGridSize] = useState<GridSize>('15x15')
  const [timeLeft, setTimeLeft] = useState<number>(0)
  const [gameStarted, setGameStarted] = useState(false)
  const [guess, setGuess] = useState('')
  const [showGuessInput, setShowGuessInput] = useState(false)
  const [score, setScore] = useState(0)
  const [isGameOver, setIsGameOver] = useState(false)
  const [totalTimeLeft, setTotalTimeLeft] = useState<number>(0)
  const [totalPhaseTime, setTotalPhaseTime] = useState<number>(0)

  useEffect(() => {
    const fetchGame = async () => {
      if (!user || !params.id) return

      try {
        // First, fetch the game with its settings
        const { data: gameData, error: gameError } = await supabase
          .from('games')
          .select(`
            id,
            title,
            category,
            description,
            randomize_images,
            settings,
            created_at
          `)
          .eq('id', params.id)
          .single()

        if (gameError) throw gameError

        // Parse settings if it's a string
        const settings = typeof gameData.settings === 'string' 
          ? JSON.parse(gameData.settings)
          : gameData.settings

        // Then fetch the game images with their related image data
        const { data: gameImagesData, error: gameImagesError } = await supabase
          .from('game_images')
          .select(`
            image_id,
            sequence_order,
            image:images (
              id,
              name,
              original_url,
              grid15_url,
              grid10_url,
              grid5_url
            )
          `)
          .eq('game_id', params.id)
          .order('sequence_order', { ascending: true })

        if (gameImagesError) throw gameImagesError

        let processedGameImages = gameImagesData.map(item => {
          // Ensure item.image is treated as a single object
          const imageData = Array.isArray(item.image) ? item.image[0] : item.image
          
          return {
            image_id: item.image_id,
            sequence_order: item.sequence_order,
            image: {
              id: imageData.id,
              name: imageData.name,
              original_url: imageData.original_url,
              grid15_url: imageData.grid15_url,
              grid10_url: imageData.grid10_url,
              grid5_url: imageData.grid5_url
            }
          }
        }) as GameImage[]

        // Randomize images if enabled
        if (gameData.randomize_images) {
          processedGameImages = [...processedGameImages]
            .map(value => ({ value, sort: Math.random() }))
            .sort((a, b) => a.sort - b.sort)
            .map(({ value }) => value)
        }

        // Combine the data
        const fullGameData: Game = {
          ...gameData,
          settings,
          game_images: processedGameImages
        }

        setGame(fullGameData)
        setTimeLeft(settings.duration15x15)
      } catch (error: any) {
        console.error('Error fetching game:', error)
        showToast(error.message || 'Failed to load game', 'error')
        router.push('/dashboard')
      } finally {
        setLoading(false)
      }
    }

    fetchGame()
  }, [user, params.id])

  useEffect(() => {
    if (!game || !gameStarted) return

    const timer = setInterval(() => {
      setTimeLeft((time) => {
        if (time <= 1) {
          // Move to next grid size or image
          if (currentGridSize === '15x15') {
            setCurrentGridSize('10x10')
            return game.settings.duration10x10
          } else if (currentGridSize === '10x10') {
            setCurrentGridSize('5x5')
            return game.settings.duration5x5
          } else if (currentGridSize === '5x5') {
            setCurrentGridSize('answer')
            return game.settings.durationAnswer
          } else if (currentGridSize === 'answer') {
            if (currentImageIndex < game.game_images.length - 1) {
              setCurrentImageIndex(i => i + 1)
              setCurrentGridSize('15x15')
              setGuess('')
              return game.settings.duration15x15
            } else {
              // Game finished
              clearInterval(timer)
              setGameStarted(false)
              setIsGameOver(true)
              showToast(`Game completed! Final score: ${score}/${game.game_images.length}`, 'success')
              return 0
            }
          }
          return 0
        }
        return time - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [game, gameStarted, currentGridSize, currentImageIndex])

  const handleStartGame = () => {
    if (!game) return

    // Re-randomize images if randomization is enabled
    if (game.randomize_images) {
      const randomizedImages = [...game.game_images]
        .map(value => ({ value, sort: Math.random() }))
        .sort((a, b) => a.sort - b.sort)
        .map(({ value }) => value)
      
      setGame({
        ...game,
        game_images: randomizedImages
      })
    }

    setGameStarted(true)
    setCurrentImageIndex(0)
    setCurrentGridSize('15x15')
    setTimeLeft(game.settings.duration15x15)
    setScore(0)
    setGuess('')
    setIsGameOver(false)
  }

  const handleGuessSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!game || !currentImage) return

    const isCorrect = guess.toLowerCase() === currentImage.image.name.toLowerCase()
    if (isCorrect) {
      setScore(s => s + 1)
      showToast('Correct!', 'success')
      
      // Move to next image immediately if correct
      if (currentImageIndex < game.game_images.length - 1) {
        setCurrentImageIndex(i => i + 1)
        setCurrentGridSize('15x15')
        setTimeLeft(game.settings.duration15x15)
        setGuess('')
      } else {
        // Game finished
        setGameStarted(false)
        setIsGameOver(true)
        showToast(`Game completed! Final score: ${score + 1}/${game.game_images.length}`, 'success')
      }
    } else {
      showToast('Incorrect! Try again', 'error')
    }
  }

  const getRemainingPhaseTime = () => {
    if (!game) return 0
    let timeRemaining = timeLeft

    // Add remaining time for future phases in current image
    if (currentGridSize === '15x15') {
      timeRemaining += game.settings.duration10x10 + game.settings.duration5x5
    } else if (currentGridSize === '10x10') {
      timeRemaining += game.settings.duration5x5
    }

    return timeRemaining
  }

  const getPhaseLabel = () => {
    switch (currentGridSize) {
      case '15x15':
        return '15×15 Grid'
      case '10x10':
        return '10×10 Grid'
      case '5x5':
        return '5×5 Grid'
      case 'answer':
        return 'Answer'
      default:
        return ''
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  if (!game || game.game_images.length === 0) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Game not found</h1>
          <button
            onClick={() => router.push('/dashboard')}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    )
  }

  if (isGameOver) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg p-8 text-center">
          <h1 className="text-3xl font-bold mb-4">Game Over!</h1>
          <div className="text-6xl font-bold text-blue-600 mb-6">
            {score}/{game.game_images.length}
          </div>
          <p className="text-xl mb-4">
            {score === game.game_images.length 
              ? 'Perfect Score! Amazing job! 🎉' 
              : score > game.game_images.length / 2 
              ? 'Well done! Great effort! 👏' 
              : 'Keep practicing! You\'ll get better! 💪'}
          </p>
          <div className="space-y-4">
            <button
              onClick={handleStartGame}
              className="w-full bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700 transition-colors"
            >
              Play Again
            </button>
            <button
              onClick={() => router.push('/dashboard')}
              className="w-full bg-gray-600 text-white px-6 py-3 rounded-md hover:bg-gray-700 transition-colors"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    )
  }

  const currentImage = game.game_images[currentImageIndex]
  const imageUrl = currentGridSize === '15x15'
    ? currentImage.image.grid15_url
    : currentGridSize === '10x10'
    ? currentImage.image.grid10_url
    : currentGridSize === '5x5'
    ? currentImage.image.grid5_url
    : currentImage.image.original_url

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold">{game.title}</h1>
            <p className="text-gray-600">Score: {score}/{game.game_images.length}</p>
          </div>
          <div className="flex flex-col items-end space-y-2">
            <div className="flex items-center space-x-4">
              {gameStarted && currentGridSize !== 'answer' && (
                <div className="text-xl font-semibold">
                  {Math.floor(getRemainingPhaseTime() / 60)}:{(getRemainingPhaseTime() % 60).toString().padStart(2, '0')}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="aspect-square w-full relative rounded-lg overflow-hidden shadow-lg">
          {!gameStarted && currentImageIndex === 0 ? (
            <div className="absolute inset-0 bg-gradient-to-br from-blue-600 to-blue-800 flex flex-col items-center justify-center text-white p-8 text-center">
              <h2 className="text-3xl font-bold mb-4">Ready to Play?</h2>
              {game.description && (
                <p className="text-lg mb-6 max-w-md">
                  {game.description}
                </p>
              )}
              <p className="text-lg mb-8 max-w-md">
                Try to guess each image as it's revealed through progressively clearer grids. The faster you guess, the more points you earn!
              </p>
              <button
                onClick={handleStartGame}
                className="px-8 py-3 bg-white text-blue-600 rounded-full text-lg font-semibold hover:bg-blue-50 transition-colors"
              >
                Start Game
              </button>
            </div>
          ) : (
            <>
              <img
                src={imageUrl}
                alt={currentGridSize === 'answer' ? currentImage.image.name : 'Hidden image'}
                className="w-full h-full object-cover"
              />
              {currentGridSize === 'answer' && (
                <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                  <div className="text-white text-2xl font-bold p-4 text-center">
                    <p>Answer:</p>
                    <p>{currentImage.image.name}</p>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {gameStarted && currentGridSize !== 'answer' && (
          <form onSubmit={handleGuessSubmit} className="mt-6">
            <div className="flex space-x-4">
              <input
                type="text"
                value={guess}
                onChange={(e) => setGuess(e.target.value)}
                placeholder="Enter your guess..."
                className="flex-1 px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
              />
              <button
                type="submit"
                className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
              >
                Submit
              </button>
            </div>
          </form>
        )}

        <div className="mt-8 flex justify-between items-center">
          <div className="text-gray-600">
            Image {currentImageIndex + 1} of {game.game_images.length}
          </div>
          <div className="flex space-x-2">
            {['15x15', '10x10', '5x5', 'answer'].map((size) => (
              <div
                key={size}
                className={`px-3 py-1 rounded-full ${
                  currentGridSize === size
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-600'
                }`}
              >
                {size}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
} 