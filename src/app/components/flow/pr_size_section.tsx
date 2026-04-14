import React, { useMemo } from 'react'
import { Box, Paper, Stack, Typography } from '@mui/material'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { PrSizes } from '../../domain/models/pr_size/pr_sizes'
import { COLOR, DeltaBadge, formatInt, SectionHeader } from './shared'

const SIZE_ORDER: Array<{
  key: 'XS' | 'S' | 'M' | 'L' | 'XL'
  label: string
  range: string
  color: string
}> = [
  { key: 'XS', label: 'XS', range: '≤10', color: COLOR.success },
  { key: 'S', label: 'S', range: '11–50', color: '#4caf50' },
  { key: 'M', label: 'M', range: '51–250', color: COLOR.primary },
  { key: 'L', label: 'L', range: '251–500', color: COLOR.warning },
  { key: 'XL', label: 'XL', range: '500+', color: COLOR.error },
]

export interface PrSizeSprintPoint {
  label: string
  index: number
  median: number
  count: number
}

interface Props {
  current: PrSizes
  previous: PrSizes
  sprintSeries: PrSizeSprintPoint[]
}

export const PrSizeSection: React.FC<Props> = ({ current, previous, sprintSeries }) => {
  const { categoryData, goodRate, authorData } = useMemo(() => {
    const counts = current.countByCategory()
    const total = current.values.length || 1

    const catData = SIZE_ORDER.map((s) => ({
      label: s.label,
      range: s.range,
      count: counts[s.key],
      color: s.color,
      pct: (counts[s.key] / total) * 100,
    }))

    const goodN = counts.XS + counts.S + counts.M
    const good = (goodN / total) * 100

    const authorMap = new Map<string, number[]>()
    current.values.forEach((v) => {
      const arr = authorMap.get(v.user) || []
      arr.push(v.totalChanges)
      authorMap.set(v.user, arr)
    })
    const authorArr = [...authorMap.entries()]
      .map(([user, changes]) => ({
        user,
        count: changes.length,
        avg: Math.round(changes.reduce((a, b) => a + b, 0) / changes.length),
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)

    return { categoryData: catData, goodRate: good, authorData: authorArr }
  }, [current])

  if (current.values.length === 0) {
    return (
      <Paper variant="outlined" sx={{ p: 4, textAlign: 'center', borderColor: COLOR.border }}>
        <Typography color="text.secondary">このスプリントには PR サイズデータがありません</Typography>
      </Paper>
    )
  }

  const medSize = current.medianChanges()
  const prevMedSize = previous.medianChanges()
  const avgSize = Math.round(current.avgChanges())
  const prevAvgSize = Math.round(previous.avgChanges())

  return (
    <Stack spacing={3}>
      <SectionHeader
        overline="PR SIZE"
        title="PR サイズ"
        desc="1 PR あたりの変更行数 · 小さいほどレビュー速度と品質が上がる"
      />

      <Paper variant="outlined" sx={{ p: 3, borderColor: COLOR.border, borderRadius: 2 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={2}>
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
              サイズ分布
            </Typography>
            <Typography variant="caption" sx={{ color: COLOR.textMuted }}>
              XS〜M が大半なのが理想 · 現状{' '}
              <Box component="span" sx={{ fontWeight: 700, color: goodRate >= 70 ? COLOR.success : COLOR.warning }}>
                {goodRate.toFixed(0)}%
              </Box>
            </Typography>
          </Box>
        </Stack>
        <Box sx={{ height: 260 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={categoryData} margin={{ top: 10, right: 10, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 12, fill: COLOR.textMuted }}
                axisLine={{ stroke: COLOR.border }}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: COLOR.textMuted }}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: 8,
                  border: `1px solid ${COLOR.border}`,
                  fontSize: 12,
                }}
                formatter={(v: number, _n: string, p: { payload: { range: string; pct: number } }) => [
                  `${v} PR (${p.payload.pct.toFixed(1)}%)`,
                  `${p.payload.range} 行`,
                ]}
              />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {categoryData.map((d) => (
                  <Cell key={d.label} fill={d.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Box>
      </Paper>

      <Paper variant="outlined" sx={{ p: 3, borderColor: COLOR.border, borderRadius: 2 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={2}>
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
              スプリント推移
            </Typography>
            <Typography variant="caption" sx={{ color: COLOR.textMuted }}>
              各スプリントの中央値行数
            </Typography>
          </Box>
        </Stack>
        <Box sx={{ height: 220 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={sprintSeries} margin={{ top: 10, right: 20, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: COLOR.textMuted }}
                axisLine={{ stroke: COLOR.border }}
                tickLine={false}
              />
              <YAxis tick={{ fontSize: 11, fill: COLOR.textMuted }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{
                  borderRadius: 8,
                  border: `1px solid ${COLOR.border}`,
                  fontSize: 12,
                }}
                formatter={(v: number) => [`${formatInt(Math.round(v))} 行`, '中央値']}
                labelFormatter={(l) => `スプリント: ${l}`}
              />
              <ReferenceLine y={250} stroke={COLOR.warning} strokeDasharray="4 4" strokeWidth={1.5} />
              <Line
                type="monotone"
                dataKey="median"
                stroke={COLOR.primary}
                strokeWidth={2.5}
                dot={{ r: 4, fill: COLOR.primary, strokeWidth: 0 }}
                activeDot={{ r: 6 }}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </Box>
      </Paper>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
          gap: 3,
        }}
      >
        <Paper variant="outlined" sx={{ p: 3, borderColor: COLOR.border, borderRadius: 2 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
            基本統計
          </Typography>
          <Stack spacing={2}>
            <StatRow
              label="中央値"
              value={`${formatInt(medSize)} 行`}
              delta={<DeltaBadge current={medSize} previous={prevMedSize} invertGood />}
            />
            <StatRow
              label="平均"
              value={`${formatInt(avgSize)} 行`}
              delta={<DeltaBadge current={avgSize} previous={prevAvgSize} invertGood />}
            />
            <StatRow label="PR 数" value={formatInt(current.values.length)} />
            <StatRow
              label="XS〜M の割合"
              value={`${goodRate.toFixed(0)}%`}
              color={goodRate >= 70 ? COLOR.success : COLOR.warning}
            />
          </Stack>
        </Paper>

        <Paper variant="outlined" sx={{ p: 3, borderColor: COLOR.border, borderRadius: 2 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
            担当者別（PR数トップ10）
          </Typography>
          <Stack spacing={1.25}>
            {authorData.map((a) => {
              const maxAvg = Math.max(...authorData.map((x) => x.avg), 1)
              const pct = (a.avg / maxAvg) * 100
              const color = a.avg > 500 ? COLOR.error : a.avg > 250 ? COLOR.warning : COLOR.success
              return (
                <Box key={a.user}>
                  <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.25 }}>
                    <Typography variant="caption" sx={{ fontWeight: 500 }}>
                      {a.user}{' '}
                      <Box component="span" sx={{ color: COLOR.textMuted }}>
                        ({a.count} PR)
                      </Box>
                    </Typography>
                    <Typography variant="caption" sx={{ fontWeight: 700, color }}>
                      平均 {formatInt(a.avg)} 行
                    </Typography>
                  </Stack>
                  <Box sx={{ height: 6, bgcolor: COLOR.bgSoft, borderRadius: 3, overflow: 'hidden' }}>
                    <Box sx={{ width: `${pct}%`, height: '100%', bgcolor: color }} />
                  </Box>
                </Box>
              )
            })}
          </Stack>
        </Paper>
      </Box>
    </Stack>
  )
}

const StatRow: React.FC<{
  label: string
  value: string
  color?: string
  delta?: React.ReactNode
}> = ({ label, value, color, delta }) => (
  <Box>
    <Stack direction="row" justifyContent="space-between" alignItems="baseline">
      <Typography variant="body2" sx={{ color: COLOR.textMuted }}>
        {label}
      </Typography>
      <Typography variant="h6" sx={{ fontWeight: 700, color: color || '#111827' }}>
        {value}
      </Typography>
    </Stack>
    {delta && <Box sx={{ textAlign: 'right', mt: 0.25 }}>{delta}</Box>}
  </Box>
)
