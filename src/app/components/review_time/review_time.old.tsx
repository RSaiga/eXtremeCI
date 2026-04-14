import { Bar } from 'react-chartjs-2'
import { Chart, registerables } from 'chart.js'
import React from 'react'
import { ReviewTime } from '../../domain/models/review_time/review_time'
import { ReviewerStats } from '../../domain/models/review_time/review_times'
import {
  Box,
  Card,
  CardContent,
  Chip,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  Typography,
} from '@mui/material'
import Grid from '@mui/material/Unstable_Grid2'
import { PrimitiveToken, hexToRgba } from '../ui/tokens/primitive-token'

Chart.register(...registerables)

interface ReviewTimeGraphProps {
  reviewTimes: ReviewTime[]
  reviewerStats: ReviewerStats[]
  avgWaitTimeHours: number
  medianWaitTimeHours: number
}

const getWaitTimeColor = (hours: number | null): 'success' | 'warning' | 'error' => {
  if (hours === null) return 'error'
  if (hours <= 4) return 'success'
  if (hours <= 24) return 'warning'
  return 'error'
}

const formatWaitTime = (hours: number | null): string => {
  if (hours === null) return 'レビュー待ち'
  if (hours < 1) return `${Math.round(hours * 60)}分`
  if (hours < 24) return `${hours.toFixed(1)}時間`
  return `${(hours / 24).toFixed(1)}日`
}

export const ReviewTimeGraph: React.FC<ReviewTimeGraphProps> = (props) => {
  const { reviewTimes, reviewerStats, avgWaitTimeHours, medianWaitTimeHours } = props
  const [page, setPage] = React.useState(0)
  const [rowsPerPage, setRowsPerPage] = React.useState(10)

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage)
  }
  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(+event.target.value)
    setPage(0)
  }

  const sortedReviewTimes = [...reviewTimes].sort((a, b) => {
    if (a.waitTimeHours === null) return -1
    if (b.waitTimeHours === null) return 1
    return b.waitTimeHours - a.waitTimeHours
  })

  const reviewerChartData = {
    labels: reviewerStats.map((s) => s.reviewer),
    datasets: [
      {
        label: '平均応答時間 (時間)',
        data: reviewerStats.map((s) => s.avgResponseTimeHours),
        backgroundColor: reviewerStats.map((s) =>
          s.avgResponseTimeHours <= 4
            ? hexToRgba(PrimitiveToken.colors.green[60], 0.6)
            : s.avgResponseTimeHours <= 24
              ? hexToRgba(PrimitiveToken.colors.yellow[60], 0.6)
              : hexToRgba(PrimitiveToken.colors.red[70], 0.6),
        ),
        borderColor: reviewerStats.map((s) =>
          s.avgResponseTimeHours <= 4
            ? PrimitiveToken.colors.green[60]
            : s.avgResponseTimeHours <= 24
              ? PrimitiveToken.colors.yellow[60]
              : PrimitiveToken.colors.red[70],
        ),
        borderWidth: 1,
      },
    ],
  }

  const reviewerChartOptions = {
    indexAxis: 'y' as const,
    responsive: true,
    plugins: {
      legend: {
        display: false,
      },
      title: {
        display: true,
        text: 'レビュアー別 平均応答時間',
      },
      tooltip: {
        callbacks: {
          label: (context: any) => {
            const stat = reviewerStats[context.dataIndex]
            return `${context.parsed.x}時間 (${stat.reviewCount}件)`
          },
        },
      },
    },
    scales: {
      x: {
        beginAtZero: true,
        title: {
          display: true,
          text: '時間',
        },
      },
    },
  }

  const pendingCount = reviewTimes.filter((r) => !r.hasReview).length

  return (
    <Box>
      <Grid container spacing={2}>
        <Grid xs={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                平均レビュー待ち時間
              </Typography>
              <Typography variant="h4">{formatWaitTime(avgWaitTimeHours)}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid xs={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                中央値
              </Typography>
              <Typography variant="h4">{formatWaitTime(medianWaitTimeHours)}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid xs={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                レビュー待ちPR
              </Typography>
              <Typography variant="h4" color={pendingCount > 0 ? 'error' : 'success'}>
                {pendingCount}件
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid xs={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                レビュー済みPR
              </Typography>
              <Typography variant="h4">{reviewTimes.length - pendingCount}件</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={2} sx={{ mt: 1 }}>
        <Grid xs={6}>
          {reviewerStats.length > 0 && <Bar data={reviewerChartData} options={reviewerChartOptions} />}
        </Grid>
        <Grid xs={6}>
          <Paper sx={{ width: '100%', overflow: 'hidden' }}>
            <Typography variant="h6" sx={{ p: 1 }}>
              PR別 レビュー待ち時間
            </Typography>
            <TableContainer sx={{ maxHeight: 300 }}>
              <Table stickyHeader size="small" aria-label="review time table">
                <TableHead>
                  <TableRow>
                    <TableCell>タイトル</TableCell>
                    <TableCell>作成者</TableCell>
                    <TableCell>レビュアー</TableCell>
                    <TableCell align="right">待ち時間</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {sortedReviewTimes.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((row, index) => (
                    <TableRow key={index} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                      <TableCell component="th" scope="row">
                        {row.prTitle}
                      </TableCell>
                      <TableCell>{row.prAuthor}</TableCell>
                      <TableCell>{row.firstReviewer || '-'}</TableCell>
                      <TableCell align="right">
                        <Chip
                          label={formatWaitTime(row.waitTimeHours)}
                          color={getWaitTimeColor(row.waitTimeHours)}
                          size="small"
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            <TablePagination
              rowsPerPageOptions={[10, 15, 100]}
              component="div"
              count={sortedReviewTimes.length}
              rowsPerPage={rowsPerPage}
              page={page}
              onPageChange={handleChangePage}
              onRowsPerPageChange={handleChangeRowsPerPage}
            />
          </Paper>
        </Grid>
      </Grid>
    </Box>
  )
}
