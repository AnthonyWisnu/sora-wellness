export type UserRole = 'superadmin' | 'finance' | 'admin' | 'coach' | 'customer'

export type Actor = {
  id: string
  email: string
  fullName: string
  role: UserRole
  permissions?: string[]
  passwordChangeRequired: boolean
  avatarMediaId?: string | null
  avatarUrl?: string | null
}

export type AdminAccount = {
  id: string
  email: string
  fullName: string
  role: UserRole
  permissions?: string[]
  passwordChangeRequired: boolean
  createdAt: string
}
