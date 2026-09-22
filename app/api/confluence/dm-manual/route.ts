import { unstable_cache } from 'next/cache'
import { NextResponse } from 'next/server'
import sanitizeHtml from 'sanitize-html'

const CONFLUENCE_ORIGIN = 'https://zentrust.atlassian.net'
const PAGE_ID = '9498133029'

const getManual = unstable_cache(
  async () => {
    const email = process.env.CONFLUENCE_EMAIL
    const token = process.env.CONFLUENCE_API_TOKEN

    if (!email || !token) {
      return { kind: 'auth' as const }
    }

    const response = await fetch(
      `${CONFLUENCE_ORIGIN}/wiki/rest/api/content/${PAGE_ID}?expand=body.storage,version`,
      {
        headers: {
          Accept: 'application/json',
          Authorization: `Basic ${Buffer.from(`${email}:${token}`).toString('base64')}`,
        },
        next: { revalidate: 300 },
      },
    )

    if (response.status === 401 || response.status === 403) {
      return { kind: 'auth' as const }
    }

    if (!response.ok) {
      return { kind: 'unavailable' as const }
    }

    const page = (await response.json()) as {
      title?: string
      version?: { when?: string }
      body?: { storage?: { value?: string } }
    }
    const html = page.body?.storage?.value

    if (!html) {
      return { kind: 'unavailable' as const }
    }

    return {
      kind: 'success' as const,
      title: page.title ?? 'OneTrust Data Mapping Manual',
      updatedAt: page.version?.when ?? null,
      html: sanitizeHtml(html, {
        allowedTags: [
          ...sanitizeHtml.defaults.allowedTags,
          'h1', 'h2', 'h3', 'h4', 'table', 'thead', 'tbody', 'tr', 'th', 'td',
        ],
        allowedAttributes: {
          ...sanitizeHtml.defaults.allowedAttributes,
          a: ['href', 'name', 'target', 'rel'],
          img: ['src', 'alt', 'width', 'height'],
        },
        allowedSchemes: ['http', 'https', 'mailto'],
        transformTags: {
          a: (_tagName, attribs) => ({
            tagName: 'a',
            attribs: {
              ...attribs,
              rel: 'noreferrer noopener',
              target: '_blank',
            },
          }),
        },
      }),
    }
  },
  ['confluence-dm-manual', PAGE_ID],
  { revalidate: 300 },
)

export async function GET() {
  try {
    const result = await getManual()

    if (result.kind === 'auth') {
      return NextResponse.json({ error: 'authentication' }, { status: 502 })
    }

    if (result.kind === 'unavailable') {
      return NextResponse.json({ error: 'unavailable' }, { status: 503 })
    }

    return NextResponse.json(result, {
      headers: { 'Cache-Control': 'private, max-age=300, stale-while-revalidate=600' },
    })
  } catch {
    return NextResponse.json({ error: 'unavailable' }, { status: 503 })
  }
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

