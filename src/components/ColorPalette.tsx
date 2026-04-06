import { useState } from 'react'
import type { ColorEntry } from '../types'
import { copyToClipboard } from '../lib/clipboard'

const FORMAT_KEY = 'color-collection:color-format'

interface Props {
  colors: ColorEntry[]
  loading?: boolean
}

export default function ColorPalette({ colors, loading = false }: Props) {
  const [colorFormat, setColorFormat] = useState<'hex' | 'rgb'>(() => {
    const stored = localStorage.getItem(FORMAT_KEY)
    return stored === 'rgb' ? 'rgb' : 'hex'
  })
  const [copiedHex, setCopiedHex] = useState<string | null>(null)

  function toggleFormat(format: 'hex' | 'rgb') {
    setColorFormat(format)
    localStorage.setItem(FORMAT_KEY, format)
  }

  const displayValue = (color: ColorEntry) =>
    colorFormat === 'hex'
      ? color.hex
      : `rgb(${color.r}, ${color.g}, ${color.b})`

  function handleCopy(color: ColorEntry) {
    copyToClipboard(displayValue(color)).then(() => {
      setCopiedHex(color.hex)
      setTimeout(() => setCopiedHex(null), 1500)
    }).catch(() => {})
  }

  return (
    <div className="flex flex-col gap-2.5">
      {colors.length > 0 && (
        <div className="flex justify-end mb-1">
          <div className="flex text-xs font-mono rounded-lg overflow-hidden border border-surface-border bg-surface">
            <button
              onClick={() => toggleFormat('hex')}
              className={`px-3 py-1 transition-colors ${
                colorFormat === 'hex'
                  ? 'bg-surface-overlay text-primary'
                  : 'text-muted hover:text-secondary'
              }`}
            >
              HEX
            </button>
            <button
              onClick={() => toggleFormat('rgb')}
              className={`px-3 py-1 transition-colors ${
                colorFormat === 'rgb'
                  ? 'bg-surface-overlay text-primary'
                  : 'text-muted hover:text-secondary'
              }`}
            >
              RGB
            </button>
          </div>
        </div>
      )}

      {colors.map((color, i) => (
        <div
          key={i}
          className="group flex items-center gap-3 p-2 rounded-xl transition-colors hover:bg-surface-raised/50 cursor-pointer"
          onClick={() => handleCopy(color)}
          title={`Copy ${displayValue(color)}`}
        >
          {/* Swatch — larger, with glow */}
          <div
            className="w-12 h-12 rounded-xl flex-shrink-0 transition-transform group-hover:scale-105"
            style={{
              backgroundColor: color.hex,
              boxShadow: `0 4px 12px ${color.hex}66`,
            }}
          />

          {/* Name + value */}
          <div className="flex flex-col min-w-0 flex-1">
            <span
              className={`text-sm font-medium text-primary leading-tight ${
                loading && color.name === '…' ? 'animate-pulse-soft' : ''
              }`}
            >
              {color.name}
            </span>
            <span className="text-xs font-mono text-muted mt-0.5">{displayValue(color)}</span>
          </div>

          {/* Copy indicator */}
          <div className="flex-shrink-0 w-8 text-right">
            {copiedHex === color.hex ? (
              <span className="text-[10px] text-brand-bright font-mono">✓</span>
            ) : (
              <span className="text-[10px] text-faint group-hover:text-secondary font-mono transition-colors">
                copy
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
