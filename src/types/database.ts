export interface UserImage {
  id: string
  user_id: string
  name: string
  category: string
  published: boolean
  upload_id: string
  original_url: string
  grid15_url: string
  grid10_url: string
  grid5_url: string
  created_at: string
  tags?: string[]
}

export interface Tag {
  id: string
  name: string
  created_at: string
} 