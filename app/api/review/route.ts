import { generateText, Output } from 'ai'
import { z } from 'zod'

export const maxDuration = 30

const ReviewSchema = z.object({
  overallAssessment: z
    .string()
    .describe('One or two sentences summarizing the health of this RoPA record.'),
  staleness: z
    .enum(['fresh', 'aging', 'stale'])
    .describe('Whether the record likely reflects current processing reality.'),
  findings: z
    .array(
      z.object({
        field: z.string().describe('The Article 30 attribute or area of concern.'),
        severity: z.enum(['info', 'warning', 'critical']),
        issue: z.string().describe('What is missing, inconsistent, or likely outdated.'),
        suggestion: z.string().describe('A concrete, specific recommended change.'),
      }),
    )
    .describe('Specific, actionable findings. Return 2-5.'),
})

export async function POST(req: Request) {
  const { record } = await req.json()

  const prompt = `You are a privacy operations agent reviewing a GDPR Article 30 Record of Processing Activity (RoPA) for completeness, internal consistency, and likely staleness. Be specific and practical — a DPO will act on your findings.

Record (JSON):
${JSON.stringify(record, null, 2)}

Evaluate:
- Missing or vague Article 30 attributes (purpose, legal basis, retention, recipients, international transfers, security measures, data subject categories).
- Internal inconsistencies (e.g. transfers described but no safeguard mentioned; special-category data with only "Legitimate interests").
- Signals of staleness given the last reviewed date and update history.
- Whether linked vendors/assets/personal-data categories look complete for the described purpose.

Return an overall assessment, a staleness rating, and 2-5 concrete findings.`

  try {
    const { output } = await generateText({
      model: 'openai/gpt-4.1-mini',
      prompt,
      output: Output.object({ schema: ReviewSchema }),
    })
    return Response.json(output)
  } catch (err) {
    console.log('[v0] review error:', err instanceof Error ? err.message : err)
    return Response.json({ error: 'Review failed' }, { status: 500 })
  }
}
