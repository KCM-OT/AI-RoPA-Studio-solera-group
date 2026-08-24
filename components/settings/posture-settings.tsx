'use client'

import { useMemo, useState } from 'react'
import {
  CalendarClock,
  Plus,
  RotateCcw,
  ShieldAlert,
  Trash2,
  X,
} from 'lucide-react'
import { PageHeader } from '@/components/app-shell'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { useStore } from '@/lib/store'
import {
  ASSESSMENT_META,
  ASSESSMENT_ORDER,
  CADENCE_OPTIONS,
  CONDITION_DESC,
  CONDITION_LABEL,
  CONDITION_ORDER,
  cadenceLabel,
  newCadenceRule,
  requiredAssessments,
  resolveCadence,
} from '@/lib/posture'
import type {
  AssessmentRule,
  AssessmentType,
  CadenceRule,
  ConditionKey,
  RuleLogic,
} from '@/lib/types'

// ---- Small primitives ----

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  label: string
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors',
        checked ? 'bg-primary' : 'bg-muted-foreground/30',
      )}
    >
      <span
        className={cn(
          'inline-block size-4 rounded-full bg-background shadow-sm transition-transform',
          checked ? 'translate-x-4' : 'translate-x-0.5',
        )}
      />
    </button>
  )
}

function LogicSelect({
  value,
  onChange,
}: {
  value: RuleLogic
  onChange: (v: RuleLogic) => void
}) {
  return (
    <div className="inline-flex rounded-md border border-border p-0.5 text-xs">
      {(['any', 'all'] as RuleLogic[]).map((opt) => (
        <button
          key={opt}
          type="button"
          onClick={() => onChange(opt)}
          className={cn(
            'rounded px-2 py-0.5 font-medium capitalize transition-colors',
            value === opt
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {opt === 'any' ? 'Match any' : 'Match all'}
        </button>
      ))}
    </div>
  )
}

function ConditionSelector({
  selected,
  onToggle,
}: {
  selected: ConditionKey[]
  onToggle: (key: ConditionKey) => void
}) {
  const set = new Set(selected)
  return (
    <div className="flex flex-wrap gap-1.5">
      {CONDITION_ORDER.map((key) => {
        const active = set.has(key)
        return (
          <button
            key={key}
            type="button"
            title={CONDITION_DESC[key]}
            onClick={() => onToggle(key)}
            className={cn(
              'rounded-full border px-2.5 py-1 text-xs font-medium transition-colors',
              active
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border text-muted-foreground hover:border-muted-foreground/50 hover:text-foreground',
            )}
          >
            {CONDITION_LABEL[key]}
          </button>
        )
      })}
    </div>
  )
}

// ---- Cadence section ----

function CadenceEditor() {
  const { posture, updatePosture } = useStore()

  function patchRule(id: string, patch: Partial<CadenceRule>) {
    updatePosture({
      cadenceRules: posture.cadenceRules.map((r) =>
        r.id === id ? { ...r, ...patch } : r,
      ),
    })
  }
  function toggleCondition(id: string, key: ConditionKey) {
    const rule = posture.cadenceRules.find((r) => r.id === id)
    if (!rule) return
    const conditions = rule.conditions.includes(key)
      ? rule.conditions.filter((c) => c !== key)
      : [...rule.conditions, key]
    patchRule(id, { conditions })
  }
  function removeRule(id: string) {
    updatePosture({ cadenceRules: posture.cadenceRules.filter((r) => r.id !== id) })
  }
  function addRule() {
    updatePosture({ cadenceRules: [...posture.cadenceRules, newCadenceRule()] })
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <CalendarClock className="size-4 text-primary" />
          <CardTitle>Maintenance &amp; certification cadence</CardTitle>
        </div>
        <CardDescription>
          Set how often the business must review and re-certify records. Tiers are
          evaluated top to bottom; the first matching tier wins, otherwise the default
          applies.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <div className="flex flex-col gap-4 rounded-lg border border-border bg-muted/40 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-sm font-medium">Default review cadence</div>
            <p className="text-xs text-muted-foreground">
              Applied to any record that does not match a risk tier below.
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {CADENCE_OPTIONS.map((opt) => (
              <button
                key={opt.days}
                type="button"
                onClick={() => updatePosture({ defaultCadenceDays: opt.days })}
                className={cn(
                  'rounded-md border px-2.5 py-1 text-xs font-medium transition-colors',
                  posture.defaultCadenceDays === opt.days
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border text-muted-foreground hover:text-foreground',
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between rounded-lg border border-border p-4">
          <div>
            <div className="text-sm font-medium">Require business certification</div>
            <p className="text-xs text-muted-foreground">
              Owners must attest that the record is accurate at each review, not just
              acknowledge it.
            </p>
          </div>
          <Toggle
            checked={posture.requireCertification}
            onChange={(v) => updatePosture({ requireCertification: v })}
            label="Require business certification"
          />
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium">Risk-based tiers</div>
            <Button variant="outline" size="sm" onClick={addRule} className="gap-1.5">
              <Plus className="size-3.5" /> Add tier
            </Button>
          </div>

          {posture.cadenceRules.length === 0 && (
            <p className="rounded-lg border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
              No tiers yet. Every record uses the default cadence.
            </p>
          )}

          {posture.cadenceRules.map((rule, i) => (
            <div
              key={rule.id}
              className={cn(
                'rounded-lg border border-border p-4',
                !rule.enabled && 'opacity-60',
              )}
            >
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="tabular-nums">
                  {i + 1}
                </Badge>
                <input
                  value={rule.label}
                  onChange={(e) => patchRule(rule.id, { label: e.target.value })}
                  className="min-w-0 flex-1 rounded-md border border-transparent bg-transparent px-1 py-0.5 text-sm font-medium hover:border-border focus:border-primary focus:outline-none"
                />
                <LogicSelect
                  value={rule.logic}
                  onChange={(v) => patchRule(rule.id, { logic: v })}
                />
                <Toggle
                  checked={rule.enabled}
                  onChange={(v) => patchRule(rule.id, { enabled: v })}
                  label={`Enable ${rule.label}`}
                />
                <button
                  type="button"
                  onClick={() => removeRule(rule.id)}
                  aria-label={`Remove ${rule.label}`}
                  className="rounded-md p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>

              <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="mb-1.5 text-xs font-medium text-muted-foreground">
                    When record has:
                  </div>
                  <ConditionSelector
                    selected={rule.conditions}
                    onToggle={(k) => toggleCondition(rule.id, k)}
                  />
                </div>
                <div className="shrink-0">
                  <div className="mb-1.5 text-xs font-medium text-muted-foreground">
                    Review cadence:
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {CADENCE_OPTIONS.map((opt) => (
                      <button
                        key={opt.days}
                        type="button"
                        onClick={() => patchRule(rule.id, { cadenceDays: opt.days })}
                        className={cn(
                          'rounded-md border px-2 py-1 text-xs font-medium transition-colors',
                          rule.cadenceDays === opt.days
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-border text-muted-foreground hover:text-foreground',
                        )}
                      >
                        {cadenceLabel(opt.days)}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

// ---- Assessment triggers section ----

function AssessmentEditor() {
  const { posture, updatePosture } = useStore()

  function patchRule(type: AssessmentType, patch: Partial<AssessmentRule>) {
    updatePosture({
      assessmentRules: posture.assessmentRules.map((r) =>
        r.type === type ? { ...r, ...patch } : r,
      ),
    })
  }
  function toggleCondition(type: AssessmentType, key: ConditionKey) {
    const rule = posture.assessmentRules.find((r) => r.type === type)
    if (!rule) return
    const conditions = rule.conditions.includes(key)
      ? rule.conditions.filter((c) => c !== key)
      : [...rule.conditions, key]
    patchRule(type, { conditions })
  }

  const rulesByType = new Map(posture.assessmentRules.map((r) => [r.type, r]))

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <ShieldAlert className="size-4 text-primary" />
          <CardTitle>Assessment triggers</CardTitle>
        </div>
        <CardDescription>
          Define what requires a PIA, LIA, TIA, Privacy by Design review, or AI risk
          assessment. When a record matches, the agent flags the assessment as required.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {ASSESSMENT_ORDER.map((type) => {
          const rule = rulesByType.get(type)
          if (!rule) return null
          const meta = ASSESSMENT_META[type]
          return (
            <div
              key={type}
              className={cn(
                'rounded-lg border border-border p-4',
                !rule.enabled && 'opacity-60',
              )}
            >
              <div className="flex flex-wrap items-center gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-xs font-semibold text-primary">
                  {meta.abbr}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium">{meta.name}</div>
                  <p className="text-xs text-muted-foreground text-pretty">{meta.desc}</p>
                </div>
                <LogicSelect
                  value={rule.logic}
                  onChange={(v) => patchRule(type, { logic: v })}
                />
                <Toggle
                  checked={rule.enabled}
                  onChange={(v) => patchRule(type, { enabled: v })}
                  label={`Enable ${meta.name}`}
                />
              </div>
              <div className="mt-3">
                <div className="mb-1.5 text-xs font-medium text-muted-foreground">
                  Require when record has:
                </div>
                <ConditionSelector
                  selected={rule.conditions}
                  onToggle={(k) => toggleCondition(type, k)}
                />
              </div>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}

// ---- Live impact preview ----

function ImpactPreview() {
  const { activities, posture, personalDataCategories } = useStore()

  const impact = useMemo(() => {
    const assessmentCounts = new Map<AssessmentType, number>()
    const cadenceBuckets = new Map<string, number>()
    for (const pa of activities) {
      for (const req of requiredAssessments(pa, posture, personalDataCategories)) {
        assessmentCounts.set(req.type, (assessmentCounts.get(req.type) ?? 0) + 1)
      }
      const cad = resolveCadence(pa, posture, personalDataCategories)
      const key = cadenceLabel(cad.cadenceDays)
      cadenceBuckets.set(key, (cadenceBuckets.get(key) ?? 0) + 1)
    }
    return { assessmentCounts, cadenceBuckets }
  }, [activities, posture, personalDataCategories])

  return (
    <Card className="bg-muted/30">
      <CardHeader>
        <CardTitle>Impact on current register</CardTitle>
        <CardDescription>
          How these rules classify your {activities.length} existing records right now.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-6 sm:grid-cols-2">
        <div>
          <div className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Assessments required
          </div>
          <ul className="flex flex-col gap-2">
            {ASSESSMENT_ORDER.map((type) => {
              const count = impact.assessmentCounts.get(type) ?? 0
              return (
                <li key={type} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <span className="flex size-6 items-center justify-center rounded bg-primary/10 text-[10px] font-semibold text-primary">
                      {ASSESSMENT_META[type].abbr}
                    </span>
                    {ASSESSMENT_META[type].name}
                  </span>
                  <span className="tabular-nums font-medium">
                    {count} <span className="text-muted-foreground">records</span>
                  </span>
                </li>
              )
            })}
          </ul>
        </div>
        <div>
          <div className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Review cadence distribution
          </div>
          <ul className="flex flex-col gap-2">
            {[...impact.cadenceBuckets.entries()]
              .sort((a, b) => b[1] - a[1])
              .map(([label, count]) => (
                <li key={label} className="flex items-center justify-between text-sm">
                  <span>{label}</span>
                  <span className="tabular-nums font-medium">
                    {count} <span className="text-muted-foreground">records</span>
                  </span>
                </li>
              ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}

// ---- Page composition ----

export function PostureSettings() {
  const { resetPosture } = useStore()
  const [confirmReset, setConfirmReset] = useState(false)

  return (
    <>
      <PageHeader
        title="Posture Rules"
        description="Configure maintenance cadence and assessment triggers for the privacy program."
        actions={
          confirmReset ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Reset to defaults?</span>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => {
                  resetPosture()
                  setConfirmReset(false)
                }}
              >
                Reset
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setConfirmReset(false)}
                aria-label="Cancel reset"
              >
                <X className="size-4" />
              </Button>
            </div>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setConfirmReset(true)}
              className="gap-1.5"
            >
              <RotateCcw className="size-3.5" /> Reset to defaults
            </Button>
          )
        }
      />
      <main className="flex flex-col gap-6 p-6">
        <CadenceEditor />
        <AssessmentEditor />
        <ImpactPreview />
      </main>
    </>
  )
}
