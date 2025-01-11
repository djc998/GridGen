'use client'

import { useState, useEffect, useRef } from 'react'
import { UserImage } from '@/types/database'
import { useToast } from '@/components/ui/toast'

interface GuessGameProps {
  image: UserImage
  onClose: () => void
}

// Add minimum word length constant
const MIN_WORD_LENGTH = 3

// Add minimum required words ratio
const MIN_WORDS_RATIO = 0.75

const normalizeString = (str: string): string[] => {
  return str
    .toLowerCase()
    // Remove apostrophes and special characters
    .replace(/[''`"]/g, '')
    // Replace special characters and multiple spaces with single space
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    // Trim whitespace and split into words
    .trim()
    .split(' ')
    // Filter out empty strings and common words
    .filter(word => word && !['the', 'a', 'an', 'as', 
      'by', 'for', 'of', 'at', 'to', 'from', 'up', 'down', 
      'in', 'out', 'on', 'off', 'over', 'under', 'again', 
      'further', 'then', 'once'].includes(word))
}

export function GuessGame({ image, onClose }: GuessGameProps) {
  const { showToast } = useToast()
  const [currentGuess, setCurrentGuess] = useState('')
  const [timeLeft, setTimeLeft] = useState(30)
  const [currentImage, setCurrentImage] = useState(image.grid15_url)
  const [gameEnded, setGameEnded] = useState(false)
  const [revealed, setRevealed] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    // Focus input on mount
    inputRef.current?.focus()

    // Timer logic
    const timer = setInterval(() => {
      setTimeLeft((time) => {
        if (time <= 1) {
          clearInterval(timer)
          setGameEnded(true)
          return 0
        }
        
        // Change image based on time
        if (time === 20) {
          setCurrentImage(image.grid10_url)
        } else if (time === 10) {
          setCurrentImage(image.grid5_url)
        }
        
        return time - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [image])

  const handleGuess = (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentGuess.trim()) return

    // Normalize both strings into word arrays
    const guessWords = normalizeString(currentGuess)
    const answerWords = normalizeString(image.name)

    // Don't allow empty guesses after normalization
    if (guessWords.length === 0) {
      setCurrentGuess('')
      showToast('Invalid guess, try again!', 'error')
      return
    }

    // For multi-word answers, require more complete matches
    if (answerWords.length > 1) {
      // Must have guessed enough words
      const requiredWords = Math.ceil(answerWords.length * MIN_WORDS_RATIO)
      if (guessWords.length < requiredWords) {
        setCurrentGuess('')
        showToast('Try guessing more words!', 'error')
        return
      }

      // Check if the guessed words match the answer words exactly
      const isCorrect = guessWords.length >= requiredWords && 
        guessWords.every(word => 
          answerWords.some(answerWord => 
            word.toLowerCase() === answerWord.toLowerCase()
          )
        )

      if (isCorrect) {
        setGameEnded(true)
        setRevealed(true)
        showToast('Correct! 🎉', 'success')
      } else {
        setCurrentGuess('')
        showToast('Incorrect, try again!', 'error')
      }
    } else {
      // Single word answer - use stricter matching
      const isCorrect = guessWords.length === 1 && 
        guessWords[0].length >= MIN_WORD_LENGTH &&
        guessWords[0].toLowerCase() === answerWords[0].toLowerCase()

      if (isCorrect) {
        setGameEnded(true)
        setRevealed(true)
        showToast('Correct! 🎉', 'success')
      } else {
        setCurrentGuess('')
        showToast('Incorrect, try again!', 'error')
      }
    }
  }

  return (
    <div className="space-y-4">
      <div className="relative aspect-video">
        <img
          src={revealed ? image.original_url : currentImage}
          alt="Guess the image"
          className="w-full h-full object-contain"
        />
      </div>

      <div className="flex justify-between items-center">
        <div className="text-lg font-semibold">
          Time Left: {timeLeft}s
        </div>
        {gameEnded && !revealed && (
          <button
            onClick={() => setRevealed(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Reveal Answer
          </button>
        )}
      </div>

      {!gameEnded && (
        <form onSubmit={handleGuess} className="space-y-2">
          <input
            ref={inputRef}
            type="text"
            value={currentGuess}
            onChange={(e) => setCurrentGuess(e.target.value)}
            placeholder="Enter your guess..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          />
          <button
            type="submit"
            className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Submit Guess
          </button>
        </form>
      )}

      {revealed && (
        <div className="text-center">
          <p className="text-xl font-semibold mb-2">Answer: {image.name}</p>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
          >
            Close
          </button>
        </div>
      )}
    </div>
  )
} 