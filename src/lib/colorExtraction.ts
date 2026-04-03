// src/lib/colorExtraction.ts
//
// Custom k-means color extractor.
// Finds the k most dominant colors in an image by clustering pixels in RGB space.
// Random centroid seeding (k-means++) means re-running on the same image
// can converge to slightly different results, giving useful variation on re-generate.

const SAMPLE_SIZE = 2000   // pixels to sample (fast + representative)
const MAX_ITERATIONS = 20  // k-means convergence limit
const CANDIDATE_K = 12     // run k-means with more clusters than needed, then select diverse subset

interface RGB { r: number; g: number; b: number }

// ---------------------------------------------------------------------------
// Pixel sampling
// ---------------------------------------------------------------------------

/**
 * Reads pixel data from a data URL via an offscreen canvas.
 * Returns a flat array of { r, g, b } objects, downsampled to at most
 * SAMPLE_SIZE pixels. Ignores fully-transparent pixels.
 */
function samplePixels(imageDataUrl: string): Promise<RGB[]> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = img.naturalWidth
      canvas.height = img.naturalHeight
      const ctx = canvas.getContext('2d')
      if (!ctx) { reject(new Error('Canvas 2D context unavailable')); return }
      ctx.drawImage(img, 0, 0)

      const { data, width, height } = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const pixelCount = width * height

      // Stride: sample evenly across the image so we cover all regions
      const stride = Math.max(1, Math.floor(pixelCount / SAMPLE_SIZE))
      const pixels: RGB[] = []

      for (let i = 0; i < pixelCount; i += stride) {
        const offset = i * 4
        const alpha = data[offset + 3]
        if (alpha < 128) continue // skip transparent
        pixels.push({ r: data[offset], g: data[offset + 1], b: data[offset + 2] })
      }

      resolve(pixels)
    }
    img.onerror = () => reject(new Error('Failed to load image for color extraction'))
    img.src = imageDataUrl
  })
}

// ---------------------------------------------------------------------------
// k-means++ seeding
// ---------------------------------------------------------------------------

/**
 * k-means++ seeding: choose initial centroids with probability proportional
 * to squared distance from the nearest already-chosen centroid.
 * This gives better starting points AND introduces randomness so re-runs
 * can produce different (but still good) palettes.
 */
function kmeansPlusPlusSeeds(pixels: RGB[], k: number): RGB[] {
  const centroids: RGB[] = []

  // First centroid: random pixel
  centroids.push(pixels[Math.floor(Math.random() * pixels.length)])

  for (let c = 1; c < k; c++) {
    // Squared distance from each pixel to its nearest centroid
    const distances = pixels.map(p => {
      let minDist = Infinity
      for (const centroid of centroids) {
        const d = sqDist(p, centroid)
        if (d < minDist) minDist = d
      }
      return minDist
    })

    // Weighted random selection
    const total = distances.reduce((sum, d) => sum + d, 0)
    let target = Math.random() * total
    let chosen = pixels[pixels.length - 1] // fallback
    for (let i = 0; i < pixels.length; i++) {
      target -= distances[i]
      if (target <= 0) { chosen = pixels[i]; break }
    }
    centroids.push({ ...chosen })
  }

  return centroids
}

// ---------------------------------------------------------------------------
// k-means
// ---------------------------------------------------------------------------

function sqDist(a: RGB, b: RGB): number {
  const dr = a.r - b.r, dg = a.g - b.g, db = a.b - b.b
  return dr * dr + dg * dg + db * db
}

function nearestCentroid(pixel: RGB, centroids: RGB[]): number {
  let best = 0
  let bestDist = sqDist(pixel, centroids[0])
  for (let i = 1; i < centroids.length; i++) {
    const d = sqDist(pixel, centroids[i])
    if (d < bestDist) { bestDist = d; best = i }
  }
  return best
}

function kmeans(pixels: RGB[], k: number): Array<RGB & { size: number }> {
  let centroids = kmeansPlusPlusSeeds(pixels, k)

  for (let iter = 0; iter < MAX_ITERATIONS; iter++) {
    // Assign each pixel to nearest centroid
    const sums: { r: number; g: number; b: number; count: number }[] =
      Array.from({ length: k }, () => ({ r: 0, g: 0, b: 0, count: 0 }))

    for (const pixel of pixels) {
      const idx = nearestCentroid(pixel, centroids)
      sums[idx].r += pixel.r
      sums[idx].g += pixel.g
      sums[idx].b += pixel.b
      sums[idx].count++
    }

    // Recompute centroids
    let moved = false
    const next: RGB[] = centroids.map((c, i) => {
      if (sums[i].count === 0) return c // empty cluster: keep centroid
      const nr = Math.round(sums[i].r / sums[i].count)
      const ng = Math.round(sums[i].g / sums[i].count)
      const nb = Math.round(sums[i].b / sums[i].count)
      if (nr !== c.r || ng !== c.g || nb !== c.b) moved = true
      return { r: nr, g: ng, b: nb }
    })

    centroids = next
    if (!moved) break // converged
  }

  // Sort by cluster size (largest first) so the most dominant color comes first
  const clusterSizes = new Array(k).fill(0)
  for (const pixel of pixels) {
    clusterSizes[nearestCentroid(pixel, centroids)]++
  }

  return centroids
    .map((c, i) => ({ ...c, size: clusterSizes[i] }))
    .sort((a, b) => b.size - a.size)
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Greedily select `k` colors from `candidates` (sorted by descending cluster size)
 * that are as perceptually distinct as possible.
 *
 * Algorithm:
 * 1. Always start with the largest cluster (most dominant color).
 * 2. For each subsequent slot, pick the candidate whose minimum squared distance
 *    to any already-selected color is the largest ("max-min" criterion).
 *
 * This ensures the final palette covers the image's color space rather than
 * clustering around the dominant hue.
 */
function selectDiverseColors(candidates: Array<RGB & { size: number }>, k: number): RGB[] {
  if (candidates.length <= k) return candidates

  const selected: RGB[] = [candidates[0]] // start with dominant color
  const remaining = candidates.slice(1)

  while (selected.length < k && remaining.length > 0) {
    // For each remaining candidate, find its minimum distance to any selected color
    let bestIdx = 0
    let bestMinDist = -1

    for (let i = 0; i < remaining.length; i++) {
      let minDist = Infinity
      for (const s of selected) {
        const d = sqDist(remaining[i], s)
        if (d < minDist) minDist = d
      }
      if (minDist > bestMinDist) {
        bestMinDist = minDist
        bestIdx = i
      }
    }

    selected.push(remaining[bestIdx])
    remaining.splice(bestIdx, 1)
  }

  return selected
}

function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('').toUpperCase()
}

export interface ExtractedColor {
  r: number
  g: number
  b: number
  hex: string
}

/**
 * Extract the k most dominant colors from an image data URL using k-means clustering.
 * Returns colors sorted by dominance (most dominant first).
 * Each call with the same image may return a slightly different palette due to
 * random k-means++ seeding — this is intentional for re-generate variation.
 */
export async function extractDominantColors(imageDataUrl: string, k = 5): Promise<ExtractedColor[]> {
  const pixels = await samplePixels(imageDataUrl)

  if (pixels.length === 0) {
    throw new Error('No opaque pixels found in image')
  }

  // If fewer pixels than k (tiny/degenerate image), just return unique pixels
  if (pixels.length <= k) {
    return pixels.map(({ r, g, b }) => ({ r, g, b, hex: rgbToHex(r, g, b) }))
  }

  const candidates = kmeans(pixels, CANDIDATE_K)
  const clusters = selectDiverseColors(candidates, k)
  return clusters.map(({ r, g, b }) => ({ r, g, b, hex: rgbToHex(r, g, b) }))
}
