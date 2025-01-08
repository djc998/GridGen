'use client'

import { useSearchParams } from 'next/navigation'
import AnimationPreview from '@/components/preview/animation-preview'
import ErrorBoundary from '@/components/ui/error-boundary'
import LoadingSpinner from '@/components/ui/loading-spinner'

function PreviewContent() {
  const searchParams = useSearchParams()
  
  const images = {
    original: searchParams.get('original'),
    grid15: searchParams.get('grid15'),
    grid10: searchParams.get('grid10'),
    grid5: searchParams.get('grid5'),
  }

  // Validate all required parameters are present
  if (!images.original || !images.grid15 || !images.grid10 || !images.grid5) {
    throw new Error('Missing required image parameters')
  }

  return <AnimationPreview images={images} />
}

export default function PreviewPage() {
  return (
    <ErrorBoundary>
      <PreviewContent />
    </ErrorBoundary>
  )
} 