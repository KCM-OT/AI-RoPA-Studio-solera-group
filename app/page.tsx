'use client'

import { AppShell, PageHeader } from '@/components/app-shell'
import { Dashboard } from '@/components/dashboard'

export default function Page() {
  return (
    <AppShell>
      <PageHeader
        title="RoPA Overview"
        description="AI-assisted authoring and maintenance of your Article 30 records."
      />
      <Dashboard />
    </AppShell>
  )
}
