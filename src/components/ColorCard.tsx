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
    <div className="bg-surface rounded-2xl overflow-hidden shadow-card border border-surface-border">
      {showExportCode && (
        <ExportPanel
          cardName={card.name}
          colors={card.colors}
          onClose={() => setShowExportCode(false)}
        />
      )}

      {/* Color bar across the top */}
      <div className="flex h-1.5">
        {card.colors.map((c, i) => (
          <div key={i} className="flex-1" style={{ backgroundColor: c.hex }} />
        ))}
      </div>

      <div className="p-6">
        {/* Name */}
        <div className="mb-5">
          <InlineNameEditor
            value={card.name}
            onSave={onRename}
            className="text-lg font-semibold text-white"
          />
        </div>

        {/* Body: image + palette */}
        <div className="flex gap-6">
          {/* Image — 55% */}
          <div className="w-[55%] flex-shrink-0">
            <img
              src={card.imageDataUrl}
              alt={card.name}
              className="w-full rounded-xl object-contain ring-1 ring-surface-border"
            />
          </div>

          {/* Palette — 45% */}
          <div className="w-[45%] min-w-0">
            <ColorPalette colors={card.colors} loading={loading} />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 mt-5 pt-4 border-t border-surface-border">
          {props.mode === 'extract' && (
            <>
              <button
                onClick={props.onSave}
                disabled={props.saved}
                className="px-4 py-2 text-sm font-medium rounded-xl transition-all disabled:opacity-40 disabled:cursor-default text-white"
                style={{
                  background: props.saved ? 'rgba(99,102,241,0.2)' : 'linear-gradient(135deg, #6366f1, #7c3aed)',
                  boxShadow: props.saved ? 'none' : '0 4px 14px rgba(99,102,241,0.35)',
                }}
              >
                {props.saved ? 'Saved ✓' : 'Save to Collection'}
              </button>
              <button
                onClick={onExport}
                disabled={loading}
                className="px-3 py-2 text-sm text-white/60 hover:text-white bg-surface-raised hover:bg-surface-overlay rounded-xl transition-all disabled:opacity-40 border border-surface-border"
              >
                Export PNG
              </button>
              <button
                onClick={() => setShowExportCode(true)}
                disabled={loading}
                className="px-3 py-2 text-sm text-white/60 hover:text-white bg-surface-raised hover:bg-surface-overlay rounded-xl transition-all disabled:opacity-40 border border-surface-border"
              >
                {'</>'}
              </button>
              {props.saved && (
                <a
                  href="/gallery"
                  className="ml-auto text-xs text-brand-bright hover:text-brand-violet-bright transition-colors"
                >
                  View in Gallery →
                </a>
              )}
            </>
          )}

          {props.mode === 'gallery' && (
            <>
              <button
                onClick={props.onFavorite}
                className="text-lg transition-transform hover:scale-125 active:scale-110"
                title={card.favorited ? 'Remove from favorites' : 'Add to favorites'}
              >
                {card.favorited ? '❤️' : '🤍'}
              </button>
              <button
                onClick={onExport}
                className="px-3 py-1.5 text-xs text-white/50 hover:text-white bg-surface-raised hover:bg-surface-overlay rounded-lg transition-all border border-surface-border"
              >
                Export PNG
              </button>
              <button
                onClick={() => setShowExportCode(true)}
                className="px-3 py-1.5 text-xs text-white/50 hover:text-white bg-surface-raised hover:bg-surface-overlay rounded-lg transition-all border border-surface-border"
              >
                {'</>'}
              </button>
              <button
                onClick={props.onDelete}
                className="ml-auto p-1.5 text-white/20 hover:text-accent-rose transition-colors"
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
    </div>
  )
}
