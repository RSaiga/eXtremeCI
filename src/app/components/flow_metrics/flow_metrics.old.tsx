import React, { useEffect, useState } from 'react'
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  LinearProgress,
  Alert,
  Tooltip,
} from '@mui/material'
import Grid from '@mui/material/Unstable_Grid2'
import { Bar, Doughnut, Line } from 'react-chartjs-2'
import { Chart, registerables } from 'chart.js'
import { PrimitiveToken, hexToRgba } from '../ui/tokens/primitive-token'

Chart.register(...registerables)

import {
  FlowMetricsSummary,
  AuthorFlowMetrics,
  ReviewerResponseMetrics,
  WeeklyFlowTrend,
  BottleneckAnalysis,
} from '../../domain/models/flow_metrics/flow_metrics'
import { FlowMetricsService, FlowMetricsData } from '../../domain/services/flow_metrics/flow_metrics_service'
import Loading from '../loading/loading'
import { useActiveRepo } from '../../shared/repos/context'

interface FlowMetricsDashboardProps {
  externalData?: FlowMetricsData
}

export const FlowMetricsDashboard: React.FC<FlowMetricsDashboardProps> = ({ externalData }) => {
  const { activeRepo, selectedRepos } = useActiveRepo()
  const [data, setData] = useState<FlowMetricsData | null>(externalData || null)
  const [isLoading, setIsLoading] = useState(!externalData)

  useEffect(() => {
    if (!externalData) {
      loadData()
    }
  }, [externalData, activeRepo])

  const loadData = async () => {
    setIsLoading(true)
    try {
      const result = await FlowMetricsService.fetchAll(selectedRepos)
      setData(result)
    } catch (e) {
      console.error('Failed to load flow metrics:', e)
    }
    setIsLoading(false)
  }

  if (isLoading) {
    return <Loading />
  }

  if (!data) {
    return <Alert severity="warning">フロー指標データを取得できませんでした</Alert>
  }

  const { summary, authorMetrics, reviewerMetrics, weeklyTrend, bottlenecks } = data

  const formatHours = (hours: number): string => {
    if (hours < 1) return `${Math.round(hours * 60)}分`
    if (hours < 24) return `${hours.toFixed(1)}時間`
    return `${(hours / 24).toFixed(1)}日`
  }

  const getHealthColor = (ratio: number): 'success' | 'warning' | 'error' => {
    if (ratio >= 0.7) return 'success'
    if (ratio >= 0.4) return 'warning'
    return 'error'
  }

  const getCycleTimeColor = (hours: number): 'success' | 'warning' | 'error' => {
    if (hours <= 24) return 'success'
    if (hours <= 72) return 'warning'
    return 'error'
  }

  const getWaitTimeColor = (hours: number): 'success' | 'warning' | 'error' => {
    if (hours <= 4) return 'success'
    if (hours <= 24) return 'warning'
    return 'error'
  }

  const getRevisionColor = (rounds: number): 'success' | 'warning' | 'error' => {
    if (rounds <= 1) return 'success'
    if (rounds <= 2) return 'warning'
    return 'error'
  }

  const getBottleneckIcon = (type: BottleneckAnalysis['type']): string => {
    switch (type) {
      case 'individual':
        return '👤'
      case 'design':
        return '📐'
      case 'team':
        return '👥'
      case 'process':
        return '⚙️'
    }
  }

  const getBottleneckLabel = (type: BottleneckAnalysis['type']): string => {
    switch (type) {
      case 'individual':
        return '個人作業'
      case 'design':
        return '設計'
      case 'team':
        return 'チーム'
      case 'process':
        return 'プロセス'
    }
  }

  return (
    <Box>
      {/* 1. DORA フロー指標サマリー */}
      <Paper sx={{ p: 3, mb: 3, bgcolor: 'grey.50' }}>
        <Typography variant="h5" sx={{ mb: 3 }}>
          DORA フロー指標サマリー
        </Typography>
        <Grid container spacing={3}>
          <Grid xs={12} sm={6} md={3}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Typography variant="subtitle2" color="text.secondary">
                  サイクルタイム（中央値）
                </Typography>
                <Typography variant="h4" color={getCycleTimeColor(summary.medianCycleTimeHours) + '.main'}>
                  {formatHours(summary.medianCycleTimeHours)}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  PR作成〜マージ
                </Typography>
                <LinearProgress
                  variant="determinate"
                  value={Math.min(100, (24 / summary.medianCycleTimeHours) * 100)}
                  color={getCycleTimeColor(summary.medianCycleTimeHours)}
                  sx={{ mt: 1 }}
                />
                <Typography variant="caption" color="text.secondary">
                  目標: 24時間以内
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid xs={12} sm={6} md={3}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Typography variant="subtitle2" color="text.secondary">
                  レビュー待ち時間（中央値）
                </Typography>
                <Typography variant="h4" color={getWaitTimeColor(summary.medianFirstReviewWaitHours) + '.main'}>
                  {formatHours(summary.medianFirstReviewWaitHours)}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  PR作成〜初回レビュー
                </Typography>
                <LinearProgress
                  variant="determinate"
                  value={Math.min(100, (4 / summary.medianFirstReviewWaitHours) * 100)}
                  color={getWaitTimeColor(summary.medianFirstReviewWaitHours)}
                  sx={{ mt: 1 }}
                />
                <Typography variant="caption" color="text.secondary">
                  目標: 4時間以内
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid xs={12} sm={6} md={3}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Typography variant="subtitle2" color="text.secondary">
                  平均修正往復回数
                </Typography>
                <Typography variant="h4" color={getRevisionColor(summary.avgRevisionRounds) + '.main'}>
                  {summary.avgRevisionRounds.toFixed(1)}回
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  CHANGES_REQUESTED回数
                </Typography>
                <LinearProgress
                  variant="determinate"
                  value={Math.min(100, (1 / Math.max(0.1, summary.avgRevisionRounds)) * 100)}
                  color={getRevisionColor(summary.avgRevisionRounds)}
                  sx={{ mt: 1 }}
                />
                <Typography variant="caption" color="text.secondary">
                  目標: 1回以下
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid xs={12} sm={6} md={3}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Typography variant="subtitle2" color="text.secondary">
                  平均レビュー回数
                </Typography>
                <Typography variant="h4">{summary.avgReviewCount.toFixed(1)}回</Typography>
                <Typography variant="caption" color="text.secondary">
                  レビュアー数: {summary.avgUniqueReviewers.toFixed(1)}人
                </Typography>
                <Box sx={{ mt: 1, pt: 1, borderTop: 1, borderColor: 'divider' }}>
                  <Typography variant="caption" color="text.secondary">
                    平均PRサイズ: {Math.round(summary.avgPRSize)}行
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Paper>

      {/* 2. 健全性指標 */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          フィードバックループの健全性
        </Typography>
        <Grid container spacing={3}>
          <Grid xs={12} md={4}>
            <Box sx={{ textAlign: 'center', p: 2 }}>
              <Typography variant="subtitle2" color="text.secondary">
                高速フィードバック率
              </Typography>
              <Typography variant="h3" color={getHealthColor(summary.fastFeedbackRatio) + '.main'}>
                {(summary.fastFeedbackRatio * 100).toFixed(0)}%
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block">
                4時間以内にレビュー開始
              </Typography>
              <Chip
                label={
                  summary.fastFeedbackRatio >= 0.7 ? '良好' : summary.fastFeedbackRatio >= 0.4 ? '改善余地' : '要改善'
                }
                color={getHealthColor(summary.fastFeedbackRatio)}
                size="small"
                sx={{ mt: 1 }}
              />
            </Box>
          </Grid>
          <Grid xs={12} md={4}>
            <Box sx={{ textAlign: 'center', p: 2 }}>
              <Typography variant="subtitle2" color="text.secondary">
                クイックマージ率
              </Typography>
              <Typography variant="h3" color={getHealthColor(summary.quickMergeRatio) + '.main'}>
                {(summary.quickMergeRatio * 100).toFixed(0)}%
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block">
                24時間以内にマージ完了
              </Typography>
              <Chip
                label={summary.quickMergeRatio >= 0.7 ? '良好' : summary.quickMergeRatio >= 0.4 ? '改善余地' : '要改善'}
                color={getHealthColor(summary.quickMergeRatio)}
                size="small"
                sx={{ mt: 1 }}
              />
            </Box>
          </Grid>
          <Grid xs={12} md={4}>
            <Box sx={{ textAlign: 'center', p: 2 }}>
              <Typography variant="subtitle2" color="text.secondary">
                低往復率
              </Typography>
              <Typography variant="h3" color={getHealthColor(summary.lowRevisionRatio) + '.main'}>
                {(summary.lowRevisionRatio * 100).toFixed(0)}%
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block">
                修正依頼1回以下
              </Typography>
              <Chip
                label={
                  summary.lowRevisionRatio >= 0.7 ? '良好' : summary.lowRevisionRatio >= 0.4 ? '改善余地' : '要改善'
                }
                color={getHealthColor(summary.lowRevisionRatio)}
                size="small"
                sx={{ mt: 1 }}
              />
            </Box>
          </Grid>
        </Grid>
        <Alert severity="info" sx={{ mt: 2 }}>
          <strong>解釈:</strong> 高速フィードバック率が高いとレビュー文化が健全、クイックマージ率が高いとフローが順調、
          低往復率が高いとPR品質が良好（または事前の設計・コミュニケーションが適切）
        </Alert>
      </Paper>

      {/* 3. ボトルネック分析 */}
      {bottlenecks.length > 0 && (
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            ボトルネック分析
          </Typography>
          <Grid container spacing={2}>
            {bottlenecks.map((bottleneck, idx) => (
              <Grid xs={12} md={6} key={idx}>
                <Alert
                  severity={
                    bottleneck.severity === 'high' ? 'error' : bottleneck.severity === 'medium' ? 'warning' : 'info'
                  }
                  icon={<span style={{ fontSize: '1.5em' }}>{getBottleneckIcon(bottleneck.type)}</span>}
                >
                  <Typography variant="subtitle2">{getBottleneckLabel(bottleneck.type)}の問題</Typography>
                  <Typography variant="body2">{bottleneck.description}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    影響PR: {bottleneck.affectedPRs.length}件
                  </Typography>
                </Alert>
              </Grid>
            ))}
          </Grid>
        </Paper>
      )}

      {/* 4. PRサイズ分布 */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid xs={12} md={6}>
          <Paper sx={{ p: 2, height: '100%' }}>
            <Typography variant="h6" sx={{ mb: 2 }}>
              PRサイズ分布
            </Typography>
            <Doughnut
              data={{
                labels: summary.sizeDistribution.map((d) => `${d.category} (${d.count}件)`),
                datasets: [
                  {
                    data: summary.sizeDistribution.map((d) => d.count),
                    backgroundColor: [
                      PrimitiveToken.colors.gray[100],
                      PrimitiveToken.colors.gray[80],
                      PrimitiveToken.colors.gray[60],
                      PrimitiveToken.colors.gray[20],
                      PrimitiveToken.colors.red[50],
                    ],
                    borderWidth: 2,
                  },
                ],
              }}
              options={{
                responsive: true,
                plugins: {
                  legend: { position: 'right' as const },
                  tooltip: {
                    callbacks: {
                      label: (ctx) => {
                        const item = summary.sizeDistribution[ctx.dataIndex]
                        return `${item.count}件 (${item.percentage.toFixed(1)}%)`
                      },
                    },
                  },
                },
              }}
            />
            <Box sx={{ mt: 2 }}>
              <Typography variant="caption" color="text.secondary">
                XS: 1-10行 / S: 11-50行 / M: 51-250行 / L: 251-500行 / XL: 501+行
              </Typography>
            </Box>
          </Paper>
        </Grid>
        <Grid xs={12} md={6}>
          <Paper sx={{ p: 2, height: '100%' }}>
            <Typography variant="h6" sx={{ mb: 2 }}>
              統計詳細
            </Typography>
            <TableContainer>
              <Table size="small">
                <TableBody>
                  <TableRow>
                    <TableCell>
                      <strong>総PR数</strong>
                    </TableCell>
                    <TableCell align="right">{summary.totalPRs}件</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>
                      <strong>マージ済みPR数</strong>
                    </TableCell>
                    <TableCell align="right">{summary.mergedPRs}件</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>
                      <strong>平均サイクルタイム</strong>
                    </TableCell>
                    <TableCell align="right">{formatHours(summary.avgCycleTimeHours)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>
                      <strong>P90サイクルタイム</strong>
                    </TableCell>
                    <TableCell align="right">{formatHours(summary.p90CycleTimeHours)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>
                      <strong>平均レビュー待ち時間</strong>
                    </TableCell>
                    <TableCell align="right">{formatHours(summary.avgFirstReviewWaitHours)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>
                      <strong>P90レビュー待ち時間</strong>
                    </TableCell>
                    <TableCell align="right">{formatHours(summary.p90FirstReviewWaitHours)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>
      </Grid>

      {/* 5. 週次トレンド */}
      {weeklyTrend.length > 1 && (
        <Paper sx={{ p: 2, mb: 3 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            週次トレンド
          </Typography>
          <Line
            data={{
              labels: weeklyTrend.map((w) => w.weekLabel),
              datasets: [
                {
                  label: 'サイクルタイム (時間)',
                  data: weeklyTrend.map((w) => w.avgCycleTimeHours),
                  borderColor: PrimitiveToken.colors.gray[100],
                  backgroundColor: hexToRgba(PrimitiveToken.colors.gray[100], 0.1),
                  yAxisID: 'y',
                  tension: 0.3,
                },
                {
                  label: 'レビュー待ち時間 (時間)',
                  data: weeklyTrend.map((w) => w.avgFirstReviewWaitHours),
                  borderColor: PrimitiveToken.colors.gray[60],
                  backgroundColor: hexToRgba(PrimitiveToken.colors.gray[60], 0.1),
                  yAxisID: 'y',
                  tension: 0.3,
                },
                {
                  label: '修正往復回数',
                  data: weeklyTrend.map((w) => w.avgRevisionRounds),
                  borderColor: PrimitiveToken.colors.red[50],
                  backgroundColor: hexToRgba(PrimitiveToken.colors.red[50], 0.1),
                  yAxisID: 'y1',
                  tension: 0.3,
                },
              ],
            }}
            options={{
              responsive: true,
              interaction: {
                mode: 'index' as const,
                intersect: false,
              },
              plugins: {
                title: { display: true, text: '各指標が下がっていれば改善傾向' },
                legend: { position: 'top' as const },
              },
              scales: {
                y: {
                  type: 'linear' as const,
                  display: true,
                  position: 'left' as const,
                  title: { display: true, text: '時間' },
                },
                y1: {
                  type: 'linear' as const,
                  display: true,
                  position: 'right' as const,
                  title: { display: true, text: '回数' },
                  grid: { drawOnChartArea: false },
                },
              },
            }}
          />
        </Paper>
      )}

      {/* 6. 担当者別フロー指標 */}
      {authorMetrics.length > 0 && (
        <Paper sx={{ p: 2, mb: 3 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            担当者別フロー指標
          </Typography>
          <Grid container spacing={2}>
            <Grid xs={12} md={6}>
              <Bar
                data={{
                  labels: authorMetrics.slice(0, 10).map((a) => a.author),
                  datasets: [
                    {
                      label: 'サイクルタイム (時間)',
                      data: authorMetrics.slice(0, 10).map((a) => a.avgCycleTimeHours),
                      backgroundColor: PrimitiveToken.colors.gray[100],
                    },
                    {
                      label: 'レビュー待ち (時間)',
                      data: authorMetrics.slice(0, 10).map((a) => a.avgFirstReviewWaitHours),
                      backgroundColor: PrimitiveToken.colors.gray[60],
                    },
                  ],
                }}
                options={{
                  indexAxis: 'y' as const,
                  responsive: true,
                  plugins: {
                    title: { display: true, text: '担当者別: 時間指標' },
                    legend: { position: 'top' as const },
                  },
                }}
              />
            </Grid>
            <Grid xs={12} md={6}>
              <TableContainer sx={{ maxHeight: 400 }}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell>担当者</TableCell>
                      <TableCell align="center">PR数</TableCell>
                      <TableCell align="center">サイクル</TableCell>
                      <TableCell align="center">待ち時間</TableCell>
                      <TableCell align="center">往復</TableCell>
                      <TableCell align="center">PRサイズ</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {authorMetrics.map((stat) => (
                      <TableRow key={stat.author}>
                        <TableCell>
                          <strong>{stat.author}</strong>
                        </TableCell>
                        <TableCell align="center">{stat.prCount}</TableCell>
                        <TableCell align="center">
                          <Chip
                            label={formatHours(stat.avgCycleTimeHours)}
                            size="small"
                            color={getCycleTimeColor(stat.avgCycleTimeHours)}
                          />
                        </TableCell>
                        <TableCell align="center">
                          <Chip
                            label={formatHours(stat.avgFirstReviewWaitHours)}
                            size="small"
                            color={getWaitTimeColor(stat.avgFirstReviewWaitHours)}
                          />
                        </TableCell>
                        <TableCell align="center">
                          <Chip
                            label={`${stat.avgRevisionRounds.toFixed(1)}回`}
                            size="small"
                            color={getRevisionColor(stat.avgRevisionRounds)}
                          />
                        </TableCell>
                        <TableCell align="center">{Math.round(stat.avgPRSize)}行</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Grid>
          </Grid>
        </Paper>
      )}

      {/* 7. レビュアー別反応速度 */}
      {reviewerMetrics.length > 0 && (
        <Paper sx={{ p: 2, mb: 3 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            レビュアー別反応速度
          </Typography>
          <Grid container spacing={2}>
            <Grid xs={12} md={6}>
              <Bar
                data={{
                  labels: reviewerMetrics.slice(0, 10).map((r) => r.reviewer),
                  datasets: [
                    {
                      label: '平均反応時間 (時間)',
                      data: reviewerMetrics.slice(0, 10).map((r) => r.avgResponseTimeHours),
                      backgroundColor: reviewerMetrics
                        .slice(0, 10)
                        .map((r) =>
                          r.avgResponseTimeHours <= 4
                            ? PrimitiveToken.colors.gray[100]
                            : r.avgResponseTimeHours <= 24
                              ? PrimitiveToken.colors.gray[60]
                              : PrimitiveToken.colors.red[50],
                        ),
                    },
                  ],
                }}
                options={{
                  indexAxis: 'y' as const,
                  responsive: true,
                  plugins: {
                    title: { display: true, text: 'レビュアーの反応速度（短いほど良い）' },
                    legend: { display: false },
                  },
                }}
              />
            </Grid>
            <Grid xs={12} md={6}>
              <TableContainer sx={{ maxHeight: 400 }}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell>レビュアー</TableCell>
                      <TableCell align="center">レビュー数</TableCell>
                      <TableCell align="center">反応時間</TableCell>
                      <TableCell align="center">変更依頼率</TableCell>
                      <TableCell align="center">承認率</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {reviewerMetrics.map((stat) => (
                      <TableRow key={stat.reviewer}>
                        <TableCell>
                          <strong>{stat.reviewer}</strong>
                        </TableCell>
                        <TableCell align="center">{stat.reviewCount}</TableCell>
                        <TableCell align="center">
                          <Chip
                            label={formatHours(stat.avgResponseTimeHours)}
                            size="small"
                            color={getWaitTimeColor(stat.avgResponseTimeHours)}
                          />
                        </TableCell>
                        <TableCell align="center">{(stat.changesRequestedRatio * 100).toFixed(0)}%</TableCell>
                        <TableCell align="center">{(stat.approvalRatio * 100).toFixed(0)}%</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Grid>
          </Grid>
          <Alert severity="info" sx={{ mt: 2 }}>
            <strong>解釈:</strong> 変更依頼率が高いレビュアーは厳格なレビュー姿勢。
            ただし往復回数が増えすぎる場合は、事前の設計レビューや要件共有の改善を検討。
          </Alert>
        </Paper>
      )}

      {/* 8. 診断と改善アクション */}
      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          診断と改善アクション
        </Typography>

        {summary.fastFeedbackRatio >= 0.7 && summary.quickMergeRatio >= 0.7 && summary.lowRevisionRatio >= 0.7 && (
          <Alert severity="success" sx={{ mb: 2 }}>
            <strong>良好:</strong> フィードバックループが健全です。
            レビューが迅速に行われ、PRも素早くマージされています。この状態を維持してください。
          </Alert>
        )}

        {summary.fastFeedbackRatio < 0.4 && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            <strong>レビュー待ち時間が長い:</strong>{' '}
            フィードバックが遅れると、コンテキストスイッチングのコストが増加します。
            <Box component="ul" sx={{ pl: 2, mt: 1 }}>
              <li>レビュー時間をカレンダーにブロックする</li>
              <li>PRサイズを小さくして、レビューしやすくする</li>
              <li>ペアプログラミングでリアルタイムレビューを検討</li>
            </Box>
          </Alert>
        )}

        {summary.quickMergeRatio < 0.4 && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            <strong>マージまでの時間が長い:</strong> PRが滞留すると、コンフリクトリスクや統合コストが増加します。
            <Box component="ul" sx={{ pl: 2, mt: 1 }}>
              <li>PRを小さく分割する（目標: 200行以下）</li>
              <li>WIPでの早期フィードバックを活用</li>
              <li>ブロッカーを早期に特定・解消</li>
            </Box>
          </Alert>
        )}

        {summary.lowRevisionRatio < 0.4 && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            <strong>修正往復が多い:</strong> 品質の問題か、要件・設計の齟齬が考えられます。
            <Box component="ul" sx={{ pl: 2, mt: 1 }}>
              <li>実装前に設計レビューを行う</li>
              <li>要件を明確にしてから実装を開始</li>
              <li>テストを先に書いて期待動作を明確化</li>
            </Box>
          </Alert>
        )}

        <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            DORAフロー指標の意義
          </Typography>
          <Grid container spacing={2}>
            <Grid xs={12} md={4}>
              <Typography variant="body2">
                <strong>サイクルタイム:</strong> 開発のスループットを示す。短いほど素早くデリバリーできる。
              </Typography>
            </Grid>
            <Grid xs={12} md={4}>
              <Typography variant="body2">
                <strong>レビュー待ち時間:</strong> チームの協力度合いを示す。短いほどフィードバック文化が健全。
              </Typography>
            </Grid>
            <Grid xs={12} md={4}>
              <Typography variant="body2">
                <strong>修正往復回数:</strong> PR品質と設計共有度を示す。少ないほど手戻りが少ない。
              </Typography>
            </Grid>
          </Grid>
        </Box>
      </Paper>
    </Box>
  )
}
