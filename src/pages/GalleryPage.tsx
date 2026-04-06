// src/pages/GalleryPage.tsx
import { useState, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useCollection } from '../hooks/useCollection'
import { validateImportPayload } from '../lib/storage'
import GridView from '../components/GridView'
import CarouselView from '../components/CarouselView'
import type { ColorCard } from '../types'

type Tab = 'all' | 'favorites'
type ViewMode = 'grid' | 'carousel'

function exportJson(cards: ColorCard[]) {
  const blob = new Blob([JSON.stringify(cards, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `color-collection-${Date.now()}.json`
  a.click()
  URL.revokeObjectURL(url)
}

export default function GalleryPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const tab: Tab = searchParams.get('tab') === 'favorites' ? 'favorites' : 'all'
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [importError, setImportError] = useState<string | null>(null)
  const importInputRef = useRef<HTMLInputElement>(null)

  const {
    cards,
    storageWarning,
    deleteCard,
    toggleFavorite,
    renameCard,
    importCards,
  } = useCollection()

  function setTab(t: Tab) {
    setSearchParams(t === 'favorites' ? { tab: 'favorites' } : {})
  }

  const favorites = cards.filter(c => c.favorited)
  const displayed = tab === 'favorites' ? favorites : cards

  function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setImportError(null)
    const reader = new FileReader()
    reader.onload = ev => {
      try {
        const data = JSON.parse(ev.target?.result as string)
        const valid = validateImportPayload(data)
        const added = importCards(valid)
        if (added === 0) setImportError('No new cards found in the file.')
      } catch (err) {
        setImportError(err instanceof Error ? err.message : 'Failed to import file.')
      }
    }
    reader.onerror = () => setImportError('Failed to read file.')
    reader.readAsText(file)
    e.target.value = ''
  }

  return (
    <main className="min-h-screen bg-canvas text-white">
      {storageWarning && (
        <div className="bg-amber-900/30 border-b border-amber-700/50 px-8 py-3 text-sm text-amber-300/80">
          Storage is nearly full (over 4MB). Export your collection and delete old cards to free space.
        </div>
      )}

      {/* Subtle background radial */}
      <div
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          background: 'radial-gradient(ellipse 80% 30% at 50% -5%, rgba(124,58,237,0.10), transparent)',
        }}
      />

      <div className="relative z-10 max-w-5xl mx-auto px-8 py-12">
        {/* Header */}
        <div className="flex items-end justify-between mb-10">
          <div>
            <h1 className="text-4xl font-bold tracking-tight mb-1">
              <span
                className="bg-clip-text text-transparent"
                style={{ backgroundImage: 'linear-gradient(135deg, #818cf8, #a78bfa)' }}
              >
                My Collection
              </span>
            </h1>
            <p className="text-white/30 text-sm">{cards.length} palette{cards.length !== 1 ? 's' : ''} saved</p>
          </div>

          {/* Export / Import */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => exportJson(cards)}
              className="px-3 py-1.5 text-xs font-medium text-white/50 hover:text-white bg-surface-raised hover:bg-surface-overlay rounded-xl transition-all border border-surface-border"
            >
              Export JSON
            </button>
            <button
              onClick={() => importInputRef.current?.click()}
              className="px-3 py-1.5 text-xs font-medium text-white/50 hover:text-white bg-surface-raised hover:bg-surface-overlay rounded-xl transition-all border border-surface-border"
            >
              Import JSON
            </button>
            <input
              ref={importInputRef}
              type="file"
              accept=".json"
              className="hidden"
              onChange={handleImportFile}
            />
          </div>
        </div>

        {importError && (
          <div className="mb-5 bg-accent-rose/10 border border-accent-rose/30 rounded-2xl p-3 text-accent-rose/80 text-sm">
            {importError}
          </div>
        )}

        {/* Tabs + View toggle */}
        <div className="flex items-center justify-between mb-7">
          {/* Tabs */}
          <div className="flex gap-1 bg-surface rounded-xl p-1 border border-surface-border">
            <button
              onClick={() => setTab('all')}
              className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-all ${
                tab === 'all'
                  ? 'bg-surface-overlay text-white'
                  : 'text-white/35 hover:text-white/70'
              }`}
            >
              All <span className="text-white/30 ml-1 font-mono text-xs">{cards.length}</span>
            </button>
            <button
              onClick={() => setTab('favorites')}
              className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-all ${
                tab === 'favorites'
                  ? 'bg-surface-overlay text-white'
                  : 'text-white/35 hover:text-white/70'
              }`}
            >
              Favorites <span className="text-white/30 ml-1 font-mono text-xs">{favorites.length}</span>
            </button>
          </div>

          {/* View toggle */}
          <div className="flex gap-1 bg-surface rounded-xl p-1 border border-surface-border">
            <button
              onClick={() => setViewMode('grid')}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-all ${
                viewMode === 'grid'
                  ? 'bg-surface-overlay text-white'
                  : 'text-white/35 hover:text-white/70'
              }`}
            >
              Grid
            </button>
            <button
              onClick={() => setViewMode('carousel')}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-all ${
                viewMode === 'carousel'
                  ? 'bg-surface-overlay text-white'
                  : 'text-white/35 hover:text-white/70'
              }`}
            >
              3D Carousel
            </button>
          </div>
        </div>

        {/* Content */}
        {viewMode === 'grid' ? (
          <GridView
            cards={displayed}
            onFavorite={toggleFavorite}
            onDelete={deleteCard}
            onRename={renameCard}
          />
        ) : (
          <div
            className="w-full h-[600px] rounded-2xl overflow-hidden border border-surface-border"
            style={{
              background: 'linear-gradient(180deg, #13131f 0%, #080810 100%)',
              boxShadow: '0 0 60px rgba(99,102,241,0.08)',
            }}
          >
            {displayed.length === 0 ? (
              <div className="flex items-center justify-center h-full text-white/25 text-sm">
                {tab === 'favorites' ? 'No favorites yet. Heart some cards in Grid view.' : 'No cards yet.'}
              </div>
            ) : (
              <CarouselView cards={displayed} />
            )}
          </div>
        )}
      </div>
    </main>
  )
}
