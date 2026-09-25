'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Sparkles,
  TrendingUp,
  CalendarClock,
  Clock,
  Link2,
  RefreshCw,
  ArrowRight,
  CircleAlert,
  FileText,
  GitBranch,
  Search,
  Layers,
  Building2,
  Database,
  Boxes,
  Eye,
  EyeOff,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useStore } from '@/lib/store'
import {
  completeness,
  computeMetrics,
  formatDate,
  relativeDays,
  reviewState,
} from '@/lib/ropa'
import type { ActivityLogEntry, Asset, ProcessingActivity, Vendor } from '@/lib/types'
import { StatusBadge, CompletenessMeter } from '@/components/badges'
import { cn } from '@/lib/utils'

// Records not touched within this many days are considered stale (freshness metric).
const STALE_DAYS = 180
// Records updated within this many days count as fresh.
const FRESH_DAYS = 90

type Provenance = 'platform' | 'team'

function ProvenanceBadge({ kind, show }: { kind: Provenance; show: boolean }) {
  if (!show) return null
  const isPlatform = kind === 'platform'
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium',
        isPlatform
          ? 'border-primary/30 bg-primary/5 text-primary'
          : 'border-ai/30 bg-ai-muted text-ai',
      )}
    >
      {isPlatform ? <Boxes className="size-3" /> : <Sparkles className="size-3" />}
      {isPlatform ? 'Platform component' : 'Team-built'}
    </span>
  )
}

function SectionTitle({
  icon: Icon,
  iconClass,
  children,
  provenance,
  showProvenance,
  action,
}: {
  icon: React.ElementType
  iconClass?: string
  children: React.ReactNode
  provenance: Provenance
  showProvenance: boolean
  action?: React.ReactNode
}) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <Icon className={cn('size-4', iconClass)} aria-hidden="true" />
        <h3 className="text-sm font-semibold tracking-tight text-foreground">{children}</h3>
        <ProvenanceBadge kind={provenance} show={showProvenance} />
      </div>
      {action}
    </div>
  )
}

function MetricCard({
  label,
  value,
  sub,
  icon: Icon,
  onClick,
  actionLabel,
}: {
  label: string
  value: string
  sub: string
  icon: React.ElementType
  onClick?: () => void
  actionLabel?: string
}) {
  return (
    <Card
      className={cn(
        'h-full rounded-xl border-[#e6e5e2] bg-white shadow-none',
        onClick && 'transition-colors hover:border-[#c9c8c4]',
      )}
    >
      <CardContent className="p-0">
        <button
          type="button"
          onClick={onClick}
          disabled={!onClick}
          aria-label={actionLabel}
          className="group flex h-full w-full flex-col gap-3 rounded-xl p-6 text-left text-[#1a1a1a] outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-default"
        >
          <div className="flex items-center justify-between">
            <span className="text-[13px] leading-4 text-[#6b6b69]">{label}</span>
            <Icon className="size-4 text-[#8c8c87]" aria-hidden="true" />
          </div>
          <span className="text-[32px] font-medium leading-10 tracking-tight text-[#1a1a1a]">{value}</span>
          <div className="mt-auto flex items-center justify-between gap-2">
            <p className="text-[13px] leading-4 text-[#8c8c87]">{sub}</p>
            {onClick && (
              <ArrowRight className="size-4 shrink-0 text-[#8c8c87] transition-colors group-hover:text-primary" aria-hidden="true" />
            )}
          </div>
        </button>
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

// ---- Next best actions ------------------------------------------------------

type NbaKind = 'overdue' | 'gap' | 'due_soon'

interface NextAction {
  id: string
  recordId: string
  recordName: string
  kind: NbaKind
  verb: string
  reason: string
}

const NBA_META: Record<
  NbaKind,
  { icon: React.ElementType; tone: string; priority: number }
> = {
  overdue: { icon: CircleAlert, tone: 'text-danger', priority: 0 },
  gap: { icon: TrendingUp, tone: 'text-warning-foreground', priority: 1 },
  due_soon: { icon: CalendarClock, tone: 'text-primary', priority: 2 },
}

function buildNextActions(activities: ProcessingActivity[]): NextAction[] {
  const actions: NextAction[] = []
  for (const a of activities) {
    const rs = reviewState(a)
    if (rs === 'overdue') {
      actions.push({
        id: `${a.id}-overdue`,
        recordId: a.id,
        recordName: a.name,
        kind: 'overdue',
        verb: 'Recertify',
        reason: `Certification overdue since ${formatDate(a.nextReviewAt)}`,
      })
    } else if (rs === 'due_soon') {
      const days = relativeDays(a.nextReviewAt)
      actions.push({
        id: `${a.id}-due`,
        recordId: a.id,
        recordName: a.name,
        kind: 'due_soon',
        verb: 'Review',
        reason: `Certification due in ${days} day${days === 1 ? '' : 's'}`,
      })
    }
    const pct = completeness(a)
    if (pct < 80) {
      actions.push({
        id: `${a.id}-gap`,
        recordId: a.id,
        recordName: a.name,
        kind: 'gap',
        verb: 'Complete',
        reason: `Article 30 record ${pct}% complete`,
      })
    } else if (!a.relationships.some((r) => r.type === 'vendor' || r.type === 'asset')) {
      actions.push({
        id: `${a.id}-link`,
        recordId: a.id,
        recordName: a.name,
        kind: 'gap',
        verb: 'Link inventory',
        reason: 'No vendor or asset linked',
      })
    }
  }
  return actions.sort((x, y) => NBA_META[x.kind].priority - NBA_META[y.kind].priority)
}

function NextBestActions({
  activities,
  showProvenance,
}: {
  activities: ProcessingActivity[]
  showProvenance: boolean
}) {
  const router = useRouter()
  const actions = useMemo(() => buildNextActions(activities), [activities])
  const visible = actions.slice(0, 6)

  return (
    <Card className="lg:col-span-3">
      <CardContent className="p-5">
        <SectionTitle
          icon={CircleAlert}
          iconClass="text-warning-foreground"
          provenance="team"
          showProvenance={showProvenance}
          action={
            <Link href="/maintenance" className="text-xs font-medium text-primary hover:underline">
              View all
            </Link>
          }
        >
          Next best actions
        </SectionTitle>
        {actions.length > 0 && (
          <p className="mb-1 text-xs text-muted-foreground">
            {actions.length} item{actions.length === 1 ? '' : 's'} need your attention
          </p>
        )}
        <div className="divide-y divide-border">
          {visible.length === 0 && (
            <p className="py-6 text-center text-sm text-muted-foreground">
              You&apos;re all caught up — no overdue certifications or data gaps.
            </p>
          )}
          {visible.map((action) => {
            const meta = NBA_META[action.kind]
            const Icon = meta.icon
            return (
              <button
                key={action.id}
                onClick={() => router.push(`/records/${action.recordId}`)}
                className="flex w-full items-center gap-3 py-3 text-left transition-colors hover:bg-muted/40"
              >
                <div className={cn('mt-0.5 shrink-0', meta.tone)}>
                  <Icon className="size-4" aria-hidden="true" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">
                    <span className={meta.tone}>{action.verb}</span>
                    {' · '}
                    {action.recordName}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">{action.reason}</p>
                </div>
                <ArrowRight className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              </button>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

// ---- Related objects --------------------------------------------------------

type ObjectTab = 'activities' | 'vendors' | 'assets'

const DPA_VARIANT: Record<Vendor['dpaStatus'], 'success' | 'warning' | 'danger'> = {
  Signed: 'success',
  Pending: 'warning',
  None: 'danger',
}

function linkedCount(activities: ProcessingActivity[], type: 'vendor' | 'asset', id: string, name: string) {
  return activities.filter((a) =>
    a.relationships.some(
      (r) => r.type === type && r.status === 'accepted' && (r.inventoryId === id || r.name === name),
    ),
  ).length
}

function RelatedObjects({
  activities,
  vendors,
  assets,
  showProvenance,
}: {
  activities: ProcessingActivity[]
  vendors: Vendor[]
  assets: Asset[]
  showProvenance: boolean
}) {
  const router = useRouter()
  const [tab, setTab] = useState<ObjectTab>('activities')
  const [query, setQuery] = useState('')
  const q = query.trim().toLowerCase()

  const vendorRows = useMemo(
    () =>
      vendors
        .map((v) => ({ ...v, linked: linkedCount(activities, 'vendor', v.id, v.name) }))
        .filter((v) => !q || v.name.toLowerCase().includes(q) || v.category.toLowerCase().includes(q)),
    [vendors, activities, q],
  )
  const assetRows = useMemo(
    () =>
      assets
        .map((a) => ({ ...a, linked: linkedCount(activities, 'asset', a.id, a.name) }))
        .filter((a) => !q || a.name.toLowerCase().includes(q) || a.type.toLowerCase().includes(q)),
    [assets, activities, q],
  )
  const activityRows = useMemo(
    () =>
      activities.filter(
        (a) =>
          !q ||
          a.name.toLowerCase().includes(q) ||
          a.purpose.toLowerCase().includes(q) ||
          a.managingOrganization.toLowerCase().includes(q),
      ),
    [activities, q],
  )

  const tabs: { key: ObjectTab; label: string; icon: React.ElementType; count: number }[] = [
    { key: 'activities', label: 'Processing activities', icon: Layers, count: activities.length },
    { key: 'vendors', label: 'Vendors', icon: Building2, count: vendors.length },
    { key: 'assets', label: 'Assets', icon: Database, count: assets.length },
  ]

  return (
    <Card>
      <CardContent className="p-5">
        <SectionTitle
          icon={Layers}
          iconClass="text-primary"
          provenance="platform"
          showProvenance={showProvenance}
        >
          Related objects
        </SectionTitle>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-1.5">
            {tabs.map((t) => {
              const Icon = t.icon
              return (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors',
                    tab === t.key
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:bg-muted/70',
                  )}
                >
                  <Icon className="size-3.5" aria-hidden="true" />
                  {t.label}
                  <span
                    className={cn(
                      'rounded-full px-1.5 text-[11px]',
                      tab === t.key ? 'bg-primary-foreground/20' : 'bg-background',
                    )}
                  >
                    {t.count}
                  </span>
                </button>
              )
            })}
          </div>
          <div className="relative min-w-[200px] sm:max-w-xs sm:flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={`Filter ${tabs.find((t) => t.key === tab)?.label.toLowerCase()}…`}
              className="h-9 w-full rounded-lg border border-input bg-card pl-9 pr-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="Filter related objects"
            />
          </div>
        </div>

        <div className="mt-4 overflow-hidden rounded-xl border border-border">
          {tab === 'activities' && (
            <>
              {activityRows.length === 0 && <EmptyRow />}
              {activityRows.map((a) => {
                const rs = reviewState(a)
                return (
                  <button
                    key={a.id}
                    onClick={() => router.push(`/records/${a.id}`)}
                    className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-border px-4 py-3 text-left transition-colors last:border-0 hover:bg-muted/40 sm:grid-cols-[minmax(0,1fr)_130px_120px_130px]"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-sm font-medium text-foreground">{a.name}</span>
                      </div>
                      <p className="truncate text-xs text-muted-foreground">{a.managingOrganization}</p>
                    </div>
                    <div className="hidden sm:block">
                      <StatusBadge status={a.status} />
                    </div>
                    <div className="hidden sm:block">
                      <CompletenessMeter value={completeness(a)} />
                    </div>
                    <div
                      className={cn(
                        'justify-self-end text-xs sm:justify-self-start',
                        rs === 'overdue'
                          ? 'font-medium text-danger'
                          : rs === 'due_soon'
                            ? 'font-medium text-warning-foreground'
                            : 'text-muted-foreground',
                      )}
                    >
                      {rs === 'overdue' ? 'Overdue · ' : ''}
                      {formatDate(a.nextReviewAt)}
                    </div>
                  </button>
                )
              })}
            </>
          )}

          {tab === 'vendors' && (
            <>
              {vendorRows.length === 0 && <EmptyRow />}
              {vendorRows.map((v) => (
                <div
                  key={v.id}
                  className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-border px-4 py-3 last:border-0 sm:grid-cols-[minmax(0,1fr)_160px_110px_110px]"
                >
                  <div className="min-w-0">
                    <span className="truncate text-sm font-medium text-foreground">{v.name}</span>
                    <p className="truncate text-xs text-muted-foreground">{v.location}</p>
                  </div>
                  <span className="hidden truncate text-xs text-muted-foreground sm:block">{v.category}</span>
                  <div className="hidden sm:block">
                    <Badge variant={DPA_VARIANT[v.dpaStatus]}>DPA {v.dpaStatus}</Badge>
                  </div>
                  <span className="justify-self-end text-xs text-muted-foreground sm:justify-self-start">
                    {v.linked} record{v.linked === 1 ? '' : 's'}
                  </span>
                </div>
              ))}
            </>
          )}

          {tab === 'assets' && (
            <>
              {assetRows.length === 0 && <EmptyRow />}
              {assetRows.map((a) => (
                <div
                  key={a.id}
                  className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-border px-4 py-3 last:border-0 sm:grid-cols-[minmax(0,1fr)_160px_110px_110px]"
                >
                  <div className="min-w-0">
                    <span className="truncate text-sm font-medium text-foreground">{a.name}</span>
                    <p className="truncate text-xs text-muted-foreground">{a.hostingRegion}</p>
                  </div>
                  <span className="hidden truncate text-xs text-muted-foreground sm:block">{a.type}</span>
                  <div className="hidden sm:block" />
                  <span className="justify-self-end text-xs text-muted-foreground sm:justify-self-start">
                    {a.linked} record{a.linked === 1 ? '' : 's'}
                  </span>
                </div>
              ))}
            </>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

function EmptyRow() {
  return <p className="px-4 py-10 text-center text-sm text-muted-foreground">No matches.</p>
}

// ---- Control centre ---------------------------------------------------------

export function Dashboard() {
  const router = useRouter()
  const { activities, vendors, assets, log } = useStore()
  const [showProvenance, setShowProvenance] = useState(false)

  const m = computeMetrics(activities)
  const total = activities.length || 1

  // Cadence validation: share of records with a review schedule that is current.
  const withCadence = activities.filter((a) => a.nextReviewAt !== null)
  const currentCount = withCadence.length - m.overdue
  const pctCurrent = withCadence.length ? Math.round((currentCount / withCadence.length) * 100) : 100

  // Completeness: records meeting the Article 30 completeness bar.
  const completeCount = activities.filter((a) => completeness(a) >= 80).length

  // Freshness: records updated recently vs. gone stale.
  const staleCount = activities.filter((a) => (relativeDays(a.updatedAt) ?? 0) < -STALE_DAYS).length
  const freshCount = activities.filter((a) => (relativeDays(a.updatedAt) ?? -9999) >= -FRESH_DAYS).length
  const pctFresh = Math.round((freshCount / total) * 100)

  return (
    <div className="space-y-8 p-6">
      {/* Control bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground text-pretty">
          Everything that needs your attention across the register — metrics, actions, and related
          objects — in one place.
        </p>
        <div className="flex shrink-0 items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowProvenance((v) => !v)}
            className="gap-2"
          >
            {showProvenance ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            {showProvenance ? 'Hide provenance' : 'Show provenance'}
          </Button>
          <Button size="sm" className="gap-2" onClick={() => router.push('/ropa-authoring')}>
            <Sparkles className="size-4" />
            Author with AI
          </Button>
        </div>
      </div>

      {/* Program health metrics */}
      <section>
        <SectionTitle
          icon={TrendingUp}
          iconClass="text-primary"
          provenance="platform"
          showProvenance={showProvenance}
        >
          Program health
        </SectionTitle>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <MetricCard
            label="Register completeness"
            value={`${m.avgCompleteness}%`}
            sub={`${completeCount} of ${m.total} records ≥ 80% complete`}
            icon={TrendingUp}
            onClick={() => router.push('/records?view=incomplete')}
            actionLabel="View records below 80% complete"
          />
          <MetricCard
            label="Freshness"
            value={`${pctFresh}%`}
            sub={
              staleCount > 0
                ? `${staleCount} not updated in ${STALE_DAYS}+ days`
                : `${freshCount} updated in last ${FRESH_DAYS} days`
            }
            icon={Clock}
            onClick={() => router.push('/records?view=stale')}
            actionLabel="View records that are not up to date"
          />
          <MetricCard
            label="Cadence validated"
            value={`${pctCurrent}%`}
            sub={`${m.overdue} overdue · ${m.dueSoon} due soon`}
            icon={CalendarClock}
            onClick={() => router.push('/records?view=certification')}
            actionLabel="View records due for certification"
          />
        </div>
      </section>

      {/* Actions + activity */}
      <div className="grid gap-6 lg:grid-cols-5">
        <NextBestActions activities={activities} showProvenance={showProvenance} />

        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between pb-0">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <Sparkles className="size-4 text-ai" />
              Recent agent activity
              <ProvenanceBadge kind="team" show={showProvenance} />
            </CardTitle>
            <Link href="/activity" className="text-xs font-medium text-primary hover:underline">
              View log
            </Link>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="divide-y divide-border">
              {log.slice(0, 5).map((entry) => (
                <LogRow key={entry.id} entry={entry} />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Related objects */}
      <RelatedObjects
        activities={activities}
        vendors={vendors}
        assets={assets}
        showProvenance={showProvenance}
      />
    </div>
  )
}
