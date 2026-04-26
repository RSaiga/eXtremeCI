import { prDataCache, PrDetailData } from '../../../infra/github/pr_data'
import { RepoRef } from '../../../shared/repos/config'
import { isExcludedReviewer } from '../../../shared/excluded_reviewers'
import {
  FlowMetric,
  FlowMetricsSummary,
  AuthorFlowMetrics,
  ReviewerResponseMetrics,
  WeeklyFlowTrend,
  BottleneckAnalysis,
  ReviewCycle,
  SizeCategory,
} from '../../models/flow_metrics/flow_metrics'

const NINETY_DAYS_AGO = () => {
  const date = new Date()
  date.setDate(date.getDate() - 90)
  return date
}

function calculateMedian(values: number[]): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

function calculatePercentile(values: number[], percentile: number): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const index = Math.ceil((percentile / 100) * sorted.length) - 1
  return sorted[Math.max(0, index)]
}

function getWeekStart(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  d.setDate(diff)
  d.setHours(0, 0, 0, 0)
  return d
}

function formatWeekLabel(weekStart: Date): string {
  const month = weekStart.getMonth() + 1
  const day = weekStart.getDate()
  return `${month}/${day}週`
}

export function buildFlowMetrics(prs: PrDetailData[]): FlowMetric[] {
  const ninetyDaysAgo = NINETY_DAYS_AGO()
  const metrics: FlowMetric[] = []

  for (const pr of prs) {
    const createdAt = new Date(pr.created_at)
    // フロータブの担当者別と基準を揃える: クローズ済みPRは「マージ/クローズ日」が90日以内であることを要件に、
    // オープンPRは現在進行中のため常に含める。
    const closedAtRaw = pr.merged_at || pr.closed_at
    if (closedAtRaw) {
      if (new Date(closedAtRaw).getTime() < ninetyDaysAgo.getTime()) continue
    }

    const reviews: ReviewCycle[] = pr.reviews
      .filter((r) => r.state !== 'PENDING' && r.submitted_at)
      .filter((r) => !isExcludedReviewer(r.user?.login))
      .map((r) => ({
        reviewer: r.user?.login || 'unknown',
        state: r.state as ReviewCycle['state'],
        submittedAt: new Date(r.submitted_at),
      }))

    metrics.push(
      new FlowMetric({
        prNumber: pr.number,
        prTitle: pr.title,
        author: pr.user?.login || 'unknown',
        createdAt,
        mergedAt: pr.merged_at ? new Date(pr.merged_at) : null,
        additions: pr.additions,
        deletions: pr.deletions,
        reviews,
      }),
    )
  }

  return metrics
}

function calculateSummary(metrics: FlowMetric[]): FlowMetricsSummary {
  const mergedMetrics = metrics.filter((m) => m.isMerged)
  const metricsWithReview = metrics.filter((m) => m.reviewCount > 0)

  // サイクルタイム計算（マージ済みのみ）
  const cycleTimes = mergedMetrics.map((m) => m.cycleTimeHours).filter((t): t is number => t !== null)

  // レビュー待ち時間計算
  const waitTimes = metricsWithReview.map((m) => m.firstReviewWaitHours).filter((t): t is number => t !== null)

  // サイズ分布
  const sizeCategories: SizeCategory[] = ['XS', 'S', 'M', 'L', 'XL']
  const sizeDistribution = sizeCategories.map((category) => {
    const count = metrics.filter((m) => m.sizeCategory === category).length
    return {
      category,
      count,
      percentage: metrics.length > 0 ? (count / metrics.length) * 100 : 0,
    }
  })

  // 健全性指標
  const fastFeedback = metricsWithReview.filter((m) => {
    const wait = m.firstReviewWaitHours
    return wait !== null && wait <= 4
  })
  const quickMerge = mergedMetrics.filter((m) => {
    const cycle = m.cycleTimeHours
    return cycle !== null && cycle <= 24
  })
  const lowRevision = metrics.filter((m) => m.revisionRounds <= 1)

  return {
    totalPRs: metrics.length,
    mergedPRs: mergedMetrics.length,

    avgCycleTimeHours: cycleTimes.length > 0 ? cycleTimes.reduce((a, b) => a + b, 0) / cycleTimes.length : 0,
    medianCycleTimeHours: calculateMedian(cycleTimes),
    p90CycleTimeHours: calculatePercentile(cycleTimes, 90),

    avgFirstReviewWaitHours: waitTimes.length > 0 ? waitTimes.reduce((a, b) => a + b, 0) / waitTimes.length : 0,
    medianFirstReviewWaitHours: calculateMedian(waitTimes),
    p90FirstReviewWaitHours: calculatePercentile(waitTimes, 90),

    avgReviewCount: metrics.length > 0 ? metrics.reduce((sum, m) => sum + m.reviewCount, 0) / metrics.length : 0,
    avgRevisionRounds: metrics.length > 0 ? metrics.reduce((sum, m) => sum + m.revisionRounds, 0) / metrics.length : 0,
    avgUniqueReviewers:
      metrics.length > 0 ? metrics.reduce((sum, m) => sum + m.uniqueReviewerCount, 0) / metrics.length : 0,

    avgPRSize: metrics.length > 0 ? metrics.reduce((sum, m) => sum + m.totalChanges, 0) / metrics.length : 0,
    sizeDistribution,

    fastFeedbackRatio: metricsWithReview.length > 0 ? fastFeedback.length / metricsWithReview.length : 0,
    quickMergeRatio: mergedMetrics.length > 0 ? quickMerge.length / mergedMetrics.length : 0,
    lowRevisionRatio: metrics.length > 0 ? lowRevision.length / metrics.length : 0,
  }
}

export function calculateAuthorMetrics(metrics: FlowMetric[]): AuthorFlowMetrics[] {
  const authorMap = new Map<string, FlowMetric[]>()

  for (const metric of metrics) {
    const existing = authorMap.get(metric.author) || []
    existing.push(metric)
    authorMap.set(metric.author, existing)
  }

  const results: AuthorFlowMetrics[] = []

  for (const [author, authorMetrics] of authorMap) {
    const merged = authorMetrics.filter((m) => m.isMerged)
    const withReview = authorMetrics.filter((m) => m.reviewCount > 0)

    const cycleTimes = merged.map((m) => m.cycleTimeHours).filter((t): t is number => t !== null)

    const waitTimes = withReview.map((m) => m.firstReviewWaitHours).filter((t): t is number => t !== null)

    results.push({
      author,
      prCount: authorMetrics.length,
      avgCycleTimeHours: cycleTimes.length > 0 ? cycleTimes.reduce((a, b) => a + b, 0) / cycleTimes.length : 0,
      avgFirstReviewWaitHours: waitTimes.length > 0 ? waitTimes.reduce((a, b) => a + b, 0) / waitTimes.length : 0,
      avgReviewCount: authorMetrics.reduce((sum, m) => sum + m.reviewCount, 0) / authorMetrics.length,
      avgRevisionRounds: authorMetrics.reduce((sum, m) => sum + m.revisionRounds, 0) / authorMetrics.length,
      avgPRSize: authorMetrics.reduce((sum, m) => sum + m.totalChanges, 0) / authorMetrics.length,
      mergeRate: authorMetrics.length > 0 ? merged.length / authorMetrics.length : 0,
    })
  }

  return results.sort((a, b) => b.prCount - a.prCount)
}

export function calculateReviewerMetrics(metrics: FlowMetric[]): ReviewerResponseMetrics[] {
  const reviewerMap = new Map<
    string,
    {
      reviews: { waitHours: number; state: string }[]
    }
  >()

  for (const metric of metrics) {
    if (metric.reviews.length === 0) continue

    // 最初のレビューを対象（レビュアーの反応速度を測定）
    const sortedReviews = [...metric.reviews].sort((a, b) => a.submittedAt.getTime() - b.submittedAt.getTime())

    for (const review of sortedReviews) {
      const waitHours = (review.submittedAt.getTime() - metric.createdAt.getTime()) / (1000 * 60 * 60)

      const existing = reviewerMap.get(review.reviewer) || { reviews: [] }
      existing.reviews.push({ waitHours, state: review.state })
      reviewerMap.set(review.reviewer, existing)
    }
  }

  const results: ReviewerResponseMetrics[] = []

  for (const [reviewer, data] of reviewerMap) {
    const changesRequested = data.reviews.filter((r) => r.state === 'CHANGES_REQUESTED').length
    const approved = data.reviews.filter((r) => r.state === 'APPROVED').length
    const avgWait = data.reviews.reduce((sum, r) => sum + r.waitHours, 0) / data.reviews.length

    results.push({
      reviewer,
      reviewCount: data.reviews.length,
      avgResponseTimeHours: avgWait,
      changesRequestedRatio: data.reviews.length > 0 ? changesRequested / data.reviews.length : 0,
      approvalRatio: data.reviews.length > 0 ? approved / data.reviews.length : 0,
    })
  }

  return results.sort((a, b) => b.reviewCount - a.reviewCount)
}

function calculateWeeklyTrend(metrics: FlowMetric[]): WeeklyFlowTrend[] {
  const weekMap = new Map<string, FlowMetric[]>()

  for (const metric of metrics) {
    const weekStart = getWeekStart(metric.createdAt)
    const key = weekStart.toISOString()
    const existing = weekMap.get(key) || []
    existing.push(metric)
    weekMap.set(key, existing)
  }

  const results: WeeklyFlowTrend[] = []

  for (const [weekKey, weekMetrics] of weekMap) {
    const weekStart = new Date(weekKey)
    const merged = weekMetrics.filter((m) => m.isMerged)
    const withReview = weekMetrics.filter((m) => m.reviewCount > 0)

    const cycleTimes = merged.map((m) => m.cycleTimeHours).filter((t): t is number => t !== null)

    const waitTimes = withReview.map((m) => m.firstReviewWaitHours).filter((t): t is number => t !== null)

    results.push({
      weekStart,
      weekLabel: formatWeekLabel(weekStart),
      avgCycleTimeHours: cycleTimes.length > 0 ? cycleTimes.reduce((a, b) => a + b, 0) / cycleTimes.length : 0,
      avgFirstReviewWaitHours: waitTimes.length > 0 ? waitTimes.reduce((a, b) => a + b, 0) / waitTimes.length : 0,
      avgRevisionRounds: weekMetrics.reduce((sum, m) => sum + m.revisionRounds, 0) / weekMetrics.length,
      prCount: weekMetrics.length,
    })
  }

  return results.sort((a, b) => a.weekStart.getTime() - b.weekStart.getTime())
}

function analyzeBottlenecks(metrics: FlowMetric[], summary: FlowMetricsSummary): BottleneckAnalysis[] {
  const bottlenecks: BottleneckAnalysis[] = []

  // レビュー待ち時間が長い（プロセスの問題）
  if (summary.avgFirstReviewWaitHours > 24) {
    const slowReviewPRs = metrics
      .filter((m) => {
        const wait = m.firstReviewWaitHours
        return wait !== null && wait > 24
      })
      .map((m) => m.prNumber)

    bottlenecks.push({
      type: 'process',
      description: 'レビュー待ち時間が長い（平均24時間超）。レビュー文化やレビュアーの可用性を確認してください。',
      severity: summary.avgFirstReviewWaitHours > 48 ? 'high' : 'medium',
      affectedPRs: slowReviewPRs,
    })
  }

  // 修正往復が多い（設計の問題）
  if (summary.avgRevisionRounds > 3) {
    const highRevisionPRs = metrics.filter((m) => m.revisionRounds > 3).map((m) => m.prNumber)

    bottlenecks.push({
      type: 'design',
      description: '修正往復が多い（平均3回超）。事前の設計レビューや要件の明確化を検討してください。',
      severity: summary.avgRevisionRounds > 5 ? 'high' : 'medium',
      affectedPRs: highRevisionPRs,
    })
  }

  // PRサイズが大きい（個人作業の問題）
  if (summary.avgPRSize > 500) {
    const largePRs = metrics.filter((m) => m.totalChanges > 500).map((m) => m.prNumber)

    bottlenecks.push({
      type: 'individual',
      description: 'PRサイズが大きい（平均500行超）。より小さな単位でのPR作成を推奨します。',
      severity: summary.avgPRSize > 1000 ? 'high' : 'medium',
      affectedPRs: largePRs,
    })
  }

  // サイクルタイムが長い（チームの問題）
  if (summary.avgCycleTimeHours > 72) {
    const slowCyclePRs = metrics
      .filter((m) => {
        const cycle = m.cycleTimeHours
        return cycle !== null && cycle > 72
      })
      .map((m) => m.prNumber)

    bottlenecks.push({
      type: 'team',
      description: 'PR作成からマージまでの時間が長い（平均3日超）。チームの作業フローを見直してください。',
      severity: summary.avgCycleTimeHours > 120 ? 'high' : 'medium',
      affectedPRs: slowCyclePRs,
    })
  }

  return bottlenecks
}

export interface FlowMetricsData {
  metrics: FlowMetric[]
  summary: FlowMetricsSummary
  authorMetrics: AuthorFlowMetrics[]
  reviewerMetrics: ReviewerResponseMetrics[]
  weeklyTrend: WeeklyFlowTrend[]
  bottlenecks: BottleneckAnalysis[]
}

export const FlowMetricsService = {
  async fetchAll(repos: RepoRef[]): Promise<FlowMetricsData> {
    const perRepo = await Promise.all(
      repos.map(async ({ owner, repo }) => {
        const [cp, op] = await Promise.all([prDataCache.getClosedPrs(owner, repo), prDataCache.getOpenPrs(owner, repo)])
        return { cp, op }
      }),
    )
    const closedPrs = perRepo.flatMap((p) => p.cp)
    const openPrs = perRepo.flatMap((p) => p.op)

    // クローズ済みとオープン中のPRを統合
    const allPrs = [...closedPrs, ...openPrs]

    const metrics = buildFlowMetrics(allPrs)
    const summary = calculateSummary(metrics)
    const authorMetrics = calculateAuthorMetrics(metrics)
    const reviewerMetrics = calculateReviewerMetrics(metrics)
    const weeklyTrend = calculateWeeklyTrend(metrics)
    const bottlenecks = analyzeBottlenecks(metrics, summary)

    return {
      metrics,
      summary,
      authorMetrics,
      reviewerMetrics,
      weeklyTrend,
      bottlenecks,
    }
  },
}
