'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/components/providers/auth-provider'
import { useToast } from '@/components/ui/toast'
import { processImage } from '@/lib/image-processing'
import { categories } from '@/lib/constants'
import { uploadImage } from '@/lib/upload-utils'

interface UploadState {
  file: File | null
  name: string
  category: string
  previewUrl: string | null
  isUploading: boolean
  tags: string[]
  newTag: string
}

export function SingleUpload() {
  const [state, setState] = useState<UploadState>({
    file: null,
    name: '',
    category: '',
    previewUrl: null,
    isUploading: false,
    tags: [],
    newTag: ''
  })
  const { user } = useAuth()
  const { showToast } = useToast()
  const router = useRouter()
  const searchParams = useSearchParams()
  const editId = searchParams.get('edit')
  const [isPublished, setIsPublished] = useState(false)

  useEffect(() => {
    if (editId) {
      fetchImage()
    }
  }, [editId])

  const fetchImage = async () => {
    if (!editId || !user) return

    try {
      const { data, error } = await supabase
        .from('images')
        .select('*, image_tags (tag_name)')
        .eq('id', editId)
        .eq('user_id', user.id)
        .single()

      if (error) throw error
      if (!data) return

      setState(prev => ({
        ...prev,
        name: data.name,
        category: data.category,
        previewUrl: data.original_url,
        tags: data.image_tags.map((tag: any) => tag.tag_name)
      }))
      setIsPublished(data.published)
    } catch (error) {
      console.error('Error fetching image:', error)
      showToast('Failed to fetch image details', 'error')
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setState(prev => ({
      ...prev,
      file,
      previewUrl: URL.createObjectURL(file)
    }))
  }

  const handleAddTag = () => {
    if (state.newTag && !state.tags.includes(state.newTag)) {
      setState(prev => ({
        ...prev,
        tags: [...prev.tags, prev.newTag],
        newTag: ''
      }))
    }
  }

  const handleRemoveTag = (tagToRemove: string) => {
    setState(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    if (!state.file && !editId) {
      showToast('Please select an image', 'error')
      return
    }

    if (!state.name || !state.category) {
      showToast('Please fill in all fields', 'error')
      return
    }

    setState(prev => ({ ...prev, isUploading: true }))

    try {
      if (state.file) {
        const imageData = await uploadImage(state.file, user.id, state.name, state.category, isPublished)

        // Save tags to the database
        if (state.tags.length > 0) {
          const { error: tagError } = await supabase
            .from('image_tags')
            .insert(
              state.tags.map(tag => ({
                image_id: imageData.id,
                tag_name: tag
              }))
            )

          if (tagError) throw tagError
        }

        showToast(editId ? 'Image updated successfully!' : 'Image uploaded successfully!', 'success')
        router.push('/dashboard')
      } else {
        // Handle the case where the file is null, e.g., show an error message
        showToast('No file selected', 'error')
      }
    } catch (error) {
      console.error('Error processing image:', error)
      showToast('Failed to process image', 'error')
    } finally {
      setState(prev => ({ ...prev, isUploading: false }))
    }
  }

  return (
    <Suspense fallback={<div>Loading...</div>}>
      <form onSubmit={handleSubmit} className="max-w-xl mx-auto space-y-6">
        {state.previewUrl ? (
          <div className="aspect-video relative">
            <img
              src={state.previewUrl}
              alt="Preview"
              className="w-full h-full object-contain"
            />
            {!editId && (
              <button
                type="button"
                onClick={() => setState(prev => ({ ...prev, file: null, previewUrl: null }))}
                className="absolute top-2 right-2 p-1 bg-red-600 text-white rounded-full hover:bg-red-700"
              >
                ×
              </button>
            )}
          </div>
        ) : (
          <div
            onClick={() => document.getElementById('file-input')?.click()}
            className="aspect-video border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center cursor-pointer hover:border-gray-400"
          >
            <div className="text-center">
              <p className="text-gray-600">Click to select an image</p>
              <p className="text-sm text-gray-500">or drag and drop</p>
            </div>
          </div>
        )}

        <input
          id="file-input"
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
          disabled={state.isUploading}
        />

        <div className="space-y-4">
          <input
            type="text"
            value={state.name}
            onChange={(e) => setState(prev => ({ ...prev, name: e.target.value }))}
            placeholder="Image name"
            className="w-full px-3 py-2 border rounded-md"
            disabled={state.isUploading}
          />

          <select
            value={state.category}
            onChange={(e) => setState(prev => ({ ...prev, category: e.target.value }))}
            className="w-full px-3 py-2 border rounded-md"
            disabled={state.isUploading}
          >
            <option value="">Select category</option>
            {categories.map(category => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>

          <div>
            <label className="block text-sm font-medium text-gray-700">Tags</label>
            <div className="flex gap-2 mt-1">
              <input
                type="text"
                value={state.newTag}
                onChange={(e) => setState(prev => ({ ...prev, newTag: e.target.value }))}
                onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
                className="flex-1 px-3 py-2 border rounded-md"
                placeholder="Add a tag"
                disabled={state.isUploading}
              />
              <button
                type="button"
                onClick={handleAddTag}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                disabled={state.isUploading}
              >
                Add
              </button>
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              {state.tags.map(tag => (
                <span
                  key={tag}
                  className="px-2 py-1 bg-gray-100 rounded-full text-sm flex items-center gap-1"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(tag)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center">
          <input
            type="checkbox"
            checked={isPublished}
            onChange={(e) => setIsPublished(e.target.checked)}
            className="mr-2"
            disabled={state.isUploading}
          />
          <label className="text-gray-700">Published</label>
        </div>

        <button
          type="submit"
          disabled={state.isUploading}
          className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          {state.isUploading ? 'Processing...' : editId ? 'Update Image' : 'Upload Image'}
        </button>
      </form>
    </Suspense>
  )
} 