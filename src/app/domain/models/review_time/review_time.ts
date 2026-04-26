export interface ReviewerResponse {
  reviewer: string
  // 当該レビュアーが最初に当PRに反応するまでの時間（時間単位）
  waitHours: number
}

export class ReviewTime {
  readonly prTitle: string

  readonly prAuthor: string

  readonly prCreatedAt: Date

  readonly firstReviewedAt: Date | null

  readonly firstReviewer: string | null

  readonly prNumber: number

  readonly isMerged: boolean

  // 1PRに複数レビュアーがいる場合、全員分の初回レスポンス時間を保持する
  readonly reviewerResponses: ReviewerResponse[]

  constructor(
    prTitle: string,
    prAuthor: string,
    prCreatedAt: Date,
    firstReviewedAt: Date | null,
    firstReviewer: string | null,
    prNumber: number,
    isMerged: boolean = false,
    reviewerResponses: ReviewerResponse[] = [],
  ) {
    this.prTitle = prTitle
    this.prAuthor = prAuthor
    this.prCreatedAt = prCreatedAt
    this.firstReviewedAt = firstReviewedAt
    this.firstReviewer = firstReviewer
    this.prNumber = prNumber
    this.isMerged = isMerged
    this.reviewerResponses = reviewerResponses
  }

  get waitTimeMinutes(): number | null {
    if (!this.firstReviewedAt) return null
    return (this.firstReviewedAt.getTime() - this.prCreatedAt.getTime()) / (60 * 1000)
  }

  get waitTimeHours(): number | null {
    const minutes = this.waitTimeMinutes
    if (minutes === null) return null
    return parseFloat((minutes / 60).toFixed(2))
  }

  get hasReview(): boolean {
    return this.firstReviewedAt !== null
  }

  get createdAtDisplay(): string {
    return this.prCreatedAt.toLocaleDateString()
  }
}
