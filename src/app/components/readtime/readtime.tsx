import React, {useEffect, useState} from "react";
import Loading from "../loading/loading";
import {Release} from "../release/release";
import Grid from '@mui/material/Unstable_Grid2';
import {Graph} from "../graph/graph";
import Box from "@mui/material/Box";
import {Button, Typography, Divider, Alert} from "@mui/material";
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
              <Button
                variant="contained"
                onClick={handlePrint}
                className="no-print"
                sx={{ height: 'fit-content' }}
              >
                PDF出力 / 印刷
              </Button>
            </Box>

            {/* 1. リードタイム */}
            <div className="print-section">
              <Typography variant="h5" sx={{ mb: 1 }}>1. リードタイム</Typography>
              <Alert severity="info" sx={{ mb: 2 }}>
                <strong>測定内容:</strong> 最初のコミットからPRマージまでの時間。
                <strong>注意:</strong> 長い（数日以上）とフィードバックが遅れ、ばらつきが大きいと見積もり精度が低下します。
                <strong>理想:</strong> 数時間〜1日程度で安定。
              </Alert>
              <Grid container spacing={2}>
                <Grid xs={5}>
                  <Graph readTimes={read_time.values}/>
                </Grid>
                <Grid xs={2}>
                  <Median readTimes={read_time}/>
                </Grid>
                <Grid xs={5}>
                  <Release readTimes={read_time.values}/>
                </Grid>
              </Grid>
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
