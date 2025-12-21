/**
 * DORA Flow Metrics - フロー指標
 *
 * PRのライフサイクルを分析し、フィードバックループの健全性を可視化する
 */

export type SizeCategory = 'XS' | 'S' | 'M' | 'L' | 'XL';

export interface ReviewCycle {
  reviewer: string;
  state: 'APPROVED' | 'CHANGES_REQUESTED' | 'COMMENTED' | 'DISMISSED';
  submittedAt: Date;
}

/**
 * 単一PRのフロー指標
 */
export class FlowMetric {
  readonly prNumber: number;
  readonly prTitle: string;
  readonly author: string;
  readonly createdAt: Date;
  readonly mergedAt: Date | null;
  readonly additions: number;
  readonly deletions: number;
  readonly reviews: ReviewCycle[];

  constructor(params: {
    prNumber: number;
    prTitle: string;
    author: string;
    createdAt: Date;
    mergedAt: Date | null;
    additions: number;
    deletions: number;
    reviews: ReviewCycle[];
  }) {
    this.prNumber = params.prNumber;
    this.prTitle = params.prTitle;
    this.author = params.author;
    this.createdAt = params.createdAt;
    this.mergedAt = params.mergedAt;
    this.additions = params.additions;
    this.deletions = params.deletions;
    this.reviews = params.reviews;
  }

  /** PR作成からマージまでの時間（時間） */
  get cycleTimeHours(): number | null {
    if (!this.mergedAt) return null;
    return (this.mergedAt.getTime() - this.createdAt.getTime()) / (1000 * 60 * 60);
  }

  /** PR作成からマージまでの時間（日） */
  get cycleTimeDays(): number | null {
    const hours = this.cycleTimeHours;
    if (hours === null) return null;
    return parseFloat((hours / 24).toFixed(2));
  }

  /** 最初のレビューまでの待ち時間（時間） */
  get firstReviewWaitHours(): number | null {
    if (this.reviews.length === 0) return null;
    const sortedReviews = [...this.reviews].sort(
      (a, b) => a.submittedAt.getTime() - b.submittedAt.getTime()
    );
    const firstReview = sortedReviews[0];
    return (firstReview.submittedAt.getTime() - this.createdAt.getTime()) / (1000 * 60 * 60);
  }

  /** レビュー回数 */
  get reviewCount(): number {
    return this.reviews.length;
  }

  /** ユニークなレビュアー数 */
  get uniqueReviewerCount(): number {
    const reviewers = new Set(this.reviews.map(r => r.reviewer));
    return reviewers.size;
  }

  /** 修正往復回数（CHANGES_REQUESTEDまたはCOMMENTEDの回数） */
  get revisionRounds(): number {
    return this.reviews.filter(
      r => r.state === 'CHANGES_REQUESTED' || r.state === 'COMMENTED'
    ).length;
  }

  /** 承認されたか */
  get isApproved(): boolean {
    return this.reviews.some(r => r.state === 'APPROVED');
  }

  /** 総変更行数 */
  get totalChanges(): number {
    return this.additions + this.deletions;
  }

  /** PRサイズカテゴリ */
  get sizeCategory(): SizeCategory {
    const total = this.totalChanges;
    if (total <= 10) return 'XS';
    if (total <= 50) return 'S';
    if (total <= 250) return 'M';
    if (total <= 500) return 'L';
    return 'XL';
  }

  /** マージ済みかどうか */
  get isMerged(): boolean {
    return this.mergedAt !== null;
  }
}

/**
 * フロー指標の集計結果
 */
export interface FlowMetricsSummary {
  totalPRs: number;
  mergedPRs: number;

  // サイクルタイム統計（時間）
  avgCycleTimeHours: number;
  medianCycleTimeHours: number;
  p90CycleTimeHours: number;

  // レビュー待ち時間統計（時間）
  avgFirstReviewWaitHours: number;
  medianFirstReviewWaitHours: number;
  p90FirstReviewWaitHours: number;

  // レビュー統計
  avgReviewCount: number;
  avgRevisionRounds: number;
  avgUniqueReviewers: number;

  // PRサイズ統計
  avgPRSize: number;
  sizeDistribution: { category: SizeCategory; count: number; percentage: number }[];

  // 健全性指標
  fastFeedbackRatio: number;  // 4時間以内にレビューされた割合
  quickMergeRatio: number;    // 24時間以内にマージされた割合
  lowRevisionRatio: number;   // 往復1回以下の割合
}

/**
 * 担当者別のフロー指標
 */
export interface AuthorFlowMetrics {
  author: string;
  prCount: number;
  avgCycleTimeHours: number;
  avgFirstReviewWaitHours: number;
  avgReviewCount: number;
  avgRevisionRounds: number;
  avgPRSize: number;
  mergeRate: number;
}

/**
 * レビュアー別の反応速度
 */
export interface ReviewerResponseMetrics {
  reviewer: string;
  reviewCount: number;
  avgResponseTimeHours: number;
  changesRequestedRatio: number;
  approvalRatio: number;
}

/**
 * ボトルネック分析結果
 */
export interface BottleneckAnalysis {
  type: 'individual' | 'design' | 'team' | 'process';
  description: string;
  severity: 'low' | 'medium' | 'high';
  affectedPRs: number[];
}

/**
 * 週次トレンド
 */
export interface WeeklyFlowTrend {
  weekStart: Date;
  weekLabel: string;
  avgCycleTimeHours: number;
  avgFirstReviewWaitHours: number;
  avgRevisionRounds: number;
  prCount: number;
}