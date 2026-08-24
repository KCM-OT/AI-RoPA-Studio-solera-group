'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Sparkles,
  TrendingUp,
  Link2,
  RefreshCw,
  ArrowRight,
  AlertTriangle,
  CircleCheck,
  CircleAlert,
  FileText,
  GitBranch,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useStore } from '@/lib/store'
import { completeness, computeMetrics, formatDate, reviewState } from '@/lib/ropa'
import type { ActivityLogEntry } from '@/lib/types'
import { ReviewBadge, StatusBadge } from '@/components/badges'

function MetricCard({
  label,
  value,
  sub,
  icon: Icon,
}: {
  label: string
  value: string
  sub: string
  icon: React.ElementType
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground">{label}</span>
          <Icon className="size-4 text-muted-foreground" />
        </div>
        <div className="mt-2 font-mono text-3xl font-semibold tracking-tight">{value}</div>
        <div className="mt-1 text-xs text-muted-foreground">{sub}</div>
      </CardContent>
    </Card>
  )
}

const LOG_ICON: Record<string, React.ElementType> = {
  record_created: FileText,
  variation_created: GitBranch,
  relationship_accepted: Link2,
  field_edited: RefreshCw,
}

function LogRow({ entry }: { entry: ActivityLogEntry }) {
  const Icon = LOG_ICON[entry.action] ?? Sparkles
  return (
    <div className="flex gap-3 py-3">
      <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-ai-muted text-ai">
        <Icon className="size-3.5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm leading-snug text-pretty">{entry.detail}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {entry.actor} · {formatDate(entry.timestamp)}
        </p>
      </div>
    </div>
  )
}

export function Dashboard() {
  const router = useRouter()
  const { activities, log } = useStore()
  const m = computeMetrics(activities)

  const allRel = activities.flatMap((a) => a.relationships)
  const relTotal = allRel.length || 1
  const relWithAI = allRel.filter((r) => r.provenance === 'ai').length
  const pctRelWithAI = Math.round((relWithAI / relTotal) * 100)

  const attention = activities
    .map((a) => {
      const overdue = reviewState(a) === 'overdue'
      const noRelationship = !a.relationships.some(
        (r) => r.type === 'vendor' || r.type === 'asset',
      )
      const incomplete = completeness(a) < 80
      return { a, overdue, noRelationship, incomplete }
    })
    .filter((x) => x.overdue || x.noRelationship || x.incomplete)
    .slice(0, 5)

  return (
    <div className="space-y-6 p-6">
      {/* Hero */}
      <Card className="overflow-hidden border-primary/20 bg-gradient-to-br from-primary/[0.06] to-ai/[0.06]">
        <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="max-w-xl">
            <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-ai-muted px-2.5 py-1 text-xs font-medium text-ai">
              <Sparkles className="size-3.5" />
              AI-assisted authoring
            </div>
            <h2 className="text-xl font-semibold tracking-tight text-balance">
              Turn source documents into Article 30 records
            </h2>
            <p className="mt-1 text-sm text-muted-foreground text-pretty">
              Upload a brief, contract, or DPIA. The agent drafts a processing activity with
              field-level confidence, flags duplicates, and suggests vendor, asset, and personal
              data relationships — all subject to your approval.
            </p>
          </div>
          <Button size="lg" className="gap-2 self-start" onClick={() => router.push('/author')}>
            <Sparkles className="size-4" />
            Start authoring
          </Button>
        </CardContent>
      </Card>

      {/* Metrics */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MetricCard
          label="Records created with AI"
          value={`${m.pctCreatedWithAI}%`}
          sub={`${m.createdWithAI} of ${m.total} records`}
          icon={Sparkles}
        />
        <MetricCard
          label="Records updated with AI"
          value={`${Math.round((m.updatedWithAI / (m.total || 1)) * 100)}%`}
          sub={`${m.updatedWithAI} enriched by the agent`}
          icon={RefreshCw}
        />
        <MetricCard
          label="Relationships from AI"
          value={`${pctRelWithAI}%`}
          sub={`${relWithAI} of ${allRel.length} links suggested`}
          icon={Link2}
        />
        <MetricCard
          label="Have vendor / asset link"
          value={`${m.pctWithRelationship}%`}
          sub={`avg. completeness ${m.avgCompleteness}%`}
          icon={TrendingUp}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Attention */}
        <Card className="lg:col-span-3">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="size-4 text-warning-foreground" />
              Needs attention
            </CardTitle>
            <Link
              href="/maintenance"
              className="text-xs font-medium text-primary hover:underline"
            >
              View all
            </Link>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="divide-y divide-border">
              {attention.length === 0 && (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  Everything looks current.
                </p>
              )}
              {attention.map(({ a, overdue, noRelationship, incomplete }) => (
                <button
                  key={a.id}
                  onClick={() => router.push(`/records/${a.id}`)}
                  className="flex w-full items-center gap-3 py-3 text-left transition-colors hover:bg-muted/40"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-medium">{a.name}</span>
                      <StatusBadge status={a.status} />
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                      {overdue && (
                        <span className="inline-flex items-center gap-1 text-danger">
                          <CircleAlert className="size-3" /> Review overdue
                        </span>
                      )}
                      {noRelationship && (
                        <span className="inline-flex items-center gap-1 text-warning-foreground">
                          <Link2 className="size-3" /> No vendor/asset link
                        </span>
                      )}
                      {incomplete && (
                        <span className="inline-flex items-center gap-1">
                          <TrendingUp className="size-3" /> {completeness(a)}% complete
                        </span>
                      )}
                    </div>
                  </div>
                  <ArrowRight className="size-4 shrink-0 text-muted-foreground" />
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent agent activity */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="size-4 text-ai" />
              Recent agent activity
            </CardTitle>
            <Link href="/activity" className="text-xs font-medium text-primary hover:underline">
              View log
            </Link>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="divide-y divide-border">
              {log.slice(0, 5).map((entry) => (
                <LogRow key={entry.id} entry={entry} />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
