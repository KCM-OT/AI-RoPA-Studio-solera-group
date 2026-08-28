import { AppShell } from '@/components/app-shell'
import { RecertifyLoader } from '@/components/agent/recertify-loader'

export default async function RecertifyPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return (
    <AppShell>
      <RecertifyLoader id={id} />
    </AppShell>
  )
}
