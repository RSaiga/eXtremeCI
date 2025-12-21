import { CommitData, commitDataCache } from '../../../infra/github/commit_data';
import {
  CommitQualityMetrics,
  AuthorCommitQuality,
  WeeklyCommitQuality,
  COMMIT_SIZE_CATEGORIES,
  categorizeCommitSize,
  calculateReviewabilityScore,
  determineWorkStyle,
} from '../../models/commit_quality/commit_quality';

function calculateMedian(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatWeekLabel(weekStart: Date): string {
  const month = weekStart.getMonth() + 1;
  const day = weekStart.getDate();
  return `${month}/${day}週`;
}

export async function analyzeCommitQuality(): Promise<CommitQualityMetrics> {
  const commits = await commitDataCache.getCommits();

  if (commits.length === 0) {
    return createEmptyMetrics();
  }

  const lineCounts = commits.map(c => c.additions + c.deletions);

  // サイズ分布を計算
  const sizeDistribution = COMMIT_SIZE_CATEGORIES.map(category => {
    const count = commits.filter(c => {
      const lines = c.additions + c.deletions;
      return categorizeCommitSize(lines).name === category.name;
    }).length;
    return {
      category,
      count,
      percentage: (count / commits.length) * 100,
    };
  });

  // 品質指標
  const xsCount = sizeDistribution.find(d => d.category.name === 'XS')?.count || 0;
  const sCount = sizeDistribution.find(d => d.category.name === 'S')?.count || 0;
  const lCount = sizeDistribution.find(d => d.category.name === 'L')?.count || 0;
  const xlCount = sizeDistribution.find(d => d.category.name === 'XL')?.count || 0;

  const smallCommitRatio = (xsCount + sCount) / commits.length;
  const largeCommitRatio = (lCount + xlCount) / commits.length;
  const giantCommitRatio = xlCount / commits.length;

  const avgLines = lineCounts.reduce((a, b) => a + b, 0) / lineCounts.length;
  const medianLines = calculateMedian(lineCounts);

  const reviewabilityScore = calculateReviewabilityScore(
    smallCommitRatio,
    largeCommitRatio,
    avgLines
  );

  // 週次トレンド
  const weeklyTrend = calculateWeeklyTrend(commits);

  return {
    totalCommits: commits.length,
    avgLinesPerCommit: Math.round(avgLines),
    medianLinesPerCommit: Math.round(medianLines),
    sizeDistribution,
    smallCommitRatio,
    largeCommitRatio,
    giantCommitRatio,
    reviewabilityScore,
    weeklyTrend,
  };
}

export async function analyzeAuthorCommitQuality(): Promise<AuthorCommitQuality[]> {
  const commits = await commitDataCache.getCommits();

  // 著者別にグループ化
  const authorMap = new Map<string, CommitData[]>();
  for (const commit of commits) {
    const existing = authorMap.get(commit.author) || [];
    existing.push(commit);
    authorMap.set(commit.author, existing);
  }

  const results: AuthorCommitQuality[] = [];

  for (const [author, authorCommits] of authorMap) {
    const lineCounts = authorCommits.map(c => c.additions + c.deletions);
    const avgLines = lineCounts.reduce((a, b) => a + b, 0) / lineCounts.length;
    const medianLines = calculateMedian(lineCounts);

    // サイズ分布
    let xsCount = 0, sCount = 0, lCount = 0, xlCount = 0;
    for (const lines of lineCounts) {
      const cat = categorizeCommitSize(lines).name;
      if (cat === 'XS') xsCount++;
      else if (cat === 'S') sCount++;
      else if (cat === 'L') lCount++;
      else if (cat === 'XL') xlCount++;
    }

    const smallRatio = (xsCount + sCount) / authorCommits.length;
    const largeRatio = (lCount + xlCount) / authorCommits.length;

    const workStyleResult = determineWorkStyle(smallRatio, largeRatio);

    results.push({
      author,
      totalCommits: authorCommits.length,
      avgLinesPerCommit: Math.round(avgLines),
      medianLinesPerCommit: Math.round(medianLines),
      smallCommitRatio: smallRatio,
      largeCommitRatio: largeRatio,
      reviewabilityScore: calculateReviewabilityScore(smallRatio, largeRatio, avgLines),
      workStyle: workStyleResult.style,
      workStyleLabel: workStyleResult.label,
    });
  }

  // レビューしやすさスコア降順
  return results.sort((a, b) => b.reviewabilityScore - a.reviewabilityScore);
}

function calculateWeeklyTrend(commits: CommitData[]): WeeklyCommitQuality[] {
  const weekMap = new Map<string, CommitData[]>();

  for (const commit of commits) {
    const weekStart = getWeekStart(commit.committedDate);
    const key = weekStart.toISOString();
    const existing = weekMap.get(key) || [];
    existing.push(commit);
    weekMap.set(key, existing);
  }

  const results: WeeklyCommitQuality[] = [];

  for (const [weekKey, weekCommits] of weekMap) {
    const weekStart = new Date(weekKey);
    const lineCounts = weekCommits.map(c => c.additions + c.deletions);
    const avgLines = lineCounts.reduce((a, b) => a + b, 0) / lineCounts.length;

    let smallCount = 0, largeCount = 0;
    for (const lines of lineCounts) {
      const cat = categorizeCommitSize(lines).name;
      if (cat === 'XS' || cat === 'S') smallCount++;
      if (cat === 'L' || cat === 'XL') largeCount++;
    }

    results.push({
      weekStart,
      weekLabel: formatWeekLabel(weekStart),
      totalCommits: weekCommits.length,
      avgLines: Math.round(avgLines),
      smallRatio: smallCount / weekCommits.length,
      largeRatio: largeCount / weekCommits.length,
    });
  }

  // 日付順
  return results.sort((a, b) => a.weekStart.getTime() - b.weekStart.getTime());
}

function createEmptyMetrics(): CommitQualityMetrics {
  return {
    totalCommits: 0,
    avgLinesPerCommit: 0,
    medianLinesPerCommit: 0,
    sizeDistribution: COMMIT_SIZE_CATEGORIES.map(category => ({
      category,
      count: 0,
      percentage: 0,
    })),
    smallCommitRatio: 0,
    largeCommitRatio: 0,
    giantCommitRatio: 0,
    reviewabilityScore: 0,
    weeklyTrend: [],
  };
}