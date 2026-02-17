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
    
    // Funding/support links for the podcast
    funding: {
      patreon: '',
      buymeacoffee: '',
      kofi: '',
      stripe: '',
      paypal: '',
    },
    
    // Display options
    episodesPerPage: 12,
    
    // Hide podcast/episode artwork (useful when every episode has unique art redundant with show art)
    hideArtwork: false,
    
    // Hero style: 'podcast' (show overview) or 'featured' (latest episode)
    heroType: 'podcast' as 'podcast' | 'featured',
    
    // Nav logo: 'text' (podcast title) or 'image' (podcast artwork)
    navLogo: 'text' as 'text' | 'image',
    
    // Custom navigation links (overrides default auto-generated links)
    // Set to an array of { label, to } objects. If empty, defaults are used.
    navLinks: [] as Array<{ label: string; to: string }>,
    
    // Theme: 'light', 'dark', or 'auto'
    theme: 'auto',

    // Transcript timestamp offset in seconds (for podcasts with intros not in transcript)
    transcriptOffset: 0,

    // Newsletter signup (optional)
    newsletter: {
      // Email platform: 'beehiiv' | 'substack' | 'mailchimp' | 'kit'
      platform: '' as '' | 'beehiiv' | 'substack' | 'mailchimp' | 'kit',
      // Hosted subscribe page URL (link mode — always works)
      url: '',
      // Optional raw HTML embed code (iframe or JS snippet from your platform)
      embedCode: '',
      // CTA heading text
      label: 'Get new episodes in your inbox',
      // CTA description text
      description: '',
    },
  },
})
