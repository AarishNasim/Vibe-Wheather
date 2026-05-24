/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { 
  Settings, 
  HelpCircle, 
  Smartphone, 
  RotateCcw, 
  BellRing, 
  Globe, 
  Check, 
  Cpu, 
  Files
} from "lucide-react";

interface SettingsPanelProps {
  isCelsius: boolean;
  onToggleUnit: () => void;
  notificationsEnabled: boolean;
  onToggleNotifications: () => void;
  onClearCache: () => void;
}

export default function SettingsPanel({
  isCelsius,
  onToggleUnit,
  notificationsEnabled,
  onToggleNotifications,
  onClearCache,
}: SettingsPanelProps) {
  const [copiedText, setCopiedText] = useState(false);

  const copyBuildSteps = () => {
    const steps = `npm install @capacitor/core @capacitor/cli @capacitor/android
npx cap init AeroCast com.aerocast.weather --web-dir=dist
npm run build
npx cap add android
npx cap sync
npx cap open android`;
    navigator.clipboard.writeText(steps);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2000);
  };

  return (
    <div className="glass border border-white/10 rounded-3xl p-6 shadow-2xl max-w-md mx-auto space-y-6 text-sans relative overflow-hidden">
      <div className="absolute -top-10 -right-10 w-24 h-24 bg-cyan-500/10 rounded-full blur-2xl" />
      {/* Title Section */}
      <div className="border-b border-white/5 pb-4 z-10 relative">
        <h3 className="text-sm font-bold text-gradient flex items-center gap-2 uppercase tracking-wider">
          <Settings className="w-4 h-4 text-cyan-400 animate-spin-slow" /> Settings & System Info
        </h3>
        <p className="text-[10px] text-slate-450 font-mono">Personalize experience & review mobile build parameters</p>
      </div>

      {/* Basic Metrics Settings row */}
      <div className="space-y-4 z-10 relative">
        <div className="flex items-center justify-between p-3.5 bg-white/5 border border-white/5 rounded-2xl">
          <div>
            <span className="block text-xs font-semibold text-slate-200">Measurement Unit</span>
            <span className="block text-[10px] text-slate-450 font-mono">Toggle Metric and Imperial</span>
          </div>
          <div className="flex bg-black/40 border border-white/5 rounded-xl p-1 shrink-0">
            <button
              id="btn-unit-cels"
              onClick={() => !isCelsius && onToggleUnit()}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition duration-150 cursor-pointer ${
                isCelsius ? "bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/10" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              °C
            </button>
            <button
              id="btn-unit-fahr"
              onClick={() => isCelsius && onToggleUnit()}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition duration-150 cursor-pointer ${
                !isCelsius ? "bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/10" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              °F
            </button>
          </div>
        </div>

        {/* Dynamic notify preferences toggle */}
        <div className="flex items-center justify-between p-3.5 bg-white/5 border border-white/5 rounded-2xl">
          <div>
            <span className="block text-xs font-semibold text-slate-200">Extreme Notifications</span>
            <span className="block text-[10px] text-slate-450 font-mono">Toasts during extreme temperature shifts</span>
          </div>
          <button
            id="btn-toggle-notif"
            onClick={onToggleNotifications}
            className={`w-11 h-6 rounded-full transition duration-300 relative border cursor-pointer ${
              notificationsEnabled 
                ? "bg-cyan-500 border-cyan-400" 
                : "bg-slate-950 border-white/5"
            }`}
          >
            <span 
              className={`absolute top-0.5 w-4.5 h-4.5 rounded-full transition-all duration-300 ${
                notificationsEnabled ? "left-5.5 bg-slate-950" : "left-0.5 bg-slate-400"
              }`} 
            />
          </button>
        </div>
      </div>

      {/* Local storage maintenance utility */}
      <div className="space-y-3 z-10 relative">
        <span className="text-[9px] font-bold text-slate-450 uppercase tracking-widest pl-1 block font-mono">Maintenance</span>
        <button
          id="btn-clear-cache"
          onClick={onClearCache}
          className="w-full text-left p-3.5 bg-rose-500/5 hover:bg-rose-500/10 text-xs border border-rose-500/10 rounded-2xl flex items-center justify-between transition group cursor-pointer"
        >
          <div>
            <span className="block text-rose-400 font-semibold group-hover:text-rose-300">Purge Cached Storage</span>
            <span className="block text-[10px] text-rose-500/85 mt-0.5 font-mono">Clears saved weather and high scores</span>
          </div>
          <RotateCcw className="w-4 h-4 text-rose-400" />
        </button>
      </div>

      {/* Capacitor builder details info panel */}
      <div className="bg-white/5 border border-white/5 rounded-2xl p-4 space-y-3 relative overflow-hidden z-10">
        <div className="flex items-center gap-1.5 text-xs text-cyan-400 font-bold mb-1 uppercase tracking-wider">
          <Smartphone className="w-4 h-4 text-cyan-400" /> Bundler Guide (Capacitor Build)
        </div>
        <p className="text-[11px] leading-relaxed text-slate-350">
          AeroCast compiles naturally into a lightweight native Android wrapper with Capacitor/Cordova frameworks.
        </p>

        <div className="relative bg-black/40 border border-white/5 rounded-xl p-3 font-mono text-[9px] text-slate-300 leading-normal block overflow-x-auto select-all">
          <button
            id="btn-copy-build"
            onClick={copyBuildSteps}
            title="Copy command scripts"
            className="absolute top-2 right-2 p-1 bg-white/5 hover:bg-white/10 rounded border border-white/10 transition"
          >
            {copiedText ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Files className="w-3.5 h-3.5 text-slate-400" />}
          </button>
          <span className="block text-cyan-400"># Install & bundle commands</span>
          <span className="block">npm install @capacitor/core @capacitor/cli @capacitor/android</span>
          <span className="block">npx cap init AeroCast com.aerocast.weather --web-dir=dist</span>
          <span className="block">npm run build</span>
          <span className="block">npx cap add android</span>
          <span className="block">npx cap sync</span>
        </div>
      </div>

      {/* System specifications specifications info bottom lines */}
      <div className="grid grid-cols-2 gap-2 border-t border-white/5 pt-4 z-10 relative font-sans">
        <div className="p-2.5 bg-white/5 border border-white/5 rounded-xl text-center">
          <Globe className="w-4 h-4 text-cyan-400 mx-auto mb-1" />
          <span className="block text-[9px] text-slate-500 font-mono">Service Gateway</span>
          <span className="block text-[10px] font-semibold text-slate-350">Open-Meteo Net</span>
        </div>
        <div className="p-2.5 bg-slate-900/20 border border-white/5 rounded-xl text-center">
          <Cpu className="w-4 h-4 text-cyan-400 mx-auto mb-1" />
          <span className="block text-[9px] text-slate-500 font-mono">AI Core Model</span>
          <span className="block text-[10px] font-semibold text-slate-355">Gemini 3.5 Flash</span>
        </div>
      </div>
    </div>
  );
}
