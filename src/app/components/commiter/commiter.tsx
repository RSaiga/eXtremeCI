import {Bar} from 'react-chartjs-2';
import {Chart, registerables} from 'chart.js';

Chart.register(...registerables);
import React from "react";

export const Commiter = (props) => {
    const allUserCommitCounts = props.commiters.flatMap(data => data.author);
    const labels = props.commiters.map(commiter => commiter.date);
    const users = Array.from(new Set(allUserCommitCounts.map((uc) => uc.user)));
    const datasets = users.map((user) => {
      const data = props.commiters.map((commiter) => {
        if (commiter.author) {
          const author = commiter.author.find(ucc => ucc.user === user);
          return author ? author.count : 0;
        }
        return 0;
      });
      return {
        label: user,
        data: data,
        borderWidth: 1,
      };
    });

    const data = {
      labels: labels,
      datasets: datasets
    }

    const options = {
      responsive: true,
      plugins: {
        legend: {
          display: true
        },
        tooltip: {
          enabled: true,
          intersect: false,
        }
      },
      scales: {
        x: {
          stacked: true,
        },
        y: {
          stacked: true
        },
      },
    }

    return (
      <Bar
        data={data}
        width={100}
        height={50}
        options={options}
      />
    );
  }
;
