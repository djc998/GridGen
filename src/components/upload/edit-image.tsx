'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/components/ui/toast'
import { categories } from '@/lib/constants'
import { UserImage } from '@/types/database'

interface EditImageProps {
  imageId: string
}

export function EditImage({ imageId }: EditImageProps) {
  const [image, setImage] = useState<UserImage | null>(null)
  const [name, setName] = useState('')
  const [category, setCategory] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [newTag, setNewTag] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isPublished, setIsPublished] = useState(false)
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const router = useRouter()
  const { showToast } = useToast()

  useEffect(() => {
    fetchImage()
  }, [imageId])

  const fetchImage = async () => {
    try {
      const { data, error } = await supabase
        .from('images')
        .select(`
          *,
          image_tags (
            tag_name
          )
        `)
        .eq('id', imageId)
        .single()

      if (error) throw error

      setImage(data)
      setName(data.name)
      setCategory(data.category)
      setTags(data.image_tags?.map((tag: { tag_name: string }) => tag.tag_name) || [])
      setIsPublished(data.published)
      setSelectedImage(data.original_url) // Set the initial selected image
    } catch (error) {
      console.error('Error fetching image:', error)
      showToast('Failed to fetch image', 'error')
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddTag = () => {
    if (newTag && !tags.includes(newTag)) {
      setTags([...tags, newTag])
      setNewTag('')
    }
  }

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove))
  }

  const handleSave = async () => {
    if (!image) return

    setIsSaving(true)
    try {
      // Update image details
      const { error: updateError } = await supabase
        .from('images')
        .update({
          name,
          category,
          published: isPublished
        })
        .eq('id', imageId)

      if (updateError) throw updateError

      // Update tags
      await supabase
        .from('image_tags')
        .delete()
        .eq('image_id', imageId)

      if (tags.length > 0) {
        const { error: tagError } = await supabase
          .from('image_tags')
          .insert(
            tags.map(tag => ({
              image_id: imageId,
              tag_name: tag
            }))
          )

        if (tagError) throw tagError
      }

      showToast('Changes saved successfully!', 'success')
      router.push('/dashboard')
    } catch (error) {
      console.error('Error saving changes:', error)
      showToast('Failed to save changes', 'error')
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return <div>Loading...</div>
  }

  if (!image) {
    return <div>Image not found</div>
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="grid grid-cols-2 gap-8">
        {/* Display Selected Image */}
        <div>
          <h3 className="text-lg font-semibold mb-2">
            {selectedImage === image.original_url ? 'Original Image' : selectedImage === image.grid15_url ? '15 x 15' : selectedImage === image.grid10_url ? '10 x 10' : '5 x 5'}
          </h3>
          <img
            src={selectedImage || image.original_url}
            alt={image.name}
            className="w-full rounded-lg"
          />
        </div>

        {/* Image Previews */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Images</h3>
          <div className="grid grid-cols-3 gap-4">
            <div onClick={() => setSelectedImage(image.original_url)} className="cursor-pointer">
              <p className="text-sm text-gray-600 mb-1">Original</p>
              <img
                src={image.original_url}
                alt="Original"
                className="w-full rounded-lg"
              />
            </div>
            <div onClick={() => setSelectedImage(image.grid15_url)} className="cursor-pointer">
              <p className="text-sm text-gray-600 mb-1">15x15</p>
              <img
                src={image.grid15_url}
                alt="15x15 grid"
                className="w-full rounded-lg"
              />
            </div>
            <div onClick={() => setSelectedImage(image.grid10_url)} className="cursor-pointer">
              <p className="text-sm text-gray-600 mb-1">10x10</p>
              <img
                src={image.grid10_url}
                alt="10x10 grid"
                className="w-full rounded-lg"
              />
            </div>
            <div onClick={() => setSelectedImage(image.grid5_url)} className="cursor-pointer">
              <p className="text-sm text-gray-600 mb-1">5x5</p>
              <img
                src={image.grid5_url}
                alt="5x5 grid"
                className="w-full rounded-lg"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Edit Form */}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full px-3 py-2 border rounded-md"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Category</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="mt-1 w-full px-3 py-2 border rounded-md"
          >
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Tags</label>
          <div className="flex gap-2 mt-1">
            <input
              type="text"
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
              className="flex-1 px-3 py-2 border rounded-md"
              placeholder="Add a tag"
            />
            <button
              onClick={handleAddTag}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Add
            </button>
          </div>
          <div className="flex flex-wrap gap-2 mt-2">
            {tags.map(tag => (
              <span
                key={tag}
                className="px-2 py-1 bg-gray-100 rounded-full text-sm flex items-center gap-1"
              >
                {tag}
                <button
                  onClick={() => handleRemoveTag(tag)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>

        <div className="flex items-center">
          <input
            type="checkbox"
            checked={isPublished}
            onChange={(e) => setIsPublished(e.target.checked)}
            className="mr-2"
          />
          <label className="text-gray-700">Published</label>
        </div>

        <div className="flex justify-end gap-4">
          <button
            onClick={() => router.push('/dashboard')}
            className="px-4 py-2 text-gray-600 hover:text-gray-800"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )
} 