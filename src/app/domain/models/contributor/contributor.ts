export class Contributor {
  constructor(
    public readonly author: string,
    public readonly commitCount: number,
    public readonly additions: number,
    public readonly deletions: number,
    public readonly firstCommitDate: Date | null,
    public readonly lastCommitDate: Date | null
  ) {}

  get totalChanges(): number {
    return this.additions + this.deletions;
  }

  get avgChangesPerCommit(): number {
    return this.commitCount > 0 ? Math.round(this.totalChanges / this.commitCount) : 0;
  }

  // 活動日数（最初のコミットから最後のコミットまで）
  get activeDays(): number {
    if (!this.firstCommitDate || !this.lastCommitDate) return 0;
    const diffTime = this.lastCommitDate.getTime() - this.firstCommitDate.getTime();
    return Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
  }

  // 1日あたりの平均コミット数
  get commitsPerDay(): number {
    return this.activeDays > 0 ? this.commitCount / this.activeDays : this.commitCount;
  }
}
