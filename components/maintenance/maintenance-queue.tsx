'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import {
  CalendarClock,
  CircleCheck,
  Clock,
  AlertTriangle,
  Sparkles,
  ClipboardCheck,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button, buttonVariants } from '@/components/ui/button'
import { PageHeader } from '@/components/app-shell'
import { CompletenessMeter } from '@/components/badges'
import { useStore } from '@/lib/store'
import { reviewState, formatDate, relativeDays, completeness } from '@/lib/ropa'
import type { ProcessingActivity } from '@/lib/types'
import { cn } from '@/lib/utils'
import { ReviewQueueContent } from '@/components/review/review-queue'

export function MaintenanceQueue() {
  const { activities, updateActivity, logEvent } = useStore()

  const { overdue, dueSoon, incomplete, onTrack } = useMemo(() => {
    const overdue: ProcessingActivity[] = []
    const dueSoon: ProcessingActivity[] = []
    const onTrack: ProcessingActivity[] = []
    for (const a of activities) {
      const rs = reviewState(a)
      if (rs === 'overdue') overdue.push(a)
      else if (rs === 'due_soon') dueSoon.push(a)
      else onTrack.push(a)
    }
    const incomplete = activities.filter((a) => completeness(a) < 70)
    return { overdue, dueSoon, incomplete, onTrack }
  }, [activities])

  function markReviewed(pa: ProcessingActivity) {
    const now = new Date()
    const cadence = pa.reviewCadenceDays ?? 180
    const next = new Date(now.getTime() + cadence * 24 * 60 * 60 * 1000)
    updateActivity(pa.id, {
      lastReviewedAt: now.toISOString(),
      nextReviewAt: next.toISOString(),
      status: pa.status === 'under_review' ? 'active' : pa.status,
    })
    logEvent({
      actor: 'You',
      action: 'review_completed',
      recordId: pa.id,
      recordName: pa.name,
      detail: `Marked reviewed; next review ${next.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`,
    })
  }

  return (
    <>
      <PageHeader
        title="Maintenance"
        description="Keep the register current — the agent surfaces records that are stale, due, or incomplete."
      />
      <div className="flex flex-col gap-5 p-6">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <StatTile label="Overdue" value={overdue.length} tone="danger" icon={AlertTriangle} />
          <StatTile label="Due within 30 days" value={dueSoon.length} tone="warning" icon={Clock} />
          <StatTile label="Below 70% complete" value={incomplete.length} tone="primary" icon={Sparkles} />
        </div>

        <QueueSection
          title="Overdue review"
          tone="danger"
          items={overdue}
          onMarkReviewed={markReviewed}
          emptyText="Nothing overdue. Nice."
        />
        <QueueSection
          title="Due soon"
          tone="warning"
          items={dueSoon}
          onMarkReviewed={markReviewed}
          emptyText="No records due in the next 30 days."
        />
        <QueueSection
          title="On track"
          tone="ok"
          items={onTrack}
          onMarkReviewed={markReviewed}
          emptyText="No scheduled records yet."
          collapsedByDefault
        />

        <section className="flex flex-col gap-3">
          <h2 className="text-base font-semibold text-foreground">Recertification review</h2>
          <ReviewQueueContent />
        </section>
      </div>
    </>
  )
}

function StatTile({
  label,
  value,
  tone,
  icon: Icon,
}: {
  label: string
  value: number
  tone: 'danger' | 'warning' | 'primary'
  icon: typeof Clock
}) {
  const toneCls = {
    danger: 'text-danger bg-danger/10',
    warning: 'text-warning bg-warning/10',
    primary: 'text-primary bg-primary/10',
  }[tone]
  return (
    <Card>
      <CardContent className="flex items-center gap-3 py-4">
        <div className={cn('flex size-10 items-center justify-center rounded-lg', toneCls)}>
          <Icon className="size-5" />
        </div>
        <div>
          <div className="text-2xl font-semibold tabular-nums text-foreground">{value}</div>
          <div className="text-xs text-muted-foreground">{label}</div>
        </div>
      </CardContent>
    </Card>
  )
}

function QueueSection({
  title,
  tone,
  items,
  onMarkReviewed,
  emptyText,
}: {
  title: string
  tone: 'danger' | 'warning' | 'ok'
  items: ProcessingActivity[]
  onMarkReviewed: (pa: ProcessingActivity) => void
  emptyText: string
  collapsedByDefault?: boolean
}) {
  const dot = {
    danger: 'bg-danger',
    warning: 'bg-warning',
    ok: 'bg-success',
  }[tone]

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span className={cn('size-2 rounded-full', dot)} />
          {title}
          <span className="ml-1 text-sm font-normal text-muted-foreground">({items.length})</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">{emptyText}</p>
        ) : (
          <ul className="flex flex-col divide-y divide-border">
            {items.map((a) => {
              const days = relativeDays(a.nextReviewAt)
              return (
                <li
                  key={a.id}
                  className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <Link
                      href={`/records/${a.id}`}
                      className="text-sm font-medium text-foreground hover:text-primary hover:underline"
                    >
                      {a.name}
                    </Link>
                    <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <CalendarClock className="size-3.5" />
                        {a.nextReviewAt
                          ? days !== null && days < 0
                            ? `${Math.abs(days)} days overdue`
                            : `due ${formatDate(a.nextReviewAt)}`
                          : 'no cadence set'}
                      </span>
                      <CompletenessMeter value={completeness(a)} />
                    </div>
                  </div>
                  <div className="flex w-fit items-center gap-2">
                    <Link
                      href={`/recertify/${a.id}`}
                      className={cn(
                        buttonVariants({ variant: 'default', size: 'sm' }),
                        'gap-1.5',
                      )}
                    >
                      <ClipboardCheck className="size-4" /> Recertify
                    </Link>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onMarkReviewed(a)}
                      className="w-fit gap-1.5"
                    >
                      <CircleCheck className="size-4 text-success" /> Mark reviewed
                    </Button>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
