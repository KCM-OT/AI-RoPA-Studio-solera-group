'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  ArrowRight,
  Sparkles,
  Loader2,
  Check,
  X,
  Plus,
  Building2,
  Boxes,
  Fingerprint,
  CircleCheck,
  Send,
  User,
  ClipboardCheck,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button, buttonVariants } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { PageHeader } from '@/components/app-shell'
import { useStore } from '@/lib/store'
import { resolveInventory } from '@/lib/authoring'
import { diffRelationships } from '@/lib/recert'
import type {
  ChangeSubmission,
  FieldChange,
  ProcessingActivity,
  Relationship,
  RelationshipType,
} from '@/lib/types'
import { cn } from '@/lib/utils'

type Step = 'overview' | 'ownership' | 'data' | 'systems' | 'details' | 'review' | 'done'

const STEP_ORDER: Step[] = ['overview', 'ownership', 'data', 'systems', 'details', 'review']

const STEP_LABEL: Record<Step, string> = {
  overview: 'Overview',
  ownership: 'Ownership',
  data: 'Personal data',
  systems: 'Vendors & systems',
  details: 'Other details',
  review: 'Review & submit',
  done: 'Submitted',
}

interface AiSummary {
  summary: string
  changesSinceReview: string[]
}

export function RecertifyWizard({ id }: { id: string }) {
  const router = useRouter()
  const { getActivity, vendors, assets, personalDataCategories, addSubmission } = useStore()
  const record = getActivity(id)

  const [step, setStep] = useState<Step>('overview')

  // AI summary (Story 8)
  const [summary, setSummary] = useState<AiSummary | null>(null)
  const [summaryLoading, setSummaryLoading] = useState(false)

  // Working copy of relationships the owner can edit (Story 3 & 4).
  const initialRels = useMemo(
    () => (record ? record.relationships.filter((r) => r.status !== 'rejected') : []),
    [record],
  )
  const [rels, setRels] = useState<Relationship[]>(initialRels)

  // Ownership answer (Story 9 / Story 2)
  const [ownsIt, setOwnsIt] = useState<'yes' | 'no' | null>(null)
  const [reassignTo, setReassignTo] = useState('')

  // Optional attribute edits + free-text note
  const [retention, setRetention] = useState(record?.retentionPeriod ?? '')
  const [purpose, setPurpose] = useState(record?.purpose ?? '')
  const [note, setNote] = useState('')

  const [submissionId, setSubmissionId] = useState<string | null>(null)

  if (!record) {
    return (
      <>
        <PageHeader title="Record not found" />
        <div className="p-6">
          <Button variant="outline" onClick={() => router.push('/maintenance')} className="gap-2">
            <ArrowLeft className="size-4" /> Back to maintenance
          </Button>
        </div>
      </>
    )
  }

  async function runSummary() {
    setSummaryLoading(true)
    try {
      const res = await fetch('/api/recert/summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ record }),
      })
      setSummary((await res.json()) as AiSummary)
    } catch {
      setSummary({
        summary: `${record!.name} — ${record!.purpose}.`,
        changesSinceReview: ['Confirm the details below still reflect how you operate today.'],
      })
    } finally {
      setSummaryLoading(false)
    }
  }

  function addRel(type: RelationshipType, name: string) {
    const trimmed = name.trim()
    if (!trimmed) return
    const inventoryId = resolveInventory(type, trimmed, {
      vendors,
      assets,
      personalDataCategories,
    })
    // Avoid duplicates
    if (
      rels.some(
        (r) => r.type === type && r.name.trim().toLowerCase() === trimmed.toLowerCase(),
      )
    )
      return
    setRels((prev) => [
      ...prev,
      {
        id: `rel-new-${Math.random().toString(36).slice(2, 8)}`,
        type,
        name: trimmed,
        inventoryId,
        provenance: 'manual',
        status: 'accepted',
      },
    ])
  }

  function removeRel(relId: string) {
    setRels((prev) => prev.filter((r) => r.id !== relId))
  }

  // Compute the diff for the review step.
  const relationshipChanges = useMemo(
    () => diffRelationships(initialRels, rels),
    [initialRels, rels],
  )

  const fieldChanges = useMemo<FieldChange[]>(() => {
    const changes: FieldChange[] = []
    if (retention.trim() !== record.retentionPeriod.trim()) {
      changes.push({
        key: 'retentionPeriod',
        label: 'Retention period',
        before: record.retentionPeriod,
        after: retention.trim(),
      })
    }
    if (purpose.trim() !== record.purpose.trim()) {
      changes.push({
        key: 'purpose',
        label: 'Purpose of processing',
        before: record.purpose,
        after: purpose.trim(),
      })
    }
    return changes
  }, [retention, purpose, record])

  const totalChanges = relationshipChanges.length + fieldChanges.length
  const hasChanges = totalChanges > 0 || ownsIt === 'no'

  function submit() {
    const decision = hasChanges ? 'modified' : 'approved_as_is'
    const ownerNoteParts: string[] = []
    if (ownsIt === 'no')
      ownerNoteParts.push(
        `Ownership should move to ${reassignTo.trim() || 'another team (unspecified)'}.`,
      )
    if (note.trim()) ownerNoteParts.push(note.trim())
    if (ownerNoteParts.length === 0)
      ownerNoteParts.push(
        decision === 'approved_as_is'
          ? 'Reviewed the record — it still reflects how we operate. No changes needed.'
          : 'Submitted the changes below.',
      )

    const sub: ChangeSubmission = {
      id: `sub-${Math.random().toString(36).slice(2, 9)}`,
      recordId: record!.id,
      recordName: record!.name,
      submittedBy: record!.businessProcessOwner || 'Business Process Owner',
      submittedRole: record!.managingOrganization || 'Business',
      submittedAt: new Date().toISOString(),
      status: 'pending_review',
      decision,
      ownerNote: ownerNoteParts.join(' '),
      fieldChanges,
      relationshipChanges,
      followUps: [],
      aiSummary: summary?.summary ?? null,
    }
    addSubmission(sub)
    setSubmissionId(sub.id)
    setStep('done')
  }

  const stepIndex = STEP_ORDER.indexOf(step)

  return (
    <>
      <PageHeader
        title="Recertify processing activity"
        description={record.name}
        actions={
          <Button
            variant="outline"
            onClick={() => router.push(`/records/${record.id}`)}
            className="gap-2"
          >
            <ArrowLeft className="size-4" /> Exit
          </Button>
        }
      />

      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-6">
        {step !== 'done' && <Stepper current={step} />}

        {step === 'overview' && (
          <OverviewStep
            record={record}
            rels={initialRels}
            summary={summary}
            summaryLoading={summaryLoading}
            onRunSummary={runSummary}
            onNext={() => setStep('ownership')}
          />
        )}

        {step === 'ownership' && (
          <QuestionCard
            index={stepIndex}
            question="Is this still a process your team owns?"
            why="We want to make sure this record is pointed at the right owner before anything else."
          >
            <div className="flex flex-col gap-3">
              <ChoiceRow
                selected={ownsIt === 'yes'}
                onClick={() => setOwnsIt('yes')}
                label="Yes, my team still owns this"
              />
              <ChoiceRow
                selected={ownsIt === 'no'}
                onClick={() => setOwnsIt('no')}
                label="No, this should move to another team"
              />
              {ownsIt === 'no' && (
                <input
                  value={reassignTo}
                  onChange={(e) => setReassignTo(e.target.value)}
                  placeholder="Which team or person should own it?"
                  className="h-9 w-full rounded-lg border border-input bg-card px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              )}
            </div>
            <NavButtons
              onBack={() => setStep('overview')}
              onNext={() => setStep('data')}
              nextDisabled={ownsIt === null}
            />
          </QuestionCard>
        )}

        {step === 'data' && (
          <QuestionCard
            index={stepIndex}
            question="Are these the personal data elements you still collect?"
            why="Add anything newly collected and remove anything you no longer collect — no privacy team needed."
          >
            <RelationshipEditor
              type="personalData"
              rels={rels}
              onAdd={(name) => addRel('personalData', name)}
              onRemove={removeRel}
              suggestions={personalDataCategories.map((p) => p.name)}
              addPlaceholder="Add a data element (e.g. Work authorization status)"
            />
            <NavButtons onBack={() => setStep('ownership')} onNext={() => setStep('systems')} />
          </QuestionCard>
        )}

        {step === 'systems' && (
          <QuestionCard
            index={stepIndex}
            question="Are you still using these vendors and systems?"
            why="Swap out anything that changed — for example a new hiring vendor replacing an old one."
          >
            <div className="flex flex-col gap-5">
              <RelationshipEditor
                type="vendor"
                rels={rels}
                onAdd={(name) => addRel('vendor', name)}
                onRemove={removeRel}
                suggestions={vendors.map((v) => v.name)}
                addPlaceholder="Add a vendor (e.g. HireVue)"
              />
              <RelationshipEditor
                type="asset"
                rels={rels}
                onAdd={(name) => addRel('asset', name)}
                onRemove={removeRel}
                suggestions={assets.map((a) => a.name)}
                addPlaceholder="Add an application or system"
              />
            </div>
            <NavButtons onBack={() => setStep('data')} onNext={() => setStep('details')} />
          </QuestionCard>
        )}

        {step === 'details' && (
          <QuestionCard
            index={stepIndex}
            question="Has anything else changed?"
            why="Optional — update the purpose or how long you keep the data, or leave a note for the privacy team."
          >
            <div className="flex flex-col gap-4">
              <Field label="Purpose of processing">
                <textarea
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  rows={2}
                  className="w-full rounded-lg border border-input bg-card p-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </Field>
              <Field label="Retention period">
                <input
                  value={retention}
                  onChange={(e) => setRetention(e.target.value)}
                  className="h-9 w-full rounded-lg border border-input bg-card px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </Field>
              <Field label="Note for the privacy team (optional)">
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={2}
                  placeholder="Anything the reviewer should know…"
                  className="w-full rounded-lg border border-input bg-card p-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </Field>
            </div>
            <NavButtons onBack={() => setStep('systems')} onNext={() => setStep('review')} />
          </QuestionCard>
        )}

        {step === 'review' && (
          <ReviewStep
            record={record}
            hasChanges={hasChanges}
            ownsIt={ownsIt}
            reassignTo={reassignTo}
            fieldChanges={fieldChanges}
            relationshipChanges={relationshipChanges}
            note={note}
            onBack={() => setStep('details')}
            onSubmit={submit}
          />
        )}

        {step === 'done' && (
          <DoneStep record={record} hasChanges={hasChanges} submissionId={submissionId} />
        )}
      </div>
    </>
  )
}

function Stepper({ current }: { current: Step }) {
  const currentIndex = STEP_ORDER.indexOf(current)
  return (
    <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
      {STEP_ORDER.map((s, i) => {
        const done = i < currentIndex
        const active = i === currentIndex
        return (
          <li key={s} className="flex items-center gap-2">
            <span
              className={cn(
                'flex size-5 items-center justify-center rounded-full text-[10px] font-semibold',
                done
                  ? 'bg-primary text-primary-foreground'
                  : active
                    ? 'bg-primary/15 text-primary ring-2 ring-primary/30'
                    : 'bg-muted text-muted-foreground',
              )}
            >
              {done ? <Check className="size-3" /> : i + 1}
            </span>
            <span
              className={cn(
                'font-medium',
                active ? 'text-foreground' : 'text-muted-foreground',
              )}
            >
              {STEP_LABEL[s]}
            </span>
            {i < STEP_ORDER.length - 1 && (
              <span className="mx-1 hidden h-px w-6 bg-border sm:block" />
            )}
          </li>
        )
      })}
    </ol>
  )
}

const REL_GROUP: Record<RelationshipType, { label: string; icon: typeof Building2 }> = {
  vendor: { label: 'Vendors & processors', icon: Building2 },
  asset: { label: 'Applications & systems', icon: Boxes },
  personalData: { label: 'Personal data elements', icon: Fingerprint },
}

function OverviewStep({
  record,
  rels,
  summary,
  summaryLoading,
  onRunSummary,
  onNext,
}: {
  record: ProcessingActivity
  rels: Relationship[]
  summary: AiSummary | null
  summaryLoading: boolean
  onRunSummary: () => void
  onNext: () => void
}) {
  const vendors = rels.filter((r) => r.type === 'vendor')
  const assets = rels.filter((r) => r.type === 'asset')
  const data = rels.filter((r) => r.type === 'personalData')

  return (
    <div className="flex flex-col gap-5">
      <Card className="border-ai/30 bg-ai/[0.03]">
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="size-4 text-ai" /> AI summary
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {!summary && !summaryLoading && (
            <>
              <p className="text-sm text-muted-foreground">
                Let the assistant summarize this activity and what may have changed since your last
                review, so you don&apos;t have to reconstruct it yourself.
              </p>
              <Button
                onClick={onRunSummary}
                className="w-fit gap-2 bg-ai text-ai-foreground hover:bg-ai/90"
              >
                <Sparkles className="size-4" /> Summarize for me
              </Button>
            </>
          )}
          {summaryLoading && (
            <div className="flex items-center gap-2 py-1 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin text-ai" /> Reading the record…
            </div>
          )}
          {summary && (
            <>
              <p className="rounded-lg bg-card p-3 text-sm text-foreground text-pretty">
                {summary.summary}
              </p>
              <div>
                <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Since your last review
                </p>
                <ul className="flex flex-col gap-1.5">
                  {summary.changesSinceReview.map((c, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                      <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-ai" />
                      <span className="text-pretty">{c}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>What this activity does today</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 text-sm">
          <Field label="Purpose">
            <p className="text-foreground text-pretty">{record.purpose}</p>
          </Field>
          <Field label="Description">
            <p className="text-muted-foreground text-pretty">{record.description}</p>
          </Field>
          <div className="grid gap-4 sm:grid-cols-3">
            <ContextList icon={Fingerprint} label="Personal data" items={data.map((r) => r.name)} />
            <ContextList icon={Building2} label="Vendors" items={vendors.map((r) => r.name)} />
            <ContextList icon={Boxes} label="Systems" items={assets.map((r) => r.name)} />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={onNext} className="gap-2">
          Start recertification <ArrowRight className="size-4" />
        </Button>
      </div>
    </div>
  )
}

function ContextList({
  icon: Icon,
  label,
  items,
}: {
  icon: typeof Building2
  label: string
  items: string[]
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        <Icon className="size-3.5" /> {label}
      </div>
      {items.length === 0 ? (
        <p className="text-xs text-muted-foreground/60">None recorded</p>
      ) : (
        <ul className="flex flex-col gap-1">
          {items.map((i) => (
            <li key={i} className="text-sm text-foreground">
              {i}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function QuestionCard({
  index,
  question,
  why,
  children,
}: {
  index: number
  question: string
  why: string
  children: React.ReactNode
}) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-4 p-6">
        <div className="flex items-start gap-3">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
            {index + 1}
          </span>
          <div className="flex flex-col gap-1">
            <h2 className="text-lg font-semibold text-foreground text-balance">{question}</h2>
            <p className="text-sm text-muted-foreground text-pretty">{why}</p>
          </div>
        </div>
        <div className="pl-0 sm:pl-11">{children}</div>
      </CardContent>
    </Card>
  )
}

function ChoiceRow({
  selected,
  onClick,
  label,
}: {
  selected: boolean
  onClick: () => void
  label: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex items-center gap-3 rounded-lg border p-3 text-left text-sm transition-colors',
        selected
          ? 'border-primary bg-primary/5 text-foreground'
          : 'border-border bg-card text-muted-foreground hover:border-primary/40',
      )}
    >
      <span
        className={cn(
          'flex size-4 items-center justify-center rounded-full border',
          selected ? 'border-primary bg-primary text-primary-foreground' : 'border-muted-foreground/40',
        )}
      >
        {selected && <Check className="size-3" />}
      </span>
      {label}
    </button>
  )
}

function RelationshipEditor({
  type,
  rels,
  onAdd,
  onRemove,
  suggestions,
  addPlaceholder,
}: {
  type: RelationshipType
  rels: Relationship[]
  onAdd: (name: string) => void
  onRemove: (id: string) => void
  suggestions: string[]
  addPlaceholder: string
}) {
  const [value, setValue] = useState('')
  const meta = REL_GROUP[type]
  const Icon = meta.icon
  const items = rels.filter((r) => r.type === type)
  const listId = `suggest-${type}`

  function commit() {
    onAdd(value)
    setValue('')
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        <Icon className="size-3.5" /> {meta.label}
      </div>
      <ul className="flex flex-wrap gap-2">
        {items.length === 0 && (
          <li className="text-sm text-muted-foreground/60">None listed</li>
        )}
        {items.map((r) => (
          <li
            key={r.id}
            className="flex items-center gap-1.5 rounded-full border border-border bg-card py-1 pl-3 pr-1.5 text-sm"
          >
            <span className="text-foreground">{r.name}</span>
            {r.inventoryId === null && (
              <span className="rounded-full bg-warning-muted px-1.5 text-[10px] font-medium text-warning-foreground">
                new
              </span>
            )}
            <button
              type="button"
              onClick={() => onRemove(r.id)}
              aria-label={`Remove ${r.name}`}
              className="flex size-5 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-danger/15 hover:text-danger"
            >
              <X className="size-3.5" />
            </button>
          </li>
        ))}
      </ul>
      <div className="flex items-center gap-2">
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.nativeEvent.isComposing && e.keyCode !== 229) {
              e.preventDefault()
              commit()
            }
          }}
          list={listId}
          placeholder={addPlaceholder}
          className="h-9 flex-1 rounded-lg border border-input bg-card px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <datalist id={listId}>
          {suggestions.map((s) => (
            <option key={s} value={s} />
          ))}
        </datalist>
        <Button type="button" variant="outline" size="sm" onClick={commit} className="gap-1.5">
          <Plus className="size-4" /> Add
        </Button>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      {children}
    </div>
  )
}

function NavButtons({
  onBack,
  onNext,
  nextDisabled,
}: {
  onBack: () => void
  onNext: () => void
  nextDisabled?: boolean
}) {
  return (
    <div className="mt-5 flex items-center justify-between border-t border-border pt-4">
      <Button variant="ghost" onClick={onBack} className="gap-2">
        <ArrowLeft className="size-4" /> Back
      </Button>
      <Button onClick={onNext} disabled={nextDisabled} className="gap-2">
        Continue <ArrowRight className="size-4" />
      </Button>
    </div>
  )
}

function ReviewStep({
  record,
  hasChanges,
  ownsIt,
  reassignTo,
  fieldChanges,
  relationshipChanges,
  note,
  onBack,
  onSubmit,
}: {
  record: ProcessingActivity
  hasChanges: boolean
  ownsIt: 'yes' | 'no' | null
  reassignTo: string
  fieldChanges: FieldChange[]
  relationshipChanges: ReturnType<typeof diffRelationships>
  note: string
  onBack: () => void
  onSubmit: () => void
}) {
  const added = relationshipChanges.filter((c) => c.action === 'added')
  const removed = relationshipChanges.filter((c) => c.action === 'removed')

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ClipboardCheck className="size-4 text-primary" /> Review before you submit
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        {!hasChanges ? (
          <div className="flex items-start gap-3 rounded-lg border border-success-muted bg-success-muted/40 p-4">
            <CircleCheck className="mt-0.5 size-5 shrink-0 text-success" />
            <div>
              <p className="text-sm font-medium text-foreground">
                No changes — you&apos;re recertifying this record as accurate.
              </p>
              <p className="mt-0.5 text-sm text-muted-foreground">
                A privacy analyst will confirm and refresh the review date.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-muted-foreground">
              Here is what you&apos;re proposing. A privacy analyst reviews this before it becomes
              official.
            </p>

            {ownsIt === 'no' && (
              <DiffBlock title="Ownership">
                <DiffRow tone="change">
                  <User className="size-3.5 shrink-0" />
                  Reassign ownership to{' '}
                  <span className="font-medium text-foreground">
                    {reassignTo.trim() || 'another team'}
                  </span>
                </DiffRow>
              </DiffBlock>
            )}

            {fieldChanges.length > 0 && (
              <DiffBlock title="Attribute changes">
                {fieldChanges.map((fc) => (
                  <div key={fc.key} className="text-sm">
                    <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      {fc.label}
                    </div>
                    <div className="mt-1 flex flex-col gap-0.5">
                      <span className="text-danger line-through">{fc.before || '—'}</span>
                      <span className="text-foreground">{fc.after || '—'}</span>
                    </div>
                  </div>
                ))}
              </DiffBlock>
            )}

            {added.length > 0 && (
              <DiffBlock title="Added">
                {added.map((c, i) => (
                  <DiffRow key={i} tone="add">
                    <Plus className="size-3.5 shrink-0" />
                    <span className="capitalize">{c.type === 'personalData' ? 'data' : c.type}</span>
                    <span className="font-medium text-foreground">{c.name}</span>
                    {c.inventoryId === null && (
                      <Badge variant="warning" className="ml-1">
                        New — not in inventory
                      </Badge>
                    )}
                  </DiffRow>
                ))}
              </DiffBlock>
            )}

            {removed.length > 0 && (
              <DiffBlock title="Removed">
                {removed.map((c, i) => (
                  <DiffRow key={i} tone="remove">
                    <X className="size-3.5 shrink-0" />
                    <span className="capitalize">{c.type === 'personalData' ? 'data' : c.type}</span>
                    <span className="font-medium text-foreground line-through">{c.name}</span>
                  </DiffRow>
                ))}
              </DiffBlock>
            )}

            {note.trim() && (
              <DiffBlock title="Your note">
                <p className="text-sm text-foreground text-pretty">{note}</p>
              </DiffBlock>
            )}
          </div>
        )}

        <div className="flex items-center justify-between border-t border-border pt-4">
          <Button variant="ghost" onClick={onBack} className="gap-2">
            <ArrowLeft className="size-4" /> Back
          </Button>
          <Button onClick={onSubmit} className="gap-2">
            <Send className="size-4" />
            {hasChanges ? 'Submit changes for review' : 'Recertify as accurate'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function DiffBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-muted/30 p-3">
      <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </div>
      <div className="flex flex-col gap-1.5">{children}</div>
    </div>
  )
}

function DiffRow({
  tone,
  children,
}: {
  tone: 'add' | 'remove' | 'change'
  children: React.ReactNode
}) {
  const cls = {
    add: 'text-success',
    remove: 'text-danger',
    change: 'text-primary',
  }[tone]
  return (
    <div className={cn('flex flex-wrap items-center gap-1.5 text-sm', cls)}>{children}</div>
  )
}

function DoneStep({
  record,
  hasChanges,
  submissionId,
}: {
  record: ProcessingActivity
  hasChanges: boolean
  submissionId: string | null
}) {
  return (
    <Card className="border-success-muted">
      <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
        <div className="flex size-14 items-center justify-center rounded-full bg-success/15 text-success">
          <CircleCheck className="size-7" />
        </div>
        <div className="flex flex-col gap-1">
          <h2 className="text-xl font-semibold text-foreground text-balance">
            {hasChanges ? 'Changes submitted for review' : 'Record recertified'}
          </h2>
          <p className="max-w-md text-sm text-muted-foreground text-pretty">
            Thanks. {record.businessProcessOwner || 'You'} sent this to the privacy team. A Privacy
            Operations Analyst will review{' '}
            {hasChanges ? 'your changes' : 'the recertification'} and confirm before it becomes
            official — you may get a quick follow-up question in Teams or Slack.
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <Link href={`/records/${record.id}`} className={buttonVariants({ variant: 'outline' })}>
            View record
          </Link>
          {submissionId && (
            <Link href={`/review/${submissionId}`} className={buttonVariants()}>
              See analyst review
            </Link>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
