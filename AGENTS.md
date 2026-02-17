# nuxt-podcast-theme

A Nuxt 4 Layer that auto-generates a podcast website from an RSS feed URL. Users create a minimal Nuxt project, extend the theme, configure their feed URL in `app.config.ts`, and get a full podcast site.

## Tech Stack

- **Framework:** Nuxt 4 (as a publishable Layer/Theme)
- **CSS:** oat.css (`@knadh/oat`) - semantic, zero-dependency, ~8KB
- **Audio:** Howler.js (headless engine, ~7KB) + custom player UI
- **RSS Parsing:** `fast-xml-parser` for feed parsing
- **Utilities:** VueUse for composables and helper functions
- **Package Manager:** pnpm
- **Dev Server:** Use `d3k` command to launch the Nuxt dev server

## Development Guidelines

### Use Nuxt Skill

**ALWAYS load the `nuxt` skill** when working on Nuxt-specific code:

- **Server routes** (`server/api/`, `server/middleware/`) → Load `nuxt` skill, read `references/server.md`
- **Pages/routing** (`pages/`, `layouts/`) → Load `nuxt` skill, read `references/routing.md`
- **Plugins** (`plugins/`) → Load `nuxt` skill, read `references/middleware-plugins.md`
- **Composables** (`composables/`) → Load `nuxt` skill, read `references/nuxt-composables.md`
- **Config** (`nuxt.config.ts`, `app.config.ts`) → Load `nuxt` skill, read `references/nuxt-config.md`
- **Components** using Nuxt components → Load `nuxt` skill, read `references/nuxt-components.md`

Use the skill tool: `mcp_skill` with `name: "nuxt"`, then read relevant reference files.

### Nuxt Auto-Imports

Auto-imports behave differently depending on file type. **Read this carefully before writing composables.**

#### In `.vue` SFC files
Everything is auto-imported — Vue APIs, Nuxt composables, local composables, and local utils:

```vue
<script setup lang="ts">
// All available without any import statement:
const route = useRoute()           // Nuxt composable
const episodes = ref([])           // Vue API
const slug = generateSlug(title)   // utils/slug.ts
const { podcast } = usePodcast()   // composables/usePodcast.ts
</script>
```

#### In `.ts` composable files (`composables/`, `plugins/`)
**Vue APIs (`ref`, `computed`, `watch`, etc.) must be explicitly imported from `'vue'`.** Nuxt composables and local utils resolve at runtime, but in `.ts` files you need explicit imports for the LSP and type-checking to work. Use `#app` for Nuxt runtime internals.

```ts
// app/composables/useAudioPlayer.ts — CORRECT pattern
import { Howl } from 'howler'                    // ✅ third-party: always import
import { ref, computed, watch } from 'vue'        // ✅ Vue APIs: must import in .ts files
import { useIntervalFn } from '@vueuse/core'      // ✅ third-party: always import
import { useRoute } from '#app'                   // ✅ Nuxt runtime composables
import type { Episode } from '~/types/podcast'    // ✅ types: always import explicitly
```

**Import path reference for `.ts` files:**

| What | Correct path |
|---|---|
| Vue APIs (`ref`, `computed`, `watch`, etc.) | `'vue'` |
| Nuxt composables (`useRoute`, `useRouter`, `navigateTo`) | `'#app'` |
| Auto-import overrides (explicit, catches everything) | `'#imports'` |
| Third-party packages | package name |
| Node.js built-ins (server code) | `'node:fs'`, `'node:path'`, etc. |
| Types | `'~/types/...'` or package |

**`#app` vs `#imports`:** `#app` is for Nuxt app runtime internals. `#imports` is the broader alias that resolves everything Nuxt auto-imports (composables, utils, Vue APIs). Either works; `#app` is more explicit.

**Auto-imported components (all file types):**
- All components from `components/` directory
- Nuxt built-ins: `NuxtLink`, `NuxtPage`, `NuxtLayout`, `NuxtImg`, `ClientOnly`

**Only manually import:**
- Third-party packages (`howler`, `fast-xml-parser`, etc.)
- Node.js built-ins in server code
- Types (always import types explicitly)
- Vue APIs when in `.ts` files (not `.vue`)

### TypeScript Setup

**The root `tsconfig.json` must extend `.nuxt/tsconfig.json`.** Nuxt generates this file at dev/build time and it contains all path aliases (`~/*`, `#app`, `#imports`), auto-import type declarations, and component stubs. Without extending it, the LSP shows false "cannot find module" errors for `#app`, `~/types/...`, and auto-imported utils.

**Correct `tsconfig.json`:**
```json
{
  "extends": "./.nuxt/tsconfig.json",
  "compilerOptions": {
    "types": ["@types/howler"]
  }
}
```

**Do NOT add standalone `compilerOptions.paths` or duplicate settings** that belong in `.nuxt/tsconfig.json`.

If the editor shows errors for `#app`, `#imports`, or auto-imported composables/utils:
1. `.nuxt/tsconfig.json` may not exist yet — run `pnpm nuxt prepare` or start the dev server once.
2. Check that `tsconfig.json` at the root extends `.nuxt/tsconfig.json`.

## Architecture

This is a **Nuxt Layer** (not a standalone app). It ships as an npm package. Consumers do:

```ts
// their nuxt.config.ts
export default defineNuxtConfig({
  extends: ['nuxt-podcast-theme']
})
```

All configuration lives in `app.config.ts`:

```ts
export default defineAppConfig({
  podcast: {
    feedUrl: 'https://feed.syntax.fm/',
    siteTitle: 'My Podcast',
    platforms: {
      spotify: 'https://open.spotify.com/show/...',
      apple: 'https://podcasts.apple.com/...',
      youtube: 'https://youtube.com/...',
      pocketcasts: 'https://pca.st/...',
      overcast: 'https://overcast.fm/...',
      rss: 'https://feed.syntax.fm/',
    },
    episodesPerPage: 12,
    theme: 'auto',
  },
})
```

## Data Strategy

Hybrid approach:

- **Server API route** (`GET /api/podcast`) fetches the RSS feed, parses it with `fast-xml-parser`, caches the result via Nitro's `cachedEventHandler` with configurable TTL
- **SSG/prerendering:** `useFetch` calls the API at build time, pages generate as static HTML
- **SSR/development:** API called on request, cached in memory
- **Refresh endpoint** (`POST /api/podcast/refresh`) clears cache and re-fetches. Future hook for webhooks/cron.

## RSS Feed Support

Parses both iTunes namespace and Podcasting 2.0 namespace tags. Reliably extracts:

- Show metadata: title, author, description, artwork, categories
- Episode data: title, description, HTML show notes (`content:encoded`), audio URL, date, duration, artwork, episode/season numbers, episode type (full/bonus/trailer)
- Graceful support for: `podcast:transcript`, `podcast:chapters`, `podcast:person`, `podcast:funding`, `podcast:guid`

## Test Feeds

For a comprehensive list of test podcast feeds covering different platforms and features, see **[docs/test-feeds.md](docs/test-feeds.md)**.

The test feeds include popular podcasts with varying characteristics:
- Different hosting platforms (Simplecast, Megaphone, Transistor, Art19, Audioboom, custom)
- Feed sizes ranging from 100+ to 900+ episodes
- Podcasting 2.0 features (transcripts, chapters, person tags, funding, location data)
- Various metadata patterns (timestamps in show notes, episode types, video enclosures)

## Project Structure

```
nuxt-podcast-theme/
├── nuxt.config.ts              # Layer config (oat.css, modules)
├── app.config.ts               # Default app config schema
├── package.json                # npm package, main: nuxt.config.ts
├── docs/
│   └── future-features.md     # Ideas for post-MVP features
├── app/
│   ├── app.vue                 # Root shell
│   ├── assets/css/
│   │   └── overrides.css       # Custom CSS on top of oat.css
│   ├── components/
│   │   ├── PodcastHero.vue     # Hero: show art, title, description, subscribe links
│   │   ├── EpisodeCard.vue     # Card for episode grid
│   │   ├── EpisodeGrid.vue     # Paginated grid of episode cards
│   │   ├── EpisodeSearch.vue   # Client-side search/filter
│   │   ├── AudioPlayer.vue     # Persistent bottom audio player UI
│   │   ├── SubscribeButton.vue # Platform subscribe button
│   │   └── PodcastFooter.vue   # Simple footer
│   ├── composables/
│   │   ├── useAudioPlayer.ts   # Howler.js wrapper - reactive playback state
│   │   ├── usePodcast.ts       # Fetch podcast data from server API
│   │   └── useListeningProgress.ts # localStorage playback position tracking
│   ├── layouts/
│   │   └── default.vue         # Header + content slot + sticky audio player
│   ├── pages/
│   │   ├── index.vue           # Home: Hero + search + paginated episode grid
│   │   └── episodes/
│   │       └── [slug].vue      # Episode detail page
│   ├── plugins/
│   │   └── audio-player.client.ts # Initialize howler.js (client-only)
│   └── utils/
│       ├── format.ts           # Date/duration formatting helpers
│       ├── slug.ts             # URL-safe slug generation from episode titles
│       ├── timestamps.ts       # Parse & linkify HH:MM:SS timestamps in show notes
│       └── structured-data.ts  # schema.org PodcastSeries/PodcastEpisode generation
├── server/
│   ├── api/
│   │   ├── podcast.get.ts      # GET /api/podcast - parsed feed with caching
│   │   └── podcast/
│   │       └── refresh.post.ts # POST /api/podcast/refresh - bust cache
│   └── utils/
│       ├── feed-parser.ts      # RSS XML parsing with fast-xml-parser, typed output
│       └── feed-cache.ts       # Nitro cachedEventHandler / storage cache
└── playground/                 # Dev app for testing the layer
    ├── nuxt.config.ts          # extends: ['..']
    ├── app.config.ts           # Test feed URL config
    └── app.vue
```

---

## Tasks

### Epic: Project Scaffolding

- Scaffold Nuxt layer project structure
  - Initialize pnpm project with correct package.json (`main: nuxt.config.ts`, `type: module`)
  - Create `nuxt.config.ts` with layer-appropriate config
  - Create `app.config.ts` with typed podcast config schema and defaults
  - Create playground directory with `nuxt.config.ts` that extends `..`
  - Create playground `app.config.ts` with Syntax.fm test feed

- Install and configure dependencies
  - Install `@knadh/oat`, `howler`, `fast-xml-parser`
  - Install dev dependencies: `nuxt`, `typescript`, `@types/howler`
  - Configure oat.css import in `nuxt.config.ts` (CSS file path with `fileURLToPath` for layer compatibility)
  - Create `app/assets/css/overrides.css` with podcast-specific styles (grid layout, sticky player, hero)
  - Import oat.js as a client-only plugin or via `app/plugins/`
  - Verify oat.css dark mode works with `data-theme="dark"` on body

### Epic: TypeScript Interfaces

- Define podcast data types
  - Create `types/podcast.ts` with `Podcast` interface (title, author, description, artwork, categories, feedUrl, type, etc.)
  - Create `Episode` interface (title, slug, description, htmlContent, audioUrl, pubDate, duration, artwork, episodeNumber, seasonNumber, episodeType, guid, explicit, keywords, link)
  - Create `PodcastFeed` interface combining show metadata + episode array
  - Create `PlatformLinks` interface for subscribe button config
  - Create `PodcastConfig` interface matching the app.config.ts schema
  - Handle optional Podcasting 2.0 fields: transcript, chapters, persons, funding

### Epic: RSS Feed Parser

- Build server-side feed parser
  - Create `server/utils/feed-parser.ts`
  - Use `fast-xml-parser` to parse RSS XML into JS object
  - Map channel-level tags to `Podcast` interface (itunes:author, itunes:image, itunes:category, itunes:type, description)
  - Map item-level tags to `Episode` interface (title, enclosure, pubDate, itunes:duration, itunes:image, itunes:episodeType, itunes:season, itunes:episode, content:encoded, guid)
  - Handle duration format variations: seconds (int) vs HH:MM:SS string
  - Generate URL-safe slugs from episode titles (using `utils/slug.ts` logic server-side)
  - Gracefully handle optional Podcasting 2.0 tags (podcast:transcript, podcast:chapters, podcast:person, podcast:funding, podcast:guid)
  - Test parser against all 4 test feeds to verify correct extraction

### Epic: Server API Routes

- Create podcast data API with caching
  - Create `server/utils/feed-cache.ts` using Nitro `cachedEventHandler` or storage-based caching with configurable TTL (default 1 hour)
  - Create `server/api/podcast.get.ts` - fetches RSS feed URL from runtime config, parses with feed-parser, returns typed `PodcastFeed` JSON
  - Create `server/api/podcast/refresh.post.ts` - clears the feed cache and triggers a re-fetch, returns fresh data
  - Read feed URL from runtime config (populated from app.config.ts)
  - Handle fetch errors gracefully (feed unavailable, invalid XML, timeout)
  - deps: RSS Feed Parser

### Epic: Client Data Layer

- Build client-side composable for podcast data
  - Create `app/composables/usePodcast.ts`
  - Use `useFetch('/api/podcast')` to retrieve parsed feed data
  - Expose reactive `podcast` (show metadata) and `episodes` (array) refs
  - Provide helper to find episode by slug
  - Support client-side filtering/search by title and description text
  - Handle loading and error states
  - deps: Server API Routes

### Epic: UI Components

- Build PodcastHero component
  - Show artwork image (large), podcast title, author, description
  - Render subscribe buttons for each configured platform
  - Use oat.css semantic elements (headings, paragraphs, buttons)
  - Responsive layout: artwork beside text on desktop, stacked on mobile
  - deps: Client Data Layer

- Build SubscribeButton component
  - Accept platform name and URL as props
  - Render appropriate icon/label per platform (Spotify, Apple, YouTube, Pocket Casts, Overcast, RSS)
  - Use oat.css button styling with `role="button"` semantic approach
  - Open links in new tab with `rel="noopener"`

- Build EpisodeCard component
  - Show episode artwork (or fallback to show artwork), title, date, duration, episode type badge
  - Truncated description preview
  - Episode type badge (full/bonus/trailer) with visual differentiation
  - "In progress" indicator if user has listening history for this episode (from localStorage)
  - Click navigates to episode detail page
  - Play button that loads episode into persistent audio player
  - Use oat.css card component styling
  - deps: Client Data Layer

- Build EpisodeSearch component
  - Text input that filters episodes by title and description
  - Debounced input to avoid excessive re-renders
  - Show result count
  - Clear button to reset search
  - Use oat.css form element styling
  - deps: Client Data Layer

- Build EpisodeGrid component
  - Responsive CSS grid of EpisodeCard components
  - Client-side pagination (configurable episodes per page from app.config)
  - Previous/Next page navigation
  - Integrates with EpisodeSearch filtering
  - deps: EpisodeCard, EpisodeSearch

- Build PodcastFooter component
  - Simple footer with podcast title, RSS link, and "Powered by nuxt-podcast-theme" attribution
  - Use oat.css semantic footer styling

### Epic: Audio Player

- Build useAudioPlayer composable
  - Wrap Howler.js in a Vue composable
  - Expose reactive state: `currentEpisode`, `isPlaying`, `currentTime`, `duration`, `volume`, `playbackRate`, `isLoading`
  - Methods: `play(episode)`, `pause()`, `toggle()`, `seek(seconds)`, `skipForward(15)`, `skipBackward(15)`, `setSpeed(rate)`, `setVolume(level)`
  - Speed presets: 1x, 1.25x, 1.5x, 1.75x, 2x
  - Auto-load latest episode on first visit via a `preload(episode)` method that sets state without starting playback — use `preload: false` on the Howl instance to avoid initiating an HTTP request until the user actually plays
  - Handle `?t=` URL parameter to auto-seek to timestamp on episode pages
  - Provide state at app root level so it persists across page navigation
  - deps: Project Scaffolding

- Build useListeningProgress composable
  - Save playback position per episode GUID in localStorage
  - Periodically save current position while playing (every 10-15 seconds)
  - Retrieve saved position for any episode
  - Mark episode as "started" vs "completed" (completed = within last 60 seconds of duration)
  - Expose: `getProgress(episodeGuid)`, `saveProgress(episodeGuid, position)`, `isStarted(episodeGuid)`, `isCompleted(episodeGuid)`
  - deps: useAudioPlayer

- Build AudioPlayer component
  - Fixed-position bottom bar, always visible when an episode is loaded
  - Show: episode artwork (small), episode title, play/pause button, skip back 15s, skip forward 15s, seek bar with current time / duration, playback speed selector, volume control
  - Seek bar is interactive (click/drag to seek)
  - Playback speed cycles through presets on click
  - Responsive: collapse some controls on small screens (hide volume, show compact layout)
  - Use oat.css styling (buttons, progress/meter elements)
  - deps: useAudioPlayer, useListeningProgress

- Create audio-player.client.ts plugin
  - Client-only plugin that initializes the audio player composable at app root
  - Ensures Howler.js only loads on client side (no SSR)
  - deps: useAudioPlayer

### Epic: Pages & Layout

- Build default layout
  - Sticky audio player at bottom of viewport
  - Main content area with proper padding to account for player height
  - RSS auto-discovery meta tag: `<link rel="alternate" type="application/rss+xml">`
  - Dark mode support: toggle that sets `data-theme` on body
  - Use oat.css base styling
  - deps: AudioPlayer component

- Build home page (index.vue)
  - PodcastHero at the top
  - EpisodeSearch below hero
  - EpisodeGrid with paginated episodes
  - SEO: structured data for PodcastSeries (schema.org), Open Graph meta tags
  - deps: PodcastHero, EpisodeGrid, EpisodeSearch, Client Data Layer

- Build episode detail page (episodes/[slug].vue)
  - Episode artwork, title, date, duration, episode type badge
  - Play button that loads this episode into the audio player
  - Support `?t=` query parameter to auto-seek to timestamp
  - Full HTML show notes from `content:encoded` with clickable timestamps (HH:MM:SS patterns linked to player seek)
  - Display all available metadata: season/episode numbers, keywords, explicit flag, link to original
  - Graceful display of optional Podcasting 2.0 data if present (transcript link, chapters, persons)
  - SEO: structured data for PodcastEpisode (schema.org), Open Graph with episode artwork
  - Share button/link that includes current playback timestamp
  - deps: Client Data Layer, AudioPlayer, timestamps util, structured-data util

### Epic: Utilities

- Build formatting utilities
  - `utils/format.ts`: `formatDate(dateString)` for human-readable dates, `formatDuration(seconds)` for `HH:MM:SS` or `MM:SS` display, `parseDuration(input)` to normalize seconds-int vs HH:MM:SS string to number
  - `utils/slug.ts`: `generateSlug(title, episodeNumber?)` to create URL-safe slugs from episode titles, handle special characters, duplicates
  - `utils/timestamps.ts`: `linkifyTimestamps(html)` to find `HH:MM:SS` or `MM:SS` patterns in HTML show notes and wrap them in clickable links that emit a seek event
  - `utils/structured-data.ts`: `generatePodcastSeriesSD(podcast)` and `generateEpisodeSD(episode, podcast)` returning JSON-LD objects for schema.org

### Epic: Polish & Testing

- Test with all 4 feed URLs
  - Verify feed parsing works for each test feed
  - Verify episode grid renders correctly with different feed sizes (112 to 978 episodes)
  - Verify audio playback works with enclosure URLs from each feed
  - Verify episode pages render correctly with varying metadata availability
  - Check that timestamps in Syntax.fm show notes are clickable
  - Verify episode type badges show correctly for 99% Invisible (has bonus episodes)

- Responsive design pass
  - Test hero section at mobile, tablet, desktop breakpoints
  - Test episode grid layout at all breakpoints
  - Test audio player compact mode on mobile
  - Ensure oat.css grid utilities are used appropriately

- Dark mode verification
  - Verify dark theme toggle works
  - Check all components render correctly in dark mode
  - Verify oat.css `data-theme="dark"` applies correctly

## Landing the Plane (Session Completion)

**When ending a work session**, you MUST complete ALL steps below. Work is NOT complete until `git push` succeeds.

**MANDATORY WORKFLOW:**

1. **Test your changes** - CRITICAL: Before closing tasks or committing:
   - Verify the dev server loads without errors (check http://localhost:3001)
   - Test the functionality you just implemented works as expected
   - Check for syntax errors, missing closing tags, or runtime errors
   - If errors occur, fix them BEFORE marking tasks as complete
2. **File issues for remaining work** - Create issues for anything that needs follow-up
3. **Run quality gates** (if code changed) - Tests, linters, builds
4. **Update issue status** - Close finished work, update in-progress items
5. **PUSH TO REMOTE** - This is MANDATORY:
   ```bash
   git pull --rebase
   bd sync
   git push
   git status  # MUST show "up to date with origin"
   ```
6. **Clean up** - Clear stashes, prune remote branches
7. **Verify** - All changes committed AND pushed
8. **Hand off** - Provide context for next session

**CRITICAL RULES:**
- **ALWAYS test before closing tasks** - Don't close tasks with broken code
- Work is NOT complete until `git push` succeeds
- NEVER stop before pushing - that leaves work stranded locally
- NEVER say "ready to push when you are" - YOU must push
- If push fails, resolve and retry until it succeeds
- If tests fail or errors occur, fix them before landing the plane
