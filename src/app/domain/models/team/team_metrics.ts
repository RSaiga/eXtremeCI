export interface CycleTimeBreakdown {
  commitToPrHours: number // コミット蓄積 → PR作成（中央値）
  prToFirstReviewHours: number // PR作成 → 初回レビュー（中央値）
  firstReviewToApprovedHours: number // 初回レビュー → 承認（中央値）
  approvedToMergedHours: number // 承認 → マージ（中央値）
  totalHours: number // 合計（中央値）
  sampleSize: number
}

export interface MemberStats {
  author: string
  commitCount: number
  prCount: number
  reviewCount: number
  avgCycleTimeHours: number | null
  avgReviewResponseHours: number | null
}

export interface UnreviewedAuthor {
  author: string
  prCount: number
}

export interface InactiveMember {
  author: string
  lastCommitDate: Date
  daysSinceLastCommit: number
}

export interface TeamMetrics {
  mutualReviewParticipationRate: number // 著者のうち自身もレビューしている割合
  busFactorN: number // 50%のコミットを占めるのに必要な最小人数
  cycleBreakdown: CycleTimeBreakdown
  memberStats: MemberStats[]
  unreviewedAuthors: UnreviewedAuthor[]
  inactiveMembers: InactiveMember[]
}
