// 品質と持続性のドメインモデル

export interface QualitySustainabilityMetrics {
  // テストコード関連
  testMetrics: TestCodeMetrics

  // CI関連
  ciMetrics: CIMetrics

  // リファクタリング関連
  refactoringMetrics: RefactoringMetrics

  // 総合評価
  sustainabilityScore: number
  sustainabilityGrade: 'A' | 'B' | 'C' | 'D' | 'F'
  orientation: 'long-term' | 'short-term' | 'balanced'
  orientationLabel: string
}

export interface TestCodeMetrics {
  // PRにテストが含まれる割合
  prsWithTests: number
  prsWithoutTests: number
  testInclusionRate: number

  // テストファイルの変更トレンド
  weeklyTestTrend: WeeklyTestData[]

  // テストを書く人の割合
  authorsWithTests: number
  authorsWithoutTests: number
  authorTestRate: number

  // 評価
  testCulture: 'strong' | 'moderate' | 'weak' | 'none'
  testCultureLabel: string
}

export interface WeeklyTestData {
  weekStart: Date
  weekLabel: string
  totalPrs: number
  prsWithTests: number
  testRate: number
}

export interface CIFailingPr {
  number: number
  title: string
  url: string
  failingChecks: string[]
}

export interface CIMetrics {
  // CI結果
  totalChecks: number
  successfulChecks: number
  failedChecks: number
  successRate: number

  // 失敗からの復旧
  avgFixTime: number | null // 時間

  // 週次トレンド
  weeklyTrend: WeeklyCIData[]

  // 失敗した PR の詳細（失敗理由表示用）
  failingPrs: CIFailingPr[]

  // 除外されたチェック名（表示用）
  ignoredChecks: string[]

  // 評価
  ciHealth: 'excellent' | 'good' | 'needs-improvement' | 'critical'
  ciHealthLabel: string
}

export interface WeeklyCIData {
  weekStart: Date
  weekLabel: string
  totalChecks: number
  successRate: number
}

export interface OtherPrSample {
  number: number
  title: string
  author: string
  url: string
}

export interface RefactoringMetrics {
  // PR種別内訳（参考）
  refactoringPrs: number // タイトル基準で refactor 系のPR（切り出しリファクタ）
  featurePrs: number
  bugfixPrs: number
  otherPrs: number
  otherPrSamples: OtherPrSample[] // other に分類されたPRの一覧（分析用）
  totalPrs: number

  // 継続的リファクタ指標
  // feat/fix PR のうち commit に refactor 系が混在しているもの
  inlineRefactorPrs: number
  featFixPrsEligible: number // inline 率の分母
  inlineRefactorRate: number // inlineRefactorPrs / featFixPrsEligible

  // 切り出しリファクタ率（= 従来の refactoringRate · 逆解釈）
  standalonePrRate: number

  // 週次トレンド
  weeklyTrend: WeeklyRefactoringData[]

  // フロー健全性評価（inline と standalone の組み合わせ）
  flowHealth: 'continuous' | 'mixed' | 'fragmented'
  flowHealthLabel: string
}

export interface WeeklyRefactoringData {
  weekStart: Date
  weekLabel: string
  totalPrs: number
  inlineRefactorPrs: number
  standalonePrs: number
  inlineRate: number
  standaloneRate: number
}

export interface PrWithQualityInfo {
  number: number
  title: string
  author: string
  createdAt: Date
  mergedAt: Date | null
  hasTests: boolean
  prType: 'feature' | 'bugfix' | 'refactoring' | 'other'
  ciStatus: 'success' | 'failure' | 'pending' | 'unknown'
  hasInlineRefactor: boolean
}

// 継続的リファクタ検知用のキーワード（Conventional Commits 非採用チーム向けフォールバック）
// 誤検知を抑えるため「強いシグナル」だけに絞っている。
// detectPrType の PR_TYPE_KEYWORDS とは別配列。
const INLINE_REFACTOR_KEYWORDS = [
  'リファクタ',
  'リファクタリング',
  'refactor',
  'cleanup',
  'clean up',
  'クリーンアップ',
  '技術的負債',
  'tech debt',
  'technical debt',
  'extract ', // 末尾スペースで extractor 等を避ける
  'rename ',
  'simplify ',
  '整理',
  '抽出',
  'リネーム',
] as const

// コミットメッセージに refactor の意図が含まれているか
// 1. Conventional Commits プレフィックス（refactor/style/perf）を最優先で判定
// 2. 上記で拾えない場合はキーワード部分一致にフォールバック（CC 非採用チーム対応）
export function hasInlineRefactorCommit(commitHeadlines: string[]): boolean {
  const ccPattern = /^(refactor|style|perf)(\(.+\))?:/i

  return commitHeadlines.some((h) => {
    if (ccPattern.test(h)) return true

    // feat: や fix: で始まるコミットは CC の意図通り feat/fix なのでキーワード判定から除外
    // （例: "feat: rename getUserById" を refactor 扱いしない）
    if (/^(feat|feature|fix|hotfix|bugfix|chore|docs|test|build|ci)(\(.+\))?:/i.test(h)) {
      return false
    }

    const lower = h.toLowerCase()
    return INLINE_REFACTOR_KEYWORDS.some((kw) => lower.includes(kw.toLowerCase()))
  })
}

// テストファイルを判定するパターン
export const TEST_FILE_PATTERNS = [
  // JavaScript / TypeScript
  /\.test\.[jt]sx?$/, // *.test.js, *.test.ts, *.test.tsx
  /\.spec\.[jt]sx?$/, // *.spec.js, *.spec.ts
  /_test\.[jt]sx?$/, // *_test.js, *_test.ts
  /_spec\.[jt]sx?$/, // *_spec.js, *_spec.ts
  /\/__tests__\//, // __tests__/ ディレクトリ (Jest)

  // PHP
  /Test\.php$/, // *Test.php (PHPUnit)
  /\.test\.php$/i, // *.test.php
  /\/tests\/.*\.php$/, // tests/*.php

  // Python
  /test_.*\.py$/, // test_*.py (pytest)
  /_test\.py$/, // *_test.py (pytest)
  /tests\.py$/, // tests.py
  /\/tests\/.*\.py$/, // tests/*.py
  /\/test\/.*\.py$/, // test/*.py

  // Rust
  /\/tests\/.*\.rs$/, // tests/*.rs (integration tests)
  /_test\.rs$/, // *_test.rs
  /\/src\/.*tests\.rs$/, // src/**/tests.rs (unit tests module)
  /#\[cfg\(test\)\]/, // #[cfg(test)] (inline tests) - ファイル名では判定できない

  // Go
  /_test\.go$/, // *_test.go (Go標準)
  /\/testdata\//, // testdata/ ディレクトリ

  // Java / Kotlin
  /Test\.java$/, // *Test.java (JUnit)
  /Tests\.java$/, // *Tests.java
  /TestCase\.java$/, // *TestCase.java
  /IT\.java$/, // *IT.java (Integration Test)
  /Test\.kt$/, // *Test.kt (Kotlin)
  /\/src\/test\//, // src/test/ (Maven/Gradle標準)

  // 共通ディレクトリパターン
  /\/test\//, // test/ ディレクトリ
  /\/tests\//, // tests/ ディレクトリ
  /\/spec\//, // spec/ ディレクトリ (RSpec等)
]

// PRタイプを判定するキーワード
export const PR_TYPE_KEYWORDS = {
  refactoring: [
    'refactor',
    'リファクタ',
    'リファクタリング',
    'cleanup',
    'clean up',
    'クリーンアップ',
    'tech debt',
    'technical debt',
    '技術的負債',
    'improve',
    '改善',
    'reorganize',
    '整理',
    'rename',
    'リネーム',
    'extract',
    '抽出',
    'simplify',
    '簡略化',
    'optimize',
    '最適化',
    'chore',
  ],
  bugfix: [
    'fix',
    'bug',
    'バグ',
    '修正',
    'hotfix',
    'patch',
    'issue',
    'error',
    'エラー',
    'resolve',
    '解決',
    'correct',
    '訂正',
  ],
  feature: [
    'feat',
    'feature',
    '機能',
    'add',
    '追加',
    'implement',
    '実装',
    'new',
    '新規',
    'create',
    '作成',
    'support',
    'サポート',
  ],
}

// Conventional Commits のプレフィックスパターン
export const CONVENTIONAL_COMMIT_PATTERNS = {
  refactoring: /^(refactor|chore|style|perf)(\(.+\))?:/i,
  bugfix: /^(fix|hotfix)(\(.+\))?:/i,
  feature: /^(feat|feature)(\(.+\))?:/i,
}

// PRラベルによる判定（小文字で比較）
export const PR_LABEL_MAPPINGS = {
  refactoring: [
    'refactor',
    'refactoring',
    'tech-debt',
    'tech debt',
    'technical-debt',
    'technical debt',
    'chore',
    'maintenance',
    'cleanup',
    'clean-up',
    'improvement',
    'improvements',
    'optimization',
    'performance',
  ],
  bugfix: ['bug', 'bugfix', 'bug-fix', 'fix', 'hotfix', 'hot-fix', 'patch', 'issue'],
  feature: ['feature', 'feat', 'enhancement', 'new-feature', 'new feature', 'addition'],
}

export function detectPrType(title: string, labels: string[] = []): 'feature' | 'bugfix' | 'refactoring' | 'other' {
  // 1. Conventional Commits プレフィックスをチェック（最優先）
  if (CONVENTIONAL_COMMIT_PATTERNS.refactoring.test(title)) {
    return 'refactoring'
  }
  if (CONVENTIONAL_COMMIT_PATTERNS.bugfix.test(title)) {
    return 'bugfix'
  }
  if (CONVENTIONAL_COMMIT_PATTERNS.feature.test(title)) {
    return 'feature'
  }

  // 2. PRラベルをチェック
  const lowerLabels = labels.map((l) => l.toLowerCase())

  for (const labelPattern of PR_LABEL_MAPPINGS.refactoring) {
    if (lowerLabels.some((l) => l.includes(labelPattern))) {
      return 'refactoring'
    }
  }
  for (const labelPattern of PR_LABEL_MAPPINGS.bugfix) {
    if (lowerLabels.some((l) => l.includes(labelPattern))) {
      return 'bugfix'
    }
  }
  for (const labelPattern of PR_LABEL_MAPPINGS.feature) {
    if (lowerLabels.some((l) => l.includes(labelPattern))) {
      return 'feature'
    }
  }

  // 3. タイトルのキーワードマッチング（フォールバック）
  const lowerTitle = title.toLowerCase()

  // リファクタリングを最優先でチェック
  for (const keyword of PR_TYPE_KEYWORDS.refactoring) {
    if (lowerTitle.includes(keyword.toLowerCase())) {
      return 'refactoring'
    }
  }

  // バグ修正
  for (const keyword of PR_TYPE_KEYWORDS.bugfix) {
    if (lowerTitle.includes(keyword.toLowerCase())) {
      return 'bugfix'
    }
  }

  // 機能追加
  for (const keyword of PR_TYPE_KEYWORDS.feature) {
    if (lowerTitle.includes(keyword.toLowerCase())) {
      return 'feature'
    }
  }

  return 'other'
}

export function calculateSustainabilityScore(
  testRate: number,
  ciSuccessRate: number,
  inlineRefactorRate: number,
  standalonePrRate: number = 0,
): number {
  // テスト文化 (40点満点)
  const testScore = Math.min(40, testRate * 50)

  // CI健全性 (30点満点)
  const ciScore = Math.min(30, ciSuccessRate * 35)

  // 継続的リファクタ (25点満点)
  // feat/fix PRのコミットに refactor が混在している割合
  let inlineScore = 0
  if (inlineRefactorRate >= 0.3) {
    inlineScore = 25
  } else if (inlineRefactorRate >= 0.15) {
    inlineScore = 18
  } else if (inlineRefactorRate >= 0.05) {
    inlineScore = 10
  }

  // 切り出しリファクタ (5点満点、ペナルティ方式)
  // 多すぎると流れ分断のサイン
  let standaloneScore = 5
  if (standalonePrRate >= 0.15) {
    standaloneScore = 0
  } else if (standalonePrRate >= 0.08) {
    standaloneScore = 2
  }

  return Math.round(testScore + ciScore + inlineScore + standaloneScore)
}

export function getSustainabilityGrade(score: number): 'A' | 'B' | 'C' | 'D' | 'F' {
  if (score >= 80) return 'A'
  if (score >= 65) return 'B'
  if (score >= 50) return 'C'
  if (score >= 35) return 'D'
  return 'F'
}

export function determineOrientation(
  testRate: number,
  inlineRefactorRate: number,
): { orientation: 'long-term' | 'short-term' | 'balanced'; label: string } {
  if (testRate >= 0.6 && inlineRefactorRate >= 0.15) {
    return { orientation: 'long-term', label: '長期保守重視（理想的）' }
  }
  if (testRate < 0.3 && inlineRefactorRate < 0.05) {
    return { orientation: 'short-term', label: '短期成果重視（要改善）' }
  }
  return { orientation: 'balanced', label: 'バランス型' }
}

export function determineFlowHealth(
  inlineRefactorRate: number,
  standalonePrRate: number,
): { flowHealth: 'continuous' | 'mixed' | 'fragmented'; label: string } {
  if (inlineRefactorRate >= 0.2 && standalonePrRate < 0.1) {
    return {
      flowHealth: 'continuous',
      label: '継続的リファクタ型（日常の流れの中で掃除している）',
    }
  }
  if (standalonePrRate >= 0.15) {
    return {
      flowHealth: 'fragmented',
      label: '切り出し型（リファクタが独立タスク化・フロー分断の疑い）',
    }
  }
  return { flowHealth: 'mixed', label: '混合型' }
}
