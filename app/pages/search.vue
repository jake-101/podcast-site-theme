<script setup lang="ts">
const route = useRoute()
const router = useRouter()
const appConfig = useAppConfig()
const { podcast } = usePodcast()
const { searchInput, results, isSearching } = useEpisodeSearch()

// Read ?q= from URL on mount and populate search input
const queryFromUrl = computed(() => (route.query.q as string) || '')

// Sync URL query into the search composable on mount + route changes
watch(queryFromUrl, (q) => {
  if (q && q !== searchInput.value) {
    searchInput.value = q
  }
}, { immediate: true })

// Truncate description for display
const truncate = (text: string, len = 200) => {
  const plain = text.replace(/<[^>]*>/g, '')
  if (plain.length <= len) return plain
  return plain.substring(0, len).trim() + '...'
}

// Navigate to episode
const goToEpisode = (slug: string) => {
  router.push(`/episodes/${slug}`)
}

// SEO
const pageTitle = computed(() => {
  const podcastName = podcast.value?.title || appConfig.podcast.siteTitle || 'Podcast'
  if (queryFromUrl.value) {
    return `Search: ${queryFromUrl.value} - ${podcastName}`
  }
  return `Search - ${podcastName}`
})

useHead({
  title: pageTitle,
})
</script>

<template>
  <div class="container search-page">
    <header class="search-page__header">
      <h1>Search Episodes</h1>
    </header>

    <!-- Search results are entirely client-side (search index uses server: false).
         Wrap in ClientOnly to avoid hydration mismatches between server (no data)
         and client (data loads lazily). -->
    <ClientOnly>
      <p v-if="isSearching && results.length > 0" class="search-page__count">
        {{ results.length }} {{ results.length === 1 ? 'result' : 'results' }} for "<strong>{{ queryFromUrl }}</strong>"
      </p>

      <!-- No query state -->
      <div v-if="!queryFromUrl" class="search-page__empty">
        <Icon name="ph:magnifying-glass" size="48" />
        <p>Search for episodes by title or description.</p>
      </div>

      <!-- No results state -->
      <div v-else-if="isSearching && results.length === 0" class="search-page__empty">
        <Icon name="ph:magnifying-glass" size="48" />
        <p>No episodes found for "<strong>{{ queryFromUrl }}</strong>"</p>
      </div>

      <!-- Results list -->
      <ul v-else-if="results.length > 0" class="search-page__results">
        <li
          v-for="result in results"
          :key="result.slug"
          class="search-page__result"
          @click="goToEpisode(result.slug)"
        >
          <NuxtLink :to="`/episodes/${result.slug}`" class="search-page__result-link">
            <div v-if="result.artwork" class="search-page__result-artwork">
              <NuxtImg :src="result.artwork" :alt="result.title" sizes="80px" loading="lazy" />
            </div>
            <div class="search-page__result-content">
              <h2 class="search-page__result-title">{{ result.title }}</h2>
              <div class="search-page__result-meta">
                <span v-if="result.episodeType !== 'full'" class="search-page__badge" :class="`search-page__badge--${result.episodeType}`">
                  {{ result.episodeType }}
                </span>
                <span v-if="result.episodeNumber" class="search-page__result-meta-item">
                  <Icon name="ph:hash" size="14" />
                  {{ result.episodeNumber }}
                </span>
                <span class="search-page__result-meta-item">
                  <Icon name="ph:calendar-blank" size="14" />
                  {{ formatDate(result.pubDate) }}
                </span>
                <span class="search-page__result-meta-item">
                  <Icon name="ph:clock" size="14" />
                  {{ formatDurationFriendly(result.duration) }}
                </span>
              </div>
              <p class="search-page__result-description">{{ truncate(result.description) }}</p>
            </div>
          </NuxtLink>
        </li>
      </ul>

      <!-- Loading state while search index loads -->
      <div v-else-if="queryFromUrl" class="search-page__empty">
        <p>Searching...</p>
      </div>

      <template #fallback>
        <div v-if="queryFromUrl" class="search-page__empty">
          <p>Loading search...</p>
        </div>
        <div v-else class="search-page__empty">
          <p>Search for episodes by title or description.</p>
        </div>
      </template>
    </ClientOnly>
  </div>
</template>

<style scoped>
.search-page {
  padding-top: 2rem;
  padding-bottom: 2rem;
}

.search-page__header {
  margin-bottom: 1.5rem;
}

.search-page__header h1 {
  margin: 0 0 0.25rem;
  font-size: 1.75rem;
}

.search-page__count {
  color: var(--muted-foreground);
  margin: 0;
}

.search-page__empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  padding: 4rem 1rem;
  text-align: center;
  color: var(--muted-foreground);
}

.search-page__empty p {
  margin: 0;
  font-size: 1.1rem;
}

/* Results list */
.search-page__results {
  all: unset;
  display: flex;
  flex-direction: column;
  gap: 0;
  list-style: none;
}

.search-page__result {
  border-bottom: 1px solid var(--border);
  cursor: pointer;
  transition: background-color 0.15s;
}

.search-page__result:first-child {
  border-top: 1px solid var(--border);
}

.search-page__result:hover {
  background-color: var(--muted);
}

.search-page__result-link {
  display: flex;
  gap: 1rem;
  padding: 1rem 0.75rem;
  text-decoration: none;
  color: inherit;
}

.search-page__result-artwork {
  flex-shrink: 0;
  width: 80px;
  height: 80px;
  border-radius: 0.375rem;
  overflow: hidden;
}

.search-page__result-artwork img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.search-page__result-content {
  flex: 1;
  min-width: 0;
}

.search-page__result-title {
  margin: 0 0 0.35rem;
  font-size: 1.1rem;
  line-height: 1.3;
}

.search-page__result:hover .search-page__result-title {
  text-decoration: underline;
}

.search-page__result-meta {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
  margin-bottom: 0.5rem;
}

.search-page__result-meta-item {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.8rem;
  color: var(--muted-foreground);
}

.search-page__badge {
  display: inline-block;
  padding: 0.1rem 0.4rem;
  border-radius: 0.25rem;
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.search-page__badge--bonus {
  background-color: color-mix(in srgb, var(--primary) 15%, transparent);
  color: var(--primary);
}

.search-page__badge--trailer {
  background-color: color-mix(in srgb, var(--accent, orange) 15%, transparent);
  color: var(--accent, orange);
}

.search-page__result-description {
  margin: 0;
  font-size: 0.875rem;
  color: var(--muted-foreground);
  line-height: 1.5;
}

/* Responsive */
@media (max-width: 600px) {
  .search-page__result-artwork {
    width: 60px;
    height: 60px;
  }

  .search-page__result-title {
    font-size: 1rem;
  }
}
</style>
