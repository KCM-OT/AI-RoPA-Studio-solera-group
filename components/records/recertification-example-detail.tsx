'use client'

import { useState } from 'react'
import { CalendarClock, Check, ClipboardCheck, FileText, Sparkles, X } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { PageHeader } from '@/components/app-shell'
import { useStore } from '@/lib/store'
import { formatDate } from '@/lib/ropa'
import type { ProcessingActivity } from '@/lib/types'

const APPROVALS = [
  { key: 'retention', title: 'Confirm hired-candidate retention', detail: 'HRIS retention has no stated end date. Approve as-is, or edit the retention field with a limit before recertifying.' },
  { key: 'transfers', title: 'Confirm Singapore transfer assessment', detail: "SCCs are drafted but the transfer impact assessment isn't on file yet. Approve to proceed, or flag for follow-up." },
  { key: 'vendor', title: 'Approve new processor: Checkr', detail: 'Added since last certification for background checks. Confirm it belongs on this record.' },
  { key: 'specialcat', title: 'Confirm special category safeguard', detail: '“Racial or ethnic origin” is inferred data under Art. 9. Confirm the DPIA still covers how it is derived and protected.' },
  { key: 'modelversion', title: 'Confirm AI scoring model is current', detail: 'TalentSprint AI shipped a new interview-scoring model this cycle. Confirm the DPIA reflects the current version.' },
] as const

type ApprovalKey = (typeof APPROVALS)[number]['key']

export function RecertificationExampleDetail({ record }: { record: ProcessingActivity }) {
  const { updateActivity, logEvent } = useStore()
  const [approvalStatus, setApprovalStatus] = useState<Record<ApprovalKey, 'approved' | 'followup' | null>>({
    retention: null,
    transfers: null,
    vendor: null,
    specialcat: null,
    modelversion: null,
  })
  const [certified, setCertified] = useState(false)
  const resolved = Object.values(approvalStatus).filter(Boolean).length

  function setApproval(key: ApprovalKey, status: 'approved' | 'followup') {
    const next = approvalStatus[key] === status ? null : status
    setApprovalStatus((current) => ({ ...current, [key]: next }))
    if (next) {
      logEvent({ actor: 'You', action: next === 'approved' ? 'field_accepted' : 'field_edited', recordId: record.id, recordName: record.name, detail: `${next === 'approved' ? 'Approved' : 'Flagged for follow-up'}: ${APPROVALS.find((item) => item.key === key)?.title}` })
    }
  }

  function recertify() {
    if (resolved !== APPROVALS.length) return
    setCertified(true)
    updateActivity(record.id, { status: 'active', lastReviewedAt: new Date().toISOString(), nextReviewAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString() })
    logEvent({ actor: 'You', action: 'record_updated', recordId: record.id, recordName: record.name, detail: 'Recertified the full record for the next 12-month cycle' })
  }

  return (
    <>
      <PageHeader
        title={record.name}
        description={record.purpose}
        actions={<Button size="sm" className="gap-1.5" disabled={certified || resolved !== APPROVALS.length} onClick={recertify}><ClipboardCheck className="size-4" /> {certified ? 'Recertified' : resolved === APPROVALS.length ? 'Approve & recertify' : `Resolve ${APPROVALS.length - resolved} items`}</Button>}
      />
      <div className="flex flex-col gap-5 p-6">
        <Card className={certified ? 'border-primary/40 bg-primary/5' : 'border-destructive/40 bg-destructive/5'}>
          <CardContent className="flex flex-wrap items-center justify-between gap-4 p-5">
            <div className="flex items-start gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-full border-2 border-destructive text-destructive">{certified ? <Check className="size-5 text-primary" /> : <span className="font-semibold">!</span>}</div>
              <div>
                <h2 className={`font-semibold ${certified ? 'text-primary' : 'text-destructive'}`}>{certified ? 'Recertified' : 'Recertification overdue'}</h2>
                <p className="max-w-2xl text-sm text-muted-foreground">{certified ? 'Rebecca Nordstrum recertified this record. Next review is due in 12 months.' : <>This record has been active for <b>12 months</b>. Article 30 requires a review and re-approval before it can stay active. <b>{APPROVALS.length - resolved} items need your decision.</b></>}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="flex flex-col gap-5">
            <Card>
              <CardHeader><CardTitle>Article 30 attributes</CardTitle></CardHeader>
              <CardContent className="divide-y divide-border">
                <Field label="Description" value={record.description} />
                <Field label="Purpose of processing" value={record.purpose} />
                <Field label="Legal basis (Art. 6)" value={record.legalBasis} />
                <Field label="Data subject categories" value={record.dataSubjectCategories.join(', ')} />
                <Field label="Retention period" value={record.retentionPeriod} flagged={!certified} />
                <Field label="Recipients" value={record.recipients} />
                <Field label="International transfers" value={record.internationalTransfers} flagged={!certified} />
                <Field label="Security measures" value={record.securityMeasures} />
                <Field label="Managing organization" value={record.managingOrganization} />
                <Field label="Jurisdiction" value={record.jurisdiction} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Vendors, systems & personal data</CardTitle></CardHeader>
              <CardContent className="flex flex-col gap-4">
                <ChipRow label="Vendors & processors" values={record.relationships.filter((item) => item.type === 'vendor').map((item) => item.name)} flagged={!certified} />
                <ChipRow label="Systems & assets" values={record.relationships.filter((item) => item.type === 'asset').map((item) => item.name)} />
                <ChipRow label="Personal data categories" values={record.relationships.filter((item) => item.type === 'personal_data').map((item) => item.name)} flagged={!certified} />
              </CardContent>
            </Card>
          </div>

          <div className="flex flex-col gap-5">
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><ClipboardCheck className="size-4 text-primary" /> Your approval queue</CardTitle><p className="text-sm text-muted-foreground">Decisions needed before this record can be recertified.</p></CardHeader>
              <CardContent className="flex flex-col gap-3">
                <div className="flex items-center gap-3 rounded-lg bg-muted/50 p-3"><div className="text-2xl font-semibold text-primary">{resolved}/{APPROVALS.length}</div><span className="text-sm text-muted-foreground">Resolve every item to unlock recertification.</span></div>
                {APPROVALS.map((item) => (
                  <div key={item.key} className="border-t border-border pt-3 first:border-t-0 first:pt-0">
                    <div className="mb-1 text-sm font-medium">{item.title}</div>
                    <p className="mb-2 text-xs leading-relaxed text-muted-foreground">{item.detail}</p>
                    <div className="flex gap-2"><Button size="sm" variant={approvalStatus[item.key] === 'approved' ? 'default' : 'outline'} className="flex-1 gap-1.5" onClick={() => setApproval(item.key, 'approved')}><Check className="size-3.5" /> {approvalStatus[item.key] === 'approved' ? 'Approved' : 'Approve'}</Button><Button size="sm" variant={approvalStatus[item.key] === 'followup' ? 'secondary' : 'ghost'} className="gap-1.5 text-muted-foreground" onClick={() => setApproval(item.key, 'followup')}><X className="size-3.5" /> {approvalStatus[item.key] === 'followup' ? 'Follow-up flagged' : 'Follow up'}</Button></div>
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card><CardHeader><CardTitle className="flex items-center gap-2"><CalendarClock className="size-4 text-primary" /> Governance</CardTitle></CardHeader><CardContent className="flex flex-col gap-3 text-sm"><Row label="Review cadence">12 months</Row><Row label="Last reviewed">{formatDate(certified ? new Date().toISOString() : record.lastReviewedAt)}</Row><Row label="Next review">{formatDate(certified ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString() : record.nextReviewAt)}</Row><Row label="Status"><Badge variant={certified ? 'default' : 'destructive'}>{certified ? 'Certified' : 'Overdue'}</Badge></Row></CardContent></Card>
            <Card><CardHeader><CardTitle className="flex items-center gap-2"><FileText className="size-4 text-primary" /> Source documents</CardTitle></CardHeader><CardContent className="flex flex-col gap-2">{record.sourceDocuments.map((doc) => <div key={doc.id} className="flex items-start gap-2 rounded-lg border border-border bg-card p-2.5"><FileText className="mt-0.5 size-4 shrink-0 text-muted-foreground" /><div className="min-w-0"><div className="truncate text-sm font-medium">{doc.name}</div><div className="text-xs text-muted-foreground">{doc.kind} · {formatDate(doc.addedAt)}</div></div></div>)}</CardContent></Card>
          </div>
        </div>
      </div>
    </>
  )
}

function Field({ label, value, flagged }: { label: string; value: string; flagged?: boolean }) {
  return <div className="py-3 first:pt-0 last:pb-0"><div className="mb-1 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}{flagged && <Badge variant="outline" className="border-amber-300 bg-amber-50 text-[10px] text-amber-700">Needs approval</Badge>}</div><p className="text-sm text-foreground">{value}</p></div>
}

function ChipRow({ label, values, flagged }: { label: string; values: string[]; flagged?: boolean }) {
  return <div><div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}{flagged && <Sparkles className="size-3 text-ai" />}</div><div className="flex flex-wrap gap-2">{values.map((value) => <Badge key={value} variant="secondary">{value}</Badge>)}</div></div>
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="flex items-center justify-between gap-2"><span className="text-muted-foreground">{label}</span><span className="font-medium text-foreground">{children}</span></div>
}
