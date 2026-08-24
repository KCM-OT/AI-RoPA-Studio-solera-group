// Client-side plain-text extraction for uploaded source documents.
//
// Everything here runs in the browser with no dependencies:
//   - plain text (.txt/.md/.csv/.json) is read directly
//   - .rtf is stripped of control words by a small scanner
//   - .docx is unzipped with DecompressionStream and its XML flattened
//
// Formats that genuinely need a heavy parser (.pdf, legacy binary .doc, .png OCR)
// are deliberately excluded — the drop zone reports that rather than pretending.

/** Extensions whose text this module can extract. */
export const EXTRACTABLE = ['.txt', '.md', '.csv', '.json', '.rtf', '.docx'] as const

export function extensionOf(name: string): string {
  const i = name.lastIndexOf('.')
  return i === -1 ? '' : name.slice(i).toLowerCase()
}

export function isExtractable(name: string): boolean {
  return (EXTRACTABLE as readonly string[]).includes(extensionOf(name))
}

// ---------- RTF ----------

// Groups whose contents are markup/metadata, never body copy.
const RTF_SKIPPED_DESTINATIONS = new Set([
  'fonttbl',
  'colortbl',
  'stylesheet',
  'info',
  'pict',
  'object',
  'themedata',
  'colorschememapping',
  'latentstyles',
  'datastore',
  'xmlnstbl',
  'generator',
  'listtable',
  'listoverridetable',
  'rsidtbl',
  'filetbl',
  'revtbl',
])

// Control words that stand in for a literal character. Without these, real
// documents lose their dashes and smart quotes entirely.
const RTF_SYMBOLS: Record<string, string> = {
  endash: '–',
  emdash: '—',
  lquote: '‘',
  rquote: '’',
  ldblquote: '“',
  rdblquote: '”',
  bullet: '•',
  enspace: ' ',
  emspace: ' ',
  nbsp: ' ',
}

/**
 * Convert RTF to plain text. RTF is an ASCII format, so this is a scanner over
 * the source rather than a real parse: it tracks brace depth so metadata groups
 * can be skipped wholesale, maps the handful of control words that carry
 * whitespace or a literal character, and drops everything else.
 */
export function rtfToText(rtf: string): string {
  let out = ''
  let i = 0
  let depth = 0
  // Brace depth at which a skipped destination started; 0 means "not skipping".
  let skipFrom = 0

  const skipping = () => skipFrom !== 0

  while (i < rtf.length) {
    const ch = rtf[i]

    if (ch === '{') {
      depth++
      i++
      continue
    }

    if (ch === '}') {
      if (skipping() && depth <= skipFrom) skipFrom = 0
      depth--
      i++
      continue
    }

    if (ch === '\\') {
      const next = rtf[i + 1]

      // Escaped literal.
      if (next === '\\' || next === '{' || next === '}') {
        if (!skipping()) out += next
        i += 2
        continue
      }

      // Hex-escaped byte, e.g. \'93 — treat as latin-1.
      if (next === "'") {
        const code = parseInt(rtf.slice(i + 2, i + 4), 16)
        if (!skipping() && Number.isFinite(code)) out += String.fromCharCode(code)
        i += 4
        continue
      }

      // \* marks an ignorable destination: skip the group it opens.
      if (next === '*') {
        if (!skipping()) skipFrom = depth
        i += 2
        continue
      }

      const match = /^([a-zA-Z]+)(-?\d+)?/.exec(rtf.slice(i + 1))
      if (!match) {
        i += 2
        continue
      }
      const word = match[1].toLowerCase()
      const param = match[2] ? parseInt(match[2], 10) : null
      i += 1 + match[0].length
      // A single trailing space is the control word's delimiter, not content.
      if (rtf[i] === ' ') i++

      if (RTF_SKIPPED_DESTINATIONS.has(word)) {
        if (!skipping()) skipFrom = depth
        continue
      }
      if (skipping()) continue

      if (word === 'par' || word === 'sect' || word === 'row') {
        // A paragraph break becomes a blank line so the scanner can tell
        // labelled sections apart; \line is a soft break within one paragraph.
        out += '\n\n'
      } else if (word === 'line') {
        out += '\n'
      } else if (word === 'tab' || word === 'cell') {
        out += '\t'
      } else if (RTF_SYMBOLS[word]) {
        out += RTF_SYMBOLS[word]
      } else if (word === 'u' && param !== null) {
        out += String.fromCharCode(param < 0 ? param + 65536 : param)
        // \uN is followed by a replacement character for readers that can't do
        // Unicode; skip it so it doesn't double up.
        if (rtf[i] === '\\' && rtf[i + 1] === "'") i += 4
        else if (rtf[i] && rtf[i] !== '\\' && rtf[i] !== '{' && rtf[i] !== '}') i += 1
      }
      continue
    }

    // Literal newlines in the source are formatting, not content.
    if (ch === '\n' || ch === '\r') {
      i++
      continue
    }

    if (!skipping()) out += ch
    i++
  }

  return out
}

// ---------- DOCX ----------

async function inflateRaw(bytes: Uint8Array): Promise<Uint8Array> {
  const stream = new Blob([bytes as BlobPart]).stream().pipeThrough(new DecompressionStream('deflate-raw'))
  return new Uint8Array(await new Response(stream).arrayBuffer())
}

/**
 * Read one entry out of a ZIP archive by name.
 *
 * Walks the central directory (rather than local headers) because streamed
 * archives leave the local header sizes zeroed. Handles stored and deflated
 * entries, which is everything Word, Pages, LibreOffice, and Google Docs emit.
 */
async function readZipEntry(buf: Uint8Array, entryName: string): Promise<Uint8Array | null> {
  const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength)
  const u16 = (o: number) => view.getUint16(o, true)
  const u32 = (o: number) => view.getUint32(o, true)

  // End-of-central-directory record, scanned backwards past any trailing comment.
  let eocd = -1
  const floor = Math.max(0, buf.length - 65_557)
  for (let i = buf.length - 22; i >= floor; i--) {
    if (u32(i) === 0x06054b50) {
      eocd = i
      break
    }
  }
  if (eocd === -1) return null

  const entryCount = u16(eocd + 10)
  let p = u32(eocd + 16)
  const decoder = new TextDecoder()

  for (let n = 0; n < entryCount; n++) {
    if (p + 46 > buf.length || u32(p) !== 0x02014b50) return null

    const method = u16(p + 10)
    const compressedSize = u32(p + 20)
    const nameLength = u16(p + 28)
    const extraLength = u16(p + 30)
    const commentLength = u16(p + 32)
    const localOffset = u32(p + 42)
    const name = decoder.decode(buf.subarray(p + 46, p + 46 + nameLength))

    if (name === entryName) {
      if (u32(localOffset) !== 0x04034b50) return null
      const localNameLength = u16(localOffset + 26)
      const localExtraLength = u16(localOffset + 28)
      const dataStart = localOffset + 30 + localNameLength + localExtraLength
      const data = buf.subarray(dataStart, dataStart + compressedSize)
      if (method === 0) return data
      if (method === 8) return inflateRaw(data)
      return null
    }

    p += 46 + nameLength + extraLength + commentLength
  }

  return null
}

const XML_ENTITIES: Record<string, string> = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&apos;': "'",
  '&nbsp;': ' ',
}

/**
 * Flatten WordprocessingML into plain text.
 *
 * Each <w:p> is a real paragraph, so it becomes a blank-line-separated block —
 * that's the boundary the scanner uses to find labelled fields ("Purpose:",
 * "Retention:"). A soft <w:br> stays a single newline.
 */
export function docxXmlToText(xml: string): string {
  return xml
    .replace(/<w:tab\b[^>]*\/?>/g, '\t')
    .replace(/<w:br\b[^>]*\/?>/g, '\n')
    .replace(/<\/w:p>/g, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&(?:amp|lt|gt|quot|apos|nbsp);/g, (m) => XML_ENTITIES[m] ?? m)
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(Number(d)))
}

export async function docxToText(file: File): Promise<string> {
  const buf = new Uint8Array(await file.arrayBuffer())
  const entry = await readZipEntry(buf, 'word/document.xml')
  if (!entry) throw new Error('unreadable-docx')
  return docxXmlToText(new TextDecoder().decode(entry))
}

// ---------- entry point ----------

/**
 * Extract plain text from a supported file. Throws when the format is supported
 * on paper but the file itself can't be read, so callers can surface that
 * instead of scanning an empty document.
 */
export async function extractTextFromFile(file: File): Promise<string> {
  const ext = extensionOf(file.name)

  if (ext === '.docx') {
    const text = await docxToText(file)
    return normalize(text)
  }

  const raw = await file.text()
  if (ext === '.rtf') return normalize(rtfToText(raw))
  return normalize(raw)
}

function normalize(text: string): string {
  return text
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}
