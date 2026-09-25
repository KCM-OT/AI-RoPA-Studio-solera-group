'use client'

import { AppShell, PageHeader } from '@/components/app-shell'
import { Dashboard } from '@/components/dashboard'

export default function Page() {
  return (
    <AppShell>
      <PageHeader
        title="Control centre"
        description="Your ROPA metrics, next best actions, and related objects in one place."
      />
      <Dashboard />
    </AppShell>
  )
}
