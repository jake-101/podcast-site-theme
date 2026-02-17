/**
 * Tracks which episode slug was clicked for navigation,
 * so only that card gets the shared element card transition.
 */
const activeSlug = ref<string | null>(null)

export function useActiveEpisode() {
  const setActive = (slug: string) => {
    activeSlug.value = slug
  }

  const clear = () => {
    activeSlug.value = null
  }

  const isActive = (slug: string) => activeSlug.value === slug

  return {
    activeSlug,
    setActive,
    clear,
    isActive,
  }
}
