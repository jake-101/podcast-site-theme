export default defineAppConfig({
  podcast: {
    feedUrl: 'https://feeds.transistor.fm/cheeky-pint-with-john-collison',
    siteTitle: 'Cheeky Pint',
    platforms: {
      rss: 'https://feeds.transistor.fm/cheeky-pint-with-john-collison',
    },
    episodesPerPage: 18,
    heroType: 'featured',
    navLogo: 'image',
    theme: 'auto',
  },
})

