import { AppShell } from '@/components/app-shell'
import { MaintenanceQueue } from '@/components/maintenance/maintenance-queue'

export default function MaintenancePage() {
  return (
    <AppShell>
      <MaintenanceQueue />
    </AppShell>
  )
}
