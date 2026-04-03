# Design Spec: Re-generate Palette + HEX/RGB Toggle

**Date:** 2026-04-03  
**Status:** Approved  
**Scope:** Two additive features for the Extract Colors page

---

## Overview

Two small enhancements to the color extraction workflow:

1. **Re-generate button** — lets the user re-run color extraction on the currently loaded image without re-uploading it
2. **HEX/RGB toggle** — lets the user switch the displayed color format across all swatches simultaneously, persisted to localStorage

---

## Feature 1: Re-generate Button

### What it does

After a successful extraction, a "Re-generate" button appears below the color card. Clicking it re-runs the extraction pipeline on the same image file, producing a new random palette. Because color extraction is non-deterministic (random pixel sampling), each run may produce different colors.

### Location

`src/pages/ExtractPage.tsx` — rendered below the `ColorCard` component.

### Visibility condition

The button is only shown when:
- `status === 'done'`, AND
- `currentFile` is not null

It is hidden during `idle`, `resizing`, `extracting`, `naming`, and `error` states.

### Interaction flow

1. User clicks "Re-generate"
2. `ConfirmDialog` opens with:
   - Title: `"Re-generate palette?"`
   - Message: `"This will discard your unsaved palette. Continue?"`
   - Confirm label: `"Re-generate"`
   - Cancel label: `"Cancel"`
3. **On confirm:**
   - Set `pendingCard` to `null`
   - Set `saved` to `false`
   - Call `extract(currentFile)`
4. **On cancel:** close dialog, no state change

### Files changed

| File | Change |
|------|--------|
| `src/pages/ExtractPage.tsx` | Add re-generate button + confirm dialog wiring |

### Files NOT changed

- `src/hooks/useColorExtraction.ts` — no changes needed; `extract(file)` already accepts a new call
- `src/components/ColorCard.tsx` — no changes
- `src/types/index.ts` — no changes

---

## Feature 2: HEX/RGB Toggle

### What it does

A segmented pill control (`HEX | RGB`) sits above the color swatches inside `ColorPalette`. Selecting a segment switches all swatches to display and copy that format. The preference is persisted to localStorage so it survives page reloads and applies in both extract and gallery views.

### Location

`src/components/ColorPalette.tsx` — above the swatch list, inside the existing palette container.

### State

```ts
const [colorFormat, setColorFormat] = useState<'hex' | 'rgb'>(() => {
  return (localStorage.getItem('color-collection:color-format') as 'hex' | 'rgb') ?? 'hex'
})
```

localStorage key: `color-collection:color-format`  
Default value: `'hex'`

### Toggle UI

- A small pill-style segmented control with two segments: `HEX` and `RGB`
- The active segment is visually highlighted (filled background)
- Styled with existing Tailwind CSS classes to match the app's design language
- Positioned above the swatch list, right-aligned within the palette container

### Swatch rendering

Each swatch:
- **Displayed value:** `color.hex` when `colorFormat === 'hex'`, `rgb(${color.r}, ${color.g}, ${color.b})` when `colorFormat === 'rgb'`
- **Copy button:** copies the currently displayed string (same format as displayed)

### Persistence

On every toggle:
```ts
localStorage.setItem('color-collection:color-format', newFormat)
```

On mount, the stored value is read to initialize state (see State section above).

### Scope

The toggle is global — since `ColorPalette` is a shared component used in both extract and gallery views, the same localStorage-backed preference applies everywhere. No per-card or per-page overrides.

### Files changed

| File | Change |
|------|--------|
| `src/components/ColorPalette.tsx` | Add toggle state, pill UI, conditional swatch rendering |

### Files NOT changed

- `src/types/index.ts` — `ColorEntry` already has `r`, `g`, `b` fields; no changes needed
- `src/components/ColorCard.tsx` — no new props needed
- `src/pages/ExtractPage.tsx` — no changes for this feature
- `src/pages/GalleryPage.tsx` — no changes needed; ColorPalette self-manages

---

## Data Flow Summary

```
ExtractPage
  └── [Re-generate button]
        └── ConfirmDialog → on confirm → reset pendingCard/saved → extract(currentFile)

ColorPalette
  └── [HEX | RGB toggle] ──→ colorFormat state ──→ localStorage
        └── swatch list
              └── each swatch: display + copy based on colorFormat
```

---

## Out of Scope

- Export format: exported PNG cards always show HEX (canvas export is not changed)
- Per-swatch toggle: all swatches switch together
- Re-generate from gallery view: only available on the Extract page
- Auto-save before re-generate: user must manually save first if they want to keep the current palette

---

## Acceptance Criteria

### Re-generate button
- [ ] Button appears below the card when extraction is complete
- [ ] Button is hidden in all other states (idle, resizing, extracting, naming, error)
- [ ] Clicking opens a confirmation dialog
- [ ] Confirming resets pendingCard and saved, then re-runs extraction on the same file
- [ ] Cancelling closes the dialog with no state change
- [ ] A new (potentially different) palette appears after re-generate completes

### HEX/RGB toggle
- [ ] Toggle pill appears above swatches in ColorPalette
- [ ] Clicking HEX switches all swatches to display hex values
- [ ] Clicking RGB switches all swatches to display rgb(r, g, b) strings
- [ ] Copy button copies the currently displayed format string
- [ ] Preference persists across page reloads via localStorage
- [ ] Toggle is consistent in both extract and gallery views
