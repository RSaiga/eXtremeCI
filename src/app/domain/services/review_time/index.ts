import { ReviewTimeRepositoryOnJson } from '../../../infra/review_time'
import { ReviewTimes } from '../../models/review_time/review_times'

const find = async (owner: string, repo: string): Promise<ReviewTimes> =>
  await new ReviewTimeRepositoryOnJson().find(owner, repo)

export const ReviewTimeService = {
  find,
}
