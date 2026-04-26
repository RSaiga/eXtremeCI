import React, { useMemo, useState } from 'react'
import { Box, Stack, Typography } from '@mui/material'
import { ReadTimes } from '../../domain/models/read_time/read.times'
import { PrSizes } from '../../domain/models/pr_size/pr_sizes'
import { ReviewTimes } from '../../domain/models/review_time/review_times'
import { OpenPrs } from '../../domain/models/open_pr/open_prs'
import { useSprint } from '../../shared/sprint/context'
import { filterPrSizesBy, filterReadTimesBy, filterReviewTimesBy } from '../../shared/sprint/filters'
import { buildSprintSeries, median, percentile } from '../../shared/sprint/series'
import { LeadTimeSection, LeadTimeSprintPoint } from '../lead_time_v2'
import { PrSizeSection, PrSizeSprintPoint } from './pr_size_section'
import { ReviewTimeSection, ReviewTimeSprintPoint } from './review_time_section'
import { OpenPrSection } from './open_pr_section'
import { COLOR, DeltaBadge, formatHours, formatInt, KpiCard } from './shared'

type SubTab = 'lead_time' | 'pr_size' | 'review_time' | 'open_pr'
type Scope = 'sprint' | 'all'

interface Props {
  readTimes: ReadTimes
  prSizes: PrSizes
  reviewTimes: ReviewTimes
  openPrs: OpenPrs
  printAll?: boolean
  tabsNav?: React.ReactNode
}

export const FlowTab: React.FC<Props> = ({ readTimes, prSizes, reviewTimes, openPrs, printAll, tabsNav }) => {
  const { current, previous, all } = useSprint()
  const [sub, setSub] = useState<SubTab>('lead_time')
  const [scope, setScope] = useState<Scope>('sprint')

  const emptyReadTimes = useMemo(() => new ReadTimes([]), [])
  const emptyPrSizes = useMemo(() => new PrSizes([]), [])
  const emptyReviewTimes = useMemo(() => new ReviewTimes([]), [])

  const {
    curReadTimes,
    prevReadTimes,
    curPrSizes,
    prevPrSizes,
    curReviewTimes,
    prevReviewTimes,
    leadSeries,
    prSizeSeries,
    reviewSeries,
  } = useMemo(() => {
    const curRT = filterReadTimesBy(readTimes, current)
    const prevRT = filterReadTimesBy(readTimes, previous)
    const curPS = filterPrSizesBy(prSizes, current)
    const prevPS = filterPrSizesBy(prSizes, previous)
    const curVT = filterReviewTimesBy(reviewTimes, current)
    const prevVT = filterReviewTimesBy(reviewTimes, previous)

    const leadSer: LeadTimeSprintPoint[] = buildSprintSeries(
      readTimes.values,
      (v) => new Date(v.date),
      all,
      (arr) => {
        const hours = arr.map((v) => v.getDisplayTime())
        return {
          median: parseFloat(median(hours).toFixed(1)),
          p75: parseFloat(percentile(hours, 75).toFixed(1)),
        }
      },
    ).map((p) => ({
      label: p.label,
      index: p.index,
      median: p.value.median,
      p75: p.value.p75,
      count: p.count,
    }))

    const prSer: PrSizeSprintPoint[] = buildSprintSeries(
      prSizes.values,
      (v) => new Date(v.date),
      all,
      (arr) => Math.round(median(arr.map((v) => v.totalChanges))),
    ).map((p) => ({ label: p.label, index: p.index, median: p.value, count: p.count }))

    const reviewSer: ReviewTimeSprintPoint[] = buildSprintSeries(
      reviewTimes.values,
      (v) => v.prCreatedAt,
      all,
      (arr) => {
        const reviewed = arr.filter((r) => r.hasReview)
        const hours = reviewed.map((r) => r.waitTimeHours || 0)
        const merged = arr.filter((r) => r.isMerged)
        const mergedReviewed = merged.filter((r) => r.hasReview).length
        const noReviewMerged = merged.length - mergedReviewed
        const coverage = merged.length > 0 ? mergedReviewed / merged.length : 0
        return {
          median: parseFloat(median(hours).toFixed(1)),
          coverage: parseFloat((coverage * 100).toFixed(1)),
          noReviewMerged,
          mergedCount: merged.length,
        }
      },
    ).map((p) => ({
      label: p.label,
      index: p.index,
      median: p.value.median,
      coverage: p.value.coverage,
      noReviewMerged: p.value.noReviewMerged,
      mergedCount: p.value.mergedCount,
      count: p.count,
    }))

    return {
      curReadTimes: curRT,
      prevReadTimes: prevRT,
      curPrSizes: curPS,
      prevPrSizes: prevPS,
      curReviewTimes: curVT,
      prevReviewTimes: prevVT,
      leadSeries: leadSer,
      prSizeSeries: prSer,
      reviewSeries: reviewSer,
    }
  }, [readTimes, prSizes, reviewTimes, current, previous, all])

  const sectionReadCur = scope === 'sprint' ? curReadTimes : readTimes
  const sectionReadPrev = scope === 'sprint' ? prevReadTimes : emptyReadTimes
  const sectionPrCur = scope === 'sprint' ? curPrSizes : prSizes
  const sectionPrPrev = scope === 'sprint' ? prevPrSizes : emptyPrSizes
  const sectionRvCur = scope === 'sprint' ? curReviewTimes : reviewTimes
  const sectionRvPrev = scope === 'sprint' ? prevReviewTimes : emptyReviewTimes

  const medianLead = curReadTimes.median()
  const prevMedianLead = prevReadTimes.median()
  const medianSize = curPrSizes.medianChanges()
  const prevMedianSize = prevPrSizes.medianChanges()
  const medianWait = curReviewTimes.medianWaitTimeHours()
  const prevMedianWait = prevReviewTimes.medianWaitTimeHours()
  const openCount = openPrs.totalCount

  const leadAccent =
    medianLead === 0
      ? COLOR.textMuted
      : medianLead < 4
        ? COLOR.success
        : medianLead < 24
          ? COLOR.primary
          : medianLead < 72
            ? COLOR.warning
            : COLOR.error
  const sizeAccent =
    medianSize === 0
      ? COLOR.textMuted
      : medianSize <= 250
        ? COLOR.success
        : medianSize <= 500
          ? COLOR.warning
          : COLOR.error
  const waitAccent =
    medianWait === 0
      ? COLOR.textMuted
      : medianWait < 4
        ? COLOR.success
        : medianWait < 24
          ? COLOR.primary
          : medianWait < 72
            ? COLOR.warning
            : COLOR.error
  const openAccent = openPrs.oldCount > 0 ? COLOR.error : openPrs.staleCount > 0 ? COLOR.warning : COLOR.success

  const renderSection = (key: SubTab) => {
    switch (key) {
      case 'lead_time':
        return <LeadTimeSection current={sectionReadCur} previous={sectionReadPrev} sprintSeries={leadSeries} />
      case 'pr_size':
        return <PrSizeSection current={sectionPrCur} previous={sectionPrPrev} sprintSeries={prSizeSeries} />
      case 'review_time':
        return (
          <ReviewTimeSection
            current={sectionRvCur}
            previous={sectionRvPrev}
            sprintSeries={reviewSeries}
            openPrs={openPrs}
          />
        )
      case 'open_pr':
        return <OpenPrSection openPrs={openPrs} />
      default:
        return null
    }
  }

  const screens: SubTab[] = printAll ? ['lead_time', 'pr_size', 'review_time', 'open_pr'] : [sub]

  return (
    <>
      {screens.map((screenSub, idx) => (
        <Stack key={screenSub} spacing={3} className={idx > 0 ? 'print-page-break' : undefined}>
          {tabsNav}
          <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1}>
            <Typography variant="caption" sx={{ color: COLOR.textMuted }}>
              現スプリント{' '}
              <Box component="span" sx={{ fontWeight: 700, color: '#111827' }}>
                {current.label}
              </Box>{' '}
              · 前スプリント {previous.label}
            </Typography>
            <SegmentedControl
              value={scope}
              onChange={setScope}
              options={[
                { key: 'sprint' as Scope, label: '現スプリント' },
                { key: 'all' as Scope, label: '全期間 (90日)' },
              ]}
            />
          </Stack>

          {/* サマリー KPI ストリップ */}
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, 1fr)' },
              gap: 2,
            }}
          >
            <KpiCard
              label="リードタイム (中央値)"
              value={formatHours(medianLead)}
              sub={<DeltaBadge current={medianLead} previous={prevMedianLead} invertGood />}
              hint="現スプリントの中央値 (最初のコミット→マージ)"
              accent={leadAccent}
              active={screenSub === 'lead_time'}
              onClick={() => setSub('lead_time')}
            />
            <KpiCard
              label="PR サイズ (中央値)"
              value={medianSize ? `${formatInt(medianSize)} 行` : '—'}
              sub={<DeltaBadge current={medianSize} previous={prevMedianSize} invertGood />}
              hint="additions + deletions の中央値"
              accent={sizeAccent}
              active={screenSub === 'pr_size'}
              onClick={() => setSub('pr_size')}
            />
            <KpiCard
              label="レビュー待ち (中央値)"
              value={formatHours(medianWait)}
              sub={<DeltaBadge current={medianWait} previous={prevMedianWait} invertGood />}
              hint="PR 作成から最初のレビューまで"
              accent={waitAccent}
              active={screenSub === 'review_time'}
              onClick={() => setSub('review_time')}
            />
            <KpiCard
              label="オープン PR"
              value={String(openCount)}
              sub={
                <Typography
                  variant="caption"
                  sx={{
                    color: openPrs.oldCount > 0 ? COLOR.error : openPrs.staleCount > 0 ? COLOR.warning : COLOR.success,
                    fontWeight: 700,
                  }}
                >
                  {openPrs.oldCount > 0
                    ? `14日超 ${openPrs.oldCount} 件`
                    : openPrs.staleCount > 0
                      ? `7日超 ${openPrs.staleCount} 件`
                      : '全て新しい'}
                </Typography>
              }
              hint="現在未マージの PR 数 (スプリント非依存)"
              accent={openAccent}
              active={screenSub === 'open_pr'}
              onClick={() => setSub('open_pr')}
            />
          </Box>

          <SegmentedControl
            value={screenSub}
            onChange={setSub}
            options={[
              { key: 'lead_time', label: 'リードタイム' },
              { key: 'pr_size', label: 'PR サイズ' },
              { key: 'review_time', label: 'レビュー待ち' },
              { key: 'open_pr', label: 'オープン PR' },
            ]}
          />

          <Box>{renderSection(screenSub)}</Box>
        </Stack>
      ))}
    </>
  )
}

interface SegOption<T extends string> {
  key: T
  label: string
}

interface SegProps<T extends string> {
  value: T
  onChange: (v: T) => void
  options: SegOption<T>[]
}

function SegmentedControl<T extends string>({ value, onChange, options }: SegProps<T>) {
  return (
    <Box
      sx={{
        display: 'inline-flex',
        p: 0.5,
        bgcolor: COLOR.bgSoft,
        border: `1px solid ${COLOR.border}`,
        borderRadius: 2,
        alignSelf: 'flex-start',
      }}
    >
      {options.map((o) => {
        const active = value === o.key
        return (
          <Box
            key={o.key}
            onClick={() => onChange(o.key)}
            sx={{
              px: 2.5,
              py: 0.75,
              borderRadius: 1.5,
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 600,
              color: active ? '#111827' : COLOR.textMuted,
              bgcolor: active ? '#fff' : 'transparent',
              boxShadow: active ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
              transition: 'all .15s',
              '&:hover': { color: '#111827' },
            }}
          >
            {o.label}
          </Box>
        )
      })}
    </Box>
  )
}
