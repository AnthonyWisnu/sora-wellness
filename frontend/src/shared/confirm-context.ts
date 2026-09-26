import { createContext, useContext } from 'react'

export type Confirmation = {
  title: string
  description: string
  confirmLabel: string
  tone?: 'danger' | 'primary'
}

export type Confirm = (details: Confirmation) => Promise<boolean>
export const ConfirmContext = createContext<Confirm | null>(null)

export function useConfirm(): Confirm {
  const confirm = useContext(ConfirmContext)
  if (!confirm) throw new Error('ConfirmProvider belum dipasang')
  return confirm
}
