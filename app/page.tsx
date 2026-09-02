import { Suspense } from 'react'
import { AppShell, PageHeader } from '@/components/app-shell'
import { Dashboard } from '@/components/dashboard'

export default function Page() {
  return (
    <Suspense fallback={null}>
      <AppShell>
        <PageHeader
          title="RoPA Overview"
          description="AI-assisted authoring and maintenance of your Article 30 records."
        />
        <Dashboard />
      </AppShell>
    </Suspense>
  )
}
