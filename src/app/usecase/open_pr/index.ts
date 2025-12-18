import {OpenPrService} from "../../domain/services/open_pr";
import {OpenPrs} from "../../domain/models/open_pr/open_prs";

const find: () => Promise<OpenPrs> = async () => {
  return await OpenPrService.find();
};

export const OpenPrUsecase = {
  find
};
