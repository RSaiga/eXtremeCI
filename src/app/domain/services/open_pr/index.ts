import { OpenPrRepositoryOnJson } from '../../../infra/open_pr'
import { OpenPrs } from '../../models/open_pr/open_prs'

const find = async (owner: string, repo: string): Promise<OpenPrs> =>
  await new OpenPrRepositoryOnJson().find(owner, repo)

export const OpenPrService = {
  find,
}
