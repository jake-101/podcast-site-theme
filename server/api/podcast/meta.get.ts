import type { Podcast } from '../../../types/podcast'
import { getCachedPodcastFeed } from '../../utils/feed-cache'
import { resolveFeedUrl, handleFeedError } from '../../utils/feed-url'

/**
 * GET /api/podcast/meta
 *
 * Returns only the show-level podcast metadata (no episodes).
 * Lightweight endpoint for pages that only need show info.
 */
export default defineEventHandler(async (event): Promise<Podcast> => {
  try {
    const feedUrl = resolveFeedUrl(event)
    const feed = await getCachedPodcastFeed(feedUrl)
    return feed.podcast
  } catch (error) {
    handleFeedError(error)
  }
})
