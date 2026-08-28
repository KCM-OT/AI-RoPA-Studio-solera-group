import { generateText, Output } from 'ai'
import { z } from 'zod'

export const maxDuration = 30

const FollowUpsSchema = z.object({
  followUps: z
    .array(
      z.object({
        question: z
          .string()
          .describe('A specific clarifying question prompted by one of the submitted changes.'),
        audience: z
          .enum(['business_process_owner', 'application_owner', 'vendor_owner'])
          .describe('Who is best placed to answer this question.'),
        channel: z
          .enum(['teams', 'slack'])
          .describe('The messaging channel to send the question through.'),
        rationale: z
          .string()
          .describe('One short sentence: why the analyst needs this clarified before committing.'),
      }),
    )
    .describe('Return 2-4 targeted follow-up questions driven by the nature of the changes.'),
})

interface Body {
  record: { name: string; relationships: { type: string; name: string }[] }
  submission: {
    ownerNote: string
    fieldChanges: { label: string; before: string; after: string }[]
    relationshipChanges: { action: string; type: string; name: string; inventoryId: string | null }[]
  }
}

function fallback(body: Body) {
  const followUps: {
    question: string
    audience: 'business_process_owner' | 'application_owner' | 'vendor_owner'
    channel: 'teams' | 'slack'
    rationale: string
  }[] = []
  for (const rc of body.submission.relationshipChanges) {
    if (rc.action === 'added' && rc.type === 'vendor') {
      followUps.push({
        question: `A new vendor "${rc.name}" was added. Is there a signed DPA, and where is data hosted?`,
        audience: 'vendor_owner',
        channel: 'teams',
        rationale: 'New processors need a DPA and transfer review before the record is committed.',
      })
    }
    if (rc.action === 'removed' && rc.type === 'personalData') {
      followUps.push({
        question: `You removed "${rc.name}". Has all historical data of this type been deleted or is it still retained anywhere?`,
        audience: 'business_process_owner',
        channel: 'slack',
        rationale: 'Removing a data element from collection does not always mean retained data is purged.',
      })
    }
    if (rc.action === 'added' && rc.type === 'personalData') {
      followUps.push({
        question: `You added "${rc.name}". What is the legal basis for collecting this, and for which data subjects?`,
        audience: 'business_process_owner',
        channel: 'slack',
        rationale: 'New personal data can change the legal basis and required assessments.',
      })
    }
  }
  if (followUps.length === 0) {
    followUps.push({
      question: 'Can you confirm nothing about the systems, vendors, or data has changed since last year?',
      audience: 'business_process_owner',
      channel: 'teams',
      rationale: 'An approve-as-is submission still benefits from a quick confirmation.',
    })
  }
  return { followUps: followUps.slice(0, 4) }
}

export async function POST(req: Request) {
  const body = (await req.json()) as Body

  const prompt = `You are a Privacy Operations AI assistant. A business owner has submitted recertification changes to a GDPR Article 30 record. Based on the NATURE of those changes, generate targeted follow-up questions the privacy analyst should ask before committing — and route each to the right person and channel.

Record name: ${body.record.name}
Owner's note: ${body.submission.ownerNote}
Attribute changes: ${JSON.stringify(body.submission.fieldChanges)}
Relationship changes (vendors, systems, personal data): ${JSON.stringify(body.submission.relationshipChanges)}

Rules:
- A new vendor should prompt a DPA / hosting / transfer question to the vendor owner.
- Removed personal data should prompt a question about whether retained data has been purged.
- New personal data should prompt a legal-basis question.
- Route questions to business_process_owner, application_owner, or vendor_owner as appropriate.
- Be specific to the actual changes; do not ask generic questions.`

  try {
    const { output } = await generateText({
      model: 'openai/gpt-4.1-mini',
      prompt,
      output: Output.object({ schema: FollowUpsSchema }),
    })
    return Response.json(output)
  } catch (err) {
    console.log('[v0] follow-up gen error:', err instanceof Error ? err.message : err)
    return Response.json(fallback(body))
  }
}
