// src/components/InlineNameEditor.tsx
import { useState, useRef, useEffect } from 'react'

interface Props {
  value: string
  onSave: (name: string) => void
  className?: string
}

export default function InlineNameEditor({ value, onSave, className = '' }: Props) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editing) inputRef.current?.select()
  }, [editing])

  useEffect(() => {
    if (!editing) {
      setDraft(value)
    }
  }, [value, editing])

  function commit() {
    const trimmed = draft.trim()
    try {
      if (trimmed && trimmed !== value) onSave(trimmed)
      else setDraft(value)
    } finally {
      setEditing(false)
    }
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={e => {
          if (e.key === 'Enter') commit()
          if (e.key === 'Escape') { setDraft(value); setEditing(false) }
        }}
        className={`bg-transparent border-b border-[var(--surface-border-strong)] outline-none text-primary focus:border-brand ${className}`}
      />
    )
  }

  return (
    <button
      onClick={() => { setDraft(value); setEditing(true) }}
      className={`group inline-flex items-baseline gap-1.5 text-left ${className}`}
      title="Click to rename"
    >
      <span className="text-primary hover:text-brand-bright transition-colors leading-none">{value}</span>
      <svg
        className="w-[0.75em] h-[0.75em] text-faint group-hover:text-brand-bright flex-shrink-0 translate-y-[0.05em] transition-colors"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 112.828 2.828L11.828 15.828a2 2 0 01-1.414.586H9v-2a2 2 0 01.586-1.414z" />
      </svg>
    </button>
  )
}
