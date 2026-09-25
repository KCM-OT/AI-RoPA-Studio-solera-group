'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import {
  Building2,
  Boxes,
  Fingerprint,
  Check,
  X,
  Sparkles,
  Link2,
  CircleHelp,
  ShieldAlert,
  FileText,
  ArrowUpRight,
  Inbox,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/app-shell'
import { ConfidenceBadge } from '@/components/badges'
import { useStore } from '@/lib/store'
import { PERSONAL_DATA_CATEGORIES } from '@/lib/seed'
import type { ProcessingActivity, Relationship, RelationshipType } from '@/lib/types'
import { cn } from '@/lib/utils'

const TYPE_META: Record<
  RelationshipType,
  { label: string; short: string; icon: typeof Building2 }
> = {
  vendor: { label: 'Vendors & processors', short: 'Vendor', icon: Building2 },
  asset: { label: 'Systems & assets', short: 'Asset', icon: Boxes },
  personalData: { label: 'Personal data', short: 'Data', icon: Fingerprint },
}

type TypeFilter = 'all' | RelationshipType

interface Suggestion {
  rel: Relationship
  record: ProcessingActivity
}

function isSpecialCategory(rel: Relationship): boolean {
  if (rel.type !== 'personalData' || !rel.inventoryId) return false
  return (
    PERSONAL_DATA_CATEGORIES.find((c) => c.id === rel.inventoryId)?.sensitivity ===
    'special'
  )
}

export function TriageQueue() {
  const { activities, updateRelationship } = useStore()
  const searchParams = useSearchParams()
  const recordParam = searchParams.get('record')

  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all')
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const allSuggestions = useMemo<Suggestion[]>(() => {
    return activities
      .filter((a) => (recordParam ? a.id === recordParam : true))
      .flatMap((record) =>
        record.relationships
          .filter((rel) => rel.status === 'suggested')
          .map((rel) => ({ rel, record })),
      )
      .sort((a, b) => (b.rel.confidence ?? 0) - (a.rel.confidence ?? 0))
  }, [activities, recordParam])

  const focusRecord = recordParam
    ? activities.find((a) => a.id === recordParam) ?? null
    : null

  const counts = useMemo(() => {
    const c = { all: allSuggestions.length, vendor: 0, asset: 0, personalData: 0 }
    for (const s of allSuggestions) c[s.rel.type] += 1
    return c
  }, [allSuggestions])

  const visible = useMemo(
    () =>
      typeFilter === 'all'
        ? allSuggestions
        : allSuggestions.filter((s) => s.rel.type === typeFilter),
    [allSuggestions, typeFilter],
  )

  // Group visible suggestions by record for a scannable queue.
  const grouped = useMemo(() => {
    const map = new Map<string, { record: ProcessingActivity; items: Suggestion[] }>()
    for (const s of visible) {
      const g = map.get(s.record.id)
      if (g) g.items.push(s)
      else map.set(s.record.id, { record: s.record, items: [s] })
    }
    return [...map.values()]
  }, [visible])

  const visibleIds = useMemo(() => visible.map((s) => s.rel.id), [visible])
  const selectedVisible = visibleIds.filter((id) => selected.has(id))
  const allVisibleSelected =
    visibleIds.length > 0 && selectedVisible.length === visibleIds.length

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleAll() {
    setSelected((prev) => {
      if (allVisibleSelected) {
        const next = new Set(prev)
        for (const id of visibleIds) next.delete(id)
        return next
      }
      return new Set([...prev, ...visibleIds])
    })
  }

  function act(id: string, status: 'accepted' | 'rejected') {
    const s = allSuggestions.find((x) => x.rel.id === id)
    if (!s) return
    updateRelationship(s.record.id, id, status)
    setSelected((prev) => {
      const next = new Set(prev)
      next.delete(id)
      return next
    })
  }

  function batch(status: 'accepted' | 'rejected') {
    for (const id of selectedVisible) {
      const s = allSuggestions.find((x) => x.rel.id === id)
      if (s) updateRelationship(s.record.id, id, status)
    }
    setSelected((prev) => {
      const next = new Set(prev)
      for (const id of selectedVisible) next.delete(id)
      return next
    })
  }

  const FILTERS: { key: TypeFilter; label: string; count: number }[] = [
    { key: 'all', label: 'All', count: counts.all },
    { key: 'vendor', label: 'Vendors', count: counts.vendor },
    { key: 'asset', label: 'Systems & assets', count: counts.asset },
    { key: 'personalData', label: 'Personal data', count: counts.personalData },
  ]

  const highConfidence = allSuggestions.filter(
    (s) => (s.rel.confidence ?? 0) >= 0.85,
  ).length

  return (
    <>
      <PageHeader
        title="Relationship triage"
        description="Review AI-suggested vendor, asset, and data links. Each is a suggestion until you approve it."
        status={[
          {
            label: `${counts.all} awaiting review`,
            tone: counts.all > 0 ? 'warning' : 'success',
          },
          { label: `${highConfidence} high confidence`, tone: 'neutral' },
        ]}
      />
      <div className="flex flex-col gap-4 p-6">
      {focusRecord && (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-muted-foreground">Filtered to</span>
          <Badge variant="secondary" className="gap-1">
            {focusRecord.name}
          </Badge>
          <Link
            href="/triage"
            className="text-xs font-medium text-primary hover:underline"
          >
            Show all records
          </Link>
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex flex-wrap items-center gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setTypeFilter(f.key)}
            className={cn(
              'flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors',
              typeFilter === f.key
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border bg-white text-muted-foreground hover:bg-muted',
            )}
          >
            {f.label}
            <span
              className={cn(
                'tabular-nums',
                typeFilter === f.key ? 'text-primary' : 'text-muted-foreground/70',
              )}
            >
              {f.count}
            </span>
          </button>
        ))}
      </div>

      {/* Batch action bar */}
      {visible.length > 0 && (
        <div className="sticky top-[132px] z-10 flex flex-wrap items-center gap-3 rounded-lg border border-border bg-white/95 px-4 py-2.5 shadow-sm backdrop-blur">
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <CheckboxBox checked={allVisibleSelected} onClick={toggleAll} />
            <span className="text-muted-foreground">
              {selectedVisible.length > 0
                ? `${selectedVisible.length} selected`
                : 'Select all'}
            </span>
          </label>
          <div className="ml-auto flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={selectedVisible.length === 0}
              onClick={() => batch('rejected')}
            >
              <X className="size-3.5" />
              Reject{selectedVisible.length > 0 ? ` ${selectedVisible.length}` : ''}
            </Button>
            <Button
              size="sm"
              disabled={selectedVisible.length === 0}
              onClick={() => batch('accepted')}
            >
              <Check className="size-3.5" />
              Accept{selectedVisible.length > 0 ? ` ${selectedVisible.length}` : ''}
            </Button>
          </div>
        </div>
      )}

      {visible.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <span className="flex size-12 items-center justify-center rounded-full bg-success/10 text-success">
              <Inbox className="size-6" />
            </span>
            <div>
              <p className="text-base font-medium text-foreground">Queue clear</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {counts.all === 0
                  ? 'No relationship suggestions are awaiting review.'
                  : 'No suggestions match this filter.'}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-6">
          {grouped.map(({ record, items }) => (
            <section key={record.id} className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <Link
                  href={`/records/${record.id}`}
                  className="group flex items-center gap-1.5 text-sm font-semibold text-foreground hover:text-primary"
                >
                  {record.name}
                  <ArrowUpRight className="size-3.5 text-muted-foreground group-hover:text-primary" />
                </Link>
                <Badge variant="outline" className="text-xs">
                  {items.length} pending
                </Badge>
              </div>
              <ul className="flex flex-col gap-2">
                {items.map((s) => (
                  <SuggestionRow
                    key={s.rel.id}
                    suggestion={s}
                    selected={selected.has(s.rel.id)}
                    onToggle={() => toggle(s.rel.id)}
                    onAccept={() => act(s.rel.id, 'accepted')}
                    onReject={() => act(s.rel.id, 'rejected')}
                  />
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
      </div>
    </>
  )
}

function CheckboxBox({
  checked,
  onClick,
}: {
  checked: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      onClick={onClick}
      className={cn(
        'flex size-4 shrink-0 items-center justify-center rounded border transition-colors',
        checked
          ? 'border-primary bg-primary text-primary-foreground'
          : 'border-input bg-white hover:border-primary',
      )}
    >
      {checked && <Check className="size-3" strokeWidth={3} />}
    </button>
  )
}

function SuggestionRow({
  suggestion,
  selected,
  onToggle,
  onAccept,
  onReject,
}: {
  suggestion: Suggestion
  selected: boolean
  onToggle: () => void
  onAccept: () => void
  onReject: () => void
}) {
  const { rel } = suggestion
  const meta = TYPE_META[rel.type]
  const Icon = meta.icon
  const unresolved = rel.inventoryId === null
  const special = isSpecialCategory(rel)

  return (
    <li
      className={cn(
        'rounded-lg border bg-white p-3 transition-colors',
        selected ? 'border-primary ring-1 ring-primary/30' : 'border-border',
      )}
    >
      <div className="flex items-start gap-3">
        <div className="pt-0.5">
          <CheckboxBox checked={selected} onClick={onToggle} />
        </div>

        <span
          className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground"
          aria-hidden
        >
          <Icon className="size-4" />
        </span>

        <div className="min-w-0 flex-1">
          {/* Header line: name + badges */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium text-foreground">{rel.name}</span>
            <Badge variant="outline" className="text-[11px]">
              {meta.short}
            </Badge>
            <Badge variant="ai" className="text-[11px]">
              <Sparkles /> AI
            </Badge>
            {typeof rel.confidence === 'number' && (
              <ConfidenceBadge value={rel.confidence} />
            )}
            {unresolved ? (
              <Badge variant="warning" className="text-[11px]">
                <CircleHelp /> New — not in inventory
              </Badge>
            ) : (
              <Badge variant="secondary" className="text-[11px]">
                <Link2 /> Inventory match
              </Badge>
            )}
            {special && (
              <Badge variant="danger" className="text-[11px]">
                <ShieldAlert /> Special category
              </Badge>
            )}
          </div>

          {/* Rationale */}
          {rel.rationale && (
            <p className="mt-1.5 text-sm leading-5 text-muted-foreground text-pretty">
              {rel.rationale}
            </p>
          )}

          {/* Source evidence */}
          {rel.evidence && (
            <figure className="mt-2 border-l-2 border-ai/40 bg-ai/5 py-1.5 pl-3 pr-2">
              <blockquote className="text-sm italic leading-5 text-foreground/80">
                “{rel.evidence}”
              </blockquote>
              {rel.sourceDocId && (
                <figcaption className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                  <FileText className="size-3" />
                  {sourceDocName(suggestion)}
                </figcaption>
              )}
            </figure>
          )}
        </div>

        {/* Per-row actions */}
        <div className="flex shrink-0 items-center gap-1.5">
          <Button
            size="sm"
            variant="outline"
            onClick={onReject}
            aria-label={`Reject ${rel.name}`}
          >
            <X className="size-3.5" />
            <span className="hidden sm:inline">Reject</span>
          </Button>
          <Button size="sm" onClick={onAccept} aria-label={`Accept ${rel.name}`}>
            <Check className="size-3.5" />
            <span className="hidden sm:inline">Accept</span>
          </Button>
        </div>
      </div>
    </li>
  )
}

function sourceDocName(s: Suggestion): string {
  const doc = s.record.sourceDocuments.find((d) => d.id === s.rel.sourceDocId)
  return doc ? doc.name : 'Source document'
}
