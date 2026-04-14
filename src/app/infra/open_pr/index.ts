import { OpenPrRepository } from '../../domain/repositories/open_pr'
import { OpenPr, ReviewState } from '../../domain/models/open_pr/open_pr'
import { OpenPrs } from '../../domain/models/open_pr/open_prs'
import { octokit } from '../../shared/octokit'

export class OpenPrRepositoryOnJson implements OpenPrRepository {
  find = async (owner: string, repo: string): Promise<OpenPrs> => {
    const pull_reqs = await this.find_open_pull_req(owner, repo)
    if (!pull_reqs) {
      return new OpenPrs([])
    }

    const open_prs: OpenPr[] = []
    for (const pr of pull_reqs.data) {
      const reviewState = await this.getLatestReviewState(owner, repo, pr.number)

      open_prs.push(
        new OpenPr(
          pr.number,
          pr.title,
          pr.user?.login || 'unknown',
          new Date(pr.created_at),
          new Date(pr.updated_at),
          reviewState,
          pr.draft || false,
          pr.html_url,
        ),
      )
    }

    return new OpenPrs(open_prs)
  }

  private async getLatestReviewState(owner: string, repo: string, pull_number: number): Promise<ReviewState> {
    const reviews = await this.find_reviews(owner, repo, pull_number)
    if (!reviews || !reviews.data || reviews.data.length === 0) {
      return 'NONE'
    }

    const validReviews = reviews.data.filter((r: any) => r.state !== 'PENDING' && r.state !== 'DISMISSED')

    if (validReviews.length === 0) return 'NONE'

    validReviews.sort((a: any, b: any) => new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime())

    const latestState = validReviews[0].state
    switch (latestState) {
      case 'APPROVED':
        return 'APPROVED'
      case 'CHANGES_REQUESTED':
        return 'CHANGES_REQUESTED'
      case 'COMMENTED':
        return 'COMMENTED'
      default:
        return 'PENDING'
    }
  }

  private find_open_pull_req(owner: string, repo: string) {
    return octokit
      .request('GET /repos/{owner}/{repo}/pulls', {
        owner,
        repo,
        state: 'open',
        sort: 'created',
        direction: 'asc',
        per_page: 100,
      })
      .catch((reason) => {
        console.log(reason)
        return null
      })
  }

  private find_reviews(owner: string, repo: string, pull_number: number) {
    return octokit
      .request('GET /repos/{owner}/{repo}/pulls/{pull_number}/reviews', {
        owner,
        repo,
        pull_number,
      })
      .catch((reason) => {
        console.log(reason)
        return null
      })
  }
}
