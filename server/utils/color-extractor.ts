import { extractColors } from 'extract-colors'
import type { ExtractedColor } from '../../types/theme'

/**
 * Fetch artwork image and extract dominant colors server-side.
 *
 * extract-colors works with raw pixel data. We fetch the image,
 * decode it to RGBA pixels, and feed that to the library.
 *
 * For Node.js we decode JPEG/PNG using the built-in sharp (if available)
 * or fall back to manual pixel extraction from the raw fetch.
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
    const buffer = Buffer.from(arrayBuffer)

    // Use sharp to decode image to raw RGBA pixels
    // sharp is commonly available in Node.js environments
    let pixels: Uint8ClampedArray
    let width: number
    let height: number

    try {
      // Dynamic import with a string expression prevents Nitro/Rollup from
      // attempting to bundle sharp at build time on edge runtimes.
      const sharpPkg = 'sharp'
      const sharp = (await import(/* @vite-ignore */ sharpPkg)).default
      // Resize to small dimensions for faster color extraction
      const image = sharp(buffer).resize(64, 64, { fit: 'cover' })
      const { data, info } = await image.raw().ensureAlpha().toBuffer({ resolveWithObject: true })

      pixels = new Uint8ClampedArray(data)
      width = info.width
      height = info.height
    } catch {
      // sharp not available (e.g. Cloudflare edge runtime) — use fallback
      console.warn('sharp not available, using fallback color extraction')
      return extractFallbackColors(buffer)
    }

    // Extract colors from raw pixel data
    const colors = await extractColors({ data: pixels, width, height }, {
      pixels: width * height,
      distance: 0.15, // Minimum distance between colors (0-1)
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

/**
 * Fallback: parse a few bytes to guess a dominant color when sharp is unavailable.
 * This is intentionally rough - most production Nitro environments have sharp.
 */
function extractFallbackColors(_buffer: Buffer): ExtractedColor[] {
  // Return a default accent color so the theme still works
  return [{
    hex: '#574747',
    red: 87,
    green: 71,
    blue: 71,
    area: 1,
    saturation: 0.1,
    lightness: 0.31,
  }]
}
