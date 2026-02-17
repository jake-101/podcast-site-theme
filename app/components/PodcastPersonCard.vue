<script setup lang="ts">
import type { Person } from '~/types/podcast'

interface Props {
  person: Person
}

const props = defineProps<Props>()

const episodeCount = computed(() => props.person.episodeSlugs.length)
const episodeLabel = computed(() => episodeCount.value === 1 ? 'episode' : 'episodes')
</script>

<template>
  <NuxtLink :to="`/people/${person.slug}`" class="person-card card">
    <div class="person-card__avatar">
      <img
        v-if="person.img"
        :src="person.img"
        :alt="person.name"
        width="96"
        height="96"
        loading="lazy"
        class="person-card__img"
      />
      <div v-else class="person-card__avatar-placeholder" aria-hidden="true">
        <Icon name="ph:user-circle" size="48" />
      </div>
    </div>

    <div class="person-card__info">
      <h3 class="person-card__name">{{ person.name }}</h3>
      <p v-if="person.role" class="person-card__role">{{ person.role }}</p>
      <p class="person-card__count">
        <Icon name="ph:microphone" size="13" />
        {{ episodeCount }} {{ episodeLabel }}
      </p>
    </div>
  </NuxtLink>
</template>

<style scoped>
.person-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  text-decoration: none;
  color: inherit;
  gap: 0.75rem;
  padding: 1.25rem;
  transition: box-shadow var(--transition-hover, 0.2s), transform var(--transition-hover, 0.2s);
}

.person-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-large, 0 8px 24px rgba(0, 0, 0, 0.12));
  text-decoration: none;
}

.person-card__avatar {
  width: 96px;
  height: 96px;
  border-radius: 50%;
  overflow: hidden;
  flex-shrink: 0;
  background-color: var(--muted);
  display: flex;
  align-items: center;
  justify-content: center;
}

.person-card__img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.person-card__avatar-placeholder {
  color: var(--muted-foreground);
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
}

.person-card__info {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
}

.person-card__name {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  line-height: 1.3;
}

.person-card:hover .person-card__name {
  text-decoration: underline;
}

.person-card__role {
  margin: 0;
  font-size: 0.8rem;
  color: var(--muted-foreground);
  text-transform: capitalize;
}

.person-card__count {
  margin: 0;
  font-size: 0.8rem;
  color: var(--muted-foreground);
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
}
</style>
