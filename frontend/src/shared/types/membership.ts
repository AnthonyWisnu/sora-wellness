export type Packages = {
  monthlyClassQuota: number
  accessLevels: string[]
  options: { id: string; durationMonths: number; priceIdr: number }[]
}

export type Membership = {
  ranges: { starts_on: string; ends_on: string }[]
  quota: { month: string; total: number; used: number }[]
}

export type PackagePurchase = {
  id: string
  packageOptionId: string
  durationMonths: number
  amountIdr: number
  status: string
  startsOn: string | null
  endsOn: string | null
  expiresAt: string | null
  payment: { orderId: string; redirectUrl: string | null; status: string } | null
}
