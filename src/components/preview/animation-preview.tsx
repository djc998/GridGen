'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import LoadingSpinner from '@/components/ui/loading-spinner'
import { useToast } from '@/components/ui/toast'

interface AnimationPreviewProps {
  images: {
    original: string
    grid15: string
    grid10: string
    grid5: string
  }
}

type AnimationPattern = 'sequential' | 'reverse' | 'bounce' | 'random'

export default function AnimationPreview({ images }: AnimationPreviewProps) {
  const [currentImage, setCurrentImage] = useState<string>(images.original)
  const [isPlaying, setIsPlaying] = useState(false)
  const [speed, setSpeed] = useState(1000)
  const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set())
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [pattern, setPattern] = useState<AnimationPattern>('sequential')
  const containerRef = useRef<HTMLDivElement>(null)
  const { showToast } = useToast()

  // Preload images
  useEffect(() => {
    const imageUrls = Object.values(images)
    let mounted = true

    const preloadImages = async () => {
      try {
        await Promise.all(
          imageUrls.map(
            (url) =>
              new Promise((resolve, reject) => {
                const img = new Image()
                img.src = url
                img.onload = () => {
                  if (mounted) {
                    setLoadedImages((prev) => new Set([...prev, url]))
                  }
                  resolve(url)
                }
                img.onerror = reject
              })
          )
        )
      } catch (error) {
        showToast('Failed to load some images', 'error')
        console.error('Image loading error:', error)
      }
    }

    preloadImages()
    return () => { mounted = false }
  }, [images, showToast])

  const isLoading = loadedImages.size < Object.keys(images).length

  // Animation patterns
  const getSequence = useCallback((): string[] => {
    const imageArray = [images.original, images.grid15, images.grid10, images.grid5]
    
    switch (pattern) {
      case 'sequential':
        return [...imageArray]
      case 'reverse':
        return [...imageArray].reverse()
      case 'bounce':
        return [...imageArray, ...imageArray.slice(1, -1).reverse()]
      case 'random':
        return Array(8).fill(null).map(() => 
          imageArray[Math.floor(Math.random() * imageArray.length)]
        )
      default:
        return imageArray
    }
  }, [images, pattern])

  const playAnimation = useCallback(() => {
    if (isLoading) return

    const sequence = getSequence()
    let index = 0

    const animate = () => {
      setCurrentImage(sequence[index])
      index = (index + 1) % sequence.length
    }

    const intervalId = setInterval(animate, speed)
    return () => clearInterval(intervalId)
  }, [images, speed, isLoading, getSequence])

  useEffect(() => {
    let cleanup: (() => void) | undefined

    if (isPlaying && !isLoading) {
      cleanup = playAnimation()
    }

    return () => cleanup?.()
  }, [isPlaying, playAnimation, isLoading])

  // Keyboard controls
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      switch (e.key) {
        case ' ':
          e.preventDefault()
          setIsPlaying(prev => !prev)
          break
        case 'f':
          e.preventDefault()
          handleFullscreen()
          break
        case 'ArrowRight':
          e.preventDefault()
          setSpeed(prev => Math.max(prev - 100, 100))
          break
        case 'ArrowLeft':
          e.preventDefault()
          setSpeed(prev => Math.min(prev + 100, 2000))
          break
        case 'Escape':
          if (isFullscreen) {
            document.exitFullscreen()
          }
          break
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [isFullscreen])

  // Fullscreen handling
  const handleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen()
      setIsFullscreen(true)
    } else {
      document.exitFullscreen()
      setIsFullscreen(false)
    }
  }

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [])

  return (
    <div 
      ref={containerRef}
      className={`p-4 space-y-4 ${
        isFullscreen ? 'fixed inset-0 bg-black flex flex-col items-center justify-center' : ''
      }`}
    >
      {isLoading ? (
        <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
          <LoadingSpinner size="large" />
          <p className="text-gray-600">
            Loading images... ({loadedImages.size}/{Object.keys(images).length})
          </p>
        </div>
      ) : (
        <>
          <div className={`relative bg-gray-100 rounded-lg overflow-hidden ${
            isFullscreen ? 'w-full h-full' : 'aspect-square'
          }`}>
            <img
              src={currentImage}
              alt="Preview"
              className={`${
                isFullscreen ? 'w-full h-full object-contain' : 'w-full h-full object-cover'
              } transition-opacity duration-300`}
            />
          </div>

          <div className={`space-y-4 ${isFullscreen ? 'absolute bottom-8 left-0 right-0' : ''}`}>
            <div className="flex justify-center space-x-4">
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                {isPlaying ? 'Pause' : 'Play'}
              </button>
              <select
                value={speed}
                onChange={(e) => setSpeed(Number(e.target.value))}
                className="px-4 py-2 border rounded-md"
              >
                <option value={2000}>Slow</option>
                <option value={1000}>Normal</option>
                <option value={500}>Fast</option>
              </select>
              <select
                value={pattern}
                onChange={(e) => setPattern(e.target.value as AnimationPattern)}
                className="px-4 py-2 border rounded-md"
              >
                <option value="sequential">Sequential</option>
                <option value="reverse">Reverse</option>
                <option value="bounce">Bounce</option>
                <option value="random">Random</option>
              </select>
              <button
                onClick={handleFullscreen}
                className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
              >
                {isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 max-w-md mx-auto">
              {Object.entries(images).map(([key, url]) => (
                <button
                  key={key}
                  onClick={() => {
                    setIsPlaying(false)
                    setCurrentImage(url)
                  }}
                  className={`p-2 text-sm rounded-md ${
                    currentImage === url
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 hover:bg-gray-200'
                  }`}
                >
                  {key === 'original' ? 'Original' : `${key.replace('grid', '')}x${key.replace('grid', '')} Grid`}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
} 