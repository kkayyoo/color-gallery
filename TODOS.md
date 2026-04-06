# TODOS

## Export Code Feature

### Mobile Safari modal positioning
**What:** Test and fix ExportPanel overlay on mobile Safari.
**Why:** The overlay uses `position: fixed` which can shift when Safari's address bar animates on scroll.
**Context:** ExportPanel uses `position: fixed; inset: 0`. This is necessary to avoid overflow-hidden clipping in GridView cards. But mobile Safari has a known quirk where fixed elements reposition during address bar show/hide and momentum scroll. The fix is typically wrapping the scroll area in a container with `-webkit-overflow-scrolling: touch` and ensuring the modal content doesn't scroll the body.
**Depends on:** ExportPanel shipped

---

### E2E test: full export user flow
**What:** Playwright or Cypress E2E test for the complete export journey.
**Why:** Unit + component tests cover code paths but not the real browser flow: actual image upload → extraction → Export Code button → copy to clipboard.
**Context:** The vitest + @testing-library/react tests (Commit 2) cover component behavior in jsdom. That doesn't test the actual Vite dev server, real File API, real clipboard API, or the interaction between ColorCard and ExportPanel in the live DOM. A single Playwright test that uploads a test image, waits for extraction, opens the export panel, clicks Copy, and asserts "Copied!" would give full-stack confidence.
**Depends on:** ExportPanel shipped, vitest bootstrapped (Commit 2)

---

### SCSS Variables export format
**What:** Add `$color-1: #hex; // Name` SCSS format to EXPORT_FORMATS.
**Why:** SCSS is still common in Vue, older React, and Rails setups. The registry architecture makes this a single object addition.
**Context:** `src/lib/exportFormats.ts` — add one ExportFormat entry with id 'scss', label 'SCSS Variables', and render function producing `$color-{i+1}: {hex}; // {name}` per color. Include a test case in exportFormats.test.ts.
**Depends on:** exportFormats.ts shipped
