import { Howl } from 'howler'
import { ref, computed, watch } from 'vue'
import { useStorage, useIntervalFn } from '@vueuse/core'
import { useRoute } from '#app'
import { parseTimestamp } from '~/utils/timestamps'
import type { Episode, EpisodeSummary } from '~/types/podcast'

/** Lightweight read of listening progress from localStorage (no dependency on useListeningProgress) */
interface StoredProgress { position: number; duration: number; lastUpdated: number }
const PROGRESS_KEY = 'podcast-listening-progress'
const LAST_EPISODE_KEY = 'podcast-last-episode'

/** Episode data the player needs — works with both full Episode and lightweight EpisodeSummary */
type PlayableEpisode = Episode | EpisodeSummary

interface AudioPlayerState {
  currentEpisode: PlayableEpisode | null
  isPlaying: boolean
  currentTime: number
  duration: number
  volume: number
  playbackRate: number
  isLoading: boolean
  isMuted: boolean
  volumeBeforeMute: number
}

// Playback speed presets
const SPEED_PRESETS = [1, 1.25, 1.5, 1.75, 2]

// Global state (persists across navigation)
const state = ref<AudioPlayerState>({
  currentEpisode: null,
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  volume: 0.8,
  playbackRate: 1,
  isLoading: false,
  isMuted: false,
  volumeBeforeMute: 0.8,
})

let howl: Howl | null = null

/**
 * Persistent audio player powered by Howler.js
 * State persists across page navigation
 */
export function useAudioPlayer() {
  const route = useRoute()

  // Auto-update current time while playing
  const { pause: pauseInterval, resume: resumeInterval } = useIntervalFn(
    () => {
      if (howl && state.value.isPlaying) {
        state.value.currentTime = howl.seek() as number
      }
    },
    250, // Update 4x per second for smooth progress
    { immediate: false }
  )

  /**
   * Load and play an episode
   */
  const play = async (episode: PlayableEpisode) => {
    state.value.isLoading = true

    // If same episode and already playing/paused (not just preloaded), resume
    if (howl && state.value.currentEpisode?.guid === episode.guid && state.value.currentTime > 0) {
      howl.play()
      state.value.isPlaying = true
      state.value.isLoading = false
      resumeInterval()
      return
    }
    // If preloaded but never played (currentTime === 0), fall through to
    // create a fresh Howl with the full onload handler that restores progress.

    // Unload previous audio to free up audio pool
    if (howl) {
      howl.stop()
      howl.unload()
      howl = null
    }

    // Create new Howl instance
    howl = new Howl({
      src: [episode.audioUrl],
      html5: true, // Use HTML5 Audio for streaming
      preload: 'metadata', // Only preload metadata, not the entire file
      volume: state.value.volume,
      rate: state.value.playbackRate,
      onload: () => {
        state.value.duration = howl?.duration() || 0
        state.value.isLoading = false
        
        // Priority 1: ?t= URL parameter (explicit user intent, e.g. shared link)
        if (route.query.t) {
          const timestampSeconds = parseTimestamp(route.query.t as string)
          if (timestampSeconds > 0) {
            seek(timestampSeconds)
            return
          }
        }

        // Priority 2: Restore saved listening progress from localStorage
        try {
          const raw = localStorage.getItem(PROGRESS_KEY)
          if (raw && episode.guid) {
            const store: Record<string, StoredProgress> = JSON.parse(raw)
            const saved = store[episode.guid]
            if (saved && saved.position > 0) {
              // Don't restore if episode is essentially complete (within 60s of end)
              const remaining = saved.duration - saved.position
              if (remaining > 60) {
                seek(saved.position)
              }
            }
          }
        } catch {
          // localStorage read failed — start from beginning
        }
      },
      onplay: () => {
        state.value.isPlaying = true
        resumeInterval()
      },
      onpause: () => {
        state.value.isPlaying = false
        pauseInterval()
      },
      onend: () => {
        state.value.isPlaying = false
        state.value.currentTime = 0
        pauseInterval()
      },
      onerror: (id, error) => {
        console.error('Audio playback error:', error)
        state.value.isLoading = false
        state.value.isPlaying = false
        pauseInterval()
      },
    })

    state.value.currentEpisode = episode

    // Persist last-played episode so it can be restored on next page load
    try {
      localStorage.setItem(LAST_EPISODE_KEY, JSON.stringify(episode))
    } catch {
      // localStorage write failed — not critical
    }

    howl.play()
  }

  /**
   * Pause playback
   */
  const pause = () => {
    if (howl) {
      howl.pause()
      state.value.isPlaying = false
      pauseInterval()
    }
  }

  /**
   * Preload an episode without starting playback.
   * Sets the current episode state and fetches metadata (preload: 'metadata')
   * without initiating any audio playback or unnecessary HTTP requests.
   */
  const preload = (episode: PlayableEpisode) => {
    if (state.value.currentEpisode?.guid === episode.guid) return

    // Unload previous audio
    if (howl) {
      howl.stop()
      howl.unload()
      howl = null
    }

    state.value.currentEpisode = episode
    state.value.isPlaying = false
    state.value.currentTime = 0
    state.value.duration = episode.duration || 0
    state.value.isLoading = false

    // Create Howl in preload-only mode; do NOT call howl.play()
    howl = new Howl({
      src: [episode.audioUrl],
      html5: true,
      preload: false, // Don't preload any data; wait until user hits play
      volume: state.value.volume,
      rate: state.value.playbackRate,
      onload: () => {
        state.value.duration = howl?.duration() || episode.duration || 0
      },
    })
  }

  /**
   * Toggle play/pause
   */
  const toggle = () => {
    if (state.value.isPlaying) {
      pause()
    } else if (state.value.currentEpisode) {
      play(state.value.currentEpisode)
    }
  }

  /**
   * Seek to a specific position in seconds
   */
  const seek = (seconds: number) => {
    if (howl) {
      howl.seek(seconds)
      state.value.currentTime = seconds
    }
  }

  /**
   * Skip forward by specified seconds (default 15s)
   */
  const skipForward = (seconds = 15) => {
    if (howl) {
      const newTime = Math.min(
        state.value.currentTime + seconds,
        state.value.duration
      )
      seek(newTime)
    }
  }

  /**
   * Skip backward by specified seconds (default 15s)
   */
  const skipBackward = (seconds = 15) => {
    if (howl) {
      const newTime = Math.max(state.value.currentTime - seconds, 0)
      seek(newTime)
    }
  }

  /**
   * Set playback speed
   */
  const setSpeed = (rate: number) => {
    if (howl) {
      howl.rate(rate)
      state.value.playbackRate = rate
    }
  }

  /**
   * Cycle to next speed preset
   */
  const cycleSpeed = () => {
    const currentIndex = SPEED_PRESETS.indexOf(state.value.playbackRate)
    const nextIndex = (currentIndex + 1) % SPEED_PRESETS.length
    setSpeed(SPEED_PRESETS[nextIndex] ?? 1)
  }

  /**
   * Set volume (0-1)
   */
  const setVolume = (level: number) => {
    const clampedVolume = Math.max(0, Math.min(1, level))
    if (howl) {
      howl.volume(clampedVolume)
    }
    state.value.volume = clampedVolume
    
    // Unmute if volume is set above 0
    if (clampedVolume > 0 && state.value.isMuted) {
      state.value.isMuted = false
    }
    // Auto-mute if volume is set to 0
    if (clampedVolume === 0 && !state.value.isMuted) {
      state.value.isMuted = true
    }
  }

  /**
   * Toggle mute on/off
   */
  const toggleMute = () => {
    if (state.value.isMuted) {
      // Unmute: restore previous volume
      const volumeToRestore = state.value.volumeBeforeMute > 0 ? state.value.volumeBeforeMute : 0.8
      setVolume(volumeToRestore)
      state.value.isMuted = false
    } else {
      // Mute: save current volume and set to 0
      state.value.volumeBeforeMute = state.value.volume
      setVolume(0)
      state.value.isMuted = true
    }
  }

  /**
   * Generate shareable URL with current timestamp
   */
  const getShareUrl = (episodeSlug: string): string => {
    const currentSeconds = Math.floor(state.value.currentTime)
    const baseUrl = `${window.location.origin}/episodes/${episodeSlug}`
    return currentSeconds > 0 ? `${baseUrl}?t=${currentSeconds}` : baseUrl
  }

  // Computed properties
  const hasEpisode = computed(() => state.value.currentEpisode !== null)
  const progressPercent = computed(() => {
    if (state.value.duration === 0) return 0
    return (state.value.currentTime / state.value.duration) * 100
  })
  
  /**
   * Get appropriate speaker icon based on volume/mute state
   */
  const speakerIcon = computed(() => {
    if (state.value.isMuted || state.value.volume === 0) {
      return 'ph:speaker-x-bold'
    } else if (state.value.volume < 0.5) {
      return 'ph:speaker-low-bold'
    } else {
      return 'ph:speaker-high-bold'
    }
  })

  return {
    // State
    currentEpisode: computed(() => state.value.currentEpisode),
    isPlaying: computed(() => state.value.isPlaying),
    currentTime: computed(() => state.value.currentTime),
    duration: computed(() => state.value.duration),
    volume: computed(() => state.value.volume),
    playbackRate: computed(() => state.value.playbackRate),
    isLoading: computed(() => state.value.isLoading),
    isMuted: computed(() => state.value.isMuted),
    hasEpisode,
    progressPercent,
    speakerIcon,

    // Methods
    play,
    preload,
    pause,
    toggle,
    seek,
    skipForward,
    skipBackward,
    setSpeed,
    cycleSpeed,
    setVolume,
    toggleMute,
    getShareUrl,

    // Constants
    speedPresets: SPEED_PRESETS,
  }
}
