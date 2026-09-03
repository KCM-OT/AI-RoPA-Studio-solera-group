'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  Pencil,
  Check,
  X,
  Sparkles,
  FileText,
  GitBranch,
  CalendarClock,
  User,
  ClipboardCheck,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button, buttonVariants } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  StatusBadge,
  ConfidenceBadge,
  ReviewBadge,
  CompletenessMeter,
} from '@/components/badges'
import { RelationshipPanel } from '@/components/records/relationship-panel'
import { AiReview } from '@/components/records/ai-review'
import { PostureRequirements } from '@/components/records/posture-requirements'
import { RecertificationExampleDetail } from '@/components/records/recertification-example-detail'
import { PageHeader } from '@/components/app-shell'
import { useStore } from '@/lib/store'
import { FIELD_LABELS, FIELD_ORDER } from '@/lib/authoring'
import { completeness, formatDate, reviewState } from '@/lib/ropa'
import type { FieldKey, ProcessingActivity, Relationship } from '@/lib/types'
import { cn } from '@/lib/utils'

function fieldValue(pa: ProcessingActivity, key: FieldKey): string {
  if (key === 'dataSubjectCategories') return pa.dataSubjectCategories.join(', ')
  const v = pa[key as keyof ProcessingActivity]
  return typeof v === 'string' ? v : ''
}

export function RecordDetail({ id }: { id: string }) {
  const router = useRouter()
  const { getActivity, updateActivity, logEvent, submissions } = useStore()
  const record = getActivity(id)
  const pendingSubmission = submissions.find(
    (s) =>
      s.recordId === id &&
      (s.status === 'pending_review' || s.status === 'changes_requested'),
  )
  const [editing, setEditing] = useState<FieldKey | null>(null)
  const [draft, setDraft] = useState('')

  if (record?.id === 'recertification-example') {
    return <RecertificationExampleDetail record={record} />
  }

  if (!record) {
    return (
      <>
        <PageHeader title="Record not found" />
        <div className="p-6">
          <Button variant="outline" onClick={() => router.push('/records')} className="gap-2">
            <ArrowLeft className="size-4" /> Back to records
          </Button>
        </div>
      </>
    )
  }

  function startEdit(key: FieldKey) {
    setEditing(key)
    setDraft(fieldValue(record!, key))
  }

  function saveEdit(key: FieldKey) {
    const patch: Partial<ProcessingActivity> =
      key === 'dataSubjectCategories'
        ? { dataSubjectCategories: draft.split(',').map((s) => s.trim()).filter(Boolean) }
        : ({ [key]: draft } as Partial<ProcessingActivity>)
    const meta = { ...record!.fieldMeta }
    // editing a field promotes it to human-verified provenance
    meta[key] = { provenance: 'manual' }
    updateActivity(record!.id, { ...patch, fieldMeta: meta })
    logEvent({
      actor: 'You',
      action: 'field_edited',
      recordId: record!.id,
      recordName: record!.name,
      detail: `Edited "${FIELD_LABELS[key]}"`,
    })
    setEditing(null)
  }

  function updateRelationship(relId: string, status: Relationship['status']) {
    const rels = record!.relationships.map((r) =>
      r.id === relId ? { ...r, status } : r,
    )
    updateActivity(record!.id, { relationships: rels })
    const rel = record!.relationships.find((r) => r.id === relId)
    logEvent({
      actor: 'You',
      action: status === 'accepted' ? 'relationship_accepted' : 'relationship_rejected',
      recordId: record!.id,
      recordName: record!.name,
      detail: `${status === 'accepted' ? 'Linked' : 'Rejected'} ${rel?.type} "${rel?.name}"`,
    })
  }

  const rs = reviewState(record)
  const suggestedRels = record.relationships.filter((r) => r.status === 'suggested').length

  return (
    <>
      <PageHeader
        title={record.name}
        description={record.purpose}
        actions={
          <div className="flex items-center gap-2">
            {pendingSubmission ? (
              <Link
                href={`/review/${pendingSubmission.id}`}
                className={cn(buttonVariants({ size: 'sm' }), 'gap-1.5')}
              >
                <ClipboardCheck className="size-4" /> In review
              </Link>
            ) : (
              <Link
                href={`/recertify/${record.id}`}
                className={cn(buttonVariants({ size: 'sm' }), 'gap-1.5')}
              >
                <ClipboardCheck className="size-4" /> Recertify
              </Link>
            )}
            <Button variant="outline" onClick={() => router.push('/records')} className="gap-2">
              <ArrowLeft className="size-4" /> All records
            </Button>
          </div>
        }
      />
      <div className="grid grid-cols-1 gap-5 p-6 lg:grid-cols-3">
        {/* Left: Article 30 attributes */}
        <div className="flex flex-col gap-5 lg:col-span-2">
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle>Article 30 attributes</CardTitle>
              <div className="flex items-center gap-2">
                <StatusBadge status={record.status} />
                <CompletenessMeter value={completeness(record)} />
              </div>
            </CardHeader>
            <CardContent className="divide-y divide-border">
              {FIELD_ORDER.map((key) => {
                const value = fieldValue(record, key)
                const meta = record.fieldMeta[key]
                const isEditing = editing === key
                const isLong =
                  key === 'description' ||
                  key === 'securityMeasures' ||
                  key === 'purpose'
                return (
                  <div key={key} className="py-3 first:pt-0 last:pb-0">
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        {FIELD_LABELS[key]}
                      </span>
                      <div className="flex items-center gap-1.5">
                        {meta?.provenance === 'ai' ? (
                          <span className="flex items-center gap-1 text-[10px] font-medium text-ai">
                            <Sparkles className="size-3" /> AI
                          </span>
                        ) : meta?.provenance === 'manual' ? (
                          <span className="flex items-center gap-1 text-[10px] font-medium text-muted-foreground">
                            <User className="size-3" /> Verified
                          </span>
                        ) : null}
                        {meta?.provenance === 'ai' && typeof meta.confidence === 'number' && (
                          <ConfidenceBadge value={meta.confidence} />
                        )}
                        {!isEditing && (
                          <button
                            onClick={() => startEdit(key)}
                            aria-label={`Edit ${FIELD_LABELS[key]}`}
                            className="flex size-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                          >
                            <Pencil className="size-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                    {isEditing ? (
                      <div className="flex flex-col gap-2">
                        {isLong ? (
                          <textarea
                            value={draft}
                            onChange={(e) => setDraft(e.target.value)}
                            rows={3}
                            className="w-full rounded-lg border border-input bg-background p-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          />
                        ) : (
                          <input
                            value={draft}
                            onChange={(e) => setDraft(e.target.value)}
                            className="h-9 w-full rounded-lg border border-input bg-background px-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          />
                        )}
                        <div className="flex items-center gap-2">
                          <Button size="sm" onClick={() => saveEdit(key)} className="gap-1.5">
                            <Check className="size-3.5" /> Save
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setEditing(null)}
                            className="gap-1.5"
                          >
                            <X className="size-3.5" /> Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <p
                          className={cn(
                            'text-sm text-pretty',
                            value ? 'text-foreground' : 'italic text-muted-foreground/60',
                          )}
                        >
                          {value || 'Not documented'}
                        </p>
                        {meta?.provenance === 'ai' && meta.evidence && (
                          <p className="mt-1 border-l-2 border-ai/30 pl-2 text-xs italic text-muted-foreground">
                            &ldquo;{meta.evidence}&rdquo;
                          </p>
                        )}
                      </>
                    )}
                  </div>
                )
              })}
            </CardContent>
          </Card>

          <RelationshipPanel
            relationships={record.relationships}
            onAccept={(rid) => updateRelationship(rid, 'accepted')}
            onReject={(rid) => updateRelationship(rid, 'rejected')}
          />
        </div>

        {/* Right: governance + AI */}
        <div className="flex flex-col gap-5">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarClock className="size-4 text-primary" /> Governance
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 text-sm">
              <Row label="Review status">
                <ReviewBadge state={rs} />
              </Row>
              <Row label="Review cadence">
                {record.reviewCadenceDays ? `${record.reviewCadenceDays} days` : '—'}
              </Row>
              <Row label="Last reviewed">{formatDate(record.lastReviewedAt)}</Row>
              <Row label="Next review">{formatDate(record.nextReviewAt)}</Row>
              <Row label="Created">{formatDate(record.createdAt)}</Row>
              <Row label="Updated">{formatDate(record.updatedAt)}</Row>
              {suggestedRels > 0 && (
                <div className="mt-1 rounded-lg bg-ai/10 p-2 text-xs text-ai-foreground">
                  <Sparkles className="mr-1 inline size-3 text-ai" />
                  {suggestedRels} relationship suggestion{suggestedRels > 1 ? 's' : ''} awaiting
                  your review.
                </div>
              )}
            </CardContent>
          </Card>

          {record.id !== 'recertification-example' && <PostureRequirements record={record} />}

          <AiReview record={record} />

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="size-4 text-primary" /> Source documents
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              {record.sourceDocuments.length === 0 && (
                <p className="text-sm text-muted-foreground">No documents attached.</p>
              )}
              {record.sourceDocuments.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-start gap-2 rounded-lg border border-border bg-card p-2.5"
                >
                  <FileText className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium text-foreground">{doc.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {doc.kind} · {formatDate(doc.addedAt)}
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {record.parentId && (
            <Link
              href={`/records/${record.parentId}`}
              className="flex items-center gap-2 rounded-lg border border-border bg-card p-3 text-sm text-muted-foreground transition-colors hover:bg-muted/40"
            >
              <GitBranch className="size-4" />
              This is a local variation of a global record. View parent.
            </Link>
          )}
        </div>
      </div>
    </>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-foreground">{children}</span>
    </div>
  )
}
