import type { Person } from '../../../types/podcast'
import { getCachedPodcastFeed } from '../../utils/feed-cache'
import { resolveFeedUrl, handleFeedError } from '../../utils/feed-url'

/**
 * Generate a URL-safe slug from a person's name
 */
function personSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
}

/**
 * GET /api/podcast/people
 *
 * Returns all persons aggregated from Podcasting 2.0 podcast:person tags
 * across all episodes. Deduplicates by name and collects episode slugs.
 * Sorted by number of appearances (most prolific first), then alphabetically.
 *
 * This does the aggregation server-side so the client never needs the full
 * episode list just to build a people directory.
 */
export default defineEventHandler(async (event): Promise<Person[]> => {
  try {
    const feedUrl = resolveFeedUrl(event)
    const feed = await getCachedPodcastFeed(feedUrl)

    const map = new Map<string, Person>()

    for (const episode of feed.episodes) {
      const persons = episode.podcast2?.persons
      if (!persons?.length) continue

      for (const p of persons) {
        if (!p.name) continue

        const slug = personSlug(p.name)
        const existing = map.get(slug)

        if (existing) {
          if (!existing.episodeSlugs.includes(episode.slug)) {
            existing.episodeSlugs.push(episode.slug)
          }
          if (!existing.img && p.img) existing.img = p.img
          if (!existing.href && p.href) existing.href = p.href
          if (!existing.role && p.role) existing.role = p.role
          if (!existing.group && p.group) existing.group = p.group
        } else {
          map.set(slug, {
            slug,
            name: p.name,
            role: p.role,
            group: p.group,
            img: p.img,
            href: p.href,
            episodeSlugs: [episode.slug],
          })
        }
      }
    }

    return Array.from(map.values()).sort((a, b) => {
      const diff = b.episodeSlugs.length - a.episodeSlugs.length
      return diff !== 0 ? diff : a.name.localeCompare(b.name)
    })
  } catch (error) {
    handleFeedError(error)
  }
})
