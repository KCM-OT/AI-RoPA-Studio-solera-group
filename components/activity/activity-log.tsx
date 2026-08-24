'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import {
  Sparkles,
  User,
  FilePlus2,
  Pencil,
  Check,
  X,
  Link2,
  FileText,
  Copy,
  CalendarClock,
  CircleCheck,
  GitBranch,
  RefreshCw,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { PageHeader } from '@/components/app-shell'
import { useStore } from '@/lib/store'
import type { ActivityLogEntry, LogAction } from '@/lib/types'
import { cn } from '@/lib/utils'

const ACTION_META: Record<LogAction, { label: string; icon: typeof Pencil }> = {
  record_created: { label: 'Record created', icon: FilePlus2 },
  record_updated: { label: 'Record updated', icon: RefreshCw },
  field_accepted: { label: 'Field accepted', icon: Check },
  field_edited: { label: 'Field edited', icon: Pencil },
  field_rejected: { label: 'Field rejected', icon: X },
  relationship_accepted: { label: 'Relationship linked', icon: Link2 },
  relationship_rejected: { label: 'Relationship rejected', icon: X },
  document_attached: { label: 'Document attached', icon: FileText },
  duplicate_flagged: { label: 'Duplicate flagged', icon: Copy },
  review_scheduled: { label: 'Review scheduled', icon: CalendarClock },
  review_completed: { label: 'Review completed', icon: CircleCheck },
  variation_created: { label: 'Local variation created', icon: GitBranch },
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.round(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.round(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.round(hrs / 24)
  return `${days}d ago`
}

export function ActivityLog() {
  const { log } = useStore()
  const [actor, setActor] = useState<'all' | 'AI Agent' | 'You'>('all')

  const filtered = useMemo(
    () => (actor === 'all' ? log : log.filter((e) => e.actor === actor)),
    [log, actor],
  )

  return (
    <>
      <PageHeader
        title="Activity Log"
        description="A defensible audit trail — every agent suggestion and every human decision."
      />
      <div className="flex flex-col gap-4 p-6">
        <div className="flex gap-1.5">
          {(['all', 'AI Agent', 'You'] as const).map((a) => (
            <button
              key={a}
              onClick={() => setActor(a)}
              className={cn(
                'rounded-full px-3 py-1 text-xs font-medium transition-colors',
                actor === a
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/70',
              )}
            >
              {a === 'all' ? 'All activity' : a === 'AI Agent' ? 'AI Agent' : 'You'}
            </button>
          ))}
        </div>

        <Card>
          <CardContent className="py-2">
            <ol className="flex flex-col">
              {filtered.map((entry) => (
                <LogRow key={entry.id} entry={entry} />
              ))}
              {filtered.length === 0 && (
                <li className="py-8 text-center text-sm text-muted-foreground">
                  No activity yet.
                </li>
              )}
            </ol>
          </CardContent>
        </Card>
      </div>
    </>
  )
}

function LogRow({ entry }: { entry: ActivityLogEntry }) {
  const meta = ACTION_META[entry.action]
  const Icon = meta.icon
  const isAI = entry.actor === 'AI Agent'
  return (
    <li className="flex items-start gap-3 border-b border-border py-3 last:border-0">
      <div
        className={cn(
          'flex size-8 shrink-0 items-center justify-center rounded-full',
          isAI ? 'bg-ai/15 text-ai' : 'bg-primary/10 text-primary',
        )}
      >
        <Icon className="size-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
          <span
            className={cn(
              'inline-flex items-center gap-1 text-xs font-medium',
              isAI ? 'text-ai' : 'text-primary',
            )}
          >
            {isAI ? <Sparkles className="size-3" /> : <User className="size-3" />}
            {entry.actor}
          </span>
          <span className="text-sm font-medium text-foreground">{meta.label}</span>
        </div>
        <p className="text-sm text-muted-foreground text-pretty">{entry.detail}</p>
        {entry.recordId && entry.recordName && (
          <Link
            href={`/records/${entry.recordId}`}
            className="text-xs text-primary hover:underline"
          >
            {entry.recordName}
          </Link>
        )}
      </div>
      <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
        {timeAgo(entry.timestamp)}
      </span>
    </li>
  )
}
