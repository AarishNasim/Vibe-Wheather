/**
 * UserHeader — Top bar showing user info, logout, and unit toggle
 */

import React from "react";
import { CloudSun, LogOut, Thermometer } from "lucide-react";
import { User } from "../types";

interface UserHeaderProps {
  user: User;
  isCelsius: boolean;
  onToggleUnit: () => void;
  onLogout: () => void;
}

function getAvatarColor(username: string): string {
  const colors = [
    "from-cyan-500 to-blue-600",
    "from-violet-500 to-purple-600",
    "from-emerald-500 to-teal-600",
    "from-rose-500 to-pink-600",
    "from-amber-500 to-orange-600",
    "from-sky-500 to-indigo-600",
  ];
  let hash = 0;
  for (let i = 0; i < username.length; i++) {
    hash = username.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

export default function UserHeader({ user, isCelsius, onToggleUnit, onLogout }: UserHeaderProps) {
  const initials = user.username.slice(0, 2).toUpperCase();
  const avatarGradient = getAvatarColor(user.username);

  return (
    <div className="shrink-0 px-4 py-3 flex items-center justify-between border-b border-white/8 z-20 bg-black/20 backdrop-blur-md">
      {/* Brand */}
      <div className="flex items-center gap-2">
        <CloudSun className="w-5 h-5 text-cyan-400" />
        <span className="text-base font-extrabold text-gradient tracking-tight">Vibe Weather</span>
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-2">
        {/* Unit Toggle */}
        <div className="flex items-center bg-black/30 border border-white/10 rounded-xl p-1 gap-0.5">
          <button
            id="btn-unit-c"
            onClick={() => !isCelsius && onToggleUnit()}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all duration-200 ${
              isCelsius
                ? "bg-cyan-500 text-slate-950 shadow-sm shadow-cyan-500/30"
                : "text-slate-400 hover:text-white"
            }`}
          >
            °C
          </button>
          <button
            id="btn-unit-f"
            onClick={() => isCelsius && onToggleUnit()}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all duration-200 ${
              !isCelsius
                ? "bg-cyan-500 text-slate-950 shadow-sm shadow-cyan-500/30"
                : "text-slate-400 hover:text-white"
            }`}
          >
            °F
          </button>
        </div>

        {/* Avatar + Logout */}
        <div className="relative group">
          <div
            title={user.username}
            className={`w-8 h-8 rounded-xl bg-gradient-to-br ${avatarGradient} flex items-center justify-center text-[11px] font-extrabold text-white cursor-pointer shadow-md transition-transform group-hover:scale-105`}
          >
            {initials}
          </div>
          {/* Tooltip dropdown on hover */}
          <div className="absolute right-0 top-full mt-2 glass-dark rounded-2xl p-3 shadow-2xl border border-white/10 min-w-[140px] opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-all duration-200 z-50">
            <p className="text-xs font-bold text-white mb-0.5">@{user.username}</p>
            <p className="text-[10px] text-slate-400 mb-3">Logged in</p>
            <button
              id="btn-logout"
              onClick={onLogout}
              className="w-full flex items-center gap-2 text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 px-2 py-1.5 rounded-xl transition-all duration-150"
            >
              <LogOut className="w-3.5 h-3.5" />
              Log Out
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
