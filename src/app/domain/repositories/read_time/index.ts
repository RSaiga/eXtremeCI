import {ReadTimes} from "../../models/read_time/read.times";

export interface ReadTimeRepository {
  find(): Promise<ReadTimes>;
}