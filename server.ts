/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express, { Request, Response } from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize Gemini Client safely
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
    48: { text: "Depositing Rime Fog", icon: "CloudFog" },
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

// 1. Geocoding search route using Open-Meteo free API
app.get("/api/search", async (req: Request, res: Response): Promise<void> => {
  const query = req.query.q as string;
  if (!query || query.trim().length === 0) {
    res.json({ results: [] });
    return;
  }

  try {
    // Call geocoding API
    const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=5&language=en&format=json`;
    const response = await fetch(geoUrl);
    if (!response.ok) {
      throw new Error("Failed to connect to geocoding API");
    }

    const data = (await response.json()) as any;
    const results = (data.results || []).map((item: any) => ({
      name: item.name,
      country: item.country || "",
      admin1: item.admin1 || "",
      latitude: item.latitude,
      longitude: item.longitude,
    }));

    res.json({ results });
  } catch (error: any) {
    console.error("Geocoding Error:", error);
    res.status(500).json({ error: "Could not find locations. Please try again." });
  }
});

// 2. Fetch meteorological data using Open-Meteo API
app.get("/api/weather", async (req: Request, res: Response): Promise<void> => {
  const lat = parseFloat(req.query.lat as string);
  const lon = parseFloat(req.query.lon as string);
  const cityName = (req.query.city as string) || "Current Location";

  if (isNaN(lat) || isNaN(lon)) {
    // Default to New York, NY
    res.redirect("/api/weather?lat=40.7128&lon=-74.0060&city=New%20York");
    return;
  }

  try {
    const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&daily=weathercode,temperature_2m_max,temperature_2m_min,relativehumidity_2m_max,windspeed_10m_max&hourly=temperature_2m,weathercode,windspeed_10m,relativehumidity_2m&timezone=auto&forecast_days=2`;
    const response = await fetch(weatherUrl);

    if (!response.ok) {
      throw new Error("Failed to retrieve metrics from Open-Meteo API");
    }

    const data = (await response.json()) as any;
    const current = data.current_weather;
    const daily = data.daily;
    const hourlyRaw = data.hourly;

    if (!current || !daily) {
      throw new Error("Unexpected API payload format");
    }

    // Process current weather
    const condition = getWeatherConditionFromWmo(current.weathercode);
    const temp_c = current.temperature;
    const temp_f = (temp_c * 9) / 5 + 32;
    const wind_kph = current.windspeed;
    const wind_mph = wind_kph / 1.609;

    // Process hourly data — find the next 24 hours from now
    const nowISO = new Date().toISOString().slice(0, 13) + ":00";
    let hourlyStartIdx = 0;
    if (hourlyRaw?.time) {
      const idx = (hourlyRaw.time as string[]).findIndex((t) => t >= nowISO);
      hourlyStartIdx = idx >= 0 ? idx : 0;
    }
    const hourlyForecasts = hourlyRaw?.time
      ? (hourlyRaw.time as string[]).slice(hourlyStartIdx, hourlyStartIdx + 24).map((timeStr, i) => {
          const idx = hourlyStartIdx + i;
          const hTc = hourlyRaw.temperature_2m[idx] ?? temp_c;
          const hTf = (hTc * 9) / 5 + 32;
          return {
            time: timeStr.slice(11, 16),
            temp_c: Math.round(hTc * 10) / 10,
            temp_f: Math.round(hTf * 10) / 10,
            condition: getWeatherConditionFromWmo(hourlyRaw.weathercode?.[idx] ?? current.weathercode),
            windspeed_kph: Math.round((hourlyRaw.windspeed_10m?.[idx] ?? wind_kph) * 10) / 10,
            humidity: hourlyRaw.relativehumidity_2m?.[idx] ?? 65,
          };
        })
      : [];

    const weatherPayload = {
      current: {
        temp_c: Math.round(temp_c * 10) / 10,
        temp_f: Math.round(temp_f * 10) / 10,
        condition,
        wind_kph: Math.round(wind_kph * 10) / 10,
        wind_mph: Math.round(wind_mph * 10) / 10,
        humidity: daily.relativehumidity_2m_max ? daily.relativehumidity_2m_max[0] : 65,
        uv: 5, // Simulated fallback UV metric
        feelslike_c: Math.round((temp_c + (condition.text.includes("Rain") ? -1.2 : 0.8)) * 10) / 10,
        feelslike_f: Math.round(((temp_c * 9) / 5 + 32 + (condition.text.includes("Rain") ? -2.2 : 1.4)) * 10) / 10,
        city: cityName,
        country: "",
        lat,
        lon,
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
          condition: getWeatherConditionFromWmo(daily.weathercode[index]),
          humidity: daily.relativehumidity_2m_max ? daily.relativehumidity_2m_max[index] : 60,
        };
      }),
      hourly: hourlyForecasts,
    };

    res.json(weatherPayload);
  } catch (error: any) {
    console.error("Weather retrieving error:", error);
    res.status(500).json({ error: "Failed to access real-time weather information." });
  }
});

// 3. AI Suggestions via Gemini API
app.post("/api/weather/ai-suggestions", async (req: Request, res: Response): Promise<void> => {
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
      }
    });

    const parsed = JSON.parse(response.text.trim());
    res.json(parsed);
  } catch (error: any) {
    console.error("Gemini Suggestions Error:", error);
    res.status(500).json({ error: "Could not retrieve automated guidelines." });
  }
});

// 4. Voice Assistant Support via Gemini API
app.post("/api/weather/voice-assistant", async (req: Request, res: Response): Promise<void> => {
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
    if (textQuery.includes("game") || textQuery.includes("play")) {
      reply = "To access the game, click on the direct 'Block Puzzle' module below! It is completely offline-ready and preserves score history.";
    } else if (textQuery.includes("rain") || textQuery.includes("umbrella")) {
      if (weatherContext?.condition.text.includes("Rain") || weatherContext?.condition.text.includes("Thunderstorm")) {
        reply = "Yes, it looks wet. Carry an umbrella or find cozy cover!";
      } else {
        reply = "Clear clouds! Currently, no raindrops are expected soon.";
      }
    } else {
      reply = `Hello! Currently it feels like ${weatherContext?.temp_c || 20}°C in our target location. Let me know if you want coordinates or advice!`;
    }
    res.json({ reply });
    return;
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
    });

    res.json({ reply: response.text.trim() });
  } catch (err: any) {
    console.error("Gemini Voice Assistant Error:", err);
    res.status(500).json({ error: "Failed to connect voice query processor." });
  }
});

// Set up Vite or Static File server hosting
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

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
