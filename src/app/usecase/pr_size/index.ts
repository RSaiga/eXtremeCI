import { PrSizeService } from '../../domain/services/pr_size'
import { PrSizes } from '../../domain/models/pr_size/pr_sizes'

const find = async (owner: string, repo: string): Promise<PrSizes> => await PrSizeService.find(owner, repo)

export const PrSizeUsecase = {
  find,
}
