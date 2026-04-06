// src/components/ConfirmDialog.tsx
import { useEffect, useRef } from 'react'

interface Props {
  message: string
  confirmLabel?: string
  confirmVariant?: 'danger' | 'primary'
  onConfirm: () => void
  onCancel: () => void
}

export default function ConfirmDialog({ message, confirmLabel = 'Remove', confirmVariant = 'danger', onConfirm, onCancel }: Props) {
  const cancelRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    cancelRef.current?.focus()
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel()
    }
    document.addEventListener('keydown', handler, { capture: false })
    return () => document.removeEventListener('keydown', handler, { capture: false })
  }, [onCancel])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onCancel() }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Confirm action"
        className="bg-surface border border-surface-border rounded-2xl p-6 max-w-sm w-full mx-4 shadow-modal animate-slide-up"
      >
        <p className="text-white/80 text-sm mb-6 leading-relaxed">{message}</p>
        <div className="flex gap-2 justify-end">
          <button
            ref={cancelRef}
            onClick={onCancel}
            className="px-4 py-2 text-sm text-white/40 hover:text-white transition-colors rounded-xl hover:bg-surface-raised"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 text-sm text-white rounded-xl transition-all font-medium"
            style={confirmVariant === 'primary' ? {
              background: 'linear-gradient(135deg, #6366f1, #7c3aed)',
              boxShadow: '0 4px 14px rgba(99,102,241,0.3)',
            } : {
              background: 'rgba(244,63,94,0.2)',
              color: '#fb7185',
              border: '1px solid rgba(244,63,94,0.3)',
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
