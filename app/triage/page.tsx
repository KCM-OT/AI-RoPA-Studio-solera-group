import { Suspense } from 'react'
import { AppShell } from '@/components/app-shell'
import { TriageQueue } from '@/components/triage/triage-queue'

export default function TriagePage() {
  return (
    <AppShell>
      <Suspense>
        <TriageQueue />
      </Suspense>
    </AppShell>
  )
}
