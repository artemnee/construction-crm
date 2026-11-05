import { useEffect, useId, useRef, useState, type ReactNode } from 'react'

export default function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()

  useEffect(() => {
    const d = ref.current!
    if (!d.open) d.showModal()
    const first =
      d.querySelector<HTMLElement>('[data-autofocus]') ?? d.querySelector<HTMLElement>('input, textarea, select')
    first?.focus()
  }, [])

  return (
    <dialog
      ref={ref}
      className="modal"
      aria-modal="true"
      aria-labelledby={titleId}
      onCancel={(e) => {
        e.preventDefault()
        onClose()
      }}
      onClick={(e) => {
        if (e.target === ref.current) onClose()
      }}
    >
      <div className="modal-body">
        <div className="modal-head">
          <h2 id={titleId}>{title}</h2>
          <button type="button" className="btn btn-ghost btn-icon" aria-label="Закрыть" onClick={onClose}>
            ×
          </button>
        </div>
        {children}
      </div>
    </dialog>
  )
}

export function ConfirmDialog({
  title,
  children,
  confirmLabel,
  onConfirm,
  onCancel,
}: {
  title: string
  children: ReactNode
  confirmLabel: string
  onConfirm: () => Promise<string | void>
  onCancel: () => void
}) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const run = async () => {
    setBusy(true)
    setError('')
    const err = await onConfirm()
    setBusy(false)
    if (err) setError(err)
  }

  return (
    <Modal title={title} onClose={onCancel}>
      <div className="modal-text">{children}</div>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <div className="modal-actions">
        <button type="button" className="btn btn-secondary" data-autofocus onClick={onCancel} disabled={busy}>
          Отмена
        </button>
        <button type="button" className="btn btn-danger" onClick={run} disabled={busy}>
          {busy ? 'Удаление…' : confirmLabel}
        </button>
      </div>
    </Modal>
  )
}
