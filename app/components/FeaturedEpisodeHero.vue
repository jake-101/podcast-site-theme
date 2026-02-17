<script setup lang="ts">
import type { Episode, Podcast, PlatformLinks } from '~/types/podcast'

interface Props {
  episode: Episode
  podcast: Podcast
  platforms?: PlatformLinks
}

const props = defineProps<Props>()

const emit = defineEmits<{
  play: [episode: Episode]
}>()

const player = useAudioPlayer()

const isCurrentEpisode = computed(() => player.currentEpisode.value?.guid === props.episode.guid)
const isPlaying = computed(() => isCurrentEpisode.value && player.isPlaying.value)

const artwork = computed(() => props.episode.artwork || props.podcast.artwork || '')

const formattedDate = computed(() => {
  const date = new Date(props.episode.pubDate)
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
})

const formattedDuration = computed(() => formatDurationFriendly(props.episode.duration))

const truncatedDescription = computed(() => {
  const text = props.episode.description.replace(/<[^>]*>/g, '')
  if (text.length <= 300) return text
  return text.substring(0, 300).trim() + '...'
})

const platformEntries = computed(() => {
  if (!props.platforms) return []
  return Object.entries(props.platforms).filter(([_, url]) => url && url.trim() !== '')
})

const handlePlay = () => {
  if (isPlaying.value) {
    player.pause()
  } else {
    emit('play', props.episode)
  }
}
</script>

<template>
  <header class="featured-hero">
    <div class="featured-hero__inner container">
      <div class="featured-hero__artwork">
        <NuxtImg
          :src="artwork"
          :alt="`${episode.title} artwork`"
          width="480"
          height="480"
          loading="eager"
        />
      </div>

      <div class="featured-hero__content">
        <p class="featured-hero__label">Latest Episode</p>

        <NuxtLink :to="`/episodes/${episode.slug}`" class="featured-hero__title-link">
          <h2 class="featured-hero__title">{{ episode.title }}</h2>
        </NuxtLink>

        <div class="featured-hero__meta">
          <span v-if="episode.episodeType !== 'full'" class="episode-badge" :class="`episode-badge--${episode.episodeType}`">
            {{ episode.episodeType }}
          </span>
          <span class="featured-hero__meta-item">
            <Icon name="ph:calendar-blank" size="14" />
            {{ formattedDate }}
          </span>
          <span class="featured-hero__meta-item">
            <Icon name="ph:clock" size="14" />
            {{ formattedDuration }}
          </span>
        </div>

        <p class="featured-hero__description">{{ truncatedDescription }}</p>

        <div class="featured-hero__actions">
          <button
            type="button"
            class="featured-hero__play-btn"
            @click="handlePlay"
          >
            <Icon v-if="isPlaying" name="ph:pause-fill" size="18" />
            <Icon v-else name="ph:play-fill" size="18" />
            {{ isPlaying ? 'Pause' : 'Play Latest Episode' }}
          </button>

          <NuxtLink :to="`/episodes/${episode.slug}`" class="featured-hero__detail-link">
            Show Notes
            <Icon name="ph:arrow-right" size="14" />
          </NuxtLink>
        </div>

        <nav v-if="platformEntries.length > 0" class="featured-hero__subscribe" aria-label="Subscribe to podcast">
          <div class="subscribe-buttons">
            <SubscribeButton
              v-for="[platform, url] in platformEntries"
              :key="platform"
              :platform="platform"
              :url="url"
            />
          </div>
        </nav>
      </div>
    </div>
  </header>
</template>

<style scoped>
.featured-hero {
  background: var(--surface-raised, var(--background));
  border-bottom: 1px solid var(--border);
  padding: 3rem 0;
}

.featured-hero__inner {
  display: grid;
  grid-template-columns: 320px 1fr;
  gap: 3rem;
  align-items: center;
}

.featured-hero__artwork {
  flex-shrink: 0;
}

.featured-hero__artwork {
  aspect-ratio: 1;
  overflow: hidden;
  border-radius: var(--radius-large, 1rem);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
}

.featured-hero__artwork img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.featured-hero__label {
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--primary);
  margin: 0 0 0.75rem;
}

.featured-hero__title-link {
  text-decoration: none;
  color: inherit;
}

.featured-hero__title-link:hover .featured-hero__title {
  text-decoration: underline;
}

.featured-hero__title {
  font-size: 1.75rem;
  line-height: 1.25;
  font-weight: 700;
  margin: 0 0 0.75rem;
}

.featured-hero__meta {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
  margin-bottom: 1rem;
}

.featured-hero__meta-item {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 0.85rem;
  color: var(--muted-foreground);
}

.featured-hero__description {
  color: var(--foreground);
  line-height: 1.65;
  margin: 0 0 1.5rem;
}

.featured-hero__actions {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
  margin-bottom: 1.5rem;
}

.featured-hero__play-btn {
  all: unset;
  box-sizing: border-box;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.65rem 1.5rem;
  background-color: var(--primary);
  color: var(--primary-foreground);
  border-radius: var(--radius-medium);
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: background-color var(--transition-fast);
}

.featured-hero__play-btn:hover {
  background-color: color-mix(in srgb, var(--primary), black 10%);
}

.featured-hero__detail-link {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  color: var(--primary);
  font-weight: 500;
  text-decoration: none;
}

.featured-hero__detail-link:hover {
  text-decoration: underline;
}

.featured-hero__subscribe {
  margin-top: 1rem;
}

.subscribe-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 0.625rem;
}

@media (max-width: 768px) {
  .featured-hero {
    padding: 2rem 0;
  }

  .featured-hero__inner {
    grid-template-columns: 1fr;
    gap: 1.5rem;
  }

  .featured-hero__artwork img {
    max-width: 280px;
    margin: 0 auto;
  }

  .featured-hero__title {
    font-size: 1.4rem;
  }
}
</style>
