import {ReadTimeRepository} from "../../domain/repositories/read_time";
import {ReadTime} from "../../domain/models/read_time/read.time";
import {octokit} from "../../shared/octokit";
import {ReadTimes} from "../../domain/models/read_time/read.times";

export class ReadTimeRepositoryOnJson implements ReadTimeRepository {
  find = async (): Promise<ReadTimes> => {
    const today = new Date();
    today.setDate(today.getDate() - 90);
    const pull_reqs = await this.find_pull_req();
    const pull_req = pull_reqs.data.filter(data => new Date(data.merged_at)?.getTime() >= today.getTime() || new Date(data.closed_at)?.getTime() >= today.getTime());
    pull_req.sort((a, b) => new Date(a.merged_at || a.closed_at).getTime() - new Date(b.merged_at || b.closed_at).getTime());
    const read_times = [];
    for (const data of pull_req) {
      const commit = await this.find_commit(data)
      const merged_at = new Date(data.merged_at || data.closed_at);
      const first_committed_at = new Date(commit.data[0].commit.committer.date);
      read_times.push(new ReadTime(data.user.login, data.title, merged_at.toLocaleDateString(), String((merged_at.getTime() - first_committed_at.getTime()) / (60 * 1000))));
    }
    return new ReadTimes(read_times);
  };

  private find_pull_req() {
    return octokit.request('GET /repos/{owner}/{repo}/pulls', {
      owner: process.env.VITE_GITHUB_OWNER,
      repo: process.env.VITE_GITHUB_REPO,
      state: 'closed',
      sort: 'updated',
      direction: 'desc'
    }).catch(reason => console.log(reason));
  }

  private find_commit(data) {
    return octokit.request(`GET /repos/{owner}/{repo}/pulls/${data.number}/commits`, {
      owner: process.env.VITE_GITHUB_OWNER,
      repo: process.env.VITE_GITHUB_REPO,
    }).catch(reason => console.log(reason));
  }
}