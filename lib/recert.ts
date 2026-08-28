import type {
  ChangeSubmission,
  FollowUpAudience,
  FollowUpChannel,
  ProcessingActivity,
  Relationship,
  RelationshipChange,
  RelationshipType,
  SubmissionStatus,
} from './types'

export const SUBMISSION_STATUS_LABEL: Record<SubmissionStatus, string> = {
  pending_review: 'Pending review',
  changes_requested: 'Changes requested',
  approved: 'Approved',
  committed: 'Committed',
}

export const AUDIENCE_LABEL: Record<FollowUpAudience, string> = {
  business_process_owner: 'Business process owner',
  application_owner: 'Application owner',
  vendor_owner: 'Vendor owner',
}

export const CHANNEL_LABEL: Record<FollowUpChannel, string> = {
  teams: 'Microsoft Teams',
  slack: 'Slack',
}

export const RELATIONSHIP_GROUP_LABEL: Record<RelationshipType, string> = {
  vendor: 'Vendors',
  asset: 'Systems & assets',
  personalData: 'Personal data',
}

// Total number of discrete changes represented by a submission.
export function changeCount(s: ChangeSubmission): number {
  return s.fieldChanges.length + s.relationshipChanges.length
}

// Build relationship diffs by comparing a starting relationship set with the
// owner's edited working set (matched on type + normalized name).
export function diffRelationships(
  before: Relationship[],
  after: Relationship[],
): RelationshipChange[] {
  const key = (type: RelationshipType, name: string) =>
    `${type}::${name.trim().toLowerCase()}`
  const beforeMap = new Map(before.map((r) => [key(r.type, r.name), r]))
  const afterMap = new Map(after.map((r) => [key(r.type, r.name), r]))
  const changes: RelationshipChange[] = []

  for (const r of after) {
    if (!beforeMap.has(key(r.type, r.name))) {
      changes.push({
        action: 'added',
        type: r.type,
        name: r.name,
        inventoryId: r.inventoryId,
      })
    }
  }
  for (const r of before) {
    if (!afterMap.has(key(r.type, r.name))) {
      changes.push({
        action: 'removed',
        type: r.type,
        name: r.name,
        inventoryId: r.inventoryId,
      })
    }
  }
  return changes
}

// Apply a submission's changes to a processing activity, returning a patch.
export function applySubmission(
  record: ProcessingActivity,
  submission: ChangeSubmission,
): Partial<ProcessingActivity> {
  // Start from current relationships.
  let rels = [...record.relationships]

  for (const change of submission.relationshipChanges) {
    const matches = (r: Relationship) =>
      r.type === change.type &&
      r.name.trim().toLowerCase() === change.name.trim().toLowerCase()
    if (change.action === 'removed') {
      rels = rels.filter((r) => !matches(r))
    } else if (change.action === 'added' && !rels.some(matches)) {
      rels.push({
        id: `rel-${Math.random().toString(36).slice(2, 9)}`,
        type: change.type,
        name: change.name,
        inventoryId: change.inventoryId,
        provenance: 'manual',
        status: 'accepted',
      })
    }
  }

  // Apply attribute changes.
  const patch: Partial<ProcessingActivity> = { relationships: rels }
  const meta = { ...record.fieldMeta }
  for (const fc of submission.fieldChanges) {
    if (fc.key === 'dataSubjectCategories') {
      patch.dataSubjectCategories = fc.after
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(patch as any)[fc.key] = fc.after
    }
    meta[fc.key] = { provenance: 'manual' }
  }
  patch.fieldMeta = meta

  // Recertification refreshes the review cadence.
  const now = new Date()
  const cadence = record.reviewCadenceDays ?? 180
  patch.lastReviewedAt = now.toISOString()
  patch.nextReviewAt = new Date(
    now.getTime() + cadence * 24 * 60 * 60 * 1000,
  ).toISOString()
  patch.status = 'active'

  return patch
}
