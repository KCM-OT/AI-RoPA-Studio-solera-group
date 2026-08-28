import { streamText, convertToModelMessages, stepCountIs, tool, type UIMessage } from 'ai'
import { proposeChangeInput, submitForReviewInput } from '@/lib/agent/schemas'

export const maxDuration = 60

const MODEL = 'openai/gpt-4.1-mini'

interface RecordContext {
  name: string
  purpose: string
  legalBasis: string
  retentionPeriod: string
  businessProcessOwner: string
  dataSubjectCategories: string
  relationships: { type: string; name: string }[]
  lastReviewedAt: string | null
}

function buildSystem(record: RecordContext) {
  return `You are the RoPA Recertification Agent. Once a year, a business process owner has to confirm that a GDPR Article 30 record still reflects reality. Your job is to walk them through it as a friendly conversation — in plain English, never legal or technical jargon.

You are recertifying THIS record:
- Name: ${record.name}
- What it's for: ${record.purpose}
- Legal basis: ${record.legalBasis || 'not set'}
- How long data is kept: ${record.retentionPeriod || 'not set'}
- Team that owns it: ${record.businessProcessOwner || 'not set'}
- Whose data: ${record.dataSubjectCategories || 'not set'}
- Currently linked vendors/systems/data: ${
    record.relationships.map((r) => `${r.name} (${r.type})`).join(', ') || 'none'
  }
- Last recertified: ${record.lastReviewedAt ?? 'never'}

How you work:
- Open warmly and tell them what this record is, in one sentence, so they recognise it.
- Ask ONE simple question at a time, in everyday language. Examples: "Is your team still the one that runs this?", "Are you still using all of these tools?", "Are you collecting anything new about people?", "Do you still keep the data for about that long?"
- Translate their answers into concrete changes. When something has actually changed, call the "proposeChange" tool ONCE PER CHANGE to put a clear before/after card in front of them. Do not batch multiple changes into one call.
  - Adding/removing a vendor or system => changeType "relationship" with relAction and relType.
  - Adding/removing a type of personal data => changeType "relationship", relType "personalData".
  - A different retention period, owner, purpose, etc. => changeType "field" with fieldKey and the new value.
- Never propose a change the user did not actually confirm. If nothing changed for a topic, just move on.
- When you have covered ownership, tools/systems, personal data, and retention, and there is nothing left to ask, call "submitForReview" ONCE to hand the whole thing to a privacy analyst. Summarise what is changing (or that nothing changed) in plain English.
- Be concise and human. The cards carry the detail; your text should feel like a helpful colleague, not a form.
- Make clear you are not the final approver: a privacy analyst reviews and commits everything.`
}

export async function POST(req: Request) {
  const { messages, record }: { messages: UIMessage[]; record: RecordContext } =
    await req.json()

  const result = streamText({
    model: MODEL,
    system: buildSystem(record),
    messages: await convertToModelMessages(messages),
    stopWhen: stepCountIs(6),
    tools: {
      // Client-rendered approval card. No execute — the human accepts/edits/rejects
      // in the UI, and the outcome is returned as the tool result.
      proposeChange: tool({
        description:
          'Put a single confirmed change in front of the owner as a before/after card for them to accept, edit, or reject. Call once per individual change.',
        inputSchema: proposeChangeInput,
      }),
      // Client-rendered final handoff to the privacy analyst.
      submitForReview: tool({
        description:
          'Hand the completed recertification to a privacy analyst for review and commit. Call once at the very end.',
        inputSchema: submitForReviewInput,
      }),
    },
  })

  return result.toUIMessageStreamResponse()
}
