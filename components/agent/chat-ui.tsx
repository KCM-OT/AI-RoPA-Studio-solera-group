'use client'

import { useEffect, useRef, type ReactNode } from 'react'
import { Sparkles, User, ArrowUp } from 'lucide-react'
import { cn } from '@/lib/utils'

// Shared visual primitives for the agentic chat flows (Author + Recertify).
// The bubbles host both plain agent prose and rich inline action cards.

export function ChatShell({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto flex h-full w-full max-w-3xl flex-col">{children}</div>
  )
}

export function ChatScroll({ children }: { children: ReactNode }) {
  const endRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  })
  return (
    <div className="flex-1 overflow-y-auto px-4 py-6">
      <div className="flex flex-col gap-5">
        {children}
        <div ref={endRef} />
      </div>
    </div>
  )
}

export function AgentMessage({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-ai/12 text-ai">
        <Sparkles className="size-4" />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-3 pt-1">{children}</div>
    </div>
  )
}

export function UserMessage({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-start justify-end gap-3">
      <div className="max-w-[80%] rounded-2xl rounded-tr-sm bg-primary px-4 py-2.5 text-sm leading-relaxed text-primary-foreground">
        {children}
      </div>
      <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <User className="size-4" />
      </div>
    </div>
  )
}

export function AgentText({ children }: { children: ReactNode }) {
  return (
    <div className="whitespace-pre-wrap text-pretty text-sm leading-relaxed text-foreground">
      {children}
    </div>
  )
}

export function TypingDots() {
  return (
    <div className="flex items-center gap-1 py-1" aria-label="Assistant is typing">
      <span className="size-1.5 animate-bounce rounded-full bg-ai [animation-delay:-0.3s]" />
      <span className="size-1.5 animate-bounce rounded-full bg-ai [animation-delay:-0.15s]" />
      <span className="size-1.5 animate-bounce rounded-full bg-ai" />
    </div>
  )
}

export function Composer({
  value,
  onChange,
  onSubmit,
  disabled,
  placeholder = 'Message the assistant…',
  suggestions,
}: {
  value: string
  onChange: (v: string) => void
  onSubmit: () => void
  disabled?: boolean
  placeholder?: string
  suggestions?: { label: string; value: string }[]
}) {
  const taRef = useRef<HTMLTextAreaElement>(null)

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    // Respect IME composition (CJK) and Safari's unreliable 229 keyCode.
    if (
      e.key === 'Enter' &&
      !e.shiftKey &&
      !e.nativeEvent.isComposing &&
      e.keyCode !== 229
    ) {
      e.preventDefault()
      if (!disabled && value.trim()) onSubmit()
    }
  }

  return (
    <div className="border-t border-border bg-background px-4 py-3">
      {suggestions && suggestions.length > 0 && (
        <div className="mx-auto mb-2.5 flex max-w-3xl flex-wrap gap-2">
          {suggestions.map((s) => (
            <button
              key={s.label}
              type="button"
              disabled={disabled}
              onClick={() => onChange(s.value)}
              className="rounded-full border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-ai/40 hover:text-foreground disabled:opacity-50"
            >
              {s.label}
            </button>
          ))}
        </div>
      )}
      <div className="mx-auto flex max-w-3xl items-end gap-2 rounded-2xl border border-border bg-card p-2 shadow-sm focus-within:border-ai/50">
        <textarea
          ref={taRef}
          rows={1}
          value={value}
          disabled={disabled}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          className="max-h-40 min-h-9 flex-1 resize-none bg-transparent px-2 py-1.5 text-sm text-foreground outline-none placeholder:text-muted-foreground disabled:opacity-60"
        />
        <button
          type="button"
          onClick={onSubmit}
          disabled={disabled || !value.trim()}
          aria-label="Send message"
          className={cn(
            'flex size-9 shrink-0 items-center justify-center rounded-xl transition-colors',
            disabled || !value.trim()
              ? 'bg-muted text-muted-foreground'
              : 'bg-primary text-primary-foreground hover:bg-primary/90',
          )}
        >
          <ArrowUp className="size-4" />
        </button>
      </div>
    </div>
  )
}

// A framed container for rich inline action cards inside an agent bubble.
export function ActionCard({
  children,
  tone = 'ai',
}: {
  children: ReactNode
  tone?: 'ai' | 'neutral' | 'success'
}) {
  return (
    <div
      className={cn(
        'overflow-hidden rounded-xl border bg-card',
        tone === 'ai' && 'border-ai/25',
        tone === 'neutral' && 'border-border',
        tone === 'success' && 'border-success/30',
      )}
    >
      {children}
    </div>
  )
}
