'use client'

import { Building2, Boxes, Fingerprint, Check, X, Link2, CircleHelp, Sparkles } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ConfidenceBadge } from '@/components/badges'
import type { Relationship, RelationshipType } from '@/lib/types'
import { cn } from '@/lib/utils'

const TYPE_META: Record<
  RelationshipType,
  { label: string; icon: typeof Building2; empty: string }
> = {
  vendor: { label: 'Vendors & processors', icon: Building2, empty: 'No vendors linked' },
  asset: { label: 'Systems & assets', icon: Boxes, empty: 'No assets linked' },
  personalData: {
    label: 'Personal data categories',
    icon: Fingerprint,
    empty: 'No data categories linked',
  },
}

export function RelationshipPanel({
  relationships,
  onAccept,
  onReject,
}: {
  relationships: Relationship[]
  onAccept: (id: string) => void
  onReject: (id: string) => void
}) {
  const groups: RelationshipType[] = ['vendor', 'asset', 'personalData']

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Link2 className="size-4 text-primary" />
          Relationship intelligence
        </CardTitle>
        <span className="text-xs text-muted-foreground">
          Links to your data inventory
        </span>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        {groups.map((type) => {
          const meta = TYPE_META[type]
          const Icon = meta.icon
          const items = relationships.filter((r) => r.type === type)
          return (
            <div key={type}>
              <div className="mb-2 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                <Icon className="size-3.5" />
                {meta.label}
              </div>
              {items.length === 0 ? (
                <p className="text-sm text-muted-foreground/70">{meta.empty}</p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {items.map((r) => (
                    <li
                      key={r.id}
                      className={cn(
                        'rounded-lg border p-2.5',
                        r.status === 'suggested'
                          ? 'border-ai/40 bg-ai/5'
                          : r.status === 'rejected'
                            ? 'border-border bg-muted/40 opacity-60'
                            : 'border-border bg-card',
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="text-sm font-medium text-foreground">{r.name}</span>
                            {r.inventoryId === null ? (
                              <Badge variant="warning">
                                <CircleHelp /> New — not in inventory
                              </Badge>
                            ) : (
                              <Badge variant="outline">Matched</Badge>
                            )}
                            {r.status === 'accepted' && <Badge variant="success">Linked</Badge>}
                            {r.status === 'rejected' && (
                              <Badge variant="secondary">Rejected</Badge>
                            )}
                          </div>
                          {r.provenance === 'ai' && r.evidence && (
                            <p className="mt-1 flex items-start gap-1 text-xs text-muted-foreground">
                              <Sparkles className="mt-0.5 size-3 shrink-0 text-ai" />
                              <span className="italic">&ldquo;{r.evidence}&rdquo;</span>
                            </p>
                          )}
                        </div>
                        <div className="flex shrink-0 items-center gap-1.5">
                          {r.provenance === 'ai' && typeof r.confidence === 'number' && (
                            <ConfidenceBadge value={r.confidence} />
                          )}
                          {r.status === 'suggested' && (
                            <>
                              <button
                                onClick={() => onAccept(r.id)}
                                aria-label={`Accept ${r.name}`}
                                className="flex size-7 items-center justify-center rounded-md bg-success/15 text-success transition-colors hover:bg-success/25"
                              >
                                <Check className="size-4" />
                              </button>
                              <button
                                onClick={() => onReject(r.id)}
                                aria-label={`Reject ${r.name}`}
                                className="flex size-7 items-center justify-center rounded-md bg-muted text-muted-foreground transition-colors hover:bg-danger/15 hover:text-danger"
                              >
                                <X className="size-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
