import {ReviewTimeRepository} from "../../domain/repositories/review_time";
import {ReviewTime} from "../../domain/models/review_time/review_time";
import {ReviewTimes} from "../../domain/models/review_time/review_times";
import {octokit} from "../../shared/octokit";

export class ReviewTimeRepositoryOnJson implements ReviewTimeRepository {
  find = async (): Promise<ReviewTimes> => {
    const today = new Date();
    today.setDate(today.getDate() - 90);

    const pull_reqs = await this.find_pull_req();
    if (!pull_reqs) {
      return new ReviewTimes([]);
    }

    const filtered = pull_reqs.data.filter(
      (data: any) => new Date(data.created_at)?.getTime() >= today.getTime()
    );

    const review_times: ReviewTime[] = [];
    for (const pr of filtered) {
      const reviews = await this.find_reviews(pr.number);
      const firstReview = this.getFirstReview(reviews);

      review_times.push(new ReviewTime(
        pr.title,
        pr.user?.login || 'unknown',
        new Date(pr.created_at),
        firstReview ? new Date(firstReview.submitted_at) : null,
        firstReview?.user?.login || null,
        pr.number
      ));
    }

    return new ReviewTimes(review_times);
  };

  private getFirstReview(reviews: any): any | null {
    if (!reviews || !reviews.data || reviews.data.length === 0) {
      return null;
    }
    const validReviews = reviews.data.filter(
      (r: any) => r.state !== 'PENDING' && r.submitted_at
    );
    if (validReviews.length === 0) return null;

    validReviews.sort((a: any, b: any) =>
      new Date(a.submitted_at).getTime() - new Date(b.submitted_at).getTime()
    );
    return validReviews[0];
  }

  private find_pull_req() {
    return octokit.request('GET /repos/{owner}/{repo}/pulls', {
      owner: process.env.VITE_GITHUB_OWNER as string,
      repo: process.env.VITE_GITHUB_REPO as string,
      state: 'all',
      sort: 'created',
      direction: 'desc',
      per_page: 100
    }).catch(reason => {
      console.log(reason);
      return null;
    });
  }

  private find_reviews(pull_number: number) {
    return octokit.request('GET /repos/{owner}/{repo}/pulls/{pull_number}/reviews', {
      owner: process.env.VITE_GITHUB_OWNER as string,
      repo: process.env.VITE_GITHUB_REPO as string,
      pull_number
    }).catch(reason => {
      console.log(reason);
      return null;
    });
  }
}
