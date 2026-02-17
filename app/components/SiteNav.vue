<script setup lang="ts">
const appConfig = useAppConfig()
const { podcast } = usePodcast()
const route = useRoute()
const router = useRouter()

// Shared color mode (singleton — same state as layout)
const { isDark, toggleDarkMode } = useColorModeManager()

// Search state — uses lightweight search index (client-only, lazy loaded)
const { searchInput, results: searchResults, isSearching, clear: clearSearch } = useEpisodeSearch()

// Click-outside dismiss for search dropdown
const searchRef = ref<HTMLElement | null>(null)
onClickOutside(searchRef, () => {
  dropdownOpen.value = false
})

// Hide dropdown on /search page (results are already shown in full) or after navigation
const isSearchPage = computed(() => route.path === '/search')
const dropdownOpen = ref(true)
const showSearchResults = computed(() => !isSearchPage.value && dropdownOpen.value && isSearching.value && searchResults.value.length > 0)
const showNoResults = computed(() => !isSearchPage.value && dropdownOpen.value && isSearching.value && searchResults.value.length === 0)

// Re-open dropdown when user types (but not when clearing)
watch(searchInput, (val) => {
  if (val) {
    dropdownOpen.value = true
  }
})

// Clear search when navigating away from /search
watch(isSearchPage, (onSearchPage, wasOnSearchPage) => {
  if (wasOnSearchPage && !onSearchPage) {
    dropdownOpen.value = false
    clearSearch()
  }
})

// Navigate to episode when search result is clicked
const goToEpisode = (slug: string) => {
  dropdownOpen.value = false
  mobileMenuOpen.value = false
  clearSearch()
  router.push(`/episodes/${slug}`)
}

// Navigate to full search page (Enter key or "more results" click)
const goToSearchPage = () => {
  const q = searchInput.value.trim()
  if (!q) return
  dropdownOpen.value = false
  mobileMenuOpen.value = false
  const activeEl = document.activeElement as HTMLElement | null
  activeEl?.blur()
  router.push({ path: '/search', query: { q } })
}

// Mobile menu state
const mobileMenuOpen = ref(false)
const mobileMenuRef = ref<HTMLElement | null>(null)

const toggleMobileMenu = () => {
  mobileMenuOpen.value = !mobileMenuOpen.value
}

// Close mobile menu on click outside the panel (but not the hamburger button)
onClickOutside(mobileMenuRef, (event) => {
  // Don't close if clicking the hamburger button itself (it has its own toggle)
  const target = event.target as HTMLElement
  if (target.closest('.site-nav__hamburger')) return
  mobileMenuOpen.value = false
})

// Close mobile menu on route change
watch(() => route.path, () => {
  mobileMenuOpen.value = false
})

// Nav links from config (fallback to defaults if not configured)
const navLinks = computed(() => {
  const configured = (appConfig.podcast as any).navLinks as Array<{ label: string; to: string }> | undefined
  if (configured && configured.length > 0) return configured
  const links: Array<{ label: string; to: string }> = [
    { label: 'Episodes', to: '/' },
  ]
  if (podcast.value?.podcast2?.persons?.length) {
    links.push({ label: 'People', to: '/people' })
  }
  return links
})
</script>

<template>
  <header class="site-header">
    <!-- Top bar: always visible -->
    <div class="site-header__bar">
      <div class="container">
        <div class="site-nav">
          <!-- Logo -->
          <NuxtLink to="/" class="site-logo">
            <img
              v-if="appConfig.podcast.navLogo === 'image' && podcast?.artwork"
              :src="podcast.artwork"
              :alt="podcast.title"
              class="site-logo__image"
            />
            <span v-else class="site-logo__text">{{ podcast?.title || appConfig.podcast.siteTitle || 'Podcast' }}</span>
          </NuxtLink>

          <!-- Desktop: inline nav links -->
          <div class="site-nav__links">
            <NuxtLink
              v-for="link in navLinks"
              :key="link.to"
              :to="link.to"
              class="site-nav__link"
              :class="{ 'site-nav__link--active': route.path === link.to }"
            >
              {{ link.label }}
            </NuxtLink>
          </div>

          <!-- Desktop: inline search -->
          <div ref="searchRef" class="site-nav__search site-nav__search--desktop">
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

          <!-- Desktop: theme toggle icon button -->
          <button
            class="theme-toggle"
            type="button"
            @click="toggleDarkMode"
            :aria-label="isDark ? 'Switch to light mode' : 'Switch to dark mode'"
          >
            <Icon v-if="isDark" name="ph:sun-bold" size="20" />
            <Icon v-else name="ph:moon-bold" size="20" />
          </button>

          <!-- Mobile: hamburger button (always in top bar) -->
          <button
            class="site-nav__hamburger"
            type="button"
            aria-label="Toggle navigation menu"
            :aria-expanded="mobileMenuOpen"
            @click="toggleMobileMenu"
          >
            <Icon v-if="mobileMenuOpen" name="ph:x-bold" size="22" />
            <Icon v-else name="ph:list-bold" size="22" />
          </button>
        </div>
      </div>
    </div>

    <!-- Mobile: dropdown panel below the bar -->
    <div
      v-show="mobileMenuOpen"
      ref="mobileMenuRef"
      class="mobile-panel"
    >
      <div class="container">
        <!-- Search -->
        <div class="mobile-panel__search">
          <div class="site-nav__search-wrap">
            <Icon name="ph:magnifying-glass" size="16" class="site-nav__search-icon" />
            <input
              v-model="searchInput"
              type="search"
              placeholder="Search episodes..."
              aria-label="Search episodes"
              class="site-nav__search-input site-nav__search-input--panel"
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
          <!-- Mobile search results (inline, not dropdown) -->
          <div v-if="showSearchResults" class="mobile-panel__results">
            <ul class="search-results__list">
              <li
                v-for="result in searchResults.slice(0, 6)"
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
            <div v-if="searchResults.length > 6" class="search-results__more" @click="goToSearchPage">
              <small>View all {{ searchResults.length }} results &rarr;</small>
            </div>
          </div>
          <div v-if="showNoResults" class="mobile-panel__results mobile-panel__results--empty">
            <small>No episodes found</small>
          </div>
        </div>

        <!-- Nav links -->
        <nav class="mobile-panel__nav">
          <NuxtLink
            v-for="link in navLinks"
            :key="link.to"
            :to="link.to"
            class="mobile-panel__link"
            :class="{ 'mobile-panel__link--active': route.path === link.to }"
          >
            {{ link.label }}
          </NuxtLink>
        </nav>

        <!-- Theme toggle row -->
        <div class="mobile-panel__footer">
          <label class="mobile-panel__theme-row">
            <span class="mobile-panel__theme-label">
              <Icon v-if="isDark" name="ph:moon-bold" size="18" />
              <Icon v-else name="ph:sun-bold" size="18" />
              {{ isDark ? 'Dark mode' : 'Light mode' }}
            </span>
            <input
              type="checkbox"
              role="switch"
              :checked="isDark"
              @change="toggleDarkMode"
            />
          </label>
        </div>
      </div>
    </div>
  </header>
</template>

<style scoped>
/* ─── Header shell ─── */
.site-header {
  background-color: var(--primary);
  color: var(--primary-foreground);
  position: relative;
  z-index: var(--z-dropdown, 50);
}

.site-header__bar {
  padding: var(--space-3, 0.75rem) 0;
}

/* ─── Top nav row ─── */
.site-nav {
  display: flex;
  align-items: center;
  gap: var(--space-4, 1rem);
}

/* Logo */
.site-logo {
  text-decoration: none;
  color: var(--primary-foreground);
  flex-shrink: 0;
}

.site-logo__text {
  font-size: var(--text-4, 1.25rem);
  font-weight: var(--font-bold, 600);
  white-space: nowrap;
  line-height: 1.2;
}

.site-logo__image {
  display: block;
  height: 2.25rem;
  width: auto;
  border-radius: var(--radius-medium, 0.375rem);
  object-fit: contain;
}

/* ─── Desktop nav links (inline) ─── */
.site-nav__links {
  display: flex;
  align-items: center;
  gap: var(--space-1, 0.25rem);
}

.site-nav__link {
  text-decoration: none;
  color: color-mix(in srgb, var(--primary-foreground) 75%, transparent);
  font-size: var(--text-7, 0.875rem);
  font-weight: var(--font-medium, 500);
  padding: var(--space-1, 0.25rem) var(--space-3, 0.75rem);
  border-radius: var(--radius-small, 0.125rem);
  transition: color var(--transition-fast), background-color var(--transition-fast);
  white-space: nowrap;
}

.site-nav__link:hover {
  color: var(--primary-foreground);
  background: color-mix(in srgb, var(--primary-foreground) 10%, transparent);
}

.site-nav__link--active {
  color: var(--primary-foreground);
  background: color-mix(in srgb, var(--primary-foreground) 15%, transparent);
}

/* ─── Desktop search ─── */
.site-nav__search--desktop {
  flex: 1;
  max-width: 360px;
  position: relative;
}

.site-nav__search-wrap {
  position: relative;
  display: flex;
  align-items: center;
}

.site-nav__search-icon {
  position: absolute;
  left: var(--space-3, 0.75rem);
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
  padding: var(--space-2, 0.5rem) var(--space-8, 2rem) var(--space-2, 0.5rem) var(--space-8, 2rem);
  background: color-mix(in srgb, var(--primary-foreground) 12%, transparent);
  border: 1px solid color-mix(in srgb, var(--primary-foreground) 25%, transparent);
  border-radius: var(--radius-medium, 0.375rem);
  color: var(--primary-foreground);
  font-size: var(--text-7, 0.875rem);
  line-height: var(--leading-normal, 1.5);
  box-sizing: border-box;
  margin: 0;
  margin-block-start: 0;
  outline: none;
  transition: background var(--transition), border-color var(--transition);
}

.site-nav__search-input::placeholder {
  color: color-mix(in srgb, var(--primary-foreground) 50%, transparent);
}

.site-nav__search-input:focus {
  background: color-mix(in srgb, var(--primary-foreground) 20%, transparent);
  border-color: color-mix(in srgb, var(--primary-foreground) 50%, transparent);
}

.site-nav__search-input::-webkit-search-cancel-button {
  display: none;
}

.site-nav__search-clear {
  all: unset;
  position: absolute;
  right: var(--space-2, 0.5rem);
  top: 50%;
  transform: translateY(-50%);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: color-mix(in srgb, var(--primary-foreground) 65%, transparent);
  cursor: pointer;
  padding: var(--space-1, 0.25rem);
  border-radius: var(--radius-small);
  transition: color var(--transition-fast);
}

.site-nav__search-clear:hover {
  color: var(--primary-foreground);
}

/* ─── Desktop search results dropdown ─── */
.search-results {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  margin-top: var(--space-1, 0.25rem);
  background: var(--background);
  border: 1px solid var(--border);
  border-radius: var(--radius-medium, 0.375rem);
  box-shadow: var(--shadow-large);
  z-index: 100;
  max-height: 400px;
  overflow-y: auto;
}

.search-results__count,
.search-results__more,
.search-results__empty {
  padding: var(--space-2, 0.5rem) var(--space-3, 0.75rem);
  color: var(--muted-foreground);
  border-bottom: 1px solid var(--border);
}

.search-results__more {
  border-bottom: none;
  border-top: 1px solid var(--border);
  text-align: center;
  cursor: pointer;
  transition: background-color var(--transition-fast);
}

.search-results__more:hover {
  background-color: var(--muted);
}

.search-results__empty {
  border-bottom: none;
  text-align: center;
  padding: var(--space-4, 1rem) var(--space-3, 0.75rem);
}

.search-results__list {
  all: unset;
  display: block;
  list-style: none;
}

.search-results__item {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: var(--space-3, 0.75rem);
  cursor: pointer;
  transition: background-color var(--transition-fast);
  border-bottom: 1px solid var(--border);
}

.search-results__item:last-child {
  border-bottom: none;
}

.search-results__item:hover {
  background-color: var(--muted);
}

.search-results__title {
  font-size: var(--text-7, 0.875rem);
  font-weight: var(--font-medium, 500);
  color: var(--foreground);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.search-results__meta {
  font-size: var(--text-8, 0.75rem);
  color: var(--muted-foreground);
}

/* ─── Desktop theme toggle ─── */
.theme-toggle {
  background: color-mix(in srgb, var(--primary-foreground) 12%, transparent);
  border: 1px solid color-mix(in srgb, var(--primary-foreground) 25%, transparent);
  border-radius: var(--radius-small);
  padding: var(--space-2, 0.5rem);
  cursor: pointer;
  line-height: 1;
  color: var(--primary-foreground);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: background-color var(--transition-fast);
  flex-shrink: 0;
}

.theme-toggle:hover {
  background: color-mix(in srgb, var(--primary-foreground) 20%, transparent);
}

/* ─── Mobile hamburger (hidden on desktop) ─── */
.site-nav__hamburger {
  display: none;
  background: none;
  border: none;
  color: var(--primary-foreground);
  cursor: pointer;
  padding: var(--space-1, 0.25rem);
  line-height: 1;
  margin-left: auto;
}

/* ─── Mobile panel (hidden on desktop) ─── */
.mobile-panel {
  display: none;
}

/* ══════════════════════════════════════════
   Mobile (<= 768px)
   ══════════════════════════════════════════ */
@media (max-width: 768px) {
  /* Show hamburger, hide desktop-only elements */
  .site-nav__hamburger {
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }

  .site-nav__links,
  .site-nav__search--desktop,
  .theme-toggle {
    display: none;
  }

  .site-logo__text {
    font-size: var(--text-5, 1.125rem);
  }

  /* ─── Mobile panel: tinted sheet below the bar ─── */
  .mobile-panel {
    display: block;
    background-color: color-mix(in srgb, var(--primary) 85%, var(--primary-foreground));
    color: var(--primary-foreground);
    border-top: 1px solid color-mix(in srgb, var(--primary-foreground) 12%, transparent);
    box-shadow: var(--shadow-medium);
    padding: var(--space-4, 1rem) 0;
  }

  /* Search section */
  .mobile-panel__search {
    margin-bottom: var(--space-4, 1rem);
  }

  .mobile-panel__search .site-nav__search-wrap {
    position: relative;
  }

  /* Input in the panel: translucent foreground tint (same style as desktop nav input) */
  .site-nav__search-input--panel {
    background: color-mix(in srgb, var(--primary-foreground) 10%, transparent);
    border: 1px solid color-mix(in srgb, var(--primary-foreground) 20%, transparent);
    color: var(--primary-foreground);
  }

  .site-nav__search-input--panel::placeholder {
    color: color-mix(in srgb, var(--primary-foreground) 50%, transparent);
  }

  .site-nav__search-input--panel:focus {
    background: color-mix(in srgb, var(--primary-foreground) 18%, transparent);
    border-color: color-mix(in srgb, var(--primary-foreground) 40%, transparent);
    box-shadow: none;
  }

  .mobile-panel__search .site-nav__search-icon {
    color: color-mix(in srgb, var(--primary-foreground) 55%, transparent);
  }

  .mobile-panel__search .site-nav__search-clear {
    color: color-mix(in srgb, var(--primary-foreground) 60%, transparent);
  }

  .mobile-panel__search .site-nav__search-clear:hover {
    color: var(--primary-foreground);
  }

  /* Mobile search results — inline, not absolute positioned */
  .mobile-panel__results {
    margin-top: var(--space-2, 0.5rem);
    border: 1px solid color-mix(in srgb, var(--primary-foreground) 15%, transparent);
    border-radius: var(--radius-medium);
    background: color-mix(in srgb, var(--primary-foreground) 8%, transparent);
    max-height: 280px;
    overflow-y: auto;
  }

  .mobile-panel__results .search-results__item {
    border-bottom-color: color-mix(in srgb, var(--primary-foreground) 10%, transparent);
  }

  .mobile-panel__results .search-results__title {
    color: var(--primary-foreground);
  }

  .mobile-panel__results .search-results__meta {
    color: color-mix(in srgb, var(--primary-foreground) 60%, transparent);
  }

  .mobile-panel__results .search-results__item:hover {
    background-color: color-mix(in srgb, var(--primary-foreground) 12%, transparent);
  }

  .mobile-panel__results--empty {
    text-align: center;
    padding: var(--space-3, 0.75rem);
    color: color-mix(in srgb, var(--primary-foreground) 55%, transparent);
  }

  .mobile-panel__results .search-results__more {
    border-top: 1px solid color-mix(in srgb, var(--primary-foreground) 10%, transparent);
    color: color-mix(in srgb, var(--primary-foreground) 70%, transparent);
  }

  .mobile-panel__results .search-results__more:hover {
    background-color: color-mix(in srgb, var(--primary-foreground) 12%, transparent);
  }

  /* Nav links */
  .mobile-panel__nav {
    display: flex;
    flex-direction: column;
    gap: var(--space-1, 0.25rem);
    padding-bottom: var(--space-4, 1rem);
    border-bottom: 1px solid color-mix(in srgb, var(--primary-foreground) 12%, transparent);
    margin-bottom: var(--space-4, 1rem);
  }

  .mobile-panel__link {
    display: flex;
    align-items: center;
    padding: var(--space-3, 0.75rem) var(--space-3, 0.75rem);
    font-size: var(--text-6, 1rem);
    font-weight: var(--font-medium, 500);
    color: color-mix(in srgb, var(--primary-foreground) 85%, transparent);
    text-decoration: none;
    border-radius: var(--radius-small);
    transition: background-color var(--transition-fast), color var(--transition-fast);
  }

  .mobile-panel__link:hover {
    background-color: color-mix(in srgb, var(--primary-foreground) 10%, transparent);
    color: var(--primary-foreground);
  }

  .mobile-panel__link--active {
    background-color: color-mix(in srgb, var(--primary-foreground) 12%, transparent);
    color: var(--primary-foreground);
    font-weight: var(--font-semibold, 600);
  }

  /* Footer: theme switch row */
  .mobile-panel__footer {
    padding: 0;
  }

  .mobile-panel__theme-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--space-2, 0.5rem) var(--space-3, 0.75rem);
    cursor: pointer;
    font-size: var(--text-7, 0.875rem);
    font-weight: var(--font-medium, 500);
    color: color-mix(in srgb, var(--primary-foreground) 65%, transparent);
  }

  .mobile-panel__theme-label {
    display: inline-flex;
    align-items: center;
    gap: var(--space-2, 0.5rem);
  }

  /* Override oat.css switch colors to match the panel */
  .mobile-panel__theme-row input[type="checkbox"][role="switch"] {
    background-color: color-mix(in srgb, var(--primary-foreground) 25%, transparent);
  }

  .mobile-panel__theme-row input[type="checkbox"][role="switch"]:checked {
    background-color: var(--primary-foreground);
  }

  .mobile-panel__theme-row input[type="checkbox"][role="switch"]::before {
    background-color: var(--primary);
  }
}
</style>
