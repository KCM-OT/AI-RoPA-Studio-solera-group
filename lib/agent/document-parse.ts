// Server-side text extraction for documents uploaded in the RoPA Authoring chat.
// Supports the four formats offered by the "Upload document" menu item: .docx, .rtf, .txt, .pdf

export type SupportedDocumentKind = 'docx' | 'rtf' | 'txt' | 'pdf'

export class UnsupportedDocumentError extends Error {
  constructor(extension: string) {
    super(`Unsupported file type "${extension}". Please upload a .docx, .rtf, .txt, or .pdf file.`)
    this.name = 'UnsupportedDocumentError'
  }
}

export class EmptyDocumentError extends Error {
  constructor() {
    super('No readable text was found in this document.')
    this.name = 'EmptyDocumentError'
  }
}

const EXTENSION_MAP: Record<string, SupportedDocumentKind> = {
  docx: 'docx',
  rtf: 'rtf',
  txt: 'txt',
  pdf: 'pdf',
}

export function detectDocumentKind(filename: string, mimeType: string): SupportedDocumentKind {
  const extension = filename.split('.').pop()?.toLowerCase() ?? ''
  if (EXTENSION_MAP[extension]) return EXTENSION_MAP[extension]

  if (mimeType === 'application/pdf') return 'pdf'
  if (mimeType === 'text/plain') return 'txt'
  if (mimeType === 'text/rtf' || mimeType === 'application/rtf') return 'rtf'
  if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') return 'docx'

  throw new UnsupportedDocumentError(extension || mimeType || 'unknown')
}

async function extractDocx(buffer: Buffer): Promise<string> {
  const mammoth = await import('mammoth')
  const { value } = await mammoth.extractRawText({ buffer })
  return value
}

async function extractPdf(buffer: Buffer): Promise<string> {
  const { PDFParse } = await import('pdf-parse')
  const parser = new PDFParse({ data: new Uint8Array(buffer) })
  try {
    const result = await parser.getText()
    return result.text
  } finally {
    await parser.destroy?.()
  }
}

function extractTxt(buffer: Buffer): string {
  return buffer.toString('utf-8')
}

// Lightweight RTF-to-text converter. Walks the token stream by hand (rather than
// a regex strip) so nested control groups like {\fonttbl ...} and {\colortbl ...}
// can be skipped without swallowing real document text.
function extractRtf(buffer: Buffer): string {
  const input = buffer.toString('latin1')
  const SKIP_KEYWORDS = new Set([
    'fonttbl',
    'colortbl',
    'stylesheet',
    'info',
    'pict',
    'object',
    'xe',
    'tc',
    'field',
    'datafield',
    'bkmkstart',
    'bkmkend',
    'header',
    'footer',
    'footnote',
    'themedata',
    'colorschememapping',
    'latentstyles',
    'listtable',
    'listoverridetable',
    'rsid',
    'generator',
    'nonshppict',
    'shppict',
  ])

  let out = ''
  let i = 0
  const n = input.length
  // Each stack entry tracks whether text inside that group level should be skipped.
  const skipStack: boolean[] = [false]

  const currentlySkipping = () => skipStack[skipStack.length - 1]

  while (i < n) {
    const ch = input[i]

    if (ch === '{') {
      skipStack.push(currentlySkipping())
      i += 1
      continue
    }
    if (ch === '}') {
      if (skipStack.length > 1) skipStack.pop()
      i += 1
      continue
    }
    if (ch === '\\') {
      // Control word: \wordNNN optionally followed by one delimiter space.
      const match = /^\\([a-zA-Z]+)(-?\d+)?(\s)?/.exec(input.slice(i))
      if (match) {
        const [full, word] = match
        if (word === 'par' || word === 'line') {
          if (!currentlySkipping()) out += '\n'
        } else if (word === 'tab') {
          if (!currentlySkipping()) out += '\t'
        } else if (word === '*' as string) {
          // handled below
        } else if (SKIP_KEYWORDS.has(word)) {
          skipStack[skipStack.length - 1] = true
        }
        i += full.length
        continue
      }
      // \*  extended-control marker: mark this group skippable if unrecognized later
      if (input[i + 1] === '*') {
        i += 2
        continue
      }
      // Escaped hex byte: \'hh
      const hexMatch = /^\\'([0-9a-fA-F]{2})/.exec(input.slice(i))
      if (hexMatch) {
        if (!currentlySkipping()) {
          out += String.fromCharCode(Number.parseInt(hexMatch[1], 16))
        }
        i += hexMatch[0].length
        continue
      }
      // Escaped literal characters: \\ \{ \}
      const literal = input[i + 1]
      if (literal === '\\' || literal === '{' || literal === '}') {
        if (!currentlySkipping()) out += literal
        i += 2
        continue
      }
      // Unrecognized escape — skip the backslash and next char.
      i += 2
      continue
    }

    if (!currentlySkipping()) out += ch
    i += 1
  }

  return out
    .replace(/\r/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

const MAX_EXTRACTED_CHARS = 20000

export async function parseDocumentText(buffer: Buffer, filename: string, mimeType: string): Promise<string> {
  const kind = detectDocumentKind(filename, mimeType)

  let text: string
  switch (kind) {
    case 'docx':
      text = await extractDocx(buffer)
      break
    case 'pdf':
      text = await extractPdf(buffer)
      break
    case 'rtf':
      text = extractRtf(buffer)
      break
    case 'txt':
      text = extractTxt(buffer)
      break
  }

  const trimmed = text.replace(/[ \t]+\n/g, '\n').trim()
  if (!trimmed) throw new EmptyDocumentError()

  return trimmed.length > MAX_EXTRACTED_CHARS ? `${trimmed.slice(0, MAX_EXTRACTED_CHARS)}\n\n[truncated]` : trimmed
}
