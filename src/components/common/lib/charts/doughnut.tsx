'use client';

import React, { useMemo } from 'react';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
} from 'chart.js';
import { Doughnut } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend);

export interface ConditionsPerMember {
  [key: string]: {
    name: string;
    count: number;
  };
}

export interface DoughnutChartProps {
  conditionsPerMember?: ConditionsPerMember;
}

export const DoughnutChart: React.FC<DoughnutChartProps> = ({ conditionsPerMember = {} }) => {
  // Vibrant color palette for doughnut chart - matching the bar chart colors
  const colors = [
    { bg: 'rgba(59, 130, 246, 0.85)', border: 'rgb(59, 130, 246)' }, // Blue
    { bg: 'rgba(34, 197, 94, 0.85)', border: 'rgb(34, 197, 94)' }, // Green
    { bg: 'rgba(251, 191, 36, 0.85)', border: 'rgb(251, 191, 36)' }, // Yellow
    { bg: 'rgba(239, 68, 68, 0.85)', border: 'rgb(239, 68, 68)' }, // Red
    { bg: 'rgba(168, 85, 247, 0.85)', border: 'rgb(168, 85, 247)' }, // Purple
    { bg: 'rgba(236, 72, 153, 0.85)', border: 'rgb(236, 72, 153)' }, // Pink
    { bg: 'rgba(14, 165, 233, 0.85)', border: 'rgb(14, 165, 233)' }, // Sky
    { bg: 'rgba(249, 115, 22, 0.85)', border: 'rgb(249, 115, 22)' }, // Orange
    { bg: 'rgba(20, 184, 166, 0.85)', border: 'rgb(20, 184, 166)' }, // Teal
    { bg: 'rgba(139, 92, 246, 0.85)', border: 'rgb(139, 92, 246)' }, // Indigo
  ];

  const chartData = useMemo(() => {
    const members = Object.values(conditionsPerMember);
    
    // If no members at all, show empty state
    if (members.length === 0) {
      return {
        labels: ['No Members'],
        datasets: [
          {
            label: 'Conditions',
            data: [1],
            backgroundColor: ['rgba(156, 163, 175, 0.6)'],
            borderColor: ['rgba(156, 163, 175, 1)'],
            borderWidth: 2,
          },
        ],
      };
    }

    // Include all members, even with 0 conditions, to show complete picture
    // But if all have 0, show a single "No Conditions" slice
    const totalConditions = members.reduce((sum, m) => sum + (m.count || 0), 0);
    
    if (totalConditions === 0) {
      return {
        labels: ['No Conditions'],
        datasets: [
          {
            label: 'Conditions',
            data: [1],
            backgroundColor: ['rgba(34, 197, 94, 0.6)'],
            borderColor: ['rgba(34, 197, 94, 1)'],
            borderWidth: 2,
          },
        ],
      };
    }

    // Show all members with conditions > 0
    const membersWithConditions = members.filter(m => (m.count || 0) > 0);
    
    if (membersWithConditions.length === 0) {
      return {
        labels: ['No Conditions'],
        datasets: [
          {
            label: 'Conditions',
            data: [1],
            backgroundColor: ['rgba(34, 197, 94, 0.6)'],
            borderColor: ['rgba(34, 197, 94, 1)'],
            borderWidth: 2,
          },
        ],
      };
    }

    const labels = membersWithConditions.map(m => m.name || 'Unknown');
    const data = membersWithConditions.map(m => m.count || 0);
    const backgroundColor = membersWithConditions.map((_, index) => colors[index % colors.length].bg);
    const borderColor = membersWithConditions.map((_, index) => colors[index % colors.length].border);

    return {
      labels,
      datasets: [
        {
          label: 'Diagnosed Conditions',
          data,
          backgroundColor,
          borderColor,
          borderWidth: 2,
        },
      ],
    };
  }, [conditionsPerMember]);

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          padding: 12,
          font: {
            size: 11,
          },
          usePointStyle: true,
          pointStyle: 'circle',
        },
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
          label: function(context: any) {
            const label = context.label || '';
            const value = context.parsed || 0;
            const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
            const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : '0';
            return `${label}: ${value} condition${value !== 1 ? 's' : ''} (${percentage}%)`;
          },
        },
      },
    },
  };

  return <Doughnut data={chartData} options={options} />;
};

