import { octokit } from '../../shared/octokit'

export interface PrDetailData {
  number: number
  title: string
  user: { login: string } | null
  state: string
  draft: boolean
  created_at: string
  updated_at: string
  closed_at: string | null
  merged_at: string | null
  html_url: string
  additions: number
  deletions: number
  changed_files: number
  firstCommitDate: Date | null
  reviews: ReviewData[]
  labels: string[]
  files: string[]
  ciStatus: 'success' | 'failure' | 'pending' | 'unknown'
}

export interface ReviewData {
  user: { login: string } | null
  state: string
  submitted_at: string
}

const GRAPHQL_QUERY = `
query($owner: String!, $repo: String!, $closedCursor: String, $openCursor: String) {
  repository(owner: $owner, name: $repo) {
    closedPrs: pullRequests(last: 50, states: [CLOSED, MERGED], before: $closedCursor) {
      nodes {
        number
        title
        author { login }
        state
        isDraft
        createdAt
        updatedAt
        closedAt
        mergedAt
        url
        additions
        deletions
        changedFiles
        labels(first: 10) {
          nodes {
            name
          }
        }
        commits(first: 1) {
          nodes {
            commit {
              committedDate
              statusCheckRollup {
                state
              }
            }
          }
        }
        reviews(first: 10) {
          nodes {
            author { login }
            state
            submittedAt
          }
        }
      }
    }
    openPrs: pullRequests(last: 50, states: [OPEN], before: $openCursor) {
      nodes {
        number
        title
        author { login }
        state
        isDraft
        createdAt
        updatedAt
        closedAt
        mergedAt
        url
        additions
        deletions
        changedFiles
        labels(first: 10) {
          nodes {
            name
          }
        }
        commits(last: 1) {
          nodes {
            commit {
              statusCheckRollup {
                state
              }
            }
          }
        }
        reviews(first: 10) {
          nodes {
            author { login }
            state
            submittedAt
          }
        }
      }
    }
  }
}
`

interface GraphQLPrNode {
  number: number
  title: string
  author: { login: string } | null
  state: string
  isDraft: boolean
  createdAt: string
  updatedAt: string
  closedAt: string | null
  mergedAt: string | null
  url: string
  additions: number
  deletions: number
  changedFiles: number
  labels: {
    nodes: Array<{
      name: string
    }>
  }
  commits?: {
    nodes: Array<{
      commit: {
        committedDate?: string
        statusCheckRollup?: {
          state: 'SUCCESS' | 'FAILURE' | 'PENDING' | 'ERROR' | 'EXPECTED'
        } | null
      }
    }>
  }
  reviews: {
    nodes: Array<{
      author: { login: string } | null
      state: string
      submittedAt: string
    }>
  }
}

interface GraphQLResponse {
  repository: {
    closedPrs: {
      nodes: GraphQLPrNode[]
    }
    openPrs: {
      nodes: GraphQLPrNode[]
    }
  }
}

function mapCiStatus(state?: string | null): 'success' | 'failure' | 'pending' | 'unknown' {
  if (!state) return 'unknown'
  switch (state) {
    case 'SUCCESS':
    case 'EXPECTED':
      return 'success'
    case 'FAILURE':
    case 'ERROR':
      return 'failure'
    case 'PENDING':
      return 'pending'
    default:
      return 'unknown'
  }
}

function transformPrNode(node: GraphQLPrNode): PrDetailData {
  const lastCommit = node.commits?.nodes?.[node.commits.nodes.length - 1]
  const firstCommit = node.commits?.nodes?.[0]

  return {
    number: node.number,
    title: node.title,
    user: node.author ? { login: node.author.login } : null,
    state: node.state.toLowerCase(),
    draft: node.isDraft,
    created_at: node.createdAt,
    updated_at: node.updatedAt,
    closed_at: node.closedAt,
    merged_at: node.mergedAt,
    html_url: node.url,
    additions: node.additions,
    deletions: node.deletions,
    changed_files: node.changedFiles,
    firstCommitDate: firstCommit?.commit?.committedDate ? new Date(firstCommit.commit.committedDate) : null,
    reviews: node.reviews.nodes.map((r) => ({
      user: r.author ? { login: r.author.login } : null,
      state: r.state,
      submitted_at: r.submittedAt,
    })),
    labels: node.labels.nodes.map((l) => l.name),
    files: [], // ファイル一覧はREST APIで別途取得が必要
    ciStatus: mapCiStatus(lastCommit?.commit?.statusCheckRollup?.state),
  }
}

interface PrCacheEntry {
  closedPrs: PrDetailData[]
  openPrs: PrDetailData[]
  lastFetch: number
}

class GitHubPrDataCache {
  private entries = new Map<string, PrCacheEntry>()

  private readonly CACHE_TTL = 60000 // 1分キャッシュ

  async getClosedPrs(owner: string, repo: string): Promise<PrDetailData[]> {
    const entry = await this.ensureDataLoaded(owner, repo)
    return entry.closedPrs
  }

  async getOpenPrs(owner: string, repo: string): Promise<PrDetailData[]> {
    const entry = await this.ensureDataLoaded(owner, repo)
    return entry.openPrs
  }

  private async ensureDataLoaded(owner: string, repo: string): Promise<PrCacheEntry> {
    const key = `${owner}/${repo}`
    const existing = this.entries.get(key)
    if (existing && Date.now() - existing.lastFetch < this.CACHE_TTL) {
      return existing
    }
    return await this.fetchAllData(owner, repo)
  }

  private async fetchAllData(owner: string, repo: string): Promise<PrCacheEntry> {
    console.log(`Fetching PR data via GraphQL for ${owner}/${repo}...`)
    const startTime = Date.now()
    const key = `${owner}/${repo}`

    try {
      const response = await octokit.graphql<GraphQLResponse>(GRAPHQL_QUERY, {
        owner,
        repo,
      })

      const entry: PrCacheEntry = {
        closedPrs: response.repository.closedPrs.nodes.map(transformPrNode),
        openPrs: response.repository.openPrs.nodes.map(transformPrNode),
        lastFetch: Date.now(),
      }
      this.entries.set(key, entry)

      const elapsed = Date.now() - startTime
      console.log(`PR data loaded in ${elapsed}ms (${entry.closedPrs.length} closed, ${entry.openPrs.length} open)`)
      return entry
    } catch (e) {
      console.error('Failed to fetch PR data via GraphQL:', e)
      const empty: PrCacheEntry = { closedPrs: [], openPrs: [], lastFetch: Date.now() }
      this.entries.set(key, empty)
      return empty
    }
  }

  clearCache(owner?: string, repo?: string): void {
    if (owner && repo) {
      this.entries.delete(`${owner}/${repo}`)
    } else {
      this.entries.clear()
    }
  }
}

export const prDataCache = new GitHubPrDataCache()
