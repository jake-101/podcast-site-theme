<script setup lang="ts">
import type { Episode } from '~/types/podcast'

interface Props {
  episodes: Episode[]
  episodesPerPage?: number
  showArtwork?: string
  hideArtwork?: boolean
  loading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  episodesPerPage: 12,
  loading: false,
})

const emit = defineEmits<{
  play: [episode: Episode]
}>()

// Search functionality — shared state with nav search input
const { query: searchQuery } = useEpisodeSearch()
const filteredEpisodes = computed(() => {
  if (!searchQuery.value.trim()) {
    return props.episodes
  }
  
  const query = searchQuery.value.toLowerCase().trim()
  return props.episodes.filter(episode => 
    String(episode.title).toLowerCase().includes(query) ||
    String(episode.description).toLowerCase().includes(query) ||
    (episode.htmlContent ? episode.htmlContent.toLowerCase().includes(query) : false)
  )
})

// Pagination — synced with URL query string (?page=N)
const route = useRoute()
const router = useRouter()

const totalPages = computed(() => 
  Math.ceil(filteredEpisodes.value.length / props.episodesPerPage)
)

/** Parse and clamp page number from route query */
const currentPage = computed(() => {
  const raw = Number(route.query.page)
  if (!Number.isFinite(raw) || raw < 1) return 1
  return Math.min(raw, Math.max(1, totalPages.value))
})

const paginatedEpisodes = computed(() => {
  const start = (currentPage.value - 1) * props.episodesPerPage
  const end = start + props.episodesPerPage
  return filteredEpisodes.value.slice(start, end)
})

/** Update URL query param. Uses replace to avoid polluting browser history. */
const setPage = (page: number) => {
  const clamped = Math.max(1, Math.min(page, totalPages.value))
  // Omit ?page=1 to keep the default URL clean
  const query = { ...route.query }
  if (clamped <= 1) {
    delete query.page
  } else {
    query.page = String(clamped)
  }
  router.replace({ query })
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

// Reset to page 1 when search changes
watch(searchQuery, () => {
  if (route.query.page) {
    const query = { ...route.query }
    delete query.page
    router.replace({ query })
  }
})

const handlePlay = (episode: Episode) => {
  emit('play', episode)
}
</script>

<template>
  <div>
    <!-- Search result count shown when a query is active -->
    <p v-if="searchQuery" class="episode-grid__result-count">
      <small>{{ filteredEpisodes.length }} {{ filteredEpisodes.length === 1 ? 'episode' : 'episodes' }} found</small>
    </p>

    <div v-if="loading">
      <p>Loading episodes...</p>
    </div>
    
    <div v-else-if="filteredEpisodes.length === 0">
      <p>No episodes found.</p>
    </div>
    
    <div v-else>
      <div class="episode-grid">
        <EpisodeCard
          v-for="episode in paginatedEpisodes"
          :key="episode.guid"
          :episode="episode"
          :show-artwork="showArtwork"
          :hide-artwork="hideArtwork"
          @play="handlePlay"
        />
      </div>
      
      <Pagination
        v-if="totalPages > 1"
        :current-page="currentPage"
        :total-pages="totalPages"
        @update:current-page="setPage"
      />
    </div>
  </div>
</template>
