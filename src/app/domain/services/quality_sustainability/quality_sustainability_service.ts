import { octokit } from '../../../shared/octokit'
import { prDataCache, PrDetailData } from '../../../infra/github/pr_data'
import { RepoRef } from '../../../shared/repos/config'
import {
  QualitySustainabilityMetrics,
  TestCodeMetrics,
  CIMetrics,
  RefactoringMetrics,
  PrWithQualityInfo,
  WeeklyTestData,
  WeeklyCIData,
  WeeklyRefactoringData,
  TEST_FILE_PATTERNS,
  detectPrType,
  hasInlineRefactorCommit,
  calculateSustainabilityScore,
  getSustainabilityGrade,
  determineOrientation,
  determineFlowHealth,
} from '../../models/quality_sustainability/quality_sustainability'

// ファイル一覧のキャッシュ（repo単位でキー化）
const prFilesCache = new Map<string, string[]>()

function getWeekStart(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  d.setDate(diff)
  d.setHours(0, 0, 0, 0)
  return d
}

function formatWeekLabel(weekStart: Date): string {
  const month = weekStart.getMonth() + 1
  const day = weekStart.getDate()
  return `${month}/${day}週`
}

function loadExtraTestPatterns(): RegExp[] {
  const env = (process.env as Record<string, string | undefined>).VITE_TEST_FILE_PATTERNS || ''
  return env
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((src) => {
      try {
        return new RegExp(src)
      } catch (e) {
        console.warn(`Invalid VITE_TEST_FILE_PATTERNS entry: ${src}`, e)
        return null
      }
    })
    .filter((r): r is RegExp => r !== null)
}

const EXTRA_TEST_PATTERNS = loadExtraTestPatterns()
const ALL_TEST_PATTERNS = [...TEST_FILE_PATTERNS, ...EXTRA_TEST_PATTERNS]

function isTestFile(filename: string): boolean {
  return ALL_TEST_PATTERNS.some((pattern) => pattern.test(filename))
}

async function fetchPrFiles(owner: string, repo: string, prNumber: number): Promise<string[]> {
  const cacheKey = `${owner}/${repo}#${prNumber}`
  // キャッシュチェック
  if (prFilesCache.has(cacheKey)) {
    return prFilesCache.get(cacheKey)!
  }

  try {
    const response = await octokit.rest.pulls.listFiles({
      owner,
      repo,
      pull_number: prNumber,
      per_page: 100,
    })

    const files = response.data.map((f: { filename: string }) => f.filename)
    prFilesCache.set(cacheKey, files)
    return files
  } catch (e) {
    console.error(`Failed to fetch files for PR #${prNumber}:`, e)
    return []
  }
}

export interface DateRange {
  from: Date
  to: Date
}

function inRange(d: Date, range?: DateRange): boolean {
  if (!range) return true
  const t = d.getTime()
  return t >= range.from.getTime() && t < range.to.getTime()
}

export async function analyzeQualitySustainability(
  repos: RepoRef[],
  dateRange?: DateRange,
): Promise<QualitySustainabilityMetrics> {
  // 各リポジトリから並列取得してマージ
  const perRepo = await Promise.all(
    repos.map(async ({ owner, repo }) => {
      const closedPrs = await prDataCache.getClosedPrs(owner, repo)
      const mergedForRepo = closedPrs.filter((pr) => pr.merged_at && inRange(new Date(pr.merged_at), dateRange))
      const qualityInfo = await collectPrQualityInfo(owner, repo, mergedForRepo.slice(0, 30))
      return { mergedForRepo, qualityInfo }
    }),
  )
  const mergedPrs = perRepo.flatMap((p) => p.mergedForRepo)
  const prsWithQualityInfo = perRepo.flatMap((p) => p.qualityInfo)

  // テストメトリクス
  const testMetrics = analyzeTestMetrics(prsWithQualityInfo)

  // CIメトリクス（GraphQLで取得済み）
  const ciMetrics = analyzeCIMetrics(mergedPrs)

  // リファクタリングメトリクス
  const refactoringMetrics = analyzeRefactoringMetrics(mergedPrs)

  // 総合評価
  const sustainabilityScore = calculateSustainabilityScore(
    testMetrics.testInclusionRate,
    ciMetrics.successRate,
    refactoringMetrics.inlineRefactorRate,
    refactoringMetrics.standalonePrRate,
  )

  const sustainabilityGrade = getSustainabilityGrade(sustainabilityScore)

  const { orientation, label: orientationLabel } = determineOrientation(
    testMetrics.testInclusionRate,
    refactoringMetrics.inlineRefactorRate,
  )

  return {
    testMetrics,
    ciMetrics,
    refactoringMetrics,
    sustainabilityScore,
    sustainabilityGrade,
    orientation,
    orientationLabel,
  }
}

async function collectPrQualityInfo(owner: string, repo: string, prs: PrDetailData[]): Promise<PrWithQualityInfo[]> {
  // ファイル一覧をREST APIで並列取得
  const filesPromises = prs.map((pr) => fetchPrFiles(owner, repo, pr.number))
  const allFiles = await Promise.all(filesPromises)

  return prs.map((pr, index) => {
    const files = allFiles[index]
    const hasTests = files.some((f) => isTestFile(f))
    const prType = detectPrType(pr.title, pr.labels)
    const inlineRefactor = hasInlineRefactorCommit(pr.commitHeadlines)

    return {
      number: pr.number,
      title: pr.title,
      author: pr.user?.login || 'unknown',
      createdAt: new Date(pr.created_at),
      mergedAt: pr.merged_at ? new Date(pr.merged_at) : null,
      hasTests,
      prType,
      ciStatus: pr.ciStatus,
      hasInlineRefactor: inlineRefactor,
    }
  })
}

function analyzeTestMetrics(prsWithInfo: PrWithQualityInfo[]): TestCodeMetrics {
  const prsWithTests = prsWithInfo.filter((pr) => pr.hasTests).length
  const prsWithoutTests = prsWithInfo.length - prsWithTests
  const testInclusionRate = prsWithInfo.length > 0 ? prsWithTests / prsWithInfo.length : 0

  // 著者別のテスト状況
  const authorTestMap = new Map<string, { with: number; without: number }>()
  for (const pr of prsWithInfo) {
    const current = authorTestMap.get(pr.author) || { with: 0, without: 0 }
    if (pr.hasTests) {
      current.with++
    } else {
      current.without++
    }
    authorTestMap.set(pr.author, current)
  }

  let authorsWithTests = 0
  let authorsWithoutTests = 0
  for (const [, stats] of authorTestMap) {
    if (stats.with > 0) {
      authorsWithTests++
    } else {
      authorsWithoutTests++
    }
  }

  const authorTestRate = authorTestMap.size > 0 ? authorsWithTests / authorTestMap.size : 0

  // 週次トレンド（ファイルベース · prsWithInfo の hasTests を利用）
  const weeklyTrend = calculateWeeklyTestTrend(prsWithInfo)

  // テスト文化の評価
  let testCulture: 'strong' | 'moderate' | 'weak' | 'none'
  let testCultureLabel: string

  if (testInclusionRate >= 0.7) {
    testCulture = 'strong'
    testCultureLabel = '強い（テスト必須の文化）'
  } else if (testInclusionRate >= 0.4) {
    testCulture = 'moderate'
    testCultureLabel = '中程度（テストを書く意識あり）'
  } else if (testInclusionRate > 0) {
    testCulture = 'weak'
    testCultureLabel = '弱い（テストが少ない）'
  } else {
    testCulture = 'none'
    testCultureLabel = 'なし（テストがほぼない）'
  }

  return {
    prsWithTests,
    prsWithoutTests,
    testInclusionRate,
    weeklyTestTrend: weeklyTrend,
    authorsWithTests,
    authorsWithoutTests,
    authorTestRate,
    testCulture,
    testCultureLabel,
  }
}

function calculateWeeklyTestTrend(prsWithInfo: PrWithQualityInfo[]): WeeklyTestData[] {
  const weekMap = new Map<string, { total: number; withTests: number }>()

  for (const pr of prsWithInfo) {
    if (!pr.mergedAt) continue

    const weekStart = getWeekStart(pr.mergedAt)
    const key = weekStart.toISOString()
    const current = weekMap.get(key) || { total: 0, withTests: 0 }

    current.total++
    if (pr.hasTests) {
      current.withTests++
    }

    weekMap.set(key, current)
  }

  const results: WeeklyTestData[] = []
  for (const [weekKey, data] of weekMap) {
    results.push({
      weekStart: new Date(weekKey),
      weekLabel: formatWeekLabel(new Date(weekKey)),
      totalPrs: data.total,
      prsWithTests: data.withTests,
      testRate: data.total > 0 ? data.withTests / data.total : 0,
    })
  }

  return results.sort((a, b) => a.weekStart.getTime() - b.weekStart.getTime())
}

function parseIgnoredChecks(): Set<string> {
  const env = (process.env as Record<string, string | undefined>).VITE_CI_IGNORE_CHECKS || ''
  return new Set(
    env
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
  )
}

function analyzeCIMetrics(prs: PrDetailData[]): CIMetrics {
  const ignoredChecks = parseIgnoredChecks()
  const ignoredList = Array.from(ignoredChecks)

  // GraphQLで取得済みのciStatusを使用（API呼び出し不要）
  let successfulChecks = 0
  let failedChecks = 0
  // pendingChecks は現在未使用だがカウントのみ保持
  let totalChecks = 0
  const failingPrs: { number: number; title: string; url: string; failingChecks: string[] }[] = []

  const weeklyData = new Map<string, { total: number; success: number }>()

  for (const pr of prs) {
    if (pr.ciStatus === 'unknown') continue

    // 失敗 PR について、無視リストを除いた失敗チェックを算出
    let effectiveStatus = pr.ciStatus
    let remainingFailing: string[] = []
    if (pr.ciStatus === 'failure') {
      remainingFailing = pr.ciFailingChecks.filter((c) => !ignoredChecks.has(c))
      if (remainingFailing.length === 0 && pr.ciFailingChecks.length > 0) {
        // 失敗が全て無視リストに含まれる → 成功扱い
        effectiveStatus = 'success'
      }
    }

    totalChecks++
    if (effectiveStatus === 'success') {
      successfulChecks++
    } else if (effectiveStatus === 'failure') {
      failedChecks++
      failingPrs.push({
        number: pr.number,
        title: pr.title,
        url: pr.html_url,
        failingChecks: remainingFailing,
      })
    } else if (effectiveStatus === 'pending') {
      // pending (not counted)
    }

    // 週次データ
    if (pr.merged_at) {
      const weekStart = getWeekStart(new Date(pr.merged_at))
      const key = weekStart.toISOString()
      const current = weeklyData.get(key) || { total: 0, success: 0 }
      current.total++
      if (effectiveStatus === 'success') {
        current.success++
      }
      weeklyData.set(key, current)
    }
  }

  const successRate = totalChecks > 0 ? successfulChecks / totalChecks : 0

  // 週次トレンド
  const weeklyTrend: WeeklyCIData[] = []
  for (const [weekKey, data] of weeklyData) {
    weeklyTrend.push({
      weekStart: new Date(weekKey),
      weekLabel: formatWeekLabel(new Date(weekKey)),
      totalChecks: data.total,
      successRate: data.total > 0 ? data.success / data.total : 0,
    })
  }
  weeklyTrend.sort((a, b) => a.weekStart.getTime() - b.weekStart.getTime())

  // CI健全性の評価
  let ciHealth: 'excellent' | 'good' | 'needs-improvement' | 'critical'
  let ciHealthLabel: string

  if (successRate >= 0.9) {
    ciHealth = 'excellent'
    ciHealthLabel = '優秀（90%以上成功）'
  } else if (successRate >= 0.75) {
    ciHealth = 'good'
    ciHealthLabel = '良好（75%以上成功）'
  } else if (successRate >= 0.5) {
    ciHealth = 'needs-improvement'
    ciHealthLabel = '要改善（50-75%成功）'
  } else {
    ciHealth = 'critical'
    ciHealthLabel = '深刻（50%未満）'
  }

  return {
    totalChecks,
    successfulChecks,
    failedChecks,
    successRate,
    avgFixTime: null,
    weeklyTrend,
    failingPrs,
    ignoredChecks: ignoredList,
    ciHealth,
    ciHealthLabel,
  }
}

function analyzeRefactoringMetrics(prs: PrDetailData[]): RefactoringMetrics {
  let refactoringPrs = 0
  let featurePrs = 0
  let bugfixPrs = 0
  let otherPrs = 0
  let inlineRefactorPrs = 0
  let featFixPrsEligible = 0
  const otherPrSamples: RefactoringMetrics['otherPrSamples'] = []

  const weeklyData = new Map<string, { total: number; standalone: number; inline: number; eligible: number }>()

  for (const pr of prs) {
    const prType = detectPrType(pr.title, pr.labels)
    const inlineRefactor = hasInlineRefactorCommit(pr.commitHeadlines)

    switch (prType) {
      case 'refactoring':
        refactoringPrs++
        break
      case 'feature':
        featurePrs++
        break
      case 'bugfix':
        bugfixPrs++
        break
      default:
        otherPrs++
        otherPrSamples.push({
          number: pr.number,
          title: pr.title,
          author: pr.user?.login || 'unknown',
          url: pr.html_url,
        })
    }

    // 継続的リファクタ率の対象: refactoring タイプ以外のすべて（feat/fix/other）
    const isEligible = prType !== 'refactoring'
    if (isEligible) {
      featFixPrsEligible++
      if (inlineRefactor) inlineRefactorPrs++
    }

    // 週次データ
    if (pr.merged_at) {
      const weekStart = getWeekStart(new Date(pr.merged_at))
      const key = weekStart.toISOString()
      const current = weeklyData.get(key) || { total: 0, standalone: 0, inline: 0, eligible: 0 }
      current.total++
      if (prType === 'refactoring') current.standalone++
      if (isEligible) {
        current.eligible++
        if (inlineRefactor) current.inline++
      }
      weeklyData.set(key, current)
    }
  }

  const totalPrs = prs.length
  const standalonePrRate = totalPrs > 0 ? refactoringPrs / totalPrs : 0
  const inlineRefactorRate = featFixPrsEligible > 0 ? inlineRefactorPrs / featFixPrsEligible : 0

  // 週次トレンド
  const weeklyTrend: WeeklyRefactoringData[] = []
  for (const [weekKey, data] of weeklyData) {
    weeklyTrend.push({
      weekStart: new Date(weekKey),
      weekLabel: formatWeekLabel(new Date(weekKey)),
      totalPrs: data.total,
      inlineRefactorPrs: data.inline,
      standalonePrs: data.standalone,
      inlineRate: data.eligible > 0 ? data.inline / data.eligible : 0,
      standaloneRate: data.total > 0 ? data.standalone / data.total : 0,
    })
  }
  weeklyTrend.sort((a, b) => a.weekStart.getTime() - b.weekStart.getTime())

  const { flowHealth, label: flowHealthLabel } = determineFlowHealth(inlineRefactorRate, standalonePrRate)

  return {
    refactoringPrs,
    featurePrs,
    bugfixPrs,
    otherPrs,
    otherPrSamples,
    totalPrs,
    inlineRefactorPrs,
    featFixPrsEligible,
    inlineRefactorRate,
    standalonePrRate,
    weeklyTrend,
    flowHealth,
    flowHealthLabel,
  }
}
