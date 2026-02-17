<script setup lang="ts">
const appConfig = useAppConfig()
const { podcast } = usePodcast()
const route = useRoute()

// Search state — shared with EpisodeGrid
const { searchInput, query: searchQuery, clear: clearSearch } = useEpisodeSearch()

// Only show search in nav on the home page
const isHomePage = computed(() => route.path === '/')

// Dark mode support using VueUse
const colorMode = useColorMode({
  attribute: 'data-theme',
  modes: {
    light: 'light',
    dark: 'dark',
  },
})

// Artwork-derived theme colors
const { isLoaded: themeReady, applyThemeColors } = useThemeColors()

// Apply theme colors when data is loaded or color mode changes
watch(
  [themeReady, () => colorMode.value],
  ([ready, mode]) => {
    if (ready && (mode === 'light' || mode === 'dark')) {
      applyThemeColors(mode)
    }
  },
  { immediate: true },
)

// Initialize theme from app config
onMounted(() => {
  if (appConfig.podcast.theme !== 'auto') {
    colorMode.value = appConfig.podcast.theme
  }
})

// Toggle dark mode
const toggleDarkMode = () => {
  colorMode.value = colorMode.value === 'dark' ? 'light' : 'dark'
}

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
    <!-- Header with optional nav search and dark mode toggle -->
    <header class="site-header">
      <div class="container">
        <nav class="site-nav">
          <NuxtLink to="/" class="site-logo">
            <img
              v-if="appConfig.podcast.navLogo === 'image' && podcast?.artwork"
              :src="podcast.artwork"
              :alt="podcast.title"
              class="site-logo__image"
            />
            <h1 v-else>{{ podcast?.title || appConfig.podcast.siteTitle || 'Podcast' }}</h1>
          </NuxtLink>

          <!-- Search input (home page only) -->
          <div v-if="isHomePage" class="site-nav__search">
            <div class="site-nav__search-wrap">
              <Icon name="ph:magnifying-glass" size="16" class="site-nav__search-icon" />
              <input
                v-model="searchInput"
                type="search"
                placeholder="Search episodes..."
                aria-label="Search episodes"
                class="site-nav__search-input"
              />
              <button
                v-if="searchInput"
                type="button"
                class="site-nav__search-clear"
                aria-label="Clear search"
                @click="clearSearch"
              >
                <Icon name="ph:x" size="14" />
              </button>
            </div>
          </div>

          <button 
            class="theme-toggle"
            type="button"
            @click="toggleDarkMode"
            :aria-label="colorMode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'"
          >
            <Icon v-if="colorMode === 'dark'" name="ph:sun-bold" size="20" />
            <Icon v-else name="ph:moon-bold" size="20" />
          </button>
        </nav>
      </div>
    </header>

    <!-- Main content area -->
    <main class="main-content">
      <slot />
    </main>

    <!-- Footer -->
    <PodcastFooter />

    <!-- Sticky audio player at bottom -->
    <AudioPlayer />
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

.site-header {
  background-color: var(--primary);
  color: var(--primary-foreground);
  padding: 0.75rem 0;
}

.site-nav {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
}

.site-logo {
  text-decoration: none;
  color: var(--primary-foreground);
}

.site-logo h1 {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 700;
}

.site-logo__image {
  display: block;
  height: 2.5rem;
  width: auto;
  border-radius: 0.375rem;
  object-fit: contain;
}

.site-nav__search {
  flex: 1;
  max-width: 420px;
}

.site-nav__search-wrap {
  position: relative;
  display: flex;
  align-items: center;
}

.site-nav__search-icon {
  position: absolute;
  left: 0.6rem;
  color: rgba(255, 255, 255, 0.6);
  pointer-events: none;
}

.site-nav__search-input {
  width: 100%;
  padding: 0.45rem 2.25rem 0.45rem 2rem;
  background: rgba(255, 255, 255, 0.15);
  border: 1px solid rgba(255, 255, 255, 0.25);
  border-radius: 0.375rem;
  color: var(--primary-foreground);
  font-size: 0.875rem;
  outline: none;
  transition: background 0.2s, border-color 0.2s;
}

.site-nav__search-input::placeholder {
  color: rgba(255, 255, 255, 0.55);
}

.site-nav__search-input:focus {
  background: rgba(255, 255, 255, 0.25);
  border-color: rgba(255, 255, 255, 0.5);
}

/* Hide the browser's native search cancel button */
.site-nav__search-input::-webkit-search-cancel-button {
  display: none;
}

.site-nav__search-clear {
  all: unset;
  position: absolute;
  right: 0.5rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: rgba(255, 255, 255, 0.7);
  cursor: pointer;
  padding: 0.15rem;
  border-radius: 0.25rem;
  transition: color 0.2s;
}

.site-nav__search-clear:hover {
  color: var(--primary-foreground);
}

.theme-toggle {
  background: rgba(255, 255, 255, 0.15);
  border: 1px solid rgba(255, 255, 255, 0.25);
  border-radius: 0.25rem;
  padding: 0.5rem;
  cursor: pointer;
  line-height: 1;
  color: var(--primary-foreground);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: background-color 0.2s;
}

.theme-toggle:hover {
  background: rgba(255, 255, 255, 0.25);
}

.main-content {
  flex: 1;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 1rem;
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .podcast-layout {
    padding-bottom: 120px; /* More space on mobile */
  }

  .site-nav {
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .site-logo h1 {
    font-size: 1.25rem;
  }

  .site-nav__search {
    order: 3;
    max-width: 100%;
    width: 100%;
  }

  .main-content {
    padding: 1rem 0;
  }
}
</style>
