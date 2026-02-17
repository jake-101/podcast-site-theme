export default defineAppConfig({
  podcast: {
    feedUrl: 'https://feeds.transistor.fm/70mm',
    siteTitle: '70mm Pod',
    platforms: {
      apple: 'https://podcasts.apple.com/podcast/id1488993527',
      rss: 'https://podnews.net/rss',
    },
    episodesPerPage: 18,
    hideArtwork: true,
    theme: 'auto',
  },
})

