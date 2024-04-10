import {Paper, Table, TableBody, TableCell, TableContainer, TableHead, TablePagination, TableRow} from "@mui/material";
import React from "react";

export const Release = (props) => {
  const [page, setPage] = React.useState(0);
  const [rowsPerPage, setRowsPerPage] = React.useState(10);
  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };
  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(+event.target.value);
    setPage(0);
  };
  return (
    <>
      <Paper sx={{width: '100%', overflow: 'hidden'}}>
        <TableContainer sx={{maxHeight: 350}}>
          <Table stickyHeader size="small" aria-label="simple table">
            <TableHead>
              <TableRow>
                <TableCell>タイトル</TableCell>
                <TableCell>担当者</TableCell>
                <TableCell>リリース日</TableCell>
                <TableCell>リードタイム（h）</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {props.readTimes.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((row, index) => (
                <TableRow
                  key={index}
                  sx={{'&:last-child td, &:last-child th': {border: 0}}}
                >
                  <TableCell component="th" scope="row">
                    {row.title}
                  </TableCell>
                  <TableCell>{row.user}</TableCell>
                  <TableCell>{row.date}</TableCell>
                  <TableCell align="right">{row.getDisplayTime()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          rowsPerPageOptions={[10, 15, 100]}
          component="div"
          count={props.readTimes.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </Paper>
    </>
  );
}