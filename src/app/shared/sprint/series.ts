import { SprintRange } from './calc'

export interface SprintPoint<V> {
  label: string
  index: number
  value: V
  count: number
}

export function buildSprintSeries<T, V>(
  items: T[],
  getDate: (t: T) => Date,
  sprints: SprintRange[],
  reducer: (bucket: T[]) => V,
): SprintPoint<V>[] {
  return sprints.map((sp) => {
    const bucket = items.filter((it) => {
      const d = getDate(it)
      if (Number.isNaN(d.getTime())) return false
      const t = d.getTime()
      return t >= sp.start.getTime() && t < sp.end.getTime()
    })
    return {
      label: sp.label,
      index: sp.index,
      value: reducer(bucket),
      count: bucket.length,
    }
  })
}

export function median(xs: number[]): number {
  if (xs.length === 0) return 0
  const s = [...xs].sort((a, b) => a - b)
  const h = Math.floor(s.length / 2)
  return s.length % 2 ? s[h] : (s[h - 1] + s[h]) / 2
}

export function percentile(xs: number[], p: number): number {
  if (xs.length === 0) return 0
  const s = [...xs].sort((a, b) => a - b)
  const i = Math.max(0, Math.ceil((p / 100) * s.length) - 1)
  return s[i]
}
