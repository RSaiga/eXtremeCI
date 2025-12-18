import {octokit} from "../../shared/octokit";

export interface CommitData {
  sha: string;
  message: string;
  author: string;
  authorEmail: string;
  committedDate: Date;
  additions: number;
  deletions: number;
}

export interface ContributorStats {
  author: string;
  commitCount: number;
  additions: number;
  deletions: number;
  totalChanges: number;
  firstCommitDate: Date | null;
  lastCommitDate: Date | null;
}

// 日別コミットデータ（時系列表示用）
export interface DailyCommitData {
  date: string;
  authorCounts: { [author: string]: number };
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
`;

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
`;

interface GraphQLCommitNode {
  oid: string;
  message: string;
  author: {
    name: string;
    email: string;
    user: { login: string } | null;
  };
  committedDate: string;
  additions: number;
  deletions: number;
}

interface GraphQLCommitResponse {
  repository: {
    defaultBranchRef: {
      target: {
        history: {
          nodes: GraphQLCommitNode[];
          pageInfo: {
            hasNextPage: boolean;
            endCursor: string;
          };
        };
      };
    };
  };
}

function transformCommitNode(node: GraphQLCommitNode): CommitData {
  return {
    sha: node.oid,
    message: node.message.split('\n')[0], // 最初の行のみ
    author: node.author.user?.login || node.author.name || 'unknown',
    authorEmail: node.author.email,
    committedDate: new Date(node.committedDate),
    additions: node.additions,
    deletions: node.deletions
  };
}

class GitHubCommitDataCache {
  private commits: CommitData[] | null = null;
  private contributorStats: ContributorStats[] | null = null;
  private dailyCommits: DailyCommitData[] | null = null;
  private lastFetch: number = 0;
  private readonly CACHE_TTL = 60000; // 1分キャッシュ

  async getCommits(): Promise<CommitData[]> {
    await this.ensureDataLoaded();
    return this.commits || [];
  }

  async getContributorStats(): Promise<ContributorStats[]> {
    await this.ensureDataLoaded();
    return this.contributorStats || [];
  }

  async getDailyCommits(): Promise<DailyCommitData[]> {
    await this.ensureDataLoaded();
    return this.dailyCommits || [];
  }

  private async ensureDataLoaded(): Promise<void> {
    if (this.commits && this.contributorStats && Date.now() - this.lastFetch < this.CACHE_TTL) {
      return;
    }
    await this.fetchAllData();
  }

  private async fetchAllData(): Promise<void> {
    console.log('Fetching commit data via GraphQL...');
    const startTime = Date.now();

    try {
      // 90日前からのコミットを取得
      const since = new Date();
      since.setDate(since.getDate() - 90);

      const allCommits: CommitData[] = [];
      let hasNextPage = true;
      let cursor: string | null = null;

      while (hasNextPage) {
        const query = cursor ? COMMITS_GRAPHQL_QUERY_WITH_CURSOR : COMMITS_GRAPHQL_QUERY;
        const variables: any = {
          owner: import.meta.env.VITE_GITHUB_OWNER as string,
          repo: import.meta.env.VITE_GITHUB_REPO as string,
          since: since.toISOString()
        };
        if (cursor) {
          variables.cursor = cursor;
        }

        const response = await octokit.graphql<GraphQLCommitResponse>(query, variables);

        const history = response.repository.defaultBranchRef?.target?.history;
        if (!history) {
          break;
        }

        const commits = history.nodes.map(transformCommitNode);
        allCommits.push(...commits);

        hasNextPage = history.pageInfo.hasNextPage;
        cursor = history.pageInfo.endCursor;

        // 安全のため最大500コミットまで
        if (allCommits.length >= 500) {
          break;
        }
      }

      this.commits = allCommits;
      this.contributorStats = this.calculateContributorStats(allCommits);
      this.dailyCommits = this.calculateDailyCommits(allCommits);
      this.lastFetch = Date.now();

      const elapsed = Date.now() - startTime;
      console.log(`Commit data loaded in ${elapsed}ms (${this.commits.length} commits, ${this.contributorStats.length} contributors)`);
    } catch (e) {
      console.error('Failed to fetch commit data via GraphQL:', e);
      this.commits = [];
      this.contributorStats = [];
      this.dailyCommits = [];
    }
  }

  private calculateDailyCommits(commits: CommitData[]): DailyCommitData[] {
    const dailyMap = new Map<string, { [author: string]: number }>();

    for (const commit of commits) {
      const date = commit.committedDate.toLocaleDateString('ja-JP');
      if (!dailyMap.has(date)) {
        dailyMap.set(date, {});
      }
      const dayData = dailyMap.get(date)!;
      dayData[commit.author] = (dayData[commit.author] || 0) + 1;
    }

    const result: DailyCommitData[] = [];
    for (const [date, authorCounts] of dailyMap) {
      result.push({ date, authorCounts });
    }

    // 日付順にソート
    return result.sort((a, b) =>
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );
  }

  private calculateContributorStats(commits: CommitData[]): ContributorStats[] {
    const statsMap = new Map<string, {
      commitCount: number;
      additions: number;
      deletions: number;
      dates: Date[];
    }>();

    for (const commit of commits) {
      const existing = statsMap.get(commit.author);
      if (existing) {
        existing.commitCount++;
        existing.additions += commit.additions;
        existing.deletions += commit.deletions;
        existing.dates.push(commit.committedDate);
      } else {
        statsMap.set(commit.author, {
          commitCount: 1,
          additions: commit.additions,
          deletions: commit.deletions,
          dates: [commit.committedDate]
        });
      }
    }

    const stats: ContributorStats[] = [];
    for (const [author, data] of statsMap) {
      const sortedDates = data.dates.sort((a, b) => a.getTime() - b.getTime());
      stats.push({
        author,
        commitCount: data.commitCount,
        additions: data.additions,
        deletions: data.deletions,
        totalChanges: data.additions + data.deletions,
        firstCommitDate: sortedDates[0] || null,
        lastCommitDate: sortedDates[sortedDates.length - 1] || null
      });
    }

    // コミット数の降順でソート
    return stats.sort((a, b) => b.commitCount - a.commitCount);
  }

  clearCache(): void {
    this.commits = null;
    this.contributorStats = null;
    this.dailyCommits = null;
    this.lastFetch = 0;
  }
}

export const commitDataCache = new GitHubCommitDataCache();
