import { CommiterService } from '../../domain/services/commiter/commiter'
import { Commiters } from '../../domain/models/commiter/commiters'

const find = async (owner: string, repo: string): Promise<Commiters> => await CommiterService.find(owner, repo)

export const CommiterUsecase = {
  find,
}
