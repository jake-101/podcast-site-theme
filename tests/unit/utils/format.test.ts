import { describe, expect, it } from 'vitest'
import { formatDate, formatDuration, formatDurationFriendly, parseDuration } from '../../../app/utils/format'

describe('formatDate', () => {
  it('formats an ISO date string', () => {
    const result = formatDate('2025-02-13T10:00:00Z')
    expect(result).toBe('Feb 13, 2025')
  })

  it('formats an RSS-style date string', () => {
    const result = formatDate('Thu, 13 Feb 2025 10:00:00 GMT')
    expect(result).toBe('Feb 13, 2025')
  })

  it('formats a date-only ISO string', () => {
    const result = formatDate('2024-01-01')
    // Date-only strings are parsed as UTC midnight; locale output may vary by TZ
    expect(result).toMatch(/Jan 1, 2024|Dec 31, 2023/)
  })

  it('formats a date with timezone offset', () => {
    const result = formatDate('2023-12-25T00:00:00-05:00')
    expect(result).toMatch(/Dec 2[45], 2023/)
  })

  it('handles the Unix epoch', () => {
    const result = formatDate('1970-01-01T00:00:00Z')
    expect(result).toMatch(/Jan 1, 1970|Dec 31, 1969/)
  })

  it('handles dates far in the future', () => {
    const result = formatDate('2099-06-15T12:00:00Z')
    expect(result).toBe('Jun 15, 2099')
  })

  it('returns "Invalid Date" for garbage input', () => {
    const result = formatDate('not-a-date')
    expect(result).toBe('Invalid Date')
  })

  it('returns "Invalid Date" for empty string', () => {
    const result = formatDate('')
    expect(result).toBe('Invalid Date')
  })
})

describe('formatDuration', () => {
  it('formats 0 seconds', () => {
    expect(formatDuration(0)).toBe('0:00')
  })

  it('formats seconds under a minute', () => {
    expect(formatDuration(5)).toBe('0:05')
    expect(formatDuration(30)).toBe('0:30')
    expect(formatDuration(59)).toBe('0:59')
  })

  it('formats exact minutes', () => {
    expect(formatDuration(60)).toBe('1:00')
    expect(formatDuration(120)).toBe('2:00')
    expect(formatDuration(600)).toBe('10:00')
  })

  it('formats minutes and seconds', () => {
    expect(formatDuration(90)).toBe('1:30')
    expect(formatDuration(125)).toBe('2:05')
    expect(formatDuration(3599)).toBe('59:59')
  })

  it('formats with hours', () => {
    expect(formatDuration(3600)).toBe('1:00:00')
    expect(formatDuration(3661)).toBe('1:01:01')
    expect(formatDuration(7200)).toBe('2:00:00')
  })

  it('formats large durations with hours, minutes, and seconds', () => {
    expect(formatDuration(5025)).toBe('1:23:45')
    expect(formatDuration(86399)).toBe('23:59:59')
  })

  it('formats very large durations (>24 hours)', () => {
    expect(formatDuration(86400)).toBe('24:00:00')
    expect(formatDuration(100000)).toBe('27:46:40')
  })

  it('truncates fractional seconds', () => {
    expect(formatDuration(90.7)).toBe('1:30')
    expect(formatDuration(3661.999)).toBe('1:01:01')
  })

  it('pads minutes and seconds in HH:MM:SS format', () => {
    const result = formatDuration(3605)
    expect(result).toBe('1:00:05')
  })

  it('does not pad the leading value', () => {
    // Minutes-only format: leading value is not zero-padded
    expect(formatDuration(65)).toBe('1:05')
    // Hours format: leading value is not zero-padded
    expect(formatDuration(3665)).toBe('1:01:05')
  })
})

describe('parseDuration', () => {
  it('returns 0 for undefined input', () => {
    expect(parseDuration(undefined)).toBe(0)
  })

  it('returns 0 for empty string', () => {
    expect(parseDuration('')).toBe(0)
  })

  it('returns 0 for zero', () => {
    expect(parseDuration(0)).toBe(0)
  })

  it('returns the number directly for numeric input', () => {
    expect(parseDuration(120)).toBe(120)
    expect(parseDuration(3600)).toBe(3600)
  })

  it('floors fractional numeric input', () => {
    expect(parseDuration(90.5)).toBe(90)
    expect(parseDuration(100.99)).toBe(100)
  })

  it('parses HH:MM:SS string', () => {
    expect(parseDuration('1:23:45')).toBe(5025)
    expect(parseDuration('0:00:30')).toBe(30)
    expect(parseDuration('2:00:00')).toBe(7200)
  })

  it('parses MM:SS string', () => {
    expect(parseDuration('1:30')).toBe(90)
    expect(parseDuration('10:05')).toBe(605)
    expect(parseDuration('0:00')).toBe(0)
    expect(parseDuration('59:59')).toBe(3599)
  })

  it('parses plain seconds string', () => {
    expect(parseDuration('120')).toBe(120)
    expect(parseDuration('3600')).toBe(3600)
    expect(parseDuration('0')).toBe(0)
  })

  it('returns 0 for non-numeric string', () => {
    expect(parseDuration('abc')).toBe(0)
  })

  it('returns 0 for malformed timestamp', () => {
    expect(parseDuration(':::')).toBe(0)
  })

  it('handles large HH:MM:SS values', () => {
    expect(parseDuration('99:59:59')).toBe(359999)
  })

  it('roundtrips with formatDuration for common values', () => {
    // parseDuration(formatDuration(n)) should equal n for integer seconds
    const values = [0, 30, 90, 3600, 5025, 7200]
    for (const n of values) {
      expect(parseDuration(formatDuration(n))).toBe(n)
    }
  })
})
