import { useState } from 'react'
import type { ColorCard as ColorCardType } from '../types'
import ColorPalette from './ColorPalette'
import InlineNameEditor from './InlineNameEditor'
import ExportPanel from './ExportPanel'

interface BaseProps {
  card: ColorCardType
  loading?: boolean
  onExport: () => void
  onRename: (name: string) => void
}

interface ExtractProps extends BaseProps {
  mode: 'extract'
  onSave: () => void
  saved?: boolean
}

interface GalleryProps extends BaseProps {
  mode: 'gallery'
  onFavorite: () => void
  onDelete: () => void
}

type Props = ExtractProps | GalleryProps

export default function ColorCard(props: Props) {
  const { card, loading, onExport, onRename } = props
  const [showExportCode, setShowExportCode] = useState(false)

  return (
    <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
      {showExportCode && (
        <ExportPanel
          cardName={card.name}
          colors={card.colors}
          onClose={() => setShowExportCode(false)}
        />
      )}
      {/* Name */}
      <div className="mb-4">
        <InlineNameEditor
          value={card.name}
          onSave={onRename}
          className="text-lg font-semibold text-white"
        />
      </div>

      {/* Body: image + palette */}
      <div className="flex gap-6">
        {/* Image — 60% */}
        <div className="w-[60%] flex-shrink-0">
          <img
            src={card.imageDataUrl}
            alt={card.name}
            className="w-full rounded-xl object-contain"
          />
        </div>

        {/* Palette — 40% */}
        <div className="w-[40%] min-w-0">
          <ColorPalette colors={card.colors} loading={loading} />
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 mt-5 pt-4 border-t border-gray-800">
        {props.mode === 'extract' && (
          <>
            <button
              onClick={props.onSave}
              disabled={props.saved}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-700 disabled:text-gray-500 text-white text-sm rounded-lg transition-colors"
            >
              {props.saved ? 'Saved' : 'Save to Collection'}
            </button>
            <button
              onClick={onExport}
              disabled={loading}
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 disabled:opacity-50 text-white text-sm rounded-lg transition-colors"
            >
              Export PNG
            </button>
            <button
              onClick={() => setShowExportCode(true)}
              disabled={loading}
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 disabled:opacity-50 text-white text-sm rounded-lg transition-colors"
            >
              Export Code
            </button>
            {props.saved && (
              <a href="/gallery" className="ml-auto text-sm text-indigo-400 hover:text-indigo-300">
                View in Gallery →
              </a>
            )}
          </>
        )}

        {props.mode === 'gallery' && (
          <>
            <button
              onClick={props.onFavorite}
              className="text-xl transition-transform hover:scale-110"
              title={card.favorited ? 'Remove from favorites' : 'Add to favorites'}
            >
              {card.favorited ? '❤️' : '🤍'}
            </button>
            <button
              onClick={onExport}
              className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-white text-xs rounded-lg transition-colors"
            >
              Export PNG
            </button>
            <button
              onClick={() => setShowExportCode(true)}
              className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-white text-xs rounded-lg transition-colors"
            >
              Export Code
            </button>
            <button
              onClick={props.onDelete}
              className="ml-auto p-1.5 text-gray-600 hover:text-red-400 transition-colors"
              title="Delete"
              aria-label="Delete card"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </>
        )}
      </div>
    </div>
  )
}
