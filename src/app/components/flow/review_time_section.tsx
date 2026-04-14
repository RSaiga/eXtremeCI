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
  Typography,
} from '@mui/material'
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
import { ReviewTimes } from '../../domain/models/review_time/review_times'
import { COLOR, DeltaBadge, formatHours, SectionHeader } from './shared'

const BUCKETS = [
  { min: 0, max: 1, label: '< 1h', color: COLOR.success },
  { min: 1, max: 4, label: '1–4h', color: '#4caf50' },
  { min: 4, max: 12, label: '4–12h', color: COLOR.primary },
  { min: 12, max: 24, label: '12–24h', color: '#90caf9' },
  { min: 24, max: 72, label: '1–3d', color: COLOR.warning },
  { min: 72, max: Infinity, label: '3d+', color: COLOR.error },
]

export interface ReviewTimeSprintPoint {
  label: string
  index: number
  median: number
  count: number
}

interface Props {
  current: ReviewTimes
  previous: ReviewTimes
  sprintSeries: ReviewTimeSprintPoint[]
}

export const ReviewTimeSection: React.FC<Props> = ({ current, previous, sprintSeries }) => {
  const { distribution, fastRate, pendingCount } = useMemo(() => {
    const reviewed = current.reviewedPrs
    const pending = current.pendingReviewPrs.length
    const hours = reviewed.map((r) => r.waitTimeHours || 0)
    const dist = BUCKETS.map((b) => ({
      label: b.label,
      count: hours.filter((h) => h >= b.min && h < b.max).length,
      color: b.color,
    }))
    const fast = reviewed.length ? (hours.filter((h) => h < 4).length / reviewed.length) * 100 : 0
    return { distribution: dist, fastRate: fast, pendingCount: pending }
  }, [current])

  const reviewerStats = current.reviewerStats().slice(0, 10)

  if (current.reviewedPrs.length === 0) {
    return (
      <Paper variant="outlined" sx={{ p: 4, textAlign: 'center', borderColor: COLOR.border }}>
        <Typography color="text.secondary">このスプリントにはレビュー待ち時間のデータがありません</Typography>
      </Paper>
    )
  }

  const medWait = current.medianWaitTimeHours()
  const prevMedWait = previous.medianWaitTimeHours()
  const avgWait = current.avgWaitTimeHours()
  const prevAvgWait = previous.avgWaitTimeHours()

  return (
    <Stack spacing={3}>
      <SectionHeader
        overline="REVIEW WAIT"
        title="レビュー待ち時間"
        desc="PR 作成から最初のレビューまで · 数時間以内が理想"
      />

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '5fr 3fr' },
          gap: 3,
        }}
      >
        <Paper variant="outlined" sx={{ p: 3, borderColor: COLOR.border, borderRadius: 2 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 0.5 }}>
            待ち時間分布
          </Typography>
          <Typography variant="caption" sx={{ color: COLOR.textMuted }}>
            4時間以内が{' '}
            <Box component="span" sx={{ fontWeight: 700, color: fastRate >= 50 ? COLOR.success : COLOR.warning }}>
              {fastRate.toFixed(0)}%
            </Box>
          </Typography>
          <Box sx={{ height: 240, mt: 2 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={distribution} margin={{ top: 10, right: 10, bottom: 0, left: 0 }}>
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
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: 8,
                    border: `1px solid ${COLOR.border}`,
                    fontSize: 12,
                  }}
                  formatter={(v: number) => [`${v} PR`, '件数']}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {distribution.map((d) => (
                    <Cell key={d.label} fill={d.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Box>
        </Paper>

        <Paper variant="outlined" sx={{ p: 3, borderColor: COLOR.border, borderRadius: 2 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
            サマリー
          </Typography>
          <Stack spacing={2}>
            <StatRow
              label="中央値"
              value={formatHours(medWait)}
              delta={<DeltaBadge current={medWait} previous={prevMedWait} invertGood />}
            />
            <StatRow
              label="平均"
              value={formatHours(avgWait)}
              delta={<DeltaBadge current={avgWait} previous={prevAvgWait} invertGood />}
            />
            <StatRow label="レビュー済 PR" value={String(current.reviewedPrs.length)} />
            <StatRow
              label="未レビュー PR"
              value={String(pendingCount)}
              color={pendingCount > 0 ? COLOR.warning : undefined}
            />
          </Stack>
        </Paper>
      </Box>

      <Paper variant="outlined" sx={{ p: 3, borderColor: COLOR.border, borderRadius: 2 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
          スプリント推移
        </Typography>
        <Typography variant="caption" sx={{ color: COLOR.textMuted }}>
          各スプリントの中央値待ち時間
        </Typography>
        <Box sx={{ height: 220, mt: 2 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={sprintSeries} margin={{ top: 10, right: 20, bottom: 0, left: 0 }}>
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
                formatter={(v: number) => [formatHours(v), '中央値']}
                labelFormatter={(l) => `スプリント: ${l}`}
              />
              <ReferenceLine y={4} stroke={COLOR.warning} strokeDasharray="4 4" strokeWidth={1.5} />
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

      {reviewerStats.length > 0 && (
        <Paper variant="outlined" sx={{ p: 3, borderColor: COLOR.border, borderRadius: 2 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 0.5 }}>
            レビュアー別レスポンス
          </Typography>
          <Typography variant="caption" sx={{ color: COLOR.textMuted }}>
            現スプリント · 速い順・上位10名
          </Typography>
          <TableContainer sx={{ mt: 2 }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ color: COLOR.textMuted, fontWeight: 600 }}>#</TableCell>
                  <TableCell sx={{ color: COLOR.textMuted, fontWeight: 600 }}>レビュアー</TableCell>
                  <TableCell align="right" sx={{ color: COLOR.textMuted, fontWeight: 600 }}>
                    レビュー数
                  </TableCell>
                  <TableCell align="right" sx={{ color: COLOR.textMuted, fontWeight: 600 }}>
                    平均応答
                  </TableCell>
                  <TableCell sx={{ color: COLOR.textMuted, fontWeight: 600 }}>評価</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {reviewerStats.map((r, i) => {
                  const h = r.avgResponseTimeHours
                  const color = h < 4 ? COLOR.success : h < 24 ? COLOR.primary : h < 72 ? COLOR.warning : COLOR.error
                  const label = h < 4 ? 'Fast' : h < 24 ? 'Normal' : h < 72 ? 'Slow' : 'V.Slow'
                  return (
                    <TableRow key={r.reviewer} sx={{ '&:last-child td': { border: 0 } }}>
                      <TableCell sx={{ color: COLOR.textMuted }}>{i + 1}</TableCell>
                      <TableCell sx={{ fontWeight: 500 }}>{r.reviewer}</TableCell>
                      <TableCell align="right">{r.reviewCount}</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600 }}>
                        {formatHours(h)}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={label}
                          size="small"
                          sx={{
                            bgcolor: `${color}14`,
                            color,
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
