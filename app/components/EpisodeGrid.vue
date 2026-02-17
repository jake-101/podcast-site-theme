<script setup lang="ts">
import type { EpisodeSummary, Episode } from '~/types/podcast'

interface Props {
  /** Pre-paginated episodes for the current page */
  episodes: (EpisodeSummary | Episode)[]
  showArtwork?: string
  hideArtwork?: boolean
  loading?: boolean
  /** Total number of pages (from API) */
  totalPages?: number
  /** Current page number (from route) */
  currentPage?: number
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  totalPages: 1,
  currentPage: 1,
})

const emit = defineEmits<{
  play: [episode: EpisodeSummary | Episode]
}>()

const router = useRouter()

/**
 * Navigate to a page using route-based pagination.
 * Page 1 → /, page 2+ → /page/N
 */
const goToPage = (page: number) => {
  if (page <= 1) {
    router.push('/')
  } else {
    router.push(`/page/${page}`)
  }
}

const handlePlay = (episode: EpisodeSummary | Episode) => {
  emit('play', episode)
}
</script>

<template>
  <div>
    <div v-if="loading">
      <p>Loading episodes...</p>
    </div>

    <div v-else-if="episodes.length === 0">
      <p>No episodes found.</p>
    </div>

    <div v-else>
      <div class="episode-grid">
        <AnimatePresence mode="popLayout">
          <Motion
            v-for="episode in episodes"
            :key="episode.guid"
            as="div"
            :initial="{ opacity: 0 }"
            :animate="{ opacity: 1 }"
            :exit="{ opacity: 0 }"
            :transition="{ duration: 0.2 }"
          >
            <EpisodeCard
              :episode="episode"
              :show-artwork="showArtwork"
              :hide-artwork="hideArtwork"
              @play="handlePlay"
            />
          </Motion>
        </AnimatePresence>
      </div>

      <Pagination
        v-if="totalPages > 1"
        :current-page="currentPage"
        :total-pages="totalPages"
        @update:current-page="goToPage"
      />
    </div>
  </div>
</template>
