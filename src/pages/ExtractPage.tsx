// src/pages/ExtractPage.tsx
import { useState, useCallback, useEffect } from 'react'
import { useColorExtraction } from '../hooks/useColorExtraction'
import { useCollection } from '../hooks/useCollection'
import { exportCardAsPng } from '../lib/canvasExport'
import ImageUploader from '../components/ImageUploader'
import ColorCard from '../components/ColorCard'
import ConfirmDialog from '../components/ConfirmDialog'
import type { ColorCard as ColorCardType } from '../types'

function generateId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

function fileNameWithoutExt(file: File): string {
  return file.name.replace(/\.[^.]+$/, '')
}

export default function ExtractPage() {
  const { state, extract, reset } = useColorExtraction()
  const { addCard, renameCard, storageWarning } = useCollection()
  const [currentFile, setCurrentFile] = useState<File | null>(null)
  const [pendingCard, setPendingCard] = useState<ColorCardType | null>(null)
  const [saved, setSaved] = useState(false)
  const [showRegenConfirm, setShowRegenConfirm] = useState(false)

  const handleFile = useCallback((file: File) => {
    setCurrentFile(file)
    setSaved(false)
    setPendingCard(null)
    extract(file)
  }, [extract])

  // Build pending card when extraction completes
  useEffect(() => {
    const s = state
    if (
      (s.status === 'done' || s.status === 'naming') &&
      !pendingCard &&
      currentFile
    ) {
      setPendingCard({
        id: generateId(),
        createdAt: Date.now(),
        name: fileNameWithoutExt(currentFile),
        imageDataUrl: s.imageDataUrl,
        colors: s.colors,
        favorited: false,
      })
    }
  }, [state.status]) // eslint-disable-line react-hooks/exhaustive-deps

  // Keep pending card colors in sync with naming progress (fires on naming AND done)
  useEffect(() => {
    const s = state
    if ((s.status === 'naming' || s.status === 'done') && pendingCard) {
      setPendingCard(prev => prev ? { ...prev, colors: s.colors } : prev)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [(state as { colors?: unknown }).colors])

  function handleSave() {
    if (!pendingCard || saved) return
    addCard(pendingCard)
    setSaved(true)
  }

  function handleRename(name: string) {
    if (!pendingCard) return
    const updated = { ...pendingCard, name }
    setPendingCard(updated)
    if (saved) renameCard(pendingCard.id, name)
  }

  function handleExport() {
    if (!pendingCard) return
    exportCardAsPng(pendingCard)
  }

  function handleRegenerate() {
    if (!currentFile) return
    setPendingCard(null)
    setSaved(false)
    extract(currentFile)
  }

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      {storageWarning && (
        <div className="bg-yellow-900/50 border-b border-yellow-700 px-8 py-3 text-sm text-yellow-300">
          Storage is nearly full (over 4MB). Consider exporting and deleting old cards.
        </div>
      )}

      <div className="max-w-3xl mx-auto px-8 py-12">
        <h1 className="text-2xl font-bold mb-2">Extract Colors</h1>
        <p className="text-gray-400 text-sm mb-8">
          Upload an image to extract its 5 dominant colors.
        </p>

        {state.status === 'idle' && (
          <ImageUploader onFile={handleFile} />
        )}

        {state.status === 'error' && (
          <div className="space-y-4">
            <div className="bg-red-950/50 border border-red-800 rounded-xl p-4 text-red-300 text-sm">
              {state.message}
            </div>
            <button onClick={reset} className="text-sm text-gray-400 hover:text-white">
              Try again
            </button>
          </div>
        )}

        {(state.status === 'resizing' || state.status === 'extracting') && (
          <div className="flex items-center justify-center py-24">
            <div className="text-gray-400 text-sm animate-pulse">Processing image…</div>
          </div>
        )}

        {pendingCard && (state.status === 'naming' || state.status === 'done') && (
          <div className="space-y-6">
            <ColorCard
              mode="extract"
              card={pendingCard}
              loading={state.status === 'naming'}
              onSave={handleSave}
              onExport={handleExport}
              onRename={handleRename}
              saved={saved}
            />
            <div className="flex items-center gap-4">
              {state.status === 'done' && (
                <button
                  onClick={() => setShowRegenConfirm(true)}
                  className="text-sm text-gray-500 hover:text-gray-300 transition-colors"
                >
                  Re-generate palette
                </button>
              )}
              <button
                onClick={() => { reset(); setCurrentFile(null); setPendingCard(null); setSaved(false) }}
                className="text-sm text-gray-500 hover:text-gray-300 transition-colors"
              >
                Upload another image
              </button>
            </div>
            {showRegenConfirm && (
              <ConfirmDialog
                message="This will discard your unsaved palette. Continue?"
                confirmLabel="Re-generate"
                confirmVariant="primary"
                onConfirm={() => { setShowRegenConfirm(false); handleRegenerate() }}
                onCancel={() => setShowRegenConfirm(false)}
              />
            )}
          </div>
        )}
      </div>
    </main>
  )
}
