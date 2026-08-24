'use client'

import Link from 'next/link'
import { ClipboardCheck, SlidersHorizontal } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useStore } from '@/lib/store'
import {
  ASSESSMENT_META,
  CONDITION_LABEL,
  cadenceLabel,
  requiredAssessments,
  resolveCadence,
} from '@/lib/posture'
import type { ProcessingActivity } from '@/lib/types'

export function PostureRequirements({ record }: { record: ProcessingActivity }) {
  const { posture, personalDataCategories } = useStore()
  const cadence = resolveCadence(record, posture, personalDataCategories)
  const required = requiredAssessments(record, posture, personalDataCategories)

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <ClipboardCheck className="size-4 text-primary" /> Posture requirements
        </CardTitle>
        <Link
          href="/settings"
          className="flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          <SlidersHorizontal className="size-3" /> Rules
        </Link>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Required cadence</span>
          <span className="flex items-center gap-2">
            <span className="font-medium">{cadenceLabel(cadence.cadenceDays)}</span>
            <Badge variant={cadence.isDefault ? 'secondary' : 'warning'}>
              {cadence.ruleLabel}
            </Badge>
          </span>
        </div>
        {posture.requireCertification && (
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Certification</span>
            <Badge variant="outline">Business attestation required</Badge>
          </div>
        )}

        <div>
          <div className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Assessments required
          </div>
          {required.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border p-2.5 text-xs text-muted-foreground">
              No assessments triggered by current posture rules.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {required.map((req) => (
                <li
                  key={req.type}
                  className="flex items-start gap-2.5 rounded-lg border border-border bg-card p-2.5"
                >
                  <span className="flex size-7 shrink-0 items-center justify-center rounded bg-primary/10 text-[10px] font-semibold text-primary">
                    {ASSESSMENT_META[req.type].abbr}
                  </span>
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-foreground">
                      {ASSESSMENT_META[req.type].name}
                    </div>
                    <div className="mt-0.5 flex flex-wrap gap-1">
                      {req.matched.map((c) => (
                        <span
                          key={c}
                          className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground"
                        >
                          {CONDITION_LABEL[c]}
                        </span>
                      ))}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
