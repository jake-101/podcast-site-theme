/**
 * Platform links for subscribe buttons
 */
export interface PlatformLinks {
  spotify?: string
  apple?: string
  youtube?: string
  pocketcasts?: string
  overcast?: string
  rss?: string
  [key: string]: string | undefined
}

/**
 * Newsletter signup configuration
 */
export interface NewsletterConfig {
  /** Email platform */
  platform?: 'beehiiv' | 'substack' | 'mailchimp' | 'kit'
  /** Hosted subscribe page URL or embed URL */
  url?: string
  /** Optional raw HTML embed code (iframe or platform JS snippet) */
  embedCode?: string
  /** CTA heading text */
  label?: string
  /** CTA description text */
  description?: string
}

/**
 * Funding/support links for the podcast
 */
export interface FundingLinks {
  patreon?: string
  buymeacoffee?: string
  kofi?: string
  stripe?: string
  paypal?: string
  [key: string]: string | undefined
}

/**
 * Podcast configuration from app.config.ts
 */
export interface PodcastConfig {
  feedUrl: string
  siteTitle: string
  platforms: PlatformLinks
  funding: FundingLinks
  episodesPerPage: number
  theme: 'light' | 'dark' | 'auto'
}

/**
 * Podcasting 2.0 namespace tags (optional)
 */
export interface Podcast2Tags {
  transcript?: {
    url: string
    type: string
    language?: string
  }
  chapters?: {
    url: string
    type: string
  }
  persons?: Array<{
    name: string
    role?: string
    group?: string
    img?: string
    href?: string
  }>
  funding?: Array<{
    url: string
    text: string
  }>
  guid?: string
}

/**
 * Show-level podcast metadata
 */
export interface Podcast {
  title: string
  author: string
  description: string
  artwork: string
  categories: string[]
  feedUrl: string
  type: 'episodic' | 'serial'
  explicit: boolean
  link?: string
  language?: string
  copyright?: string
  // Podcasting 2.0 fields
  podcast2?: Podcast2Tags
}

/**
 * Individual episode data
 */
export interface Episode {
  guid: string
  title: string
  slug: string
  description: string
  htmlContent?: string // Rich HTML from content:encoded
  audioUrl: string
  audioType: string
  audioLength: number
  pubDate: string
  duration: number // In seconds
  artwork?: string // Episode-specific artwork, fallback to show artwork
  episodeNumber?: number
  seasonNumber?: number
  episodeType: 'full' | 'trailer' | 'bonus'
  explicit: boolean
  keywords?: string[]
  link?: string
  // Podcasting 2.0 fields
  podcast2?: Podcast2Tags
}

/**
 * Lightweight episode summary for list views and search index.
 * Omits htmlContent, podcast2, keywords, and other heavy fields
 * to keep SSG payloads small.
 */
export type EpisodeSummary = Omit<Episode, 'htmlContent' | 'podcast2' | 'keywords' | 'link' | 'audioLength' | 'audioType' | 'explicit'>

/**
 * Paginated response for episode list endpoints
 */
export interface PaginatedEpisodes {
  episodes: EpisodeSummary[]
  total: number
  page: number
  totalPages: number
}

/**
 * Search index entry — minimal fields for client-side search
 */
export interface SearchIndexEntry {
  slug: string
  title: string
  description: string
  pubDate: string
  duration: number
  episodeNumber?: number
  episodeType: 'full' | 'trailer' | 'bonus'
  artwork?: string
}

/**
 * Complete podcast feed with show metadata and episodes
 */
export interface PodcastFeed {
  podcast: Podcast
  episodes: Episode[]
}

/**
 * Response from /api/podcast/people/:slug
 * Returns person details plus their episode summaries (lightweight)
 */
export interface PersonDetail {
  person: Person
  episodes: EpisodeSummary[]
}

/**
 * A person extracted from Podcasting 2.0 podcast:person tags
 * Aggregated across all episodes for the persons directory
 */
export interface Person {
  /** Unique slug derived from name */
  slug: string
  name: string
  role?: string
  group?: string
  /** Avatar/headshot image URL */
  img?: string
  /** External link (personal site, social, etc.) */
  href?: string
  /** Slugs of episodes this person appears in */
  episodeSlugs: string[]
}
