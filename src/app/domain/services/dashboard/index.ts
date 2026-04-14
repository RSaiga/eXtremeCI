import { prDataCache, PrDetailData } from '../../../infra/github/pr_data'
import { commitDataCache, ContributorStats, DailyCommitData } from '../../../infra/github/commit_data'
import { RepoRef } from '../../../shared/repos/config'
import { ReadTime } from '../../models/read_time/read.time'
import { ReadTimes } from '../../models/read_time/read.times'
import { PrSize } from '../../models/pr_size/pr_size'
import { PrSizes } from '../../models/pr_size/pr_sizes'
import { ReviewTime } from '../../models/review_time/review_time'
import { ReviewTimes } from '../../models/review_time/review_times'
import { OpenPr, ReviewState } from '../../models/open_pr/open_pr'
import { OpenPrs } from '../../models/open_pr/open_prs'
import { ReviewRelation } from '../../models/review_network/review_relation'
import { ReviewNetwork } from '../../models/review_network/review_network'
import { Contributor } from '../../models/contributor/contributor'
import { Contributors } from '../../models/contributor/contributors'

export interface DashboardData {
  readTimes: ReadTimes
  prSizes: PrSizes
  reviewTimes: ReviewTimes
  openPrs: OpenPrs
  reviewNetwork: ReviewNetwork
  contributors: Contributors
}

const NINETY_DAYS_AGO = () => {
  const date = new Date()
  date.setDate(date.getDate() - 90)
  return date
}

function buildReadTimes(closedPrs: PrDetailData[]): ReadTimes {
  const ninetyDaysAgo = NINETY_DAYS_AGO()
  const readTimes: ReadTime[] = []

  for (const pr of closedPrs) {
    const closedAt = new Date(pr.merged_at || pr.closed_at || '')
    if (closedAt.getTime() < ninetyDaysAgo.getTime()) continue
    if (!pr.firstCommitDate) continue

    const timeMinutes = (closedAt.getTime() - pr.firstCommitDate.getTime()) / (60 * 1000)
    readTimes.push(new ReadTime(pr.user?.login || 'unknown', pr.title, closedAt.toISOString(), String(timeMinutes)))
  }

  readTimes.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

  return new ReadTimes(readTimes)
}

function buildPrSizes(closedPrs: PrDetailData[]): PrSizes {
  const ninetyDaysAgo = NINETY_DAYS_AGO()
  const prSizes: PrSize[] = []

  for (const pr of closedPrs) {
    const closedAt = new Date(pr.merged_at || pr.closed_at || '')
    if (closedAt.getTime() < ninetyDaysAgo.getTime()) continue

    prSizes.push(
      new PrSize(
        pr.title,
        pr.user?.login || 'unknown',
        closedAt.toISOString(),
        pr.additions,
        pr.deletions,
        pr.changed_files,
      ),
    )
  }

  return new PrSizes(prSizes)
}

function buildReviewTimes(closedPrs: PrDetailData[]): ReviewTimes {
  const ninetyDaysAgo = NINETY_DAYS_AGO()
  const reviewTimes: ReviewTime[] = []

  for (const pr of closedPrs) {
    const createdAt = new Date(pr.created_at)
    if (createdAt.getTime() < ninetyDaysAgo.getTime()) continue

    const validReviews = pr.reviews
      .filter((r) => r.state !== 'PENDING' && r.submitted_at)
      .sort((a, b) => new Date(a.submitted_at).getTime() - new Date(b.submitted_at).getTime())

    const firstReview = validReviews[0]

    reviewTimes.push(
      new ReviewTime(
        pr.title,
        pr.user?.login || 'unknown',
        createdAt,
        firstReview ? new Date(firstReview.submitted_at) : null,
        firstReview?.user?.login || null,
        pr.number,
      ),
    )
  }

  return new ReviewTimes(reviewTimes)
}

function buildOpenPrs(openPrs: PrDetailData[]): OpenPrs {
  const result: OpenPr[] = []

  for (const pr of openPrs) {
    const validReviews = pr.reviews
      .filter((r) => r.state !== 'PENDING' && r.state !== 'DISMISSED')
      .sort((a, b) => new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime())

    let reviewState: ReviewState = 'NONE'
    if (validReviews.length > 0) {
      const latestState = validReviews[0].state
      switch (latestState) {
        case 'APPROVED':
          reviewState = 'APPROVED'
          break
        case 'CHANGES_REQUESTED':
          reviewState = 'CHANGES_REQUESTED'
          break
        case 'COMMENTED':
          reviewState = 'COMMENTED'
          break
        default:
          reviewState = 'PENDING'
      }
    }

    result.push(
      new OpenPr(
        pr.number,
        pr.title,
        pr.user?.login || 'unknown',
        new Date(pr.created_at),
        new Date(pr.updated_at),
        reviewState,
        pr.draft,
        pr.html_url,
      ),
    )
  }

  return new OpenPrs(result)
}

function buildReviewNetwork(closedPrs: PrDetailData[]): ReviewNetwork {
  const ninetyDaysAgo = NINETY_DAYS_AGO()
  const relationMap = new Map<string, number>()

  for (const pr of closedPrs) {
    const closedAt = new Date(pr.merged_at || pr.closed_at || '')
    if (closedAt.getTime() < ninetyDaysAgo.getTime()) continue

    const author = pr.user?.login || 'unknown'

    // 各レビュアーをカウント（重複排除: 1PRにつき1レビュアー1回）
    const reviewers = new Set<string>()
    for (const review of pr.reviews) {
      if (review.state === 'PENDING' || review.state === 'DISMISSED') continue
      if (!review.user?.login) continue
      if (review.user.login === author) continue // 自己レビューは除外
      reviewers.add(review.user.login)
    }

    for (const reviewer of reviewers) {
      const key = `${author}:${reviewer}`
      relationMap.set(key, (relationMap.get(key) || 0) + 1)
    }
  }

  const relations: ReviewRelation[] = []
  for (const [key, count] of relationMap) {
    const [author, reviewer] = key.split(':')
    relations.push(new ReviewRelation(author, reviewer, count))
  }

  return new ReviewNetwork(relations)
}

function buildContributors(stats: ContributorStats[], dailyCommits: DailyCommitData[]): Contributors {
  const contributors = stats.map(
    (s) => new Contributor(s.author, s.commitCount, s.additions, s.deletions, s.firstCommitDate, s.lastCommitDate),
  )
  return new Contributors(contributors, dailyCommits)
}

function mergeContributorStats(lists: ContributorStats[][]): ContributorStats[] {
  const map = new Map<string, ContributorStats>()
  for (const list of lists) {
    for (const s of list) {
      const existing = map.get(s.author)
      if (!existing) {
        map.set(s.author, { ...s })
      } else {
        existing.commitCount += s.commitCount
        existing.additions += s.additions
        existing.deletions += s.deletions
        existing.totalChanges += s.totalChanges
        if (s.firstCommitDate && (!existing.firstCommitDate || s.firstCommitDate < existing.firstCommitDate)) {
          existing.firstCommitDate = s.firstCommitDate
        }
        if (s.lastCommitDate && (!existing.lastCommitDate || s.lastCommitDate > existing.lastCommitDate)) {
          existing.lastCommitDate = s.lastCommitDate
        }
      }
    }
  }
  return Array.from(map.values()).sort((a, b) => b.commitCount - a.commitCount)
}

function mergeDailyCommits(lists: DailyCommitData[][]): DailyCommitData[] {
  const map = new Map<string, { [author: string]: number }>()
  for (const list of lists) {
    for (const d of list) {
      const existing = map.get(d.date) || {}
      for (const [author, count] of Object.entries(d.authorCounts)) {
        existing[author] = (existing[author] || 0) + count
      }
      map.set(d.date, existing)
    }
  }
  return Array.from(map.entries())
    .map(([date, authorCounts]) => ({ date, authorCounts }))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
}

export const DashboardService = {
  async fetchAll(repos: RepoRef[]): Promise<DashboardData> {
    // 各リポジトリのデータを並列取得してマージ
    const perRepo = await Promise.all(
      repos.map(async ({ owner, repo }) => {
        const [cp, op, cs, dc] = await Promise.all([
          prDataCache.getClosedPrs(owner, repo),
          prDataCache.getOpenPrs(owner, repo),
          commitDataCache.getContributorStats(owner, repo),
          commitDataCache.getDailyCommits(owner, repo),
        ])
        return { closedPrs: cp, openPrs: op, contributorStats: cs, dailyCommits: dc }
      }),
    )
    const closedPrs = perRepo.flatMap((p) => p.closedPrs)
    const openPrsData = perRepo.flatMap((p) => p.openPrs)
    const contributorStats = mergeContributorStats(perRepo.map((p) => p.contributorStats))
    const dailyCommits = mergeDailyCommits(perRepo.map((p) => p.dailyCommits))

    // 取得したデータから各ドメインモデルを構築（メモリ内で高速）
    const readTimes = buildReadTimes(closedPrs)
    const prSizes = buildPrSizes(closedPrs)
    const reviewTimes = buildReviewTimes(closedPrs)
    const openPrs = buildOpenPrs(openPrsData)
    const reviewNetwork = buildReviewNetwork(closedPrs)
    const contributors = buildContributors(contributorStats, dailyCommits)

    return {
      readTimes,
      prSizes,
      reviewTimes,
      openPrs,
      reviewNetwork,
      contributors,
    }
  },
}
