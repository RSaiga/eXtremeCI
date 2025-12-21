import {ReadTime} from "./read.time";
import { PrimitiveToken, hexToRgba } from "../../../components/ui/tokens/primitive-token";

export type LeadTimeCategory = 'Fast' | 'Normal' | 'Slow' | 'Very Slow';

export interface LeadTimeCategoryCount {
  Fast: number;
  Normal: number;
  Slow: number;
  'Very Slow': number;
}

export interface AuthorLeadTimeStats {
  author: string;
  count: number;
  avgHours: number;
  medianHours: number;
}

export class ReadTimes {
  readonly values: ReadTime[];

  constructor(values:ReadTime[]) {
    this.values = values;
  }

  median(): number {
    if (this.values.length === 0) {
      return 0
    }
    const half = (this.values.length / 2) | 0
    const arr = [...this.values].sort((a, b) => {
      return a.getDisplayTime() - b.getDisplayTime();
    })
    if (arr.length % 2) {
      return arr[half].getDisplayTime()
    }

    return parseFloat(((arr[half - 1].getDisplayTime() + arr[half].getDisplayTime()) / 2).toFixed(3))
  }

  avg(): number {
    if (this.values.length === 0) {
      return 0;
    }
    const s = this.values.map(v => v.getDisplayTime());
    const sum = s.reduce((acc, cur) => acc + cur, 0);
    return parseFloat((sum / this.values.length).toFixed(3));
  }

  // パーセンタイル計算
  percentile(p: number): number {
    if (this.values.length === 0) return 0;
    const sorted = [...this.values].sort((a, b) => a.getDisplayTime() - b.getDisplayTime());
    const index = Math.ceil((p / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)].getDisplayTime();
  }

  get p50(): number { return this.percentile(50); }
  get p75(): number { return this.percentile(75); }
  get p90(): number { return this.percentile(90); }

  // カテゴリ分類
  getCategory(hours: number): LeadTimeCategory {
    if (hours < 4) return 'Fast';
    if (hours < 24) return 'Normal';
    if (hours < 72) return 'Slow';
    return 'Very Slow';
  }

  // カテゴリ別カウント
  countByCategory(): LeadTimeCategoryCount {
    const result: LeadTimeCategoryCount = { Fast: 0, Normal: 0, Slow: 0, 'Very Slow': 0 };
    for (const v of this.values) {
      const category = this.getCategory(v.getDisplayTime());
      result[category]++;
    }
    return result;
  }

  // 分布データ（ヒストグラム用）
  distribution(): { range: string; count: number; color: string }[] {
    const ranges = [
      { min: 0, max: 1, label: '< 1h', color: hexToRgba(PrimitiveToken.colors.green[50], 0.8) },
      { min: 1, max: 4, label: '1-4h', color: hexToRgba(PrimitiveToken.colors.green[70], 0.8) },
      { min: 4, max: 8, label: '4-8h', color: hexToRgba(PrimitiveToken.colors.yellow[70], 0.8) },
      { min: 8, max: 24, label: '8-24h', color: hexToRgba(PrimitiveToken.colors.yellow[50], 0.8) },
      { min: 24, max: 72, label: '1-3日', color: hexToRgba(PrimitiveToken.colors.orange[50], 0.8) },
      { min: 72, max: 168, label: '3-7日', color: hexToRgba(PrimitiveToken.colors.orange[60], 0.8) },
      { min: 168, max: Infinity, label: '7日+', color: hexToRgba(PrimitiveToken.colors.red[60], 0.8) }
    ];

    return ranges.map(r => ({
      range: r.label,
      count: this.values.filter(v => {
        const h = v.getDisplayTime();
        return h >= r.min && h < r.max;
      }).length,
      color: r.color
    }));
  }

  // 担当者別統計
  statsByAuthor(): AuthorLeadTimeStats[] {
    if (this.values.length === 0) return [];

    const authorMap = new Map<string, number[]>();
    for (const v of this.values) {
      const times = authorMap.get(v.user) || [];
      times.push(v.getDisplayTime());
      authorMap.set(v.user, times);
    }

    const stats: AuthorLeadTimeStats[] = [];
    for (const [author, times] of authorMap) {
      if (times.length === 0) continue;
      const sorted = [...times].sort((a, b) => a - b);
      const sum = times.reduce((a, b) => a + b, 0);
      const half = Math.floor(sorted.length / 2);
      const median = sorted.length % 2
        ? sorted[half]
        : (sorted[half - 1] + sorted[half]) / 2;

      stats.push({
        author,
        count: times.length,
        avgHours: parseFloat((sum / times.length).toFixed(1)),
        medianHours: parseFloat(median.toFixed(1))
      });
    }

    return stats.sort((a, b) => a.medianHours - b.medianHours);
  }
}