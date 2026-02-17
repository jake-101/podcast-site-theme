<script setup lang="ts">
// Composables and utils are auto-imported by Nuxt 4
const route = useRoute()
const router = useRouter()
const requestURL = useRequestURL()
const { podcast, findEpisodeBySlug } = usePodcast()
const player = useAudioPlayer()
const { getPersonsForEpisode } = usePodcastPeople()

// Get episode from slug
const slug = computed(() => route.params.slug as string)
const episode = computed(() => findEpisodeBySlug(slug.value))

// Handle 404 if episode not found
if (!episode.value && !import.meta.server) {
  navigateTo('/', { redirectCode: 404 })
}

// Linkified show notes with clickable timestamps
const showNotes = computed(() => {
  if (!episode.value?.htmlContent) return ''
  return linkifyTimestamps(episode.value.htmlContent)
})

// Handle timestamp clicks
const handleTimestampClick = (event: MouseEvent) => {
  const target = event.target as HTMLElement
  if (target.classList.contains('timestamp-link')) {
    event.preventDefault()
    const timestamp = target.getAttribute('data-timestamp')
    if (timestamp && episode.value) {
      const seconds = parseInt(timestamp, 10)
      
      // Load episode if not current, then seek
      if (player.currentEpisode.value?.guid !== episode.value.guid) {
        player.play(episode.value).then(() => {
          player.seek(seconds)
        })
      } else {
        player.seek(seconds)
      }
    }
  }
}

// Auto-seek on mount if ?t= query parameter is present
// Uses auto-imported parseTimestamp from utils/timestamps.ts
onMounted(() => {
  if (route.query.t && episode.value) {
    const timestampSeconds = parseTimestamp(route.query.t as string)
    if (timestampSeconds > 0) {
      // Small delay to ensure player is ready
      setTimeout(() => {
        if (player.currentEpisode.value?.guid === episode.value?.guid) {
          player.seek(timestampSeconds)
        }
      }, 500)
    }
  }
})

// Share with timestamp
const shareUrl = computed(() => {
  if (!episode.value) return ''
  return player.getShareUrl(episode.value.slug)
})

const copyShareUrl = async () => {
  if (shareUrl.value) {
    try {
      await navigator.clipboard.writeText(shareUrl.value)
      alert('Share link copied to clipboard!')
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }
}

// Check if this episode is currently playing
const isCurrentEpisode = computed(() => player.currentEpisode.value?.guid === episode.value?.guid)
const isPlaying = computed(() => isCurrentEpisode.value && player.isPlaying.value)

// Transcript availability and tab state
const hasTranscript = computed(() => !!episode.value?.podcast2?.transcript?.url)
const activeTab = ref<'shownotes' | 'transcript'>('shownotes')

// Persons from the people composable (aggregated, with person page links)
const episodePersons = computed(() => {
  if (!episode.value) return []
  return getPersonsForEpisode(episode.value.slug)
})

// Play/pause this episode
const playEpisode = () => {
  if (!episode.value) return
  
  if (isPlaying.value) {
    player.pause()
  } else {
    player.play(episode.value)
  }
}

// SEO: Episode meta tags and structured data
useHead({
  title: computed(() => {
    if (!episode.value || !podcast.value) return 'Episode'
    return `${episode.value.title} - ${podcast.value.title}`
  }),
  meta: computed(() => {
    if (!episode.value || !podcast.value) return []
    
    const episodeUrl = `${requestURL.origin}/episodes/${episode.value.slug}`
    const ogTags = generateEpisodeOGTags(episode.value, podcast.value, episodeUrl)
    const twitterTags = generateEpisodeTwitterTags(episode.value, podcast.value)
    
    return [
      { name: 'description', content: episode.value.description },
      // Open Graph
      { property: 'og:title', content: ogTags['og:title'] },
      { property: 'og:description', content: ogTags['og:description'] },
      { property: 'og:image', content: ogTags['og:image'] },
      { property: 'og:type', content: ogTags['og:type'] },
      { property: 'og:url', content: ogTags['og:url'] },
      { property: 'og:audio', content: ogTags['og:audio'] },
      { property: 'og:audio:type', content: ogTags['og:audio:type'] },
      // Twitter Card
      { name: 'twitter:card', content: twitterTags['twitter:card'] },
      { name: 'twitter:title', content: twitterTags['twitter:title'] },
      { name: 'twitter:description', content: twitterTags['twitter:description'] },
      { name: 'twitter:image', content: twitterTags['twitter:image'] },
    ]
  }),
  script: computed(() => {
    if (!episode.value || !podcast.value) return []
    
    return [
      {
        type: 'application/ld+json',
        children: JSON.stringify(generateEpisodeSD(episode.value, podcast.value)),
      },
    ]
  }),
})
</script>

<template>
  <div v-if="episode && podcast" class="episode-page">
    <div class="container">
    <!-- Episode header card -->
    <Motion
      as="header"
      class="card episode-header"
      :layout-id="`card-${episode.slug}`"
      :transition="{ type: 'spring', stiffness: 280, damping: 28 }"
    >
      <div class="episode-header__top">
        <!-- Episode artwork -->
        <Motion
          as="div"
          class="episode-artwork"
          :layout-id="`artwork-${episode.slug}`"
          :transition="{ type: 'spring', stiffness: 280, damping: 28 }"
        >
          <NuxtImg 
            :src="episode.artwork || podcast.artwork" 
            :alt="`${episode.title} artwork`"
            width="400"
            height="400"
            loading="eager"
          />
        </Motion>

        <!-- Title and badges -->
        <Motion 
          as="div"
          class="episode-header__info"
          :initial="{ opacity: 0, y: 20 }"
          :animate="{ opacity: 1, y: 0 }"
          :transition="{ delay: 0.05, duration: 0.35 }"
        >
          <div v-if="(episode.episodeType && episode.episodeType !== 'full') || episode.explicit" class="episode-badges">
            <span 
              v-if="episode.episodeType && episode.episodeType !== 'full'" 
              class="badge episode-type"
              :class="`type-${episode.episodeType}`"
            >
              {{ episode.episodeType }}
            </span>
            <span v-if="episode.explicit" class="badge explicit">
              Explicit
            </span>
          </div>

          <h1 class="episode-title">{{ episode.title }}</h1>

          <p class="episode-podcast-name">{{ podcast.title }}</p>
        </Motion>
      </div>

      <!-- Meta details row -->
      <Motion 
        as="div"
        class="episode-details"
        :initial="{ opacity: 0, y: 20 }"
        :animate="{ opacity: 1, y: 0 }"
        :transition="{ delay: 0.1, duration: 0.35 }"
      >
        <span class="episode-detail-item">
          <Icon name="ph:calendar-blank" size="16" />
          {{ formatDate(episode.pubDate) }}
        </span>
        <span v-if="episode.episodeNumber" class="episode-detail-item">
          <Icon name="ph:hash" size="16" />
          <template v-if="episode.seasonNumber">S{{ episode.seasonNumber }} </template>
          E{{ episode.episodeNumber }}
        </span>
      </Motion>

      <!-- Actions -->
      <Motion 
        as="div"
        class="episode-actions"
        :initial="{ opacity: 0, y: 20 }"
        :animate="{ opacity: 1, y: 0 }"
        :transition="{ delay: 0.15, duration: 0.35 }"
      >
        <div class="episode-actions-left">
          <button 
            class="play-button"
            type="button"
            @click="playEpisode"
          >
            <Icon v-if="isPlaying" name="ph:pause-fill" size="20" />
            <Icon v-else name="ph:play-fill" size="20" />
            {{ isPlaying ? 'Pause' : 'Play Episode' }}
          </button>
          
          <span class="episode-duration-display">
            <Icon name="ph:clock" size="16" />
            {{ formatDurationFriendly(episode.duration) }}
          </span>
        </div>

        <button 
          class="share-button"
          type="button"
          @click="copyShareUrl"
          title="Copy shareable link with current timestamp"
        >
          <Icon name="ph:share-network" size="20" />
          Share
        </button>
      </Motion>
    </Motion>

    <!-- Content tabs: Show Notes / Transcript -->
    <Motion 
      as="section"
      v-if="showNotes || hasTranscript" 
      class="episode-content-tabs"
      :initial="{ opacity: 0, y: 20 }"
      :animate="{ opacity: 1, y: 0 }"
      :transition="{ delay: 0.2, duration: 0.4 }"
    >
      <!-- Tab bar (only show if transcript available) -->
      <div v-if="hasTranscript" class="tab-bar">
        <button
          type="button"
          class="tab-button"
          :class="{ active: activeTab === 'shownotes' }"
          @click="activeTab = 'shownotes'"
        >
          <Icon name="ph:note" size="16" />
          Show Notes
        </button>
        <button
          type="button"
          class="tab-button"
          :class="{ active: activeTab === 'transcript' }"
          @click="activeTab = 'transcript'"
        >
          <Icon name="ph:closed-captioning" size="16" />
          Transcript
        </button>
      </div>

      <!-- Show Notes tab -->
      <div v-show="activeTab === 'shownotes' || !hasTranscript" class="tab-panel">
        <div 
          v-if="showNotes"
          class="shownotes-content"
          v-html="showNotes"
          @click="handleTimestampClick"
        />
        <p v-else class="no-content">No show notes available for this episode.</p>
      </div>

      <!-- Transcript tab -->
      <div v-if="hasTranscript" v-show="activeTab === 'transcript'" class="tab-panel">
        <TranscriptViewer :episode="episode" />
      </div>
    </Motion>

    <!-- Original episode link -->
    <div v-if="episode.link" class="episode-source-link">
      <a
        :href="episode.link"
        target="_blank"
        rel="noopener"
        class="original-link-btn"
      >
        <Icon name="ph:arrow-square-out" size="16" />
        View original episode page
      </a>
    </div>

    <!-- Podcasting 2.0 features (funding, contributors) -->
    <section v-if="episode.podcast2?.funding?.length || episode.podcast2?.persons?.length" class="podcast20-features">
      <!-- Funding/support links -->
      <div v-if="episode.podcast2?.funding?.length" class="feature-item">
        <h3>Support</h3>
        <div v-for="fund in episode.podcast2.funding" :key="fund.url" class="funding-entry">
          <a 
            :href="fund.url" 
            target="_blank" 
            rel="noopener"
            class="funding-link"
          >
            {{ fund.text || 'Support this podcast' }}
          </a>
        </div>
      </div>

      <!-- Episode contributors -->
      <div v-if="episodePersons.length" class="feature-item">
        <h3>
          Contributors
          <NuxtLink to="/people" class="all-people-link">View all people →</NuxtLink>
        </h3>
        <div class="episode-persons">
          <NuxtLink
            v-for="person in episodePersons"
            :key="person.slug"
            :to="`/people/${person.slug}`"
            class="episode-person"
          >
            <div class="episode-person__avatar">
              <NuxtImg
                v-if="person.img"
                :src="person.img"
                :alt="person.name"
                width="48"
                height="48"
                loading="lazy"
              />
              <Icon v-else name="ph:user-circle" size="28" />
            </div>
            <span class="episode-person__name">{{ person.name }}</span>
            <span v-if="person.role" class="episode-person__role">{{ person.role }}</span>
          </NuxtLink>
        </div>
      </div>
    </section>

    <!-- Keywords -->
    <section v-if="episode.keywords && episode.keywords.length > 0" class="episode-keywords">
      <div class="keywords">
        <span
          v-for="keyword in episode.keywords"
          :key="keyword"
          class="keyword-tag"
        >
          {{ keyword }}
        </span>
      </div>
    </section>

    </div>
  </div>

  <!-- 404 fallback -->
  <div v-else class="episode-not-found">
    <div class="container">
      <h1>Episode not found</h1>
      <p>The episode you're looking for doesn't exist.</p>
      <NuxtLink to="/" class="back-link">← Back to home</NuxtLink>
    </div>
  </div>
</template>

<style scoped>
.episode-page {
  max-width: 100%;
  padding: 2rem 0;
}

/* ── Header card ── */
.episode-header {
  margin-bottom: 2rem;
}

.episode-header__top {
  display: grid;
  grid-template-columns: 300px 1fr;
  gap: 2rem;
  align-items: start;
}

.episode-artwork {
  overflow: hidden;
  border-radius: var(--radius-medium);
  box-shadow: var(--shadow-medium);
  width: 300px;
  height: 300px;
}

.episode-artwork img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center;
  display: block;
}

.episode-header__info {
  display: flex;
  flex-direction: column;
  justify-content: center;
  min-height: 300px;
}

.episode-badges {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
  flex-wrap: wrap;
}

.badge {
  display: inline-block;
  padding: 0.25rem 0.75rem;
  border-radius: var(--radius-small);
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
}

.episode-type {
  background-color: var(--primary);
  color: var(--primary-foreground);
}

.type-bonus {
  background-color: var(--warning);
  color: var(--warning-foreground);
}

.type-trailer {
  background-color: var(--secondary);
  color: var(--secondary-foreground);
}

.explicit {
  background-color: var(--danger);
  color: var(--danger-foreground);
}

.episode-title {
  margin: 0;
  font-size: 2.25rem;
  line-height: 1.2;
  letter-spacing: -0.02em;
}

.episode-podcast-name {
  margin: 0.5rem 0 0;
  font-size: 1rem;
  color: var(--muted-foreground);
}

/* ── Meta details ── */
.episode-details {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 1.25rem;
  color: var(--muted-foreground);
  font-size: 0.9rem;
  margin-top: 1.5rem;
  padding-top: 1.5rem;
  border-top: 1px solid var(--border);
}

.episode-detail-item {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
}

/* ── Actions ── */
.episode-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
  margin-top: 1.5rem;
  padding-top: 1.5rem;
  border-top: 1px solid var(--border);
}

.episode-actions-left {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.play-button,
.share-button {
  all: unset;
  box-sizing: border-box;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.75rem;
  border: 1px solid var(--border);
  border-radius: var(--radius-medium);
  background-color: var(--background);
  color: var(--foreground);
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: background-color var(--transition-fast), border-color var(--transition-fast);
}

.play-button:hover,
.share-button:hover {
  background-color: var(--muted);
  border-color: var(--primary);
}

.play-button {
  background-color: var(--primary);
  color: var(--primary-foreground);
  border-color: var(--primary);
}

.play-button:hover {
  background-color: color-mix(in srgb, var(--primary), black 10%);
  color: var(--primary-foreground);
}

.episode-duration-display {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.9rem;
  color: var(--muted-foreground);
  font-weight: 500;
}

.episode-keywords {
  margin-bottom: 2rem;
}

.keywords {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.keyword-tag {
  padding: 0.2rem 0.6rem;
  background-color: var(--muted);
  border: 1px solid var(--border);
  border-radius: 1rem;
  font-size: 0.75rem;
  color: var(--muted-foreground);
}

/* ── Content Tabs ── */
.episode-content-tabs {
  margin-bottom: 2rem;
}

.tab-bar {
  display: flex;
  gap: 0;
  border-bottom: 2px solid var(--border);
  margin-bottom: 1.5rem;
}

.tab-button {
  all: unset;
  box-sizing: border-box;
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.75rem 1.25rem;
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--muted-foreground);
  cursor: pointer;
  border-bottom: 2px solid transparent;
  margin-bottom: -2px;
  transition: color var(--transition-fast), border-color var(--transition-fast);
}

.tab-button:hover {
  color: var(--foreground);
}

.tab-button.active {
  color: var(--primary);
  border-bottom-color: var(--primary);
}

.tab-panel h2 {
  margin-bottom: 1rem;
  font-size: 1.5rem;
}

.no-content {
  color: var(--muted-foreground);
  font-style: italic;
}

.shownotes-content {
  line-height: 1.7;
}

/* Style timestamp links */
.shownotes-content :deep(.timestamp-link) {
  display: inline-flex;
  align-items: center;
  gap: 0.2em;
  background-color: transparent;
  color: var(--primary);
  border: none;
  font-size: 0.85em;
  font-weight: 600;
  font-family: ui-monospace, monospace;
  text-decoration: none;
  cursor: pointer;
  vertical-align: middle;
  transition: opacity 0.15s;
}

.shownotes-content :deep(.timestamp-link::before) {
  content: '▶';
  font-size: 0.7em;
  opacity: 0.8;
}

.shownotes-content :deep(.timestamp-link:hover) {
  opacity: 0.7;
}

/* Remove bullets from show notes lists */
.shownotes-content :deep(ul),
.shownotes-content :deep(ol) {
  list-style: none;
  padding-left: 0;
}

.shownotes-content :deep(li) {
  padding-left: 0;
}

.podcast20-features {
  margin-bottom: 2rem;
  padding: 1.5rem;
  background-color: var(--muted);
  border-radius: 0.5rem;
}

.feature-item {
  margin-bottom: 1rem;
}

.feature-item:last-child {
  margin-bottom: 0;
}

.feature-item h3 {
  margin: 0 0 0.5rem 0;
  font-size: 1rem;
  font-weight: 600;
}

.funding-link {
  color: var(--primary, #2563eb);
  text-decoration: underline;
}

.funding-entry {
  margin-bottom: 0.25rem;
}

.funding-entry:last-child {
  margin-bottom: 0;
}

/* Contributors (Podcasting 2.0 persons) */
.feature-item h3 {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.all-people-link {
  font-size: 0.8rem;
  font-weight: 400;
  color: var(--primary);
  text-decoration: underline;
}

.episode-persons {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin-top: 0.5rem;
}

.episode-person {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.35rem;
  text-align: center;
  text-decoration: none;
  color: inherit;
  padding: 0.6rem;
  border-radius: var(--radius-medium);
  transition: background-color var(--transition-fast);
  min-width: 80px;
  max-width: 100px;
}

.episode-person:hover {
  background-color: var(--muted);
  text-decoration: none;
}

.episode-person__avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  overflow: hidden;
  background-color: var(--muted);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--muted-foreground);
  flex-shrink: 0;
}

.episode-person__avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.episode-person__name {
  font-size: 0.8rem;
  font-weight: 600;
  line-height: 1.3;
  word-break: break-word;
}

.episode-person:hover .episode-person__name {
  text-decoration: underline;
}

.episode-person__role {
  font-size: 0.7rem;
  color: var(--muted-foreground);
  text-transform: capitalize;
}

.episode-source-link {
  margin-bottom: 2rem;
}

.original-link-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.55rem 1rem;
  border: 1px solid var(--border);
  border-radius: var(--radius-medium);
  background-color: var(--background);
  color: var(--foreground);
  font-size: 0.875rem;
  font-weight: 500;
  text-decoration: none;
  transition: background-color var(--transition-fast), border-color var(--transition-fast);
}

.original-link-btn:hover {
  background-color: var(--muted);
  border-color: var(--primary);
}

.episode-not-found {
  text-align: center;
  padding: 3rem 1rem;
}

.back-link {
  display: inline-block;
  margin-top: 1rem;
  color: var(--primary, #2563eb);
  text-decoration: underline;
}

/* Responsive layout */
@media (max-width: 768px) {
  .episode-header__top {
    grid-template-columns: 1fr;
    gap: 1.5rem;
  }

  .episode-artwork {
    width: 100%;
    height: auto;
    aspect-ratio: 1;
    pointer-events: none;
  }

  .episode-header__info {
    min-height: auto;
  }

  .episode-title {
    font-size: 1.75rem;
  }

  .tab-button {
    padding: 0.6rem 1rem;
    font-size: 0.875rem;
  }
  
  .episode-actions {
    flex-direction: column;
    align-items: stretch;
  }

  .episode-actions-left {
    width: 100%;
  }

  .play-button,
  .share-button {
    justify-content: center;
    width: 100%;
  }
}
</style>
