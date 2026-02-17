import type { SearchIndexEntry } from '../../../types/podcast'
import { getCachedPodcastFeed } from '../../utils/feed-cache'
import { resolveFeedUrl, handleFeedError } from '../../utils/feed-url'

/**
 * GET /api/podcast/search-index
 *
 * Returns a lightweight array of all episodes with only the fields
 * needed for client-side search: slug, title, description, date,
 * duration, episode number, type, and artwork.
 *
 * This endpoint is fetched client-only (server: false, lazy: true)
 * so it never enters the SSG payload. It enables instant search
 * without shipping full episode data to every page.
 */
export default defineEventHandler(async (event): Promise<SearchIndexEntry[]> => {
  try {
    const feedUrl = resolveFeedUrl(event)
    const feed = await getCachedPodcastFeed(feedUrl)

    return feed.episodes.map(ep => ({
      slug: ep.slug,
      title: ep.title,
      description: ep.description,
      pubDate: ep.pubDate,
      duration: ep.duration,
      episodeNumber: ep.episodeNumber,
      episodeType: ep.episodeType,
      artwork: ep.artwork,
    }))
  } catch (error) {
    handleFeedError(error)
  }
})
