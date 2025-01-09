'use client'

import { useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import ImageUploader from '@/components/upload/image-uploader'
import ProtectedRoute from '@/components/auth/protected-route'

export default function UploadPage() {
  const searchParams = useSearchParams()
  const editId = searchParams.get('edit')

  return (
    <ProtectedRoute>
      <div className="container mx-auto py-8">
        <h1 className="text-2xl font-bold mb-8">
          {editId ? 'Edit Image' : 'Upload New Image'}
        </h1>
        <ImageUploader editId={editId} />
      </div>
    </ProtectedRoute>
  )
} 