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
  VENDORS,
} from './seed'
import type {
  ActivityLogEntry,
  Asset,
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
  getActivity: (id: string) => ProcessingActivity | undefined
  addActivity: (pa: ProcessingActivity) => void
  updateActivity: (id: string, patch: Partial<ProcessingActivity>) => void
  logEvent: (entry: Omit<ActivityLogEntry, 'id' | 'timestamp'>) => void
  updatePosture: (patch: Partial<PostureConfig>) => void
  resetPosture: () => void
}

const StoreContext = createContext<StoreValue | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  const [activities, setActivities] = useState<ProcessingActivity[]>(SEED_ACTIVITIES)
  const [log, setLog] = useState<ActivityLogEntry[]>(SEED_LOG)
  const [posture, setPosture] = useState<PostureConfig>(DEFAULT_POSTURE)

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

  const value = useMemo<StoreValue>(
    () => ({
      activities,
      vendors: VENDORS,
      assets: ASSETS,
      personalDataCategories: PERSONAL_DATA_CATEGORIES,
      log,
      posture,
      getActivity,
      addActivity,
      updateActivity,
      logEvent,
      updatePosture,
      resetPosture,
    }),
    [
      activities,
      log,
      posture,
      getActivity,
      addActivity,
      updateActivity,
      logEvent,
      updatePosture,
      resetPosture,
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
