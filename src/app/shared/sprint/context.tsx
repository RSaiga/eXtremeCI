import React, { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { loadSprintConfig, saveSprintConfig, SprintConfig } from './config'
import { rangeFor, SprintRange, listSprints } from './calc'

interface SprintContextValue {
  config: SprintConfig
  setConfig: (c: SprintConfig) => void
  current: SprintRange
  previous: SprintRange
  all: SprintRange[]
  now: Date
  offset: number
  setOffset: (o: number) => void
}

const SprintContext = createContext<SprintContextValue | null>(null)

const DATA_WINDOW_DAYS = 90

export const SprintProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [config, setConfigState] = useState<SprintConfig>(() => loadSprintConfig())
  const [offset, setOffset] = useState<number>(0)

  const setConfig = useCallback((c: SprintConfig) => {
    setConfigState(c)
    saveSprintConfig(c)
    setOffset(0)
  }, [])

  const value = useMemo<SprintContextValue>(() => {
    const now = new Date()
    const dataFrom = new Date(now.getTime() - DATA_WINDOW_DAYS * 24 * 60 * 60 * 1000)
    return {
      config,
      setConfig,
      current: rangeFor(config, offset, now),
      previous: rangeFor(config, offset - 1, now),
      all: listSprints(config, dataFrom, now),
      now,
      offset,
      setOffset,
    }
  }, [config, setConfig, offset])

  return <SprintContext.Provider value={value}>{children}</SprintContext.Provider>
}

export function useSprint(): SprintContextValue {
  const ctx = useContext(SprintContext)
  if (!ctx) throw new Error('useSprint must be used within <SprintProvider>')
  return ctx
}
