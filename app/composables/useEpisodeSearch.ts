/**
 * Shared episode search state, so the nav bar search input and the episode
 * grid can be kept in sync without prop-drilling through the layout.
 */
import { refDebounced } from '@vueuse/core'

const searchInput = ref('')
const debouncedQuery = refDebounced(searchInput, 300)

export function useEpisodeSearch() {
  const clear = () => {
    searchInput.value = ''
  }

  return {
    searchInput,
    query: debouncedQuery,
    clear,
  }
}
