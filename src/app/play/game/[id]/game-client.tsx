'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/components/providers/auth-provider'
import { useToast } from '@/components/ui/toast'
import LoadingSpinner from '@/components/ui/loading-spinner'

interface GameImage {
  id: string
  name: string
  original_url: string
  grid15_url: string
  grid10_url: string
  grid5_url: string
}

interface Game {
  id: string
  title: string
  category: string
  settings: {
    duration15x15: number
    duration10x10: number
    duration5x5: number
    durationAnswer: number
  }
  images: GameImage[]
}

type GameState = 'loading' | 'playing' | 'guessing' | 'revealing' | 'completed'
type GridState = '15x15' | '10x10' | '5x5' | 'answer'

interface GameClientProps {
  id: string
}

export default function GameClient({ id }: GameClientProps) {
  console.log('GameClient mounting with id:', id)

  const [game, setGame] = useState<Game | null>(null)
  const [gameState, setGameState] = useState<GameState>('loading')
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [gridState, setGridState] = useState<GridState>('15x15')
  const [timeLeft, setTimeLeft] = useState(0)
  const [score, setScore] = useState(0)
  const [guess, setGuess] = useState('')
  const [answers, setAnswers] = useState<{ correct: boolean; guess: string }[]>([])
  const { user } = useAuth()
  const { showToast } = useToast()
  const router = useRouter()

  console.log('Current state:', { gameState, game, user })

  // Fetch game data
  useEffect(() => {
    const fetchGame = async () => {
      console.log('Fetching game data for id:', id)
      try {
        // Fetch game data
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
          .eq('id', id)
          .single()

        if (gameError) {
          console.error('Error fetching game data:', gameError)
          throw gameError
        }

        // Fetch game images
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
          .eq('game_id', id)
          .order('sequence_order', { ascending: true })

        if (gameImagesError) {
          console.error('Error fetching game images:', gameImagesError)
          throw gameImagesError
        }

        // Process the game images data
        const processedGameImages = gameImagesData.map((item: any) => {
          const imageData = Array.isArray(item.image) ? item.image[0] : item.image
          if (!imageData) {
            console.error('Missing image data for game image:', item)
            throw new Error('Missing image data')
          }
          return {
            id: imageData.id,
            name: imageData.name,
            original_url: imageData.original_url,
            grid15_url: imageData.grid15_url,
            grid10_url: imageData.grid10_url,
            grid5_url: imageData.grid5_url
          }
        })

        // Parse settings if it's a string
        const settings = typeof gameData.settings === 'string' 
          ? JSON.parse(gameData.settings)
          : gameData.settings

        // Combine the data
        const fullGameData = {
          ...gameData,
          settings,
          images: processedGameImages
        }

        console.log('Game data loaded successfully:', fullGameData)
        setGame(fullGameData)
        setGameState('playing')
        setTimeLeft(settings.duration15x15)
      } catch (error) {
        console.error('Error loading game:', error)
        showToast('Failed to load game', 'error')
        router.push('/')
      }
    }

    fetchGame()
  }, [id, router, showToast])

  // Timer effect
  useEffect(() => {
    if (gameState !== 'playing' || !game) return

    const timer = setInterval(() => {
      setTimeLeft(time => {
        if (time <= 1) {
          // Move to next grid or image
          if (gridState === '15x15') {
            setGridState('10x10')
            return game.settings.duration10x10
          } else if (gridState === '10x10') {
            setGridState('5x5')
            return game.settings.duration5x5
          } else if (gridState === '5x5') {
            setGameState('guessing')
            return 0
          } else if (gridState === 'answer') {
            if (currentImageIndex < game.images.length - 1) {
              setCurrentImageIndex(i => i + 1)
              setGridState('15x15')
              return game.settings.duration15x15
            } else {
              setGameState('completed')
              return 0
            }
          }
        }
        return time - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [gameState, game, gridState, currentImageIndex])

  const handleGuess = useCallback(async () => {
    if (!game) return

    const currentImage = game.images[currentImageIndex]
    const isCorrect = guess.toLowerCase() === currentImage.name.toLowerCase()

    setAnswers(prev => [...prev, { correct: isCorrect, guess }])
    if (isCorrect) {
      setScore(s => s + 1)
      showToast('Correct!', 'success')
    } else {
      showToast(`Incorrect! The answer was: ${currentImage.name}`, 'error')
    }

    setGuess('')
    setGridState('answer')
    setTimeLeft(game.settings.durationAnswer)
    setGameState('playing')

    // Only try to save progress if user is logged in
    if (user) {
      try {
        await supabase.from('game_sessions').insert({
          game_id: game.id,
          player_id: user.id,
          score: score + (isCorrect ? 1 : 0),
          completed: currentImageIndex === game.images.length - 1,
          answers: [...answers, { correct: isCorrect, guess }]
        })
      } catch (error) {
        // Just log the error but don't affect gameplay
        console.error('Error saving progress:', error)
      }
    }
  }, [game, currentImageIndex, guess, answers, score, user, showToast])

  if (!game || gameState === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mb-4"></div>
          <p className="text-lg text-gray-600">Loading game data...</p>
        </div>
      </div>
    )
  }

  const currentImage = game.images[currentImageIndex]
  const imageUrl = gridState === '15x15' ? currentImage.grid15_url :
                  gridState === '10x10' ? currentImage.grid10_url :
                  gridState === '5x5' ? currentImage.grid5_url :
                  currentImage.original_url

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold">{game.title}</h1>
            <p className="text-gray-600">Category: {game.category}</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold">Score: {score}</p>
            <p className="text-gray-600">
              Image {currentImageIndex + 1} of {game.images.length}
            </p>
          </div>
        </div>

        {/* Game Area */}
        <div className="space-y-8">
          {/* Image Display */}
          <div className="aspect-video relative">
            <img
              src={imageUrl}
              alt="Game Image"
              className="w-full h-full object-contain"
            />
            {gameState === 'playing' && (
              <div className="absolute top-4 right-4 bg-black bg-opacity-75 text-white px-4 py-2 rounded-full">
                {timeLeft}s
              </div>
            )}
          </div>

          {/* Guess Input */}
          {gameState === 'guessing' && (
            <div className="space-y-4">
              <input
                type="text"
                value={guess}
                onChange={(e) => setGuess(e.target.value)}
                placeholder="Enter your guess..."
                className="w-full px-4 py-2 border rounded-md"
                onKeyPress={(e) => e.key === 'Enter' && handleGuess()}
              />
              <button
                onClick={handleGuess}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Submit Guess
              </button>
            </div>
          )}

          {/* Game Complete */}
          {gameState === 'completed' && (
            <div className="text-center space-y-4">
              <h2 className="text-2xl font-bold">Game Complete!</h2>
              <p className="text-xl">Final Score: {score} / {game.images.length}</p>
              <button
                onClick={() => router.push('/dashboard')}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Back to Dashboard
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 