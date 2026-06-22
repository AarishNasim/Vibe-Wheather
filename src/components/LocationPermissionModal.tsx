/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * LocationPermissionModal — "Soft Prompt" for Geolocation
 *
 * Instead of aggressively triggering the native browser geolocation
 * prompt on boot, this modal explains WHY the app needs location
 * data and lets the user choose. This builds trust and reduces
 * permission rejection rates.
 */

import React from "react";
import { MapPin, Navigation, Shield, X, Loader2, AlertTriangle } from "lucide-react";

interface LocationPermissionModalProps {
  /** Whether the modal is visible */
  isOpen: boolean;
  /** Whether geolocation is currently resolving */
  isLoading: boolean;
  /** Error message if native prompt was denied or timed out */
  error: string | null;
  /** Called when user clicks "Allow Location" */
  onAllow: () => void;
  /** Called when user clicks "Continue Without" (fallback) */
  onSkip: () => void;
  /** Called to dismiss modal entirely */
  onClose: () => void;
}

export default function LocationPermissionModal({
  isOpen,
  isLoading,
  error,
  onAllow,
  onSkip,
  onClose,
}: LocationPermissionModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]"
        onClick={onClose}
      />

      {/* Modal Card */}
      <div
        className="relative w-full max-w-sm rounded-3xl border border-white/10 shadow-2xl overflow-hidden animate-[slideUp_0.3s_ease-out]"
        style={{
          background: "linear-gradient(145deg, rgba(15,23,42,0.98) 0%, rgba(8,12,28,0.99) 100%)",
        }}
      >
        {/* Decorative glow */}
        <div className="absolute -top-12 -right-12 w-32 h-32 bg-cyan-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-8 -left-8 w-24 h-24 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

        {/* Close button */}
        <button
          id="btn-location-modal-close"
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-400 hover:text-slate-200 transition z-10"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="relative p-6 pt-8 z-10">
          {/* Icon header */}
          <div className="flex justify-center mb-5">
            <div className="relative">
              <div className="absolute inset-0 bg-cyan-500/20 rounded-full blur-xl scale-150 animate-pulse" />
              <div className="relative p-4 bg-gradient-to-br from-cyan-500/20 to-indigo-500/20 border border-cyan-500/30 rounded-2xl">
                <MapPin className="w-8 h-8 text-cyan-400" />
              </div>
            </div>
          </div>

          {/* Title */}
          <h3 className="text-center text-lg font-bold text-slate-100 tracking-tight mb-2">
            Enable Location Services
          </h3>
          <p className="text-center text-xs text-slate-400 leading-relaxed mb-6 max-w-[260px] mx-auto">
            AeroCast uses your location to deliver <span className="text-cyan-400 font-semibold">hyper-local weather data</span>,
            accurate forecasts, and personalized AI recommendations for your exact area.
          </p>

          {/* Trust indicators */}
          <div className="space-y-2.5 mb-6">
            <div className="flex items-center gap-3 p-3 bg-white/5 rounded-2xl border border-white/5">
              <div className="p-1.5 bg-cyan-500/10 rounded-lg shrink-0">
                <Navigation className="w-3.5 h-3.5 text-cyan-400" />
              </div>
              <div>
                <span className="block text-[11px] font-semibold text-slate-200">Precise Forecasts</span>
                <span className="block text-[10px] text-slate-400 font-mono">Temperature, wind, and humidity for your area</span>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-white/5 rounded-2xl border border-white/5">
              <div className="p-1.5 bg-emerald-500/10 rounded-lg shrink-0">
                <Shield className="w-3.5 h-3.5 text-emerald-400" />
              </div>
              <div>
                <span className="block text-[11px] font-semibold text-slate-200">Privacy First</span>
                <span className="block text-[10px] text-slate-400 font-mono">Coordinates never stored — used once per request</span>
              </div>
            </div>
          </div>

          {/* Error message */}
          {error && (
            <div className="mb-4 p-3 bg-amber-950/40 border border-amber-500/20 rounded-2xl flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <p className="text-[11px] text-amber-200 leading-relaxed">{error}</p>
            </div>
          )}

          {/* Action buttons */}
          <div className="space-y-2.5">
            <button
              id="btn-location-allow"
              onClick={onAllow}
              disabled={isLoading}
              className="w-full py-3.5 bg-gradient-to-r from-cyan-500 to-cyan-400 hover:from-cyan-400 hover:to-cyan-300 text-slate-900 font-bold text-xs rounded-2xl transition-all duration-200 shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed active:scale-[0.98]"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Locating you...</span>
                </>
              ) : (
                <>
                  <Navigation className="w-4 h-4 fill-slate-900" />
                  <span>Allow Location</span>
                </>
              )}
            </button>

            <button
              id="btn-location-skip"
              onClick={onSkip}
              disabled={isLoading}
              className="w-full py-3 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-slate-100 font-semibold text-xs rounded-2xl transition-all duration-200 border border-white/10 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Continue without location
            </button>
          </div>

          {/* Footnote */}
          <p className="text-center text-[9px] text-slate-500 mt-4 font-mono tracking-wide">
            You can always search for a city manually
          </p>
        </div>
      </div>

      {/* Inline keyframes */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px) scale(0.97); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
}
