import React from "react";
import {
  Box,
  Card,
  CardContent,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Chip,
  LinearProgress
} from "@mui/material";
import Grid from '@mui/material/Unstable_Grid2';
import {Bar, Line} from "react-chartjs-2";
import {Chart, registerables} from 'chart.js';
import {ReadTimes} from "../../domain/models/read_time/read.times";
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import TrendingFlatIcon from '@mui/icons-material/TrendingFlat';
import { PrimitiveToken, hexToRgba } from "../ui/tokens/primitive-token";

Chart.register(...registerables);

interface LeadTimeAnalysisProps {
  readTimes: ReadTimes;
}

export const LeadTimeAnalysis: React.FC<LeadTimeAnalysisProps> = ({readTimes}) => {
  const totalPRs = readTimes?.values?.length || 0;

  // データがない場合の早期リターン
  if (totalPRs === 0) {
    return (
      <Box>
        <Typography color="text.secondary">
          分析対象のPRデータがありません
        </Typography>
      </Box>
    );
  }

  const distribution = readTimes.distribution();
  const categoryCount = readTimes.countByCategory();
  const authorStats = readTimes.statsByAuthor();
  const weeklyTrend = readTimes.weeklyTrend();
  const trendAnalysis = readTimes.getTrendAnalysis();

  // 分布ヒストグラム
  const distributionData = {
    labels: distribution.map(d => d.range),
    datasets: [{
      label: 'PR数',
      data: distribution.map(d => d.count),
      backgroundColor: distribution.map(d => d.color),
      borderWidth: 1
    }]
  };

  const distributionOptions = {
    responsive: true,
    plugins: {
      legend: { display: false },
      title: { display: true, text: 'リードタイム分布' }
    },
    scales: {
      y: { beginAtZero: true, title: { display: true, text: 'PR数' } }
    }
  };

  // 週別トレンド
  const weeklyData = {
    labels: weeklyTrend.map(w => w.week),
    datasets: [
      {
        label: '中央値（時間）',
        data: weeklyTrend.map(w => w.medianHours),
        borderColor: PrimitiveToken.colors.blue[60],
        backgroundColor: hexToRgba(PrimitiveToken.colors.blue[60], 0.2),
        fill: true,
        tension: 0.3
      },
      {
        label: '平均値（時間）',
        data: weeklyTrend.map(w => w.avgHours),
        borderColor: PrimitiveToken.colors.yellow[50],
        backgroundColor: hexToRgba(PrimitiveToken.colors.yellow[50], 0.1),
        fill: false,
        tension: 0.3,
        borderDash: [5, 5]
      }
    ]
  };

  const weeklyOptions = {
    responsive: true,
    plugins: {
      legend: { position: 'top' as const },
      title: { display: true, text: '週別リードタイム推移' }
    },
    scales: {
      y: { beginAtZero: true, title: { display: true, text: '時間' } },
      x: { ticks: { maxRotation: 45 } }
    }
  };

  // カテゴリ色
  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'Fast': return 'success';
      case 'Normal': return 'info';
      case 'Slow': return 'warning';
      case 'Very Slow': return 'error';
      default: return 'default';
    }
  };

  // 時間を読みやすい形式に変換
  const formatHours = (hours: number): string => {
    if (hours < 1) return `${Math.round(hours * 60)}分`;
    if (hours < 24) return `${hours.toFixed(1)}時間`;
    const days = hours / 24;
    return `${days.toFixed(1)}日`;
  };

  // トレンドアイコン
  const TrendIcon = () => {
    if (trendAnalysis.message === '横ばい' || trendAnalysis.message === 'データ不足') {
      return <TrendingFlatIcon color="action" />;
    }
    return trendAnalysis.improving
      ? <TrendingDownIcon color="success" />
      : <TrendingUpIcon color="error" />;
  };

  return (
    <Box>
      {/* サマリーカード */}
      <Grid container spacing={2}>
        <Grid xs={2}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                PR数
              </Typography>
              <Typography variant="h4">
                {totalPRs}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid xs={2}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                中央値
              </Typography>
              <Typography variant="h4">
                {formatHours(readTimes.median())}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid xs={2}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                平均値
              </Typography>
              <Typography variant="h4">
                {formatHours(readTimes.avg())}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid xs={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                パーセンタイル
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                <Chip label={`P50: ${formatHours(readTimes.p50)}`} size="small" color="success" />
                <Chip label={`P75: ${formatHours(readTimes.p75)}`} size="small" color="warning" />
                <Chip label={`P90: ${formatHours(readTimes.p90)}`} size="small" color="error" />
              </Box>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                90%のPRは {formatHours(readTimes.p90)} 以内
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid xs={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                トレンド（直近4週 vs 前4週）
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <TrendIcon />
                <Typography
                  variant="h5"
                  color={
                    trendAnalysis.message === '横ばい' || trendAnalysis.message === 'データ不足'
                      ? 'text.secondary'
                      : trendAnalysis.improving ? 'success.main' : 'error.main'
                  }
                >
                  {trendAnalysis.message}
                </Typography>
              </Box>
              <Typography variant="caption" color="text.secondary">
                ※下がっている方が良い
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* カテゴリ別内訳 */}
      <Paper sx={{ mt: 2, p: 2 }}>
        <Typography variant="subtitle1" gutterBottom>
          カテゴリ別内訳
        </Typography>
        <Grid container spacing={2}>
          {Object.entries(categoryCount).map(([category, count]) => {
            const percent = totalPRs > 0 ? (count / totalPRs) * 100 : 0;
            return (
              <Grid xs={3} key={category}>
                <Box sx={{ textAlign: 'center' }}>
                  <Chip
                    label={category}
                    color={getCategoryColor(category) as any}
                    sx={{ mb: 1 }}
                  />
                  <Typography variant="h6">{count}件 ({percent.toFixed(0)}%)</Typography>
                  <LinearProgress
                    variant="determinate"
                    value={percent}
                    color={getCategoryColor(category) as any}
                    sx={{ height: 8, borderRadius: 1 }}
                  />
                  <Typography variant="caption" color="text.secondary">
                    {category === 'Fast' && '< 4時間'}
                    {category === 'Normal' && '4-24時間'}
                    {category === 'Slow' && '1-3日'}
                    {category === 'Very Slow' && '3日以上'}
                  </Typography>
                </Box>
              </Grid>
            );
          })}
        </Grid>
      </Paper>

      {/* グラフ */}
      <Grid container spacing={2} sx={{ mt: 1 }}>
        <Grid xs={5}>
          <Paper sx={{ p: 2 }}>
            <Bar data={distributionData} options={distributionOptions} />
          </Paper>
        </Grid>
        <Grid xs={7}>
          <Paper sx={{ p: 2 }}>
            {weeklyTrend.length > 0 ? (
              <Line data={weeklyData} options={weeklyOptions} />
            ) : (
              <Typography color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                週別トレンドデータがありません
              </Typography>
            )}
          </Paper>
        </Grid>
      </Grid>

      {/* 担当者別統計 */}
      {authorStats.length > 0 && (
        <Paper sx={{ mt: 2, p: 2 }}>
          <Typography variant="subtitle1" gutterBottom>
            担当者別リードタイム（中央値順）
          </Typography>
          <TableContainer sx={{ maxHeight: 300 }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell>担当者</TableCell>
                  <TableCell align="right">PR数</TableCell>
                  <TableCell align="right">中央値</TableCell>
                  <TableCell align="right">平均値</TableCell>
                  <TableCell align="right">最短</TableCell>
                  <TableCell align="right">最長</TableCell>
                  <TableCell>評価</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {authorStats.map((stat) => (
                  <TableRow key={stat.author}>
                    <TableCell>{stat.author}</TableCell>
                    <TableCell align="right">{stat.count}</TableCell>
                    <TableCell align="right">{formatHours(stat.medianHours)}</TableCell>
                    <TableCell align="right">{formatHours(stat.avgHours)}</TableCell>
                    <TableCell align="right" sx={{ color: 'success.main' }}>
                      {formatHours(stat.minHours)}
                    </TableCell>
                    <TableCell align="right" sx={{ color: 'error.main' }}>
                      {formatHours(stat.maxHours)}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={readTimes.getCategory(stat.medianHours)}
                        color={getCategoryColor(readTimes.getCategory(stat.medianHours)) as any}
                        size="small"
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}
    </Box>
  );
};
