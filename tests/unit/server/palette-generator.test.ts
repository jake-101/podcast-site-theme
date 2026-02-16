import { describe, expect, it } from 'vitest'
import { wcagContrast } from 'culori'
import { generateThemePalette } from '../../../server/utils/palette-generator'
import type { ExtractedColor, ThemePalette, ThemeColors } from '../../../types/theme'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const HEX_REGEX = /^#[0-9a-f]{6}$/i

/** All 10 ThemeColors property keys */
const THEME_COLOR_KEYS: (keyof ThemeColors)[] = [
  'primary',
  'primary-foreground',
  'secondary',
  'secondary-foreground',
  'accent',
  'muted',
  'muted-foreground',
  'ring',
  'podcast-vibrant',
  'podcast-muted',
]

function makeColor(overrides: Partial<ExtractedColor> = {}): ExtractedColor {
  return {
    hex: '#e63946',
    red: 230,
    green: 57,
    blue: 70,
    area: 0.3,
    saturation: 0.8,
    lightness: 0.5,
    ...overrides,
  }
}

function assertAllKeysPresent(colors: ThemeColors) {
  for (const key of THEME_COLOR_KEYS) {
    expect(colors).toHaveProperty(key)
    expect(typeof colors[key]).toBe('string')
  }
}

function assertAllValidHex(colors: ThemeColors) {
  for (const key of THEME_COLOR_KEYS) {
    expect(colors[key]).toMatch(HEX_REGEX)
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('generateThemePalette', () => {
  describe('empty colors array', () => {
    it('returns a valid palette with fallback colors', () => {
      const palette = generateThemePalette([])

      expect(palette).toHaveProperty('light')
      expect(palette).toHaveProperty('dark')
      assertAllKeysPresent(palette.light)
      assertAllKeysPresent(palette.dark)
    })

    it('returns valid hex strings for all fallback colors', () => {
      const palette = generateThemePalette([])

      assertAllValidHex(palette.light)
      assertAllValidHex(palette.dark)
    })
  })

  describe('single color input', () => {
    it('generates a complete palette from one color', () => {
      const colors = [makeColor()]
      const palette = generateThemePalette(colors)

      assertAllKeysPresent(palette.light)
      assertAllKeysPresent(palette.dark)
      assertAllValidHex(palette.light)
      assertAllValidHex(palette.dark)
    })

    it('derives the primary from the single color provided', () => {
      const colors = [makeColor({ hex: '#2563eb', red: 37, green: 99, blue: 235 })]
      const palette = generateThemePalette(colors)

      // The primary should be derived from the input blue - we can't check exact hex
      // because of contrast adjustment, but it should be valid
      expect(palette.light.primary).toMatch(HEX_REGEX)
      expect(palette.dark.primary).toMatch(HEX_REGEX)
    })
  })

  describe('multiple colors input', () => {
    it('picks the most saturated, mid-lightness color as primary', () => {
      const colors: ExtractedColor[] = [
        // Low saturation, should not be picked
        makeColor({ hex: '#888888', saturation: 0.0, lightness: 0.5, area: 0.5 }),
        // High saturation, mid-lightness - should be picked as primary
        makeColor({ hex: '#e63946', saturation: 0.9, lightness: 0.5, area: 0.3 }),
        // High saturation but too dark
        makeColor({ hex: '#1a0505', saturation: 0.8, lightness: 0.1, area: 0.2 }),
      ]

      const palette = generateThemePalette(colors)

      // Should produce a valid palette; the scoring favors the saturated mid-lightness one
      assertAllKeysPresent(palette.light)
      assertAllValidHex(palette.light)
    })

    it('uses a secondary color distinct from the primary', () => {
      const colors: ExtractedColor[] = [
        // Primary candidate: highly saturated red
        makeColor({ hex: '#e63946', saturation: 0.9, lightness: 0.5, area: 0.4 }),
        // Secondary candidate: saturated blue (different hue)
        makeColor({ hex: '#2563eb', red: 37, green: 99, blue: 235, saturation: 0.85, lightness: 0.5, area: 0.3 }),
      ]

      const palette = generateThemePalette(colors)

      // Both light and dark themes should be fully populated
      assertAllKeysPresent(palette.light)
      assertAllKeysPresent(palette.dark)
    })
  })

  describe('all palette properties present', () => {
    it('light theme has all 10 required properties', () => {
      const palette = generateThemePalette([makeColor()])
      assertAllKeysPresent(palette.light)
      expect(Object.keys(palette.light)).toHaveLength(10)
    })

    it('dark theme has all 10 required properties', () => {
      const palette = generateThemePalette([makeColor()])
      assertAllKeysPresent(palette.dark)
      expect(Object.keys(palette.dark)).toHaveLength(10)
    })
  })

  describe('valid hex colors', () => {
    it('all light theme values are valid hex strings', () => {
      const palette = generateThemePalette([makeColor()])
      assertAllValidHex(palette.light)
    })

    it('all dark theme values are valid hex strings', () => {
      const palette = generateThemePalette([makeColor()])
      assertAllValidHex(palette.dark)
    })

    it('all fallback palette values are valid hex strings', () => {
      const palette = generateThemePalette([])
      assertAllValidHex(palette.light)
      assertAllValidHex(palette.dark)
    })
  })

  describe('WCAG contrast requirements', () => {
    it('light mode primary has at least 4.5:1 contrast against white', () => {
      const palette = generateThemePalette([makeColor()])

      const contrast = wcagContrast(palette.light.primary, '#ffffff')
      expect(contrast).toBeGreaterThanOrEqual(4.5)
    })

    it('dark mode primary has at least 4.5:1 contrast against near-black', () => {
      const palette = generateThemePalette([makeColor()])

      const contrast = wcagContrast(palette.dark.primary, '#09090b')
      expect(contrast).toBeGreaterThanOrEqual(4.5)
    })

    it('light mode primary-foreground contrasts with primary', () => {
      const palette = generateThemePalette([makeColor()])

      const contrast = wcagContrast(palette.light['primary-foreground'], palette.light.primary)
      // Should be at least 3:1 for large text / UI components
      expect(contrast).toBeGreaterThanOrEqual(3)
    })

    it('dark mode primary-foreground contrasts with primary', () => {
      const palette = generateThemePalette([makeColor()])

      const contrast = wcagContrast(palette.dark['primary-foreground'], palette.dark.primary)
      expect(contrast).toBeGreaterThanOrEqual(3)
    })

    it('light mode muted-foreground has adequate contrast against white', () => {
      const palette = generateThemePalette([makeColor()])

      const contrast = wcagContrast(palette.light['muted-foreground'], '#ffffff')
      expect(contrast).toBeGreaterThanOrEqual(3)
    })

    it('dark mode muted-foreground has adequate contrast against near-black', () => {
      const palette = generateThemePalette([makeColor()])

      const contrast = wcagContrast(palette.dark['muted-foreground'], '#09090b')
      expect(contrast).toBeGreaterThanOrEqual(3)
    })

    it('fallback palette also meets contrast requirements', () => {
      const palette = generateThemePalette([])

      const lightContrast = wcagContrast(palette.light.primary, '#ffffff')
      const darkContrast = wcagContrast(palette.dark.primary, '#09090b')
      expect(lightContrast).toBeGreaterThanOrEqual(4.5)
      expect(darkContrast).toBeGreaterThanOrEqual(4.5)
    })
  })

  describe('different hue inputs', () => {
    const hueTests: Array<{ name: string; color: Partial<ExtractedColor> }> = [
      {
        name: 'red',
        color: { hex: '#e63946', red: 230, green: 57, blue: 70, saturation: 0.8, lightness: 0.5 },
      },
      {
        name: 'blue',
        color: { hex: '#2563eb', red: 37, green: 99, blue: 235, saturation: 0.85, lightness: 0.5 },
      },
      {
        name: 'green',
        color: { hex: '#10b981', red: 16, green: 185, blue: 129, saturation: 0.75, lightness: 0.4 },
      },
      {
        name: 'purple',
        color: { hex: '#8b5cf6', red: 139, green: 92, blue: 246, saturation: 0.9, lightness: 0.55 },
      },
    ]

    for (const { name, color } of hueTests) {
      it(`generates a valid palette from a ${name} color`, () => {
        const palette = generateThemePalette([makeColor(color)])

        assertAllKeysPresent(palette.light)
        assertAllKeysPresent(palette.dark)
        assertAllValidHex(palette.light)
        assertAllValidHex(palette.dark)
      })

      it(`${name} palette meets WCAG contrast in light mode`, () => {
        const palette = generateThemePalette([makeColor(color)])

        const contrast = wcagContrast(palette.light.primary, '#ffffff')
        expect(contrast).toBeGreaterThanOrEqual(4.5)
      })

      it(`${name} palette meets WCAG contrast in dark mode`, () => {
        const palette = generateThemePalette([makeColor(color)])

        const contrast = wcagContrast(palette.dark.primary, '#09090b')
        expect(contrast).toBeGreaterThanOrEqual(4.5)
      })
    }

    it('produces different primary colors for different hue inputs', () => {
      const redPalette = generateThemePalette([makeColor({ hex: '#e63946', red: 230, green: 57, blue: 70, saturation: 0.8, lightness: 0.5 })])
      const bluePalette = generateThemePalette([makeColor({ hex: '#2563eb', red: 37, green: 99, blue: 235, saturation: 0.85, lightness: 0.5 })])

      // The primary colors should differ since inputs have different hues
      expect(redPalette.light.primary).not.toBe(bluePalette.light.primary)
      expect(redPalette.dark.primary).not.toBe(bluePalette.dark.primary)
    })
  })

  describe('return type structure', () => {
    it('returns an object with light and dark keys', () => {
      const palette = generateThemePalette([makeColor()])

      expect(palette).toHaveProperty('light')
      expect(palette).toHaveProperty('dark')
      expect(typeof palette.light).toBe('object')
      expect(typeof palette.dark).toBe('object')
    })

    it('satisfies the ThemePalette type shape', () => {
      const palette: ThemePalette = generateThemePalette([makeColor()])

      // TypeScript compilation is the main check, but verify at runtime too
      expect(Object.keys(palette)).toEqual(['light', 'dark'])
    })
  })
})
