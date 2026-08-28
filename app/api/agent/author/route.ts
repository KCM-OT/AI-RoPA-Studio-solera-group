import { streamText, convertToModelMessages, stepCountIs, tool, type UIMessage } from 'ai'
import { z } from 'zod'
import { extractFromNarrative } from '@/lib/agent/extract'

export const maxDuration = 60

const MODEL = 'openai/gpt-4.1-mini'

const SYSTEM = `You are the RoPA Authoring Agent for a privacy team. You help a business user create a GDPR Article 30 "Record of Processing Activity" through natural conversation — no forms, no jargon.

How you work:
- Your goal is to end up with a complete, defensible processing-activity record and hand it off for the human to save.
- Talk like a helpful colleague. Ask for a plain-English description of what the team does with people's data. One or two friendly questions at a time — never a wall of questions.
- The moment the user has described the activity in any detail (even a rough paragraph, a pasted SOP, or an email), call the "extractRecord" tool to turn their words into structured fields. Do NOT try to fill the fields yourself in prose.
- After extraction, briefly tell the user what you captured and what is still thin or missing. Ask targeted follow-ups to fill real gaps (legal basis, retention, cross-border transfers, automated decisions).
- When the user gives more detail, call "extractRecord" again with the fuller narrative so the draft improves.
- When the record looks reasonably complete, call "proposeRecord" exactly once to present the final draft card for the human to review and save. Then stop and let them decide.

Rules:
- Never invent specifics the user did not imply. If something is unknown, mark it as a gap rather than guessing.
- Keep prose short. The structured cards do the heavy lifting.
- You cannot save records yourself — a human always reviews and commits. Make that clear when you propose.`

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json()

  const result = streamText({
    model: MODEL,
    system: SYSTEM,
    messages: await convertToModelMessages(messages),
    stopWhen: stepCountIs(6),
    tools: {
      // Server-executed: runs the LLM extraction and streams a draft card back.
      extractRecord: tool({
        description:
          'Convert the user\'s free-text description of a processing activity into structured Article 30 fields. Call whenever the user has provided new detail about what they do with personal data.',
        inputSchema: z.object({
          narrative: z
            .string()
            .describe(
              'The full free-text description of the processing activity, combining everything the user has said so far.',
            ),
        }),
        async execute({ narrative }) {
          const draft = await extractFromNarrative(narrative)
          return draft
        },
      }),
      // Client-rendered handoff: no execute, resolved by the human in the UI.
      proposeRecord: tool({
        description:
          'Present the finished draft record to the human for review and saving. Call once when the record is reasonably complete. The human reviews and commits — you cannot save.',
        inputSchema: z.object({
          summary: z
            .string()
            .describe('One or two sentences summarizing the activity, for the review card header.'),
        }),
      }),
    },
  })

  return result.toUIMessageStreamResponse()
}
