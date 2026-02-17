<script setup lang="ts">
const { podcast } = usePodcast()
const { people, hasPeople } = usePodcastPeople()

useHead({
  title: computed(() => podcast.value ? `People - ${podcast.value.title}` : 'People'),
  meta: computed(() => {
    if (!podcast.value) return []
    return [
      { name: 'description', content: `People who appear on ${podcast.value.title}` },
    ]
  }),
})
</script>

<template>
  <div class="people-page">
    <div class="container">
      <div class="people-page__header">
        <NuxtLink to="/" class="back-link">
          <Icon name="ph:arrow-left" size="16" />
          Back to episodes
        </NuxtLink>
        <h1 class="people-page__title">People</h1>
        <p v-if="podcast" class="people-page__subtitle">
          Everyone who appears on {{ podcast.title }}
        </p>
      </div>

      <div v-if="hasPeople">
        <PodcastPeopleGrid :people="people" />
      </div>

      <div v-else class="people-empty">
        <Icon name="ph:users" size="48" />
        <p>No person data found in this podcast feed.</p>
        <p class="people-empty__hint">
          This feature requires a podcast that uses the
          <a href="https://podcastindex.org/namespace/1.0#person" target="_blank" rel="noopener">
            Podcasting 2.0 <code>podcast:person</code>
          </a>
          tag.
        </p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.people-page {
  padding: 2rem 0;
}

.people-page__header {
  margin-bottom: 2rem;
}

.back-link {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  color: var(--muted-foreground);
  text-decoration: none;
  font-size: 0.9rem;
  margin-bottom: 1rem;
  transition: color var(--transition-fast);
}

.back-link:hover {
  color: var(--foreground);
}

.people-page__title {
  margin: 0 0 0.5rem;
  font-size: 2rem;
}

.people-page__subtitle {
  margin: 0;
  color: var(--muted-foreground);
}

.people-empty {
  text-align: center;
  padding: 4rem 1rem;
  color: var(--muted-foreground);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
}

.people-empty p {
  margin: 0;
}

.people-empty__hint {
  font-size: 0.9rem;
}

.people-empty__hint a {
  color: var(--primary);
  text-decoration: underline;
}

@media (max-width: 768px) {
  .people-page {
    padding: 1.5rem 0;
  }

  .people-page__title {
    font-size: 1.5rem;
  }
}
</style>
