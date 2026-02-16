<script setup lang="ts">
// Composables are auto-imported by Nuxt 4
const player = useAudioPlayer()
const { podcast } = usePodcast()

// Local state for dragging seek bar
const isDragging = ref(false)
const dragPosition = ref(0)

/**
 * Format seconds to MM:SS or HH:MM:SS
 */
const formatTime = (seconds: number): string => {
  if (isNaN(seconds) || !isFinite(seconds)) return '0:00'
  
  const hrs = Math.floor(seconds / 3600)
  const mins = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)
  
  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

/**
 * Handle seek bar click/drag
 */
const handleProgressClick = (event: MouseEvent) => {
  const target = event.currentTarget as HTMLElement
  const rect = target.getBoundingClientRect()
  const percent = (event.clientX - rect.left) / rect.width
  const seekTime = percent * player.duration.value
  player.seek(seekTime)
}

const handleProgressDragStart = (event: MouseEvent) => {
  isDragging.value = true
  updateDragPosition(event)
}

const handleProgressDrag = (event: MouseEvent) => {
  if (isDragging.value) {
    updateDragPosition(event)
  }
}

const handleProgressDragEnd = (event: MouseEvent) => {
  if (isDragging.value) {
    updateDragPosition(event)
    player.seek(dragPosition.value)
    isDragging.value = false
  }
}

const updateDragPosition = (event: MouseEvent) => {
  const progressBar = (event.currentTarget as HTMLElement).querySelector('.audio-player__progress-bar') as HTMLElement
  if (!progressBar) return
  
  const rect = progressBar.getBoundingClientRect()
  const percent = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width))
  dragPosition.value = percent * player.duration.value
}

// Current progress (use drag position while dragging)
const currentProgress = computed(() => {
  if (isDragging.value) {
    return (dragPosition.value / player.duration.value) * 100
  }
  return player.progressPercent.value
})

const currentDisplayTime = computed(() => {
  if (isDragging.value) {
    return dragPosition.value
  }
  return player.currentTime.value
})

// Episode artwork with fallback to show artwork
const artworkUrl = computed(() => {
  return player.currentEpisode.value?.artwork || podcast.value?.artwork || ''
})
</script>

<template>
  <div class="audio-player">
    <div class="audio-player__container">
      <!-- Episode artwork -->
      <div class="audio-player__artwork">
        <NuxtImg
          v-if="artworkUrl"
          :src="artworkUrl" 
          :alt="player.currentEpisode.value?.title || 'Podcast artwork'"
          width="48"
          height="48"
          loading="lazy"
        />
        <div v-else class="audio-player__artwork-placeholder">
          <Icon name="ph:music-notes" size="24" />
        </div>
      </div>

      <!-- Episode info -->
      <div class="audio-player__info">
        <h3 class="audio-player__title">
          {{ player.currentEpisode.value?.title || 'No episode loaded' }}
        </h3>
      </div>

      <!-- Playback controls -->
      <div class="audio-player__controls">
        <button 
          type="button"
          @click="player.skipBackward()"
          :disabled="!player.hasEpisode.value || player.isLoading.value"
          aria-label="Skip backward 15 seconds"
          title="Skip backward 15 seconds"
        >
          <Icon name="ph:rewind-bold" size="20" />
        </button>

        <button 
          type="button"
          class="audio-player__play-btn"
          @click="player.toggle()"
          :disabled="!player.hasEpisode.value || player.isLoading.value"
          aria-label="Play/Pause"
          title="Play/Pause"
        >
          <Icon v-if="player.isLoading.value" name="ph:spinner-bold" size="22" />
          <Icon v-else-if="player.isPlaying.value" name="ph:pause-fill" size="22" />
          <Icon v-else name="ph:play-fill" size="22" />
        </button>

        <button 
          type="button"
          @click="player.skipForward()"
          :disabled="!player.hasEpisode.value || player.isLoading.value"
          aria-label="Skip forward 15 seconds"
          title="Skip forward 15 seconds"
        >
          <Icon name="ph:fast-forward-bold" size="20" />
        </button>
      </div>

      <!-- Progress bar -->
      <div 
        class="audio-player__progress"
        @mousedown="handleProgressDragStart"
        @mousemove="handleProgressDrag"
        @mouseup="handleProgressDragEnd"
        @mouseleave="handleProgressDragEnd"
      >
        <div 
          class="audio-player__progress-bar"
          @click="handleProgressClick"
          role="progressbar"
          :aria-valuenow="currentDisplayTime"
          :aria-valuemin="0"
          :aria-valuemax="player.duration.value"
        >
          <div 
            class="audio-player__progress-fill"
            :style="{ width: `${currentProgress}%` }"
          ></div>
        </div>
        <div class="audio-player__time">
          <span>{{ formatTime(currentDisplayTime) }}</span>
          <span>{{ formatTime(player.duration.value) }}</span>
        </div>
      </div>

      <!-- Secondary controls -->
      <div class="audio-player__secondary-controls">
        <!-- Playback speed -->
        <SpeedMenu 
          :current-speed="player.playbackRate.value"
          :speed-presets="player.speedPresets"
          @select-speed="player.setSpeed"
        />

        <!-- Volume control (hidden on mobile) -->
        <div class="audio-player__volume">
          <button
            type="button"
            class="audio-player__mute-button"
            @click="player.toggleMute()"
            :aria-label="player.isMuted.value ? 'Unmute' : 'Mute'"
            :title="player.isMuted.value ? 'Unmute' : 'Mute'"
          >
            <Icon :name="player.speakerIcon.value" size="18" />
          </button>
          <input 
            id="volume-slider"
            type="range" 
            min="0" 
            max="1" 
            step="0.01"
            :value="player.volume.value"
            @input="(e) => player.setVolume(parseFloat((e.target as HTMLInputElement).value))"
            aria-label="Volume"
          >
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.audio-player__artwork-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--muted);
  color: var(--muted-foreground);
}

.audio-player__mute-button {
  padding: 0.25rem;
  background: transparent;
  border: none;
  cursor: pointer;
  color: var(--foreground);
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius);
  transition: background-color 0.2s;
}

.audio-player__mute-button:hover {
  background-color: var(--accent);
  color: var(--accent-foreground);
}
</style>
