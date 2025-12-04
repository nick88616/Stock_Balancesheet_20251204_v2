import React, { useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { PortfolioSnapshot, AssetCategory } from '../types';

interface TrendChartProps {
  snapshots: PortfolioSnapshot[];
  filterCategory: AssetCategory | 'All';
  onDateSelect: (date: string) => void;
}

const EXCHANGE_RATE = 32.5;

const TrendChart: React.FC<TrendChartProps> = ({ snapshots, filterCategory, onDateSelect }) => {
  
  // Prepare data based on filter
  const chartData = useMemo(() => {
    if (snapshots.length === 0) return [];

    return snapshots.map(s => {
      const dateLabel = s.date.slice(5); // MM-DD

      if (filterCategory === 'All') {
        return {
          fullDate: s.date, // Hidden field for interaction
          date: dateLabel,
          marketEtf: s.marketEtfValue,
          bondEtf: s.bondEtfValue,
          individualStock: s.individualStockValue,
          total: s.totalValueTWD
        };
      } else {
        // Detailed breakdown
        const items = s.holdings.filter(h => h.category === filterCategory);
        const dataPoint: any = { fullDate: s.date, date: dateLabel, total: 0 };
        
        items.forEach(h => {
          const val = h.currency === 'USD' ? h.value * EXCHANGE_RATE : h.value;
          // Accumulate if same symbol exists (unlikely in same cat but safe to do)
          dataPoint[h.symbol] = (dataPoint[h.symbol] || 0) + val;
          dataPoint.total += val;
        });
        return dataPoint;
      }
    });
  }, [snapshots, filterCategory]);

  // Determine Keys for Area Chart
  const dataKeys = useMemo(() => {
    if (snapshots.length === 0) return [];
    if (filterCategory === 'All') {
      return [
        { key: 'individualStock', name: 'Stocks', color: '#cbd5e1' }, // Slate-300
        { key: 'bondEtf', name: 'Bond ETF', color: '#64748b' },       // Slate-500
        { key: 'marketEtf', name: 'Market ETF', color: '#1e293b' }    // Slate-800
      ];
    } else {
      // Find all unique symbols for this category across history
      const symbols = new Set<string>();
      snapshots.forEach(s => {
        s.holdings
         .filter(h => h.category === filterCategory)
         .forEach(h => symbols.add(h.symbol));
      });
      
      // Generate shades of gray
      const symbolArray = Array.from(symbols);
      return symbolArray.map((sym, index) => ({
        key: sym,
        name: sym,
        color: getColorForIndex(index, symbolArray.length)
      }));
    }
  }, [snapshots, filterCategory]);

  if (snapshots.length === 0) {
     return (
       <div className="w-full h-[250px] flex flex-col items-center justify-center text-slate-400 border border-dashed border-slate-200 rounded-xl bg-slate-50">
         <p className="font-serif italic text-sm">尚未有日記紀錄</p>
         <p className="text-xs mt-1">請選擇日期並點擊「歸檔今日資產」</p>
       </div>
     );
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      // Reverse payload to show stack order top-down
      const sortedPayload = [...payload].reverse();
      const total = sortedPayload.reduce((sum: number, p: any) => sum + p.value, 0);

      return (
        <div className="bg-white p-3 rounded-none shadow-xl border border-slate-900 text-xs ring-1 ring-slate-100 min-w-[160px]">
          <p className="font-bold text-slate-900 mb-2 border-b border-slate-200 pb-1 font-mono">{label}</p>
          
          <div className="max-h-[150px] overflow-y-auto custom-scrollbar">
            {sortedPayload.map((p: any, index: number) => (
              <div key={index} className="flex items-center gap-3 mb-1">
                <div className="flex items-center gap-1.5 min-w-0 flex-1">
                  <div className="w-2 h-2 shrink-0" style={{ backgroundColor: p.color }}></div>
                  <span className="text-slate-500 font-medium truncate" title={p.name}>
                      {p.name}
                  </span>
                </div>
                <span className="font-mono font-bold text-slate-800">
                    ${(p.value / 1000).toFixed(0)}k
                </span>
              </div>
            ))}
          </div>
          
          <div className="mt-2 pt-2 border-t border-slate-200 flex justify-between font-bold text-slate-900">
            <span className="uppercase tracking-wider">Total</span>
            <span className="font-mono">${total.toLocaleString()}</span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full h-[250px]">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={chartData}
          margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
          onClick={(e) => {
            if (e && e.activePayload && e.activePayload.length > 0) {
               // Retrieve the hidden fullDate field from the payload
               const clickedDate = e.activePayload[0].payload.fullDate;
               if (clickedDate) {
                 onDateSelect(clickedDate);
               }
            }
          }}
          style={{ cursor: 'pointer' }}
        >
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
          <XAxis 
            dataKey="date" 
            axisLine={false} 
            tickLine={false} 
            tick={{fontSize: 10, fill: '#64748b', fontFamily: 'monospace'}} 
            dy={10}
          />
          <YAxis 
            hide={true} 
            domain={['auto', 'auto']}
          />
          <Tooltip content={<CustomTooltip />} />
          
          {dataKeys.map((k) => (
             <Area 
               key={k.key}
               type="monotone" 
               dataKey={k.key} 
               name={k.name}
               stackId="1" 
               stroke={k.color} 
               fill={k.color} 
               fillOpacity={filterCategory === 'All' ? 1 : 0.8}
               strokeWidth={1}
             />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

// Helper to generate distinct monochromatic shades
function getColorForIndex(index: number, total: number): string {
  // Base Slate colors from 900 to 200
  const palette = [
    '#0f172a', // Slate 900
    '#334155', // Slate 700
    '#64748b', // Slate 500
    '#94a3b8', // Slate 400
    '#cbd5e1', // Slate 300
    '#e2e8f0'  // Slate 200
  ];
  
  if (total <= palette.length) {
    return palette[index % palette.length];
  }
  
  // If more items than palette, interpolate simply by cycling
  return palette[index % palette.length];
}

export default TrendChart;