"use client";
import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { ChartDataPoint } from '@/types/types';

interface GrowthChartProps {
  data: ChartDataPoint[];
  isLoading: boolean;
}

export const GrowthChart: React.FC<GrowthChartProps> = ({ data, isLoading }) => {
  if (isLoading) {
    return (
        <div className="chart-section h-[394px] flex justify-center items-center">
            <p className="text-neutral-medium animate-pulse">Loading Chart Data...</p>
        </div>
    );
  }

  return (
    <div className="chart-section">
      <h3 className="chart-header">
          <span>📈</span>
          <span>User Growth (Last 30 Days)</span>
      </h3>
      <div className="chart-container" style={{ height: 300 }}>
        <ResponsiveContainer>
          <LineChart
            data={data}
            margin={{ top: 5, right: 20, left: -10, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(135, 206, 235, 0.2)" />
            <XAxis dataKey="date" stroke="var(--neutral-gray)" tick={{ fontSize: 12, fontFamily: 'sans-serif' }} />
            <YAxis stroke="var(--neutral-gray)" tick={{ fontSize: 12, fontFamily: 'sans-serif' }} allowDecimals={false} />
            <Tooltip
              contentStyle={{
                backgroundColor: 'var(--white)',
                border: '1px solid var(--primary-light)',
                borderRadius: '12px',
                fontFamily: 'Prompt, sans-serif',
                fontSize: '14px'
              }}
              labelStyle={{ color: 'var(--primary-dark)', fontWeight: '600' }}
            />
            <Legend wrapperStyle={{fontSize: "14px", fontFamily: 'Prompt, sans-serif'}} />
            <Line 
                type="monotone" 
                dataKey="count" 
                name="New Users" 
                stroke="var(--primary-blue)" 
                strokeWidth={2} 
                dot={{ r: 4, fill: 'var(--primary-blue)', stroke: 'var(--white)', strokeWidth: 2 }} 
                activeDot={{ r: 6, fill: 'var(--primary-dark)', stroke: 'var(--white)', strokeWidth: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};