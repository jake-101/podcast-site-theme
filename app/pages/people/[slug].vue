<script setup lang="ts">
import type { Podcast, Person, EpisodeSummary, PersonDetail } from '~/types/podcast'

const route = useRoute()
const player = useAudioPlayer()

const slug = computed(() => route.params.slug as string)

// Fetch person detail + podcast metadata in one batched call.
// The person detail endpoint returns person + episode summaries (lightweight).
const { data, status, error } = await useAsyncData(
  `person-${slug.value}`,
  async (_nuxtApp, { signal }) => {
    const [meta, personDetail] = await Promise.all([
      $fetch<Podcast>('/api/podcast/meta', { signal }),
      $fetch<PersonDetail>(`/api/podcast/people/${slug.value}`, { signal }),
    ])
    return { meta, ...personDetail }
  },
)

const podcast = computed(() => data.value?.meta ?? null)
const person = computed(() => data.value?.person ?? null)
const personEpisodes = computed<EpisodeSummary[]>(() => data.value?.episodes ?? [])

// Handle 404 — the API returns 404 if the person doesn't exist
if (error.value) {
  if (import.meta.client) {
    navigateTo('/people', { redirectCode: 404 })
  }
}

const handlePlay = (episode: EpisodeSummary) => {
  player.play(episode)
}

useHead({
  title: computed(() => {
    if (!person.value || !podcast.value) return 'Person'
    return `${person.value.name} - ${podcast.value.title}`
  }),
  meta: computed(() => {
    if (!person.value) return []
    const desc = person.value.role
      ? `${person.value.name} (${person.value.role}) — ${personEpisodes.value.length} episodes`
      : `${person.value.name} — ${personEpisodes.value.length} episodes`
    return [
      { name: 'description', content: desc },
      { property: 'og:title', content: person.value.name },
      { property: 'og:description', content: desc },
      ...(person.value.img ? [{ property: 'og:image', content: person.value.img }] : []),
    ]
  }),
})
</script>

<template>
  <div v-if="person && podcast" class="person-page">
    <div class="container">
      <!-- Back link -->
      <NuxtLink to="/people" class="back-link">
        <Icon name="ph:arrow-left" size="16" />
        All people
      </NuxtLink>

      <!-- Person header -->
      <header class="person-header card">
        <div class="person-header__avatar">
          <NuxtImg
            v-if="person.img"
            :src="person.img"
            :alt="person.name"
            width="160"
            height="160"
            loading="eager"
            class="person-header__img"
          />
          <div v-else class="person-header__avatar-placeholder" aria-hidden="true">
            <Icon name="ph:user-circle" size="80" />
          </div>
        </div>

        <div class="person-header__info">
          <h1 class="person-header__name">{{ person.name }}</h1>
          <p v-if="person.role" class="person-header__role">{{ person.role }}</p>
          <p v-if="person.group" class="person-header__group">{{ person.group }}</p>
          <p class="person-header__count">
            <Icon name="ph:microphone" size="15" />
            {{ personEpisodes.length }} {{ personEpisodes.length === 1 ? 'episode' : 'episodes' }}
          </p>
          <a
            v-if="person.href"
            :href="person.href"
            target="_blank"
            rel="noopener"
            class="person-header__link"
          >
            <Icon name="ph:arrow-square-out" size="15" />
            Visit website
          </a>
        </div>
      </header>

      <!-- Episodes featuring this person -->
      <section class="person-episodes">
        <h2 class="person-episodes__title">Episodes</h2>
        <div v-if="personEpisodes.length > 0" class="episode-list">
          <article
            v-for="episode in personEpisodes"
            :key="episode.guid"
            class="episode-row card"
          >
            <div class="episode-row__artwork">
              <NuxtImg
                :src="episode.artwork || podcast?.artwork || ''"
                :alt="`${episode.title} artwork`"
                width="72"
                height="72"
                loading="lazy"
              />
            </div>

            <div class="episode-row__content">
              <NuxtLink :to="`/episodes/${episode.slug}`" class="episode-row__title-link">
                <h3 class="episode-row__title">{{ episode.title }}</h3>
              </NuxtLink>
              <p class="episode-row__meta">
                <span>
                  <Icon name="ph:calendar-blank" size="13" />
                  {{ formatDate(episode.pubDate) }}
                </span>
                <span>
                  <Icon name="ph:clock" size="13" />
                  {{ formatDurationFriendly(episode.duration) }}
                </span>
              </p>
            </div>

            <button
              type="button"
              class="episode-row__play"
              :aria-label="`Play ${episode.title}`"
              @click="handlePlay(episode)"
            >
              <Icon
                v-if="player.currentEpisode.value?.guid === episode.guid && player.isPlaying.value"
                name="ph:pause-fill"
                size="20"
              />
              <Icon v-else name="ph:play-fill" size="20" />
            </button>
          </article>
        </div>

        <p v-else class="person-episodes__empty">No episodes found.</p>
      </section>
    </div>
  </div>

  <!-- 404 fallback -->
  <div v-else-if="status !== 'pending'" class="person-not-found">
    <div class="container">
      <h1>Person not found</h1>
      <p>This person doesn't exist in the podcast feed.</p>
      <NuxtLink to="/people" class="back-link">← Back to people</NuxtLink>
    </div>
  </div>
</template>

<style scoped>
.person-page {
  padding: 2rem 0;
}

.back-link {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  color: var(--muted-foreground);
  text-decoration: none;
  font-size: 0.9rem;
  margin-bottom: 1.5rem;
  transition: color var(--transition-fast);
}

.back-link:hover {
  color: var(--foreground);
}

/* ── Person header card ── */
.person-header {
  display: flex;
  align-items: center;
  gap: 2rem;
  margin-bottom: 2.5rem;
}

.person-header__avatar {
  width: 160px;
  height: 160px;
  border-radius: 50%;
  overflow: hidden;
  flex-shrink: 0;
  background-color: var(--muted);
  display: flex;
  align-items: center;
  justify-content: center;
}

.person-header__img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.person-header__avatar-placeholder {
  color: var(--muted-foreground);
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
}

.person-header__info {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.person-header__name {
  margin: 0;
  font-size: 2rem;
  line-height: 1.2;
}

.person-header__role,
.person-header__group {
  margin: 0;
  color: var(--muted-foreground);
  font-size: 1rem;
  text-transform: capitalize;
}

.person-header__count {
  margin: 0;
  font-size: 0.9rem;
  color: var(--muted-foreground);
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
}

.person-header__link {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  color: var(--primary);
  text-decoration: underline;
  font-size: 0.9rem;
  margin-top: 0.25rem;
}

/* ── Episode list ── */
.person-episodes__title {
  margin: 0 0 1.25rem;
  font-size: 1.5rem;
}

.episode-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.episode-row {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.875rem 1rem;
}

.episode-row__artwork {
  width: 72px;
  height: 72px;
  border-radius: var(--radius-small);
  overflow: hidden;
  flex-shrink: 0;
  background-color: var(--muted);
}

.episode-row__artwork img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.episode-row__content {
  flex: 1;
  min-width: 0;
}

.episode-row__title-link {
  text-decoration: none;
  color: inherit;
}

.episode-row__title-link:hover .episode-row__title {
  text-decoration: underline;
}

.episode-row__title {
  margin: 0 0 0.35rem;
  font-size: 1rem;
  font-weight: 600;
  line-height: 1.3;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.episode-row__meta {
  margin: 0;
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
  font-size: 0.8rem;
  color: var(--muted-foreground);
}

.episode-row__meta span {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
}

.episode-row__play {
  all: unset;
  box-sizing: border-box;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background-color: var(--primary);
  color: var(--primary-foreground);
  cursor: pointer;
  flex-shrink: 0;
  transition: background-color var(--transition-fast);
}

.episode-row__play:hover {
  background-color: color-mix(in srgb, var(--primary), black 10%);
}

.person-episodes__empty {
  color: var(--muted-foreground);
  font-style: italic;
}

.person-not-found {
  text-align: center;
  padding: 3rem 1rem;
}

/* Responsive */
@media (max-width: 768px) {
  .person-page {
    padding: 1.5rem 0;
  }

  .person-header {
    flex-direction: column;
    text-align: center;
    gap: 1.25rem;
  }

  .person-header__avatar {
    width: 120px;
    height: 120px;
  }

  .person-header__info {
    align-items: center;
  }

  .person-header__name {
    font-size: 1.5rem;
  }

  .episode-row__artwork {
    width: 56px;
    height: 56px;
  }

  .episode-row__title {
    font-size: 0.9rem;
  }
}
</style>
