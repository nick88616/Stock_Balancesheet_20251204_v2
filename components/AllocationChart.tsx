import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { CategorySummary } from '../types';

interface AllocationChartProps {
  categories: CategorySummary[];
}

const AllocationChart: React.FC<AllocationChartProps> = ({ categories }) => {
  const data = categories.map(c => ({
    name: c.label,
    value: c.totalValueTWD,
    color: c.color
  })).filter(d => d.value > 0);

  const totalValue = data.reduce((sum, item) => sum + item.value, 0);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const d = payload[0].payload;
      const percent = ((d.value / totalValue) * 100).toFixed(1);
      return (
        <div className="bg-white text-slate-900 p-3 rounded-none shadow-lg border border-slate-900 ring-1 ring-slate-100">
          <p className="font-bold mb-1 font-serif">{d.name}</p>
          <div className="flex justify-between gap-4 text-xs">
            <span className="text-slate-500">Value (TWD)</span>
            <span className="font-mono font-bold">${d.value.toLocaleString()}</span>
          </div>
          <div className="mt-1 pt-1 border-t border-slate-200 flex justify-between gap-4 text-xs">
             <span className="text-slate-500">Ratio</span>
             <span className="font-mono font-bold">{percent}%</span>
          </div>
        </div>
      );
    }
    return null;
  };

  if (totalValue === 0) return <div className="h-full flex items-center justify-center text-slate-400 text-sm font-serif italic">No Assets</div>;

  return (
    <div className="w-full h-[250px]">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={80}
            paddingAngle={2}
            dataKey="value"
            stroke="#fff"
            strokeWidth={2}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend 
            verticalAlign="bottom" 
            height={36} 
            iconType="circle" 
            iconSize={8} 
            formatter={(value) => <span className="text-slate-600 text-xs font-bold uppercase ml-1 tracking-wider">{value}</span>} 
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

export default AllocationChart;