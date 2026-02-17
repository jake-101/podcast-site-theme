export default defineNuxtConfig({
  extends: ['..'],

  nitro: {
    prerender: {
      // Prerender multiple routes in parallel to speed up static builds
      concurrency: 20,
      // Crawl links from rendered pages to discover all routes
      crawlLinks: true,
      // Don't abort the build when a crawled link 404s.
      // RSS feed show notes often contain malformed or relative links
      // that the crawler mistakes for local routes.
      failOnError: false,
      // API routes not linked from any page — crawler won't find them automatically
      routes: [
        '/api/podcast/meta',
        '/api/podcast/search-index',
        '/api/podcast/people',
        '/api/podcast/colors',
      ],
    },
  },
})
