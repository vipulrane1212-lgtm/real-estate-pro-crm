'use client';

import React, { useState } from 'react';
import { Calendar, TrendingUp, DollarSign } from 'lucide-react';

export interface DailySpendPoint {
  date: string;
  label: string;
  total: number;
  count: number;
}

interface Expenses30DayChartProps {
  data: DailySpendPoint[];
  monthTotal: number;
  todayTotal: number;
  selectedDate?: string | null;
  onSelectDate?: (date: string | null) => void;
  variant?: 'full' | 'compact';
}

export function Expenses30DayChart({
  data,
  monthTotal,
  todayTotal,
  selectedDate,
  onSelectDate,
  variant = 'full',
}: Expenses30DayChartProps) {
  const [hoveredPoint, setHoveredPoint] = useState<DailySpendPoint | null>(null);

  // Determine max spend for scale
  const maxSpend = Math.max(...data.map((d) => d.total), 1000);
  const chartHeight = variant === 'compact' ? 120 : 200;

  return (
    <div className={`bg-white rounded-xl border border-slate-200 shadow-sm ${variant === 'compact' ? 'p-4' : 'p-6'}`}>
      {/* Header with KPI totals */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-amber-600" />
            <h3 className={`font-semibold text-slate-900 ${variant === 'compact' ? 'text-sm' : 'text-base'}`}>
              Daily Expenses (Last 30 Days)
            </h3>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Real daily spend across all office and field expenses
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 flex items-center gap-2">
            <span className="text-xs text-slate-500 font-medium">Today:</span>
            <span className="text-xs sm:text-sm font-bold text-slate-900">
              ₹{todayTotal.toLocaleString('en-IN')}
            </span>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5 flex items-center gap-2">
            <span className="text-xs text-amber-700 font-medium">Month Total:</span>
            <span className="text-xs sm:text-sm font-bold text-amber-900">
              ₹{monthTotal.toLocaleString('en-IN')}
            </span>
          </div>
        </div>
      </div>

      {/* Selected Day indicator filter badge */}
      {selectedDate && onSelectDate && (
        <div className="mb-3 flex items-center justify-between bg-amber-50/70 border border-amber-200 rounded-lg px-3 py-1.5 text-xs">
          <span className="text-amber-800 font-medium">
            Filtering expenses for: <strong className="font-semibold">{selectedDate}</strong>
          </span>
          <button
            onClick={() => onSelectDate(null)}
            className="text-amber-700 hover:text-amber-900 underline font-medium cursor-pointer"
          >
            Show All Days
          </button>
        </div>
      )}

      {/* SVG Bar Chart */}
      <div className="relative">
        {hoveredPoint && (
          <div
            className="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-xs py-1 px-2.5 rounded shadow-lg pointer-events-none z-10 whitespace-nowrap"
          >
            <div className="font-semibold">{hoveredPoint.label} ({hoveredPoint.date})</div>
            <div>
              ₹{hoveredPoint.total.toLocaleString('en-IN')} ({hoveredPoint.count} expense{hoveredPoint.count === 1 ? '' : 's'})
            </div>
          </div>
        )}

        <div
          className="flex items-end gap-1 sm:gap-1.5 w-full pt-6 pb-2 px-1 overflow-x-auto"
          style={{ minHeight: `${chartHeight}px` }}
        >
          {data.map((point) => {
            const heightPercent = point.total > 0 ? Math.max(8, (point.total / maxSpend) * 100) : 0;
            const isSelected = selectedDate === point.date;

            return (
              <div
                key={point.date}
                className="flex-1 flex flex-col items-center justify-end h-full min-w-[14px] sm:min-w-[18px] group cursor-pointer"
                onMouseEnter={() => setHoveredPoint(point)}
                onMouseLeave={() => setHoveredPoint(null)}
                onClick={() => onSelectDate && onSelectDate(isSelected ? null : point.date)}
              >
                {/* Bar */}
                <div
                  className="w-full flex items-end justify-center rounded-t-sm transition-all duration-150"
                  style={{ height: `${chartHeight - 30}px` }}
                >
                  {point.total > 0 ? (
                    <div
                      style={{ height: `${heightPercent}%` }}
                      className={`w-full rounded-t transition-all duration-200 ${
                        isSelected
                          ? 'bg-amber-600 ring-2 ring-amber-400'
                          : 'bg-slate-700 group-hover:bg-amber-500'
                      }`}
                    />
                  ) : (
                    <div className="w-full h-0.5 bg-slate-200 group-hover:bg-slate-400 rounded" />
                  )}
                </div>

                {/* Date Label on x-axis */}
                {variant !== 'compact' && (
                  <span className="text-[9px] text-slate-400 mt-1 truncate max-w-full scale-90 select-none">
                    {point.label.split(' ')[0]}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-100 pt-2 mt-1">
        <span>{data[0]?.label || '30 days ago'}</span>
        <span className="flex items-center gap-1 text-slate-500">
          <Calendar className="h-3 w-3" /> Click any bar to filter expenses for that day
        </span>
        <span>Today ({data[data.length - 1]?.label || 'Now'})</span>
      </div>
    </div>
  );
}
