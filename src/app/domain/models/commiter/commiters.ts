import {Commiter} from "./commiter";

export class Commiters {
  readonly values: Commiter[];

  constructor(values: Commiter[]) {
    this.values = values;
  }
}