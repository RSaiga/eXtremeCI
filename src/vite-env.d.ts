interface ImportMetaEnv {
  readonly VITE_API_URL: string
  readonly VITE_TEST_FILE_PATTERNS?: string
  readonly VITE_CI_IGNORE_CHECKS?: string
  readonly VITE_EXCLUDED_REVIEWERS?: string
  // DORA デプロイ判定の本番ブランチ上書き（未設定なら各リポジトリのデフォルトブランチを自動使用）
  readonly VITE_PRODUCTION_BRANCHES?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
