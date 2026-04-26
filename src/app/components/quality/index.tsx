import React, { useEffect, useState } from 'react'
import { Box, CircularProgress, Stack, Typography } from '@mui/material'
import { useActiveRepo } from '../../shared/repos/context'
import { useSprint } from '../../shared/sprint/context'
import {
  analyzeCommitQuality,
  analyzeAuthorCommitQuality,
} from '../../domain/services/commit_quality/commit_quality_service'
import { analyzeQualitySustainability } from '../../domain/services/quality_sustainability/quality_sustainability_service'
import { AuthorCommitQuality, CommitQualityMetrics } from '../../domain/models/commit_quality/commit_quality'
import { QualitySustainabilityMetrics } from '../../domain/models/quality_sustainability/quality_sustainability'
import { COLOR, DeltaBadge, KpiCard } from '../flow/shared'
import { CommitQualitySection, CommitQualitySprintPoint } from './commit_quality_section'
import { TestCiSection, TestCiSprintPoint } from './test_ci_section'
import { SustainabilitySection, SustainSprintPoint } from './sustainability_section'

type SubTab = 'commit' | 'test' | 'sustain'
type Scope = 'sprint' | 'all'

const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000

const GRADE_COLOR: Record<string, string> = {
  A: COLOR.success,
  B: COLOR.primary,
  C: COLOR.warning,
  D: COLOR.error,
  F: COLOR.error,
}

interface QualityBundle {
  metrics: CommitQualityMetrics
  authors: AuthorCommitQuality[]
  sustain: QualitySustainabilityMetrics
}

interface QualityTabProps {
  printAll?: boolean
  tabsNav?: React.ReactNode
}

export const QualityTab: React.FC<QualityTabProps> = ({ printAll, tabsNav }) => {
  const { selectedRepos, activeRepo } = useActiveRepo()
  const { current, previous, now, all } = useSprint()
  const [loading, setLoading] = useState(true)
  const [sprintData, setSprintData] = useState<QualityBundle | null>(null)
  const [prevData, setPrevData] = useState<QualityBundle | null>(null)
  const [allData, setAllData] = useState<QualityBundle | null>(null)
  const [commitSeries, setCommitSeries] = useState<CommitQualitySprintPoint[]>([])
  const [testCiSeries, setTestCiSeries] = useState<TestCiSprintPoint[]>([])
  const [sustainSeries, setSustainSeries] = useState<SustainSprintPoint[]>([])
  const [sub, setSub] = useState<SubTab>('commit')
  const [scope, setScope] = useState<Scope>('sprint')

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      setLoading(true)
      try {
        const ninetyDaysAgo = new Date(now.getTime() - NINETY_DAYS_MS)
        const allRange = { from: ninetyDaysAgo, to: now }
        const curRange = { from: current.start, to: current.end }
        const prevRange = { from: previous.start, to: previous.end }

        const [cqCur, acqCur, qsCur, cqPrev, acqPrev, qsPrev, cqAll, acqAll, qsAll] = await Promise.all([
          analyzeCommitQuality(selectedRepos, curRange),
          analyzeAuthorCommitQuality(selectedRepos, curRange),
          analyzeQualitySustainability(selectedRepos, curRange),
          analyzeCommitQuality(selectedRepos, prevRange),
          analyzeAuthorCommitQuality(selectedRepos, prevRange),
          analyzeQualitySustainability(selectedRepos, prevRange),
          analyzeCommitQuality(selectedRepos, allRange),
          analyzeAuthorCommitQuality(selectedRepos, allRange),
          analyzeQualitySustainability(selectedRepos, allRange),
        ])
        if (!cancelled) {
          setSprintData({ metrics: cqCur, authors: acqCur, sustain: qsCur })
          setPrevData({ metrics: cqPrev, authors: acqPrev, sustain: qsPrev })
          setAllData({ metrics: cqAll, authors: acqAll, sustain: qsAll })
        }

        // スプリント毎のトレンド（キャッシュ済みなので高速）
        const perSprint = await Promise.all(
          all.map(async (sp) => {
            const range = { from: sp.start, to: sp.end }
            const [cq, qs] = await Promise.all([
              analyzeCommitQuality(selectedRepos, range),
              analyzeQualitySustainability(selectedRepos, range),
            ])
            return { sp, cq, qs }
          }),
        )
        if (!cancelled) {
          setCommitSeries(
            perSprint.map(({ sp, cq }) => ({
              label: sp.label,
              small: Math.round(cq.smallCommitRatio * 100),
              large: Math.round(cq.largeCommitRatio * 100),
              avgLines: cq.avgLinesPerCommit,
              totalCommits: cq.totalCommits,
            })),
          )
          setTestCiSeries(
            perSprint.map(({ sp, qs }) => ({
              label: sp.label,
              testRate: Math.round(qs.testMetrics.testInclusionRate * 100),
              ciSuccess: Math.round(qs.ciMetrics.successRate * 100),
              totalPrs: qs.refactoringMetrics.totalPrs,
            })),
          )
          setSustainSeries(
            perSprint.map(({ sp, qs }) => {
              const total = qs.refactoringMetrics.totalPrs || 1
              return {
                label: sp.label,
                inlineRefactor: Math.round(qs.refactoringMetrics.inlineRefactorRate * 100),
                standalone: Math.round(qs.refactoringMetrics.standalonePrRate * 100),
                bugfix: Math.round((qs.refactoringMetrics.bugfixPrs / total) * 100),
                sustainabilityScore: qs.sustainabilityScore,
              }
            }),
          )
        }
      } catch (e) {
        console.error('Failed to fetch quality data:', e)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    run()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeRepo, current.start.getTime(), previous.start.getTime()])

  const active = scope === 'sprint' ? sprintData : allData
  const metrics = active?.metrics
  const authors = active?.authors || []
  const sustain = active?.sustain

  if (loading || !metrics || !sustain) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
        <CircularProgress />
      </Box>
    )
  }

  const workStyle = detectWorkStyle(metrics)
  const workStyleColor =
    workStyle.style === 'incremental' ? COLOR.success : workStyle.style === 'batch' ? COLOR.error : COLOR.warning
  const testPct = Math.round(sustain.testMetrics.testInclusionRate * 100)
  const ciPct = Math.round(sustain.ciMetrics.successRate * 100)
  const totalPrs = sustain.refactoringMetrics.totalPrs || 1
  const bugfixPct = Math.round((sustain.refactoringMetrics.bugfixPrs / totalPrs) * 100)

  const testCultureColor =
    sustain.testMetrics.testCulture === 'strong'
      ? COLOR.success
      : sustain.testMetrics.testCulture === 'moderate'
        ? COLOR.primary
        : sustain.testMetrics.testCulture === 'weak'
          ? COLOR.warning
          : COLOR.error

  const ciHealthColor =
    sustain.ciMetrics.ciHealth === 'excellent'
      ? COLOR.success
      : sustain.ciMetrics.ciHealth === 'good'
        ? COLOR.primary
        : sustain.ciMetrics.ciHealth === 'needs-improvement'
          ? COLOR.warning
          : COLOR.error

  const gradeColor = GRADE_COLOR[sustain.sustainabilityGrade] || COLOR.textMuted

  // 前スプリント比較用 (scope === 'sprint' のときのみ有効)
  const prevMetrics = scope === 'sprint' ? prevData?.metrics : undefined
  const prevSustain = scope === 'sprint' ? prevData?.sustain : undefined
  const prevTestPct = prevSustain ? Math.round(prevSustain.testMetrics.testInclusionRate * 100) : 0
  const prevCiPct = prevSustain ? Math.round(prevSustain.ciMetrics.successRate * 100) : 0
  const prevTotalPrs = prevSustain ? prevSustain.refactoringMetrics.totalPrs || 1 : 0
  const prevBugfixPct = prevSustain ? Math.round((prevSustain.refactoringMetrics.bugfixPrs / prevTotalPrs) * 100) : 0

  const renderSection = (key: SubTab) => {
    switch (key) {
      case 'commit':
        return <CommitQualitySection metrics={metrics} authors={authors} sprintSeries={commitSeries} />
      case 'test':
        return <TestCiSection sustain={sustain} sprintSeries={testCiSeries} />
      case 'sustain':
        return <SustainabilitySection sustain={sustain} sprintSeries={sustainSeries} />
      default:
        return null
    }
  }

  const screens: SubTab[] = printAll ? ['commit', 'test', 'sustain'] : [sub]

  return (
    <>
      {screens.map((screenSub, idx) => (
        <Stack key={screenSub} spacing={3} className={idx > 0 ? 'print-page-break' : undefined}>
          {tabsNav}
          {/* スプリントコンテキスト + スコープトグル */}
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

          {/* KPI ストリップ */}
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(5, 1fr)' },
              gap: 2,
            }}
          >
            <KpiCard
              label="コミット作法"
              value={`${metrics.reviewabilityScore}`}
              sub={
                scope === 'sprint' && prevMetrics ? (
                  <DeltaBadge
                    current={metrics.reviewabilityScore}
                    previous={prevMetrics.reviewabilityScore}
                    invertGood={false}
                  />
                ) : (
                  <Typography variant="caption" sx={{ color: workStyleColor, fontWeight: 700 }}>
                    {workStyle.label}
                  </Typography>
                )
              }
              hint="Reviewability Score (0-100) + 働き方スタイル"
              accent={workStyleColor}
              active={screenSub === 'commit'}
              onClick={() => setSub('commit')}
            />
            <KpiCard
              label="テスト文化"
              value={`${testPct}%`}
              sub={
                scope === 'sprint' && prevSustain ? (
                  <DeltaBadge current={testPct} previous={prevTestPct} invertGood={false} />
                ) : (
                  <Typography variant="caption" sx={{ color: testCultureColor, fontWeight: 700 }}>
                    {sustain.testMetrics.testCultureLabel}
                  </Typography>
                )
              }
              hint="テストを含む PR の割合"
              accent={testCultureColor}
              active={screenSub === 'test'}
              onClick={() => setSub('test')}
            />
            <KpiCard
              label="CI 健全性"
              value={`${ciPct}%`}
              sub={
                scope === 'sprint' && prevSustain ? (
                  <DeltaBadge current={ciPct} previous={prevCiPct} invertGood={false} />
                ) : (
                  <Typography variant="caption" sx={{ color: ciHealthColor, fontWeight: 700 }}>
                    {sustain.ciMetrics.ciHealthLabel}
                  </Typography>
                )
              }
              hint="CI チェックの成功率"
              accent={ciHealthColor}
              active={screenSub === 'test'}
              onClick={() => setSub('test')}
            />
            <KpiCard
              label="バグ修正比率"
              value={`${bugfixPct}%`}
              sub={
                scope === 'sprint' && prevSustain ? (
                  <DeltaBadge current={bugfixPct} previous={prevBugfixPct} invertGood />
                ) : (
                  <Typography variant="caption" sx={{ color: COLOR.textMuted }}>
                    目安 ≤30%
                  </Typography>
                )
              }
              hint="火消しに追われていないか"
              accent={bugfixPct <= 20 ? COLOR.success : bugfixPct <= 30 ? COLOR.warning : COLOR.error}
              active={screenSub === 'sustain'}
              onClick={() => setSub('sustain')}
            />
            <KpiCard
              label="サステナビリティ"
              value={sustain.sustainabilityGrade}
              sub={
                scope === 'sprint' && prevSustain ? (
                  <DeltaBadge
                    current={sustain.sustainabilityScore}
                    previous={prevSustain.sustainabilityScore}
                    invertGood={false}
                  />
                ) : (
                  <Typography variant="caption" sx={{ color: COLOR.textMuted }}>
                    Score {sustain.sustainabilityScore}
                  </Typography>
                )
              }
              hint="テスト + CI + リファクタの総合評価"
              accent={gradeColor}
              active={screenSub === 'sustain'}
              onClick={() => setSub('sustain')}
            />
          </Box>

          <SegmentedControl
            value={screenSub}
            onChange={setSub}
            options={[
              { key: 'commit', label: 'コミット品質' },
              { key: 'test', label: 'テスト & CI' },
              { key: 'sustain', label: '持続可能性' },
            ]}
          />

          <Box>{renderSection(screenSub)}</Box>
        </Stack>
      ))}
    </>
  )
}

function detectWorkStyle(m: CommitQualityMetrics): { style: string; label: string } {
  if (m.smallCommitRatio >= 0.6 && m.largeCommitRatio <= 0.1) {
    return { style: 'incremental', label: '刻み型' }
  }
  if (m.largeCommitRatio >= 0.3) {
    return { style: 'batch', label: 'まとめ型' }
  }
  return { style: 'mixed', label: '混合型' }
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
