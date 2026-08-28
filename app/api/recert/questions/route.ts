import { generateText, Output } from 'ai'
import { z } from 'zod'

export const maxDuration = 30

const QuestionsSchema = z.object({
  questions: z
    .array(
      z.object({
        prompt: z
          .string()
          .describe(
            'A simple, plain-English yes/no-style question a business owner can answer without privacy expertise. E.g. "Are you still using these vendors?"',
          ),
        why: z
          .string()
          .describe('One short sentence explaining why this matters, in plain language.'),
      }),
    )
    .describe('Return 3-4 conversational recertification questions tailored to this record.'),
})

function fallback() {
  return {
    questions: [
      {
        prompt: 'Is this still a process your team owns?',
        why: 'We want to make sure the record is pointed at the right owner.',
      },
      {
        prompt: 'Are the categories of personal data below still accurate?',
        why: 'Data you collect can change over time as the process evolves.',
      },
      {
        prompt: 'Are you still using these vendors and systems?',
        why: 'Vendors and tools get swapped, and the record should match reality.',
      },
      {
        prompt: 'Has the purpose or the way you use this data changed?',
        why: 'A change in purpose can change what safeguards are required.',
      },
    ],
  }
}

export async function POST(req: Request) {
  const { record } = await req.json()

  const prompt = `You are a privacy AI assistant guiding a business owner through recertifying a processing activity. Generate simple, conversational, plain-English questions (no compliance jargon) tailored to this specific record so recertification feels like a conversation, not a form.

Record (JSON):
${JSON.stringify(record, null, 2)}

Ask about ownership, personal data collected, vendors/systems used, and whether the purpose has changed. Keep each question short and answerable by a non-expert.`

  try {
    const { output } = await generateText({
      model: 'openai/gpt-4.1-mini',
      prompt,
      output: Output.object({ schema: QuestionsSchema }),
    })
    return Response.json(output)
  } catch (err) {
    console.log('[v0] recert questions error:', err instanceof Error ? err.message : err)
    return Response.json(fallback())
  }
}
