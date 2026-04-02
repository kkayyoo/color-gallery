import type { ColorCard } from '../types'

const STORAGE_KEY = 'color-collection'
const SIZE_WARNING_BYTES = 4 * 1024 * 1024 // 4MB

function isValidColorEntry(entry: unknown): entry is import('../types').ColorEntry {
  if (typeof entry !== 'object' || entry === null) return false
  const e = entry as Record<string, unknown>
  return (
    typeof e.hex === 'string' &&
    typeof e.name === 'string' &&
    typeof e.r === 'number' &&
    typeof e.g === 'number' &&
    typeof e.b === 'number'
  )
}

function isValidColorCard(card: unknown): card is ColorCard {
  if (typeof card !== 'object' || card === null) return false
  const c = card as Record<string, unknown>
  // Check required fields
  const valid = (
    typeof c.id === 'string' &&
    typeof c.createdAt === 'number' &&
    typeof c.name === 'string' &&
    typeof c.imageDataUrl === 'string' &&
    Array.isArray(c.colors) &&
    c.colors.length === 5 &&
    (c.colors as unknown[]).every(isValidColorEntry) &&
    typeof c.favorited === 'boolean'
  )
  if (!valid) return false
  // Reject unexpected fields (security: no extra data sneaks in)
  const allowedKeys = new Set(['id', 'createdAt', 'name', 'imageDataUrl', 'colors', 'favorited'])
  return Object.keys(c).every(k => allowedKeys.has(k))
}

export function loadCards(): ColorCard[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(isValidColorCard)
  } catch {
    return []
  }
}

export function saveCards(cards: ColorCard[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cards))
}

export function isStorageNearLimit(): boolean {
  try {
    let total = 0
    for (const key of Object.keys(localStorage)) {
      total += (localStorage.getItem(key) ?? '').length * 2 // UTF-16
    }
    return total > SIZE_WARNING_BYTES
  } catch {
    return false
  }
}

export function validateImportPayload(data: unknown): ColorCard[] {
  if (!Array.isArray(data)) throw new Error('Invalid format: expected an array')
  const valid = data.filter(isValidColorCard)
  if (valid.length === 0 && data.length > 0) {
    throw new Error('No valid cards found in import file')
  }
  return valid
}
