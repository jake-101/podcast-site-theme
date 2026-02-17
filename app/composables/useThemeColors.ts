import type { ThemeColorsResponse, ThemeColors } from '~/types/theme'

/**
 * Convert a ThemeColors object to CSS custom property declarations.
 */
function colorsToCssProperties(colors: ThemeColors): string {
  return Object.entries(colors)
    .map(([key, value]) => `--${key}: ${value};`)
    .join('\n    ')
}

/**
 * Composable that fetches the artwork-derived color palette from the server
 * and applies it as CSS custom properties on the document root.
 *
 * Uses useHead to inject a <style> tag during SSR so theme colors are present
 * in the initial HTML (no FOUC). On the client, also sets inline styles
 * for dynamic color mode switching.
 */
export function useThemeColors() {
  const { data: themeData, status } = useFetch<ThemeColorsResponse>('/api/podcast/colors', {
    key: 'podcast-theme-colors',
    server: true,
  })

  const isLoaded = computed(() => status.value === 'success' && !!themeData.value)

  // Inject theme colors via <style> in <head> for SSR (prevents FOUC)
  useHead({
    style: computed(() => {
      if (!themeData.value?.palette) return []

      const lightVars = colorsToCssProperties(themeData.value.palette.light)
      const darkVars = colorsToCssProperties(themeData.value.palette.dark)

      return [{
        key: 'podcast-theme-colors',
        innerHTML: `
  :root {
    ${lightVars}
  }
  [data-theme="dark"] {
    ${darkVars}
  }`,
      }]
    }),
  })

  /**
   * Apply theme colors as CSS custom properties on :root.
   * Called on the client when color mode changes, ensuring the correct
   * mode's colors override any SSR-injected values.
   */
  function applyThemeColors(mode: 'light' | 'dark') {
    if (!themeData.value?.palette) return

    const colors: ThemeColors = mode === 'dark'
      ? themeData.value.palette.dark
      : themeData.value.palette.light

    if (import.meta.client) {
      const root = document.documentElement
      for (const [key, value] of Object.entries(colors)) {
        root.style.setProperty(`--${key}`, value)
      }
    }
  }

  /**
   * Remove all custom theme properties (revert to oat.css defaults).
   * Derives keys from the palette data so it stays in sync with ThemeColors type.
   */
  function clearThemeColors() {
    if (!import.meta.client) return
    const root = document.documentElement
    // Use the actual palette keys from the fetched data to avoid hardcoded lists
    const paletteKeys = themeData.value?.palette
      ? Object.keys(themeData.value.palette.light) as (keyof ThemeColors)[]
      : [] as (keyof ThemeColors)[]
    for (const key of paletteKeys) {
      root.style.removeProperty(`--${key}`)
    }
  }

  return {
    themeData,
    isLoaded,
    applyThemeColors,
    clearThemeColors,
  }
}
