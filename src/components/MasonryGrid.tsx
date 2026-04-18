// src/components/MasonryGrid.tsx
import { useState, useRef, useEffect, useCallback, memo, useMemo } from 'react'
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

/* ── Module-level set: tracks card IDs that have already played their entrance
     animation this session. Survives component unmount/remount so switching
     between Masonry/Grid/3D views doesn't replay the fade-in every time. ── */
const revealedCardIds = new Set<string>()

/* ── Base64 → Blob URL cache: avoids decoding the same base64 on every render.
     The browser can load blob URLs asynchronously off the main thread. ── */
const blobUrlCache = new Map<string, string>()

function getBlobUrl(dataUrl: string, cardId: string): string {
  const cached = blobUrlCache.get(cardId)
  if (cached) return cached

  // Convert base64 data URL to a Blob URL (decoded off main thread by browser)
  try {
    const [meta, base64] = dataUrl.split(',')
    const mime = meta.match(/:(.*?);/)?.[1] ?? 'image/jpeg'
    const binary = atob(base64)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
    const blob = new Blob([bytes], { type: mime })
    const url = URL.createObjectURL(blob)
    blobUrlCache.set(cardId, url)
    return url
  } catch {
    // Fallback to original data URL if conversion fails
    return dataUrl
  }
}

/* ── Stable stagger index from card ID — avoids depending on array position ── */
function staggerFromId(id: string): number {
  let h = 0
  for (let i = 0; i < id.length; i++) h = ((h << 5) - h + id.charCodeAt(i)) | 0
  return (Math.abs(h) % 6) * 80
}

/* ── TiltCard: 3D perspective + color aura, hover overlay ──────────── */
const TiltCard = memo(function TiltCard({
  card,
  onFavorite,
  onDelete,
  onRename,
  onExportPng,
  onExportCode,
  onDetail,
  observerRef,
}: {
  card: ColorCard
  onFavorite: () => void
  onDelete: () => void
  onRename: (id: string, name: string) => void
  onExportPng: () => void
  onExportCode: () => void
  onDetail: () => void
  observerRef: React.MutableRefObject<IntersectionObserver | null>
}) {
  const wrapperRef = useRef<HTMLDivElement>(null)
  const innerRef = useRef<HTMLDivElement>(null)
  const auraRef = useRef<HTMLDivElement>(null)
  const rafRef = useRef<number>(0)

  // Tilt state kept outside React — never triggers re-renders
  const tiltState = useRef({ targetX: 0, targetY: 0, currentX: 0, currentY: 0, hovered: false })

  // If this card has already been revealed in this session, start visible immediately
  const [revealed, setRevealed] = useState(() => revealedCardIds.has(card.id))

  // Dominant color = first extracted color
  const dominantColor = card.colors[0]?.hex ?? '#6366f1'

  // Stagger delay derived from card ID (stable across tab switches)
  const staggerDelay = useMemo(() => staggerFromId(card.id), [card.id])

  // Convert base64 data URL to blob URL (cached, avoids main-thread decode)
  const imgSrc = useMemo(() => getBlobUrl(card.imageDataUrl, card.id), [card.imageDataUrl, card.id])

  // Register with the shared IntersectionObserver (only if not yet revealed)
  useEffect(() => {
    const el = wrapperRef.current
    if (!el || revealed) return
    const observer = observerRef.current
    if (!observer) return
    // Store the reveal callback on the element so the shared observer can call it
    ;(el as any).__onReveal = () => {
      setTimeout(() => {
        setRevealed(true)
        revealedCardIds.add(card.id)
      }, staggerDelay)
    }
    observer.observe(el)
    return () => {
      observer.unobserve(el)
      delete (el as any).__onReveal
    }
  }, [card.id, staggerDelay, revealed, observerRef])

  // rAF tilt loop — only runs while hovered, stops when idle
  const startTiltLoop = useCallback(() => {
    const LERP = 0.12
    const LERP_RETURN = 0.08

    function tick() {
      const s = tiltState.current
      const lerp = s.hovered ? LERP : LERP_RETURN
      s.currentX += (s.targetX - s.currentX) * lerp
      s.currentY += (s.targetY - s.currentY) * lerp

      const scale = s.hovered ? 1.02 : 1
      if (innerRef.current) {
        innerRef.current.style.transform =
          `rotateX(${s.currentX}deg) rotateY(${s.currentY}deg) scale(${scale})`
      }

      // Stop the loop once tilt has returned to zero and mouse has left
      if (!s.hovered && Math.abs(s.currentX) < 0.01 && Math.abs(s.currentY) < 0.01) {
        s.currentX = 0
        s.currentY = 0
        if (innerRef.current) {
          innerRef.current.style.transform = ''
        }
        rafRef.current = 0
        return
      }

      rafRef.current = requestAnimationFrame(tick)
    }

    if (!rafRef.current) {
      rafRef.current = requestAnimationFrame(tick)
    }
  }, [])

  // Cleanup rAF on unmount
  useEffect(() => {
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
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
    startTiltLoop()
    auraRef.current?.classList.add('aura-active')
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

  return (
    <div
      ref={wrapperRef}
      className={`masonry-card mb-5 transition-opacity duration-500 ${
        revealed ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
      }`}
      style={{
        perspective: '800px',
        transitionDelay: revealed ? '0ms' : `${staggerDelay}ms`,
      }}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Color aura glow */}
      <div
        ref={auraRef}
        className="tilt-aura absolute inset-0 -z-10"
        style={{ background: dominantColor }}
      />

      {/* Main card — no border-radius */}
      <div
        ref={innerRef}
        className="tilt-inner relative overflow-hidden border border-surface-border bg-surface cursor-pointer group"
        style={{
          boxShadow: '0 4px 24px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.06)',
        }}
      >
        {/* Image at natural aspect ratio — overflow-hidden scoped here so scale doesn't push color strip */}
        <div className="relative overflow-hidden" onClick={onDetail}>
          <img
            src={imgSrc}
            alt={card.name}
            className="w-full h-auto block transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
            decoding="async"
          />

          {/* Subtle bottom scrim for text legibility on pale images */}
          <div className="absolute inset-x-0 bottom-0 h-1/3 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
            style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.35), transparent)' }}
          />

          {/* Name + actions on hover */}
          <div className="absolute inset-x-0 bottom-0 p-3.5 opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-300">
            <InlineNameEditor
              value={card.name}
              onSave={(name: string) => onRename(card.id, name)}
              className="text-sm font-semibold text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)] block mb-2"
            />

            <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
              <button
                onClick={onFavorite}
                className="transition-transform hover:scale-125 active:scale-110 mr-0.5 cursor-pointer rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
                title={card.favorited ? 'Remove from favorites' : 'Add to favorites'}
              >
                {card.favorited ? (
                  <svg className="w-[18px] h-[18px] text-accent-rose drop-shadow" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" />
                  </svg>
                ) : (
                  <svg className="w-[18px] h-[18px] text-white/70 hover:text-accent-rose transition-colors drop-shadow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
                  </svg>
                )}
              </button>
              <button
                onClick={onExportPng}
                className="px-2 py-0.5 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 text-[11px] rounded-lg transition-all backdrop-blur-sm cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
              >
                PNG
              </button>
              <button
                onClick={onExportCode}
                className="px-2 py-0.5 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 text-[11px] rounded-lg transition-all backdrop-blur-sm font-mono cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
              >
                {'</>'}
              </button>
              <button
                onClick={onDelete}
                className="ml-auto p-1 text-white/50 hover:text-accent-rose transition-all cursor-pointer rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
                title="Delete"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          </div>

          {/* Favorite badge — always visible when favorited, hides on hover */}
          {card.favorited && (
            <div className="absolute top-2.5 right-2.5 z-10 group-hover:opacity-0 transition-opacity duration-300">
              <svg className="w-5 h-5 text-accent-rose drop-shadow" fill="currentColor" viewBox="0 0 24 24">
                <path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" />
              </svg>
            </div>
          )}
        </div>

        {/* Color strip */}
        <div className="flex h-1.5">
          {card.colors.map((color, i) => (
            <div key={i} className="flex-1" style={{ backgroundColor: color.hex }} />
          ))}
        </div>
      </div>
    </div>
  )
})

/* ── MasonryGrid: the main export ──────────────────────────────────── */
export default function MasonryGrid({ cards, onFavorite, onDelete, onRename }: Props) {
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [exportCodeId, setExportCodeId] = useState<string | null>(null)
  const [detailCardId, setDetailCardId] = useState<string | null>(null)

  // Single shared IntersectionObserver for all TiltCards (instead of N observers).
  // Created eagerly (not in useEffect) so it's available when child effects run —
  // React fires child effects before parent effects, so a parent useEffect would
  // still be null when TiltCard effects try to register.
  const observerRef = useRef<IntersectionObserver | null>(null)
  if (!observerRef.current) {
    observerRef.current = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            ;(entry.target as any).__onReveal?.()
            observerRef.current?.unobserve(entry.target)
          }
        }
      },
      { threshold: 0.01, rootMargin: '100px 0px' }
    )
  }

  // Cleanup on unmount — disconnect but do NOT null the ref.
  // React 19 StrictMode double-invokes effects: cleanup runs then children
  // re-mount and need the observer to still be available.
  useEffect(() => {
    return () => {
      observerRef.current?.disconnect()
    }
  }, [])

  const exportingCard = exportCodeId ? cards.find(c => c.id === exportCodeId) : null
  const detailCard = detailCardId ? cards.find(c => c.id === detailCardId) : null

  // Per-card stable callbacks — critical for React.memo on TiltCard to work
  const cardCallbacks = useMemo(() => {
    const map = new Map<string, {
      onFavorite: () => void
      onDelete: () => void
      onExportPng: () => void
      onExportCode: () => void
      onDetail: () => void
    }>()
    for (const card of cards) {
      map.set(card.id, {
        onFavorite: () => onFavorite(card.id),
        onDelete: () => setConfirmId(card.id),
        onExportPng: () => exportCardAsPng(card),
        onExportCode: () => setExportCodeId(card.id),
        onDetail: () => setDetailCardId(card.id),
      })
    }
    return map
  }, [cards, onFavorite])

  if (cards.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-center">
        <div className="w-16 h-16 bg-surface-raised flex items-center justify-center mb-4">
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
      <div className="masonry-grid columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-5">
        {cards.map((card) => {
          const cbs = cardCallbacks.get(card.id)
          return (
            <TiltCard
              key={card.id}
              card={card}
              onFavorite={cbs!.onFavorite}
              onDelete={cbs!.onDelete}
              onRename={onRename}
              onExportPng={cbs!.onExportPng}
              onExportCode={cbs!.onExportCode}
              onDetail={cbs!.onDetail}
              observerRef={observerRef}
            />
          )
        })}
      </div>
    </>
  )
}
