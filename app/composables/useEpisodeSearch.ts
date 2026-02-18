/**
 * Shared episode search state using the lightweight search-index endpoint.
 *
 * The search index is loaded lazily on the client only (server: false),
 * so it never enters the SSG payload. Searching happens client-side
 * against a minimal dataset (title + description per episode).
 */
import { refDebounced } from '@vueuse/core'
import type { SearchIndexEntry } from '~/types/podcast'

const searchInput = ref('')
const debouncedQuery = refDebounced(searchInput, 300)

export function useEpisodeSearch() {
  // Lazy-load the search index on the client only.
  // This never enters the SSG payload — it's fetched on demand.
  const { data: searchIndex } = useAsyncData(
    'episode-search-index',
    async (_nuxtApp, { signal }) => {
      return await $fetch<SearchIndexEntry[]>('/api/podcast/search-index', { signal })
    },
    { server: false, lazy: true },
  )

  /** Filtered search results — only populated when there's a query */
  const results = computed<SearchIndexEntry[]>(() => {
    const q = debouncedQuery.value.toLowerCase().trim()
    if (!q || !Array.isArray(searchIndex.value)) return []

    return searchIndex.value.filter(ep =>
      ep.title.toLowerCase().includes(q)
      || ep.description.toLowerCase().includes(q),
    )
  })

  /** Whether a search is active */
  const isSearching = computed(() => debouncedQuery.value.trim().length > 0)

  const clear = () => {
    searchInput.value = ''
  }

  return {
    searchInput,
    query: debouncedQuery,
    results,
    isSearching,
    clear,
  }
}
