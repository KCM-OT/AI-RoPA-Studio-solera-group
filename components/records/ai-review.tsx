'use client'

import { useState } from 'react'
import { Sparkles, Loader2, CircleCheck, TriangleAlert, CircleAlert, Info } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import type { ProcessingActivity } from '@/lib/types'
import { cn } from '@/lib/utils'

interface Finding {
  field: string
  severity: 'info' | 'warning' | 'critical'
  issue: string
  suggestion: string
}
interface ReviewResult {
  overallAssessment: string
  staleness: 'fresh' | 'aging' | 'stale'
  findings: Finding[]
}

const SEV_META = {
  critical: { icon: CircleAlert, cls: 'text-danger', badge: 'danger' as const },
  warning: { icon: TriangleAlert, cls: 'text-warning', badge: 'warning' as const },
  info: { icon: Info, cls: 'text-primary', badge: 'secondary' as const },
}

const STALE_META = {
  fresh: { label: 'Fresh', badge: 'success' as const },
  aging: { label: 'Aging', badge: 'warning' as const },
  stale: { label: 'Likely stale', badge: 'danger' as const },
}

export function AiReview({ record }: { record: ProcessingActivity }) {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<ReviewResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function runReview() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ record }),
      })
      if (!res.ok) throw new Error('failed')
      setResult((await res.json()) as ReviewResult)
    } catch {
      setError('The agent could not complete the review. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="border-ai/30 bg-ai/[0.03]">
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="size-4 text-ai" />
          AI maintenance review
        </CardTitle>
        {result && (
          <Badge variant={STALE_META[result.staleness].badge}>
            {STALE_META[result.staleness].label}
          </Badge>
        )}
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {!result && !loading && (
          <>
            <p className="text-sm text-muted-foreground">
              Ask the agent to check this record for missing attributes, internal
              inconsistencies, and signs it has drifted from reality.
            </p>
            <Button onClick={runReview} className="w-fit gap-2 bg-ai text-ai-foreground hover:bg-ai/90">
              <Sparkles className="size-4" /> Run agent review
            </Button>
          </>
        )}
        {loading && (
          <div className="flex items-center gap-2 py-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin text-ai" />
            Reviewing Article 30 attributes and relationships…
          </div>
        )}
        {error && <p className="text-sm text-danger">{error}</p>}
        {result && (
          <>
            <p className="rounded-lg bg-card p-3 text-sm text-foreground">
              {result.overallAssessment}
            </p>
            <ul className="flex flex-col gap-2">
              {result.findings.map((f, i) => {
                const meta = SEV_META[f.severity]
                const Icon = meta.icon
                return (
                  <li key={i} className="rounded-lg border border-border bg-card p-3">
                    <div className="flex items-center gap-2">
                      <Icon className={cn('size-4', meta.cls)} />
                      <span className="text-sm font-medium text-foreground">{f.field}</span>
                      <Badge variant={meta.badge} className="ml-auto capitalize">
                        {f.severity}
                      </Badge>
                    </div>
                    <p className="mt-1.5 text-sm text-muted-foreground">{f.issue}</p>
                    <p className="mt-1 flex items-start gap-1.5 text-sm text-foreground">
                      <CircleCheck className="mt-0.5 size-3.5 shrink-0 text-success" />
                      {f.suggestion}
                    </p>
                  </li>
                )
              })}
            </ul>
            <Button variant="outline" size="sm" onClick={runReview} className="w-fit gap-2">
              <Sparkles className="size-3.5" /> Re-run review
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  )
}
