import React, { useMemo } from 'react'
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
  Tooltip as MuiTooltip,
  Typography,
} from '@mui/material'
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { ReadTimes } from '../../domain/models/read_time/read.times'
import { COLOR, DeltaBadge, formatHours, KpiCard, SectionHeader } from '../flow/shared'

const GOAL_HOURS = 24

const verdictOf = (m: number): { label: string; color: string } => {
  if (m === 0) return { label: 'データなし', color: COLOR.textMuted }
  if (m < 4) return { label: 'Fast', color: COLOR.fast }
  if (m < 24) return { label: 'Normal', color: COLOR.normal }
  if (m < 72) return { label: 'Slow', color: COLOR.slow }
  return { label: 'Very Slow', color: COLOR.error }
}

export interface LeadTimeSprintPoint {
  label: string
  index: number
  median: number
  p75: number
  count: number
}

interface Props {
  current: ReadTimes
  previous: ReadTimes
  sprintSeries: LeadTimeSprintPoint[]
}

export const LeadTimeSection: React.FC<Props> = ({ current, previous, sprintSeries }) => {
  const count = current.values.length
  const med = current.median()
  const { p75 } = current
  const prevMed = previous.median()
  const prevP75 = previous.p75
  const verdict = verdictOf(med)

  const { fastRate, categoryPcts, authorStats } = useMemo(() => {
    const cats = current.countByCategory()
    const total = count || 1
    return {
      fastRate: ((cats.Fast + cats.Normal) / total) * 100,
      categoryPcts: {
        Fast: (cats.Fast / total) * 100,
        Normal: (cats.Normal / total) * 100,
        Slow: (cats.Slow / total) * 100,
        VerySlow: (cats['Very Slow'] / total) * 100,
        raw: cats,
      },
      authorStats: current.statsByAuthor().slice(0, 10),
    }
  }, [current, count])

  if (count === 0) {
    return (
      <Paper variant="outlined" sx={{ p: 4, textAlign: 'center', borderColor: COLOR.border }}>
        <Typography color="text.secondary">このスプリントにはリードタイムデータがありません</Typography>
      </Paper>
    )
  }

  return (
    <Stack spacing={3}>
      <SectionHeader
        overline="LEAD TIME"
        title="リードタイム"
        desc="最初のコミットから PR マージまでの時間"
        right={
          <Chip label={verdict.label} size="small" sx={{ bgcolor: verdict.color, color: '#fff', fontWeight: 700 }} />
        }
      />

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
          gap: 2,
        }}
      >
        <KpiCard
          label="中央値"
          value={formatHours(med)}
          sub={<DeltaBadge current={med} previous={prevMed} invertGood />}
          accent={verdict.color}
          hint="現スプリントの中央値"
        />
        <KpiCard
          label="P75"
          value={formatHours(p75)}
          sub={<DeltaBadge current={p75} previous={prevP75} invertGood />}
          hint="75% がこれ以内"
        />
        <KpiCard
          label="PR 数"
          value={String(count)}
          sub={<DeltaBadge current={count} previous={previous.values.length} invertGood={false} />}
        />
        <KpiCard
          label="速い PR 率"
          value={`${fastRate.toFixed(0)}%`}
          sub={
            <Typography variant="caption" sx={{ color: COLOR.textMuted }}>
              24h 以内 (Fast+Normal)
            </Typography>
          }
          accent={COLOR.success}
        />
      </Box>

      {/* スプリント推移 */}
      <Paper variant="outlined" sx={{ p: 3, borderColor: COLOR.border, borderRadius: 2 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={2}>
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
              スプリント推移
            </Typography>
            <Typography variant="caption" sx={{ color: COLOR.textMuted }}>
              各スプリントの中央値と P75
            </Typography>
          </Box>
          <Stack direction="row" spacing={2}>
            <LegendDot color={COLOR.primary} label="中央値" />
            <LegendDot color={COLOR.primaryLight} label="P75" solid />
            <LegendDot color={COLOR.warning} label={`目標 ${GOAL_HOURS}h`} dashed />
          </Stack>
        </Stack>
        <Box sx={{ height: 280 }}>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={sprintSeries} margin={{ top: 10, right: 20, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="leadp75grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={COLOR.primary} stopOpacity={0.18} />
                  <stop offset="100%" stopColor={COLOR.primary} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: COLOR.textMuted }}
                axisLine={{ stroke: COLOR.border }}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: COLOR.textMuted }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => (v < 24 ? `${v}h` : `${(v / 24).toFixed(0)}d`)}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: 8,
                  border: `1px solid ${COLOR.border}`,
                  fontSize: 12,
                }}
                formatter={(value: number, name: string) => {
                  const jp = name === 'median' ? '中央値' : name === 'p75' ? 'P75' : name
                  return [formatHours(value), jp]
                }}
                labelFormatter={(l) => `スプリント: ${l}`}
              />
              <ReferenceLine y={GOAL_HOURS} stroke={COLOR.warning} strokeDasharray="4 4" strokeWidth={1.5} />
              <Area type="monotone" dataKey="p75" stroke="none" fill="url(#leadp75grad)" isAnimationActive={false} />
              <Line
                type="monotone"
                dataKey="median"
                stroke={COLOR.primary}
                strokeWidth={2.5}
                dot={{ r: 4, fill: COLOR.primary, strokeWidth: 0 }}
                activeDot={{ r: 6 }}
                isAnimationActive={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </Box>
      </Paper>

      {/* スピード内訳 */}
      <Paper variant="outlined" sx={{ p: 3, borderColor: COLOR.border, borderRadius: 2 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 0.5 }}>
          スピード内訳
        </Typography>
        <Typography variant="caption" sx={{ color: COLOR.textMuted }}>
          現スプリントの PR 件数カテゴリ別割合
        </Typography>
        <Box
          sx={{
            mt: 2,
            display: 'flex',
            height: 36,
            borderRadius: 1,
            overflow: 'hidden',
            border: `1px solid ${COLOR.border}`,
          }}
        >
          <CategorySegment pct={categoryPcts.Fast} color={COLOR.fast} label={`Fast ${categoryPcts.raw.Fast}`} />
          <CategorySegment pct={categoryPcts.Normal} color={COLOR.normal} label={`Normal ${categoryPcts.raw.Normal}`} />
          <CategorySegment pct={categoryPcts.Slow} color={COLOR.slow} label={`Slow ${categoryPcts.raw.Slow}`} />
          <CategorySegment
            pct={categoryPcts.VerySlow}
            color={COLOR.error}
            label={`V.Slow ${categoryPcts.raw['Very Slow']}`}
          />
        </Box>
        <Stack direction="row" spacing={3} sx={{ mt: 1.5, flexWrap: 'wrap' }}>
          <CategoryLegend color={COLOR.fast} name="Fast" range="< 4h" />
          <CategoryLegend color={COLOR.normal} name="Normal" range="4–24h" />
          <CategoryLegend color={COLOR.slow} name="Slow" range="1–3d" />
          <CategoryLegend color={COLOR.error} name="Very Slow" range="3d+" />
        </Stack>
      </Paper>

      {/* 担当者別ランキング */}
      {authorStats.length > 0 && (
        <Paper variant="outlined" sx={{ p: 3, borderColor: COLOR.border, borderRadius: 2 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 0.5 }}>
            担当者別
          </Typography>
          <Typography variant="caption" sx={{ color: COLOR.textMuted }}>
            現スプリント · 中央値の速い順（上位10名）
          </Typography>
          <TableContainer sx={{ mt: 2 }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ color: COLOR.textMuted, fontWeight: 600 }}>#</TableCell>
                  <TableCell sx={{ color: COLOR.textMuted, fontWeight: 600 }}>担当者</TableCell>
                  <TableCell align="right" sx={{ color: COLOR.textMuted, fontWeight: 600 }}>
                    PR 数
                  </TableCell>
                  <TableCell align="right" sx={{ color: COLOR.textMuted, fontWeight: 600 }}>
                    中央値
                  </TableCell>
                  <TableCell sx={{ color: COLOR.textMuted, fontWeight: 600 }} />
                  <TableCell sx={{ color: COLOR.textMuted, fontWeight: 600 }}>評価</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {authorStats.map((a, i) => {
                  const v = verdictOf(a.medianHours)
                  const maxMed = Math.max(...authorStats.map((s) => s.medianHours), 1)
                  const barPct = (a.medianHours / maxMed) * 100
                  return (
                    <TableRow key={a.author} sx={{ '&:last-child td': { border: 0 } }}>
                      <TableCell sx={{ color: COLOR.textMuted }}>{i + 1}</TableCell>
                      <TableCell sx={{ fontWeight: 500 }}>{a.author}</TableCell>
                      <TableCell align="right">{a.count}</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600 }}>
                        {formatHours(a.medianHours)}
                      </TableCell>
                      <TableCell sx={{ width: 120 }}>
                        <Box sx={{ height: 6, bgcolor: COLOR.bgSoft, borderRadius: 3, overflow: 'hidden' }}>
                          <Box sx={{ width: `${barPct}%`, height: '100%', bgcolor: v.color }} />
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={v.label}
                          size="small"
                          sx={{
                            bgcolor: `${v.color}14`,
                            color: v.color,
                            fontWeight: 600,
                            height: 22,
                          }}
                        />
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}
    </Stack>
  )
}

const LegendDot: React.FC<{ color: string; label: string; solid?: boolean; dashed?: boolean }> = ({
  color,
  label,
  solid,
  dashed,
}) => (
  <Stack direction="row" alignItems="center" spacing={0.75}>
    <Box
      sx={{
        width: 14,
        height: solid ? 10 : 2,
        bgcolor: solid ? color : 'transparent',
        borderTop: solid ? 'none' : `2px ${dashed ? 'dashed' : 'solid'} ${color}`,
        borderRadius: solid ? 0.5 : 0,
      }}
    />
    <Typography variant="caption" sx={{ color: COLOR.textMuted }}>
      {label}
    </Typography>
  </Stack>
)

const CategorySegment: React.FC<{ pct: number; color: string; label: string }> = ({ pct, color, label }) => {
  if (pct <= 0) return null
  return (
    <MuiTooltip title={`${label} (${pct.toFixed(1)}%)`} arrow>
      <Box
        sx={{
          width: `${pct}%`,
          bgcolor: color,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#fff',
          fontSize: 11,
          fontWeight: 600,
          overflow: 'hidden',
          whiteSpace: 'nowrap',
          '&:hover': { opacity: 0.85 },
        }}
      >
        {pct >= 8 ? `${pct.toFixed(0)}%` : ''}
      </Box>
    </MuiTooltip>
  )
}

const CategoryLegend: React.FC<{ color: string; name: string; range: string }> = ({ color, name, range }) => (
  <Stack direction="row" alignItems="center" spacing={0.75}>
    <Box sx={{ width: 10, height: 10, bgcolor: color, borderRadius: 0.5 }} />
    <Typography variant="caption" sx={{ fontWeight: 600 }}>
      {name}
    </Typography>
    <Typography variant="caption" sx={{ color: COLOR.textMuted }}>
      {range}
    </Typography>
  </Stack>
)
