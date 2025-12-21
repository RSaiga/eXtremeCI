import React, { useEffect, useState } from 'react';
import {
  Box, Card, CardContent, Typography, Chip, Paper,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  LinearProgress, Alert,
} from '@mui/material';
import Grid from '@mui/material/Unstable_Grid2';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import { Chart, registerables } from 'chart.js';
import { PrimitiveToken, hexToRgba } from '../ui/tokens/primitive-token';

Chart.register(...registerables);

import {
  QualitySustainabilityMetrics,
} from '../../domain/models/quality_sustainability/quality_sustainability';
import {
  analyzeQualitySustainability,
} from '../../domain/services/quality_sustainability/quality_sustainability_service';
import Loading from '../loading/loading';

export const QualitySustainabilityDashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<QualitySustainabilityMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const data = await analyzeQualitySustainability();
      setMetrics(data);
    } catch (e) {
      console.error('Failed to load quality sustainability data:', e);
    }
    setIsLoading(false);
  };

  if (isLoading) {
    return <Loading />;
  }

  if (!metrics) {
    return <Alert severity="warning">データを取得できませんでした</Alert>;
  }

  const getGradeColor = (grade: string) => {
    switch (grade) {
      case 'A': return 'success';
      case 'B': return 'info';
      case 'C': return 'warning';
      case 'D':
      case 'F': return 'error';
      default: return 'default';
    }
  };

  const getOrientationColor = (orientation: string) => {
    switch (orientation) {
      case 'long-term': return 'success';
      case 'short-term': return 'error';
      default: return 'warning';
    }
  };

  return (
    <Box>
      {/* 1. 総合判定 - 短期成果 vs 長期保守 */}
      <Paper sx={{
        p: 3, mb: 3,
        bgcolor: metrics.orientation === 'long-term' ? 'success.light' :
                 metrics.orientation === 'short-term' ? 'error.light' : 'warning.light'
      }}>
        <Grid container spacing={2} alignItems="center">
          <Grid xs={12} md={8}>
            <Typography variant="h5" sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
              開発姿勢: <strong>{metrics.orientationLabel}</strong>
            </Typography>
            <Typography variant="body1" sx={{ mb: 2 }}>
              {metrics.orientation === 'long-term' &&
                'テストを書き、リファクタリングにも時間を投資している。長期的な保守性を重視した健全な開発。'}
              {metrics.orientation === 'short-term' &&
                'テストやリファクタリングが少なく、目先の機能開発を優先している傾向。技術的負債の蓄積に注意。'}
              {metrics.orientation === 'balanced' &&
                'テストとリファクタリングのバランスが取れている。さらなる改善の余地あり。'}
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <Chip
                label={`テスト文化: ${metrics.testMetrics.testCultureLabel}`}
                color={metrics.testMetrics.testCulture === 'strong' ? 'success' :
                       metrics.testMetrics.testCulture === 'moderate' ? 'warning' : 'error'}
              />
              <Chip
                label={`CI健全性: ${metrics.ciMetrics.ciHealthLabel}`}
                color={metrics.ciMetrics.ciHealth === 'excellent' ? 'success' :
                       metrics.ciMetrics.ciHealth === 'good' ? 'info' :
                       metrics.ciMetrics.ciHealth === 'needs-improvement' ? 'warning' : 'error'}
              />
              <Chip
                label={`技術的負債: ${metrics.refactoringMetrics.techDebtAttitudeLabel}`}
                color={metrics.refactoringMetrics.techDebtAttitude === 'proactive' ? 'success' :
                       metrics.refactoringMetrics.techDebtAttitude === 'reactive' ? 'warning' : 'error'}
              />
            </Box>
          </Grid>
          <Grid xs={12} md={4}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="caption" color="text.secondary">持続性スコア</Typography>
              <Typography variant="h1" color={getOrientationColor(metrics.orientation) + '.dark'}>
                {metrics.sustainabilityGrade}
              </Typography>
              <Typography variant="h4" color="text.secondary">
                {metrics.sustainabilityScore} / 100
              </Typography>
            </Box>
          </Grid>
        </Grid>
      </Paper>

      {/* 2. 評価基準 */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>評価基準と現状</Typography>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: 'grey.100' }}>
                <TableCell><strong>指標</strong></TableCell>
                <TableCell align="center"><strong>現状</strong></TableCell>
                <TableCell align="center"><strong>目標</strong></TableCell>
                <TableCell align="center"><strong>評価</strong></TableCell>
                <TableCell><strong>読み取れること</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              <TableRow>
                <TableCell>PRにテストが含まれる割合</TableCell>
                <TableCell align="center">
                  <strong>{(metrics.testMetrics.testInclusionRate * 100).toFixed(0)}%</strong>
                </TableCell>
                <TableCell align="center">70%以上</TableCell>
                <TableCell align="center">
                  <Chip
                    label={metrics.testMetrics.testInclusionRate >= 0.7 ? '良好' :
                           metrics.testMetrics.testInclusionRate >= 0.4 ? '要改善' : '問題'}
                    size="small"
                    color={metrics.testMetrics.testInclusionRate >= 0.7 ? 'success' :
                           metrics.testMetrics.testInclusionRate >= 0.4 ? 'warning' : 'error'}
                  />
                </TableCell>
                <TableCell>テストを書く文化があるか</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>CI成功率</TableCell>
                <TableCell align="center">
                  <strong>{(metrics.ciMetrics.successRate * 100).toFixed(0)}%</strong>
                </TableCell>
                <TableCell align="center">90%以上</TableCell>
                <TableCell align="center">
                  <Chip
                    label={metrics.ciMetrics.successRate >= 0.9 ? '優秀' :
                           metrics.ciMetrics.successRate >= 0.75 ? '良好' : '要改善'}
                    size="small"
                    color={metrics.ciMetrics.successRate >= 0.9 ? 'success' :
                           metrics.ciMetrics.successRate >= 0.75 ? 'info' : 'warning'}
                  />
                </TableCell>
                <TableCell>コードの品質管理ができているか</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>リファクタリングPR率</TableCell>
                <TableCell align="center">
                  <strong>{(metrics.refactoringMetrics.refactoringRate * 100).toFixed(0)}%</strong>
                </TableCell>
                <TableCell align="center">10-20%</TableCell>
                <TableCell align="center">
                  <Chip
                    label={metrics.refactoringMetrics.refactoringRate >= 0.1 ? '良好' :
                           metrics.refactoringMetrics.refactoringRate >= 0.05 ? '普通' : '少ない'}
                    size="small"
                    color={metrics.refactoringMetrics.refactoringRate >= 0.1 ? 'success' :
                           metrics.refactoringMetrics.refactoringRate >= 0.05 ? 'warning' : 'error'}
                  />
                </TableCell>
                <TableCell>技術的負債に向き合っているか</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* 3. テストコードの分析 */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>テストコードの有無・増え方</Typography>
        <Grid container spacing={2}>
          <Grid xs={12} md={4}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="subtitle2" color="text.secondary">
                  PRにテストが含まれる割合
                </Typography>
                <Typography variant="h3" color={
                  metrics.testMetrics.testInclusionRate >= 0.7 ? 'success.main' :
                  metrics.testMetrics.testInclusionRate >= 0.4 ? 'warning.main' : 'error.main'
                }>
                  {(metrics.testMetrics.testInclusionRate * 100).toFixed(0)}%
                </Typography>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                  <Typography variant="caption">
                    テストあり: {metrics.testMetrics.prsWithTests}件
                  </Typography>
                  <Typography variant="caption">
                    テストなし: {metrics.testMetrics.prsWithoutTests}件
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={metrics.testMetrics.testInclusionRate * 100}
                  color={metrics.testMetrics.testInclusionRate >= 0.7 ? 'success' :
                         metrics.testMetrics.testInclusionRate >= 0.4 ? 'warning' : 'error'}
                  sx={{ mt: 1 }}
                />
              </CardContent>
            </Card>
          </Grid>
          <Grid xs={12} md={4}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="subtitle2" color="text.secondary">
                  テストを書く開発者の割合
                </Typography>
                <Typography variant="h3" color={
                  metrics.testMetrics.authorTestRate >= 0.7 ? 'success.main' :
                  metrics.testMetrics.authorTestRate >= 0.4 ? 'warning.main' : 'error.main'
                }>
                  {(metrics.testMetrics.authorTestRate * 100).toFixed(0)}%
                </Typography>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                  <Typography variant="caption">
                    書く人: {metrics.testMetrics.authorsWithTests}人
                  </Typography>
                  <Typography variant="caption">
                    書かない人: {metrics.testMetrics.authorsWithoutTests}人
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={metrics.testMetrics.authorTestRate * 100}
                  color={metrics.testMetrics.authorTestRate >= 0.7 ? 'success' :
                         metrics.testMetrics.authorTestRate >= 0.4 ? 'warning' : 'error'}
                  sx={{ mt: 1 }}
                />
              </CardContent>
            </Card>
          </Grid>
          <Grid xs={12} md={4}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="subtitle2" color="text.secondary">テスト文化の評価</Typography>
                <Typography variant="h4" sx={{ mt: 1 }}>
                  {metrics.testMetrics.testCultureLabel}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  {metrics.testMetrics.testCulture === 'strong' && 'テストが必須の文化が根付いている'}
                  {metrics.testMetrics.testCulture === 'moderate' && 'テストへの意識はあるが改善の余地あり'}
                  {metrics.testMetrics.testCulture === 'weak' && 'テストが少なく、品質リスクがある'}
                  {metrics.testMetrics.testCulture === 'none' && 'テストがほぼなく、深刻な問題'}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Paper>

      {/* 4. CI分析 */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>CIの失敗頻度</Typography>
        <Grid container spacing={2}>
          <Grid xs={12} md={6}>
            <Doughnut
              data={{
                labels: ['成功', '失敗', 'その他'],
                datasets: [{
                  data: [
                    metrics.ciMetrics.successfulChecks,
                    metrics.ciMetrics.failedChecks,
                    metrics.ciMetrics.totalChecks - metrics.ciMetrics.successfulChecks - metrics.ciMetrics.failedChecks,
                  ],
                  backgroundColor: [PrimitiveToken.colors.gray[100], PrimitiveToken.colors.red[50], PrimitiveToken.colors.gray[70]],
                  borderWidth: 2,
                }],
              }}
              options={{
                responsive: true,
                plugins: {
                  legend: { position: 'right' as const },
                  title: { display: true, text: 'CI結果の内訳' },
                },
              }}
            />
          </Grid>
          <Grid xs={12} md={6}>
            <Box sx={{ p: 2 }}>
              <Typography variant="subtitle1" gutterBottom>CI健全性指標</Typography>
              <Table size="small">
                <TableBody>
                  <TableRow>
                    <TableCell>総チェック数</TableCell>
                    <TableCell align="right"><strong>{metrics.ciMetrics.totalChecks}</strong></TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>成功</TableCell>
                    <TableCell align="right" sx={{ color: 'success.main' }}>
                      <strong>{metrics.ciMetrics.successfulChecks}</strong>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>失敗</TableCell>
                    <TableCell align="right" sx={{ color: 'error.main' }}>
                      <strong>{metrics.ciMetrics.failedChecks}</strong>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>成功率</TableCell>
                    <TableCell align="right">
                      <Chip
                        label={`${(metrics.ciMetrics.successRate * 100).toFixed(0)}%`}
                        color={metrics.ciMetrics.successRate >= 0.9 ? 'success' :
                               metrics.ciMetrics.successRate >= 0.75 ? 'info' : 'warning'}
                      />
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
              <Alert severity={
                metrics.ciMetrics.ciHealth === 'excellent' ? 'success' :
                metrics.ciMetrics.ciHealth === 'good' ? 'info' : 'warning'
              } sx={{ mt: 2 }}>
                {metrics.ciMetrics.ciHealth === 'excellent' &&
                  'CIが安定しており、コードの品質管理が適切に機能しています。'}
                {metrics.ciMetrics.ciHealth === 'good' &&
                  'CIは概ね安定していますが、失敗率を下げる余地があります。'}
                {metrics.ciMetrics.ciHealth === 'needs-improvement' &&
                  'CIの失敗が多く、開発効率に影響しています。テストの安定化が必要です。'}
                {metrics.ciMetrics.ciHealth === 'critical' &&
                  'CIの失敗率が高すぎます。テスト環境の見直しが急務です。'}
              </Alert>
            </Box>
          </Grid>
        </Grid>
      </Paper>

      {/* 5. リファクタリング分析 */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>リファクタリング系PRの存在</Typography>
        <Grid container spacing={2}>
          <Grid xs={12} md={6}>
            <Bar
              data={{
                labels: ['機能追加', 'バグ修正', 'リファクタリング', 'その他'],
                datasets: [{
                  label: 'PR数',
                  data: [
                    metrics.refactoringMetrics.featurePrs,
                    metrics.refactoringMetrics.bugfixPrs,
                    metrics.refactoringMetrics.refactoringPrs,
                    metrics.refactoringMetrics.otherPrs,
                  ],
                  backgroundColor: [PrimitiveToken.colors.gray[100], PrimitiveToken.colors.gray[80], PrimitiveToken.colors.gray[60], PrimitiveToken.colors.gray[70]],
                }],
              }}
              options={{
                responsive: true,
                plugins: {
                  legend: { display: false },
                  title: { display: true, text: 'PRタイプ別内訳' },
                },
                scales: {
                  y: { beginAtZero: true, title: { display: true, text: 'PR数' } },
                },
              }}
            />
          </Grid>
          <Grid xs={12} md={6}>
            <Box sx={{ p: 2 }}>
              <Typography variant="subtitle1" gutterBottom>技術的負債への向き合い方</Typography>
              <Box sx={{ mb: 2 }}>
                <Typography variant="h4" color={
                  metrics.refactoringMetrics.techDebtAttitude === 'proactive' ? 'success.main' :
                  metrics.refactoringMetrics.techDebtAttitude === 'reactive' ? 'warning.main' : 'error.main'
                }>
                  {metrics.refactoringMetrics.techDebtAttitudeLabel}
                </Typography>
              </Box>
              <Table size="small">
                <TableBody>
                  <TableRow>
                    <TableCell>リファクタリングPR</TableCell>
                    <TableCell align="right">
                      <strong>{metrics.refactoringMetrics.refactoringPrs}</strong> 件
                      ({(metrics.refactoringMetrics.refactoringRate * 100).toFixed(0)}%)
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>機能追加PR</TableCell>
                    <TableCell align="right"><strong>{metrics.refactoringMetrics.featurePrs}</strong> 件</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>バグ修正PR</TableCell>
                    <TableCell align="right"><strong>{metrics.refactoringMetrics.bugfixPrs}</strong> 件</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
              <Alert severity={
                metrics.refactoringMetrics.techDebtAttitude === 'proactive' ? 'success' :
                metrics.refactoringMetrics.techDebtAttitude === 'reactive' ? 'warning' : 'error'
              } sx={{ mt: 2 }}>
                {metrics.refactoringMetrics.techDebtAttitude === 'proactive' &&
                  '定期的にリファクタリングを行い、技術的負債を返済しています。'}
                {metrics.refactoringMetrics.techDebtAttitude === 'reactive' &&
                  '必要に応じてリファクタリングしていますが、もう少し積極的に行うと良いでしょう。'}
                {metrics.refactoringMetrics.techDebtAttitude === 'neglecting' &&
                  'リファクタリングが少なく、技術的負債が蓄積している可能性があります。'}
              </Alert>
            </Box>
          </Grid>
        </Grid>
      </Paper>

      {/* 6. 週次トレンド */}
      {metrics.refactoringMetrics.weeklyTrend.length > 1 && (
        <Paper sx={{ p: 2, mb: 3 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>週次トレンド - 品質への投資は続いているか？</Typography>
          <Line
            data={{
              labels: metrics.refactoringMetrics.weeklyTrend.map(w => w.weekLabel),
              datasets: [
                {
                  label: 'リファクタリング率 (%)',
                  data: metrics.refactoringMetrics.weeklyTrend.map(w => w.refactoringRate * 100),
                  borderColor: PrimitiveToken.colors.gray[80],
                  backgroundColor: hexToRgba(PrimitiveToken.colors.gray[80], 0.2),
                  fill: true,
                  tension: 0.3,
                },
              ],
            }}
            options={{
              responsive: true,
              plugins: {
                title: { display: true, text: 'リファクタリングPRの推移' },
                legend: { position: 'top' as const },
              },
              scales: {
                y: {
                  beginAtZero: true,
                  max: 50,
                  title: { display: true, text: '割合 (%)' },
                },
              },
            }}
          />
          <Alert severity="info" sx={{ mt: 2 }}>
            <strong>見方:</strong> リファクタリング率が10-20%程度で安定していれば、
            技術的負債と機能開発のバランスが取れています。0%が続くと負債が蓄積します。
          </Alert>
        </Paper>
      )}

      {/* 7. 診断結果と改善アクション */}
      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>診断結果と改善アクション</Typography>

        {metrics.orientation === 'long-term' && (
          <Alert severity="success" sx={{ mb: 2 }}>
            <strong>良好:</strong> テストを書き、リファクタリングにも時間を投資している、
            長期保守を見据えた健全な開発姿勢です。この状態を維持してください。
          </Alert>
        )}

        {metrics.orientation === 'short-term' && (
          <>
            <Alert severity="error" sx={{ mb: 2 }}>
              <strong>問題:</strong> 短期的な機能開発を優先し、テストやリファクタリングへの投資が少ない状態です。
              このままでは技術的負債が蓄積し、将来的に開発速度が低下するリスクがあります。
            </Alert>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>改善アクション:</Typography>
            <Box component="ul" sx={{ pl: 2 }}>
              <li>新機能にはテストを必須にする（レビューでチェック）</li>
              <li>週に1つはリファクタリングPRを出すルールを作る</li>
              <li>CI失敗時は即座に対応する文化を作る</li>
              <li>技術的負債の棚卸しを定期的に行う</li>
            </Box>
          </>
        )}

        {metrics.orientation === 'balanced' && (
          <>
            <Alert severity="warning" sx={{ mb: 2 }}>
              <strong>改善余地あり:</strong> テストとリファクタリングのバランスは取れていますが、
              さらなる改善で長期的な保守性を高められます。
            </Alert>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>改善のヒント:</Typography>
            <Box component="ul" sx={{ pl: 2 }}>
              <li>テストカバレッジの目標を設定する</li>
              <li>リファクタリングのタイミングをスプリントに組み込む</li>
              <li>CI成功率90%以上を目指す</li>
            </Box>
          </>
        )}

        <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>なぜ長期保守重視が重要か？</Typography>
          <Grid container spacing={2}>
            <Grid xs={12} md={4}>
              <Typography variant="body2">
                <strong>開発速度の維持:</strong> 技術的負債が少ないと、新機能の追加が容易
              </Typography>
            </Grid>
            <Grid xs={12} md={4}>
              <Typography variant="body2">
                <strong>バグの減少:</strong> テストがあると、リグレッションを防げる
              </Typography>
            </Grid>
            <Grid xs={12} md={4}>
              <Typography variant="body2">
                <strong>チームの持続性:</strong> メンバー交代があっても品質を維持できる
              </Typography>
            </Grid>
          </Grid>
        </Box>
      </Paper>
    </Box>
  );
};