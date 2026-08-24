import { AppShell } from '@/components/app-shell'
import { RecordDetail } from '@/components/records/record-detail'

export default async function RecordPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return (
    <AppShell>
      <RecordDetail id={id} />
    </AppShell>
  )
}
