import { ref, computed } from 'vue'
import type { Person } from '~/types/podcast'

/**
 * Composable for querying persons extracted from Podcasting 2.0 podcast:person tags.
 *
 * Uses the /api/podcast/people endpoint which does server-side aggregation,
 * so the client never needs the full episode list just to build a people directory.
 *
 * For the people index page, use `useAsyncData` directly with /api/podcast/people.
 * For the person detail page, use `useAsyncData` with /api/podcast/people/:slug.
 *
 * This composable provides helper methods for cases where person data
 * is supplementary (e.g., showing contributors on an episode detail page).
 */
export const usePodcastPeople = () => {
  // Fetch aggregated people from the server-side endpoint.
  // This avoids fetching the full feed (5MB+) and doing client-side aggregation.
  // Fetch client-only and lazy — people data is supplementary on episode pages
  // and not needed for SEO. This prevents SSR/hydration mismatches when the
  // episode page renders people server-side as [] but the client resolves differently.
  const { data: peopleData, status, error } = useAsyncData(
    'podcast-people',
    async (_nuxtApp, { signal }) => {
      return await $fetch<Person[]>('/api/podcast/people', { signal })
    },
    { server: false, lazy: true },
  )

  const people = computed<Person[]>(() => {
    const val = peopleData.value
    return Array.isArray(val) ? val : []
  })

  /** Whether any episodes in this feed have podcast:person data */
  const hasPeople = computed(() => people.value.length > 0)

  /**
   * Find a single person by their slug
   */
  const findPersonBySlug = (slug: string): Person | undefined => {
    return people.value.find(p => p.slug === slug)
  }

  /**
   * Get the persons that appear in a specific episode (by episode slug).
   * Filters from the already-fetched people list.
   */
  const getPersonsForEpisode = (episodeSlug: string): Person[] => {
    return people.value.filter(p => p.episodeSlugs.includes(episodeSlug))
  }

  return {
    people,
    hasPeople,
    status,
    error,
    findPersonBySlug,
    getPersonsForEpisode,
  }
}
