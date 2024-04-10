import {CommiterRepositoryOnJson} from "../../../infra/committer/commiter";
import {Commiters} from "../../models/commiter/commiters";

const find: () => Promise<Commiters> = async () => {
  return await new CommiterRepositoryOnJson().find();
};

export const CommiterService = {
  find
};
