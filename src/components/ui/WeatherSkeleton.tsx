/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * WeatherSkeleton — Pulsing skeleton loader that mirrors the
 * exact layout of the weather dashboard to reduce layout shift.
 * Replaces the spinning wheel loading state.
 */

import React from "react";
import GlassCard from "./GlassCard";

export default function WeatherSkeleton() {
  return (
    <div className="space-y-5 animate-pulse">
      {/* City header + temperature hero skeleton */}
      <GlassCard variant="heavy" animate={false} className="py-6 px-5">
        <div className="flex flex-col items-center text-center space-y-4">
          {/* City name bar */}
          <div className="flex items-center gap-2">
            <div className="w-3.5 h-3.5 rounded-full bg-slate-700" />
            <div className="h-3 w-24 bg-slate-700 rounded-lg" />
          </div>

          {/* Temperature + icon block */}
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 rounded-2xl bg-slate-700/60" />
            <div className="space-y-2">
              <div className="h-12 w-24 bg-slate-700 rounded-xl" />
              <div className="h-2.5 w-20 bg-slate-800 rounded-lg" />
            </div>
          </div>

          {/* Condition badge */}
          <div className="h-5 w-28 bg-slate-700/50 rounded-full" />
        </div>
      </GlassCard>

      {/* 2×2 stats grid skeleton */}
      <div className="grid grid-cols-2 gap-3">
        {[0, 1].map((i) => (
          <GlassCard key={`stat-${i}`} animate={false} className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-700/50" />
              <div className="space-y-1.5">
                <div className="h-2 w-14 bg-slate-800 rounded" />
                <div className="h-3.5 w-12 bg-slate-700 rounded" />
              </div>
            </div>
          </GlassCard>
        ))}
        <GlassCard animate={false} className="p-4 col-span-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-700/50" />
            <div className="flex-1 flex justify-between items-center">
              <div className="space-y-1.5">
                <div className="h-2 w-14 bg-slate-800 rounded" />
                <div className="h-3.5 w-16 bg-slate-700 rounded" />
              </div>
              <div className="h-5 w-16 bg-slate-700/40 rounded-lg" />
            </div>
          </div>
        </GlassCard>
      </div>

      {/* Temperature trend chart skeleton */}
      <GlassCard animate={false} className="p-5">
        <div className="h-2.5 w-32 bg-slate-800 rounded mb-3" />
        <div className="h-[120px] w-full bg-slate-800/30 rounded-2xl relative overflow-hidden">
          {/* Simulated wave shape */}
          <div
            className="absolute bottom-0 left-0 right-0 h-[60%] rounded-b-2xl"
            style={{
              background:
                "linear-gradient(to top, rgba(6,182,212,0.08), transparent)",
            }}
          />
        </div>
      </GlassCard>

      {/* AI suggestions skeleton */}
      <GlassCard animate={false} className="p-5">
        <div className="flex items-center gap-1.5 mb-3">
          <div className="w-4 h-4 rounded bg-slate-700" />
          <div className="h-2.5 w-20 bg-slate-700 rounded" />
        </div>
        <div className="space-y-2.5">
          {[0, 1, 2].map((i) => (
            <div key={`tip-${i}`} className="flex gap-2.5 items-start">
              <div className="w-1.5 h-1.5 rounded-full bg-slate-700 mt-1.5 shrink-0" />
              <div className="h-2.5 bg-slate-800 rounded w-full" style={{ width: `${75 - i * 12}%` }} />
            </div>
          ))}
        </div>
      </GlassCard>

      {/* 5-day forecast skeleton */}
      <div>
        <div className="h-2.5 w-40 bg-slate-800 rounded mb-3 ml-1" />
        <div className="space-y-2">
          {[0, 1, 2, 3, 4].map((i) => (
            <GlassCard key={`fc-${i}`} animate={false} className="p-3.5">
              <div className="flex items-center justify-between">
                <div className="w-14 space-y-1">
                  <div className="h-3 w-10 bg-slate-700 rounded" />
                  <div className="h-2 w-12 bg-slate-800 rounded" />
                </div>
                <div className="flex items-center gap-2 flex-1 ml-4">
                  <div className="w-6 h-6 rounded bg-slate-700/50" />
                  <div className="h-2.5 w-16 bg-slate-800 rounded" />
                </div>
                <div className="flex items-center gap-3">
                  <div className="h-2 w-8 bg-slate-800 rounded" />
                  <div className="w-16 flex gap-1.5">
                    <div className="h-3 w-7 bg-slate-700 rounded" />
                    <div className="h-3 w-7 bg-slate-800 rounded" />
                  </div>
                </div>
              </div>
            </GlassCard>
          ))}
        </div>
      </div>
    </div>
  );
}
