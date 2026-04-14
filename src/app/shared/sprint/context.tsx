import React, { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { loadSprintConfig, saveSprintConfig, SprintConfig } from './config'
import { currentSprintRange, previousSprintRange, SprintRange, listSprints } from './calc'

interface SprintContextValue {
  config: SprintConfig
  setConfig: (c: SprintConfig) => void
  current: SprintRange
  previous: SprintRange
  all: SprintRange[]
  now: Date
}

const SprintContext = createContext<SprintContextValue | null>(null)

const DATA_WINDOW_DAYS = 90

export const SprintProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [config, setConfigState] = useState<SprintConfig>(() => loadSprintConfig())

  const setConfig = useCallback((c: SprintConfig) => {
    setConfigState(c)
    saveSprintConfig(c)
  }, [])

  const value = useMemo<SprintContextValue>(() => {
    const now = new Date()
    const dataFrom = new Date(now.getTime() - DATA_WINDOW_DAYS * 24 * 60 * 60 * 1000)
    return {
      config,
      setConfig,
      current: currentSprintRange(config, now),
      previous: previousSprintRange(config, now),
      all: listSprints(config, dataFrom, now),
      now,
    }
  }, [config, setConfig])

  return <SprintContext.Provider value={value}>{children}</SprintContext.Provider>
}

export function useSprint(): SprintContextValue {
  const ctx = useContext(SprintContext)
  if (!ctx) throw new Error('useSprint must be used within <SprintProvider>')
  return ctx
}
