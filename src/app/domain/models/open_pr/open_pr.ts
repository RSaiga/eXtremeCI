export type ReviewState = 'PENDING' | 'APPROVED' | 'CHANGES_REQUESTED' | 'COMMENTED' | 'NONE';

export class OpenPr {
  readonly prNumber: number;
  readonly title: string;
  readonly author: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly reviewState: ReviewState;
  readonly isDraft: boolean;
  readonly url: string;

  constructor(
    prNumber: number,
    title: string,
    author: string,
    createdAt: Date,
    updatedAt: Date,
    reviewState: ReviewState,
    isDraft: boolean,
    url: string
  ) {
    this.prNumber = prNumber;
    this.title = title;
    this.author = author;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
    this.reviewState = reviewState;
    this.isDraft = isDraft;
    this.url = url;
  }

  get openDays(): number {
    const now = new Date();
    const diffMs = now.getTime() - this.createdAt.getTime();
    return Math.floor(diffMs / (1000 * 60 * 60 * 24));
  }

  get daysSinceLastUpdate(): number {
    const now = new Date();
    const diffMs = now.getTime() - this.updatedAt.getTime();
    return Math.floor(diffMs / (1000 * 60 * 60 * 24));
  }

  get isStale(): boolean {
    return this.daysSinceLastUpdate >= 7;
  }

  get isOld(): boolean {
    return this.openDays >= 14;
  }

  get statusLabel(): string {
    if (this.isDraft) return 'Draft';
    switch (this.reviewState) {
      case 'APPROVED': return '承認済み';
      case 'CHANGES_REQUESTED': return '変更要求';
      case 'PENDING': return 'レビュー中';
      case 'COMMENTED': return 'コメントあり';
      case 'NONE': return 'レビュー待ち';
    }
  }

  get createdAtDisplay(): string {
    return this.createdAt.toLocaleDateString();
  }

  get updatedAtDisplay(): string {
    return this.updatedAt.toLocaleDateString();
  }
}
