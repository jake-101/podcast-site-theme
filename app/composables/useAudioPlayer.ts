import { Howl } from 'howler'
import { ref, computed, watch } from 'vue'
import { useIntervalFn } from '@vueuse/core'
import { useRoute, useRouter } from '#app'
import type { Episode } from '~/types/podcast'

interface AudioPlayerState {
  currentEpisode: Episode | null
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
  const router = useRouter()

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
  const play = async (episode: Episode) => {
    state.value.isLoading = true

    // If same episode, just resume
    if (howl && state.value.currentEpisode?.guid === episode.guid) {
      howl.play()
      state.value.isPlaying = true
      state.value.isLoading = false
      resumeInterval()
      return
    }

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
        
        // Check for ?t= parameter in URL to auto-seek
        if (route.query.t) {
          const timestampSeconds = parseTimestamp(route.query.t as string)
          if (timestampSeconds !== null) {
            seek(timestampSeconds)
          }
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
    setSpeed(SPEED_PRESETS[nextIndex])
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
   * Parse timestamp from ?t= parameter
   * Supports: seconds (123), MM:SS (4:35), HH:MM:SS (1:23:45)
   */
  const parseTimestamp = (timestamp: string): number | null => {
    if (/^\d+$/.test(timestamp)) {
      // Plain seconds
      return parseInt(timestamp, 10)
    }

    const parts = timestamp.split(':').map(Number)
    if (parts.some(isNaN)) return null

    if (parts.length === 2) {
      // MM:SS
      const [minutes, seconds] = parts
      return minutes * 60 + seconds
    } else if (parts.length === 3) {
      // HH:MM:SS
      const [hours, minutes, seconds] = parts
      return hours * 3600 + minutes * 60 + seconds
    }

    return null
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
    } else if (state.value.volume < 0.33) {
      return 'ph:speaker-low-bold'
    } else if (state.value.volume < 0.66) {
      return 'ph:speaker-bold'
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
