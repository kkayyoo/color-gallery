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

  useEffect(() => {
    if ((state.status === 'done' || state.status === 'naming') && currentFile) {
      const { imageDataUrl, colors } = state
      setPendingCard(prev => prev ?? {
        id: generateId(),
        createdAt: Date.now(),
        name: fileNameWithoutExt(currentFile),
        imageDataUrl,
        colors,
        favorited: false,
      })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.status, (state as { imageDataUrl?: string }).imageDataUrl, (state as { colors?: unknown }).colors, currentFile])

  const currentColors = (state.status === 'naming' || state.status === 'done') ? state.colors : null
  useEffect(() => {
    if (currentColors && pendingCard) {
      setPendingCard(prev => prev ? { ...prev, colors: currentColors } : prev)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentColors])

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
    <main className="min-h-screen bg-canvas text-white">
      {storageWarning && (
        <div className="bg-amber-900/30 border-b border-amber-700/50 px-8 py-3 text-sm text-amber-300/80">
          Storage is nearly full (over 4MB). Consider exporting and deleting old cards.
        </div>
      )}

      {/* Subtle background radial */}
      <div
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          background: 'radial-gradient(ellipse 60% 40% at 50% -10%, rgba(99,102,241,0.12), transparent)',
        }}
      />

      <div className="relative z-10 max-w-3xl mx-auto px-8 py-14">
        {/* Header */}
        <div className="mb-10">
          <h1 className="text-4xl font-bold tracking-tight mb-2">
            <span
              className="bg-clip-text text-transparent"
              style={{ backgroundImage: 'linear-gradient(135deg, #818cf8, #a78bfa)' }}
            >
              Extract Colors
            </span>
          </h1>
          <p className="text-white/40 text-sm">
            Upload an image to extract its 5 dominant colors.
          </p>
        </div>

        {state.status === 'idle' && (
          <ImageUploader onFile={handleFile} />
        )}

        {state.status === 'error' && (
          <div className="space-y-4">
            <div className="bg-accent-rose/10 border border-accent-rose/30 rounded-2xl p-4 text-accent-rose/80 text-sm">
              {state.message}
            </div>
            <button
              onClick={reset}
              className="text-sm text-white/30 hover:text-white transition-colors"
            >
              Try again
            </button>
          </div>
        )}

        {(state.status === 'resizing' || state.status === 'extracting') && (
          <div className="flex items-center justify-center py-24">
            <div className="flex items-center gap-3 text-white/40 text-sm">
              <div className="w-4 h-4 border-2 border-brand/40 border-t-brand rounded-full animate-spin" />
              Processing image…
            </div>
          </div>
        )}

        {pendingCard && (state.status === 'naming' || state.status === 'done') && (
          <div className="space-y-5 animate-fade-in">
            <ColorCard
              mode="extract"
              card={pendingCard}
              loading={state.status === 'naming'}
              onSave={handleSave}
              onExport={handleExport}
              onRename={handleRename}
              saved={saved}
            />
            <div className="flex items-center gap-4 px-1">
              {state.status === 'done' && (
                <button
                  onClick={() => setShowRegenConfirm(true)}
                  className="text-sm text-white/25 hover:text-white/60 transition-colors"
                >
                  Re-generate palette
                </button>
              )}
              <button
                onClick={() => { reset(); setCurrentFile(null); setPendingCard(null); setSaved(false); setShowRegenConfirm(false) }}
                className="text-sm text-white/25 hover:text-white/60 transition-colors"
              >
                Upload another image
              </button>
            </div>
            {showRegenConfirm && (
              <ConfirmDialog
                message={saved
                  ? "The palette has already been saved. Re-generating will start a new extraction."
                  : "This will discard your unsaved palette. Continue?"}
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
