'use client'

import Link from 'next/link'
import { ClipboardCheck, ArrowRight, CheckCircle2, PencilLine } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { PageHeader } from '@/components/app-shell'
import { useStore } from '@/lib/store'
import { changeCount, SUBMISSION_STATUS_LABEL } from '@/lib/recert'
import { formatDate } from '@/lib/ropa'
import type { ChangeSubmission, SubmissionStatus } from '@/lib/types'
import { cn } from '@/lib/utils'

const STATUS_STYLE: Record<SubmissionStatus, string> = {
  pending_review: 'bg-warning/15 text-warning border-warning/30',
  changes_requested: 'bg-ai/15 text-ai border-ai/30',
  approved: 'bg-success/15 text-success border-success/30',
  committed: 'bg-muted text-muted-foreground border-border',
}

export function ReviewQueue() {
  const { submissions } = useStore()

  const open = submissions.filter(
    (s) => s.status === 'pending_review' || s.status === 'changes_requested',
  )
  const closed = submissions.filter(
    (s) => s.status === 'approved' || s.status === 'committed',
  )

  const pendingFollowUps = submissions.reduce(
    (n, s) => n + s.followUps.filter((f) => f.status === 'sent').length,
    0,
  )

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Recertification review"
        description="Change submissions from business process owners waiting for privacy operations sign-off before they hit the register."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Awaiting your review" value={open.length} tone="warning" />
        <StatCard label="Follow-ups out" value={pendingFollowUps} tone="ai" />
        <StatCard label="Completed" value={closed.length} tone="muted" />
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-foreground">Needs review</h2>
        {open.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="flex flex-col gap-3">
            {open.map((s) => (
              <SubmissionRow key={s.id} submission={s} />
            ))}
          </div>
        )}
      </section>

      {closed.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold text-muted-foreground">Recently completed</h2>
          <div className="flex flex-col gap-3">
            {closed.map((s) => (
              <SubmissionRow key={s.id} submission={s} muted />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

function StatCard({
  label,
  value,
  tone,
}: {
  label: string
  value: number
  tone: 'warning' | 'ai' | 'muted'
}) {
  const toneClass =
    tone === 'warning'
      ? 'text-warning'
      : tone === 'ai'
        ? 'text-ai'
        : 'text-foreground'
  return (
    <Card>
      <CardContent className="flex flex-col gap-1 py-5">
        <span className={cn('text-3xl font-semibold tabular-nums', toneClass)}>{value}</span>
        <span className="text-sm text-muted-foreground">{label}</span>
      </CardContent>
    </Card>
  )
}

function SubmissionRow({
  submission,
  muted,
}: {
  submission: ChangeSubmission
  muted?: boolean
}) {
  const count = changeCount(submission)
  const answeredFollowUps = submission.followUps.filter((f) => f.status === 'answered').length
  const openFollowUps = submission.followUps.filter((f) => f.status === 'sent').length

  return (
    <Link href={`/review/${submission.id}`} className="group block">
      <Card
        className={cn(
          'transition-colors group-hover:border-primary/40',
          muted && 'opacity-80',
        )}
      >
        <CardContent className="flex items-center gap-4 py-4">
          <div
            className={cn(
              'flex size-10 shrink-0 items-center justify-center rounded-md',
              submission.decision === 'approved_as_is'
                ? 'bg-success/15 text-success'
                : 'bg-ai/15 text-ai',
            )}
          >
            {submission.decision === 'approved_as_is' ? (
              <CheckCircle2 className="size-5" />
            ) : (
              <PencilLine className="size-5" />
            )}
          </div>

          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="truncate font-medium text-foreground">
                {submission.recordName}
              </span>
              <Badge variant="outline" className={cn('text-xs', STATUS_STYLE[submission.status])}>
                {SUBMISSION_STATUS_LABEL[submission.status]}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground text-pretty">
              {submission.decision === 'approved_as_is'
                ? 'Recertified as accurate — no changes'
                : `${count} change${count === 1 ? '' : 's'} proposed`}
              {' · '}
              {submission.submittedBy}
              {' · '}
              {formatDate(submission.submittedAt)}
            </p>
          </div>

          <div className="hidden items-center gap-4 sm:flex">
            {openFollowUps > 0 && (
              <span className="text-xs text-warning">{openFollowUps} awaiting reply</span>
            )}
            {answeredFollowUps > 0 && openFollowUps === 0 && (
              <span className="text-xs text-success">{answeredFollowUps} answered</span>
            )}
            <ArrowRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}

function EmptyState() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <ClipboardCheck className="size-4 text-muted-foreground" />
          Queue is clear
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          No recertifications are waiting. New submissions from business process owners will appear
          here for review.
        </p>
      </CardContent>
    </Card>
  )
}
