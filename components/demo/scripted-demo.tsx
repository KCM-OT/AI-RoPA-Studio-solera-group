'use client'

import Link from 'next/link'
import { ArrowRight, CheckCircle2, ShieldCheck, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'

const beats = [
  {
    title: 'Start with the process',
    body: 'Solera Group’s Talent Acquisition team owns one activity: sourcing, screening, interviewing, and hiring candidates for open roles.',
  },
  {
    title: 'Place TalentSprint inside it',
    body: 'TalentSprint AI is one relationship in the activity, alongside the ATS and background-check provider. It ranks resumes and increasingly scores recorded interviews.',
  },
  {
    title: 'Keep people accountable',
    body: 'AI suggestions remain reviewable. Talent Acquisition approves recommendations, documents safeguards, and retains a path for candidates to challenge significant decisions.',
  },
]

export function ScriptedDemo() {
  return (
    <main className="min-h-[100dvh] bg-background text-foreground">
      <div className="mx-auto flex max-w-6xl flex-col gap-16 px-6 py-10 md:px-10 md:py-16">
        <header className="flex items-center justify-between border-b border-border pb-6">
          <Link href="/" className="text-sm font-semibold tracking-tight">Solera Group / Cartographer</Link>
          <span className="text-xs text-muted-foreground">AI RoPA Studio</span>
        </header>

        <section className="grid gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:items-end">
          <div className="flex flex-col gap-6">
            <div className="flex items-center gap-2 text-sm font-medium text-primary">
              <Sparkles className="size-4" aria-hidden="true" />
              Scripted product briefing
            </div>
            <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-balance md:text-6xl">
              AI-assisted candidate screening belongs in the process record.
            </h1>
            <p className="max-w-2xl text-lg leading-8 text-muted-foreground text-pretty">
              Follow one Solera Group activity from business context to vendor relationships, data categories, local variation, and the controls that keep people in the loop.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link href="/records/pa-recruitment">
                  Open recruitment record <ArrowRight data-icon="inline-end" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="/">View dashboard</Link>
              </Button>
            </div>
          </div>

          <aside className="flex flex-col gap-5 border-l-2 border-primary pl-6 lg:mb-2">
            <p className="text-sm font-medium">The setup</p>
            <p className="text-2xl leading-9 text-pretty">Solera operates across the US, Germany, France, Brazil, Singapore, and the UK.</p>
            <p className="text-sm leading-6 text-muted-foreground">This activity touches EU candidate data and significant employment decisions, so the record must make both the processing and the safeguards visible.</p>
          </aside>
        </section>

        <section className="grid gap-px overflow-hidden rounded-lg border border-border bg-border md:grid-cols-3" aria-label="Demo narrative">
          {beats.map((beat, index) => (
            <article key={beat.title} className="flex min-h-64 flex-col gap-6 bg-card p-6 md:p-8">
              <span className="font-mono text-sm text-primary">0{index + 1}</span>
              <div className="mt-auto flex flex-col gap-3">
                <h2 className="text-xl font-semibold">{beat.title}</h2>
                <p className="text-sm leading-6 text-muted-foreground">{beat.body}</p>
              </div>
            </article>
          ))}
        </section>

        <section className="flex flex-col gap-6 border-t border-border pt-10 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-1 size-5 shrink-0 text-primary" aria-hidden="true" />
            <div className="flex flex-col gap-1">
              <h2 className="font-semibold">What this demo surfaces</h2>
              <p className="max-w-2xl text-sm leading-6 text-muted-foreground">Article 30 scope, CPRA ADMT context, international transfers, special-category signals, and the assessments triggered by higher-risk processing.</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CheckCircle2 className="size-4 text-primary" aria-hidden="true" />
            Human approval remains required
          </div>
        </section>
      </div>
    </main>
  )
}

export default ScriptedDemo
