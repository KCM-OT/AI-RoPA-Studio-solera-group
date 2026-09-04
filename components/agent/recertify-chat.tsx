'use client'

import { useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport, lastAssistantMessageIsCompleteWithToolCalls } from 'ai'
import {
  Sparkles,
  Check,
  X,
  Pencil,
  ArrowRight,
  PlusCircle,
  MinusCircle,
  ClipboardCheck,
  CircleCheck,
  ListChecks,
  ShieldCheck,
} from 'lucide-react'
import {
  ChatShell,
  ChatScroll,
  AgentMessage,
  UserMessage,
  AgentText,
  TypingDots,
  Composer,
  ActionCard,
} from './chat-ui'
import { Badge } from '@/components/ui/badge'
import { useStore } from '@/lib/store'
import { FIELD_LABELS, RELATIONSHIP_LABEL, resolveInventory } from '@/lib/authoring'
import type {
  ChangeSubmission,
  FieldChange,
  FieldKey,
  ProcessingActivity,
  RelationshipChange,
  RelationshipType,
} from '@/lib/types'
import type { ProposeChangeInput, SubmitForReviewInput } from '@/lib/agent/schemas'
import { cn } from '@/lib/utils'

function iso(offsetDays = 0) {
  const d = new Date()
  d.setDate(d.getDate() + offsetDays)
  return d.toISOString()
}
function uid(p: string) {
  return `${p}-${Math.random().toString(36).slice(2, 9)}`
}

const FIELD_VALUE_GETTERS: Record<FieldKey, (r: ProcessingActivity) => string> = {
  name: (r) => r.name,
  description: (r) => r.description,
  purpose: (r) => r.purpose,
  legalBasis: (r) => r.legalBasis,
  managingOrganization: (r) => r.managingOrganization,
  businessProcessOwner: (r) => r.businessProcessOwner,
  dataSubjectCategories: (r) => r.dataSubjectCategories.join(', '),
  retentionPeriod: (r) => r.retentionPeriod,
  recipients: (r) => r.recipients,
  internationalTransfers: (r) => r.internationalTransfers,
  securityMeasures: (r) => r.securityMeasures,
  jurisdiction: (r) => r.jurisdiction,
}

// A change the owner has accepted in chat, held client-side until submission.
interface AcceptedChange {
  toolCallId: string
  kind: 'field' | 'relationship'
  field?: FieldChange
  relationship?: RelationshipChange
  reason: string
}

const RECERTIFY_TOPICS = [
  { label: 'Ownership', detail: 'Who runs this process?' },
  { label: 'Tools & systems', detail: 'Are the linked tools still accurate?' },
  { label: 'Personal data', detail: 'What data is being collected?' },
  { label: 'Purpose & legal basis', detail: 'Why is the processing needed?' },
  { label: 'Retention', detail: 'How long is data kept?' },
  { label: 'Transfers & jurisdictions', detail: 'Where does processing happen?' },
  { label: 'Security & recipients', detail: 'Who receives it and how is it protected?' },
] as const

export function RecertifyChat({ record }: { record: ProcessingActivity }) {
  const router = useRouter()
  const store = useStore()

  // Accepted changes accumulate here across the conversation.
  const acceptedRef = useRef<Map<string, AcceptedChange>>(new Map())
  const [submittedId, setSubmittedId] = useState<string | null>(null)

  // Snapshot of record context for the model (stable ref for body callback).
  const recordCtxRef = useRef({
    name: record.name,
    purpose: record.purpose,
    legalBasis: record.legalBasis,
    retentionPeriod: record.retentionPeriod,
    businessProcessOwner: record.businessProcessOwner,
    dataSubjectCategories: record.dataSubjectCategories.join(', '),
    relationships: record.relationships.map((r) => ({ type: r.type, name: r.name })),
    lastReviewedAt: record.lastReviewedAt,
  })

  const { messages, sendMessage, addToolOutput, status } = useChat({
    transport: new DefaultChatTransport({
      api: '/api/agent/recertify',
      body: () => ({ record: recordCtxRef.current }),
    }),
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
  })

  const [input, setInput] = useState('')
  const [answeredTopics, setAnsweredTopics] = useState(0)
  const busy = status === 'submitted' || status === 'streaming'
  const isEmpty = messages.length === 0
  const completedTopics = Math.min(answeredTopics, RECERTIFY_TOPICS.length)
  const activeTopic = RECERTIFY_TOPICS[Math.min(completedTopics, RECERTIFY_TOPICS.length - 1)]

  function submit() {
    const text = input.trim()
    if (!text || busy) return
    sendMessage({ text })
    setAnsweredTopics((count) => Math.min(count + 1, RECERTIFY_TOPICS.length))
    setInput('')
  }

  function kickoff() {
    sendMessage({ text: "Let's recertify this record." })
  }

  // Turn a proposeChange tool input into a concrete field/relationship change.
  function toChange(input: ProposeChangeInput): FieldChange | RelationshipChange | null {
    if (input.changeType === 'field' && input.fieldKey && input.after !== undefined) {
      const before = FIELD_VALUE_GETTERS[input.fieldKey](record)
      return {
        key: input.fieldKey,
        label: FIELD_LABELS[input.fieldKey],
        before,
        after: input.after,
      }
    }
    if (
      input.changeType === 'relationship' &&
      input.relAction &&
      input.relType &&
      input.relName
    ) {
      const inventoryId =
        input.relAction === 'added'
          ? resolveInventory(input.relType, input.relName, {
              vendors: store.vendors,
              assets: store.assets,
              personalDataCategories: store.personalDataCategories,
            })
          : record.relationships.find(
              (r) =>
                r.type === input.relType &&
                r.name.trim().toLowerCase() === input.relName!.trim().toLowerCase(),
            )?.inventoryId ?? null
      return {
        action: input.relAction,
        type: input.relType,
        name: input.relName,
        inventoryId,
      }
    }
    return null
  }

  function acceptChange(toolCallId: string, input: ProposeChangeInput, editedAfter?: string) {
    const resolved =
      input.changeType === 'field' && editedAfter !== undefined
        ? toChange({ ...input, after: editedAfter })
        : toChange(input)
    if (!resolved) return
    const entry: AcceptedChange =
      input.changeType === 'field'
        ? { toolCallId, kind: 'field', field: resolved as FieldChange, reason: input.reason }
        : {
            toolCallId,
            kind: 'relationship',
            relationship: resolved as RelationshipChange,
            reason: input.reason,
          }
    acceptedRef.current.set(toolCallId, entry)
    addToolOutput({
      tool: 'proposeChange',
      toolCallId,
      output: `ACCEPTED: ${describeChange(input, editedAfter)}`,
    })
  }

  function rejectChange(toolCallId: string, input: ProposeChangeInput) {
    acceptedRef.current.delete(toolCallId)
    addToolOutput({
      tool: 'proposeChange',
      toolCallId,
      output: `REJECTED by owner — do not include this change.`,
    })
  }

  function finalizeSubmission(toolCallId: string, input: SubmitForReviewInput) {
    const changes = Array.from(acceptedRef.current.values())
    const fieldChanges = changes
      .filter((c) => c.kind === 'field' && c.field)
      .map((c) => c.field as FieldChange)
    const relationshipChanges = changes
      .filter((c) => c.kind === 'relationship' && c.relationship)
      .map((c) => c.relationship as RelationshipChange)

    const decision = fieldChanges.length + relationshipChanges.length > 0 ? 'modified' : 'approved_as_is'
    const id = uid('sub')

    const submission: ChangeSubmission = {
      id,
      recordId: record.id,
      recordName: record.name,
      submittedBy: 'You',
      submittedRole: record.businessProcessOwner || 'Business Process Owner',
      submittedAt: iso(0),
      status: 'pending_review',
      decision,
      ownerNote: input.ownerNote?.trim() || input.summary,
      fieldChanges,
      relationshipChanges,
      followUps: [],
      aiSummary: input.summary,
    }

    store.addSubmission(submission)
    addToolOutput({
      tool: 'submitForReview',
      toolCallId,
      output: `SUBMITTED to privacy analyst with ${fieldChanges.length + relationshipChanges.length} change(s).`,
    })
    setSubmittedId(id)
  }

  return (
    <div className="flex h-[calc(100svh-66px)] flex-col">
      <div className="border-b border-border bg-card/60 px-4 py-3">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-ai/10 text-ai">
              <ShieldCheck className="size-5" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="truncate text-sm font-semibold text-foreground">Chat based recertify</h1>
                <Badge variant="outline" className="hidden sm:inline-flex">Annual check-in</Badge>
              </div>
              <p className="truncate text-xs text-muted-foreground">{record.name}</p>
            </div>
          </div>
          {!submittedId && <span className="shrink-0 text-xs text-muted-foreground">{completedTopics}/{RECERTIFY_TOPICS.length} topics checked</span>}
        </div>
      </div>
      <div className="mx-auto flex min-h-0 w-full max-w-6xl flex-1 flex-col lg:flex-row">
        <aside className="hidden w-72 shrink-0 border-r border-border bg-card/30 p-5 lg:block">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <ListChecks className="size-4 text-ai" aria-hidden="true" />
            Check-in progress
          </div>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">A fixed sequence keeps every yearly review consistent and easy to audit.</p>
          <div className="mt-5 flex flex-col gap-3">
            {RECERTIFY_TOPICS.map((topic, index) => {
              const complete = index < completedTopics
              const current = index === completedTopics && !submittedId
              return (
                <div key={topic.label} className="flex items-start gap-2.5">
                  <span className={cn('mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border text-[10px] font-semibold', complete && 'border-success bg-success-muted text-success', current && 'border-ai bg-ai/10 text-ai', !complete && !current && 'border-border text-muted-foreground')}>
                    {complete ? <Check className="size-3" aria-hidden="true" /> : index + 1}
                  </span>
                  <div className="min-w-0">
                    <p className={cn('text-xs font-medium', (complete || current) ? 'text-foreground' : 'text-muted-foreground')}>{topic.label}</p>
                    <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">{topic.detail}</p>
                  </div>
                </div>
              )
            })}
          </div>
          <div className="mt-6 rounded-lg border border-border bg-background/60 p-3">
            <p className="text-[11px] font-medium text-foreground">Current focus</p>
            <p className="mt-1 text-xs text-muted-foreground">{submittedId ? 'Review handoff complete' : activeTopic.detail}</p>
          </div>
        </aside>
        <ChatShell>
          <ChatScroll>
          {isEmpty && <Welcome record={record} onStart={kickoff} busy={busy} />}
          {messages.map((m) => (
            <RecertMessage
              key={m.id}
              message={m}
              record={record}
              onAccept={acceptChange}
              onReject={rejectChange}
              onSubmit={finalizeSubmission}
              submittedId={submittedId}
              router={router}
            />
          ))}
          {status === 'submitted' && (
            <AgentMessage>
              <TypingDots />
            </AgentMessage>
          )}
        </ChatScroll>
        {!submittedId && (
          <Composer
            value={input}
            onChange={setInput}
            onSubmit={submit}
            disabled={busy}
            placeholder="Reply to the assistant…"
          />
        )}
      </ChatShell>
      </div>
    </div>
  )
}

function describeChange(input: ProposeChangeInput, editedAfter?: string): string {
  if (input.changeType === 'field') {
    return `${input.fieldKey} => "${editedAfter ?? input.after}"`
  }
  return `${input.relAction} ${input.relType} "${input.relName}"`
}

function Welcome({
  record,
  onStart,
  busy,
}: {
  record: ProcessingActivity
  onStart: () => void
  busy: boolean
}) {
  return (
    <AgentMessage>
      <AgentText>
        {`Hi — it's time for the yearly check-in on "${record.name}". I'll ask a few quick questions in plain English to make sure this record still matches how things actually work. Ready when you are.`}
      </AgentText>
      <div>
        <button
          onClick={onStart}
          disabled={busy}
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          <Sparkles className="size-4" /> Start the check-in
        </button>
      </div>
    </AgentMessage>
  )
}

function RecertMessage({
  message,
  record,
  onAccept,
  onReject,
  onSubmit,
  submittedId,
  router,
}: {
  message: ReturnType<typeof useChat>['messages'][number]
  record: ProcessingActivity
  onAccept: (toolCallId: string, input: ProposeChangeInput, editedAfter?: string) => void
  onReject: (toolCallId: string, input: ProposeChangeInput) => void
  onSubmit: (toolCallId: string, input: SubmitForReviewInput) => void
  submittedId: string | null
  router: ReturnType<typeof useRouter>
}) {
  if (message.role === 'user') {
    const text = message.parts
      .filter((p) => p.type === 'text')
      .map((p) => (p as { text: string }).text)
      .join('')
    // Hide the internal kickoff message from the transcript.
    if (text === "Let's recertify this record.") return null
    return <UserMessage>{text}</UserMessage>
  }

  return (
    <AgentMessage>
      {message.parts.map((part, i) => {
        if (part.type === 'text') {
          return part.text ? <AgentText key={i}>{part.text}</AgentText> : null
        }
        if (part.type === 'tool-proposeChange') {
          const callId = part.toolCallId
          if (part.state === 'input-streaming') {
            return (
              <ActionCard key={i}>
                <div className="flex items-center gap-2 px-4 py-3 text-sm text-muted-foreground">
                  <Sparkles className="size-4 animate-pulse text-ai" /> Preparing a change…
                </div>
              </ActionCard>
            )
          }
          if (part.state === 'input-available') {
            return (
              <ChangeCard
                key={i}
                record={record}
                input={part.input as ProposeChangeInput}
                onAccept={(edited) => onAccept(callId, part.input as ProposeChangeInput, edited)}
                onReject={() => onReject(callId, part.input as ProposeChangeInput)}
              />
            )
          }
          if (part.state === 'output-available') {
            const accepted = String(part.output).startsWith('ACCEPTED')
            return (
              <ResolvedChip key={i} accepted={accepted} input={part.input as ProposeChangeInput} />
            )
          }
        }
        if (part.type === 'tool-submitForReview') {
          const callId = part.toolCallId
          if (part.state === 'input-available') {
            return (
              <SubmitCard
                key={i}
                input={part.input as SubmitForReviewInput}
                onSubmit={() => onSubmit(callId, part.input as SubmitForReviewInput)}
              />
            )
          }
          if (part.state === 'output-available' && submittedId) {
            return <SubmittedCard key={i} submissionId={submittedId} router={router} />
          }
        }
        return null
      })}
    </AgentMessage>
  )
}

function ChangeCard({
  record,
  input,
  onAccept,
  onReject,
}: {
  record: ProcessingActivity
  input: ProposeChangeInput
  onAccept: (editedAfter?: string) => void
  onReject: () => void
}) {
  const isField = input.changeType === 'field'
  const before =
    isField && input.fieldKey ? FIELD_VALUE_GETTERS[input.fieldKey](record) : ''
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(input.after ?? '')
  const [chipValues, setChipValues] = useState(() =>
    (input.after ?? '')
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean),
  )
  const [done, setDone] = useState<null | 'accepted' | 'rejected'>(null)
  const isChipField = isField && ['dataSubjectCategories', 'jurisdiction', 'recipients'].includes(input.fieldKey ?? '')

  if (done) {
    return <ResolvedChip accepted={done === 'accepted'} input={input} />
  }

  return (
    <ActionCard>
      <div className="flex items-center justify-between gap-2 border-b border-border bg-ai/5 px-4 py-2.5">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          {isField ? (
            <Pencil className="size-4 text-ai" />
          ) : input.relAction === 'added' ? (
            <PlusCircle className="size-4 text-ai" />
          ) : (
            <MinusCircle className="size-4 text-ai" />
          )}
          Proposed change
        </div>
        <Badge variant="ai">
          <Sparkles /> Your call
        </Badge>
      </div>

      <div className="px-4 py-3">
        {isField && input.fieldKey ? (
          <>
            <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {FIELD_LABELS[input.fieldKey]}
            </div>
            <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="flex-1 rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground line-through">
                {before || 'not set'}
              </div>
              <ArrowRight className="hidden size-4 shrink-0 text-muted-foreground sm:block" />
              {isChipField ? (
                <EditableValueChips
                  values={chipValues}
                  editing={editing}
                  onChange={(next) => {
                    setChipValues(next)
                    setValue(next.join(', '))
                  }}
                />
              ) : editing ? (
                <textarea
                  autoFocus
                  rows={2}
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  className="flex-1 resize-none rounded-lg border border-ai/40 bg-background px-3 py-2 text-sm outline-none"
                />
              ) : (
                <div className="flex-1 rounded-lg border border-success/30 bg-success-muted px-3 py-2 text-sm font-medium text-foreground">
                  {value}
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex items-center gap-2 text-sm">
            <span
              className={cn(
                'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
                input.relAction === 'added'
                  ? 'bg-success-muted text-success'
                  : 'bg-danger-muted text-danger',
              )}
            >
              {input.relAction === 'added' ? 'Add' : 'Remove'}
            </span>
            <span className="text-[10px] uppercase text-muted-foreground">
              {input.relType && RELATIONSHIP_LABEL[input.relType]}
            </span>
            <span className="font-medium text-foreground">{input.relName}</span>
          </div>
        )}
        {input.reason && (
          <p className="mt-2 text-xs italic text-muted-foreground">“{input.reason}”</p>
        )}
      </div>

      <div className="flex items-center justify-end gap-2 border-t border-border bg-muted/30 px-4 py-2.5">
        {isField && (
          <button
            onClick={() => setEditing((e) => !e)}
            className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium hover:bg-muted"
          >
            <Pencil className="size-3.5" /> {editing ? 'Done editing' : 'Edit'}
          </button>
        )}
        <button
          onClick={() => {
            setDone('rejected')
            onReject()
          }}
          className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:bg-danger-muted hover:text-danger"
        >
          <X className="size-3.5" /> No, skip
        </button>
        <button
          onClick={() => {
            setDone('accepted')
            onAccept(isChipField ? chipValues.join(', ') : isField ? value : undefined)
          }}
          className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Check className="size-3.5" /> Yes, apply
        </button>
      </div>
    </ActionCard>
  )
}

function EditableValueChips({
  values,
  editing,
  onChange,
}: {
  values: string[]
  editing: boolean
  onChange: (values: string[]) => void
}) {
  const [draft, setDraft] = useState('')

  function addValue() {
    const next = draft.trim()
    if (!next || values.some((value) => value.toLowerCase() === next.toLowerCase())) return
    onChange([...values, next])
    setDraft('')
  }

  return (
    <div className="flex-1 rounded-lg border border-success/30 bg-success-muted p-2">
      <div className="flex flex-wrap gap-2">
        {values.map((value) => (
          <span
            key={value}
            className="inline-flex h-6 items-center gap-1 rounded-[2px] bg-[#e8f1f6] pl-2 text-sm leading-5 text-foreground"
          >
            {value}
            {editing && (
              <button
                type="button"
                aria-label={`Remove ${value}`}
                onClick={() => onChange(values.filter((item) => item !== value))}
                className="inline-flex size-6 items-center justify-center text-muted-foreground hover:bg-foreground/10"
              >
                <X className="size-4" />
              </button>
            )}
          </span>
        ))}
      </div>
      {editing && (
        <div className="mt-2 flex gap-2">
          <input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.nativeEvent.isComposing && event.keyCode !== 229) {
                event.preventDefault()
                addValue()
              }
            }}
            placeholder="Add a value"
            className="min-w-0 flex-1 rounded-md border border-ai/40 bg-background px-2 py-1 text-sm outline-none"
          />
          <button
            type="button"
            onClick={addValue}
            className="rounded-md border border-border px-2 py-1 text-xs font-medium hover:bg-muted"
          >
            Add
          </button>
        </div>
      )}
    </div>
  )
}

function ResolvedChip({
  accepted,
  input,
}: {
  accepted: boolean
  input: ProposeChangeInput
}) {
  const label =
    input.changeType === 'field' && input.fieldKey
      ? FIELD_LABELS[input.fieldKey]
      : `${input.relAction === 'added' ? 'Add' : 'Remove'} ${input.relName}`
  return (
    <div
      className={cn(
        'inline-flex w-fit items-center gap-1.5 rounded-full border px-3 py-1 text-xs',
        accepted
          ? 'border-success/30 bg-success-muted text-foreground'
          : 'border-border bg-muted text-muted-foreground',
      )}
    >
      {accepted ? (
        <Check className="size-3.5 text-success" />
      ) : (
        <X className="size-3.5" />
      )}
      {accepted ? 'Applied' : 'Skipped'}: {label}
    </div>
  )
}

function SubmitCard({
  input,
  onSubmit,
}: {
  input: SubmitForReviewInput
  onSubmit: () => void
}) {
  const [done, setDone] = useState(false)
  return (
    <ActionCard tone="ai">
      <div className="flex items-center gap-2 border-b border-border bg-ai/5 px-4 py-2.5 text-sm font-medium text-foreground">
        <ClipboardCheck className="size-4 text-ai" /> Ready to send for review
      </div>
      <div className="px-4 py-3">
        <p className="text-sm text-pretty text-foreground">{input.summary}</p>
        {input.reassignOwnershipTo && (
          <p className="mt-2 text-xs text-muted-foreground">
            Ownership to move to: <span className="font-medium">{input.reassignOwnershipTo}</span>
          </p>
        )}
        <p className="mt-2 text-xs text-muted-foreground">
          A privacy analyst will review everything before it&apos;s committed to the register.
        </p>
      </div>
      <div className="flex items-center justify-end border-t border-border bg-muted/30 px-4 py-2.5">
        <button
          disabled={done}
          onClick={() => {
            setDone(true)
            onSubmit()
          }}
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          <ClipboardCheck className="size-3.5" /> Send to privacy analyst
        </button>
      </div>
    </ActionCard>
  )
}

function SubmittedCard({
  submissionId,
  router,
}: {
  submissionId: string
  router: ReturnType<typeof useRouter>
}) {
  return (
    <ActionCard tone="success">
      <div className="flex flex-col gap-3 p-4">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          <span className="flex size-6 items-center justify-center rounded-full bg-success-muted text-success">
            <CircleCheck className="size-4" />
          </span>
          Chat based recertify complete
        </div>
        <p className="text-xs leading-relaxed text-muted-foreground">Your answers and proposed changes are now pending privacy analyst review. Nothing is committed to the register until they approve it.</p>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => router.push(`/review/${submissionId}`)}
            className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
          >
            See analyst review
          </button>
          <button
            onClick={() => router.push('/maintenance')}
            className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted"
          >
            Back to maintenance
          </button>
        </div>
      </div>
    </ActionCard>
  )
}
