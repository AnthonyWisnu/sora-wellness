export type StudioContent = {
  name: string
  description: string
  address: string
  heroTitle: string
  heroSubtitle: string
  logoMediaId: string | null
  heroMediaId: string | null
  galleryMediaIds: string[]
}

export type MediaAsset = {
  id: string
  filename: string
  mimeType: string
  byteSize: number
  createdAt: string
  used: boolean
  url: string
}
