/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
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
  BellRing,
  RefreshCw
} from "lucide-react";
import { CurrentWeather, ForecastDay, AISuggestions, HourlyDataPoint } from "../types";
import { getWeatherIcon } from "../utils/weatherIcons";
import GlassCard from "./ui/GlassCard";
import GranularDataCard from "./ui/GranularDataCard";
import WeatherSkeleton from "./ui/WeatherSkeleton";
import TemperatureTrendChart from "./ui/TemperatureTrendChart";
import ThunderstormBackground from "./ui/ThunderstormBackground";

interface WeatherDashboardProps {
  weatherData: { current: CurrentWeather; forecast: ForecastDay[]; hourly?: HourlyDataPoint[] } | null;
  aiSuggestions: AISuggestions | null;
  onSearch: (city: string, lat?: number, lon?: number) => void;
  onDetectLocation: () => void;
  isCelsius: boolean;
  isLoading: boolean;
  alertMessage: string | null;
  onDismissAlert: () => void;
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

  // Search autocomplete handler
  useEffect(() => {
    if (searchQuery.trim().length < 2) {
      setGeoResults([]);
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
      } catch (err) {
        console.error("Autocomplete search error:", err);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const selectSuggestion = (item: any) => {
    const name = `${item.name}${item.admin1 ? `, ${item.admin1}` : ""}, ${item.country}`;
    setSearchQuery(name);
    setShowDropdown(false);
    onSearch(item.name, item.latitude, item.longitude);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && searchQuery.trim().length > 0) {
      setShowDropdown(false);
      onSearch(searchQuery);
    }
  };

  // Weather styled background animations & classes
  const getWeatherBackground = () => {
    if (!weatherData) return "from-slate-800 to-slate-950";
    const cond = weatherData.current.condition.text.toLowerCase();

    if (cond.includes("sunny") || cond.includes("clear")) {
      return "from-amber-500/20 via-orange-600/10 to-slate-950 animate-sunny-pulse";
    }
    if (cond.includes("rain") || cond.includes("drizzle") || cond.includes("shower")) {
      return "from-blue-600/10 via-slate-800 to-slate-950";
    }
    if (cond.includes("thunderstorm") || cond.includes("lightning") || cond.includes("storm")) {
      return "from-purple-950/20 via-indigo-950/20 to-slate-950";
    }
    if (cond.includes("snow") || cond.includes("ice") || cond.includes("frost")) {
      return "from-cyan-300/10 via-slate-800 to-slate-950";
    }
    return "from-sky-900/10 via-slate-800 to-slate-950";
  };

  // Background particles for non-storm conditions
  const renderBackgroundParticles = () => {
    if (!weatherData) return null;
    const cond = weatherData.current.condition.text.toLowerCase();

    // Storm/rain backgrounds are handled by ThunderstormBackground
    if (cond.includes("rain") || cond.includes("drizzle") || cond.includes("thunderstorm") || cond.includes("lightning") || cond.includes("storm") || cond.includes("shower")) {
      return <ThunderstormBackground condition={weatherData.current.condition.text} intensity={cond.includes("thunderstorm") || cond.includes("heavy") ? 2 : 1} />;
    }

    if (cond.includes("fog") || cond.includes("cloudy") || cond.includes("overcast")) {
      return (
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-0 opacity-20">
          <div className="absolute top-[20%] w-[150px] h-[80px] bg-slate-400 rounded-full blur-2xl cloud-slow" />
          <div className="absolute top-[50%] w-[200px] h-[100px] bg-slate-500 rounded-full blur-3xl cloud-slow" style={{ animationDelay: "10s", animationDuration: "35s" }} />
        </div>
      );
    }

    if (cond.includes("sunny") || cond.includes("clear")) {
      return (
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-0 opacity-30">
          {Array.from({ length: 8 }).map((_, idx) => (
            <div
              key={`bubble-${idx}`}
              className="mist-bubble bg-amber-400/20"
              style={{
                left: `${Math.random() * 100}%`,
                bottom: "0px",
                width: `${20 + Math.random() * 40}px`,
                height: `${20 + Math.random() * 40}px`,
                animationDelay: `${Math.random() * 4}s`,
                animationDuration: `${4 + Math.random() * 4}s`,
              }}
            />
          ))}
        </div>
      );
    }

    return null;
  };

  const curr = weatherData?.current;

  // ── Expanded detail content for GranularDataCards ──
  const getHumidityDetails = (humidity: number) => (
    <div>
      <p>Comfort Level: <span className="text-cyan-400 font-semibold">{humidity < 40 ? "Dry — consider a humidifier" : humidity < 60 ? "Comfortable" : humidity < 80 ? "Muggy — may feel sticky" : "Very Humid — sweat evaporation slowed"}</span></p>
      <p className="mt-1 text-[10px] text-slate-400">Ideal indoor range: 30–50%</p>
    </div>
  );

  const getWindDetails = (kph: number) => {
    const beaufort = kph < 1 ? "Calm" : kph < 6 ? "Light Air" : kph < 12 ? "Light Breeze" : kph < 20 ? "Gentle Breeze" : kph < 29 ? "Moderate Breeze" : kph < 39 ? "Fresh Breeze" : kph < 50 ? "Strong Breeze" : "Near Gale+";
    return (
      <div>
        <p>Beaufort Scale: <span className="text-cyan-400 font-semibold">{beaufort}</span></p>
        <p className="mt-1 text-[10px] text-slate-400">{kph > 40 ? "⚠️ Secure loose outdoor items" : "Safe for outdoor activities"}</p>
      </div>
    );
  };

  const getUVDetails = (uv: number) => (
    <div>
      <p>Protection Advice: <span className="text-cyan-400 font-semibold">{uv <= 2 ? "No protection needed" : uv <= 5 ? "Wear sunglasses on bright days" : uv <= 7 ? "SPF 30+ sunscreen recommended" : "Avoid midday sun, seek shade"}</span></p>
      <p className="mt-1 text-[10px] text-slate-400">Scale: 0–2 Low · 3–5 Moderate · 6–7 High · 8+ Very High</p>
    </div>
  );

  return (
    <div className={`relative min-h-[500px] bg-gradient-to-b ${getWeatherBackground()} rounded-3xl p-5 shadow-2xl border border-white/10 overflow-hidden transition-all duration-700 font-sans`}>
      {renderBackgroundParticles()}
 
      {/* Main Content Area */}
      <div className="relative z-10 space-y-5">
        {/* Search Coordinates Header */}
        <div className="flex flex-col gap-2.5 items-stretch relative">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none h-full">
              <Search className="h-4 w-4 text-slate-400" />
            </div>
            <input
              id="inp-city-search"
              type="text"
              className="w-full bg-slate-950/50 hover:bg-slate-950/80 focus:bg-slate-950 border border-white/10 rounded-2xl pl-10 pr-4 py-3 text-xs text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-cyan-500/60 transition duration-150"
              placeholder="Search city, e.g. London, Tokyo..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleKeyPress}
            />
 
            {/* Auto-suggest dropdown container */}
            {showDropdown && geoResults.length > 0 && (
              <div className="absolute left-0 right-0 mt-1.5 bg-slate-950/95 border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-50 backdrop-blur-xl">
                {geoResults.map((item, idx) => (
                  <button
                    id={`btn-geo-suggest-${idx}`}
                    key={idx}
                    type="button"
                    onClick={() => selectSuggestion(item)}
                    className="w-full text-left px-4 py-3 text-xs text-slate-200 hover:bg-white/5 flex items-center gap-2 border-b border-white/5 last:border-0 transition"
                  >
                    <MapPin className="w-3.5 h-3.5 text-cyan-400" />
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
              title="Detect Location GPS"
              className="flex-1 py-3 bg-cyan-500 hover:bg-cyan-400 text-slate-900 rounded-2xl flex items-center justify-center gap-2 cursor-pointer transition font-bold text-xs"
            >
              <Navigation className="h-4 w-4 text-slate-900 fill-slate-900" /> Detect Location
            </button>
            <button
              id="btn-refresh-dashboard"
              onClick={() => curr && onSearch(curr.city, curr.lat, curr.lon)}
              className="p-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl flex items-center justify-center transition"
              title="Refresh meteorological payload"
            >
              <RefreshCw className={`h-4 w-4 text-cyan-400 ${isLoading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>
 
        {/* Global Level Alert notifications wrapper */}
        {alertMessage && (
          <div className="bg-amber-950/40 border border-amber-500/20 rounded-2xl p-4 flex gap-3 text-amber-200 items-start shadow-xl">
            <BellRing className="w-5 h-5 text-amber-400 shrink-0 mt-0.5 animate-bounce" />
            <div className="flex-1">
              <span className="font-bold text-xs text-amber-300 block mb-0.5">Atmospheric Alert</span>
              <p className="text-xs leading-relaxed text-amber-200/90">{alertMessage}</p>
            </div>
            <button
              id="btn-dismiss-alert"
              onClick={onDismissAlert}
              className="text-xs text-amber-400 hover:text-amber-200 font-bold px-1"
            >
              Dismiss
            </button>
          </div>
        )}
 
        {isLoading ? (
          <WeatherSkeleton />
        ) : curr ? (
          <div className="space-y-5">
            {/* CURRENT WEATHER OVERVIEW HEADER CARD */}
            <GlassCard variant="heavy" className="flex flex-col items-center text-center py-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/10 rounded-full blur-[80px]" />
              <div className="flex items-center gap-1.5 text-slate-400 mb-1 flex-wrap justify-center">
                <MapPin className="w-3.5 h-3.5 text-cyan-400" />
                <span className="text-[10px] font-bold uppercase tracking-widest">{curr.city}</span>
                {curr.isOfflineFallback && (
                  <span className="text-[8px] bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded border border-amber-500/30 font-bold uppercase tracking-wider animate-pulse">
                    Demo Mode
                  </span>
                )}
              </div>
 
              <div className="my-2.5 flex items-center justify-center gap-5">
                {getWeatherIcon(curr.condition.icon, "w-16 h-16 filter drop-shadow-[0_4px_10px_rgba(6,182,212,0.3)]")}
                <div className="text-left">
                  <h2 className="text-5xl font-thin tracking-tighter text-gradient leading-none">
                    {isCelsius ? `${Math.round(curr.temp_c)}°` : `${Math.round(curr.temp_f)}°`}
                  </h2>
                  <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                    Feels like {isCelsius ? `${curr.feelslike_c}°C` : `${curr.feelslike_f}°F`}
                  </p>
                </div>
              </div>
 
              <span className="px-3.5 py-1 bg-cyan-500/10 border border-cyan-500/20 rounded-full text-[10px] font-bold text-cyan-300 tracking-wide mt-1 uppercase">
                {curr.condition.text}
              </span>
            </GlassCard>
 
            {/* DETAILED WEATHER SPECIFICATIONS — Interactive GranularDataCards */}
            <div className="grid grid-cols-2 gap-3">
              <GranularDataCard
                icon={<Droplets className="w-5 h-5 text-cyan-400 fill-cyan-400/10" />}
                label="Humidity"
                value={`${curr.humidity}%`}
                details={getHumidityDetails(curr.humidity)}
              />

              <GranularDataCard
                icon={<Wind className="w-5 h-5 text-cyan-400" />}
                label="Wind Speed"
                value={isCelsius ? `${curr.wind_kph} km/h` : `${curr.wind_mph} mph`}
                details={getWindDetails(curr.wind_kph)}
              />

              <GranularDataCard
                icon={<Sun className="w-5 h-5 text-cyan-400 fill-cyan-400/10" />}
                label="UV Index"
                value={`${curr.uv} of 10`}
                details={getUVDetails(curr.uv)}
                fullWidth
              />
            </div>

            {/* TEMPERATURE TREND CHART */}
            {weatherData.hourly && weatherData.hourly.length > 0 && (
              <TemperatureTrendChart
                hourlyData={weatherData.hourly}
                isCelsius={isCelsius}
              />
            )}
 
            {/* AI SUGGESTIONS SHEET SECTION */}
            {aiSuggestions && (
              <GlassCard className="p-5 relative overflow-hidden">
                <div className="absolute -top-10 -right-10 w-24 h-24 bg-cyan-500/10 rounded-full blur-2xl" />
                <div className="flex justify-between items-center mb-3">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-cyan-400 uppercase tracking-widest">
                    <Sparkles className="w-4 h-4 text-cyan-400 fill-cyan-400/10 animate-pulse" />
                    <span>AI Insights</span>
                  </div>
                </div>
 
                <div className="space-y-2">
                  {aiSuggestions.tips.map((tip, idx) => (
                    <div key={idx} className="flex gap-2.5 items-start text-[11px] text-slate-300">
                      <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 shrink-0 mt-1.5" />
                      <p className="leading-relaxed">{tip}</p>
                    </div>
                  ))}
                </div>
              </GlassCard>
            )}
 
            {/* 5-DAY WEATHER FORECAST CONTAINER */}
            <div>
              <h4 className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-3 px-1">5-Day Meteorological Trend</h4>
              <div className="space-y-2">
                {weatherData.forecast.map((day, idx) => (
                  <GlassCard
                    key={idx}
                    className={`flex items-center justify-between p-3.5 hover:bg-white/10 transition duration-150 ${idx === 0 ? 'border-b-4 border-cyan-500/50' : ''}`}
                  >
                    <div className="w-14">
                      <span className="block text-xs font-bold text-slate-100">{day.day_of_week}</span>
                      <span className="block text-[10px] text-slate-450 font-mono">
                        {day.date.split("-").slice(1).join("/")}
                      </span>
                    </div>
 
                    <div className="flex items-center gap-2 max-w-[120px] justify-start flex-1 ml-4">
                      {getWeatherIcon(day.condition.icon, "w-6 h-6 shrink-0 filter drop-shadow-[0_2px_4px_rgba(6,182,212,0.2)]")}
                      <span className="text-[11px] tracking-tight text-slate-300 line-clamp-1">{day.condition.text}</span>
                    </div>
 
                    <div className="flex items-center gap-3 text-right">
                      <span className="text-[10px] text-slate-400 flex items-center font-mono gap-0.5" title="Humidity forecast">
                        <Droplets className="w-3 h-3 text-cyan-400" /> {day.humidity}%
                      </span>
                      <div className="w-16">
                        <span className="text-xs font-mono font-bold text-slate-150">
                          {isCelsius ? `${Math.round(day.temp_max_c)}°` : `${Math.round(day.temp_max_f)}°`}
                        </span>
                        <span className="text-[10px] font-mono text-slate-400 ml-1.5">
                          {isCelsius ? `${Math.round(day.temp_min_c)}°` : `${Math.round(day.temp_min_f)}°`}
                        </span>
                      </div>
                    </div>
                  </GlassCard>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <GlassCard variant="heavy" className="p-8 text-center flex flex-col items-center">
            <Search className="w-8 h-8 text-slate-400 mb-3" />
            <p className="text-slate-300 text-xs mb-4">No meteorological metrics detected. Click or search for a location.</p>
            <button
              id="btn-trigger-geocomplete"
              onClick={onDetectLocation}
              className="bg-cyan-500 hover:bg-cyan-400 text-slate-900 text-xs font-bold py-2.5 px-6 rounded-xl transition cursor-pointer"
            >
              Locate Now
            </button>
          </GlassCard>
        )}
      </div>
    </div>
  );
}
