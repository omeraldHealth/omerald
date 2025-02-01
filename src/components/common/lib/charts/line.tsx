'use client';

import React, { useMemo } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export interface ReportsPerMember {
  [key: string]: {
    name: string;
    count: number;
  };
}

export interface LineChartProps {
  reportsPerMember?: ReportsPerMember;
}

export const LineChart: React.FC<LineChartProps> = ({ reportsPerMember = {} }) => {
  // Color palette for charts
  const colors = [
    { border: 'rgb(59, 130, 246)', fill: 'rgba(59, 130, 246, 0.6)' }, // Blue
    { border: 'rgb(34, 197, 94)', fill: 'rgba(34, 197, 94, 0.6)' }, // Green
    { border: 'rgb(251, 191, 36)', fill: 'rgba(251, 191, 36, 0.6)' }, // Yellow
    { border: 'rgb(239, 68, 68)', fill: 'rgba(239, 68, 68, 0.6)' }, // Red
    { border: 'rgb(168, 85, 247)', fill: 'rgba(168, 85, 247, 0.6)' }, // Purple
    { border: 'rgb(236, 72, 153)', fill: 'rgba(236, 72, 153, 0.6)' }, // Pink
    { border: 'rgb(14, 165, 233)', fill: 'rgba(14, 165, 233, 0.6)' }, // Sky
    { border: 'rgb(249, 115, 22)', fill: 'rgba(249, 115, 22, 0.6)' }, // Orange
  ];

  const chartData = useMemo(() => {
    const members = Object.values(reportsPerMember);
    
    // If no members at all, show empty state
    if (members.length === 0) {
      return {
        labels: ['No Members'],
        datasets: [
          {
            label: 'Reports',
            data: [0],
            borderColor: 'rgb(156, 163, 175)',
            backgroundColor: 'rgba(156, 163, 175, 0.2)',
            fill: true,
          },
        ],
      };
    }

    const labels = members.map(m => m.name || 'Unknown');
    const data = members.map(m => m.count || 0);
    
    // Use primary color for the line chart with gradient fill
    const colorIndex = 0;

    return {
      labels,
      datasets: [
        {
          label: 'Reports Uploaded',
          data,
          borderColor: colors[colorIndex].border,
          backgroundColor: colors[colorIndex].fill,
          fill: true,
          tension: 0.4,
          pointRadius: 5,
          pointHoverRadius: 7,
          pointBackgroundColor: colors[colorIndex].border,
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
        },
      ],
    };
  }, [reportsPerMember]);

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        padding: 12,
        titleFont: {
          size: 14,
          weight: 'bold' as const,
        },
        bodyFont: {
          size: 13,
        },
        cornerRadius: 8,
        displayColors: true,
        callbacks: {
          title: function(context: any) {
            return context[0]?.label || '';
          },
          label: function(context: any) {
            const value = context.parsed.y || 0;
            return `Reports: ${value}`;
          },
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          stepSize: 1,
          precision: 0,
          font: {
            size: 11,
          },
        },
        grid: {
          color: 'rgba(0, 0, 0, 0.05)',
        },
      },
      x: {
        ticks: {
          font: {
            size: 11,
          },
        },
        grid: {
          display: false,
        },
      },
    },
  };

  return <Line data={chartData} options={options} />;
};

