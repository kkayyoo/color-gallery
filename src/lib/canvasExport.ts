import type { ColorCard } from '../types'

const CANVAS_WIDTH = 640
const CANVAS_HEIGHT = 320
const PADDING = 24
const IMAGE_WIDTH = 260
const SWATCH_SIZE = 32
const BG_COLOR = '#1a1a2e'
const TEXT_PRIMARY = '#ffffff'
const TEXT_SECONDARY = '#9ca3af'

function hexToContrastText(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  // WCAG luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return luminance > 0.5 ? '#000000' : '#ffffff'
}

export async function exportCardAsPng(card: ColorCard): Promise<void> {
  const canvas = document.createElement('canvas')
  canvas.width = CANVAS_WIDTH
  canvas.height = CANVAS_HEIGHT
  const ctx = canvas.getContext('2d')!

  // Background
  ctx.fillStyle = BG_COLOR
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)

  // Card name
  ctx.fillStyle = TEXT_PRIMARY
  ctx.font = 'bold 16px sans-serif'
  ctx.fillText(card.name, PADDING, PADDING + 14)

  // Image
  const img = new Image()
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve()
    img.onerror = reject
    img.src = card.imageDataUrl
  })

  const imgY = PADDING + 30
  const imgH = CANVAS_HEIGHT - imgY - PADDING
  ctx.drawImage(img, PADDING, imgY, IMAGE_WIDTH, imgH)

  // Swatches
  const swatchX = PADDING + IMAGE_WIDTH + PADDING
  const swatchAreaWidth = CANVAS_WIDTH - swatchX - PADDING
  const rowH = (CANVAS_HEIGHT - imgY - PADDING) / 5

  // swatchAreaWidth kept for readability — documents available horizontal space for swatches
  void swatchAreaWidth

  card.colors.forEach((color, i) => {
    const y = imgY + i * rowH

    // Color square
    ctx.fillStyle = color.hex
    ctx.beginPath()
    ctx.roundRect(swatchX, y + (rowH - SWATCH_SIZE) / 2, SWATCH_SIZE, SWATCH_SIZE, 4)
    ctx.fill()

    // Color name
    ctx.fillStyle = TEXT_PRIMARY
    ctx.font = 'bold 13px sans-serif'
    ctx.fillText(color.name, swatchX + SWATCH_SIZE + 10, y + rowH / 2 - 4)

    // HEX value
    ctx.fillStyle = TEXT_SECONDARY
    ctx.font = '11px monospace'
    ctx.fillText(color.hex, swatchX + SWATCH_SIZE + 10, y + rowH / 2 + 12)
  })

  // Download
  canvas.toBlob(blob => {
    if (!blob) return
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${card.name.replace(/\s+/g, '-')}.png`
    a.click()
    URL.revokeObjectURL(url)
  }, 'image/png')
}

// hexToContrastText is available for future use (e.g. text on swatch overlay)
export { hexToContrastText }
