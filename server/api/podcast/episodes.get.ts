import type { PaginatedEpisodes, EpisodeSummary } from '../../../types/podcast'
import { getCachedPodcastFeed } from '../../utils/feed-cache'
import { resolveFeedUrl, handleFeedError } from '../../utils/feed-url'

/**
 * GET /api/podcast/episodes?page=1&limit=12
 *
 * Returns a paginated slice of episodes WITHOUT htmlContent.
 * This keeps SSG payloads small — only the current page's data
 * gets serialized into the HTML file.
 */
export default defineEventHandler(async (event): Promise<PaginatedEpisodes> => {
  try {
    const feedUrl = resolveFeedUrl(event)
    const query = getQuery(event)

    const page = Math.max(1, Number(query.page) || 1)
    const limit = Math.max(1, Math.min(100, Number(query.limit) || 12))

    const feed = await getCachedPodcastFeed(feedUrl)
    const total = feed.episodes.length
    const totalPages = Math.ceil(total / limit)
    const start = (page - 1) * limit

    // Strip heavy fields to create lightweight summaries
    const episodes: EpisodeSummary[] = feed.episodes
      .slice(start, start + limit)
      .map(({ htmlContent, podcast2, keywords, link, audioLength, audioType, explicit: _explicit, ...summary }) => summary)

    return {
      episodes,
      total,
      page,
      totalPages,
    }
  } catch (error) {
    handleFeedError(error)
  }
})
