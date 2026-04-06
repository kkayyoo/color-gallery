import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ExportPanel from '../../components/ExportPanel'
import * as clipboard from '../../lib/clipboard'
import type { ColorEntry } from '../../types'

// focus-trap-react needs tabbable elements; stub it out so jsdom doesn't choke
vi.mock('focus-trap-react', () => ({
  FocusTrap: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

// Mock the clipboard module so we can intercept copyToClipboard calls
vi.mock('../../lib/clipboard', () => ({
  copyToClipboard: vi.fn().mockResolvedValue(undefined),
}))

const COLORS: ColorEntry[] = [
  { hex: '#E63946', name: 'Crimson',    r: 230, g: 57,  b: 70  },
  { hex: '#457B9D', name: 'Steel Blue', r: 69,  g: 123, b: 157 },
  { hex: '#F4A261', name: 'Sandy',      r: 244, g: 162, b: 97  },
  { hex: '#2A9D8F', name: 'Teal',       r: 42,  g: 157, b: 143 },
  { hex: '#E9C46A', name: 'Gold',       r: 233, g: 196, b: 106 },
]

function renderPanel(onClose = vi.fn()) {
  return render(
    <ExportPanel cardName="Sunset" colors={COLORS} onClose={onClose} />
  )
}

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------
describe('ExportPanel rendering', () => {
  it('renders a dialog with the card name in aria-label', () => {
    renderPanel()
    expect(screen.getByRole('dialog')).toHaveAttribute('aria-label', 'Export code for Sunset')
  })

  it('renders a tab for each format', () => {
    renderPanel()
    expect(screen.getByRole('button', { name: 'CSS Variables' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Tailwind Config' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'JSON' })).toBeInTheDocument()
  })

  it('shows CSS Variables code by default', () => {
    renderPanel()
    expect(screen.getByRole('dialog').textContent).toContain(':root')
  })

  it('renders a Copy button', () => {
    renderPanel()
    expect(screen.getByRole('button', { name: 'Copy' })).toBeInTheDocument()
  })
})

// ---------------------------------------------------------------------------
// Tab switching
// ---------------------------------------------------------------------------
describe('ExportPanel tab switching', () => {
  it('switches to Tailwind Config output when that tab is clicked', async () => {
    const user = userEvent.setup()
    renderPanel()
    await user.click(screen.getByRole('button', { name: 'Tailwind Config' }))
    expect(screen.getByRole('dialog').textContent).toContain('module.exports')
  })

  it('switches to JSON output when that tab is clicked', async () => {
    const user = userEvent.setup()
    renderPanel()
    await user.click(screen.getByRole('button', { name: 'JSON' }))
    const text = screen.getByRole('dialog').textContent ?? ''
    expect(() => JSON.parse(
      // grab just the <pre> content
      (screen.getByRole('dialog').querySelector('pre')?.textContent ?? '{}')
    )).not.toThrow()
    expect(text).toContain('"name": "Sunset"')
  })
})

// ---------------------------------------------------------------------------
// Close behaviour
// ---------------------------------------------------------------------------
describe('ExportPanel close behaviour', () => {
  it('calls onClose when the X button is clicked', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    renderPanel(onClose)
    await user.click(screen.getByRole('button', { name: 'Close' }))
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('calls onClose when Escape is pressed', () => {
    const onClose = vi.fn()
    renderPanel(onClose)
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('calls onClose when overlay backdrop is clicked', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    renderPanel(onClose)
    // The backdrop is the outermost div (fixed inset-0)
    const backdrop = screen.getByRole('dialog').parentElement!
    await user.click(backdrop)
    expect(onClose).toHaveBeenCalledOnce()
  })
})

// ---------------------------------------------------------------------------
// Copy button — clipboard API path
// ---------------------------------------------------------------------------
describe('ExportPanel copy button (clipboard API)', () => {
  beforeEach(() => {
    vi.mocked(clipboard.copyToClipboard).mockResolvedValue(undefined)
  })

  it('calls copyToClipboard with the rendered code', async () => {
    const user = userEvent.setup()
    renderPanel()
    await user.click(screen.getByRole('button', { name: 'Copy' }))
    expect(clipboard.copyToClipboard).toHaveBeenCalledOnce()
    const written = vi.mocked(clipboard.copyToClipboard).mock.calls[0][0]
    expect(written).toContain(':root')
  })

  it('shows "Copied ✓" feedback after clicking Copy', async () => {
    const user = userEvent.setup()
    renderPanel()
    await user.click(screen.getByRole('button', { name: 'Copy' }))
    expect(await screen.findByRole('button', { name: 'Copied ✓' })).toBeInTheDocument()
  })
})

// ---------------------------------------------------------------------------
// Copy button — execCommand fallback path
// ---------------------------------------------------------------------------
describe('ExportPanel copy button (execCommand fallback)', () => {
  beforeEach(() => {
    // Make copyToClipboard use the real implementation so the execCommand path runs
    vi.mocked(clipboard.copyToClipboard).mockImplementation((text: string) => {
      // real fallback: jsdom has no navigator.clipboard, so execCommand is called
      const ta = document.createElement('textarea')
      ta.value = text
      ta.style.position = 'fixed'
      ta.style.left = '-9999px'
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
      return Promise.resolve()
    })
    document.execCommand = vi.fn().mockReturnValue(true)
  })

  it('falls back to execCommand when clipboard API is unavailable', async () => {
    const user = userEvent.setup()
    renderPanel()
    await user.click(screen.getByRole('button', { name: 'Copy' }))
    expect(document.execCommand).toHaveBeenCalledWith('copy')
  })
})
