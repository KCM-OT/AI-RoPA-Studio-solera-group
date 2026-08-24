import { Sparkles, CircleCheck, CircleAlert, CircleHelp, Clock, User } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { confidenceBand, STATUS_LABEL, type ReviewState } from '@/lib/ropa'
import type { RecordStatus } from '@/lib/types'

export function ConfidenceBadge({ value }: { value: number }) {
  const band = confidenceBand(value)
  const pct = `${Math.round(value * 100)}%`
  if (band === 'high') {
    return (
      <Badge variant="success">
        <CircleCheck /> {pct}
      </Badge>
    )
  }
  if (band === 'medium') {
    return (
      <Badge variant="warning">
        <CircleAlert /> {pct}
      </Badge>
    )
  }
  return (
    <Badge variant="danger">
      <CircleHelp /> {pct}
    </Badge>
  )
}

export function StatusBadge({ status }: { status: RecordStatus }) {
  const map: Record<RecordStatus, 'default' | 'secondary' | 'warning' | 'outline'> = {
    active: 'default',
    draft: 'secondary',
    under_review: 'warning',
    archived: 'outline',
  }
  return <Badge variant={map[status]}>{STATUS_LABEL[status]}</Badge>
}

export function ProvenanceBadge({ provenance }: { provenance: 'ai' | 'manual' }) {
  if (provenance === 'ai') {
    return (
      <Badge variant="ai">
        <Sparkles /> AI
      </Badge>
    )
  }
  return (
    <Badge variant="secondary">
      <User /> Manual
    </Badge>
  )
}

export function ProvenanceTag({
  createdWithAI,
  updatedWithAI,
}: {
  createdWithAI: boolean
  updatedWithAI: boolean
}) {
  if (createdWithAI) {
    return (
      <Badge variant="ai">
        <Sparkles /> AI-authored
      </Badge>
    )
  }
  if (updatedWithAI) {
    return (
      <Badge variant="ai">
        <Sparkles /> AI-assisted
      </Badge>
    )
  }
  return (
    <Badge variant="secondary">
      <User /> Manual
    </Badge>
  )
}

export function CompletenessMeter({ value }: { value: number }) {
  const tone =
    value >= 85 ? 'bg-success' : value >= 60 ? 'bg-warning' : 'bg-danger'
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
        <div className={`h-full rounded-full ${tone}`} style={{ width: `${value}%` }} />
      </div>
      <span className="text-xs tabular-nums text-muted-foreground">{value}%</span>
    </div>
  )
}

export function ReviewBadge({ state }: { state: ReviewState }) {
  if (state === 'overdue') {
    return (
      <Badge variant="danger">
        <Clock /> Overdue
      </Badge>
    )
  }
  if (state === 'due_soon') {
    return (
      <Badge variant="warning">
        <Clock /> Due soon
      </Badge>
    )
  }
  if (state === 'none') {
    return <Badge variant="secondary">No cadence</Badge>
  }
  return (
    <Badge variant="success">
      <CircleCheck /> On track
    </Badge>
  )
}
