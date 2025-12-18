import {PrSizes} from "../../models/pr_size/pr_sizes";

export interface PrSizeRepository {
  find(): Promise<PrSizes>;
}
