import {Bar} from 'react-chartjs-2';
import {Chart, registerables} from 'chart.js';
import React from "react";
import {CategoryCount} from "../../domain/models/pr_size/pr_sizes";
import {PrSize, SizeCategory} from "../../domain/models/pr_size/pr_size";
import {
  Box,
  Chip,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow
} from "@mui/material";
import { PrimitiveToken, hexToRgba } from "../ui/tokens/primitive-token";

Chart.register(...registerables);

interface PrSizeGraphProps {
  categoryCount: CategoryCount;
  avgChanges: number;
  medianChanges: number;
  prSizes: PrSize[];
}

const getCategoryColor = (category: SizeCategory): "success" | "warning" | "error" => {
  switch (category) {
    case 'XS':
    case 'S':
      return 'success';
    case 'M':
      return 'warning';
    case 'L':
    case 'XL':
      return 'error';
  }
};

export const PrSizeGraph: React.FC<PrSizeGraphProps> = (props) => {
  const {categoryCount, avgChanges, medianChanges, prSizes} = props;
  const [page, setPage] = React.useState(0);
  const [rowsPerPage, setRowsPerPage] = React.useState(10);

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };
  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(+event.target.value);
    setPage(0);
  };

  const sortedPrSizes = [...prSizes].sort((a, b) => b.totalChanges - a.totalChanges);

  const labels = ['XS (~10)', 'S (~50)', 'M (~250)', 'L (~500)', 'XL (500+)'];
  const values = [
    categoryCount.XS,
    categoryCount.S,
    categoryCount.M,
    categoryCount.L,
    categoryCount.XL
  ];

  const backgroundColors = [
    hexToRgba(PrimitiveToken.colors.green[60], 0.6),   // XS - green
    hexToRgba(PrimitiveToken.colors.green[60], 0.6),   // S - green
    hexToRgba(PrimitiveToken.colors.yellow[60], 0.6),  // M - yellow
    hexToRgba(PrimitiveToken.colors.red[70], 0.6),     // L - red
    hexToRgba(PrimitiveToken.colors.red[70], 0.6),     // XL - red
  ];

  const borderColors = [
    PrimitiveToken.colors.green[60],
    PrimitiveToken.colors.green[60],
    PrimitiveToken.colors.yellow[60],
    PrimitiveToken.colors.red[70],
    PrimitiveToken.colors.red[70],
  ];

  const data = {
    labels: labels,
    datasets: [{
      label: 'PR Count',
      data: values,
      backgroundColor: backgroundColors,
      borderColor: borderColors,
      borderWidth: 1,
    }]
  };

  const options = {
    responsive: true,
    plugins: {
      legend: {
        display: false
      },
      title: {
        display: true,
        text: `PR Size Distribution (Avg: ${avgChanges} lines, Median: ${medianChanges} lines)`
      },
      tooltip: {
        enabled: true,
        callbacks: {
          label: (context: any) => {
            return `${context.parsed.y} PRs`;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'Number of PRs'
        }
      },
      x: {
        title: {
          display: true,
          text: 'Size Category (lines changed)'
        }
      }
    },
  };

  return (
    <Box>
      <Bar
        data={data}
        width={100}
        height={30}
        options={options}
      />
      <Paper sx={{width: '100%', overflow: 'hidden', mt: 2}}>
        <TableContainer sx={{maxHeight: 300}}>
          <Table stickyHeader size="small" aria-label="pr size table">
            <TableHead>
              <TableRow>
                <TableCell>タイトル</TableCell>
                <TableCell>担当者</TableCell>
                <TableCell>日付</TableCell>
                <TableCell align="right">追加</TableCell>
                <TableCell align="right">削除</TableCell>
                <TableCell align="right">合計</TableCell>
                <TableCell>サイズ</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {sortedPrSizes.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((row, index) => (
                <TableRow
                  key={index}
                  sx={{'&:last-child td, &:last-child th': {border: 0}}}
                >
                  <TableCell component="th" scope="row">
                    {row.title}
                  </TableCell>
                  <TableCell>{row.user}</TableCell>
                  <TableCell>{row.date}</TableCell>
                  <TableCell align="right" sx={{color: 'green'}}>+{row.additions}</TableCell>
                  <TableCell align="right" sx={{color: 'red'}}>-{row.deletions}</TableCell>
                  <TableCell align="right">{row.totalChanges}</TableCell>
                  <TableCell>
                    <Chip
                      label={row.sizeCategory}
                      color={getCategoryColor(row.sizeCategory)}
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
          count={sortedPrSizes.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </Paper>
    </Box>
  );
};
