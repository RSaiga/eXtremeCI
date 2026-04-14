import { PrSizeRepository } from '../../domain/repositories/pr_size'
import { PrSize } from '../../domain/models/pr_size/pr_size'
import { PrSizes } from '../../domain/models/pr_size/pr_sizes'
import { octokit } from '../../shared/octokit'

export class PrSizeRepositoryOnJson implements PrSizeRepository {
  find = async (owner: string, repo: string): Promise<PrSizes> => {
    const today = new Date()
    today.setDate(today.getDate() - 90)
    const pull_reqs = await this.find_pull_req(owner, repo)
    if (!pull_reqs) {
      return new PrSizes([])
    }
    const filtered = pull_reqs.data.filter(
      (data: any) => new Date(data.merged_at || data.closed_at)?.getTime() >= today.getTime(),
    )

    const pr_sizes: PrSize[] = []
    for (const data of filtered) {
      const detail = await this.find_pull_req_detail(owner, repo, data.number)
      if (!detail) continue

      const closed_at = new Date(data.merged_at || data.closed_at || new Date())
      pr_sizes.push(
        new PrSize(
          data.title,
          data.user?.login || 'unknown',
          closed_at.toLocaleDateString(),
          detail.data.additions,
          detail.data.deletions,
          detail.data.changed_files,
        ),
      )
    }
    return new PrSizes(pr_sizes)
  }

  private find_pull_req(owner: string, repo: string) {
    return octokit
      .request('GET /repos/{owner}/{repo}/pulls', {
        owner,
        repo,
        state: 'closed',
        sort: 'updated',
        direction: 'desc',
      })
      .catch((reason) => {
        console.log(reason)
        return null
      })
  }

  private find_pull_req_detail(owner: string, repo: string, pull_number: number) {
    return octokit
      .request('GET /repos/{owner}/{repo}/pulls/{pull_number}', {
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
