// Deterministic, rule-based stand-in for the live /api/scan model call.
//
// Used automatically when no OPENAI_API_KEY is configured (see app/api/scan/route.ts).
// It reads the same source document a real model would and extracts Article 30
// attributes and relationships using labeled-field parsing plus keyword heuristics,
// producing the same ScanResult shape the Author Wizard already knows how to render —
// confidence-scored fields with evidence, plus suggested vendor/asset/personal-data
// relationships. It never fabricates a value: fields with no textual support are omitted.

import type { ExtractedField, FieldKey, ScanResult, SuggestedRelationship } from './types'

// ---- text helpers ----

function paragraphs(text: string): string[] {
  return text
    .split(/\n\s*\n/)
    .map((p) => p.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
}

function sentences(text: string): string[] {
  // Split on paragraph boundaries first so a heading line (no terminal
  // punctuation) never fuses with the sentence that follows it.
  return paragraphs(text).flatMap((p) =>
    p
      .split(/(?<=[.!?])\s+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 3),
  )
}

function truncate(s: string, max: number): string {
  const t = s.trim()
  return t.length > max ? `${t.slice(0, max - 1).trim()}…` : t
}

function findSentenceContaining(sents: string[], needle: string): string | undefined {
  const n = needle.toLowerCase()
  return sents.find((s) => s.toLowerCase().includes(n))
}

// Matches a leading "Label: rest of paragraph" — the convention every seeded
// sample document (and most real intake forms / DPAs) already follows.
function findLabeled(
  paras: string[],
  aliases: string[],
): { content: string; raw: string } | undefined {
  for (const p of paras) {
    const m = p.match(/^([A-Za-z][A-Za-z &/]{1,40}):\s*(.+)$/s)
    if (!m) continue
    const label = m[1].trim().toLowerCase()
    if (aliases.some((a) => label === a || label.includes(a))) {
      return { content: m[2].trim(), raw: p }
    }
  }
  return undefined
}

// ---- reference vocabularies (mirrors lib/seed.ts inventory + a few unlisted names) ----

const KNOWN_VENDORS = [
  'Zendesk',
  'Mailchimp',
  'Workday',
  'Stripe',
  'Amazon Web Services',
  'AWS',
  'Salesforce',
  'Okta',
  'Snowflake',
  'Twilio',
  'HubSpot',
  'MindWell Inc.',
  'MindWell',
]

const KNOWN_ASSETS = [
  'Support Portal',
  'Marketing CRM',
  'HRIS',
  'Data Warehouse',
  'Payment Gateway',
  'Identity Provider',
  'Corporate Website',
  'Mobile App',
]

const PDC_SYNONYMS: { name: string; needles: string[]; special?: boolean }[] = [
  { name: 'Name', needles: ["customer's name", 'employee name', 'full name', ' name,', ' name.'] },
  { name: 'Email address', needles: ['email address', 'work email'] },
  { name: 'Phone number', needles: ['phone number'] },
  { name: 'Postal address', needles: ['postal address', 'mailing address'] },
  { name: 'IP address', needles: ['ip address'] },
  { name: 'Location data', needles: ['location data', 'approximate location', 'geolocation'] },
  { name: 'Device identifiers', needles: ['device identifier', 'device push token', 'push token'] },
  { name: 'Payment card data', needles: ['payment card', 'card details'] },
  { name: 'Government ID number', needles: ['government id', 'passport number', 'national id'] },
  { name: 'Employment records', needles: ['employee id', 'employment record'] },
  { name: 'Financial account data', needles: ['financial account', 'bank account'] },
  {
    name: 'Health data',
    needles: ['health data', 'mental health', 'counseling', 'medical', 'health assessment'],
    special: true,
  },
  { name: 'Biometric data', needles: ['biometric'], special: true },
  { name: 'Racial or ethnic origin', needles: ['racial', 'ethnic origin', 'ethnicity'], special: true },
]

const LEGAL_BASIS_TERMS: { canonical: string; needles: string[] }[] = [
  { canonical: 'Consent', needles: ['consent'] },
  { canonical: 'Contract', needles: ['contract', 'performance of the customer contract'] },
  { canonical: 'Legal obligation', needles: ['legal obligation', 'statutory'] },
  { canonical: 'Vital interests', needles: ['vital interest'] },
  { canonical: 'Public task', needles: ['public task'] },
  { canonical: 'Legitimate interests', needles: ['legitimate interest'] },
]

const SECURITY_TERMS = [
  'end-to-end encryption',
  'encryption at rest and in transit',
  'encryption in transit',
  'encryption',
  'tokenization',
  'pseudonymization',
  'rbac',
  'sso',
  'mfa',
  'multi-factor',
  'access control',
  'audit logging',
  'pci-dss',
  'iso 27001',
]

const JURISDICTION_TERMS = [
  'Germany',
  'France',
  'United Kingdom',
  'United States',
  'Frankfurt',
  'EU',
  'EEA',
  'Global',
]

const DOC_KIND_RULES: { kind: string; needles: string[] }[] = [
  { kind: 'Vendor contract', needles: ['data processing addendum', 'dpa', 'contract summary', 'processor'] },
  { kind: 'DPIA', needles: ['dpia', 'impact assessment'] },
  { kind: 'Intake form', needles: ['intake form', 'intake'] },
  { kind: 'Project brief', needles: ['project brief', 'overview:'] },
]

// ---- field extractors ----

function extractDocumentKind(text: string): string {
  const lower = text.toLowerCase()
  for (const rule of DOC_KIND_RULES) {
    if (rule.needles.some((n) => lower.includes(n))) return rule.kind
  }
  return 'Document'
}

function extractName(paras: string[]): ExtractedField | undefined {
  const first = paras[0] ?? ''
  const m = first.match(/^[A-Z0-9 ,&]{6,60}[—–-]\s*(.+)$/)
  if (m) {
    return {
      key: 'name',
      label: 'Record name',
      value: truncate(m[1], 70),
      confidence: 0.8,
      evidence: truncate(first, 100),
      rationale: 'Taken from the document title.',
    }
  }
  return undefined
}

function extractDescription(paras: string[]): ExtractedField | undefined {
  const overview = findLabeled(paras, ['overview', 'description'])
  if (overview) {
    return {
      key: 'description',
      label: 'Description',
      value: truncate(overview.content, 220),
      confidence: 0.85,
      evidence: truncate(overview.content, 140),
      rationale: 'Drawn from the document’s overview section.',
    }
  }
  // Don't reuse a paragraph that another field will already claim verbatim
  // (e.g. a "Purpose:" line) — that just duplicates the same text twice.
  const body = paras.find((p, i) => i > 0 && p.length > 60 && !/^[A-Za-z][A-Za-z &/]{1,40}:/.test(p))
  if (body) {
    return {
      key: 'description',
      label: 'Description',
      value: truncate(body, 220),
      confidence: 0.58,
      evidence: truncate(body, 140),
      rationale: 'Inferred from the opening paragraph; no explicit overview label found.',
    }
  }
  return undefined
}

function extractPurpose(paras: string[]): ExtractedField | undefined {
  const labeled = findLabeled(paras, ['purpose'])
  if (labeled) {
    return {
      key: 'purpose',
      label: 'Purpose of processing',
      value: truncate(labeled.content, 200),
      confidence: 0.92,
      evidence: truncate(labeled.content, 140),
      rationale: 'Explicitly stated under a "Purpose" heading.',
    }
  }
  const overview = findLabeled(paras, ['overview'])
  if (overview) {
    const first = sentences(overview.content)[0]
    if (first) {
      return {
        key: 'purpose',
        label: 'Purpose of processing',
        value: truncate(first, 180),
        confidence: 0.74,
        evidence: truncate(first, 140),
        rationale: 'Inferred from the first sentence of the overview.',
      }
    }
  }
  return undefined
}

function extractLegalBasis(text: string, sents: string[]): ExtractedField | undefined {
  const lower = text.toLowerCase()
  for (const basis of LEGAL_BASIS_TERMS) {
    const hit = basis.needles.find((n) => lower.includes(n))
    if (hit) {
      const evidenceSentence = findSentenceContaining(sents, hit) ?? hit
      const nearLabel = /legal basis/i.test(evidenceSentence) || lower.includes(`legal basis: ${hit}`)
      return {
        key: 'legalBasis',
        label: 'Legal basis (Art. 6)',
        value: basis.canonical,
        confidence: nearLabel ? 0.9 : 0.7,
        evidence: truncate(evidenceSentence, 140),
        rationale: `Document references "${hit}" as the lawful basis.`,
      }
    }
  }
  return undefined
}

function extractOwner(
  paras: string[],
): { owner?: ExtractedField; org?: ExtractedField } {
  const labeled = findLabeled(paras, ['owner', 'process owner', 'business owner'])
  if (!labeled) return {}
  const nameMatch = labeled.content.match(/\b([A-Z][a-z]+\s[A-Z][a-z]+)\b/)
  if (!nameMatch) return {}
  const owner = nameMatch[1]
  const afterName = labeled.content.slice(nameMatch.index! + owner.length)
  const orgMatch = afterName.match(/,\s*([A-Za-z &/]+?)(?:[.]|$)/)
  const org = orgMatch ? orgMatch[1].trim() : undefined

  return {
    owner: {
      key: 'businessProcessOwner',
      label: 'Business process owner',
      value: owner,
      confidence: 0.87,
      evidence: truncate(labeled.raw, 140),
      rationale: 'Named as the process/business owner.',
    },
    org: org
      ? {
          key: 'managingOrganization',
          label: 'Managing organization',
          value: org,
          confidence: 0.82,
          evidence: truncate(labeled.raw, 140),
          rationale: 'Team named alongside the process owner.',
        }
      : undefined,
  }
}

function extractDataSubjects(text: string, paras: string[]): ExtractedField | undefined {
  const labeled = findLabeled(paras, ['data subjects'])
  if (labeled) {
    return {
      key: 'dataSubjectCategories',
      label: 'Data subject categories',
      value: truncate(labeled.content, 140),
      confidence: 0.88,
      evidence: truncate(labeled.content, 140),
      rationale: 'Explicitly listed under "Data subjects".',
    }
  }
  const lower = text.toLowerCase()
  const candidates = [
    'employees',
    'customers',
    'contractors',
    'subscribers',
    'leads',
    'website visitors',
    'patients',
    'prospective customers',
  ]
  const found = candidates.filter((c) => lower.includes(c))
  if (found.length > 0) {
    return {
      key: 'dataSubjectCategories',
      label: 'Data subject categories',
      value: found.map((f) => f.replace(/^\w/, (c) => c.toUpperCase())).join(', '),
      confidence: 0.68,
      evidence: truncate(sentences(text).find((s) => found.some((f) => s.toLowerCase().includes(f))) ?? '', 140),
      rationale: 'Inferred from subject terms used in the document.',
    }
  }
  return undefined
}

function extractRetention(paras: string[], sents: string[]): ExtractedField | undefined {
  const labeled = findLabeled(paras, ['retention'])
  if (labeled) {
    return {
      key: 'retentionPeriod',
      label: 'Retention period',
      value: truncate(labeled.content, 140),
      confidence: 0.89,
      evidence: truncate(labeled.content, 140),
      rationale: 'Explicitly stated under "Retention".',
    }
  }
  const s = sents.find((x) => /\bretain(ed|s)?\b|\bstored for\b|\bdeleted\b/i.test(x))
  if (s) {
    return {
      key: 'retentionPeriod',
      label: 'Retention period',
      value: truncate(s, 140),
      confidence: 0.65,
      evidence: truncate(s, 140),
      rationale: 'Inferred from a sentence describing data retention or deletion.',
    }
  }
  return undefined
}

function extractRecipients(paras: string[]): ExtractedField | undefined {
  const labeled = findLabeled(paras, ['recipients', 'data sharing'])
  if (labeled) {
    return {
      key: 'recipients',
      label: 'Recipients',
      value: truncate(labeled.content, 140),
      confidence: 0.83,
      evidence: truncate(labeled.content, 140),
      rationale: 'Explicitly stated under "Recipients" / "Data sharing".',
    }
  }
  return undefined
}

function extractTransfers(paras: string[], sents: string[]): ExtractedField | undefined {
  const labeled = findLabeled(paras, ['processing location', 'international transfers'])
  if (labeled) {
    return {
      key: 'internationalTransfers',
      label: 'International transfers',
      value: truncate(labeled.content, 140),
      confidence: 0.86,
      evidence: truncate(labeled.content, 140),
      rationale: 'Explicitly stated under "Processing location" / "International transfers".',
    }
  }
  const s = sents.find((x) => /\bSCCs?\b|standard contractual clause|outside the (eu|eea)|no transfers/i.test(x))
  if (s) {
    return {
      key: 'internationalTransfers',
      label: 'International transfers',
      value: truncate(s, 140),
      confidence: 0.71,
      evidence: truncate(s, 140),
      rationale: 'Inferred from a sentence describing cross-border transfer safeguards.',
    }
  }
  return undefined
}

function extractSecurity(text: string, sents: string[]): ExtractedField | undefined {
  const lower = text.toLowerCase()
  const allFound = SECURITY_TERMS.filter((t) => lower.includes(t))
  // Drop a generic hit ("encryption") when a more specific phrase containing
  // it also matched ("end-to-end encryption") — otherwise both get listed.
  const found = allFound.filter((t) => !allFound.some((other) => other !== t && other.includes(t)))
  if (found.length === 0) return undefined
  // Sentence-case each term, but keep known acronyms fully uppercase. Matching
  // on an explicit set avoids mangling short connecting words ("in", "at").
  const acronyms = new Set(['rbac', 'sso', 'mfa', 'pci-dss', 'iso'])
  const labelCase = (s: string) =>
    s
      .split(' ')
      .map((w) => (acronyms.has(w.toLowerCase()) ? w.toUpperCase() : w))
      .join(' ')
      .replace(/^[a-z]/, (c) => c.toUpperCase())
  const evidence = sents.find((s) => found.some((f) => s.toLowerCase().includes(f)))
  return {
    key: 'securityMeasures',
    label: 'Security measures',
    value: Array.from(new Set(found.map(labelCase))).join(', '),
    confidence: 0.78,
    evidence: truncate(evidence ?? found.join(', '), 140),
    rationale: 'Security controls named directly in the document.',
  }
}

function extractJurisdiction(text: string, sents: string[]): ExtractedField | undefined {
  const found = JURISDICTION_TERMS.find((j) => text.includes(j))
  if (!found) return undefined
  const evidence = findSentenceContaining(sents, found) ?? found
  return {
    key: 'jurisdiction',
    label: 'Jurisdiction',
    value: found === 'Frankfurt' ? 'Germany (EU)' : found,
    confidence: found === 'Global' ? 0.55 : 0.75,
    evidence: truncate(evidence, 140),
    rationale: 'Region or country named in the document.',
  }
}

function extractRelationships(text: string, sents: string[]): SuggestedRelationship[] {
  const out: SuggestedRelationship[] = []

  // Longest names first so "MindWell Inc." claims the mention before the
  // shorter "MindWell" alias would otherwise match it a second time.
  const addedVendorNames: string[] = []
  const sortedVendors = [...KNOWN_VENDORS].sort((a, b) => b.length - a.length)
  for (const vendor of sortedVendors) {
    if (!text.includes(vendor)) continue
    const overlapsExisting = addedVendorNames.some(
      (added) => added.includes(vendor) || vendor.includes(added),
    )
    if (overlapsExisting) continue
    addedVendorNames.push(vendor)
    const evidence = findSentenceContaining(sents, vendor) ?? vendor
    out.push({
      type: 'vendor',
      name: vendor,
      confidence: 0.91,
      evidence: truncate(evidence, 140),
      rationale: `"${vendor}" named directly in the document.`,
    })
  }

  for (const asset of KNOWN_ASSETS) {
    if (!text.includes(asset)) continue
    out.push({
      type: 'asset',
      name: asset,
      confidence: 0.84,
      evidence: truncate(findSentenceContaining(sents, asset) ?? asset, 140),
      rationale: `"${asset}" named directly in the document.`,
    })
  }
  // Generic system nouns the seeded inventory doesn't already cover.
  if (/mobile app/i.test(text) && !out.some((r) => r.name === 'Mobile App')) {
    out.push({
      type: 'asset',
      name: 'Mobile App',
      confidence: 0.72,
      evidence: truncate(findSentenceContaining(sents, 'mobile app') ?? 'mobile app', 140),
      rationale: 'Mobile application referenced as a processing system.',
    })
  }

  const lower = text.toLowerCase()
  for (const pdc of PDC_SYNONYMS) {
    const hit = pdc.needles.find((n) => lower.includes(n))
    if (!hit) continue
    out.push({
      type: 'personalData',
      name: pdc.name,
      confidence: pdc.special ? 0.8 : 0.87,
      evidence: truncate(findSentenceContaining(sents, hit) ?? hit, 140),
      rationale: pdc.special
        ? `Special-category data (Art. 9) — flagged for extra care.`
        : `"${hit}" referenced as data processed.`,
    })
  }

  return out
}

// ---- entry point ----

export function simulateScan(text: string): ScanResult {
  const paras = paragraphs(text)
  const sents = sentences(text)

  const documentKind = extractDocumentKind(text)
  const { owner, org } = extractOwner(paras)

  const fields: ExtractedField[] = [
    extractName(paras),
    extractDescription(paras),
    extractPurpose(paras),
    extractLegalBasis(text, sents),
    org,
    owner,
    extractDataSubjects(text, paras),
    extractRetention(paras, sents),
    extractRecipients(paras),
    extractTransfers(paras, sents),
    extractSecurity(text, sents),
    extractJurisdiction(text, sents),
  ].filter((f): f is ExtractedField => Boolean(f))

  const relationships = extractRelationships(text, sents)

  const purposeField = fields.find((f) => f.key === 'purpose')
  const descriptionField = fields.find((f) => f.key === 'description')
  const summary =
    purposeField?.value ??
    (descriptionField ? truncate(descriptionField.value, 160) : truncate(sents[0] ?? text, 160))

  return { documentKind, summary, fields, relationships }
}

// Keep the field-key ordering in one place so route.ts and the wizard agree
// on what "no attributes found" means (an empty array, never a guess).
export const MOCK_SCAN_FIELD_KEYS: FieldKey[] = [
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
]
