import { computed, watch, onMounted } from 'vue'
import { useColorMode } from '@vueuse/core'

/**
 * Shared composable that manages color mode (light/dark) and applies
 * artwork-derived theme colors. Call this once in the layout — it
 * handles everything: initial mode from app config, toggling, and
 * re-applying CSS custom properties when the mode changes.
 *
 * SiteNav (or any component) can call this composable again to read
 * `colorMode` and use `toggleDarkMode` — VueUse's `useColorMode` is
 * backed by a shared singleton, so multiple call sites get the same
 * reactive value.
 */
export function useColorModeManager() {
  const appConfig = useAppConfig()

  // VueUse useColorMode — shared singleton across all call sites
  const colorMode = useColorMode({
    attribute: 'data-theme',
    modes: {
      light: 'light',
      dark: 'dark',
    },
  })

  // Artwork-derived theme colors
  const { isLoaded: themeReady, applyThemeColors } = useThemeColors()

  // Resolved mode: 'light' | 'dark' (resolves 'auto' to the actual value)
  const resolvedMode = computed(() => {
    const val = colorMode.value
    return val === 'dark' ? 'dark' : 'light'
  })

  const isDark = computed(() => resolvedMode.value === 'dark')

  // Apply theme colors when data is loaded or color mode changes
  watch(
    [themeReady, resolvedMode],
    ([ready, mode]) => {
      if (ready) {
        applyThemeColors(mode)
      }
    },
    { immediate: true },
  )

  // Initialize theme from app config on mount
  onMounted(() => {
    if (appConfig.podcast.theme !== 'auto') {
      colorMode.value = appConfig.podcast.theme
    }
  })

  // Toggle between light and dark
  function toggleDarkMode() {
    colorMode.value = colorMode.value === 'dark' ? 'light' : 'dark'
  }

  return {
    colorMode,
    resolvedMode,
    isDark,
    toggleDarkMode,
  }
}
