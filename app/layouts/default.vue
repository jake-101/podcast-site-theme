<script setup lang="ts">
const appConfig = useAppConfig()
const { podcast } = usePodcast()

// Consolidated color mode + theme color management
useColorModeManager()

// RSS auto-discovery meta tag
useHead({
  link: [
    {
      rel: 'alternate',
      type: 'application/rss+xml',
      title: computed(() => podcast.value?.title || 'Podcast RSS Feed'),
      href: computed(() => appConfig.podcast.platforms.rss || appConfig.podcast.feedUrl),
    },
  ],
})
</script>

<template>
  <div class="podcast-layout">
    <!-- Site navigation (override this component in your Nuxt layer to customize) -->
    <SiteNav />

    <!-- Main content area -->
    <main class="main-content">
      <slot />
    </main>

    <!-- Footer -->
    <PodcastFooter />

    <!-- Sticky audio player at bottom (client-only to avoid SSR hydration mismatches) -->
    <ClientOnly>
      <AudioPlayer />
    </ClientOnly>
  </div>
</template>

<style scoped>
.podcast-layout {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  /* Account for sticky audio player height */
  padding-bottom: 100px;
}

.main-content {
  flex: 1;
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .podcast-layout {
    padding-bottom: 120px; /* More space on mobile */
  }

  .main-content {
    padding: 0;
  }
}
</style>
