import type { Person, EpisodeSummary, PersonDetail, Episode } from '../../../../types/podcast'
import { getCachedPodcastFeed } from '../../../utils/feed-cache'
import { resolveFeedUrl, handleFeedError } from '../../../utils/feed-url'

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
 * Strip heavy fields from an episode to produce an EpisodeSummary.
 */
function toSummary(ep: Episode): EpisodeSummary {
  const { htmlContent, podcast2, keywords, link, audioLength, audioType, explicit: _explicit, ...summary } = ep
  return summary as EpisodeSummary
}

/**
 * GET /api/podcast/people/:slug
 *
 * Returns a single person by slug with their episode summaries.
 * The person is aggregated from podcast:person tags across all episodes,
 * and the episodes are returned as lightweight summaries (no htmlContent).
 */
export default defineEventHandler(async (event): Promise<PersonDetail> => {
  try {
    const feedUrl = resolveFeedUrl(event)
    const slug = getRouterParam(event, 'slug')

    if (!slug) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Missing slug',
        message: 'Person slug is required',
      })
    }

    const feed = await getCachedPodcastFeed(feedUrl)

    // Aggregate this person across all episodes
    let person: Person | null = null
    const episodeSlugsSet = new Set<string>()

    for (const episode of feed.episodes) {
      const persons = episode.podcast2?.persons
      if (!persons?.length) continue

      for (const p of persons) {
        if (!p.name) continue

        const pSlug = personSlug(p.name)
        if (pSlug !== slug) continue

        if (!person) {
          person = {
            slug: pSlug,
            name: p.name,
            role: p.role,
            group: p.group,
            img: p.img,
            href: p.href,
            episodeSlugs: [],
          }
        }

        // Fill in missing metadata from later appearances
        if (!person.img && p.img) person.img = p.img
        if (!person.href && p.href) person.href = p.href
        if (!person.role && p.role) person.role = p.role
        if (!person.group && p.group) person.group = p.group

        episodeSlugsSet.add(episode.slug)
      }
    }

    if (!person) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Person not found',
        message: `No person found with slug: ${slug}`,
      })
    }

    person.episodeSlugs = Array.from(episodeSlugsSet)

    // Collect episode summaries for this person
    const episodes = feed.episodes
      .filter(ep => episodeSlugsSet.has(ep.slug))
      .map(toSummary)

    return { person, episodes }
  } catch (error) {
    handleFeedError(error)
  }
})
