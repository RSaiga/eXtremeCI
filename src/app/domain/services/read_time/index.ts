import {ReadTimeRepositoryOnJson} from "../../../infra/read_time";
import {ReadTimes} from "../../models/read_time/read.times";

const find: () => Promise<ReadTimes> = async () => {
  return await new ReadTimeRepositoryOnJson().find();
};

export const ReadTimeService = {
  find
};
