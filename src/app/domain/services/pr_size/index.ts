import { PrSizeRepositoryOnJson } from '../../../infra/pr_size'
import { PrSizes } from '../../models/pr_size/pr_sizes'

const find = async (owner: string, repo: string): Promise<PrSizes> =>
  await new PrSizeRepositoryOnJson().find(owner, repo)

export const PrSizeService = {
  find,
}
