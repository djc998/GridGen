'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import ImageUploader from '@/components/upload/image-uploader'
import ProtectedRoute from '@/components/auth/protected-route'
import LoadingSpinner from '@/components/ui/loading-spinner'

function UploadContent() {
  const searchParams = useSearchParams()
  const editId = searchParams.get('edit')

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-8">
        {editId ? 'Edit Image' : 'Upload New Image'}
      </h1>
      <ImageUploader editId={editId} />
    </div>
  )
}

export default function UploadPage() {
  return (
    <ProtectedRoute>
      <Suspense fallback={
        <div className="min-h-screen flex items-center justify-center">
          <LoadingSpinner size="large" />
        </div>
      }>
        <UploadContent />
      </Suspense>
    </ProtectedRoute>
  )
} 