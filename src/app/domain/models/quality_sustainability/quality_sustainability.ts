// 品質と持続性のドメインモデル

export interface QualitySustainabilityMetrics {
  // テストコード関連
  testMetrics: TestCodeMetrics;

  // CI関連
  ciMetrics: CIMetrics;

  // リファクタリング関連
  refactoringMetrics: RefactoringMetrics;

  // 総合評価
  sustainabilityScore: number;
  sustainabilityGrade: 'A' | 'B' | 'C' | 'D' | 'F';
  orientation: 'long-term' | 'short-term' | 'balanced';
  orientationLabel: string;
}

export interface TestCodeMetrics {
  // PRにテストが含まれる割合
  prsWithTests: number;
  prsWithoutTests: number;
  testInclusionRate: number;

  // テストファイルの変更トレンド
  weeklyTestTrend: WeeklyTestData[];

  // テストを書く人の割合
  authorsWithTests: number;
  authorsWithoutTests: number;
  authorTestRate: number;

  // 評価
  testCulture: 'strong' | 'moderate' | 'weak' | 'none';
  testCultureLabel: string;
}

export interface WeeklyTestData {
  weekStart: Date;
  weekLabel: string;
  totalPrs: number;
  prsWithTests: number;
  testRate: number;
}

export interface CIMetrics {
  // CI結果
  totalChecks: number;
  successfulChecks: number;
  failedChecks: number;
  successRate: number;

  // 失敗からの復旧
  avgFixTime: number | null; // 時間

  // 週次トレンド
  weeklyTrend: WeeklyCIData[];

  // 評価
  ciHealth: 'excellent' | 'good' | 'needs-improvement' | 'critical';
  ciHealthLabel: string;
}

export interface WeeklyCIData {
  weekStart: Date;
  weekLabel: string;
  totalChecks: number;
  successRate: number;
}

export interface RefactoringMetrics {
  // リファクタリング系PR
  refactoringPrs: number;
  featurePrs: number;
  bugfixPrs: number;
  otherPrs: number;
  totalPrs: number;

  // 割合
  refactoringRate: number;

  // 週次トレンド
  weeklyTrend: WeeklyRefactoringData[];

  // 技術的負債への姿勢
  techDebtAttitude: 'proactive' | 'reactive' | 'neglecting';
  techDebtAttitudeLabel: string;
}

export interface WeeklyRefactoringData {
  weekStart: Date;
  weekLabel: string;
  totalPrs: number;
  refactoringPrs: number;
  refactoringRate: number;
}

export interface PrWithQualityInfo {
  number: number;
  title: string;
  author: string;
  createdAt: Date;
  mergedAt: Date | null;
  hasTests: boolean;
  prType: 'feature' | 'bugfix' | 'refactoring' | 'other';
  ciStatus: 'success' | 'failure' | 'pending' | 'unknown';
}

// テストファイルを判定するパターン
export const TEST_FILE_PATTERNS = [
  // JavaScript / TypeScript
  /\.test\.[jt]sx?$/,           // *.test.js, *.test.ts, *.test.tsx
  /\.spec\.[jt]sx?$/,           // *.spec.js, *.spec.ts
  /_test\.[jt]sx?$/,            // *_test.js, *_test.ts
  /_spec\.[jt]sx?$/,            // *_spec.js, *_spec.ts
  /\/__tests__\//,              // __tests__/ ディレクトリ (Jest)

  // PHP
  /Test\.php$/,                 // *Test.php (PHPUnit)
  /\.test\.php$/i,              // *.test.php
  /\/tests\/.*\.php$/,          // tests/*.php

  // Python
  /test_.*\.py$/,               // test_*.py (pytest)
  /_test\.py$/,                 // *_test.py (pytest)
  /tests\.py$/,                 // tests.py
  /\/tests\/.*\.py$/,           // tests/*.py
  /\/test\/.*\.py$/,            // test/*.py

  // Rust
  /\/tests\/.*\.rs$/,           // tests/*.rs (integration tests)
  /_test\.rs$/,                 // *_test.rs
  /\/src\/.*tests\.rs$/,        // src/**/tests.rs (unit tests module)
  /#\[cfg\(test\)\]/,           // #[cfg(test)] (inline tests) - ファイル名では判定できない

  // Go
  /_test\.go$/,                 // *_test.go (Go標準)
  /\/testdata\//,               // testdata/ ディレクトリ

  // Java / Kotlin
  /Test\.java$/,                // *Test.java (JUnit)
  /Tests\.java$/,               // *Tests.java
  /TestCase\.java$/,            // *TestCase.java
  /IT\.java$/,                  // *IT.java (Integration Test)
  /Test\.kt$/,                  // *Test.kt (Kotlin)
  /\/src\/test\//,              // src/test/ (Maven/Gradle標準)

  // 共通ディレクトリパターン
  /\/test\//,                   // test/ ディレクトリ
  /\/tests\//,                  // tests/ ディレクトリ
  /\/spec\//,                   // spec/ ディレクトリ (RSpec等)
];

// PRタイプを判定するキーワード
export const PR_TYPE_KEYWORDS = {
  refactoring: [
    'refactor', 'リファクタ', 'リファクタリング',
    'cleanup', 'clean up', 'クリーンアップ',
    'tech debt', 'technical debt', '技術的負債',
    'improve', '改善',
    'reorganize', '整理',
    'rename', 'リネーム',
    'extract', '抽出',
    'simplify', '簡略化',
    'optimize', '最適化',
    'chore',
  ],
  bugfix: [
    'fix', 'bug', 'バグ', '修正',
    'hotfix', 'patch',
    'issue', 'error', 'エラー',
    'resolve', '解決',
    'correct', '訂正',
  ],
  feature: [
    'feat', 'feature', '機能',
    'add', '追加',
    'implement', '実装',
    'new', '新規',
    'create', '作成',
    'support', 'サポート',
  ],
};

// Conventional Commits のプレフィックスパターン
export const CONVENTIONAL_COMMIT_PATTERNS = {
  refactoring: /^(refactor|chore|style|perf)(\(.+\))?:/i,
  bugfix: /^(fix|hotfix)(\(.+\))?:/i,
  feature: /^(feat|feature)(\(.+\))?:/i,
};

// PRラベルによる判定（小文字で比較）
export const PR_LABEL_MAPPINGS = {
  refactoring: [
    'refactor', 'refactoring',
    'tech-debt', 'tech debt', 'technical-debt', 'technical debt',
    'chore', 'maintenance',
    'cleanup', 'clean-up',
    'improvement', 'improvements',
    'optimization', 'performance',
  ],
  bugfix: [
    'bug', 'bugfix', 'bug-fix',
    'fix', 'hotfix', 'hot-fix',
    'patch', 'issue',
  ],
  feature: [
    'feature', 'feat',
    'enhancement', 'new-feature', 'new feature',
    'addition',
  ],
};

export function detectPrType(
  title: string,
  labels: string[] = []
): 'feature' | 'bugfix' | 'refactoring' | 'other' {
  // 1. Conventional Commits プレフィックスをチェック（最優先）
  if (CONVENTIONAL_COMMIT_PATTERNS.refactoring.test(title)) {
    return 'refactoring';
  }
  if (CONVENTIONAL_COMMIT_PATTERNS.bugfix.test(title)) {
    return 'bugfix';
  }
  if (CONVENTIONAL_COMMIT_PATTERNS.feature.test(title)) {
    return 'feature';
  }

  // 2. PRラベルをチェック
  const lowerLabels = labels.map(l => l.toLowerCase());

  for (const labelPattern of PR_LABEL_MAPPINGS.refactoring) {
    if (lowerLabels.some(l => l.includes(labelPattern))) {
      return 'refactoring';
    }
  }
  for (const labelPattern of PR_LABEL_MAPPINGS.bugfix) {
    if (lowerLabels.some(l => l.includes(labelPattern))) {
      return 'bugfix';
    }
  }
  for (const labelPattern of PR_LABEL_MAPPINGS.feature) {
    if (lowerLabels.some(l => l.includes(labelPattern))) {
      return 'feature';
    }
  }

  // 3. タイトルのキーワードマッチング（フォールバック）
  const lowerTitle = title.toLowerCase();

  // リファクタリングを最優先でチェック
  for (const keyword of PR_TYPE_KEYWORDS.refactoring) {
    if (lowerTitle.includes(keyword.toLowerCase())) {
      return 'refactoring';
    }
  }

  // バグ修正
  for (const keyword of PR_TYPE_KEYWORDS.bugfix) {
    if (lowerTitle.includes(keyword.toLowerCase())) {
      return 'bugfix';
    }
  }

  // 機能追加
  for (const keyword of PR_TYPE_KEYWORDS.feature) {
    if (lowerTitle.includes(keyword.toLowerCase())) {
      return 'feature';
    }
  }

  return 'other';
}

export function calculateSustainabilityScore(
  testRate: number,
  ciSuccessRate: number,
  refactoringRate: number
): number {
  // テスト文化 (40点満点)
  const testScore = Math.min(40, testRate * 50);

  // CI健全性 (30点満点)
  const ciScore = Math.min(30, ciSuccessRate * 35);

  // リファクタリング姿勢 (30点満点)
  // 10-20%が理想的
  let refactorScore = 0;
  if (refactoringRate >= 0.1 && refactoringRate <= 0.25) {
    refactorScore = 30;
  } else if (refactoringRate >= 0.05) {
    refactorScore = 20;
  } else if (refactoringRate > 0) {
    refactorScore = 10;
  }

  return Math.round(testScore + ciScore + refactorScore);
}

export function getSustainabilityGrade(score: number): 'A' | 'B' | 'C' | 'D' | 'F' {
  if (score >= 80) return 'A';
  if (score >= 65) return 'B';
  if (score >= 50) return 'C';
  if (score >= 35) return 'D';
  return 'F';
}

export function determineOrientation(
  testRate: number,
  refactoringRate: number
): { orientation: 'long-term' | 'short-term' | 'balanced'; label: string } {
  if (testRate >= 0.6 && refactoringRate >= 0.1) {
    return { orientation: 'long-term', label: '長期保守重視（理想的）' };
  } else if (testRate < 0.3 && refactoringRate < 0.05) {
    return { orientation: 'short-term', label: '短期成果重視（要改善）' };
  } else {
    return { orientation: 'balanced', label: 'バランス型' };
  }
}