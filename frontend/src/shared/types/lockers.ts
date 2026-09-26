export type LockerMine = {
  enabled: boolean
  code: string | null
  assignedAt: string | null
  membershipEndsOn: string | null
}

export type AdminLocker = {
  id: string
  code: string
  active: boolean
  customerId: string | null
  customerName: string | null
  customerEmail: string | null
  assignedAt: string | null
  membershipEndsOn: string | null
}

export type AdminLockers = { enabled: boolean; lockers: AdminLocker[] }

export type EligibleMember = {
  id: string
  fullName: string
  email: string
  membershipEndsOn: string
}
