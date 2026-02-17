import { extractColors } from 'extract-colors'
import { getPixels } from '@unpic/pixels'
import type { ExtractedColor } from '../../types/theme'

/**
 * Fetch artwork image and extract dominant colors server-side.
 *
 * @unpic/pixels decodes JPEG/PNG to raw RGBA pixels using pure JS
 * (jpeg-js + pngjs), so it works on Node.js, Cloudflare Workers,
 * and any edge runtime without native binaries.
 */
export async function extractArtworkColors(artworkUrl: string): Promise<ExtractedColor[]> {
  if (!artworkUrl) {
    return []
  }

  try {
    // Fetch the image
    const response = await fetch(artworkUrl, {
      headers: { 'User-Agent': 'nuxt-podcast-theme/0.1.0' },
    })

    if (!response.ok) {
      console.warn(`Failed to fetch artwork for color extraction: ${response.status}`)
      return []
    }

    const arrayBuffer = await response.arrayBuffer()

    // Decode JPEG/PNG to raw RGBA pixels — pure JS, no native deps
    const imageData = await getPixels(new Uint8Array(arrayBuffer))

    const pixels = new Uint8ClampedArray(imageData.data)
    const width = imageData.width
    const height = imageData.height

    // Extract colors from raw pixel data
    const colors = await extractColors({ data: pixels, width, height }, {
      pixels: width * height,
      distance: 0.15,
      saturationDistance: 0.2,
      lightnessDistance: 0.2,
      hueDistance: 0.05,
    })

    return colors.map(c => ({
      hex: c.hex,
      red: c.red,
      green: c.green,
      blue: c.blue,
      area: c.area,
      saturation: c.saturation,
      lightness: c.lightness,
    }))
  } catch (error) {
    console.error('Color extraction failed:', error)
    return []
  }
}
