import { PrDetailData } from '../../../infra/github/pr_data'
import { ReadTimes } from '../../models/read_time/read.times'
import { SprintRange } from '../../../shared/sprint/calc'
import { isProductionMerge } from '../../../shared/pr_classification'
import { detectPrType, isHotfixPr } from '../../models/quality_sustainability/quality_sustainability'
import {
  DoraMetrics,
  DoraSprintPoint,
  getCfrLevel,
  getDeployFreqLevel,
  getLeadTimeLevel,
  getMttrLevel,
  getOverallLevel,
} from '../../models/dora/dora_metrics'

const MS_PER_HOUR = 1000 * 60 * 60
const MS_PER_DAY = MS_PER_HOUR * 24

function median(values: number[]): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

function filterMergedInRange(prs: PrDetailData[], startMs: number, endMs: number): PrDetailData[] {
  return prs.filter((pr) => {
    if (!pr.merged_at) return false
    const t = new Date(pr.merged_at).getTime()
    return t >= startMs && t < endMs
  })
}

function filterReadTimesInRange(readTimes: ReadTimes, startMs: number, endMs: number): ReadTimes {
  const filtered = readTimes.values.filter((r) => {
    const t = new Date(r.date).getTime()
    return t >= startMs && t < endMs
  })
  return new ReadTimes(filtered)
}

function calculate(closedPrs: PrDetailData[], readTimes: ReadTimes, startMs: number, endMs: number): DoraMetrics {
  const merged = filterMergedInRange(closedPrs, startMs, endMs)
  const scopedReadTimes = filterReadTimesInRange(readTimes, startMs, endMs)

  // 1. Deployment Frequency
  // 「デプロイ = 本番ブランチへのマージ（または release PR）」で数える。
  // staging への feature PR 等を1デプロイに数える過大計上を避け、実リリース頻度を反映する。
  const days = Math.max(1, (endMs - startMs) / MS_PER_DAY)
  const deployments = merged.filter((pr) => isProductionMerge(pr))
  const deployFreqValue = deployments.length / days
  const deployFreqLevel = getDeployFreqLevel(deployFreqValue)

  // 2. Lead Time for Changes
  const ltMedian = scopedReadTimes.median()
  const ltP75 = scopedReadTimes.p75
  const ltP90 = scopedReadTimes.p90
  const ltLevel = getLeadTimeLevel(ltMedian)

  // 3. Change Failure Rate
  let hotfixCount = 0
  let bugfixCount = 0
  const failurePrs: DoraMetrics['changeFailureRate']['failurePrs'] = []

  for (const pr of merged) {
    const author = pr.user?.login || 'unknown'
    // hotfix（障害/緊急リリース/緊急対応/切り戻し 等）を最優先で独立判定する。
    // bugfix 判定より先に評価し、二重計上を防ぐ（hotfix にマッチしたら bugfix には数えない）。
    if (isHotfixPr(pr.title, pr.labels)) {
      hotfixCount++
      failurePrs.push({ number: pr.number, title: pr.title, author, prType: 'hotfix' })
      continue
    }
    if (detectPrType(pr.title, pr.labels) === 'bugfix') {
      bugfixCount++
      failurePrs.push({ number: pr.number, title: pr.title, author, prType: 'bugfix' })
    }
  }

  const cfrValue = merged.length > 0 ? (bugfixCount + hotfixCount) / merged.length : 0
  const cfrLevel = getCfrLevel(cfrValue)

  // 4. MTTR（復旧＝hotfix + bugfix のマージ所要時間の中央値）
  const bugfixMergeTimes: number[] = []
  for (const pr of merged) {
    const isFailureFix = isHotfixPr(pr.title, pr.labels) || detectPrType(pr.title, pr.labels) === 'bugfix'
    if (isFailureFix && pr.merged_at) {
      const hours = (new Date(pr.merged_at).getTime() - new Date(pr.created_at).getTime()) / MS_PER_HOUR
      if (hours >= 0) bugfixMergeTimes.push(hours)
    }
  }
  const mttrMedian = parseFloat(median(bugfixMergeTimes).toFixed(1))
  const mttrLevel = getMttrLevel(mttrMedian)

  return {
    deployFrequency: { value: parseFloat(deployFreqValue.toFixed(2)), level: deployFreqLevel },
    leadTime: { medianHours: ltMedian, p75Hours: ltP75, p90Hours: ltP90, level: ltLevel },
    changeFailureRate: {
      value: parseFloat(cfrValue.toFixed(3)),
      hotfixCount,
      bugfixCount,
      totalMerged: merged.length,
      level: cfrLevel,
      failurePrs,
    },
    mttr: { medianHours: mttrMedian, level: mttrLevel },
    overallLevel: getOverallLevel(deployFreqLevel, ltLevel, cfrLevel, mttrLevel),
  }
}

function calculateSprintSeries(
  closedPrs: PrDetailData[],
  readTimes: ReadTimes,
  sprints: SprintRange[],
): DoraSprintPoint[] {
  return sprints.map((sp) => {
    const startMs = sp.start.getTime()
    const endMs = sp.end.getTime()
    const m = calculate(closedPrs, readTimes, startMs, endMs)
    return {
      label: sp.label,
      deployFreq: m.deployFrequency.value,
      leadTimeMedian: m.leadTime.medianHours,
      cfr: parseFloat((m.changeFailureRate.value * 100).toFixed(1)),
      mttrMedian: m.mttr.medianHours,
    }
  })
}

export const DoraService = { calculate, calculateSprintSeries }
