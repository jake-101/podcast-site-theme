<script setup lang="ts">
import type { Episode } from '~/types/podcast'
import type { TranscriptCue, ParsedTranscript } from '~/utils/transcript'

const props = defineProps<{
  episode: Episode
}>()

const player = useAudioPlayer()

// Fetch transcript from server
const transcriptUrl = computed(() => props.episode.podcast2?.transcript?.url)
const transcriptType = computed(() => props.episode.podcast2?.transcript?.type)

const { data: transcriptData, status, error, refresh } = useFetch('/api/transcript', {
  query: {
    url: transcriptUrl,
    type: transcriptType,
  },
  // Only fetch when we actually have a transcript URL
  immediate: !!transcriptUrl.value,
  // Never re-fetch on the client — the server proxy handles the external fetch
  // to avoid CORS issues when the client tries to reach the transcript host directly
  server: true,
  watch: false,
})

// Parse the transcript content
const parsedTranscript = computed<ParsedTranscript | null>(() => {
  if (status.value !== 'success' || !transcriptData.value) return null

  const { content, type } = transcriptData.value as { content: string; type: string; url: string }
  return parseTranscript(content, type, props.episode.duration)
})

// Group cues by speaker for display
const speakerGroups = computed(() => {
  if (!parsedTranscript.value?.cues.length) return []
  return groupCuesBySpeaker(parsedTranscript.value.cues)
})

// Has timed cues (vs plain text without timestamps)
const hasTimedCues = computed(() => {
  if (!parsedTranscript.value?.cues.length) return false
  // Check if cues have meaningful different start times
  const cues = parsedTranscript.value.cues
  return cues.length > 1 && cues[cues.length - 1].startTime > cues[0].startTime
})

// Search
const searchQuery = ref('')
const filteredGroups = computed(() => {
  if (!searchQuery.value.trim()) return speakerGroups.value

  const query = searchQuery.value.toLowerCase()
  return speakerGroups.value
    .map(group => ({
      ...group,
      cues: group.cues.filter(cue =>
        cue.text.toLowerCase().includes(query)
        || (cue.speaker && cue.speaker.toLowerCase().includes(query)),
      ),
    }))
    .filter(group => group.cues.length > 0)
})

const searchResultCount = computed(() => {
  if (!searchQuery.value.trim()) return 0
  return filteredGroups.value.reduce((sum, g) => sum + g.cues.length, 0)
})

// Active cue tracking
const isCurrentEpisode = computed(() =>
  player.currentEpisode.value?.guid === props.episode.guid,
)

const activeCueIndex = computed(() => {
  if (!isCurrentEpisode.value || !parsedTranscript.value?.cues.length) return -1
  return findActiveCueIndex(parsedTranscript.value.cues, player.currentTime.value)
})

// Auto-scroll
const autoScroll = ref(true)
const transcriptContainer = ref<HTMLElement | null>(null)
let userScrollTimeout: ReturnType<typeof setTimeout> | null = null

// Track user scroll to temporarily disable auto-scroll
const onUserScroll = () => {
  if (userScrollTimeout) clearTimeout(userScrollTimeout)
  autoScroll.value = false
  // Re-enable auto-scroll after 5 seconds of no user scrolling
  userScrollTimeout = setTimeout(() => {
    autoScroll.value = true
  }, 5000)
}

// Watch active cue and scroll to it
watch(activeCueIndex, (newIndex) => {
  if (!autoScroll.value || newIndex < 0) return

  nextTick(() => {
    const container = transcriptContainer.value
    if (!container) return

    const activeEl = container.querySelector(`[data-cue-index="${newIndex}"]`) as HTMLElement
    if (!activeEl) return

    // Scroll the active cue into view within the container
    const containerRect = container.getBoundingClientRect()
    const elementRect = activeEl.getBoundingClientRect()

    // Only scroll if the element is not already in the visible center region
    const visibleTop = containerRect.top + containerRect.height * 0.2
    const visibleBottom = containerRect.top + containerRect.height * 0.8

    if (elementRect.top < visibleTop || elementRect.top > visibleBottom) {
      activeEl.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      })
    }
  })
})

// Click to seek
const seekToCue = (cue: TranscriptCue) => {
  if (!hasTimedCues.value) return

  if (!isCurrentEpisode.value) {
    // Load and play the episode first, then seek
    player.play(props.episode).then(() => {
      player.seek(cue.startTime)
    })
  } else {
    player.seek(cue.startTime)
  }
}

// Get cue's flat index for data-cue-index attribute
const getCueIndex = (cue: TranscriptCue): number => {
  if (!parsedTranscript.value) return -1
  return parsedTranscript.value.cues.indexOf(cue)
}

const isActiveCue = (cue: TranscriptCue): boolean => {
  return getCueIndex(cue) === activeCueIndex.value
}

// Cleanup
onUnmounted(() => {
  if (userScrollTimeout) clearTimeout(userScrollTimeout)
})
</script>

<template>
  <div class="transcript-viewer">
    <!-- Loading state -->
    <div v-if="status === 'pending'" class="transcript-loading">
      <div class="loading-spinner" />
      <p>Loading transcript...</p>
    </div>

    <!-- Error state -->
    <div v-else-if="error" class="transcript-error">
      <p>Unable to load transcript.</p>
      <button type="button" class="retry-button" @click="refresh()">
        Try again
      </button>
    </div>

    <!-- Empty state -->
    <div v-else-if="parsedTranscript && parsedTranscript.cues.length === 0" class="transcript-empty">
      <p>No transcript content found.</p>
    </div>

    <!-- Transcript content -->
    <div v-else-if="parsedTranscript" class="transcript-content">
      <!-- Search bar -->
      <div class="transcript-search">
        <div class="search-input-wrapper">
          <Icon name="ph:magnifying-glass" size="16" />
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Search transcript..."
            class="search-input"
          >
          <button
            v-if="searchQuery"
            type="button"
            class="search-clear"
            @click="searchQuery = ''"
          >
            <Icon name="ph:x" size="14" />
          </button>
        </div>
        <span v-if="searchQuery" class="search-count">
          {{ searchResultCount }} result{{ searchResultCount !== 1 ? 's' : '' }}
        </span>
      </div>

      <!-- Auto-scroll indicator -->
      <div v-if="hasTimedCues && isCurrentEpisode" class="transcript-controls">
        <button
          type="button"
          class="autoscroll-toggle"
          :class="{ active: autoScroll }"
          @click="autoScroll = !autoScroll"
        >
          <Icon :name="autoScroll ? 'ph:arrow-line-down-bold' : 'ph:arrow-line-down'" size="14" />
          Auto-scroll {{ autoScroll ? 'on' : 'off' }}
        </button>
      </div>

      <!-- Cues list -->
      <div
        ref="transcriptContainer"
        class="transcript-cues"
        @scroll="onUserScroll"
      >
        <div
          v-for="(group, groupIndex) in filteredGroups"
          :key="groupIndex"
          class="speaker-group"
        >
          <div v-if="group.speaker" class="speaker-name">
            {{ group.speaker }}
          </div>

          <div
            v-for="cue in group.cues"
            :key="getCueIndex(cue)"
            :data-cue-index="getCueIndex(cue)"
            class="transcript-cue"
            :class="{
              'cue-active': isActiveCue(cue),
              'cue-clickable': hasTimedCues,
              'cue-highlight': searchQuery && cue.text.toLowerCase().includes(searchQuery.toLowerCase()),
            }"
            @click="seekToCue(cue)"
          >
            <span v-if="hasTimedCues" class="cue-timestamp">
              {{ formatTimestamp(cue.startTime) }}
            </span>
            <span class="cue-text" v-html="highlightSearch(cue.text, searchQuery)" />
          </div>
        </div>

        <div v-if="filteredGroups.length === 0 && searchQuery" class="no-results">
          No matches found for "{{ searchQuery }}"
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
// Helper to highlight search matches in text
function highlightSearch(text: string, query: string): string {
  if (!query || !query.trim()) return escapeHtml(text)

  const escaped = escapeHtml(text)
  const escapedQuery = escapeHtml(query)
  const regex = new RegExp(`(${escapedQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
  return escaped.replace(regex, '<mark>$1</mark>')
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
</script>

<style scoped>
.transcript-viewer {
  width: 100%;
}

/* Loading */
.transcript-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  padding: 3rem 1rem;
  color: var(--muted-foreground);
}

.loading-spinner {
  width: 24px;
  height: 24px;
  border: 2px solid var(--border);
  border-top-color: var(--primary);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Error */
.transcript-error {
  text-align: center;
  padding: 2rem 1rem;
  color: var(--muted-foreground);
}

.retry-button {
  all: unset;
  box-sizing: border-box;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 0.75rem;
  padding: 0.5rem 1rem;
  border: 1px solid var(--border);
  border-radius: var(--radius-small);
  font-size: 0.875rem;
  cursor: pointer;
  transition: background-color var(--transition-fast);
}

.retry-button:hover {
  background-color: var(--muted);
}

/* Empty */
.transcript-empty {
  text-align: center;
  padding: 2rem 1rem;
  color: var(--muted-foreground);
}

/* Content */
.transcript-content {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

/* Search */
.transcript-search {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.search-input-wrapper {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  border: 1px solid var(--border);
  border-radius: var(--radius-small);
  background-color: var(--background);
  transition: border-color var(--transition-fast);
}

.search-input-wrapper:focus-within {
  border-color: var(--primary);
}

.search-input-wrapper .iconify {
  color: var(--muted-foreground);
  flex-shrink: 0;
}

.search-input {
  all: unset;
  flex: 1;
  font-size: 0.875rem;
  line-height: 1.4;
}

.search-input::placeholder {
  color: var(--muted-foreground);
}

.search-clear {
  all: unset;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border-radius: var(--radius-full);
  color: var(--muted-foreground);
  cursor: pointer;
  flex-shrink: 0;
}

.search-clear:hover {
  background-color: var(--muted);
  color: var(--foreground);
}

.search-count {
  font-size: 0.8rem;
  color: var(--muted-foreground);
  white-space: nowrap;
}

/* Controls */
.transcript-controls {
  display: flex;
  justify-content: flex-end;
}

.autoscroll-toggle {
  all: unset;
  box-sizing: border-box;
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.35rem 0.65rem;
  border: 1px solid var(--border);
  border-radius: var(--radius-small);
  font-size: 0.75rem;
  color: var(--muted-foreground);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.autoscroll-toggle:hover {
  background-color: var(--muted);
}

.autoscroll-toggle.active {
  border-color: var(--primary);
  color: var(--primary);
}

/* Cues container */
.transcript-cues {
  max-height: 500px;
  overflow-y: auto;
  padding: 0.5rem;
  border: 1px solid var(--border);
  border-radius: var(--radius-medium);
  background-color: var(--background);
  scroll-behavior: smooth;
}

/* Speaker group */
.speaker-group {
  margin-bottom: 1rem;
}

.speaker-group:last-child {
  margin-bottom: 0;
}

.speaker-name {
  font-size: 0.8rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  color: var(--primary);
  padding: 0.5rem 0.5rem 0.25rem;
  border-bottom: 1px solid color-mix(in srgb, var(--primary) 20%, transparent);
  margin-bottom: 0.25rem;
}

/* Individual cue */
.transcript-cue {
  display: flex;
  gap: 0.75rem;
  padding: 0.4rem 0.5rem;
  border-radius: var(--radius-small);
  line-height: 1.6;
  transition: background-color var(--transition-fast);
}

.cue-clickable {
  cursor: pointer;
}

.cue-clickable:hover {
  background-color: var(--muted);
}

.cue-active {
  background-color: color-mix(in srgb, var(--primary) 12%, var(--background));
  border-left: 3px solid var(--primary);
  padding-left: calc(0.5rem - 3px);
}

.cue-highlight {
  background-color: color-mix(in srgb, var(--warning, #f59e0b) 10%, var(--background));
}

.cue-timestamp {
  flex-shrink: 0;
  font-size: 0.75rem;
  font-family: monospace;
  color: var(--muted-foreground);
  padding-top: 0.15rem;
  min-width: 50px;
  text-align: right;
}

.cue-text {
  font-size: 0.9rem;
  color: var(--foreground);
  word-break: break-word;
}

.cue-text :deep(mark) {
  background-color: color-mix(in srgb, var(--warning, #f59e0b) 40%, transparent);
  color: inherit;
  padding: 0 0.125rem;
  border-radius: 2px;
}

/* No results */
.no-results {
  text-align: center;
  padding: 2rem 1rem;
  color: var(--muted-foreground);
  font-size: 0.9rem;
}

/* Responsive */
@media (max-width: 768px) {
  .transcript-cues {
    max-height: 400px;
  }

  .cue-timestamp {
    min-width: 40px;
    font-size: 0.7rem;
  }

  .cue-text {
    font-size: 0.85rem;
  }

  .transcript-search {
    flex-direction: column;
    align-items: stretch;
  }

  .search-count {
    text-align: right;
  }
}
</style>
