import React, { useMemo, useState } from 'react'
import {
  Box,
  Chip,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material'
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { ReadTimes } from '../../domain/models/read_time/read.times'
import { PrDetailData } from '../../infra/github/pr_data'
import { useSprint } from '../../shared/sprint/context'
import { DoraService } from '../../domain/services/dora/dora_service'
import {
  DoraLevel,
  DoraMetrics,
  DoraSprintPoint,
  DORA_LEVEL_COLOR,
  DORA_LEVEL_LABEL,
} from '../../domain/models/dora/dora_metrics'
import { COLOR, DeltaBadge, formatHours, formatInt, KpiCard, SectionHeader } from '../flow/shared'

type Scope = 'sprint' | 'all'

interface Props {
  readTimes: ReadTimes
  closedPrs: PrDetailData[]
}

export const DoraTab: React.FC<Props> = ({ readTimes, closedPrs }) => {
  const { current, previous, all } = useSprint()
  const [scope, setScope] = useState<Scope>('sprint')

  const { metrics, prevMetrics } = useMemo(() => {
    const range = scope === 'sprint' ? current : { start: new Date(Date.now() - 90 * 86400000), end: new Date() }
    const prevRange = scope === 'sprint' ? previous : null
    const m = DoraService.calculate(closedPrs, readTimes, range.start.getTime(), range.end.getTime())
    const pm = prevRange
      ? DoraService.calculate(closedPrs, readTimes, prevRange.start.getTime(), prevRange.end.getTime())
      : null
    return { metrics: m, prevMetrics: pm }
  }, [scope, current, previous, closedPrs, readTimes])

  const sprintSeries = useMemo(
    () => DoraService.calculateSprintSeries(closedPrs, readTimes, all),
    [closedPrs, readTimes, all],
  )

  return (
    <Stack spacing={3}>
      <SectionHeader
        overline="DORA FOUR KEYS"
        title="DORA"
        desc="Four Keys で見るとどうか？ · マージ ≒ デプロイ前提の代替指標"
        right={
          <Stack direction="row" spacing={1} alignItems="center">
            <Typography variant="caption" sx={{ color: COLOR.textMuted }}>
              {scope === 'sprint' ? `現スプリント ${current.label}` : '全期間 (90日)'}
            </Typography>
            <ScopeToggle scope={scope} onChange={setScope} />
          </Stack>
        }
      />

      {/* Overall level hero */}
      <Paper
        variant="outlined"
        sx={{
          p: 3,
          borderColor: DORA_LEVEL_COLOR[metrics.overallLevel],
          borderWidth: 2,
          borderRadius: 2,
          textAlign: 'center',
        }}
      >
        <Typography variant="caption" sx={{ color: COLOR.textMuted, letterSpacing: 0.5 }}>
          OVERALL PERFORMANCE
        </Typography>
        <Typography
          sx={{
            fontSize: 48,
            fontWeight: 800,
            lineHeight: 1.1,
            color: DORA_LEVEL_COLOR[metrics.overallLevel],
            mt: 0.5,
          }}
        >
          {DORA_LEVEL_LABEL[metrics.overallLevel]}
        </Typography>
        <Typography variant="body2" sx={{ color: COLOR.textMuted, mt: 0.5 }}>
          4指標の最低レベルで判定（DORA 原則: 弱点が全体を規定）
        </Typography>
      </Paper>

      {/* 4 KPI cards */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, 1fr)' }, gap: 2 }}>
        <KpiCard
          label="Deployment Frequency"
          value={`${metrics.deployFrequency.value} PR/日`}
          sub={
            <Stack spacing={0.25}>
              <LevelBadge level={metrics.deployFrequency.level} />
              {prevMetrics && (
                <DeltaBadge
                  current={metrics.deployFrequency.value}
                  previous={prevMetrics.deployFrequency.value}
                  invertGood={false}
                />
              )}
            </Stack>
          }
          hint="マージ済みPR数 / 期間日数（マージ ≒ デプロイ前提）"
          accent={DORA_LEVEL_COLOR[metrics.deployFrequency.level]}
        />
        <KpiCard
          label="Lead Time for Changes"
          value={formatHours(metrics.leadTime.medianHours)}
          sub={
            <Stack spacing={0.25}>
              <LevelBadge level={metrics.leadTime.level} />
              {prevMetrics && (
                <DeltaBadge
                  current={metrics.leadTime.medianHours}
                  previous={prevMetrics.leadTime.medianHours}
                  invertGood
                />
              )}
            </Stack>
          }
          hint="最初のコミットからマージまでの中央値"
          accent={DORA_LEVEL_COLOR[metrics.leadTime.level]}
        />
        <KpiCard
          label="Change Failure Rate"
          value={`${(metrics.changeFailureRate.value * 100).toFixed(1)}%`}
          sub={
            <Stack spacing={0.25}>
              <LevelBadge level={metrics.changeFailureRate.level} />
              {prevMetrics && (
                <DeltaBadge
                  current={metrics.changeFailureRate.value * 100}
                  previous={prevMetrics.changeFailureRate.value * 100}
                  invertGood
                />
              )}
            </Stack>
          }
          hint="hotfix+bugfix PRの比率（全マージPR中）"
          accent={DORA_LEVEL_COLOR[metrics.changeFailureRate.level]}
        />
        <KpiCard
          label="Mean Time to Restore"
          value={metrics.mttr.medianHours > 0 ? formatHours(metrics.mttr.medianHours) : '—'}
          sub={
            <Stack spacing={0.25}>
              <LevelBadge level={metrics.mttr.level} />
              {prevMetrics && prevMetrics.mttr.medianHours > 0 && (
                <DeltaBadge current={metrics.mttr.medianHours} previous={prevMetrics.mttr.medianHours} invertGood />
              )}
            </Stack>
          }
          hint="bugfix PRの作成→マージ中央値（修復速度の代替指標）"
          accent={DORA_LEVEL_COLOR[metrics.mttr.level]}
        />
      </Box>

      {/* Sprint trend: 2 charts stacked */}
      {sprintSeries.length > 1 && <TrendCharts series={sprintSeries} />}

      {/* Benchmark table */}
      <BenchmarkTable metrics={metrics} />

      {/* CFR detail list */}
      {metrics.changeFailureRate.failurePrs.length > 0 && <CfrDetailList metrics={metrics} />}
    </Stack>
  )
}

// =============================================================================
// Trend Charts (2-row)
// =============================================================================

const TrendCharts: React.FC<{ series: DoraSprintPoint[] }> = ({ series }) => (
  <Paper variant="outlined" sx={{ p: 3, borderColor: COLOR.border, borderRadius: 2 }}>
    <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 0.5 }}>
      Four Keys スプリント推移
    </Typography>
    <Typography variant="caption" sx={{ color: COLOR.textMuted }}>
      x軸 = スプリント
    </Typography>

    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2, mt: 2 }}>
      {/* Deploy Freq */}
      <Box>
        <Typography variant="caption" sx={{ fontWeight: 600, color: COLOR.textMuted }}>
          Deployment Frequency (PR/日)
        </Typography>
        <Box sx={{ height: 180 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={series} margin={{ top: 10, right: 10, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: COLOR.textMuted }} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: COLOR.textMuted }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: 8, border: `1px solid ${COLOR.border}`, fontSize: 12 }} />
              <ReferenceLine y={1} stroke={COLOR.success} strokeDasharray="4 4" strokeWidth={1} />
              <Line
                type="monotone"
                dataKey="deployFreq"
                name="PR/日"
                stroke={COLOR.primary}
                strokeWidth={2.5}
                dot={{ r: 3, fill: COLOR.primary, strokeWidth: 0 }}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </Box>
      </Box>

      {/* Lead Time */}
      <Box>
        <Typography variant="caption" sx={{ fontWeight: 600, color: COLOR.textMuted }}>
          Lead Time (中央値 h)
        </Typography>
        <Box sx={{ height: 180 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={series} margin={{ top: 10, right: 10, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: COLOR.textMuted }} tickLine={false} />
              <YAxis
                tick={{ fontSize: 10, fill: COLOR.textMuted }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => (v < 24 ? `${v}h` : `${(v / 24).toFixed(0)}d`)}
              />
              <Tooltip
                contentStyle={{ borderRadius: 8, border: `1px solid ${COLOR.border}`, fontSize: 12 }}
                formatter={(v: number) => [formatHours(v), 'Lead Time']}
              />
              <ReferenceLine y={24} stroke={COLOR.warning} strokeDasharray="4 4" strokeWidth={1} />
              <Line
                type="monotone"
                dataKey="leadTimeMedian"
                name="Lead Time"
                stroke="#2e7d32"
                strokeWidth={2.5}
                dot={{ r: 3, fill: '#2e7d32', strokeWidth: 0 }}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </Box>
      </Box>

      {/* CFR */}
      <Box>
        <Typography variant="caption" sx={{ fontWeight: 600, color: COLOR.textMuted }}>
          Change Failure Rate (%)
        </Typography>
        <Box sx={{ height: 180 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={series} margin={{ top: 10, right: 10, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: COLOR.textMuted }} tickLine={false} />
              <YAxis
                tick={{ fontSize: 10, fill: COLOR.textMuted }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `${v}%`}
              />
              <Tooltip
                contentStyle={{ borderRadius: 8, border: `1px solid ${COLOR.border}`, fontSize: 12 }}
                formatter={(v: number) => [`${v}%`, 'CFR']}
              />
              <ReferenceLine y={15} stroke={COLOR.warning} strokeDasharray="4 4" strokeWidth={1} />
              <Line
                type="monotone"
                dataKey="cfr"
                name="CFR"
                stroke={COLOR.warning}
                strokeWidth={2.5}
                dot={{ r: 3, fill: COLOR.warning, strokeWidth: 0 }}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </Box>
      </Box>

      {/* MTTR */}
      <Box>
        <Typography variant="caption" sx={{ fontWeight: 600, color: COLOR.textMuted }}>
          MTTR (中央値 h)
        </Typography>
        <Box sx={{ height: 180 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={series} margin={{ top: 10, right: 10, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: COLOR.textMuted }} tickLine={false} />
              <YAxis
                tick={{ fontSize: 10, fill: COLOR.textMuted }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => (v < 24 ? `${v}h` : `${(v / 24).toFixed(0)}d`)}
              />
              <Tooltip
                contentStyle={{ borderRadius: 8, border: `1px solid ${COLOR.border}`, fontSize: 12 }}
                formatter={(v: number) => [formatHours(v), 'MTTR']}
              />
              <ReferenceLine y={24} stroke={COLOR.warning} strokeDasharray="4 4" strokeWidth={1} />
              <Line
                type="monotone"
                dataKey="mttrMedian"
                name="MTTR"
                stroke={COLOR.error}
                strokeWidth={2.5}
                dot={{ r: 3, fill: COLOR.error, strokeWidth: 0 }}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </Box>
      </Box>
    </Box>
  </Paper>
)

// =============================================================================
// Benchmark comparison table
// =============================================================================

const BENCHMARKS = [
  {
    metric: 'Deployment Frequency',
    getValue: (m: DoraMetrics) => `${m.deployFrequency.value} PR/日`,
    getLevel: (m: DoraMetrics) => m.deployFrequency.level,
    thresholds: ['≥ 1 PR/日', '≥ 週1', '≥ 月1', '< 月1'],
  },
  {
    metric: 'Lead Time',
    getValue: (m: DoraMetrics) => formatHours(m.leadTime.medianHours),
    getLevel: (m: DoraMetrics) => m.leadTime.level,
    thresholds: ['< 1h', '< 1d', '< 1w', '≥ 1w'],
  },
  {
    metric: 'Change Failure Rate',
    getValue: (m: DoraMetrics) => `${(m.changeFailureRate.value * 100).toFixed(1)}%`,
    getLevel: (m: DoraMetrics) => m.changeFailureRate.level,
    thresholds: ['< 5%', '< 15%', '< 30%', '≥ 30%'],
  },
  {
    metric: 'MTTR',
    getValue: (m: DoraMetrics) => (m.mttr.medianHours > 0 ? formatHours(m.mttr.medianHours) : '—'),
    getLevel: (m: DoraMetrics) => m.mttr.level,
    thresholds: ['< 1h', '< 1d', '< 1w', '≥ 1w'],
  },
]

const LEVELS: DoraLevel[] = ['elite', 'high', 'medium', 'low']

const BenchmarkTable: React.FC<{ metrics: DoraMetrics }> = ({ metrics }) => (
  <Paper variant="outlined" sx={{ p: 3, borderColor: COLOR.border, borderRadius: 2 }}>
    <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 0.5 }}>
      業界ベンチマーク比較
    </Typography>
    <Typography variant="caption" sx={{ color: COLOR.textMuted }}>
      DORA State of DevOps 準拠のパフォーマンスレベル
    </Typography>
    <TableContainer sx={{ mt: 2 }}>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell sx={{ color: COLOR.textMuted, fontWeight: 600 }}>指標</TableCell>
            <TableCell sx={{ color: COLOR.textMuted, fontWeight: 600 }}>チーム値</TableCell>
            {LEVELS.map((l) => (
              <TableCell key={l} align="center" sx={{ color: DORA_LEVEL_COLOR[l], fontWeight: 600 }}>
                {DORA_LEVEL_LABEL[l]}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {BENCHMARKS.map((b) => {
            const level = b.getLevel(metrics)
            return (
              <TableRow key={b.metric} sx={{ '&:last-child td': { border: 0 } }}>
                <TableCell sx={{ fontWeight: 500 }}>{b.metric}</TableCell>
                <TableCell
                  sx={{
                    fontWeight: 700,
                    color: DORA_LEVEL_COLOR[level],
                  }}
                >
                  {b.getValue(metrics)}
                </TableCell>
                {LEVELS.map((l, i) => (
                  <TableCell
                    key={l}
                    align="center"
                    sx={{
                      bgcolor: level === l ? `${DORA_LEVEL_COLOR[l]}14` : undefined,
                      fontWeight: level === l ? 700 : 400,
                      color: level === l ? DORA_LEVEL_COLOR[l] : COLOR.textMuted,
                      border: level === l ? `2px solid ${DORA_LEVEL_COLOR[l]}` : undefined,
                      borderRadius: level === l ? 1 : 0,
                    }}
                  >
                    {b.thresholds[i]}
                  </TableCell>
                ))}
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </TableContainer>
  </Paper>
)

// =============================================================================
// CFR detail list
// =============================================================================

const CfrDetailList: React.FC<{ metrics: DoraMetrics }> = ({ metrics }) => (
  <Paper variant="outlined" sx={{ p: 3, borderColor: COLOR.border, borderRadius: 2 }}>
    <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 0.5 }}>
      Hotfix / Bugfix PR 一覧
    </Typography>
    <Typography variant="caption" sx={{ color: COLOR.textMuted }}>
      Change Failure Rate の分子 · {metrics.changeFailureRate.failurePrs.length} 件 /{' '}
      {formatInt(metrics.changeFailureRate.totalMerged)} マージ中
    </Typography>
    <TableContainer sx={{ mt: 2, maxHeight: 360 }}>
      <Table size="small" stickyHeader>
        <TableHead>
          <TableRow>
            <TableCell sx={{ color: COLOR.textMuted, fontWeight: 600 }}>#</TableCell>
            <TableCell sx={{ color: COLOR.textMuted, fontWeight: 600 }}>PR</TableCell>
            <TableCell sx={{ color: COLOR.textMuted, fontWeight: 600 }}>タイトル</TableCell>
            <TableCell sx={{ color: COLOR.textMuted, fontWeight: 600 }}>種別</TableCell>
            <TableCell sx={{ color: COLOR.textMuted, fontWeight: 600 }}>作成者</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {metrics.changeFailureRate.failurePrs.map((pr, i) => (
            <TableRow key={pr.number} sx={{ '&:last-child td': { border: 0 } }}>
              <TableCell sx={{ color: COLOR.textMuted }}>{i + 1}</TableCell>
              <TableCell sx={{ fontWeight: 500 }}>#{pr.number}</TableCell>
              <TableCell
                sx={{
                  maxWidth: 420,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {pr.title}
              </TableCell>
              <TableCell>
                <Chip
                  label={pr.prType}
                  size="small"
                  sx={{
                    bgcolor: pr.prType === 'hotfix' ? `${COLOR.error}14` : `${COLOR.warning}14`,
                    color: pr.prType === 'hotfix' ? COLOR.error : COLOR.warning,
                    fontWeight: 600,
                    height: 22,
                  }}
                />
              </TableCell>
              <TableCell sx={{ color: COLOR.textMuted }}>{pr.author}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  </Paper>
)

// =============================================================================
// Shared
// =============================================================================

const LevelBadge: React.FC<{ level: DoraLevel }> = ({ level }) => (
  <Chip
    label={DORA_LEVEL_LABEL[level]}
    size="small"
    sx={{
      bgcolor: `${DORA_LEVEL_COLOR[level]}14`,
      color: DORA_LEVEL_COLOR[level],
      fontWeight: 700,
      height: 20,
      fontSize: 11,
    }}
  />
)

const ScopeToggle: React.FC<{ scope: Scope; onChange: (s: Scope) => void }> = ({ scope, onChange }) => (
  <Box
    sx={{
      display: 'inline-flex',
      p: 0.5,
      bgcolor: COLOR.bgSoft,
      border: `1px solid ${COLOR.border}`,
      borderRadius: 2,
    }}
  >
    {[
      { key: 'sprint' as Scope, label: '現スプリント' },
      { key: 'all' as Scope, label: '全期間 (90日)' },
    ].map((o) => {
      const active = scope === o.key
      return (
        <Box
          key={o.key}
          onClick={() => onChange(o.key)}
          sx={{
            px: 2,
            py: 0.5,
            borderRadius: 1.5,
            cursor: 'pointer',
            fontSize: 12,
            fontWeight: 600,
            color: active ? '#111827' : COLOR.textMuted,
            bgcolor: active ? '#fff' : 'transparent',
            boxShadow: active ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
            transition: 'all .15s',
          }}
        >
          {o.label}
        </Box>
      )
    })}
  </Box>
)
