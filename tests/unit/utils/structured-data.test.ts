import { describe, expect, it } from 'vitest'
import {
  generatePodcastSeriesSD,
  generateEpisodeSD,
  generatePodcastOGTags,
  generateEpisodeOGTags,
  generatePodcastTwitterTags,
  generateEpisodeTwitterTags,
} from '../../../app/utils/structured-data'
import type { Podcast, Episode } from '../../../types/podcast'

// --- Mock data ---

const mockPodcast: Podcast = {
  title: 'Test Podcast',
  author: 'Jane Doe',
  description: 'A podcast about testing.',
  artwork: 'https://example.com/artwork.jpg',
  categories: ['Technology', 'Education'],
  feedUrl: 'https://example.com/feed.xml',
  type: 'episodic',
  explicit: false,
  link: 'https://example.com',
  language: 'en',
  copyright: 'Test Corp',
}

const mockPodcastMinimal: Podcast = {
  title: 'Minimal Podcast',
  author: 'John Smith',
  description: 'A minimal podcast.',
  artwork: 'https://example.com/minimal.jpg',
  categories: [],
  feedUrl: 'https://example.com/minimal-feed.xml',
  type: 'serial',
  explicit: true,
  // No optional fields: link, language, copyright
}

const mockEpisode: Episode = {
  guid: 'ep-001',
  title: 'Episode One',
  slug: 'episode-one',
  description: 'The first episode about testing.',
  htmlContent: '<p>Full show notes for episode one.</p>',
  audioUrl: 'https://example.com/ep1.mp3',
  audioType: 'audio/mpeg',
  audioLength: 50000000,
  pubDate: '2025-02-13T10:00:00Z',
  duration: 3600,
  artwork: 'https://example.com/ep1-art.jpg',
  episodeNumber: 1,
  seasonNumber: 2,
  episodeType: 'full',
  explicit: false,
  keywords: ['testing', 'vitest'],
  link: 'https://example.com/episodes/episode-one',
}

const mockEpisodeMinimal: Episode = {
  guid: 'ep-002',
  title: 'Episode Two',
  slug: 'episode-two',
  description: 'A minimal episode.',
  audioUrl: 'https://example.com/ep2.mp3',
  audioType: 'audio/mpeg',
  audioLength: 0,
  pubDate: '2025-03-01T08:00:00Z',
  duration: 1800,
  episodeType: 'bonus',
  explicit: true,
  // No optional fields: artwork, episodeNumber, seasonNumber, keywords, link, htmlContent
}

// --- Tests ---

describe('generatePodcastSeriesSD', () => {
  it('returns correct @context and @type', () => {
    const sd = generatePodcastSeriesSD(mockPodcast)
    expect(sd['@context']).toBe('https://schema.org')
    expect(sd['@type']).toBe('PodcastSeries')
  })

  it('includes name, author, description, image', () => {
    const sd = generatePodcastSeriesSD(mockPodcast)
    expect(sd.name).toBe('Test Podcast')
    expect(sd.author).toEqual({ '@type': 'Person', name: 'Jane Doe' })
    expect(sd.description).toBe('A podcast about testing.')
    expect(sd.image).toBe('https://example.com/artwork.jpg')
  })

  it('uses link as url when available', () => {
    const sd = generatePodcastSeriesSD(mockPodcast)
    expect(sd.url).toBe('https://example.com')
  })

  it('falls back to feedUrl when link is not set', () => {
    const sd = generatePodcastSeriesSD(mockPodcastMinimal)
    expect(sd.url).toBe('https://example.com/minimal-feed.xml')
  })

  it('includes webFeed', () => {
    const sd = generatePodcastSeriesSD(mockPodcast)
    expect(sd.webFeed).toBe('https://example.com/feed.xml')
  })

  it('includes language when provided', () => {
    const sd = generatePodcastSeriesSD(mockPodcast)
    expect(sd.inLanguage).toBe('en')
  })

  it('omits language when not provided', () => {
    const sd = generatePodcastSeriesSD(mockPodcastMinimal)
    expect(sd).not.toHaveProperty('inLanguage')
  })

  it('includes copyright holder when copyright is provided', () => {
    const sd = generatePodcastSeriesSD(mockPodcast)
    expect(sd.copyrightHolder).toEqual({ '@type': 'Organization', name: 'Test Corp' })
  })

  it('omits copyright holder when copyright is not provided', () => {
    const sd = generatePodcastSeriesSD(mockPodcastMinimal)
    expect(sd).not.toHaveProperty('copyrightHolder')
  })
})

describe('generateEpisodeSD', () => {
  it('returns correct @context and @type', () => {
    const sd = generateEpisodeSD(mockEpisode, mockPodcast)
    expect(sd['@context']).toBe('https://schema.org')
    expect(sd['@type']).toBe('PodcastEpisode')
  })

  it('includes episode name and description', () => {
    const sd = generateEpisodeSD(mockEpisode, mockPodcast)
    expect(sd.name).toBe('Episode One')
    expect(sd.description).toBe('The first episode about testing.')
  })

  it('includes episode number when provided', () => {
    const sd = generateEpisodeSD(mockEpisode, mockPodcast)
    expect(sd.episodeNumber).toBe(1)
  })

  it('omits episode number when not provided', () => {
    const sd = generateEpisodeSD(mockEpisodeMinimal, mockPodcast)
    expect(sd).not.toHaveProperty('episodeNumber')
  })

  it('includes season info when season number is provided', () => {
    const sd = generateEpisodeSD(mockEpisode, mockPodcast)
    expect(sd.partOfSeason).toEqual({
      '@type': 'PodcastSeason',
      seasonNumber: 2,
    })
  })

  it('omits season info when season number is not provided', () => {
    const sd = generateEpisodeSD(mockEpisodeMinimal, mockPodcast)
    expect(sd).not.toHaveProperty('partOfSeason')
  })

  it('includes datePublished', () => {
    const sd = generateEpisodeSD(mockEpisode, mockPodcast)
    expect(sd.datePublished).toBe('2025-02-13T10:00:00Z')
  })

  it('formats duration as ISO 8601', () => {
    const sd = generateEpisodeSD(mockEpisode, mockPodcast)
    expect(sd.duration).toBe('PT3600S')
  })

  it('floors fractional duration', () => {
    const episode = { ...mockEpisode, duration: 1800.7 }
    const sd = generateEpisodeSD(episode, mockPodcast)
    expect(sd.duration).toBe('PT1800S')
  })

  it('uses episode artwork when available', () => {
    const sd = generateEpisodeSD(mockEpisode, mockPodcast)
    expect(sd.image).toBe('https://example.com/ep1-art.jpg')
  })

  it('falls back to podcast artwork when episode artwork is missing', () => {
    const sd = generateEpisodeSD(mockEpisodeMinimal, mockPodcast)
    expect(sd.image).toBe('https://example.com/artwork.jpg')
  })

  it('includes associatedMedia with correct fields', () => {
    const sd = generateEpisodeSD(mockEpisode, mockPodcast)
    expect(sd.associatedMedia).toEqual({
      '@type': 'MediaObject',
      contentUrl: 'https://example.com/ep1.mp3',
      encodingFormat: 'audio/mpeg',
      contentSize: 50000000,
    })
  })

  it('omits contentSize when audioLength is 0 (falsy)', () => {
    const sd = generateEpisodeSD(mockEpisodeMinimal, mockPodcast)
    expect(sd.associatedMedia).toEqual({
      '@type': 'MediaObject',
      contentUrl: 'https://example.com/ep2.mp3',
      encodingFormat: 'audio/mpeg',
    })
  })

  it('includes partOfSeries referencing the podcast', () => {
    const sd = generateEpisodeSD(mockEpisode, mockPodcast)
    expect(sd.partOfSeries).toEqual({
      '@type': 'PodcastSeries',
      name: 'Test Podcast',
      url: 'https://example.com',
    })
  })

  it('partOfSeries falls back to feedUrl when podcast has no link', () => {
    const sd = generateEpisodeSD(mockEpisode, mockPodcastMinimal)
    expect(sd.partOfSeries.url).toBe('https://example.com/minimal-feed.xml')
  })

  it('includes episode url', () => {
    const sd = generateEpisodeSD(mockEpisode, mockPodcast)
    expect(sd.url).toBe('https://example.com/episodes/episode-one')
  })
})

describe('generatePodcastOGTags', () => {
  it('returns correct og:title, og:description, og:image', () => {
    const tags = generatePodcastOGTags(mockPodcast)
    expect(tags['og:title']).toBe('Test Podcast')
    expect(tags['og:description']).toBe('A podcast about testing.')
    expect(tags['og:image']).toBe('https://example.com/artwork.jpg')
  })

  it('sets og:type to website', () => {
    const tags = generatePodcastOGTags(mockPodcast)
    expect(tags['og:type']).toBe('website')
  })

  it('includes og:url when link is available', () => {
    const tags = generatePodcastOGTags(mockPodcast)
    expect(tags['og:url']).toBe('https://example.com')
  })

  it('omits og:url when link is not available', () => {
    const tags = generatePodcastOGTags(mockPodcastMinimal)
    expect(tags).not.toHaveProperty('og:url')
  })
})

describe('generateEpisodeOGTags', () => {
  it('combines episode and podcast title in og:title', () => {
    const tags = generateEpisodeOGTags(mockEpisode, mockPodcast)
    expect(tags['og:title']).toBe('Episode One - Test Podcast')
  })

  it('uses episode description for og:description', () => {
    const tags = generateEpisodeOGTags(mockEpisode, mockPodcast)
    expect(tags['og:description']).toBe('The first episode about testing.')
  })

  it('uses episode artwork when available', () => {
    const tags = generateEpisodeOGTags(mockEpisode, mockPodcast)
    expect(tags['og:image']).toBe('https://example.com/ep1-art.jpg')
  })

  it('falls back to podcast artwork when episode artwork is missing', () => {
    const tags = generateEpisodeOGTags(mockEpisodeMinimal, mockPodcast)
    expect(tags['og:image']).toBe('https://example.com/artwork.jpg')
  })

  it('sets og:type to music.song', () => {
    const tags = generateEpisodeOGTags(mockEpisode, mockPodcast)
    expect(tags['og:type']).toBe('music.song')
  })

  it('includes og:audio and og:audio:type', () => {
    const tags = generateEpisodeOGTags(mockEpisode, mockPodcast)
    expect(tags['og:audio']).toBe('https://example.com/ep1.mp3')
    expect(tags['og:audio:type']).toBe('audio/mpeg')
  })

  it('includes og:url when episodeUrl is provided', () => {
    const tags = generateEpisodeOGTags(mockEpisode, mockPodcast, 'https://example.com/ep/1')
    expect(tags['og:url']).toBe('https://example.com/ep/1')
  })

  it('omits og:url when episodeUrl is not provided', () => {
    const tags = generateEpisodeOGTags(mockEpisode, mockPodcast)
    expect(tags).not.toHaveProperty('og:url')
  })

  it('omits og:url when episodeUrl is empty string', () => {
    const tags = generateEpisodeOGTags(mockEpisode, mockPodcast, '')
    expect(tags).not.toHaveProperty('og:url')
  })
})

describe('generatePodcastTwitterTags', () => {
  it('sets twitter:card to summary_large_image', () => {
    const tags = generatePodcastTwitterTags(mockPodcast)
    expect(tags['twitter:card']).toBe('summary_large_image')
  })

  it('returns correct twitter:title and twitter:description', () => {
    const tags = generatePodcastTwitterTags(mockPodcast)
    expect(tags['twitter:title']).toBe('Test Podcast')
    expect(tags['twitter:description']).toBe('A podcast about testing.')
  })

  it('uses podcast artwork for twitter:image', () => {
    const tags = generatePodcastTwitterTags(mockPodcast)
    expect(tags['twitter:image']).toBe('https://example.com/artwork.jpg')
  })
})

describe('generateEpisodeTwitterTags', () => {
  it('sets twitter:card to summary_large_image', () => {
    const tags = generateEpisodeTwitterTags(mockEpisode, mockPodcast)
    expect(tags['twitter:card']).toBe('summary_large_image')
  })

  it('combines episode and podcast title in twitter:title', () => {
    const tags = generateEpisodeTwitterTags(mockEpisode, mockPodcast)
    expect(tags['twitter:title']).toBe('Episode One - Test Podcast')
  })

  it('uses episode description for twitter:description', () => {
    const tags = generateEpisodeTwitterTags(mockEpisode, mockPodcast)
    expect(tags['twitter:description']).toBe('The first episode about testing.')
  })

  it('uses episode artwork when available', () => {
    const tags = generateEpisodeTwitterTags(mockEpisode, mockPodcast)
    expect(tags['twitter:image']).toBe('https://example.com/ep1-art.jpg')
  })

  it('falls back to podcast artwork when episode artwork is missing', () => {
    const tags = generateEpisodeTwitterTags(mockEpisodeMinimal, mockPodcast)
    expect(tags['twitter:image']).toBe('https://example.com/artwork.jpg')
  })
})
