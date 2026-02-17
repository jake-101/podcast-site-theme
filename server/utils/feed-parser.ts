import { XMLParser } from 'fast-xml-parser'
import type { Podcast, Episode, PodcastFeed, Podcast2Tags } from '../../types/podcast'
import { generateSlug } from './slug'

/**
 * Parse duration string into seconds
 * Handles both HH:MM:SS format and plain seconds
 */
function parseDuration(duration: string | number | undefined): number {
  if (!duration) return 0
  
  // If already a number, return it
  if (typeof duration === 'number') {
    return Math.floor(duration)
  }
  
  // Parse HH:MM:SS or MM:SS format
  const parts = duration.toString().split(':').map(p => parseInt(p, 10))
  
  if (parts.length === 3) {
    // HH:MM:SS
    return parts[0] * 3600 + parts[1] * 60 + parts[2]
  } else if (parts.length === 2) {
    // MM:SS
    return parts[0] * 60 + parts[1]
  } else if (parts.length === 1) {
    // Just seconds
    return parts[0]
  }
  
  return 0
}

/**
 * Parse boolean-like values from RSS feeds
 */
function parseBoolean(value: string | boolean | undefined): boolean {
  if (typeof value === 'boolean') return value
  if (!value) return false
  
  const str = value.toString().toLowerCase()
  return str === 'true' || str === 'yes' || str === '1'
}

/**
 * Extract array of categories from iTunes categories
 */
function parseCategories(categories: any): string[] {
  if (!categories) return []
  
  const cats: string[] = []
  const categoryArray = Array.isArray(categories) ? categories : [categories]
  
  for (const cat of categoryArray) {
    if (typeof cat === 'string') {
      cats.push(cat)
    } else if (cat['@_text']) {
      cats.push(cat['@_text'])
    } else if (cat.text) {
      cats.push(cat.text)
    }
  }
  
  return cats
}

/**
 * Parse Podcasting 2.0 namespace tags
 */
function parsePodcast2Tags(item: any): Podcast2Tags | undefined {
  const tags: Podcast2Tags = {}
  let hasAnyTag = false
  
  // Parse transcript — may be a single object or array of multiple formats
  if (item['podcast:transcript']) {
    const raw = item['podcast:transcript']
    const transcripts = (Array.isArray(raw) ? raw : [raw]).map((t: any) => ({
      url: t['@_url'] || t.url || '',
      type: t['@_type'] || t.type || 'text/plain',
      language: t['@_language'] || t.language,
    }))

    // Prefer VTT > SRT > plain text > first available
    const preferred = (
      transcripts.find(t => t.type === 'text/vtt') ||
      transcripts.find(t => t.type === 'application/x-subrip') ||
      transcripts.find(t => t.type === 'text/plain') ||
      transcripts[0]
    )

    if (preferred?.url) {
      tags.transcript = preferred
      hasAnyTag = true
    }
  }
  
  // Parse chapters
  if (item['podcast:chapters']) {
    const chapters = item['podcast:chapters']
    tags.chapters = {
      url: chapters['@_url'] || chapters.url || '',
      type: chapters['@_type'] || chapters.type || 'application/json+chapters',
    }
    hasAnyTag = true
  }
  
  // Parse persons
  if (item['podcast:person']) {
    const persons = Array.isArray(item['podcast:person']) 
      ? item['podcast:person'] 
      : [item['podcast:person']]
    
    tags.persons = persons.map((p: any) => ({
      name: p['#text'] || p.text || p['@_name'] || '',
      role: p['@_role'] || p.role,
      group: p['@_group'] || p.group,
      img: p['@_img'] || p.img,
      href: p['@_href'] || p.href,
    }))
    hasAnyTag = true
  }
  
  // Parse funding
  if (item['podcast:funding']) {
    const funding = Array.isArray(item['podcast:funding'])
      ? item['podcast:funding']
      : [item['podcast:funding']]
    
    tags.funding = funding.map((f: any) => ({
      url: f['@_url'] || f.url || '',
      text: f['#text'] || f.text || '',
    }))
    hasAnyTag = true
  }
  
  // Parse GUID
  if (item['podcast:guid']) {
    tags.guid = item['podcast:guid']['#text'] || item['podcast:guid']
    hasAnyTag = true
  }
  
  return hasAnyTag ? tags : undefined
}

/**
 * Parse podcast RSS feed from XML string
 */
export async function parsePodcastFeed(feedUrl: string): Promise<PodcastFeed> {
  // Fetch the RSS feed
  let xmlContent: string
  try {
    const response = await fetch(feedUrl, {
      headers: {
        'User-Agent': 'nuxt-podcast-theme/0.1.0',
      },
    })
    
    if (!response.ok) {
      throw new Error(`Failed to fetch feed: ${response.status} ${response.statusText}`)
    }
    
    xmlContent = await response.text()
  } catch (error) {
    throw new Error(`Failed to fetch RSS feed from ${feedUrl}: ${error}`)
  }
  
  // Parse XML
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    textNodeName: '#text',
    parseAttributeValue: true,
    trimValues: true,
  })
  
  let rss: any
  try {
    rss = parser.parse(xmlContent)
  } catch (error) {
    throw new Error(`Failed to parse RSS XML: ${error}`)
  }
  
  // Navigate to channel
  const channel = rss?.rss?.channel
  if (!channel) {
    throw new Error('Invalid RSS feed: missing channel element')
  }
  
  // Extract show metadata
  const podcast: Podcast = {
    title: String(channel.title || 'Untitled Podcast'),
    author: String(channel['itunes:author'] || channel.author || 'Unknown'),
    description: String(channel.description || ''),
    artwork: channel['itunes:image']?.['@_href'] || channel.image?.url || '',
    categories: parseCategories(channel['itunes:category']),
    feedUrl,
    type: (channel['itunes:type'] === 'serial' ? 'serial' : 'episodic') as 'episodic' | 'serial',
    explicit: parseBoolean(channel['itunes:explicit']),
    link: channel.link,
    language: channel.language,
    copyright: channel.copyright,
  }
  
  // Parse show-level Podcasting 2.0 tags
  const showPodcast2 = parsePodcast2Tags(channel)
  if (showPodcast2) {
    podcast.podcast2 = showPodcast2
  }
  
  // Extract episodes
  const items = Array.isArray(channel.item) ? channel.item : [channel.item]
  const episodes: Episode[] = []
  
  for (const item of items) {
    if (!item) continue
    
    // Get enclosure (audio file)
    const enclosure = item.enclosure
    if (!enclosure) {
      // Skip items without audio
      continue
    }
    
    const audioUrl = enclosure['@_url'] || enclosure.url
    if (!audioUrl) continue
    
    const title = String(item.title || 'Untitled Episode')
    const episodeNumber = item['itunes:episode'] 
      ? parseInt(item['itunes:episode'], 10) 
      : undefined
    
    // Parse episode type
    let episodeType: 'full' | 'trailer' | 'bonus' = 'full'
    const itunesType = item['itunes:episodeType']?.toLowerCase()
    if (itunesType === 'trailer') episodeType = 'trailer'
    else if (itunesType === 'bonus') episodeType = 'bonus'
    
    // Parse keywords
    let keywords: string[] | undefined
    if (item['itunes:keywords']) {
      keywords = item['itunes:keywords']
        .split(',')
        .map((k: string) => k.trim())
        .filter(Boolean)
    }
    
    const episode: Episode = {
      guid: item.guid?.['#text'] || item.guid || audioUrl,
      title,
      slug: generateSlug(title, episodeNumber),
      description: String(item['itunes:summary'] || item.description || ''),
      htmlContent: item['content:encoded'],
      audioUrl,
      audioType: enclosure['@_type'] || enclosure.type || 'audio/mpeg',
      audioLength: parseInt(enclosure['@_length'] || enclosure.length || '0', 10),
      pubDate: item.pubDate || new Date().toISOString(),
      duration: parseDuration(item['itunes:duration']),
      artwork: item['itunes:image']?.['@_href'] || podcast.artwork,
      episodeNumber,
      seasonNumber: item['itunes:season'] 
        ? parseInt(item['itunes:season'], 10) 
        : undefined,
      episodeType,
      explicit: parseBoolean(item['itunes:explicit'] ?? channel['itunes:explicit']),
      keywords,
      link: item.link,
    }
    
    // Parse episode-level Podcasting 2.0 tags
    const episodePodcast2 = parsePodcast2Tags(item)
    if (episodePodcast2) {
      episode.podcast2 = episodePodcast2
    }
    
    episodes.push(episode)
  }
  
  return {
    podcast,
    episodes,
  }
}
