/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface WeatherCondition {
  text: string;
  code: number;
  icon: string;
}

export interface CurrentWeather {
  temp_c: number;
  temp_f: number;
  condition: WeatherCondition;
  wind_kph: number;
  wind_mph: number;
  humidity: number;
  uv: number;
  feelslike_c: number;
  feelslike_f: number;
  city: string;
  country: string;
  lat?: number;
  lon?: number;
  isCustomSearch?: boolean;
  isOfflineFallback?: boolean;
}

export interface ForecastDay {
  date: string; // e.g., "YYYY-MM-DD" or name like "Mon"
  day_of_week: string; // "Monday", "Tue", etc.
  temp_min_c: number;
  temp_max_c: number;
  temp_min_f: number;
  temp_max_f: number;
  condition: WeatherCondition;
  humidity: number;
}

export interface AISuggestions {
  status: 'standard' | 'extreme' | 'warning';
  tips: string[];
  alert?: string; // Storm, Rain or Extreme Temp warning if applicable
}

export interface VoiceMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  audioUrl?: string;
  timestamp: string;
}

export interface HourlyDataPoint {
  time: string;
  temp: number;
}

export interface GameScore {
  score: number;
  highScore: number;
  linesCleared: number;
}
