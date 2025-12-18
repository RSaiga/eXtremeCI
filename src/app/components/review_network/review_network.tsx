import React from "react";
import {ReviewNetwork} from "../../domain/models/review_network/review_network";
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
  Tooltip,
  LinearProgress
} from "@mui/material";
import Grid from '@mui/material/Unstable_Grid2';
import {Bar, Doughnut} from "react-chartjs-2";
import {Chart, registerables} from 'chart.js';

Chart.register(...registerables);

interface ReviewNetworkGraphProps {
  reviewNetwork: ReviewNetwork;
}

const getHeatmapColor = (value: number, max: number): string => {
  if (value === 0) return 'transparent';
  const intensity = Math.min(value / max, 1);
  // 青から赤へのグラデーション
  const r = Math.round(66 + (239 - 66) * intensity);
  const g = Math.round(133 + (83 - 133) * intensity);
  const b = Math.round(244 + (80 - 244) * intensity);
  return `rgba(${r}, ${g}, ${b}, ${0.3 + intensity * 0.7})`;
};

export const ReviewNetworkGraph: React.FC<ReviewNetworkGraphProps> = ({reviewNetwork}) => {
  const matrix = reviewNetwork.matrix;
  const stats = reviewNetwork.reviewerStats;
  const maxCount = Math.max(...reviewNetwork.edges.map(e => e.weight), 1);

  // レビュアー別のバーチャート
  const barData = {
    labels: stats.slice(0, 10).map(s => s.name),
    datasets: [
      {
        label: 'レビュー回数',
        data: stats.slice(0, 10).map(s => s.reviewCount),
        backgroundColor: 'rgba(66, 133, 244, 0.7)',
        borderColor: 'rgba(66, 133, 244, 1)',
        borderWidth: 1
      },
      {
        label: 'PR作成数',
        data: stats.slice(0, 10).map(s => s.authorCount),
        backgroundColor: 'rgba(251, 188, 4, 0.7)',
        borderColor: 'rgba(251, 188, 4, 1)',
        borderWidth: 1
      }
    ]
  };

  const barOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const
      },
      title: {
        display: true,
        text: 'メンバー別レビュー活動（過去90日）'
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: '回数'
        }
      }
    }
  };

  // レビュー負荷の計算
  const totalReviews = stats.reduce((sum, s) => sum + s.reviewCount, 0);
  const memberCount = stats.filter(s => s.reviewCount > 0).length;
  const idealShare = memberCount > 0 ? 100 / memberCount : 0;

  // 上位レビュアーの負荷割合
  const topReviewers = stats.slice(0, 5).map(s => ({
    name: s.name,
    count: s.reviewCount,
    share: totalReviews > 0 ? (s.reviewCount / totalReviews) * 100 : 0
  }));

  // トップレビュアーが全体の何%を担当しているか
  const topReviewerShare = topReviewers[0]?.share || 0;
  const top3Share = topReviewers.slice(0, 3).reduce((sum, r) => sum + r.share, 0);

  // 負荷分散の円グラフデータ
  const pieColors = [
    'rgba(239, 83, 80, 0.8)',   // 赤
    'rgba(255, 167, 38, 0.8)',  // オレンジ
    'rgba(255, 238, 88, 0.8)',  // 黄
    'rgba(102, 187, 106, 0.8)', // 緑
    'rgba(66, 165, 245, 0.8)',  // 青
    'rgba(171, 71, 188, 0.8)',  // 紫
  ];

  const othersCount = totalReviews - topReviewers.reduce((sum, r) => sum + r.count, 0);
  const pieData = {
    labels: [...topReviewers.map(r => r.name), othersCount > 0 ? 'その他' : null].filter(Boolean),
    datasets: [{
      data: [...topReviewers.map(r => r.count), othersCount > 0 ? othersCount : null].filter(v => v !== null),
      backgroundColor: pieColors,
      borderWidth: 1
    }]
  };

  const pieOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'right' as const,
        labels: {
          font: { size: 11 }
        }
      },
      title: {
        display: true,
        text: 'レビュー負荷の分布'
      },
      tooltip: {
        callbacks: {
          label: (context: any) => {
            const value = context.raw;
            const percentage = totalReviews > 0 ? ((value / totalReviews) * 100).toFixed(1) : 0;
            return `${context.label}: ${value}回 (${percentage}%)`;
          }
        }
      }
    }
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        レビューネットワーク
      </Typography>

      <Grid container spacing={2}>
        <Grid xs={2}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                参加メンバー
              </Typography>
              <Typography variant="h4">
                {reviewNetwork.nodes.length}人
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid xs={2}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                トップレビュアー
              </Typography>
              <Typography variant="h5" sx={{fontSize: '1.2rem'}}>
                {reviewNetwork.topReviewer || '-'}
              </Typography>
              <Typography variant="body2" color={topReviewerShare > 40 ? 'error' : 'text.secondary'}>
                全体の{topReviewerShare.toFixed(0)}%を担当
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid xs={2}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                最多PR作成者
              </Typography>
              <Typography variant="h5" sx={{fontSize: '1.2rem'}}>
                {reviewNetwork.topAuthor || '-'}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid xs={2}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                合計レビュー数
              </Typography>
              <Typography variant="h4">
                {totalReviews}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid xs={4}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                上位3人の負荷集中度
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="h4" color={top3Share > 70 ? 'error' : top3Share > 50 ? 'warning.main' : 'success.main'}>
                  {top3Share.toFixed(0)}%
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  （理想: {(idealShare * 3).toFixed(0)}%以下）
                </Typography>
              </Box>
              <LinearProgress
                variant="determinate"
                value={Math.min(top3Share, 100)}
                color={top3Share > 70 ? 'error' : top3Share > 50 ? 'warning' : 'success'}
                sx={{ mt: 1, height: 8, borderRadius: 1 }}
              />
              <Box sx={{ mt: 1 }}>
                {topReviewers.slice(0, 3).map((r, i) => (
                  <Typography key={r.name} variant="body2" color="text.secondary">
                    {i + 1}. {r.name}: {r.count}回 ({r.share.toFixed(0)}%)
                  </Typography>
                ))}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={2} sx={{mt: 1}}>
        <Grid xs={4}>
          <Paper sx={{p: 2, height: '100%'}}>
            <Doughnut data={pieData} options={pieOptions} />
            <Box sx={{mt: 2}}>
              <Typography variant="body2" color="text.secondary">
                均等分散の場合、各メンバーは約{idealShare.toFixed(0)}%ずつ担当
              </Typography>
              {topReviewerShare > 40 && (
                <Typography variant="body2" color="error" sx={{mt: 1}}>
                  ⚠️ {topReviewers[0]?.name}に負荷が集中しています
                </Typography>
              )}
            </Box>
          </Paper>
        </Grid>
        <Grid xs={4}>
          <Paper sx={{p: 2}}>
            <Bar data={barData} options={barOptions} />
          </Paper>
        </Grid>
        <Grid xs={4}>
          <Paper sx={{p: 2}}>
            <Typography variant="subtitle1" gutterBottom>
              レビューマトリックス（Author → Reviewer）
            </Typography>
            {matrix.authors.length > 0 ? (
              <TableContainer sx={{maxHeight: 300}}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{fontWeight: 'bold', backgroundColor: '#f5f5f5'}}>
                        Author ↓
                      </TableCell>
                      {matrix.reviewers.map(reviewer => (
                        <TableCell
                          key={reviewer}
                          align="center"
                          sx={{
                            fontWeight: 'bold',
                            backgroundColor: '#f5f5f5',
                            fontSize: '0.75rem',
                            padding: '4px'
                          }}
                        >
                          {reviewer.slice(0, 8)}
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {matrix.authors.map((author, i) => (
                      <TableRow key={author}>
                        <TableCell
                          sx={{
                            fontWeight: 'bold',
                            fontSize: '0.75rem',
                            padding: '4px'
                          }}
                        >
                          {author.slice(0, 10)}
                        </TableCell>
                        {matrix.data[i].map((count, j) => (
                          <Tooltip
                            key={`${author}-${matrix.reviewers[j]}`}
                            title={count > 0 ? `${author} → ${matrix.reviewers[j]}: ${count}回` : ''}
                          >
                            <TableCell
                              align="center"
                              sx={{
                                backgroundColor: getHeatmapColor(count, maxCount),
                                padding: '4px',
                                fontSize: '0.75rem',
                                cursor: count > 0 ? 'pointer' : 'default'
                              }}
                            >
                              {count > 0 ? count : ''}
                            </TableCell>
                          </Tooltip>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            ) : (
              <Typography color="text.secondary" sx={{textAlign: 'center', py: 4}}>
                レビューデータがありません
              </Typography>
            )}
          </Paper>
        </Grid>
      </Grid>

      {stats.length > 0 && (
        <Paper sx={{mt: 2, p: 2}}>
          <Typography variant="subtitle1" gutterBottom>
            メンバー詳細統計
          </Typography>
          <TableContainer sx={{maxHeight: 250}}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell>メンバー</TableCell>
                  <TableCell align="right">レビュー回数</TableCell>
                  <TableCell align="right">PR作成数</TableCell>
                  <TableCell align="right">貢献度</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {stats.map((s) => (
                  <TableRow key={s.name}>
                    <TableCell>{s.name}</TableCell>
                    <TableCell align="right">{s.reviewCount}</TableCell>
                    <TableCell align="right">{s.authorCount}</TableCell>
                    <TableCell
                      align="right"
                      sx={{
                        color: s.ratio >= 1 ? 'success.main' : s.ratio >= 0.5 ? 'warning.main' : 'error'
                      }}
                    >
                      {s.ratio.toFixed(2)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          <Typography variant="caption" color="text.secondary" sx={{mt: 1, display: 'block'}}>
            貢献度 = レビュー回数 / PR作成数（1.0以上が望ましい）
          </Typography>
        </Paper>
      )}
    </Box>
  );
};
