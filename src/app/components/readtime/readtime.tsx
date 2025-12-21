import React, {useEffect, useState} from "react";
import {Link} from "react-router-dom";
import Loading from "../loading/loading";
import {Release} from "../release/release";
import Grid from '@mui/material/Unstable_Grid2';
import {Graph} from "../graph/graph";
import Box from "@mui/material/Box";
import {Button, Typography, Divider, Alert, Card, CardContent, Chip, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, LinearProgress} from "@mui/material";
import {Bar} from "react-chartjs-2";
import {Chart, registerables} from 'chart.js';
import {route} from "../../routes/routes";

Chart.register(...registerables);
import {ReadTimes} from "../../domain/models/read_time/read.times";
import {Median} from "../median/median";
import {PrSizes} from "../../domain/models/pr_size/pr_sizes";
import {PrSizeGraph} from "../pr_size/pr_size";
import {ReviewTimes} from "../../domain/models/review_time/review_times";
import {ReviewTimeGraph} from "../review_time/review_time";
import {OpenPrs} from "../../domain/models/open_pr/open_prs";
import {OpenPrList} from "../open_pr/open_pr";
import {DashboardService} from "../../domain/services/dashboard";
import {ReviewNetwork} from "../../domain/models/review_network/review_network";
import {ReviewNetworkGraph} from "../review_network/review_network";
import {Contributors} from "../../domain/models/contributor/contributors";
import {ContributorStatsGraph} from "../contributor/contributor_stats";

export const Readtime = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [read_time, setReadTime] = useState(new ReadTimes([]));
  const [prSizes, setPrSizes] = useState(new PrSizes([]));
  const [reviewTimes, setReviewTimes] = useState(new ReviewTimes([]));
  const [openPrs, setOpenPrs] = useState(new OpenPrs([]));
  const [reviewNetwork, setReviewNetwork] = useState(new ReviewNetwork([]));
  const [contributors, setContributors] = useState(new Contributors([]));

  useEffect(() => {
    const fetchDashboardData = async () => {
      setIsLoading(true);
      try {
        const data = await DashboardService.fetchAll();
        setReadTime(data.readTimes);
        setPrSizes(data.prSizes);
        setReviewTimes(data.reviewTimes);
        setOpenPrs(data.openPrs);
        setReviewNetwork(data.reviewNetwork);
        setContributors(data.contributors);
      } catch (e) {
        console.error('Failed to fetch dashboard data:', e);
      }
      setIsLoading(false);
    };
    fetchDashboardData();
  }, []);

  const handlePrint = () => {
    window.print();
  };

  const today = new Date().toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const repoName = import.meta.env.VITE_GITHUB_REPO || 'Unknown Repository';

  return (
    <>
      {
        isLoading ? <Loading/> :
          <Box height={100}>
            {/* レポートヘッダー */}
            <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box>
                <Typography variant="h4" component="h1">
                  開発メトリクスレポート
                </Typography>
                <Typography variant="subtitle1" color="text.secondary">
                  {repoName} - {today}（過去90日間）
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  component={Link}
                  to={route.commitQuality}
                  variant="outlined"
                  className="no-print"
                >
                  コミット品質分析
                </Button>
                <Button
                  component={Link}
                  to={route.qualitySustainability}
                  variant="outlined"
                  className="no-print"
                >
                  品質と持続性
                </Button>
                <Button
                  variant="contained"
                  onClick={handlePrint}
                  className="no-print"
                >
                  PDF出力 / 印刷
                </Button>
              </Box>
            </Box>

            {/* 1. リードタイム */}
            <div className="print-section">
              <Typography variant="h5" sx={{ mb: 1 }}>1. リードタイム</Typography>
              <Alert severity="info" sx={{ mb: 2 }}>
                <strong>測定内容:</strong> 最初のコミットからPRマージまでの時間。
                <strong>注意:</strong> 長い（数日以上）とフィードバックが遅れ、ばらつきが大きいと見積もり精度が低下します。
                <strong>理想:</strong> Fast/Normalカテゴリが多いほど良好。
              </Alert>

              {/* サマリーカード */}
              <Grid container spacing={2}>
                <Grid xs={2}>
                  <Card>
                    <CardContent>
                      <Typography color="text.secondary" gutterBottom>PR数</Typography>
                      <Typography variant="h4">{read_time.values.length}</Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid xs={2}>
                  <Card>
                    <CardContent>
                      <Typography color="text.secondary" gutterBottom>中央値</Typography>
                      <Typography variant="h4">{read_time.median() < 24 ? `${read_time.median().toFixed(1)}h` : `${(read_time.median() / 24).toFixed(1)}日`}</Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid xs={2}>
                  <Card>
                    <CardContent>
                      <Typography color="text.secondary" gutterBottom>平均値</Typography>
                      <Typography variant="h4">{read_time.avg() < 24 ? `${read_time.avg().toFixed(1)}h` : `${(read_time.avg() / 24).toFixed(1)}日`}</Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid xs={3}>
                  <Card>
                    <CardContent>
                      <Typography color="text.secondary" gutterBottom>パーセンタイル</Typography>
                      <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mb: 1 }}>
                        <Chip label={`P50: ${read_time.p50.toFixed(1)}h`} size="small" color="success" />
                        <Chip label={`P75: ${read_time.p75.toFixed(1)}h`} size="small" color="warning" />
                        <Chip label={`P90: ${read_time.p90.toFixed(1)}h`} size="small" color="error" />
                      </Box>
                      <Typography variant="caption" color="text.secondary" component="div">
                        P50: 半数がこの時間以内<br/>
                        P75: 75%がこの時間以内<br/>
                        P90: 90%がこの時間以内
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid xs={3}>
                  <Card>
                    <CardContent>
                      <Typography color="text.secondary" gutterBottom>カテゴリ内訳</Typography>
                      {(() => {
                        const cat = read_time.countByCategory();
                        return (
                          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mb: 1 }}>
                            <Chip label={`Fast: ${cat.Fast}`} size="small" color="success" />
                            <Chip label={`Normal: ${cat.Normal}`} size="small" color="info" />
                            <Chip label={`Slow: ${cat.Slow}`} size="small" color="warning" />
                            <Chip label={`V.Slow: ${cat['Very Slow']}`} size="small" color="error" />
                          </Box>
                        );
                      })()}
                      <Typography variant="caption" color="text.secondary" component="div">
                        Fast: &lt;4h / Normal: 4-24h<br/>
                        Slow: 1-3日 / V.Slow: 3日+
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>

              {/* グラフ */}
              <Grid container spacing={2} sx={{ mt: 1 }}>
                <Grid xs={5}>
                  <Paper sx={{ p: 2 }}>
                    <Bar
                      data={{
                        labels: read_time.distribution().map(d => d.range),
                        datasets: [{
                          label: 'PR数',
                          data: read_time.distribution().map(d => d.count),
                          backgroundColor: read_time.distribution().map(d => d.color)
                        }]
                      }}
                      options={{
                        responsive: true,
                        plugins: { legend: { display: false }, title: { display: true, text: 'リードタイム分布' } },
                        scales: { y: { beginAtZero: true, title: { display: true, text: 'PR数' } } }
                      }}
                    />
                  </Paper>
                </Grid>
                <Grid xs={7}>
                  <Paper sx={{ p: 2 }}>
                    <Graph readTimes={read_time.values}/>
                  </Paper>
                </Grid>
              </Grid>

              {/* 担当者別統計 */}
              {read_time.statsByAuthor().length > 0 && (
                <Grid container spacing={2} sx={{ mt: 1 }}>
                  <Grid xs={6}>
                    <Paper sx={{ p: 2 }}>
                      <Bar
                        data={{
                          labels: read_time.statsByAuthor().map(s => s.author),
                          datasets: [{
                            label: '中央値（時間）',
                            data: read_time.statsByAuthor().map(s => s.medianHours),
                            backgroundColor: read_time.statsByAuthor().map(s => {
                              const cat = read_time.getCategory(s.medianHours);
                              if (cat === 'Fast') return 'rgba(76, 175, 80, 0.7)';
                              if (cat === 'Normal') return 'rgba(33, 150, 243, 0.7)';
                              if (cat === 'Slow') return 'rgba(255, 152, 0, 0.7)';
                              return 'rgba(244, 67, 54, 0.7)';
                            }),
                            borderWidth: 1
                          }]
                        }}
                        options={{
                          indexAxis: 'y' as const,
                          responsive: true,
                          plugins: {
                            legend: { display: false },
                            title: { display: true, text: '担当者別リードタイム（中央値順）' }
                          },
                          scales: {
                            x: { beginAtZero: true, title: { display: true, text: '時間' } }
                          }
                        }}
                      />
                    </Paper>
                  </Grid>
                  <Grid xs={6}>
                    <Paper sx={{ p: 2 }}>
                      <Typography variant="subtitle1" gutterBottom>詳細データ</Typography>
                      <TableContainer sx={{ maxHeight: 250 }}>
                        <Table size="small" stickyHeader>
                          <TableHead>
                            <TableRow>
                              <TableCell>担当者</TableCell>
                              <TableCell align="right">PR数</TableCell>
                              <TableCell align="right">中央値</TableCell>
                              <TableCell>評価</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {read_time.statsByAuthor().map(stat => (
                              <TableRow key={stat.author}>
                                <TableCell>{stat.author}</TableCell>
                                <TableCell align="right">{stat.count}</TableCell>
                                <TableCell align="right">{stat.medianHours < 24 ? `${stat.medianHours}h` : `${(stat.medianHours / 24).toFixed(1)}日`}</TableCell>
                                <TableCell>
                                  <Chip
                                    label={read_time.getCategory(stat.medianHours)}
                                    size="small"
                                    color={
                                      read_time.getCategory(stat.medianHours) === 'Fast' ? 'success' :
                                      read_time.getCategory(stat.medianHours) === 'Normal' ? 'info' :
                                      read_time.getCategory(stat.medianHours) === 'Slow' ? 'warning' : 'error'
                                    }
                                  />
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </Paper>
                  </Grid>
                </Grid>
              )}
              <Divider sx={{ mt: 3, mb: 3 }} />
            </div>

            {/* 2. PRサイズ */}
            <div className="print-section print-page-break">
              <Typography variant="h5" sx={{ mb: 1 }}>2. PRサイズ分析</Typography>
              <Alert severity="info" sx={{ mb: 2 }}>
                <strong>測定内容:</strong> PRの変更行数をカテゴリ分け（XS:~10行, S:~50行, M:~250行, L:~500行, XL:500行~）。
                <strong>注意:</strong> L/XLが多いとレビュー品質低下、バグ見逃し、コンフリクト増加のリスク。
                <strong>理想:</strong> XS〜Mが大半。1PRは1つの目的に集中。
              </Alert>
              <Grid container spacing={2}>
                <Grid xs={12}>
                  <PrSizeGraph
                    categoryCount={prSizes.countByCategory()}
                    avgChanges={prSizes.avgChanges()}
                    medianChanges={prSizes.medianChanges()}
                    prSizes={prSizes.values}
                  />
                </Grid>
              </Grid>
              <Divider sx={{ mt: 3, mb: 3 }} />
            </div>

            {/* 3. レビュー待ち時間 */}
            <div className="print-section print-page-break">
              <Typography variant="h5" sx={{ mb: 1 }}>3. レビュー待ち時間</Typography>
              <Alert severity="info" sx={{ mb: 2 }}>
                <strong>測定内容:</strong> PR作成から最初のレビューまでの待ち時間。
                <strong>注意:</strong> 24時間以上だとコンテキストスイッチ増加、WIP増加でフロー効率低下。特定の人に集中するとボトルネック化。
                <strong>理想:</strong> 数時間以内。チーム全員がレビューに参加。
              </Alert>
              <Grid container spacing={2}>
                <Grid xs={12}>
                  <ReviewTimeGraph
                    reviewTimes={reviewTimes.values}
                    reviewerStats={reviewTimes.reviewerStats()}
                    avgWaitTimeHours={reviewTimes.avgWaitTimeHours()}
                    medianWaitTimeHours={reviewTimes.medianWaitTimeHours()}
                  />
                </Grid>
              </Grid>
              <Divider sx={{ mt: 3, mb: 3 }} />
            </div>

            {/* 4. オープンPR */}
            <div className="print-section print-page-break">
              <Typography variant="h5" sx={{ mb: 1 }}>4. オープン中のPR</Typography>
              <Alert severity="info" sx={{ mb: 2 }}>
                <strong>測定内容:</strong> 現在マージされていないPRの状態と経過日数。
                <strong>注意:</strong> 7日以上オープンのPRが多いとWIP過多（リトルの法則でリードタイム悪化）、コンフリクトリスク蓄積。
                <strong>理想:</strong> オープンPR数は最小限（チーム人数程度）。古いPRは早めに対処。
              </Alert>
              <Grid container spacing={2}>
                <Grid xs={12}>
                  <OpenPrList
                    openPrs={openPrs.values}
                    statusCount={openPrs.statusCount()}
                    totalCount={openPrs.totalCount}
                    staleCount={openPrs.staleCount}
                    oldCount={openPrs.oldCount}
                    avgOpenDays={openPrs.avgOpenDays}
                  />
                </Grid>
              </Grid>
              <Divider sx={{ mt: 3, mb: 3 }} />
            </div>

            {/* 5. レビューネットワーク */}
            <div className="print-section print-page-break">
              <Typography variant="h5" sx={{ mb: 1 }}>5. レビューネットワーク</Typography>
              <Alert severity="info" sx={{ mb: 2 }}>
                <strong>測定内容:</strong> 誰が誰のPRをレビューしているかの関係性マップ。
                <strong>注意:</strong> 特定ペアに偏ると知識がサイロ化（属人化）、バス係数低下。特定の人に負荷集中でバーンアウトリスク。
                <strong>理想:</strong> 多様なペアでレビュー。チーム全体でコード知識を共有。
              </Alert>
              <Grid container spacing={2}>
                <Grid xs={12}>
                  <ReviewNetworkGraph reviewNetwork={reviewNetwork} />
                </Grid>
              </Grid>
              <Divider sx={{ mt: 3, mb: 3 }} />
            </div>

            {/* 6. コントリビューター統計 */}
            <div className="print-section print-page-break">
              <Typography variant="h5" sx={{ mb: 1 }}>6. コントリビューター統計</Typography>
              <Alert severity="info" sx={{ mb: 2 }}>
                <strong>測定内容:</strong> 各メンバーのコミット数・コード変更量、上位3人の集中度、日別活動推移。
                <strong>注意:</strong> 上位3人シェアが80%超だとヒーロー依存でバス係数極低。スプリント終盤に活動集中は駆け込み開発の兆候。
                <strong>理想:</strong> 負荷が均等分散（上位3人60%以下）。毎日コンスタントにコミット。
              </Alert>
              <Grid container spacing={2}>
                <Grid xs={12}>
                  <ContributorStatsGraph contributors={contributors} />
                </Grid>
              </Grid>
              <Divider sx={{ mt: 3 }} />
            </div>
          </Box>
      }
    </>
  );
}
