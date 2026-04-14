import { CommiterRepositoryOnJson } from '../../../infra/committer/commiter'
import { Commiters } from '../../models/commiter/commiters'

const find = async (owner: string, repo: string): Promise<Commiters> =>
  await new CommiterRepositoryOnJson().find(owner, repo)

export const CommiterService = {
  find,
}
