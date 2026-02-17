import type { Podcast } from '~/types/podcast'

/**
 * Composable for accessing podcast show metadata.
 *
 * Uses useAsyncData to fetch only the show-level metadata (no episodes).
 * This keeps the payload small — shared across all pages via the layout,
 * but only the Podcast object is serialized (not the full episode list).
 *
 * For episode data, pages should fetch directly from the paginated
 * /api/podcast/episodes endpoint using their own useAsyncData call.
 */
export const usePodcast = () => {
  const { data, status, error: fetchError, refresh } = useAsyncData(
    'podcast-meta',
    async (_nuxtApp, { signal }) => {
      return await $fetch<Podcast>('/api/podcast/meta', { signal })
    },
  )

  const podcast = computed<Podcast | null>(() => data.value ?? null)
  const loading = computed(() => status.value === 'pending')
  const error = computed(() => fetchError.value)

  /**
   * Refresh the podcast metadata (clears cache and refetches)
   */
  const refreshFeed = async () => {
    await refresh()
  }

  return {
    podcast,
    loading,
    error,
    refreshFeed,
  }
}
