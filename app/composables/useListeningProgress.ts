import { useStorage, useIntervalFn } from '@vueuse/core'

interface EpisodeProgress {
  position: number // Current playback position in seconds
  duration: number // Total episode duration
  lastUpdated: number // Timestamp of last update
}

interface ProgressStore {
  [episodeGuid: string]: EpisodeProgress
}

const STORAGE_KEY = 'podcast-listening-progress'
const SAVE_INTERVAL = 10000 // Save every 10 seconds while playing
const COMPLETION_THRESHOLD = 60 // Consider "completed" if within 60s of end

/**
 * Track and persist listening progress in localStorage
 * Auto-saves playback position every 10 seconds while playing
 */
export function useListeningProgress() {
  const player = useAudioPlayer()

  // Use VueUse's useStorage for reactive localStorage
  const progressStore = useStorage<ProgressStore>(STORAGE_KEY, {})

  /**
   * Get saved progress for an episode
   */
  const getProgress = (episodeGuid: string): EpisodeProgress | null => {
    return progressStore.value[episodeGuid] || null
  }

  /**
   * Save progress for an episode
   */
  const saveProgress = (
    episodeGuid: string,
    position: number,
    duration: number
  ) => {
    progressStore.value[episodeGuid] = {
      position,
      duration,
      lastUpdated: Date.now(),
    }
  }

  /**
   * Check if user has started listening to an episode
   * (has progress saved and position > 0)
   */
  const isStarted = (episodeGuid: string): boolean => {
    const progress = getProgress(episodeGuid)
    return progress !== null && progress.position > 0
  }

  /**
   * Check if episode is completed
   * (within last 60 seconds of duration)
   */
  const isCompleted = (episodeGuid: string): boolean => {
    const progress = getProgress(episodeGuid)
    if (!progress) return false

    const remainingTime = progress.duration - progress.position
    return remainingTime <= COMPLETION_THRESHOLD
  }

  /**
   * Get progress percentage (0-100)
   */
  const getProgressPercent = (episodeGuid: string): number => {
    const progress = getProgress(episodeGuid)
    if (!progress || progress.duration === 0) return 0

    return (progress.position / progress.duration) * 100
  }

  /**
   * Clear progress for an episode (mark as unwatched)
   */
  const clearProgress = (episodeGuid: string) => {
    delete progressStore.value[episodeGuid]
  }

  /**
   * Clear all progress
   */
  const clearAll = () => {
    progressStore.value = {}
  }

  /**
   * Get total listening time across all episodes (in seconds)
   */
  const getTotalListeningTime = (): number => {
    return Object.values(progressStore.value).reduce(
      (total, progress) => total + progress.position,
      0
    )
  }

  /**
   * Get count of started episodes
   */
  const getStartedCount = (): number => {
    return Object.keys(progressStore.value).filter(isStarted).length
  }

  /**
   * Get count of completed episodes
   */
  const getCompletedCount = (): number => {
    return Object.keys(progressStore.value).filter(isCompleted).length
  }

  // Auto-save current playback position every 10 seconds
  const { pause: pauseAutoSave, resume: resumeAutoSave } = useIntervalFn(
    () => {
      if (
        player.isPlaying.value &&
        player.currentEpisode.value &&
        player.currentTime.value > 0
      ) {
        saveProgress(
          player.currentEpisode.value.guid,
          player.currentTime.value,
          player.duration.value
        )
      }
    },
    SAVE_INTERVAL,
    { immediate: false }
  )

  // Start/stop auto-save based on playback state
  watch(
    () => player.isPlaying.value,
    (isPlaying) => {
      if (isPlaying) {
        resumeAutoSave()
      } else {
        pauseAutoSave()
        // Save one final time when pausing
        if (player.currentEpisode.value && player.currentTime.value > 0) {
          saveProgress(
            player.currentEpisode.value.guid,
            player.currentTime.value,
            player.duration.value
          )
        }
      }
    },
    { immediate: true }
  )

  return {
    // Core methods
    getProgress,
    saveProgress,
    clearProgress,
    clearAll,

    // Status checks
    isStarted,
    isCompleted,
    getProgressPercent,

    // Statistics
    getTotalListeningTime,
    getStartedCount,
    getCompletedCount,

    // Direct access to store (for reactive iteration)
    progressStore,
  }
}
