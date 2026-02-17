<script setup lang="ts">
import type { Episode, Podcast, PaginatedEpisodes, EpisodeSummary } from '~/types/podcast'

const route = useRoute()
const appConfig = useAppConfig()
const player = useAudioPlayer()
const { clear: clearActiveEpisode } = useActiveEpisode()

onMounted(() => {
  clearActiveEpisode()
})

// Parse page number from route param — redirect page 1 to /
const pageNumber = computed(() => {
  const raw = Number(route.params.pageNumber)
  return Number.isFinite(raw) && raw >= 1 ? raw : 1
})

// Redirect /page/1 to / to avoid duplicate content
if (pageNumber.value <= 1) {
  navigateTo('/', { redirectCode: 301 })
}

// Fetch podcast metadata + this page of episodes in one batched call
const { data, status, error } = await useAsyncData(
  `episodes-page-${pageNumber.value}`,
  async (_nuxtApp, { signal }) => {
    const [meta, episodePage] = await Promise.all([
      $fetch<Podcast>('/api/podcast/meta', { signal }),
      $fetch<PaginatedEpisodes>('/api/podcast/episodes', {
        query: { page: pageNumber.value, limit: appConfig.podcast.episodesPerPage },
        signal,
      }),
    ])
    return { meta, episodePage }
  },
)

const podcast = computed(() => data.value?.meta ?? null)
const episodes = computed(() => data.value?.episodePage?.episodes ?? [])
const totalPages = computed(() => data.value?.episodePage?.totalPages ?? 0)
const loading = computed(() => status.value === 'pending')

// Handle play episode
const handlePlayEpisode = (episode: EpisodeSummary | Episode) => {
  player.play(episode as Episode)
}

// SEO: Set meta tags
useHead({
  title: computed(() => {
    const title = podcast.value?.title || appConfig.podcast.siteTitle || 'Podcast'
    return `Page ${pageNumber.value} - ${title}`
  }),
  meta: computed(() => {
    if (!podcast.value) return []

    return [
      { name: 'description', content: `${podcast.value.title} episodes - page ${pageNumber.value}` },
      { property: 'og:title', content: `${podcast.value.title} - Page ${pageNumber.value}` },
      { property: 'og:description', content: podcast.value.description },
      { property: 'og:image', content: podcast.value.artwork },
    ]
  }),
})
</script>

<template>
  <div class="home-page">
    <!-- Loading state -->
    <div v-if="loading" class="loading-state">
      <p>Loading episodes...</p>
    </div>

    <!-- Error state -->
    <div v-else-if="error" class="error-state">
      <h2>Failed to load episodes</h2>
      <p>{{ error.message }}</p>
    </div>

    <!-- Main content -->
    <template v-else-if="podcast">
      <div class="container">
        <section class="episodes-section">
          <h2 class="episodes-section__title">All Episodes</h2>
          <EpisodeGrid
            :episodes="episodes"
            :show-artwork="podcast.artwork"
            :hide-artwork="appConfig.podcast.hideArtwork"
            :total-pages="totalPages"
            :current-page="pageNumber"
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
  margin-top: 2rem;
}

.episodes-section__title {
  margin-bottom: 1.5rem;
}
</style>
