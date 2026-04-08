// src/components/MasonryGrid.tsx
import { useState, useRef, useEffect } from 'react'
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

/* ── Utility: deterministic "random" height class based on card id ─── */
function getCardHeightClass(id: string): string {
  // Hash the id to get a consistent number
  let hash = 0
  for (let i = 0; i < id.length; i++) {
    hash = ((hash << 5) - hash + id.charCodeAt(i)) | 0
  }
  const bucket = Math.abs(hash) % 3
  // Three height tiers for masonry variety
  return bucket === 0 ? 'h-48' : bucket === 1 ? 'h-60' : 'h-72'
}

/* ── TiltCard: 3D perspective + color aura + glassmorphism palette ──── */
function TiltCard({
  card,
  index,
  onFavorite,
  onDelete,
  onRename,
  onExportPng,
  onExportCode,
  onDetail,
}: {
  card: ColorCard
  index: number
  onFavorite: () => void
  onDelete: () => void
  onRename: (id: string, name: string) => void
  onExportPng: () => void
  onExportCode: () => void
  onDetail: () => void
}) {
  const wrapperRef = useRef<HTMLDivElement>(null)
  const innerRef = useRef<HTMLDivElement>(null)
  const auraRef = useRef<HTMLDivElement>(null)
  const rafRef = useRef<number>(0)

  // Tilt state kept outside React — never triggers re-renders
  const tiltState = useRef({ targetX: 0, targetY: 0, currentX: 0, currentY: 0, hovered: false })

  const [revealed, setRevealed] = useState(false)

  // Dominant color = first extracted color
  const dominantColor = card.colors[0]?.hex ?? '#6366f1'

  // Staggered scroll-reveal via IntersectionObserver
  useEffect(() => {
    const el = wrapperRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTimeout(() => setRevealed(true), (index % 6) * 80)
          observer.disconnect()
        }
      },
      { threshold: 0.15 },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [index])

  // rAF animation loop — lerps current tilt toward target for buttery smoothness
  useEffect(() => {
    const LERP = 0.12 // smoothing factor (higher = snappier, lower = smoother)
    const LERP_RETURN = 0.08 // slower lerp when returning to flat

    function tick() {
      const s = tiltState.current
      const lerp = s.hovered ? LERP : LERP_RETURN
      s.currentX += (s.targetX - s.currentX) * lerp
      s.currentY += (s.targetY - s.currentY) * lerp

      // Snap to zero when close enough (avoid infinite micro-updates)
      if (Math.abs(s.currentX) < 0.01 && Math.abs(s.currentY) < 0.01 && !s.hovered) {
        s.currentX = 0
        s.currentY = 0
      }

      const scale = s.hovered ? 1.02 : 1
      if (innerRef.current) {
        innerRef.current.style.transform =
          `rotateX(${s.currentX}deg) rotateY(${s.currentY}deg) scale(${scale})`
      }

      rafRef.current = requestAnimationFrame(tick)
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [])

  function handleMouseMove(e: React.MouseEvent) {
    const el = wrapperRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const x = (e.clientX - rect.left) / rect.width
    const y = (e.clientY - rect.top) / rect.height
    tiltState.current.targetX = (y - 0.5) * -14
    tiltState.current.targetY = (x - 0.5) * 14
  }

  function handleMouseEnter() {
    tiltState.current.hovered = true
    // Aura: toggle CSS class instead of React state
    auraRef.current?.classList.add('aura-active')
    // Shadow on inner card
    if (innerRef.current) {
      innerRef.current.style.boxShadow =
        `0 20px 60px rgba(0,0,0,0.2), 0 0 0 1px rgba(99,102,241,0.15), 0 0 40px ${dominantColor}30`
    }
  }

  function handleMouseLeave() {
    tiltState.current.hovered = false
    tiltState.current.targetX = 0
    tiltState.current.targetY = 0
    auraRef.current?.classList.remove('aura-active')
    if (innerRef.current) {
      innerRef.current.style.boxShadow =
        '0 4px 24px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.06)'
    }
  }

  const heightClass = getCardHeightClass(card.id)

  return (
    <div
      ref={wrapperRef}
      className={`masonry-card mb-5 break-inside-avoid transition-opacity duration-500 ${
        revealed ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
      }`}
      style={{
        perspective: '800px',
        transitionDelay: revealed ? '0ms' : `${(index % 6) * 80}ms`,
      }}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Color aura glow — CSS-transitioned, toggled via class */}
      <div
        ref={auraRef}
        className="tilt-aura absolute inset-0 -z-10 rounded-2xl"
        style={{ background: dominantColor }}
      />

      {/* Main card with 3D tilt — transform applied directly via ref */}
      <div
        ref={innerRef}
        className="tilt-inner relative rounded-2xl overflow-hidden border border-surface-border bg-surface cursor-pointer group"
        style={{
          boxShadow: '0 4px 24px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.06)',
        }}
      >
        {/* Image — variable height for masonry */}
        <div className={`relative ${heightClass} overflow-hidden`} onClick={onDetail}>
          <img
            src={card.imageDataUrl}
            alt={card.name}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />

          {/* Favorite badge */}
          {card.favorited && (
            <div className="absolute top-2.5 right-2.5 z-10">
              <svg className="w-5 h-5 text-accent-rose drop-shadow" fill="currentColor" viewBox="0 0 24 24">
                <path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" />
              </svg>
            </div>
          )}

          {/* Gradient overlay for bottom text legibility */}
          <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/60 via-black/20 to-transparent pointer-events-none" />
        </div>

        {/* Static color strip — always visible, thin accent line */}
        <div className="flex h-1">
          {card.colors.map((color, i) => (
            <div key={i} className="flex-1" style={{ backgroundColor: color.hex }} />
          ))}
        </div>

        {/* Card body */}
        <div className="p-3.5">
          <InlineNameEditor
            value={card.name}
            onSave={(name: string) => onRename(card.id, name)}
            className="text-sm font-semibold text-primary block mb-2.5"
          />

          <div className="flex items-center gap-1.5">
            <button
              onClick={e => { e.stopPropagation(); onFavorite() }}
              className="transition-transform hover:scale-125 active:scale-110 mr-0.5 cursor-pointer"
              title={card.favorited ? 'Remove from favorites' : 'Add to favorites'}
            >
              {card.favorited ? (
                <svg className="w-4.5 h-4.5 text-accent-rose" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" />
                </svg>
              ) : (
                <svg className="w-4.5 h-4.5 text-muted hover:text-accent-rose transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
                </svg>
              )}
            </button>
            <button
              onClick={e => { e.stopPropagation(); onExportPng() }}
              className="px-2 py-0.5 text-muted hover:text-primary bg-surface-raised hover:bg-surface-overlay text-[11px] rounded-lg transition-all border border-surface-border cursor-pointer"
            >
              PNG
            </button>
            <button
              onClick={e => { e.stopPropagation(); onExportCode() }}
              className="px-2 py-0.5 text-muted hover:text-primary bg-surface-raised hover:bg-surface-overlay text-[11px] rounded-lg transition-all border border-surface-border font-mono cursor-pointer"
            >
              {'</>'}
            </button>
            <button
              onClick={e => { e.stopPropagation(); onDelete() }}
              className="ml-auto p-1 text-faint hover:text-accent-rose opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
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
    </div>
  )
}

/* ── MasonryGrid: the main export ──────────────────────────────────── */
export default function MasonryGrid({ cards, onFavorite, onDelete, onRename }: Props) {
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

      {/* CSS Columns masonry layout */}
      <div className="masonry-grid columns-1 sm:columns-2 lg:columns-3 gap-5">
        {cards.map((card, i) => (
          <TiltCard
            key={card.id}
            card={card}
            index={i}
            onFavorite={() => onFavorite(card.id)}
            onDelete={() => setConfirmId(card.id)}
            onRename={onRename}
            onExportPng={() => exportCardAsPng(card)}
            onExportCode={() => setExportCodeId(card.id)}
            onDetail={() => setDetailCardId(card.id)}
          />
        ))}
      </div>
    </>
  )
}
