import type { PaginatedEpisodes } from '~/types/podcast'

/**
 * Client-only plugin to initialize the audio player at app root.
 * Ensures Howler.js only loads on the client side (no SSR).
 * Preloads the latest episode metadata without starting playback.
 */
export default defineNuxtPlugin((nuxtApp) => {
  // Only run on client side
  if (import.meta.server) return

  const player = useAudioPlayer()

  // Use nuxtApp hook to run after app is ready
  nuxtApp.hook('app:mounted', async () => {
    // Only preload if no episode is already loaded
    if (player.hasEpisode.value) return

    try {
      // Fetch just the first episode from the paginated endpoint
      const data = await $fetch<PaginatedEpisodes>('/api/podcast/episodes', {
        query: { page: 1, limit: 1 },
      })

      if (data.episodes.length > 0) {
        // preload() sets state without initiating any audio HTTP requests
        player.preload(data.episodes[0])
      }
    } catch {
      // Silently fail — preloading is a nice-to-have, not critical
    }
  })
})
