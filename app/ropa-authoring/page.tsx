import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { AppShell } from '@/components/app-shell'
import { RopaAuthoringChat } from '@/components/agent/ropa-authoring-chat'

function RopaAuthoringHeader() {
  return (
    <header className="flex shrink-0 items-end justify-between gap-6 border-b border-[#a9a9a9] bg-white px-6 py-5 text-[#1a1a1a]">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold leading-8">RoPA Authoring</h1>
        <p className="text-sm leading-5">
          Draft a new processing activity from a source document, with human approval at every step.
        </p>
      </div>
      <Link
        href="/author"
        className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-[#d9d9d9] px-3 py-1.5 text-sm font-medium text-[#4d4d4d] transition-colors hover:bg-[#f7f7f7]"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Back
      </Link>
    </header>
  )
}

export default function RopaAuthoringPage() {
  return (
    <AppShell>
      <RopaAuthoringHeader />
      <RopaAuthoringChat />
    </AppShell>
  )
}
