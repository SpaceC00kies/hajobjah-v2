
import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { ChartDataPoint } from '../../../types/types';

interface GrowthChartProps {
  data: ChartDataPoint[];
  isLoading: boolean;
}

export const GrowthChart: React.FC<GrowthChartProps> = ({ data, isLoading }) => {
  if (isLoading) {
    return (
        <div className="bg-white p-4 rounded-lg shadow-md border border-neutral-DEFAULT/30 h-72 flex justify-center items-center">
            <p className="text-neutral-medium animate-pulse">Loading Chart Data...</p>
        </div>
    );
  }

  return (
    <div className="bg-white p-4 rounded-lg shadow-md border border-neutral-DEFAULT/30">
      <h3 className="font-sans font-semibold text-lg text-neutral-dark mb-4">User Growth (Last 30 Days)</h3>
      <div style={{ width: '100%', height: 300 }}>
        <ResponsiveContainer>
          <LineChart
            data={data}
            margin={{ top: 5, right: 30, left: 0, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="var(--neutral-light)" />
            <XAxis dataKey="date" stroke="var(--neutral-gray)" tick={{ fontSize: 12 }} />
            <YAxis stroke="var(--neutral-gray)" tick={{ fontSize: 12 }} allowDecimals={false} />
            <Tooltip
              contentStyle={{
                backgroundColor: 'var(--white)',
                border: '1px solid var(--primary-light)',
                borderRadius: '8px',
                fontSize: '14px'
              }}
            />
            <Legend wrapperStyle={{fontSize: "14px"}} />
            <Line type="monotone" dataKey="count" name="New Users" stroke="var(--primary-blue)" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
