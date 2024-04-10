import {Commiters} from "../../models/commiter/commiters";

export interface CommiterRepository {
  find(): Promise<Commiters>;
}