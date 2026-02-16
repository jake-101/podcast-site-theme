<script setup lang="ts">
const appConfig = useAppConfig()
const podcastTitle = computed(() => appConfig.podcast?.siteTitle || 'Podcast')
const rssUrl = computed(() => appConfig.podcast?.platforms?.rss || appConfig.podcast?.feedUrl)

// Feed switcher for testing
const { currentFeedUrl, currentTestFeed, testFeeds, switchFeed, clearOverride } = useFeedSwitcher()
const showSwitcher = ref(false)

const toggleSwitcher = () => {
  showSwitcher.value = !showSwitcher.value
}


<template>
  <footer class="podcast-footer">
    <div class="container">
      <div>
        <p>
          <strong>{{ podcastTitle }}</strong>
          <span v-if="rssUrl"> &middot; <a :href="rssUrl" target="_blank" rel="noopener">RSS Feed</a></span>
        </p>
        
        <!-- Feed switcher for testing -->
        <div class="feed-switcher">
          <button 
            type="button" 
            class="switcher-toggle"
            @click="toggleSwitcher"
          >
            🎙️ {{ currentTestFeed ? currentTestFeed.name : 'Switch Feed' }}
          </button>
          
          <div v-if="showSwitcher" class="switcher-dropdown">
            <button
              v-for="feed in testFeeds"
              :key="feed.url"
              type="button"
              class="feed-option"
              :class="{ active: currentFeedUrl === feed.url }"
              @click="switchFeed(feed.url)"
            >
              <strong>{{ feed.name }}</strong>
              <small>{{ feed.description }}</small>
            </button>
            
            <button
              v-if="currentFeedUrl"
              type="button"
              class="feed-option reset"
              @click="clearOverride"
            >
              <strong>Reset to Default</strong>
              <small>Use app.config.ts feed URL</small>
            </button>
          </div>
        </div>
      </div>
      
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
  align-items: start;
  gap: 1rem;
}

.container p {
  margin: 0;
}

.container p:last-child {
  text-align: right;
}

/* Feed Switcher */
.feed-switcher {
  position: relative;
  margin-top: 0.75rem;
}

.switcher-toggle {
  all: unset;
  box-sizing: border-box;
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.35rem 0.75rem;
  background: var(--muted);
  border: 1px solid var(--border);
  border-radius: var(--radius-small);
  font-size: 0.75rem;
  cursor: pointer;
  transition: background-color var(--transition-hover, 0.2s);
}

.switcher-toggle:hover {
  background: var(--secondary);
}

.switcher-dropdown {
  position: absolute;
  bottom: 100%;
  left: 0;
  margin-bottom: 0.5rem;
  background: var(--background);
  border: 1px solid var(--border);
  border-radius: var(--radius-medium);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  min-width: 280px;
  max-width: 320px;
  z-index: 100;
}

.feed-option {
  all: unset;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  width: 100%;
  padding: 0.75rem 1rem;
  text-align: left;
  cursor: pointer;
  border-bottom: 1px solid var(--border);
  transition: background-color var(--transition-hover, 0.2s);
}

.feed-option:last-child {
  border-bottom: none;
}

.feed-option:hover {
  background: var(--muted);
}

.feed-option.active {
  background: var(--primary);
  color: var(--primary-foreground);
}

.feed-option.reset {
  color: var(--warning);
}

.feed-option strong {
  font-size: 0.85rem;
}

.feed-option small {
  font-size: 0.7rem;
  opacity: 0.8;
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
