'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'
import {
  Sparkles,
  CircleCheck,
  FileText,
  GitBranch,
  Pencil,
  Check,
  X,
  Building2,
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

export function AuthorChat() {
  const router = useRouter()
  const store = useStore()

  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({ api: '/api/agent/author' }),
  })

  const [input, setInput] = useState('')
  const busy = status === 'submitted' || status === 'streaming'

  function submit() {
    const text = input.trim()
    if (!text || busy) return
    sendMessage({ text })
    setInput('')
  }

  const isEmpty = messages.length === 0

  return (
    <div className="flex h-[calc(100svh-66px)] flex-col">
      <ChatShell>
        <ChatScroll>
          {isEmpty && <Welcome />}
          {messages.map((m) => (
            <MessageRenderer key={m.id} message={m} store={store} router={router} />
          ))}
          {status === 'submitted' && (
            <AgentMessage>
              <TypingDots />
            </AgentMessage>
          )}
        </ChatScroll>
        <Composer
          value={input}
          onChange={setInput}
          onSubmit={submit}
          disabled={busy}
          placeholder="Describe what your team does with personal data…"
          suggestions={isEmpty ? SUGGESTIONS : undefined}
        />
      </ChatShell>
    </div>
  )
}

function Welcome() {
  return (
    <AgentMessage>
      <AgentText>
        {
          "Hi — I'm your RoPA authoring assistant. Tell me in plain English what your team does with people's personal data and I'll turn it into a structured Article 30 record for you to review and save. What's the activity?"
        }
      </AgentText>
    </AgentMessage>
  )
}

function MessageRenderer({
  message,
  store,
  router,
}: {
  message: ReturnType<typeof useChat>['messages'][number]
  store: ReturnType<typeof useStore>
  router: ReturnType<typeof useRouter>
}) {
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
          return part.text ? <AgentText key={i}>{part.text}</AgentText> : null
        }
        // Server tool: extraction result -> draft card
        if (part.type === 'tool-extractRecord') {
          if (part.state === 'input-streaming' || part.state === 'input-available') {
            return (
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
            return <DraftCard key={i} scan={scan} store={store} router={router} />
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
  const [editing, setEditing] = useState<FieldKey | null>(null)
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
            Saved “{recordName}” to the register.
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
      <div className="flex items-center justify-between gap-2 border-b border-border bg-ai/5 px-4 py-2.5">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          <FileText className="size-4 text-ai" />
          Draft record
        </div>
        <Badge variant="ai">
          <Sparkles /> Needs your review
        </Badge>
      </div>

      <div className="divide-y divide-border">
        {orderedFields.map((f) => (
          <div key={f.key} className="px-4 py-2.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {FIELD_LABELS[f.key]}
              </span>
              <div className="flex items-center gap-1.5">
                <ConfidenceBadge value={f.confidence} />
                <button
                  aria-label={`Edit ${FIELD_LABELS[f.key]}`}
                  onClick={() => setEditing(editing === f.key ? null : f.key)}
                  className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  <Pencil className="size-3.5" />
                </button>
                <button
                  aria-label={`Remove ${FIELD_LABELS[f.key]}`}
                  onClick={() => removeField(f.key)}
                  className="rounded p-1 text-muted-foreground hover:bg-danger-muted hover:text-danger"
                >
                  <X className="size-3.5" />
                </button>
              </div>
            </div>
            {editing === f.key ? (
              <textarea
                autoFocus
                rows={2}
                value={f.value}
                onChange={(e) => updateField(f.key, e.target.value)}
                onBlur={() => setEditing(null)}
                className="mt-1.5 w-full resize-none rounded-lg border border-ai/40 bg-background px-2.5 py-1.5 text-sm outline-none"
              />
            ) : (
              <p className="mt-0.5 text-sm text-pretty text-foreground">{f.value}</p>
            )}
            {f.evidence && (
              <p className="mt-1 text-xs italic text-muted-foreground">“{f.evidence}”</p>
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
                  r.inventoryId
                    ? 'border-border bg-muted text-foreground'
                    : 'border-warning/40 bg-warning-muted text-foreground',
                )}
              >
                <span className="text-[10px] uppercase text-muted-foreground">
                  {RELATIONSHIP_LABEL[r.type]}
                </span>
                {r.name}
                {!r.inventoryId && <span className="text-warning">• new</span>}
                <button
                  aria-label={`Remove ${r.name}`}
                  onClick={() => removeRel(idx)}
                  className="text-muted-foreground hover:text-danger"
                >
                  <X className="size-3" />
                </button>
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
