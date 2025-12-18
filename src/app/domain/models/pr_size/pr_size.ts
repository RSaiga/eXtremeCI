export type SizeCategory = 'XS' | 'S' | 'M' | 'L' | 'XL';

export class PrSize {
  readonly title: string;
  readonly user: string;
  readonly date: string;
  readonly additions: number;
  readonly deletions: number;
  readonly changedFiles: number;

  constructor(
    title: string,
    user: string,
    date: string,
    additions: number,
    deletions: number,
    changedFiles: number
  ) {
    this.title = title;
    this.user = user;
    this.date = date;
    this.additions = additions;
    this.deletions = deletions;
    this.changedFiles = changedFiles;
  }

  get totalChanges(): number {
    return this.additions + this.deletions;
  }

  get sizeCategory(): SizeCategory {
    const total = this.totalChanges;
    if (total <= 10) return 'XS';
    if (total <= 50) return 'S';
    if (total <= 250) return 'M';
    if (total <= 500) return 'L';
    return 'XL';
  }
}
