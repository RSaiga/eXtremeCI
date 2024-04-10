import {CommiterService} from "../../domain/services/commiter/commiter";
import {Commiters} from "../../domain/models/commiter/commiters";

const find: () => Promise<Commiters> = async () => {
  return await CommiterService.find();
};

export const CommiterUsecase = {
  find
};
