import React from 'react'
import {
  Box,
  Chip,
  Link,
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
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { QualitySustainabilityMetrics } from '../../domain/models/quality_sustainability/quality_sustainability'
import { COLOR, formatInt, KpiCard, SectionHeader } from '../flow/shared'

export interface TestCiSprintPoint {
  label: string
  testRate: number
  ciSuccess: number
  totalPrs: number
}

interface Props {
  sustain: QualitySustainabilityMetrics
  sprintSeries: TestCiSprintPoint[]
}

const TEST_CULTURE_COLOR: Record<string, string> = {
  strong: COLOR.success,
  moderate: COLOR.primary,
  weak: COLOR.warning,
  none: COLOR.error,
}

const CI_HEALTH_COLOR: Record<string, string> = {
  excellent: COLOR.success,
  good: COLOR.primary,
  'needs-improvement': COLOR.warning,
  critical: COLOR.error,
}

export const TestCiSection: React.FC<Props> = ({ sustain, sprintSeries }) => {
  const { testMetrics, ciMetrics } = sustain
  const testColor = TEST_CULTURE_COLOR[testMetrics.testCulture] || COLOR.textMuted
  const ciColor = CI_HEALTH_COLOR[ciMetrics.ciHealth] || COLOR.textMuted

  const testInclusionPct = Math.round(testMetrics.testInclusionRate * 100)
  const authorTestPct = Math.round(testMetrics.authorTestRate * 100)
  const ciSuccessPct = Math.round(ciMetrics.successRate * 100)

  const ciPieData = [
    { name: '成功', value: ciMetrics.successfulChecks, color: COLOR.success },
    { name: '失敗', value: ciMetrics.failedChecks, color: COLOR.error },
  ].filter((d) => d.value > 0)

  return (
    <Stack spacing={3}>
      <SectionHeader overline="TEST & CI" title="テスト & CI" desc="テストを書き、CI が健全に動いているか" />

      {/* ヒーロー2枚 */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
          gap: 2,
        }}
      >
        <Paper
          variant="outlined"
          sx={{ p: 3, borderColor: COLOR.border, borderRadius: 2, borderLeft: `4px solid ${testColor}` }}
        >
          <Typography variant="caption" sx={{ color: COLOR.textMuted, letterSpacing: 0.5 }}>
            TEST CULTURE
          </Typography>
          <Typography variant="h4" sx={{ fontWeight: 700, color: testColor, mt: 0.5 }}>
            {testMetrics.testCultureLabel}
          </Typography>
          <Typography variant="body2" sx={{ color: COLOR.textMuted, mt: 0.5 }}>
            {testDescriptionFor(testMetrics.testCulture)}
          </Typography>
        </Paper>
        <Paper
          variant="outlined"
          sx={{ p: 3, borderColor: COLOR.border, borderRadius: 2, borderLeft: `4px solid ${ciColor}` }}
        >
          <Typography variant="caption" sx={{ color: COLOR.textMuted, letterSpacing: 0.5 }}>
            CI HEALTH
          </Typography>
          <Typography variant="h4" sx={{ fontWeight: 700, color: ciColor, mt: 0.5 }}>
            {ciMetrics.ciHealthLabel}
          </Typography>
          <Typography variant="body2" sx={{ color: COLOR.textMuted, mt: 0.5 }}>
            {ciDescriptionFor(ciMetrics.ciHealth)}
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
          label="テスト付き PR"
          value={`${testInclusionPct}%`}
          sub={
            <Sub>
              {formatInt(testMetrics.prsWithTests)} /{' '}
              {formatInt(testMetrics.prsWithTests + testMetrics.prsWithoutTests)}
            </Sub>
          }
          hint="PR にテストコードの変更が含まれる割合"
          accent={testInclusionPct >= 70 ? COLOR.success : testInclusionPct >= 40 ? COLOR.warning : COLOR.error}
        />
        <KpiCard
          label="テストを書く作者"
          value={`${authorTestPct}%`}
          sub={
            <Sub>
              {formatInt(testMetrics.authorsWithTests)} /{' '}
              {formatInt(testMetrics.authorsWithTests + testMetrics.authorsWithoutTests)}
            </Sub>
          }
          hint="テストを書く人の割合（サイロ化検知）"
          accent={authorTestPct >= 70 ? COLOR.success : authorTestPct >= 40 ? COLOR.warning : COLOR.error}
        />
        <KpiCard
          label="CI 成功率"
          value={`${ciSuccessPct}%`}
          sub={<Sub>{formatInt(ciMetrics.totalChecks)} 回実行</Sub>}
          hint="全 CI チェックのうち成功した割合"
          accent={ciSuccessPct >= 90 ? COLOR.success : ciSuccessPct >= 75 ? COLOR.warning : COLOR.error}
        />
        <KpiCard
          label="サステナビリティ"
          value={`${sustain.sustainabilityScore}`}
          sub={<Sub>グレード {sustain.sustainabilityGrade}</Sub>}
          hint="テスト + CI + リファクタの総合スコア"
          accent={
            sustain.sustainabilityScore >= 80
              ? COLOR.success
              : sustain.sustainabilityScore >= 65
                ? COLOR.primary
                : sustain.sustainabilityScore >= 50
                  ? COLOR.warning
                  : COLOR.error
          }
        />
      </Box>

      {/* テスト週次トレンド (横幅いっぱい) + CI Donut (下に縦積み) */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: '1fr',
          gap: 3,
        }}
      >
        <Paper variant="outlined" sx={{ p: 3, borderColor: COLOR.border, borderRadius: 2 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={1}>
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                スプリント推移
              </Typography>
              <Typography variant="caption" sx={{ color: COLOR.textMuted }}>
                各スプリントのテスト率 と CI 成功率
              </Typography>
            </Box>
            <Stack direction="row" spacing={2}>
              <LegendLine color={COLOR.success} label="テスト率" />
              <LegendLine color={COLOR.primary} label="CI 成功率" />
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
                  domain={[0, 100]}
                  tickFormatter={(v) => `${v}%`}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: 8,
                    border: `1px solid ${COLOR.border}`,
                    fontSize: 12,
                  }}
                  formatter={(v: number, name: string) => [`${v}%`, name === 'testRate' ? 'テスト率' : 'CI 成功率']}
                  labelFormatter={(l) => `スプリント: ${l}`}
                />
                <ReferenceLine y={70} stroke={COLOR.warning} strokeDasharray="4 4" strokeWidth={1.5} />
                <Line
                  type="monotone"
                  dataKey="testRate"
                  stroke={COLOR.success}
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: COLOR.success, strokeWidth: 0 }}
                  isAnimationActive={false}
                />
                <Line
                  type="monotone"
                  dataKey="ciSuccess"
                  stroke={COLOR.primary}
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: COLOR.primary, strokeWidth: 0 }}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </Box>
        </Paper>

        <Paper variant="outlined" sx={{ p: 3, borderColor: COLOR.border, borderRadius: 2 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
            CI チェック内訳
          </Typography>
          <Typography variant="caption" sx={{ color: COLOR.textMuted }}>
            全 {formatInt(ciMetrics.totalChecks)} 回
          </Typography>
          {ciPieData.length > 0 ? (
            <Box sx={{ height: 200, mt: 1 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={ciPieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                    isAnimationActive={false}
                  >
                    {ciPieData.map((d) => (
                      <Cell key={d.name} fill={d.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      borderRadius: 8,
                      border: `1px solid ${COLOR.border}`,
                      fontSize: 12,
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </Box>
          ) : (
            <Typography variant="body2" sx={{ color: COLOR.textMuted, mt: 2 }}>
              データなし
            </Typography>
          )}
          <Stack spacing={0.75} sx={{ mt: 1 }}>
            <StatRow label="成功" value={formatInt(ciMetrics.successfulChecks)} color={COLOR.success} />
            <StatRow label="失敗" value={formatInt(ciMetrics.failedChecks)} color={COLOR.error} />
          </Stack>
        </Paper>
      </Box>

      {/* 失敗した PR と理由 */}
      {ciMetrics.failingPrs.length > 0 && (
        <Paper variant="outlined" sx={{ p: 3, borderColor: COLOR.border, borderRadius: 2 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={1}>
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                CI 失敗した PR
              </Typography>
              <Typography variant="caption" sx={{ color: COLOR.textMuted }}>
                失敗したチェック名付き · {ciMetrics.failingPrs.length} 件
              </Typography>
            </Box>
            {ciMetrics.ignoredChecks.length > 0 && (
              <Typography variant="caption" sx={{ color: COLOR.textMuted }}>
                無視中:{' '}
                <Box component="span" sx={{ fontFamily: 'monospace', color: COLOR.warning }}>
                  {ciMetrics.ignoredChecks.join(', ')}
                </Box>
              </Typography>
            )}
          </Stack>
          <TableContainer sx={{ mt: 2 }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ color: COLOR.textMuted, fontWeight: 600 }}>PR</TableCell>
                  <TableCell sx={{ color: COLOR.textMuted, fontWeight: 600 }}>タイトル</TableCell>
                  <TableCell sx={{ color: COLOR.textMuted, fontWeight: 600 }}>失敗したチェック</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {ciMetrics.failingPrs.map((p) => (
                  <TableRow key={p.number} sx={{ '&:last-child td': { border: 0 } }}>
                    <TableCell sx={{ color: COLOR.textMuted }}>#{p.number}</TableCell>
                    <TableCell sx={{ maxWidth: 320 }}>
                      <Link
                        href={p.url}
                        target="_blank"
                        rel="noopener"
                        sx={{
                          color: '#111827',
                          fontWeight: 500,
                          textDecoration: 'none',
                          '&:hover': { color: COLOR.primary },
                          display: 'block',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {p.title}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap', gap: 0.5 }}>
                        {p.failingChecks.length > 0 ? (
                          p.failingChecks.map((c) => (
                            <Chip
                              key={c}
                              label={c}
                              size="small"
                              sx={{
                                bgcolor: `${COLOR.error}14`,
                                color: COLOR.error,
                                fontWeight: 600,
                                height: 22,
                                fontSize: 11,
                              }}
                            />
                          ))
                        ) : (
                          <Typography variant="caption" sx={{ color: COLOR.textMuted }}>
                            （詳細不明）
                          </Typography>
                        )}
                      </Stack>
                    </TableCell>
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

function testDescriptionFor(culture: string): string {
  if (culture === 'strong') return 'チーム全体でテストを書く文化が根付いています。'
  if (culture === 'moderate') return 'テストを書く動きはありますが、全体への浸透は途中段階です。'
  if (culture === 'weak') return 'テストを書く人が限定的です。テスト文化の強化を推奨します。'
  return 'テストコードがほとんど書かれていません。品質リスクが高い状態です。'
}

function ciDescriptionFor(health: string): string {
  if (health === 'excellent') return 'CI が安定しており、信頼できる品質ゲートとして機能しています。'
  if (health === 'good') return 'CI は概ね良好です。不安定な失敗を減らせばさらに信頼度が上がります。'
  if (health === 'needs-improvement') return '失敗が目立ちます。Flaky テストの修正やリトライ戦略を検討してください。'
  return 'CI が頻繁に失敗しています。品質ゲートが機能していません。早急な対応が必要です。'
}

const Sub: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Typography variant="caption" sx={{ color: COLOR.textMuted }}>
    {children}
  </Typography>
)

const LegendLine: React.FC<{ color: string; label: string; dashed?: boolean }> = ({ color, label, dashed }) => (
  <Stack direction="row" alignItems="center" spacing={0.75}>
    <Box sx={{ width: 14, height: 2, borderTop: `2px ${dashed ? 'dashed' : 'solid'} ${color}` }} />
    <Typography variant="caption" sx={{ color: COLOR.textMuted }}>
      {label}
    </Typography>
  </Stack>
)

const StatRow: React.FC<{ label: string; value: string; color?: string }> = ({ label, value, color }) => (
  <Stack direction="row" justifyContent="space-between">
    <Stack direction="row" alignItems="center" spacing={0.75}>
      <Box sx={{ width: 8, height: 8, bgcolor: color || COLOR.textMuted, borderRadius: '50%' }} />
      <Typography variant="caption" sx={{ color: COLOR.textMuted }}>
        {label}
      </Typography>
    </Stack>
    <Typography variant="caption" sx={{ fontWeight: 700 }}>
      {value}
    </Typography>
  </Stack>
)
