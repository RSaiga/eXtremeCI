import React from 'react'
import { Contributors } from '../../domain/models/contributor/contributors'
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
  LinearProgress,
} from '@mui/material'
import Grid from '@mui/material/Unstable_Grid2'
import { Bar, Doughnut } from 'react-chartjs-2'
import { Chart, registerables } from 'chart.js'
import { PrimitiveToken, hexToRgba } from '../ui/tokens/primitive-token'

Chart.register(...registerables)

interface ContributorStatsProps {
  contributors: Contributors
}

export const ContributorStatsGraph: React.FC<ContributorStatsProps> = ({ contributors }) => {
  const shares = contributors.contributionShares
  const top5 = shares.slice(0, 5)
  const totalCommits = contributors.totalCommits
  const totalChanges = contributors.totalChanges

  // コミット数の円グラフ
  const pieColors = [
    hexToRgba(PrimitiveToken.colors.blue[60], 0.8), // 青
    hexToRgba(PrimitiveToken.colors.green[50], 0.8), // 緑
    hexToRgba(PrimitiveToken.colors.yellow[50], 0.8), // 黄
    hexToRgba(PrimitiveToken.colors.red[60], 0.8), // 赤
    hexToRgba(PrimitiveToken.colors.gray[70], 0.8), // グレー
    hexToRgba(PrimitiveToken.colors.purple[50], 0.8), // 紫
  ]

  const othersCommits = totalCommits - top5.reduce((sum, s) => sum + s.commitCount, 0)
  const commitPieData = {
    labels: [...top5.map((s) => s.author), othersCommits > 0 ? 'その他' : null].filter(Boolean),
    datasets: [
      {
        data: [...top5.map((s) => s.commitCount), othersCommits > 0 ? othersCommits : null].filter((v) => v !== null),
        backgroundColor: pieColors,
        borderWidth: 1,
      },
    ],
  }

  const othersChanges = totalChanges - top5.reduce((sum, s) => sum + s.totalChanges, 0)
  const codePieData = {
    labels: [...top5.map((s) => s.author), othersChanges > 0 ? 'その他' : null].filter(Boolean),
    datasets: [
      {
        data: [...top5.map((s) => s.totalChanges), othersChanges > 0 ? othersChanges : null].filter((v) => v !== null),
        backgroundColor: pieColors,
        borderWidth: 1,
      },
    ],
  }

  const pieOptions = (title: string) => ({
    responsive: true,
    plugins: {
      legend: {
        position: 'right' as const,
        labels: { font: { size: 11 } },
      },
      title: {
        display: true,
        text: title,
      },
    },
  })

  // 棒グラフ（コミット数 vs コード量）
  const barData = {
    labels: top5.map((s) => s.author),
    datasets: [
      {
        label: 'コミット数',
        data: top5.map((s) => s.commitCount),
        backgroundColor: hexToRgba(PrimitiveToken.colors.blue[60], 0.7),
        borderColor: PrimitiveToken.colors.blue[60],
        borderWidth: 1,
        yAxisID: 'y',
      },
      {
        label: 'コード量（行）',
        data: top5.map((s) => s.totalChanges),
        backgroundColor: hexToRgba(PrimitiveToken.colors.green[50], 0.7),
        borderColor: PrimitiveToken.colors.green[50],
        borderWidth: 1,
        yAxisID: 'y1',
      },
    ],
  }

  const barOptions = {
    responsive: true,
    plugins: {
      legend: { position: 'top' as const },
      title: {
        display: true,
        text: 'コントリビューター別活動量（過去90日）',
      },
    },
    scales: {
      y: {
        type: 'linear' as const,
        position: 'left' as const,
        title: { display: true, text: 'コミット数' },
      },
      y1: {
        type: 'linear' as const,
        position: 'right' as const,
        title: { display: true, text: 'コード量（行）' },
        grid: { drawOnChartArea: false },
      },
    },
  }

  const top3CommitShare = contributors.top3CommitShare
  const top3CodeShare = contributors.top3CodeShare
  const memberCount = contributors.contributorCount
  const idealShare = memberCount > 0 ? (3 / memberCount) * 100 : 0

  // 上位3人の詳細（コミット数順）
  const top3ByCommits = contributors.topByCommits(3).map((c) => ({
    name: c.author,
    count: c.commitCount,
    share: totalCommits > 0 ? (c.commitCount / totalCommits) * 100 : 0,
  }))

  // 上位3人の詳細（コード量順）
  const top3ByCode = contributors.topByCodeChanges(3).map((c) => ({
    name: c.author,
    count: c.totalChanges,
    share: totalChanges > 0 ? (c.totalChanges / totalChanges) * 100 : 0,
  }))

  // 日別コミット推移グラフ（時系列）
  const dailyCommits = contributors.dailyCommits
  const allAuthors = [...new Set(dailyCommits.flatMap((d) => Object.keys(d.authorCounts)))]
  const timeSeriesData = {
    labels: dailyCommits.map((d) => d.date),
    datasets: allAuthors.slice(0, 8).map((author, index) => ({
      label: author,
      data: dailyCommits.map((d) => d.authorCounts[author] || 0),
      backgroundColor: pieColors[index % pieColors.length],
      borderWidth: 0,
    })),
  }

  const timeSeriesOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: { font: { size: 10 } },
      },
      title: {
        display: true,
        text: '日別コミット推移（過去90日）',
      },
    },
    scales: {
      x: {
        stacked: true,
        ticks: { font: { size: 9 }, maxRotation: 45 },
      },
      y: {
        stacked: true,
        title: { display: true, text: 'コミット数' },
      },
    },
  }

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        コントリビューター統計（コミット単位）
      </Typography>

      <Grid container spacing={2}>
        <Grid xs={2}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                コントリビューター数
              </Typography>
              <Typography variant="h4">{memberCount}人</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid xs={2}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                総コミット数
              </Typography>
              <Typography variant="h4">{totalCommits}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid xs={2}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                総コード量
              </Typography>
              <Typography variant="h4">{totalChanges.toLocaleString()}</Typography>
              <Typography variant="body2" color="text.secondary">
                +{contributors.totalAdditions.toLocaleString()} / -{contributors.totalDeletions.toLocaleString()}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid xs={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                コミット数上位3人の合計シェア
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography
                  variant="h4"
                  color={top3CommitShare > 80 ? 'error' : top3CommitShare > 60 ? 'warning.main' : 'success.main'}
                >
                  {top3CommitShare.toFixed(0)}%
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  （均等なら{idealShare.toFixed(0)}%）
                </Typography>
              </Box>
              <LinearProgress
                variant="determinate"
                value={Math.min(top3CommitShare, 100)}
                color={top3CommitShare > 80 ? 'error' : top3CommitShare > 60 ? 'warning' : 'success'}
                sx={{ mt: 1, height: 8, borderRadius: 1 }}
              />
              <Box sx={{ mt: 1 }}>
                {top3ByCommits.map((c, i) => (
                  <Typography key={c.name} variant="body2" color="text.secondary">
                    {i + 1}. {c.name}: {c.count}回 ({c.share.toFixed(0)}%)
                  </Typography>
                ))}
              </Box>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                ※高すぎると特定の人に作業が集中している状態
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid xs={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                コード量上位3人の合計シェア
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography
                  variant="h4"
                  color={top3CodeShare > 80 ? 'error' : top3CodeShare > 60 ? 'warning.main' : 'success.main'}
                >
                  {top3CodeShare.toFixed(0)}%
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  （均等なら{idealShare.toFixed(0)}%）
                </Typography>
              </Box>
              <LinearProgress
                variant="determinate"
                value={Math.min(top3CodeShare, 100)}
                color={top3CodeShare > 80 ? 'error' : top3CodeShare > 60 ? 'warning' : 'success'}
                sx={{ mt: 1, height: 8, borderRadius: 1 }}
              />
              <Box sx={{ mt: 1 }}>
                {top3ByCode.map((c, i) => (
                  <Typography key={c.name} variant="body2" color="text.secondary">
                    {i + 1}. {c.name}: {c.count.toLocaleString()}行 ({c.share.toFixed(0)}%)
                  </Typography>
                ))}
              </Box>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                ※高すぎると知識が属人化するリスクあり
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={2} sx={{ mt: 1 }}>
        <Grid xs={4}>
          <Paper sx={{ p: 2 }}>
            <Doughnut data={commitPieData} options={pieOptions('コミット数の分布')} />
          </Paper>
        </Grid>
        <Grid xs={4}>
          <Paper sx={{ p: 2 }}>
            <Doughnut data={codePieData} options={pieOptions('コード量の分布')} />
          </Paper>
        </Grid>
        <Grid xs={4}>
          <Paper sx={{ p: 2 }}>
            <Bar data={barData} options={barOptions} />
          </Paper>
        </Grid>
      </Grid>

      {/* 日別コミット推移グラフ */}
      {dailyCommits.length > 0 && (
        <Paper sx={{ mt: 2, p: 2 }}>
          <Bar data={timeSeriesData} options={timeSeriesOptions} />
        </Paper>
      )}

      {shares.length > 0 && (
        <Paper sx={{ mt: 2, p: 2 }}>
          <Typography variant="subtitle1" gutterBottom>
            詳細統計
          </Typography>
          <TableContainer sx={{ maxHeight: 300 }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell>コントリビューター</TableCell>
                  <TableCell align="right">コミット数</TableCell>
                  <TableCell align="right">シェア</TableCell>
                  <TableCell align="right">追加行</TableCell>
                  <TableCell align="right">削除行</TableCell>
                  <TableCell align="right">総変更量</TableCell>
                  <TableCell align="right">シェア</TableCell>
                  <TableCell align="right">平均変更/コミット</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {contributors.values.map((c) => (
                  <TableRow key={c.author}>
                    <TableCell>{c.author}</TableCell>
                    <TableCell align="right">{c.commitCount}</TableCell>
                    <TableCell align="right">
                      {totalCommits > 0 ? ((c.commitCount / totalCommits) * 100).toFixed(1) : 0}%
                    </TableCell>
                    <TableCell align="right" sx={{ color: 'success.main' }}>
                      +{c.additions.toLocaleString()}
                    </TableCell>
                    <TableCell align="right" sx={{ color: 'error' }}>
                      -{c.deletions.toLocaleString()}
                    </TableCell>
                    <TableCell align="right">{c.totalChanges.toLocaleString()}</TableCell>
                    <TableCell align="right">
                      {totalChanges > 0 ? ((c.totalChanges / totalChanges) * 100).toFixed(1) : 0}%
                    </TableCell>
                    <TableCell align="right">{c.avgChangesPerCommit.toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}
    </Box>
  )
}
