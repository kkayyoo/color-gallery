import { useState, useRef, useEffect } from 'react'
import { FocusTrap } from 'focus-trap-react'
import type { ColorEntry } from '../types'
import { EXPORT_FORMATS } from '../lib/exportFormats'

interface Props {
  cardName: string
  colors: ColorEntry[]
  onClose: () => void
}

export default function ExportPanel({ cardName, colors, onClose }: Props) {
  const [activeId, setActiveId] = useState(EXPORT_FORMATS[0].id)
  const [copied, setCopied] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const activeFormat = EXPORT_FORMATS.find(f => f.id === activeId)!
  const code = activeFormat.render(cardName, colors)

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  function handleCopy() {
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(code).then(() => flash())
    } else {
      // Fallback for browsers without clipboard API
      if (textareaRef.current) {
        textareaRef.current.value = code
        textareaRef.current.select()
        document.execCommand('copy')
        flash()
      }
    }
  }

  function flash() {
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <FocusTrap>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
        onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
      >
        {/* Panel */}
        <div
          className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-lg shadow-2xl flex flex-col"
          role="dialog"
          aria-modal="true"
          aria-label={`Export code for ${cardName}`}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-gray-800">
            <h2 className="text-sm font-semibold text-white">Export Code</h2>
            <button
              onClick={onClose}
              className="p-1 text-gray-500 hover:text-white transition-colors rounded"
              aria-label="Close"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 px-5 pt-4">
            {EXPORT_FORMATS.map(fmt => (
              <button
                key={fmt.id}
                onClick={() => { setActiveId(fmt.id); setCopied(false) }}
                className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
                  activeId === fmt.id
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-800 text-gray-400 hover:text-white'
                }`}
              >
                {fmt.label}
              </button>
            ))}
          </div>

          {/* Code block */}
          <div className="relative mx-5 mt-3 mb-5">
            <pre className="bg-gray-950 rounded-xl p-4 text-xs text-gray-300 font-mono overflow-auto max-h-64 whitespace-pre">
              {code}
            </pre>
            <button
              onClick={handleCopy}
              className="absolute top-2 right-2 px-2.5 py-1 bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs rounded-lg transition-colors"
            >
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
        </div>

        {/* Hidden textarea for clipboard fallback */}
        <textarea
          ref={textareaRef}
          aria-hidden="true"
          className="fixed -left-[9999px]"
          readOnly
          tabIndex={-1}
        />
      </div>
    </FocusTrap>
  )
}
