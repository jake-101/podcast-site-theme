<script setup lang="ts">
import type { Episode, Podcast, Person } from '~/types/podcast'

const route = useRoute()
const router = useRouter()
const requestURL = useRequestURL()
const player = useAudioPlayer()

// Get episode slug from route
const slug = computed(() => route.params.slug as string)

// Fetch podcast metadata + single full episode in one batched call.
// Only this one episode's data enters the SSG payload.
// Transcript is also fetched here (if available) so it gets serialized
// into _payload.json for static builds — avoids CORS issues on the client.
const { data, status, error } = await useAsyncData(
  `episode-${slug.value}`,
  async (_nuxtApp, { signal }) => {
    const [meta, episode] = await Promise.all([
      $fetch<Podcast>('/api/podcast/meta', { signal }),
      $fetch<Episode>(`/api/podcast/episodes/${slug.value}`, { signal }),
    ])

    // Fetch transcript if available (during SSR/prerender, this gets serialized into payload)
    let transcript: { content: string; type: string; url: string } | null = null
    if (episode.podcast2?.transcript?.url) {
      try {
        transcript = await $fetch('/api/transcript', {
          query: {
            url: episode.podcast2.transcript.url,
            type: episode.podcast2.transcript.type,
          },
          signal,
        })
      } catch (e) {
        // Transcript fetch failure shouldn't block the page
        console.warn('Failed to fetch transcript:', e)
      }
    }

    return { meta, episode, transcript }
  },
)

const podcast = computed(() => data.value?.meta ?? null)
const episode = computed(() => data.value?.episode ?? null)

// Handle 404 if episode not found (API returns 404, useAsyncData sets error)
if (error.value) {
  if (import.meta.client) {
    navigateTo('/', { redirectCode: 404 })
  }
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
onMounted(() => {
  if (route.query.t && episode.value) {
    const timestampSeconds = parseTimestamp(route.query.t as string)
    if (timestampSeconds > 0) {
      setTimeout(() => {
        if (player.currentEpisode.value?.guid === episode.value?.guid) {
          player.seek(timestampSeconds)
        }
      }, 500)
    }
  }
})

// Check if this episode is currently playing
const isCurrentEpisode = computed(() => player.currentEpisode.value?.guid === episode.value?.guid)
const isPlaying = computed(() => isCurrentEpisode.value && player.isPlaying.value)

// Transcript availability and tab state
const hasTranscript = computed(() => !!episode.value?.podcast2?.transcript?.url)
const activeTab = ref<'shownotes' | 'transcript'>('shownotes')

// Persons for this episode — derived from the people composable.
// usePodcastPeople fetches /api/podcast/people (server: false, lazy: true)
// so it never enters the SSG payload or causes a hydration mismatch.
const { getPersonsForEpisode } = usePodcastPeople()
const episodePersons = computed<Person[]>(() =>
  episode.value ? getPersonsForEpisode(episode.value.slug) : [],
)

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
      :transition="{ type: 'spring', stiffness: 220, damping: 28 }"
    >
      <div class="episode-header__top">
        <!-- Episode artwork -->
        <Motion
          as="div"
          class="episode-artwork"
          :layout-id="`artwork-${episode.slug}`"
          :transition="{ type: 'spring', stiffness: 220, damping: 28 }"
        >
          <img
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

      <!-- Actions + metadata row (combined) -->
      <Motion
        as="div"
        class="episode-actions"
        :initial="{ opacity: 0, y: 20 }"
        :animate="{ opacity: 1, y: 0 }"
        :transition="{ delay: 0.1, duration: 0.35 }"
      >
        <div class="episode-actions__play">
          <button
            class="play-button"
            type="button"
            @click="playEpisode"
          >
            <Icon v-if="isPlaying" name="ph:pause-fill" size="20" />
            <Icon v-else name="ph:play-fill" size="20" />
            <span class="play-button__label-full">{{ isPlaying ? 'Pause' : 'Play Episode' }}</span>
            <span class="play-button__label-short">{{ isPlaying ? 'Pause' : 'Play' }}</span>
          </button>
        </div>

        <div class="episode-actions__meta">
          <span class="episode-meta-item">
            <Icon name="ph:clock" size="15" />
            {{ formatDurationFriendly(episode.duration) }}
          </span>

          <span class="episode-meta-item">
            <Icon name="ph:calendar-blank" size="15" />
            {{ formatDate(episode.pubDate) }}
          </span>

          <span v-if="episode.episodeNumber" class="episode-meta-item">
            <Icon name="ph:hash" size="15" />
            <template v-if="episode.seasonNumber">S{{ episode.seasonNumber }} </template>
            E{{ episode.episodeNumber }}
          </span>

          <ClientOnly>
            <EpisodeSharePopover
              :episode-title="episode.title"
              :episode-slug="episode.slug"
              :podcast-title="podcast.title"
              :current-time="isCurrentEpisode ? player.currentTime.value : 0"
            />
          </ClientOnly>
        </div>
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
        <TranscriptViewer :episode="episode" :transcript-data="data?.transcript" />
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
          <NuxtLink to="/people" class="all-people-link">View all people &rarr;</NuxtLink>
        </h3>
        <div class="episode-persons">
          <NuxtLink
            v-for="person in episodePersons"
            :key="person.slug"
            :to="`/people/${person.slug}`"
            class="episode-person"
          >
            <div class="episode-person__avatar">
              <img
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
  <div v-else-if="status !== 'pending'" class="episode-not-found">
    <div class="container">
      <h1>Episode not found</h1>
      <p>The episode you're looking for doesn't exist.</p>
      <NuxtLink to="/" class="back-link">&larr; Back to home</NuxtLink>
    </div>
  </div>
</template>

<style scoped>
.episode-page {
  max-width: 100%;
  padding: 2rem 0;
}

/* -- Header card -- */
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

/* -- Actions + metadata row -- */
.episode-actions {
  display: flex;
  align-items: center;
  gap: var(--space-4, 1rem);
  flex-wrap: wrap;
  margin-top: var(--space-6, 1.5rem);
  padding-top: var(--space-6, 1.5rem);
  border-top: 1px solid var(--border);
}

.episode-actions__play {
  flex-shrink: 0;
}

.episode-actions__meta {
  display: flex;
  align-items: center;
  gap: var(--space-4, 1rem);
  flex-wrap: wrap;
  flex: 1;
}

.play-button {
  all: unset;
  box-sizing: border-box;
  display: inline-flex;
  align-items: center;
  gap: var(--space-2, 0.5rem);
  padding: var(--space-2, 0.5rem) var(--space-5, 1.25rem);
  border: 1px solid var(--primary);
  border-radius: var(--radius-medium);
  background-color: var(--primary);
  color: var(--primary-foreground);
  font-size: var(--text-7, 0.875rem);
  font-weight: var(--font-semibold, 600);
  cursor: pointer;
  transition: background-color var(--transition-fast);
}

.play-button:hover {
  background-color: color-mix(in srgb, var(--primary), white 25%);
}

/* Show full label on desktop, short on mobile */
.play-button__label-short {
  display: none;
}

.episode-meta-item {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  font-size: var(--text-7, 0.875rem);
  color: var(--muted-foreground);
  white-space: nowrap;
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

/* -- Content Tabs -- */
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
  content: '\25B6';
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
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 0.5rem;
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
    gap: var(--space-3, 0.75rem);
  }

  /* Short label on mobile */
  .play-button__label-full {
    display: none;
  }

  .play-button__label-short {
    display: inline;
  }

  .play-button {
    padding: var(--space-2, 0.5rem) var(--space-4, 1rem);
  }

  .episode-actions__meta {
    gap: var(--space-3, 0.75rem);
  }
}
</style>
