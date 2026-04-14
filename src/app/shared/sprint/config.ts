export interface SprintConfig {
  startDate: string
  lengthDays: number
}

const STORAGE_KEY = 'extremeci.sprintConfig'

function formatDateTime(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return `${y}-${m}-${day}T${hh}:${mm}`
}

export function defaultSprintConfig(): SprintConfig {
  const start = new Date()
  start.setDate(start.getDate() - 14)
  start.setHours(10, 0, 0, 0)
  return {
    startDate: formatDateTime(start),
    lengthDays: 14,
  }
}

function validate(c: unknown): c is SprintConfig {
  if (!c || typeof c !== 'object') return false
  const obj = c as Record<string, unknown>
  if (typeof obj.startDate !== 'string') return false
  if (typeof obj.lengthDays !== 'number') return false
  if (obj.lengthDays < 1 || obj.lengthDays > 60) return false
  if (Number.isNaN(new Date(obj.startDate).getTime())) return false
  return true
}

export function loadSprintConfig(): SprintConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return defaultSprintConfig()
    const parsed: unknown = JSON.parse(raw)
    if (!validate(parsed)) return defaultSprintConfig()
    return parsed
  } catch {
    return defaultSprintConfig()
  }
}

export function saveSprintConfig(c: SprintConfig): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(c))
  } catch {
    // ignore
  }
}
