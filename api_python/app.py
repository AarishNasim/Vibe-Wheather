# -*- coding: utf-8 -*-
"""
AeroCast Weather Detection Backend - Python Flask API
SPDX-License-Identifier: Apache-2.0
"""

import os
import requests
from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
# Enable Cross-Origin Resource Sharing for mobile or web clients
CORS(app)

# Fallback WMO condition code translator
WMO_CODES = {
    0: {"text": "Sunny", "icon": "Sun"},
    1: {"text": "Mainly Clear", "icon": "CloudSun"},
    2: {"text": "Partly Cloudy", "icon": "Cloud"},
    3: {"text": "Overcast", "icon": "Cloudy"},
    45: {"text": "Fog", "icon": "CloudFog"},
    48: {"text": "Depositing Rime Fog", "icon": "CloudFog"},
    51: {"text": "Light Drizzle", "icon": "CloudDrizzle"},
    53: {"text": "Moderate Drizzle", "icon": "CloudDrizzle"},
    55: {"text": "Dense Drizzle", "icon": "CloudDrizzle"},
    61: {"text": "Slight Rain", "icon": "CloudRain"},
    63: {"text": "Moderate Rain", "icon": "CloudRain"},
    65: {"text": "Heavy Rain", "icon": "CloudRain"},
    71: {"text": "Slight Snowfall", "icon": "CloudSnow"},
    73: {"text": "Moderate Snowfall", "icon": "CloudSnow"},
    75: {"text": "Heavy Snowfall", "icon": "CloudSnow"},
    80: {"text": "Slight Rain Showers", "icon": "CloudRain"},
    81: {"text": "Moderate Rain Showers", "icon": "CloudRain"},
    82: {"text": "Violent Rain Showers", "icon": "CloudRain"},
    95: {"text": "Thunderstorm", "icon": "CloudLightning"},
    96: {"text": "Thunderstorm with Hail", "icon": "CloudLightning"},
    99: {"text": "Severe Thunderstorm", "icon": "CloudLightning"},
}

def get_condition_info(code):
    return WMO_CODES.get(code, {"text": "Cloudy", "icon": "Cloud"})

@app.route('/api/search', methods=['GET'])
def search_locations():
    query = request.args.get('q', '').strip()
    if not query:
        return jsonify({"results": []})
    
    try:
        url = f"https://geocoding-api.open-meteo.com/v1/search?name={requests.utils.quote(query)}&count=5&language=en&format=json"
        response = requests.get(url, timeout=10)
        if response.status_code != 200:
            return jsonify({"error": "Failed to look up coordinate names"}), 500
            
        data = response.json()
        results = []
        for item in data.get('results', []):
            results.append({
                "name": item.get('name'),
                "country": item.get('country', ''),
                "admin1": item.get('admin1', ''),
                "latitude": item.get('latitude'),
                "longitude": item.get('longitude')
            })
            
        return jsonify({"results": results})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/weather', methods=['GET'])
def get_weather():
    lat = request.args.get('lat')
    lon = request.args.get('lon')
    city = request.args.get('city', 'Selected Location')
    
    if not lat or not lon:
        # Default to New York
        lat = "40.7128"
        lon = "-74.0060"
        city = "New York"
        
    try:
        url = f"https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&current_weather=true&daily=weathercode,temperature_2m_max,temperature_2m_min,relativehumidity_2m_max,windspeed_10m_max&timezone=auto"
        response = requests.get(url, timeout=10)
        if response.status_code != 200:
            return jsonify({"error": "Failed to retrieve real weather data"}), 500
            
        data = response.json()
        current = data.get('current_weather', {})
        daily = data.get('daily', {})
        
        condition = get_condition_info(current.get('weathercode', 0))
        temp_c = current.get('temperature', 0)
        temp_f = (temp_c * 9/5) + 32
        wind_kph = current.get('windspeed', 0)
        wind_mph = wind_kph / 1.609
        
        payload = {
            "current": {
                "temp_c": round(temp_c, 1),
                "temp_f": round(temp_f, 1),
                "condition": condition,
                "wind_kph": round(wind_kph, 1),
                "wind_mph": round(wind_mph, 1),
                "humidity": daily.get('relativehumidity_2m_max', [65])[0] if daily.get('relativehumidity_2m_max') else 65,
                "uv": 5,
                "feelslike_c": round(temp_c + (-1.2 if "Rain" in condition["text"] else 0.8), 1),
                "feelslike_f": round(temp_f + (-2.2 if "Rain" in condition["text"] else 1.4), 1),
                "city": city,
                "country": ""
            },
            "forecast": []
        }
        
        days_of_week = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
        times = daily.get('time', [])
        for index, date_str in enumerate(times[:5]):
            max_c = daily.get('temperature_2m_max', [])[index]
            min_c = daily.get('temperature_2m_min', [])[index]
            wmo = daily.get('weathercode', [])[index]
            
            payload["forecast"].append({
                "date": date_str,
                "day_of_week": days_of_week[index % len(days_of_week)], # Rough weekday wrap
                "temp_max_c": round(max_c),
                "temp_min_c": round(min_c),
                "temp_max_f": round((max_c * 9/5) + 32),
                "temp_min_f": round((min_c * 9/5) + 32),
                "condition": get_condition_info(wmo),
                "humidity": daily.get('relativehumidity_2m_max', [60])[index] if daily.get('relativehumidity_2m_max') else 60
            })
            
        return jsonify(payload)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/weather/ai-suggestions', methods=['POST'])
def ai_suggestions():
    # To retain lightweight, free status offline, this returns smart offline suggestions.
    # If the user has a Gemini API KEY, they could also make request to Gemini from Flask with Google GenAI SDK.
    body = request.get_json() or {}
    current_data = body.get('currentData', {})
    city = current_data.get('city', 'Location')
    condition = current_data.get('condition', {}).get('text', 'Clear')
    
    tips = [
        "Excellent window to enjoy a fresh, breezy outdoor walk details.",
        "Stay hydrated! Keep safe from UV radiation under shade.",
        "Keep an eye out for dynamic wind condition shifts."
    ]
    alert = None
    status = "standard"
    
    if "Rain" in condition or "Drizzle" in condition:
        tips = [
            "Pack an umbrella! Slight moisture droplets forecast today.",
            "Perfect time for dynamic indoor gaming or baking sweet treats.",
            "Wet streets could be slippery, maintain cautious driving."
        ]
        alert = "Rain Warning: Rain detected. Carry your shield!"
        status = "warning"
    elif "Thunderstorm" in condition or "Lightning" in condition:
        tips = [
            "Find sturdy, dry shelter and disconnect unnecessary appliances.",
            "Postpone standard outdoor runs until dynamic cloud bursts pass over.",
            "Keep cozy and engage with our exciting Block Puzzle offline mini-game!"
        ]
        alert = "Extreme Weather Warning: Severe thunderstorm in vicinity! Take cover immediately."
        status = "extreme"
        
    return jsonify({
        "tips": tips,
        "alert": alert,
        "status": status
    })

if __name__ == '__main__':
    # Run server locally on standard port 5000 for python deployments
    host_port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=host_port, debug=True)
