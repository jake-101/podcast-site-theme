# Test Podcast Feeds

This document lists podcast RSS feeds useful for development and testing. These feeds cover different hosting platforms, feed structures, and Podcasting 2.0 features.

## Current Test Feeds

| Podcast | Feed URL | Platform | Episodes | Notable Features |
|---------|----------|----------|----------|------------------|
| **Syntax.fm** | `https://feed.syntax.fm/` | Megaphone | 978+ | Rich HTML show notes with timestamps |
| **The Rewatchables** | `https://feeds.megaphone.fm/the-rewatchables` | Megaphone | 446+ | Guests in titles |
| **99% Invisible** | `https://feeds.simplecast.com/jn7O6Fnt` | Simplecast | 774+ | Episode types, keywords |
| **ACQ2/Acquired** | `https://feeds.transistor.fm/acq2` | Transistor | 112+ | Podcasting 2.0 tags |

## Additional Test Feeds

These feeds provide additional testing scenarios for advanced features:

| Podcast | Feed URL | Platform | Notable Features |
|---------|----------|----------|------------------|
| **The Joe Rogan Experience** | `https://feeds.simplecast.com/7HTVlE_g` | Simplecast | Transcripts, Chapters |
| **The Daily (NYT)** | `https://feeds.simplecast.com/54nAGcIl` | Simplecast | Native Transcripts, Remote Items |
| **Huberman Lab** | `https://feeds.megaphone.fm/hubermanlab` | Megaphone | Deep Metadata, Transcripts |
| **Lex Fridman Podcast** | `https://lexfridman.com/feed/podcast/` | Custom | Chapters, High-Res Artwork |
| **The Rest Is History** | `https://feeds.megaphone.fm/GLT4787413333` | Megaphone | Chapters, Advanced Tracking |
| **New Heights (Kelce Bros)** | `https://rss.art19.com/new-heights` | Art19 | Video Enclosures, Dynamic Ads |
| **Crime Junkie** | `https://feeds.simplecast.com/i6hk` | Simplecast | Transcripts, Person Tags |
| **SmartLess** | `https://rss.art19.com/smartless` | Art19 | Early Access Tags (Wondery+) |
| **Dateline NBC** | `https://podcastfeeds.nbcnews.com/dateline-nbc` | NBC News | Cross-platform GUIDs |
| **Pod Save America** | `https://audioboom.com/channels/5166624.rss` | Audioboom | Location Tags, Transcripts |

## Testing Guidelines

When testing the theme with these feeds:

1. **Feed Parsing**: Verify all feeds parse correctly and extract metadata
2. **Episode Display**: Check that episodes render properly with varying metadata
3. **Audio Playback**: Confirm enclosure URLs work across different platforms
4. **Special Features**: Test advanced features like chapters, transcripts, and person tags
5. **Performance**: Monitor load times with feeds of different sizes (100+ vs 900+ episodes)

## Podcasting 2.0 Features

Many of these feeds include Podcasting 2.0 namespace tags:

- **`podcast:transcript`**: Links to episode transcripts
- **`podcast:chapters`**: JSON file with chapter markers
- **`podcast:person`**: Credits for hosts, guests, contributors
- **`podcast:funding`**: Support/donation links
- **`podcast:guid`**: Cross-platform episode identifiers
- **`podcast:location`**: Geographic data for episodes

Refer to the [Podcasting 2.0 namespace spec](https://github.com/Podcastindex-org/podcast-namespace) for full details.
