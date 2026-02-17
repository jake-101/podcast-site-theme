export default defineAppConfig({
  podcast: {
    feedUrl: 'https://feed.syntax.fm/',
    siteTitle: 'Syntax',
    platforms: {
      spotify: 'https://open.spotify.com/show/4kYCRYJ3yK5DQbP5tbfZby',
      apple: 'https://podcasts.apple.com/podcast/syntax-tasty-web-development-treats/id1253186678',
      rss: 'https://feed.syntax.fm/',
    },
    episodesPerPage: 18,
    heroType: 'featured',
    navLogo: 'image',
    theme: 'auto',
  },
})

