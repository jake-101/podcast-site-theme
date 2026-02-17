<script setup lang="ts">
import type { Episode } from '~/types/podcast'

// Composables and utils are auto-imported by Nuxt 4
const { podcast, episodes, loading, error } = usePodcast()
const appConfig = useAppConfig()
const player = useAudioPlayer()

// Handle play episode
const handlePlayEpisode = (episode: Episode) => {
  player.play(episode)
}

// SEO: Set meta tags and structured data
useHead({
  title: computed(() => podcast.value?.title || appConfig.podcast.siteTitle || 'Podcast'),
  meta: computed(() => {
    if (!podcast.value) return []
    
    const ogTags = generatePodcastOGTags(podcast.value)
    const twitterTags = generatePodcastTwitterTags(podcast.value)
    
    return [
      { name: 'description', content: podcast.value.description },
      // Open Graph
      { property: 'og:title', content: ogTags['og:title'] },
      { property: 'og:description', content: ogTags['og:description'] },
      { property: 'og:image', content: ogTags['og:image'] },
      { property: 'og:type', content: ogTags['og:type'] },
      ...(ogTags['og:url'] ? [{ property: 'og:url', content: ogTags['og:url'] }] : []),
      // Twitter Card
      { name: 'twitter:card', content: twitterTags['twitter:card'] },
      { name: 'twitter:title', content: twitterTags['twitter:title'] },
      { name: 'twitter:description', content: twitterTags['twitter:description'] },
      { name: 'twitter:image', content: twitterTags['twitter:image'] },
    ]
  }),
  script: computed(() => {
    if (!podcast.value) return []
    
    return [
      {
        type: 'application/ld+json',
        children: JSON.stringify(generatePodcastSeriesSD(podcast.value)),
      },
    ]
  }),
})
</script>

<template>
  <div class="home-page">
    <!-- Loading state -->
    <div v-if="loading" class="loading-state">
      <p>Loading podcast...</p>
    </div>

    <!-- Error state -->
    <div v-else-if="error" class="error-state">
      <h2>Failed to load podcast</h2>
      <p>{{ error.message }}</p>
    </div>

    <!-- Main content -->
    <template v-else-if="podcast">
      <!-- Hero section: podcast overview or featured latest episode -->
      <FeaturedEpisodeHero
        v-if="appConfig.podcast.heroType === 'featured' && episodes.length > 0"
        :episode="episodes[0]"
        :podcast="podcast"
        :platforms="appConfig.podcast.platforms"
        @play="handlePlayEpisode"
      />
      <PodcastHero
        v-else
        :podcast="podcast"
        :platforms="appConfig.podcast.platforms"
      />

      <!-- Episode grid with search and pagination -->
      <div class="container">
        <section class="episodes-section">
          <EpisodeGrid 
            :episodes="appConfig.podcast.heroType === 'featured' ? episodes.slice(1) : episodes"
            :episodes-per-page="appConfig.podcast.episodesPerPage"
            :show-artwork="podcast.artwork"
            :hide-artwork="appConfig.podcast.hideArtwork"
            @play="handlePlayEpisode"
          />
        </section>
      </div>
    </template>
  </div>
</template>

<style scoped>
.home-page {
  width: 100%;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 1rem;
}

.loading-state,
.error-state {
  text-align: center;
  padding: 3rem 1rem;
}

.error-state {
  color: var(--error, #dc2626);
}

.error-state h2 {
  margin-bottom: 0.5rem;
}

.episodes-section {
  margin-top: 3rem;
}

@media (max-width: 768px) {
  .episodes-section {
    margin-top: 2rem;
  }
}
</style>
