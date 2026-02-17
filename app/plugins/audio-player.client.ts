/**
 * Client-only plugin to initialize the audio player at app root
 * Ensures Howler.js only loads on the client side (no SSR)
 * Preloads the latest episode metadata without starting playback
 */
export default defineNuxtPlugin((nuxtApp) => {
  // Only run on client side
  if (import.meta.server) return
  
  const player = useAudioPlayer()
  
  // Use nuxtApp hook to run after app is ready
  nuxtApp.hook('app:mounted', () => {
    const { episodes } = usePodcast()
    
    // Wait for episodes to be available, then set the latest as current episode
    // Uses preload() which sets state without initiating any HTTP requests
    watch(episodes, (newEpisodes) => {
      if (newEpisodes && newEpisodes.length > 0 && !player.hasEpisode.value) {
        const latestEpisode = newEpisodes[0]
        player.preload(latestEpisode)
      }
    }, { immediate: true })
  })
})
