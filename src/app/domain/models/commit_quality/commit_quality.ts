// コミット質分析のドメインモデル

export interface CommitSizeCategory {
  name: 'XS' | 'S' | 'M' | 'L' | 'XL';
  label: string;
  min: number;
  max: number;
  color: string;
  description: string;
}

export const COMMIT_SIZE_CATEGORIES: CommitSizeCategory[] = [
  { name: 'XS', label: '極小 (1-10行)', min: 1, max: 10, color: '#4CAF50', description: '理想的：ピンポイント修正' },
  { name: 'S', label: '小 (11-50行)', min: 11, max: 50, color: '#8BC34A', description: '良好：レビューしやすい' },
  { name: 'M', label: '中 (51-150行)', min: 51, max: 150, color: '#FFC107', description: '許容範囲：注意が必要' },
  { name: 'L', label: '大 (151-400行)', min: 151, max: 400, color: '#FF9800', description: '要注意：分割を検討' },
  { name: 'XL', label: '巨大 (401行+)', min: 401, max: Infinity, color: '#F44336', description: '問題：レビュー困難' },
];

export interface CommitQualityMetrics {
  totalCommits: number;
  avgLinesPerCommit: number;
  medianLinesPerCommit: number;

  // サイズ分布
  sizeDistribution: {
    category: CommitSizeCategory;
    count: number;
    percentage: number;
  }[];

  // 品質指標
  smallCommitRatio: number;     // XS+S の割合（理想は70%以上）
  largeCommitRatio: number;     // L+XL の割合（警告：20%以上）
  giantCommitRatio: number;     // XL の割合（危険：10%以上）

  // レビューしやすさスコア (0-100)
  reviewabilityScore: number;

  // 時系列データ
  weeklyTrend: WeeklyCommitQuality[];
}

export interface WeeklyCommitQuality {
  weekStart: Date;
  weekLabel: string;
  totalCommits: number;
  avgLines: number;
  smallRatio: number;
  largeRatio: number;
}

export interface AuthorCommitQuality {
  author: string;
  totalCommits: number;
  avgLinesPerCommit: number;
  medianLinesPerCommit: number;
  smallCommitRatio: number;
  largeCommitRatio: number;
  reviewabilityScore: number;
  // 働き方の傾向
  workStyle: 'incremental' | 'batch' | 'mixed';
  workStyleLabel: string;
}

export function categorizeCommitSize(lines: number): CommitSizeCategory {
  return COMMIT_SIZE_CATEGORIES.find(c => lines >= c.min && lines <= c.max)
    || COMMIT_SIZE_CATEGORIES[COMMIT_SIZE_CATEGORIES.length - 1];
}

export function calculateReviewabilityScore(
  smallRatio: number,
  largeRatio: number,
  avgLines: number
): number {
  // 小さいコミット率が高いほど良い（40点満点）
  const smallScore = Math.min(smallRatio * 40, 40);

  // 大きいコミット率が低いほど良い（30点満点）
  const largeScore = Math.max(0, 30 - largeRatio * 60);

  // 平均行数が少ないほど良い（30点満点）
  const avgScore = Math.max(0, 30 - (avgLines / 10));

  return Math.round(Math.min(100, Math.max(0, smallScore + largeScore + avgScore)));
}

export function determineWorkStyle(
  smallRatio: number,
  largeRatio: number
): { style: 'incremental' | 'batch' | 'mixed'; label: string } {
  if (smallRatio >= 0.6 && largeRatio <= 0.1) {
    return { style: 'incremental', label: '刻み型（理想的）' };
  } else if (largeRatio >= 0.3) {
    return { style: 'batch', label: 'まとめ型（要改善）' };
  } else {
    return { style: 'mixed', label: '混合型' };
  }
}