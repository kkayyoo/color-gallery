# color-collection — Project Learnings

Captured from gstack sessions. Update as new discoveries are made.

---

## Project Learnings

### Architecture

- **storage-key**: localStorage key is `color-collection` (not `color-cards`). All reads/writes in `src/lib/storage.ts` use this key.
- **export-clipboard-module**: `copyToClipboard` lives in `src/lib/clipboard.ts` as a named export so `vi.mock` can intercept it in tests. Do not inline clipboard logic into components.
- **focus-trap-import**: `focus-trap-react` v12 uses a named export `{ FocusTrap }`, not a default export. `import { FocusTrap } from 'focus-trap-react'`.
- **color-types**: `ColorEntry` has `{ hex, r, g, b, name }`. `ColorCard` has `{ id, createdAt, name, imageDataUrl, colors[5], favorited }`. Colors array is always length 5.

### Patterns

- **escape-handler-collision**: `ExportPanel` and `ConfirmDialog` both listen for Escape. Fix: `ExportPanel` uses `capture: true` + `e.stopPropagation()` so it intercepts before `ConfirmDialog`'s bubble-phase handler. See `src/components/ExportPanel.tsx`.
- **gradient-border-z-index**: `.gradient-border-animated::before` uses `z-index: -1`. Requires `isolation: isolate` on the parent element so the negative z-index scopes correctly and doesn't bleed through to the page background.
- **firefox-gradient-border**: `@property` (used for animated conic gradients) is not supported in Firefox. Gate with `@supports (background: conic-gradient(from 1turn, red, red))`. Fallback uses a `rotate` keyframe animation instead.

### Pitfalls

- **vitest-pool**: Vitest requires `pool: 'vmForks'` in `vite.config.ts` for this project. Default pool causes test isolation issues.
- **jsdom-version**: Use `jsdom@24`, not v25+. v25 broke the test environment in this project.
- **carousel-texture-persistence**: The Three.js carousel builds card textures async. Each `useEffect` run creates a new WebGL renderer and appends it to the DOM. The cleanup function returned from `init()` must dispose textures, geometries, materials, and the renderer, and remove the canvas element — otherwise hot reload leaks GPU memory.
- **browse-localStorage**: The gstack browse daemon starts a fresh browser context on every invocation. localStorage does NOT persist between `$B` calls. Inject test data and run all interactions in a single chained invocation.

### Preferences

- **test-structure**: Tests live in `src/test/lib/` (pure logic) and `src/test/components/` (React components). Setup file at `src/test/setup.ts`.
- **tailwind-tokens**: Custom design tokens (colors, fonts, spacing) are defined in `tailwind.config.js`. DM Sans is the UI font; JetBrains Mono is used for code/hex values.
- **css-variables**: Global CSS variables and scrollbar styles live in `src/index.css`. Tailwind utility classes reference these variables via the custom tokens in `tailwind.config.js`.

### Tooling

- **dev-server**: Must be started manually by the user in a separate terminal (`npm run dev`). PowerShell background jobs don't persist across tool calls in this environment.
- **build-command**: `npm run build` runs `tsc -b && vite build`. Zero TypeScript errors required before merge.
- **test-command**: `npm test` runs `vitest run`. All 27 tests must pass.
- **platform**: Windows (PowerShell). Use `workdir` parameter instead of `cd &&` patterns. Bash scripts require explicit `bash -c '...'` invocation; native PowerShell syntax differs.
- **gstack-wsl**: gstack skill binaries (`~/.claude/skills/gstack/bin/`) require WSL with a Linux distro installed. WSL is not configured on this machine — skill preamble commands will fail silently.
