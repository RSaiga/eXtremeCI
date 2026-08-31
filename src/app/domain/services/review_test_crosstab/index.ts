import { prDataCache, PrDetailData } from '../../../infra/github/pr_data'
import { RepoRef } from '../../../shared/repos/config'
import { isExcludedReviewer } from '../../../shared/excluded_reviewers'
import { classifyPr, MergeCategory } from '../../../shared/pr_classification'
import { fetchPrFiles, isTestFile } from '../quality_sustainability/quality_sustainability_service'

// レビュー無しでマージされた PR が、実際にテストで担保されているかを PR 単位で突き合わせる。
// 「ノーレビューマージ ≒ テスト担保型 Ship/Show/Ask」という解釈を、集計指標ではなく
// レビュー×テストのクロス集計で検証できるようにするための分析。

const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000

export interface UnsafeImplPr {
  number: number
  repo: string
  author: string
  title: string
  url: string
  productionLines: number
  mergedAt: string | null
}

export interface ReviewTestCrosstab {
  noReviewMergedCount: number
  withTests: number
  withoutTests: number
  // withTests / noReviewMergedCount
  testCoverageRatio: number
  // ノーレビュー かつ テスト無し の中でのカテゴリ別内訳
  testlessCategoryCounts: Record<MergeCategory, number>

  // --- テスト対象を「実装PR かつ 空差分でない」に絞った指標 ---
  // 依存更新・release・revert・merge統合・format/lint・chore・bump（テストが無くて当然の変更）と
  // 空差分の再マージを除外した、テストが期待される実装マージだけの母数と担保率。
  implMergedCount: number
  implWithTests: number
  // == unsafeImplPrs.length（テストが期待されるのにレビューもテストも無い実装マージ）
  implWithoutTests: number
  // implWithTests / implMergedCount
  implTestCoverageRatio: number

  // ノーレビュー かつ テスト無し かつ 実装PR かつ 空差分でない（＝真に無担保な実装マージ）
  unsafeImplPrs: UnsafeImplPr[]
}

// buildReviewTimes と同一の hasReview 判定（PENDING/除外レビュアーを除いた有効レビューが1件でもあるか）
function hasReview(pr: PrDetailData): boolean {
  return (
    pr.reviews.filter((r) => r.state !== 'PENDING' && r.submitted_at).filter((r) => !isExcludedReviewer(r.user?.login))
      .length > 0
  )
}

const classify = (pr: PrDetailData): MergeCategory => classifyPr({ title: pr.title, authorLogin: pr.user?.login })

const EMPTY_CATEGORY_COUNTS = (): Record<MergeCategory, number> => ({
  impl: 0,
  dep: 0,
  release: 0,
  revert: 0,
  merge: 0,
  format: 0,
  chore: 0,
  bump: 0,
})

interface CrosstabRow {
  pr: PrDetailData
  repo: string
  hasTests: boolean
  productionLines: number
  fileCount: number
  category: MergeCategory
}

export async function analyzeReviewTestCrosstab(repos: RepoRef[]): Promise<ReviewTestCrosstab> {
  const cutoff = Date.now() - NINETY_DAYS_MS

  const perRepo = await Promise.all(
    repos.map(async ({ owner, repo }) => {
      const closedPrs = await prDataCache.getClosedPrs(owner, repo)
      // buildReviewTimes と同一スコープ（created_at が90日以内）でマージ済み・レビュー無しを抽出
      const noReviewMerged = closedPrs.filter(
        (pr) => pr.merged_at != null && new Date(pr.created_at).getTime() >= cutoff && !hasReview(pr),
      )

      const rows: CrosstabRow[] = await Promise.all(
        noReviewMerged.map(async (pr) => {
          const files = await fetchPrFiles(owner, repo, pr.number)
          let productionLines = 0
          let hasTests = false
          for (const f of files) {
            const churn = f.additions + f.deletions
            if (isTestFile(f.filename)) {
              hasTests = true
            } else {
              productionLines += churn
            }
          }
          return { pr, repo, hasTests, productionLines, fileCount: files.length, category: classify(pr) }
        }),
      )
      return rows
    }),
  )

  const rows = perRepo.flat()
  const withTests = rows.filter((r) => r.hasTests).length
  const testless = rows.filter((r) => !r.hasTests)

  const testlessCategoryCounts = EMPTY_CATEGORY_COUNTS()
  for (const r of testless) {
    testlessCategoryCounts[r.category] += 1
  }

  // テストが期待される実装マージ（空差分は除外）だけに絞る
  const implReal = rows.filter((r) => r.category === 'impl' && r.fileCount > 0)
  const implWithTests = implReal.filter((r) => r.hasTests).length

  const unsafeImplPrs: UnsafeImplPr[] = implReal
    .filter((r) => !r.hasTests)
    .sort((a, b) => b.productionLines - a.productionLines)
    .map((r) => ({
      number: r.pr.number,
      repo: r.repo,
      author: r.pr.user?.login || 'unknown',
      title: r.pr.title,
      url: r.pr.html_url,
      productionLines: r.productionLines,
      mergedAt: r.pr.merged_at,
    }))

  return {
    noReviewMergedCount: rows.length,
    withTests,
    withoutTests: testless.length,
    testCoverageRatio: rows.length > 0 ? withTests / rows.length : 0,
    testlessCategoryCounts,
    implMergedCount: implReal.length,
    implWithTests,
    implWithoutTests: unsafeImplPrs.length,
    implTestCoverageRatio: implReal.length > 0 ? implWithTests / implReal.length : 0,
    unsafeImplPrs,
  }
}
