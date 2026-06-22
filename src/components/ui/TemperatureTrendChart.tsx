/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * TemperatureTrendChart — Minimalist Recharts AreaChart.
 * Smooth curve, no axes, no grid, no borders.
 * Sleek cyan stroke with linear gradient fill fading into transparency.
 * Uses real hourly temperature data from Open-Meteo.
 */

import React from "react";
import {
  AreaChart,
  Area,
  ResponsiveContainer,
  Tooltip,
  XAxis,
} from "recharts";
import GlassCard from "./GlassCard";

interface HourlyDataPoint {
  time: string;
  temp: number;
}

interface TemperatureTrendChartProps {
  /** Hourly temperature data from the API */
  hourlyData: HourlyDataPoint[];
  isCelsius: boolean;
}

/** Custom minimal tooltip */
function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.[0]) return null;
  const { time, temp } = payload[0].payload;

  // Format "2026-06-22T14:00" → "2 PM"
  let label = time;
  try {
    const d = new Date(time);
    label = d.toLocaleTimeString([], { hour: "numeric", hour12: true });
  } catch (_) {}

  return (
    <div className="bg-slate-900/90 backdrop-blur-sm border border-white/10 rounded-xl px-3 py-1.5 shadow-lg">
      <p className="text-[10px] text-slate-400 font-mono">{label}</p>
      <p className="text-xs font-bold text-cyan-300">{Math.round(temp)}°</p>
    </div>
  );
}

export default function TemperatureTrendChart({
  hourlyData,
  isCelsius,
}: TemperatureTrendChartProps) {
  if (!hourlyData || hourlyData.length === 0) return null;

  // Convert to Fahrenheit if needed
  const chartData = hourlyData.map((d) => ({
    ...d,
    temp: isCelsius ? d.temp : (d.temp * 9) / 5 + 32,
  }));

  return (
    <GlassCard variant="default" className="p-5 relative overflow-hidden">
      <div className="absolute -top-8 -right-8 w-20 h-20 bg-cyan-500/10 rounded-full blur-2xl pointer-events-none" />
      <h4 className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-3 px-1">
        24-Hour Temperature Trend
      </h4>
      <div className="h-[130px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 5, right: 5, bottom: 0, left: 5 }}>
            <defs>
              <linearGradient id="tempGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#06b6d4" stopOpacity={0.35} />
                <stop offset="50%" stopColor="#06b6d4" stopOpacity={0.12} />
                <stop offset="100%" stopColor="#06b6d4" stopOpacity={0} />
              </linearGradient>
            </defs>

            {/* Hidden XAxis for Recharts to read data keys */}
            <XAxis dataKey="time" hide />

            <Tooltip
              content={<CustomTooltip />}
              cursor={{ stroke: "rgba(6,182,212,0.15)", strokeWidth: 1 }}
            />

            <Area
              type="monotone"
              dataKey="temp"
              stroke="#06b6d4"
              strokeWidth={2.5}
              fill="url(#tempGradient)"
              dot={false}
              activeDot={{
                r: 4,
                stroke: "#06b6d4",
                strokeWidth: 2,
                fill: "#0f172a",
              }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </GlassCard>
  );
}
