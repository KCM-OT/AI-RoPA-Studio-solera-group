import { AppShell } from '@/components/app-shell'
import { PostureSettings } from '@/components/settings/posture-settings'

export default function SettingsPage() {
  return (
    <AppShell>
      <div className="flex flex-col gap-6">
        <PostureSettings />
      </div>
    </AppShell>
  )
}
