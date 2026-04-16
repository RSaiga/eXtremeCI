import { PrDetailData } from '../../../infra/github/pr_data'
import { Contributor } from '../../models/contributor/contributor'
import { Contributors } from '../../models/contributor/contributors'
import { ReviewNetwork } from '../../models/review_network/review_network'
import {
  CycleTimeBreakdown,
  InactiveMember,
  MemberStats,
  TeamMetrics,
  UnreviewedAuthor,
} from '../../models/team/team_metrics'
import { FlowMetric } from '../../models/flow_metrics/flow_metrics'
import {
  buildFlowMetrics,
  calculateAuthorMetrics,
  calculateReviewerMetrics,
} from '../flow_metrics/flow_metrics_service'
import { buildReviewNetwork } from '../dashboard/index'

const MS_PER_HOUR = 1000 * 60 * 60
const MS_PER_DAY = MS_PER_HOUR * 24

function median(values: number[]): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

function calcMutualRate(network: ReviewNetwork): number {
  const { nodes } = network
  const authors = nodes.filter((n) => n.authorCount > 0)
  if (authors.length === 0) return 0
  const mutual = authors.filter((n) => n.reviewCount > 0).length
  return mutual / authors.length
}

function calcBusFactor(contributors: Contributors): number {
  const sorted = [...contributors.values].sort((a, b) => b.commitCount - a.commitCount)
  const total = contributors.totalCommits
  if (total === 0) return 0
  let cumulative = 0
  for (let i = 0; i < sorted.length; i++) {
    cumulative += sorted[i].commitCount
    if (cumulative / total >= 0.5) return i + 1
  }
  return sorted.length
}

function calcCycleBreakdown(flowMetrics: FlowMetric[], closedPrs: PrDetailData[]): CycleTimeBreakdown {
  const prByNumber = new Map(closedPrs.map((pr) => [pr.number, pr]))
  const commitToPr: number[] = []
  const prToFirstReview: number[] = []
  const firstReviewToApproved: number[] = []
  const approvedToMerged: number[] = []

  for (const m of flowMetrics) {
    if (!m.isMerged || !m.mergedAt) continue
    const pr = prByNumber.get(m.prNumber)
    if (!pr) continue

    const createdAt = m.createdAt.getTime()
    const mergedAt = m.mergedAt.getTime()
    const firstCommitDate = pr.firstCommitDate ? new Date(pr.firstCommitDate).getTime() : null

    if (firstCommitDate !== null && firstCommitDate <= createdAt) {
      commitToPr.push((createdAt - firstCommitDate) / MS_PER_HOUR)
    }

    const sortedReviews = [...m.reviews].sort((a, b) => a.submittedAt.getTime() - b.submittedAt.getTime())
    const firstReview = sortedReviews[0]
    const firstApproved = sortedReviews.find((r) => r.state === 'APPROVED')

    if (firstReview) {
      prToFirstReview.push((firstReview.submittedAt.getTime() - createdAt) / MS_PER_HOUR)
    }
    if (firstReview && firstApproved && firstApproved.submittedAt.getTime() >= firstReview.submittedAt.getTime()) {
      firstReviewToApproved.push(
        (firstApproved.submittedAt.getTime() - firstReview.submittedAt.getTime()) / MS_PER_HOUR,
      )
    }
    if (firstApproved) {
      approvedToMerged.push((mergedAt - firstApproved.submittedAt.getTime()) / MS_PER_HOUR)
    }
  }

  const c2p = median(commitToPr)
  const p2r = median(prToFirstReview)
  const r2a = median(firstReviewToApproved)
  const a2m = median(approvedToMerged)

  return {
    commitToPrHours: parseFloat(c2p.toFixed(1)),
    prToFirstReviewHours: parseFloat(p2r.toFixed(1)),
    firstReviewToApprovedHours: parseFloat(r2a.toFixed(1)),
    approvedToMergedHours: parseFloat(a2m.toFixed(1)),
    totalHours: parseFloat((c2p + p2r + r2a + a2m).toFixed(1)),
    sampleSize: flowMetrics.filter((m) => m.isMerged).length,
  }
}

function joinMemberStats(
  contributors: Contributors,
  authorMetrics: ReturnType<typeof calculateAuthorMetrics>,
  reviewerMetrics: ReturnType<typeof calculateReviewerMetrics>,
): MemberStats[] {
  const authorMap = new Map(authorMetrics.map((a) => [a.author, a]))
  const reviewerMap = new Map(reviewerMetrics.map((r) => [r.reviewer, r]))

  const allAuthors = new Set<string>()
  for (const c of contributors.values) allAuthors.add(c.author)
  for (const a of authorMetrics) allAuthors.add(a.author)
  for (const r of reviewerMetrics) allAuthors.add(r.reviewer)

  const result: MemberStats[] = []
  for (const name of allAuthors) {
    const contributor = contributors.values.find((c) => c.author === name)
    const author = authorMap.get(name)
    const reviewer = reviewerMap.get(name)
    result.push({
      author: name,
      commitCount: contributor?.commitCount ?? 0,
      prCount: author?.prCount ?? 0,
      reviewCount: reviewer?.reviewCount ?? 0,
      avgCycleTimeHours: author && author.avgCycleTimeHours > 0 ? author.avgCycleTimeHours : null,
      avgReviewResponseHours: reviewer && reviewer.avgResponseTimeHours > 0 ? reviewer.avgResponseTimeHours : null,
    })
  }
  return result.sort((a, b) => b.commitCount - a.commitCount)
}

function findUnreviewedAuthors(network: ReviewNetwork): UnreviewedAuthor[] {
  return network.nodes
    .filter((n) => n.authorCount > 0 && n.reviewCount === 0)
    .map((n) => ({ author: n.label, prCount: n.authorCount }))
    .sort((a, b) => b.prCount - a.prCount)
}

function findInactive(contributors: Contributors, thresholdDays: number): InactiveMember[] {
  const now = Date.now()
  const result: InactiveMember[] = []
  for (const c of contributors.values) {
    if (!c.lastCommitDate) continue
    const days = Math.floor((now - c.lastCommitDate.getTime()) / MS_PER_DAY)
    if (days >= thresholdDays) {
      result.push({
        author: c.author,
        lastCommitDate: c.lastCommitDate,
        daysSinceLastCommit: days,
      })
    }
  }
  return result.sort((a, b) => b.daysSinceLastCommit - a.daysSinceLastCommit)
}

/**
 * dailyCommits と元 Contributors から指定期間版を再構築する。
 * コミット数は per-day 集計から正確に算出。additions/deletions は日別データが
 * 無いため元 90日版の比率で按分（近似値）。firstCommit/lastCommit は期間内で再計算。
 */
export function rebuildContributorsForRange(source: Contributors, startMs: number, endMs: number): Contributors {
  type Acc = { commits: number; first: Date | null; last: Date | null }
  const perAuthor = new Map<string, Acc>()
  const filteredDaily = source.dailyCommits.filter((d) => {
    const t = new Date(d.date).getTime()
    return t >= startMs && t < endMs
  })

  for (const d of filteredDaily) {
    const dayDate = new Date(d.date)
    for (const [author, count] of Object.entries(d.authorCounts)) {
      if (count === 0) continue
      const acc = perAuthor.get(author) || { commits: 0, first: null, last: null }
      acc.commits += count
      if (!acc.first || dayDate < acc.first) acc.first = dayDate
      if (!acc.last || dayDate > acc.last) acc.last = dayDate
      perAuthor.set(author, acc)
    }
  }

  const values: Contributor[] = []
  for (const [author, acc] of perAuthor) {
    const original = source.values.find((c) => c.author === author)
    const ratio = original && original.commitCount > 0 ? acc.commits / original.commitCount : 0
    const additions = original ? Math.round(original.additions * ratio) : 0
    const deletions = original ? Math.round(original.deletions * ratio) : 0
    values.push(new Contributor(author, acc.commits, additions, deletions, acc.first, acc.last))
  }

  return new Contributors(values, filteredDaily)
}

export const TeamService = {
  build(closedPrs: PrDetailData[], contributors: Contributors, network: ReviewNetwork): TeamMetrics {
    const flowMetrics = buildFlowMetrics(closedPrs)
    const authorMetrics = calculateAuthorMetrics(flowMetrics)
    const reviewerMetrics = calculateReviewerMetrics(flowMetrics)

    return {
      mutualReviewParticipationRate: calcMutualRate(network),
      busFactorN: calcBusFactor(contributors),
      cycleBreakdown: calcCycleBreakdown(flowMetrics, closedPrs),
      memberStats: joinMemberStats(contributors, authorMetrics, reviewerMetrics),
      unreviewedAuthors: findUnreviewedAuthors(network),
      inactiveMembers: findInactive(contributors, 30),
    }
  },

  /** 指定期間版の TeamMetrics + 再構築した Contributors / ReviewNetwork を返す */
  buildForRange(
    allClosedPrs: PrDetailData[],
    sourceContributors: Contributors,
    startMs: number,
    endMs: number,
  ): { metrics: TeamMetrics; contributors: Contributors; network: ReviewNetwork } {
    const filteredPrs = allClosedPrs.filter((pr) => {
      if (!pr.merged_at) return false
      const t = new Date(pr.merged_at).getTime()
      return t >= startMs && t < endMs
    })
    const rangedContributors = rebuildContributorsForRange(sourceContributors, startMs, endMs)
    const rangedNetwork = buildReviewNetwork(filteredPrs)
    const metrics = this.build(filteredPrs, rangedContributors, rangedNetwork)
    return { metrics, contributors: rangedContributors, network: rangedNetwork }
  },
}
