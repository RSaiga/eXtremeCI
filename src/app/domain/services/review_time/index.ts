import {ReviewTimeRepositoryOnJson} from "../../../infra/review_time";
import {ReviewTimes} from "../../models/review_time/review_times";

const find: () => Promise<ReviewTimes> = async () => {
  return await new ReviewTimeRepositoryOnJson().find();
};

export const ReviewTimeService = {
  find
};
