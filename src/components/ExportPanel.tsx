import { useState, useEffect } from 'react'
import { FocusTrap } from 'focus-trap-react'
import type { ColorEntry } from '../types'
import { EXPORT_FORMATS } from '../lib/exportFormats'
import { copyToClipboard } from '../lib/clipboard'

interface Props {
  cardName: string
  colors: ColorEntry[]
  onClose: () => void
}

export default function ExportPanel({ cardName, colors, onClose }: Props) {
  const [activeId, setActiveId] = useState(EXPORT_FORMATS[0].id)
  const [copied, setCopied] = useState(false)

  const activeFormat = EXPORT_FORMATS.find(f => f.id === activeId)!
  const code = activeFormat.render(cardName, colors)

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onClose()
      }
    }
    // capture: true so this fires before bubble-phase listeners (e.g. ConfirmDialog)
    // and stopPropagation prevents the event reaching ConfirmDialog's handler
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [onClose])

  function handleCopy() {
    copyToClipboard(code).then(() => flash()).catch(() => {})
  }

  function flash() {
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <FocusTrap>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4"
        onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
      >
        <div
          className="bg-surface rounded-2xl w-full max-w-lg shadow-modal border border-surface-border flex flex-col animate-slide-up"
          role="dialog"
          aria-modal="true"
          aria-label={`Export code for ${cardName}`}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-surface-border">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-white/30">{'</>'}</span>
              <h2 className="text-sm font-semibold text-white">Export Code</h2>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-white/30 hover:text-white transition-colors rounded-lg hover:bg-surface-raised"
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
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                  activeId === fmt.id
                    ? 'text-white'
                    : 'bg-surface-raised text-white/40 hover:text-white/70'
                }`}
                style={activeId === fmt.id ? {
                  background: 'linear-gradient(135deg, #6366f1, #7c3aed)',
                  boxShadow: '0 2px 8px rgba(99,102,241,0.35)',
                } : undefined}
              >
                {fmt.label}
              </button>
            ))}
          </div>

          {/* Code block */}
          <div className="relative mx-5 mt-3 mb-5">
            <pre className="bg-canvas rounded-xl p-4 text-xs text-white/60 font-mono overflow-auto max-h-64 whitespace-pre border border-surface-border">
              {code}
            </pre>
            <button
              onClick={handleCopy}
              className="absolute top-2.5 right-2.5 px-2.5 py-1 text-xs font-medium rounded-lg transition-all"
              style={copied ? {
                background: 'rgba(99,102,241,0.2)',
                color: '#818cf8',
              } : {
                background: 'rgba(255,255,255,0.06)',
                color: 'rgba(255,255,255,0.5)',
              }}
            >
              {copied ? 'Copied ✓' : 'Copy'}
            </button>
          </div>
        </div>
      </div>
    </FocusTrap>
  )
}
