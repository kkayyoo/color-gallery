import { describe, it, expect } from 'vitest'
import { sanitizeName, EXPORT_FORMATS } from '../../lib/exportFormats'
import type { ColorEntry } from '../../types'

const RED: ColorEntry = { hex: '#E63946', name: 'Crimson', r: 230, g: 57, b: 70 }
const BLUE: ColorEntry = { hex: '#457B9D', name: 'Steel Blue', r: 69, g: 123, b: 157 }
const WARM: ColorEntry = { hex: '#F4A261', name: 'Red (Warm)', r: 244, g: 162, b: 97 }

const COLORS: ColorEntry[] = [RED, BLUE, WARM, RED, BLUE]

// ---------------------------------------------------------------------------
// sanitizeName
// ---------------------------------------------------------------------------
describe('sanitizeName', () => {
  it('lowercases and replaces spaces with hyphens', () => {
    expect(sanitizeName('Steel Blue')).toBe('steel-blue')
  })

  it('strips parentheses and special chars', () => {
    expect(sanitizeName('Red (Warm)')).toBe('red-warm')
  })

  it('collapses multiple separators into one hyphen', () => {
    expect(sanitizeName('A  --  B')).toBe('a-b')
  })

  it('strips leading and trailing hyphens', () => {
    expect(sanitizeName('--foo--')).toBe('foo')
  })

  it('handles already-safe names unchanged', () => {
    expect(sanitizeName('crimson')).toBe('crimson')
  })
})

// ---------------------------------------------------------------------------
// CSS Variables format
// ---------------------------------------------------------------------------
describe('CSS Variables format', () => {
  const fmt = EXPORT_FORMATS.find(f => f.id === 'css')!

  it('wraps output in :root {}', () => {
    const out = fmt.render('My Palette', COLORS)
    expect(out).toMatch(/^:root \{/)
    expect(out).toMatch(/\}$/)
  })

  it('uses card name as prefix', () => {
    const out = fmt.render('My Palette', COLORS)
    expect(out).toContain('--my-palette-')
  })

  it('includes every color as a CSS variable', () => {
    const out = fmt.render('Sunset', [RED, BLUE])
    expect(out).toContain('--sunset-crimson: #E63946')
    expect(out).toContain('--sunset-steel-blue: #457B9D')
  })

  it('sanitizes special chars in color names', () => {
    const out = fmt.render('Palette', [WARM])
    expect(out).toContain('--palette-red-warm: #F4A261')
  })
})

// ---------------------------------------------------------------------------
// Tailwind Config format
// ---------------------------------------------------------------------------
describe('Tailwind Config format', () => {
  const fmt = EXPORT_FORMATS.find(f => f.id === 'tailwind')!

  it('produces a JS module.exports block', () => {
    const out = fmt.render('Brand', COLORS)
    expect(out).toContain('module.exports')
    expect(out).toContain('colors:')
  })

  it('includes every color with the card prefix', () => {
    const out = fmt.render('Brand', [RED, BLUE])
    expect(out).toContain("'brand-crimson': '#E63946'")
    expect(out).toContain("'brand-steel-blue': '#457B9D'")
  })
})

// ---------------------------------------------------------------------------
// JSON format
// ---------------------------------------------------------------------------
describe('JSON format', () => {
  const fmt = EXPORT_FORMATS.find(f => f.id === 'json')!

  it('produces valid JSON', () => {
    const out = fmt.render('Test', COLORS)
    expect(() => JSON.parse(out)).not.toThrow()
  })

  it('includes card name at top level', () => {
    const out = fmt.render('Sunset', COLORS)
    const parsed = JSON.parse(out)
    expect(parsed.name).toBe('Sunset')
  })

  it('includes hex and rgb for each color', () => {
    const out = fmt.render('X', [RED])
    const parsed = JSON.parse(out)
    expect(parsed.colors[0].hex).toBe('#E63946')
    expect(parsed.colors[0].rgb).toEqual({ r: 230, g: 57, b: 70 })
  })

  it('preserves original color name (no sanitization)', () => {
    const out = fmt.render('X', [WARM])
    const parsed = JSON.parse(out)
    expect(parsed.colors[0].name).toBe('Red (Warm)')
  })
})
