import { ReadTimeService } from '../../domain/services/read_time'
import { ReadTimes } from '../../domain/models/read_time/read.times'

const find = async (owner: string, repo: string): Promise<ReadTimes> => await ReadTimeService.find(owner, repo)

export const ReadTimeUsecase = {
  find,
}
