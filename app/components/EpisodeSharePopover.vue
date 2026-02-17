<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'

const props = defineProps<{
  episodeTitle: string
  episodeSlug: string
  podcastTitle: string
  currentTime?: number
}>()

const requestURL = useRequestURL()

// Popover state
const popoverOpen = ref(false)
const popoverRef = ref<HTMLElement | null>(null)
const includeTime = ref(false)
const copied = ref(false)

// Build the share URL
const shareUrl = computed(() => {
  const base = `${requestURL.origin}/episodes/${props.episodeSlug}`
  if (includeTime.value && props.currentTime && props.currentTime > 0) {
    return `${base}?t=${Math.floor(props.currentTime)}`
  }
  return base
})

const shareText = computed(() => {
  return `${props.episodeTitle} - ${props.podcastTitle}`
})

// Has native share (mobile)
const hasNativeShare = ref(false)
onMounted(() => {
  hasNativeShare.value = !!navigator.share
})

// Close popover on click outside
onClickOutside(popoverRef, () => {
  popoverOpen.value = false
})

// Reset copied state when URL changes
watch(shareUrl, () => {
  copied.value = false
})

// Native share (mobile)
const nativeShare = async () => {
  try {
    await navigator.share({
      title: props.episodeTitle,
      text: shareText.value,
      url: shareUrl.value,
    })
  } catch {
    // User cancelled or share failed — no-op
  }
}

// Copy link to clipboard
const copyLink = async () => {
  try {
    await navigator.clipboard.writeText(shareUrl.value)
    copied.value = true
    setTimeout(() => { copied.value = false }, 2000)
  } catch {
    // Fallback
    const input = document.createElement('input')
    input.value = shareUrl.value
    document.body.appendChild(input)
    input.select()
    document.execCommand('copy')
    document.body.removeChild(input)
    copied.value = true
    setTimeout(() => { copied.value = false }, 2000)
  }
}

// Social share URLs
const twitterUrl = computed(() => {
  const text = encodeURIComponent(shareText.value)
  const url = encodeURIComponent(shareUrl.value)
  return `https://x.com/intent/tweet?text=${text}&url=${url}`
})

const linkedinUrl = computed(() => {
  const url = encodeURIComponent(shareUrl.value)
  return `https://www.linkedin.com/sharing/share-offsite/?url=${url}`
})

const facebookUrl = computed(() => {
  const url = encodeURIComponent(shareUrl.value)
  return `https://www.facebook.com/sharer/sharer.php?u=${url}`
})

const emailUrl = computed(() => {
  const subject = encodeURIComponent(props.episodeTitle)
  const body = encodeURIComponent(`${shareText.value}\n\n${shareUrl.value}`)
  return `mailto:?subject=${subject}&body=${body}`
})

// Toggle popover (desktop)
const togglePopover = () => {
  if (hasNativeShare.value) {
    nativeShare()
  } else {
    popoverOpen.value = !popoverOpen.value
  }
}

// Format the current time for display
const formattedTime = computed(() => {
  if (!props.currentTime || props.currentTime <= 0) return null
  const s = Math.floor(props.currentTime)
  const hrs = Math.floor(s / 3600)
  const mins = Math.floor((s % 3600) / 60)
  const secs = s % 60
  if (hrs > 0) {
    return `${hrs}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
  }
  return `${mins}:${String(secs).padStart(2, '0')}`
})
</script>

<template>
  <div class="share-wrapper">
    <button
      class="share-trigger ghost small"
      type="button"
      @click="togglePopover"
      :aria-label="popoverOpen ? 'Close share menu' : 'Share this episode'"
    >
      <Icon name="ph:share-network" size="16" />
      <span class="share-trigger__label">Share</span>
    </button>

    <!-- Desktop popover -->
    <div
      v-if="popoverOpen && !hasNativeShare"
      ref="popoverRef"
      class="share-popover"
    >
      <!-- Copy link row -->
      <div class="share-popover__copy-row">
        <input
          type="text"
          :value="shareUrl"
          readonly
          class="share-popover__url-input"
          @focus="($event.target as HTMLInputElement).select()"
        />
        <button
          type="button"
          class="share-popover__copy-btn small"
          @click="copyLink"
        >
          <Icon v-if="copied" name="ph:check-bold" size="16" />
          <Icon v-else name="ph:copy" size="16" />
          {{ copied ? 'Copied' : 'Copy' }}
        </button>
      </div>

      <!-- Include timestamp checkbox -->
      <label v-if="formattedTime" class="share-popover__time-option">
        <input
          type="checkbox"
          v-model="includeTime"
        />
        Start at {{ formattedTime }}
      </label>

      <!-- Social buttons -->
      <div class="share-popover__socials">
        <a :href="twitterUrl" target="_blank" rel="noopener" class="share-popover__social-btn" aria-label="Share on X">
          <Icon name="simple-icons:x" size="16" />
        </a>
        <a :href="linkedinUrl" target="_blank" rel="noopener" class="share-popover__social-btn" aria-label="Share on LinkedIn">
          <Icon name="simple-icons:linkedin" size="16" />
        </a>
        <a :href="facebookUrl" target="_blank" rel="noopener" class="share-popover__social-btn" aria-label="Share on Facebook">
          <Icon name="simple-icons:facebook" size="16" />
        </a>
        <a :href="emailUrl" class="share-popover__social-btn" aria-label="Share via email">
          <Icon name="ph:envelope-simple-bold" size="16" />
        </a>
      </div>
    </div>
  </div>
</template>

<style scoped>
.share-wrapper {
  position: relative;
}

/* Trigger button — uses oat.css ghost button styling */
.share-trigger {
  color: var(--muted-foreground);
  gap: var(--space-1, 0.25rem);
}

.share-trigger:hover {
  color: var(--foreground);
}

.share-trigger__label {
  font-size: var(--text-8, 0.75rem);
}

/* ─── Popover panel ─── */
.share-popover {
  position: absolute;
  top: calc(100% + var(--space-2, 0.5rem));
  right: 0;
  width: 340px;
  background: var(--card, var(--background));
  border: 1px solid var(--border);
  border-radius: var(--radius-medium);
  box-shadow: var(--shadow-large);
  z-index: var(--z-dropdown, 50);
  padding: var(--space-4, 1rem);
  display: flex;
  flex-direction: column;
  gap: var(--space-3, 0.75rem);
}

/* Copy link row */
.share-popover__copy-row {
  display: flex;
  gap: var(--space-2, 0.5rem);
}

.share-popover__url-input {
  flex: 1;
  font-size: var(--text-8, 0.75rem);
  padding: var(--space-2, 0.5rem) var(--space-3, 0.75rem);
  background: var(--faint, var(--muted));
  border: 1px solid var(--input);
  border-radius: var(--radius-medium);
  color: var(--foreground);
  margin-block-start: 0;
  min-width: 0;
}

.share-popover__url-input:focus {
  border-color: var(--ring);
  outline: none;
}

.share-popover__copy-btn {
  flex-shrink: 0;
  white-space: nowrap;
}

/* Timestamp checkbox */
.share-popover__time-option {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2, 0.5rem);
  font-size: var(--text-7, 0.875rem);
  color: var(--muted-foreground);
  cursor: pointer;
}

/* Social share buttons row */
.share-popover__socials {
  display: flex;
  gap: var(--space-2, 0.5rem);
  padding-top: var(--space-3, 0.75rem);
  border-top: 1px solid var(--border);
}

.share-popover__social-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.25rem;
  height: 2.25rem;
  border-radius: var(--radius-medium);
  border: 1px solid var(--border);
  background: transparent;
  color: var(--muted-foreground);
  text-decoration: none;
  transition: background-color var(--transition-fast), color var(--transition-fast), border-color var(--transition-fast);
}

.share-popover__social-btn:hover {
  background-color: var(--accent);
  color: var(--foreground);
  border-color: var(--foreground);
}

/* Mobile: hide text label, icon-only trigger */
@media (max-width: 768px) {
  .share-trigger__label {
    display: none;
  }
}
</style>
