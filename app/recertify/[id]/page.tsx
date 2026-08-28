import { AppShell } from '@/components/app-shell'
import { RecertifyWizard } from '@/components/recertify/recertify-wizard'

export default async function RecertifyPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return (
    <AppShell>
      <RecertifyWizard id={id} />
    </AppShell>
  )
}
