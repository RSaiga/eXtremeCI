import { octokit } from '../../shared/octokit'

export interface CommitData {
  sha: string
  message: string
  author: string
  authorEmail: string
  committedDate: Date
  additions: number
  deletions: number
}

export interface ContributorStats {
  author: string
  commitCount: number
  additions: number
  deletions: number
  totalChanges: number
  firstCommitDate: Date | null
  lastCommitDate: Date | null
}

// 日別コミットデータ（時系列表示用）
export interface DailyCommitData {
  date: string
  authorCounts: { [author: string]: number }
}

const COMMITS_GRAPHQL_QUERY = `
query($owner: String!, $repo: String!, $since: GitTimestamp!) {
  repository(owner: $owner, name: $repo) {
    defaultBranchRef {
      target {
        ... on Commit {
          history(first: 100, since: $since) {
            nodes {
              oid
              message
              author {
                name
                email
                user {
                  login
                }
              }
              committedDate
              additions
              deletions
            }
            pageInfo {
              hasNextPage
              endCursor
            }
          }
        }
      }
    }
  }
}
`

const COMMITS_GRAPHQL_QUERY_WITH_CURSOR = `
query($owner: String!, $repo: String!, $since: GitTimestamp!, $cursor: String!) {
  repository(owner: $owner, name: $repo) {
    defaultBranchRef {
      target {
        ... on Commit {
          history(first: 100, since: $since, after: $cursor) {
            nodes {
              oid
              message
              author {
                name
                email
                user {
                  login
                }
              }
              committedDate
              additions
              deletions
            }
            pageInfo {
              hasNextPage
              endCursor
            }
          }
        }
      }
    }
  }
}
`

interface GraphQLCommitNode {
  oid: string
  message: string
  author: {
    name: string
    email: string
    user: { login: string } | null
  }
  committedDate: string
  additions: number
  deletions: number
}

interface GraphQLCommitResponse {
  repository: {
    defaultBranchRef: {
      target: {
        history: {
          nodes: GraphQLCommitNode[]
          pageInfo: {
            hasNextPage: boolean
            endCursor: string
          }
        }
      }
    }
  }
}

function transformCommitNode(node: GraphQLCommitNode): CommitData {
  return {
    sha: node.oid,
    message: node.message.split('\n')[0], // 最初の行のみ
    author: node.author.user?.login || node.author.name || 'unknown',
    authorEmail: node.author.email,
    committedDate: new Date(node.committedDate),
    additions: node.additions,
    deletions: node.deletions,
  }
}

interface CommitCacheEntry {
  commits: CommitData[]
  contributorStats: ContributorStats[]
  dailyCommits: DailyCommitData[]
  lastFetch: number
}

class GitHubCommitDataCache {
  private entries = new Map<string, CommitCacheEntry>()

  private readonly CACHE_TTL = 60000 // 1分キャッシュ

  async getCommits(owner: string, repo: string): Promise<CommitData[]> {
    const entry = await this.ensureDataLoaded(owner, repo)
    return entry.commits
  }

  async getContributorStats(owner: string, repo: string): Promise<ContributorStats[]> {
    const entry = await this.ensureDataLoaded(owner, repo)
    return entry.contributorStats
  }

  async getDailyCommits(owner: string, repo: string): Promise<DailyCommitData[]> {
    const entry = await this.ensureDataLoaded(owner, repo)
    return entry.dailyCommits
  }

  private async ensureDataLoaded(owner: string, repo: string): Promise<CommitCacheEntry> {
    const key = `${owner}/${repo}`
    const existing = this.entries.get(key)
    if (existing && Date.now() - existing.lastFetch < this.CACHE_TTL) {
      return existing
    }
    return await this.fetchAllData(owner, repo)
  }

  private async fetchAllData(owner: string, repo: string): Promise<CommitCacheEntry> {
    console.log(`Fetching commit data via GraphQL for ${owner}/${repo}...`)
    const startTime = Date.now()
    const key = `${owner}/${repo}`

    try {
      // 90日前からのコミットを取得
      const since = new Date()
      since.setDate(since.getDate() - 90)

      const allCommits: CommitData[] = []
      let hasNextPage = true
      let cursor: string | null = null

      while (hasNextPage) {
        const query = cursor ? COMMITS_GRAPHQL_QUERY_WITH_CURSOR : COMMITS_GRAPHQL_QUERY
        const variables: any = {
          owner,
          repo,
          since: since.toISOString(),
        }
        if (cursor) {
          variables.cursor = cursor
        }

        const response = await octokit.graphql<GraphQLCommitResponse>(query, variables)

        const history = response.repository.defaultBranchRef?.target?.history
        if (!history) {
          break
        }

        const commits = history.nodes.map(transformCommitNode)
        allCommits.push(...commits)

        hasNextPage = history.pageInfo.hasNextPage
        cursor = history.pageInfo.endCursor

        // 安全のため最大500コミットまで
        if (allCommits.length >= 500) {
          break
        }
      }

      const entry: CommitCacheEntry = {
        commits: allCommits,
        contributorStats: this.calculateContributorStats(allCommits),
        dailyCommits: this.calculateDailyCommits(allCommits),
        lastFetch: Date.now(),
      }
      this.entries.set(key, entry)

      const elapsed = Date.now() - startTime
      console.log(
        `Commit data loaded in ${elapsed}ms (${entry.commits.length} commits, ${entry.contributorStats.length} contributors)`,
      )
      return entry
    } catch (e) {
      console.error('Failed to fetch commit data via GraphQL:', e)
      const empty: CommitCacheEntry = {
        commits: [],
        contributorStats: [],
        dailyCommits: [],
        lastFetch: Date.now(),
      }
      this.entries.set(key, empty)
      return empty
    }
  }

  private calculateDailyCommits(commits: CommitData[]): DailyCommitData[] {
    const dailyMap = new Map<string, { [author: string]: number }>()

    for (const commit of commits) {
      const date = commit.committedDate.toLocaleDateString('ja-JP')
      if (!dailyMap.has(date)) {
        dailyMap.set(date, {})
      }
      const dayData = dailyMap.get(date)!
      dayData[commit.author] = (dayData[commit.author] || 0) + 1
    }

    const result: DailyCommitData[] = []
    for (const [date, authorCounts] of dailyMap) {
      result.push({ date, authorCounts })
    }

    // 日付順にソート
    return result.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  }

  private calculateContributorStats(commits: CommitData[]): ContributorStats[] {
    const statsMap = new Map<
      string,
      {
        commitCount: number
        additions: number
        deletions: number
        dates: Date[]
      }
    >()

    for (const commit of commits) {
      const existing = statsMap.get(commit.author)
      if (existing) {
        existing.commitCount++
        existing.additions += commit.additions
        existing.deletions += commit.deletions
        existing.dates.push(commit.committedDate)
      } else {
        statsMap.set(commit.author, {
          commitCount: 1,
          additions: commit.additions,
          deletions: commit.deletions,
          dates: [commit.committedDate],
        })
      }
    }

    const stats: ContributorStats[] = []
    for (const [author, data] of statsMap) {
      const sortedDates = data.dates.sort((a, b) => a.getTime() - b.getTime())
      stats.push({
        author,
        commitCount: data.commitCount,
        additions: data.additions,
        deletions: data.deletions,
        totalChanges: data.additions + data.deletions,
        firstCommitDate: sortedDates[0] || null,
        lastCommitDate: sortedDates[sortedDates.length - 1] || null,
      })
    }

    // コミット数の降順でソート
    return stats.sort((a, b) => b.commitCount - a.commitCount)
  }

  clearCache(owner?: string, repo?: string): void {
    if (owner && repo) {
      this.entries.delete(`${owner}/${repo}`)
    } else {
      this.entries.clear()
    }
  }
}

export const commitDataCache = new GitHubCommitDataCache()
