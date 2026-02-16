/**
 * Transcript parsing utilities
 * Supports SRT, VTT, and JSON transcript formats from podcast:transcript tags
 */

export interface TranscriptCue {
  /** Start time in seconds */
  startTime: number
  /** End time in seconds */
  endTime: number
  /** Text content of the cue */
  text: string
  /** Optional speaker name */
  speaker?: string
}

export interface ParsedTranscript {
  /** Array of timed cues */
  cues: TranscriptCue[]
  /** The format that was parsed */
  format: 'srt' | 'vtt' | 'json' | 'text' | 'html'
}

/**
 * Parse a timestamp string from SRT/VTT format to seconds
 * Supports: HH:MM:SS.mmm, HH:MM:SS,mmm, MM:SS.mmm
 */
export function parseTranscriptTimestamp(timestamp: string): number {
  // Clean up and normalize
  const clean = timestamp.trim().replace(',', '.')

  const parts = clean.split(':')

  if (parts.length === 3) {
    // HH:MM:SS.mmm
    const hours = parseInt(parts[0], 10)
    const minutes = parseInt(parts[1], 10)
    const seconds = parseFloat(parts[2])
    return hours * 3600 + minutes * 60 + seconds
  } else if (parts.length === 2) {
    // MM:SS.mmm
    const minutes = parseInt(parts[0], 10)
    const seconds = parseFloat(parts[1])
    return minutes * 60 + seconds
  }

  // Fallback: try parsing as plain number (seconds)
  const num = parseFloat(clean)
  return isNaN(num) ? 0 : num
}

/**
 * Parse SRT (SubRip) format transcript
 *
 * Format:
 * 1
 * 00:00:01,000 --> 00:00:04,000
 * Hello, this is the first line.
 *
 * 2
 * 00:00:04,500 --> 00:00:08,000
 * And this is the second line.
 */
export function parseSRT(content: string): ParsedTranscript {
  const cues: TranscriptCue[] = []
  // Split by double newline (blank lines between cues)
  const blocks = content.trim().split(/\n\s*\n/)

  for (const block of blocks) {
    const lines = block.trim().split('\n')
    if (lines.length < 3) continue

    // Line 1: cue number (skip)
    // Line 2: timestamps
    const timeLine = lines[1].trim()
    const timeMatch = timeLine.match(/(\d[\d:,.]+)\s*-->\s*(\d[\d:,.]+)/)
    if (!timeMatch) continue

    const startTime = parseTranscriptTimestamp(timeMatch[1])
    const endTime = parseTranscriptTimestamp(timeMatch[2])

    // Lines 3+: text content
    const textLines = lines.slice(2)
    let text = textLines.join(' ').trim()

    // Extract speaker if present (e.g., "<v Speaker Name>text" or "Speaker: text")
    let speaker: string | undefined
    const vTagMatch = text.match(/^<v\s+([^>]+)>(.*)$/s)
    if (vTagMatch) {
      speaker = vTagMatch[1].trim()
      text = vTagMatch[2].trim()
    } else {
      const speakerMatch = text.match(/^([A-Z][A-Za-z\s.]+):\s*(.+)$/s)
      if (speakerMatch) {
        speaker = speakerMatch[1].trim()
        text = speakerMatch[2].trim()
      }
    }

    // Strip HTML tags from text
    text = text.replace(/<[^>]+>/g, '').trim()

    if (text) {
      cues.push({ startTime, endTime, text, speaker })
    }
  }

  return { cues, format: 'srt' }
}

/**
 * Parse VTT (WebVTT) format transcript
 *
 * Format:
 * WEBVTT
 *
 * 00:00:01.000 --> 00:00:04.000
 * Hello, this is the first line.
 *
 * 00:00:04.500 --> 00:00:08.000
 * And this is the second line.
 */
export function parseVTT(content: string): ParsedTranscript {
  const cues: TranscriptCue[] = []

  // Remove the WEBVTT header and any metadata before the first cue
  let body = content.replace(/^WEBVTT[^\n]*\n/, '')
  // Remove NOTE blocks
  body = body.replace(/^NOTE\s[\s\S]*?(?=\n\n)/gm, '')
  // Remove STYLE blocks
  body = body.replace(/^STYLE\s[\s\S]*?(?=\n\n)/gm, '')

  const blocks = body.trim().split(/\n\s*\n/)

  for (const block of blocks) {
    const lines = block.trim().split('\n')
    if (lines.length === 0) continue

    // Find the timestamp line
    let timeLineIndex = -1
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes('-->')) {
        timeLineIndex = i
        break
      }
    }

    if (timeLineIndex === -1) continue

    const timeLine = lines[timeLineIndex].trim()
    const timeMatch = timeLine.match(/([\d:.]+)\s*-->\s*([\d:.]+)/)
    if (!timeMatch) continue

    const startTime = parseTranscriptTimestamp(timeMatch[1])
    const endTime = parseTranscriptTimestamp(timeMatch[2])

    // Text lines are everything after the timestamp line
    const textLines = lines.slice(timeLineIndex + 1)
    let text = textLines.join(' ').trim()

    // Extract speaker from VTT voice tag <v Speaker Name>
    let speaker: string | undefined
    const vTagMatch = text.match(/^<v\s+([^>]+)>(.*)$/s)
    if (vTagMatch) {
      speaker = vTagMatch[1].trim()
      text = vTagMatch[2].trim()
    }

    // Strip VTT formatting tags (<b>, <i>, <c>, etc.)
    text = text.replace(/<[^>]+>/g, '').trim()

    if (text) {
      cues.push({ startTime, endTime, text, speaker })
    }
  }

  return { cues, format: 'vtt' }
}

/**
 * Parse JSON transcript format (Podcasting 2.0 spec)
 *
 * Format:
 * {
 *   "version": "1.0.0",
 *   "segments": [
 *     { "startTime": 0, "endTime": 4, "body": "Hello" },
 *     { "startTime": 4.5, "endTime": 8, "body": "World", "speaker": "Host" }
 *   ]
 * }
 */
export function parseJSONTranscript(content: string): ParsedTranscript {
  const cues: TranscriptCue[] = []

  try {
    const data = JSON.parse(content)

    // Handle Podcasting 2.0 JSON transcript format
    const segments = data.segments || data.cues || data

    if (!Array.isArray(segments)) {
      return { cues: [], format: 'json' }
    }

    for (const seg of segments) {
      const startTime = typeof seg.startTime === 'number' ? seg.startTime : parseFloat(seg.startTime || '0')
      const endTime = typeof seg.endTime === 'number' ? seg.endTime : parseFloat(seg.endTime || '0')
      const text = (seg.body || seg.text || seg.content || '').trim()
      const speaker = seg.speaker || seg.name || undefined

      if (text && !isNaN(startTime)) {
        cues.push({
          startTime,
          endTime: isNaN(endTime) ? startTime + 5 : endTime,
          text,
          speaker,
        })
      }
    }
  } catch {
    // Invalid JSON - return empty
    return { cues: [], format: 'json' }
  }

  return { cues, format: 'json' }
}

/**
 * Parse plain text transcript (no timestamps)
 * Splits by paragraphs and assigns estimated timestamps
 */
export function parsePlainText(content: string, totalDuration?: number): ParsedTranscript {
  const cues: TranscriptCue[] = []
  const paragraphs = content
    .trim()
    .split(/\n\s*\n/)
    .filter(p => p.trim())

  if (paragraphs.length === 0) {
    return { cues: [], format: 'text' }
  }

  // Estimate timing based on character count if duration available
  const totalChars = paragraphs.reduce((sum, p) => sum + p.length, 0)
  const duration = totalDuration || paragraphs.length * 30 // Default ~30s per paragraph
  let currentTime = 0

  for (const paragraph of paragraphs) {
    const text = paragraph.trim().replace(/\n/g, ' ')
    if (!text) continue

    // Extract speaker if format is "Speaker: text"
    let speaker: string | undefined
    let cleanText = text
    const speakerMatch = text.match(/^([A-Z][A-Za-z\s.]+):\s*(.+)$/s)
    if (speakerMatch) {
      speaker = speakerMatch[1].trim()
      cleanText = speakerMatch[2].trim()
    }

    const segDuration = (text.length / totalChars) * duration

    cues.push({
      startTime: currentTime,
      endTime: currentTime + segDuration,
      text: cleanText,
      speaker,
    })

    currentTime += segDuration
  }

  return { cues, format: 'text' }
}

/**
 * Parse HTML transcript
 * Extracts text content and tries to find timing data
 */
export function parseHTMLTranscript(content: string): ParsedTranscript {
  // Strip all HTML tags but try to preserve structure
  const text = content
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')

  return parsePlainText(text)
}

/**
 * Auto-detect format and parse transcript content
 */
export function parseTranscript(
  content: string,
  mimeType?: string,
  totalDuration?: number,
): ParsedTranscript {
  const type = (mimeType || '').toLowerCase()

  // Detect by MIME type first
  if (type.includes('srt') || type === 'application/x-subrip') {
    return parseSRT(content)
  }
  if (type.includes('vtt') || type === 'text/vtt') {
    return parseVTT(content)
  }
  if (type.includes('json')) {
    return parseJSONTranscript(content)
  }
  if (type.includes('html')) {
    return parseHTMLTranscript(content)
  }

  // Auto-detect by content
  const trimmed = content.trim()

  if (trimmed.startsWith('WEBVTT')) {
    return parseVTT(content)
  }

  // SRT starts with a number followed by a timestamp line
  if (/^\d+\s*\n\d{2}:\d{2}/.test(trimmed)) {
    return parseSRT(content)
  }

  // JSON starts with { or [
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    return parseJSONTranscript(content)
  }

  // HTML detection
  if (trimmed.startsWith('<') || /<[a-z][\s\S]*>/i.test(trimmed)) {
    return parseHTMLTranscript(content)
  }

  // Fallback to plain text
  return parsePlainText(content, totalDuration)
}

/**
 * Find the active cue index for a given time
 * Returns -1 if no cue is active
 */
export function findActiveCueIndex(cues: TranscriptCue[], currentTime: number): number {
  // Binary search for efficiency with large transcripts
  let low = 0
  let high = cues.length - 1
  let result = -1

  while (low <= high) {
    const mid = Math.floor((low + high) / 2)
    const cue = cues[mid]

    if (currentTime >= cue.startTime && currentTime < cue.endTime) {
      return mid
    }

    if (currentTime >= cue.startTime) {
      result = mid
      low = mid + 1
    } else {
      high = mid - 1
    }
  }

  // If we didn't find an exact match, check if result is still within bounds
  if (result !== -1 && cues[result] && currentTime >= cues[result].startTime && currentTime < cues[result].endTime) {
    return result
  }

  // For gaps between cues, return the next upcoming cue's predecessor
  return result
}

/**
 * Group consecutive cues by speaker for better visual display
 */
export function groupCuesBySpeaker(cues: TranscriptCue[]): Array<{
  speaker?: string
  cues: TranscriptCue[]
  startTime: number
  endTime: number
}> {
  const groups: Array<{
    speaker?: string
    cues: TranscriptCue[]
    startTime: number
    endTime: number
  }> = []

  let currentGroup: typeof groups[number] | null = null

  for (const cue of cues) {
    if (!currentGroup || currentGroup.speaker !== cue.speaker) {
      currentGroup = {
        speaker: cue.speaker,
        cues: [cue],
        startTime: cue.startTime,
        endTime: cue.endTime,
      }
      groups.push(currentGroup)
    } else {
      currentGroup.cues.push(cue)
      currentGroup.endTime = cue.endTime
    }
  }

  return groups
}
