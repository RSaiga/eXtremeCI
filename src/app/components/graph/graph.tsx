import {Line} from 'react-chartjs-2';
import {Chart, registerables} from 'chart.js';

Chart.register(...registerables);
import React from "react";

export const Graph = (props) => {
    const labels = props.readTimes.map((data) => {
      return data.date;
    });
    const labels2 = props.readTimes.map((data) => {
      return data.title;
    });
    const values = props.readTimes.map((data) => {
      return data.getDisplayTime();
    });

    const data = {
      labels: labels,
      datasets: [
        {
          label: 'リードタイム（h）',
          yAxisID: 'y-axis-time',
          data: values,
          borderWidth: 1
        },
      ]
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
          callbacks: {
            title: (tooltipItem) => props.readTimes[tooltipItem[0].dataIndex].title,
            footer: tooltipItem => props.readTimes[tooltipItem[0].dataIndex].user,
          },
        }
      },
      scales: {
        yAxes: [
          {
            id: 'y-axis-time',
            position: 'left',
            ticks: {
              beginAtZero: true
            }
          },
          {
            id: 'y-axis-count',
            position: 'right',
            ticks: {
              beginAtZero: true
            }
          }
        ]
      },
    }

    return (
      <Line
        data={data}
        width={100}
        height={50}
        options={options}
      />
    );
  }
;
