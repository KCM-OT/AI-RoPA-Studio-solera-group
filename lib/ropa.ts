import type { ProcessingActivity, RecordStatus } from './types'

export function confidenceBand(c: number): 'high' | 'medium' | 'low' {
  if (c >= 0.85) return 'high'
  if (c >= 0.6) return 'medium'
  return 'low'
}

export const CONFIDENCE_LABEL: Record<'high' | 'medium' | 'low', string> = {
  high: 'High confidence',
  medium: 'Needs review',
  low: 'Low confidence',
}

export function formatDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export function relativeDays(iso: string | null): number | null {
  if (!iso) return null
  const ms = new Date(iso).getTime() - Date.now()
  return Math.round(ms / (1000 * 60 * 60 * 24))
}

export type ReviewState = 'ok' | 'due_soon' | 'overdue' | 'none'

export function reviewState(pa: ProcessingActivity): ReviewState {
  if (!pa.nextReviewAt) return 'none'
  const days = relativeDays(pa.nextReviewAt)
  if (days === null) return 'none'
  if (days < 0) return 'overdue'
  if (days <= 30) return 'due_soon'
  return 'ok'
}

export const STATUS_LABEL: Record<RecordStatus, string> = {
  draft: 'Draft',
  active: 'Active',
  under_review: 'Under review',
  archived: 'Archived',
}

// Article 30 completeness: share of core attributes + relationships populated.
export function completeness(pa: ProcessingActivity): number {
  const coreFields: (keyof ProcessingActivity)[] = [
    'name',
    'description',
    'purpose',
    'legalBasis',
    'managingOrganization',
    'businessProcessOwner',
    'retentionPeriod',
    'recipients',
    'internationalTransfers',
    'securityMeasures',
  ]
  let filled = 0
  for (const f of coreFields) {
    const v = pa[f]
    if (typeof v === 'string' && v.trim().length > 0) filled++
  }
  const total = coreFields.length + 3 // +1 data subjects, +1 vendor/asset, +1 personal data
  if (pa.dataSubjectCategories.length > 0) filled++
  if (pa.relationships.some((r) => r.type === 'vendor' || r.type === 'asset')) filled++
  if (pa.relationships.some((r) => r.type === 'personalData')) filled++
  return Math.round((filled / total) * 100)
}

export function hasVendorOrAsset(pa: ProcessingActivity): boolean {
  return pa.relationships.some(
    (r) => (r.type === 'vendor' || r.type === 'asset') && r.status === 'accepted',
  )
}

export interface Metrics {
  total: number
  createdWithAI: number
  updatedWithAI: number
  withVendorOrAsset: number
  overdue: number
  dueSoon: number
  avgCompleteness: number
  pctCreatedWithAI: number
  pctWithRelationship: number
}

export function computeMetrics(activities: ProcessingActivity[]): Metrics {
  const total = activities.length || 1
  const createdWithAI = activities.filter((a) => a.createdWithAI).length
  const updatedWithAI = activities.filter((a) => a.updatedWithAI).length
  const withVendorOrAsset = activities.filter(hasVendorOrAsset).length
  const overdue = activities.filter((a) => reviewState(a) === 'overdue').length
  const dueSoon = activities.filter((a) => reviewState(a) === 'due_soon').length
  const avgCompleteness = Math.round(
    activities.reduce((s, a) => s + completeness(a), 0) / total,
  )
  return {
    total: activities.length,
    createdWithAI,
    updatedWithAI,
    withVendorOrAsset,
    overdue,
    dueSoon,
    avgCompleteness,
    pctCreatedWithAI: Math.round((createdWithAI / total) * 100),
    pctWithRelationship: Math.round((withVendorOrAsset / total) * 100),
  }
}
