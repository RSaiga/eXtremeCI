import { OpenPrs } from '../../models/open_pr/open_prs'

export interface OpenPrRepository {
  find(owner: string, repo: string): Promise<OpenPrs>
}
