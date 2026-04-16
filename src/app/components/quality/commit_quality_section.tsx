import React from 'react'
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
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { AuthorCommitQuality, CommitQualityMetrics } from '../../domain/models/commit_quality/commit_quality'
import { COLOR, formatInt, KpiCard, SectionHeader } from '../flow/shared'

export interface CommitQualitySprintPoint {
  label: string
  small: number
  large: number
  avgLines: number
  totalCommits: number
}

interface Props {
  metrics: CommitQualityMetrics
  authors: AuthorCommitQuality[]
  sprintSeries: CommitQualitySprintPoint[]
}

const WORK_STYLE_COLOR: Record<string, string> = {
  incremental: COLOR.success,
  mixed: COLOR.warning,
  batch: COLOR.error,
}

const CATEGORY_COLORS = {
  XS: COLOR.success,
  S: '#4caf50',
  M: COLOR.primary,
  L: COLOR.warning,
  XL: COLOR.error,
} as const

export const CommitQualitySection: React.FC<Props> = ({ metrics, authors, sprintSeries }) => {
  const { style, label } = detectWorkStyle(metrics)
  const workStyleColor = WORK_STYLE_COLOR[style] || COLOR.textMuted

  const smallPct = Math.round(metrics.smallCommitRatio * 100)
  const largePct = Math.round(metrics.largeCommitRatio * 100)

  return (
    <Stack spacing={3}>
      <SectionHeader
        overline="COMMIT QUALITY"
        title="コミット品質"
        desc="小さく頻繁にコミットしているか · レビューしやすさの指標"
      />

      {/* ヒーロー */}
      <Paper
        variant="outlined"
        sx={{
          p: 3,
          borderColor: COLOR.border,
          borderRadius: 2,
          borderLeft: `4px solid ${workStyleColor}`,
        }}
      >
        <Typography variant="caption" sx={{ color: COLOR.textMuted, letterSpacing: 0.5 }}>
          WORK STYLE
        </Typography>
        <Typography variant="h4" sx={{ fontWeight: 700, color: workStyleColor, mt: 0.5 }}>
          {label}
        </Typography>
        <Typography variant="body2" sx={{ color: COLOR.textMuted, mt: 0.5 }}>
          {descriptionForStyle(style)}
        </Typography>
      </Paper>

      {/* KPI 4枚 */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, 1fr)' },
          gap: 2,
        }}
      >
        <KpiCard
          label="平均行数/commit"
          value={formatInt(metrics.avgLinesPerCommit)}
          sub={<Sub>中央値 {formatInt(metrics.medianLinesPerCommit)}</Sub>}
          hint="1コミットあたりの追加・削除行数の平均"
          accent={
            metrics.avgLinesPerCommit <= 50
              ? COLOR.success
              : metrics.avgLinesPerCommit <= 150
                ? COLOR.warning
                : COLOR.error
          }
        />
        <KpiCard
          label="小コミット率"
          value={`${smallPct}%`}
          sub={<Sub>目標 ≥70%</Sub>}
          hint="XS+S (50行以下) のコミットの割合"
          accent={smallPct >= 70 ? COLOR.success : smallPct >= 50 ? COLOR.warning : COLOR.error}
        />
        <KpiCard
          label="大コミット率"
          value={`${largePct}%`}
          sub={<Sub>目標 ≤10%</Sub>}
          hint="L+XL (151行以上) のコミットの割合"
          accent={largePct <= 10 ? COLOR.success : largePct <= 20 ? COLOR.warning : COLOR.error}
        />
        <KpiCard
          label="Reviewability"
          value={`${metrics.reviewabilityScore}`}
          sub={<Sub>/ 100</Sub>}
          hint="レビューしやすさ総合スコア"
          accent={
            metrics.reviewabilityScore >= 70
              ? COLOR.success
              : metrics.reviewabilityScore >= 50
                ? COLOR.warning
                : COLOR.error
          }
        />
      </Box>

      {/* サイズ分布 */}
      <Paper variant="outlined" sx={{ p: 3, borderColor: COLOR.border, borderRadius: 2 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 0.5 }}>
          サイズ分布
        </Typography>
        <Typography variant="caption" sx={{ color: COLOR.textMuted }}>
          全 {formatInt(metrics.totalCommits)} コミットの内訳
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
          {metrics.sizeDistribution.map((d) => {
            if (d.percentage <= 0) return null
            const color = CATEGORY_COLORS[d.category.name]
            return (
              <MuiTooltip
                key={d.category.name}
                title={`${d.category.label}: ${d.count} (${d.percentage.toFixed(1)}%)`}
                arrow
              >
                <Box
                  sx={{
                    width: `${d.percentage}%`,
                    bgcolor: color,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                    fontSize: 11,
                    fontWeight: 600,
                  }}
                >
                  {d.percentage >= 8 ? `${d.percentage.toFixed(0)}%` : ''}
                </Box>
              </MuiTooltip>
            )
          })}
        </Box>
        <Stack direction="row" spacing={2} sx={{ mt: 1.5, flexWrap: 'wrap' }}>
          {metrics.sizeDistribution.map((d) => (
            <Stack key={d.category.name} direction="row" alignItems="center" spacing={0.75}>
              <Box
                sx={{
                  width: 10,
                  height: 10,
                  bgcolor: CATEGORY_COLORS[d.category.name],
                  borderRadius: 0.5,
                }}
              />
              <Typography variant="caption" sx={{ fontWeight: 600 }}>
                {d.category.name}
              </Typography>
              <Typography variant="caption" sx={{ color: COLOR.textMuted }}>
                {d.category.label.replace(/^.+?\s/, '')}
              </Typography>
            </Stack>
          ))}
        </Stack>
      </Paper>

      {/* スプリント推移 */}
      {sprintSeries.length > 1 && (
        <Paper variant="outlined" sx={{ p: 3, borderColor: COLOR.border, borderRadius: 2 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={2}>
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                スプリント推移
              </Typography>
              <Typography variant="caption" sx={{ color: COLOR.textMuted }}>
                各スプリントの 小コミット率 と 大コミット率
              </Typography>
            </Box>
            <Stack direction="row" spacing={2}>
              <LegendLine color={COLOR.success} label="小コミット %" />
              <LegendLine color={COLOR.error} label="大コミット %" />
              <LegendLine color={COLOR.warning} label="目標 70%" dashed />
            </Stack>
          </Stack>
          <Box sx={{ height: 260 }}>
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
                  domain={[0, 100]}
                  tickFormatter={(v) => `${v}%`}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: 8,
                    border: `1px solid ${COLOR.border}`,
                    fontSize: 12,
                  }}
                  formatter={(v: number, name: string) => [`${v}%`, name === 'small' ? '小コミット' : '大コミット']}
                  labelFormatter={(l) => `スプリント: ${l}`}
                />
                <ReferenceLine y={70} stroke={COLOR.warning} strokeDasharray="4 4" strokeWidth={1.5} />
                <Line
                  type="monotone"
                  dataKey="small"
                  stroke={COLOR.success}
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: COLOR.success, strokeWidth: 0 }}
                  isAnimationActive={false}
                />
                <Line
                  type="monotone"
                  dataKey="large"
                  stroke={COLOR.error}
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: COLOR.error, strokeWidth: 0 }}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </Box>
        </Paper>
      )}

      {/* 担当者別 */}
      {authors.length > 0 && (
        <Paper variant="outlined" sx={{ p: 3, borderColor: COLOR.border, borderRadius: 2 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 0.5 }}>
            担当者別
          </Typography>
          <Typography variant="caption" sx={{ color: COLOR.textMuted }}>
            Reviewability Score の高い順 · 上位10名
          </Typography>
          <TableContainer sx={{ mt: 2 }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ color: COLOR.textMuted, fontWeight: 600 }}>#</TableCell>
                  <TableCell sx={{ color: COLOR.textMuted, fontWeight: 600 }}>作者</TableCell>
                  <TableCell align="right" sx={{ color: COLOR.textMuted, fontWeight: 600 }}>
                    コミット数
                  </TableCell>
                  <TableCell align="right" sx={{ color: COLOR.textMuted, fontWeight: 600 }}>
                    平均行数
                  </TableCell>
                  <TableCell sx={{ color: COLOR.textMuted, fontWeight: 600 }}>スタイル</TableCell>
                  <TableCell sx={{ color: COLOR.textMuted, fontWeight: 600 }}>Score</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {authors.slice(0, 10).map((a, i) => {
                  const sColor = WORK_STYLE_COLOR[a.workStyle] || COLOR.textMuted
                  return (
                    <TableRow key={a.author} sx={{ '&:last-child td': { border: 0 } }}>
                      <TableCell sx={{ color: COLOR.textMuted }}>{i + 1}</TableCell>
                      <TableCell sx={{ fontWeight: 500 }}>{a.author}</TableCell>
                      <TableCell align="right">{formatInt(a.totalCommits)}</TableCell>
                      <TableCell align="right">{formatInt(a.avgLinesPerCommit)}</TableCell>
                      <TableCell>
                        <Chip
                          label={a.workStyleLabel}
                          size="small"
                          sx={{ bgcolor: `${sColor}14`, color: sColor, fontWeight: 600, height: 22 }}
                        />
                      </TableCell>
                      <TableCell sx={{ minWidth: 120 }}>
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <Box
                            sx={{
                              flex: 1,
                              height: 6,
                              bgcolor: COLOR.bgSoft,
                              borderRadius: 3,
                              overflow: 'hidden',
                            }}
                          >
                            <Box
                              sx={{
                                width: `${a.reviewabilityScore}%`,
                                height: '100%',
                                bgcolor:
                                  a.reviewabilityScore >= 70
                                    ? COLOR.success
                                    : a.reviewabilityScore >= 50
                                      ? COLOR.warning
                                      : COLOR.error,
                              }}
                            />
                          </Box>
                          <Typography variant="caption" sx={{ fontWeight: 700, minWidth: 28 }}>
                            {a.reviewabilityScore}
                          </Typography>
                        </Stack>
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

function detectWorkStyle(m: CommitQualityMetrics): { style: string; label: string } {
  if (m.smallCommitRatio >= 0.6 && m.largeCommitRatio <= 0.1) {
    return { style: 'incremental', label: '刻み型（理想的）' }
  }
  if (m.largeCommitRatio >= 0.3) {
    return { style: 'batch', label: 'まとめ型（要改善）' }
  }
  return { style: 'mixed', label: '混合型' }
}

function descriptionForStyle(style: string): string {
  if (style === 'incremental') {
    return '小さく刻んだコミットが多く、レビューが容易でバグ混入リスクも低い理想的な状態です。'
  }
  if (style === 'batch') {
    return '大きなコミットが多く、レビュー品質低下・バグ混入・コンフリクト増加のリスクがあります。'
  }
  return '刻み型とまとめ型が混在しています。大きなコミットを減らす余地があります。'
}

const Sub: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Typography variant="caption" sx={{ color: COLOR.textMuted }}>
    {children}
  </Typography>
)

const LegendLine: React.FC<{ color: string; label: string; dashed?: boolean }> = ({ color, label, dashed }) => (
  <Stack direction="row" alignItems="center" spacing={0.75}>
    <Box
      sx={{
        width: 14,
        height: 2,
        borderTop: `2px ${dashed ? 'dashed' : 'solid'} ${color}`,
      }}
    />
    <Typography variant="caption" sx={{ color: COLOR.textMuted }}>
      {label}
    </Typography>
  </Stack>
)
