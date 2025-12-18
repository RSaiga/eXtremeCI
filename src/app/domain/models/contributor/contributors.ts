import {Contributor} from "./contributor";

export interface ContributionShare {
  author: string;
  commitShare: number;      // コミット数のシェア (%)
  codeShare: number;        // コード量のシェア (%)
  commitCount: number;
  totalChanges: number;
}

// 日別コミットデータ
export interface DailyCommit {
  date: string;
  authorCounts: { [author: string]: number };
}

export class Contributors {
  constructor(
    public readonly values: Contributor[],
    public readonly dailyCommits: DailyCommit[] = []
  ) {}

  get totalCommits(): number {
    return this.values.reduce((sum, c) => sum + c.commitCount, 0);
  }

  get totalAdditions(): number {
    return this.values.reduce((sum, c) => sum + c.additions, 0);
  }

  get totalDeletions(): number {
    return this.values.reduce((sum, c) => sum + c.deletions, 0);
  }

  get totalChanges(): number {
    return this.totalAdditions + this.totalDeletions;
  }

  get contributorCount(): number {
    return this.values.length;
  }

  // 各コントリビューターのシェアを計算
  get contributionShares(): ContributionShare[] {
    const totalCommits = this.totalCommits;
    const totalChanges = this.totalChanges;

    return this.values.map(c => ({
      author: c.author,
      commitShare: totalCommits > 0 ? (c.commitCount / totalCommits) * 100 : 0,
      codeShare: totalChanges > 0 ? (c.totalChanges / totalChanges) * 100 : 0,
      commitCount: c.commitCount,
      totalChanges: c.totalChanges
    }));
  }

  // 上位N人のコントリビューター
  topByCommits(n: number): Contributor[] {
    return [...this.values]
      .sort((a, b) => b.commitCount - a.commitCount)
      .slice(0, n);
  }

  topByCodeChanges(n: number): Contributor[] {
    return [...this.values]
      .sort((a, b) => b.totalChanges - a.totalChanges)
      .slice(0, n);
  }

  // 上位3人が全体の何%を占めているか
  get top3CommitShare(): number {
    const top3 = this.topByCommits(3);
    const top3Commits = top3.reduce((sum, c) => sum + c.commitCount, 0);
    return this.totalCommits > 0 ? (top3Commits / this.totalCommits) * 100 : 0;
  }

  get top3CodeShare(): number {
    const top3 = this.topByCodeChanges(3);
    const top3Changes = top3.reduce((sum, c) => sum + c.totalChanges, 0);
    return this.totalChanges > 0 ? (top3Changes / this.totalChanges) * 100 : 0;
  }

  // 平均コミット数
  get avgCommitsPerContributor(): number {
    return this.contributorCount > 0 ? this.totalCommits / this.contributorCount : 0;
  }

  // 平均コード量
  get avgChangesPerContributor(): number {
    return this.contributorCount > 0 ? this.totalChanges / this.contributorCount : 0;
  }
}
