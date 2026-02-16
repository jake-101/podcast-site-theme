/**
 * Composable for switching between test feeds during development
 * Stores the selected feed URL in localStorage and provides methods to switch feeds
 */

export interface TestFeed {
  name: string
  url: string
  description: string
}

export const TEST_FEEDS: TestFeed[] = [
  {
    name: 'Syntax.fm',
    url: 'https://feed.syntax.fm/',
    description: '978 episodes, rich HTML show notes',
  },
  {
    name: 'The Rewatchables',
    url: 'https://feeds.megaphone.fm/the-rewatchables',
    description: '446 episodes, guests in titles',
  },
  {
    name: '99% Invisible',
    url: 'https://feeds.simplecast.com/jn7O6Fnt',
    description: '774 episodes, episode types',
  },
  {
    name: 'ACQ2/Acquired',
    url: 'https://feeds.transistor.fm/acq2',
    description: '112 episodes, Podcasting 2.0',
  },
]

const STORAGE_KEY = 'podcast-theme-feed-override'

export function useFeedSwitcher() {
  const currentFeedUrl = useState<string | null>('current-feed-url', () => null)

  // Initialize from localStorage on mount (client-side only)
  onMounted(() => {
    if (import.meta.client) {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        currentFeedUrl.value = stored
      }
    }
  })

  /**
   * Get the currently active feed URL (override or default from config)
   */
  const getActiveFeedUrl = (): string | null => {
    if (import.meta.client) {
      return localStorage.getItem(STORAGE_KEY)
    }
    return null
  }

  /**
   * Switch to a different feed
   */
  const switchFeed = (feedUrl: string) => {
    if (import.meta.client) {
      localStorage.setItem(STORAGE_KEY, feedUrl)
      currentFeedUrl.value = feedUrl
      // Reload the page to fetch new feed data
      window.location.reload()
    }
  }

  /**
   * Clear the feed override and return to default
   */
  const clearOverride = () => {
    if (import.meta.client) {
      localStorage.removeItem(STORAGE_KEY)
      currentFeedUrl.value = null
      window.location.reload()
    }
  }

  /**
   * Get the currently selected test feed object
   */
  const currentTestFeed = computed(() => {
    if (!currentFeedUrl.value) return null
    return TEST_FEEDS.find(feed => feed.url === currentFeedUrl.value)
  })

  return {
    currentFeedUrl: readonly(currentFeedUrl),
    currentTestFeed,
    testFeeds: TEST_FEEDS,
    getActiveFeedUrl,
    switchFeed,
    clearOverride,
  }
}
