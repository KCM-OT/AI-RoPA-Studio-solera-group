import { generateText, Output } from 'ai'
import { openai } from '@ai-sdk/openai'
import { z } from 'zod'
import { simulateScan } from '@/lib/mock-scan'

export const maxDuration = 60

const fieldKeys = [
  'name',
  'description',
  'purpose',
  'legalBasis',
  'managingOrganization',
  'businessProcessOwner',
  'dataSubjectCategories',
  'retentionPeriod',
  'recipients',
  'internationalTransfers',
  'securityMeasures',
  'jurisdiction',
] as const

const scanSchema = z.object({
  documentKind: z
    .string()
    .describe('Best guess at the document type, e.g. "Vendor contract", "DPIA", "Project brief", "Intake form".'),
  summary: z.string().describe('One or two sentence plain-language summary of the processing activity described.'),
  fields: z.array(
    z.object({
      key: z.enum(fieldKeys),
      label: z.string().describe('Human readable field name.'),
      value: z
        .string()
        .describe('Extracted value. For list-like fields (data subject categories) use a comma-separated string.'),
      confidence: z
        .number()
        .min(0)
        .max(1)
        .describe('0-1 confidence that this value is directly supported by the document.'),
      evidence: z.string().describe('A short verbatim quote from the document that supports the value.'),
      rationale: z.string().describe('One short sentence explaining the extraction.'),
    }),
  ),
  relationships: z.array(
    z.object({
      type: z.enum(['vendor', 'asset', 'personalData']),
      name: z.string(),
      confidence: z.number().min(0).max(1),
      evidence: z.string(),
      rationale: z.string(),
    }),
  ),
})

const SYSTEM = `You are a privacy operations assistant that helps privacy teams author and maintain GDPR Article 30 Records of Processing Activity (RoPA).

Extract structured RoPA attributes ONLY from the provided source document. Rules:
- Never fabricate values. If the document does not support a field, omit it entirely.
- "legalBasis" must be one of: Consent, Contract, Legal obligation, Vital interests, Public task, Legitimate interests.
- Set confidence honestly: use >= 0.85 only when the document states the value explicitly; 0.6-0.84 when it is strongly implied; below 0.6 when it is a weak inference.
- "evidence" must be a short verbatim phrase copied from the document.
- Relationships: classify third-party companies/processors as "vendor", internal systems/applications/data stores as "asset", and categories of personal data (e.g. name, email, health data) as "personalData".
- Flag special category (Art. 9) data clearly in the rationale when present.`

export async function POST(req: Request) {
  try {
    const { text, mode, existingName } = (await req.json()) as {
      text: string
      mode?: 'create' | 'enrich'
      existingName?: string
    }

    if (!text || text.trim().length < 20) {
      return Response.json({ error: 'Document text is too short to scan.' }, { status: 400 })
    }

    // Live model call — used automatically once OPENAI_API_KEY is configured.
    if (process.env.OPENAI_API_KEY) {
      const task =
        mode === 'enrich' && existingName
          ? `Scan this document to find NEW or UPDATED attributes and relationships for the existing processing activity "${existingName}".`
          : `Scan this document and extract attributes to draft a NEW processing activity record.`

      const { output } = await generateText({
        model: openai('gpt-4.1-mini'),
        output: Output.object({ schema: scanSchema }),
        system: SYSTEM,
        prompt: `${task}\n\n--- SOURCE DOCUMENT ---\n${text}\n--- END DOCUMENT ---`,
      })

      return Response.json(output)
    }

    // No API key configured — simulate the scan with rule-based Article 30
    // extraction instead of a live model call. Same output shape, same UI.
    await new Promise((resolve) => setTimeout(resolve, 1500))
    return Response.json(simulateScan(text))
  } catch (err) {
    console.error('[v0] scan error', err)
    return Response.json(
      { error: 'The agent could not scan this document. Please try again.' },
      { status: 500 },
    )
  }
}
