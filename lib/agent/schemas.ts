import { z } from 'zod'
import type { ScanResult } from '@/lib/types'

// Article 30 attribute keys the agent can extract or change. Kept in one place
// so the server routes, the client renderers, and the zod tool schemas agree.
export const FIELD_KEYS = [
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

// ---------------------------------------------------------------------------
// Author agent — one server-executed tool that extracts a RoPA draft/update
// from a source document. The result is rendered as an editable review card.
// ---------------------------------------------------------------------------

export const extractRecordInput = z.object({
  documentText: z
    .string()
    .describe('The full source document text to extract Article 30 attributes from.'),
  mode: z
    .enum(['create', 'enrich'])
    .describe('create = draft a brand new record; enrich = add attributes to an existing record.'),
  existingRecordName: z
    .string()
    .optional()
    .describe('When mode is "enrich", the name of the existing record the user wants to update.'),
  documentTitle: z
    .string()
    .optional()
    .describe('A short human label for the source document, e.g. "TalentSprint DPA".'),
})
export type ExtractRecordInput = z.infer<typeof extractRecordInput>

// The tool returns the raw extraction plus the echoed context the client needs
// to resolve inventory matches and commit to the right record.
export type ExtractRecordOutput = ScanResult & {
  mode: 'create' | 'enrich'
  existingRecordName?: string
  documentTitle?: string
}

// ---------------------------------------------------------------------------
// Recertification agent — client-interaction tools (no execute). The model
// emits these; the client renders approval/diff cards and returns the outcome.
// ---------------------------------------------------------------------------

export const proposeChangeInput = z.object({
  changeType: z.enum(['field', 'relationship']),
  fieldKey: z
    .enum(FIELD_KEYS)
    .optional()
    .describe('For a field change: which Article 30 attribute is changing.'),
  after: z
    .string()
    .optional()
    .describe('For a field change: the new value, in plain text.'),
  relAction: z
    .enum(['added', 'removed'])
    .optional()
    .describe('For a relationship change: whether a vendor/system/data type is being added or removed.'),
  relType: z
    .enum(['vendor', 'asset', 'personalData'])
    .optional()
    .describe('For a relationship change: vendor, asset (system/application), or personalData category.'),
  relName: z
    .string()
    .optional()
    .describe('For a relationship change: the name of the vendor, system, or personal-data category.'),
  reason: z
    .string()
    .describe("One short, plain-English sentence explaining the change in the owner's own words."),
})
export type ProposeChangeInput = z.infer<typeof proposeChangeInput>

export const submitForReviewInput = z.object({
  summary: z
    .string()
    .describe(
      'A short, plain-English recap of the conversation and what is changing (or a note that nothing changed).',
    ),
  ownerNote: z
    .string()
    .optional()
    .describe('Any extra note from the owner to pass along to the privacy analyst.'),
  reassignOwnershipTo: z
    .string()
    .optional()
    .describe('If ownership of this activity should move to another team, name that team.'),
})
export type SubmitForReviewInput = z.infer<typeof submitForReviewInput>
