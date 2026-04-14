import { OpenPrService } from '../../domain/services/open_pr'
import { OpenPrs } from '../../domain/models/open_pr/open_prs'

const find = async (owner: string, repo: string): Promise<OpenPrs> => await OpenPrService.find(owner, repo)

export const OpenPrUsecase = {
  find,
}
