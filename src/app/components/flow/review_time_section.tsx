import React, { useMemo } from 'react'
import {
  Box,
  Chip,
  CircularProgress,
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
  ComposedChart,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { ReviewTimes } from '../../domain/models/review_time/review_times'
import { OpenPrs } from '../../domain/models/open_pr/open_prs'
import { CATEGORY_LABEL, MergeCategory } from '../../shared/pr_classification'
import { ReviewTestCrosstab } from '../../domain/services/review_test_crosstab'
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
  coverage: number
  noReviewMerged: number
  mergedCount: number
  count: number
}

interface Props {
  current: ReviewTimes
  previous: ReviewTimes
  sprintSeries: ReviewTimeSprintPoint[]
  openPrs: OpenPrs
  crosstab?: ReviewTestCrosstab | null
}

// テスト無しカテゴリの表示順（実装＝リスクを最上位に）
const CATEGORY_ORDER: MergeCategory[] = ['impl', 'dep', 'chore', 'format', 'merge', 'revert', 'release', 'bump']

const pctStr = (n: number, d: number): string => (d > 0 ? `${((n / d) * 100).toFixed(0)}%` : '—')

const UNSAFE_LIST_LIMIT = 25

export const ReviewTimeSection: React.FC<Props> = ({ current, previous, sprintSeries, openPrs, crosstab }) => {
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
            <StatRow
              label="レビューカバレッジ"
              value={`${(current.reviewCoverageRatio() * 100).toFixed(0)}%`}
              color={
                current.reviewCoverageRatio() >= 0.8
                  ? COLOR.success
                  : current.reviewCoverageRatio() >= 0.5
                    ? COLOR.warning
                    : COLOR.error
              }
            />
            <StatRow
              label="ノーレビューマージ"
              value={`${current.noReviewMergeCount()} 件`}
              color={current.noReviewMergeCount() > 0 ? COLOR.textMuted : undefined}
            />
            <StatRow
              label="最長未レビュー待ち"
              value={openPrs.maxPendingWaitHours > 0 ? formatHours(openPrs.maxPendingWaitHours) : '—'}
              color={
                openPrs.maxPendingWaitHours >= 72
                  ? COLOR.error
                  : openPrs.maxPendingWaitHours >= 24
                    ? COLOR.warning
                    : undefined
              }
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

      <Paper variant="outlined" sx={{ p: 3, borderColor: COLOR.border, borderRadius: 2 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
          レビューカバレッジ推移
        </Typography>
        <Typography variant="caption" sx={{ color: COLOR.textMuted }}>
          棒: ノーレビューマージ件数 · 折れ線: マージ済PRのレビューカバレッジ率
        </Typography>
        <Box sx={{ height: 240, mt: 2 }}>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={sprintSeries} margin={{ top: 10, right: 20, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: COLOR.textMuted }}
                axisLine={{ stroke: COLOR.border }}
                tickLine={false}
              />
              <YAxis
                yAxisId="count"
                tick={{ fontSize: 11, fill: COLOR.textMuted }}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
                label={{ value: '件', angle: -90, position: 'insideLeft', fontSize: 11, fill: COLOR.textMuted }}
              />
              <YAxis
                yAxisId="pct"
                orientation="right"
                domain={[0, 100]}
                tick={{ fontSize: 11, fill: COLOR.textMuted }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `${v}%`}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: 8,
                  border: `1px solid ${COLOR.border}`,
                  fontSize: 12,
                }}
                labelFormatter={(l) => `スプリント: ${l}`}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <ReferenceLine yAxisId="pct" y={80} stroke={COLOR.success} strokeDasharray="4 4" strokeWidth={1.5} />
              <Bar
                yAxisId="count"
                dataKey="noReviewMerged"
                name="ノーレビューマージ"
                fill={COLOR.warning}
                radius={[4, 4, 0, 0]}
                isAnimationActive={false}
              />
              <Line
                yAxisId="pct"
                type="monotone"
                dataKey="coverage"
                name="カバレッジ率"
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

      <Paper variant="outlined" sx={{ p: 3, borderColor: COLOR.border, borderRadius: 2 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 0.5 }}>
          レビュー×テスト クロス集計
        </Typography>
        <Typography variant="caption" sx={{ color: COLOR.textMuted, display: 'block' }}>
          全期間90日 · レビューを省いたマージが実際にテストで担保されているか（「ノーレビュー＝テスト担保型」の検証）
        </Typography>

        {!crosstab ? (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mt: 2, color: COLOR.textMuted }}>
            <CircularProgress size={18} />
            <Typography variant="body2">PR ごとのテスト有無を集計中…</Typography>
          </Box>
        ) : crosstab.noReviewMergedCount === 0 ? (
          <Typography variant="body2" sx={{ mt: 2, color: COLOR.textMuted }}>
            対象のノーレビューマージはありません
          </Typography>
        ) : (
          <Box sx={{ mt: 2 }}>
            <Typography variant="caption" sx={{ color: COLOR.textMuted, display: 'block', mb: 1 }}>
              依存更新・release・revert・chore・format
              等「テストが無くて当然の変更」と空差分を除いた、テストが期待される実装マージのみで評価
            </Typography>
            <Stack direction="row" spacing={4} flexWrap="wrap" useFlexGap sx={{ mb: 1.5 }}>
              <Box>
                <Typography variant="caption" sx={{ color: COLOR.textMuted, display: 'block' }}>
                  実装マージ（テスト対象）
                </Typography>
                <Typography sx={{ fontWeight: 700, fontSize: 20 }}>{crosstab.implMergedCount} 件</Typography>
              </Box>
              <Box>
                <Typography variant="caption" sx={{ color: COLOR.textMuted, display: 'block' }}>
                  テスト有
                </Typography>
                <Typography sx={{ fontWeight: 700, fontSize: 20, color: COLOR.success }}>
                  {crosstab.implWithTests} 件 ({pctStr(crosstab.implWithTests, crosstab.implMergedCount)})
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" sx={{ color: COLOR.textMuted, display: 'block' }}>
                  テスト無し（無担保）
                </Typography>
                <Typography sx={{ fontWeight: 700, fontSize: 20, color: COLOR.error }}>
                  {crosstab.implWithoutTests} 件 ({pctStr(crosstab.implWithoutTests, crosstab.implMergedCount)})
                </Typography>
              </Box>
            </Stack>

            <Box sx={{ display: 'flex', height: 10, borderRadius: 1, overflow: 'hidden', mb: 1.5 }}>
              <Box sx={{ width: `${crosstab.implTestCoverageRatio * 100}%`, bgcolor: COLOR.success }} />
              <Box sx={{ flex: 1, bgcolor: COLOR.error }} />
            </Box>

            <Typography variant="caption" sx={{ color: COLOR.textMuted, display: 'block', mb: 2 }}>
              参考: 全ノーレビューマージ {crosstab.noReviewMergedCount} 件（テスト有 {crosstab.withTests}・無{' '}
              {crosstab.withoutTests}）。テスト無し {crosstab.withoutTests} 件の内訳は下記で、大半はテスト不要な変更。
            </Typography>

            <Typography variant="caption" sx={{ color: COLOR.textMuted, display: 'block', mb: 1 }}>
              テスト無しの内訳（カテゴリ別 · 実装以外はテスト不要とみなし除外）
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 2 }}>
              {CATEGORY_ORDER.filter((c) => crosstab.testlessCategoryCounts[c] > 0).map((c) => (
                <Chip
                  key={c}
                  size="small"
                  label={`${CATEGORY_LABEL[c]} ${crosstab.testlessCategoryCounts[c]}`}
                  variant="outlined"
                  sx={{
                    borderColor: c === 'impl' ? COLOR.error : COLOR.border,
                    color: c === 'impl' ? COLOR.error : COLOR.textMuted,
                    fontWeight: c === 'impl' ? 700 : 500,
                  }}
                />
              ))}
            </Stack>

            <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
              無担保な実装マージ（レビュー無し × テスト無し × 実装PR）: {crosstab.unsafeImplPrs.length} 件
            </Typography>
            <Typography variant="caption" sx={{ color: COLOR.textMuted, display: 'block', mb: 1 }}>
              空差分（0ファイル）の再マージは除外済み。プロダクション変更行数の多い順
            </Typography>
            {crosstab.unsafeImplPrs.length > 0 && (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ color: COLOR.textMuted, fontWeight: 600 }}>PR</TableCell>
                      <TableCell sx={{ color: COLOR.textMuted, fontWeight: 600 }}>repo</TableCell>
                      <TableCell align="right" sx={{ color: COLOR.textMuted, fontWeight: 600 }}>
                        prod 行
                      </TableCell>
                      <TableCell sx={{ color: COLOR.textMuted, fontWeight: 600 }}>タイトル</TableCell>
                      <TableCell sx={{ color: COLOR.textMuted, fontWeight: 600 }}>作成者</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {crosstab.unsafeImplPrs.slice(0, UNSAFE_LIST_LIMIT).map((pr) => (
                      <TableRow key={`${pr.repo}#${pr.number}`} sx={{ '&:last-child td': { border: 0 } }}>
                        <TableCell sx={{ fontWeight: 500 }}>#{pr.number}</TableCell>
                        <TableCell sx={{ color: COLOR.textMuted, fontSize: 12 }}>{pr.repo}</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 600 }}>
                          {pr.productionLines.toLocaleString()}
                        </TableCell>
                        <TableCell
                          sx={{
                            maxWidth: 360,
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
            )}
            {crosstab.unsafeImplPrs.length > UNSAFE_LIST_LIMIT && (
              <Typography variant="caption" sx={{ color: COLOR.textMuted, display: 'block', mt: 1 }}>
                ほか {crosstab.unsafeImplPrs.length - UNSAFE_LIST_LIMIT} 件
              </Typography>
            )}
          </Box>
        )}
      </Paper>

      {current.noReviewMergedPrs().length > 0 && (
        <Paper variant="outlined" sx={{ p: 3, borderColor: COLOR.border, borderRadius: 2 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 0.5 }}>
            ノーレビューマージ一覧
          </Typography>
          <Typography variant="caption" sx={{ color: COLOR.textMuted }}>
            現スコープでレビューなしにマージされた PR · 新しい順
          </Typography>
          <TableContainer sx={{ mt: 2 }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ color: COLOR.textMuted, fontWeight: 600 }}>#</TableCell>
                  <TableCell sx={{ color: COLOR.textMuted, fontWeight: 600 }}>PR</TableCell>
                  <TableCell sx={{ color: COLOR.textMuted, fontWeight: 600 }}>タイトル</TableCell>
                  <TableCell sx={{ color: COLOR.textMuted, fontWeight: 600 }}>作成者</TableCell>
                  <TableCell align="right" sx={{ color: COLOR.textMuted, fontWeight: 600 }}>
                    作成日
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {current.noReviewMergedPrs().map((pr, i) => (
                  <TableRow key={pr.prNumber} sx={{ '&:last-child td': { border: 0 } }}>
                    <TableCell sx={{ color: COLOR.textMuted }}>{i + 1}</TableCell>
                    <TableCell sx={{ fontWeight: 500 }}>#{pr.prNumber}</TableCell>
                    <TableCell
                      sx={{
                        maxWidth: 420,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {pr.prTitle}
                    </TableCell>
                    <TableCell>{pr.prAuthor}</TableCell>
                    <TableCell align="right" sx={{ color: COLOR.textMuted }}>
                      {pr.createdAtDisplay}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

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
