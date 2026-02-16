import type { Episode, Podcast, PodcastFeed } from '~/types/podcast'

/**
 * Composable for fetching and managing podcast data
 * 
 * Features:
 * - Fetches parsed RSS feed data from server API
 * - Exposes reactive podcast metadata and episodes
 * - Provides helper functions for finding and searching episodes
 * - Handles loading and error states
 */
export const usePodcast = () => {
  // Fetch podcast feed from server API
  const { data, status, error: fetchError, refresh } = useFetch<PodcastFeed>('/api/podcast', {
    // Cache the response to avoid refetching on every component mount
    key: 'podcast-feed',
    // Works with SSR and client-side hydration
    server: true,
  })

  // Reactive computed refs for easier access
  const podcast = computed<Podcast | null>(() => data.value?.podcast ?? null)
  const episodes = computed<Episode[]>(() => data.value?.episodes ?? [])
  const loading = computed(() => status.value === 'pending')
  const error = computed(() => fetchError.value)

  /**
   * Find an episode by its URL slug
   * 
   * @param slug - The URL slug to search for
   * @returns The matching episode or undefined
   */
  const findEpisodeBySlug = (slug: string): Episode | undefined => {
    return episodes.value.find(episode => episode.slug === slug)
  }

  /**
   * Search episodes by title and description (case-insensitive)
   * 
   * @param query - The search query string
   * @returns Filtered array of episodes matching the query
   */
  const searchEpisodes = (query: string): Episode[] => {
    if (!query || query.trim() === '') {
      return episodes.value
    }

    const normalizedQuery = query.toLowerCase().trim()

    return episodes.value.filter(episode => {
      const titleMatch = episode.title.toLowerCase().includes(normalizedQuery)
      const descriptionMatch = episode.description.toLowerCase().includes(normalizedQuery)
      
      // Also search in HTML content if available (useful for show notes)
      const contentMatch = episode.htmlContent
        ? episode.htmlContent.toLowerCase().includes(normalizedQuery)
        : false

      return titleMatch || descriptionMatch || contentMatch
    })
  }

  /**
   * Refresh the podcast feed data (clears cache and refetches)
   */
  const refreshFeed = async () => {
    await refresh()
  }

  return {
    // Reactive state
    podcast,
    episodes,
    loading,
    error,
    
    // Helper functions
    findEpisodeBySlug,
    searchEpisodes,
    refreshFeed,
  }
}
