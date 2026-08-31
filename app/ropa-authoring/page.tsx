import { AppShell } from '@/components/app-shell'
import { RopaAuthoringChat } from '@/components/agent/ropa-authoring-chat'

function RopaAuthoringHeader() {
  return (
    <header className="flex shrink-0 flex-col justify-center gap-2 border-b border-[#a9a9a9] bg-white px-6 py-6 text-[#1a1a1a]">
      <h1 className="text-2xl font-semibold leading-8">RoPA Authoring</h1>
      <p className="text-sm leading-5">
        Draft a new processing activity from a source document, with human approval at every step.
      </p>
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
