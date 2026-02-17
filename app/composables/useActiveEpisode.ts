/**
 * Tracks which episode card was clicked for shared element transitions.
 * Only the clicked card gets a layout-id so other cards don't animate.
 */
import { ref } from 'vue'

const activeSlug = ref<string | null>(null)

export function useActiveEpisode() {
  const setActive = (slug: string) => {
    activeSlug.value = slug
  }

  const clearActive = () => {
    activeSlug.value = null
  }

  return {
    activeSlug,
    setActive,
    clearActive,
  }
}
