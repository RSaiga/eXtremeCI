import { PrSizes } from '../../models/pr_size/pr_sizes'

export interface PrSizeRepository {
  find(owner: string, repo: string): Promise<PrSizes>
}
