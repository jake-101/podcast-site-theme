<script setup lang="ts">
import type { NewsletterConfig } from '~/types/podcast'

const appConfig = useAppConfig()
const newsletter = computed(() => appConfig.podcast?.newsletter as NewsletterConfig | undefined)

// Only show if a URL is configured
const isVisible = computed(() => !!newsletter.value?.url)

const label = computed(() => newsletter.value?.label || 'Get new episodes in your inbox')
const description = computed(() => newsletter.value?.description || '')
const url = computed(() => newsletter.value?.url || '')
const embedCode = computed(() => newsletter.value?.embedCode || '')

// Platform metadata for icon + button label
const platformMeta: Record<string, { label: string; icon: string }> = {
  beehiiv: { label: 'Subscribe on Beehiiv', icon: 'ph:envelope-simple-bold' },
  substack: { label: 'Subscribe on Substack', icon: 'simple-icons:substack' },
  mailchimp: { label: 'Subscribe via Mailchimp', icon: 'simple-icons:mailchimp' },
  kit: { label: 'Subscribe via Kit', icon: 'ph:envelope-simple-bold' },
}

const platform = computed(() => newsletter.value?.platform || '')

const buttonLabel = computed(
  () => platformMeta[platform.value]?.label || 'Subscribe'
)

const buttonIcon = computed(
  () => platformMeta[platform.value]?.icon || 'ph:envelope-simple-bold'
)
</script>

<template>
  <div v-if="isVisible" class="newsletter-signup">
    <div class="newsletter-signup__content">
      <Icon name="ph:envelope-simple-bold" size="20" class="newsletter-signup__icon" />
      <div class="newsletter-signup__text">
        <p class="newsletter-signup__label">{{ label }}</p>
        <p v-if="description" class="newsletter-signup__description">{{ description }}</p>
      </div>
    </div>

    <!-- Embed mode: raw HTML (iframe or platform JS snippet) -->
    <div
      v-if="embedCode"
      class="newsletter-signup__embed"
      v-html="embedCode"
    />

    <!-- Link mode: simple button to hosted subscribe page -->
    <a
      v-else
      :href="url"
      target="_blank"
      rel="noopener noreferrer"
      class="newsletter-signup__button"
    >
      <Icon :name="buttonIcon" size="14" />
      {{ buttonLabel }}
    </a>
  </div>
</template>

<style scoped>
.newsletter-signup {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
  padding: 1rem 1.25rem;
  background: color-mix(in srgb, var(--primary) 8%, transparent);
  border: 1px solid color-mix(in srgb, var(--primary) 20%, transparent);
  border-radius: var(--radius, 0.5rem);
}

.newsletter-signup__content {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  min-width: 0;
}

.newsletter-signup__icon {
  color: var(--primary);
  flex-shrink: 0;
}

.newsletter-signup__text {
  min-width: 0;
}

.newsletter-signup__label {
  margin: 0;
  font-weight: 600;
  font-size: 0.9rem;
  color: var(--foreground);
}

.newsletter-signup__description {
  margin: 0.15rem 0 0;
  font-size: 0.8rem;
  color: var(--muted-foreground);
}

.newsletter-signup__embed {
  width: 100%;
  margin-top: 0.5rem;
}

.newsletter-signup__button {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.4rem 1rem;
  background: var(--primary);
  color: var(--primary-foreground, #fff);
  border: none;
  border-radius: var(--radius-full, 9999px);
  text-decoration: none;
  font-size: 0.85rem;
  font-weight: 600;
  white-space: nowrap;
  transition: opacity 0.15s;
  flex-shrink: 0;
}

.newsletter-signup__button:hover {
  opacity: 0.85;
  text-decoration: none;
}

@media (max-width: 600px) {
  .newsletter-signup {
    flex-direction: column;
    align-items: flex-start;
  }

  .newsletter-signup__button {
    align-self: flex-start;
  }
}
</style>
