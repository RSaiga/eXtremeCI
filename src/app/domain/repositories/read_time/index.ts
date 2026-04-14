import { ReadTimes } from '../../models/read_time/read.times'

export interface ReadTimeRepository {
  find(owner: string, repo: string): Promise<ReadTimes>
}
