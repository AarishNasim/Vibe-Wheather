/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express, { Request, Response } from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import crypto from "crypto";
import {
  validateRequest,
  searchQuerySchema,
  weatherQuerySchema,
  aiSuggestionsBodySchema,
  voiceAssistantBodySchema,
} from "./src/middleware/validate";

dotenv.config();

const app = express();
const PORT = 3000;

// ─── Security Middleware ──────────────────────────────────────────────

// Helmet: Sets security HTTP headers (XSS protection, HSTS, content sniffing prevention, etc.)
app.use(
  helmet({
    contentSecurityPolicy: false, // Disable CSP to avoid conflicts with Vite HMR in dev
    crossOriginEmbedderPolicy: false, // Allow loading external resources (fonts, weather API)
  })
);

app.use(express.json({ limit: "10kb" })); // Limit body size to prevent payload attacks

// Cookie Parser with signing secret for secure sessions
const COOKIE_SECRET = process.env.COOKIE_SECRET || "vW8kR3nQ7xF2mP5jL9tB4hY6cA1dE0gS";
app.use(cookieParser(COOKIE_SECRET));

// ─── Rate Limiting ──────────────────────────────────────────────────

/**
 * Global rate limiter: 100 requests per 15 minutes per IP
 * Protects all routes from general abuse and basic DoS.
 */
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false,  // Disable `X-RateLimit-*` headers
  message: {
    error: "Too many requests",
    message: "You have exceeded the rate limit. Please wait before making more requests.",
    retryAfter: "15 minutes",
  },
  keyGenerator: (req: Request) => {
    // Use X-Forwarded-For if behind a proxy (e.g., NGINX), otherwise use socket IP
    return (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
      req.socket.remoteAddress ||
      "unknown";
  },
});

/**
 * Strict AI rate limiter: 10 requests per hour per IP
 * Protects Gemini API billing quotas from abuse.
 * Applied ONLY to /api/weather/ai-suggestions and /api/weather/voice-assistant.
 */
const aiLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "AI rate limit exceeded",
    message: "You have made too many AI requests. Please wait before trying again to protect service quotas.",
    retryAfter: "1 hour",
  },
  keyGenerator: (req: Request) => {
    return (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
      req.socket.remoteAddress ||
      "unknown";
  },
});

// Apply global rate limiter to all routes
app.use(globalLimiter);

// ─── Initialize Gemini Client ────────────────────────────────────────

let ai: GoogleGenAI | null = null;
if (process.env.GEMINI_API_KEY) {
  try {
    ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
    console.log("Gemini client initialized successfully.");
  } catch (err) {
    console.error("Failed to initialize Gemini Client: ", err);
  }
} else {
  console.log("GEMINI_API_KEY is not configured yet. AI features will fallback to client simulation.");
}

// Map WMO codes to clean descriptions and standard icons
function getWeatherConditionFromWmo(code: number): { text: string; code: number; icon: string } {
  const mapping: { [key: number]: { text: string; icon: string } } = {
    0: { text: "Sunny", icon: "Sun" },
    1: { text: "Mainly Clear", icon: "CloudSun" },
    2: { text: "Partly Cloudy", icon: "Cloud" },
    3: { text: "Overcast", icon: "Cloudy" },
    45: { text: "Fog", icon: "CloudFog" },
    47: { text: "Depositing Rime Fog", icon: "CloudFog" },
    51: { text: "Light Drizzle", icon: "CloudDrizzle" },
    53: { text: "Moderate Drizzle", icon: "CloudDrizzle" },
    55: { text: "Dense Drizzle", icon: "CloudDrizzle" },
    61: { text: "Slight Rain", icon: "CloudRain" },
    63: { text: "Moderate Rain", icon: "CloudRain" },
    65: { text: "Heavy Rain", icon: "CloudRain" },
    71: { text: "Slight Snowfall", icon: "CloudSnow" },
    73: { text: "Moderate Snowfall", icon: "CloudSnow" },
    75: { text: "Heavy Snowfall", icon: "CloudSnow" },
    80: { text: "Slight Rain Showers", icon: "CloudRain" },
    81: { text: "Moderate Rain Showers", icon: "CloudRain" },
    82: { text: "Violent Rain Showers", icon: "CloudRain" },
    95: { text: "Thunderstorm", icon: "CloudLightning" },
    96: { text: "Thunderstorm with Hail", icon: "CloudLightning" },
    99: { text: "Severe Thunderstorm", icon: "CloudLightning" },
  };

  const match = mapping[code] || { text: "Cloudy", icon: "Cloud" };
  return {
    text: match.text,
    code: code,
    icon: match.icon,
  };
}

// Convert days of week
const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

// ─── API Routes ──────────────────────────────────────────────────────

// 1. Geocoding search route using Open-Meteo free API
app.get("/api/search", validateRequest(searchQuerySchema, "query"), async (req: Request, res: Response): Promise<void> => {
  const query = req.query.q as string;
  if (!query || query.trim().length === 0) {
    res.json({ results: [] });
    return;
  }

  try {
    // 1. Try OpenStreetMap Nominatim (Better global coverage for Kerala, Tamil Nadu, etc.)
    const nomUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5`;
    const nomRes = await fetch(nomUrl, { headers: { "User-Agent": "VibeWeather/1.0" } });
    if (nomRes.ok) {
      const nomData = await nomRes.json() as any[];
      if (nomData && nomData.length > 0) {
        const results = nomData.map((item: any) => {
          const parts = item.display_name.split(",").map((p: string) => p.trim());
          return {
            name: item.name || parts[0],
            country: parts[parts.length - 1] || "",
            admin1: parts.length > 2 ? parts[parts.length - 2] : "",
            latitude: parseFloat(item.lat),
            longitude: parseFloat(item.lon),
          };
        });
        res.json({ results });
        return;
      }
    }
    
    // 2. Fallback to Open-Meteo geocoding if Nominatim fails or returns empty
    const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=5&language=en&format=json`;
    const response = await fetch(geoUrl);
    if (!response.ok) throw new Error("Both geocoding APIs failed");
    
    const data = (await response.json()) as any;
    const results = (data.results || []).map((item: any) => ({
      name: item.name,
      country: item.country || "",
      admin1: item.admin1 || "",
      latitude: item.latitude,
      longitude: item.longitude,
    }));
    
    if (results.length > 0) {
      res.json({ results });
      return;
    }
    throw new Error("No results found in any API");
    
  } catch (error: any) {
    console.warn("⚠️ Geocoding request failed, falling back to simulated matching results. Details:", error.message || error);
    
    // Fallback static list of popular/requested cities for testing offline
    const fallbackCities = [
      { name: "Kerala", country: "India", admin1: "Kerala", latitude: 10.8505, longitude: 76.2711 },
      { name: "Tamil Nadu", country: "India", admin1: "Tamil Nadu", latitude: 11.1271, longitude: 78.6569 },
      { name: "Siwan", country: "India", admin1: "Bihar", latitude: 26.22, longitude: 84.36 },
      { name: "Patna", country: "India", admin1: "Bihar", latitude: 25.59, longitude: 85.14 },
      { name: "Delhi", country: "India", admin1: "Delhi", latitude: 28.61, longitude: 77.20 },
      { name: "Mumbai", country: "India", admin1: "Maharashtra", latitude: 19.07, longitude: 72.87 },
      { name: "London", country: "United Kingdom", admin1: "England", latitude: 51.51, longitude: -0.13 },
      { name: "New York", country: "United States", admin1: "New York", latitude: 40.71, longitude: -74.01 },
      { name: "Tokyo", country: "Japan", admin1: "Tokyo", latitude: 35.68, longitude: 139.69 },
      { name: "Paris", country: "France", admin1: "Île-de-France", latitude: 48.86, longitude: 2.35 },
    ];
    
    // Filter by query substring (case insensitive)
    const lowerQuery = query.toLowerCase();
    const filtered = fallbackCities.filter(
      c => c.name.toLowerCase().includes(lowerQuery) || c.country.toLowerCase().includes(lowerQuery) || c.admin1.toLowerCase().includes(lowerQuery)
    );
    
    // If no match, just return the first few or a simulated dynamic result
    const results = filtered.length > 0 ? filtered : [
      { name: query.charAt(0).toUpperCase() + query.slice(1), country: "Simulated", admin1: "Offline Area", latitude: 26.22, longitude: 84.36 }
    ];
    
    res.json({ results });
  }
});

// 2. Fetch meteorological data using Open-Meteo API
app.get("/api/weather", validateRequest(weatherQuerySchema, "query"), async (req: Request, res: Response): Promise<void> => {
  const lat = parseFloat(req.query.lat as string);
  const lon = parseFloat(req.query.lon as string);
  const cityName = (req.query.city as string) || "Current Location";

  if (isNaN(lat) || isNaN(lon)) {
    // Default to Siwan, Bihar, India
    res.redirect("/api/weather?lat=26.22&lon=84.36&city=Siwan");
    return;
  }

  try {
    const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&daily=weather_code,temperature_2m_max,temperature_2m_min,relative_humidity_2m_max,wind_speed_10m_max&timezone=auto`;
    const response = await fetch(weatherUrl);

    if (!response.ok) {
      let openMeteoError = "";
      try {
        const errJson = await response.json();
        openMeteoError = errJson.reason || errJson.message || JSON.stringify(errJson);
      } catch (_) {}
      throw new Error(`Failed to retrieve metrics from Open-Meteo API: Status ${response.status}${openMeteoError ? ` - ${openMeteoError}` : ""}`);
    }

    const data = (await response.json()) as any;
    const current = data.current_weather;
    const daily = data.daily;

    if (!current || !daily) {
      throw new Error("Unexpected API payload format");
    }

    // Process current weather
    const condition = getWeatherConditionFromWmo(current.weathercode);
    const temp_c = current.temperature;
    const temp_f = (temp_c * 9) / 5 + 32;
    const wind_kph = current.windspeed;
    const wind_mph = wind_kph / 1.609;

    const weatherPayload = {
      current: {
        temp_c: Math.round(temp_c * 10) / 10,
        temp_f: Math.round(temp_f * 10) / 10,
        condition,
        wind_kph: Math.round(wind_kph * 10) / 10,
        wind_mph: Math.round(wind_mph * 10) / 10,
        humidity: daily.relative_humidity_2m_max ? daily.relative_humidity_2m_max[0] : 65,
        uv: 5, // Simulated fallback UV metric
        feelslike_c: Math.round((temp_c + (condition.text.includes("Rain") ? -1.2 : 0.8)) * 10) / 10,
        feelslike_f: Math.round(((temp_c * 9) / 5 + 32 + (condition.text.includes("Rain") ? -2.2 : 1.4)) * 10) / 10,
        city: cityName,
        country: "",
        lat,
        lon,
        isOfflineFallback: false,
      },
      forecast: daily.time.slice(0, 5).map((dateStr: string, index: number) => {
        const itemDate = new Date(dateStr + "T00:00:00");
        const dayName = DAYS[itemDate.getDay()].slice(0, 3);
        const dayMaxC = daily.temperature_2m_max[index];
        const dayMinC = daily.temperature_2m_min[index];

        return {
          date: dateStr,
          day_of_week: dayName,
          temp_max_c: Math.round(dayMaxC),
          temp_min_c: Math.round(dayMinC),
          temp_max_f: Math.round((dayMaxC * 9) / 5 + 32),
          temp_min_f: Math.round((dayMinC * 9) / 5 + 32),
          condition: getWeatherConditionFromWmo(daily.weather_code[index]),
          humidity: daily.relative_humidity_2m_max ? daily.relative_humidity_2m_max[index] : 60,
        };
      }),
    };

    res.json(weatherPayload);
  } catch (error: any) {
    const details = error?.message || String(error);
    const cause = error?.cause?.message || "";
    console.warn(`⚠️ Weather request failed, falling back to simulated mock data. Details: ${details}${cause ? ` (Cause: ${cause})` : ""}`);

    // Generate realistic simulated mock weather data for offline/unreachable conditions
    const baseTemp = 28.5 + (Math.sin(lat * Math.PI / 180) * 5) + (Math.cos(lon * Math.PI / 180) * 3);
    const temp_c = isNaN(baseTemp) ? 25 : baseTemp;
    const temp_f = (temp_c * 9) / 5 + 32;
    const condition = getWeatherConditionFromWmo(lat > 15 && lat < 30 ? 2 : 1); // partly cloudy or clear

    const dates = Array.from({ length: 5 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() + i);
      return d.toISOString().split("T")[0];
    });

    const mockPayload = {
      current: {
        temp_c: Math.round(temp_c * 10) / 10,
        temp_f: Math.round(temp_f * 10) / 10,
        condition,
        wind_kph: 12.5,
        wind_mph: 7.8,
        humidity: 65,
        uv: 5,
        feelslike_c: Math.round((temp_c + 0.8) * 10) / 10,
        feelslike_f: Math.round((temp_f + 1.4) * 10) / 10,
        city: cityName,
        country: "Simulated",
        lat,
        lon,
        isOfflineFallback: true,
      },
      forecast: dates.map((dateStr, index) => {
        const itemDate = new Date(dateStr + "T00:00:00");
        const dayName = DAYS[itemDate.getDay()].slice(0, 3);
        const dayMaxC = temp_c + 2 + Math.sin(index) * 2;
        const dayMinC = temp_c - 4 + Math.cos(index) * 2;
        const wmoCode = index === 0 ? condition.code : index === 1 ? 1 : index === 2 ? 2 : index === 3 ? 3 : 0;

        return {
          date: dateStr,
          day_of_week: dayName,
          temp_max_c: Math.round(dayMaxC),
          temp_min_c: Math.round(dayMinC),
          temp_max_f: Math.round((dayMaxC * 9) / 5 + 32),
          temp_min_f: Math.round((dayMinC * 9) / 5 + 32),
          condition: getWeatherConditionFromWmo(wmoCode),
          humidity: 60 + Math.round(Math.sin(index) * 10),
        };
      }),
    };

    res.json(mockPayload);
  }
});

// 3. AI Suggestions via Gemini API (strict rate limiting applied)
app.post("/api/weather/ai-suggestions", aiLimiter, validateRequest(aiSuggestionsBodySchema, "body"), async (req: Request, res: Response): Promise<void> => {
  const { currentData } = req.body;

  if (!currentData) {
    res.status(400).json({ error: "Missing current weather context." });
    return;
  }

  const { city, temp_c, condition, humidity, wind_kph } = currentData;

  const prompt = `You are a helpful and witty AI virtual meteorologist built directly into a state-of-the-art mobile app called AeroCast.
Analyze the weather conditions for ${city}:
- Temperature: ${temp_c}°C
- Condition: ${condition.text} (WMO Code: ${condition.code})
- Humidity: ${humidity}%
- Wind Speed: ${wind_kph} km/h

Suggest exactly 3 concise, conversational, actionable activity tips (maximum 12 words per tip, such as "Carry an umbrella! Wet conditions expected" or "Excellent afternoon for a picnic at the park") and check if the conditions warrant a weather alert (storms, rain, extreme speed, extreme temperature high/low).

Return the response in strict JSON format:
{
  "status": "standard" | "warning" | "extreme",
  "tips": ["Tip 1", "Tip 2", "Tip 3"],
  "alert": "Notification Alert description if applicable, otherwise keep it null"
}`;

  if (!ai) {
    // Mock simulation response if API key is not yet configured
    console.log("Gemini Key missing - providing dynamic simulated weather tips.");
    let tips = [
      "Excellent window to enjoy a fresh, breezy outdoor walk details.",
      "Stay hydrated! Keep safe from UV radiation under shade.",
      "Keep an eye out for dynamic wind condition shifts."
    ];
    let alertText: string | null = null;
    let status: "standard" | "warning" | "extreme" = "standard";

    if (condition.text.includes("Rain") || condition.text.includes("Drizzle")) {
      tips = [
        "Pack an umbrella! Slight moisture droplets forecast today.",
        "Perfect time for dynamic indoor gaming or baking sweet treats.",
        "Wet streets could be slippery, maintain cautious driving."
      ];
      alertText = "Rain Warning: Droplets detected. Carry an umbrella!";
      status = "warning";
    } else if (condition.text.includes("Thunderstorm") || condition.text.includes("Lightning")) {
      tips = [
        "Find sturdy, dry shelter and disconnect unnecessary appliances.",
        "Postpone standard outdoor runs until dynamic cloud bursts pass over.",
        "Keep cozy and engage with our exciting Block Puzzle offline mini-game!"
      ];
      alertText = "Thunderstorm Alert: High-voltage cloud discharges. Avoid outdoor areas!";
      status = "extreme";
    }

    res.json({ status, tips, alert: alertText });
    return;
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        temperature: 0.9,
        maxOutputTokens: 250,
      }
    });

    const parsed = JSON.parse(response.text.trim());
    res.json(parsed);
  } catch (error: any) {
    console.warn("⚠️ Gemini Suggestions request failed, falling back to simulated tips. Details:", error.message || error);
    
    let tips = [
      "Excellent window to enjoy a fresh, breezy outdoor walk details.",
      "Stay hydrated! Keep safe from UV radiation under shade.",
      "Keep an eye out for dynamic wind condition shifts."
    ];
    let alertText: string | null = null;
    let status: "standard" | "warning" | "extreme" = "standard";

    if (condition.text.includes("Rain") || condition.text.includes("Drizzle")) {
      tips = [
        "Pack an umbrella! Slight moisture droplets forecast today.",
        "Perfect time for dynamic indoor gaming or baking sweet treats.",
        "Wet streets could be slippery, maintain cautious driving."
      ];
      alertText = "Rain Warning: Droplets detected. Carry an umbrella!";
      status = "warning";
    } else if (condition.text.includes("Thunderstorm") || condition.text.includes("Lightning")) {
      tips = [
        "Find sturdy, dry shelter and disconnect unnecessary appliances.",
        "Postpone standard outdoor runs until dynamic cloud bursts pass over.",
        "Keep cozy and engage with our exciting Block Puzzle offline mini-game!"
      ];
      alertText = "Thunderstorm Alert: High-voltage cloud discharges. Avoid outdoor areas!";
      status = "extreme";
    }

    res.json({ status, tips, alert: alertText });
  }
});

// 4. Voice Assistant Support via Gemini API (strict rate limiting applied)
app.post("/api/weather/voice-assistant", aiLimiter, validateRequest(voiceAssistantBodySchema, "body"), async (req: Request, res: Response): Promise<void> => {
  const { query, weatherContext } = req.body;

  if (!query) {
    res.status(400).json({ error: "Query parameters are crucial for speech request." });
    return;
  }

  let formattedContext = "No context provided.";
  if (weatherContext) {
    formattedContext = `Currently in ${weatherContext.city}: ${weatherContext.temp_c}°C with ${weatherContext.condition.text}. Humidity ${weatherContext.humidity}% and winds ${weatherContext.wind_kph} km/h.`;
  }

  const prompt = `You are dynamic AeroCast voice assistant, a cheerful and companionate weather artificial intelligence.
User is asking: "${query}"
Context weather info: ${formattedContext}

Address the query naturally, referencing the weather. Keep your response spoken-friendly, delightful, clear, and extremely concise (under 40 words total). Speak as if talking to a friend!`;

  if (!ai) {
    // Dynamic mock response when key is absent
    const textQuery = query.toLowerCase();
    let reply = "";
    if (textQuery.includes("game") || textQuery.includes("play") || textQuery.includes("puzzle")) {
      reply = "To access the game, click on the direct 'Block Puzzle' module below! It is completely offline-ready and preserves score history.";
    } else if (textQuery.includes("rain") || textQuery.includes("umbrella") || textQuery.includes("wet")) {
      if (weatherContext?.condition.text.includes("Rain") || weatherContext?.condition.text.includes("Thunderstorm")) {
        reply = "Yes, it looks wet. Carry an umbrella or find cozy cover!";
      } else {
        reply = "Clear skies! Currently, no raindrops are expected soon.";
      }
    } else if (textQuery.includes("advice") || textQuery.includes("tip") || textQuery.includes("suggest") || textQuery.includes("what to do")) {
      reply = weatherContext?.condition.text.includes("Rain") 
        ? "My advice: Stay indoors and enjoy a hot beverage, it's raining!" 
        : "My advice: Great weather for a walk outside! Stay hydrated.";
    } else if (textQuery.includes("temp") || textQuery.includes("hot") || textQuery.includes("cold") || textQuery.includes("warm") || textQuery.includes("cool")) {
      reply = `The temperature is ${weatherContext?.temp_c || 20}°C. It feels like ${weatherContext?.feelslike_c || 20}°C.`;
    } else if (textQuery.includes("hello") || textQuery.includes("hi") || textQuery.includes("hey")) {
      reply = `Hello there! I'm AeroCast AI. How can I help you with the weather today?`;
    } else {
      const fallbackTopic = query.split(" ")[0].substring(0, 15);
      reply = `You asked about "${fallbackTopic}...". Currently it feels like ${weatherContext?.temp_c || 20}°C here. (Note: Running in Demo Mode).`;
    }
    res.json({ reply });
    return;
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        temperature: 0.9,
        maxOutputTokens: 100,
      }
    });

    res.json({ reply: response.text.trim() });
  } catch (err: any) {
    console.warn("⚠️ Gemini Voice Assistant request failed, falling back to simulated dialogue. Details:", err.message || err);
    
    const textQuery = query.toLowerCase();
    let reply = "";
    if (textQuery.includes("game") || textQuery.includes("play") || textQuery.includes("puzzle")) {
      reply = "To access the game, click on the direct 'Block Puzzle' module below! It is completely offline-ready and preserves score history.";
    } else if (textQuery.includes("rain") || textQuery.includes("umbrella") || textQuery.includes("wet")) {
      if (weatherContext?.condition.text.includes("Rain") || weatherContext?.condition.text.includes("Thunderstorm")) {
        reply = "Yes, it looks wet. Carry an umbrella or find cozy cover!";
      } else {
        reply = "Clear skies! Currently, no raindrops are expected soon.";
      }
    } else if (textQuery.includes("advice") || textQuery.includes("tip") || textQuery.includes("suggest") || textQuery.includes("what to do")) {
      reply = weatherContext?.condition.text.includes("Rain") 
        ? "My advice: Stay indoors and enjoy a hot beverage, it's raining!" 
        : "My advice: Great weather for a walk outside! Stay hydrated.";
    } else if (textQuery.includes("temp") || textQuery.includes("hot") || textQuery.includes("cold") || textQuery.includes("warm") || textQuery.includes("cool")) {
      reply = `The temperature is ${weatherContext?.temp_c || 20}°C. It feels like ${weatherContext?.feelslike_c || 20}°C.`;
    } else if (textQuery.includes("hello") || textQuery.includes("hi") || textQuery.includes("hey")) {
      reply = `Hello there! I'm AeroCast AI. How can I help you with the weather today?`;
    } else {
      const fallbackTopic = query.split(" ")[0].substring(0, 15);
      reply = `You asked about "${fallbackTopic}...". Currently it feels like ${weatherContext?.temp_c || 20}°C here. (Note: Running in Demo Mode).`;
    }
    res.json({ reply });
  }
});

// ─── Secure Session Cookie Endpoints (Future Auth Scaffolding) ───────

/**
 * POST /api/auth/session — Create a secure session
 * Sets a signed, HttpOnly, Secure, SameSite cookie.
 */
app.post("/api/auth/session", (req: Request, res: Response): void => {
  const sessionId = crypto.randomUUID();

  res.cookie("aerocast_session", sessionId, {
    httpOnly: true,       // Not accessible via JavaScript (XSS protection)
    secure: process.env.NODE_ENV === "production" || process.env.USE_HTTPS === "true",
    sameSite: "strict",   // Prevents CSRF by rejecting cross-origin cookie usage
    signed: true,         // Tamper detection via HMAC signature
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: "/",
  });

  res.json({
    authenticated: true,
    sessionId,
    message: "Secure session created successfully.",
  });
});

/**
 * GET /api/auth/session — Check session status
 * Reads the signed cookie to determine if user has an active session.
 */
app.get("/api/auth/session", (req: Request, res: Response): void => {
  const sessionId = req.signedCookies?.aerocast_session;

  if (sessionId) {
    res.json({
      authenticated: true,
      sessionId,
    });
  } else {
    res.json({
      authenticated: false,
      message: "No active session found.",
    });
  }
});

/**
 * DELETE /api/auth/session — Clear session
 * Removes the secure cookie to log the user out.
 */
app.delete("/api/auth/session", (req: Request, res: Response): void => {
  res.clearCookie("aerocast_session", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production" || process.env.USE_HTTPS === "true",
    sameSite: "strict",
    signed: true,
    path: "/",
  });

  res.json({
    authenticated: false,
    message: "Session cleared successfully.",
  });
});

// ─── Server Startup ──────────────────────────────────────────────────

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    console.log("Vite middleware mounted in development mode.");
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
    console.log("Production hosting active on compiled directory /dist.");
  }

  // ── Optional HTTPS for local development ──
  // Set USE_HTTPS=true in .env and run scripts/generate-dev-cert.sh first.
  if (process.env.USE_HTTPS === "true") {
    const https = await import("https");
    const fs = await import("fs");

    const certPath = path.join(process.cwd(), "certs", "localhost.cert");
    const keyPath = path.join(process.cwd(), "certs", "localhost.key");

    if (fs.existsSync(certPath) && fs.existsSync(keyPath)) {
      const httpsServer = https.createServer(
        {
          key: fs.readFileSync(keyPath),
          cert: fs.readFileSync(certPath),
        },
        app
      );

      httpsServer.listen(PORT, "0.0.0.0", () => {
        console.log(`🔐 HTTPS Server running on https://localhost:${PORT}`);
      });
      return; // Skip HTTP server if HTTPS is active
    } else {
      console.warn("⚠️  USE_HTTPS is true but certificates not found. Run: bash scripts/generate-dev-cert.sh");
      console.warn("   Falling back to HTTP...");
    }
  }

  // Default HTTP server
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
