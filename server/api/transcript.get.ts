/**
 * GET /api/transcript?url=<transcript_url>&type=<mime_type>
 *
 * Fetches and returns raw transcript content from a podcast:transcript URL.
 * The client-side parser handles format detection and parsing.
 * Cached for 24 hours since transcripts rarely change.
 */
export default defineCachedEventHandler(
  async (event) => {
    const query = getQuery(event)
    const url = query.url as string
    const type = (query.type as string) || 'text/plain'

    if (!url) {
      throw createError({
        statusCode: 400,
        message: 'Missing required query parameter: url',
      })
    }

    // Validate URL format
    try {
      new URL(url)
    } catch {
      throw createError({
        statusCode: 400,
        message: 'Invalid transcript URL',
      })
    }

    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'nuxt-podcast-theme/0.1.0',
          'Accept': type,
        },
      })

      if (!response.ok) {
        throw createError({
          statusCode: 502,
          message: `Failed to fetch transcript: ${response.status} ${response.statusText}`,
        })
      }

      const content = await response.text()

      // Detect actual content type from response
      const contentType = response.headers.get('content-type') || type

      return {
        content,
        type: contentType,
        url,
      }
    } catch (error: any) {
      // Re-throw H3 errors
      if (error.statusCode) throw error

      throw createError({
        statusCode: 502,
        message: `Failed to fetch transcript: ${error.message || 'Unknown error'}`,
      })
    }
  },
  {
    maxAge: 60 * 60 * 24, // Cache for 24 hours
    swr: true,
    getKey: (event) => {
      const query = getQuery(event)
      return `transcript:${query.url}`
    },
  },
)
