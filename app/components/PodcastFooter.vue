<script setup lang="ts">
import type { FundingLinks } from '~/types/podcast'

const appConfig = useAppConfig()
const { podcast } = usePodcast()

const podcastTitle = computed(() => podcast.value?.title || appConfig.podcast?.siteTitle || 'Podcast')
const rssUrl = computed(() => appConfig.podcast?.platforms?.rss || appConfig.podcast?.feedUrl)

// Funding links — merge app.config funding with Podcasting 2.0 podcast:funding from feed
const configFunding = computed(() => appConfig.podcast?.funding as FundingLinks | undefined)

// Podcasting 2.0 funding tags from the feed (array of { url, text })
const feedFunding = computed(() => podcast.value?.podcast2?.funding ?? [])

// Config-based funding entries (filter empty values)
const configFundingEntries = computed(() =>
  Object.entries(configFunding.value ?? {}).filter(([_, url]) => url && url.trim() !== '')
)

// Check if we have any funding links to show
const hasFunding = computed(
  () => configFundingEntries.value.length > 0 || feedFunding.value.length > 0
)

// Platform metadata for config-based funding links
const platformMeta: Record<string, { label: string; icon: string }> = {
  patreon: { label: 'Patreon', icon: 'simple-icons:patreon' },
  buymeacoffee: { label: 'Buy Me a Coffee', icon: 'simple-icons:buymeacoffee' },
  kofi: { label: 'Ko-fi', icon: 'simple-icons:kofi' },
  stripe: { label: 'Support', icon: 'ph:credit-card-bold' },
  paypal: { label: 'PayPal', icon: 'simple-icons:paypal' },
}

function getPlatformLabel(key: string) {
  return platformMeta[key]?.label ?? key
}

function getPlatformIcon(key: string) {
  return platformMeta[key]?.icon ?? 'ph:link-bold'
}
</script>

<template>
  <footer class="podcast-footer">
    <div class="container">
      <!-- Newsletter signup -->
      <NewsletterSignup />

      <!-- Support section (funding links) -->
      <div v-if="hasFunding" class="podcast-footer__support">
        <p class="podcast-footer__support-label">Support this podcast</p>
        <div class="podcast-footer__funding-links">
          <!-- Config-based funding links -->
          <a
            v-for="[platform, url] in configFundingEntries"
            :key="platform"
            :href="url"
            target="_blank"
            rel="noopener noreferrer"
            class="funding-link"
          >
            <Icon :name="getPlatformIcon(platform)" size="14" />
            {{ getPlatformLabel(platform) }}
          </a>

          <!-- Podcasting 2.0 feed funding links -->
          <a
            v-for="(item, i) in feedFunding"
            :key="`feed-funding-${i}`"
            :href="item.url"
            target="_blank"
            rel="noopener noreferrer"
            class="funding-link"
          >
            <Icon name="ph:heart-bold" size="14" />
            {{ item.text || 'Support' }}
          </a>
        </div>
      </div>

      <!-- Bottom row: podcast info + attribution -->
      <div class="podcast-footer__bottom">
        <p>
          <strong>{{ podcastTitle }}</strong>
          <span v-if="rssUrl">&nbsp;&middot;&nbsp;<a :href="rssUrl" target="_blank" rel="noopener">RSS Feed</a></span>
        </p>
        <p>
          Powered by <a href="https://github.com/jake-101/nuxt-theme-podcast" target="_blank" rel="noopener">nuxt-podcast-theme</a>
        </p>
      </div>
    </div>
  </footer>
</template>

<style scoped>
.podcast-footer {
  font-size: 0.8rem;
  color: var(--muted-foreground);
  border-top: 1px solid var(--border);
  padding: 1.5rem 0;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 1rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.podcast-footer__support {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.podcast-footer__support-label {
  margin: 0;
  font-weight: 600;
  color: var(--foreground);
  white-space: nowrap;
}

.podcast-footer__funding-links {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.funding-link {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.35rem 0.75rem;
  background: color-mix(in srgb, var(--primary) 10%, transparent);
  color: var(--primary);
  border: 1px solid color-mix(in srgb, var(--primary) 30%, transparent);
  border-radius: var(--radius-full, 9999px);
  text-decoration: none;
  font-size: 0.8rem;
  font-weight: 500;
  transition: background-color 0.15s, border-color 0.15s;
}

.funding-link:hover {
  background: color-mix(in srgb, var(--primary) 20%, transparent);
  border-color: color-mix(in srgb, var(--primary) 50%, transparent);
  text-decoration: none;
}

.podcast-footer__bottom {
  display: grid;
  grid-template-columns: 1fr 1fr;
  align-items: center;
}

.podcast-footer__bottom p {
  margin: 0;
}

.podcast-footer__bottom p:last-child {
  text-align: right;
}

@media (max-width: 768px) {
  .podcast-footer__support {
    flex-direction: column;
    align-items: flex-start;
  }

  .podcast-footer__bottom {
    grid-template-columns: 1fr;
  }

  .podcast-footer__bottom p:last-child {
    text-align: left;
  }
}
</style>
