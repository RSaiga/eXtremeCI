import {ReviewTimes} from "../../models/review_time/review_times";

export interface ReviewTimeRepository {
  find(): Promise<ReviewTimes>;
}
