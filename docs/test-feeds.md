# Test Podcast Feeds

This document lists podcast RSS feeds useful for development and testing. These feeds cover different hosting platforms, feed structures, and Podcasting 2.0 features.

All feeds verified working as of Feb 2026.

## Current Test Feeds

| Podcast | Feed URL | Platform | Episodes | Notable Features |
|---------|----------|----------|----------|------------------|
| **Syntax.fm** | `https://feed.syntax.fm/` | Megaphone | 978+ | Rich HTML show notes, timestamps in notes (~301), video enclosures |
| **The Rewatchables** | `https://feeds.megaphone.fm/the-rewatchables` | Megaphone | 446+ | content:encoded, trailer episode |
| **99% Invisible** | `https://feeds.simplecast.com/jn7O6Fnt` | Simplecast | 774+ | 88 bonus + 1 trailer episodes, episode numbers, keywords |
| **Acquired** | `https://feeds.transistor.fm/acquired` | Transistor | 212+ | podcast:person (424 tags), seasons, episode numbers, keywords, 24 bonus + 1 trailer, podcast:guid |
| **70mm** | `https://feeds.transistor.fm/70mm` | Transistor | 349+ | **podcast:chapters (346 eps)**, podcast:transcript (10 eps), podcast:funding, episode numbers, keywords, 49 bonus + 1 trailer |

## Additional Test Feeds

These feeds provide additional testing scenarios:

| Podcast | Feed URL | Platform | Episodes | Notable Features |
|---------|----------|----------|----------|------------------|
| **Podnews Daily** | `https://podnews.net/rss` | Custom | 151 | **podcast:transcript (VTT, 150 eps)**, podcast:person, podcast:funding, podcast:location (23), podcast:value, video enclosures, multiple audio formats (mp3/aac/opus) |
| **The Joe Rogan Experience** | `https://feeds.megaphone.fm/GLT1412515089` | Megaphone | 2639+ | Massive catalog, episode numbers (~1002), content:encoded |
| **The Daily (NYT)** | `https://feeds.simplecast.com/54nAGcIl` | Simplecast | 2769+ | Massive catalog (17MB feed), content:encoded, video references in notes |
| **Huberman Lab** | `https://feeds.megaphone.fm/hubermanlab` | Megaphone | 381+ | Episode numbers, 29 bonus + 1 trailer episodes, content:encoded |
| **Lex Fridman Podcast** | `https://lexfridman.com/feed/podcast/` | Custom (WordPress) | 492+ | No content:encoded (description only), podcast:guid |
| **The Rest Is History** | `https://feeds.megaphone.fm/GLT4787413333` | Megaphone | 675+ | Seasons (111 eps), episode numbers (643), 13 bonus + 1 trailer, content:encoded |
| **New Heights (Kelce Bros)** | `https://rss.art19.com/new-heights` | Art19 | 186+ | Every episode has season + episode number, video references, content:encoded |
| **Crime Junkie** | `https://feeds.simplecast.com/qm_9xx0g` | Simplecast | 490+ | Content:encoded on all episodes |
| **SmartLess** | `https://rss.art19.com/smartless` | Art19 (redirects to Simplecast) | 336+ | Episode numbers, keywords, 30 bonus + 2 trailer episodes, content:encoded |
| **Dateline NBC** | `https://podcastfeeds.nbcnews.com/dateline-nbc` | NBC (Megaphone) | 759+ | Episode numbers (~224), keywords (517), 23 bonus + 1 trailer, content:encoded, video references |
| **Pod Save America** | `https://audioboom.com/channels/5166624.rss` | Audioboom | 1139+ | Episode numbers, 22 bonus episodes, podcast:guid, no content:encoded (description only), video references |

## Feed Health Notes

- **Crime Junkie**: Old URL `https://feeds.simplecast.com/i6hk` returns 404. Use `qm_9xx0g` instead.
- **SmartLess**: Art19 URL redirects to Simplecast (`https://feeds.simplecast.com/hNaFxXpO`).
- **Dateline NBC**: Redirects to `https://podcastfeeds.nbcnews.com/HL4TzgYC`.
- **Lex Fridman**: Custom WordPress feed - no `content:encoded`, only plain descriptions.
- **Pod Save America**: Audioboom feed - no `content:encoded`, only plain descriptions.

## Testing Guidelines

When testing the theme with these feeds:

1. **Feed Parsing**: Verify all feeds parse correctly and extract metadata
2. **Episode Display**: Check that episodes render properly with varying metadata
3. **Audio Playback**: Confirm enclosure URLs work across different platforms
4. **Special Features**: Test bonus/trailer badges, season/episode numbers, keywords
5. **Performance**: Monitor load times with feeds of different sizes (151 vs 2769 episodes)
6. **Transcripts**: Use Podnews Daily feed to test transcript viewer (only feed with podcast:transcript)
7. **Edge Cases**: Lex Fridman and Pod Save America have no rich show notes (no content:encoded)

## Podcasting 2.0 Features

Adoption of Podcasting 2.0 namespace tags is limited among mainstream podcasts. The following tags are supported by the theme:

| Tag | Feeds with this tag |
|-----|---------------------|
| **`podcast:transcript`** | Podnews Daily (150 episodes), 70mm (10 episodes) |
| **`podcast:chapters`** | 70mm (346 episodes) |
| **`podcast:person`** | Acquired (424 tags), Podnews Daily (1) |
| **`podcast:funding`** | Podnews Daily (1), 70mm (1) |
| **`podcast:guid`** | Acquired, Lex Fridman, Podnews Daily, Pod Save America, 70mm |
| **`podcast:location`** | Podnews Daily (23) |
| **`podcast:value`** | Podnews Daily (4) |
| **`podcast:locked`** | Acquired, 70mm |

Refer to the [Podcasting 2.0 namespace spec](https://github.com/Podcastindex-org/podcast-namespace) for full details.
