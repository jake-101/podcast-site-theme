import { describe, expect, it } from 'vitest'
import {
  parseTimestamp,
  linkifyTimestamps,
  extractTimestamps,
  formatTimestamp,
} from '../../../app/utils/timestamps'

describe('parseTimestamp', () => {
  it('parses HH:MM:SS format', () => {
    expect(parseTimestamp('1:23:45')).toBe(5025)
    expect(parseTimestamp('0:00:00')).toBe(0)
    expect(parseTimestamp('2:00:00')).toBe(7200)
  })

  it('parses MM:SS format', () => {
    expect(parseTimestamp('1:30')).toBe(90)
    expect(parseTimestamp('0:00')).toBe(0)
    expect(parseTimestamp('59:59')).toBe(3599)
    expect(parseTimestamp('10:05')).toBe(605)
  })

  it('parses single number as seconds', () => {
    expect(parseTimestamp('45')).toBe(45)
    expect(parseTimestamp('0')).toBe(0)
    expect(parseTimestamp('120')).toBe(120)
  })

  it('returns 0 for empty string', () => {
    expect(parseTimestamp('')).toBe(0)
  })

  it('handles large hour values', () => {
    expect(parseTimestamp('99:59:59')).toBe(359999)
  })
})

describe('linkifyTimestamps', () => {
  it('returns empty string for empty input', () => {
    expect(linkifyTimestamps('')).toBe('')
  })

  it('returns empty string for null/undefined input', () => {
    // The function guards with `if (!html) return ''`
    expect(linkifyTimestamps(null as unknown as string)).toBe('')
    expect(linkifyTimestamps(undefined as unknown as string)).toBe('')
  })

  it('returns the original string if no timestamps are found', () => {
    const html = '<p>No timestamps here.</p>'
    expect(linkifyTimestamps(html)).toBe(html)
  })

  it('linkifies a MM:SS timestamp in plain text', () => {
    const html = 'Discussion starts at 12:34 about testing'
    const result = linkifyTimestamps(html)
    expect(result).toContain('data-timestamp="754"')
    expect(result).toContain('>12:34</a>')
    expect(result).toContain('class="timestamp-link"')
  })

  it('linkifies an HH:MM:SS timestamp', () => {
    const html = 'See the interview at 1:23:45 for details'
    const result = linkifyTimestamps(html)
    expect(result).toContain('data-timestamp="5025"')
    expect(result).toContain('>1:23:45</a>')
  })

  it('linkifies multiple timestamps', () => {
    const html = 'Topics: 0:00 Intro, 5:30 Main topic, 1:00:00 Wrap up'
    const result = linkifyTimestamps(html)
    expect(result).toContain('data-timestamp="0"')
    expect(result).toContain('>0:00</a>')
    expect(result).toContain('data-timestamp="330"')
    expect(result).toContain('>5:30</a>')
    expect(result).toContain('data-timestamp="3600"')
    expect(result).toContain('>1:00:00</a>')
  })

  it('uses a custom link class', () => {
    const html = 'At 2:30 something happens'
    const result = linkifyTimestamps(html, 'my-custom-class')
    expect(result).toContain('class="my-custom-class"')
    expect(result).not.toContain('class="timestamp-link"')
  })

  it('linkifies timestamps in brackets', () => {
    const html = '[12:34] Topic discussion'
    const result = linkifyTimestamps(html)
    expect(result).toContain('data-timestamp="754"')
    expect(result).toContain('>12:34</a>')
  })

  it('linkifies timestamps after HTML tags', () => {
    const html = '<p>12:34 Topic discussion</p>'
    const result = linkifyTimestamps(html)
    expect(result).toContain('data-timestamp="754"')
    expect(result).toContain('>12:34</a>')
  })

  it('adds onclick="return false;" to prevent navigation', () => {
    const html = 'At 5:00 something starts'
    const result = linkifyTimestamps(html)
    expect(result).toContain('onclick="return false;"')
  })

  it('preserves surrounding content', () => {
    const html = '<li>5:30 - Topic Name</li>'
    const result = linkifyTimestamps(html)
    // The timestamp is linkified, surrounding content preserved
    expect(result).toContain('Topic Name')
    expect(result).toContain('<li>')
    expect(result).toContain('</li>')
  })

  it('handles timestamps at the start of a line after a tag boundary', () => {
    const html = '<p>0:00 Intro</p><p>15:30 Discussion</p>'
    const result = linkifyTimestamps(html)
    expect(result).toContain('data-timestamp="0"')
    expect(result).toContain('data-timestamp="930"')
  })
})

describe('extractTimestamps', () => {
  it('returns empty array for empty input', () => {
    expect(extractTimestamps('')).toEqual([])
  })

  it('returns empty array for null/undefined input', () => {
    expect(extractTimestamps(null as unknown as string)).toEqual([])
    expect(extractTimestamps(undefined as unknown as string)).toEqual([])
  })

  it('returns empty array when no timestamps exist', () => {
    expect(extractTimestamps('<p>No timestamps here</p>')).toEqual([])
  })

  it('extracts a single MM:SS timestamp', () => {
    const result = extractTimestamps('Start at 5:30 for the topic')
    expect(result).toEqual([{ timestamp: '5:30', seconds: 330 }])
  })

  it('extracts a single HH:MM:SS timestamp', () => {
    const result = extractTimestamps('Jump to 1:23:45 for the answer')
    expect(result).toEqual([{ timestamp: '1:23:45', seconds: 5025 }])
  })

  it('extracts multiple timestamps', () => {
    const html = '0:00 Intro\n5:30 Topic 1\n15:00 Topic 2\n1:00:00 Outro'
    const result = extractTimestamps(html)
    expect(result).toHaveLength(4)
    expect(result[0]).toEqual({ timestamp: '0:00', seconds: 0 })
    expect(result[1]).toEqual({ timestamp: '5:30', seconds: 330 })
    expect(result[2]).toEqual({ timestamp: '15:00', seconds: 900 })
    expect(result[3]).toEqual({ timestamp: '1:00:00', seconds: 3600 })
  })

  it('deduplicates identical timestamps', () => {
    const html = 'See 5:30 for intro. Back at 5:30 for more.'
    const result = extractTimestamps(html)
    expect(result).toHaveLength(1)
    expect(result[0]).toEqual({ timestamp: '5:30', seconds: 330 })
  })

  it('sorts timestamps by time ascending', () => {
    const html = '30:00 later topic\n5:00 early topic\n15:00 middle topic'
    const result = extractTimestamps(html)
    expect(result).toHaveLength(3)
    expect(result[0].seconds).toBe(300)
    expect(result[1].seconds).toBe(900)
    expect(result[2].seconds).toBe(1800)
  })

  it('extracts timestamps from HTML content', () => {
    const html = '<ul><li>0:00 Intro</li><li>10:30 Main</li></ul>'
    const result = extractTimestamps(html)
    expect(result).toHaveLength(2)
    expect(result[0]).toEqual({ timestamp: '0:00', seconds: 0 })
    expect(result[1]).toEqual({ timestamp: '10:30', seconds: 630 })
  })

  it('extracts timestamps from bracketed format', () => {
    const html = '[0:00] Intro [5:30] Topic [1:00:00] Finale'
    const result = extractTimestamps(html)
    expect(result).toHaveLength(3)
    expect(result[0].seconds).toBe(0)
    expect(result[1].seconds).toBe(330)
    expect(result[2].seconds).toBe(3600)
  })
})

describe('formatTimestamp', () => {
  it('formats seconds under a minute as MM:SS', () => {
    expect(formatTimestamp(0)).toBe('0:00')
    expect(formatTimestamp(5)).toBe('0:05')
    expect(formatTimestamp(30)).toBe('0:30')
    expect(formatTimestamp(59)).toBe('0:59')
  })

  it('formats minutes and seconds', () => {
    expect(formatTimestamp(60)).toBe('1:00')
    expect(formatTimestamp(90)).toBe('1:30')
    expect(formatTimestamp(605)).toBe('10:05')
    expect(formatTimestamp(3599)).toBe('59:59')
  })

  it('includes hours when seconds >= 3600', () => {
    expect(formatTimestamp(3600)).toBe('1:00:00')
    expect(formatTimestamp(5025)).toBe('1:23:45')
    expect(formatTimestamp(7200)).toBe('2:00:00')
  })

  it('forces hours when includeHours is true', () => {
    expect(formatTimestamp(0, true)).toBe('0:00:00')
    expect(formatTimestamp(90, true)).toBe('0:01:30')
    expect(formatTimestamp(605, true)).toBe('0:10:05')
  })

  it('includes hours regardless of includeHours flag when hours > 0', () => {
    expect(formatTimestamp(3600, false)).toBe('1:00:00')
    expect(formatTimestamp(3600, true)).toBe('1:00:00')
  })

  it('truncates fractional seconds', () => {
    expect(formatTimestamp(90.7)).toBe('1:30')
    expect(formatTimestamp(5025.999)).toBe('1:23:45')
  })

  it('pads minutes and seconds but not the leading value', () => {
    expect(formatTimestamp(65)).toBe('1:05')
    expect(formatTimestamp(3605)).toBe('1:00:05')
  })
})
