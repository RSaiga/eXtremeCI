// PR をメトリクスの母数に「開発PRとして数えるべきか」を判定する共有ユーティリティ。
// bot 作者・依存更新・release・revert・ブランチ統合マージ・空差分などを分類し、
// 各メトリクスで一貫した除外ができるようにする。
//
// 方針:
//  - isBotAuthor / isEmptyDiff は「争点なく除外してよい」低リスク判定。
//  - classifyPr は種別分類（release/dep/revert などの扱いは各メトリクス側の判断に委ねる）。

export type MergeCategory = 'impl' | 'dep' | 'release' | 'revert' | 'merge' | 'format' | 'chore' | 'bump'

export const CATEGORY_LABEL: Record<MergeCategory, string> = {
  impl: '実装',
  dep: '依存・バージョン更新',
  release: 'release',
  revert: 'revert',
  merge: 'ブランチ統合マージ',
  format: 'format/lint/CI',
  chore: 'chore/インフラ',
  bump: 'bump/自動PR',
}

// 作者が bot アカウントか（dependabot / snyk-bot / github-actions / *-bot / *[bot] / copilot）
export function isBotAuthor(login: string | null | undefined): boolean {
  return /(\[bot\]|-bot$|^dependabot$|^github-actions$|^snyk-bot$|copilot)/i.test(login || '')
}

const isBumpTitle = (t: string): boolean => /^(bump|\[snyk\]|chore\(deps\)|snyk[・\s])/i.test(t)
const isRevertTitle = (t: string): boolean => /^revert\b|revert "/i.test(t)
const isReleaseTitle = (t: string): boolean => /\[release\]|staging to (main|master)/i.test(t)
const isMergeTitle = (t: string): boolean =>
  /merge .*stag|to staging-aws|stg.*取り込|staging.*取り込|利用制限.*stg|ブランチを取り込/i.test(t)
const isFormatTitle = (t: string): boolean =>
  /^(ci\(|lint|format|prettier|ruff|フォーマット|tidy )/i.test(t) ||
  /フォーマットのかかって|Lint rule|lint --fix|lintで表出した警告|object shorthand/.test(t)
const isDepTitle = (t: string): boolean =>
  /^update .+ from .+ to /i.test(t) ||
  /\bfrom\s+[\d.]+\s+to\s+[\d.]+/i.test(t) ||
  /のアップデート|パッケージ(アップデート|更新)|セキュリティ(アップデート|アプデート|upgrade)|ライブラリのセキュリティ|バージョンを?.{0,8}(アップデート|上げ|更新)|バージョンアップ|ダウングレード|アップグレードに伴/.test(
    t,
  )
const isChoreTitle = (t: string): boolean =>
  /migration|mkdir|env(ironment)?.{0,4}(テンプレ|template)|detectOpenHandles|IPアドレスをブロック|staging-aws環境|envs?\s*を(戻す|追加)|FeatureFlag の Envs|通知テスト|ローカル用の環境変数|BucketDeployment|memoryLimit|README|^docs[:(]|^chore[:(]|Sentry.*(トランザクション|Lambda)/i.test(
    t,
  )

export interface ClassifiablePr {
  title: string
  authorLogin?: string | null
}

// PR を種別分類する。bot 作者 / bump は 'bump'、それ以外はタイトルで判定し、
// どれにも当たらなければ 'impl'（実装）とみなす。
export function classifyPr(pr: ClassifiablePr): MergeCategory {
  const t = pr.title
  if (isBotAuthor(pr.authorLogin) || isBumpTitle(t)) return 'bump'
  if (isRevertTitle(t)) return 'revert'
  if (isReleaseTitle(t)) return 'release'
  if (isMergeTitle(t)) return 'merge'
  if (isDepTitle(t)) return 'dep'
  if (isFormatTitle(t)) return 'format'
  if (isChoreTitle(t)) return 'chore'
  return 'impl'
}

export interface DiffCountablePr {
  user: { login: string } | null
  changed_files: number
}

// 変更ファイル0件（空差分）の PR。既に取り込み済みブランチの再マージ等で、
// マージが実質的な変更を1つも持ち込んでいないもの。
export function isEmptyDiff(pr: { changed_files: number }): boolean {
  return pr.changed_files === 0
}

// release（本番リリース）PR かどうか。`[Release] ...` / `staging to main|master` 等。
export function isReleasePr(title: string): boolean {
  return isReleaseTitle(title)
}

// 本番ブランチの明示上書き（プロジェクトごとに異なる場合のみ設定）。
// 未設定なら各リポジトリの「デフォルトブランチ（自動検出）」を本番とみなす。
const productionBranchOverride = (import.meta.env.VITE_PRODUCTION_BRANCHES || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean)

// デフォルトブランチが staging/develop 等の「開発統合ブランチ」の場合、
// それを本番とみなすと統合マージまでデプロイに数えてしまう。自動検出時のみこれを除外する。
const DEV_INTEGRATION_BRANCH = /^(staging|stg|develop|dev|integration|qa|test|sandbox)$/i

// DORA の「デプロイ」= 本番ブランチへのマージ。
// 判定順:
//  1. env(VITE_PRODUCTION_BRANCHES) の明示上書きがあればそのブランチ集合を本番とする。
//  2. 無ければ default_branch（自動検出）を本番とみなす。ただし default が統合ブランチ名なら本番扱いしない。
//  3. いずれの場合も release PR（[Release] 等）は常にデプロイとみなす。
export function isProductionMerge(pr: {
  merged_at: string | null
  base_ref: string
  default_branch: string
  title: string
}): boolean {
  if (!pr.merged_at) return false
  let isProdBranch = false
  if (productionBranchOverride.length > 0) {
    isProdBranch = productionBranchOverride.includes(pr.base_ref)
  } else if (pr.default_branch !== '' && !DEV_INTEGRATION_BRANCH.test(pr.default_branch)) {
    isProdBranch = pr.base_ref === pr.default_branch
  }
  return isProdBranch || isReleasePr(pr.title)
}

// 開発メトリクスの母数として数えるべきか（低リスク除外: bot作者 と 空差分 のみ）。
// release/revert/dep 等の扱いは各メトリクスの判断に委ねるため、ここでは除外しない。
export function countableForDevMetrics(pr: DiffCountablePr): boolean {
  return !isBotAuthor(pr.user?.login) && !isEmptyDiff(pr)
}
