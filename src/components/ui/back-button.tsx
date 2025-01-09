'use client'

import { useRouter } from 'next/navigation'

export function BackButton() {
  const router = useRouter()

  return (
    <button
      onClick={() => router.push('/')}
      className="absolute top-4 left-4 inline-flex items-center text-gray-600 hover:text-gray-900"
    >
      <svg
        className="w-5 h-5 mr-2"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path d="M10 19l-7-7m0 0l7-7m-7 7h18" />
      </svg>
      Back to Home
    </button>
  )
} 