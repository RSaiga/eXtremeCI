import { ReviewTimeService } from '../../domain/services/review_time'
import { ReviewTimes } from '../../domain/models/review_time/review_times'

const find = async (owner: string, repo: string): Promise<ReviewTimes> => await ReviewTimeService.find(owner, repo)

export const ReviewTimeUsecase = {
  find,
}
