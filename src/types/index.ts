export interface ColorEntry {
  hex: string   // e.g. "#E63946"
  name: string  // e.g. "Crimson"
  r: number
  g: number
  b: number
}

export interface ColorCard {
  id: string           // uuid
  createdAt: number    // Unix timestamp ms
  name: string         // editable, default = image filename without extension
  imageDataUrl: string // base64 JPEG, max 800px, quality 0.8
  colors: ColorEntry[] // exactly 5
  favorited: boolean
}
