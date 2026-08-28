// Domain model for AI-driven RoPA (Records of Processing Activity) authoring & maintenance.
// Modeled on GDPR Article 30 controller records.

export type Provenance = 'manual' | 'ai'

export type RecordStatus = 'draft' | 'active' | 'under_review' | 'archived'

export type LegalBasis =
  | 'Consent'
  | 'Contract'
  | 'Legal obligation'
  | 'Vital interests'
  | 'Public task'
  | 'Legitimate interests'

// Attribute keys that the agent can extract / enrich.
export type FieldKey =
  | 'name'
  | 'description'
  | 'purpose'
  | 'legalBasis'
  | 'managingOrganization'
  | 'businessProcessOwner'
  | 'dataSubjectCategories'
  | 'retentionPeriod'
  | 'recipients'
  | 'internationalTransfers'
  | 'securityMeasures'
  | 'jurisdiction'

export interface FieldMeta {
  provenance: Provenance
  confidence?: number // 0..1, present when provenance === 'ai'
  evidence?: string // quote from source document
}

export type RelationshipType = 'vendor' | 'asset' | 'personalData'

export type SuggestionStatus =
  | 'suggested'
  | 'accepted'
  | 'edited'
  | 'rejected'
  | 'unresolved'

export interface Relationship {
  id: string
  type: RelationshipType
  name: string
  inventoryId: string | null // null => unresolved (not found in inventory)
  provenance: Provenance
  confidence?: number
  evidence?: string
  status: SuggestionStatus
  note?: string
}

export interface SourceDocument {
  id: string
  name: string
  kind: string // e.g. "Vendor contract", "DPIA", "Project brief"
  addedAt: string
  excerpt?: string
}

export interface ProcessingActivity {
  id: string
  name: string
  description: string
  status: RecordStatus
  purpose: string
  legalBasis: LegalBasis | ''
  managingOrganization: string
  businessProcessOwner: string
  dataSubjectCategories: string[]
  retentionPeriod: string
  recipients: string
  internationalTransfers: string
  securityMeasures: string
  jurisdiction: string
  // provenance/confidence per attribute
  fieldMeta: Partial<Record<FieldKey, FieldMeta>>
  relationships: Relationship[]
  sourceDocuments: SourceDocument[]
  // AI usage flags (drive dashboard metrics)
  createdWithAI: boolean
  updatedWithAI: boolean
  // governance
  reviewCadenceDays: number | null
  lastReviewedAt: string | null
  nextReviewAt: string | null
  // local variation linkage
  parentId: string | null
  createdAt: string
  updatedAt: string
}

// ---- Inventory objects (existing tenant taxonomy) ----

export interface Vendor {
  id: string
  name: string
  category: string
  location: string
  dpaStatus: 'Signed' | 'Pending' | 'None'
}

export interface Asset {
  id: string
  name: string
  type: string // Application | System | Data store
  hostingRegion: string
}

export interface PersonalDataCategory {
  id: string
  name: string
  sensitivity: 'standard' | 'special'
}

// ---- Activity log / audit ----

export type LogAction =
  | 'record_created'
  | 'record_updated'
  | 'field_accepted'
  | 'field_edited'
  | 'field_rejected'
  | 'relationship_accepted'
  | 'relationship_rejected'
  | 'document_attached'
  | 'duplicate_flagged'
  | 'review_scheduled'
  | 'review_completed'
  | 'variation_created'

export interface ActivityLogEntry {
  id: string
  timestamp: string
  actor: 'AI Agent' | 'You'
  action: LogAction
  recordId: string | null
  recordName: string | null
  detail: string
}

// ---- AI scan result (from /api/scan) ----

export interface ExtractedField {
  key: FieldKey
  label: string
  value: string // for array fields, comma-separated
  confidence: number // 0..1
  evidence: string
  rationale: string
}

export interface SuggestedRelationship {
  type: RelationshipType
  name: string
  confidence: number
  evidence: string
  rationale: string
}

export interface ScanResult {
  documentKind: string
  summary: string
  fields: ExtractedField[]
  relationships: SuggestedRelationship[]
}

// ---- Privacy posture rules (admin configuration) ----

// Risk signals that can be evaluated against any processing activity.
export type ConditionKey =
  | 'specialCategory'
  | 'internationalTransfer'
  | 'legitimateInterests'
  | 'automatedDecisions'
  | 'largeScale'
  | 'systematicMonitoring'
  | 'vulnerableSubjects'
  | 'newActivity'

// Assessments a privacy program can require.
// PIA (a.k.a. DPIA), LIA, TIA, Privacy by Design review, AI risk assessment.
export type AssessmentType = 'PIA' | 'LIA' | 'TIA' | 'PbD' | 'AIRisk'

export type RuleLogic = 'any' | 'all'

// A rule that, when its conditions match, requires an assessment.
export interface AssessmentRule {
  type: AssessmentType
  enabled: boolean
  logic: RuleLogic
  conditions: ConditionKey[]
  note?: string
}

// A tiered maintenance/certification cadence. Rules are evaluated in order;
// the first enabled rule whose conditions match sets the cadence.
export interface CadenceRule {
  id: string
  label: string
  enabled: boolean
  logic: RuleLogic
  conditions: ConditionKey[]
  cadenceDays: number
}

export interface PostureConfig {
  // Maintenance & certification
  defaultCadenceDays: number
  requireCertification: boolean
  cadenceRules: CadenceRule[]
  // Assessment triggers
  assessmentRules: AssessmentRule[]
}

// ---- Recertification workflow ----

// Where a submission sits in the human-in-the-loop lifecycle:
// a Business Process Owner submits -> a Privacy Ops Analyst reviews ->
// changes are committed to the permanent inventory (or sent back).
export type SubmissionStatus =
  | 'pending_review'
  | 'changes_requested'
  | 'approved'
  | 'committed'

// A Business Process Owner either confirms the record is accurate as-is,
// or flags modifications for review.
export type SubmissionDecision = 'approved_as_is' | 'modified'

// A single attribute-level change captured during recertification.
export interface FieldChange {
  key: FieldKey
  label: string
  before: string
  after: string
}

// An added or removed vendor / asset / personal-data relationship.
export interface RelationshipChange {
  action: 'added' | 'removed'
  type: RelationshipType
  name: string
  inventoryId: string | null
}

// Channels an analyst can use to reach an owner in the tools they already use.
export type FollowUpChannel = 'teams' | 'slack'

// Who a clarifying question is directed to.
export type FollowUpAudience =
  | 'business_process_owner'
  | 'application_owner'
  | 'vendor_owner'

export type FollowUpStatus = 'draft' | 'sent' | 'answered'

export interface FollowUpQuestion {
  id: string
  question: string
  channel: FollowUpChannel
  audience: FollowUpAudience
  recipient: string
  status: FollowUpStatus
  aiGenerated: boolean
  createdAt: string
  sentAt: string | null
  answeredAt: string | null
  response: string | null
}

// A change set submitted by a Business Process Owner during recertification,
// awaiting analyst review before it is committed to the register.
export interface ChangeSubmission {
  id: string
  recordId: string
  recordName: string
  submittedBy: string
  submittedRole: string
  submittedAt: string
  status: SubmissionStatus
  decision: SubmissionDecision
  // Owner's own note / summary of what they changed and why.
  ownerNote: string
  fieldChanges: FieldChange[]
  relationshipChanges: RelationshipChange[]
  followUps: FollowUpQuestion[]
  // AI-generated summary of the activity and what changed since last review.
  aiSummary: string | null
}
