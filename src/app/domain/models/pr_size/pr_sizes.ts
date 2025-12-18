import {PrSize, SizeCategory} from "./pr_size";

export interface CategoryCount {
  XS: number;
  S: number;
  M: number;
  L: number;
  XL: number;
}

export class PrSizes {
  readonly values: PrSize[];

  constructor(values: PrSize[]) {
    this.values = values;
  }

  countByCategory(): CategoryCount {
    const counts: CategoryCount = {XS: 0, S: 0, M: 0, L: 0, XL: 0};
    this.values.forEach(pr => {
      counts[pr.sizeCategory]++;
    });
    return counts;
  }

  avgChanges(): number {
    if (this.values.length === 0) {
      return 0;
    }
    const sum = this.values.reduce((acc, pr) => acc + pr.totalChanges, 0);
    return parseFloat((sum / this.values.length).toFixed(1));
  }

  medianChanges(): number {
    if (this.values.length === 0) {
      return 0;
    }
    const sorted = [...this.values].sort((a, b) => a.totalChanges - b.totalChanges);
    const half = Math.floor(sorted.length / 2);
    if (sorted.length % 2) {
      return sorted[half].totalChanges;
    }
    return Math.round((sorted[half - 1].totalChanges + sorted[half].totalChanges) / 2);
  }
}
