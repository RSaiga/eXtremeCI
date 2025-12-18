import {OpenPrRepositoryOnJson} from "../../../infra/open_pr";
import {OpenPrs} from "../../models/open_pr/open_prs";

const find: () => Promise<OpenPrs> = async () => {
  return await new OpenPrRepositoryOnJson().find();
};

export const OpenPrService = {
  find
};
