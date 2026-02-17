export default defineAppConfig({
  podcast: {
    feedUrl: 'https://changelog.com/podcast/feed',
    siteTitle: 'The Changelog',
    platforms: {
      rss: 'https://changelog.com/podcast/feed',
    },
    episodesPerPage: 18,
    heroType: 'featured',
    navLogo: 'image',
    theme: 'auto',
    newsletter: {
      platform: 'substack',
      url: 'https://changelog.substack.com',
      label: 'Get new episodes in your inbox',
      description: 'Subscribe for weekly software developer news.',
    },
  },
})

