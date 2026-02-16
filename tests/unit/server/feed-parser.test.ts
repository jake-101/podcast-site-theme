import { describe, expect, it, vi, beforeEach } from 'vitest'
import { parsePodcastFeed } from '../../../server/utils/feed-parser'

// Mock global fetch
vi.stubGlobal('fetch', vi.fn())

beforeEach(() => {
  vi.mocked(fetch).mockReset()
})

// ---------------------------------------------------------------------------
// XML Fixtures
// ---------------------------------------------------------------------------

const MINIMAL_FEED = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd">
  <channel>
    <title>My Podcast</title>
    <description>A great podcast</description>
    <item>
      <title>Episode 1</title>
      <description>First episode</description>
      <enclosure url="https://example.com/ep1.mp3" type="audio/mpeg" length="12345678" />
      <pubDate>Mon, 01 Jan 2024 00:00:00 GMT</pubDate>
    </item>
  </channel>
</rss>`

const ITUNES_FEED = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"
  xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd"
  xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <title>iTunes Podcast</title>
    <description>Podcast with full iTunes tags</description>
    <itunes:author>John Doe</itunes:author>
    <itunes:image href="https://example.com/artwork.jpg" />
    <itunes:category text="Technology" />
    <itunes:type>serial</itunes:type>
    <itunes:explicit>yes</itunes:explicit>
    <link>https://example.com</link>
    <language>en-us</language>
    <copyright>2024 John Doe</copyright>
    <item>
      <title>Episode 42</title>
      <description>The answer to everything</description>
      <content:encoded><![CDATA[<p>Rich <strong>HTML</strong> content</p>]]></content:encoded>
      <enclosure url="https://example.com/ep42.mp3" type="audio/mpeg" length="98765432" />
      <pubDate>Fri, 15 Mar 2024 12:00:00 GMT</pubDate>
      <itunes:duration>01:23:45</itunes:duration>
      <itunes:episode>42</itunes:episode>
      <itunes:season>3</itunes:season>
      <itunes:episodeType>full</itunes:episodeType>
      <itunes:image href="https://example.com/ep42-art.jpg" />
      <itunes:explicit>no</itunes:explicit>
      <itunes:keywords>tech, programming, answers</itunes:keywords>
      <guid>unique-guid-42</guid>
    </item>
  </channel>
</rss>`

const DURATION_FEED = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd">
  <channel>
    <title>Duration Test</title>
    <description>Testing duration formats</description>
    <item>
      <title>HH:MM:SS Episode</title>
      <enclosure url="https://example.com/ep1.mp3" type="audio/mpeg" length="1000" />
      <itunes:duration>02:30:15</itunes:duration>
    </item>
    <item>
      <title>MM:SS Episode</title>
      <enclosure url="https://example.com/ep2.mp3" type="audio/mpeg" length="1000" />
      <itunes:duration>45:30</itunes:duration>
    </item>
    <item>
      <title>Seconds Episode</title>
      <enclosure url="https://example.com/ep3.mp3" type="audio/mpeg" length="1000" />
      <itunes:duration>3600</itunes:duration>
    </item>
    <item>
      <title>No Duration Episode</title>
      <enclosure url="https://example.com/ep4.mp3" type="audio/mpeg" length="1000" />
    </item>
  </channel>
</rss>`

const EPISODE_TYPE_FEED = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd">
  <channel>
    <title>Episode Types</title>
    <description>Testing episode types</description>
    <item>
      <title>Full Episode</title>
      <enclosure url="https://example.com/full.mp3" type="audio/mpeg" length="1000" />
      <itunes:episodeType>full</itunes:episodeType>
    </item>
    <item>
      <title>Trailer Episode</title>
      <enclosure url="https://example.com/trailer.mp3" type="audio/mpeg" length="1000" />
      <itunes:episodeType>trailer</itunes:episodeType>
    </item>
    <item>
      <title>Bonus Episode</title>
      <enclosure url="https://example.com/bonus.mp3" type="audio/mpeg" length="1000" />
      <itunes:episodeType>bonus</itunes:episodeType>
    </item>
    <item>
      <title>Default Type Episode</title>
      <enclosure url="https://example.com/default.mp3" type="audio/mpeg" length="1000" />
    </item>
  </channel>
</rss>`

const PODCAST2_FEED = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"
  xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd"
  xmlns:podcast="https://podcastindex.org/namespace/1.0">
  <channel>
    <title>Podcast 2.0</title>
    <description>Testing Podcasting 2.0 namespace</description>
    <podcast:funding url="https://example.com/donate">Support the show</podcast:funding>
    <podcast:guid>show-guid-abc-123</podcast:guid>
    <item>
      <title>P2.0 Episode</title>
      <enclosure url="https://example.com/ep.mp3" type="audio/mpeg" length="5000" />
      <podcast:transcript url="https://example.com/transcript.srt" type="application/srt" language="en" />
      <podcast:chapters url="https://example.com/chapters.json" type="application/json+chapters" />
      <podcast:person role="host" img="https://example.com/host.jpg" href="https://example.com/host">Jane Host</podcast:person>
      <podcast:funding url="https://example.com/tip">Leave a tip</podcast:funding>
      <podcast:guid>episode-guid-xyz-789</podcast:guid>
    </item>
  </channel>
</rss>`

const MULTI_CATEGORY_FEED = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd">
  <channel>
    <title>Multi Category</title>
    <description>Multiple categories</description>
    <itunes:category text="Technology" />
    <itunes:category text="Science" />
    <itunes:category text="Education" />
    <item>
      <title>Episode</title>
      <enclosure url="https://example.com/ep.mp3" type="audio/mpeg" length="1000" />
    </item>
  </channel>
</rss>`

const SINGLE_ITEM_FEED = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd">
  <channel>
    <title>Single Item</title>
    <description>Only one item (not an array)</description>
    <item>
      <title>The Only Episode</title>
      <enclosure url="https://example.com/only.mp3" type="audio/mpeg" length="1000" />
    </item>
  </channel>
</rss>`

const NO_ENCLOSURE_FEED = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd">
  <channel>
    <title>Mixed Items</title>
    <description>Some items without enclosure</description>
    <item>
      <title>Episode With Audio</title>
      <enclosure url="https://example.com/audio.mp3" type="audio/mpeg" length="1000" />
    </item>
    <item>
      <title>Blog Post Without Audio</title>
      <description>This is just a blog post</description>
    </item>
    <item>
      <title>Another Episode</title>
      <enclosure url="https://example.com/audio2.mp3" type="audio/mpeg" length="2000" />
    </item>
  </channel>
</rss>`

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mockFetchXml(xml: string) {
  vi.mocked(fetch).mockResolvedValueOnce({
    ok: true,
    text: () => Promise.resolve(xml),
  } as any)
}

function mockFetchError(status: number, statusText: string) {
  vi.mocked(fetch).mockResolvedValueOnce({
    ok: false,
    status,
    statusText,
  } as any)
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('parsePodcastFeed', () => {
  const FEED_URL = 'https://example.com/feed.xml'

  describe('basic feed parsing', () => {
    it('parses a minimal RSS feed with channel metadata and one episode', async () => {
      mockFetchXml(MINIMAL_FEED)

      const result = await parsePodcastFeed(FEED_URL)

      expect(result.podcast.title).toBe('My Podcast')
      expect(result.podcast.description).toBe('A great podcast')
      expect(result.podcast.feedUrl).toBe(FEED_URL)
      expect(result.episodes).toHaveLength(1)
      expect(result.episodes[0].title).toBe('Episode 1')
      expect(result.episodes[0].description).toBe('First episode')
      expect(result.episodes[0].audioUrl).toBe('https://example.com/ep1.mp3')
      expect(result.episodes[0].audioType).toBe('audio/mpeg')
      expect(result.episodes[0].audioLength).toBe(12345678)
    })

    it('uses correct User-Agent header when fetching', async () => {
      mockFetchXml(MINIMAL_FEED)

      await parsePodcastFeed(FEED_URL)

      expect(fetch).toHaveBeenCalledWith(FEED_URL, {
        headers: { 'User-Agent': 'nuxt-podcast-theme/0.1.0' },
      })
    })

    it('defaults missing metadata fields gracefully', async () => {
      mockFetchXml(MINIMAL_FEED)

      const result = await parsePodcastFeed(FEED_URL)

      // No itunes:author in the minimal feed
      expect(result.podcast.author).toBe('Unknown')
      expect(result.podcast.artwork).toBe('')
      expect(result.podcast.categories).toEqual([])
      expect(result.podcast.type).toBe('episodic')
      expect(result.podcast.explicit).toBe(false)
    })
  })

  describe('iTunes tags', () => {
    it('parses all iTunes channel-level tags', async () => {
      mockFetchXml(ITUNES_FEED)

      const result = await parsePodcastFeed(FEED_URL)

      expect(result.podcast.author).toBe('John Doe')
      expect(result.podcast.artwork).toBe('https://example.com/artwork.jpg')
      expect(result.podcast.categories).toEqual(['Technology'])
      expect(result.podcast.type).toBe('serial')
      expect(result.podcast.explicit).toBe(true)
      expect(result.podcast.link).toBe('https://example.com')
      expect(result.podcast.language).toBe('en-us')
      expect(result.podcast.copyright).toBe('2024 John Doe')
    })

    it('parses all iTunes item-level tags', async () => {
      mockFetchXml(ITUNES_FEED)

      const result = await parsePodcastFeed(FEED_URL)
      const ep = result.episodes[0]

      expect(ep.duration).toBe(5025) // 1*3600 + 23*60 + 45
      expect(ep.episodeNumber).toBe(42)
      expect(ep.seasonNumber).toBe(3)
      expect(ep.episodeType).toBe('full')
      expect(ep.artwork).toBe('https://example.com/ep42-art.jpg')
      expect(ep.explicit).toBe(false)
      expect(ep.keywords).toEqual(['tech', 'programming', 'answers'])
      expect(ep.slug).toBe('42-episode-42')
    })

    it('parses content:encoded as htmlContent', async () => {
      mockFetchXml(ITUNES_FEED)

      const result = await parsePodcastFeed(FEED_URL)
      const ep = result.episodes[0]

      expect(ep.htmlContent).toBe('<p>Rich <strong>HTML</strong> content</p>')
    })

    it('uses guid from the item', async () => {
      mockFetchXml(ITUNES_FEED)

      const result = await parsePodcastFeed(FEED_URL)

      expect(result.episodes[0].guid).toBe('unique-guid-42')
    })
  })

  describe('duration parsing', () => {
    it('parses HH:MM:SS format correctly', async () => {
      mockFetchXml(DURATION_FEED)

      const result = await parsePodcastFeed(FEED_URL)

      // 02:30:15 → 2*3600 + 30*60 + 15 = 9015
      expect(result.episodes[0].duration).toBe(9015)
    })

    it('parses MM:SS format correctly', async () => {
      mockFetchXml(DURATION_FEED)

      const result = await parsePodcastFeed(FEED_URL)

      // 45:30 → 45*60 + 30 = 2730
      expect(result.episodes[1].duration).toBe(2730)
    })

    it('parses plain seconds (integer) correctly', async () => {
      mockFetchXml(DURATION_FEED)

      const result = await parsePodcastFeed(FEED_URL)

      expect(result.episodes[2].duration).toBe(3600)
    })

    it('returns 0 for missing duration', async () => {
      mockFetchXml(DURATION_FEED)

      const result = await parsePodcastFeed(FEED_URL)

      expect(result.episodes[3].duration).toBe(0)
    })
  })

  describe('episode types', () => {
    it('parses "full" episode type', async () => {
      mockFetchXml(EPISODE_TYPE_FEED)

      const result = await parsePodcastFeed(FEED_URL)

      expect(result.episodes[0].episodeType).toBe('full')
    })

    it('parses "trailer" episode type', async () => {
      mockFetchXml(EPISODE_TYPE_FEED)

      const result = await parsePodcastFeed(FEED_URL)

      expect(result.episodes[1].episodeType).toBe('trailer')
    })

    it('parses "bonus" episode type', async () => {
      mockFetchXml(EPISODE_TYPE_FEED)

      const result = await parsePodcastFeed(FEED_URL)

      expect(result.episodes[2].episodeType).toBe('bonus')
    })

    it('defaults to "full" when episodeType is missing', async () => {
      mockFetchXml(EPISODE_TYPE_FEED)

      const result = await parsePodcastFeed(FEED_URL)

      expect(result.episodes[3].episodeType).toBe('full')
    })
  })

  describe('Podcasting 2.0 tags', () => {
    it('parses podcast:transcript on episodes', async () => {
      mockFetchXml(PODCAST2_FEED)

      const result = await parsePodcastFeed(FEED_URL)
      const ep = result.episodes[0]

      expect(ep.podcast2).toBeDefined()
      expect(ep.podcast2!.transcript).toEqual({
        url: 'https://example.com/transcript.srt',
        type: 'application/srt',
        language: 'en',
      })
    })

    it('parses podcast:chapters on episodes', async () => {
      mockFetchXml(PODCAST2_FEED)

      const result = await parsePodcastFeed(FEED_URL)
      const ep = result.episodes[0]

      expect(ep.podcast2!.chapters).toEqual({
        url: 'https://example.com/chapters.json',
        type: 'application/json+chapters',
      })
    })

    it('parses podcast:person on episodes', async () => {
      mockFetchXml(PODCAST2_FEED)

      const result = await parsePodcastFeed(FEED_URL)
      const ep = result.episodes[0]

      expect(ep.podcast2!.persons).toHaveLength(1)
      expect(ep.podcast2!.persons![0]).toEqual({
        name: 'Jane Host',
        role: 'host',
        group: undefined,
        img: 'https://example.com/host.jpg',
        href: 'https://example.com/host',
      })
    })

    it('parses podcast:funding on episodes', async () => {
      mockFetchXml(PODCAST2_FEED)

      const result = await parsePodcastFeed(FEED_URL)
      const ep = result.episodes[0]

      expect(ep.podcast2!.funding).toHaveLength(1)
      expect(ep.podcast2!.funding![0]).toEqual({
        url: 'https://example.com/tip',
        text: 'Leave a tip',
      })
    })

    it('parses podcast:guid on episodes', async () => {
      mockFetchXml(PODCAST2_FEED)

      const result = await parsePodcastFeed(FEED_URL)
      const ep = result.episodes[0]

      expect(ep.podcast2!.guid).toBe('episode-guid-xyz-789')
    })

    it('parses show-level Podcasting 2.0 tags', async () => {
      mockFetchXml(PODCAST2_FEED)

      const result = await parsePodcastFeed(FEED_URL)

      expect(result.podcast.podcast2).toBeDefined()
      expect(result.podcast.podcast2!.funding).toHaveLength(1)
      expect(result.podcast.podcast2!.funding![0]).toEqual({
        url: 'https://example.com/donate',
        text: 'Support the show',
      })
      expect(result.podcast.podcast2!.guid).toBe('show-guid-abc-123')
    })
  })

  describe('error handling', () => {
    it('throws on network error', async () => {
      vi.mocked(fetch).mockRejectedValueOnce(new Error('Network timeout'))

      await expect(parsePodcastFeed(FEED_URL)).rejects.toThrow(
        /Failed to fetch RSS feed from/,
      )
    })

    it('throws on non-OK HTTP response', async () => {
      mockFetchError(404, 'Not Found')

      await expect(parsePodcastFeed(FEED_URL)).rejects.toThrow(
        /Failed to fetch feed: 404 Not Found/,
      )
    })

    it('throws on invalid XML', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve('this is not xml at all <<<<'),
      } as any)

      // fast-xml-parser may or may not throw on malformed XML depending on content;
      // but if the parsed result has no rss.channel, it should throw "missing channel"
      await expect(parsePodcastFeed(FEED_URL)).rejects.toThrow()
    })

    it('throws on RSS feed with missing channel element', async () => {
      const noChannelXml = `<?xml version="1.0"?><rss version="2.0"></rss>`
      mockFetchXml(noChannelXml)

      await expect(parsePodcastFeed(FEED_URL)).rejects.toThrow(
        'Invalid RSS feed: missing channel element',
      )
    })
  })

  describe('edge cases', () => {
    it('skips items without enclosure', async () => {
      mockFetchXml(NO_ENCLOSURE_FEED)

      const result = await parsePodcastFeed(FEED_URL)

      expect(result.episodes).toHaveLength(2)
      expect(result.episodes[0].title).toBe('Episode With Audio')
      expect(result.episodes[1].title).toBe('Another Episode')
    })

    it('handles single item (not wrapped in array)', async () => {
      mockFetchXml(SINGLE_ITEM_FEED)

      const result = await parsePodcastFeed(FEED_URL)

      expect(result.episodes).toHaveLength(1)
      expect(result.episodes[0].title).toBe('The Only Episode')
    })

    it('parses multiple categories', async () => {
      mockFetchXml(MULTI_CATEGORY_FEED)

      const result = await parsePodcastFeed(FEED_URL)

      expect(result.podcast.categories).toEqual(['Technology', 'Science', 'Education'])
    })

    it('falls back to audioUrl for guid when guid is missing', async () => {
      mockFetchXml(MINIMAL_FEED)

      const result = await parsePodcastFeed(FEED_URL)

      // Minimal feed has no <guid> element, so it should fall back to audioUrl
      expect(result.episodes[0].guid).toBe('https://example.com/ep1.mp3')
    })

    it('uses show artwork as fallback when episode has no artwork', async () => {
      const feedWithShowArt = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd">
  <channel>
    <title>Art Podcast</title>
    <description>Has show art</description>
    <itunes:image href="https://example.com/show-art.jpg" />
    <item>
      <title>No Art Episode</title>
      <enclosure url="https://example.com/ep.mp3" type="audio/mpeg" length="1000" />
    </item>
  </channel>
</rss>`
      mockFetchXml(feedWithShowArt)

      const result = await parsePodcastFeed(FEED_URL)

      expect(result.episodes[0].artwork).toBe('https://example.com/show-art.jpg')
    })

    it('generates slug from title with episode number', async () => {
      mockFetchXml(ITUNES_FEED)

      const result = await parsePodcastFeed(FEED_URL)

      // Episode 42 with title "Episode 42" → slug "42-episode-42"
      expect(result.episodes[0].slug).toBe('42-episode-42')
    })

    it('generates slug without episode number when not provided', async () => {
      mockFetchXml(MINIMAL_FEED)

      const result = await parsePodcastFeed(FEED_URL)

      expect(result.episodes[0].slug).toBe('episode-1')
    })

    it('defaults audio type to "audio/mpeg" when missing', async () => {
      const noTypeFeed = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd">
  <channel>
    <title>Test</title>
    <description>Test</description>
    <item>
      <title>Episode</title>
      <enclosure url="https://example.com/ep.mp3" length="1000" />
    </item>
  </channel>
</rss>`
      mockFetchXml(noTypeFeed)

      const result = await parsePodcastFeed(FEED_URL)

      expect(result.episodes[0].audioType).toBe('audio/mpeg')
    })
  })
})
