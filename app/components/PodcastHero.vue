<script setup lang="ts">
import type { Podcast, PlatformLinks } from '~/types/podcast'

interface Props {
  podcast: Podcast
  platforms?: PlatformLinks
}

const props = defineProps<Props>()

const platformEntries = computed(() => {
  if (!props.platforms) return []
  return Object.entries(props.platforms).filter(([_, url]) => url && url.trim() !== '')
})
</script>

<template>
  <header class="podcast-hero">
    <div class="podcast-hero__artwork">
      <NuxtImg :src="podcast.artwork" :alt="`${podcast.title} artwork`" width="400" height="400" loading="eager" />
    </div>

    <nav v-if="platformEntries.length > 0" class="podcast-hero__subscribe" aria-label="Subscribe to podcast">
      <div class="subscribe-buttons">
        <SubscribeButton
          v-for="[platform, url] in platformEntries"
          :key="platform"
          :platform="platform"
          :url="url"
        />
      </div>
    </nav>

    <div class="podcast-hero__content">
      <p class="podcast-hero__author">{{ podcast.author }}</p>
      <p class="podcast-hero__description">{{ podcast.description }}</p>
    </div>
  </header>
</template>

<style scoped>
.podcast-hero__content {
  text-align: center;
  max-width: 700px;
}

.podcast-hero__author {
  font-weight: 600;
  color: var(--muted-foreground);
  margin: 0;
  font-size: 1.1rem;
}

.podcast-hero__description {
  margin-top: 0.75rem;
  line-height: 1.6;
  color: var(--foreground);
  font-size: 1rem;
}

.podcast-hero__subscribe {
  margin: 2rem 0;
}

.subscribe-buttons {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0.625rem;
}

@media (max-width: 768px) {
  .podcast-hero__author {
    font-size: 1rem;
  }
  
  .subscribe-buttons {
    gap: 0.5rem;
  }
}
</style>
