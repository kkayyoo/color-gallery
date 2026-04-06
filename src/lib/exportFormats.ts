import type { ColorEntry } from '../types'

export interface ExportFormat {
  id: string
  label: string
  render: (cardName: string, colors: ColorEntry[]) => string
}

/** Convert a display name to a safe identifier token */
export function sanitizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export const EXPORT_FORMATS: ExportFormat[] = [
  {
    id: 'css',
    label: 'CSS Variables',
    render(cardName, colors) {
      const prefix = sanitizeName(cardName)
      const vars = colors
        .map(c => `  --${prefix}-${sanitizeName(c.name)}: ${c.hex};`)
        .join('\n')
      return `:root {\n${vars}\n}`
    },
  },
  {
    id: 'tailwind',
    label: 'Tailwind Config',
    render(cardName, colors) {
      const prefix = sanitizeName(cardName)
      const entries = colors
        .map(c => `      '${prefix}-${sanitizeName(c.name)}': '${c.hex}',`)
        .join('\n')
      return `// tailwind.config.js\nmodule.exports = {\n  theme: {\n    extend: {\n      colors: {\n${entries}\n      },\n    },\n  },\n}`
    },
  },
  {
    id: 'json',
    label: 'JSON',
    render(cardName, colors) {
      const payload = {
        name: cardName,
        colors: colors.map(c => ({
          name: c.name,
          hex: c.hex,
          rgb: { r: c.r, g: c.g, b: c.b },
        })),
      }
      return JSON.stringify(payload, null, 2)
    },
  },
]
