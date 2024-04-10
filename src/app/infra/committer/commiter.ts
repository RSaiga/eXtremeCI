import {octokit} from "../../shared/octokit";
import {CommiterRepository} from "../../domain/repositories/commiter/commiter";
import {Commiters} from "../../domain/models/commiter/commiters";
import {Author, Commiter} from "../../domain/models/commiter/commiter";

export class CommiterRepositoryOnJson implements CommiterRepository {
  find = async (): Promise<Commiters> => {
    const results = await this.commit_by_user();
    let commitCountByUser = {};
    results.forEach(v => {
      let date = new Date(v.commit.author.date).toLocaleDateString()
      let author = v.author?.login ?? v.commit.author.name;
      if (!commitCountByUser[date]) {
        commitCountByUser[date] = {};
      }
      if (!commitCountByUser[date][author]) {
        commitCountByUser[date][author] = 1;
      }
      if (commitCountByUser[date][author]) {
        commitCountByUser[date][author]++;
      }
    })
    const commiters: Commiter[] = [];
    for (const date in commitCountByUser) {
      const userCommitCounts: Author[] = [];
      for (const user in commitCountByUser[date]) {
        userCommitCounts.push(new Author(user, commitCountByUser[date][user]));
      }
      const dateCommitData = new Commiter(date, userCommitCounts);
      commiters.push(dateCommitData);
    }
    commiters.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    return new Commiters(commiters);
  };

  private commit_by_user(maxPage = 3) {
    let results = [];

    const fetchPage = async (page: number): Promise<any> => {
      return octokit.request('GET /repos/{owner}/{repo}/commits?per_page=100&page=' + page, {
        owner: process.env.VITE_GITHUB_OWNER,
        repo: process.env.VITE_GITHUB_REPO,
      })
        .catch(reason => console.log(reason));
    };

    const fetchAllPages = async () => {
      for (let i = 1; i <= maxPage; i++) {
        const res = await fetchPage(i);
        results = [...results, ...res.data];
      }
    };

    return fetchAllPages()
      .then(() => results)
      .catch(reason => console.log(reason));
  }
}