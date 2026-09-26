import { useEffect, useRef, type ReactNode } from 'react'
import { X } from 'lucide-react'

export function AdminDialog({
  open,
  title,
  description,
  onClose,
  children,
  wide = false,
}: {
  open: boolean
  title: string
  description?: string
  onClose: () => void
  children: ReactNode
  wide?: boolean
}) {
  const dialog = useRef<HTMLDialogElement>(null)
  const titleId = `admin-dialog-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`

  useEffect(() => {
    const element = dialog.current
    if (!element) return
    if (open && !element.open) element.showModal()
    if (!open && element.open) element.close()
  }, [open])

  return (
    <dialog
      ref={dialog}
      className={`admin-dialog${wide ? ' admin-dialog-wide' : ''}`}
      aria-labelledby={titleId}
      onClose={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div className="admin-dialog-head">
        <div>
          <h3 id={titleId}>{title}</h3>
          {description && <p>{description}</p>}
        </div>
        <button className="admin-dialog-close" type="button" aria-label="Tutup" onClick={onClose}>
          <X size={19} />
        </button>
      </div>
      {children}
    </dialog>
  )
}
