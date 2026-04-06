import { useState } from 'react'
import { Link } from 'react-router-dom'
import type { ColorCard } from '../types'
import InlineNameEditor from './InlineNameEditor'
import ConfirmDialog from './ConfirmDialog'
import ExportPanel from './ExportPanel'
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

  const exportingCard = exportCodeId ? cards.find(c => c.id === exportCodeId) : null

  if (cards.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-center">
        <p className="text-gray-500 text-sm mb-4">No color cards yet.</p>
        <Link to="/" className="text-indigo-400 hover:text-indigo-300 text-sm">
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

      <div className="grid grid-cols-2 gap-6">
        {cards.map(card => (
          <div
            key={card.id}
            className="group bg-gray-900 rounded-2xl overflow-hidden border border-gray-800 hover:border-gray-700 transition-colors"
          >
            {/* Image */}
            <div className="relative">
              <img
                src={card.imageDataUrl}
                alt={card.name}
                className="w-full h-40 object-cover"
              />
            </div>

            {/* Color strip */}
            <div className="flex h-2">
              {card.colors.map((color, i) => (
                <div
                  key={i}
                  className="flex-1"
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
                className="text-sm font-semibold text-white block mb-3"
              />

              <div className="flex items-center gap-2">
                <button
                  onClick={() => onFavorite(card.id)}
                  className="text-lg transition-transform hover:scale-110"
                  title={card.favorited ? 'Remove from favorites' : 'Add to favorites'}
                >
                  {card.favorited ? '❤️' : '🤍'}
                </button>
                <button
                  onClick={() => exportCardAsPng(card)}
                  className="px-2 py-1 bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs rounded transition-colors"
                >
                  Export PNG
                </button>
                <button
                  onClick={() => setExportCodeId(card.id)}
                  className="px-2 py-1 bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs rounded transition-colors"
                >
                  Export Code
                </button>
                <button
                  onClick={() => setConfirmId(card.id)}
                  className="ml-auto p-1 text-gray-700 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                  title="Delete"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
