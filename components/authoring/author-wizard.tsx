'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Sparkles,
  FileText,
  Loader2,
  Check,
  X,
  Pencil,
  ArrowLeft,
  CircleCheck,
  TriangleAlert,
  Link2,
  Undo2,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { PageHeader } from '@/components/app-shell'
import { ConfidenceBadge } from '@/components/badges'
import { FileDropZone, type AttachedFile } from '@/components/authoring/file-drop-zone'
import { useStore } from '@/lib/store'
import { SAMPLE_DOCS, type SampleDoc } from '@/lib/seed'
import { findDuplicate, type DuplicateMatch } from '@/lib/similarity'
import {
  FIELD_LABELS,
  FIELD_ORDER,
  RELATIONSHIP_LABEL,
  parseLegalBasis,
  resolveInventory,
} from '@/lib/authoring'
import { confidenceBand } from '@/lib/ropa'
import type {
  FieldKey,
  LegalBasis,
  ProcessingActivity,
  Relationship,
  RelationshipType,
  ScanResult,
} from '@/lib/types'
import { cn } from '@/lib/utils'

interface FieldReview {
  key: FieldKey
  value: string
  confidence: number
  evidence: string
  rationale: string
  accepted: boolean
  edited: boolean
}

interface RelReview {
  type: RelationshipType
  name: string
  confidence: number
  evidence: string
  rationale: string
  inventoryId: string | null
  accepted: boolean
}

type Stage = 'input' | 'scanning' | 'review' | 'done'

function iso(daysFromNow: number) {
  const d = new Date()
  d.setDate(d.getDate() + daysFromNow)
  return d.toISOString()
}

export function AuthorWizard() {
  const router = useRouter()
  const store = useStore()
  const { activities, addActivity, updateActivity, logEvent } = store

  const [stage, setStage] = useState<Stage>('input')
  const [mode, setMode] = useState<'create' | 'enrich'>('create')
  const [targetId, setTargetId] = useState<string | null>(null)
  const [docText, setDocText] = useState('')
  const [selectedSample, setSelectedSample] = useState<string | null>(null)
  const [docMeta, setDocMeta] = useState<{ title: string; kind: string }>({
    title: 'Pasted document',
    kind: 'Document',
  })
  const [error, setError] = useState<string | null>(null)
  const [attachedFile, setAttachedFile] = useState<AttachedFile | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)

  const [summary, setSummary] = useState('')
  const [fields, setFields] = useState<FieldReview[]>([])
  const [rels, setRels] = useState<RelReview[]>([])
  const [duplicate, setDuplicate] = useState<DuplicateMatch | null>(null)
  const [dupDismissed, setDupDismissed] = useState(false)
  const [committedId, setCommittedId] = useState<string | null>(null)

  const target = targetId ? activities.find((a) => a.id === targetId) : null

  function pickSample(doc: SampleDoc) {
    setSelectedSample(doc.id)
    setDocText(doc.text)
    setDocMeta({ title: doc.title, kind: doc.kind })
    setAttachedFile(null)
    setUploadError(null)
  }

  function attachFile({ name, kind, text }: { name: string; kind: string; text: string }) {
    setUploadError(null)
    setSelectedSample(null)
    setAttachedFile({ name, extracted: text.length > 0 })
    setDocMeta({ title: name, kind })
    // Formats we can't read leave the textarea alone so the user can paste the
    // text themselves without losing the attachment.
    if (text) setDocText(text)
  }

  function clearAttachedFile() {
    setAttachedFile(null)
    setUploadError(null)
    setDocText('')
    setDocMeta({ title: 'Pasted document', kind: 'Document' })
  }

  async function runScan() {
    setError(null)
    setStage('scanning')
    try {
      const res = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          text: docText,
          mode,
          existingName: target?.name,
        }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || 'Scan failed.')
      }
      const data = (await res.json()) as ScanResult
      applyScan(data)
      setStage('review')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.')
      setStage('input')
    }
  }

  function applyScan(data: ScanResult) {
    setSummary(data.summary || '')
    if (data.documentKind) setDocMeta((m) => ({ ...m, kind: data.documentKind }))

    const reviews: FieldReview[] = (data.fields || []).map((f) => ({
      key: f.key,
      value: f.value,
      confidence: f.confidence,
      evidence: f.evidence,
      rationale: f.rationale,
      accepted: f.confidence >= 0.6, // low-confidence defaults to suggestion only
      edited: false,
    }))
    // de-dupe field keys, keep highest confidence
    const byKey = new Map<FieldKey, FieldReview>()
    for (const r of reviews) {
      const cur = byKey.get(r.key)
      if (!cur || r.confidence > cur.confidence) byKey.set(r.key, r)
    }
    setFields(FIELD_ORDER.filter((k) => byKey.has(k)).map((k) => byKey.get(k)!))

    const relReviews: RelReview[] = (data.relationships || []).map((r) => {
      const inventoryId = resolveInventory(r.type, r.name, store)
      return {
        type: r.type,
        name: r.name,
        confidence: r.confidence,
        evidence: r.evidence,
        rationale: r.rationale,
        inventoryId,
        accepted: r.confidence >= 0.6,
      }
    })
    setRels(relReviews)

    // duplicate detection (only when creating new)
    if (mode === 'create') {
      const nameField = data.fields?.find((f) => f.key === 'name')?.value ?? ''
      const purposeField = data.fields?.find((f) => f.key === 'purpose')?.value ?? ''
      const dup = findDuplicate(`${nameField} ${purposeField} ${data.summary}`, activities)
      setDuplicate(dup)
      setDupDismissed(false)
    }
  }

  function updateField(key: FieldKey, patch: Partial<FieldReview>) {
    setFields((prev) => prev.map((f) => (f.key === key ? { ...f, ...patch } : f)))
  }
  function updateRel(idx: number, patch: Partial<RelReview>) {
    setRels((prev) => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)))
  }

  function switchToUpdate(match: DuplicateMatch) {
    setMode('enrich')
    setTargetId(match.record.id)
    setDuplicate(null)
    // remove name/description from field set (keep the existing record identity)
    setFields((prev) => prev.filter((f) => f.key !== 'name' && f.key !== 'description'))
  }

  const acceptedFields = fields.filter((f) => f.accepted)
  const acceptedRels = rels.filter((r) => r.accepted)

  function commit() {
    const now = new Date().toISOString()
    const doc = {
      id: `sd-${Math.random().toString(36).slice(2, 8)}`,
      name: docMeta.title,
      kind: docMeta.kind,
      addedAt: now,
    }

    const relObjects: Relationship[] = acceptedRels.map((r, i) => ({
      id: `rel-${Date.now()}-${i}`,
      type: r.type,
      name: r.name,
      inventoryId: r.inventoryId,
      provenance: 'ai',
      confidence: r.confidence,
      evidence: r.evidence,
      status: r.inventoryId ? 'accepted' : 'unresolved',
    }))

    if (mode === 'enrich' && target) {
      const patch: Partial<ProcessingActivity> = { updatedWithAI: true }
      const fieldMeta = { ...target.fieldMeta }
      const changes: string[] = []
      for (const f of acceptedFields) {
        const label = FIELD_LABELS[f.key]
        if (f.key === 'dataSubjectCategories') {
          patch.dataSubjectCategories = f.value.split(',').map((s) => s.trim()).filter(Boolean)
        } else if (f.key === 'legalBasis') {
          const lb = parseLegalBasis(f.value)
          if (lb) patch.legalBasis = lb
        } else {
          ;(patch as Record<string, unknown>)[f.key] = f.value
        }
        fieldMeta[f.key] = {
          provenance: f.edited ? 'manual' : 'ai',
          confidence: f.confidence,
          evidence: f.evidence,
        }
        changes.push(label)
      }
      patch.fieldMeta = fieldMeta
      // merge relationships (dedupe by type+name)
      const existing = new Set(target.relationships.map((r) => `${r.type}:${r.name.toLowerCase()}`))
      const merged = [...target.relationships]
      for (const r of relObjects) {
        if (!existing.has(`${r.type}:${r.name.toLowerCase()}`)) merged.push(r)
      }
      patch.relationships = merged
      patch.sourceDocuments = [...target.sourceDocuments, doc]
      updateActivity(target.id, patch)
      logEvent({
        actor: 'AI Agent',
        action: 'record_updated',
        recordId: target.id,
        recordName: target.name,
        detail: `Enriched from "${docMeta.title}": ${changes.length} field(s) updated (${changes
          .slice(0, 4)
          .join(', ')}${changes.length > 4 ? '…' : ''}), ${relObjects.length} relationship(s) added.`,
      })
      logEvent({
        actor: 'You',
        action: 'document_attached',
        recordId: target.id,
        recordName: target.name,
        detail: `Attached source document "${docMeta.title}" as evidence.`,
      })
      setCommittedId(target.id)
      setStage('done')
      return
    }

    // create new
    const id = `pa-${Math.random().toString(36).slice(2, 8)}`
    const get = (k: FieldKey) => acceptedFields.find((f) => f.key === k)?.value ?? ''
    const legal = get('legalBasis')
    const fieldMeta: ProcessingActivity['fieldMeta'] = {}
    for (const f of acceptedFields) {
      fieldMeta[f.key] = {
        provenance: f.edited ? 'manual' : 'ai',
        confidence: f.confidence,
        evidence: f.evidence,
      }
    }
    const pa: ProcessingActivity = {
      id,
      name: get('name') || summary.slice(0, 60) || 'Untitled processing activity',
      description: get('description'),
      status: 'draft',
      purpose: get('purpose'),
      legalBasis: parseLegalBasis(legal),
      managingOrganization: get('managingOrganization'),
      businessProcessOwner: get('businessProcessOwner'),
      dataSubjectCategories: get('dataSubjectCategories')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      retentionPeriod: get('retentionPeriod'),
      recipients: get('recipients'),
      internationalTransfers: get('internationalTransfers'),
      securityMeasures: get('securityMeasures'),
      jurisdiction: get('jurisdiction') || 'Global',
      fieldMeta,
      relationships: relObjects,
      sourceDocuments: [doc],
      createdWithAI: true,
      updatedWithAI: false,
      reviewCadenceDays: 365,
      lastReviewedAt: null,
      nextReviewAt: iso(365),
      parentId: null,
      createdAt: now,
      updatedAt: now,
    }
    addActivity(pa)
    if (duplicate && !dupDismissed) {
      logEvent({
        actor: 'AI Agent',
        action: 'duplicate_flagged',
        recordId: id,
        recordName: pa.name,
        detail: `Possible duplicate of "${duplicate.record.name}" flagged; user chose to create a new record.`,
      })
    }
    logEvent({
      actor: 'AI Agent',
      action: 'record_created',
      recordId: id,
      recordName: pa.name,
      detail: `Drafted from "${docMeta.title}": ${acceptedFields.length} field(s) approved, ${relObjects.length} relationship(s) added.`,
    })
    logEvent({
      actor: 'You',
      action: 'document_attached',
      recordId: id,
      recordName: pa.name,
      detail: `Attached source document "${docMeta.title}" as evidence.`,
    })
    setCommittedId(id)
    setStage('done')
  }

  // ---------- HEADER ----------

  const pendingCount = fields.length - acceptedFields.length

  const headerDescription =
    stage === 'done'
      ? mode === 'enrich'
        ? 'Updates have been committed to the record.'
        : 'The new record has been created.'
      : stage === 'scanning'
        ? 'Extracting Article 30 attributes and relationships from your document.'
        : mode === 'enrich'
          ? 'Review the agent’s proposed updates before committing them to the record.'
          : 'Draft a new processing activity from a source document, with human approval at every step.'

  const headerStatus =
    stage === 'review'
      ? [
          pendingCount > 0
            ? { label: `${pendingCount} pending review`, tone: 'warning' as const }
            : { label: 'All fields reviewed', tone: 'success' as const },
        ]
      : undefined

  const headerActions =
    stage === 'review' ? (
      <Button variant="outline" size="sm" className="gap-1" onClick={() => setStage('input')}>
        <ArrowLeft className="size-4" /> Back
      </Button>
    ) : undefined

  const header = (
    <PageHeader
      title="Author with AI"
      description={headerDescription}
      status={headerStatus}
      actions={headerActions}
    />
  )

  // ---------- RENDER ----------

  if (stage === 'done' && committedId) {
    const rec = activities.find((a) => a.id === committedId)
    return (
      <>
        {header}
        <div className="mx-auto max-w-2xl p-6">
        <Card>
          <CardContent className="flex flex-col items-center gap-4 p-10 text-center">
            <div className="flex size-14 items-center justify-center rounded-full bg-success-muted text-success">
              <CircleCheck className="size-7" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">
                {mode === 'enrich' ? 'Record updated' : 'Record created'}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground text-pretty">
                {rec?.name} was {mode === 'enrich' ? 'enriched' : 'drafted'} with{' '}
                {acceptedFields.length} approved field(s) and {acceptedRels.length} relationship(s),
                with the source document attached as evidence.
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => router.push('/')}>
                Back to dashboard
              </Button>
              <Button onClick={() => router.push(`/records/${committedId}`)}>
                View record
              </Button>
            </div>
          </CardContent>
        </Card>
        </div>
      </>
    )
  }

  if (stage === 'scanning') {
    return (
      <>
        {header}
        <div className="mx-auto flex max-w-2xl flex-col items-center gap-4 p-16 text-center">
          <div className="relative flex size-16 items-center justify-center rounded-2xl bg-ai-muted text-ai">
            <Sparkles className="size-7" />
            <Loader2 className="absolute size-16 animate-spin text-ai/40" />
          </div>
          <h2 className="text-lg font-semibold">Scanning document…</h2>
          <p className="max-w-sm text-sm text-muted-foreground text-pretty">
            The agent is extracting Article 30 attributes, scoring confidence, and looking for
            vendor, asset, and personal data relationships.
          </p>
        </div>
      </>
    )
  }

  if (stage === 'review') {
    return (
      <>
        {header}
        <div className="mx-auto max-w-3xl space-y-5 p-6">
        {/* Summary */}
        <Card>
          <CardContent className="p-5">
            <div className="flex items-start gap-3">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-ai-muted text-ai">
                <Sparkles className="size-4.5" />
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold">
                    {mode === 'enrich' && target
                      ? `Proposed updates for “${target.name}”`
                      : 'Proposed new record'}
                  </span>
                  <Badge variant="secondary">
                    <FileText /> {docMeta.kind}
                  </Badge>
                </div>
                <p className="mt-1 text-sm text-muted-foreground text-pretty">{summary}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Duplicate banner */}
        {mode === 'create' && duplicate && !dupDismissed && (
          <Card className="border-warning/40 bg-warning-muted/50">
            <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-2.5">
                <TriangleAlert className="mt-0.5 size-4 shrink-0 text-warning-foreground" />
                <div className="text-sm">
                  <p className="font-medium text-warning-foreground">Possible duplicate detected</p>
                  <p className="text-muted-foreground text-pretty">
                    This looks {Math.round(duplicate.score * 100)}% similar to{' '}
                    <span className="font-medium text-foreground">{duplicate.record.name}</span>.
                    Update that record instead of creating a new one?
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 gap-2">
                <Button size="sm" variant="outline" onClick={() => setDupDismissed(true)}>
                  Create new anyway
                </Button>
                <Button size="sm" onClick={() => switchToUpdate(duplicate)}>
                  Update existing
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Fields */}
        <div>
          <div className="mb-2 flex items-center justify-between px-1">
            <h3 className="text-sm font-semibold">
              Extracted attributes{' '}
              <span className="font-normal text-muted-foreground">
                ({acceptedFields.length}/{fields.length} approved)
              </span>
            </h3>
          </div>
          <div className="space-y-2.5">
            {fields.map((f) => (
              <FieldRow
                key={f.key}
                field={f}
                onChange={(patch) => updateField(f.key, patch)}
              />
            ))}
            {fields.length === 0 && (
              <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                The document did not contain enough information to extract attributes.
              </p>
            )}
          </div>
        </div>

        {/* Relationships */}
        {rels.length > 0 && (
          <div>
            <h3 className="mb-2 px-1 text-sm font-semibold">
              Suggested relationships{' '}
              <span className="font-normal text-muted-foreground">
                ({acceptedRels.length}/{rels.length} approved)
              </span>
            </h3>
            <div className="space-y-2.5">
              {rels.map((r, i) => (
                <RelRow key={`${r.type}-${r.name}-${i}`} rel={r} onChange={(p) => updateRel(i, p)} />
              ))}
            </div>
          </div>
        )}

        {/* Commit bar */}
        <div className="sticky bottom-0 -mx-6 flex items-center justify-between border-t border-border bg-background/90 px-6 py-3 backdrop-blur">
          <p className="text-xs text-muted-foreground">
            Nothing is saved until you commit. {acceptedFields.length} field(s) &{' '}
            {acceptedRels.length} relationship(s) will be committed.
          </p>
          <Button onClick={commit} disabled={acceptedFields.length === 0 && mode === 'create'}>
            <Check className="size-4" />
            {mode === 'enrich' ? 'Commit updates' : 'Create record'}
          </Button>
        </div>
        </div>
      </>
    )
  }

  // stage === 'input'
  return (
    <>
      {header}
      <div className="mx-auto max-w-3xl space-y-5 p-6">
      {error && (
        <Card className="border-danger/40 bg-danger-muted/50">
          <CardContent className="flex items-center gap-2 p-3 text-sm text-danger">
            <TriangleAlert className="size-4" /> {error}
          </CardContent>
        </Card>
      )}

      {/* Mode */}
      <Card>
        <CardHeader>
          <CardTitle>1. What are you working on?</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => {
                setMode('create')
                setTargetId(null)
              }}
              className={cn(
                'rounded-lg border p-3 text-left text-sm transition-colors',
                mode === 'create'
                  ? 'border-primary bg-primary/5 ring-1 ring-primary/30'
                  : 'border-border hover:bg-muted/50',
              )}
            >
              <div className="font-medium">New processing activity</div>
              <div className="text-xs text-muted-foreground">Draft a brand new Article 30 record</div>
            </button>
            <button
              onClick={() => setMode('enrich')}
              className={cn(
                'rounded-lg border p-3 text-left text-sm transition-colors',
                mode === 'enrich'
                  ? 'border-primary bg-primary/5 ring-1 ring-primary/30'
                  : 'border-border hover:bg-muted/50',
              )}
            >
              <div className="font-medium">Enrich existing record</div>
              <div className="text-xs text-muted-foreground">Add attributes / relationships</div>
            </button>
          </div>
          {mode === 'enrich' && (
            <select
              value={targetId ?? ''}
              onChange={(e) => setTargetId(e.target.value || null)}
              className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"
            >
              <option value="">Select a record to enrich…</option>
              {activities.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          )}
        </CardContent>
      </Card>

      {/* Document */}
      <Card>
        <CardHeader>
          <CardTitle>2. Provide a source document</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <p className="mb-2 text-xs font-medium text-muted-foreground">Try a sample document</p>
            <div className="grid gap-2 sm:grid-cols-3">
              {SAMPLE_DOCS.map((doc) => (
                <button
                  key={doc.id}
                  onClick={() => pickSample(doc)}
                  className={cn(
                    'flex flex-col gap-1 rounded-lg border p-3 text-left transition-colors',
                    selectedSample === doc.id
                      ? 'border-primary bg-primary/5 ring-1 ring-primary/30'
                      : 'border-border hover:bg-muted/50',
                  )}
                >
                  <FileText className="size-4 text-muted-foreground" />
                  <span className="text-xs font-medium leading-snug text-pretty">{doc.title}</span>
                  <Badge variant="secondary" className="mt-0.5 w-fit">
                    {doc.kind}
                  </Badge>
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-1.5 text-xs font-medium text-muted-foreground">
              Or paste document text
            </p>
            <textarea
              value={docText}
              onChange={(e) => {
                setDocText(e.target.value)
                setSelectedSample(null)
                // Keep an attached file as the named evidence source even when
                // the user pastes its text in manually.
                if (!attachedFile) setDocMeta({ title: 'Pasted document', kind: 'Document' })
              }}
              rows={7}
              placeholder="Paste a project brief, vendor contract, DPIA, or intake form…"
              className="w-full resize-y rounded-lg border border-border bg-background p-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"
            />
          </div>
          <div>
            <p className="mb-1.5 text-xs font-medium text-muted-foreground">Or upload a file</p>
            <FileDropZone
              attached={attachedFile}
              error={uploadError}
              onAttach={attachFile}
              onError={setUploadError}
              onClear={clearAttachedFile}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-end gap-3">
        <Button
          size="lg"
          className="gap-2"
          onClick={runScan}
          disabled={docText.trim().length < 20 || (mode === 'enrich' && !targetId)}
        >
          <Sparkles className="size-4" />
          Scan with AI
        </Button>
      </div>
      </div>
    </>
  )
}

function FieldRow({
  field,
  onChange,
}: {
  field: FieldReview
  onChange: (patch: Partial<FieldReview>) => void
}) {
  const [editing, setEditing] = useState(false)
  const band = confidenceBand(field.confidence)
  return (
    <div
      className={cn(
        'rounded-lg border p-3 transition-colors',
        field.accepted ? 'border-border bg-card' : 'border-dashed border-border bg-muted/30',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">
              {FIELD_LABELS[field.key]}
            </span>
            <ConfidenceBadge value={field.confidence} />
            {field.edited && <Badge variant="secondary">Edited</Badge>}
          </div>
          {editing ? (
            <textarea
              autoFocus
              value={field.value}
              onChange={(e) => onChange({ value: e.target.value, edited: true })}
              rows={2}
              className="mt-1.5 w-full resize-y rounded-md border border-border bg-background p-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
            />
          ) : (
            <p className="mt-1 text-sm text-pretty">{field.value}</p>
          )}
          {field.evidence && (
            <p className="mt-1.5 border-l-2 border-ai/30 pl-2 text-xs text-muted-foreground italic">
              “{field.evidence}”
            </p>
          )}
          {band === 'low' && !field.accepted && (
            <p className="mt-1.5 text-xs text-danger">
              Low confidence — review and accept manually if correct.
            </p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Button
            size="icon-sm"
            variant="ghost"
            aria-label="Edit"
            onClick={() => setEditing((v) => !v)}
          >
            <Pencil className="size-3.5" />
          </Button>
          {field.accepted ? (
            <Button
              size="icon-sm"
              variant="ghost"
              aria-label="Reject"
              className="text-danger"
              onClick={() => onChange({ accepted: false })}
            >
              <X className="size-4" />
            </Button>
          ) : (
            <Button
              size="icon-sm"
              variant="ghost"
              aria-label="Accept"
              className="text-success"
              onClick={() => onChange({ accepted: true })}
            >
              <Check className="size-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

function RelRow({
  rel,
  onChange,
}: {
  rel: RelReview
  onChange: (patch: Partial<RelReview>) => void
}) {
  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-lg border p-3 transition-colors',
        rel.accepted ? 'border-border bg-card' : 'border-dashed border-border bg-muted/30',
      )}
    >
      <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-accent text-accent-foreground">
        <Link2 className="size-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium">{rel.name}</span>
          <Badge variant="outline">{RELATIONSHIP_LABEL[rel.type]}</Badge>
          <ConfidenceBadge value={rel.confidence} />
          {rel.inventoryId ? (
            <Badge variant="success">
              <CircleCheck /> Matched in inventory
            </Badge>
          ) : (
            <Badge variant="warning">
              <TriangleAlert /> Unresolved
            </Badge>
          )}
        </div>
        {rel.evidence && (
          <p className="mt-1 border-l-2 border-ai/30 pl-2 text-xs text-muted-foreground italic">
            “{rel.evidence}”
          </p>
        )}
        {!rel.inventoryId && (
          <p className="mt-1 text-xs text-muted-foreground">
            Not found in inventory — will be stored as an unresolved suggestion for later mapping.
          </p>
        )}
      </div>
      {rel.accepted ? (
        <Button
          size="icon-sm"
          variant="ghost"
          aria-label="Reject"
          className="text-danger"
          onClick={() => onChange({ accepted: false })}
        >
          <X className="size-4" />
        </Button>
      ) : (
        <Button
          size="icon-sm"
          variant="ghost"
          aria-label="Accept"
          className="text-success"
          onClick={() => onChange({ accepted: true })}
        >
          <Undo2 className="size-4" />
        </Button>
      )}
    </div>
  )
}
