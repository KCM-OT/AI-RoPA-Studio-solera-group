# Cartographer — AI RoPA Studio

A prototype for AI-assisted authoring and maintenance of GDPR Article 30 Records of Processing Activity (RoPA). Upload a source document (project brief, vendor contract, DPIA, intake form) and Cartographer drafts a processing activity record with field-level confidence, flags possible duplicates, and suggests vendor/asset/personal-data relationships — all subject to human approval before anything commits.

This is a prototype built to validate the **Steward** concept: repositioning an AI agent around RoPA authoring and maintenance, with human-in-the-loop approval as the trust mechanism, rather than automating privacy risk assessment.

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### The document scan

`Author with AI` → `Scan with AI` calls `/api/scan`, which behaves one of two ways:

- **No `OPENAI_API_KEY` configured (default):** the scan is simulated locally by [`lib/mock-scan.ts`](lib/mock-scan.ts) — a rule-based Article 30 extractor that parses labeled fields ("Purpose:", "Retention:", "Legal basis:", etc.) and keyword/regex heuristics, producing the same confidence-scored, evidence-linked output a live model would. No external API calls, no billing.
- **`OPENAI_API_KEY` set in `.env.local`:** the route calls `gpt-4.1-mini` directly via `@ai-sdk/openai` instead.

Try the three sample documents under "Try a sample document" — they're seeded to exercise the full range of states (high/low confidence, matched vs. unresolved relationships, special-category data, and one that triggers duplicate detection against a seeded record).

## Structure

```
app/            Next.js App Router pages (dashboard, author wizard, records, maintenance, activity log, posture rules)
components/     UI components, organized by feature area
lib/            Domain model (types.ts), seed data, and the extraction/similarity/posture rule engines
```

## Notes

- `lib/posture.ts` implements review-cadence and assessment-trigger rules (PIA/LIA/TIA/PbD/AI Risk) as a stand-in for a future integration with a separate posture/risk initiative — it's not something this prototype's product scope owns long-term.
- This is a prototype for design and usability testing, not production code.
