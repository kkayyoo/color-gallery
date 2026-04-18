import { useState } from 'react'
import { Link } from 'react-router-dom'
import type { ColorCard } from '../types'
import InlineNameEditor from './InlineNameEditor'
import ConfirmDialog from './ConfirmDialog'
import ExportPanel from './ExportPanel'
import CardDetailModal from './CardDetailModal'
import { exportCardAsPng } from '../lib/canvasExport'

interface Props {
  cards: ColorCard[]
  onFavorite: (id: string) => void
  onDelete: (id: string) => void
  onRename: (id: string, name: string) => void
}

export default function GridView({ cards, onFavorite, onDelete, onRename }: Props) {
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [exportCodeId, setExportCodeId] = useState<string | null>(null)
  const [detailCardId, setDetailCardId] = useState<string | null>(null)

  const exportingCard = exportCodeId ? cards.find(c => c.id === exportCodeId) : null
  const detailCard = detailCardId ? cards.find(c => c.id === detailCardId) : null

  if (cards.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-center">
        <div className="w-16 h-16 rounded-2xl bg-surface-raised flex items-center justify-center mb-4">
          <svg className="w-7 h-7 text-faint" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
        <p className="text-muted text-sm mb-3">No color cards yet.</p>
        <Link
          to="/"
          className="text-sm text-brand-bright hover:text-brand-violet-bright transition-colors"
        >
          Extract your first palette →
        </Link>
      </div>
    )
  }

  return (
    <>
      {confirmId && (
        <ConfirmDialog
          message="Remove this card from your collection?"
          onConfirm={() => { onDelete(confirmId); setConfirmId(null) }}
          onCancel={() => setConfirmId(null)}
        />
      )}

      {exportingCard && (
        <ExportPanel
          cardName={exportingCard.name}
          colors={exportingCard.colors}
          onClose={() => setExportCodeId(null)}
        />
      )}

      {detailCard && (
        <CardDetailModal
          card={detailCard}
          onClose={() => setDetailCardId(null)}
        />
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {cards.map(card => (
          <div
            key={card.id}
            className="group bg-surface rounded-2xl overflow-hidden border border-surface-border transition-all duration-300 hover:shadow-card-hover hover:-translate-y-0.5"
          >
            {/* Image */}
            <div className="relative">
              <img
                src={card.imageDataUrl}
                alt={card.name}
                className="w-full h-44 object-cover cursor-zoom-in"
                onClick={() => setDetailCardId(card.id)}
                title="Click to view full image"
              />
              {/* Favorite badge */}
              {card.favorited && (
                <div className="absolute top-2 right-2">
                  <svg className="w-5 h-5 text-accent-rose drop-shadow-sm" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" />
                  </svg>
                </div>
              )}
            </div>

            {/* Color strip — 24px, vivid */}
            <div className="flex h-6">
              {card.colors.map((color, i) => (
                <div
                  key={i}
                  className="flex-1 transition-all group-hover:opacity-90"
                  style={{ backgroundColor: color.hex }}
                  title={`${color.name} ${color.hex}`}
                />
              ))}
            </div>

            {/* Card body */}
            <div className="p-4">
              <InlineNameEditor
                value={card.name}
                onSave={name => onRename(card.id, name)}
                className="text-sm font-semibold text-primary block mb-3"
              />

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => onFavorite(card.id)}
                  className="transition-transform hover:scale-125 active:scale-110 mr-0.5 cursor-pointer rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50"
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
                  onClick={() => exportCardAsPng(card)}
                  className="px-2.5 py-1 text-muted hover:text-primary bg-surface-raised hover:bg-surface-overlay text-xs rounded-lg transition-all border border-surface-border cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50"
                >
                  PNG
                </button>
                <button
                  onClick={() => setExportCodeId(card.id)}
                  className="px-2.5 py-1 text-muted hover:text-primary bg-surface-raised hover:bg-surface-overlay text-xs rounded-lg transition-all border border-surface-border font-mono cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50"
                >
                  {'</>'}
                </button>
                <button
                  onClick={() => setConfirmId(card.id)}
                  className="ml-auto p-1 text-faint hover:text-accent-rose opacity-0 group-hover:opacity-100 transition-all cursor-pointer rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50"
                  title="Delete"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  )
}
