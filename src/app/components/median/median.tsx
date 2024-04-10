import {Card, CardContent, Typography} from "@mui/material";
import React from "react";

export const Median = (props) => {
  return (
      <Card >
        <CardContent>
          <Typography sx={{ fontSize: 14 }} color="text.secondary">
            中央値（h）
          </Typography>
          <Typography variant="h5" component="div">
            {props.readTimes.median()}
          </Typography>
          <Typography sx={{ fontSize: 14 }} color="text.secondary">
            平均値（h）
          </Typography>
          <Typography variant="h5" component="div">
            {props.readTimes.avg()}
          </Typography>
        </CardContent>
      </Card>
  );
}