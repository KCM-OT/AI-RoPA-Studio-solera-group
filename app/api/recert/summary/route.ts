import { generateText, Output } from 'ai'
import { z } from 'zod'

export const maxDuration = 30

const SummarySchema = z.object({
  summary: z
    .string()
    .describe(
      'A plain-English, 2-3 sentence summary of what this processing activity does, written for a business owner who is not a privacy expert.',
    ),
  changesSinceReview: z
    .array(z.string())
    .describe(
      'Bullet points describing what has changed since the last review, or notable context to be aware of. Return 2-4 items. If nothing obviously changed, note what the owner should verify.',
    ),
})

// Deterministic fallback so the demo always renders something useful.
function fallback(record: {
  name: string
  purpose: string
  lastReviewedAt: string | null
  relationships: { type: string; name: string }[]
}) {
  const vendors = record.relationships
    .filter((r) => r.type === 'vendor')
    .map((r) => r.name)
  const data = record.relationships
    .filter((r) => r.type === 'personalData')
    .map((r) => r.name)
  return {
    summary: `${record.name} exists to ${record.purpose.toLowerCase()}. It relies on ${
      vendors.length ? vendors.slice(0, 3).join(', ') : 'internal systems'
    } and processes personal data such as ${
      data.length ? data.slice(0, 3).join(', ') : 'contact details'
    }.`,
    changesSinceReview: [
      record.lastReviewedAt
        ? `This record was last reviewed on ${new Date(record.lastReviewedAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}.`
        : 'This record has not been formally reviewed before.',
      'Confirm the vendors and systems listed are still the ones in use.',
      'Confirm the categories of personal data collected are still accurate.',
      'Confirm you are still the owner of this process.',
    ],
  }
}

export async function POST(req: Request) {
  const { record } = await req.json()

  const prompt = `You are a privacy AI assistant helping a business owner recertify a GDPR Article 30 Record of Processing Activity (RoPA). Summarize the activity in plain English (no jargon) and describe what has likely changed or should be verified since the last review.

Record (JSON):
${JSON.stringify(record, null, 2)}

Write for a non-expert business owner. Be concrete and refer to the actual vendors, systems, and data categories in the record.`

  try {
    const { output } = await generateText({
      model: 'openai/gpt-4.1-mini',
      prompt,
      output: Output.object({ schema: SummarySchema }),
    })
    return Response.json(output)
  } catch (err) {
    console.log('[v0] recert summary error:', err instanceof Error ? err.message : err)
    return Response.json(fallback(record))
  }
}
