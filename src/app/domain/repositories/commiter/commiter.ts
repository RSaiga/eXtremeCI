import { Commiters } from '../../models/commiter/commiters'

export interface CommiterRepository {
  find(owner: string, repo: string): Promise<Commiters>
}
