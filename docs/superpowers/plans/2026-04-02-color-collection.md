# Color Collection Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a browser-based React app where users upload images, extract 5-color palettes, name and save color cards, and browse their collection in a grid or 3D carousel view.

**Architecture:** React + TypeScript + Vite + Tailwind CSS SPA with two routes (`/` and `/gallery`). No backend — all data stored in `localStorage`. Color extraction via `colorthief`, 3D carousel via `three.js`, color naming via The Color API with local fallback.

**Tech Stack:** React 18, TypeScript, Vite, Tailwind CSS v3, React Router v6, colorthief, three.js, @types/three

---

## File Map

| File | Responsibility |
|---|---|
| `src/types/index.ts` | `ColorEntry` and `ColorCard` interfaces |
| `src/lib/storage.ts` | localStorage read/write/validate helpers |
| `src/lib/imageResize.ts` | Resize image to max 800px via Canvas API |
| `src/lib/colorNaming.ts` | Color API fetch + local CSS-name fallback |
| `src/lib/canvasExport.ts` | Draw color card to offscreen canvas, download PNG |
| `src/hooks/useCollection.ts` | React state for collection, CRUD operations |
| `src/hooks/useColorExtraction.ts` | Orchestrates resize → extract → name lookup |
| `src/components/Nav.tsx` | Top navigation bar |
| `src/components/ImageUploader.tsx` | Drag & drop / click-to-upload with validation |
| `src/components/ColorPalette.tsx` | 5 color swatches with names and HEX |
| `src/components/InlineNameEditor.tsx` | Click-to-edit name field |
| `src/components/ColorCard.tsx` | Full card: image + swatches + name + actions |
| `src/components/ConfirmDialog.tsx` | Reusable confirm modal |
| `src/components/GridView.tsx` | 2-column gallery grid |
| `src/components/CarouselView.tsx` | Three.js 3D carousel |
| `src/pages/ExtractPage.tsx` | Upload + extract + save flow |
| `src/pages/GalleryPage.tsx` | Tabs + view toggle + gallery content |
| `src/App.tsx` | Router setup |
| `src/main.tsx` | App entry point |
| `index.html` | HTML shell |

---

## Task 1: Project Scaffold

**Files:**
- Create: `package.json`, `vite.config.ts`, `tsconfig.json`, `tailwind.config.js`, `postcss.config.js`, `index.html`, `src/main.tsx`, `src/App.tsx`, `src/index.css`

- [ ] **Step 1: Scaffold Vite + React + TypeScript project**

```bash
npm create vite@latest . -- --template react-ts
```

Expected: project files created in current directory.

- [ ] **Step 2: Install dependencies**

```bash
npm install react-router-dom colorthief three
npm install -D tailwindcss postcss autoprefixer @types/three
npx tailwindcss init -p
```

- [ ] **Step 3: Configure Tailwind**

Edit `tailwind.config.js`:
```js
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: { extend: {} },
  plugins: [],
}
```

Edit `src/index.css` — replace contents with:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

- [ ] **Step 4: Set up App.tsx with router**

```tsx
// src/App.tsx
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import ExtractPage from './pages/ExtractPage'
import GalleryPage from './pages/GalleryPage'
import Nav from './components/Nav'

export default function App() {
  return (
    <BrowserRouter>
      <Nav />
      <Routes>
        <Route path="/" element={<ExtractPage />} />
        <Route path="/gallery" element={<GalleryPage />} />
      </Routes>
    </BrowserRouter>
  )
}
```

- [ ] **Step 5: Create stub pages so app compiles**

```tsx
// src/pages/ExtractPage.tsx
export default function ExtractPage() {
  return <main className="p-8"><h1>Extract</h1></main>
}
```

```tsx
// src/pages/GalleryPage.tsx
export default function GalleryPage() {
  return <main className="p-8"><h1>Gallery</h1></main>
}
```

```tsx
// src/components/Nav.tsx
export default function Nav() {
  return <nav className="p-4 border-b">Nav</nav>
}
```

- [ ] **Step 6: Verify dev server starts**

```bash
npm run dev
```

Expected: app loads at `http://localhost:5173` with no console errors.

- [ ] **Step 7: Commit**

```bash
git init
git add .
git commit -m "feat: scaffold React + TypeScript + Vite + Tailwind project"
```

---

## Task 2: Types & Storage

**Files:**
- Create: `src/types/index.ts`
- Create: `src/lib/storage.ts`

- [ ] **Step 1: Define types**

```typescript
// src/types/index.ts
export interface ColorEntry {
  hex: string   // e.g. "#E63946"
  name: string  // e.g. "Crimson"
  r: number
  g: number
  b: number
}

export interface ColorCard {
  id: string           // uuid
  createdAt: number    // Unix timestamp ms
  name: string         // editable, default = image filename without extension
  imageDataUrl: string // base64 JPEG, max 800px, quality 0.8
  colors: ColorEntry[] // exactly 5
  favorited: boolean
}
```

- [ ] **Step 2: Write storage helpers**

```typescript
// src/lib/storage.ts
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
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npm run build
```

Expected: build succeeds with no type errors.

- [ ] **Step 4: Commit**

```bash
git add src/types/index.ts src/lib/storage.ts
git commit -m "feat: add ColorCard types and localStorage storage helpers"
```

---

## Task 3: Image Resize

**Files:**
- Create: `src/lib/imageResize.ts`

- [ ] **Step 1: Write image resize utility**

```typescript
// src/lib/imageResize.ts

const MAX_DIMENSION = 800
const JPEG_QUALITY = 0.8

/**
 * Accepts a File and returns a base64 JPEG data URL
 * resized to fit within MAX_DIMENSION x MAX_DIMENSION,
 * preserving aspect ratio.
 */
export function resizeImageFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()

    img.onload = () => {
      URL.revokeObjectURL(url)

      let { width, height } = img
      if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
        if (width >= height) {
          height = Math.round((height / width) * MAX_DIMENSION)
          width = MAX_DIMENSION
        } else {
          width = Math.round((width / height) * MAX_DIMENSION)
          height = MAX_DIMENSION
        }
      }

      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0, width, height)
      resolve(canvas.toDataURL('image/jpeg', JPEG_QUALITY))
    }

    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Failed to load image'))
    }

    img.src = url
  })
}

/**
 * Returns an HTMLImageElement from a data URL (for colorthief).
 */
export function dataUrlToImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Failed to load image from data URL'))
    img.src = dataUrl
  })
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npm run build
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/imageResize.ts
git commit -m "feat: add image resize utility (max 800px, JPEG 0.8)"
```

---

## Task 4: Color Naming

**Files:**
- Create: `src/lib/colorNaming.ts`

- [ ] **Step 1: Build local CSS color name fallback**

The local fallback finds the nearest named CSS color by Euclidean distance in RGB space. We embed a compact list of ~140 named CSS colors.

```typescript
// src/lib/colorNaming.ts

// Compact list of CSS named colors [name, r, g, b]
const CSS_COLORS: [string, number, number, number][] = [
  ['AliceBlue', 240, 248, 255], ['AntiqueWhite', 250, 235, 215],
  ['Aqua', 0, 255, 255], ['Aquamarine', 127, 255, 212],
  ['Azure', 240, 255, 255], ['Beige', 245, 245, 220],
  ['Bisque', 255, 228, 196], ['Black', 0, 0, 0],
  ['BlanchedAlmond', 255, 235, 205], ['Blue', 0, 0, 255],
  ['BlueViolet', 138, 43, 226], ['Brown', 165, 42, 42],
  ['BurlyWood', 222, 184, 135], ['CadetBlue', 95, 158, 160],
  ['Chartreuse', 127, 255, 0], ['Chocolate', 210, 105, 30],
  ['Coral', 255, 127, 80], ['CornflowerBlue', 100, 149, 237],
  ['Cornsilk', 255, 248, 220], ['Crimson', 220, 20, 60],
  ['Cyan', 0, 255, 255], ['DarkBlue', 0, 0, 139],
  ['DarkCyan', 0, 139, 139], ['DarkGoldenRod', 184, 134, 11],
  ['DarkGray', 169, 169, 169], ['DarkGreen', 0, 100, 0],
  ['DarkKhaki', 189, 183, 107], ['DarkMagenta', 139, 0, 139],
  ['DarkOliveGreen', 85, 107, 47], ['DarkOrange', 255, 140, 0],
  ['DarkOrchid', 153, 50, 204], ['DarkRed', 139, 0, 0],
  ['DarkSalmon', 233, 150, 122], ['DarkSeaGreen', 143, 188, 143],
  ['DarkSlateBlue', 72, 61, 139], ['DarkSlateGray', 47, 79, 79],
  ['DarkTurquoise', 0, 206, 209], ['DarkViolet', 148, 0, 211],
  ['DeepPink', 255, 20, 147], ['DeepSkyBlue', 0, 191, 255],
  ['DimGray', 105, 105, 105], ['DodgerBlue', 30, 144, 255],
  ['FireBrick', 178, 34, 34], ['FloralWhite', 255, 250, 240],
  ['ForestGreen', 34, 139, 34], ['Fuchsia', 255, 0, 255],
  ['Gainsboro', 220, 220, 220], ['GhostWhite', 248, 248, 255],
  ['Gold', 255, 215, 0], ['GoldenRod', 218, 165, 32],
  ['Gray', 128, 128, 128], ['Green', 0, 128, 0],
  ['GreenYellow', 173, 255, 47], ['HoneyDew', 240, 255, 240],
  ['HotPink', 255, 105, 180], ['IndianRed', 205, 92, 92],
  ['Indigo', 75, 0, 130], ['Ivory', 255, 255, 240],
  ['Khaki', 240, 230, 140], ['Lavender', 230, 230, 250],
  ['LavenderBlush', 255, 240, 245], ['LawnGreen', 124, 252, 0],
  ['LemonChiffon', 255, 250, 205], ['LightBlue', 173, 216, 230],
  ['LightCoral', 240, 128, 128], ['LightCyan', 224, 255, 255],
  ['LightGoldenRodYellow', 250, 250, 210], ['LightGray', 211, 211, 211],
  ['LightGreen', 144, 238, 144], ['LightPink', 255, 182, 193],
  ['LightSalmon', 255, 160, 122], ['LightSeaGreen', 32, 178, 170],
  ['LightSkyBlue', 135, 206, 250], ['LightSlateGray', 119, 136, 153],
  ['LightSteelBlue', 176, 196, 222], ['LightYellow', 255, 255, 224],
  ['Lime', 0, 255, 0], ['LimeGreen', 50, 205, 50],
  ['Linen', 250, 240, 230], ['Magenta', 255, 0, 255],
  ['Maroon', 128, 0, 0], ['MediumAquaMarine', 102, 205, 170],
  ['MediumBlue', 0, 0, 205], ['MediumOrchid', 186, 85, 211],
  ['MediumPurple', 147, 112, 219], ['MediumSeaGreen', 60, 179, 113],
  ['MediumSlateBlue', 123, 104, 238], ['MediumSpringGreen', 0, 250, 154],
  ['MediumTurquoise', 72, 209, 204], ['MediumVioletRed', 199, 21, 133],
  ['MidnightBlue', 25, 25, 112], ['MintCream', 245, 255, 250],
  ['MistyRose', 255, 228, 225], ['Moccasin', 255, 228, 181],
  ['NavajoWhite', 255, 222, 173], ['Navy', 0, 0, 128],
  ['OldLace', 253, 245, 230], ['Olive', 128, 128, 0],
  ['OliveDrab', 107, 142, 35], ['Orange', 255, 165, 0],
  ['OrangeRed', 255, 69, 0], ['Orchid', 218, 112, 214],
  ['PaleGoldenRod', 238, 232, 170], ['PaleGreen', 152, 251, 152],
  ['PaleTurquoise', 175, 238, 238], ['PaleVioletRed', 219, 112, 147],
  ['PapayaWhip', 255, 239, 213], ['PeachPuff', 255, 218, 185],
  ['Peru', 205, 133, 63], ['Pink', 255, 192, 203],
  ['Plum', 221, 160, 221], ['PowderBlue', 176, 224, 230],
  ['Purple', 128, 0, 128], ['RebeccaPurple', 102, 51, 153],
  ['Red', 255, 0, 0], ['RosyBrown', 188, 143, 143],
  ['RoyalBlue', 65, 105, 225], ['SaddleBrown', 139, 69, 19],
  ['Salmon', 250, 128, 114], ['SandyBrown', 244, 164, 96],
  ['SeaGreen', 46, 139, 87], ['SeaShell', 255, 245, 238],
  ['Sienna', 160, 82, 45], ['Silver', 192, 192, 192],
  ['SkyBlue', 135, 206, 235], ['SlateBlue', 106, 90, 205],
  ['SlateGray', 112, 128, 144], ['Snow', 255, 250, 250],
  ['SpringGreen', 0, 255, 127], ['SteelBlue', 70, 130, 180],
  ['Tan', 210, 180, 140], ['Teal', 0, 128, 128],
  ['Thistle', 216, 191, 216], ['Tomato', 255, 99, 71],
  ['Turquoise', 64, 224, 208], ['Violet', 238, 130, 238],
  ['Wheat', 245, 222, 179], ['White', 255, 255, 255],
  ['WhiteSmoke', 245, 245, 245], ['Yellow', 255, 255, 0],
  ['YellowGreen', 154, 205, 50],
]

function nearestCssName(r: number, g: number, b: number): string {
  let best = CSS_COLORS[0][0]
  let bestDist = Infinity
  for (const [name, cr, cg, cb] of CSS_COLORS) {
    const dist = (r - cr) ** 2 + (g - cg) ** 2 + (b - cb) ** 2
    if (dist < bestDist) {
      bestDist = dist
      best = name
    }
  }
  return best
}

function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('').toUpperCase()
}

async function fetchColorName(hex: string, signal: AbortSignal): Promise<string> {
  const url = `https://www.thecolorapi.com/id?hex=${hex.replace('#', '')}&format=json`
  const res = await fetch(url, { signal })
  if (!res.ok) throw new Error('Color API error')
  const data = await res.json()
  return data.name?.value ?? null
}

/**
 * Given r, g, b values, returns the color name.
 * Tries The Color API first (3s timeout), falls back to nearest CSS name.
 */
export async function getColorName(r: number, g: number, b: number): Promise<string> {
  const hex = rgbToHex(r, g, b)
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 3000)
  try {
    const name = await fetchColorName(hex, controller.signal)
    if (name) return name
  } catch {
    // fall through to local fallback
  } finally {
    clearTimeout(timeout)
  }
  return nearestCssName(r, g, b)
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npm run build
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/colorNaming.ts
git commit -m "feat: add color naming with Color API + local CSS fallback"
```

---

## Task 5: Color Extraction Hook

**Files:**
- Create: `src/hooks/useColorExtraction.ts`

- [ ] **Step 1: Write the hook**

```typescript
// src/hooks/useColorExtraction.ts
import { useState, useCallback } from 'react'
import ColorThief from 'colorthief'
import type { ColorEntry } from '../types'
import { resizeImageFile, dataUrlToImage } from '../lib/imageResize'
import { getColorName } from '../lib/colorNaming'

export type ExtractionState =
  | { status: 'idle' }
  | { status: 'resizing' }
  | { status: 'extracting'; imageDataUrl: string }
  | { status: 'naming'; imageDataUrl: string; colors: ColorEntry[] }
  | { status: 'done'; imageDataUrl: string; colors: ColorEntry[] }
  | { status: 'error'; message: string }

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp']
const MAX_FILE_SIZE = 20 * 1024 * 1024 // 20MB

function validateFile(file: File): string | null {
  if (!ALLOWED_TYPES.includes(file.type)) {
    return 'Unsupported file type. Please upload a JPG, PNG, or WebP image.'
  }
  const ext = '.' + file.name.split('.').pop()?.toLowerCase()
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return 'Unsupported file extension.'
  }
  if (file.size > MAX_FILE_SIZE) {
    return 'File is too large. Maximum size is 20MB.'
  }
  return null
}

function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('').toUpperCase()
}

// colorthief is a class-based default export; instantiate once
const colorThief = new ColorThief()

export function useColorExtraction() {
  const [state, setState] = useState<ExtractionState>({ status: 'idle' })

  const extract = useCallback(async (file: File) => {
    const error = validateFile(file)
    if (error) {
      setState({ status: 'error', message: error })
      return
    }

    setState({ status: 'resizing' })

    try {
      // 1. Resize
      const imageDataUrl = await resizeImageFile(file)
      setState({ status: 'extracting', imageDataUrl })

      // 2. Extract colors — colorthief.getPalette returns [r, g, b][] tuples
      // The image must be fully loaded and same-origin (data URL satisfies this)
      const img = await dataUrlToImage(imageDataUrl)
      const palette: [number, number, number][] = colorThief.getPalette(img, 5)

      const initialColors: ColorEntry[] = palette.map(([r, g, b]) => ({
        r,
        g,
        b,
        hex: rgbToHex(r, g, b),
        name: '…',
      }))

      setState({ status: 'naming', imageDataUrl, colors: initialColors })

      // 3. Fetch names in parallel
      const results = await Promise.allSettled(
        initialColors.map((c, i) =>
          getColorName(c.r, c.g, c.b).then(name => ({ i, name }))
        )
      )

      const namedColors = [...initialColors]
      for (const result of results) {
        if (result.status === 'fulfilled') {
          namedColors[result.value.i] = {
            ...namedColors[result.value.i],
            name: result.value.name,
          }
        }
      }

      setState({ status: 'done', imageDataUrl, colors: namedColors })
    } catch (err) {
      setState({
        status: 'error',
        message: err instanceof Error ? err.message : 'Failed to process image',
      })
    }
  }, [])

  const reset = useCallback(() => setState({ status: 'idle' }), [])

  return { state, extract, reset }
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npm run build
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useColorExtraction.ts
git commit -m "feat: add useColorExtraction hook (resize → extract → name)"
```

---

## Task 6: Collection Hook

**Files:**
- Create: `src/hooks/useCollection.ts`

- [ ] **Step 1: Write the hook**

```typescript
// src/hooks/useCollection.ts
import { useState, useCallback } from 'react'
import type { ColorCard } from '../types'
import { loadCards, saveCards, isStorageNearLimit } from '../lib/storage'

export function useCollection() {
  const [cards, setCards] = useState<ColorCard[]>(() => loadCards())
  const [storageWarning, setStorageWarning] = useState(false)

  const persist = useCallback((updated: ColorCard[]) => {
    saveCards(updated)
    setCards(updated)
    setStorageWarning(isStorageNearLimit())
  }, [])

  const addCard = useCallback((card: ColorCard) => {
    persist([card, ...cards])
  }, [cards, persist])

  const deleteCard = useCallback((id: string) => {
    persist(cards.filter(c => c.id !== id))
  }, [cards, persist])

  const toggleFavorite = useCallback((id: string) => {
    persist(cards.map(c => c.id === id ? { ...c, favorited: !c.favorited } : c))
  }, [cards, persist])

  const renameCard = useCallback((id: string, name: string) => {
    persist(cards.map(c => c.id === id ? { ...c, name } : c))
  }, [cards, persist])

  const importCards = useCallback((incoming: ColorCard[]) => {
    const existingIds = new Set(cards.map(c => c.id))
    const newCards = incoming.filter(c => !existingIds.has(c.id))
    persist([...cards, ...newCards])
    return newCards.length
  }, [cards, persist])

  return {
    cards,
    storageWarning,
    addCard,
    deleteCard,
    toggleFavorite,
    renameCard,
    importCards,
  }
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npm run build
```

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useCollection.ts
git commit -m "feat: add useCollection hook with CRUD and import/export support"
```

---

## Task 7: Canvas Export

**Files:**
- Create: `src/lib/canvasExport.ts`

- [ ] **Step 1: Write the canvas export utility**

The card layout drawn to canvas:
- Background: dark (`#1a1a2e`)
- Left side: image (max 300px wide)
- Right side: vertical list of 5 color swatches (40×40px square + name + HEX)
- Card name at top

```typescript
// src/lib/canvasExport.ts
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
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npm run build
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/canvasExport.ts
git commit -m "feat: add canvas-based PNG export for color cards"
```

---

## Task 8: Shared UI Components

**Files:**
- Create: `src/components/Nav.tsx`
- Create: `src/components/InlineNameEditor.tsx`
- Create: `src/components/ConfirmDialog.tsx`

- [ ] **Step 1: Build Nav**

```tsx
// src/components/Nav.tsx
import { NavLink } from 'react-router-dom'

export default function Nav() {
  return (
    <nav className="flex items-center gap-8 px-8 py-4 border-b border-gray-800 bg-gray-950">
      <span className="text-white font-bold text-lg tracking-tight">
        Color Collection
      </span>
      <NavLink
        to="/"
        end
        className={({ isActive }) =>
          `text-sm font-medium transition-colors ${isActive ? 'text-white' : 'text-gray-400 hover:text-white'}`
        }
      >
        Extract
      </NavLink>
      <NavLink
        to="/gallery"
        className={({ isActive }) =>
          `text-sm font-medium transition-colors ${isActive ? 'text-white' : 'text-gray-400 hover:text-white'}`
        }
      >
        Gallery
      </NavLink>
    </nav>
  )
}
```

- [ ] **Step 2: Build InlineNameEditor**

```tsx
// src/components/InlineNameEditor.tsx
import { useState, useRef, useEffect } from 'react'

interface Props {
  value: string
  onSave: (name: string) => void
  className?: string
}

export default function InlineNameEditor({ value, onSave, className = '' }: Props) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editing) inputRef.current?.select()
  }, [editing])

  function commit() {
    const trimmed = draft.trim()
    if (trimmed && trimmed !== value) onSave(trimmed)
    else setDraft(value)
    setEditing(false)
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={e => {
          if (e.key === 'Enter') commit()
          if (e.key === 'Escape') { setDraft(value); setEditing(false) }
        }}
        className={`bg-transparent border-b border-gray-400 outline-none text-white ${className}`}
      />
    )
  }

  return (
    <button
      onClick={() => { setDraft(value); setEditing(true) }}
      className={`text-left hover:underline decoration-dotted underline-offset-2 ${className}`}
      title="Click to rename"
    >
      {value}
    </button>
  )
}
```

- [ ] **Step 3: Build ConfirmDialog**

```tsx
// src/components/ConfirmDialog.tsx
interface Props {
  message: string
  onConfirm: () => void
  onCancel: () => void
}

export default function ConfirmDialog({ message, onConfirm, onCancel }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 max-w-sm w-full mx-4 shadow-2xl">
        <p className="text-white text-sm mb-6">{message}</p>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 text-sm bg-red-600 hover:bg-red-500 text-white rounded-lg transition-colors"
          >
            Remove
          </button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Verify app builds**

```bash
npm run build
```

- [ ] **Step 5: Commit**

```bash
git add src/components/Nav.tsx src/components/InlineNameEditor.tsx src/components/ConfirmDialog.tsx
git commit -m "feat: add Nav, InlineNameEditor, and ConfirmDialog components"
```

---

## Task 9: ImageUploader & ColorPalette Components

**Files:**
- Create: `src/components/ImageUploader.tsx`
- Create: `src/components/ColorPalette.tsx`

- [ ] **Step 1: Build ImageUploader**

```tsx
// src/components/ImageUploader.tsx
import { useRef, useState } from 'react'

interface Props {
  onFile: (file: File) => void
}

const ALLOWED = ['image/jpeg', 'image/png', 'image/webp']

export default function ImageUploader({ onFile }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)

  function handleFile(file: File) {
    onFile(file)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
    e.target.value = ''
  }

  return (
    <div
      onDragOver={e => { e.preventDefault(); setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
      className={`
        flex flex-col items-center justify-center gap-3 
        border-2 border-dashed rounded-2xl p-16 cursor-pointer
        transition-colors select-none
        ${dragging
          ? 'border-indigo-400 bg-indigo-950/30'
          : 'border-gray-700 hover:border-gray-500 bg-gray-900/50'
        }
      `}
    >
      <input
        ref={inputRef}
        type="file"
        accept={ALLOWED.join(',')}
        className="hidden"
        onChange={handleChange}
      />
      <svg className="w-10 h-10 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
      </svg>
      <p className="text-gray-400 text-sm text-center">
        Drag & drop an image here, or <span className="text-indigo-400">click to browse</span>
      </p>
      <p className="text-gray-600 text-xs">JPG, PNG, WebP · Max 20MB</p>
    </div>
  )
}
```

- [ ] **Step 2: Build ColorPalette**

```tsx
// src/components/ColorPalette.tsx
import type { ColorEntry } from '../types'

interface Props {
  colors: ColorEntry[]
  loading?: boolean
}

export default function ColorPalette({ colors, loading = false }: Props) {
  return (
    <div className="flex flex-col gap-3">
      {colors.map((color, i) => (
        <div key={i} className="flex items-center gap-4">
          <div
            className="w-10 h-10 rounded-lg flex-shrink-0 shadow-sm"
            style={{ backgroundColor: color.hex }}
          />
          <div className="flex flex-col min-w-0">
            <span className={`text-sm font-medium text-white ${loading && color.name === '…' ? 'animate-pulse' : ''}`}>
              {color.name}
            </span>
            <span className="text-xs font-mono text-gray-400">{color.hex}</span>
          </div>
          <button
            onClick={() => navigator.clipboard?.writeText(color.hex)}
            className="ml-auto text-xs text-gray-600 hover:text-gray-300 transition-colors flex-shrink-0"
            title="Copy HEX"
          >
            copy
          </button>
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 3: Verify app builds**

```bash
npm run build
```

- [ ] **Step 4: Commit**

```bash
git add src/components/ImageUploader.tsx src/components/ColorPalette.tsx
git commit -m "feat: add ImageUploader and ColorPalette components"
```

---

## Task 10: ColorCard Component

**Files:**
- Create: `src/components/ColorCard.tsx`

- [ ] **Step 1: Build ColorCard**

This component is used in two contexts:
1. **Extract page** — shows unsaved card with Save + Export buttons
2. **Gallery grid** — shows saved card with Favorite + Delete + Export buttons

```tsx
// src/components/ColorCard.tsx
import type { ColorCard as ColorCardType } from '../types'
import ColorPalette from './ColorPalette'
import InlineNameEditor from './InlineNameEditor'

interface BaseProps {
  card: ColorCardType
  loading?: boolean
  onExport: () => void
  onRename: (name: string) => void
}

interface ExtractProps extends BaseProps {
  mode: 'extract'
  onSave: () => void
  saved?: boolean
}

interface GalleryProps extends BaseProps {
  mode: 'gallery'
  onFavorite: () => void
  onDelete: () => void
}

type Props = ExtractProps | GalleryProps

export default function ColorCard(props: Props) {
  const { card, loading, onExport, onRename } = props

  return (
    <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
      {/* Name */}
      <div className="mb-4">
        <InlineNameEditor
          value={card.name}
          onSave={onRename}
          className="text-lg font-semibold text-white"
        />
      </div>

      {/* Body: image + palette */}
      <div className="flex gap-6">
        {/* Image */}
        <div className="flex-shrink-0 w-48">
          <img
            src={card.imageDataUrl}
            alt={card.name}
            className="w-full h-full object-cover rounded-xl"
          />
        </div>

        {/* Palette */}
        <div className="flex-1 min-w-0">
          <ColorPalette colors={card.colors} loading={loading} />
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 mt-5 pt-4 border-t border-gray-800">
        {props.mode === 'extract' && (
          <>
            <button
              onClick={props.onSave}
              disabled={props.saved}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-700 disabled:text-gray-500 text-white text-sm rounded-lg transition-colors"
            >
              {props.saved ? 'Saved' : 'Save to Collection'}
            </button>
            <button
              onClick={onExport}
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white text-sm rounded-lg transition-colors"
            >
              Export PNG
            </button>
            {props.saved && (
              <a href="/gallery" className="ml-auto text-sm text-indigo-400 hover:text-indigo-300">
                View in Gallery →
              </a>
            )}
          </>
        )}

        {props.mode === 'gallery' && (
          <>
            <button
              onClick={props.onFavorite}
              className="text-xl transition-transform hover:scale-110"
              title={card.favorited ? 'Remove from favorites' : 'Add to favorites'}
            >
              {card.favorited ? '❤️' : '🤍'}
            </button>
            <button
              onClick={onExport}
              className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-white text-xs rounded-lg transition-colors"
            >
              Export PNG
            </button>
            <button
              onClick={props.onDelete}
              className="ml-auto p-1.5 text-gray-600 hover:text-red-400 transition-colors"
              title="Delete"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify app builds**

```bash
npm run build
```

- [ ] **Step 3: Commit**

```bash
git add src/components/ColorCard.tsx
git commit -m "feat: add ColorCard component (extract + gallery modes)"
```

---

## Task 11: Extract Page

**Files:**
- Modify: `src/pages/ExtractPage.tsx`

- [ ] **Step 1: Build the Extract page**

```tsx
// src/pages/ExtractPage.tsx
import { useState, useCallback } from 'react'
import { useColorExtraction } from '../hooks/useColorExtraction'
import { useCollection } from '../hooks/useCollection'
import { exportCardAsPng } from '../lib/canvasExport'
import ImageUploader from '../components/ImageUploader'
import ColorCard from '../components/ColorCard'
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

  const handleFile = useCallback((file: File) => {
    setCurrentFile(file)
    setSaved(false)
    setPendingCard(null)
    extract(file)
  }, [extract])

  // Build pending card when extraction completes
  if (
    (state.status === 'done' || state.status === 'naming') &&
    !pendingCard &&
    currentFile
  ) {
    setPendingCard({
      id: generateId(),
      createdAt: Date.now(),
      name: fileNameWithoutExt(currentFile),
      imageDataUrl: state.imageDataUrl,
      colors: state.colors,
      favorited: false,
    })
  }

  // Keep pending card colors in sync with naming progress
  if (
    state.status === 'naming' &&
    pendingCard &&
    state.colors !== pendingCard.colors
  ) {
    setPendingCard(prev => prev ? { ...prev, colors: state.colors } : prev)
  }

  function handleSave() {
    if (!pendingCard) return
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
            <button
              onClick={() => { reset(); setCurrentFile(null); setPendingCard(null); setSaved(false) }}
              className="text-sm text-gray-500 hover:text-gray-300 transition-colors"
            >
              Upload another image
            </button>
          </div>
        )}
      </div>
    </main>
  )
}
```

- [ ] **Step 2: Verify app builds and dev server runs**

```bash
npm run build && npm run dev
```

Expected: no errors. Upload an image on `/` — palette should appear.

- [ ] **Step 3: Commit**

```bash
git add src/pages/ExtractPage.tsx
git commit -m "feat: build Extract page with upload, extraction, save, and PNG export"
```

---

## Task 12: Grid View Component

**Files:**
- Create: `src/components/GridView.tsx`

- [ ] **Step 1: Build GridView**

```tsx
// src/components/GridView.tsx
import { useState } from 'react'
import type { ColorCard } from '../types'
import InlineNameEditor from './InlineNameEditor'
import ConfirmDialog from './ConfirmDialog'
import { exportCardAsPng } from '../lib/canvasExport'

interface Props {
  cards: ColorCard[]
  onFavorite: (id: string) => void
  onDelete: (id: string) => void
  onRename: (id: string, name: string) => void
}

export default function GridView({ cards, onFavorite, onDelete, onRename }: Props) {
  const [confirmId, setConfirmId] = useState<string | null>(null)

  if (cards.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-center">
        <p className="text-gray-500 text-sm mb-4">No color cards yet.</p>
        <a href="/" className="text-indigo-400 hover:text-indigo-300 text-sm">
          Extract your first palette →
        </a>
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

      <div className="grid grid-cols-2 gap-6">
        {cards.map(card => (
          <div
            key={card.id}
            className="group bg-gray-900 rounded-2xl overflow-hidden border border-gray-800 hover:border-gray-700 transition-colors"
          >
            {/* Image */}
            <div className="relative">
              <img
                src={card.imageDataUrl}
                alt={card.name}
                className="w-full h-40 object-cover"
              />
            </div>

            {/* Color strip */}
            <div className="flex h-2">
              {card.colors.map((color, i) => (
                <div
                  key={i}
                  className="flex-1"
                  style={{ backgroundColor: color.hex }}
                  title={`${color.name} ${color.hex}`}
                />
              ))}
            </div>

            {/* Card body */}
            <div className="p-4">
              <InlineNameEditor
                value={card.name}
                onSave={name => onRename(card.id, name)}
                className="text-sm font-semibold text-white block mb-3"
              />

              <div className="flex items-center gap-2">
                <button
                  onClick={() => onFavorite(card.id)}
                  className="text-lg transition-transform hover:scale-110"
                  title={card.favorited ? 'Remove from favorites' : 'Add to favorites'}
                >
                  {card.favorited ? '❤️' : '🤍'}
                </button>
                <button
                  onClick={() => exportCardAsPng(card)}
                  className="px-2 py-1 bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs rounded transition-colors"
                >
                  Export
                </button>
                <button
                  onClick={() => setConfirmId(card.id)}
                  className="ml-auto p-1 text-gray-700 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                  title="Delete"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  )
}
```

- [ ] **Step 2: Verify app builds**

```bash
npm run build
```

- [ ] **Step 3: Commit**

```bash
git add src/components/GridView.tsx
git commit -m "feat: add GridView component with favorite, delete, rename, export"
```

---

## Task 13: Carousel View Component (Three.js)

**Files:**
- Create: `src/components/CarouselView.tsx`

- [ ] **Step 1: Build CarouselView**

Each card is rendered as a Three.js `PlaneGeometry` with a `CanvasTexture`. The canvas for each card draws: color palette strip at top + image below it. Cards are arranged in a circular arc. The active card faces the camera fully; others are rotated away. Mouse drag and arrow buttons rotate the carousel.

```tsx
// src/components/CarouselView.tsx
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
      meshes.forEach((mesh, i) => {
        const angle = (2 * Math.PI * i) / n - stateRef.current.currentAngle
        mesh.position.x = Math.sin(angle) * RADIUS
        mesh.position.z = Math.cos(angle) * RADIUS - RADIUS
        mesh.rotation.y = angle
        // Scale active card
        const dist = Math.abs(angle % (2 * Math.PI))
        const isActive = dist < 0.3 || dist > 2 * Math.PI - 0.3
        const scale = isActive ? 1.15 : 0.85
        mesh.scale.setScalar(scale)
        group.add(mesh)
      })
    }

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
      const w = mount.clientWidth
      const h = mount.clientHeight
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
    let cleanup: (() => void) | undefined
    init().then(fn => { cleanup = fn })
    return () => cleanup?.()
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
        className="absolute left-4 top-1/2 -translate-y-1/2 p-3 bg-gray-900/80 hover:bg-gray-800 text-white rounded-full transition-colors z-10"
      >
        ←
      </button>
      <button
        onClick={() => rotate(1)}
        className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-gray-900/80 hover:bg-gray-800 text-white rounded-full transition-colors z-10"
      >
        →
      </button>
    </div>
  )
}
```

- [ ] **Step 2: Verify app builds**

```bash
npm run build
```

Expected: no TypeScript errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/CarouselView.tsx
git commit -m "feat: add Three.js 3D carousel view with palette strip above image"
```

---

## Task 14: Gallery Page

**Files:**
- Modify: `src/pages/GalleryPage.tsx`

- [ ] **Step 1: Build the Gallery page**

```tsx
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
    addCard,
    deleteCard,
    toggleFavorite,
    renameCard,
    importCards,
  } = useCollection()

  function setTab(t: Tab) {
    setSearchParams(t === 'favorites' ? { tab: 'favorites' } : {})
  }

  const displayed = tab === 'favorites' ? cards.filter(c => c.favorited) : cards

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
              Favorites ({cards.filter(c => c.favorited).length})
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
```

- [ ] **Step 2: Verify full app builds and runs**

```bash
npm run build && npm run dev
```

Expected: both pages work. Save a card on `/`, see it in `/gallery`. Toggle views. Favorite, delete, rename, export all work.

> **Note:** `useCollection` is instantiated independently on each page — each reads `localStorage` once on mount. Cards saved on the Extract page will appear in the Gallery page after navigation (React Router unmounts/remounts the page), which is the correct and expected behavior per spec.

- [ ] **Step 3: Commit**

```bash
git add src/pages/GalleryPage.tsx
git commit -m "feat: build Gallery page with tabs, grid view, 3D carousel, import/export"
```

---

## Task 15: Final Polish & Dark Theme

**Files:**
- Modify: `src/index.css`
- Modify: `index.html`

- [ ] **Step 1: Set dark background on html/body**

In `src/index.css`, add after the Tailwind directives:
```css
html, body, #root {
  background-color: #030712; /* gray-950 */
  min-height: 100vh;
}
```

- [ ] **Step 2: Update page title and meta**

In `index.html`:
```html
<title>Color Collection</title>
<meta name="description" content="Extract and collect color palettes from your images." />
```

- [ ] **Step 3: Final build verification**

```bash
npm run build
```

Expected: clean build, no TypeScript errors, no Tailwind warnings.

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "feat: complete Color Collection app — polish and dark theme"
```

---

## Summary

| Task | What it builds |
|---|---|
| 1 | Project scaffold (Vite + React + TS + Tailwind) |
| 2 | Types + localStorage helpers |
| 3 | Image resize utility |
| 4 | Color naming (API + local fallback) |
| 5 | Color extraction hook |
| 6 | Collection CRUD hook |
| 7 | Canvas PNG export |
| 8 | Nav, InlineNameEditor, ConfirmDialog |
| 9 | ImageUploader, ColorPalette |
| 10 | ColorCard component |
| 11 | Extract page |
| 12 | GridView |
| 13 | CarouselView (Three.js) |
| 14 | Gallery page |
| 15 | Final polish |
