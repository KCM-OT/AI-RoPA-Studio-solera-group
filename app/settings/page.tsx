import { AppShell } from '@/components/app-shell'
import { PostureSettings } from '@/components/settings/posture-settings'
import { DataMappingManual } from '@/components/confluence/dm-manual'

export default function SettingsPage() {
  return (
    <AppShell>
      <div className="flex flex-col gap-6">
        <PostureSettings />
        <DataMappingManual />
      </div>
    </AppShell>
  )
}
