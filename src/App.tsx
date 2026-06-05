/**
 * App.tsx — Vibe Weather main orchestrator
 * Video background + Login gate + Multi-city management + Weather dashboard
 * @license SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from "react";
import {
  CloudSun,
  MessageSquare,
  Gamepad2,
  Settings,
  BellRing,
} from "lucide-react";
import { CurrentWeather, ForecastDay, AISuggestions, HourlyForecast, User, SavedCity } from "./types";

import LoginScreen from "./components/LoginScreen";
import UserHeader from "./components/UserHeader";
import CityManager from "./components/CityManager";
import WeatherDashboard from "./components/WeatherDashboard";
import VoiceAssistant from "./components/VoiceAssistant";
import BlockPuzzleGame from "./components/BlockPuzzleGame";
import SettingsPanel from "./components/SettingsPanel";

type ActiveTab = "weather" | "assistant" | "game" | "settings";

// ── Storage helpers ──────────────────────────────────────────
const LS = {
  get: <T,>(key: string, fallback: T): T => {
    try { return JSON.parse(localStorage.getItem(key) || "null") ?? fallback; } catch { return fallback; }
  },
  set: (key: string, val: unknown) => {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch {}
  },
  del: (key: string) => localStorage.removeItem(key),
};


export default function App() {
  // ── Auth state ──────────────────────────────────────────────
  const [user, setUser] = useState<User | null>(() => LS.get("vw_session", null));

  // ── App state ───────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<ActiveTab>("weather");
  const [isCelsius, setIsCelsius] = useState<boolean>(() => LS.get("aero_is_celsius", true));
  const [notificationsEnabled, setNotificationsEnabled] = useState<boolean>(() => LS.get("aero_notif_enabled", true));
  const [isLoading, setIsLoading] = useState(false);
  const [isSplashActive, setIsSplashActive] = useState(true);
  const [alertMessage, setAlertMessage] = useState<string | null>(null);

  // ── Weather state ───────────────────────────────────────────
  const [weatherData, setWeatherData] = useState<{
    current: CurrentWeather;
    forecast: ForecastDay[];
    hourly?: HourlyForecast[];
  } | null>(() => LS.get("aero_cached_weather", null));

  const [aiSuggestions, setAiSuggestions] = useState<AISuggestions | null>(
    () => LS.get("aero_cached_ai", null)
  );

  // ── Multi-city state ────────────────────────────────────────
  const [savedCities, setSavedCities] = useState<SavedCity[]>(
    () => LS.get("vw_saved_cities", [])
  );
  const [activeCityId, setActiveCityId] = useState<string | null>(
    () => LS.get("vw_active_city_id", null)
  );

  // ── Splash screen ───────────────────────────────────────────
  useEffect(() => {
    const t = setTimeout(() => setIsSplashActive(false), 2000);
    return () => clearTimeout(t);
  }, []);

  // ── Persist cities ──────────────────────────────────────────
  useEffect(() => { LS.set("vw_saved_cities", savedCities); }, [savedCities]);
  useEffect(() => { LS.set("vw_active_city_id", activeCityId); }, [activeCityId]);
  useEffect(() => { LS.set("aero_is_celsius", isCelsius); }, [isCelsius]);

  // ── Login handler ───────────────────────────────────────────
  const handleLogin = (username: string) => {
    const u: User = { username, loginTime: Date.now() };
    setUser(u);
    LS.set("vw_session", u);
  };

  // ── Logout handler ──────────────────────────────────────────
  const handleLogout = () => {
    LS.del("vw_session");
    setUser(null);
    setWeatherData(null);
    setAiSuggestions(null);
    setAlertMessage(null);
  };

  // ── AI Suggestions ──────────────────────────────────────────
  const fetchAiSuggestions = useCallback(async (current: CurrentWeather) => {
    try {
      const res = await fetch("/api/weather/ai-suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentData: current }),
      });
      if (res.ok) {
        const data = (await res.json()) as AISuggestions;
        setAiSuggestions(data);
        LS.set("aero_cached_ai", data);

        if (notificationsEnabled) {
          if (data.alert) {
            setAlertMessage(data.alert);
          } else {
            const code = current.condition.code;
            if (code >= 95) setAlertMessage("⚡ Severe Thunderstorm Warning — avoid outdoors!");
            else if (code >= 61 && code <= 65) setAlertMessage("🌧️ Rain Alert — wet roads may be slippery.");
            else if (current.temp_c >= 35) setAlertMessage("🌡️ Extreme Heat Warning — temp exceeds 35°C. Stay hydrated!");
            else if (current.temp_c <= 0) setAlertMessage("❄️ Freeze Warning — temperatures below freezing. Bundle up!");
            else setAlertMessage(null);
          }
        }
      }
    } catch (err) {
      console.error("AI suggestions error:", err);
    }
  }, [notificationsEnabled]);

  // ── Main weather fetch ──────────────────────────────────────
  const handleGeoSearch = useCallback(async (city: string, lat?: number, lon?: number) => {
    setIsLoading(true);
    try {
      let url = `/api/weather?city=${encodeURIComponent(city)}`;
      if (lat !== undefined && lon !== undefined) url += `&lat=${lat}&lon=${lon}`;

      const res = await fetch(url);
      if (!res.ok) throw new Error("API error");

      const data = await res.json();
      setWeatherData(data);
      LS.set("aero_cached_weather", data);
      await fetchAiSuggestions(data.current);
    } catch (err) {
      console.error("Weather fetch error:", err);
      if (!weatherData) alert("Failed to load weather. Check your connection.");
    } finally {
      setIsLoading(false);
    }
  }, [fetchAiSuggestions, weatherData]);

  // ── Geolocation detect ──────────────────────────────────────
  const handleDetectLocation = useCallback(() => {
    if (!navigator.geolocation) {
      handleGeoSearch("Dubai", 25.2048, 55.2708);
      return;
    }
    setIsLoading(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => handleGeoSearch("My Location", coords.latitude, coords.longitude),
      () => {
        handleGeoSearch("Dubai", 25.2048, 55.2708);
      },
      { enableHighAccuracy: true, timeout: 7000 }
    );
  }, [handleGeoSearch]);

  // ── Auto-load weather on first launch ───────────────────────
  useEffect(() => {
    if (user && !weatherData) {
      if (savedCities.length > 0) {
        const active = savedCities.find((c) => c.id === activeCityId) || savedCities[0];
        handleGeoSearch(active.name, active.lat, active.lon);
        setActiveCityId(active.id);
      } else {
        handleDetectLocation();
      }
    }
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── City management ─────────────────────────────────────────
  const handleSelectCity = (city: SavedCity) => {
    setActiveCityId(city.id);
    handleGeoSearch(city.name, city.lat, city.lon);
  };

  const handleAddCity = (city: SavedCity) => {
    setSavedCities((prev) => {
      if (prev.find((c) => c.id === city.id)) return prev;
      return [...prev, city];
    });
    setActiveCityId(city.id);
    handleGeoSearch(city.name, city.lat, city.lon);
  };

  const handleRemoveCity = (cityId: string) => {
    setSavedCities((prev) => {
      const updated = prev.filter((c) => c.id !== cityId);
      if (activeCityId === cityId) {
        if (updated.length > 0) {
          setActiveCityId(updated[0].id);
          handleGeoSearch(updated[0].name, updated[0].lat, updated[0].lon);
        } else {
          setActiveCityId(null);
          handleDetectLocation();
        }
      }
      return updated;
    });
  };

  // ── Settings handlers ───────────────────────────────────────
  const handleToggleUnit = () => setIsCelsius((p) => !p);
  const handleToggleNotifications = () => {
    setNotificationsEnabled((p) => {
      if (p) setAlertMessage(null);
      LS.set("aero_notif_enabled", !p);
      return !p;
    });
  };
  const handleClearCache = () => {
    LS.del("aero_cached_weather");
    LS.del("aero_cached_ai");
    LS.del("aero_tetris_highscore");
    setWeatherData(null);
    setAiSuggestions(null);
    setAlertMessage(null);
    alert("Cache cleared successfully!");
  };

  // ── Tab nav config ──────────────────────────────────────────
  const tabs: { id: ActiveTab; label: string; icon: React.ReactNode }[] = [
    { id: "weather", label: "Weather", icon: <CloudSun className="w-5 h-5" /> },
    { id: "assistant", label: "AI Chat", icon: <MessageSquare className="w-5 h-5" /> },
    { id: "game", label: "Arcade", icon: <Gamepad2 className="w-5 h-5" /> },
    { id: "settings", label: "Settings", icon: <Settings className="w-5 h-5" /> },
  ];

  // ── Render ──────────────────────────────────────────────────
  return (
    <>
      {/* ── Fullscreen MP4 Video Background ── */}
      <video
        className="video-bg"
        src="/vibeWeather.mp4"
        autoPlay
        loop
        muted
        playsInline
        aria-hidden="true"
      />
      {/* Dark overlay on video */}
      <div className="video-overlay" />

      {/* ── Splash Screen ── */}
      {isSplashActive && (
        <div className="fixed inset-0 z-[60] flex flex-col items-center justify-center bg-slate-950/85 backdrop-blur-sm">
          <div className="relative mb-6">
            <div className="absolute inset-0 bg-cyan-400/20 rounded-full blur-3xl scale-[2] animate-pulse" />
            <div className="relative glass-card p-6 rounded-3xl animate-pulse-glow">
              <CloudSun className="w-16 h-16 text-cyan-400" />
            </div>
          </div>
          <h1 className="text-4xl font-extrabold text-gradient tracking-tight">Vibe Weather</h1>
          <p className="text-xs text-cyan-300/70 font-mono tracking-widest uppercase mt-2">Live World Forecast</p>
          <div className="mt-8 flex gap-2">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="h-2 w-2 bg-cyan-400 rounded-full animate-bounce"
                style={{ animationDelay: `${i * 0.15}s` }}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── Login Screen (if not logged in) ── */}
      {!user && <LoginScreen onLogin={handleLogin} />}

      {/* ── Main App (if logged in) ── */}
      {user && !isSplashActive && (
        <div className="min-h-screen flex items-center justify-center p-4 py-6">
          {/* Phone-shaped container — transparent glass so video shows through */}
          <div className="w-full max-w-md glass-dark rounded-[40px] border border-white/10 shadow-2xl relative overflow-hidden flex flex-col min-h-[800px] animate-fade-in">

            {/* Status Bar */}
            <div className="h-6 bg-black/30 shrink-0 px-6 flex justify-between items-center text-[10px] font-mono text-slate-500 uppercase tracking-widest border-b border-white/5">
              <span>Vibe Net</span>
              <div className="flex gap-2 items-center">
                <span>LTE</span>
                <div className="w-5 h-2.5 border border-slate-600 rounded-sm p-px flex items-center">
                  <div className="bg-cyan-400 h-full w-4/5 rounded-sm" />
                </div>
              </div>
            </div>

            {/* User Header */}
            <UserHeader
              user={user}
              isCelsius={isCelsius}
              onToggleUnit={handleToggleUnit}
              onLogout={handleLogout}
            />

            {/* City Manager Pills */}
            <CityManager
              cities={savedCities}
              activeCityId={activeCityId}
              onSelectCity={handleSelectCity}
              onAddCity={handleAddCity}
              onRemoveCity={handleRemoveCity}
            />

            {/* Main Content Area */}
            <div className="flex-1 overflow-y-auto px-4 pt-3 pb-24 scrollbar-hide relative z-10">
              {activeTab === "weather" && (
                <WeatherDashboard
                  weatherData={weatherData}
                  aiSuggestions={aiSuggestions}
                  onSearch={handleGeoSearch}
                  onDetectLocation={handleDetectLocation}
                  isCelsius={isCelsius}
                  isLoading={isLoading}
                  alertMessage={alertMessage}
                  onDismissAlert={() => setAlertMessage(null)}
                />
              )}
              {activeTab === "assistant" && (
                <VoiceAssistant weatherContext={weatherData?.current || null} />
              )}
              {activeTab === "game" && (
                <BlockPuzzleGame />
              )}
              {activeTab === "settings" && (
                <SettingsPanel
                  isCelsius={isCelsius}
                  onToggleUnit={handleToggleUnit}
                  notificationsEnabled={notificationsEnabled}
                  onToggleNotifications={handleToggleNotifications}
                  onClearCache={handleClearCache}
                />
              )}
            </div>

            {/* Bottom Navigation */}
            <div className="bottom-nav">
              {tabs.map(({ id, label, icon }) => (
                <button
                  key={id}
                  id={`tab-${id}`}
                  onClick={() => setActiveTab(id)}
                  className={`flex flex-col items-center justify-center py-1.5 px-4 rounded-2xl transition-all duration-200 ${
                    activeTab === id
                      ? "text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 scale-105"
                      : "text-slate-500 hover:text-slate-300"
                  }`}
                >
                  {icon}
                  <span className="text-[9px] font-bold mt-0.5 uppercase tracking-wide">{label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      {user && !isSplashActive && (
        <p className="text-center text-[10px] text-slate-600 font-mono pb-4">
          Vibe Weather • Open-Meteo + Gemini AI • @{user.username}
        </p>
      )}
    </>
  );
}
