<script setup lang="ts">
import type { Episode } from '~/types/podcast'

interface Props {
  episode: Episode
  showArtwork?: string // Fallback to show artwork if episode has none
}

const props = defineProps<Props>()

const emit = defineEmits<{
  play: [episode: Episode]
}>()

const player = useAudioPlayer()

const artwork = computed(() => props.episode.artwork || props.showArtwork || '')

// Check if this episode is currently playing
const isCurrentEpisode = computed(() => player.currentEpisode.value?.guid === props.episode.guid)
const isPlaying = computed(() => isCurrentEpisode.value && player.isPlaying.value)

// Format date to human-readable format
const formattedDate = computed(() => {
  const date = new Date(props.episode.pubDate)
  return date.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric' 
  })
})

// Format duration from seconds to HH:MM:SS or MM:SS
const formattedDuration = computed(() => {
  const seconds = props.episode.duration
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)
  
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
  }
  return `${minutes}:${String(secs).padStart(2, '0')}`
})

// Strip HTML tags and truncate description to ~150 characters
const truncatedDescription = computed(() => {
  const text = props.episode.description.replace(/<[^>]*>/g, '')
  if (text.length <= 150) return text
  return text.substring(0, 150).trim() + '...'
})

const badgeClass = computed(() => {
  return `episode-badge episode-badge--${props.episode.episodeType}`
})

const handlePlay = (e: Event) => {
  e.preventDefault()
  e.stopPropagation()
  
  if (isPlaying.value) {
    player.pause()
  } else {
    emit('play', props.episode)
  }
}
</script>

<template>
  <article class="card episode-card">
    <NuxtLink :to="`/episodes/${episode.slug}`" class="episode-card__link">
      <div class="episode-card__artwork">
        <NuxtImg :src="artwork" :alt="`${episode.title} artwork`" sizes="300px" loading="lazy" />
      </div>
      
      <div class="episode-card__meta">
        <span v-if="episode.episodeType !== 'full'" :class="badgeClass">{{ episode.episodeType }}</span>
        <span class="episode-card__meta-item">
          <Icon name="ph:calendar-blank" size="14" />
          {{ formattedDate }}
        </span>
      </div>
      
      <div class="episode-card__body">
        <h3>{{ episode.title }}</h3>
        <p>
          <small>{{ truncatedDescription }}</small>
        </p>
      </div>
      
      <div class="episode-card__actions">
        <button @click="handlePlay" type="button" class="episode-card__play-btn">
          <Icon v-if="isPlaying" name="ph:pause-fill" size="14" />
          <Icon v-else name="ph:play-fill" size="14" />
          {{ isPlaying ? 'Pause' : 'Play Episode' }}
        </button>
        <span class="episode-card__duration">
          <Icon name="ph:clock" size="14" />
          {{ formattedDuration }}
        </span>
      </div>
    </NuxtLink>
  </article>
</template>

<style scoped>
.episode-card__link {
  text-decoration: none;
  color: inherit;
  display: flex;
  flex-direction: column;
  height: 100%;
}

.episode-card__artwork {
  margin: calc(var(--space-6, 1.5rem) * -1);
  margin-bottom: 0;
  overflow: hidden;
  border-radius: var(--radius-medium) var(--radius-medium) 0 0;
}

.episode-card__artwork img {
  width: 100%;
  aspect-ratio: 1;
  object-fit: cover;
  display: block;
  transition: transform var(--transition-hover, 0.3s) ease-out;
}

.episode-card__link:hover .episode-card__artwork img {
  transform: scale(1.02);
}

.episode-card__meta {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  flex-wrap: wrap;
  margin-top: 1rem;
}

.episode-card__meta-item {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.8rem;
  color: var(--muted-foreground);
}

.episode-card__body {
  flex: 1;
  margin-top: 0.25rem;
}

.episode-card__body h3 {
  margin: 0.25rem 0 0.5rem;
  font-size: 1.1rem;
  line-height: 1.3;
}

.episode-card__body p {
  margin: 0;
  color: var(--muted-foreground);
}

.episode-card__actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  margin-top: 1rem;
}

.episode-card__duration {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.875rem;
  color: var(--muted-foreground);
  font-weight: 500;
}

.episode-card__play-btn {
  all: unset;
  box-sizing: border-box;
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.5rem 1rem;
  background-color: var(--primary);
  color: var(--primary-foreground);
  border-radius: var(--radius-medium);
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: background-color var(--transition-fast);
}

.episode-card__play-btn:hover {
  background-color: color-mix(in srgb, var(--primary), black 10%);
  color: var(--primary-foreground);
}

.episode-card__link:hover h3 {
  text-decoration: underline;
}
</style>
