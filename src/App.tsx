/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { 
  CloudSun, 
  MessageSquare, 
  Flame, 
  Settings, 
  Moon, 
  Sun, 
  Sparkles,
} from "lucide-react";
import { CurrentWeather, ForecastDay, AISuggestions, HourlyDataPoint } from "./types";
import WeatherDashboard from "./components/WeatherDashboard";
import VoiceAssistant from "./components/VoiceAssistant";
import BlockPuzzleGame from "./components/BlockPuzzleGame";
import SettingsPanel from "./components/SettingsPanel";
import LocationPermissionModal from "./components/LocationPermissionModal";

export default function App() {
  const [activeTab, setActiveTab] = useState<"weather" | "assistant" | "game" | "settings">("weather");
  const [weatherData, setWeatherData] = useState<{ current: CurrentWeather; forecast: ForecastDay[]; hourly?: HourlyDataPoint[] } | null>(null);
  const [aiSuggestions, setAiSuggestions] = useState<AISuggestions | null>(null);
  const [isCelsius, setIsCelsius] = useState<boolean>(() => {
    return localStorage.getItem("aero_is_celsius") !== "false";
  });
  const [notificationsEnabled, setNotificationsEnabled] = useState<boolean>(() => {
    return localStorage.getItem("aero_notif_enabled") !== "false";
  });
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSplashActive, setIsSplashActive] = useState<boolean>(true);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(true); // default to dark atmospheric interface
  const [alertMessage, setAlertMessage] = useState<string | null>(null);
  const [showLocationModal, setShowLocationModal] = useState<boolean>(false);
  const [locationLoading, setLocationLoading] = useState<boolean>(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  // Load cached weather from LocalStorage on mount (Offline Support!)
  useEffect(() => {
    const cachedWeather = localStorage.getItem("aero_cached_weather");
    const cachedAI = localStorage.getItem("aero_cached_ai");
    
    if (cachedWeather) {
      try {
        setWeatherData(JSON.parse(cachedWeather));
      } catch (err) {
        console.error("Failed to parse cached weather:", err);
      }
    }
    if (cachedAI) {
      try {
        setAiSuggestions(JSON.parse(cachedAI));
      } catch (err) {
        console.error("Failed to parse cached AI suggestions:", err);
      }
    }

    // Dismiss Splash screen after 1.8 seconds for premium feel
    const timer = setTimeout(() => {
      setIsSplashActive(false);
    }, 1800);

    return () => clearTimeout(timer);
  }, []);

  // Save changes to unit toggle to storage
  const handleToggleUnit = () => {
    const nextVal = !isCelsius;
    setIsCelsius(nextVal);
    localStorage.setItem("aero_is_celsius", String(nextVal));
  };

  const handleToggleNotifications = () => {
    const nextVal = !notificationsEnabled;
    setNotificationsEnabled(nextVal);
    localStorage.setItem("aero_notif_enabled", String(nextVal));
    if (!nextVal) {
      setAlertMessage(null);
    }
  };

  const handleClearCache = () => {
    localStorage.removeItem("aero_cached_weather");
    localStorage.removeItem("aero_cached_ai");
    localStorage.removeItem("aero_tetris_highscore");
    setWeatherData(null);
    setAiSuggestions(null);
    setAlertMessage(null);
    alert("Local weather cache and high scores have been cleaned!");
  };

  // Retrieve AI Recommendations from Server
  const fetchAiSuggestions = async (current: CurrentWeather) => {
    try {
      const response = await fetch("/api/weather/ai-suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentData: current }),
      });

      if (response.ok) {
        const data = (await response.json()) as AISuggestions;
        setAiSuggestions(data);
        localStorage.setItem("aero_cached_ai", JSON.stringify(data));

        // Coordinate Extreme alerts inside App toast
        if (notificationsEnabled) {
          if (data.alert) {
            setAlertMessage(data.alert);
          } else {
            // Check weather code conditions for generic warnings
            const code = current.condition.code;
            if (code >= 95) {
              setAlertMessage("Severe Thunderstorm Warning active. Avoid outdoors!");
            } else if (code >= 61 && code <= 65) {
              setAlertMessage("Rain hazard alert: wet streets may cause slippery driving.");
            } else if (current.temp_c >= 35) {
              setAlertMessage("Extreme High Heat Warning: Temperatures exceeding 35°C. Stay inside and stay hydrated!");
            } else if (current.temp_c <= 0) {
              setAlertMessage("Extreme Freeze warning: temperatures below freezing. Bundle up cozy!");
            } else {
              setAlertMessage(null);
            }
          }
        }
      }
    } catch (err) {
      console.error("AI recommendations fetching failed:", err);
    }
  };

  // Perform search
  const handleGeoSearch = async (city: string, lat?: number, lon?: number) => {
    setIsLoading(true);
    try {
      let queryUrl = `/api/weather?city=${encodeURIComponent(city)}`;
      if (lat !== undefined && lon !== undefined) {
        queryUrl += `&lat=${lat}&lon=${lon}`;
      }

      const response = await fetch(queryUrl);
      if (!response.ok) {
        let errMsg = "Failed to fetch weather data from API";
        try {
          const errData = await response.json();
          if (errData && errData.error) {
            errMsg = errData.error;
            if (errData.details) {
              errMsg += ` (${errData.details})`;
            }
          }
        } catch (_) {}
        throw new Error(errMsg);
      }

      const data = await response.json();
      setWeatherData(data);
      
      // Save weather details to cache (Offline Support)
      localStorage.setItem("aero_cached_weather", JSON.stringify(data));

      // Trigger AI suggestions
      await fetchAiSuggestions(data.current);
    } catch (err: any) {
      console.error("Weather error details:", err);
      alert(`Failed to retrieve live metrics: ${err.message || err}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Default fallback city: Siwan, Bihar, India
  const FALLBACK_CITY = "Siwan";
  const FALLBACK_LAT = 26.22;
  const FALLBACK_LON = 84.36;

  // Auto-detect user Coordinates GPS location
  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      alert("GPS Geolocation index is not supported on this browser. Searching default location.");
      handleGeoSearch(FALLBACK_CITY, FALLBACK_LAT, FALLBACK_LON);
      return;
    }

    setIsLoading(true);
    setLocationLoading(true);
    setLocationError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setLocationLoading(false);
        setShowLocationModal(false);
        handleGeoSearch("My Location", latitude, longitude);
      },
      (err) => {
        console.warn("Geolocation permission error: ", err);
        setLocationLoading(false);
        setLocationError(
          err.code === 1
            ? "Location permission was denied. You can search manually or try again."
            : "Could not determine your location. Please try again or search manually."
        );
        // Fallback to Siwan, Bihar
        handleGeoSearch(FALLBACK_CITY, FALLBACK_LAT, FALLBACK_LON);
      },
      { enableHighAccuracy: false, timeout: 15000, maximumAge: 300000 }
    );
  };

  // Geolocation soft-prompt on first launch if no cached payload
  useEffect(() => {
    const cache = localStorage.getItem("aero_cached_weather");
    if (!cache) {
      // Show soft-prompt modal instead of aggressively requesting GPS
      setShowLocationModal(true);
    }
  }, []);

  return (
    <div className={`min-h-screen transition-colors duration-500 flex flex-col items-center justify-start py-6 px-4 ${
      isDarkMode ? "bg-[#0f172a] text-white" : "bg-slate-50 text-slate-900"
    }`}>
      
      {/* 0. Geolocation Soft-Prompt Modal */}
      <LocationPermissionModal
        isOpen={showLocationModal && !isSplashActive}
        isLoading={locationLoading}
        error={locationError}
        onAllow={() => {
          setLocationError(null);
          handleDetectLocation();
        }}
        onSkip={() => {
          setShowLocationModal(false);
          setLocationError(null);
          handleGeoSearch(FALLBACK_CITY, FALLBACK_LAT, FALLBACK_LON);
        }}
        onClose={() => {
          setShowLocationModal(false);
          setLocationError(null);
        }}
      />

      {/* 1. Splash Screen Overlay */}
      {isSplashActive && (
        <div className="fixed inset-0 bg-gradient-to-br from-cyan-950 via-slate-950 to-[#0f172a] z-50 flex flex-col items-center justify-center text-center p-4">
          <div className="relative mb-5 flex items-center justify-center">
            <div className="absolute inset-0 bg-cyan-500/10 rounded-full blur-2xl animate-pulse scale-150" />
            <CloudSun className="w-20 h-20 text-cyan-400 animate-bounce" />
          </div>
          <h1 className="text-3xl font-bold text-gradient tracking-tight">AeroCast</h1>
          <p className="text-xs text-cyan-300 font-mono tracking-widest uppercase mt-1">Sleek Mobile Suite v2.0</p>
          <div className="mt-8 flex gap-1.5 justify-center items-center">
            <span className="h-1.5 w-1.5 bg-cyan-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
            <span className="h-1.5 w-1.5 bg-cyan-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
            <span className="h-1.5 w-1.5 bg-cyan-400 rounded-full animate-bounce" />
          </div>
        </div>
      )}

      {/* 2. Standard Mobile Screen Container */}
      <div className="w-full max-w-md bg-[#0f172a]/95 rounded-[40px] border border-white/10 shadow-2xl relative overflow-hidden flex flex-col min-h-[750px] mb-8">
        
        {/* Android Screen Top Status Bar Block */}
        <div className="h-6 bg-black/40 shrink-0 px-6 flex justify-between items-center text-[10px] font-mono text-slate-500 uppercase tracking-widest z-20 border-b border-white/5">
          <span>AeroCast Net</span>
          <div className="flex gap-2 items-center">
            <span>LTE</span>
            <div className="w-5 h-2.5 border border-slate-700 rounded-[2px] p-[1px] flex items-center">
              <div className="bg-cyan-400 h-full w-[80%]" />
            </div>
          </div>
        </div>

        {/* Global Nav Bar Wrapper */}
        <div className="shrink-0 p-4 flex items-center justify-between border-b border-white/5 z-20 bg-white/5 backdrop-blur-md">
          <div>
            <h1 className="text-lg font-bold text-slate-100 tracking-tight flex items-center gap-1.5">
              <CloudSun className="w-5 h-5 text-cyan-400" /> AeroCast
            </h1>
          </div>
          <div className="flex gap-1">
            <button
              id="btn-toggle-theme"
              onClick={() => setIsDarkMode((prev) => !prev)}
              className="p-1.5 bg-white/5 hover:bg-white/10 text-slate-400 rounded-xl transition cursor-pointer border border-white/10"
              title="Toggle application look"
            >
              {isDarkMode ? <Sun className="w-4 h-4 text-yellow-400" /> : <Moon className="w-4 h-4 text-cyan-400" />}
            </button>
          </div>
        </div>

        {/* Active Module Screen Layout */}
        <div className="flex-1 overflow-y-auto p-4 pb-20 z-10 relative">
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

        {/* Dynamic Android Floating Bottom Navigation Bar */}
        <div className="absolute bottom-4 left-4 right-4 bg-black/60 border border-white/10 rounded-2xl h-14 shadow-2xl z-30 flex items-center justify-around px-2 backdrop-blur-xl">
          <button
            id="tab-weather"
            onClick={() => setActiveTab("weather")}
            className={`flex flex-col items-center justify-center py-1.5 px-3 rounded-xl transition ${
              activeTab === "weather" ? "text-cyan-400 scale-105 bg-white/5" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <CloudSun className="w-4.5 h-4.5" />
            <span className="text-[9px] font-bold mt-0.5 uppercase tracking-wide">Weather</span>
          </button>

          <button
            id="tab-assistant"
            onClick={() => setActiveTab("assistant")}
            className={`flex flex-col items-center justify-center py-1.5 px-3 rounded-xl transition ${
              activeTab === "assistant" ? "text-cyan-400 scale-105 bg-white/5" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <MessageSquare className="w-4.5 h-4.5" />
            <span className="text-[9px] font-bold mt-0.5 uppercase tracking-wide">Voice AI</span>
          </button>

          <button
            id="tab-game"
            onClick={() => setActiveTab("game")}
            className={`flex flex-col items-center justify-center py-1.5 px-3 rounded-xl transition ${
              activeTab === "game" ? "text-cyan-400 scale-105 bg-white/5" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Flame className="w-4.5 h-4.5" />
            <span className="text-[9px] font-bold mt-0.5 uppercase tracking-wide">Arcade</span>
          </button>

          <button
            id="tab-settings"
            onClick={() => setActiveTab("settings")}
            className={`flex flex-col items-center justify-center py-1.5 px-3 rounded-xl transition ${
              activeTab === "settings" ? "text-cyan-400 scale-105 bg-white/5" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Settings className="w-4.5 h-4.5" />
            <span className="text-[9px] font-bold mt-0.5 uppercase tracking-wide">Settings</span>
          </button>
        </div>

      </div>

      <div className="text-center space-y-1 block max-w-sm mt-3">
        <p className="text-[10px] text-slate-500 font-mono uppercase tracking-wider">AeroCast Suite • Powered by Google AI Studio</p>
        <p className="text-[10px] text-slate-600 italic">Supports complete offline rendering with responsive browser cached data.</p>
      </div>

    </div>
  );
}
