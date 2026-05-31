'use client';

import React from 'react';
import { Bar, Pie, Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  LineElement,
  PointElement,
  Tooltip,
  Legend,
  Title,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  LineElement,
  PointElement,
  Tooltip,
  Legend,
  Title
);

// Dark-mode defaults — applied globally on first import so every chart in
// the app picks them up. Lighter text, subtle grid lines, tooltip body
// that doesn't blow out on a dark page.
ChartJS.defaults.color = '#9ba8b6';
ChartJS.defaults.borderColor = 'rgba(255, 255, 255, 0.08)';
ChartJS.defaults.plugins.tooltip.backgroundColor = '#1c2128';
ChartJS.defaults.plugins.tooltip.titleColor = '#e6edf3';
ChartJS.defaults.plugins.tooltip.bodyColor = '#c9d1d9';
ChartJS.defaults.plugins.tooltip.borderColor = '#30363d';
ChartJS.defaults.plugins.tooltip.borderWidth = 1;

const generateColors = (count) => {
  const palette = [
    '#FF6384',
    '#36A2EB',
    '#FFCE56',
    '#8e44ad',
    '#2ecc71',
    '#e67e22',
    '#3498db',
    '#f39c12',
    '#1abc9c',
    '#9b59b6',
    '#34495e',
    '#2c3e50',
  ];
  return Array.from({ length: count }, (_, i) => palette[i % palette.length]);
};

const ChartComponent = ({
  type,
  labels = [],
  data = [],
  title = '',
  datasets = null,
}) => {
  const backgroundColors = generateColors(data?.length || 0);
  const isSmallScreen =
    typeof window !== 'undefined' ? window.innerWidth < 768 : false;

  const chartData = {
    labels,
    datasets: datasets
      ? datasets.map((ds) => ({
          ...ds,
          backgroundColor:
            type === 'pie'
              ? generateColors(ds.data.length)
              : ds.backgroundColor,
          borderColor: ds.borderColor || 'rgba(54, 162, 235, 1)',
          borderWidth: 1,
          tension: 0.4,
          fill: false,
          pointRadius: 4,
        }))
      : [
          {
            label: title,
            data,
            backgroundColor:
              type === 'pie' ? backgroundColors : 'rgba(54, 162, 235, 0.6)',
            borderColor: 'rgba(54, 162, 235, 1)',
            borderWidth: 1,
            tension: 0.4,
            fill: false,
            pointRadius: 4,
          },
        ],
  };

  const options = {
    responsive: true,
    plugins: {
      legend: {
        display: type !== 'bar' || !!datasets,
        position: type === 'pie' ? 'right' : 'bottom',
        labels: {
          padding: 20,
          boxWidth: 12,
          font: {
            size: isSmallScreen ? 10 : 12,
          },
        },
      },
      title: {
        display: !!title,
        text: title,
        font: {
          size: isSmallScreen ? 14 : 16,
        },
        padding: {
          top: 10,
          bottom: 20,
        },
      },
      tooltip: {
        mode: 'index',
        intersect: false,
        bodyFont: { size: 12 },
        titleFont: { size: 14 },
      },
    },
    scales:
      type === 'pie'
        ? {}
        : {
            x: {
              ticks: {
                maxRotation: isSmallScreen ? 45 : 0,
                font: { size: isSmallScreen ? 10 : 12 },
              },
              grid: { display: false },
            },
            y: {
              beginAtZero: true,
              ticks: { font: { size: isSmallScreen ? 10 : 12 } },
            },
          },
    maintainAspectRatio: false,
  };

  const hasData =
    (datasets && datasets.length && datasets.some((ds) => ds.data?.length)) ||
    (data && data.length);

  if (!hasData) {
    return (
      <div
        className='p-4 text-center text-muted rounded'
        style={{
          backgroundColor: 'rgba(255, 255, 255, 0.03)',
          border: '1px solid var(--bs-border-color)',
        }}
      >
        <i className='bi bi-bar-chart fs-4 d-block mb-2'></i>
        {title}: No data available
      </div>
    );
  }

  return (
    <div
      className='position-relative'
      style={{ minHeight: '300px', height: '100%' }}
    >
      <div
        className='p-3 rounded h-100'
        style={{
          backgroundColor: 'var(--bs-card-bg)',
          border: '1px solid var(--bs-border-color)',
        }}
      >
        {type === 'bar' && <Bar data={chartData} options={options} />}
        {type === 'pie' && <Pie data={chartData} options={options} />}
        {type === 'line' && <Line data={chartData} options={options} />}
      </div>
    </div>
  );
};

export default ChartComponent;
