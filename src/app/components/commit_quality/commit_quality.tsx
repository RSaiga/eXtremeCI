import React, { useEffect, useState } from 'react';
import {
  Box, Card, CardContent, Typography, Chip, Paper,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  LinearProgress, Alert, Tooltip
} from '@mui/material';
import Grid from '@mui/material/Unstable_Grid2';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import { Chart, registerables } from 'chart.js';
import { PrimitiveToken, hexToRgba } from '../ui/tokens/primitive-token';

Chart.register(...registerables);

import {
  CommitQualityMetrics,
  AuthorCommitQuality,
  COMMIT_SIZE_CATEGORIES,
} from '../../domain/models/commit_quality/commit_quality';
import {
  analyzeCommitQuality,
  analyzeAuthorCommitQuality,
} from '../../domain/services/commit_quality/commit_quality_service';
import Loading from '../loading/loading';

interface CommitQualityDashboardProps {
  externalMetrics?: CommitQualityMetrics;
  externalAuthorStats?: AuthorCommitQuality[];
}

export const CommitQualityDashboard: React.FC<CommitQualityDashboardProps> = ({
  externalMetrics,
  externalAuthorStats,
}) => {
  const [metrics, setMetrics] = useState<CommitQualityMetrics | null>(externalMetrics || null);
  const [authorStats, setAuthorStats] = useState<AuthorCommitQuality[]>(externalAuthorStats || []);
  const [isLoading, setIsLoading] = useState(!externalMetrics);

  useEffect(() => {
    if (!externalMetrics) {
      loadData();
    }
  }, [externalMetrics]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [metricsData, authorData] = await Promise.all([
        analyzeCommitQuality(),
        analyzeAuthorCommitQuality(),
      ]);
      setMetrics(metricsData);
      setAuthorStats(authorData);
    } catch (e) {
      console.error('Failed to load commit quality data:', e);
    }
    setIsLoading(false);
  };

  if (isLoading) {
    return <Loading />;
  }

  if (!metrics) {
    return <Alert severity="warning">コミットデータを取得できませんでした</Alert>;
  }

  // 働き方の総合判定
  const getWorkStyleVerdict = () => {
    const smallRatio = metrics.smallCommitRatio;
    const largeRatio = metrics.largeCommitRatio;

    if (smallRatio >= 0.7 && largeRatio <= 0.1) {
      return {
        style: 'incremental',
        label: '刻み型（理想的）',
        color: 'success' as const,
        description: '設計しながら小さく刻んで進めている。レビューしやすい働き方。',
        icon: '✓',
      };
    } else if (largeRatio >= 0.3) {
      return {
        style: 'batch',
        label: 'まとめ型（要改善）',
        color: 'error' as const,
        description: '後出しでまとめてコミットしている傾向。レビューが困難。',
        icon: '!',
      };
    } else if (smallRatio >= 0.5) {
      return {
        style: 'mixed',
        label: '混合型',
        color: 'warning' as const,
        description: '刻み型とまとめ型が混在。もう少し細かく刻めると良い。',
        icon: '△',
      };
    } else {
      return {
        style: 'batch',
        label: 'まとめ型（要改善）',
        color: 'error' as const,
        description: '大きなコミットが多く、後出しでまとめている可能性が高い。',
        icon: '!',
      };
    }
  };

  const verdict = getWorkStyleVerdict();

  const getScoreColor = (score: number) => {
    if (score >= 70) return 'success';
    if (score >= 50) return 'warning';
    return 'error';
  };

  const getWorkStyleColor = (style: string) => {
    if (style === 'incremental') return 'success';
    if (style === 'batch') return 'error';
    return 'warning';
  };

  return (
    <Box>
      {/* 1. 働き方の総合判定 - 最も重要な情報を最初に */}
      <Paper sx={{ p: 3, mb: 3, bgcolor: verdict.color === 'success' ? 'success.light' : verdict.color === 'error' ? 'error.light' : 'warning.light' }}>
        <Grid container spacing={2} alignItems="center">
          <Grid xs={12} md={8}>
            <Typography variant="h5" sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
              <span style={{ fontSize: '1.5em' }}>{verdict.icon}</span>
              働き方の判定: <strong>{verdict.label}</strong>
            </Typography>
            <Typography variant="body1" sx={{ mb: 2 }}>
              {verdict.description}
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <Chip
                label={`小さいコミット: ${(metrics.smallCommitRatio * 100).toFixed(0)}%`}
                color={metrics.smallCommitRatio >= 0.7 ? 'success' : metrics.smallCommitRatio >= 0.5 ? 'warning' : 'error'}
              />
              <Chip
                label={`大きいコミット: ${(metrics.largeCommitRatio * 100).toFixed(0)}%`}
                color={metrics.largeCommitRatio <= 0.1 ? 'success' : metrics.largeCommitRatio <= 0.2 ? 'warning' : 'error'}
              />
              <Chip
                label={`レビューしやすさ: ${metrics.reviewabilityScore}点`}
                color={getScoreColor(metrics.reviewabilityScore)}
              />
            </Box>
          </Grid>
          <Grid xs={12} md={4}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="caption" color="text.secondary">レビューしやすさスコア</Typography>
              <Typography variant="h2" color={verdict.color + '.dark'}>
                {metrics.reviewabilityScore}
              </Typography>
              <Typography variant="caption" color="text.secondary">/ 100点</Typography>
            </Box>
          </Grid>
        </Grid>
      </Paper>

      {/* 2. コミットサイズの閾値を明示 */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>コミットサイズの基準（変更行数 = 追加 + 削除）</Typography>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: 'grey.100' }}>
                <TableCell><strong>カテゴリ</strong></TableCell>
                <TableCell align="center"><strong>変更行数</strong></TableCell>
                <TableCell align="center"><strong>件数</strong></TableCell>
                <TableCell align="center"><strong>割合</strong></TableCell>
                <TableCell><strong>評価</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {COMMIT_SIZE_CATEGORIES.map((cat, idx) => {
                const dist = metrics.sizeDistribution[idx];
                return (
                  <TableRow key={cat.name} sx={{ bgcolor: cat.color + '20' }}>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box sx={{ width: 16, height: 16, bgcolor: cat.color, borderRadius: 1 }} />
                        <strong>{cat.name}</strong> ({cat.label})
                      </Box>
                    </TableCell>
                    <TableCell align="center">
                      <strong>{cat.min} - {cat.max === Infinity ? '∞' : cat.max} 行</strong>
                    </TableCell>
                    <TableCell align="center">{dist.count} 件</TableCell>
                    <TableCell align="center">{dist.percentage.toFixed(1)}%</TableCell>
                    <TableCell>{cat.description}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
        <Alert severity="info" sx={{ mt: 2 }}>
          <strong>目安:</strong> XS + S（50行以下）が <strong>70%以上</strong> なら「刻み型」、
          L + XL（151行以上）が <strong>30%以上</strong> なら「まとめ型」と判定
        </Alert>
      </Paper>

      {/* 3. 刻み型 vs まとめ型 の可視化グラフ */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid xs={12} md={6}>
          <Paper sx={{ p: 2, height: '100%' }}>
            <Typography variant="h6" sx={{ mb: 2 }}>刻み型 vs まとめ型</Typography>
            <Bar
              data={{
                labels: ['刻み型\n(XS+S: 50行以下)', 'まとめ型\n(L+XL: 151行以上)'],
                datasets: [{
                  label: '割合 (%)',
                  data: [
                    metrics.smallCommitRatio * 100,
                    metrics.largeCommitRatio * 100,
                  ],
                  backgroundColor: [
                    metrics.smallCommitRatio >= 0.7 ? PrimitiveToken.colors.gray[100] : metrics.smallCommitRatio >= 0.5 ? PrimitiveToken.colors.gray[70] : PrimitiveToken.colors.red[50],
                    metrics.largeCommitRatio <= 0.1 ? PrimitiveToken.colors.gray[100] : metrics.largeCommitRatio <= 0.2 ? PrimitiveToken.colors.gray[70] : PrimitiveToken.colors.red[50],
                  ],
                  borderWidth: 2,
                  borderColor: [PrimitiveToken.colors.gray[100], PrimitiveToken.colors.gray[80]],
                }],
              }}
              options={{
                responsive: true,
                plugins: {
                  legend: { display: false },
                  title: { display: true, text: 'コミットの傾向（目標: 刻み型70%以上、まとめ型10%以下）' },
                },
                scales: {
                  y: {
                    beginAtZero: true,
                    max: 100,
                    title: { display: true, text: '割合 (%)' },
                  },
                },
              }}
            />
            <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-around' }}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="caption" color="text.secondary">刻み型 (XS+S)</Typography>
                <Typography variant="h4" color={metrics.smallCommitRatio >= 0.7 ? 'success.main' : 'warning.main'}>
                  {(metrics.smallCommitRatio * 100).toFixed(0)}%
                </Typography>
                <Typography variant="caption" color="text.secondary">目標: 70%以上</Typography>
              </Box>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="caption" color="text.secondary">まとめ型 (L+XL)</Typography>
                <Typography variant="h4" color={metrics.largeCommitRatio <= 0.1 ? 'success.main' : 'error.main'}>
                  {(metrics.largeCommitRatio * 100).toFixed(0)}%
                </Typography>
                <Typography variant="caption" color="text.secondary">目標: 10%以下</Typography>
              </Box>
            </Box>
          </Paper>
        </Grid>
        <Grid xs={12} md={6}>
          <Paper sx={{ p: 2, height: '100%' }}>
            <Typography variant="h6" sx={{ mb: 2 }}>コミットサイズ分布</Typography>
            <Doughnut
              data={{
                labels: metrics.sizeDistribution.map(d => `${d.category.name} (${d.category.min}-${d.category.max === Infinity ? '∞' : d.category.max}行)`),
                datasets: [{
                  data: metrics.sizeDistribution.map(d => d.count),
                  backgroundColor: metrics.sizeDistribution.map(d => d.category.color),
                  borderWidth: 2,
                }],
              }}
              options={{
                responsive: true,
                plugins: {
                  legend: { position: 'right' as const },
                  title: { display: true, text: 'サイズ別コミット数' },
                  tooltip: {
                    callbacks: {
                      label: (ctx) => {
                        const item = metrics.sizeDistribution[ctx.dataIndex];
                        return `${item.count}件 (${item.percentage.toFixed(1)}%)`;
                      },
                    },
                  },
                },
              }}
            />
          </Paper>
        </Grid>
      </Grid>

      {/* 4. レビューしやすさの観点 */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>レビューしやすさの観点</Typography>
        <Grid container spacing={2}>
          <Grid xs={12} md={4}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="subtitle2" color="text.secondary">1コミットの平均行数</Typography>
                <Typography variant="h4" color={metrics.avgLinesPerCommit <= 50 ? 'success.main' : metrics.avgLinesPerCommit <= 150 ? 'warning.main' : 'error.main'}>
                  {metrics.avgLinesPerCommit} 行
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {metrics.avgLinesPerCommit <= 50 ? '✓ レビューしやすいサイズ' :
                   metrics.avgLinesPerCommit <= 150 ? '△ やや大きめ' : '! 大きすぎる'}
                </Typography>
                <LinearProgress
                  variant="determinate"
                  value={Math.min(100, (50 / metrics.avgLinesPerCommit) * 100)}
                  color={metrics.avgLinesPerCommit <= 50 ? 'success' : metrics.avgLinesPerCommit <= 150 ? 'warning' : 'error'}
                  sx={{ mt: 1 }}
                />
                <Typography variant="caption" color="text.secondary">目標: 50行以下</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid xs={12} md={4}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="subtitle2" color="text.secondary">巨大コミット率 (XL: 401行+)</Typography>
                <Typography variant="h4" color={metrics.giantCommitRatio <= 0.05 ? 'success.main' : metrics.giantCommitRatio <= 0.1 ? 'warning.main' : 'error.main'}>
                  {(metrics.giantCommitRatio * 100).toFixed(1)}%
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {metrics.giantCommitRatio <= 0.05 ? '✓ 問題なし' :
                   metrics.giantCommitRatio <= 0.1 ? '△ やや多い' : '! 多すぎる（分割推奨）'}
                </Typography>
                <LinearProgress
                  variant="determinate"
                  value={Math.min(100, 100 - metrics.giantCommitRatio * 200)}
                  color={metrics.giantCommitRatio <= 0.05 ? 'success' : metrics.giantCommitRatio <= 0.1 ? 'warning' : 'error'}
                  sx={{ mt: 1 }}
                />
                <Typography variant="caption" color="text.secondary">目標: 5%以下</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid xs={12} md={4}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="subtitle2" color="text.secondary">中央値</Typography>
                <Typography variant="h4" color={metrics.medianLinesPerCommit <= 30 ? 'success.main' : metrics.medianLinesPerCommit <= 100 ? 'warning.main' : 'error.main'}>
                  {metrics.medianLinesPerCommit} 行
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {metrics.medianLinesPerCommit <= 30 ? '✓ 典型的なコミットが小さい' :
                   metrics.medianLinesPerCommit <= 100 ? '△ やや大きめ' : '! 大きすぎる'}
                </Typography>
                <LinearProgress
                  variant="determinate"
                  value={Math.min(100, (30 / metrics.medianLinesPerCommit) * 100)}
                  color={metrics.medianLinesPerCommit <= 30 ? 'success' : metrics.medianLinesPerCommit <= 100 ? 'warning' : 'error'}
                  sx={{ mt: 1 }}
                />
                <Typography variant="caption" color="text.secondary">目標: 30行以下</Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Paper>

      {/* 5. 週次トレンド - 働き方の変化 */}
      {metrics.weeklyTrend.length > 1 && (
        <Paper sx={{ p: 2, mb: 3 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>週次トレンド - 働き方は改善しているか？</Typography>
          <Line
            data={{
              labels: metrics.weeklyTrend.map(w => w.weekLabel),
              datasets: [
                {
                  label: '刻み型 (XS+S) %',
                  data: metrics.weeklyTrend.map(w => w.smallRatio * 100),
                  borderColor: PrimitiveToken.colors.gray[100],
                  backgroundColor: hexToRgba(PrimitiveToken.colors.gray[100], 0.1),
                  fill: true,
                  tension: 0.3,
                },
                {
                  label: 'まとめ型 (L+XL) %',
                  data: metrics.weeklyTrend.map(w => w.largeRatio * 100),
                  borderColor: PrimitiveToken.colors.red[50],
                  backgroundColor: hexToRgba(PrimitiveToken.colors.red[50], 0.2),
                  fill: true,
                  tension: 0.3,
                },
              ],
            }}
            options={{
              responsive: true,
              plugins: {
                title: { display: true, text: '刻み型が増え、まとめ型が減っていれば改善傾向' },
                legend: { position: 'top' as const },
              },
              scales: {
                y: {
                  beginAtZero: true,
                  max: 100,
                  title: { display: true, text: '割合 (%)' },
                },
              },
            }}
          />
          <Alert severity="info" sx={{ mt: 2 }}>
            <strong>見方:</strong> 緑線（刻み型）が上昇し、赤線（まとめ型）が下降していれば、働き方が改善している証拠
          </Alert>
        </Paper>
      )}

      {/* 6. 担当者別 - 誰が刻み型？誰がまとめ型？ */}
      {authorStats.length > 0 && (
        <Paper sx={{ p: 2, mb: 3 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>担当者別の働き方パターン</Typography>
          <Grid container spacing={2}>
            <Grid xs={12} md={6}>
              <Bar
                data={{
                  labels: authorStats.slice(0, 10).map(a => a.author),
                  datasets: [
                    {
                      label: '刻み型 (XS+S) %',
                      data: authorStats.slice(0, 10).map(a => a.smallCommitRatio * 100),
                      backgroundColor: PrimitiveToken.colors.gray[100],
                    },
                    {
                      label: 'まとめ型 (L+XL) %',
                      data: authorStats.slice(0, 10).map(a => a.largeCommitRatio * 100),
                      backgroundColor: PrimitiveToken.colors.red[50],
                    },
                  ],
                }}
                options={{
                  indexAxis: 'y' as const,
                  responsive: true,
                  plugins: {
                    title: { display: true, text: '担当者別: 刻み型 vs まとめ型' },
                    legend: { position: 'top' as const },
                  },
                  scales: {
                    x: {
                      beginAtZero: true,
                      max: 100,
                      stacked: false,
                      title: { display: true, text: '割合 (%)' },
                    },
                    y: { stacked: false },
                  },
                }}
              />
            </Grid>
            <Grid xs={12} md={6}>
              <TableContainer sx={{ maxHeight: 350 }}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell>担当者</TableCell>
                      <TableCell align="center">コミット数</TableCell>
                      <TableCell align="center">平均行数</TableCell>
                      <TableCell align="center">働き方</TableCell>
                      <TableCell align="center">スコア</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {authorStats.map(stat => (
                      <TableRow key={stat.author}>
                        <TableCell><strong>{stat.author}</strong></TableCell>
                        <TableCell align="center">{stat.totalCommits}</TableCell>
                        <TableCell align="center">{stat.avgLinesPerCommit}</TableCell>
                        <TableCell align="center">
                          <Chip
                            label={stat.workStyleLabel}
                            size="small"
                            color={getWorkStyleColor(stat.workStyle)}
                          />
                        </TableCell>
                        <TableCell align="center">
                          <Chip
                            label={stat.reviewabilityScore}
                            size="small"
                            color={getScoreColor(stat.reviewabilityScore)}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Grid>
          </Grid>
        </Paper>
      )}

      {/* 7. まとめ・改善アクション */}
      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>診断結果と改善アクション</Typography>

        {verdict.style === 'incremental' && (
          <Alert severity="success" sx={{ mb: 2 }}>
            <strong>良好:</strong> 設計しながら小さく刻んで進める「刻み型」の働き方ができています。
            レビュアーにとってレビューしやすく、バグも見つけやすい状態です。この状態を維持してください。
          </Alert>
        )}

        {verdict.style === 'batch' && (
          <>
            <Alert severity="error" sx={{ mb: 2 }}>
              <strong>問題:</strong> 後出しでまとめてコミットする「まとめ型」の傾向があります。
              レビューが困難になり、バグ見逃しリスクが高まります。
            </Alert>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>改善アクション:</Typography>
            <Box component="ul" sx={{ pl: 2 }}>
              <li>1つの機能/修正 = 1コミットを意識する</li>
              <li>「動いたらコミット」ではなく「意味のある単位でコミット」</li>
              <li>リファクタリングと機能追加は別コミットにする</li>
              <li>コミット前に <code>git diff</code> で変更内容を確認し、大きすぎたら分割</li>
              <li>目安: 1コミット50行以下、1PR 200行以下</li>
            </Box>
          </>
        )}

        {verdict.style === 'mixed' && (
          <>
            <Alert severity="warning" sx={{ mb: 2 }}>
              <strong>改善余地あり:</strong> 刻み型とまとめ型が混在しています。
              もう少し意識的に細かく刻むことで、レビューしやすさが向上します。
            </Alert>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>改善のヒント:</Typography>
            <Box component="ul" sx={{ pl: 2 }}>
              <li>大きなコミット（L/XL）を減らすことを意識</li>
              <li>作業の区切りごとにこまめにコミット</li>
              <li>「WIP」コミットは後で <code>git rebase -i</code> で整理</li>
            </Box>
          </>
        )}

        <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>なぜ「刻み型」が理想的なのか？</Typography>
          <Grid container spacing={2}>
            <Grid xs={12} md={4}>
              <Typography variant="body2">
                <strong>レビューしやすい:</strong> 小さいコミットは変更意図が明確で、レビュアーの認知負荷が低い
              </Typography>
            </Grid>
            <Grid xs={12} md={4}>
              <Typography variant="body2">
                <strong>バグを見つけやすい:</strong> 変更範囲が狭いほど、問題箇所の特定が容易
              </Typography>
            </Grid>
            <Grid xs={12} md={4}>
              <Typography variant="body2">
                <strong>設計の証拠:</strong> 刻めているということは、事前に設計・分解ができている証拠
              </Typography>
            </Grid>
          </Grid>
        </Box>
      </Paper>
    </Box>
  );
};