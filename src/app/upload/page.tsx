'use client'

import { useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { SingleUpload } from '@/components/upload/single-upload'
import { BulkUpload } from '@/components/upload/bulk-upload'
import { EditImage } from '@/components/upload/edit-image'

function UploadContent() {
  const [uploadMode, setUploadMode] = useState<'single' | 'bulk'>('single')
  const searchParams = useSearchParams()
  const editId = searchParams.get('edit')

  if (editId) {
    return <EditImage imageId={editId} />
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8 space-y-4">
        <h1 className="text-3xl font-bold">Upload Images</h1>
        
        <div className="flex space-x-4">
          <button
            onClick={() => setUploadMode('single')}
            className={`px-4 py-2 rounded-md ${
              uploadMode === 'single'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600'
            }`}
          >
            Single Upload
          </button>
          <button
            onClick={() => setUploadMode('bulk')}
            className={`px-4 py-2 rounded-md ${
              uploadMode === 'bulk'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600'
            }`}
          >
            Bulk Upload
          </button>
        </div>
      </div>

      {uploadMode === 'single' ? <SingleUpload /> : <BulkUpload />}
    </div>
  )
}

export default function UploadPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <UploadContent />
    </Suspense>
  )
} 