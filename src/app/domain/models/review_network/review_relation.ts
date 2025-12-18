export class ReviewRelation {
  constructor(
    public readonly author: string,
    public readonly reviewer: string,
    public readonly count: number
  ) {}
}

export interface NetworkNode {
  id: string;
  label: string;
  reviewCount: number;    // このユーザーがレビューした回数
  authorCount: number;    // このユーザーがPRを作成した回数
}

export interface NetworkEdge {
  from: string;           // PR作成者
  to: string;             // レビュアー
  weight: number;         // レビュー回数
}
