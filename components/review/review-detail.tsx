'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  Sparkles,
  Loader2,
  Plus,
  Minus,
  Send,
  CheckCircle2,
  MessageSquare,
  Wand2,
  ChevronRight,
  FileText,
  User,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button, buttonVariants } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { PageHeader } from '@/components/app-shell'
import { useStore } from '@/lib/store'
import { formatDate } from '@/lib/ropa'
import {
  AUDIENCE_LABEL,
  CHANNEL_LABEL,
  RELATIONSHIP_GROUP_LABEL,
  changeCount,
} from '@/lib/recert'
import type {
  ChangeSubmission,
  FollowUpAudience,
  FollowUpChannel,
  FollowUpQuestion,
} from '@/lib/types'
import { cn } from '@/lib/utils'

export function ReviewDetail({ id }: { id: string }) {
  const router = useRouter()
  const {
    getSubmission,
    getActivity,
    updateSubmission,
    addFollowUp,
    updateFollowUp,
    commitSubmission,
    logEvent,
  } = useStore()

  const submission = getSubmission(id)
  const record = submission ? getActivity(submission.recordId) : undefined

  if (!submission || !record) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Review not found" />
        <Link href="/review" className={buttonVariants({ variant: 'outline' })}>
          <ArrowLeft className="mr-2 size-4" />
          Back to queue
        </Link>
      </div>
    )
  }

  const isClosed = submission.status === 'committed'

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <Link
          href="/review"
          className="inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Recertification review
        </Link>
        <PageHeader
          title={submission.recordName}
          description={`Submitted by ${submission.submittedBy} (${submission.submittedRole}) on ${formatDate(
            submission.submittedAt,
          )}`}
          actions={
            <Link
              href={`/records/${record.id}`}
              className={buttonVariants({ variant: 'outline', size: 'sm' })}
            >
              <FileText className="mr-1.5 size-4" />
              Open record
            </Link>
          }
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="flex flex-col gap-6">
          <AiSummaryCard submission={submission} record={record} onSummary={(aiSummary) =>
            updateSubmission(submission.id, { aiSummary })
          } />

          <OwnerNoteCard submission={submission} />

          <ChangeReviewCard submission={submission} />
        </div>

        <div className="flex flex-col gap-6">
          <DecisionCard
            submission={submission}
            isClosed={isClosed}
            onCommit={() => {
              commitSubmission(submission.id)
              router.push('/review')
            }}
            onRequestChanges={() => {
              updateSubmission(submission.id, { status: 'changes_requested' })
              logEvent({
                actor: 'You',
                action: 'review_scheduled',
                recordId: record.id,
                recordName: record.name,
                detail: `Sent recertification back to ${submission.submittedBy} for changes.`,
              })
            }}
          />

          <FollowUpsCard
            submission={submission}
            onAdd={(f) => addFollowUp(submission.id, f)}
            onUpdate={(fid, patch) => updateFollowUp(submission.id, fid, patch)}
          />
        </div>
      </div>
    </div>
  )
}

/* ---------------- AI summary (Story 8) ---------------- */

function AiSummaryCard({
  submission,
  record,
  onSummary,
}: {
  submission: ChangeSubmission
  record: ReturnType<ReturnType<typeof useStore>['getActivity']>
  onSummary: (summary: string) => void
}) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function generate() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/recert/summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ submission, record }),
      })
      if (!res.ok) throw new Error('Request failed')
      const data = (await res.json()) as { summary: string }
      onSummary(data.summary)
    } catch {
      setError('Could not generate the summary. Try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="border-ai/30 bg-ai/[0.03]">
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="size-4 text-ai" />
          AI review summary
        </CardTitle>
        <Button
          size="sm"
          variant={submission.aiSummary ? 'outline' : 'default'}
          onClick={generate}
          disabled={loading}
        >
          {loading ? (
            <>
              <Loader2 className="mr-1.5 size-4 animate-spin" />
              Summarizing
            </>
          ) : submission.aiSummary ? (
            'Regenerate'
          ) : (
            <>
              <Sparkles className="mr-1.5 size-4" />
              Summarize activity
            </>
          )}
        </Button>
      </CardHeader>
      <CardContent>
        {error && <p className="text-sm text-destructive">{error}</p>}
        {submission.aiSummary ? (
          <div className="flex flex-col gap-2 text-sm leading-relaxed text-foreground">
            {submission.aiSummary.split('\n').filter(Boolean).map((line, i) => (
              <p key={i} className="text-pretty">
                {line.replace(/^[-•]\s*/, '')}
              </p>
            ))}
          </div>
        ) : (
          !error && (
            <p className="text-sm text-muted-foreground text-pretty">
              Ask AI to summarize what this processing activity does and what the owner changed
              since the last review, so you can focus on the parts that need judgment.
            </p>
          )
        )}
      </CardContent>
    </Card>
  )
}

/* ---------------- Owner note ---------------- */

function OwnerNoteCard({ submission }: { submission: ChangeSubmission }) {
  if (!submission.ownerNote) return null
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <User className="size-4 text-muted-foreground" />
          What the owner told us
        </CardTitle>
      </CardHeader>
      <CardContent>
        <blockquote className="border-l-2 border-border pl-3 text-sm leading-relaxed text-foreground text-pretty">
          {submission.ownerNote}
        </blockquote>
      </CardContent>
    </Card>
  )
}

/* ---------------- Change review / diff ---------------- */

function ChangeReviewCard({ submission }: { submission: ChangeSubmission }) {
  const count = changeCount(submission)

  if (count === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <CheckCircle2 className="size-4 text-success" />
            Recertified with no changes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-pretty">
            {submission.submittedBy} confirmed this record is still accurate. Approve to stamp a
            fresh certification date, or send a follow-up if something looks off.
          </p>
        </CardContent>
      </Card>
    )
  }

  const relByGroup = {
    vendor: submission.relationshipChanges.filter((r) => r.type === 'vendor'),
    asset: submission.relationshipChanges.filter((r) => r.type === 'asset'),
    personalData: submission.relationshipChanges.filter((r) => r.type === 'personalData'),
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          Proposed changes
          <Badge variant="outline" className="text-xs">
            {count}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        {submission.fieldChanges.length > 0 && (
          <div className="flex flex-col gap-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Field updates
            </h3>
            {submission.fieldChanges.map((fc) => (
              <div key={fc.key} className="flex flex-col gap-1.5">
                <span className="text-sm font-medium text-foreground">{fc.label}</span>
                <div className="grid gap-2 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
                  <span className="rounded-md bg-destructive/10 px-2.5 py-1.5 text-sm text-destructive line-through decoration-destructive/50">
                    {fc.before || '—'}
                  </span>
                  <ChevronRight className="hidden size-4 shrink-0 text-muted-foreground sm:block" />
                  <span className="rounded-md bg-success/10 px-2.5 py-1.5 text-sm text-success">
                    {fc.after || '—'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {(['personalData', 'vendor', 'asset'] as const).map((group) =>
          relByGroup[group].length > 0 ? (
            <div key={group} className="flex flex-col gap-2">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {RELATIONSHIP_GROUP_LABEL[group]}
              </h3>
              <div className="flex flex-wrap gap-2">
                {relByGroup[group].map((rc, i) => (
                  <span
                    key={`${rc.name}-${i}`}
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-sm',
                      rc.action === 'added'
                        ? 'border-success/30 bg-success/10 text-success'
                        : 'border-destructive/30 bg-destructive/10 text-destructive',
                    )}
                  >
                    {rc.action === 'added' ? (
                      <Plus className="size-3.5" />
                    ) : (
                      <Minus className="size-3.5" />
                    )}
                    {rc.name}
                    {rc.action === 'added' && !rc.inventoryId && (
                      <Badge
                        variant="outline"
                        className="ml-1 border-warning/30 bg-warning/10 text-[10px] text-warning"
                      >
                        new to inventory
                      </Badge>
                    )}
                  </span>
                ))}
              </div>
            </div>
          ) : null,
        )}
      </CardContent>
    </Card>
  )
}

/* ---------------- Decision (commit / request changes) ---------------- */

function DecisionCard({
  submission,
  isClosed,
  onCommit,
  onRequestChanges,
}: {
  submission: ChangeSubmission
  isClosed: boolean
  onCommit: () => void
  onRequestChanges: () => void
}) {
  const openFollowUps = submission.followUps.filter((f) => f.status === 'sent').length

  if (isClosed) {
    return (
      <Card className="border-success/30 bg-success/[0.04]">
        <CardContent className="flex items-center gap-3 py-5">
          <CheckCircle2 className="size-6 text-success" />
          <div className="flex flex-col">
            <span className="font-medium text-foreground">Committed to the register</span>
            <span className="text-sm text-muted-foreground">
              These changes are now part of the official RoPA.
            </span>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Decision</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <p className="text-sm text-muted-foreground text-pretty">
          Once you&apos;re satisfied, commit the recertification to the permanent inventory. This
          records a fresh certification date and updates the register.
        </p>
        {openFollowUps > 0 && (
          <p className="rounded-md bg-warning/10 px-3 py-2 text-xs text-warning">
            {openFollowUps} follow-up{openFollowUps === 1 ? '' : 's'} still awaiting a reply. You can
            still commit, but you may want to wait for answers.
          </p>
        )}
        <div className="flex flex-col gap-2">
          <Button onClick={onCommit}>
            <CheckCircle2 className="mr-1.5 size-4" />
            Approve &amp; commit to register
          </Button>
          <Button variant="outline" onClick={onRequestChanges}>
            Send back to owner
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

/* ---------------- Follow-ups (Stories 9 + 10) ---------------- */

function FollowUpsCard({
  submission,
  onAdd,
  onUpdate,
}: {
  submission: ChangeSubmission
  onAdd: (f: FollowUpQuestion) => void
  onUpdate: (id: string, patch: Partial<FollowUpQuestion>) => void
}) {
  const [suggesting, setSuggesting] = useState(false)
  const [suggestions, setSuggestions] = useState<
    { question: string; audience: FollowUpAudience; recipient: string }[]
  >([])
  const [draft, setDraft] = useState('')
  const [channel, setChannel] = useState<FollowUpChannel>('teams')
  const [audience, setAudience] = useState<FollowUpAudience>('business_process_owner')

  const recipientFor = (a: FollowUpAudience) =>
    a === 'business_process_owner'
      ? submission.submittedBy
      : a === 'application_owner'
        ? 'Application owner'
        : 'Vendor owner'

  async function suggest() {
    setSuggesting(true)
    try {
      const res = await fetch('/api/recert/follow-ups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ submission }),
      })
      if (!res.ok) throw new Error()
      const data = (await res.json()) as {
        questions: { question: string; audience: FollowUpAudience; recipient: string }[]
      }
      setSuggestions(data.questions)
    } catch {
      setSuggestions([])
    } finally {
      setSuggesting(false)
    }
  }

  function send(
    question: string,
    aud: FollowUpAudience,
    recipient: string,
    aiGenerated: boolean,
    ch: FollowUpChannel,
  ) {
    if (!question.trim()) return
    const now = new Date().toISOString()
    onAdd({
      id: `fu-${Math.random().toString(36).slice(2, 9)}`,
      question: question.trim(),
      channel: ch,
      audience: aud,
      recipient,
      status: 'sent',
      aiGenerated,
      createdAt: now,
      sentAt: now,
      answeredAt: null,
      response: null,
    })
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <MessageSquare className="size-4 text-muted-foreground" />
          Follow-up questions
        </CardTitle>
        <Button size="sm" variant="outline" onClick={suggest} disabled={suggesting}>
          {suggesting ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <>
              <Wand2 className="mr-1.5 size-4 text-ai" />
              Suggest
            </>
          )}
        </Button>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {/* Existing follow-ups + consolidated responses */}
        {submission.followUps.length > 0 && (
          <div className="flex flex-col gap-3">
            {submission.followUps.map((f) => (
              <FollowUpItem key={f.id} followUp={f} onUpdate={onUpdate} />
            ))}
          </div>
        )}

        {/* AI suggestions */}
        {suggestions.length > 0 && (
          <div className="flex flex-col gap-2 rounded-md border border-ai/30 bg-ai/[0.03] p-3">
            <span className="flex items-center gap-1.5 text-xs font-semibold text-ai">
              <Sparkles className="size-3.5" />
              Suggested questions
            </span>
            {suggestions.map((s, i) => (
              <div key={i} className="flex items-start justify-between gap-2">
                <p className="text-sm text-foreground text-pretty">{s.question}</p>
                <button
                  type="button"
                  onClick={() => {
                    send(s.question, s.audience, s.recipient, true, channel)
                    setSuggestions((prev) => prev.filter((_, idx) => idx !== i))
                  }}
                  className="inline-flex shrink-0 items-center gap-1 rounded-md bg-ai px-2 py-1 text-xs font-medium text-ai-foreground transition-opacity hover:opacity-90"
                >
                  <Send className="size-3" />
                  Send
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Manual composer */}
        <div className="flex flex-col gap-2 rounded-md border border-border p-3">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={2}
            placeholder="Ask a clarifying question..."
            className="w-full resize-none rounded-md border border-input bg-background px-2.5 py-1.5 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-ring focus:ring-2 focus:ring-ring/30"
          />
          <div className="flex flex-wrap items-center gap-2">
            <SegmentedSelect
              value={audience}
              onChange={(v) => setAudience(v as FollowUpAudience)}
              options={[
                { value: 'business_process_owner', label: 'Owner' },
                { value: 'application_owner', label: 'App owner' },
                { value: 'vendor_owner', label: 'Vendor' },
              ]}
            />
            <SegmentedSelect
              value={channel}
              onChange={(v) => setChannel(v as FollowUpChannel)}
              options={[
                { value: 'teams', label: 'Teams' },
                { value: 'slack', label: 'Slack' },
              ]}
            />
            <Button
              size="sm"
              className="ml-auto"
              disabled={!draft.trim()}
              onClick={() => {
                send(draft, audience, recipientFor(audience), false, channel)
                setDraft('')
              }}
            >
              <Send className="mr-1.5 size-3.5" />
              Send
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function FollowUpItem({
  followUp,
  onUpdate,
}: {
  followUp: FollowUpQuestion
  onUpdate: (id: string, patch: Partial<FollowUpQuestion>) => void
}) {
  const [simulating, setSimulating] = useState(false)

  // Prototype affordance: simulate the recipient replying in Teams/Slack so the
  // consolidated-response loop is demonstrable end-to-end.
  function simulateReply() {
    setSimulating(true)
    setTimeout(() => {
      onUpdate(followUp.id, {
        status: 'answered',
        answeredAt: new Date().toISOString(),
        response:
          'Confirmed — thanks for checking. Updated the details on our side and everything looks right now.',
      })
      setSimulating(false)
    }, 900)
  }

  return (
    <div className="flex flex-col gap-2 rounded-md border border-border p-3">
      <div className="flex items-center gap-2">
        <Badge variant="outline" className="text-[10px]">
          {CHANNEL_LABEL[followUp.channel]}
        </Badge>
        <span className="text-xs text-muted-foreground">
          {AUDIENCE_LABEL[followUp.audience]} · {followUp.recipient}
        </span>
        {followUp.aiGenerated && <Sparkles className="ml-auto size-3.5 text-ai" />}
      </div>
      <p className="text-sm text-foreground text-pretty">{followUp.question}</p>

      {followUp.status === 'answered' && followUp.response ? (
        <div className="flex flex-col gap-1 rounded-md bg-muted/60 p-2.5">
          <span className="text-xs font-medium text-success">Reply received</span>
          <p className="text-sm text-foreground text-pretty">{followUp.response}</p>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs text-warning">Awaiting reply</span>
          <button
            type="button"
            onClick={simulateReply}
            disabled={simulating}
            className="inline-flex items-center gap-1 text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
          >
            {simulating ? (
              <Loader2 className="size-3 animate-spin" />
            ) : (
              'Simulate reply'
            )}
          </button>
        </div>
      )}
    </div>
  )
}

function SegmentedSelect({
  value,
  onChange,
  options,
}: {
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
}) {
  return (
    <div className="inline-flex overflow-hidden rounded-md border border-border">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={cn(
            'px-2.5 py-1 text-xs font-medium transition-colors',
            value === o.value
              ? 'bg-foreground text-background'
              : 'bg-background text-muted-foreground hover:text-foreground',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
