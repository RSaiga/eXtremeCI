import React from 'react'
import {
  Box,
  Link,
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
import { QualitySustainabilityMetrics } from '../../domain/models/quality_sustainability/quality_sustainability'
import { COLOR, formatInt, KpiCard, SectionHeader } from '../flow/shared'

export interface SustainSprintPoint {
  label: string
  inlineRefactor: number
  standalone: number
  bugfix: number
  sustainabilityScore: number
}

interface Props {
  sustain: QualitySustainabilityMetrics
  sprintSeries: SustainSprintPoint[]
}

const ORIENTATION_COLOR: Record<string, string> = {
  'long-term': COLOR.success,
  balanced: COLOR.primary,
  'short-term': COLOR.error,
}

const FLOW_COLOR: Record<string, string> = {
  continuous: COLOR.success,
  mixed: COLOR.warning,
  fragmented: COLOR.error,
}

const GRADE_COLOR: Record<string, string> = {
  A: COLOR.success,
  B: COLOR.primary,
  C: COLOR.warning,
  D: COLOR.error,
  F: COLOR.error,
}

export const SustainabilitySection: React.FC<Props> = ({ sustain, sprintSeries }) => {
  const { refactoringMetrics, sustainabilityGrade, sustainabilityScore, orientation, orientationLabel } = sustain
  const oColor = ORIENTATION_COLOR[orientation] || COLOR.textMuted
  const gradeColor = GRADE_COLOR[sustainabilityGrade] || COLOR.textMuted
  const flowColor = FLOW_COLOR[refactoringMetrics.flowHealth] || COLOR.textMuted

  const totalPrs = refactoringMetrics.totalPrs || 1
  const standalonePct = Math.round(refactoringMetrics.standalonePrRate * 100)
  const inlineRefactorPct = Math.round(refactoringMetrics.inlineRefactorRate * 100)
  const bugfixPct = Math.round((refactoringMetrics.bugfixPrs / totalPrs) * 100)
  const featurePct = Math.round((refactoringMetrics.featurePrs / totalPrs) * 100)
  const otherPct = Math.max(0, 100 - standalonePct - bugfixPct - featurePct)

  const breakdown = [
    { key: 'feature', label: 'Feature', count: refactoringMetrics.featurePrs, pct: featurePct, color: COLOR.primary },
    { key: 'bugfix', label: 'Bugfix', count: refactoringMetrics.bugfixPrs, pct: bugfixPct, color: COLOR.warning },
    {
      key: 'refactor',
      label: 'Refactor',
      count: refactoringMetrics.refactoringPrs,
      pct: standalonePct,
      color: COLOR.error,
    },
    { key: 'other', label: 'Other', count: refactoringMetrics.otherPrs, pct: otherPct, color: COLOR.textMuted },
  ]

  return (
    <Stack spacing={3}>
      <SectionHeader overline="SUSTAINABILITY" title="持続可能性" desc="速度と品質のバランス · 長期保守への投資" />

      {/* ヒーロー: Orientation + Grade 横並び */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '2fr 1fr' },
          gap: 2,
        }}
      >
        <Paper
          variant="outlined"
          sx={{ p: 3, borderColor: COLOR.border, borderRadius: 2, borderLeft: `4px solid ${oColor}` }}
        >
          <Typography variant="caption" sx={{ color: COLOR.textMuted, letterSpacing: 0.5 }}>
            ORIENTATION
          </Typography>
          <Typography variant="h4" sx={{ fontWeight: 700, color: oColor, mt: 0.5 }}>
            {orientationLabel}
          </Typography>
          <Typography variant="body2" sx={{ color: COLOR.textMuted, mt: 0.5 }}>
            {orientationDesc(orientation)}
          </Typography>
        </Paper>
        <Paper
          variant="outlined"
          sx={{
            p: 3,
            borderColor: COLOR.border,
            borderRadius: 2,
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
          }}
        >
          <Typography variant="caption" sx={{ color: COLOR.textMuted, letterSpacing: 0.5 }}>
            GRADE
          </Typography>
          <Typography
            sx={{
              fontSize: 72,
              fontWeight: 800,
              lineHeight: 1,
              color: gradeColor,
              mt: 0.5,
            }}
          >
            {sustainabilityGrade}
          </Typography>
          <Typography variant="body2" sx={{ color: COLOR.textMuted }}>
            Score {sustainabilityScore}/100
          </Typography>
        </Paper>
      </Box>

      {/* KPI 4枚 */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, 1fr)' },
          gap: 2,
        }}
      >
        <KpiCard
          label="継続的リファクタ率"
          value={`${inlineRefactorPct}%`}
          sub={<Sub>目標 ≥20%（切り出しリファクタPR以外での混在率）</Sub>}
          hint="切り出しリファクタ PR を除く全 PR のうち、コミットに refactor の意図（refactor/style/perf または関連キーワード）が混在しているものの割合"
          accent={inlineRefactorPct >= 20 ? COLOR.success : inlineRefactorPct >= 10 ? COLOR.warning : COLOR.error}
        />
        <KpiCard
          label="切り出しリファクタPR率"
          value={`${standalonePct}%`}
          sub={<Sub>目安 ≤10%（多いほどフロー分断）</Sub>}
          hint="リファクタ専用PRの割合。多い = リファクタが独立タスク化しフローが分断されている疑い"
          accent={standalonePct < 8 ? COLOR.success : standalonePct < 15 ? COLOR.warning : COLOR.error}
        />
        <KpiCard
          label="フロー健全性"
          value={refactoringMetrics.flowHealthLabel}
          sub={<Sub>{flowHint(refactoringMetrics.flowHealth)}</Sub>}
          accent={flowColor}
        />
        <KpiCard
          label="分析対象 PR"
          value={formatInt(refactoringMetrics.totalPrs)}
          sub={<Sub>継続的リファクタ率の分母 {formatInt(refactoringMetrics.featFixPrsEligible)}</Sub>}
        />
      </Box>

      {/* PR 種別内訳 */}
      <Paper variant="outlined" sx={{ p: 3, borderColor: COLOR.border, borderRadius: 2 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 0.5 }}>
          PR 種別内訳
        </Typography>
        <Typography variant="caption" sx={{ color: COLOR.textMuted }}>
          全 {formatInt(refactoringMetrics.totalPrs)} PR の分類
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
          {breakdown.map((b) =>
            b.pct > 0 ? (
              <MuiTooltip key={b.key} title={`${b.label}: ${b.count} (${b.pct}%)`} arrow>
                <Box
                  sx={{
                    width: `${b.pct}%`,
                    bgcolor: b.color,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                    fontSize: 11,
                    fontWeight: 600,
                  }}
                >
                  {b.pct >= 8 ? `${b.pct}%` : ''}
                </Box>
              </MuiTooltip>
            ) : null,
          )}
        </Box>
        <Stack direction="row" spacing={3} sx={{ mt: 1.5, flexWrap: 'wrap' }}>
          {breakdown.map((b) => (
            <Stack key={b.key} direction="row" alignItems="center" spacing={0.75}>
              <Box sx={{ width: 10, height: 10, bgcolor: b.color, borderRadius: 0.5 }} />
              <Typography variant="caption" sx={{ fontWeight: 600 }}>
                {b.label}
              </Typography>
              <Typography variant="caption" sx={{ color: COLOR.textMuted }}>
                {b.count}
              </Typography>
            </Stack>
          ))}
        </Stack>
      </Paper>

      {/* スプリント推移: 継続的リファクタ率 / 切り出し率 / バグ修正比率 */}
      {sprintSeries.length > 1 && (
        <Paper variant="outlined" sx={{ p: 3, borderColor: COLOR.border, borderRadius: 2 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={1}>
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                スプリント推移
              </Typography>
              <Typography variant="caption" sx={{ color: COLOR.textMuted }}>
                継続的リファクタ率（高いほど良い） · 切り出しリファクタ率（低いほど良い） · バグ修正比率
              </Typography>
            </Box>
            <Stack direction="row" spacing={2}>
              <LegendLine color={COLOR.success} label="継続的リファクタ率" />
              <LegendLine color={COLOR.error} label="切り出しリファクタ率" />
              <LegendLine color={COLOR.warning} label="バグ修正比率" />
              <LegendLine color={COLOR.primary} label="目標 20%" dashed />
            </Stack>
          </Stack>
          <Box sx={{ height: 240, mt: 2 }}>
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
                  domain={[0, 'auto']}
                  tickFormatter={(v) => `${v}%`}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: 8,
                    border: `1px solid ${COLOR.border}`,
                    fontSize: 12,
                  }}
                  formatter={(v: number, name: string) => {
                    const label =
                      name === 'inlineRefactor'
                        ? '継続的リファクタ率'
                        : name === 'standalone'
                          ? '切り出しリファクタ率'
                          : 'バグ修正比率'
                    return [`${v}%`, label]
                  }}
                  labelFormatter={(l) => `スプリント: ${l}`}
                />
                <ReferenceLine y={20} stroke={COLOR.primary} strokeDasharray="4 4" strokeWidth={1.5} />
                <Line
                  type="monotone"
                  dataKey="inlineRefactor"
                  stroke={COLOR.success}
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: COLOR.success, strokeWidth: 0 }}
                  isAnimationActive={false}
                />
                <Line
                  type="monotone"
                  dataKey="standalone"
                  stroke={COLOR.error}
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: COLOR.error, strokeWidth: 0 }}
                  isAnimationActive={false}
                />
                <Line
                  type="monotone"
                  dataKey="bugfix"
                  stroke={COLOR.warning}
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: COLOR.warning, strokeWidth: 0 }}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </Box>
        </Paper>
      )}

      {/* Other PR 一覧（分類できなかったPR · 分析用） */}
      {refactoringMetrics.otherPrSamples.length > 0 && (
        <Paper variant="outlined" sx={{ p: 3, borderColor: COLOR.border, borderRadius: 2 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 0.5 }}>
            Other PR 一覧
          </Typography>
          <Typography variant="caption" sx={{ color: COLOR.textMuted }}>
            feature / bugfix / refactor のいずれにも分類できなかったPR · {refactoringMetrics.otherPrSamples.length} 件
          </Typography>
          <TableContainer sx={{ mt: 2, maxHeight: 360 }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ color: COLOR.textMuted, fontWeight: 600 }}>#</TableCell>
                  <TableCell sx={{ color: COLOR.textMuted, fontWeight: 600 }}>PR</TableCell>
                  <TableCell sx={{ color: COLOR.textMuted, fontWeight: 600 }}>タイトル</TableCell>
                  <TableCell sx={{ color: COLOR.textMuted, fontWeight: 600 }}>作成者</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {refactoringMetrics.otherPrSamples.map((pr, i) => (
                  <TableRow key={pr.number} sx={{ '&:last-child td': { border: 0 } }}>
                    <TableCell sx={{ color: COLOR.textMuted }}>{i + 1}</TableCell>
                    <TableCell sx={{ fontWeight: 500 }}>
                      <Link href={pr.url} target="_blank" rel="noopener" underline="hover">
                        #{pr.number}
                      </Link>
                    </TableCell>
                    <TableCell
                      sx={{
                        maxWidth: 520,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {pr.title}
                    </TableCell>
                    <TableCell sx={{ color: COLOR.textMuted }}>{pr.author}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}
    </Stack>
  )
}

function orientationDesc(o: string): string {
  if (o === 'long-term') return 'テストと継続的リファクタに投資し、長期保守を重視しています。理想的な状態です。'
  if (o === 'balanced')
    return '速度と品質のバランスは取れていますが、テスト文化か継続的リファクタのいずれかに伸びしろがあります。'
  return '短期成果重視です。テスト・継続的リファクタへの投資が不足しており、中長期的な品質リスクが高まっています。'
}

function flowHint(f: string): string {
  if (f === 'continuous') return '日常の流れで掃除'
  if (f === 'fragmented') return 'フロー分断の疑い'
  return '混合'
}

const LegendLine: React.FC<{ color: string; label: string; dashed?: boolean }> = ({ color, label, dashed }) => (
  <Stack direction="row" alignItems="center" spacing={0.75}>
    <Box sx={{ width: 14, height: 2, borderTop: `2px ${dashed ? 'dashed' : 'solid'} ${color}` }} />
    <Typography variant="caption" sx={{ color: COLOR.textMuted }}>
      {label}
    </Typography>
  </Stack>
)

const Sub: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Typography variant="caption" sx={{ color: COLOR.textMuted }}>
    {children}
  </Typography>
)
