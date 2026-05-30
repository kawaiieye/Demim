import { db } from '@/lib/db'
import fs from 'fs/promises'
import path from 'path'

interface ParsedEvent {
  timestamp: Date
  source: string
  title: string
  description: string
  location?: string
  latitude?: number
  longitude?: number
  rawData?: string
  tags?: string
}

// ─── Google My Activity HTML Parser ────────────────────────────────────────
// Google exports My Activity as HTML pages. These contain entries like:
//   <div class="content-cell ...">Searched for <a href="...">Term</a><br>Jan 24, 2026, 3:53:07 AM EST<br></div>
// We parse these with regex to extract timestamped events.

// ─── Strip CSS and extract body from split HTML parts ──────────────────
// adm-zip splits large HTML files into .txt parts. Early parts are just CSS.
// This function strips CSS and returns only the HTML body content.
function extractBodyContent(content: string): string {
  // If content has a <body> tag, take everything after it
  const bodyMatch = content.match(/<body[^>]*>([\s\S]*?)<\/body>/i)
  if (bodyMatch) return bodyMatch[1]

  // If content has </style>, take everything after the last </style>
  const lastStyleEnd = content.lastIndexOf('</style>')
  if (lastStyleEnd >= 0) return content.slice(lastStyleEnd + 8)

  // If content looks like it's purely CSS (starts with CSS rules), skip it
  const first200 = content.slice(0, 500)
  const cssRuleCount = (first200.match(/\{[^}]*\}/g) || []).length
  if (cssRuleCount > 5 && !first200.includes('<body') && !first200.includes('content-cell mdl-cell')) {
    return '' // Pure CSS, no body content
  }

  return content
}

// ─── Check if content is primarily CSS (no actual data) ─────────────────
function isPrimarilyCss(content: string): boolean {
  const first500 = content.slice(0, 1000)
  // Check for many CSS rule patterns like {.color:#xxx !important.}
  const ruleCount = (first500.match(/\{[^}]*\}/g) || []).length
  // If there are many CSS rules and no <body> tag, it's CSS-only
  return ruleCount > 10 && !first500.includes('<body') && !first500.includes('content-cell mdl-cell')
}

function parseGoogleActivityHtml(html: string, sourceLabel: string): ParsedEvent[] {
  const events: ParsedEvent[] = []

  // Strip CSS first — only parse the body/actual content
  const bodyContent = extractBodyContent(html)
  if (!bodyContent.trim()) return events // CSS-only, no data

  // Match content-cell blocks — each one is an activity entry
  // Updated regex: match content-cell divs that contain actual activity text
  // The old regex failed because </div> matched too eagerly in nested HTML
  const cellRegex = /<div[^>]*class="content-cell[^"]*mdl-typography--body-1[^"]*"[^>]*>([\s\S]*?)<\/div>/gi

  // Match timestamp patterns like "Jan 24, 2026, 3:53:07 AM EST" or "Dec 1, 2025, 11:20:00 PM EST"
  const timestampRegex = /(\w{3}\s+\d{1,2},\s+\d{4},?\s+\d{1,2}:\d{2}:\d{2}\s*(?:AM|PM)\s*(?:\w{3,4})?)/gi

  // Match action + subject patterns
  // "Searched for X", "Visited X", "Used X", "Watched X", etc.
  const actionRegex = /^(Searched for|Visited|Used|Watched|Listened to|Read|Opened|Installed|Uninstalled|Updated|Downloaded|Shared|Sent|Received|Called|Added|Removed|Changed|Joined|Left|Created|Deleted)\s*/i

  // Match links: <a href="URL">TEXT</a>
  const linkRegex = /<a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi

  let match
  while ((match = cellRegex.exec(bodyContent)) !== null) {
    const cellContent = match[1] || ''

    // Skip if this is a metadata/caption cell (Products:, Why is this here?)
    if (cellContent.includes('Products:') || cellContent.includes('Why is this here')) continue

    // Extract timestamp
    const tsMatches = [...cellContent.matchAll(timestampRegex)]
    if (tsMatches.length === 0) continue

    const tsStr = tsMatches[0][1]
    const ts = new Date(tsStr)
    if (isNaN(ts.getTime())) continue

    // Clean the content: strip HTML tags
    let cleanText = cellContent
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<a[^>]*>([\s\S]*?)<\/a>/gi, '$1')
      .replace(/<[^>]+>/g, '')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&nbsp;/g, ' ')
      .trim()

    // Remove the timestamp from the text to get just the action
    const textWithoutTs = cleanText.replace(tsMatches[0][0], '').trim()

    // Try to extract URLs from the cell
    const urls: string[] = []
    let linkMatch
    const linkRegexLocal = /<a[^>]*href="([^"]*)"[^>]*>/gi
    while ((linkMatch = linkRegexLocal.exec(cellContent)) !== null) {
      if (linkMatch[1] && !linkMatch[1].includes('myaccount.google.com')) {
        urls.push(linkMatch[1])
      }
    }

    // Determine the action type
    const actionMatch = textWithoutTs.match(actionRegex)
    let action = 'Activity'
    let subject = textWithoutTs
    if (actionMatch) {
      action = actionMatch[1]
      subject = textWithoutTs.slice(actionMatch[0].length).trim()
    }

    const title = `${action}: ${subject}`.slice(0, 500)
    const description = [
      textWithoutTs,
      urls.length > 0 ? `URL: ${urls[0]}` : '',
    ].filter(Boolean).join(' | ').slice(0, 2000)

    // Determine source tag based on the source label
    let tag = 'google,activity'
    const lowerLabel = sourceLabel.toLowerCase()
    if (lowerLabel.includes('chat')) tag = 'google,chat'
    else if (lowerLabel.includes('youtube')) tag = 'google,youtube'
    else if (lowerLabel.includes('search')) tag = 'google,search'
    else if (lowerLabel.includes('map')) tag = 'google,maps'
    else if (lowerLabel.includes('chrome') || lowerLabel.includes('browser')) tag = 'google,chrome'
    else if (lowerLabel.includes('image')) tag = 'google,images'
    else if (lowerLabel.includes('news')) tag = 'google,news'
    else if (lowerLabel.includes('play')) tag = 'google,play'
    else if (lowerLabel.includes('drive')) tag = 'google,drive'
    else if (lowerLabel.includes('mail') || lowerLabel.includes('gmail')) tag = 'google,gmail'

    events.push({
      timestamp: ts,
      source: `google-${lowerLabel.includes('chat') ? 'chat' : 'activity'}`,
      title,
      description,
      rawData: cleanText.slice(0, 2000),
      tags: tag,
    })
  }

  return events
}

// ─── Chat HTML Parser ─────────────────────────────────────────────────────
// Parses Google Chat / Tinder chat HTML exports

function parseChatHtml(html: string, chatLabel: string): ParsedEvent[] {
  return parseGoogleActivityHtml(html, chatLabel)
}

// ─── Google Takeout Parser (JSON + HTML) ──────────────────────────────────

export async function parseGoogleTakeout(caseId: string, fileId: string, extractDir: string): Promise<number> {
  const events: ParsedEvent[] = []

  try {
    // Walk through extracted directory
    const entries = await walkDir(extractDir)

    for (const entry of entries) {
      const lower = entry.toLowerCase()
      const ext = path.extname(lower).replace('.', '')

      // ─── JSON PARSERS ───

      // Parse My Activity JSON files
      if (lower.includes('my activity') && ext === 'json') {
        try {
          const content = await fs.readFile(entry, 'utf-8')
          const data = JSON.parse(content)

          if (Array.isArray(data)) {
            for (const item of data) {
              const ts = parseTimestamp(item.time)
              if (ts) {
                events.push({
                  timestamp: ts,
                  source: 'google-activity',
                  title: item.title || 'Google Activity',
                  description: `${item.header || 'Google'}: ${item.title || 'Activity'}${item.titleUrl ? ` - ${item.titleUrl}` : ''}`,
                  rawData: JSON.stringify(item),
                  tags: 'google,activity',
                })
              }
            }
          }
        } catch { /* skip invalid JSON */ }
      }

      // Parse Location History
      if ((lower.includes('location history') || lower.includes('semantic location')) && ext === 'json') {
        try {
          const content = await fs.readFile(entry, 'utf-8')
          const data = JSON.parse(content)

          const timelineObjects = data?.timelineObjects || data?.locations || []
          const items = Array.isArray(timelineObjects) ? timelineObjects : []

          for (const item of items.slice(0, 500)) {
            const loc = item?.placeVisit?.location || item?.location || item
            const ts = parseTimestamp(
              loc?.timestampMs || loc?.timestamp || item?.duration?.startTimestampMs ||
              item?.placeVisit?.duration?.startTimestampMs || item?.startTime
            )

            if (ts && (loc?.latitudeE7 || loc?.latitude)) {
              const lat = loc.latitudeE7 ? loc.latitudeE7 / 1e7 : loc.latitude
              const lng = loc.longitudeE7 ? loc.longitudeE7 / 1e7 : loc.longitude

              events.push({
                timestamp: ts,
                source: 'google-location',
                title: loc?.address || loc?.name || 'Location Visit',
                description: loc?.address || loc?.name || `Location at ${lat.toFixed(4)}, ${lng.toFixed(4)}`,
                latitude: lat,
                longitude: lng,
                location: loc?.address || loc?.name,
                rawData: JSON.stringify(item).slice(0, 2000),
                tags: 'google,location',
              })
            }
          }
        } catch { /* skip invalid JSON */ }
      }

      // Parse Chrome Browser History
      if (lower.includes('chrome') && lower.includes('history') && ext === 'json') {
        try {
          const content = await fs.readFile(entry, 'utf-8')
          const data = JSON.parse(content)
          const items = data?.BrowserHistory || data?.history || []
          const historyItems = Array.isArray(items) ? items : []

          for (const item of historyItems.slice(0, 500)) {
            const ts = parseTimestamp(item.time || item.last_visit_time)
            if (ts) {
              events.push({
                timestamp: ts,
                source: 'google-chrome',
                title: item.title || item.page_title || 'Browser Visit',
                description: `Visited: ${item.title || item.page_title || 'Unknown'} - ${item.url || ''}`,
                rawData: JSON.stringify(item).slice(0, 2000),
                tags: 'google,chrome,browser',
              })
            }
          }
        } catch { /* skip invalid JSON */ }
      }

      // Parse Search activity
      if (lower.includes('search') && ext === 'json') {
        try {
          const content = await fs.readFile(entry, 'utf-8')
          const data = JSON.parse(content)
          const items = Array.isArray(data) ? data : []

          for (const item of items) {
            const ts = parseTimestamp(item.time)
            if (ts) {
              events.push({
                timestamp: ts,
                source: 'google-activity',
                title: item.title || 'Google Search',
                description: `Searched: ${item.title || 'Unknown query'}`,
                rawData: JSON.stringify(item).slice(0, 2000),
                tags: 'google,search',
              })
            }
          }
        } catch { /* skip invalid JSON */ }
      }

      // Parse YouTube history
      if (lower.includes('youtube') && ext === 'json') {
        try {
          const content = await fs.readFile(entry, 'utf-8')
          const data = JSON.parse(content)
          const items = Array.isArray(data) ? data : []

          for (const item of items) {
            const ts = parseTimestamp(item.time)
            if (ts) {
              events.push({
                timestamp: ts,
                source: 'google-activity',
                title: item.title || 'YouTube Video',
                description: `Watched: ${item.title || 'Unknown video'}${item.subtitles?.[0]?.name ? ` on ${item.subtitles[0].name}` : ''}`,
                rawData: JSON.stringify(item).slice(0, 2000),
                tags: 'google,youtube',
              })
            }
          }
        } catch { /* skip invalid JSON */ }
      }

      // ─── HTML / TXT PARSERS (for split HTML exports) ───

      // Parse MyActivity HTML files (Google exports these as HTML, often split into parts)
      if ((lower.includes('myactivity') || lower.includes('my activity')) && (ext === 'html' || ext === 'txt' || ext === 'htm')) {
        try {
          const content = await fs.readFile(entry, 'utf-8')
          // Only parse if it contains actual activity data
          if (content.includes('content-cell') || content.includes('mdl-typography')) {
            const label = path.dirname(entry).split('/').pop() || 'MyActivity'
            const htmlEvents = parseGoogleActivityHtml(content, label)
            events.push(...htmlEvents)
          }
        } catch { /* skip */ }
      }

      // Parse Chat HTML files
      if ((lower.includes('chat') || lower.includes('tinder')) && (ext === 'html' || ext === 'txt' || ext === 'htm')) {
        try {
          const content = await fs.readFile(entry, 'utf-8')
          if (content.includes('content-cell') || content.includes('mdl-typography')) {
            const label = path.dirname(entry).split('/').pop() || 'Chat'
            const chatEvents = parseChatHtml(content, label)
            events.push(...chatEvents)
          }
        } catch { /* skip */ }
      }

      // ─── ANY OTHER JSON FILES IN TAKEOUT ───

      // Parse any other JSON files we haven't handled above
      if (ext === 'json' && !lower.includes('my activity') && !lower.includes('location history') &&
          !lower.includes('semantic location') && !lower.includes('chrome') &&
          !lower.includes('search') && !lower.includes('youtube')) {
        try {
          const content = await fs.readFile(entry, 'utf-8')
          const data = JSON.parse(content)

          // Try to extract events from any JSON structure
          const items = Array.isArray(data) ? data : [data]
          for (const item of items) {
            if (!item || typeof item !== 'object') continue

            const ts = parseTimestamp(
              item.time || item.timestamp || item.date || item.created_at ||
              item.lastModified || item.dateAdded || item.updated_at
            )

            if (ts) {
              const title = item.title || item.name || item.subject || item.email ||
                item.label || item.type || path.basename(entry, path.extname(entry))
              const description = item.description || item.text || item.content ||
                item.message || item.snippet || item.body || ''
              events.push({
                timestamp: ts,
                source: 'google-other',
                title: String(title).slice(0, 500),
                description: String(description || 'Google data entry').slice(0, 2000),
                rawData: JSON.stringify(item).slice(0, 2000),
                tags: 'google,other',
              })
            }
          }
        } catch { /* skip invalid JSON */ }
      }
    }

    // Save events to database
    return await saveEvents(caseId, fileId, events)
  } catch (error) {
    console.error('Google Takeout parsing failed:', error)
    return 0
  }
}

// ─── Facebook Takeout Parser ──────────────────────────────────────────────

export async function parseFacebookTakeout(caseId: string, fileId: string, extractDir: string): Promise<number> {
  const events: ParsedEvent[] = []

  try {
    const entries = await walkDir(extractDir)

    for (const entry of entries) {
      const lower = entry.toLowerCase()
      const ext = path.extname(lower).replace('.', '')

      // Parse posts
      if (lower.includes('post') && ext === 'json') {
        try {
          const content = await fs.readFile(entry, 'utf-8')
          const data = JSON.parse(content)
          const items = Array.isArray(data) ? data : data?.data || data?.posts || []

          for (const item of items) {
            const ts = parseTimestamp(item.timestamp || item.created_time || item.creation_time)
            if (ts) {
              const text = item.data?.[0]?.post || item.message || item.title || item.post || ''
              events.push({
                timestamp: ts,
                source: 'facebook-posts',
                title: item.title || 'Facebook Post',
                description: text || 'Facebook post',
                rawData: JSON.stringify(item).slice(0, 2000),
                tags: 'facebook,post',
              })
            }
          }
        } catch { /* skip */ }
      }

      // Parse messages
      if ((lower.includes('message') || lower.includes('inbox')) && ext === 'json') {
        try {
          const content = await fs.readFile(entry, 'utf-8')
          const data = JSON.parse(content)
          const messages = data?.messages || data?.data || []
          const msgList = Array.isArray(messages) ? messages : []

          for (const msg of msgList.slice(0, 500)) {
            const ts = parseTimestamp(msg.timestamp_ms || msg.timestamp || msg.created_time)
            if (ts) {
              events.push({
                timestamp: ts,
                source: 'facebook-messages',
                title: `Message: ${msg.sender_name || 'Unknown'}`,
                description: msg.content || msg.message || 'Facebook message',
                rawData: JSON.stringify(msg).slice(0, 2000),
                tags: 'facebook,message',
              })
            }
          }
        } catch { /* skip */ }
      }

      // Parse HTML files in Facebook export (posts, messages, etc.)
      if (ext === 'html' || ext === 'htm') {
        try {
          const content = await fs.readFile(entry, 'utf-8')
          if (content.includes('content-cell') || content.includes('mdl-typography')) {
            const label = path.dirname(entry).split('/').pop() || 'Facebook'
            const htmlEvents = parseGoogleActivityHtml(content, label)
            events.push(...htmlEvents)
          }
        } catch { /* skip */ }
      }
    }

    return await saveEvents(caseId, fileId, events)
  } catch (error) {
    console.error('Facebook Takeout parsing failed:', error)
    return 0
  }
}

// ─── Twitter Archive Parser ──────────────────────────────────────────────

export async function parseTwitterArchive(caseId: string, fileId: string, extractDir: string): Promise<number> {
  const events: ParsedEvent[] = []

  try {
    const entries = await walkDir(extractDir)

    for (const entry of entries) {
      const lower = entry.toLowerCase()
      const ext = path.extname(lower).replace('.', '')

      if (ext !== 'json') continue

      try {
        const content = await fs.readFile(entry, 'utf-8')
        const data = JSON.parse(content)

        // Twitter tweets
        if (lower.includes('tweet')) {
          const tweets = Array.isArray(data) ? data : data?.data || []
          for (const tweet of tweets.slice(0, 500)) {
            const ts = parseTimestamp(tweet.created_at || tweet.tweet?.created_at)
            if (ts) {
              const text = tweet.full_text || tweet.tweet?.full_text || tweet.text || tweet.tweet?.text || ''
              events.push({
                timestamp: ts,
                source: 'twitter-tweets',
                title: `Tweet: ${text.slice(0, 60)}...`,
                description: text || 'Tweet',
                rawData: JSON.stringify(tweet).slice(0, 2000),
                tags: 'twitter,tweet',
              })
            }
          }
        }

        // Twitter DMs
        if (lower.includes('direct-message') || lower.includes('dm')) {
          const conversations = Array.isArray(data) ? data : data?.dmConversation || []
          const convList = Array.isArray(conversations) ? conversations : [conversations]
          for (const conv of convList) {
            const messages = conv?.messages || conv?.dmMessages || []
            for (const msg of messages.slice(0, 500)) {
              const ts = parseTimestamp(msg.created_at || msg.messageData?.created_at)
              if (ts) {
                const text = msg.text || msg.messageData?.text || ''
                events.push({
                  timestamp: ts,
                  source: 'twitter-dm',
                  title: `DM: ${msg.senderId || 'Unknown'}`,
                  description: text || 'Direct message',
                  rawData: JSON.stringify(msg).slice(0, 2000),
                  tags: 'twitter,dm',
                })
              }
            }
          }
        }

        // Any other Twitter JSON (likes, follows, etc.)
        if (!lower.includes('tweet') && !lower.includes('direct-message') && !lower.includes('dm')) {
          const items = Array.isArray(data) ? data : [data]
          for (const item of items.slice(0, 200)) {
            if (!item || typeof item !== 'object') continue
            const ts = parseTimestamp(item.created_at || item.timestamp || item.time)
            if (ts) {
              const title = item.full_text || item.screen_name || item.name || item.target || 'Twitter Data'
              events.push({
                timestamp: ts,
                source: 'twitter-other',
                title: String(title).slice(0, 500),
                description: String(item.full_text || item.description || 'Twitter data').slice(0, 2000),
                rawData: JSON.stringify(item).slice(0, 2000),
                tags: 'twitter',
              })
            }
          }
        }
      } catch { /* skip invalid JSON */ }
    }

    return await saveEvents(caseId, fileId, events)
  } catch (error) {
    console.error('Twitter archive parsing failed:', error)
    return 0
  }
}

// ─── Generic Archive Parser ──────────────────────────────────────────────
// Walks through ALL files in an extracted archive and tries to parse each one

export async function parseGenericArchive(caseId: string, fileId: string, extractDir: string): Promise<number> {
  const events: ParsedEvent[] = []

  try {
    const entries = await walkDir(extractDir)

    for (const entry of entries) {
      const lower = entry.toLowerCase()
      const ext = path.extname(lower).replace('.', '')
      const basename = path.basename(entry).toLowerCase()

      // Skip obviously non-data files
      if (basename.startsWith('.') || basename.startsWith('!')) continue
      if (['ico', 'svg', 'woff', 'woff2', 'ttf', 'eot', 'css'].includes(ext)) continue
      // Skip very large CSS-like text files (long filenames that are CSS fragments)
      if (basename.includes('mdl-color') || basename.includes('cubic-bezier')) continue

      // ─── Handle binary files (images, sqlite) BEFORE trying to read as text ───

      // Images with EXIF — handle before text read to avoid utf-8 decode errors
      if (['jpg', 'jpeg', 'png', 'heic', 'heif', 'webp', 'gif', 'bmp', 'tiff'].includes(ext)) {
        try {
          const sharp = (await import('sharp')).default
          const metadata: any = await sharp(entry).metadata()

          let timestamp: Date | null = null
          const exifAny = metadata.exif as Record<string, any> | undefined
          const dateStr = exifAny?.DateTimeOriginal || exifAny?.CreateDate || ''
          if (dateStr) {
            const parsed = new Date(dateStr.replace(/^(\d{4}):(\d{2}):(\d{2})/, '$1-$2-$3'))
            if (!isNaN(parsed.getTime())) timestamp = parsed
          }
          if (!timestamp) {
            const stat = await fs.stat(entry)
            timestamp = stat.mtime
          }

          let latitude: number | undefined
          let longitude: number | undefined
          if (exifAny?.GPSLatitude && exifAny?.GPSLongitude) {
            latitude = exifAny.GPSLatitude
            longitude = exifAny.GPSLongitude
          }

          events.push({
            timestamp,
            source: 'exif',
            title: `Photo: ${path.basename(entry)}`,
            description: `Photo${metadata.make ? ` taken with ${metadata.make}` : ''}${latitude ? ` at ${latitude.toFixed(4)}, ${longitude!.toFixed(4)}` : ''}`,
            latitude,
            longitude,
            location: latitude ? `${latitude.toFixed(4)}, ${longitude!.toFixed(4)}` : undefined,
            rawData: JSON.stringify({ make: metadata.make, model: metadata.model, width: metadata.width, height: metadata.height }).slice(0, 2000),
            tags: 'photo,exif',
          })
        } catch { /* skip EXIF failure */ }
        continue // Don't try to read image as text
      }

      // SQLite databases — handle before text read
      if (ext === 'sqlite' || ext === 'db') {
        try {
          const Database = (await import('better-sqlite3')).default
          const sqlite = new Database(entry, { readonly: true })
          try {
            const rows = sqlite.prepare(
              'SELECT urls.url, urls.title, visits.visit_time FROM urls JOIN visits ON urls.id = visits.url LIMIT 200'
            ).all() as Array<{ url: string; title: string; visit_time: number }>
            for (const row of rows) {
              const chromeEpoch = new Date('1601-01-01').getTime()
              const timestamp = new Date(chromeEpoch + row.visit_time / 1000)
              if (!isNaN(timestamp.getTime())) {
                events.push({
                  timestamp,
                  source: 'browser-history',
                  title: row.title || 'Browser Visit',
                  description: `Visited: ${row.title || 'Unknown'} - ${row.url}`,
                  rawData: JSON.stringify({ url: row.url, title: row.title }).slice(0, 2000),
                  tags: 'browser,chrome,history',
                })
              }
            }
          } catch { /* not a Chrome history DB */ }
          sqlite.close()
        } catch { /* skip */ }
        continue // Don't try to read sqlite as text
      }

      // ─── Now try reading as text for everything else ───
      let content: string
      try {
        content = await fs.readFile(entry, 'utf-8')
      } catch {
        // Binary file we can't read as text — skip it
        continue
      }

      try {
        // ─── HTML Activity Data ───
        // Only match content-cell in actual HTML elements, not CSS class definitions
        // CSS files contain ".content-cell.mdl-cell {" which should NOT trigger this
        if ((ext === 'html' || ext === 'htm' || ext === 'txt') &&
            !isPrimarilyCss(content) &&
            (content.includes('content-cell mdl-cell') || content.includes('content-cell"'))) {
          const label = path.dirname(entry).split('/').pop() || path.basename(entry, path.extname(entry))
          // Determine what kind of activity this is from the folder name
          const folderLower = label.toLowerCase()
          let source = 'activity'
          let tags = 'activity'

          if (folderLower.includes('chat') || folderLower.includes('tinder') || folderLower.includes('hangout')) {
            source = 'chat-activity'
            tags = 'chat,activity'
          } else if (folderLower.includes('youtube') || folderLower.includes('video')) {
            source = 'youtube-activity'
            tags = 'youtube,activity'
          } else if (folderLower.includes('search')) {
            source = 'search-activity'
            tags = 'search,activity'
          } else if (folderLower.includes('image') || folderLower.includes('photo')) {
            source = 'image-activity'
            tags = 'image,activity'
          } else if (folderLower.includes('map') || folderLower.includes('location')) {
            source = 'map-activity'
            tags = 'map,activity'
          } else if (folderLower.includes('news')) {
            source = 'news-activity'
            tags = 'news,activity'
          } else if (folderLower.includes('myactivity') || folderLower.includes('my activity')) {
            source = 'google-activity'
            tags = 'google,activity'
          }

          const htmlEvents = parseGoogleActivityHtml(content, label)
          for (const ev of htmlEvents) {
            if (source !== 'activity') {
              ev.source = source
              ev.tags = tags
            }
            events.push(ev)
          }
        }

        // ─── JSON files ───
        else if (ext === 'json') {
          try {
            const data = JSON.parse(content)
            const items = Array.isArray(data) ? data : [data]
            for (const item of items.slice(0, 200)) {
              if (!item || typeof item !== 'object') continue
              const ts = parseTimestamp(
                item.time || item.timestamp || item.date || item.created_at ||
                item.createdAt || item.lastModified || item.updated_at
              )
              const title = item.title || item.name || item.type || item.label ||
                item.username || item.email || 'JSON Entry'
              const description = item.description || item.text || item.content ||
                item.message || item.snippet || ''

              events.push({
                timestamp: ts || new Date(),
                source: 'archive-json',
                title: String(title).slice(0, 500),
                description: String(description || 'Archive JSON data').slice(0, 2000),
                rawData: JSON.stringify(item).slice(0, 2000),
                tags: 'archive,json',
              })
            }
          } catch { /* not valid JSON */ }
        }

        // ─── CSV files ───
        else if (ext === 'csv' || ext === 'tsv') {
          const lines = content.split('\n').filter(l => l.trim())
          if (lines.length >= 2) {
            const sep = ext === 'tsv' ? '\t' : ','
            const headers = lines[0].split(sep).map(h => h.trim().toLowerCase().replace(/"/g, ''))
            const tsCol = headers.findIndex(h =>
              h.includes('date') || h.includes('time') || h.includes('timestamp') || h.includes('created')
            )
            const titleCol = headers.findIndex(h =>
              h.includes('title') || h.includes('name') || h.includes('subject') || h.includes('type')
            )

            for (let i = 1; i < Math.min(lines.length, 200); i++) {
              const cols = lines[i].split(sep).map(c => c.trim().replace(/^"|"$/g, ''))
              const ts = tsCol >= 0 ? parseTimestamp(cols[tsCol]) : null
              if (ts) {
                events.push({
                  timestamp: ts,
                  source: 'archive-csv',
                  title: titleCol >= 0 ? cols[titleCol].slice(0, 500) : 'CSV Entry',
                  description: cols.filter(Boolean).join(' | ').slice(0, 2000),
                  rawData: JSON.stringify(Object.fromEntries(headers.map((h, j) => [h, cols[j]]))).slice(0, 2000),
                  tags: 'archive,csv',
                })
              }
            }
          }
        }

        // ─── Text files with dates ───
        else if (['txt', 'log', 'md', 'markdown'].includes(ext)) {
          // Skip files that are mostly CSS (split HTML parts that are just CSS)
          if (isPrimarilyCss(content)) continue
          // Skip files whose name looks like a split CSS part (very long filenames with CSS-like content)
          if (basename.length > 60 && isPrimarilyCss(content)) continue
          // Skip very short files
          if (content.trim().length < 10) continue

          const dateRegex = /(\d{4}[-/]\d{2}[-/]\d{2}(?:[T ]\d{2}:\d{2}(?::\d{2})?)?)/g
          const lines = content.split('\n')
          let foundAny = false

          for (const line of lines) {
            if (!line.trim()) continue
            const matches = [...line.matchAll(dateRegex)]
            for (const match of matches) {
              const ts = new Date(match[1].replace(/\//g, '-'))
              if (!isNaN(ts.getTime())) {
                events.push({
                  timestamp: ts,
                  source: 'archive-text',
                  title: `Text: ${line.trim().slice(0, 60)}`,
                  description: line.trim().slice(0, 2000),
                  rawData: line.trim().slice(0, 2000),
                  tags: 'archive,text',
                })
                foundAny = true
                break
              }
            }
          }

          // If no dates found, still create an event — but only for actual text content, not CSS
          if (!foundAny && content.trim().length > 20 && !isPrimarilyCss(content)) {
            const folder = path.dirname(entry).split('/').pop() || ''
            // Don't create events from CSS fragments
            const snippet = content.trim().slice(0, 100)
            if (!snippet.includes('{') || !snippet.includes('}')) {
              events.push({
                timestamp: new Date(),
                source: 'archive-text',
                title: `${folder || 'File'}: ${path.basename(entry)}`,
                description: content.trim().slice(0, 500),
                rawData: content.trim().slice(0, 2000),
                tags: 'archive,text,undated',
              })
            }
          }
        }

      } catch (error) {
        // Skip files we can't parse
        console.error(`Error parsing ${entry}:`, error)
      }
    }

    return await saveEvents(caseId, fileId, events)
  } catch (error) {
    console.error('Generic archive parsing failed:', error)
    return 0
  }
}

// ─── Smart ZIP Type Detection ──────────────────────────────────────────────

export async function detectZipType(buffer: Buffer, filename: string): Promise<string> {
  const lower = filename.toLowerCase()

  // Quick filename-based detection first
  if (lower.includes('facebook') || lower.includes('fb-')) return 'facebook-takeout'
  if (lower.includes('twitter') || lower.includes('archive')) {
    // Could be a twitter archive, but also could be a generic "archive"
    // We'll check inside below
  }

  // Look inside the ZIP to determine the type
  try {
    const AdmZip = (await import('adm-zip')).default
    const zip = new AdmZip(buffer)
    const entries = zip.getEntries()
    const entryPaths = entries.map(e => e.entryName.toLowerCase())

    // Check for Google Takeout structure
    if (entryPaths.some(p => p.includes('takeout/') || p.includes('takeout\\'))) return 'google-takeout'
    if (entryPaths.some(p => p.includes('my activity') || p.includes('myactivity'))) return 'google-takeout'
    if (entryPaths.some(p => p.includes('location history') || p.includes('semantic location'))) return 'google-takeout'
    if (entryPaths.some(p => p.includes('chrome') && p.includes('history'))) return 'google-takeout'

    // Check for Facebook structure
    if (entryPaths.some(p => p.includes('facebook-') || p.includes('your_facebook_data'))) return 'facebook-takeout'

    // Check for Twitter structure
    if (entryPaths.some(p => p.includes('twitter/') && (p.includes('tweet') || p.includes('data/js')))) return 'twitter-archive'

    // If the ZIP has HTML activity data (like BumbleUp exports that contain Google activity)
    if (entryPaths.some(p =>
      (p.includes('myactivity') || p.includes('my activity') || p.includes('chat')) &&
      (p.endsWith('.html') || p.endsWith('.txt'))
    )) return 'generic-archive'

    // If we found "twitter" or "archive" in the name and it has tweet data
    if (lower.includes('twitter') && entryPaths.some(p => p.includes('tweet'))) return 'twitter-archive'

    // Default: generic archive that we'll parse comprehensively
    return 'generic-archive'
  } catch {
    // If we can't read the ZIP, fall back to filename
    if (lower.includes('takeout') || lower.includes('google')) return 'google-takeout'
    if (lower.includes('twitter')) return 'twitter-archive'
    return 'generic-archive'
  }
}

// ─── Image EXIF Parser ────────────────────────────────────────────────────

export async function parseImageExif(caseId: string, fileId: string, filePath: string): Promise<number> {
  const events: ParsedEvent[] = []

  try {
    const sharp = (await import('sharp')).default
    const metadata: any = await sharp(filePath).metadata()

    const exifAny = metadata?.exif as Record<string, any> | undefined
    const dateStr = exifAny?.DateTimeOriginal || exifAny?.CreateDate || ''
    let timestamp: Date | null = null

    if (dateStr) {
      const parsed = new Date(dateStr.replace(/^(\d{4}):(\d{2}):(\d{2})/, '$1-$2-$3'))
      if (!isNaN(parsed.getTime())) timestamp = parsed
    }

    if (!timestamp) {
      const stat = await fs.stat(filePath)
      timestamp = stat.mtime
    }

    let latitude: number | undefined
    let longitude: number | undefined
    let location: string | undefined

    if (exifAny?.GPSLatitude && exifAny?.GPSLongitude) {
      latitude = exifAny.GPSLatitude
      longitude = exifAny.GPSLongitude
      location = `${latitude!.toFixed(4)}, ${longitude!.toFixed(4)}`
    }

    const camera = [metadata.make, metadata.model].filter(Boolean).join(' ')
    const description = [
      `Photo taken${camera ? ` with ${camera}` : ''}`,
      metadata.width && metadata.height ? `${metadata.width}x${metadata.height}` : '',
      location ? `at ${location}` : '',
    ].filter(Boolean).join(' ')

    events.push({
      timestamp,
      source: 'exif',
      title: `Photo: ${path.basename(filePath)}`,
      description,
      latitude,
      longitude,
      location,
      rawData: JSON.stringify({
        make: metadata.make,
        model: metadata.model,
        width: metadata.width,
        height: metadata.height,
        iso: metadata.iso,
        exposure: metadata.exposure,
        focalLength: metadata.focalLength,
      }),
      tags: 'photo,exif',
    })

    return await saveEvents(caseId, fileId, events)
  } catch (error) {
    console.error('EXIF parsing failed:', error)
    return 0
  }
}

// ─── Browser History Parser ───────────────────────────────────────────────

export async function parseBrowserHistory(caseId: string, fileId: string, filePath: string): Promise<number> {
  const events: ParsedEvent[] = []

  try {
    const Database = (await import('better-sqlite3')).default
    const sqlite = new Database(filePath, { readonly: true })

    try {
      const rows = sqlite.prepare(
        'SELECT urls.url, urls.title, visits.visit_time, visits.transition FROM urls JOIN visits ON urls.id = visits.url ORDER BY visits.visit_time DESC LIMIT 500'
      ).all() as Array<{ url: string; title: string; visit_time: number; transition: number }>

      for (const row of rows) {
        const chromeEpoch = new Date('1601-01-01').getTime()
        const timestamp = new Date(chromeEpoch + row.visit_time / 1000)

        if (!isNaN(timestamp.getTime())) {
          events.push({
            timestamp,
            source: 'browser-history',
            title: row.title || 'Browser Visit',
            description: `Visited: ${row.title || 'Unknown'} - ${row.url}`,
            rawData: JSON.stringify({ url: row.url, title: row.title, transition: row.transition }).slice(0, 2000),
            tags: 'browser,chrome,history',
          })
        }
      }
    } catch {
      try {
        const rows = sqlite.prepare('SELECT url, title, last_visit_time FROM urls LIMIT 500').all() as Array<{ url: string; title: string; last_visit_time: number }>
        for (const row of rows) {
          const chromeEpoch = new Date('1601-01-01').getTime()
          const timestamp = new Date(chromeEpoch + row.last_visit_time / 1000)
          if (!isNaN(timestamp.getTime())) {
            events.push({
              timestamp,
              source: 'browser-history',
              title: row.title || 'Browser Visit',
              description: `Visited: ${row.title || 'Unknown'} - ${row.url}`,
              rawData: JSON.stringify(row).slice(0, 2000),
              tags: 'browser,chrome,history',
            })
          }
        }
      } catch { /* no valid table */ }
    }

    sqlite.close()
    return await saveEvents(caseId, fileId, events)
  } catch (error) {
    console.error('Browser history parsing failed:', error)
    return 0
  }
}

// ─── JSON Data Parser ─────────────────────────────────────────────────────

export async function parseJsonData(caseId: string, fileId: string, filePath: string): Promise<number> {
  const events: ParsedEvent[] = []

  try {
    const content = await fs.readFile(filePath, 'utf-8')
    const data = JSON.parse(content)
    const filename = path.basename(filePath).toLowerCase()

    const items = Array.isArray(data) ? data : [data]

    for (const item of items) {
      if (!item || typeof item !== 'object') continue

      const ts = parseTimestamp(
        item.timestamp || item.time || item.date || item.created_at ||
        item.createdAt || item.datetime || item.start_time || item.last_seen ||
        item.dateAdded || item.found_at || item.scanned_at || item.checked_at ||
        item.created_time || item.updated_at || item.event_date
      )

      if (ts) {
        const title = item.title || item.name || item.type || item.label ||
          item.username || item.email || item.query || item.url || 'JSON Entry'
        const description = item.description || item.text || item.content ||
          item.message || item.bio || item.about || item.snippet ||
          item.summary || item.note || ''
        const latitude = item.latitude || item.lat
        const longitude = item.longitude || item.lng || item.lon
        const location = item.location || item.address || item.city ||
          (item.country ? `${item.city || ''} ${item.region || ''} ${item.country}`.trim() : undefined)

        events.push({
          timestamp: ts,
          source: 'json-data',
          title: String(title).slice(0, 500),
          description: String(description || 'JSON data entry').slice(0, 2000),
          latitude: latitude ? Number(latitude) : undefined,
          longitude: longitude ? Number(longitude) : undefined,
          location: location ? String(location).slice(0, 500) : undefined,
          rawData: JSON.stringify(item).slice(0, 2000),
          tags: 'json',
        })
      } else {
        const title = item.title || item.name || item.type || item.label ||
          item.username || item.email || item.platform || item.site ||
          item.query || item.url || item.service || item.source ||
          (item.platform_name ? `${item.platform_name}: ${item.username || ''}` : null) ||
          'JSON Data Entry'
        const description = item.description || item.text || item.content ||
          item.message || item.bio || item.about || item.snippet ||
          item.summary || item.note || item.status || item.result ||
          (item.data ? JSON.stringify(item.data).slice(0, 500) : '')

        const stat = await fs.stat(filePath)
        events.push({
          timestamp: stat.mtime,
          source: 'json-data',
          title: String(title).slice(0, 500),
          description: String(description || 'JSON data (no timestamp)').slice(0, 2000),
          latitude: item.latitude || item.lat ? Number(item.latitude || item.lat) : undefined,
          longitude: item.longitude || item.lng || item.lon ? Number(item.longitude || item.lng || item.lon) : undefined,
          location: item.location || item.address || item.city ? String(item.location || item.address || item.city).slice(0, 500) : undefined,
          rawData: JSON.stringify(item).slice(0, 2000),
          tags: 'json,undated',
        })
      }
    }

    const arrayKeys = Object.keys(data).filter(k => Array.isArray(data[k]) && data[k].length > 0)
    for (const key of arrayKeys) {
      if (key === '0' || items.length > 1) continue

      for (const item of data[key]) {
        if (!item || typeof item !== 'object') continue

        const ts = parseTimestamp(
          item.timestamp || item.time || item.date || item.created_at ||
          item.last_seen || item.found_at || item.checked_at
        )
        const stat = await fs.stat(filePath)
        const title = item.title || item.name || item.username || item.email ||
          item.platform || item.site || item.type || `${key} entry`
        const description = item.description || item.text || item.content ||
          item.bio || item.snippet || item.status || item.message ||
          (item.url ? `URL: ${item.url}` : '')

        const rawDataStr = JSON.stringify(item).slice(0, 2000)
        const isDuplicate = events.some(e => e.rawData === rawDataStr)
        if (isDuplicate) continue

        events.push({
          timestamp: ts || stat.mtime,
          source: 'json-data',
          title: String(title).slice(0, 500),
          description: String(description || `${key} data`).slice(0, 2000),
          latitude: item.latitude || item.lat ? Number(item.latitude || item.lat) : undefined,
          longitude: item.longitude || item.lng || item.lon ? Number(item.longitude || item.lng || item.lon) : undefined,
          location: item.location || item.address || item.city ? String(item.location || item.address || item.city).slice(0, 500) : undefined,
          rawData: rawDataStr,
          tags: `json,${key}`,
        })
      }
    }

    if (events.length === 0) {
      const stat = await fs.stat(filePath)
      events.push({
        timestamp: stat.mtime,
        source: 'json-data',
        title: `JSON File: ${path.basename(filePath)}`,
        description: `Imported JSON data (${(content.length / 1024).toFixed(1)} KB) — ${Object.keys(data).length} top-level keys`,
        rawData: content.slice(0, 2000),
        tags: 'json,raw',
      })
    }

    return await saveEvents(caseId, fileId, events)
  } catch (error) {
    console.error('JSON parsing failed:', error)
    try {
      const stat = await fs.stat(filePath)
      events.push({
        timestamp: stat.mtime,
        source: 'json-data',
        title: `JSON File (parse error): ${path.basename(filePath)}`,
        description: 'File could not be fully parsed but was saved for review',
        rawData: (await fs.readFile(filePath, 'utf-8')).slice(0, 2000),
        tags: 'json,error',
      })
      return await saveEvents(caseId, fileId, events)
    } catch {
      return 0
    }
  }
}

// ─── CSV Data Parser ──────────────────────────────────────────────────────

export async function parseCsvData(caseId: string, fileId: string, filePath: string): Promise<number> {
  const events: ParsedEvent[] = []

  try {
    const content = await fs.readFile(filePath, 'utf-8')
    const lines = content.split('\n').filter(l => l.trim())
    if (lines.length < 2) return 0

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/"/g, ''))

    const tsCol = headers.findIndex(h =>
      h.includes('date') || h.includes('time') || h.includes('timestamp') || h.includes('created')
    )
    const titleCol = headers.findIndex(h =>
      h.includes('title') || h.includes('name') || h.includes('subject') || h.includes('type')
    )
    const descCol = headers.findIndex(h =>
      h.includes('description') || h.includes('text') || h.includes('content') || h.includes('message')
    )
    const latCol = headers.findIndex(h => h.includes('lat'))
    const lngCol = headers.findIndex(h => h.includes('lng') || h.includes('lon') || h.includes('longitude'))

    for (let i = 1; i < Math.min(lines.length, 1000); i++) {
      const cols = lines[i].split(',').map(c => c.trim().replace(/^"|"$/g, ''))

      const ts = tsCol >= 0 ? parseTimestamp(cols[tsCol]) : null
      if (ts) {
        events.push({
          timestamp: ts,
          source: 'csv-data',
          title: titleCol >= 0 ? cols[titleCol] : 'CSV Entry',
          description: descCol >= 0 ? cols[descCol] : cols.filter(Boolean).join(' | '),
          latitude: latCol >= 0 ? parseFloat(cols[latCol]) : undefined,
          longitude: lngCol >= 0 ? parseFloat(cols[lngCol]) : undefined,
          rawData: JSON.stringify(Object.fromEntries(headers.map((h, j) => [h, cols[j]]))).slice(0, 2000),
          tags: 'csv',
        })
      }
    }

    return await saveEvents(caseId, fileId, events)
  } catch (error) {
    console.error('CSV parsing failed:', error)
    return 0
  }
}

// ─── Text File Parser ─────────────────────────────────────────────────────

export async function parseTextFile(caseId: string, fileId: string, filePath: string): Promise<number> {
  const events: ParsedEvent[] = []

  try {
    const content = await fs.readFile(filePath, 'utf-8')
    const lines = content.split('\n')

    const dateRegex = /(\d{4}[-/]\d{2}[-/]\d{2}(?:[T ]\d{2}:\d{2}(?::\d{2})?)?)/g

    for (const line of lines) {
      if (!line.trim()) continue
      const matches = [...line.matchAll(dateRegex)]

      for (const match of matches) {
        const ts = new Date(match[1].replace(/\//g, '-'))
        if (!isNaN(ts.getTime())) {
          events.push({
            timestamp: ts,
            source: 'text',
            title: `Text Entry: ${line.trim().slice(0, 60)}...`,
            description: line.trim(),
            rawData: line.trim(),
            tags: 'text',
          })
          break
        }
      }
    }

    if (events.length === 0) {
      const stat = await fs.stat(filePath)
      events.push({
        timestamp: stat.mtime,
        source: 'text',
        title: `Text File: ${path.basename(filePath)}`,
        description: content.slice(0, 500),
        rawData: content.slice(0, 2000),
        tags: 'text',
      })
    }

    return await saveEvents(caseId, fileId, events)
  } catch (error) {
    console.error('Text parsing failed:', error)
    return 0
  }
}

// ─── Helper Functions ──────────────────────────────────────────────────────

async function saveEvents(caseId: string, fileId: string, events: ParsedEvent[]): Promise<number> {
  let saved = 0
  for (const event of events) {
    try {
      await db.timelineEvent.create({
        data: {
          caseId,
          fileId,
          timestamp: event.timestamp,
          source: event.source,
          title: event.title.slice(0, 500),
          description: event.description.slice(0, 2000),
          location: event.location?.slice(0, 500),
          latitude: event.latitude,
          longitude: event.longitude,
          rawData: event.rawData,
          tags: event.tags,
        }
      })
      saved++
    } catch {
      // Skip events that fail to save
    }
  }
  return saved
}

async function walkDir(dir: string): Promise<string[]> {
  const results: string[] = []
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true })
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        results.push(...await walkDir(fullPath))
      } else {
        results.push(fullPath)
      }
    }
  } catch {
    // Skip directories we can't read
  }
  return results
}

function parseTimestamp(value: unknown): Date | null {
  if (!value) return null

  if (typeof value === 'number') {
    const ms = value > 1e15 ? value / 1000 : value
    const d = new Date(ms)
    return isNaN(d.getTime()) ? null : d
  }

  if (typeof value !== 'string') return null

  // Try direct parse
  const d = new Date(value)
  if (!isNaN(d.getTime())) return d

  // Try ISO format variants
  const cleaned = value
    .replace(/(\d{4})[-/](\d{2})[-/](\d{2})/, '$1-$2-$3')
    .replace(/(\d{2})[-/](\d{2})[-/](\d{4})/, (_, m, d, y) => `${y}-${m}-${d}`)

  const d2 = new Date(cleaned)
  return isNaN(d2.getTime()) ? null : d2
}
