<script setup lang="ts">
const appConfig = useAppConfig()
const podcastTitle = computed(() => appConfig.podcast?.siteTitle || 'Podcast')
const rssUrl = computed(() => appConfig.podcast?.platforms?.rss || appConfig.podcast?.feedUrl)
</script>

<template>
  <footer class="podcast-footer">
    <div class="container">
      <p>
        <strong>{{ podcastTitle }}</strong>
        <span v-if="rssUrl"> &middot; <a :href="rssUrl" target="_blank" rel="noopener">RSS Feed</a></span>
      </p>
      <p>
        Powered by <a href="https://github.com/yourusername/nuxt-podcast-theme" target="_blank" rel="noopener">nuxt-podcast-theme</a>
      </p>
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
  display: grid;
  grid-template-columns: 1fr 1fr;
  align-items: center;
}

.container p {
  margin: 0;
}

.container p:last-child {
  text-align: right;
}

@media (max-width: 768px) {
  .container {
    grid-template-columns: 1fr;
  }
  
  .container p:last-child {
    text-align: left;
  }
}
</style>
