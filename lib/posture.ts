import type {
  AssessmentRule,
  AssessmentType,
  CadenceRule,
  ConditionKey,
  PersonalDataCategory,
  PostureConfig,
  ProcessingActivity,
  RuleLogic,
} from './types'

// ---- Display metadata ----

export const CONDITION_LABEL: Record<ConditionKey, string> = {
  specialCategory: 'Special-category data',
  internationalTransfer: 'International transfer',
  legitimateInterests: 'Legitimate interests basis',
  automatedDecisions: 'Automated decisions / AI',
  largeScale: 'Large-scale processing',
  systematicMonitoring: 'Systematic monitoring',
  vulnerableSubjects: 'Vulnerable data subjects',
  newActivity: 'New / draft activity',
}

export const CONDITION_DESC: Record<ConditionKey, string> = {
  specialCategory:
    'Processing includes special categories of personal data (health, biometric, ethnicity, etc.).',
  internationalTransfer:
    'Personal data is transferred outside the primary jurisdiction.',
  legitimateInterests: 'The lawful basis for the activity is legitimate interests.',
  automatedDecisions:
    'The activity involves AI, profiling, scoring, or automated decision-making.',
  largeScale: 'The activity processes data at large scale.',
  systematicMonitoring:
    'The activity systematically monitors, tracks, or observes individuals.',
  vulnerableSubjects:
    'The data subjects include children or other vulnerable individuals.',
  newActivity: 'The record is newly created or still in draft.',
}

export const ASSESSMENT_META: Record<
  AssessmentType,
  { abbr: string; name: string; desc: string }
> = {
  PIA: {
    abbr: 'PIA',
    name: 'Privacy Impact Assessment',
    desc: 'Data protection impact assessment (DPIA) for high-risk processing.',
  },
  LIA: {
    abbr: 'LIA',
    name: 'Legitimate Interests Assessment',
    desc: 'Balancing test when relying on legitimate interests.',
  },
  TIA: {
    abbr: 'TIA',
    name: 'Transfer Impact Assessment',
    desc: 'Assessment of risk for international data transfers.',
  },
  PbD: {
    abbr: 'PbD',
    name: 'Privacy by Design Review',
    desc: 'Design-stage review of privacy controls for new processing.',
  },
  AIRisk: {
    abbr: 'AI',
    name: 'AI Risk Assessment',
    desc: 'Risk assessment for AI, profiling, or automated decision-making.',
  },
}

export const ASSESSMENT_ORDER: AssessmentType[] = ['PIA', 'LIA', 'TIA', 'PbD', 'AIRisk']
export const CONDITION_ORDER: ConditionKey[] = [
  'specialCategory',
  'internationalTransfer',
  'legitimateInterests',
  'automatedDecisions',
  'largeScale',
  'systematicMonitoring',
  'vulnerableSubjects',
  'newActivity',
]

// ---- Condition evaluation ----

const AI_KEYWORDS = [
  'ai',
  'artificial intelligence',
  'machine learning',
  'model',
  'algorithm',
  'automated decision',
  'automated decision-making',
  'profiling',
  'scoring',
  'predict',
  'recommendation engine',
]
const LARGE_SCALE_KEYWORDS = [
  'large-scale',
  'large scale',
  'nationwide',
  'millions',
  'all customers',
  'all users',
  'entire user base',
  'across all',
  'high volume',
]
const MONITORING_KEYWORDS = [
  'monitor',
  'monitoring',
  'tracking',
  'track ',
  'surveillance',
  'observ',
  'behavioral',
  'behaviour',
  'geolocation tracking',
]
const VULNERABLE_KEYWORDS = [
  'child',
  'children',
  'minor',
  'student',
  'patient',
  'vulnerable',
  'elderly',
]

function corpus(pa: ProcessingActivity): string {
  return `${pa.name} ${pa.description} ${pa.purpose} ${pa.dataSubjectCategories.join(' ')}`.toLowerCase()
}

function hasAny(haystack: string, needles: string[]): boolean {
  return needles.some((n) => haystack.includes(n))
}

function isTransferring(value: string): boolean {
  const v = value.trim().toLowerCase()
  if (!v) return false
  return !/^(none|no\b|n\/a|not applicable|domestic|within)/.test(v)
}

function relativeDaysFromNow(iso: string | null): number | null {
  if (!iso) return null
  return Math.round((new Date(iso).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
}

export function evaluateCondition(
  pa: ProcessingActivity,
  key: ConditionKey,
  pdcs: PersonalDataCategory[],
): boolean {
  const text = corpus(pa)
  switch (key) {
    case 'specialCategory': {
      const special = new Set(
        pdcs.filter((p) => p.sensitivity === 'special').map((p) => p.id),
      )
      const specialNames = pdcs
        .filter((p) => p.sensitivity === 'special')
        .map((p) => p.name.toLowerCase())
      const viaRelationship = pa.relationships.some(
        (r) =>
          r.type === 'personalData' &&
          r.status !== 'rejected' &&
          ((r.inventoryId && special.has(r.inventoryId)) ||
            specialNames.some((n) => r.name.toLowerCase().includes(n))),
      )
      return viaRelationship || hasAny(text, ['health', 'biometric', 'ethnic', 'racial', 'genetic'])
    }
    case 'internationalTransfer':
      return isTransferring(pa.internationalTransfers)
    case 'legitimateInterests':
      return pa.legalBasis === 'Legitimate interests'
    case 'automatedDecisions':
      return hasAny(text, AI_KEYWORDS)
    case 'largeScale':
      return hasAny(text, LARGE_SCALE_KEYWORDS)
    case 'systematicMonitoring':
      return hasAny(text, MONITORING_KEYWORDS)
    case 'vulnerableSubjects':
      return hasAny(text, VULNERABLE_KEYWORDS)
    case 'newActivity': {
      if (pa.status === 'draft') return true
      const age = relativeDaysFromNow(pa.createdAt)
      return age !== null && age > -90
    }
    default:
      return false
  }
}

export function activeConditions(
  pa: ProcessingActivity,
  pdcs: PersonalDataCategory[],
): ConditionKey[] {
  return CONDITION_ORDER.filter((k) => evaluateCondition(pa, k, pdcs))
}

function matchesRule(
  logic: RuleLogic,
  conditions: ConditionKey[],
  active: Set<ConditionKey>,
): boolean {
  if (conditions.length === 0) return false
  return logic === 'all'
    ? conditions.every((c) => active.has(c))
    : conditions.some((c) => active.has(c))
}

// ---- Resolvers ----

export interface ResolvedCadence {
  cadenceDays: number
  ruleLabel: string
  isDefault: boolean
}

export function resolveCadence(
  pa: ProcessingActivity,
  posture: PostureConfig,
  pdcs: PersonalDataCategory[],
): ResolvedCadence {
  const active = new Set(activeConditions(pa, pdcs))
  for (const rule of posture.cadenceRules) {
    if (!rule.enabled) continue
    if (matchesRule(rule.logic, rule.conditions, active)) {
      return { cadenceDays: rule.cadenceDays, ruleLabel: rule.label, isDefault: false }
    }
  }
  return {
    cadenceDays: posture.defaultCadenceDays,
    ruleLabel: 'Default cadence',
    isDefault: true,
  }
}

export interface RequiredAssessment {
  type: AssessmentType
  matched: ConditionKey[]
}

export function requiredAssessments(
  pa: ProcessingActivity,
  posture: PostureConfig,
  pdcs: PersonalDataCategory[],
): RequiredAssessment[] {
  const active = new Set(activeConditions(pa, pdcs))
  const out: RequiredAssessment[] = []
  for (const rule of posture.assessmentRules) {
    if (!rule.enabled) continue
    if (matchesRule(rule.logic, rule.conditions, active)) {
      out.push({ type: rule.type, matched: rule.conditions.filter((c) => active.has(c)) })
    }
  }
  return out
}

export function cadenceLabel(days: number): string {
  if (days % 365 === 0) {
    const y = days / 365
    return y === 1 ? 'Annually' : `Every ${y} years`
  }
  if (days % 30 === 0) {
    const m = days / 30
    return m === 1 ? 'Monthly' : `Every ${m} months`
  }
  return `Every ${days} days`
}

// Convenience preset options for the cadence editor (in days).
export const CADENCE_OPTIONS: { label: string; days: number }[] = [
  { label: 'Quarterly (90d)', days: 90 },
  { label: 'Semi-annually (180d)', days: 180 },
  { label: 'Annually (365d)', days: 365 },
  { label: 'Every 2 years (730d)', days: 730 },
]

export function newCadenceRule(): CadenceRule {
  return {
    id: `cad-${Math.random().toString(36).slice(2, 8)}`,
    label: 'New tier',
    enabled: true,
    logic: 'any',
    conditions: [],
    cadenceDays: 365,
  }
}

export function newAssessmentRule(type: AssessmentType): AssessmentRule {
  return { type, enabled: true, logic: 'any', conditions: [] }
}
