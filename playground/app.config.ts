export default defineAppConfig({
  podcast: {
    feedUrl: 'https://podnews.net/rss',
    siteTitle: 'Podnews',
    platforms: {
      apple: 'https://podcasts.apple.com/podcast/id1488993527',
      rss: 'https://podnews.net/rss',
    },
    episodesPerPage: 18,
    theme: 'auto',
  },
})

