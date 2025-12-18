import {PrSizeRepositoryOnJson} from "../../../infra/pr_size";
import {PrSizes} from "../../models/pr_size/pr_sizes";

const find: () => Promise<PrSizes> = async () => {
  return await new PrSizeRepositoryOnJson().find();
};

export const PrSizeService = {
  find
};
