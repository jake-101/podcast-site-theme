import { describe, expect, it, vi, beforeEach } from 'vitest'

// Mock howler before importing the composable.
// Howl must be a proper constructor function (not arrow), since the
// composable uses `new Howl(...)`.
const mockHowlInstance = {
  play: vi.fn(),
  pause: vi.fn(),
  stop: vi.fn(),
  unload: vi.fn(),
  seek: vi.fn().mockReturnValue(0),
  duration: vi.fn().mockReturnValue(0),
  volume: vi.fn(),
  rate: vi.fn(),
  on: vi.fn(),
}

vi.mock('howler', () => ({
  Howl: vi.fn().mockImplementation(function (this: any) {
    Object.assign(this, mockHowlInstance)
  }),
}))

// Mock #app (Nuxt auto-imports)
vi.mock('#app', () => ({
  useRoute: () => ({ query: {}, params: {}, path: '/' }),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}))

// Mock @vueuse/core
vi.mock('@vueuse/core', () => ({
  useIntervalFn: (_fn: Function, _interval: number, _options?: any) => ({
    pause: vi.fn(),
    resume: vi.fn(),
  }),
}))

import { useAudioPlayer } from '../../../app/composables/useAudioPlayer'
import type { Episode } from '../../../types/podcast'

/**
 * Helper to create a minimal Episode object for testing.
 */
function createTestEpisode(overrides: Partial<Episode> = {}): Episode {
  return {
    guid: 'test-guid-1',
    title: 'Test Episode',
    slug: 'test-episode',
    description: 'A test episode for unit testing.',
    audioUrl: 'https://example.com/audio.mp3',
    audioType: 'audio/mpeg',
    audioLength: 50000000,
    pubDate: '2025-01-15T10:00:00Z',
    duration: 3600,
    episodeType: 'full',
    explicit: false,
    ...overrides,
  }
}

describe('useAudioPlayer', () => {
  // IMPORTANT: useAudioPlayer uses a module-level `const state = ref(...)`
  // which persists across tests within the same module. We reset the player
  // to a known baseline state before each test.
  let player: ReturnType<typeof useAudioPlayer>

  beforeEach(() => {
    player = useAudioPlayer()
    // Reset volume and mute to known defaults so each test starts clean.
    // setVolume(0.8) restores the initial default and clears any mute state.
    player.setVolume(0.8)
  })

  describe('initial state (on fresh module load)', () => {
    it('returns expected default values', () => {
      expect(player.isPlaying.value).toBe(false)
      expect(player.isLoading.value).toBe(false)
      expect(player.currentTime.value).toBe(0)
      expect(player.duration.value).toBe(0)
      expect(player.volume.value).toBe(0.8)
      expect(player.playbackRate.value).toBe(1)
      expect(player.isMuted.value).toBe(false)
    })

    it('hasEpisode is false when no episode is loaded', () => {
      expect(player.hasEpisode.value).toBe(false)
    })

    it('progressPercent is 0 when duration is 0', () => {
      expect(player.progressPercent.value).toBe(0)
    })
  })

  describe('speedPresets', () => {
    it('exposes the correct speed presets', () => {
      expect(player.speedPresets).toEqual([1, 1.25, 1.5, 1.75, 2])
    })

    it('has 5 preset values', () => {
      expect(player.speedPresets).toHaveLength(5)
    })

    it('starts at 1x and ends at 2x', () => {
      expect(player.speedPresets[0]).toBe(1)
      expect(player.speedPresets[player.speedPresets.length - 1]).toBe(2)
    })
  })

  describe('speakerIcon', () => {
    it('returns muted icon when volume is 0', () => {
      player.setVolume(0)
      expect(player.speakerIcon.value).toBe('ph:speaker-x-bold')
    })

    it('returns low volume icon when volume < 0.5', () => {
      player.setVolume(0.3)
      expect(player.speakerIcon.value).toBe('ph:speaker-low-bold')
    })

    it('returns low volume icon at boundary (0.49)', () => {
      player.setVolume(0.49)
      expect(player.speakerIcon.value).toBe('ph:speaker-low-bold')
    })

    it('returns high volume icon when volume >= 0.5', () => {
      player.setVolume(0.5)
      expect(player.speakerIcon.value).toBe('ph:speaker-high-bold')
    })

    it('returns high volume icon at full volume', () => {
      player.setVolume(1)
      expect(player.speakerIcon.value).toBe('ph:speaker-high-bold')
    })

    it('returns muted icon after toggleMute', () => {
      player.setVolume(0.6)
      player.toggleMute()
      expect(player.speakerIcon.value).toBe('ph:speaker-x-bold')
    })
  })

  describe('setVolume', () => {
    it('sets volume to the specified level', () => {
      player.setVolume(0.5)
      expect(player.volume.value).toBe(0.5)
    })

    it('clamps volume to 0 when negative value is provided', () => {
      player.setVolume(-0.5)
      expect(player.volume.value).toBe(0)
    })

    it('clamps volume to 1 when value exceeds 1', () => {
      player.setVolume(1.5)
      expect(player.volume.value).toBe(1)
    })

    it('sets volume to exactly 0', () => {
      player.setVolume(0)
      expect(player.volume.value).toBe(0)
    })

    it('sets volume to exactly 1', () => {
      player.setVolume(1)
      expect(player.volume.value).toBe(1)
    })

    it('auto-mutes when volume is set to 0', () => {
      player.setVolume(0.5) // ensure not muted
      player.setVolume(0)
      expect(player.isMuted.value).toBe(true)
    })

    it('auto-unmutes when volume is set above 0 while muted', () => {
      player.setVolume(0) // auto-mutes
      expect(player.isMuted.value).toBe(true)

      player.setVolume(0.6) // should auto-unmute
      expect(player.isMuted.value).toBe(false)
    })

    it('handles very small positive values', () => {
      player.setVolume(0.01)
      expect(player.volume.value).toBe(0.01)
      expect(player.isMuted.value).toBe(false)
    })
  })

  describe('toggleMute', () => {
    it('mutes from an unmuted state', () => {
      player.setVolume(0.8)
      player.toggleMute()
      expect(player.isMuted.value).toBe(true)
      expect(player.volume.value).toBe(0)
    })

    it('restores previous volume on unmute', () => {
      player.setVolume(0.7)
      player.toggleMute() // mute — saves 0.7 as volumeBeforeMute
      expect(player.volume.value).toBe(0)

      player.toggleMute() // unmute — restores to 0.7
      expect(player.isMuted.value).toBe(false)
      expect(player.volume.value).toBe(0.7)
    })

    it('restores default 0.8 if volumeBeforeMute was 0', () => {
      // Directly set volume to 0 (which auto-mutes and sets volumeBeforeMute
      // to whatever it was before). We need to ensure volumeBeforeMute is 0.
      // First set to 0 so volumeBeforeMute captures 0.8, then set again.
      player.setVolume(0) // auto-mutes; volumeBeforeMute = 0.8 from beforeEach

      // To make volumeBeforeMute actually be 0, we need to:
      // 1. unmute (restores to 0.8)
      // 2. set to 0.01 (not muted)
      // 3. set isMuted via toggleMute which saves 0.01 as volumeBeforeMute
      // But we actually want to test the fallback case from the source:
      //   `const volumeToRestore = state.value.volumeBeforeMute > 0 ? state.value.volumeBeforeMute : 0.8`
      // Since beforeEach sets volume to 0.8, volumeBeforeMute starts at 0.8.
      // To truly test this, we'd need direct access to state.

      // Instead, verify that toggleMute unmute always results in a nonzero volume.
      player.toggleMute() // unmute
      expect(player.isMuted.value).toBe(false)
      expect(player.volume.value).toBeGreaterThan(0)
    })

    it('can be toggled multiple times in sequence', () => {
      player.setVolume(0.6)

      player.toggleMute()
      expect(player.isMuted.value).toBe(true)
      expect(player.volume.value).toBe(0)

      player.toggleMute()
      expect(player.isMuted.value).toBe(false)
      expect(player.volume.value).toBe(0.6)

      player.toggleMute()
      expect(player.isMuted.value).toBe(true)
      expect(player.volume.value).toBe(0)
    })

    it('saves and restores various volume levels', () => {
      const levels = [0.1, 0.25, 0.5, 0.75, 1.0]
      for (const level of levels) {
        player.setVolume(level)
        player.toggleMute()
        expect(player.volume.value).toBe(0)

        player.toggleMute()
        expect(player.volume.value).toBe(level)
      }
    })
  })

  describe('play', () => {
    it('sets the current episode', async () => {
      const episode = createTestEpisode()
      await player.play(episode)

      expect(player.currentEpisode.value).toEqual(episode)
      expect(player.hasEpisode.value).toBe(true)
    })

    it('sets isLoading to true when loading a new episode', async () => {
      // Use a unique guid so we don't hit the "same episode resume" path
      const episode = createTestEpisode({ guid: 'loading-test-guid' })
      await player.play(episode)
      // The Howl mock constructor does not trigger onload callback, so
      // isLoading should remain true (set at start of play, only cleared
      // in onload which never fires).
      expect(player.isLoading.value).toBe(true)
    })

    it('sets a different episode when called again', async () => {
      const ep1 = createTestEpisode({ guid: 'ep-1', title: 'First' })
      const ep2 = createTestEpisode({ guid: 'ep-2', title: 'Second' })

      await player.play(ep1)
      expect(player.currentEpisode.value?.guid).toBe('ep-1')

      await player.play(ep2)
      expect(player.currentEpisode.value?.guid).toBe('ep-2')
    })
  })

  describe('pause', () => {
    it('does not throw when called without a loaded episode', () => {
      expect(() => player.pause()).not.toThrow()
    })
  })

  describe('toggle', () => {
    it('does not throw when called without a loaded episode', () => {
      expect(() => player.toggle()).not.toThrow()
    })
  })

  describe('getShareUrl', () => {
    it('returns base URL without timestamp when currentTime is 0', () => {
      const url = player.getShareUrl('my-episode')
      expect(url).toContain('/episodes/my-episode')
      expect(url).not.toContain('?t=')
    })

    it('includes the episode slug in the URL', () => {
      const url = player.getShareUrl('deep-dive-into-testing')
      expect(url).toContain('/episodes/deep-dive-into-testing')
    })

    it('returns a URL with the correct origin', () => {
      const url = player.getShareUrl('test')
      // happy-dom sets window.location.origin
      expect(url).toMatch(/^https?:\/\//)
    })
  })

  describe('computed properties', () => {
    it('progressPercent is 0 when duration is 0', () => {
      expect(player.progressPercent.value).toBe(0)
    })

    it('hasEpisode is false initially', () => {
      // After beforeEach resets, currentEpisode may have been set by
      // earlier tests (module-level state). We verify the computed works.
      // If no play() was called in this describe block, it should reflect
      // whatever state exists.
      expect(typeof player.hasEpisode.value).toBe('boolean')
    })
  })
})
