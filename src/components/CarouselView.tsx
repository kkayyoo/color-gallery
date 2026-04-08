// src/components/CarouselView.tsx — Cinematic poster carousel
import { useEffect, useRef, useCallback, useState } from 'react'
import * as THREE from 'three'
import type { ColorCard } from '../types'
import { copyToClipboard } from '../lib/clipboard'

interface Props {
  cards: ColorCard[]
}

/* ── Constants ────────────────────────────────────────────────────── */
const CARD_AREA = 9.0       // target visual area in world units (w*h ≈ 9)
const GAP = 3.4             // horizontal spacing between card centers

/* ── Result from texture build — includes aspect ratio ───────────── */
interface CardTextures {
  poster: THREE.CanvasTexture
  reflection: THREE.CanvasTexture
  aspect: number  // width / height of the natural image
}

/* ── Load image helper ───────────────────────────────────────────── */
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

/* ── Build poster + reflection textures, preserving aspect ratio ─── */
async function buildCardTextures(card: ColorCard): Promise<CardTextures> {
  const img = await loadImage(card.imageDataUrl)
  const aspect = img.naturalWidth / img.naturalHeight

  // Canvas sized to the image's natural aspect, capped at 720px on the long side
  const MAX = 720
  let W: number, H: number
  if (aspect >= 1) {
    // Landscape or square
    W = MAX
    H = Math.round(MAX / aspect)
  } else {
    // Portrait
    H = MAX
    W = Math.round(MAX * aspect)
  }

  /* ── Poster texture ─────────────────────── */
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')!

  // Rounded-rect clip
  const r = Math.round(Math.min(W, H) * 0.035)
  ctx.beginPath()
  ctx.moveTo(r, 0)
  ctx.lineTo(W - r, 0)
  ctx.quadraticCurveTo(W, 0, W, r)
  ctx.lineTo(W, H - r)
  ctx.quadraticCurveTo(W, H, W - r, H)
  ctx.lineTo(r, H)
  ctx.quadraticCurveTo(0, H, 0, H - r)
  ctx.lineTo(0, r)
  ctx.quadraticCurveTo(0, 0, r, 0)
  ctx.closePath()
  ctx.clip()

  // Draw image at native aspect — no cropping
  ctx.drawImage(img, 0, 0, W, H)

  // Bottom bar — gradient for title + palette
  const barH = Math.round(H * 0.15)
  const barY = H - barH
  const barGrad = ctx.createLinearGradient(0, barY - Math.round(barH * 0.3), 0, H)
  barGrad.addColorStop(0, 'rgba(0,0,0,0)')
  barGrad.addColorStop(0.3, 'rgba(0,0,0,0.55)')
  barGrad.addColorStop(1, 'rgba(0,0,0,0.8)')
  ctx.fillStyle = barGrad
  ctx.fillRect(0, barY - Math.round(barH * 0.3), W, barH + Math.round(barH * 0.3))

  // Title
  const fontSize = Math.round(Math.min(W, H) * 0.042)
  ctx.fillStyle = 'rgba(255,255,255,0.95)'
  ctx.font = `bold ${fontSize}px "DM Sans", sans-serif`
  ctx.textAlign = 'left'
  const maxTitleChars = Math.floor(W / (fontSize * 0.55))
  const titleText = card.name.length > maxTitleChars
    ? card.name.slice(0, maxTitleChars - 2) + '...'
    : card.name
  ctx.fillText(titleText, Math.round(W * 0.04), barY + Math.round(barH * 0.38), W - Math.round(W * 0.08))

  // Color palette dots
  const dotR = Math.round(Math.min(W, H) * 0.016)
  const dotY = barY + Math.round(barH * 0.72)
  const dotSpacing = Math.round(dotR * 3)
  const dotStartX = Math.round(W * 0.04)
  card.colors.forEach((color, i) => {
    ctx.beginPath()
    ctx.arc(dotStartX + i * dotSpacing + dotR, dotY, dotR, 0, Math.PI * 2)
    ctx.fillStyle = color.hex
    ctx.fill()
    ctx.strokeStyle = 'rgba(255,255,255,0.3)'
    ctx.lineWidth = 1.5
    ctx.stroke()
  })

  // Date label
  ctx.fillStyle = 'rgba(255,255,255,0.4)'
  ctx.font = `${Math.round(fontSize * 0.55)}px "JetBrains Mono", monospace`
  ctx.textAlign = 'right'
  ctx.fillText(
    new Date(card.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    W - Math.round(W * 0.04),
    barY + Math.round(barH * 0.38),
  )

  const poster = new THREE.CanvasTexture(canvas)
  poster.colorSpace = THREE.SRGBColorSpace

  /* ── Reflection texture ─────────────────── */
  const rCanvas = document.createElement('canvas')
  rCanvas.width = W
  rCanvas.height = H
  const rCtx = rCanvas.getContext('2d')!

  // Draw flipped image
  rCtx.translate(0, H)
  rCtx.scale(1, -1)
  rCtx.drawImage(img, 0, 0, W, H)
  rCtx.setTransform(1, 0, 0, 1, 0, 0)

  // Fade-out
  const fadeGrad = rCtx.createLinearGradient(0, 0, 0, H)
  fadeGrad.addColorStop(0, 'rgba(0,0,0,0)')
  fadeGrad.addColorStop(0.35, 'rgba(0,0,0,0.7)')
  fadeGrad.addColorStop(1, 'rgba(0,0,0,1)')
  rCtx.globalCompositeOperation = 'destination-out'
  rCtx.fillStyle = fadeGrad
  rCtx.fillRect(0, 0, W, H)

  const reflection = new THREE.CanvasTexture(rCanvas)
  reflection.colorSpace = THREE.SRGBColorSpace

  return { poster, reflection, aspect }
}

/* ── Utility: perceived luminance ─────────────────────────────────── */
function hexLuminance(hex: string): number {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255
}

/* ── Component ────────────────────────────────────────────────────── */
export default function CarouselView({ cards }: Props) {
  const mountRef = useRef<HTMLDivElement>(null)
  const [activeIndex, setActiveIndex] = useState(0)
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null)

  const stateRef = useRef({
    activeIndex: 0,
    targetX: 0,
    currentX: 0,
    dragging: false,
    lastPointerX: 0,
    pointerDownX: 0,
  })

  // Keep activeIndex in sync
  const activeCard = cards[activeIndex] ?? null

  const init = useCallback(async () => {
    const mount = mountRef.current
    if (!mount || cards.length === 0) return

    const W = mount.clientWidth
    const H = mount.clientHeight

    /* ── Renderer ───────────────────────────── */
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setSize(W, H)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.toneMapping = THREE.NoToneMapping
    renderer.outputColorSpace = THREE.SRGBColorSpace
    mount.appendChild(renderer.domElement)

    /* ── Scene + Camera ─────────────────────── */
    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(45, W / H, 0.1, 100)
    camera.position.set(0, 0.6, 7)
    camera.lookAt(0, 0.2, 0)

    /* ── Build card meshes (per-card aspect ratio) ── */
    const cardData = await Promise.all(cards.map(buildCardTextures))

    const meshes: THREE.Mesh[] = []
    const reflMeshes: THREE.Mesh[] = []
    // Store per-card world dimensions for positioning
    const cardDims: { w: number; h: number }[] = []

    cardData.forEach(({ poster, reflection, aspect }) => {
      // Size each card so its area ≈ CARD_AREA but preserves natural aspect
      const h = Math.sqrt(CARD_AREA / aspect)
      const w = h * aspect
      cardDims.push({ w, h })

      // Main card
      const geo = new THREE.PlaneGeometry(w, h)
      const mat = new THREE.MeshBasicMaterial({
        map: poster,
        side: THREE.FrontSide,
        transparent: true,
      })
      const mesh = new THREE.Mesh(geo, mat)
      meshes.push(mesh)
      scene.add(mesh)

      // Reflection below
      const reflGeo = new THREE.PlaneGeometry(w, h * 0.4)
      const reflMat = new THREE.MeshBasicMaterial({
        map: reflection,
        transparent: true,
        opacity: 0.15,
        side: THREE.FrontSide,
        depthWrite: false,
      })
      const reflMesh = new THREE.Mesh(reflGeo, reflMat)
      reflMeshes.push(reflMesh)
      scene.add(reflMesh)
    })

    /* ── Floor (subtle dark plane for grounding) ── */
    // Use the tallest card height to position the floor
    const maxCardH = Math.max(...cardDims.map(d => d.h))
    const floorGeo = new THREE.PlaneGeometry(40, 15)
    const floorMat = new THREE.MeshBasicMaterial({
      color: 0x0a0a14,
      transparent: true,
      opacity: 0.3,
    })
    const floor = new THREE.Mesh(floorGeo, floorMat)
    floor.rotation.x = -Math.PI / 2
    floor.position.y = -maxCardH / 2 - 0.02
    scene.add(floor)

    /* ── Position cards in coverflow arc ─────── */
    function positionCards() {
      const s = stateRef.current

      meshes.forEach((mesh, i) => {
        const offset = i * GAP - s.currentX
        // Coverflow: center card faces forward, side cards angle away
        const angle = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, offset * 0.25))
        const z = -Math.abs(offset) * 0.35 // push back non-center cards
        const y = 0

        mesh.position.set(offset, y, z)
        mesh.rotation.y = -angle

        // Depth fade — cards further from center fade out
        const distFromCenter = Math.abs(offset) / GAP
        const mat = mesh.material as THREE.MeshBasicMaterial
        mat.opacity = Math.max(0.15, 1.0 - distFromCenter * 0.3)

        // Slight scale variation
        const sc = Math.max(0.7, 1.0 - distFromCenter * 0.08)
        mesh.scale.set(sc, sc, 1)

        // Reflection
        const reflMesh = reflMeshes[i]
        const dim = cardDims[i]
        reflMesh.position.set(offset, -dim.h / 2 - (dim.h * 0.4) / 2 * sc - 0.02, z)
        reflMesh.rotation.y = -angle
        reflMesh.scale.set(sc, sc, 1)
        const reflMat = reflMesh.material as THREE.MeshBasicMaterial
        reflMat.opacity = Math.max(0, 0.12 - distFromCenter * 0.04)
      })

      // Determine active index
      const rawIdx = Math.round(s.currentX / GAP)
      const clamped = Math.max(0, Math.min(cards.length - 1, rawIdx))
      if (clamped !== s.activeIndex) {
        s.activeIndex = clamped
        setActiveIndex(clamped)
      }
    }

    positionCards()

    /* ── Animation loop ─────────────────────── */
    let animId: number
    function animate() {
      animId = requestAnimationFrame(animate)
      const s = stateRef.current
      s.currentX += (s.targetX - s.currentX) * 0.1
      positionCards()
      renderer.render(scene, camera)
    }
    animate()

    /* ── Resize ──────────────────────────────── */
    function handleResize() {
      const w = mount!.clientWidth
      const h = mount!.clientHeight
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      renderer.setSize(w, h)
    }
    window.addEventListener('resize', handleResize)

    /* ── Pointer interaction ─────────────────── */
    function onPointerDown(e: PointerEvent) {
      stateRef.current.dragging = true
      stateRef.current.lastPointerX = e.clientX
      stateRef.current.pointerDownX = e.clientX
    }
    function onPointerMove(e: PointerEvent) {
      if (!stateRef.current.dragging) return
      const dx = e.clientX - stateRef.current.lastPointerX
      stateRef.current.lastPointerX = e.clientX
      stateRef.current.targetX -= dx * 0.012
    }
    function onPointerUp() {
      stateRef.current.dragging = false
      // Snap to nearest card
      const nearest = Math.round(stateRef.current.targetX / GAP)
      const clamped = Math.max(0, Math.min(cards.length - 1, nearest))
      stateRef.current.targetX = clamped * GAP
    }

    renderer.domElement.addEventListener('pointerdown', onPointerDown)
    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)

    /* ── Click on card ───────────────────────── */
    const raycaster = new THREE.Raycaster()
    const mouse = new THREE.Vector2()
    function onClick(e: MouseEvent) {
      // Ignore drags
      if (Math.abs(e.clientX - stateRef.current.pointerDownX) > 6) return
      const rect = renderer.domElement.getBoundingClientRect()
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1
      raycaster.setFromCamera(mouse, camera)
      const hits = raycaster.intersectObjects(meshes)
      if (hits.length > 0) {
        const idx = meshes.indexOf(hits[0].object as THREE.Mesh)
        if (idx !== -1) {
          stateRef.current.targetX = idx * GAP
        }
      }
    }
    renderer.domElement.addEventListener('click', onClick)

    /* ── Keyboard nav ────────────────────────── */
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'ArrowLeft') {
        const prev = Math.max(0, stateRef.current.activeIndex - 1)
        stateRef.current.targetX = prev * GAP
      } else if (e.key === 'ArrowRight') {
        const next = Math.min(cards.length - 1, stateRef.current.activeIndex + 1)
        stateRef.current.targetX = next * GAP
      }
    }
    window.addEventListener('keydown', onKeyDown)

    /* ── Cleanup ─────────────────────────────── */
    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', onPointerUp)
      window.removeEventListener('keydown', onKeyDown)
      renderer.domElement.removeEventListener('pointerdown', onPointerDown)
      renderer.domElement.removeEventListener('click', onClick)
      cardData.forEach(d => {
        d.poster.dispose()
        d.reflection.dispose()
      })
      meshes.forEach(m => {
        m.geometry.dispose()
        ;(m.material as THREE.MeshBasicMaterial).dispose()
      })
      reflMeshes.forEach(m => {
        m.geometry.dispose()
        ;(m.material as THREE.MeshBasicMaterial).dispose()
      })
      floorGeo.dispose()
      floorMat.dispose()
      renderer.dispose()
      mount.removeChild(renderer.domElement)
    }
  }, [cards])

  useEffect(() => {
    let cancelled = false
    let cleanup: (() => void) | undefined
    init().then(fn => {
      if (cancelled) { fn?.(); return }
      cleanup = fn
    })
    return () => { cancelled = true; cleanup?.() }
  }, [init])

  /* ── Navigate ──────────────────────────────── */
  function goTo(dir: -1 | 1) {
    const n = cards.length
    const next = Math.max(0, Math.min(n - 1, stateRef.current.activeIndex + dir))
    stateRef.current.targetX = next * GAP
  }

  function handleSwatchCopy(hex: string, idx: number) {
    copyToClipboard(hex).then(() => {
      setCopiedIdx(idx)
      setTimeout(() => setCopiedIdx(null), 1200)
    }).catch(() => {})
  }

  return (
    <div className="relative w-full h-full flex flex-col">
      {/* 3D viewport */}
      <div ref={mountRef} className="w-full flex-1 min-h-0" />

      {/* Active card info panel */}
      {activeCard && (
        <div className="carousel-info-panel flex items-center gap-4 px-6 py-3 border-t border-surface-border">
          {/* Card name + date */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-primary truncate">{activeCard.name}</p>
            <p className="text-[11px] font-mono text-muted">
              {new Date(activeCard.createdAt).toLocaleDateString('en-US', {
                month: 'short', day: 'numeric', year: 'numeric',
              })}
            </p>
          </div>

          {/* Color swatches — clickable to copy */}
          <div className="flex items-center gap-1.5">
            {activeCard.colors.map((color, i) => (
              <button
                key={i}
                onClick={() => handleSwatchCopy(color.hex, i)}
                className="group/swatch relative w-7 h-7 rounded-full border-2 transition-transform hover:scale-110 active:scale-95 cursor-pointer"
                style={{
                  backgroundColor: color.hex,
                  borderColor: hexLuminance(color.hex) > 0.85 ? 'var(--surface-border-strong)' : 'transparent',
                }}
                title={`${color.name} ${color.hex}`}
              >
                {copiedIdx === i && (
                  <span
                    className="absolute -top-7 left-1/2 -translate-x-1/2 text-[9px] font-bold px-1.5 py-0.5 rounded bg-surface text-primary border border-surface-border whitespace-nowrap"
                  >
                    Copied
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Card counter */}
          <span className="text-xs font-mono text-faint tabular-nums">
            {activeIndex + 1} / {cards.length}
          </span>
        </div>
      )}

      {/* Navigation arrows */}
      <button
        onClick={() => goTo(-1)}
        aria-label="Previous card"
        className="absolute left-4 top-[calc(50%-24px)] -translate-y-1/2 p-2.5 bg-surface/70 hover:bg-surface-overlay/90 text-primary rounded-full transition-all z-10 cursor-pointer backdrop-blur-md border border-surface-border hover:scale-105 active:scale-95"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.75 19.5L8.25 12l7.5-7.5" />
        </svg>
      </button>
      <button
        onClick={() => goTo(1)}
        aria-label="Next card"
        className="absolute right-4 top-[calc(50%-24px)] -translate-y-1/2 p-2.5 bg-surface/70 hover:bg-surface-overlay/90 text-primary rounded-full transition-all z-10 cursor-pointer backdrop-blur-md border border-surface-border hover:scale-105 active:scale-95"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.25 4.5l7.5 7.5-7.5 7.5" />
        </svg>
      </button>
    </div>
  )
}
