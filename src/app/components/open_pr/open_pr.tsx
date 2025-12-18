import React from "react";
import {OpenPr} from "../../domain/models/open_pr/open_pr";
import {StatusCount} from "../../domain/models/open_pr/open_prs";
import {
  Box,
  Card,
  CardContent,
  Chip,
  Link,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography
} from "@mui/material";
import Grid from '@mui/material/Unstable_Grid2';

interface OpenPrListProps {
  openPrs: OpenPr[];
  statusCount: StatusCount;
  totalCount: number;
  staleCount: number;
  oldCount: number;
  avgOpenDays: number;
}

const getOpenDaysColor = (days: number): "success" | "warning" | "error" => {
  if (days <= 3) return 'success';
  if (days <= 7) return 'warning';
  return 'error';
};

const getStatusColor = (status: string): "default" | "success" | "warning" | "error" | "info" => {
  switch (status) {
    case '承認済み': return 'success';
    case '変更要求': return 'error';
    case 'レビュー待ち': return 'warning';
    case 'Draft': return 'default';
    default: return 'info';
  }
};

export const OpenPrList: React.FC<OpenPrListProps> = (props) => {
  const {openPrs, statusCount, totalCount, staleCount, oldCount, avgOpenDays} = props;

  const sortedPrs = [...openPrs].sort((a, b) => b.openDays - a.openDays);

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        オープン中のPR
      </Typography>

      <Grid container spacing={2}>
        <Grid xs={2}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                オープンPR数
              </Typography>
              <Typography variant="h4">
                {totalCount}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid xs={2}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                平均オープン日数
              </Typography>
              <Typography variant="h4">
                {avgOpenDays}日
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid xs={2}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                7日以上放置
              </Typography>
              <Typography variant="h4" color={staleCount > 0 ? 'warning.main' : 'success.main'}>
                {staleCount}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid xs={2}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                14日以上オープン
              </Typography>
              <Typography variant="h4" color={oldCount > 0 ? 'error' : 'success.main'}>
                {oldCount}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid xs={2}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                レビュー待ち
              </Typography>
              <Typography variant="h4" color={statusCount.reviewWaiting > 0 ? 'warning.main' : 'success.main'}>
                {statusCount.reviewWaiting}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid xs={2}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                変更要求中
              </Typography>
              <Typography variant="h4" color={statusCount.changesRequested > 0 ? 'error' : 'success.main'}>
                {statusCount.changesRequested}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {sortedPrs.length > 0 && (
        <Paper sx={{width: '100%', overflow: 'hidden', mt: 2}}>
          <TableContainer sx={{maxHeight: 400}}>
            <Table stickyHeader size="small" aria-label="open pr table">
              <TableHead>
                <TableRow>
                  <TableCell>#</TableCell>
                  <TableCell>タイトル</TableCell>
                  <TableCell>作成者</TableCell>
                  <TableCell align="right">オープン日数</TableCell>
                  <TableCell align="right">最終更新</TableCell>
                  <TableCell>ステータス</TableCell>
                  <TableCell></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {sortedPrs.map((pr) => (
                  <TableRow
                    key={pr.prNumber}
                    sx={{
                      '&:last-child td, &:last-child th': {border: 0},
                      backgroundColor: pr.isOld ? 'rgba(255, 0, 0, 0.05)' :
                                       pr.isStale ? 'rgba(255, 165, 0, 0.05)' : 'inherit'
                    }}
                  >
                    <TableCell>{pr.prNumber}</TableCell>
                    <TableCell component="th" scope="row">
                      {pr.title}
                    </TableCell>
                    <TableCell>{pr.author}</TableCell>
                    <TableCell align="right">
                      <Chip
                        label={`${pr.openDays}日`}
                        color={getOpenDaysColor(pr.openDays)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="right">
                      {pr.daysSinceLastUpdate}日前
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={pr.statusLabel}
                        color={getStatusColor(pr.statusLabel)}
                        size="small"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      <Link
                        href={pr.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        sx={{fontSize: '0.875rem'}}
                      >
                        開く
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

      {sortedPrs.length === 0 && (
        <Paper sx={{p: 3, mt: 2, textAlign: 'center'}}>
          <Typography color="success.main">
            オープン中のPRはありません
          </Typography>
        </Paper>
      )}
    </Box>
  );
};
