import type { ColorEntry } from '../types'

interface Props {
  colors: ColorEntry[]
  loading?: boolean
}

export default function ColorPalette({ colors, loading = false }: Props) {
  return (
    <div className="flex flex-col gap-3">
      {colors.map((color, i) => (
        <div key={i} className="flex items-center gap-4">
          <div
            className="w-10 h-10 rounded-lg flex-shrink-0 shadow-sm"
            style={{ backgroundColor: color.hex }}
          />
          <div className="flex flex-col min-w-0">
            <span className={`text-sm font-medium text-white ${loading && color.name === '…' ? 'animate-pulse' : ''}`}>
              {color.name}
            </span>
            <span className="text-xs font-mono text-gray-400">{color.hex}</span>
          </div>
          <button
            onClick={() => navigator.clipboard?.writeText(color.hex)}
            className="ml-auto text-xs text-gray-600 hover:text-gray-300 transition-colors flex-shrink-0"
            title="Copy HEX"
          >
            copy
          </button>
        </div>
      ))}
    </div>
  )
}
