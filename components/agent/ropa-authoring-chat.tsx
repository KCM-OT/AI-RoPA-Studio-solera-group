'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'
import {
  Sparkles,
  CircleCheck,
  GitBranch,
  Pencil,
  Check,
  X,
  Building2,
  MessageSquare,
} from 'lucide-react'
import {
  ChatShell,
  ChatScroll,
  AgentMessage,
  UserMessage,
  AgentText,
  TypingDots,
  ActionCard,
} from './chat-ui'
import { ConfidenceBadge } from '@/components/badges'
import { Badge } from '@/components/ui/badge'
import { useStore } from '@/lib/store'
import {
  FIELD_LABELS,
  FIELD_ORDER,
  parseLegalBasis,
  resolveInventory,
  RELATIONSHIP_LABEL,
} from '@/lib/authoring'
import type {
  FieldKey,
  FieldMeta,
  ProcessingActivity,
  Relationship,
  ScanResult,
  RelationshipType,
} from '@/lib/types'
import { cn } from '@/lib/utils'

function iso(offsetDays = 0) {
  const d = new Date()
  d.setDate(d.getDate() + offsetDays)
  return d.toISOString()
}
function uid(p: string) {
  return `${p}-${Math.random().toString(36).slice(2, 9)}`
}

// Working copy of the draft the human can edit before saving.
interface DraftField {
  key: FieldKey
  value: string
  confidence: number
  evidence: string
}
interface DraftRel {
  type: RelationshipType
  name: string
  confidence: number
  inventoryId: string | null
}
interface Draft {
  summary: string
  fields: DraftField[]
  relationships: DraftRel[]
}

const ANIMATED_PROMPTS = [
  'Create a new RoPA document from scratch for our customer onboarding process.',
  'Update an existing RoPA document with our new CRM vendor and retention period.',
  'Upload the attached file and use it to start a new RoPA document.',
]

const SUGGESTIONS = [
  {
    label: 'Describe a recruitment process',
    value:
      'We run candidate recruitment. Applicants submit their name, email, CV and work history through Workday. Recruiters and hiring managers review them, and we use HireVue for recorded video interviews. We keep applicant data for about 12 months after a role closes.',
  },
  {
    label: 'Describe a marketing process',
    value:
      'Our growth team sends marketing emails to prospects and customers. We store names and email addresses in HubSpot and track opens and clicks. People opt in via our website and can unsubscribe any time.',
  },
]

export function RopaAuthoringChat() {
  const router = useRouter()
  const store = useStore()

  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({ api: '/api/agent/ropa-authoring' }),
  })

  const [input, setInput] = useState('')
  const [promptAnimationActive, setPromptAnimationActive] = useState(true)
  const [hasSubmitted, setHasSubmitted] = useState(false)
  const isEmpty = messages.length === 0
  const busy = status === 'submitted' || status === 'streaming'

  useEffect(() => {
    if (!promptAnimationActive || !isEmpty) return

    let promptIndex = 0
    let characterIndex = 0
    let timer: ReturnType<typeof setTimeout>

    const typeNextCharacter = () => {
      const prompt = ANIMATED_PROMPTS[promptIndex]
      characterIndex += 1
      setInput(prompt.slice(0, characterIndex))

      if (characterIndex < prompt.length) {
        timer = setTimeout(typeNextCharacter, 3000 / prompt.length)
      } else {
        timer = setTimeout(() => {
          setInput('')
          characterIndex = 0
          promptIndex = (promptIndex + 1) % ANIMATED_PROMPTS.length
          timer = setTimeout(typeNextCharacter, 300)
        }, 3000)
      }
    }

    timer = setTimeout(typeNextCharacter, 3000 / ANIMATED_PROMPTS[0].length)
    return () => clearTimeout(timer)
  }, [isEmpty, promptAnimationActive])

  function submit(textOverride?: string) {
    const text = (textOverride ?? input).trim()
    if (!text || busy) return
    setHasSubmitted(true)
    setPromptAnimationActive(false)
    sendMessage({ text })
    setInput('')
  }

  const chat = (
    <div className="flex min-h-0 flex-1 flex-col">
      <ChatShell>
      <ChatScroll>
        {isEmpty && !hasSubmitted && (
          <Welcome value={input} onChange={setInput} onSubmit={submit} disabled={busy} onFocus={() => { setPromptAnimationActive(false); setInput('') }} onPromptSelect={() => setPromptAnimationActive(false)} />
        )}
        {messages.map((m) => <MessageRenderer key={m.id} message={m} store={store} router={router} hideDraft />)}
        {status === 'submitted' && <AgentMessage><TypingDots /></AgentMessage>}
      </ChatScroll>
      {hasSubmitted && (
        <div className="sticky bottom-0 z-10 border-t border-border bg-background px-3 py-3 shadow-[0_-8px_20px_rgba(0,0,0,0.06)]">
          <textarea value={input} disabled={busy} rows={2} placeholder="Ask a follow-up…" onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing && e.keyCode !== 229) { e.preventDefault(); submit() } }} className="block w-full resize-none rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none focus:border-ai/50" />
          <div className="flex items-center gap-2 pt-2">
            <button type="button" aria-label="Add source" className="flex size-8 items-center justify-center rounded-md border border-[#d9d9d9] bg-white shadow-sm hover:bg-[#f7f7f7]"><img src="/figma/plus.svg" alt="" className="size-4" /></button>
            <button type="button" aria-label="Attach document" className="flex size-8 items-center justify-center rounded-md border border-[#d9d9d9] bg-white shadow-sm hover:bg-[#f7f7f7]"><img src="/figma/attachment-button.svg" alt="" className="size-4" /></button>
            <button type="button" aria-label="Send message" disabled={busy || !input.trim()} onClick={() => submit()} className="ml-auto flex size-8 items-center justify-center rounded-md bg-[#167cbb] transition-opacity hover:bg-[#126a9f] disabled:cursor-not-allowed disabled:opacity-40"><img src="/figma/arrow-up.svg" alt="" className="size-4" /></button>
          </div>
        </div>
      )}
      </ChatShell>
    </div>
  )

  return hasSubmitted ? (
    <div className="flex min-h-0 flex-1 flex-col lg:h-[calc(100vh-174px)] lg:flex-row">
      <div className="flex h-full min-h-0 w-full flex-col overflow-hidden border-r border-border lg:w-[30%]">{chat}</div>
      <section aria-label="Draft record artifact" className="min-h-0 w-full overflow-y-auto bg-muted/20 p-4 lg:w-[70%]">
        <div className="mx-auto max-w-4xl">
          <h2 className="mb-3 text-sm font-semibold text-foreground">Draft record artifact</h2>
          {messages.map((m) => <MessageRenderer key={`artifact-${m.id}`} message={m} store={store} router={router} artifactOnly />)}
          {busy && messages.every((message) => message.role === 'user') && (
            <div className="flex min-h-32 items-center justify-center" aria-label="Building draft artifact">
              <div className="relative flex size-16 items-center justify-center">
                <div className="absolute inset-0 rounded-full border-2 border-purple-400/20 border-t-purple-400/80 animate-spin" aria-hidden="true" />
                <Sparkles className="relative size-8 animate-pulse text-ai" aria-hidden="true" />
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  ) : <div className="flex min-h-0 flex-1 flex-col">{chat}</div>
}

function Welcome({
  value,
  onChange,
  onSubmit,
  disabled,
  onFocus,
  onPromptSelect,
}: {
  value: string
  onChange: (value: string) => void
  onSubmit: (value?: string) => void
  disabled: boolean
  onFocus?: () => void
  onPromptSelect?: () => void
}) {
  const samples = [
    { title: 'Recruitment process', description: 'Create a record for hiring and onboarding employees.', body: SUGGESTIONS[0].value },
    { title: 'Marketing process', description: 'Document how marketing campaigns use personal data.', body: SUGGESTIONS[1].value },
    { title: 'Customer support', description: 'Capture the data used to resolve customer questions.', body: 'Our support team uses Zendesk to manage customer questions and stores contact details, conversation history, and account information to resolve issues.' },
  ]

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing && e.keyCode !== 229) {
      e.preventDefault()
      onSubmit()
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-[690px] flex-col items-center gap-6 px-2 py-10 text-center">
      <div className="flex items-center gap-2 text-xl leading-7 text-foreground">
        <img src="/figma/ai-sparkle.svg" alt="" className="size-4" />
        <span>What are you working on?</span>
      </div>
      <div className="w-full rounded-md border border-[#d9d9d9] bg-white p-3 text-left shadow-sm">
        <textarea
          value={value}
          disabled={disabled}
          rows={4}
          placeholder="Describe what your team does with personal data…"
          onChange={(e) => onChange(e.target.value)}
          onFocus={onFocus}
          onKeyDown={handleKeyDown}
          className="min-h-[108px] w-full resize-none bg-transparent px-2 py-1 text-sm text-[#1a1a1a] outline-none placeholder:text-[#a9a9a9]"
        />
        <div className="flex items-center justify-between px-1 pt-2">
          <div className="flex items-center gap-2">
            <button type="button" aria-label="Add source" className="flex size-8 items-center justify-center rounded-md border border-[#d9d9d9] bg-white shadow-sm hover:bg-[#f7f7f7]"><img src="/figma/plus.svg" alt="" className="size-4" /></button>
            <button type="button" aria-label="Attach document" className="flex size-8 items-center justify-center rounded-md border border-[#d9d9d9] bg-white shadow-sm hover:bg-[#f7f7f7]"><img src="/figma/attachment-button.svg" alt="" className="size-4" /></button>
          </div>
          <button type="button" aria-label="Send message" disabled={disabled || !value.trim()} onClick={() => onSubmit()} className="flex size-8 items-center justify-center rounded-md bg-[#167cbb] disabled:cursor-not-allowed disabled:opacity-40"><img src="/figma/arrow-up.svg" alt="" className="size-4" /></button>
        </div>
      </div>
      <div className="w-full max-w-[575px] self-start text-left font-sans text-xs leading-4 text-black">
        <p className="font-semibold">Turn source documents into Article 30 records</p>
        <p>
          Upload a brief, contract, or DPIA, import an existing repository, or describe your use case. The agent drafts a processing activity with field-level confidence, flags duplicates, and suggests vendor, asset, and personal data relationships — all subject to your approval.
        </p>
      </div>
      <div className="flex w-full flex-col gap-3 text-left">
        <p className="text-xs text-[#4d4d4d]">Try a sample prompt</p>
        <div className="grid gap-3 sm:grid-cols-3">
          {samples.map((sample, index) => (
            <button key={sample.title} type="button" disabled={disabled} onClick={() => { onPromptSelect?.(); onChange(sample.body) }} className="flex min-h-28 flex-col gap-3 rounded-md border border-[#d9d9d9] bg-white p-3 text-left shadow-sm transition hover:border-[#167cbb] disabled:opacity-50">
              <MessageSquare className="size-5 text-[#4d4d4d]" aria-hidden="true" />
              <span className="text-sm font-medium text-[#1a1a1a]">{sample.title}</span>
              <span className="text-xs leading-4 text-[#4d4d4d]">{sample.description}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

function MessageRenderer({
  message,
  store,
  router,
  hideDraft = false,
  artifactOnly = false,
}: {
  message: ReturnType<typeof useChat>['messages'][number]
  store: ReturnType<typeof useStore>
  router: ReturnType<typeof useRouter>
  hideDraft?: boolean
  artifactOnly?: boolean
}) {
  if (artifactOnly && message.role !== 'assistant') return null
  if (message.role === 'user') {
    const text = message.parts
      .filter((p) => p.type === 'text')
      .map((p) => (p as { text: string }).text)
      .join('')
    return <UserMessage>{text}</UserMessage>
  }

  return (
    <AgentMessage>
      {message.parts.map((part, i) => {
        if (part.type === 'text') {
          return artifactOnly ? null : part.text ? <AgentText key={i}>{part.text}</AgentText> : null
        }
        // Server tool: extraction result -> draft card
        if (part.type === 'tool-extractRecord') {
          if (part.state === 'input-streaming' || part.state === 'input-available') {
        return artifactOnly ? (
          <div key={i} className="flex min-h-32 items-center justify-center">
            <Sparkles className="size-8 animate-pulse text-ai" aria-label="Building draft artifact" />
          </div>
        ) : (
          <ActionCard key={i}>
            <div className="flex items-center gap-2 px-4 py-3 text-sm text-muted-foreground">
              <Sparkles className="size-4 animate-pulse text-ai" />
              Reading your description and drafting the record…
            </div>
          </ActionCard>
        )
          }
          if (part.state === 'output-available') {
            const scan = part.output as ScanResult
            return hideDraft && !artifactOnly ? null : <DraftCard key={i} scan={scan} store={store} router={router} />
          }
          if (part.state === 'output-error') {
            return (
              <ActionCard key={i} tone="neutral">
                <div className="px-4 py-3 text-sm text-danger">
                  {"I couldn't draft the record just now. Try describing the activity again."}
                </div>
              </ActionCard>
            )
          }
        }
        // Client handoff: propose final record for saving
        if (part.type === 'tool-proposeRecord') {
          if (part.state === 'input-available' || part.state === 'output-available') {
            const summary = (part.input as { summary?: string })?.summary ?? ''
            return <ProposeBanner key={i} summary={summary} />
          }
        }
        return null
      })}
    </AgentMessage>
  )
}

// The editable draft card the agent produces from an extraction.
function DraftCard({
  scan,
  store,
  router,
}: {
  scan: ScanResult
  store: ReturnType<typeof useStore>
  router: ReturnType<typeof useRouter>
}) {
  const initial = useMemo<Draft>(() => {
    const fields: DraftField[] = scan.fields.map((f) => ({
      key: f.key,
      value: f.value,
      confidence: f.confidence,
      evidence: f.evidence,
    }))
    const relationships: DraftRel[] = scan.relationships.map((r) => ({
      type: r.type,
      name: r.name,
      confidence: r.confidence,
      inventoryId: resolveInventory(r.type, r.name, {
        vendors: store.vendors,
        assets: store.assets,
        personalDataCategories: store.personalDataCategories,
      }),
    }))
    return { summary: scan.summary, fields, relationships }
  }, [scan, store])

  const [draft, setDraft] = useState<Draft>(initial)
  const [approvedItems, setApprovedItems] = useState<Set<string>>(new Set())
  const [editing, setEditing] = useState<FieldKey | null>(null)
  const [editValue, setEditValue] = useState('')
  const [saved, setSaved] = useState<string | null>(null)

  const orderedFields = useMemo(() => {
    return [...draft.fields].sort(
      (a, b) => FIELD_ORDER.indexOf(a.key) - FIELD_ORDER.indexOf(b.key),
    )
  }, [draft.fields])

  function updateField(key: FieldKey, value: string) {
    setDraft((d) => ({
      ...d,
      fields: d.fields.map((f) => (f.key === key ? { ...f, value } : f)),
    }))
  }
  function startFieldEdit(field: DraftField) {
    setEditing(field.key)
    setEditValue(field.value)
  }
  function saveFieldEdit() {
    if (!editing) return
    updateField(editing, editValue)
    setEditing(null)
  }
  function cancelFieldEdit() {
    setEditing(null)
    setEditValue('')
  }
  function removeField(key: FieldKey) {
    setDraft((d) => ({ ...d, fields: d.fields.filter((f) => f.key !== key) }))
  }
  function removeRel(idx: number) {
    setDraft((d) => ({
      ...d,
      relationships: d.relationships.filter((_, j) => j !== idx),
    }))
  }

  const nameField = draft.fields.find((f) => f.key === 'name')
  const recordName = nameField?.value?.trim() || 'Untitled processing activity'

  function save() {
    const get = (k: FieldKey) => draft.fields.find((f) => f.key === k)?.value?.trim() ?? ''
    const now = iso(0)
    const id = uid('pa')

    const fieldMeta: Partial<Record<FieldKey, FieldMeta>> = {}
    for (const f of draft.fields) {
      fieldMeta[f.key] = {
        provenance: 'ai',
        confidence: f.confidence,
        evidence: f.evidence,
      }
    }

    const relObjects: Relationship[] = draft.relationships.map((r) => ({
      id: uid('rel'),
      type: r.type,
      name: r.name,
      inventoryId: r.inventoryId,
      provenance: 'ai',
      confidence: r.confidence,
      status: 'accepted',
    }))

    const dsc = get('dataSubjectCategories')

    const pa: ProcessingActivity = {
      id,
      name: recordName,
      description: get('description'),
      status: 'active',
      purpose: get('purpose'),
      legalBasis: parseLegalBasis(get('legalBasis')),
      managingOrganization: get('managingOrganization'),
      businessProcessOwner: get('businessProcessOwner'),
      dataSubjectCategories: dsc ? dsc.split(',').map((s) => s.trim()).filter(Boolean) : [],
      retentionPeriod: get('retentionPeriod'),
      recipients: get('recipients'),
      internationalTransfers: get('internationalTransfers'),
      securityMeasures: get('securityMeasures'),
      jurisdiction: get('jurisdiction'),
      fieldMeta,
      relationships: relObjects,
      sourceDocuments: [
        {
          id: uid('doc'),
          name: 'Conversation with authoring agent',
          kind: 'Chat transcript',
          addedAt: now,
          excerpt: draft.summary,
        },
      ],
      createdWithAI: true,
      updatedWithAI: false,
      reviewCadenceDays: 365,
      lastReviewedAt: null,
      nextReviewAt: iso(365),
      parentId: null,
      createdAt: now,
      updatedAt: now,
    }

    store.addActivity(pa)
    store.logEvent({
      actor: 'AI Agent',
      action: 'record_created',
      recordId: id,
      recordName: pa.name,
      detail: `Authored via chat: ${draft.fields.length} field(s) and ${relObjects.length} relationship(s), reviewed and saved by a human.`,
    })
    setSaved(id)
  }

  if (saved) {
    return (
      <ActionCard tone="success">
        <div className="flex flex-col gap-3 p-4">
          <div className="flex items-center gap-2 text-sm font-medium text-foreground">
            <span className="flex size-6 items-center justify-center rounded-full bg-success-muted text-success">
              <CircleCheck className="size-4" />
            </span>
            Saved “{recordName}” to the inventory.
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => router.push(`/records/${saved}`)}
              className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
            >
              View record
            </button>
            <button
              onClick={() => router.push('/records')}
              className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted"
            >
              All records
            </button>
          </div>
        </div>
      </ActionCard>
    )
  }

  return (
    <ActionCard>
      <div className="flex items-center justify-between border-b border-border bg-background px-4 py-2.5 text-sm font-medium text-foreground">
        <span>{approvedItems.size}/{orderedFields.length + draft.relationships.length} Approved</span>
      </div>
      <div className="flex items-center justify-between gap-2 border-b border-border bg-ai/5 px-4 py-2.5">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          Draft record
        </div>
        <Badge variant="ai">
          <Sparkles /> Needs your review
        </Badge>
      </div>

      <div className="divide-y divide-border">
        {orderedFields.map((f) => (
          <div key={f.key} className={cn('px-4 py-2.5 transition-colors', !approvedItems.has(f.key) && 'bg-muted/35 text-muted-foreground')}>
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {FIELD_LABELS[f.key]}
              </span>
              <div className="flex items-center gap-1.5">
                <ConfidenceBadge value={f.confidence} />
                {editing !== f.key && (
                  <button
                    aria-label={`Edit ${FIELD_LABELS[f.key]}`}
                    onClick={() => startFieldEdit(f)}
                    className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                  >
                    <Pencil className="size-3.5" />
                  </button>
                )}
                <label className="flex items-center gap-1 text-xs text-muted-foreground">
                  <input
                    type="checkbox"
                    aria-label={`Approve ${FIELD_LABELS[f.key]}`}
                    checked={approvedItems.has(f.key)}
                    onChange={(event) => setApprovedItems((current) => {
                      const next = new Set(current)
                      event.target.checked ? next.add(f.key) : next.delete(f.key)
                      return next
                    })}
                    className="size-4 accent-primary"
                  />
                </label>
              </div>
            </div>
            {editing === f.key ? (
              <div className="flex flex-col gap-2">
                <textarea autoFocus rows={2} value={editValue} onChange={(e) => setEditValue(e.target.value)} className="w-full resize-none rounded-lg border border-input bg-background p-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" />
                <div className="flex items-center gap-2">
                  <button type="button" onClick={saveFieldEdit} className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"><Check className="size-3.5" /> Save</button>
                  <button type="button" onClick={cancelFieldEdit} className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground"><X className="size-3.5" /> Cancel</button>
                </div>
              </div>
            ) : (
              <>
                <p className={cn('text-sm text-pretty', f.value ? 'text-foreground' : 'italic text-muted-foreground/60')}>{f.value || 'Not documented'}</p>
                {f.evidence && <p className="mt-1 border-l-2 border-ai/30 pl-2 text-xs italic text-muted-foreground">“{f.evidence}”</p>}
              </>
            )}
          </div>
        ))}
      </div>

      {draft.relationships.length > 0 && (
        <div className="border-t border-border px-4 py-3">
          <div className="mb-2 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            <GitBranch className="size-3.5" /> Linked vendors, systems &amp; data
          </div>
          <div className="flex flex-wrap gap-1.5">
            {draft.relationships.map((r, idx) => (
              <span
                key={`${r.type}-${r.name}-${idx}`}
                className={cn(
                  'group inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs',
                  approvedItems.has(`relationship-${idx}`)
                    ? r.inventoryId
                      ? 'border-border bg-muted text-foreground'
                      : 'border-warning/40 bg-warning-muted text-foreground'
                    : 'border-border bg-muted/35 text-muted-foreground',
                )}
              >
                <span className="text-[10px] uppercase text-muted-foreground">
                  {RELATIONSHIP_LABEL[r.type]}
                </span>
                {r.name}
                {!r.inventoryId && <span className="text-warning">• new</span>}
                <input
                  type="checkbox"
                  aria-label={`Approve ${r.name}`}
                  checked={approvedItems.has(`relationship-${idx}`)}
                  onChange={(event) => setApprovedItems((current) => {
                    const next = new Set(current)
                    event.target.checked ? next.add(`relationship-${idx}`) : next.delete(`relationship-${idx}`)
                    return next
                  })}
                  className="size-3.5 accent-primary"
                />
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between gap-2 border-t border-border bg-muted/30 px-4 py-2.5">
        <span className="text-xs text-muted-foreground">
          You can edit any field, then save it to the inventory.
        </span>
        <button
          onClick={save}
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Check className="size-3.5" /> Save to inventory
        </button>
      </div>
    </ActionCard>
  )
}

function ProposeBanner({ summary }: { summary: string }) {
  return (
    <ActionCard tone="ai">
      <div className="flex items-start gap-2.5 px-4 py-3">
        <Building2 className="mt-0.5 size-4 shrink-0 text-ai" />
        <div className="text-sm text-foreground">
          <span className="font-medium">Ready to save. </span>
          {summary || 'Review the draft above, make any edits, and save it to the register.'}
        </div>
      </div>
    </ActionCard>
  )
}
