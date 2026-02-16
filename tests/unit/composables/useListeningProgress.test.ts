import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { ref } from 'vue'

// Mock useAudioPlayer before importing the composable under test
vi.mock('../../../app/composables/useAudioPlayer', () => ({
  useAudioPlayer: () => ({
    isPlaying: ref(false),
    currentEpisode: ref(null),
    currentTime: ref(0),
    duration: ref(0),
  }),
}))

// Mock @vueuse/core - useStorage returns a simple ref, useIntervalFn is a no-op
vi.mock('@vueuse/core', () => ({
  useStorage: (_key: string, defaultValue: any) => ref(defaultValue),
  useIntervalFn: (_fn: Function, _interval: number, _options?: any) => ({
    pause: vi.fn(),
    resume: vi.fn(),
  }),
}))

// Mock vue's watch so the auto-save watcher doesn't cause side effects
vi.mock('vue', async () => {
  const actual = await vi.importActual<typeof import('vue')>('vue')
  return {
    ...actual,
    watch: vi.fn(),
  }
})

import { useListeningProgress } from '../../../app/composables/useListeningProgress'

describe('useListeningProgress', () => {
  let progress: ReturnType<typeof useListeningProgress>

  beforeEach(() => {
    vi.useFakeTimers()
    progress = useListeningProgress()
    // Start each test with a clean store
    progress.clearAll()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('saveProgress and getProgress', () => {
    it('returns null for an episode with no saved progress', () => {
      expect(progress.getProgress('unknown-guid')).toBeNull()
    })

    it('saves and retrieves progress for an episode', () => {
      vi.setSystemTime(new Date('2025-06-01T12:00:00Z'))

      progress.saveProgress('ep-1', 120, 3600)

      const saved = progress.getProgress('ep-1')
      expect(saved).not.toBeNull()
      expect(saved!.position).toBe(120)
      expect(saved!.duration).toBe(3600)
      expect(saved!.lastUpdated).toBe(Date.now())
    })

    it('overwrites previous progress on re-save', () => {
      progress.saveProgress('ep-1', 100, 3600)
      progress.saveProgress('ep-1', 200, 3600)

      const saved = progress.getProgress('ep-1')
      expect(saved!.position).toBe(200)
    })

    it('tracks progress independently for multiple episodes', () => {
      progress.saveProgress('ep-1', 100, 3600)
      progress.saveProgress('ep-2', 500, 1800)

      expect(progress.getProgress('ep-1')!.position).toBe(100)
      expect(progress.getProgress('ep-2')!.position).toBe(500)
    })
  })

  describe('isStarted', () => {
    it('returns false for an unknown episode', () => {
      expect(progress.isStarted('unknown')).toBe(false)
    })

    it('returns false if position is 0', () => {
      progress.saveProgress('ep-1', 0, 3600)
      expect(progress.isStarted('ep-1')).toBe(false)
    })

    it('returns true if position is greater than 0', () => {
      progress.saveProgress('ep-1', 1, 3600)
      expect(progress.isStarted('ep-1')).toBe(true)
    })

    it('returns true for a partially listened episode', () => {
      progress.saveProgress('ep-1', 1800, 3600)
      expect(progress.isStarted('ep-1')).toBe(true)
    })
  })

  describe('isCompleted', () => {
    it('returns false for an unknown episode', () => {
      expect(progress.isCompleted('unknown')).toBe(false)
    })

    it('returns false if more than 60 seconds remain', () => {
      progress.saveProgress('ep-1', 3500, 3600)
      // 100 seconds remaining > 60 threshold
      expect(progress.isCompleted('ep-1')).toBe(false)
    })

    it('returns true if exactly 60 seconds remain', () => {
      progress.saveProgress('ep-1', 3540, 3600)
      // 60 seconds remaining <= 60 threshold
      expect(progress.isCompleted('ep-1')).toBe(true)
    })

    it('returns true if less than 60 seconds remain', () => {
      progress.saveProgress('ep-1', 3580, 3600)
      // 20 seconds remaining <= 60 threshold
      expect(progress.isCompleted('ep-1')).toBe(true)
    })

    it('returns true if position equals duration', () => {
      progress.saveProgress('ep-1', 3600, 3600)
      // 0 seconds remaining
      expect(progress.isCompleted('ep-1')).toBe(true)
    })

    it('returns true if position exceeds duration', () => {
      progress.saveProgress('ep-1', 3601, 3600)
      // Negative remaining time
      expect(progress.isCompleted('ep-1')).toBe(true)
    })
  })

  describe('getProgressPercent', () => {
    it('returns 0 for an unknown episode', () => {
      expect(progress.getProgressPercent('unknown')).toBe(0)
    })

    it('returns 0 if duration is 0', () => {
      progress.saveProgress('ep-1', 100, 0)
      expect(progress.getProgressPercent('ep-1')).toBe(0)
    })

    it('returns correct percentage for partial progress', () => {
      progress.saveProgress('ep-1', 900, 3600)
      expect(progress.getProgressPercent('ep-1')).toBe(25)
    })

    it('returns 50 for halfway', () => {
      progress.saveProgress('ep-1', 1800, 3600)
      expect(progress.getProgressPercent('ep-1')).toBe(50)
    })

    it('returns 100 when position equals duration', () => {
      progress.saveProgress('ep-1', 3600, 3600)
      expect(progress.getProgressPercent('ep-1')).toBe(100)
    })

    it('can return values above 100 if position exceeds duration', () => {
      progress.saveProgress('ep-1', 4000, 3600)
      expect(progress.getProgressPercent('ep-1')).toBeGreaterThan(100)
    })

    it('handles small fractions accurately', () => {
      progress.saveProgress('ep-1', 1, 3)
      expect(progress.getProgressPercent('ep-1')).toBeCloseTo(33.33, 1)
    })
  })

  describe('clearProgress', () => {
    it('removes progress for a specific episode', () => {
      progress.saveProgress('ep-1', 100, 3600)
      progress.saveProgress('ep-2', 200, 1800)

      progress.clearProgress('ep-1')

      expect(progress.getProgress('ep-1')).toBeNull()
      expect(progress.getProgress('ep-2')).not.toBeNull()
    })

    it('does nothing if episode has no progress', () => {
      // Should not throw
      expect(() => progress.clearProgress('nonexistent')).not.toThrow()
    })
  })

  describe('clearAll', () => {
    it('removes all episode progress', () => {
      progress.saveProgress('ep-1', 100, 3600)
      progress.saveProgress('ep-2', 200, 1800)
      progress.saveProgress('ep-3', 300, 7200)

      progress.clearAll()

      expect(progress.getProgress('ep-1')).toBeNull()
      expect(progress.getProgress('ep-2')).toBeNull()
      expect(progress.getProgress('ep-3')).toBeNull()
    })

    it('results in zero total listening time', () => {
      progress.saveProgress('ep-1', 100, 3600)
      progress.clearAll()
      expect(progress.getTotalListeningTime()).toBe(0)
    })
  })

  describe('getTotalListeningTime', () => {
    it('returns 0 when no progress is saved', () => {
      expect(progress.getTotalListeningTime()).toBe(0)
    })

    it('returns position of a single episode', () => {
      progress.saveProgress('ep-1', 300, 3600)
      expect(progress.getTotalListeningTime()).toBe(300)
    })

    it('sums positions across multiple episodes', () => {
      progress.saveProgress('ep-1', 300, 3600)
      progress.saveProgress('ep-2', 500, 1800)
      progress.saveProgress('ep-3', 200, 7200)

      expect(progress.getTotalListeningTime()).toBe(1000)
    })

    it('uses latest position after overwrite', () => {
      progress.saveProgress('ep-1', 100, 3600)
      progress.saveProgress('ep-1', 400, 3600)

      expect(progress.getTotalListeningTime()).toBe(400)
    })
  })

  describe('getStartedCount', () => {
    it('returns 0 when no progress is saved', () => {
      expect(progress.getStartedCount()).toBe(0)
    })

    it('does not count episodes at position 0', () => {
      progress.saveProgress('ep-1', 0, 3600)
      expect(progress.getStartedCount()).toBe(0)
    })

    it('counts episodes with position > 0', () => {
      progress.saveProgress('ep-1', 100, 3600)
      progress.saveProgress('ep-2', 50, 1800)
      progress.saveProgress('ep-3', 0, 7200) // not started

      expect(progress.getStartedCount()).toBe(2)
    })
  })

  describe('getCompletedCount', () => {
    it('returns 0 when no progress is saved', () => {
      expect(progress.getCompletedCount()).toBe(0)
    })

    it('counts only episodes within 60 seconds of the end', () => {
      progress.saveProgress('ep-1', 3550, 3600) // 50s remaining - completed
      progress.saveProgress('ep-2', 1750, 1800) // 50s remaining - completed
      progress.saveProgress('ep-3', 3000, 3600) // 600s remaining - not completed
      progress.saveProgress('ep-4', 100, 7200) // far from end - not completed

      expect(progress.getCompletedCount()).toBe(2)
    })

    it('counts an episode at exactly the threshold as completed', () => {
      progress.saveProgress('ep-1', 3540, 3600) // exactly 60s remaining
      expect(progress.getCompletedCount()).toBe(1)
    })
  })

  describe('progressStore', () => {
    it('exposes the reactive store directly', () => {
      expect(progress.progressStore.value).toEqual({})

      progress.saveProgress('ep-1', 100, 3600)

      expect(progress.progressStore.value).toHaveProperty('ep-1')
      expect(progress.progressStore.value['ep-1'].position).toBe(100)
    })
  })
})
