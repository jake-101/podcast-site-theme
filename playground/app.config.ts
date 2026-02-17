export default defineAppConfig({
  podcast: {
    feedUrl: 'https://feeds.transistor.fm/what-the-hack-podcast',
    siteTitle: 'What The Hack',
    platforms: {
      apple: 'https://podcasts.apple.com/podcast/what-the-hack/id1574563893',
      rss: 'https://feeds.transistor.fm/what-the-hack-podcast',
    },
    episodesPerPage: 18,
    heroType: 'featured',
    theme: 'auto',
  },
})

