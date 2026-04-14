import { ReadTimes } from '../../domain/models/read_time/read.times'
import { PrSizes } from '../../domain/models/pr_size/pr_sizes'
import { ReviewTimes } from '../../domain/models/review_time/review_times'
import { SprintRange } from './calc'

function inRange(d: Date, range: SprintRange): boolean {
  const t = d.getTime()
  return t >= range.start.getTime() && t < range.end.getTime()
}

export function filterReadTimesBy(readTimes: ReadTimes, range: SprintRange): ReadTimes {
  return new ReadTimes(
    readTimes.values.filter((v) => {
      const d = new Date(v.date)
      return !Number.isNaN(d.getTime()) && inRange(d, range)
    }),
  )
}

export function filterPrSizesBy(prSizes: PrSizes, range: SprintRange): PrSizes {
  return new PrSizes(
    prSizes.values.filter((v) => {
      const d = new Date(v.date)
      return !Number.isNaN(d.getTime()) && inRange(d, range)
    }),
  )
}

export function filterReviewTimesBy(reviewTimes: ReviewTimes, range: SprintRange): ReviewTimes {
  return new ReviewTimes(reviewTimes.values.filter((v) => inRange(v.prCreatedAt, range)))
}
