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
    <main className="min-h-screen bg-gray-950 text-white">
      {storageWarning && (
        <div className="bg-yellow-900/50 border-b border-yellow-700 px-8 py-3 text-sm text-yellow-300">
          Storage is nearly full (over 4MB). Export your collection and delete old cards to free space.
        </div>
      )}

      <div className="max-w-5xl mx-auto px-8 py-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold">My Collection</h1>

          {/* Export / Import */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => exportJson(cards)}
              className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs rounded-lg transition-colors"
            >
              Export JSON
            </button>
            <button
              onClick={() => importInputRef.current?.click()}
              className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs rounded-lg transition-colors"
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
          <div className="mb-4 bg-red-950/50 border border-red-800 rounded-xl p-3 text-red-300 text-sm">
            {importError}
          </div>
        )}

        {/* Tabs + View toggle */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex gap-1 bg-gray-900 rounded-lg p-1">
            <button
              onClick={() => setTab('all')}
              className={`px-4 py-1.5 text-sm rounded-md transition-colors ${tab === 'all' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'}`}
            >
              All ({cards.length})
            </button>
            <button
              onClick={() => setTab('favorites')}
              className={`px-4 py-1.5 text-sm rounded-md transition-colors ${tab === 'favorites' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'}`}
            >
              Favorites ({favorites.length})
            </button>
          </div>

          <div className="flex gap-1 bg-gray-900 rounded-lg p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${viewMode === 'grid' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'}`}
            >
              Grid
            </button>
            <button
              onClick={() => setViewMode('carousel')}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${viewMode === 'carousel' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'}`}
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
          <div className="w-full h-[600px] rounded-2xl overflow-hidden bg-gray-900 border border-gray-800">
            {displayed.length === 0 ? (
              <div className="flex items-center justify-center h-full text-gray-500 text-sm">
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
