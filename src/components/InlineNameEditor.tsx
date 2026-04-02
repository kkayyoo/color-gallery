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
        className={`bg-transparent border-b border-gray-400 outline-none text-white ${className}`}
      />
    )
  }

  return (
    <button
      onClick={() => { setDraft(value); setEditing(true) }}
      className={`text-left hover:underline decoration-dotted underline-offset-2 ${className}`}
      title="Click to rename"
    >
      {value}
    </button>
  )
}
