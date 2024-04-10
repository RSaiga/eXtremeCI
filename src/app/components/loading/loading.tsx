import * as React from 'react';
import CircularProgress from '@mui/material/CircularProgress';
import {Grid} from "@mui/material";

export default function Loading() {
  return (
    <Grid
      container
      spacing={0}
      direction="column"
      alignItems="center"
      justifyContent="center"
      sx={{ minHeight: '100vh' }}
    >
      <Grid item xs={3}>
        <CircularProgress />
      </Grid>
    </Grid>
  );
}