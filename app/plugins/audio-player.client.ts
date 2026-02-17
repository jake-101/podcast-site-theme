import type { EpisodeSummary, PaginatedEpisodes } from '~/types/podcast'

const PROGRESS_KEY = 'podcast-listening-progress'
const LAST_EPISODE_KEY = 'podcast-last-episode'

/**
 * Client-only plugin to initialize the audio player at app root.
 * Ensures Howler.js only loads on the client side (no SSR).
 * Restores the last-played episode from localStorage, or falls back
 * to preloading the latest episode without starting playback.
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
      // Check if there's a last-played episode saved in localStorage
      const lastEpisodeRaw = localStorage.getItem(LAST_EPISODE_KEY)
      if (lastEpisodeRaw) {
        const lastEpisode: EpisodeSummary = JSON.parse(lastEpisodeRaw)
        // Also restore the saved playback position into state so the UI shows it
        const progressRaw = localStorage.getItem(PROGRESS_KEY)
        if (progressRaw && lastEpisode.guid) {
          const store: Record<string, { position: number; duration: number }> = JSON.parse(progressRaw)
          const saved = store[lastEpisode.guid]
          if (saved && saved.position > 0) {
            // Set duration from saved progress so the seek bar renders correctly
            lastEpisode.duration = saved.duration || lastEpisode.duration
          }
        }
        player.preload(lastEpisode)
        return
      }

      // No saved episode — fall back to preloading the latest episode
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
