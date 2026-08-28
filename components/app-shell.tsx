'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Sparkles } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { useStore } from '@/lib/store'
import { reviewState } from '@/lib/ropa'

function TopBarIconButton({ src, label, href }: { src: string; label: string; href?: string }) {
  const className = 'flex size-10 shrink-0 items-center justify-center rounded-md hover:bg-black/5'
  const content = <img src={src} alt="" width={43} height={40} />
  if (href) {
    return (
      <Link href={href} title={label} aria-label={label} className={className}>
        {content}
      </Link>
    )
  }
  return (
    <button type="button" title={label} aria-label={label} className={className}>
      {content}
    </button>
  )
}

function TopBar() {
  const [searchOpen, setSearchOpen] = useState(false)

  return (
    <div className="flex h-[66px] shrink-0 items-center justify-between border-b border-[#b1b1b1] bg-[#f6f6f6] px-4">
      <div className="text-lg font-semibold text-[#1a1a1a]">Solera Group</div>

      <div className="flex items-center gap-1">
        {searchOpen ? (
          <input
            autoFocus
            type="search"
            placeholder="Search…"
            onBlur={() => setSearchOpen(false)}
            className="h-9 w-56 rounded-md border border-[#b1b1b1] bg-white px-3 text-sm text-[#282828] outline-none placeholder:text-[#282828]/50 focus-visible:border-primary"
          />
        ) : (
          <button
            type="button"
            title="Search"
            aria-label="Search"
            onClick={() => setSearchOpen(true)}
            className="flex size-10 shrink-0 items-center justify-center rounded-md hover:bg-black/5"
          >
            <img src="/topbar/icon-search.svg" alt="" width={43} height={40} />
          </button>
        )}

        <button
          type="button"
          title="Ask Copilot"
          className="ml-1 flex h-8 shrink-0 items-center gap-2 rounded border border-[#4c754d] bg-white px-4 text-sm font-semibold text-[#33553e] hover:bg-[#4c754d]/5"
        >
          <img src="/topbar/icon-copilot.svg" alt="" width={12} height={15} />
          Ask Copilot
        </button>

        <TopBarIconButton src="/topbar/icon-alert.svg" label="Alerts" />

        <button
          type="button"
          title="Privacy Group"
          className="flex h-10 shrink-0 items-center gap-2 rounded-md px-3 text-sm text-[#282828] hover:bg-black/5"
        >
          Privacy Group
          <img src="/topbar/angle-down.svg" alt="" width={16} height={9} />
        </button>

        <TopBarIconButton src="/topbar/icon-cog.svg" label="Settings" href="/settings" />

        <button type="button" title="Account" aria-label="Account" className="flex size-10 shrink-0 items-center justify-center rounded-md hover:bg-black/5">
          <span className="flex size-[21px] items-center justify-center rounded-full bg-primary text-[11px] text-primary-foreground">
            AR
          </span>
        </button>

        <TopBarIconButton src="/topbar/icon-question.svg" label="Help" />
      </div>
    </div>
  )
}

type NavIcon = 'sparkle' | { src: string; w: number; h: number }

interface NavItemDef {
  href: string
  label: string
  icon: NavIcon
}

const NAV: NavItemDef[] = [
  { href: '/demo', label: 'Scripted Demo', icon: 'sparkle' },
  { href: '/author', label: 'Author with AI', icon: 'sparkle' },
  { href: '/', label: 'Dashboard', icon: { src: '/nav/icon-dashboard.svg', w: 16, h: 14 } },
  { href: '/records', label: 'RoPA Records', icon: { src: '/nav/icon-database.svg', w: 15, h: 18 } },
  { href: '/maintenance', label: 'Maintenance', icon: { src: '/nav/icon-calendar-clock.svg', w: 15, h: 15 } },
  { href: '/review', label: 'Review Queue', icon: { src: '/nav/icon-calendar-clock.svg', w: 15, h: 15 } },
  { href: '/activity', label: 'Activity Log', icon: { src: '/nav/icon-scroll.svg', w: 15, h: 13 } },
  { href: '/settings', label: 'Posture Rules', icon: { src: '/nav/icon-square-sliders.svg', w: 15, h: 15 } },
]

// No destination yet — rendered per design but inert until product scope defines
// where these go (see conversation: placeholders, not Posture Rules duplicates).
const SECONDARY_NAV = [
  { label: 'Setup', icon: { src: '/nav/icon-setup.svg', w: 15.2344, h: 15.2344 }, chevron: true },
  { label: 'Settings', icon: { src: '/nav/icon-settings.svg', w: 14.9281, h: 15.9375 }, chevron: false },
]

function NavIconView({ icon, collapsed }: { icon: NavIcon; collapsed: boolean }) {
  if (icon === 'sparkle') {
    return (
      <span className="relative inline-block size-4 shrink-0" aria-hidden>
        <img
          src="/nav/sparkle-full-b.svg"
          alt=""
          className="absolute left-0"
          style={{ top: 4.6, width: 11.42, height: 11.43 }}
        />
        <img
          src="/nav/sparkle-full-a.svg"
          alt=""
          className="absolute"
          style={{ left: '62%', top: 0, width: 6.1, height: 6.1 }}
        />
      </span>
    )
  }
  return (
    <img
      src={icon.src}
      alt=""
      width={icon.w}
      height={icon.h}
      className={cn('shrink-0', collapsed && 'mx-auto')}
      aria-hidden
    />
  )
}

function NavRow({
  href,
  label,
  icon,
  active,
  collapsed,
  divider,
  badge,
  trailing,
}: {
  href: string
  label: string
  icon: NavIcon
  active: boolean
  collapsed: boolean
  divider?: boolean
  badge?: number
  trailing?: React.ReactNode
}) {
  return (
    <Link
      href={href}
      title={collapsed ? label : undefined}
      className={cn(
        'flex h-[52px] items-center gap-2 pr-1.5 text-xs transition-colors',
        divider && 'border-t border-sidebar-border',
        active ? 'bg-sidebar-accent' : 'hover:bg-sidebar-accent/60',
      )}
    >
      <span className={cn('h-full w-1.5 shrink-0', active ? 'bg-sidebar-primary' : 'bg-transparent')} />
      <NavIconView icon={icon} collapsed={collapsed} />
      {!collapsed && (
        <>
          <span className={cn('flex-1 truncate', active ? 'text-sidebar-foreground' : 'text-sidebar-foreground/80')}>
            {label}
          </span>
          {typeof badge === 'number' && badge > 0 && (
            <Badge variant="danger" className="bg-[#DA7C01] text-white">
              {badge}
            </Badge>
          )}
          {trailing}
        </>
      )}
    </Link>
  )
}

function InertRow({
  label,
  icon,
  collapsed,
  divider,
  chevron,
}: {
  label: string
  icon: NavIcon
  collapsed: boolean
  divider?: boolean
  chevron?: boolean
}) {
  return (
    <div
      title={collapsed ? label : undefined}
      aria-disabled="true"
      className={cn(
        'flex h-[52px] cursor-not-allowed items-center gap-2 pr-1.5 text-xs text-sidebar-foreground/50',
        divider && 'border-t border-sidebar-border',
      )}
    >
      <span className="h-full w-1.5 shrink-0" />
      <NavIconView icon={icon} collapsed={collapsed} />
      {!collapsed && (
        <>
          <span className="flex-1 truncate">{label}</span>
          {chevron && <img src="/nav/angle-right.svg" alt="" width={8.77} height={15.02} className="shrink-0" />}
        </>
      )}
    </div>
  )
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { activities, submissions } = useStore()
  const attention = activities.filter((a) => reviewState(a) === 'overdue').length
  const pendingReviews = submissions.filter(
    (s) => s.status === 'pending_review' || s.status === 'changes_requested',
  ).length
  const [collapsed, setCollapsed] = useState(false)

  return (
    <div className="flex min-h-screen bg-background">
      <aside
        className={cn(
          'sticky top-0 hidden h-screen shrink-0 flex-col bg-sidebar text-sidebar-foreground transition-[width] duration-200 md:flex',
          collapsed ? 'w-16' : 'w-56',
        )}
      >
        <div className="flex h-[66px] items-center gap-2 border-b border-sidebar-border px-1">
          <img src="/nav/button-main-menu.svg" alt="" width={40} height={40} className="shrink-0" />
          {!collapsed && <img src="/nav/ot-lockup-white.svg" alt="OneTrust" width={140} height={20} />}
        </div>

        {!collapsed && (
          <div className="px-4 pb-4 pt-3">
            <div className="text-base leading-tight">Cartographer</div>
            <div className="text-xs leading-tight text-sidebar-foreground/60">AI RoPA Studio</div>
          </div>
        )}

        <nav className="flex flex-col">
          {NAV.map((item, i) => {
            const active = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href)
            return (
              <NavRow
                key={item.href}
                href={item.href}
                label={item.label}
                icon={item.icon}
                active={active}
                collapsed={collapsed}
                divider={i === 0}
                badge={
                  item.href === '/maintenance'
                    ? attention
                    : item.href === '/review'
                      ? pendingReviews
                      : undefined
                }
              />
            )
          })}
          {SECONDARY_NAV.map((item, i) => (
            <InertRow
              key={item.label}
              label={item.label}
              icon={item.icon}
              collapsed={collapsed}
              divider={i === 0}
              chevron={item.chevron}
            />
          ))}
        </nav>

        {!collapsed && (
          <div className="mt-auto p-3">
            <div className="rounded-lg border border-sidebar-border bg-sidebar-accent/40 p-3 text-xs text-sidebar-foreground/70">
              <div className="mb-1 flex items-center gap-1.5 font-medium text-sidebar-foreground">
                <Sparkles className="size-3.5 text-sidebar-primary" />
                Human-in-the-loop
              </div>
              Every AI change is a suggestion until you approve it.
            </div>
          </div>
        )}

        <div className={cn('flex h-10 items-center border-t border-sidebar-border', collapsed ? 'justify-center' : 'justify-end pr-2')}>
          <button
            type="button"
            onClick={() => setCollapsed((c) => !c)}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="flex size-8 items-center justify-center rounded-md hover:bg-sidebar-accent/60"
          >
            <img
              src="/nav/collapse-arrow.svg"
              alt=""
              width={16}
              height={14}
              className={cn('transition-transform', collapsed && 'rotate-180')}
            />
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="sticky top-0 z-20">
          <TopBar />
        </div>
        {children}
      </div>
    </div>
  )
}

export type PageHeaderStatusTone = 'warning' | 'success' | 'danger' | 'neutral'

export interface PageHeaderStatus {
  label: string
  tone?: PageHeaderStatusTone
}

const STATUS_DOT: Record<PageHeaderStatusTone, string> = {
  warning: 'bg-warning',
  success: 'bg-success',
  danger: 'bg-danger',
  neutral: 'bg-muted-foreground',
}

export function PageHeader({
  title,
  description,
  status,
  actions,
}: {
  title: string
  description?: string
  status?: PageHeaderStatus[]
  actions?: React.ReactNode
}) {
  return (
    <header className="sticky top-[66px] z-10 flex flex-col gap-4 border-b border-[#a9a9a9] bg-white p-6 sm:flex-row sm:items-start sm:justify-between sm:gap-8">
      <div className="flex flex-1 flex-col gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-semibold leading-8 text-[#1a1a1a] text-balance">{title}</h1>
          {status?.map((s, i) => (
            <span key={i} className="flex items-center gap-2">
              <span className={cn('size-2 shrink-0 rounded-full', STATUS_DOT[s.tone ?? 'neutral'])} />
              <span className="text-base text-[#1a1a1a]">{s.label}</span>
            </span>
          ))}
        </div>
        {description && <p className="text-sm leading-5 text-[#1a1a1a] text-pretty">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </header>
  )
}
