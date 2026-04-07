// src/components/CardDetailModal.tsx
import { useEffect, useRef, useState } from 'react'
import { FocusTrap } from 'focus-trap-react'
import type { ColorCard } from '../types'
import { copyToClipboard } from '../lib/clipboard'

interface Props {
  card: ColorCard
  onClose: () => void
}

/** Decide whether white or black text is more legible on a given background. */
function contrastColor(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  // Perceived luminance (sRGB)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return luminance > 0.55 ? 'rgba(0,0,0,0.85)' : 'rgba(255,255,255,0.9)'
}

export default function CardDetailModal({ card, onClose }: Props) {
  const closeRef = useRef<HTMLButtonElement>(null)
  const imgRef = useRef<HTMLImageElement>(null)
  const onCloseRef = useRef(onClose)
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)
  // Tracks the rendered image bounds within its object-contain container
  const [imgBounds, setImgBounds] = useState<{ width: number; left: number } | null>(null)

  /** Compute the actual visible rect of an object-contain image. */
  function measureImage() {
    const img = imgRef.current
    if (!img) return
    const { naturalWidth, naturalHeight, clientWidth, clientHeight } = img
    if (!naturalWidth || !naturalHeight) return
    const imgAspect = naturalWidth / naturalHeight
    const boxAspect = clientWidth / clientHeight
    let renderedW: number
    let offsetLeft: number
    if (imgAspect > boxAspect) {
      // image is wider — fills width, letterboxed top/bottom
      renderedW = clientWidth
      offsetLeft = 0
    } else {
      // image is taller — fills height, pillarboxed left/right
      renderedW = clientHeight * imgAspect
      offsetLeft = (clientWidth - renderedW) / 2
    }
    setImgBounds({ width: renderedW, left: offsetLeft })
  }

  // Keep the ref current without re-registering the effect on every render
  useEffect(() => { onCloseRef.current = onClose }, [onClose])

  useEffect(() => {
    closeRef.current?.focus()
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onCloseRef.current()
      }
    }
    window.addEventListener('keydown', onKey, true)
    // Re-measure on resize so the palette stays aligned
    window.addEventListener('resize', measureImage)
    return () => {
      window.removeEventListener('keydown', onKey, true)
      window.removeEventListener('resize', measureImage)
    }
  }, []) // stable — no deps needed

  function handleSwatchClick(e: React.MouseEvent, hex: string, index: number) {
    e.stopPropagation()
    copyToClipboard(hex)
      .then(() => {
        setCopiedIndex(index)
        setTimeout(() => setCopiedIndex(null), 1500)
      })
      .catch(() => {})
  }

  return (
    <FocusTrap>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
        onClick={e => { if (e.target === e.currentTarget) onClose() }}
        role="dialog"
        aria-modal="true"
        aria-label={`Color palette detail for ${card.name}`}
      >
        <div className="relative w-full max-w-4xl rounded-2xl overflow-hidden shadow-modal animate-slide-up border border-surface-border">
          {/* Close button */}
          <button
            ref={closeRef}
            onClick={onClose}
            className="absolute top-3 right-3 z-10 p-1.5 rounded-lg bg-black/40 hover:bg-black/60 text-white/80 hover:text-white transition-all backdrop-blur-sm"
            aria-label="Close"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Image with color palette overlay */}
          <div className="relative">
            <img
              ref={imgRef}
              src={card.imageDataUrl}
              alt={card.name}
              className="w-full object-contain block"
              style={{ maxHeight: '70vh' }}
              onLoad={measureImage}
            />

            {/* Color palette — vertical, centered on the rendered image, 65% of image width */}
            {imgBounds && (
              <div
                className="absolute inset-y-0 flex items-center justify-center pointer-events-none"
                style={{ left: imgBounds.left, width: imgBounds.width }}
              >
                <div
                  className="flex flex-col gap-3 pointer-events-auto"
                  style={{ width: '65%' }}
                >
                {card.colors.map((color, i) => {
                  const textColor = contrastColor(color.hex)
                  return (
                    <button
                      key={i}
                      className="flex flex-col gap-1 px-3 py-2.5 cursor-pointer transition-opacity hover:opacity-90 active:opacity-75"
                      style={{ backgroundColor: color.hex }}
                      onClick={e => handleSwatchClick(e, color.hex, i)}
                      title={`Copy ${color.hex}`}
                    >
                      {/* Color name — top left */}
                      <span
                        className="text-xs font-semibold leading-tight text-left"
                        style={{ color: textColor, paddingBottom: 3 }}
                      >
                        {copiedIndex === i ? 'Copied!' : color.name}
                      </span>

                      {/* Hex + RGB — bottom left */}
                      <div className="flex items-center gap-3">
                        <span
                          className="text-[10px] font-mono leading-none"
                          style={{ color: textColor, opacity: 0.8 }}
                        >
                          {color.hex.toUpperCase()}
                        </span>
                        <span
                          className="text-[10px] font-mono leading-none"
                          style={{ color: textColor, opacity: 0.55 }}
                        >
                          {`rgb(${color.r}, ${color.g}, ${color.b})`}
                        </span>
                      </div>
                    </button>
                  )
                })}
                </div>
              </div>
            )}
          </div>

          {/* Card name footer */}
          <div className="px-5 py-3 flex items-center justify-between border-t border-surface-border bg-surface">
            <span className="text-sm font-semibold text-primary">{card.name}</span>
            <span className="text-[10px] font-mono text-muted">
              {new Date(card.createdAt).toLocaleDateString()}
            </span>
          </div>
        </div>
      </div>
    </FocusTrap>
  )
}
