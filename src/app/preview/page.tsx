'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import AnimationPreview from '@/components/preview/animation-preview'
import ErrorBoundary from '@/components/ui/error-boundary'
import LoadingSpinner from '@/components/ui/loading-spinner'

interface PreviewImages {
  original: string
  grid15: string
  grid10: string
  grid5: string
}

function PreviewContent() {
  const searchParams = useSearchParams()
  
  const original = searchParams.get('original')
  const grid15 = searchParams.get('grid15')
  const grid10 = searchParams.get('grid10')
  const grid5 = searchParams.get('grid5')

  if (!original || !grid15 || !grid10 || !grid5) {
    throw new Error('Missing required image parameters')
  }

  const images: PreviewImages = {
    original,
    grid15,
    grid10,
    grid5
  }

  return <AnimationPreview images={images} />
}

export default function PreviewPage() {
  return (
    <ErrorBoundary>
      <Suspense fallback={
        <div className="min-h-screen flex items-center justify-center">
          <LoadingSpinner size="large" />
        </div>
      }>
        <PreviewContent />
      </Suspense>
    </ErrorBoundary>
  )
} 