import {ReviewTimeService} from "../../domain/services/review_time";
import {ReviewTimes} from "../../domain/models/review_time/review_times";

const find: () => Promise<ReviewTimes> = async () => {
  return await ReviewTimeService.find();
};

export const ReviewTimeUsecase = {
  find
};
