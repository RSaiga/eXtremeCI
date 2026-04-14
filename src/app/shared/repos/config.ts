export interface RepoRef {
  owner: string
  repo: string
}

export function repoKey(ref: RepoRef): string {
  return `${ref.owner}/${ref.repo}`
}

function parseEntry(entry: string): RepoRef | null {
  const trimmed = entry.trim()
  if (!trimmed) return null
  const [owner, repo] = trimmed.split('/').map((s) => s.trim())
  if (!owner || !repo) return null
  return { owner, repo }
}

export function parseRepos(): RepoRef[] {
  const env = process.env as Record<string, string | undefined>
  const list = env.VITE_GITHUB_REPOS || ''
  const parsed = list
    .split(',')
    .map(parseEntry)
    .filter((r): r is RepoRef => r !== null)

  if (parsed.length > 0) return parsed

  const owner = env.VITE_GITHUB_OWNER
  const repo = env.VITE_GITHUB_REPO
  if (owner && repo) return [{ owner, repo }]

  throw new Error('No repositories configured. Set VITE_GITHUB_REPOS="owner1/repo1,owner2/repo2" in .env')
}
