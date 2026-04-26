import { ReviewTime } from './review_time'

export interface ReviewerStats {
  reviewer: string
  avgResponseTimeHours: number
  reviewCount: number
}

export class ReviewTimes {
  readonly values: ReviewTime[]

  constructor(values: ReviewTime[]) {
    this.values = values
  }

  get reviewedPrs(): ReviewTime[] {
    return this.values.filter((v) => v.hasReview)
  }

  get pendingReviewPrs(): ReviewTime[] {
    return this.values.filter((v) => !v.hasReview)
  }

  get mergedPrs(): ReviewTime[] {
    return this.values.filter((v) => v.isMerged)
  }

  reviewCoverageRatio(): number {
    const merged = this.mergedPrs
    if (merged.length === 0) return 0
    const reviewed = merged.filter((v) => v.hasReview).length
    return parseFloat((reviewed / merged.length).toFixed(3))
  }

  noReviewMergeCount(): number {
    return this.mergedPrs.filter((v) => !v.hasReview).length
  }

  noReviewMergedPrs(): ReviewTime[] {
    return this.mergedPrs.filter((v) => !v.hasReview).sort((a, b) => b.prCreatedAt.getTime() - a.prCreatedAt.getTime())
  }

  avgWaitTimeHours(): number {
    const reviewed = this.reviewedPrs
    if (reviewed.length === 0) return 0
    const sum = reviewed.reduce((acc, v) => acc + (v.waitTimeHours || 0), 0)
    return parseFloat((sum / reviewed.length).toFixed(2))
  }

  medianWaitTimeHours(): number {
    const reviewed = this.reviewedPrs
    if (reviewed.length === 0) return 0

    const sorted = [...reviewed].sort((a, b) => (a.waitTimeHours || 0) - (b.waitTimeHours || 0))
    const half = Math.floor(sorted.length / 2)

    if (sorted.length % 2) {
      return sorted[half].waitTimeHours || 0
    }
    return parseFloat((((sorted[half - 1].waitTimeHours || 0) + (sorted[half].waitTimeHours || 0)) / 2).toFixed(2))
  }

  reviewerStats(): ReviewerStats[] {
    const reviewerMap = new Map<string, { totalHours: number; count: number }>()

    // 1PR につき全レビュアーを集計（レビュアー毎の「初回レスポンス時間」ベース）
    this.values.forEach((pr) => {
      for (const r of pr.reviewerResponses) {
        const existing = reviewerMap.get(r.reviewer) || { totalHours: 0, count: 0 }
        existing.totalHours += r.waitHours
        existing.count += 1
        reviewerMap.set(r.reviewer, existing)
      }
    })

    const stats: ReviewerStats[] = []
    reviewerMap.forEach((value, reviewer) => {
      stats.push({
        reviewer,
        avgResponseTimeHours: parseFloat((value.totalHours / value.count).toFixed(2)),
        reviewCount: value.count,
      })
    })

    return stats.sort((a, b) => a.avgResponseTimeHours - b.avgResponseTimeHours)
  }
}
