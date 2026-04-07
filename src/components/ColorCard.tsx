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
            className="text-lg font-semibold text-primary"
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
                className="px-4 py-2 text-sm font-medium rounded-xl transition-all disabled:opacity-40 disabled:cursor-default text-primary"
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
                className="px-3 py-2 text-sm text-secondary hover:text-primary bg-surface-raised hover:bg-surface-overlay rounded-xl transition-all disabled:opacity-40 border border-surface-border"
              >
                Export PNG
              </button>
              <button
                onClick={() => setShowExportCode(true)}
                disabled={loading}
                className="px-3 py-2 text-sm text-secondary hover:text-primary bg-surface-raised hover:bg-surface-overlay rounded-xl transition-all disabled:opacity-40 border border-surface-border"
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
                className="transition-transform hover:scale-125 active:scale-110 cursor-pointer"
                title={card.favorited ? 'Remove from favorites' : 'Add to favorites'}
              >
                {card.favorited ? (
                  <svg className="w-5 h-5 text-accent-rose" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5 text-muted hover:text-accent-rose transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
                  </svg>
                )}
              </button>
              <button
                onClick={onExport}
                className="px-3 py-1.5 text-xs text-secondary hover:text-primary bg-surface-raised hover:bg-surface-overlay rounded-lg transition-all border border-surface-border"
              >
                Export PNG
              </button>
              <button
                onClick={() => setShowExportCode(true)}
                className="px-3 py-1.5 text-xs text-secondary hover:text-primary bg-surface-raised hover:bg-surface-overlay rounded-lg transition-all border border-surface-border"
              >
                {'</>'}
              </button>
              <button
                onClick={props.onDelete}
                className="ml-auto p-1.5 text-faint hover:text-accent-rose transition-colors"
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
