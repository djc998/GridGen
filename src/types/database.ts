export interface UserImage {
  id: string
  name: string
  grid15_url: string
  grid10_url: string
  grid5_url: string
  original_url: string
  category: string
  published: boolean
  created_at?: string
  user_id?: string
  image_tags?: ImageTag[]
}

export interface ImageTag {
  tag_name: string
}

export interface Tag {
  id: string
  name: string
  created_at: string
} 