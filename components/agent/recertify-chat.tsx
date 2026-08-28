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
  const busy = status === 'submitted' || status === 'streaming'
  const isEmpty = messages.length === 0

  function submit() {
    const text = input.trim()
    if (!text || busy) return
    sendMessage({ text })
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
  const [done, setDone] = useState<null | 'accepted' | 'rejected'>(null)

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
              {editing ? (
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
            onAccept(isField ? value : undefined)
          }}
          className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Check className="size-3.5" /> Yes, apply
        </button>
      </div>
    </ActionCard>
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
          Sent to the privacy team for review.
        </div>
        <div className="flex gap-2">
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
