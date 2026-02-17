import type { H3Event } from 'h3'

/**
 * Resolve and validate the podcast feed URL from app config.
 * Throws appropriate H3 errors if URL is missing or invalid.
 */
export function resolveFeedUrl(event: H3Event): string {
  const appConfig = useAppConfig(event)
  const feedUrl = appConfig.podcast?.feedUrl

  if (!feedUrl) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Feed URL not configured',
      message: 'podcast.feedUrl must be set in app.config.ts',
    })
  }

  if (!feedUrl.startsWith('http://') && !feedUrl.startsWith('https://')) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Invalid feed URL',
      message: 'podcast.feedUrl must be a valid HTTP(S) URL',
    })
  }

  return feedUrl
}

/**
 * Wrap feed fetch/parse errors in appropriate H3 error responses.
 */
export function handleFeedError(error: unknown): never {
  // Re-throw H3 errors (already formatted)
  if (error && typeof error === 'object' && 'statusCode' in error) {
    throw error
  }

  const message = error instanceof Error ? error.message : 'Unknown error'

  if (message.includes('Failed to fetch feed')) {
    throw createError({
      statusCode: 502,
      statusMessage: 'Feed unavailable',
      message: `Unable to fetch RSS feed: ${message}`,
    })
  } else if (message.includes('Failed to parse RSS XML')) {
    throw createError({
      statusCode: 502,
      statusMessage: 'Invalid feed format',
      message: `Unable to parse RSS feed: ${message}`,
    })
  } else if (message.includes('timeout')) {
    throw createError({
      statusCode: 504,
      statusMessage: 'Feed timeout',
      message: 'RSS feed request timed out',
    })
  }

  throw createError({
    statusCode: 500,
    statusMessage: 'Feed processing failed',
    message: `Failed to process podcast feed: ${message}`,
  })
}
