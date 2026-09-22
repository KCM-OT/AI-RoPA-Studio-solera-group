import { AppShell } from '@/components/app-shell'
import { DataMappingManual } from '@/components/confluence/dm-manual'

export default function DataMappingManualPage() {
  return (
    <AppShell>
      <main className="flex flex-col gap-6">
        <header className="flex flex-col gap-1">
          <h1 className="text-xl font-semibold tracking-tight text-foreground">DM Manual</h1>
          <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
            Read the OneTrust Data Mapping Manual from the secured Confluence knowledge base.
          </p>
        </header>
        <DataMappingManual />
      </main>
    </AppShell>
  )
}
