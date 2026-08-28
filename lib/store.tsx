'use client'

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  ASSETS,
  DEFAULT_POSTURE,
  PERSONAL_DATA_CATEGORIES,
  SEED_ACTIVITIES,
  SEED_LOG,
  SEED_SUBMISSIONS,
  VENDORS,
} from './seed'
import { applySubmission } from './recert'
import type {
  ActivityLogEntry,
  Asset,
  ChangeSubmission,
  FollowUpQuestion,
  LogAction,
  PersonalDataCategory,
  PostureConfig,
  ProcessingActivity,
  Vendor,
} from './types'

interface StoreValue {
  activities: ProcessingActivity[]
  vendors: Vendor[]
  assets: Asset[]
  personalDataCategories: PersonalDataCategory[]
  log: ActivityLogEntry[]
  posture: PostureConfig
  submissions: ChangeSubmission[]
  getActivity: (id: string) => ProcessingActivity | undefined
  addActivity: (pa: ProcessingActivity) => void
  updateActivity: (id: string, patch: Partial<ProcessingActivity>) => void
  logEvent: (entry: Omit<ActivityLogEntry, 'id' | 'timestamp'>) => void
  updatePosture: (patch: Partial<PostureConfig>) => void
  resetPosture: () => void
  // Recertification workflow
  getSubmission: (id: string) => ChangeSubmission | undefined
  addSubmission: (s: ChangeSubmission) => void
  updateSubmission: (id: string, patch: Partial<ChangeSubmission>) => void
  addFollowUp: (submissionId: string, followUp: FollowUpQuestion) => void
  updateFollowUp: (
    submissionId: string,
    followUpId: string,
    patch: Partial<FollowUpQuestion>,
  ) => void
  commitSubmission: (id: string) => void
}

const StoreContext = createContext<StoreValue | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  const [activities, setActivities] = useState<ProcessingActivity[]>(SEED_ACTIVITIES)
  const [log, setLog] = useState<ActivityLogEntry[]>(SEED_LOG)
  const [posture, setPosture] = useState<PostureConfig>(DEFAULT_POSTURE)
  const [submissions, setSubmissions] = useState<ChangeSubmission[]>(SEED_SUBMISSIONS)

  const getActivity = useCallback(
    (id: string) => activities.find((a) => a.id === id),
    [activities],
  )

  const addActivity = useCallback((pa: ProcessingActivity) => {
    setActivities((prev) => [pa, ...prev])
  }, [])

  const updateActivity = useCallback((id: string, patch: Partial<ProcessingActivity>) => {
    setActivities((prev) =>
      prev.map((a) =>
        a.id === id ? { ...a, ...patch, updatedAt: new Date().toISOString() } : a,
      ),
    )
  }, [])

  const updatePosture = useCallback((patch: Partial<PostureConfig>) => {
    setPosture((prev) => ({ ...prev, ...patch }))
  }, [])

  const resetPosture = useCallback(() => {
    setPosture(DEFAULT_POSTURE)
  }, [])

  const logEvent = useCallback(
    (entry: Omit<ActivityLogEntry, 'id' | 'timestamp'>) => {
      setLog((prev) => [
        {
          ...entry,
          id: `log-${Math.random().toString(36).slice(2, 9)}`,
          timestamp: new Date().toISOString(),
        },
        ...prev,
      ])
    },
    [],
  )

  const getSubmission = useCallback(
    (id: string) => submissions.find((s) => s.id === id),
    [submissions],
  )

  const addSubmission = useCallback(
    (s: ChangeSubmission) => {
      setSubmissions((prev) => [s, ...prev])
      logEvent({
        actor: 'You',
        action: 'review_scheduled',
        recordId: s.recordId,
        recordName: s.recordName,
        detail:
          s.decision === 'approved_as_is'
            ? `${s.submittedBy} recertified the record as accurate — submitted for analyst review.`
            : `${s.submittedBy} submitted ${
                s.fieldChanges.length + s.relationshipChanges.length
              } change(s) for analyst review.`,
      })
    },
    [logEvent],
  )

  const updateSubmission = useCallback(
    (id: string, patch: Partial<ChangeSubmission>) => {
      setSubmissions((prev) =>
        prev.map((s) => (s.id === id ? { ...s, ...patch } : s)),
      )
    },
    [],
  )

  const addFollowUp = useCallback(
    (submissionId: string, followUp: FollowUpQuestion) => {
      setSubmissions((prev) =>
        prev.map((s) =>
          s.id === submissionId
            ? { ...s, followUps: [...s.followUps, followUp] }
            : s,
        ),
      )
    },
    [],
  )

  const updateFollowUp = useCallback(
    (
      submissionId: string,
      followUpId: string,
      patch: Partial<FollowUpQuestion>,
    ) => {
      setSubmissions((prev) =>
        prev.map((s) =>
          s.id === submissionId
            ? {
                ...s,
                followUps: s.followUps.map((f) =>
                  f.id === followUpId ? { ...f, ...patch } : f,
                ),
              }
            : s,
        ),
      )
    },
    [],
  )

  const commitSubmission = useCallback(
    (id: string) => {
      const submission = submissions.find((s) => s.id === id)
      if (!submission) return
      const record = activities.find((a) => a.id === submission.recordId)
      if (!record) return

      const patch = applySubmission(record, submission)
      setActivities((prev) =>
        prev.map((a) =>
          a.id === record.id
            ? { ...a, ...patch, updatedWithAI: true, updatedAt: new Date().toISOString() }
            : a,
        ),
      )
      setSubmissions((prev) =>
        prev.map((s) => (s.id === id ? { ...s, status: 'committed' } : s)),
      )
      logEvent({
        actor: 'You',
        action: 'review_completed',
        recordId: record.id,
        recordName: record.name,
        detail:
          submission.decision === 'approved_as_is'
            ? `Recertification by ${submission.submittedBy} approved and committed to the register.`
            : `Committed ${
                submission.fieldChanges.length + submission.relationshipChanges.length
              } recertification change(s) from ${submission.submittedBy} to the register.`,
      })
    },
    [submissions, activities, logEvent],
  )

  const value = useMemo<StoreValue>(
    () => ({
      activities,
      vendors: VENDORS,
      assets: ASSETS,
      personalDataCategories: PERSONAL_DATA_CATEGORIES,
      log,
      posture,
      submissions,
      getActivity,
      addActivity,
      updateActivity,
      logEvent,
      updatePosture,
      resetPosture,
      getSubmission,
      addSubmission,
      updateSubmission,
      addFollowUp,
      updateFollowUp,
      commitSubmission,
    }),
    [
      activities,
      log,
      posture,
      submissions,
      getActivity,
      addActivity,
      updateActivity,
      logEvent,
      updatePosture,
      resetPosture,
      getSubmission,
      addSubmission,
      updateSubmission,
      addFollowUp,
      updateFollowUp,
      commitSubmission,
    ],
  )

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useStore() {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore must be used within StoreProvider')
  return ctx
}

export type { LogAction }
