/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * ThunderstormBackground — Cinematic SVG weather background.
 * Pure React + inline SVG + CSS keyframes. No video/WebGL.
 *
 * Features:
 * - Deep gradient background (indigo → slate → near-black)
 * - Parallax-drifting SVG clouds at multiple depths
 * - Rapid CSS background flashes for lightning
 * - Falling semi-transparent lines for rain
 * - GPU-accelerated with `will-change` and `transform`
 */

import React, { useState, useEffect, useCallback } from "react";

interface ThunderstormBackgroundProps {
  /** Weather condition text to determine which effects to show */
  condition: string;
  /** Intensity: 0 = subtle, 1 = moderate, 2 = intense */
  intensity?: number;
}

// ── Cloud SVG rendered inline for performance ──
function CloudShape({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg
      viewBox="0 0 200 100"
      fill="none"
      className={className}
      style={{ ...style, willChange: "transform" }}
    >
      <path
        d="M30 80 Q30 55 55 55 Q55 30 85 35 Q100 15 130 25 Q160 15 170 40 Q195 40 195 60 Q195 80 170 80 Z"
        fill="currentColor"
        opacity="0.15"
      />
    </svg>
  );
}

export default function ThunderstormBackground({ condition, intensity = 1 }: ThunderstormBackgroundProps) {
  const [flash, setFlash] = useState(false);
  const cond = condition.toLowerCase();

  const isThunderstorm = cond.includes("thunderstorm") || cond.includes("lightning") || cond.includes("storm");
  const isRain = cond.includes("rain") || cond.includes("drizzle") || cond.includes("shower");
  const showLightning = isThunderstorm;
  const showRain = isRain || isThunderstorm;

  // ── Lightning flash at random intervals ──
  const triggerFlash = useCallback(() => {
    if (!showLightning) return;
    setFlash(true);
    const flashDuration = 80 + Math.random() * 120;
    setTimeout(() => setFlash(false), flashDuration);
  }, [showLightning]);

  useEffect(() => {
    if (!showLightning) return;
    const scheduleFlash = () => {
      const delay = 2000 + Math.random() * 6000; // 2–8s between flashes
      return setTimeout(() => {
        triggerFlash();
        timerId = scheduleFlash();
      }, delay);
    };
    let timerId = scheduleFlash();
    return () => clearTimeout(timerId);
  }, [showLightning, triggerFlash]);

  const rainCount = intensity === 2 ? 30 : intensity === 1 ? 18 : 10;

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
      {/* Deep gradient base */}
      <div
        className="absolute inset-0 transition-colors duration-300"
        style={{
          background: isThunderstorm
            ? "linear-gradient(170deg, rgba(30,15,60,0.6) 0%, rgba(15,23,42,0.8) 40%, rgba(2,6,18,0.95) 100%)"
            : "linear-gradient(170deg, rgba(20,30,70,0.4) 0%, rgba(15,23,42,0.6) 50%, rgba(2,6,18,0.9) 100%)",
        }}
      />

      {/* Lightning flash overlay */}
      {flash && (
        <div
          className="absolute inset-0 z-10"
          style={{
            background: "radial-gradient(ellipse at 60% 20%, rgba(200,210,255,0.25) 0%, transparent 60%)",
            animation: "lightning-flash 0.15s ease-out",
          }}
        />
      )}

      {/* Parallax clouds — 3 depth layers */}
      <CloudShape
        className="absolute text-slate-400 w-[280px] h-[140px] opacity-[0.12]"
        style={{
          top: "8%",
          animation: "cloud-parallax-slow 45s linear infinite",
        }}
      />
      <CloudShape
        className="absolute text-slate-500 w-[200px] h-[100px] opacity-[0.08]"
        style={{
          top: "22%",
          animation: "cloud-parallax-mid 30s linear infinite",
          animationDelay: "-12s",
        }}
      />
      <CloudShape
        className="absolute text-indigo-400 w-[160px] h-[80px] opacity-[0.06]"
        style={{
          top: "35%",
          animation: "cloud-parallax-fast 20s linear infinite",
          animationDelay: "-5s",
        }}
      />

      {/* Rain lines */}
      {showRain && (
        <div className="absolute inset-0 overflow-hidden">
          {Array.from({ length: rainCount }).map((_, i) => (
            <div
              key={`rain-${i}`}
              className="absolute"
              style={{
                left: `${(i / rainCount) * 100 + Math.random() * 5}%`,
                top: `${-10 - Math.random() * 20}%`,
                width: "1.5px",
                height: `${16 + Math.random() * 24}px`,
                background: "linear-gradient(to bottom, transparent, rgba(148,197,233,0.5))",
                animation: `rain-streak ${0.5 + Math.random() * 0.4}s linear infinite`,
                animationDelay: `${Math.random() * 2}s`,
                willChange: "transform",
                transform: "rotate(12deg)",
              }}
            />
          ))}
        </div>
      )}

      {/* Lightning bolt SVG (appears during flash) */}
      {flash && showLightning && (
        <svg
          className="absolute z-20 opacity-60"
          style={{
            top: "5%",
            left: `${30 + Math.random() * 40}%`,
            width: "40px",
            height: "120px",
          }}
          viewBox="0 0 40 120"
          fill="none"
        >
          <path
            d="M22 0 L10 50 L20 50 L8 120 L30 60 L18 60 L30 0 Z"
            fill="rgba(200,210,255,0.7)"
            filter="blur(1px)"
          />
        </svg>
      )}

      {/* Inline keyframes */}
      <style>{`
        @keyframes cloud-parallax-slow {
          0% { transform: translateX(-30%); }
          100% { transform: translateX(120%); }
        }
        @keyframes cloud-parallax-mid {
          0% { transform: translateX(-25%); }
          100% { transform: translateX(125%); }
        }
        @keyframes cloud-parallax-fast {
          0% { transform: translateX(-20%); }
          100% { transform: translateX(130%); }
        }
        @keyframes rain-streak {
          0% { transform: translateY(-30px) rotate(12deg); opacity: 0; }
          20% { opacity: 0.6; }
          100% { transform: translateY(500px) rotate(12deg); opacity: 0; }
        }
        @keyframes lightning-flash {
          0% { opacity: 1; }
          100% { opacity: 0; }
        }
      `}</style>
    </div>
  );
}
