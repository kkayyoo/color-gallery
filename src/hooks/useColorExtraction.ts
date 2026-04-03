// src/hooks/useColorExtraction.ts
import { useState, useCallback } from 'react'
import { getPaletteSync } from 'colorthief'
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

      // 2. Extract colors using colorthief v3 sync API
      // The image must be a fully-loaded HTMLImageElement
      const img = await dataUrlToImage(imageDataUrl)

      // Request a larger pool (20 colors) and randomly sample 5.
      // getPaletteSync is deterministic for a given colorCount, so requesting
      // more colors than needed and sampling randomly ensures re-generate
      // produces a different palette each time.
      const pool = getPaletteSync(img, { colorCount: 20 })

      if (!pool || pool.length === 0) {
        throw new Error('Could not extract colors from image')
      }

      // Fisher-Yates shuffle, then take first 5
      const shuffled = [...pool]
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
      }
      const palette = shuffled.slice(0, 5)

      const initialColors: ColorEntry[] = palette.map(color => {
        const { r, g, b } = color.rgb()
        return {
          r,
          g,
          b,
          hex: rgbToHex(r, g, b),
          name: '…',
        }
      })

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
