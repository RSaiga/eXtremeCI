import {ReadTimeService} from "../../domain/services/read_time";
import {ReadTimes} from "../../domain/models/read_time/read.times";

const find: () => Promise<ReadTimes> = async () => {
  return await ReadTimeService.find();
};

export const ReadTimeUsecase = {
  find
};
