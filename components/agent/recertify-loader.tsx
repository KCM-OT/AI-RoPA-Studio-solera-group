'use client'

import Link from 'next/link'
import { useStore } from '@/lib/store'
import { RecertifyChat } from './recertify-chat'
import { buttonVariants } from '@/components/ui/button'

// Client wrapper: resolves the record from the in-memory store by id, then
// hands the full record to the chat agent. Handles the not-found case.
export function RecertifyLoader({ id }: { id: string }) {
  const { getActivity } = useStore()
  const record = getActivity(id)

  if (!record) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-4 p-16 text-center">
        <h1 className="text-lg font-semibold">Record not found</h1>
        <p className="text-sm text-muted-foreground text-pretty">
          We couldn&apos;t find the processing activity you&apos;re trying to recertify.
        </p>
        <Link href="/maintenance" className={buttonVariants({ variant: 'outline' })}>
          Back to maintenance
        </Link>
      </div>
    )
  }

  return <RecertifyChat record={record} />
}
