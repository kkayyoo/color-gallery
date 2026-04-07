import { useEffect, useRef, useCallback } from 'react'
import * as THREE from 'three'
import type { ColorCard } from '../types'

interface Props {
  cards: ColorCard[]
}

const CARD_W = 2.4
const CARD_H = 3.2
const RADIUS = 6
const PALETTE_H_RATIO = 0.22 // top 22% of card = palette strip

async function buildCardTexture(card: ColorCard): Promise<THREE.CanvasTexture> {
  const W = 480
  const H = 640
  const paletteH = Math.round(H * PALETTE_H_RATIO)
  const imageH = H - paletteH

  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')!

  // Palette strip (5 equal columns)
  const swatchW = W / 5
  card.colors.forEach((color, i) => {
    ctx.fillStyle = color.hex
    ctx.fillRect(i * swatchW, 0, swatchW, paletteH)
    // Name label
    const lum = parseInt(color.hex.slice(1, 3), 16) * 0.299 +
                parseInt(color.hex.slice(3, 5), 16) * 0.587 +
                parseInt(color.hex.slice(5, 7), 16) * 0.114
    ctx.fillStyle = lum > 128 ? '#000000' : '#ffffff'
    ctx.font = `bold ${Math.round(W * 0.028)}px sans-serif`
    ctx.textAlign = 'center'
    ctx.fillText(color.name, i * swatchW + swatchW / 2, paletteH - 8, swatchW - 8)
  })

  // Image
  const img = new Image()
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve()
    img.onerror = reject
    img.src = card.imageDataUrl
  })

  // Cover-fit image into the lower portion
  const scale = Math.max(W / img.width, imageH / img.height)
  const sw = W / scale
  const sh = imageH / scale
  const sx = (img.width - sw) / 2
  const sy = (img.height - sh) / 2
  ctx.drawImage(img, sx, sy, sw, sh, 0, paletteH, W, imageH)

  return new THREE.CanvasTexture(canvas)
}

export default function CarouselView({ cards }: Props) {
  const mountRef = useRef<HTMLDivElement>(null)
  const stateRef = useRef({
    activeIndex: 0,
    targetAngle: 0,
    currentAngle: 0,
    dragging: false,
    lastX: 0,
  })

  const init = useCallback(async () => {
    const mount = mountRef.current
    if (!mount || cards.length === 0) return

    const W = mount.clientWidth
    const H = mount.clientHeight

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setSize(W, H)
    renderer.setPixelRatio(window.devicePixelRatio)
    mount.appendChild(renderer.domElement)

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(50, W / H, 0.1, 100)
    camera.position.z = 8

    // Build card meshes
    const textures = await Promise.all(cards.map(buildCardTexture))
    const meshes: THREE.Mesh[] = textures.map(tex => {
      const geo = new THREE.PlaneGeometry(CARD_W, CARD_H)
      const mat = new THREE.MeshBasicMaterial({ map: tex, side: THREE.FrontSide })
      return new THREE.Mesh(geo, mat)
    })

    const group = new THREE.Group()
    scene.add(group)

    function positionCards() {
      const n = cards.length
      const TWO_PI = 2 * Math.PI
      meshes.forEach((mesh, i) => {
        const angle = (TWO_PI * i) / n - stateRef.current.currentAngle
        mesh.position.x = Math.sin(angle) * RADIUS
        mesh.position.z = Math.cos(angle) * RADIUS - RADIUS
        mesh.rotation.y = angle
        // Scale active card
        const dist = ((angle % TWO_PI) + TWO_PI) % TWO_PI
        const isActive = dist < 0.3 || dist > TWO_PI - 0.3
        const scale = isActive ? 1.15 : 0.85
        mesh.scale.setScalar(scale)
      })
    }

    meshes.forEach(mesh => group.add(mesh))
    positionCards()

    let animId: number
    function animate() {
      animId = requestAnimationFrame(animate)
      // Smooth lerp towards target
      stateRef.current.currentAngle +=
        (stateRef.current.targetAngle - stateRef.current.currentAngle) * 0.08
      positionCards()
      renderer.render(scene, camera)
    }
    animate()

    function handleResize() {
      const w = mount!.clientWidth
      const h = mount!.clientHeight
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      renderer.setSize(w, h)
    }
    window.addEventListener('resize', handleResize)

    // Mouse/touch drag
    function onPointerDown(e: PointerEvent) {
      stateRef.current.dragging = true
      stateRef.current.lastX = e.clientX
    }
    function onPointerMove(e: PointerEvent) {
      if (!stateRef.current.dragging) return
      const dx = e.clientX - stateRef.current.lastX
      stateRef.current.lastX = e.clientX
      stateRef.current.targetAngle -= dx * 0.008
    }
    function onPointerUp() { stateRef.current.dragging = false }

    renderer.domElement.addEventListener('pointerdown', onPointerDown)
    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)

    // Click to center a card (raycasting)
    const raycaster = new THREE.Raycaster()
    const mouse = new THREE.Vector2()
    function onClick(e: MouseEvent) {
      if (Math.abs(e.clientX - stateRef.current.lastX) > 4) return // was a drag
      const rect = renderer.domElement.getBoundingClientRect()
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1
      raycaster.setFromCamera(mouse, camera)
      const hits = raycaster.intersectObjects(meshes)
      if (hits.length > 0) {
        const idx = meshes.indexOf(hits[0].object as THREE.Mesh)
        if (idx !== -1) {
          const step = (2 * Math.PI) / cards.length
          stateRef.current.targetAngle = step * idx
        }
      }
    }
    renderer.domElement.addEventListener('click', onClick)

    // Cleanup
    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', onPointerUp)
      renderer.domElement.removeEventListener('pointerdown', onPointerDown)
      renderer.domElement.removeEventListener('click', onClick)
      textures.forEach(t => t.dispose())
      meshes.forEach(m => {
        m.geometry.dispose() ;
        (m.material as THREE.MeshBasicMaterial).dispose()
      })
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

  function rotate(dir: -1 | 1) {
    const step = (2 * Math.PI) / Math.max(cards.length, 1)
    stateRef.current.targetAngle += dir * step
  }

  return (
    <div className="relative w-full h-full">
      <div ref={mountRef} className="w-full h-full" />
      {/* Arrow controls */}
      <button
        onClick={() => rotate(-1)}
        aria-label="Previous card"
        className="absolute left-4 top-1/2 -translate-y-1/2 p-3 bg-gray-900/80 hover:bg-gray-800 text-white rounded-full transition-colors z-10 cursor-pointer"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.75 19.5L8.25 12l7.5-7.5" />
        </svg>
      </button>
      <button
        onClick={() => rotate(1)}
        aria-label="Next card"
        className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-gray-900/80 hover:bg-gray-800 text-white rounded-full transition-colors z-10 cursor-pointer"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.25 4.5l7.5 7.5-7.5 7.5" />
        </svg>
      </button>
    </div>
  )
}
