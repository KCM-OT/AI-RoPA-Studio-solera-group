import type {
  ActivityLogEntry,
  Asset,
  ChangeSubmission,
  PersonalDataCategory,
  PostureConfig,
  ProcessingActivity,
  Vendor,
} from './types'

function iso(daysFromNow: number): string {
  const d = new Date()
  d.setDate(d.getDate() + daysFromNow)
  return d.toISOString()
}

export const VENDORS: Vendor[] = [
  { id: 'ven-talentsprint', name: 'TalentSprint AI', category: 'AI candidate screening', location: 'United States', dpaStatus: 'Pending' },
  { id: 'ven-greenhouse', name: 'Greenhouse', category: 'Applicant Tracking System', location: 'United States', dpaStatus: 'Signed' },
  { id: 'ven-checkr', name: 'Checkr', category: 'Background checks', location: 'United States', dpaStatus: 'Signed' },
  { id: 'ven-aws', name: 'Amazon Web Services', category: 'Cloud Infrastructure', location: 'Global', dpaStatus: 'Signed' },
  { id: 'ven-zoom', name: 'Zoom', category: 'Video interviews', location: 'United States', dpaStatus: 'Pending' },
  { id: 'ven-workday', name: 'Workday', category: 'HR / Payroll', location: 'United States', dpaStatus: 'Signed' },
  { id: 'ven-salesforce', name: 'Salesforce', category: 'CRM', location: 'United States', dpaStatus: 'Signed' },
  { id: 'ven-okta', name: 'Okta', category: 'Identity', location: 'United States', dpaStatus: 'Signed' },
]

export const ASSETS: Asset[] = [
  { id: 'ast-ats', name: 'Candidate ATS', type: 'Application', hostingRegion: 'US (Virginia)' },
  { id: 'ast-video', name: 'Recorded Interview Workspace', type: 'Application', hostingRegion: 'US (Oregon)' },
  { id: 'ast-screening', name: 'TalentSprint Screening Console', type: 'Application', hostingRegion: 'US (Virginia)' },
  { id: 'ast-hris', name: 'HRIS', type: 'System', hostingRegion: 'US (Virginia)' },
  { id: 'ast-background', name: 'Background Check Repository', type: 'Data store', hostingRegion: 'EU (Frankfurt)' },
  { id: 'ast-idp', name: 'Identity Provider', type: 'System', hostingRegion: 'Global' },
  { id: 'ast-warehouse', name: 'People Analytics Warehouse', type: 'Data store', hostingRegion: 'US (Virginia)' },
]

export const PERSONAL_DATA_CATEGORIES: PersonalDataCategory[] = [
  { id: 'pdc-name', name: 'Name', sensitivity: 'standard' },
  { id: 'pdc-email', name: 'Email address', sensitivity: 'standard' },
  { id: 'pdc-phone', name: 'Phone number', sensitivity: 'standard' },
  { id: 'pdc-address', name: 'Postal address', sensitivity: 'standard' },
  { id: 'pdc-ip', name: 'IP address', sensitivity: 'standard' },
  { id: 'pdc-location', name: 'Location data', sensitivity: 'standard' },
  { id: 'pdc-device', name: 'Device identifiers', sensitivity: 'standard' },
  { id: 'pdc-payment', name: 'Payment card data', sensitivity: 'standard' },
  { id: 'pdc-govid', name: 'Government ID number', sensitivity: 'standard' },
  { id: 'pdc-employment', name: 'Employment history', sensitivity: 'standard' },
  { id: 'pdc-education', name: 'Education and qualifications', sensitivity: 'standard' },
  { id: 'pdc-interview', name: 'Interview recordings', sensitivity: 'standard' },
  { id: 'pdc-inferred', name: 'Inferred candidate scores', sensitivity: 'standard' },
  { id: 'pdc-financial', name: 'Financial account data', sensitivity: 'standard' },
  { id: 'pdc-health', name: 'Health data', sensitivity: 'special' },
  { id: 'pdc-biometric', name: 'Biometric data', sensitivity: 'special' },
  { id: 'pdc-ethnicity', name: 'Racial or ethnic origin', sensitivity: 'special' },
]

function pdcRel(id: string, name: string): {
  id: string
  type: 'personalData'
  name: string
  inventoryId: string
  provenance: 'manual'
  status: 'accepted'
} {
  return { id: `rel-${id}-${Math.random().toString(36).slice(2, 7)}`, type: 'personalData', name, inventoryId: id, provenance: 'manual', status: 'accepted' }
}

export const SEED_ACTIVITIES: ProcessingActivity[] = [
  {
    id: 'pa-recruitment',
    name: 'AI-Assisted Candidate Screening & Recruitment',
    description:
      'Sourcing, screening, interviewing, and hiring candidates for open roles across Solera Group. TalentSprint AI ranks resumes and scores recorded interviews, with every recommendation reviewed by Talent Acquisition before a decision.',
    status: 'under_review',
    purpose: 'Support fair, consistent recruitment and make significant employment decisions with human oversight',
    legalBasis: 'Legitimate interests',
    managingOrganization: 'Global Talent Acquisition',
    businessProcessOwner: 'Elena Marín',
    dataSubjectCategories: ['Job applicants', 'Candidates', 'Employees'],
    retentionPeriod: '12 months after requisition closure; retain hired-candidate records in HRIS',
    recipients: 'Talent Acquisition, hiring managers, HR Compliance',
    internationalTransfers: 'US and Singapore processing for global candidates; SCCs and transfer assessment required',
    securityMeasures: 'Encryption at rest and in transit, role-based access, audit logging, reviewer approval controls',
    jurisdiction: 'United States, Germany, France, Brazil, Singapore, United Kingdom',
    fieldMeta: {
      description: { provenance: 'ai', confidence: 0.96, evidence: 'AI vendor to screen resumes and rank candidates' },
      purpose: { provenance: 'ai', confidence: 0.91, evidence: 'sourcing, screening, and hiring candidates' },
      legalBasis: { provenance: 'ai', confidence: 0.78, evidence: 'candidate screening and recruitment' },
    },
    relationships: [
      { id: 'r-recruit-talentsprint', type: 'vendor', name: 'TalentSprint AI', inventoryId: 'ven-talentsprint', provenance: 'ai', confidence: 0.98, status: 'accepted', note: 'Processor relationship inside the recruitment activity' },
      { id: 'r-recruit-ats', type: 'vendor', name: 'Greenhouse', inventoryId: 'ven-greenhouse', provenance: 'manual', status: 'accepted' },
      { id: 'r-recruit-checkr', type: 'vendor', name: 'Checkr', inventoryId: 'ven-checkr', provenance: 'manual', status: 'accepted' },
      { id: 'r-recruit-screening', type: 'asset', name: 'TalentSprint Screening Console', inventoryId: 'ast-screening', provenance: 'ai', confidence: 0.94, status: 'accepted' },
      { id: 'r-recruit-video', type: 'asset', name: 'Recorded Interview Workspace', inventoryId: 'ast-video', provenance: 'manual', status: 'accepted' },
      pdcRel('pdc-name', 'Name'),
      pdcRel('pdc-email', 'Email address'),
      pdcRel('pdc-phone', 'Phone number'),
      pdcRel('pdc-govid', 'Government ID number'),
      pdcRel('pdc-employment', 'Employment history'),
      pdcRel('pdc-education', 'Education and qualifications'),
      pdcRel('pdc-interview', 'Interview recordings'),
      pdcRel('pdc-inferred', 'Inferred candidate scores'),
      pdcRel('pdc-ethnicity', 'Racial or ethnic origin'),
    ],
    sourceDocuments: [
      { id: 'sd-recruit-brief', name: 'TalentSprint AI rollout brief.pdf', kind: 'Project brief', addedAt: iso(-18), excerpt: 'Resume ranking and recorded interview scoring introduced to the existing recruitment process.' },
      { id: 'sd-recruit-dpia', name: 'Candidate screening DPIA.docx', kind: 'DPIA', addedAt: iso(-10), excerpt: 'Human review, candidate notice, and challenge pathways are required before deployment.' },
      { id: 'sd-recruit-dpa', name: 'TalentSprint AI DPA.pdf', kind: 'Vendor contract', addedAt: iso(-8) },
    ],
    createdWithAI: true,
    updatedWithAI: true,
    reviewCadenceDays: 180,
    lastReviewedAt: iso(-22),
    nextReviewAt: iso(-4),
    parentId: null,
    createdAt: iso(-240),
    updatedAt: iso(-8),
  },
  {
    id: 'pa-marketing',
    name: 'Marketing Email Campaigns',
    description:
      'Sending promotional newsletters and product announcements to subscribers who have opted in, plus engagement analytics.',
    status: 'active',
    purpose: 'Direct marketing to opted-in subscribers',
    legalBasis: 'Consent',
    managingOrganization: 'Growth Marketing',
    businessProcessOwner: 'Priya Nair',
    dataSubjectCategories: ['Subscribers', 'Leads'],
    retentionPeriod: 'Until consent withdrawn',
    recipients: 'Marketing team',
    internationalTransfers: 'US — SCCs in place',
    securityMeasures: 'Encryption in transit, access controls',
    jurisdiction: 'Global',
    fieldMeta: {
      purpose: { provenance: 'ai', confidence: 0.91, evidence: 'opted-in subscribers' },
      legalBasis: { provenance: 'ai', confidence: 0.88, evidence: 'who have opted in' },
    },
    relationships: [
      { id: 'r3', type: 'vendor', name: 'Mailchimp', inventoryId: 'ven-mailchimp', provenance: 'ai', confidence: 0.93, status: 'accepted' },
      { id: 'r4', type: 'asset', name: 'Marketing CRM', inventoryId: 'ast-crm', provenance: 'ai', confidence: 0.86, status: 'accepted' },
      pdcRel('pdc-name', 'Name'),
      pdcRel('pdc-email', 'Email address'),
    ],
    sourceDocuments: [{ id: 'sd1', name: 'Q3-newsletter-brief.pdf', kind: 'Project brief', addedAt: iso(-30) }],
    createdWithAI: true,
    updatedWithAI: false,
    reviewCadenceDays: 180,
    lastReviewedAt: iso(-175),
    nextReviewAt: iso(5),
    parentId: null,
    createdAt: iso(-190),
    updatedAt: iso(-175),
  },
  {
    id: 'pa-payroll',
    name: 'Employee Payroll Processing',
    description:
      'Calculating and disbursing employee salaries, tax withholding, and benefits administration.',
    status: 'active',
    purpose: 'Administer payroll and statutory obligations',
    legalBasis: 'Legal obligation',
    managingOrganization: 'People Operations',
    businessProcessOwner: 'Marcus Lee',
    dataSubjectCategories: ['Employees'],
    retentionPeriod: '7 years (statutory)',
    recipients: 'Finance, tax authorities',
    internationalTransfers: 'None',
    securityMeasures: 'Encryption, strict RBAC, audit logging',
    jurisdiction: 'Global',
    fieldMeta: {},
    relationships: [
      { id: 'r5', type: 'vendor', name: 'Workday', inventoryId: 'ven-workday', provenance: 'manual', status: 'accepted' },
      { id: 'r6', type: 'asset', name: 'HRIS', inventoryId: 'ast-hris', provenance: 'manual', status: 'accepted' },
      pdcRel('pdc-name', 'Name'),
      pdcRel('pdc-govid', 'Government ID number'),
      pdcRel('pdc-employment', 'Employment records'),
      pdcRel('pdc-financial', 'Financial account data'),
    ],
    sourceDocuments: [],
    createdWithAI: false,
    updatedWithAI: false,
    reviewCadenceDays: 365,
    lastReviewedAt: iso(-395),
    nextReviewAt: iso(-30), // overdue -> stale
    parentId: null,
    createdAt: iso(-800),
    updatedAt: iso(-395),
  },
  {
    id: 'pa-analytics',
    name: 'Website Analytics',
    description:
      'Collecting website usage data to understand traffic patterns and improve the site experience.',
    status: 'under_review',
    purpose: 'Analyze website usage and improve UX',
    legalBasis: 'Legitimate interests',
    managingOrganization: 'Digital Experience',
    businessProcessOwner: '',
    dataSubjectCategories: ['Website visitors'],
    retentionPeriod: '14 months',
    recipients: 'Analytics team',
    internationalTransfers: 'US — SCCs in place',
    securityMeasures: 'Pseudonymization, access controls',
    jurisdiction: 'Global',
    fieldMeta: {},
    // Missing any vendor/asset relationship -> completeness gap
    relationships: [
      pdcRel('pdc-ip', 'IP address'),
      pdcRel('pdc-device', 'Device identifiers'),
    ],
    sourceDocuments: [],
    createdWithAI: false,
    updatedWithAI: false,
    reviewCadenceDays: 180,
    lastReviewedAt: iso(-200),
    nextReviewAt: iso(-20), // overdue
    parentId: null,
    createdAt: iso(-260),
    updatedAt: iso(-200),
  },
  {
    id: 'pa-payments',
    name: 'Payment Processing',
    description: 'Processing customer payments and refunds for online purchases.',
    status: 'active',
    purpose: 'Process payments for goods and services',
    legalBasis: 'Contract',
    managingOrganization: 'Finance',
    businessProcessOwner: 'Sofia Rossi',
    dataSubjectCategories: ['Customers'],
    retentionPeriod: '8 years (financial records)',
    recipients: 'Finance, payment processor',
    internationalTransfers: 'US — SCCs in place',
    securityMeasures: 'PCI-DSS, tokenization, encryption',
    jurisdiction: 'Global',
    fieldMeta: {},
    relationships: [
      { id: 'r7', type: 'vendor', name: 'Stripe', inventoryId: 'ven-stripe', provenance: 'manual', status: 'accepted' },
      { id: 'r8', type: 'asset', name: 'Payment Gateway', inventoryId: 'ast-payment', provenance: 'manual', status: 'accepted' },
      pdcRel('pdc-name', 'Name'),
      pdcRel('pdc-payment', 'Payment card data'),
      pdcRel('pdc-address', 'Postal address'),
    ],
    sourceDocuments: [],
    createdWithAI: false,
    updatedWithAI: false,
    reviewCadenceDays: 365,
    lastReviewedAt: iso(-60),
    nextReviewAt: iso(305),
    parentId: null,
    createdAt: iso(-500),
    updatedAt: iso(-60),
  },
  {
    id: 'pa-onboarding',
    name: 'Customer Onboarding (Global)',
    description:
      'Global process for onboarding new customers: account creation, identity verification, and welcome communications.',
    status: 'active',
    purpose: 'Onboard new customers and verify identity',
    legalBasis: 'Contract',
    managingOrganization: 'Global Operations',
    businessProcessOwner: 'Dana Ortiz',
    dataSubjectCategories: ['Customers'],
    retentionPeriod: 'Duration of customer relationship + 6 years',
    recipients: 'Operations, Compliance',
    internationalTransfers: 'US — SCCs in place',
    securityMeasures: 'Encryption, RBAC, SSO',
    jurisdiction: 'Global',
    fieldMeta: {},
    relationships: [
      { id: 'r9', type: 'vendor', name: 'Okta', inventoryId: 'ven-okta', provenance: 'manual', status: 'accepted' },
      { id: 'r10', type: 'asset', name: 'Identity Provider', inventoryId: 'ast-idp', provenance: 'manual', status: 'accepted' },
      pdcRel('pdc-name', 'Name'),
      pdcRel('pdc-email', 'Email address'),
      pdcRel('pdc-govid', 'Government ID number'),
    ],
    sourceDocuments: [],
    createdWithAI: false,
    updatedWithAI: false,
    reviewCadenceDays: 365,
    lastReviewedAt: iso(-90),
    nextReviewAt: iso(275),
    parentId: null,
    createdAt: iso(-600),
    updatedAt: iso(-90),
  },
  {
    id: 'pa-onboarding-de',
    name: 'Customer Onboarding — Germany',
    description:
      'Local variation of the global customer onboarding process adapted for the German market, with a local retention limit and a regional identity verification vendor.',
    status: 'active',
    purpose: 'Onboard new customers and verify identity',
    legalBasis: 'Contract',
    managingOrganization: 'DACH Operations',
    businessProcessOwner: 'Lena Fischer',
    dataSubjectCategories: ['Customers'],
    retentionPeriod: 'Duration of relationship + 3 years (local override)',
    recipients: 'DACH Operations, Compliance',
    internationalTransfers: 'None (data kept in EU)',
    securityMeasures: 'Encryption, RBAC, SSO',
    jurisdiction: 'Germany',
    fieldMeta: {
      retentionPeriod: { provenance: 'ai', confidence: 0.82, evidence: 'local retention capped at 3 years' },
    },
    relationships: [
      { id: 'r11', type: 'asset', name: 'Identity Provider', inventoryId: 'ast-idp', provenance: 'manual', status: 'accepted' },
      pdcRel('pdc-name', 'Name'),
      pdcRel('pdc-email', 'Email address'),
    ],
    sourceDocuments: [{ id: 'sd2', name: 'DE-launch-brief.pdf', kind: 'Regional brief', addedAt: iso(-45) }],
    createdWithAI: true,
    updatedWithAI: false,
    reviewCadenceDays: 365,
    lastReviewedAt: iso(-45),
    nextReviewAt: iso(320),
    parentId: 'pa-onboarding',
    createdAt: iso(-45),
    updatedAt: iso(-45),
  },
]

export const SEED_LOG: ActivityLogEntry[] = [
  {
    id: 'log-1',
    timestamp: iso(-45),
    actor: 'AI Agent',
    action: 'variation_created',
    recordId: 'pa-recruitment',
    recordName: 'AI-Assisted Candidate Screening & Recruitment',
    detail: 'Expanded recorded interview scoring in the recruitment activity and flagged the material change for recertification.',
  },
  {
    id: 'log-2',
    timestamp: iso(-45),
    actor: 'You',
    action: 'field_edited',
    recordId: 'pa-recruitment',
    recordName: 'AI-Assisted Candidate Screening & Recruitment',
    detail: 'Confirmed human review and candidate challenge controls before the TalentSprint AI rollout.',
  },
  {
    id: 'log-3',
    timestamp: iso(-190),
    actor: 'AI Agent',
    action: 'record_created',
    recordId: 'pa-marketing',
    recordName: 'Marketing Email Campaigns',
    detail: 'Drafted record from "Q3-newsletter-brief.pdf"; 6 fields proposed, 6 approved.',
  },
  {
    id: 'log-4',
    timestamp: iso(-190),
    actor: 'AI Agent',
    action: 'relationship_accepted',
    recordId: 'pa-marketing',
    recordName: 'Marketing Email Campaigns',
    detail: 'Suggested vendor "Mailchimp" (confidence 93%) — accepted.',
  },
]

// Sample source documents available in the authoring demo.
export interface SampleDoc {
  id: string
  title: string
  kind: string
  text: string
}

export const SAMPLE_DOCS: SampleDoc[] = [
  {
    id: 'doc-talentsprint-dpa',
    title: 'TalentSprint AI — Signed DPA & SOW',
    kind: 'Vendor contract',
    text: `DATA PROCESSING AGREEMENT & STATEMENT OF WORK — TalentSprint AI

Relationship: TalentSprint AI acts as a processor within Solera Group’s existing AI-Assisted Candidate Screening & Recruitment activity. TalentSprint provides automated resume screening and candidate ranking for Talent Acquisition.

Categories of personal data: Candidate name, contact information, resume and work history, education, and video interview recordings.

Retention: TalentSprint deletes candidate data within 90 days after the recruitment process ends, unless Solera instructs otherwise in writing.

Transfers: TalentSprint processes EU candidate data in US-hosted infrastructure. Standard Contractual Clauses (SCCs) apply to the transfer.

Roles: Solera is the controller and TalentSprint is the processor for resume screening and candidate ranking. TalentSprint may use aggregated resume data to improve its underlying model; for this secondary use, TalentSprint may act as an independent controller.

Owner: Elena Marín, Global Talent Acquisition. Applicant Tracking System: Greenhouse. Background checks: Checkr.`,
  },
  {
    id: 'doc-recruitment',
    title: 'AI Candidate Screening — Project Brief',
    kind: 'Project brief',
    text: `PROJECT BRIEF - AI-Assisted Candidate Screening & Recruitment

Overview: Solera Group is adding TalentSprint AI to the existing recruitment process to screen resumes and rank candidates for open roles. Recorded interview scoring is planned as a later capability and requires human review.

Data used: Candidate name, contact details, employment history, education, interview recordings, inferred scores, and limited special-category data where voluntarily provided.

Systems & vendors: Greenhouse remains the system of record. TalentSprint AI provides ranking suggestions. Recorded interviews are held in Zoom and background checks are handled by Checkr.

Governance: Talent Acquisition reviews every recommendation. Candidate notice, challenge rights, a DPIA, transfer assessment, and AI risk review are required before expanded use.

Owner: Elena Marín, Global Talent Acquisition. Data may be processed in the US, Germany, France, Brazil, Singapore, and the UK.`,
  },
  {
    id: 'doc-mobile',
    title: 'Mobile App Push Notifications - Project Brief',
    kind: 'Project brief',
    text: `PROJECT BRIEF - Push Notification Service for Mobile App

Overview: The product team is launching in-app and push notifications for our iOS and Android mobile apps to increase engagement and re-activation. Notifications include order updates, personalized product recommendations, and re-engagement campaigns for lapsed users.

Data used: We will process the customer's name, email address, device push tokens, device identifiers, approximate location (city-level), and in-app behavioral events (screens viewed, items added to cart). Recommendations are generated from purchase history.

Systems & vendors: Push delivery will be handled by Twilio. Behavioral events are streamed into our Snowflake data warehouse for analysis. The mobile app authenticates users via Okta.

Legal basis: Marketing and re-engagement notifications are sent based on user consent captured at onboarding; transactional order updates are sent under contract.

Retention: Behavioral event data is retained for 18 months. Push tokens are deleted when a user disables notifications or deletes their account.

Data sharing: Aggregated analytics are shared with the Growth Marketing team. No data is sold to third parties.

Owner: The business owner for this process is Priya Nair, Growth Marketing. Data is processed in US regions with SCCs for EU customers.`,
  },
  {
    id: 'doc-vendor',
    title: 'HR Wellness Vendor — DPA & Contract Summary',
    kind: 'Vendor contract',
    text: `DATA PROCESSING ADDENDUM SUMMARY — Employee Wellness Program

Purpose: The company is engaging "MindWell Inc." to provide a confidential employee mental health and wellness program, including counseling sessions and health assessments.

Categories of personal data: Employee name, work email, employee ID, and health data including self-reported mental health assessments and counseling session notes (special category data under Art. 9).

Data subjects: Employees who voluntarily enroll.

Processing location: MindWell hosts data on Amazon Web Services in EU (Frankfurt). No transfers outside the EEA.

Legal basis: Explicit consent of the employee. Special category condition: explicit consent (Art. 9(2)(a)).

Retention: Session notes retained for 3 years after program exit, then securely deleted.

Recipients: MindWell clinical staff only. The employer receives only aggregated, anonymized utilization statistics.

Security: End-to-end encryption, ISO 27001 certified, strict access controls limited to assigned clinicians.

Process owner: Marcus Lee, People Operations.`,
  },
  {
    id: 'doc-dup',
    title: 'Customer Ticketing Revamp — Intake Form',
    kind: 'Intake form',
    text: `INTAKE FORM — Customer Support Contact Center

We are formalizing how we handle inbound customer support across email, live chat, and phone. Agents resolve product issues and track cases to resolution.

Personal data: customer name, email address, phone number, and the content of support conversations.

Vendor: We use Zendesk for ticket management. Tickets are surfaced through our Support Portal.

Legal basis: performance of the customer contract.

Retention: ticket records kept for 24 months after closure.

Owner: Dana Ortiz, Global Customer Success. Transfers to the US are covered by SCCs.`,
  },
]

// Default privacy posture — sensible starting rules an admin can tune.
export const DEFAULT_POSTURE: PostureConfig = {
  defaultCadenceDays: 365,
  requireCertification: true,
  cadenceRules: [
    {
      id: 'cad-high',
      label: 'High-risk activities',
      enabled: true,
      logic: 'any',
      conditions: ['specialCategory', 'automatedDecisions', 'systematicMonitoring'],
      cadenceDays: 180,
    },
    {
      id: 'cad-elevated',
      label: 'Elevated (transfers / large-scale)',
      enabled: true,
      logic: 'any',
      conditions: ['internationalTransfer', 'largeScale', 'vulnerableSubjects'],
      cadenceDays: 270,
    },
  ],
  assessmentRules: [
    {
      type: 'PIA',
      enabled: true,
      logic: 'any',
      conditions: [
        'specialCategory',
        'largeScale',
        'systematicMonitoring',
        'automatedDecisions',
        'vulnerableSubjects',
      ],
      note: 'Required for high-risk processing under GDPR Art. 35.',
    },
    {
      type: 'LIA',
      enabled: true,
      logic: 'any',
      conditions: ['legitimateInterests'],
    },
    {
      type: 'TIA',
      enabled: true,
      logic: 'any',
      conditions: ['internationalTransfer'],
    },
    {
      type: 'PbD',
      enabled: true,
      logic: 'any',
      conditions: ['newActivity', 'specialCategory', 'automatedDecisions'],
    },
    {
      type: 'AIRisk',
      enabled: true,
      logic: 'any',
      conditions: ['automatedDecisions'],
    },
  ],
}

// Seeded recertification submissions awaiting Privacy Ops Analyst review.
// These populate the review queue so the human-in-the-loop step is demonstrable.
export const SEED_SUBMISSIONS: ChangeSubmission[] = [
  {
    id: 'sub-recruit-2024',
    recordId: 'pa-recruitment',
    recordName: 'AI-Assisted Candidate Screening & Recruitment',
    submittedBy: 'Elena Marín',
    submittedRole: 'Global Talent Acquisition',
    submittedAt: iso(-1),
    status: 'pending_review',
    decision: 'modified',
    ownerNote:
      'We retired Zoom for interviews and moved to HireVue for recorded video interviews. We also stopped collecting government ID at the application stage — that now only happens post-offer in HRIS. We are starting to capture candidate work authorization status.',
    fieldChanges: [
      {
        key: 'retentionPeriod',
        label: 'Retention period',
        before: '12 months after requisition closure; retain hired-candidate records in HRIS',
        after: '9 months after requisition closure; retain hired-candidate records in HRIS',
      },
    ],
    relationshipChanges: [
      { action: 'added', type: 'vendor', name: 'HireVue', inventoryId: null },
      { action: 'removed', type: 'vendor', name: 'Zoom', inventoryId: 'ven-zoom' },
      {
        action: 'added',
        type: 'personalData',
        name: 'Work authorization status',
        inventoryId: null,
      },
      {
        action: 'removed',
        type: 'personalData',
        name: 'Government ID number',
        inventoryId: 'pdc-govid',
      },
    ],
    followUps: [
      {
        id: 'fu-recruit-1',
        question:
          'Does HireVue have a signed DPA in place, and where is recorded-interview data hosted?',
        channel: 'teams',
        audience: 'vendor_owner',
        recipient: 'Procurement — Vendor Risk',
        status: 'answered',
        aiGenerated: true,
        createdAt: iso(-1),
        sentAt: iso(-1),
        answeredAt: iso(0),
        response:
          'DPA was signed on the 3rd. HireVue hosts EU candidate data in Frankfurt; US processing is covered by SCCs. AI risk review is scheduled.',
      },
      {
        id: 'fu-recruit-2',
        question:
          'You added "work authorization status" — is this collected for all candidates or only for specific roles/regions?',
        channel: 'slack',
        audience: 'business_process_owner',
        recipient: 'Elena Marín',
        status: 'sent',
        aiGenerated: true,
        createdAt: iso(0),
        sentAt: iso(0),
        answeredAt: null,
        response: null,
      },
    ],
    aiSummary: null,
  },
  {
    id: 'sub-marketing-2024',
    recordId: 'pa-marketing',
    recordName: 'Marketing Email Campaigns',
    submittedBy: 'Priya Nair',
    submittedRole: 'Growth Marketing',
    submittedAt: iso(-3),
    status: 'pending_review',
    decision: 'approved_as_is',
    ownerNote:
      'Reviewed the record — everything still reflects how we run email campaigns. No changes needed.',
    fieldChanges: [],
    relationshipChanges: [],
    followUps: [],
    aiSummary: null,
  },
]
