import { AppShell } from '@/components/app-shell'
import { DataMappingManual } from '@/components/confluence/dm-manual'

export default function DataMappingManualPage() {
  return (
    <AppShell>
      <main className="flex flex-col gap-6">
        <header className="flex flex-col gap-2 border-b border-[#a9a9a9] bg-white px-6 py-6 text-[#1a1a1a]">
          <h1 className="text-2xl font-semibold leading-8 tracking-tight text-[#1a1a1a]">DM Manual</h1>
          <p className="text-sm leading-5 text-[#1a1a1a]">
            Read the OneTrust Data Mapping Manual from the secured Confluence knowledge base.
          </p>
        </header>
        <DataMappingManual />
      </main>
    </AppShell>
  )
}
