import type {
  Asset,
  FieldKey,
  LegalBasis,
  PersonalDataCategory,
  RelationshipType,
  Vendor,
} from './types'

export const FIELD_LABELS: Record<FieldKey, string> = {
  name: 'Record name',
  description: 'Description',
  purpose: 'Purpose of processing',
  legalBasis: 'Legal basis (Art. 6)',
  managingOrganization: 'Managing organization',
  businessProcessOwner: 'Business process owner',
  dataSubjectCategories: 'Data subject categories',
  retentionPeriod: 'Retention period',
  recipients: 'Recipients',
  internationalTransfers: 'International transfers',
  securityMeasures: 'Security measures',
  jurisdiction: 'Jurisdiction',
}

// Order used when rendering the review screen.
export const FIELD_ORDER: FieldKey[] = [
  'name',
  'description',
  'purpose',
  'legalBasis',
  'dataSubjectCategories',
  'retentionPeriod',
  'recipients',
  'internationalTransfers',
  'securityMeasures',
  'managingOrganization',
  'businessProcessOwner',
  'jurisdiction',
]

function norm(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, '')
}

export function resolveInventory(
  type: RelationshipType,
  name: string,
  lists: {
    vendors: Vendor[]
    assets: Asset[]
    personalDataCategories: PersonalDataCategory[]
  },
): string | null {
  const n = norm(name)
  if (n.length < 2) return null
  const pool =
    type === 'vendor'
      ? lists.vendors
      : type === 'asset'
        ? lists.assets
        : lists.personalDataCategories
  // exact-ish match
  for (const item of pool) {
    const inm = norm(item.name)
    if (inm === n || inm.includes(n) || n.includes(inm)) return item.id
  }
  return null
}

const LEGAL_BASES: LegalBasis[] = [
  'Consent',
  'Contract',
  'Legal obligation',
  'Vital interests',
  'Public task',
  'Legitimate interests',
]

// The model may return one or several bases (e.g. "Consent, Contract").
// Pick the first recognised basis contained in the string.
export function parseLegalBasis(value: string): LegalBasis | '' {
  const v = value.toLowerCase()
  for (const b of LEGAL_BASES) {
    if (v.includes(b.toLowerCase())) return b
  }
  return ''
}

export const RELATIONSHIP_LABEL: Record<RelationshipType, string> = {
  vendor: 'Vendor',
  asset: 'Application / Asset',
  personalData: 'Personal data category',
}
