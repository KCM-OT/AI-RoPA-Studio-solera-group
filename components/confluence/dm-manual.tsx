'use client'

import { useEffect, useState } from 'react'
import { AlertCircle, BookOpen, Loader2 } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

 type ManualState =
  | { status: 'loading' }
  | { status: 'ready'; title: string; updatedAt: string | null; html: string }
  | { status: 'authentication' }
  | { status: 'unavailable' }

export function DataMappingManual() {
  const [state, setState] = useState<ManualState>({ status: 'loading' })

  useEffect(() => {
    let active = true

    fetch('/api/confluence/dm-manual')
      .then(async (response) => {
        if (!response.ok) {
          const body = (await response.json().catch(() => null)) as { error?: string } | null
          if (body?.error === 'authentication') return { status: 'authentication' as const }
          return { status: 'unavailable' as const }
        }
        return (await response.json()) as { status?: never; title: string; updatedAt: string | null; html: string }
      })
      .then((result) => {
        if (!active) return
        if ('title' in result) setState({ status: 'ready', ...result })
        else setState(result)
      })
      .catch(() => active && setState({ status: 'unavailable' }))

    return () => { active = false }
  }, [])

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
            <BookOpen className="size-4" aria-hidden="true" />
          </div>
          <div className="flex flex-col gap-1">
            <CardTitle>{state.status === 'ready' ? state.title : 'OneTrust Data Mapping Manual'}</CardTitle>
            <CardDescription>Reference guidance from the secured Confluence knowledge base.</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {state.status === 'loading' && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground" role="status">
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            Loading the manual…
          </div>
        )}
        {state.status === 'authentication' && (
          <div className="flex items-start gap-2 text-sm text-destructive" role="alert">
            <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            Confluence authentication failed. Please ask an administrator to refresh the server credentials.
          </div>
        )}
        {state.status === 'unavailable' && (
          <div className="flex items-start gap-2 text-sm text-muted-foreground" role="status">
            <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            The Data Mapping Manual is currently unavailable. Please try again later.
          </div>
        )}
        {state.status === 'ready' && (
          <article className="prose prose-sm max-w-none text-foreground dark:prose-invert" aria-label="Data Mapping Manual content">
            <div dangerouslySetInnerHTML={{ __html: state.html }} />
            {state.updatedAt && <p className="not-prose mt-4 text-xs text-muted-foreground">Last updated {new Date(state.updatedAt).toLocaleDateString()}</p>}
          </article>
        )}
      </CardContent>
    </Card>
  )
}

