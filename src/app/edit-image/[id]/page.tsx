'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/components/providers/auth-provider'
import { useToast } from '@/components/ui/toast'
import { categories } from '@/lib/constants'
import { UserImage } from '@/types/database'

export default function EditImagePage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const { showToast } = useToast()

  const [name, setName] = useState('')
  const [category, setCategory] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
  const [loading, setLoading] = useState(true)
  const [image, setImage] = useState<UserImage | null>(null)

  useEffect(() => {
    const fetchImage = async () => {
      if (!user || !params.id) return

      try {
        const { data, error } = await supabase
          .from('images')
          .select(`
            *,
            image_tags (
              tag_name
            )
          `)
          .eq('id', params.id)
          .single()

        if (error) throw error

        if (data.user_id !== user.id) {
          showToast('You can only edit your own images', 'error')
          router.push('/dashboard')
          return
        }

        setImage(data)
        setName(data.name)
        setCategory(data.category)
        setTags(data.image_tags?.map((tag: any) => tag.tag_name) || [])
      } catch (error: any) {
        console.error('Error fetching image:', error)
        showToast(error.message || 'Failed to load image', 'error')
        router.push('/dashboard')
      } finally {
        setLoading(false)
      }
    }

    fetchImage()
  }, [user, params.id, router, showToast])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !params.id) return

    if (!name || !category) {
      showToast('Please fill in all required fields', 'error')
      return
    }

    setLoading(true)
    try {
      // Update image data
      const { error: updateError } = await supabase
        .from('images')
        .update({
          name,
          category
        })
        .eq('id', params.id)

      if (updateError) throw updateError

      // Delete existing tags
      const { error: deleteTagsError } = await supabase
        .from('image_tags')
        .delete()
        .eq('image_id', params.id)

      if (deleteTagsError) throw deleteTagsError

      // Add new tags
      if (tags.length > 0) {
        const { error: tagsError } = await supabase
          .from('image_tags')
          .insert(tags.map(tag => ({
            image_id: params.id,
            tag_name: tag
          })))

        if (tagsError) throw tagsError
      }

      showToast('Image updated successfully!', 'success')
      router.push('/dashboard')
    } catch (error: any) {
      console.error('Error updating image:', error)
      showToast(error.message || 'Failed to update image', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleAddTag = () => {
    const trimmedTag = tagInput.trim().toLowerCase()
    if (trimmedTag && !tags.includes(trimmedTag)) {
      setTags([...tags, trimmedTag])
      setTagInput('')
    }
  }

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900" />
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Edit Image</h1>

        <div className="mb-8">
          <div className="aspect-square relative rounded-lg overflow-hidden">
            {image && (
              <img
                src={image.original_url}
                alt={image.name}
                className="w-full h-full object-cover"
              />
            )}
          </div>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700">
              Name *
            </label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              required
            />
          </div>

          <div>
            <label htmlFor="category" className="block text-sm font-medium text-gray-700">
              Category *
            </label>
            <select
              id="category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              required
            >
              <option value="">Select a category</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="tags" className="block text-sm font-medium text-gray-700">
              Tags
            </label>
            <div className="mt-1 flex rounded-md shadow-sm">
              <input
                type="text"
                id="tags"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    handleAddTag()
                  }
                }}
                className="flex-1 rounded-l-md border-gray-300 focus:border-indigo-500 focus:ring-indigo-500"
                placeholder="Add tags..."
              />
              <button
                type="button"
                onClick={handleAddTag}
                className="inline-flex items-center px-4 py-2 border border-l-0 border-gray-300 rounded-r-md bg-gray-50 text-gray-700 hover:bg-gray-100"
              >
                Add
              </button>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(tag)}
                    className="ml-1 inline-flex items-center p-0.5 hover:bg-blue-200 rounded-full"
                  >
                    <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                </span>
              ))}
            </div>
          </div>

          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={() => router.push('/dashboard')}
              className="px-4 py-2 border rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
} 