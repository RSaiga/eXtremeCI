import React, { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { parseRepos, RepoRef, repoKey } from './config'

const STORAGE_KEY = 'extremeci.activeRepo'
const ALL_KEY = '__all__'

interface RepoContextValue {
  repos: RepoRef[]
  activeRepo: RepoRef | null // null = All
  selectedRepos: RepoRef[] // 実際に集計対象となる repo のリスト
  setActiveRepo: (ref: RepoRef | null) => void
}

const RepoContext = createContext<RepoContextValue | null>(null)

function loadInitial(repos: RepoRef[]): RepoRef | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === ALL_KEY) return null
    if (stored) {
      const found = repos.find((r) => repoKey(r) === stored)
      if (found) return found
    }
  } catch {
    // ignore
  }
  return repos[0]
}

export const RepoProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const repos = useMemo(() => parseRepos(), [])
  const [activeRepo, setActiveRepoState] = useState<RepoRef | null>(() => loadInitial(repos))

  const setActiveRepo = useCallback((ref: RepoRef | null) => {
    setActiveRepoState(ref)
    try {
      localStorage.setItem(STORAGE_KEY, ref ? repoKey(ref) : ALL_KEY)
    } catch {
      // ignore
    }
  }, [])

  const selectedRepos = useMemo(() => (activeRepo ? [activeRepo] : repos), [activeRepo, repos])

  const value = useMemo(
    () => ({ repos, activeRepo, selectedRepos, setActiveRepo }),
    [repos, activeRepo, selectedRepos, setActiveRepo],
  )

  return <RepoContext.Provider value={value}>{children}</RepoContext.Provider>
}

export function useActiveRepo(): RepoContextValue {
  const ctx = useContext(RepoContext)
  if (!ctx) throw new Error('useActiveRepo must be used within <RepoProvider>')
  return ctx
}
