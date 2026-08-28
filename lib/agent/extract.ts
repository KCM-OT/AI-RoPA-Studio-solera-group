import 'server-only'
import { generateText, Output } from 'ai'
import { z } from 'zod'
import { simulateScan } from '@/lib/mock-scan'
import type { ScanResult } from '@/lib/types'
import { FIELD_KEYS } from './schemas'

// Shared Article 30 extraction used by the Author agent's `extractRecord` tool.
// Runs a real model call through the Vercel AI Gateway (zero-config auth in v0
// and on Vercel) and falls back to deterministic rule-based extraction if the
// call fails, so the flow always produces a reviewable draft.

const scanSchema = z.object({
  documentKind: z
    .string()
    .describe('Best guess at the source type, e.g. "Process description", "Vendor contract", "DPIA".'),
  summary: z
    .string()
    .describe('One or two sentence plain-language summary of the processing activity described.'),
  fields: z.array(
    z.object({
      key: z.enum(FIELD_KEYS),
      label: z.string().describe('Human readable field name.'),
      value: z
        .string()
        .describe('Extracted value. For list-like fields use a comma-separated string.'),
      confidence: z
        .number()
        .min(0)
        .max(1)
        .describe('0-1 confidence the value is supported by what the user said.'),
      evidence: z.string().describe('A short verbatim quote from the narrative that supports the value.'),
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

const SYSTEM = `You are a privacy operations assistant that helps privacy teams author GDPR Article 30 Records of Processing Activity (RoPA) from a plain-English description a business user typed in conversation.

Extract structured RoPA attributes ONLY from what the user actually said. Rules:
- Never fabricate values. If the narrative does not support a field, omit it entirely — a missing field is a signal to ask a follow-up, not to guess.
- "legalBasis" must be one of: Consent, Contract, Legal obligation, Vital interests, Public task, Legitimate interests.
- Set confidence honestly: >= 0.85 only when the user stated the value explicitly; 0.6-0.84 when strongly implied; below 0.6 for weak inferences.
- "evidence" must be a short verbatim phrase copied from the narrative.
- Relationships: classify third-party companies/processors as "vendor", internal systems/applications/data stores as "asset", and categories of personal data (e.g. name, email, health data) as "personalData".
- Flag special category (Art. 9) data clearly in the rationale when present.`

// Turn a free-text narrative into a structured Article 30 draft.
export async function extractFromNarrative(narrative: string): Promise<ScanResult> {
  try {
    const { output } = await generateText({
      model: 'openai/gpt-4.1-mini',
      output: Output.object({ schema: scanSchema }),
      system: SYSTEM,
      prompt: `Extract Article 30 attributes to draft a processing-activity record from this description:\n\n--- DESCRIPTION ---\n${narrative}\n--- END ---`,
    })
    return output as ScanResult
  } catch (err) {
    console.log(
      '[v0] extractFromNarrative fallback to simulateScan:',
      err instanceof Error ? err.message : err,
    )
    return simulateScan(narrative)
  }
}
