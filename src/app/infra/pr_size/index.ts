import {PrSizeRepository} from "../../domain/repositories/pr_size";
import {PrSize} from "../../domain/models/pr_size/pr_size";
import {PrSizes} from "../../domain/models/pr_size/pr_sizes";
import {octokit} from "../../shared/octokit";

export class PrSizeRepositoryOnJson implements PrSizeRepository {
  find = async (): Promise<PrSizes> => {
    const today = new Date();
    today.setDate(today.getDate() - 90);
    const pull_reqs = await this.find_pull_req();
    if (!pull_reqs) {
      return new PrSizes([]);
    }
    const filtered = pull_reqs.data.filter(
      (data: any) => new Date(data.merged_at || data.closed_at)?.getTime() >= today.getTime()
    );

    const pr_sizes: PrSize[] = [];
    for (const data of filtered) {
      const detail = await this.find_pull_req_detail(data.number);
      if (!detail) continue;

      const closed_at = new Date(data.merged_at || data.closed_at || new Date());
      pr_sizes.push(new PrSize(
        data.title,
        data.user?.login || 'unknown',
        closed_at.toLocaleDateString(),
        detail.data.additions,
        detail.data.deletions,
        detail.data.changed_files
      ));
    }
    return new PrSizes(pr_sizes);
  };

  private find_pull_req() {
    return octokit.request('GET /repos/{owner}/{repo}/pulls', {
      owner: process.env.VITE_GITHUB_OWNER as string,
      repo: process.env.VITE_GITHUB_REPO as string,
      state: 'closed',
      sort: 'updated',
      direction: 'desc'
    }).catch(reason => {
      console.log(reason);
      return null;
    });
  }

  private find_pull_req_detail(pull_number: number) {
    return octokit.request('GET /repos/{owner}/{repo}/pulls/{pull_number}', {
      owner: process.env.VITE_GITHUB_OWNER as string,
      repo: process.env.VITE_GITHUB_REPO as string,
      pull_number
    }).catch(reason => {
      console.log(reason);
      return null;
    });
  }
}
