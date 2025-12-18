import {NetworkEdge, NetworkNode, ReviewRelation} from "./review_relation";

export interface ReviewerStats {
  name: string;
  reviewCount: number;
  authorCount: number;
  ratio: number;  // reviewCount / authorCount (レビュー貢献度)
}

export class ReviewNetwork {
  constructor(public readonly relations: ReviewRelation[]) {}

  get nodes(): NetworkNode[] {
    const nodeMap = new Map<string, { reviewCount: number; authorCount: number }>();

    for (const rel of this.relations) {
      // Author
      if (!nodeMap.has(rel.author)) {
        nodeMap.set(rel.author, { reviewCount: 0, authorCount: 0 });
      }
      nodeMap.get(rel.author)!.authorCount += rel.count;

      // Reviewer
      if (!nodeMap.has(rel.reviewer)) {
        nodeMap.set(rel.reviewer, { reviewCount: 0, authorCount: 0 });
      }
      nodeMap.get(rel.reviewer)!.reviewCount += rel.count;
    }

    return Array.from(nodeMap.entries()).map(([id, stats]) => ({
      id,
      label: id,
      reviewCount: stats.reviewCount,
      authorCount: stats.authorCount
    }));
  }

  get edges(): NetworkEdge[] {
    return this.relations.map(rel => ({
      from: rel.author,
      to: rel.reviewer,
      weight: rel.count
    }));
  }

  // レビュアー別統計
  get reviewerStats(): ReviewerStats[] {
    const nodes = this.nodes;
    return nodes
      .map(node => ({
        name: node.label,
        reviewCount: node.reviewCount,
        authorCount: node.authorCount,
        ratio: node.authorCount > 0 ? node.reviewCount / node.authorCount : node.reviewCount
      }))
      .sort((a, b) => b.reviewCount - a.reviewCount);
  }

  // レビュー負荷の偏り（ジニ係数的な指標）
  get reviewLoadImbalance(): number {
    const counts = this.nodes.map(n => n.reviewCount).filter(c => c > 0);
    if (counts.length === 0) return 0;

    const total = counts.reduce((a, b) => a + b, 0);
    const avg = total / counts.length;
    const variance = counts.reduce((sum, c) => sum + Math.pow(c - avg, 2), 0) / counts.length;
    const stdDev = Math.sqrt(variance);

    // 変動係数 (Coefficient of Variation)
    return avg > 0 ? stdDev / avg : 0;
  }

  // 最もレビューしている人
  get topReviewer(): string | null {
    const stats = this.reviewerStats;
    return stats.length > 0 ? stats[0].name : null;
  }

  // 最もレビューされている人（PRが多い人）
  get topAuthor(): string | null {
    const sorted = [...this.nodes].sort((a, b) => b.authorCount - a.authorCount);
    return sorted.length > 0 ? sorted[0].label : null;
  }

  // マトリックス形式のデータ（ヒートマップ用）
  get matrix(): { authors: string[]; reviewers: string[]; data: number[][] } {
    const authors = [...new Set(this.relations.map(r => r.author))].sort();
    const reviewers = [...new Set(this.relations.map(r => r.reviewer))].sort();

    const data: number[][] = [];
    for (const author of authors) {
      const row: number[] = [];
      for (const reviewer of reviewers) {
        const rel = this.relations.find(r => r.author === author && r.reviewer === reviewer);
        row.push(rel?.count || 0);
      }
      data.push(row);
    }

    return { authors, reviewers, data };
  }
}
