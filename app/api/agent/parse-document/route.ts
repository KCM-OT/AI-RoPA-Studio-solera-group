import { EmptyDocumentError, UnsupportedDocumentError, parseDocumentText } from '@/lib/agent/document-parse'

export const runtime = 'nodejs'
export const maxDuration = 60

const MAX_FILE_BYTES = 15 * 1024 * 1024 // 15 MB

export async function POST(req: Request) {
  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return Response.json({ error: 'Could not read the uploaded file.' }, { status: 400 })
  }

  const file = formData.get('file')
  if (!(file instanceof File)) {
    return Response.json({ error: 'No file was provided.' }, { status: 400 })
  }

  if (file.size === 0) {
    return Response.json({ error: 'That file is empty.' }, { status: 400 })
  }

  if (file.size > MAX_FILE_BYTES) {
    return Response.json({ error: 'That file is larger than the 15 MB upload limit.' }, { status: 413 })
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer())
    const text = await parseDocumentText(buffer, file.name, file.type)
    return Response.json({ filename: file.name, text })
  } catch (error) {
    if (error instanceof UnsupportedDocumentError) {
      return Response.json({ error: error.message }, { status: 415 })
    }
    if (error instanceof EmptyDocumentError) {
      return Response.json({ error: error.message }, { status: 422 })
    }
    console.error('[v0] Failed to parse uploaded document:', error)
    return Response.json(
      { error: "Something went wrong reading that document. Please try again or paste the text instead." },
      { status: 500 },
    )
  }
}
