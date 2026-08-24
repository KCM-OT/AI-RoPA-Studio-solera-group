import type { ProcessingActivity } from './types'

const STOP = new Set([
  'the', 'a', 'an', 'and', 'or', 'of', 'to', 'for', 'in', 'on', 'with', 'by',
  'data', 'processing', 'activity', 'personal', 'customer', 'customers', 'new',
  'process', 'management', 'service', 'services', 'user', 'users',
])

function tokens(s: string): Set<string> {
  return new Set(
    s
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((t) => t.length > 2 && !STOP.has(t)),
  )
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0
  let inter = 0
  for (const t of a) if (b.has(t)) inter++
  const union = a.size + b.size - inter
  return inter / union
}

export interface DuplicateMatch {
  record: ProcessingActivity
  score: number
}

// Find the most similar existing record based on name + purpose keywords.
export function findDuplicate(
  candidateText: string,
  activities: ProcessingActivity[],
): DuplicateMatch | null {
  const cand = tokens(candidateText)
  let best: DuplicateMatch | null = null
  for (const record of activities) {
    const rec = tokens(`${record.name} ${record.purpose} ${record.description}`)
    const score = jaccard(cand, rec)
    if (!best || score > best.score) best = { record, score }
  }
  if (best && best.score >= 0.16) return best
  return null
}
