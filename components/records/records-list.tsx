'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Search, Sparkles, Plus, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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

export function RecordsList() {
  const router = useRouter()
  const { activities } = useStore()
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<RecordStatus | 'all'>('all')
  const [recruitmentNeedsCertification, setRecruitmentNeedsCertification] = useState(false)

  useEffect(() => {
    const timer = window.setTimeout(() => setRecruitmentNeedsCertification(true), 1000)
    return () => window.clearTimeout(timer)
  }, [])

  const filtered = useMemo(() => {
    return activities.filter((a) => {
      const matchesFilter = filter === 'all' || a.status === filter
      const q = query.trim().toLowerCase()
      const matchesQuery =
        !q ||
        a.name.toLowerCase().includes(q) ||
        a.purpose.toLowerCase().includes(q) ||
        a.managingOrganization.toLowerCase().includes(q)
      return matchesFilter && matchesQuery
    })
  }, [activities, filter, query])

  return (
    <>
      <PageHeader
        title="RoPA Records"
        description={`${activities.length} processing activities in the register`}
        actions={
          <Button onClick={() => router.push('/author')} className="gap-2">
            <Sparkles className="size-4" />
            Author with AI
          </Button>
        }
      />
      <div className="flex flex-col gap-4 p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search activities…"
              className="h-9 w-full rounded-lg border border-input bg-card pl-9 pr-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
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
          <div className="hidden grid-cols-[1fr_130px_120px_130px_130px_20px] gap-4 border-b border-border bg-muted/40 px-4 py-2.5 text-xs font-medium uppercase tracking-wide text-muted-foreground md:grid">
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
                className="grid grid-cols-1 gap-2 border-b border-border px-4 py-3.5 transition-colors last:border-0 hover:bg-muted/40 md:grid-cols-[1fr_130px_120px_130px_130px_20px] md:items-center md:gap-4"
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
      </div>
    </>
  )
}
