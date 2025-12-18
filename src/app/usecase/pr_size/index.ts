import {PrSizeService} from "../../domain/services/pr_size";
import {PrSizes} from "../../domain/models/pr_size/pr_sizes";

const find: () => Promise<PrSizes> = async () => {
  return await PrSizeService.find();
};

export const PrSizeUsecase = {
  find
};
