'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { UserImage } from '@/types/database'
import Link from 'next/link'
import { useAuth } from '@/components/providers/auth-provider'
import { Edit, Check, ChevronDown } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { ShareButtons } from '@/components/ui/share-buttons'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { useToast } from '@/components/ui/toast'

interface MultiSelectProps {
  options: string[]
  selected: string[]
  onChange: (selected: string[]) => void
  placeholder: string
  className?: string
}

function MultiSelect({ options, selected, onChange, placeholder, className = '' }: MultiSelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const toggleOption = (option: string) => {
    const newSelected = selected.includes(option)
      ? selected.filter(item => item !== option)
      : [...selected, option]
    onChange(newSelected)
  }

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-2 text-left bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
      >
        <div className="flex items-center justify-between">
          <span className="block truncate">
            {selected.length === 0 
              ? placeholder 
              : `${selected.length} selected`}
          </span>
          <ChevronDown className="w-4 h-4 text-gray-400" />
        </div>
      </button>

      {isOpen && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
          {options.map(option => (
            <div
              key={option}
              className="flex items-center px-4 py-2 hover:bg-gray-50 cursor-pointer"
              onClick={() => toggleOption(option)}
            >
              <div className={`
                w-4 h-4 border rounded mr-2 flex items-center justify-center
                ${selected.includes(option) ? 'bg-blue-500 border-blue-500' : 'border-gray-300'}
              `}>
                {selected.includes(option) && (
                  <Check className="w-3 h-3 text-white" />
                )}
              </div>
              <span className="block truncate">{option}</span>
            </div>
          ))}
        </div>
      )}

      {selected.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2">
          {selected.map(item => (
            <span
              key={item}
              className="inline-flex items-center px-2 py-1 rounded-full text-sm bg-blue-100 text-blue-800"
            >
              {item}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  toggleOption(item)
                }}
                className="ml-1 hover:text-blue-600"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

const formatDate = (dateString: string) => {
  try {
    const date = new Date(dateString)
    return formatDistanceToNow(date, { addSuffix: true })
  } catch (error) {
    return 'Date unknown'
  }
}

type SortOption = {
  label: string
  value: string
  sortFn: (a: UserImage, b: UserImage) => number
}

const sortOptions: SortOption[] = [
  {
    label: 'Newest First',
    value: 'newest',
    sortFn: (a, b) => new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime()
  },
  {
    label: 'Oldest First',
    value: 'oldest',
    sortFn: (a, b) => new Date(a.created_at || '').getTime() - new Date(b.created_at || '').getTime()
  },
  {
    label: 'A-Z',
    value: 'alpha-asc',
    sortFn: (a, b) => a.name.localeCompare(b.name)
  },
  {
    label: 'Z-A',
    value: 'alpha-desc',
    sortFn: (a, b) => b.name.localeCompare(a.name)
  },
  {
    label: 'Category',
    value: 'category',
    sortFn: (a, b) => a.category.localeCompare(b.category)
  },
  {
    label: 'Status',
    value: 'status',
    sortFn: (a, b) => Number(b.published) - Number(a.published)
  }
]

export default function DashboardPage() {
  const [images, setImages] = useState<UserImage[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchFilter, setSearchFilter] = useState<'name' | 'category' | 'tags'>('name')
  const { user } = useAuth()
  const [categories, setCategories] = useState<Set<string>>(new Set())
  const [availableTags, setAvailableTags] = useState<Set<string>>(new Set())
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [sortBy, setSortBy] = useState<string>('newest')
  const [deleteImageId, setDeleteImageId] = useState<string | null>(null)
  const { showToast } = useToast()

  // Fetch images
  useEffect(() => {
    const fetchImages = async () => {
      if (!user) return

      try {
        const { data, error } = await supabase
          .from('images')
          .select(`
            *,
            image_tags (
              tag_name
            )
          `)
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })

        if (error) throw error

        setImages(data || [])
      } catch (error) {
        console.error('Error fetching images:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchImages()
  }, [user])

  // Add this effect to collect unique categories and tags
  useEffect(() => {
    const cats = new Set<string>()
    const tags = new Set<string>()
    
    images.forEach(image => {
      cats.add(image.category)
      image.image_tags?.forEach(tag => {
        tags.add(tag.tag_name)
      })
    })
    
    setCategories(cats)
    setAvailableTags(tags)
  }, [images])

  // Filter images based on search query
  const filteredImages = images.filter(image => {
    if (selectedCategories.length > 0 && !selectedCategories.includes(image.category)) {
      return false
    }
    
    if (selectedTags.length > 0 && !selectedTags.some(selectedTag => 
      image.image_tags?.some(imageTag => imageTag.tag_name === selectedTag)
    )) {
      return false
    }
    
    if (!searchQuery) {
      return true
    }
    
    const searchLower = searchQuery.toLowerCase()
    return image.name.toLowerCase().includes(searchLower)
  })

  const filteredAndSortedImages = filteredImages
    .slice()
    .sort(sortOptions.find(opt => opt.value === sortBy)?.sortFn)

  const handleDelete = async (imageId: string) => {
    setDeleteImageId(imageId)
  }

  const handleConfirmDelete = async () => {
    if (!deleteImageId) return

    try {
      // Delete image from Supabase storage
      const imageToDelete = images.find(img => img.id === deleteImageId)
      if (imageToDelete) {
        // Delete all versions of the image
        const imagePaths = [
          imageToDelete.original_url,
          imageToDelete.grid15_url,
          imageToDelete.grid10_url,
          imageToDelete.grid5_url
        ].map(url => url.split('/').pop()) // Get just the filename

        await Promise.all(
          imagePaths.map(path => {
            if (path) {
              return supabase.storage
                .from('images')
                .remove([path])
            }
            return Promise.resolve()
          })
        )

        // Delete image record from database
        const { error: deleteError } = await supabase
          .from('images')
          .delete()
          .eq('id', deleteImageId)

        if (deleteError) throw deleteError

        // Update local state
        setImages(images.filter(img => img.id !== deleteImageId))
        showToast('Image deleted successfully', 'success')
      }
    } catch (error) {
      console.error('Error deleting image:', error)
      showToast('Failed to delete image', 'error')
    } finally {
      setDeleteImageId(null)
    }
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">My Images</h1>
        <Link
          href="/upload"
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
        >
          Upload New Image
        </Link>
      </div>

      {/* New Search Section */}
      <div className="mb-8 space-y-4">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Text Search */}
          <div className="flex-1">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by image name..."
              className="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Category Filter */}
          <div className="w-full md:w-64">
            <MultiSelect
              options={Array.from(categories).sort()}
              selected={selectedCategories}
              onChange={setSelectedCategories}
              placeholder="Select categories"
            />
          </div>

          {/* Tag Filter */}
          <div className="w-full md:w-64">
            <MultiSelect
              options={Array.from(availableTags).sort()}
              selected={selectedTags}
              onChange={setSelectedTags}
              placeholder="Select tags"
            />
          </div>

          {/* Clear Filters Button */}
          {(searchQuery || selectedCategories.length > 0 || selectedTags.length > 0) && (
            <button
              onClick={() => {
                setSearchQuery('')
                setSelectedCategories([])
                setSelectedTags([])
              }}
              className="px-4 py-2 bg-gray-100 text-gray-600 rounded-md hover:bg-gray-200 transition-colors h-fit"
            >
              Clear Filters
            </button>
          )}
        </div>

        <div className="flex justify-between items-center mb-4">
          <p className="text-sm text-gray-500">
            {filteredImages.length} {filteredImages.length === 1 ? 'image' : 'images'} found
          </p>
          
          <div className="flex items-center gap-2">
            <label htmlFor="sort" className="text-sm text-gray-600">
              Sort by:
            </label>
            <select
              id="sort"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3 py-1.5 border border-gray-300 rounded-md shadow-sm text-sm focus:ring-blue-500 focus:border-blue-500"
            >
              {sortOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredAndSortedImages.map((image) => (
            <div
              key={image.id}
              className="bg-white rounded-lg shadow-md overflow-hidden group relative"
            >
              <div className="aspect-square relative">
                <img
                  src={image.grid15_url}
                  alt={image.name}
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-2 right-2">
                  <span className={`
                    px-2 py-1 rounded-full text-sm font-medium
                    ${image.published 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-gray-100 text-gray-800'}
                  `}>
                    {image.published ? 'Published' : 'Draft'}
                  </span>
                </div>
              </div>

              <div className="p-4">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-semibold text-lg">{image.name}</h3>
                    <p className="text-sm text-gray-500">
                      Created {formatDate(image.created_at || '')}
                    </p>
                  </div>
                  <Link
                    href={`/upload?edit=${image.id}`}
                    className="p-2 rounded-full hover:bg-gray-100 transition-colors"
                  >
                    <Edit className="w-4 h-4 text-gray-600" />
                  </Link>
                </div>

                <div className="space-y-2">
                  <div className="flex flex-wrap gap-2">
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                      {image.category}
                    </span>
                  </div>

                  {image.image_tags && image.image_tags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {image.image_tags.map((tag: any) => (
                        <span
                          key={tag.tag_name}
                          className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-sm"
                        >
                          {tag.tag_name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-between items-center mt-2">
                <div className="flex space-x-2">
                  <Link
                    href={`/upload?edit=${image.id}`}
                    className="p-2 rounded-full hover:bg-gray-100 transition-colors"
                  >
                    <Edit className="w-4 h-4 text-gray-600" />
                  </Link>
                  <button
                    type="button"
                    onClick={() => handleDelete(image.id)}
                    className="ml-1 hover:text-red-600"
                    aria-label="Delete image"
                    title="Delete image"
                  >
                    ×
                  </button>
                </div>
                <ShareButtons image={image} />
              </div>
            </div>
          ))}
        </div>
      )}

      {!isLoading && filteredImages.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">
            {searchQuery 
              ? 'No images found matching your search'
              : 'No images uploaded yet'}
          </p>
        </div>
      )}

      <ConfirmDialog
        isOpen={!!deleteImageId}
        onClose={() => setDeleteImageId(null)}
        onConfirm={handleConfirmDelete}
        title="Delete Image"
        message="Are you sure you want to delete this image? This action cannot be undone."
      />
    </div>
  )
} 