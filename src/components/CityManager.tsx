/**
 * CityManager — Horizontal pill row with + Add City button and search modal
 * Supports worldwide city search via Open-Meteo geocoding API
 */

import React, { useState, useEffect, useRef } from "react";
import { Plus, X, MapPin, Search, Loader2 } from "lucide-react";
import { SavedCity } from "../types";

interface CityManagerProps {
  cities: SavedCity[];
  activeCityId: string | null;
  onSelectCity: (city: SavedCity) => void;
  onAddCity: (city: SavedCity) => void;
  onRemoveCity: (cityId: string) => void;
}

export default function CityManager({
  cities,
  activeCityId,
  onSelectCity,
  onAddCity,
  onRemoveCity,
}: CityManagerProps) {
  const [showModal, setShowModal] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout>>();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query.trim())}`);
        if (res.ok) {
          const data = await res.json();
          setResults(data.results || []);
        }
      } catch {
        setResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 350);
    return () => clearTimeout(searchTimer.current);
  }, [query]);

  useEffect(() => {
    if (showModal) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [showModal]);

  const closeModal = () => {
    setShowModal(false);
    setQuery("");
    setResults([]);
  };

  const handleAddCity = (item: any) => {
    const city: SavedCity = {
      id: `${item.latitude}_${item.longitude}`,
      name: item.name,
      lat: item.latitude,
      lon: item.longitude,
      country: item.country || "",
    };
    if (!cities.find((c) => c.id === city.id)) {
      onAddCity(city);
    } else {
      // City already exists — just switch to it
      onSelectCity(city);
    }
    closeModal();
  };

  return (
    <>
      {/* City Pills Row */}
      <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide px-4 py-2.5 border-b border-white/5">
        {cities.map((city) => (
          <div
            key={city.id}
            className={`city-pill ${activeCityId === city.id ? "active" : ""}`}
            onClick={() => onSelectCity(city)}
          >
            <MapPin className="w-3 h-3 shrink-0" />
            <span>{city.name}</span>
            {city.country && (
              <span className="text-[9px] opacity-60 font-normal">{city.country}</span>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRemoveCity(city.id);
              }}
              className="ml-0.5 opacity-50 hover:opacity-100 hover:text-red-400 transition-all"
              title="Remove city"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}

        {/* Add City Button */}
        <button
          id="btn-add-city"
          onClick={() => setShowModal(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold whitespace-nowrap border border-dashed border-white/20 text-slate-500 hover:text-cyan-300 hover:border-cyan-400/40 hover:bg-cyan-500/5 transition-all duration-200 shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          Add City
        </button>
      </div>

      {/* Add City Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/65 backdrop-blur-md"
            onClick={closeModal}
          />

          {/* Modal card */}
          <div className="relative w-full max-w-sm glass-dark rounded-3xl p-5 shadow-2xl border border-white/12 animate-slide-in-up">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-white font-bold text-sm">Add a City</h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Search any city worldwide
                </p>
              </div>
              <button
                id="btn-close-city-modal"
                onClick={closeModal}
                className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Search Input */}
            <div className="relative mb-3">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                ref={inputRef}
                id="inp-city-modal-search"
                type="text"
                placeholder="e.g. Tokyo, Dubai, Mumbai..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full bg-white/5 border border-white/10 focus:border-cyan-500/40 rounded-2xl pl-10 pr-10 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 transition-all"
              />
              {isSearching && (
                <Loader2 className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-cyan-400 animate-spin" />
              )}
            </div>

            {/* Results */}
            {results.length > 0 && (
              <div className="space-y-0.5 max-h-56 overflow-y-auto scrollbar-hide rounded-2xl">
                {results.map((item, i) => (
                  <button
                    key={i}
                    id={`btn-city-result-${i}`}
                    onClick={() => handleAddCity(item)}
                    className="w-full text-left px-4 py-3 text-sm hover:bg-white/6 rounded-2xl flex items-center gap-3 transition-colors group"
                  >
                    <div className="p-1.5 bg-cyan-500/10 border border-cyan-500/20 rounded-lg group-hover:bg-cyan-500/20 transition">
                      <MapPin className="w-3.5 h-3.5 text-cyan-400" />
                    </div>
                    <div>
                      <div className="font-semibold text-white text-sm">{item.name}</div>
                      <div className="text-[11px] text-slate-400">
                        {item.admin1 ? `${item.admin1}, ` : ""}
                        {item.country}
                      </div>
                    </div>
                    <div className="ml-auto text-[10px] text-slate-500 font-mono">
                      {item.latitude?.toFixed(1)}°, {item.longitude?.toFixed(1)}°
                    </div>
                  </button>
                ))}
              </div>
            )}

            {query.length >= 2 && !isSearching && results.length === 0 && (
              <div className="text-center py-6">
                <p className="text-slate-400 text-sm">No results for "{query}"</p>
                <p className="text-slate-500 text-xs mt-1">Try a different city name</p>
              </div>
            )}

            {query.length === 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {["London", "New York", "Tokyo", "Dubai", "Sydney"].map((city) => (
                  <button
                    key={city}
                    onClick={() => setQuery(city)}
                    className="px-3 py-1.5 rounded-full text-[11px] bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white transition font-medium"
                  >
                    {city}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
