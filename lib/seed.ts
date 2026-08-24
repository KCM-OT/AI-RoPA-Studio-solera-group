import type {
  ActivityLogEntry,
  Asset,
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
  { id: 'ven-zendesk', name: 'Zendesk', category: 'Customer Support', location: 'United States', dpaStatus: 'Signed' },
  { id: 'ven-mailchimp', name: 'Mailchimp', category: 'Marketing Automation', location: 'United States', dpaStatus: 'Signed' },
  { id: 'ven-workday', name: 'Workday', category: 'HR / Payroll', location: 'United States', dpaStatus: 'Signed' },
  { id: 'ven-stripe', name: 'Stripe', category: 'Payments', location: 'United States', dpaStatus: 'Signed' },
  { id: 'ven-aws', name: 'Amazon Web Services', category: 'Cloud Infrastructure', location: 'Global', dpaStatus: 'Signed' },
  { id: 'ven-salesforce', name: 'Salesforce', category: 'CRM', location: 'United States', dpaStatus: 'Signed' },
  { id: 'ven-okta', name: 'Okta', category: 'Identity', location: 'United States', dpaStatus: 'Signed' },
  { id: 'ven-snowflake', name: 'Snowflake', category: 'Data Warehouse', location: 'United States', dpaStatus: 'Pending' },
  { id: 'ven-twilio', name: 'Twilio', category: 'Communications', location: 'United States', dpaStatus: 'Signed' },
  { id: 'ven-hubspot', name: 'HubSpot', category: 'Marketing / CRM', location: 'United States', dpaStatus: 'Signed' },
]

export const ASSETS: Asset[] = [
  { id: 'ast-support', name: 'Support Portal', type: 'Application', hostingRegion: 'EU (Frankfurt)' },
  { id: 'ast-crm', name: 'Marketing CRM', type: 'Application', hostingRegion: 'US (Virginia)' },
  { id: 'ast-hris', name: 'HRIS', type: 'System', hostingRegion: 'US (Virginia)' },
  { id: 'ast-warehouse', name: 'Data Warehouse', type: 'Data store', hostingRegion: 'EU (Frankfurt)' },
  { id: 'ast-payment', name: 'Payment Gateway', type: 'System', hostingRegion: 'US (Virginia)' },
  { id: 'ast-idp', name: 'Identity Provider', type: 'System', hostingRegion: 'Global' },
  { id: 'ast-web', name: 'Corporate Website', type: 'Application', hostingRegion: 'Global (CDN)' },
  { id: 'ast-mobile', name: 'Mobile App', type: 'Application', hostingRegion: 'Global' },
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
  { id: 'pdc-employment', name: 'Employment records', sensitivity: 'standard' },
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
    id: 'pa-support',
    name: 'Customer Support Ticketing',
    description:
      'Handling inbound customer support requests across email, chat, and phone, including tracking and resolution of tickets.',
    status: 'active',
    purpose: 'Provide customer support and resolve product issues',
    legalBasis: 'Contract',
    managingOrganization: 'Global Customer Success',
    businessProcessOwner: 'Dana Ortiz',
    dataSubjectCategories: ['Customers', 'Prospective customers'],
    retentionPeriod: '24 months after ticket closure',
    recipients: 'Support team, Engineering (escalations)',
    internationalTransfers: 'US — SCCs in place',
    securityMeasures: 'Encryption at rest and in transit, RBAC, SSO',
    jurisdiction: 'Global',
    fieldMeta: {},
    relationships: [
      { id: 'r1', type: 'vendor', name: 'Zendesk', inventoryId: 'ven-zendesk', provenance: 'manual', status: 'accepted' },
      { id: 'r2', type: 'asset', name: 'Support Portal', inventoryId: 'ast-support', provenance: 'manual', status: 'accepted' },
      pdcRel('pdc-name', 'Name'),
      pdcRel('pdc-email', 'Email address'),
      pdcRel('pdc-phone', 'Phone number'),
    ],
    sourceDocuments: [],
    createdWithAI: false,
    updatedWithAI: false,
    reviewCadenceDays: 365,
    lastReviewedAt: iso(-120),
    nextReviewAt: iso(245),
    parentId: null,
    createdAt: iso(-400),
    updatedAt: iso(-120),
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
    recordId: 'pa-onboarding-de',
    recordName: 'Customer Onboarding — Germany',
    detail: 'Created local variation of "Customer Onboarding (Global)" with 1 approved override (retention period).',
  },
  {
    id: 'log-2',
    timestamp: iso(-45),
    actor: 'You',
    action: 'field_edited',
    recordId: 'pa-onboarding-de',
    recordName: 'Customer Onboarding — Germany',
    detail: 'Edited retention period override before commit.',
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
    id: 'doc-mobile',
    title: 'Mobile App Push Notifications — Project Brief',
    kind: 'Project brief',
    text: `PROJECT BRIEF — Push Notification Service for Mobile App

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
