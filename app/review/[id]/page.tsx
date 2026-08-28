import { AppShell } from '@/components/app-shell'
import { ReviewDetail } from '@/components/review/review-detail'

export default async function ReviewDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return (
    <AppShell>
      <ReviewDetail id={id} />
    </AppShell>
  )
}
