import { useState } from 'react'
import type { ColorEntry } from '../types'

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

  function toggleFormat(format: 'hex' | 'rgb') {
    setColorFormat(format)
    localStorage.setItem(FORMAT_KEY, format)
  }

  const displayValue = (color: ColorEntry) =>
    colorFormat === 'hex'
      ? color.hex
      : `rgb(${color.r}, ${color.g}, ${color.b})`

  return (
    <div className="flex flex-col gap-3">
      {colors.length > 0 && (
        <div className="flex justify-end">
          <div className="flex text-xs font-mono rounded-lg overflow-hidden border border-gray-700">
            <button
              onClick={() => toggleFormat('hex')}
              className={`px-3 py-1 transition-colors ${
                colorFormat === 'hex'
                  ? 'bg-gray-700 text-white'
                  : 'bg-transparent text-gray-500 hover:text-gray-300'
              }`}
            >
              HEX
            </button>
            <button
              onClick={() => toggleFormat('rgb')}
              className={`px-3 py-1 transition-colors ${
                colorFormat === 'rgb'
                  ? 'bg-gray-700 text-white'
                  : 'bg-transparent text-gray-500 hover:text-gray-300'
              }`}
            >
              RGB
            </button>
          </div>
        </div>
      )}

      {colors.map((color) => (
        <div key={color.hex} className="flex items-center gap-4">
          <div
            className="w-10 h-10 rounded-lg flex-shrink-0 shadow-sm"
            style={{ backgroundColor: color.hex }}
          />
          <div className="flex flex-col min-w-0">
            <span className={`text-sm font-medium text-white ${loading && color.name === '…' ? 'animate-pulse' : ''}`}>
              {color.name}
            </span>
            <span className="text-xs font-mono text-gray-400">{displayValue(color)}</span>
          </div>
          <button
            onClick={() => navigator.clipboard?.writeText(displayValue(color)).catch(() => {})}
            className="ml-auto text-xs text-gray-600 hover:text-gray-300 transition-colors flex-shrink-0"
            title={`Copy ${colorFormat.toUpperCase()}`}
          >
            copy
          </button>
        </div>
      ))}
    </div>
  )
}
