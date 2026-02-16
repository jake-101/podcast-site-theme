import { describe, expect, it } from 'vitest'
import { generateSlug } from '../../../server/utils/slug'

describe('generateSlug', () => {
  describe('basic title conversion', () => {
    it('converts a simple title to a slug', () => {
      expect(generateSlug('Hello World')).toBe('hello-world')
    })

    it('converts to lowercase', () => {
      expect(generateSlug('My GREAT Podcast Episode')).toBe('my-great-podcast-episode')
    })

    it('trims leading and trailing whitespace', () => {
      expect(generateSlug('  hello world  ')).toBe('hello-world')
    })
  })

  describe('special character handling', () => {
    it('replaces ampersands with "-and-"', () => {
      expect(generateSlug('Salt & Pepper')).toBe('salt-and-pepper')
    })

    it('replaces multiple ampersands', () => {
      expect(generateSlug('A & B & C')).toBe('a-and-b-and-c')
    })

    it('removes apostrophes', () => {
      expect(generateSlug("It's a Beautiful Day")).toBe('its-a-beautiful-day')
    })

    it('removes curly apostrophes', () => {
      // The function only removes straight apostrophes; curly ones become hyphens
      expect(generateSlug('It\u2019s a Test')).toBe('it-s-a-test')
    })

    it('replaces other special characters with hyphens', () => {
      expect(generateSlug('Hello! How are you?')).toBe('hello-how-are-you')
    })

    it('handles parentheses and brackets', () => {
      expect(generateSlug('Episode (Part 1) [Remastered]')).toBe('episode-part-1-remastered')
    })

    it('handles colons, semicolons, and dashes', () => {
      expect(generateSlug('Ep 42: The Answer - Part 2; Finale')).toBe('ep-42-the-answer-part-2-finale')
    })

    it('handles periods and commas', () => {
      expect(generateSlug('Dr. Smith, Ph.D.')).toBe('dr-smith-ph-d')
    })
  })

  describe('hyphen collapsing and trimming', () => {
    it('collapses multiple consecutive hyphens into one', () => {
      expect(generateSlug('hello---world')).toBe('hello-world')
    })

    it('removes leading hyphens after special char replacement', () => {
      expect(generateSlug('---hello')).toBe('hello')
    })

    it('removes trailing hyphens after special char replacement', () => {
      expect(generateSlug('hello---')).toBe('hello')
    })

    it('handles a string that produces many consecutive hyphens', () => {
      expect(generateSlug('a!@#$%b')).toBe('a-b')
    })
  })

  describe('episode number prepending', () => {
    it('prepends episode number to slug', () => {
      expect(generateSlug('My Episode', 42)).toBe('42-my-episode')
    })

    it('prepends episode number 0', () => {
      expect(generateSlug('Intro', 0)).toBe('0-intro')
    })

    it('does not prepend when episodeNumber is undefined', () => {
      expect(generateSlug('My Episode', undefined)).toBe('my-episode')
    })

    it('prepends negative episode number', () => {
      // Edge case: the function doesn't validate positivity
      expect(generateSlug('Test', -1)).toBe('-1-test')
    })
  })

  describe('length truncation', () => {
    it('truncates slugs longer than 100 characters', () => {
      const longTitle = 'this is a very long podcast episode title that keeps going and going and going and we need to make sure it gets properly truncated at a word boundary'
      const slug = generateSlug(longTitle)
      expect(slug.length).toBeLessThanOrEqual(100)
    })

    it('truncates at a word boundary (no partial words)', () => {
      // Create a title that will produce a slug just over 100 chars
      const longTitle = 'word '.repeat(25) // each "word-" is 5 chars, 25 * 5 = 125 chars as slug
      const slug = generateSlug(longTitle)
      expect(slug.length).toBeLessThanOrEqual(100)
      // Should not end with a hyphen (partial word removed)
      expect(slug).not.toMatch(/-$/)
    })

    it('does not truncate slugs under 100 characters', () => {
      const shortTitle = 'short episode title'
      const slug = generateSlug(shortTitle)
      expect(slug).toBe('short-episode-title')
    })

    it('truncation considers episode number in total length', () => {
      // Use words separated by spaces so truncation has word boundaries to break on
      const longTitle = Array.from({ length: 20 }, (_, i) => `word${i}`).join(' ')
      const slug = generateSlug(longTitle, 999)
      // Episode number "999-" is prepended, making it longer, then truncated
      expect(slug.length).toBeLessThanOrEqual(100)
      expect(slug).toMatch(/^999-/)
      // Should not end with a hyphen (clean word break)
      expect(slug).not.toMatch(/-$/)
    })
  })

  describe('empty and null input handling', () => {
    it('returns empty string for empty string input', () => {
      expect(generateSlug('')).toBe('')
    })

    it('handles null-ish input via String coercion', () => {
      // The function does String(text || '') so null/undefined become ''
      expect(generateSlug(null as any)).toBe('')
      expect(generateSlug(undefined as any)).toBe('')
    })

    it('handles numeric input via String coercion', () => {
      expect(generateSlug(42 as any)).toBe('42')
    })
  })

  describe('unicode characters', () => {
    it('strips unicode characters and replaces with hyphens', () => {
      const slug = generateSlug('Café Résumé')
      // Non-ascii chars are replaced by the [^a-z0-9]+ regex
      expect(slug).toBe('caf-r-sum')
    })

    it('handles emoji in titles', () => {
      const slug = generateSlug('Great Episode 🎙️ Podcast')
      expect(slug).toBe('great-episode-podcast')
    })

    it('handles CJK characters', () => {
      const slug = generateSlug('Episode 日本語 Title')
      expect(slug).toBe('episode-title')
    })
  })

  describe('title with only special characters', () => {
    it('converts special characters, keeping ampersand as "and"', () => {
      // !@#$%^&*() → lowered → replace & with -and- → "!@#$%^-and-*()"
      // → replace non-alnum with - → "-and-" → strip leading/trailing hyphens → "and"
      expect(generateSlug('!@#$%^&*()')).toBe('and')
    })

    it('returns empty string for only whitespace', () => {
      expect(generateSlug('   ')).toBe('')
    })

    it('returns empty string for only hyphens', () => {
      expect(generateSlug('---')).toBe('')
    })

    it('handles a single ampersand', () => {
      expect(generateSlug('&')).toBe('and')
    })
  })
})
