export type Actor = {
  id: string
  email: string
  fullName: string
  role: 'customer' | 'coach' | 'admin'
  passwordChangeRequired: boolean
}

export type AdminAccount = {
  id: string
  email: string
  fullName: string
  role: 'customer' | 'coach' | 'admin'
  passwordChangeRequired: boolean
  createdAt: string
}
