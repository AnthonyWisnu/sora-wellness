import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { AlertTriangle, Globe2, X } from 'lucide-react'
import { ConfirmContext, type Confirm, type Confirmation } from './confirm-context'
import './ConfirmDialog.css'

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [request, setRequest] = useState<Confirmation | null>(null)
  const resolver = useRef<((confirmed: boolean) => void) | null>(null)
  const dialog = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  const descriptionId = useId()

  const close = useCallback((confirmed: boolean) => {
    resolver.current?.(confirmed)
    resolver.current = null
    setRequest(null)
  }, [])

  const confirm = useCallback<Confirm>((details) => {
    if (resolver.current) return Promise.resolve(false)
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve
      setRequest(details)
    })
  }, [])

  useEffect(() => {
    const element = dialog.current
    if (!element) return
    if (request && !element.open) element.showModal()
    if (!request && element.open) element.close()
  }, [request])

  useEffect(
    () => () => {
      resolver.current?.(false)
      resolver.current = null
    },
    [],
  )

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <dialog
        ref={dialog}
        className="confirm-dialog"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        onCancel={(event) => {
          event.preventDefault()
          close(false)
        }}
        onClick={(event) => {
          if (event.target === event.currentTarget) close(false)
        }}
      >
        {request && (
          <div className="confirm-dialog-content">
            <button
              type="button"
              className="confirm-dialog-close"
              aria-label="Tutup dialog"
              onClick={() => close(false)}
            >
              <X size={18} />
            </button>
            <div
              className={`confirm-dialog-icon${request.tone === 'danger' ? ' confirm-dialog-icon-danger' : ''}`}
              aria-hidden="true"
            >
                {request.tone === 'danger' ? <AlertTriangle size={22} /> : <Globe2 size={22} />}
            </div>
            <h2 id={titleId}>{request.title}</h2>
            <p id={descriptionId}>{request.description}</p>
            <div className="confirm-dialog-actions">
              <button
                type="button"
                className="button button-outline"
                autoFocus
                onClick={() => close(false)}
              >
                Batal
              </button>
              <button
                type="button"
                className={`button ${request.tone === 'danger' ? 'confirm-dialog-danger' : 'button-primary'}`}
                onClick={() => close(true)}
              >
                {request.confirmLabel}
              </button>
            </div>
          </div>
        )}
      </dialog>
    </ConfirmContext.Provider>
  )
}
