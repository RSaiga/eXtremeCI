import {octokit} from "../../shared/octokit";

export interface PrDetailData {
  number: number;
  title: string;
  user: { login: string } | null;
  state: string;
  draft: boolean;
  created_at: string;
  updated_at: string;
  closed_at: string | null;
  merged_at: string | null;
  html_url: string;
  additions: number;
  deletions: number;
  changed_files: number;
  firstCommitDate: Date | null;
  reviews: ReviewData[];
  labels: string[];
  files: string[];
  ciStatus: 'success' | 'failure' | 'pending' | 'unknown';
}

export interface ReviewData {
  user: { login: string } | null;
  state: string;
  submitted_at: string;
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
`;

interface GraphQLPrNode {
  number: number;
  title: string;
  author: { login: string } | null;
  state: string;
  isDraft: boolean;
  createdAt: string;
  updatedAt: string;
  closedAt: string | null;
  mergedAt: string | null;
  url: string;
  additions: number;
  deletions: number;
  changedFiles: number;
  labels: {
    nodes: Array<{
      name: string;
    }>;
  };
  commits?: {
    nodes: Array<{
      commit: {
        committedDate?: string;
        statusCheckRollup?: {
          state: 'SUCCESS' | 'FAILURE' | 'PENDING' | 'ERROR' | 'EXPECTED';
        } | null;
      };
    }>;
  };
  reviews: {
    nodes: Array<{
      author: { login: string } | null;
      state: string;
      submittedAt: string;
    }>;
  };
}

interface GraphQLResponse {
  repository: {
    closedPrs: {
      nodes: GraphQLPrNode[];
    };
    openPrs: {
      nodes: GraphQLPrNode[];
    };
  };
}

function mapCiStatus(state?: string | null): 'success' | 'failure' | 'pending' | 'unknown' {
  if (!state) return 'unknown';
  switch (state) {
    case 'SUCCESS':
    case 'EXPECTED':
      return 'success';
    case 'FAILURE':
    case 'ERROR':
      return 'failure';
    case 'PENDING':
      return 'pending';
    default:
      return 'unknown';
  }
}

function transformPrNode(node: GraphQLPrNode): PrDetailData {
  const lastCommit = node.commits?.nodes?.[node.commits.nodes.length - 1];
  const firstCommit = node.commits?.nodes?.[0];

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
    firstCommitDate: firstCommit?.commit?.committedDate
      ? new Date(firstCommit.commit.committedDate)
      : null,
    reviews: node.reviews.nodes.map(r => ({
      user: r.author ? { login: r.author.login } : null,
      state: r.state,
      submitted_at: r.submittedAt
    })),
    labels: node.labels.nodes.map(l => l.name),
    files: [], // ファイル一覧はREST APIで別途取得が必要
    ciStatus: mapCiStatus(lastCommit?.commit?.statusCheckRollup?.state)
  };
}

class GitHubPrDataCache {
  private closedPrs: PrDetailData[] | null = null;
  private openPrs: PrDetailData[] | null = null;
  private lastFetch: number = 0;
  private readonly CACHE_TTL = 60000; // 1分キャッシュ

  async getClosedPrs(): Promise<PrDetailData[]> {
    await this.ensureDataLoaded();
    return this.closedPrs || [];
  }

  async getOpenPrs(): Promise<PrDetailData[]> {
    await this.ensureDataLoaded();
    return this.openPrs || [];
  }

  private async ensureDataLoaded(): Promise<void> {
    if (this.closedPrs && this.openPrs && Date.now() - this.lastFetch < this.CACHE_TTL) {
      return;
    }
    await this.fetchAllData();
  }

  private async fetchAllData(): Promise<void> {
    console.log('Fetching PR data via GraphQL...');
    const startTime = Date.now();

    try {
      const response = await octokit.graphql<GraphQLResponse>(GRAPHQL_QUERY, {
        owner: import.meta.env.VITE_GITHUB_OWNER as string,
        repo: import.meta.env.VITE_GITHUB_REPO as string
      });

      this.closedPrs = response.repository.closedPrs.nodes.map(transformPrNode);
      this.openPrs = response.repository.openPrs.nodes.map(transformPrNode);
      this.lastFetch = Date.now();

      const elapsed = Date.now() - startTime;
      console.log(`PR data loaded in ${elapsed}ms (${this.closedPrs.length} closed, ${this.openPrs.length} open)`);
    } catch (e) {
      console.error('Failed to fetch PR data via GraphQL:', e);
      this.closedPrs = [];
      this.openPrs = [];
    }
  }

  clearCache(): void {
    this.closedPrs = null;
    this.openPrs = null;
    this.lastFetch = 0;
  }
}

export const prDataCache = new GitHubPrDataCache();
