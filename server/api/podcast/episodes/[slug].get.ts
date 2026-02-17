import type { Episode } from '../../../../types/podcast'
import { getCachedPodcastFeed } from '../../../utils/feed-cache'
import { resolveFeedUrl, handleFeedError } from '../../../utils/feed-url'

/**
 * GET /api/podcast/episodes/:slug
 *
 * Returns a single full episode by slug, including htmlContent
 * and all metadata. Used by the episode detail page so only
 * one episode's data enters the SSG payload.
 */
export default defineEventHandler(async (event): Promise<Episode> => {
  try {
    const feedUrl = resolveFeedUrl(event)
    const slug = getRouterParam(event, 'slug')

    if (!slug) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Missing slug',
        message: 'Episode slug is required',
      })
    }

    const feed = await getCachedPodcastFeed(feedUrl)
    const episode = feed.episodes.find(ep => ep.slug === slug)

    if (!episode) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Episode not found',
        message: `No episode found with slug: ${slug}`,
      })
    }

    return episode
  } catch (error) {
    handleFeedError(error)
  }
})
