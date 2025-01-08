'use client'

import { type ReactElement } from 'react'
import ProtectedRoute from '@/components/auth/protected-route'
import ImageUploader from '@/components/upload/image-uploader'

export default function UploadPage(): ReactElement {
  return (
    <ProtectedRoute>
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-8">Upload Image</h1>
        <ImageUploader />
      </div>
    </ProtectedRoute>
  )
} 