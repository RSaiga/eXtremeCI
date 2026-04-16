export type DoraLevel = 'elite' | 'high' | 'medium' | 'low'

export interface DoraMetrics {
  deployFrequency: {
    value: number // PR/日
    level: DoraLevel
  }
  leadTime: {
    medianHours: number
    p75Hours: number
    p90Hours: number
    level: DoraLevel
  }
  changeFailureRate: {
    value: number // 0-1
    hotfixCount: number
    bugfixCount: number
    totalMerged: number
    level: DoraLevel
    failurePrs: Array<{ number: number; title: string; author: string; prType: string }>
  }
  mttr: {
    medianHours: number
    level: DoraLevel
  }
  overallLevel: DoraLevel
}

export interface DoraSprintPoint {
  label: string
  deployFreq: number
  leadTimeMedian: number
  cfr: number
  mttrMedian: number
}

export const DORA_LEVEL_LABEL: Record<DoraLevel, string> = {
  elite: 'Elite',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
}

export const DORA_LEVEL_COLOR: Record<DoraLevel, string> = {
  elite: '#2e7d32',
  high: '#1976d2',
  medium: '#ed6c02',
  low: '#d32f2f',
}

export function getDeployFreqLevel(perDay: number): DoraLevel {
  if (perDay >= 1) return 'elite'
  if (perDay >= 0.14) return 'high'
  if (perDay >= 0.03) return 'medium'
  return 'low'
}

export function getLeadTimeLevel(medianHours: number): DoraLevel {
  if (medianHours < 1) return 'elite'
  if (medianHours < 24) return 'high'
  if (medianHours < 168) return 'medium'
  return 'low'
}

export function getCfrLevel(cfr: number): DoraLevel {
  if (cfr < 0.05) return 'elite'
  if (cfr < 0.15) return 'high'
  if (cfr < 0.3) return 'medium'
  return 'low'
}

export function getMttrLevel(medianHours: number): DoraLevel {
  if (medianHours < 1) return 'elite'
  if (medianHours < 24) return 'high'
  if (medianHours < 168) return 'medium'
  return 'low'
}

const LEVEL_ORDER: DoraLevel[] = ['elite', 'high', 'medium', 'low']

export function getOverallLevel(...levels: DoraLevel[]): DoraLevel {
  let worst = 0
  for (const l of levels) {
    const idx = LEVEL_ORDER.indexOf(l)
    if (idx > worst) worst = idx
  }
  return LEVEL_ORDER[worst]
}
