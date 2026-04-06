import { useRef, useState } from 'react'

interface Props {
  onFile: (file: File) => void
}

const ALLOWED = ['image/jpeg', 'image/png', 'image/webp']

export default function ImageUploader({ onFile }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)

  function handleFile(file: File) {
    onFile(file)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
    e.target.value = ''
  }

  return (
    <div
      onDragOver={e => { e.preventDefault(); setDragging(true) }}
      onDragLeave={e => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
          setDragging(false)
        }
      }}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
      className={`
        relative flex flex-col items-center justify-center gap-4
        rounded-2xl p-16 cursor-pointer select-none
        transition-all duration-300
        ${dragging ? 'gradient-border-animated scale-[1.01]' : ''}
      `}
      style={{
        background: dragging ? 'var(--uploader-drag-bg)' : 'var(--uploader-bg)',
        border: dragging ? 'none' : '2px dashed var(--uploader-border)',
        boxShadow: dragging ? '0 0 40px rgba(99,102,241,0.15)' : 'none',
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept={ALLOWED.join(',')}
        className="hidden"
        onChange={handleChange}
      />

      {/* Upload icon */}
      <div
        className={`p-4 rounded-2xl transition-all duration-300 ${
          dragging
            ? 'bg-brand/20 text-brand-bright'
            : 'bg-surface-raised text-faint'
        }`}
      >
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
        </svg>
      </div>

      <div className="text-center space-y-1">
        <p className="text-secondary text-sm font-medium">
          Drop an image here, or{' '}
          <span className="text-brand-bright hover:text-brand-violet-bright transition-colors">
            click to browse
          </span>
        </p>
        <p className="text-faint text-xs font-mono">JPG · PNG · WebP · Max 20MB</p>
      </div>
    </div>
  )
}
