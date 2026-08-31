import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { AppShell } from '@/components/app-shell'
import { RopaAuthoringChat } from '@/components/agent/ropa-authoring-chat'

function RopaAuthoringHeader() {
  return (
    <header className="flex shrink-0 flex-col gap-3 border-b border-[#a9a9a9] bg-white px-6 py-5 text-[#1a1a1a]">
      <Link
        href="/author"
        className="inline-flex w-fit items-center gap-1.5 rounded-md border border-[#d9d9d9] px-3 py-1.5 text-sm font-medium text-[#4d4d4d] transition-colors hover:bg-[#f7f7f7]"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Back
      </Link>
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold leading-8">RoPA Authoring</h1>
        <p className="text-sm leading-5">
          Draft a new processing activity from a source document, with human approval at every step.
        </p>
      </div>
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
