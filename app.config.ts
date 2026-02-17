export default defineAppConfig({
  podcast: {
    // RSS feed URL - required
    feedUrl: '',
    
    // Site metadata
    siteTitle: '',
    
    // Platform links for subscribe buttons
    platforms: {
      spotify: '',
      apple: '',
      youtube: '',
      pocketcasts: '',
      overcast: '',
      rss: '',
    },
    
    // Display options
    episodesPerPage: 12,
    
    // Hide podcast/episode artwork (useful when every episode has unique art redundant with show art)
    hideArtwork: false,
    
    // Hero style: 'podcast' (show overview) or 'featured' (latest episode)
    heroType: 'podcast' as 'podcast' | 'featured',
    
    // Nav logo: 'text' (podcast title) or 'image' (podcast artwork)
    navLogo: 'text' as 'text' | 'image',
    
    // Theme: 'light', 'dark', or 'auto'
    theme: 'auto',
  },
})
