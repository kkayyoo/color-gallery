// src/hooks/useColorExtraction.ts
import { useState, useCallback } from 'react'
import type { ColorEntry } from '../types'
import { resizeImageFile } from '../lib/imageResize'
import { extractDominantColors } from '../lib/colorExtraction'
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

      // 2. Extract dominant colors using k-means clustering
      const extracted = await extractDominantColors(imageDataUrl)

      if (extracted.length === 0) {
        throw new Error('Could not extract colors from image')
      }

      const initialColors: ColorEntry[] = extracted.map(({ r, g, b, hex }) => ({
        r,
        g,
        b,
        hex,
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
