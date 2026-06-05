/**
 * WeatherDashboard — Enhanced with glass cards, 3×2 metric grid,
 * scrollable hourly forecast, and 5-day forecast on video background
 * @license SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import {
  Search,
  MapPin,
  Navigation,
  Wind,
  Droplets,
  Sun,
  Sparkles,
  Info,
  BellRing,
  RefreshCw,
  Thermometer,
  Eye,
  Gauge,
  Clock,
} from "lucide-react";
import { CurrentWeather, ForecastDay, AISuggestions, HourlyForecast } from "../types";
import { getWeatherIcon } from "../utils/weatherIcons";

interface WeatherDashboardProps {
  weatherData: { current: CurrentWeather; forecast: ForecastDay[]; hourly?: HourlyForecast[] } | null;
  aiSuggestions: AISuggestions | null;
  onSearch: (city: string, lat?: number, lon?: number) => void;
  onDetectLocation: () => void;
  isCelsius: boolean;
  isLoading: boolean;
  alertMessage: string | null;
  onDismissAlert: () => void;
}

// Generate simulated hourly data from current weather
function generateHourly(current: CurrentWeather): HourlyForecast[] {
  const now = new Date();
  return Array.from({ length: 24 }, (_, i) => {
    const hour = new Date(now.getTime() + i * 3600000);
    const hh = hour.getHours();
    const isDaytime = hh >= 6 && hh < 20;
    // Gentle sinusoidal temperature variation
    const variation = Math.sin((hh / 24) * Math.PI * 2 - Math.PI / 2) * 3.5;
    const temp_c = parseFloat((current.temp_c + variation).toFixed(1));
    const temp_f = parseFloat(((temp_c * 9) / 5 + 32).toFixed(1));
    return {
      time: `${String(hh).padStart(2, "0")}:00`,
      temp_c,
      temp_f,
      condition: current.condition,
      windspeed_kph: Math.round(current.wind_kph + (Math.random() - 0.5) * 8),
      humidity: Math.min(100, Math.max(10, current.humidity + Math.round((Math.random() - 0.5) * 10))),
    };
  });
}

export default function WeatherDashboard({
  weatherData,
  aiSuggestions,
  onSearch,
  onDetectLocation,
  isCelsius,
  isLoading,
  alertMessage,
  onDismissAlert,
}: WeatherDashboardProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [geoResults, setGeoResults] = useState<any[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);

  // Search autocomplete
  useEffect(() => {
    if (searchQuery.trim().length < 2) {
      setGeoResults([]);
      setShowDropdown(false);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`);
        if (res.ok) {
          const data = await res.json();
          setGeoResults(data.results || []);
          setShowDropdown(true);
        }
      } catch {}
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const selectSuggestion = (item: any) => {
    const label = `${item.name}${item.admin1 ? `, ${item.admin1}` : ""}, ${item.country}`;
    setSearchQuery(label);
    setShowDropdown(false);
    onSearch(item.name, item.latitude, item.longitude);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && searchQuery.trim().length > 0) {
      setShowDropdown(false);
      onSearch(searchQuery.trim());
    }
  };

  const curr = weatherData?.current;
  const hourly = weatherData?.hourly ?? (curr ? generateHourly(curr) : []);
  const now = new Date();
  const currentHour = now.getHours();
  const startIdx = hourly.findIndex((h) => parseInt(h.time) >= currentHour);
  const visibleHourly = startIdx >= 0 ? hourly.slice(startIdx, startIdx + 12) : hourly.slice(0, 12);

  // UV label helper
  const uvLabel = (uv: number) => {
    if (uv <= 2) return { text: "Low", color: "text-emerald-400" };
    if (uv <= 5) return { text: "Moderate", color: "text-yellow-400" };
    if (uv <= 7) return { text: "High", color: "text-orange-400" };
    return { text: "Very High", color: "text-red-400" };
  };

  return (
    <div className="space-y-4 pb-2">
      {/* Search Header */}
      <div className="flex flex-col gap-2 relative">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-slate-400" />
          </div>
          <input
            id="inp-city-search"
            type="text"
            className="w-full glass-card hover:bg-white/6 focus:bg-black/30 border-white/10 focus:border-cyan-500/40 rounded-2xl pl-10 pr-4 py-3 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-500/30 transition-all duration-200"
            placeholder="Search any city worldwide..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleKeyPress}
            onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
          />

          {/* Dropdown */}
          {showDropdown && geoResults.length > 0 && (
            <div className="absolute left-0 right-0 mt-1.5 glass-dark border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-50">
              {geoResults.map((item, idx) => (
                <button
                  id={`btn-geo-suggest-${idx}`}
                  key={idx}
                  type="button"
                  onMouseDown={() => selectSuggestion(item)}
                  className="w-full text-left px-4 py-3 text-xs text-slate-200 hover:bg-white/6 flex items-center gap-2 border-b border-white/5 last:border-0 transition"
                >
                  <MapPin className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  <span>
                    <strong className="text-slate-100">{item.name}</strong>
                    {item.admin1 ? ` (${item.admin1})` : ""}, {item.country}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <button
            id="btn-detect-location"
            onClick={onDetectLocation}
            className="flex-1 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 active:scale-[0.98] text-slate-950 rounded-2xl flex items-center justify-center gap-2 transition-all duration-200 font-bold text-xs shadow-lg shadow-cyan-500/20"
          >
            <Navigation className="h-4 w-4 fill-slate-950" />
            Detect Location
          </button>
          <button
            id="btn-refresh-dashboard"
            onClick={() => curr && onSearch(curr.city, curr.lat, curr.lon)}
            disabled={isLoading || !curr}
            className="p-3 glass-card hover:bg-white/10 rounded-2xl flex items-center justify-center transition disabled:opacity-40"
            title="Refresh"
          >
            <RefreshCw className={`h-4 w-4 text-cyan-400 ${isLoading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Alert Banner */}
      {alertMessage && (
        <div className="glass-card border-amber-500/20 bg-amber-950/20 rounded-2xl p-3.5 flex gap-3 items-start animate-slide-in-up">
          <BellRing className="w-4 h-4 text-amber-400 shrink-0 mt-0.5 animate-bounce" />
          <div className="flex-1">
            <span className="font-bold text-[11px] text-amber-300 block mb-0.5">Weather Alert</span>
            <p className="text-[11px] leading-relaxed text-amber-200/85">{alertMessage}</p>
          </div>
          <button
            id="btn-dismiss-alert"
            onClick={onDismissAlert}
            className="text-[10px] text-amber-400 hover:text-amber-200 font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* Main Content */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-16 space-y-4">
          <div className="relative">
            <div className="h-14 w-14 border-4 border-cyan-500/30 border-t-cyan-400 rounded-full animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="h-7 w-7 border-4 border-blue-500/30 border-t-blue-400 rounded-full animate-spin" style={{ animationDirection: "reverse" }} />
            </div>
          </div>
          <div className="text-center">
            <p className="text-sm font-semibold text-slate-200">Fetching live weather...</p>
            <p className="text-xs text-slate-400 mt-0.5">Syncing satellite data</p>
          </div>
        </div>
      ) : curr ? (
        <div className="space-y-4 animate-float-up">

          {/* ── CURRENT WEATHER HERO ── */}
          <div className="glass-card rounded-3xl p-5 relative overflow-hidden">
            {/* Ambient glow */}
            <div className="absolute -top-8 -right-8 w-36 h-36 bg-cyan-400/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-8 -left-8 w-28 h-28 bg-blue-500/8 rounded-full blur-3xl pointer-events-none" />

            <div className="relative z-10">
              {/* Location */}
              <div className="flex items-center gap-1.5 mb-3">
                <MapPin className="w-3.5 h-3.5 text-cyan-400" />
                <span className="text-[11px] font-bold uppercase tracking-widest text-slate-300">
                  {curr.city}
                </span>
                {curr.country && (
                  <span className="text-[10px] text-slate-500 font-mono">• {curr.country}</span>
                )}
              </div>

              {/* Temp + Icon */}
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-end gap-2">
                    <span className="text-6xl font-thin tracking-tighter text-gradient leading-none">
                      {isCelsius ? Math.round(curr.temp_c) : Math.round(curr.temp_f)}
                    </span>
                    <span className="text-2xl font-thin text-slate-400 mb-2">
                      {isCelsius ? "°C" : "°F"}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 font-mono mt-1">
                    Feels like{" "}
                    <span className="text-slate-300 font-semibold">
                      {isCelsius ? `${curr.feelslike_c}°C` : `${curr.feelslike_f}°F`}
                    </span>
                  </p>
                  <span className="inline-block mt-2 px-3 py-1 bg-cyan-500/10 border border-cyan-500/20 rounded-full text-[10px] font-bold text-cyan-300 uppercase tracking-wide">
                    {curr.condition.text}
                  </span>
                </div>
                <div className="mr-2">
                  {getWeatherIcon(
                    curr.condition.icon,
                    "w-20 h-20 filter drop-shadow-[0_4px_16px_rgba(6,182,212,0.35)]"
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* ── METRIC GRID 3×2 ── */}
          <div className="grid grid-cols-3 gap-2.5">
            {/* Humidity */}
            <div className="metric-card flex flex-col gap-2">
              <div className="p-2 bg-blue-500/10 border border-blue-500/15 rounded-xl w-fit">
                <Droplets className="w-4 h-4 text-blue-400" />
              </div>
              <div>
                <span className="block text-[9px] text-slate-500 font-bold uppercase tracking-wider">Humidity</span>
                <span className="font-mono text-sm font-bold text-slate-100">{curr.humidity}%</span>
              </div>
            </div>

            {/* Wind */}
            <div className="metric-card flex flex-col gap-2">
              <div className="p-2 bg-emerald-500/10 border border-emerald-500/15 rounded-xl w-fit">
                <Wind className="w-4 h-4 text-emerald-400" />
              </div>
              <div>
                <span className="block text-[9px] text-slate-500 font-bold uppercase tracking-wider">Wind</span>
                <span className="font-mono text-sm font-bold text-slate-100">
                  {isCelsius ? `${curr.wind_kph}` : `${curr.wind_mph}`}
                  <span className="text-[9px] text-slate-400 ml-0.5">{isCelsius ? "km/h" : "mph"}</span>
                </span>
              </div>
            </div>

            {/* UV Index */}
            <div className="metric-card flex flex-col gap-2">
              <div className="p-2 bg-amber-500/10 border border-amber-500/15 rounded-xl w-fit">
                <Sun className="w-4 h-4 text-amber-400" />
              </div>
              <div>
                <span className="block text-[9px] text-slate-500 font-bold uppercase tracking-wider">UV Index</span>
                <span className={`font-mono text-sm font-bold ${uvLabel(curr.uv).color}`}>
                  {curr.uv}
                </span>
                <span className={`block text-[9px] ${uvLabel(curr.uv).color} opacity-75`}>
                  {uvLabel(curr.uv).text}
                </span>
              </div>
            </div>

            {/* Feels Like */}
            <div className="metric-card flex flex-col gap-2">
              <div className="p-2 bg-rose-500/10 border border-rose-500/15 rounded-xl w-fit">
                <Thermometer className="w-4 h-4 text-rose-400" />
              </div>
              <div>
                <span className="block text-[9px] text-slate-500 font-bold uppercase tracking-wider">Feels Like</span>
                <span className="font-mono text-sm font-bold text-slate-100">
                  {isCelsius ? `${curr.feelslike_c}°C` : `${curr.feelslike_f}°F`}
                </span>
              </div>
            </div>

            {/* Visibility (simulated) */}
            <div className="metric-card flex flex-col gap-2">
              <div className="p-2 bg-violet-500/10 border border-violet-500/15 rounded-xl w-fit">
                <Eye className="w-4 h-4 text-violet-400" />
              </div>
              <div>
                <span className="block text-[9px] text-slate-500 font-bold uppercase tracking-wider">Visibility</span>
                <span className="font-mono text-sm font-bold text-slate-100">
                  {curr.condition.text.includes("Fog") ? "0.5" : curr.condition.text.includes("Cloudy") ? "8" : "16"}
                  <span className="text-[9px] text-slate-400 ml-0.5">km</span>
                </span>
              </div>
            </div>

            {/* Pressure (simulated) */}
            <div className="metric-card flex flex-col gap-2">
              <div className="p-2 bg-sky-500/10 border border-sky-500/15 rounded-xl w-fit">
                <Gauge className="w-4 h-4 text-sky-400" />
              </div>
              <div>
                <span className="block text-[9px] text-slate-500 font-bold uppercase tracking-wider">Pressure</span>
                <span className="font-mono text-sm font-bold text-slate-100">
                  1013
                  <span className="text-[9px] text-slate-400 ml-0.5">hPa</span>
                </span>
              </div>
            </div>
          </div>

          {/* ── HOURLY FORECAST SCROLL ── */}
          <div className="glass-card rounded-3xl p-4">
            <div className="flex items-center gap-1.5 mb-3">
              <Clock className="w-3.5 h-3.5 text-cyan-400" />
              <h4 className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">24-Hour Forecast</h4>
            </div>
            <div className="hourly-scroll">
              {visibleHourly.map((h, idx) => (
                <div
                  key={idx}
                  className={`flex flex-col items-center gap-2 px-3 py-3 rounded-2xl shrink-0 transition-all duration-200 ${
                    idx === 0
                      ? "bg-cyan-500/15 border border-cyan-500/25"
                      : "bg-white/4 hover:bg-white/8 border border-transparent"
                  }`}
                >
                  <span className={`text-[10px] font-bold ${idx === 0 ? "text-cyan-300" : "text-slate-400"}`}>
                    {idx === 0 ? "Now" : h.time}
                  </span>
                  {getWeatherIcon(h.condition.icon, "w-5 h-5")}
                  <span className={`text-xs font-bold ${idx === 0 ? "text-white" : "text-slate-300"}`}>
                    {isCelsius ? `${Math.round(h.temp_c)}°` : `${Math.round(h.temp_f)}°`}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* ── AI SUGGESTIONS ── */}
          {aiSuggestions && (
            <div className="glass-card rounded-3xl p-4 relative overflow-hidden">
              <div className="absolute -top-8 -right-8 w-24 h-24 bg-cyan-500/8 rounded-full blur-2xl pointer-events-none" />
              <div className="flex items-center gap-1.5 mb-3">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
                <h4 className="text-[10px] text-cyan-400 font-bold uppercase tracking-widest">AI Insights</h4>
                <span
                  className={`ml-auto text-[9px] font-bold px-2 py-0.5 rounded-full ${
                    aiSuggestions.status === "extreme"
                      ? "bg-red-500/15 text-red-400 border border-red-500/20"
                      : aiSuggestions.status === "warning"
                      ? "bg-amber-500/15 text-amber-400 border border-amber-500/20"
                      : "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20"
                  }`}
                >
                  {aiSuggestions.status.toUpperCase()}
                </span>
              </div>
              <div className="space-y-2">
                {aiSuggestions.tips.map((tip, idx) => (
                  <div key={idx} className="flex gap-2.5 items-start text-[11px] text-slate-300">
                    <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 shrink-0 mt-1.5" />
                    <p className="leading-relaxed">{tip}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── 5-DAY FORECAST ── */}
          <div className="glass-card rounded-3xl p-4">
            <h4 className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-3">
              5-Day Forecast
            </h4>
            <div className="space-y-1.5">
              {weatherData!.forecast.map((day, idx) => (
                <div
                  key={idx}
                  className={`flex items-center justify-between px-3 py-3 rounded-2xl transition-all duration-200 hover:bg-white/6 ${
                    idx === 0
                      ? "bg-cyan-500/8 border border-cyan-500/15"
                      : "bg-white/3"
                  }`}
                >
                  <div className="w-12 shrink-0">
                    <span className="block text-xs font-bold text-slate-200">{day.day_of_week}</span>
                    <span className="block text-[9px] text-slate-500 font-mono">
                      {day.date.split("-").slice(1).join("/")}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 flex-1 ml-3">
                    {getWeatherIcon(day.condition.icon, "w-5 h-5 shrink-0")}
                    <span className="text-[11px] text-slate-400 truncate">{day.condition.text}</span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <div className="flex items-center gap-1 text-[10px] text-slate-500 font-mono">
                      <Droplets className="w-3 h-3 text-blue-400" />
                      {day.humidity}%
                    </div>
                    <div className="text-right w-16">
                      <span className="text-xs font-bold text-slate-100">
                        {isCelsius ? `${Math.round(day.temp_max_c)}°` : `${Math.round(day.temp_max_f)}°`}
                      </span>
                      <span className="text-[10px] text-slate-500 ml-1.5">
                        {isCelsius ? `${Math.round(day.temp_min_c)}°` : `${Math.round(day.temp_min_f)}°`}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* Empty state */
        <div className="glass-card rounded-3xl p-8 text-center flex flex-col items-center gap-4">
          <Info className="w-10 h-10 text-slate-500" />
          <div>
            <p className="text-slate-300 text-sm font-semibold mb-1">No weather data yet</p>
            <p className="text-slate-500 text-xs">Search for a city or detect your location to get started.</p>
          </div>
          <button
            id="btn-trigger-geocomplete"
            onClick={onDetectLocation}
            className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white text-xs font-bold py-2.5 px-7 rounded-xl transition shadow-lg shadow-cyan-500/20"
          >
            Detect My Location
          </button>
        </div>
      )}
    </div>
  );
}
