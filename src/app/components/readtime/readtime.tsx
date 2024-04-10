import React, {useEffect, useState} from "react";
import {ReadTimeUsecase} from "../../usecase/read_time";
import Loading from "../loading/loading";
import {Release} from "../release/release";
import Grid from '@mui/material/Unstable_Grid2';
import {Graph} from "../graph/graph";
import Box from "@mui/material/Box";
import {ReadTimes} from "../../domain/models/read_time/read.times";
import {Median} from "../median/median";
import {CommiterUsecase} from "../../usecase/commiter/commiter";
import {Commiter} from "../commiter/commiter";
import {Commiters} from "../../domain/models/commiter/commiters";

export const Readtime = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [read_time, setReadTime] = useState(new ReadTimes([]));
  const [commiters, setCommiters] = useState(new Commiters([]));
  useEffect(() => {
    const find_read_times = async () => {
      setIsLoading(true);
      const readTimes = await ReadTimeUsecase.find();
      setReadTime(readTimes);
      const commiters = await CommiterUsecase.find();
      setCommiters(commiters);
      setIsLoading(false);
    };
    find_read_times();
  }, []);

  return (
    <>
      {
        isLoading ? <Loading/> :
          <Box height={100}>
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
            <Grid container spacing={2}>
              <Grid xs={12}>
                <Commiter commiters={commiters.values}/>
              </Grid>
            </Grid>
          </Box>
      }
    </>
  );
}