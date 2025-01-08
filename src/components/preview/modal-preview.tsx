'use client'

import { useState, useEffect } from 'react'
import { UserImage } from '@/types/database'

interface ModalPreviewProps {
  image: UserImage
}

export function ModalPreview({ image }: ModalPreviewProps) {
  const [currentUrl, setCurrentUrl] = useState(image.original_url)
  const [speed, setSpeed] = useState(1000)
  const [isPlaying, setIsPlaying] = useState(false)

  useEffect(() => {
    let intervalId: NodeJS.Timeout

    if (isPlaying) {
      const urls = [
        image.original_url,
        image.grid15_url,
        image.grid10_url,
        image.grid5_url,
      ]
      let index = urls.indexOf(currentUrl)

      intervalId = setInterval(() => {
        index = (index + 1) % urls.length
        setCurrentUrl(urls[index])
      }, speed)
    }

    return () => {
      if (intervalId) clearInterval(intervalId)
    }
  }, [isPlaying, speed, currentUrl, image])

  return (
    <div className="flex flex-col items-center space-y-6">
      <img
        src={currentUrl}
        alt={image.name}
        className="max-w-full max-h-[60vh] object-contain"
      />
      
      <div className="flex flex-col items-center gap-4 w-full max-w-md">
        {/* Animation Controls */}
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            {isPlaying ? 'Pause' : 'Play'}
          </button>
          <div className="flex items-center gap-2">
            <label htmlFor="speed" className="text-sm text-gray-600">
              Speed (ms):
            </label>
            <select
              id="speed"
              value={speed}
              onChange={(e) => setSpeed(Number(e.target.value))}
              className="px-2 py-1 border rounded-md"
            >
              <option value={2000}>Slow (2s)</option>
              <option value={1000}>Normal (1s)</option>
              <option value={500}>Fast (0.5s)</option>
            </select>
          </div>
        </div>

        {/* Grid Selection */}
        <div className="grid grid-cols-4 gap-2 w-full">
          <button
            onClick={() => setCurrentUrl(image.original_url)}
            className={`px-3 py-2 text-sm rounded-md ${
              currentUrl === image.original_url
                ? 'bg-blue-600 text-white'
                : 'border border-gray-300 hover:bg-gray-50'
            }`}
          >
            Original
          </button>
          <button
            onClick={() => setCurrentUrl(image.grid15_url)}
            className={`px-3 py-2 text-sm rounded-md ${
              currentUrl === image.grid15_url
                ? 'bg-blue-600 text-white'
                : 'border border-gray-300 hover:bg-gray-50'
            }`}
          >
            15x15
          </button>
          <button
            onClick={() => setCurrentUrl(image.grid10_url)}
            className={`px-3 py-2 text-sm rounded-md ${
              currentUrl === image.grid10_url
                ? 'bg-blue-600 text-white'
                : 'border border-gray-300 hover:bg-gray-50'
            }`}
          >
            10x10
          </button>
          <button
            onClick={() => setCurrentUrl(image.grid5_url)}
            className={`px-3 py-2 text-sm rounded-md ${
              currentUrl === image.grid5_url
                ? 'bg-blue-600 text-white'
                : 'border border-gray-300 hover:bg-gray-50'
            }`}
          >
            5x5
          </button>
        </div>
      </div>
    </div>
  )
} 