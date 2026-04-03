# Palette Features Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Re-generate button to the Extract page and a HEX/RGB toggle to ColorPalette.

**Architecture:** Two independent, additive changes. Task 1 extends `ConfirmDialog` with a flexible confirm label, then wires a re-generate button in `ExtractPage`. Task 2 adds local state + localStorage persistence to `ColorPalette` for color format switching.

**Tech Stack:** React 18, TypeScript, Vite, Tailwind CSS v3

**Spec:** `docs/superpowers/specs/2026-04-03-palette-features-design.md`

---

## File Map

| File | Change |
|------|--------|
| `src/components/ConfirmDialog.tsx` | Add optional `confirmLabel` prop (default `"Remove"` to preserve existing usage) |
| `src/pages/ExtractPage.tsx` | Add re-generate button + confirm dialog state |
| `src/components/ColorPalette.tsx` | Add `colorFormat` state, localStorage persistence, toggle pill UI, conditional swatch rendering |

---

## Task 1: Extend ConfirmDialog with a configurable confirm label

`ConfirmDialog` currently hardcodes the confirm button as "Remove". The re-generate flow needs a different label. Add an optional `confirmLabel` prop.

**Files:**
- Modify: `src/components/ConfirmDialog.tsx`

- [ ] **Step 1: Add the `confirmLabel` prop**

Replace the Props interface and button label:

```tsx
interface Props {
  message: string
  confirmLabel?: string
  onConfirm: () => void
  onCancel: () => void
}

export default function ConfirmDialog({ message, confirmLabel = 'Remove', onConfirm, onCancel }: Props) {
```

And update the confirm button:
```tsx
<button
  onClick={onConfirm}
  className="px-4 py-2 text-sm bg-red-600 hover:bg-red-500 text-white rounded-lg transition-colors"
>
  {confirmLabel}
</button>
```

- [ ] **Step 2: Verify existing usages are unaffected**

Search for all uses of `<ConfirmDialog` in the codebase. None of them should need updating since `confirmLabel` defaults to `"Remove"`.

Run: `npm run build`
Expected: No TypeScript errors, build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/components/ConfirmDialog.tsx
git commit -m "feat: add optional confirmLabel prop to ConfirmDialog"
```

---

## Task 2: Re-generate button on ExtractPage

Add a "Re-generate" button below the color card that re-runs extraction on the current file after confirmation.

**Files:**
- Modify: `src/pages/ExtractPage.tsx`

- [ ] **Step 1: Add confirm dialog state and import**

At the top of `ExtractPage.tsx`, add the `ConfirmDialog` import:

```tsx
import ConfirmDialog from '../components/ConfirmDialog'
```

Add state inside the component (after the existing state declarations):

```tsx
const [showRegenConfirm, setShowRegenConfirm] = useState(false)
```

- [ ] **Step 2: Add the handleRegenerate function**

Add this function after `handleExport`. A guard is included so the function is safe even if called unexpectedly with no file loaded:

```tsx
function handleRegenerate() {
  if (!currentFile) return
  setPendingCard(null)
  setSaved(false)
  extract(currentFile)
}
```

- [ ] **Step 3: Add the Re-generate button and ConfirmDialog to the JSX**

The Re-generate button is shown only when `status === 'done'` (not during `naming` — the palette is still resolving color names at that point). The `ColorCard` continues to appear during `naming` as before.

Locate this block in `ExtractPage.tsx` (currently lines 113–131):

```tsx
{pendingCard && (state.status === 'naming' || state.status === 'done') && (
  <div className="space-y-6">
    <ColorCard ... />
    <button
      onClick={() => { reset(); setCurrentFile(null); setPendingCard(null); setSaved(false) }}
      ...
    >
      Upload another image
    </button>
  </div>
)}
```

Replace it entirely with:

```tsx
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
    <div className="flex items-center gap-4">
      {state.status === 'done' && (
        <button
          onClick={() => setShowRegenConfirm(true)}
          className="text-sm text-gray-500 hover:text-gray-300 transition-colors"
        >
          Re-generate palette
        </button>
      )}
      <button
        onClick={() => { reset(); setCurrentFile(null); setPendingCard(null); setSaved(false) }}
        className="text-sm text-gray-500 hover:text-gray-300 transition-colors"
      >
        Upload another image
      </button>
    </div>
    {showRegenConfirm && (
      <ConfirmDialog
        message="This will discard your unsaved palette. Continue?"
        confirmLabel="Re-generate"
        onConfirm={() => { setShowRegenConfirm(false); handleRegenerate() }}
        onCancel={() => setShowRegenConfirm(false)}
      />
    )}
  </div>
)}
```

Note: `ConfirmDialog` has no title prop — the component renders only a `message` and two buttons. The spec's "Title: Re-generate palette?" was a description label in the design conversation, not a distinct UI element. The `message` prop (`"This will discard your unsaved palette. Continue?"`) is the complete dialog text. No title prop needs to be added.

Also note: `extract()` in `useColorExtraction` resets the state machine internally on each call (it transitions back through `resizing → extracting → naming → done`), so calling `reset()` before `extract()` is not required.

- [ ] **Step 4: Build and verify**

Run: `npm run build`
Expected: No TypeScript errors, build succeeds.

- [ ] **Step 5: Manual smoke test**

1. Upload an image → while naming is in progress, confirm "Re-generate palette" button is NOT visible
2. Wait for extraction to complete → "Re-generate palette" button appears
3. Click "Re-generate palette" → confirm dialog appears
4. Click "Cancel" → dialog closes, palette unchanged
5. Click "Re-generate palette" again → click "Re-generate" in dialog
6. New palette extracts (processing spinner appears, then new colors)

- [ ] **Step 6: Commit**

```bash
git add src/pages/ExtractPage.tsx
git commit -m "feat: add re-generate palette button to ExtractPage"
```

---

## Task 3: HEX/RGB toggle in ColorPalette

Add a pill-style toggle above the swatches that switches all swatches between HEX and RGB display. Persisted to localStorage.

**Files:**
- Modify: `src/components/ColorPalette.tsx`

- [ ] **Step 1: Add the useState import and colorFormat state**

`useState` is not yet imported. Replace the import line and add state:

```tsx
import { useState } from 'react'
import type { ColorEntry } from '../types'

const FORMAT_KEY = 'color-collection:color-format'

interface Props {
  colors: ColorEntry[]
  loading?: boolean
}

export default function ColorPalette({ colors, loading = false }: Props) {
  const [colorFormat, setColorFormat] = useState<'hex' | 'rgb'>(() => {
    const stored = localStorage.getItem(FORMAT_KEY)
    return stored === 'rgb' ? 'rgb' : 'hex'
  })

  function toggleFormat(format: 'hex' | 'rgb') {
    setColorFormat(format)
    localStorage.setItem(FORMAT_KEY, format)
  }
```

- [ ] **Step 2: Add the toggle pill UI and update swatch rendering**

Replace the entire return statement with:

```tsx
  const displayValue = (color: ColorEntry) =>
    colorFormat === 'hex'
      ? color.hex
      : `rgb(${color.r}, ${color.g}, ${color.b})`

  return (
    <div className="flex flex-col gap-3">
      <div className="flex justify-end">
        <div className="flex text-xs font-mono rounded-lg overflow-hidden border border-gray-700">
          <button
            onClick={() => toggleFormat('hex')}
            className={`px-3 py-1 transition-colors ${
              colorFormat === 'hex'
                ? 'bg-gray-700 text-white'
                : 'bg-transparent text-gray-500 hover:text-gray-300'
            }`}
          >
            HEX
          </button>
          <button
            onClick={() => toggleFormat('rgb')}
            className={`px-3 py-1 transition-colors ${
              colorFormat === 'rgb'
                ? 'bg-gray-700 text-white'
                : 'bg-transparent text-gray-500 hover:text-gray-300'
            }`}
          >
            RGB
          </button>
        </div>
      </div>

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
            <span className="text-xs font-mono text-gray-400">{displayValue(color)}</span>
          </div>
          <button
            onClick={() => navigator.clipboard?.writeText(displayValue(color)).catch(() => {})}
            className="ml-auto text-xs text-gray-600 hover:text-gray-300 transition-colors flex-shrink-0"
            title={`Copy ${colorFormat.toUpperCase()}`}
          >
            copy
          </button>
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 3: Build and verify**

Run: `npm run build`
Expected: No TypeScript errors, build succeeds.

- [ ] **Step 4: Manual smoke test**

1. Extract colors from an image → swatches show HEX values by default
2. Click "RGB" in the toggle → all swatches switch to `rgb(r, g, b)` format
3. Click "copy" on a swatch → clipboard contains the RGB string (verify by pasting)
4. Click "HEX" → swatches switch back to HEX
5. Click "copy" → clipboard contains HEX
6. Reload the page, re-upload the same image → toggle starts in RGB (persisted)
7. Open a saved card in the Gallery → same toggle preference applies

- [ ] **Step 5: Commit**

```bash
git add src/components/ColorPalette.tsx
git commit -m "feat: add HEX/RGB toggle to ColorPalette with localStorage persistence"
```

---

## Done

Both features are complete. Verify the final build is clean:

```bash
npm run build
```

Expected: Build succeeds with no errors or warnings related to the changed files.

**Combined end-to-end smoke test:**
1. Upload an image → extraction completes
2. Click "RGB" toggle → all swatches switch to `rgb(r, g, b)`
3. Click "copy" on a swatch → paste confirms RGB string was copied
4. Click "Re-generate palette" → confirm dialog → confirm → new palette loads in RGB mode (toggle survived)
5. Navigate to Gallery → a saved card's palette shows RGB (preference persisted across views)
6. Reload the page → re-upload the same image → toggle still starts in RGB
