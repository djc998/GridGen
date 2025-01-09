'use client'

import { useState } from 'react'
import { UserImage } from '@/types/database'
import { FaInstagram, FaFacebook, FaDownload, FaLink } from 'react-icons/fa'
import { PiThreadsLogoFill } from 'react-icons/pi'
import { useToast } from '@/components/ui/toast'
import { Modal } from '@/components/ui/modal'

interface ShareButtonsProps {
  image: UserImage
}

export function ShareButtons({ image }: ShareButtonsProps) {
  const { showToast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [showInstagramModal, setShowInstagramModal] = useState(false)
  const [showThreadsModal, setShowThreadsModal] = useState(false)
  const [showFacebookModal, setShowFacebookModal] = useState(false)

  const shareUrl = `${window.location.origin}/play/${image.id}`
  const shareText = `Can you solve this ScramPixs puzzle? 
Category: ${image.category} 
#ScramPixs #ImagePuzzle #${image.category.replace(/\s+/g, '')}`

  const downloadImage = async (url: string, filename: string) => {
    try {
      const convertUrl = `/api/convert-image?url=${encodeURIComponent(url)}`
      const response = await fetch(convertUrl)
      
      if (!response.ok) {
        throw new Error('Failed to convert image')
      }

      const blob = await response.blob()
      const downloadUrl = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = downloadUrl
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(downloadUrl)
      return true
    } catch (error) {
      console.error('Download error:', error)
      return false
    }
  }

  const handleInstagramShare = async () => {
    setShowInstagramModal(true)
  }

  const handleDownloadAll = async () => {
    setIsLoading(true)
    try {
      const downloads = await Promise.all([
        downloadImage(image.grid15_url, `01_${image.name}_grid15.jpg`),
        downloadImage(image.grid10_url, `02_${image.name}_grid10.jpg`),
        downloadImage(image.grid5_url, `03_${image.name}_grid5.jpg`),
        downloadImage(image.original_url, `04_${image.name}_original.jpg`)
      ])

      if (downloads.every(success => success)) {
        showToast('All images downloaded successfully!', 'success')
      } else {
        showToast('Some images failed to download', 'error')
      }
    } catch (error) {
      console.error('Download error:', error)
      showToast('Failed to download images', 'error')
    } finally {
      setIsLoading(false)
    }
  }

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      return true
    } catch (err) {
      console.error('Failed to copy:', err)
      return false
    }
  }

  const handleShare = async (platform: 'threads' | 'facebook') => {
    setIsLoading(true)
    try {
      switch (platform) {
        case 'threads':
          const threadsCopied = await copyToClipboard(`${shareText}\n\n${shareUrl}`)
          if (threadsCopied) {
            showToast('Share text copied! Open Threads to share', 'success')
            window.open('https://threads.net', '_blank')
          } else {
            showToast('Failed to copy share text', 'error')
          }
          break
        case 'facebook':
          window.open(
            `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}&quote=${encodeURIComponent(shareText)}`,
            '_blank',
            'width=600,height=400'
          )
          showToast('Facebook share window opened!', 'success')
          break
      }
    } catch (error) {
      console.error('Error sharing:', error)
      showToast('Failed to share image', 'error')
    } finally {
      setIsLoading(false)
    }
  }

  const handleThreadsShare = async () => {
    setShowThreadsModal(true)
  }

  const handleFacebookShare = async () => {
    setShowFacebookModal(true)
  }

  const handleCopyLink = async () => {
    const success = await copyToClipboard(shareUrl)
    if (success) {
      showToast('Link copied to clipboard!', 'success')
    } else {
      showToast('Failed to copy link', 'error')
    }
  }

  return (
    <>
      <div className="flex space-x-2">
        <button
          onClick={handleCopyLink}
          disabled={isLoading}
          className="p-2 text-gray-600 hover:text-gray-700 transition-colors"
          aria-label="Copy puzzle link"
          title="Copy puzzle link"
        >
          <FaLink className="w-5 h-5" />
        </button>
        <button
          onClick={handleInstagramShare}
          disabled={isLoading}
          className="p-2 text-pink-600 hover:text-pink-700 transition-colors"
          aria-label="Share on Instagram"
          title="Download images and share on Instagram"
        >
          <FaInstagram className="w-5 h-5" />
        </button>
        <button
          onClick={handleThreadsShare}
          disabled={isLoading}
          className="p-2 text-black hover:text-gray-700 transition-colors"
          aria-label="Share on Threads"
          title="Download images and share on Threads"
        >
          <PiThreadsLogoFill className="w-5 h-5" />
        </button>
        <button
          onClick={handleFacebookShare}
          disabled={isLoading}
          className="p-2 text-blue-600 hover:text-blue-700 transition-colors"
          aria-label="Share on Facebook"
          title="Download images and share on Facebook"
        >
          <FaFacebook className="w-5 h-5" />
        </button>
      </div>

      <Modal
        isOpen={showInstagramModal}
        onClose={() => setShowInstagramModal(false)}
        title="Share on Instagram"
      >
        <div className="space-y-6 p-4">
          <div className="text-center space-y-4">
            <p className="text-gray-600">
              1. Download all puzzle images to create your Instagram post
            </p>
            <button
              onClick={handleDownloadAll}
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-pink-600 text-white rounded-md hover:bg-pink-700 transition-colors"
            >
              <FaDownload className="w-4 h-4" />
              Download All Images
            </button>
          </div>

          <div className="border-t border-gray-200 pt-4">
            <p className="text-gray-600 mb-4">
              2. Create your Instagram post:
            </p>
            <ol className="list-decimal list-inside space-y-2 text-gray-600">
              <li>Open Instagram and create a new post</li>
              <li>Select the downloaded images in order (15x15 → 10x10 → 5x5 → original)</li>
              <li>Copy the text below to use as your caption</li>
            </ol>
            <div className="mt-4 p-3 bg-gray-50 rounded-md">
              <p className="text-sm font-mono break-all">{shareText}</p>
              <button
                onClick={() => copyToClipboard(shareText)}
                className="mt-2 text-sm text-blue-600 hover:text-blue-700"
              >
                Copy Text
              </button>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              onClick={() => {
                setShowInstagramModal(false)
                window.open('https://instagram.com', '_blank')
              }}
              className="px-4 py-2 bg-pink-600 text-white rounded-md hover:bg-pink-700 transition-colors"
            >
              Open Instagram
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={showThreadsModal}
        onClose={() => setShowThreadsModal(false)}
        title="Share on Threads"
      >
        <div className="space-y-6 p-4">
          <div className="text-center space-y-4">
            <p className="text-gray-600">
              1. Download all puzzle images to create your Threads post
            </p>
            <button
              onClick={handleDownloadAll}
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-black text-white rounded-md hover:bg-gray-800 transition-colors"
            >
              <FaDownload className="w-4 h-4" />
              Download All Images
            </button>
          </div>

          <div className="border-t border-gray-200 pt-4">
            <p className="text-gray-600 mb-4">
              2. Create your Threads post:
            </p>
            <ol className="list-decimal list-inside space-y-2 text-gray-600">
              <li>Open Threads and create a new post</li>
              <li>Select the downloaded images in order (15x15 → 10x10 → 5x5 → original)</li>
              <li>Copy the text below to use in your post</li>
            </ol>
            <div className="mt-4 p-3 bg-gray-50 rounded-md">
              <p className="text-sm font-mono break-all">{shareText}</p>
              <button
                onClick={() => copyToClipboard(shareText)}
                className="mt-2 text-sm text-blue-600 hover:text-blue-700"
              >
                Copy Text
              </button>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              onClick={() => {
                setShowThreadsModal(false)
                window.open('https://threads.net', '_blank')
              }}
              className="px-4 py-2 bg-black text-white rounded-md hover:bg-gray-800 transition-colors"
            >
              Open Threads
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={showFacebookModal}
        onClose={() => setShowFacebookModal(false)}
        title="Share on Facebook"
      >
        <div className="space-y-6 p-4">
          <div className="text-center space-y-4">
            <p className="text-gray-600">
              1. Download all puzzle images to create your Facebook post
            </p>
            <button
              onClick={handleDownloadAll}
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              <FaDownload className="w-4 h-4" />
              Download All Images
            </button>
          </div>

          <div className="border-t border-gray-200 pt-4">
            <p className="text-gray-600 mb-4">
              2. Create your Facebook post:
            </p>
            <ol className="list-decimal list-inside space-y-2 text-gray-600">
              <li>Open Facebook and create a new post</li>
              <li>Select the downloaded images in order (15x15 → 10x10 → 5x5 → original)</li>
              <li>Copy the text below to use in your post</li>
            </ol>
            <div className="mt-4 p-3 bg-gray-50 rounded-md">
              <p className="text-sm font-mono break-all">{shareText}</p>
              <button
                onClick={() => copyToClipboard(shareText)}
                className="mt-2 text-sm text-blue-600 hover:text-blue-700"
              >
                Copy Text
              </button>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              onClick={() => {
                setShowFacebookModal(false)
                window.open('https://facebook.com', '_blank')
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Open Facebook
            </button>
          </div>
        </div>
      </Modal>
    </>
  )
} 