<script setup lang="ts">
const appConfig = useAppConfig()
const { podcast } = usePodcast()
const route = useRoute()
const router = useRouter()

// Search state — uses lightweight search index (client-only, lazy loaded)
const { searchInput, results: searchResults, isSearching, clear: clearSearch } = useEpisodeSearch()

// Hide dropdown on /search page (results are already shown in full) or after navigation
const isSearchPage = computed(() => route.path === '/search')
const dropdownOpen = ref(true)
const showSearchResults = computed(() => !isSearchPage.value && dropdownOpen.value && isSearching.value && searchResults.value.length > 0)
const showNoResults = computed(() => !isSearchPage.value && dropdownOpen.value && isSearching.value && searchResults.value.length === 0)

// Re-open dropdown when user types (unless on /search page)
watch(searchInput, () => {
  dropdownOpen.value = true
})

// Navigate to episode when search result is clicked
const goToEpisode = (slug: string) => {
  dropdownOpen.value = false
  clearSearch()
  router.push(`/episodes/${slug}`)
}

// Navigate to full search page (Enter key or "more results" click)
const goToSearchPage = () => {
  const q = searchInput.value.trim()
  if (!q) return
  dropdownOpen.value = false
  // Blur the input to dismiss mobile keyboards and close autocomplete
  const activeEl = document.activeElement as HTMLElement | null
  activeEl?.blur()
  router.push({ path: '/search', query: { q } })
}

// Only show search in nav on home and pagination pages
const isHomePage = computed(() => route.path === '/' || route.path.startsWith('/page/'))

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

          <!-- Search input with results dropdown -->
          <div class="site-nav__search">
            <div class="site-nav__search-wrap">
              <Icon name="ph:magnifying-glass" size="16" class="site-nav__search-icon" />
              <input
                v-model="searchInput"
                type="search"
                placeholder="Search episodes..."
                aria-label="Search episodes"
                class="site-nav__search-input"
                @keydown.enter="goToSearchPage"
              />
              <button
                v-show="searchInput"
                type="button"
                class="site-nav__search-clear"
                aria-label="Clear search"
                @click="clearSearch"
              >
                <Icon name="ph:x" size="14" />
              </button>
            </div>
            <!-- Search results dropdown -->
            <div v-if="showSearchResults" class="search-results">
              <div class="search-results__count">
                <small>{{ searchResults.length }} {{ searchResults.length === 1 ? 'result' : 'results' }}</small>
              </div>
              <ul class="search-results__list">
                <li
                  v-for="result in searchResults.slice(0, 8)"
                  :key="result.slug"
                  class="search-results__item"
                  @click="goToEpisode(result.slug)"
                >
                  <span class="search-results__title">{{ result.title }}</span>
                  <span class="search-results__meta">
                    <template v-if="result.episodeNumber">#{{ result.episodeNumber }} &middot; </template>
                    {{ formatDate(result.pubDate) }}
                  </span>
                </li>
              </ul>
              <div v-if="searchResults.length > 8" class="search-results__more" @click="goToSearchPage">
                <small>+ {{ searchResults.length - 8 }} more results &rarr;</small>
              </div>
            </div>
            <!-- No results message -->
            <div v-if="showNoResults" class="search-results">
              <div class="search-results__empty">
                <small>No episodes found</small>
              </div>
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
  align-self: center;
  position: relative;
}

.site-nav__search-wrap {
  position: relative;
  display: flex;
  align-items: center;
}

.site-nav__search-icon {
  position: absolute;
  left: 0.6rem;
  top: 50%;
  transform: translateY(-50%);
  color: color-mix(in srgb, var(--primary-foreground) 60%, transparent);
  pointer-events: none;
  display: flex;
}

.site-nav__search-input {
  -webkit-appearance: none;
  appearance: none;
  width: 100%;
  padding: 0.45rem 2.25rem 0.45rem 2rem;
  background: color-mix(in srgb, var(--primary-foreground) 12%, transparent);
  border: 1px solid color-mix(in srgb, var(--primary-foreground) 25%, transparent);
  border-radius: 0.375rem;
  color: var(--primary-foreground);
  font-size: 0.875rem;
  line-height: 1.25;
  box-sizing: border-box;
  margin: 0; /* Override oat.css margin-block-start: var(--space-1) on inputs */
  margin-block-start: 0;
  outline: none;
  transition: background 0.2s, border-color 0.2s;
}

.site-nav__search-input::placeholder {
  color: color-mix(in srgb, var(--primary-foreground) 50%, transparent);
}

.site-nav__search-input:focus {
  background: color-mix(in srgb, var(--primary-foreground) 20%, transparent);
  border-color: color-mix(in srgb, var(--primary-foreground) 50%, transparent);
}

/* Hide the browser's native search cancel button */
.site-nav__search-input::-webkit-search-cancel-button {
  display: none;
}

.site-nav__search-clear {
  all: unset;
  position: absolute;
  right: 0.5rem;
  top: 50%;
  transform: translateY(-50%);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: color-mix(in srgb, var(--primary-foreground) 65%, transparent);
  cursor: pointer;
  padding: 0.15rem;
  border-radius: 0.25rem;
  transition: color 0.2s;
}

.site-nav__search-clear:hover {
  color: var(--primary-foreground);
}

/* Search results dropdown */
.search-results {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  margin-top: 0.25rem;
  background: var(--background);
  border: 1px solid var(--border);
  border-radius: 0.375rem;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
  z-index: 100;
  max-height: 400px;
  overflow-y: auto;
}

.search-results__count,
.search-results__more,
.search-results__empty {
  padding: 0.5rem 0.75rem;
  color: var(--muted-foreground);
  border-bottom: 1px solid var(--border);
}

.search-results__more {
  border-bottom: none;
  border-top: 1px solid var(--border);
  text-align: center;
  cursor: pointer;
  transition: background-color 0.15s;
}

.search-results__more:hover {
  background-color: var(--muted);
}

.search-results__empty {
  border-bottom: none;
  text-align: center;
  padding: 1rem 0.75rem;
}

.search-results__list {
  all: unset;
  display: block;
  list-style: none;
}

.search-results__item {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  padding: 0.6rem 0.75rem;
  cursor: pointer;
  transition: background-color 0.15s;
  border-bottom: 1px solid var(--border);
}

.search-results__item:last-child {
  border-bottom: none;
}

.search-results__item:hover {
  background-color: var(--muted);
}

.search-results__title {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--foreground);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.search-results__meta {
  font-size: 0.75rem;
  color: var(--muted-foreground);
}

.theme-toggle {
  background: color-mix(in srgb, var(--primary-foreground) 12%, transparent);
  border: 1px solid color-mix(in srgb, var(--primary-foreground) 25%, transparent);
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
  background: color-mix(in srgb, var(--primary-foreground) 20%, transparent);
}

.main-content {
  flex: 1;
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
    padding: 0;
  }
}
</style>
