import { SprintConfig } from './config'

export interface SprintRange {
  index: number
  start: Date
  end: Date
  label: string
}

const MS_PER_DAY = 24 * 60 * 60 * 1000

function parseStart(config: SprintConfig): Date {
  return new Date(config.startDate)
}

function formatLabel(start: Date, end: Date): string {
  const last = new Date(end.getTime() - 1)
  const fmt = (d: Date) => `${d.getMonth() + 1}/${d.getDate()}`
  return `${fmt(start)}–${fmt(last)}`
}

function absoluteCurrentIndex(config: SprintConfig, now: Date): number {
  const start = parseStart(config)
  const diffMs = now.getTime() - start.getTime()
  return Math.floor(diffMs / (config.lengthDays * MS_PER_DAY))
}

function buildRange(config: SprintConfig, absIdx: number, relIdx: number): SprintRange {
  const start = parseStart(config)
  const s = new Date(start)
  s.setDate(s.getDate() + absIdx * config.lengthDays)
  const e = new Date(s)
  e.setDate(e.getDate() + config.lengthDays)
  return {
    index: relIdx,
    start: s,
    end: e,
    label: formatLabel(s, e),
  }
}

export function currentSprintRange(config: SprintConfig, now: Date): SprintRange {
  const abs = absoluteCurrentIndex(config, now)
  return buildRange(config, abs, 0)
}

export function previousSprintRange(config: SprintConfig, now: Date): SprintRange {
  const abs = absoluteCurrentIndex(config, now)
  return buildRange(config, abs - 1, -1)
}

export function rangeFor(config: SprintConfig, relIdx: number, now: Date): SprintRange {
  const abs = absoluteCurrentIndex(config, now)
  return buildRange(config, abs + relIdx, relIdx)
}

export function alignStartDateToToday(anchorDateTime: string, lengthDays: number, now: Date): string {
  const anchor = new Date(anchorDateTime)
  const diffMs = now.getTime() - anchor.getTime()
  const cycles = Math.floor(diffMs / (lengthDays * MS_PER_DAY))
  const aligned = new Date(anchor)
  aligned.setDate(aligned.getDate() + cycles * lengthDays)
  const y = aligned.getFullYear()
  const m = String(aligned.getMonth() + 1).padStart(2, '0')
  const d = String(aligned.getDate()).padStart(2, '0')
  const hh = String(aligned.getHours()).padStart(2, '0')
  const mm = String(aligned.getMinutes()).padStart(2, '0')
  return `${y}-${m}-${d}T${hh}:${mm}`
}

export function listSprints(config: SprintConfig, dataFrom: Date, dataTo: Date): SprintRange[] {
  const currAbs = absoluteCurrentIndex(config, dataTo)
  const start = parseStart(config)
  const earliestAbs = Math.floor((dataFrom.getTime() - start.getTime()) / (config.lengthDays * MS_PER_DAY))
  const ranges: SprintRange[] = []
  for (let abs = earliestAbs; abs <= currAbs; abs += 1) {
    const rel = abs - currAbs
    const r = buildRange(config, abs, rel)
    const outOfRange = r.end.getTime() <= dataFrom.getTime() || r.start.getTime() > dataTo.getTime()
    if (!outOfRange) {
      ranges.push(r)
    }
  }
  return ranges
}
