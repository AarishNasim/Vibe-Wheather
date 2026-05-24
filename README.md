# AeroCast Weather & Puzzle Game

A beautiful, premium, mobile-first Android Weather Forecast application and offline puzzle game, engineered using React (Vite) and styled with Tailwind CSS, backed by a dual Express (TypeScript) and Flask (Python) stack.

## Architecture

- **Frontend**: Responsive Single-screen dashboard designed with visual weather backgrounds, real-time geolocation mapping, units conversions, sound effects/animations, and an offline, score-tracking Tetris-style Block Puzzle Game.
- **Node Backend (`server.ts`)**: Serves as the active, live backend within AI Studio, proxying real meteorological queries using the free Open-Meteo API and driving content recommendation + voice queries via Gemini. 
- **Python Backend (`api_python/app.py`)**: Companion Flask endpoint code offering equivalent geocoding and forecast structures, complete with CORS configuration for your custom python hosting.

---

## 🚀 Quick Start (Local Web Server)

### Prerequisites
- Node.js (v18+)

### Steps
1. Install dependencies:
   ```bash
   npm install
   ```
2. Set your environment variables in `.env`:
   ```env
   GEMINI_API_KEY="YOUR_API_KEY_HERE"
   ```
3. Boot the Express + Vite server in hot dev mode:
   ```bash
   npm run dev
   ```
4. Access the gorgeous live dashboard at `http://localhost:3000`.

---

## 🐍 Running the Python Flask Backend

1. Navigate to the Python root or set up a virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```
2. Install dependencies:
   ```bash
   pip install flask flask-cors requests
   ```
3. Launch the API:
   ```bash
   python api_python/app.py
   ```
4. Your Flask weather portal will run at `http://localhost:5000`. Set your mobile configuration base URL to target this address.

---

## 📱 Compiling & Generating an Android APK

To bundle this application into a custom native Android APK, we recommend using **CapacitorJS**, which packages the React build directly into high-performance web view wrappers with full native support.

### 1. Initialize Capacitor
Add Capacitor Core and Android integration to your workspace:
```bash
npm install @capacitor/core @capacitor/cli @capacitor/android
npx cap init AeroCast com.aerocast.weather --web-dir=dist
```

### 2. Prepare the Web Assets
Verify that your Vite project builds correctly:
```bash
npm run build
```
This gathers fully compiled scripts, styles, and assets in your `/dist` folder.

### 3. Setup Android Platform
Add the Android project boilerplate:
```bash
npx cap add android
```

### 4. Directing to Live Server or Offline Cache
During local testing on physical devices, update `capacitor.config.json` to allow insecure cleartext and target your local development IP:
```json
{
  "appId": "com.aerocast.weather",
  "appName": "AeroCast",
  "webDir": "dist",
  "server": {
    "cleartext": true,
    "allowNavigation": ["192.168.1.X:3000"]
  }
}
```

### 5. Open and Build in Android Studio
Copy web directory builds down into the native assets space:
```bash
npx cap sync
npx cap open android
```
This forces **Android Studio** to open the target folder. 

1. Within Android Studio, wait for the **Gradle sync** to complete safely.
2. Select **Build > Build Bundle(s) / APK(s) > Build APK(s)** in the top menu.
3. Once completed, a standard notification reveals the location of `app-debug.apk`. Transfer this directly to your mobile device, allow installation from unknown sources, and launch **AeroCast**!
