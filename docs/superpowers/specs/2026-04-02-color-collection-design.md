# Color Collection — Design Spec
**Date:** 2026-04-02  
**Status:** Approved

---

## Overview

A browser-based tool that lets users extract color palettes from images, name each color, and build a personal collection. No backend, no account required — everything runs in the browser.

---

## Tech Stack

| Concern | Choice |
|---|---|
| Framework | React + TypeScript |
| Build tool | Vite |
| Styling | Tailwind CSS |
| Routing | React Router (two pages) |
| Color extraction | `colorthief` (MIT, v3.3.0) |
| 3D carousel | `three.js` (MIT, r183) |
| Color naming | The Color API (free, no auth) + local CSS-name fallback |
| Image export | Native browser Canvas API (no library) |
| Persistence | localStorage + JSON export/import |

---

## Data Model

```typescript
// A single extracted color
interface ColorEntry {
  hex: string        // "#E63946"
  name: string       // "Crimson"
  r: number
  g: number
  b: number
}

// A saved color card (one per uploaded image)
interface ColorCard {
  id: string              // uuid
  createdAt: number       // Unix timestamp
  name: string            // default: image filename without extension (e.g. "sunset-beach")
  imageDataUrl: string    // base64 JPEG at max 800px, quality 0.8
  colors: ColorEntry[]    // exactly 5
  favorited: boolean
}
```

Cards have an editable name. The default is derived from the uploaded image filename with the extension stripped (e.g. `sunset-beach.jpg` → `"sunset-beach"`). The name is editable inline in both the Extract result and the Gallery grid view — click the name to enter edit mode, press Enter or blur to confirm. Name changes persist to localStorage immediately.

All `ColorCard` objects are stored as a JSON array in `localStorage` under the key `color-collection`.

---

## Application Structure

### Routing

| Route | Page |
|---|---|
| `/` | Extract Page |
| `/gallery` | Gallery Page |
| `/gallery?tab=favorites` | Gallery — Favorites tab |

### Project Layout

```
src/
  pages/
    ExtractPage.tsx
    GalleryPage.tsx
  components/
    ImageUploader.tsx
    ColorPalette.tsx
    ColorCard.tsx
    InlineNameEditor.tsx
    GridView.tsx
    CarouselView.tsx
    Nav.tsx
    ConfirmDialog.tsx
  hooks/
    useColorExtraction.ts
    useCollection.ts
  lib/
    colorNaming.ts      # Color API fetch + local fallback
    canvasExport.ts     # Draw card to canvas, trigger PNG download
    storage.ts          # localStorage read/write helpers
    imageResize.ts      # Resize image to max 800px via Canvas API
  types/
    index.ts
```

---

## Pages & Components

### Nav
- Logo + "Extract" and "Gallery" links
- Active link highlighted
- Persistent across both pages

### Extract Page (`/`)

**ImageUploader**
- Drag & drop zone or click-to-browse
- Accepted formats: `image/jpeg`, `image/png`, `image/webp`
- Validates both MIME type and file extension
- Rejects files over 20MB with inline error message
- On valid upload: resize image to max 800px (longest side, aspect ratio preserved), display preview immediately

**ColorPalette**
- Runs `colorthief.getPaletteSync()` on the resized image to extract exactly 5 RGB values
- Shows 5 color swatches immediately (no waiting for names)
- Fires 5 parallel requests to `thecolorapi.com/id?hex=...` with `Promise.allSettled` and a 3s timeout per request
- Names fill in as each resolves; falls back silently to nearest local CSS color name on failure

**ColorCard (extract result)**
- Layout: image on the left, vertical swatch list on the right
- Editable name field at the top (pre-filled with image filename, no extension)
- Each swatch row: color block + color name + HEX value
- Buttons: **Save to Collection**, **Export as PNG**
- After saving: success feedback + "View in Gallery" link

### Gallery Page (`/gallery`)

**Tab bar**
- **All** tab — all saved cards
- **Favorites** tab — only `favorited: true` cards
- Active tab reflected in URL query param (`?tab=favorites`)

**View toggle** (top-right)
- Grid view (default)
- Carousel view (3D)

**Grid View**
- 2-column responsive card grid
- Each card: image thumbnail, 5-color strip, editable name, favorite heart button, delete (trash) button
- Favorite button: toggles `favorited`, persists immediately to localStorage
- Delete button: visible on hover, opens `ConfirmDialog` before deletion
- Export PNG button per card

**Carousel View (Three.js)**
- Initialized lazily — only when user switches to Carousel view
- Destroyed when switching back to Grid (releases WebGL context)
- Cards arranged in a 3D arc/wheel
- Active (center) card is large and fully visible: **color palette strip displayed above the image**
- Rotate left/right via arrow buttons or mouse drag
- Click a card to bring it to center
- View-only — no favorite or delete controls in this view

**ConfirmDialog**
- Modal: "Remove this card from your collection?"
- Confirm / Cancel buttons
- On confirm: remove from localStorage, update React state

**Empty States**
- Empty All tab: friendly message + link to Extract page
- Empty Favorites tab: message prompting user to heart some cards

**JSON Export / Import**
- Export button: download all cards as a `.json` file
- Import button: upload a `.json` file, validate structure strictly, merge with existing collection — cards with a duplicate `id` are skipped (no overwrite); new cards are appended
- Import validation: check shape of each card, reject malformed/oversized payloads, reject unexpected fields

---

## Key Flows

### Upload & Extract
1. User uploads image → validate type + size
2. Resize to max 800px via Canvas API
3. Display resized preview
4. `colorthief.getPaletteSync()` → 5 RGB values → render swatches immediately
5. `Promise.allSettled` — 5 parallel Color API requests (3s timeout each)
6. Names resolve into swatches; failures fall back to local CSS name lookup silently
7. User clicks Save → compress to JPEG 0.8 → write to localStorage (with current name) → show success + gallery link
7a. Name edit (Extract page or Gallery) → update `name` field → write to localStorage immediately
8. User clicks Export PNG → draw card layout to offscreen Canvas → `canvas.toBlob()` → download

### Gallery
1. App loads → read `color-collection` from localStorage into React state once
2. All subsequent reads/writes go through React state (no repeated `localStorage.getItem`)
3. Favorite toggle → update state → write to localStorage
4. Delete → confirm dialog → update state → write to localStorage
5. View toggle → Grid/Carousel preference saved to localStorage
6. Tab switch → update URL query param

---

## Performance

| Concern | Mitigation |
|---|---|
| Large images | Resize to max 800px before processing or storing |
| localStorage size | JPEG compression at quality 0.8; show a dismissible yellow banner when total localStorage usage exceeds 4MB, prompting user to export and delete old cards |
| `colorthief` on main thread | Runs post-resize (smaller pixel data); fast enough without Web Worker |
| Color API latency | 5 parallel requests, 3s timeout, silent fallback — never blocks UI |
| Three.js memory | Initialize on demand, destroy on view switch |
| Repeated localStorage reads | Read once on load into React state |

---

## Security

| Concern | Mitigation |
|---|---|
| Malicious file uploads | Validate MIME type + file extension; reject non-image types; cap at 20MB |
| XSS | All dynamic content rendered via React JSX — no raw `innerHTML` with user data |
| Data leaving device | Only hex color values sent to The Color API — no image, no personal data |
| JSON import attacks | Strict schema validation before merging; reject unexpected fields and oversized payloads |
| localStorage poisoning | Validate data shape on every read from localStorage before using |

---

## Out of Scope (for this version)

- User accounts / cloud sync
- Sharing collections with others
- Color search / filter in gallery
- More than 5 colors per palette
- Color formats other than HEX
- Mobile-specific optimizations (responsive layout only)
