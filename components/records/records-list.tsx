'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Search, Sparkles, Plus, ChevronRight, FileText, CalendarClock, PieChart, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { PageHeader } from '@/components/app-shell'
import { StatusBadge, ProvenanceTag, CompletenessMeter } from '@/components/badges'
import { useStore } from '@/lib/store'
import { reviewState, formatDate, completeness, STATUS_LABEL } from '@/lib/ropa'
import type { RecordStatus } from '@/lib/types'
import { cn } from '@/lib/utils'

const FILTERS: { key: RecordStatus | 'all'; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'active', label: 'Active' },
  { key: 'draft', label: 'Draft' },
  { key: 'under_review', label: 'Under review' },
  { key: 'archived', label: 'Archived' },
]

const STATUS_KPIS: { key: RecordStatus; label: string; tone: string }[] = [
  { key: 'active', label: 'Active', tone: 'bg-primary' },
  { key: 'draft', label: 'Draft', tone: 'bg-ai' },
  { key: 'under_review', label: 'Under review', tone: 'bg-warning' },
  { key: 'archived', label: 'Archived', tone: 'bg-muted-foreground' },
]

function KpiCard({
  label,
  value,
  sub,
  icon: Icon,
  action,
  children,
}: {
  label: string
  value: string
  sub: string
  icon: React.ElementType
  action?: { label: string; onClick: () => void }
  children?: React.ReactNode
}) {
  return (
    <Card className="h-full">
      <CardContent className="flex h-full flex-col p-5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground">{label}</span>
          <Icon className="size-4 text-muted-foreground" aria-hidden="true" />
        </div>
        <div className="mt-2 flex flex-1 flex-col justify-between gap-4">
          <div className="flex items-end gap-4">
            <div>
              <div className="font-mono text-3xl font-semibold tracking-tight">{value}</div>
              <div className="mt-1 text-xs text-muted-foreground">{sub}</div>
            </div>
            {children}
          </div>
          {action && (
            <Button variant="default" size="sm" className="w-fit" onClick={action.onClick}>
              {action.label}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

function StatusDonut({ counts, total }: { counts: Record<RecordStatus, number>; total: number }) {
  const radius = 25
  const circumference = 2 * Math.PI * radius
  let offset = 0
  const segments = STATUS_KPIS.map((status) => {
    const length = total ? (counts[status.key] / total) * circumference : 0
    const segment = { ...status, length, offset }
    offset += length
    return segment
  })

  return (
    <div className="flex items-center gap-4">
      <div className="relative size-16 shrink-0" aria-label={`Record status distribution: ${total} total records`} role="img">
        <svg className="size-full -rotate-90" viewBox="0 0 64 64" aria-hidden="true">
          <circle cx="32" cy="32" r={radius} fill="none" className="stroke-muted" strokeWidth="8" />
          {segments.map((segment) => (
            <circle
              key={segment.key}
              cx="32"
              cy="32"
              r={radius}
              fill="none"
              className={segment.tone.replace('bg-', 'stroke-')}
              strokeWidth="8"
              strokeDasharray={`${segment.length} ${circumference - segment.length}`}
              strokeDashoffset={-segment.offset}
            />
          ))}
        </svg>
        <span className="absolute inset-0 flex items-center justify-center font-mono text-sm font-semibold">{total}</span>
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1 text-xs">
        {segments.map((segment) => (
          <div key={segment.key} className="flex items-center justify-between gap-2">
            <span className="flex min-w-0 items-center gap-1.5 text-muted-foreground">
              <span className={`size-2 shrink-0 rounded-full ${segment.tone}`} aria-hidden="true" />
              <span className="truncate">{segment.label}</span>
            </span>
            <span className="font-mono text-foreground">{counts[segment.key]}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export function RecordsList() {
  const router = useRouter()
  const { activities } = useStore()
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<RecordStatus | 'all'>('all')
  const [certificationFilter, setCertificationFilter] = useState(false)
  const [recruitmentNeedsCertification, setRecruitmentNeedsCertification] = useState(false)

  useEffect(() => {
    const timer = window.setTimeout(() => setRecruitmentNeedsCertification(true), 1000)
    return () => window.clearTimeout(timer)
  }, [])

  const filtered = useMemo(() => {
    return activities.filter((a) => {
      const matchesFilter = filter === 'all' || a.status === filter
      const matchesCertification = !certificationFilter || ['overdue', 'due_soon'].includes(reviewState(a))
      const q = query.trim().toLowerCase()
      const matchesQuery =
        !q ||
        a.name.toLowerCase().includes(q) ||
        a.purpose.toLowerCase().includes(q) ||
        a.managingOrganization.toLowerCase().includes(q)
      return matchesFilter && matchesCertification && matchesQuery
    })
  }, [activities, certificationFilter, filter, query])

  const statusCounts = useMemo(
    () =>
      activities.reduce<Record<RecordStatus, number>>(
        (counts, activity) => ({ ...counts, [activity.status]: counts[activity.status] + 1 }),
        { active: 0, draft: 0, under_review: 0, archived: 0 },
      ),
    [activities],
  )
  const dueForCertification = activities.filter((activity) => {
    const state = reviewState(activity)
    return state === 'overdue' || state === 'due_soon'
  }).length

  return (
    <>
      <PageHeader
        title="RoPA Records"
        description={`${activities.length} processing activities in the register`}
        actions={
          <Button onClick={() => router.push('/ropa-authoring')} className="gap-2">
            <Sparkles className="size-4" />
            Author with AI
          </Button>
        }
      />
      <div className="flex flex-col gap-4 py-6 pl-5 pr-5">
        <div className="grid gap-4 md:grid-cols-3">
          <KpiCard
            label="Active records"
            value={String(statusCounts.active)}
            sub={`${activities.length} total records in register`}
            icon={FileText}
            action={{ label: 'View active', onClick: () => { setFilter('active'); setCertificationFilter(false) } }}
          />
          <KpiCard
            label="Due for certification"
            value={String(dueForCertification)}
            sub={dueForCertification === 0 ? 'All records are current' : 'Due soon or overdue'}
            icon={CalendarClock}
            action={{ label: 'View records', onClick: () => { setFilter('all'); setCertificationFilter(true) } }}
          />
          <KpiCard
            label="Records by status"
            value={`${activities.length}`}
            sub="Current register distribution"
            icon={PieChart}
          >
            <StatusDonut counts={statusCounts} total={activities.length} />
          </KpiCard>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex w-full flex-wrap items-center gap-2 sm:max-w-2xl">
            <div className="relative min-w-[220px] flex-1">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search activities…"
                className="h-9 w-full rounded-lg border border-input bg-card pl-9 pr-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
            {filter === 'active' && !certificationFilter && (
              <button type="button" onClick={() => setFilter('all')} className="inline-flex h-8 items-center gap-1.5 rounded-full bg-primary/10 px-3 text-xs font-medium text-primary hover:bg-primary/15">
                Active <X className="size-3" aria-hidden="true" />
              </button>
            )}
            {certificationFilter && (
              <button type="button" onClick={() => { setCertificationFilter(false); setFilter('all') }} className="inline-flex h-8 items-center gap-1.5 rounded-full bg-warning/15 px-3 text-xs font-medium text-warning hover:bg-warning/20">
                Due for certification <X className="size-3" aria-hidden="true" />
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                onClick={() => { setFilter(f.key); setCertificationFilter(false) }}
                className={cn(
                  'rounded-full px-3 py-1 text-xs font-medium transition-colors',
                  filter === f.key
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-muted/70',
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <div className="hidden grid-cols-[minmax(0,1fr)_140px_120px_130px_130px_20px] gap-4 border-b border-border bg-muted/40 px-4 py-2.5 text-xs font-medium uppercase tracking-wide text-muted-foreground md:grid">
            <span>Activity</span>
            <span>Status</span>
            <span>Origin</span>
            <span>Completeness</span>
            <span>Next review</span>
            <span />
          </div>
          {filtered.length === 0 && (
            <div className="flex flex-col items-center gap-3 px-4 py-16 text-center">
              <p className="text-sm text-muted-foreground">No records match your filters.</p>
              <Button variant="outline" size="sm" onClick={() => router.push('/author')} className="gap-2">
                <Plus className="size-4" /> Author a new record
              </Button>
            </div>
          )}
          {filtered.map((a) => {
            const rs = reviewState(a)
            return (
              <Link
                key={a.id}
                href={`/records/${a.id}`}
                className="grid grid-cols-1 gap-2 border-b border-border px-4 py-3.5 transition-colors last:border-0 hover:bg-muted/40 md:grid-cols-[minmax(0,1fr)_140px_120px_130px_130px_20px] md:items-center md:gap-4"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-medium text-foreground">{a.name}</span>
                    {a.parentId && (
                      <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                        Local variation
                      </span>
                    )}
                  </div>
                  <p className="truncate text-xs text-muted-foreground">{a.purpose}</p>
                </div>
                <div>
                  {a.name === 'AI-Assisted Candidate Screening & Recruitment' ? (
                    recruitmentNeedsCertification ? (
                      <span className="inline-flex animate-[badge-pop_360ms_ease-out]">
                        <Badge variant="warning">Recertification needed</Badge>
                      </span>
                    ) : (
                      <StatusBadge status="active" />
                    )
                  ) : (
                    <StatusBadge status={a.status} />
                  )}
                </div>
                <div>
                  <ProvenanceTag createdWithAI={a.createdWithAI} updatedWithAI={a.updatedWithAI} />
                </div>
                <div>
                  <CompletenessMeter value={completeness(a)} />
                </div>
                <div
                  className={cn(
                    'text-xs',
                    rs === 'overdue'
                      ? 'font-medium text-danger'
                      : rs === 'due_soon'
                        ? 'font-medium text-warning'
                        : 'text-muted-foreground',
                  )}
                >
                  {rs === 'overdue' ? 'Overdue · ' : ''}
                  {formatDate(a.nextReviewAt)}
                </div>
                <ChevronRight className="hidden size-4 text-muted-foreground md:block" />
              </Link>
            )
          })}
        </div>
        <div className="flex justify-end pt-3">
          <Link
            href="/meetings-demo"
            className="text-xs text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
          >
            Meetings demo
          </Link>
        </div>
      </div>
    </>
  )
}
