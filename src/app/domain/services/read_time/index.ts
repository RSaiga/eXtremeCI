import { ReadTimeRepositoryOnJson } from '../../../infra/read_time'
import { ReadTimes } from '../../models/read_time/read.times'

const find = async (owner: string, repo: string): Promise<ReadTimes> =>
  await new ReadTimeRepositoryOnJson().find(owner, repo)

export const ReadTimeService = {
  find,
}
