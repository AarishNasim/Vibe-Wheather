/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { 
  Sun, 
  CloudSun, 
  Cloud, 
  Cloudy, 
  CloudFog, 
  CloudDrizzle, 
  CloudRain, 
  CloudSnow, 
  CloudLightning,
  AlertTriangle,
  Wind,
  Droplets,
  Thermometer
} from "lucide-react";

export function getWeatherIcon(iconName: string, className = "w-6 h-6") {
  switch (iconName) {
    case "Sun":
      return <Sun className={`${className} text-amber-400 fill-amber-300/20`} />;
    case "CloudSun":
      return <CloudSun className={`${className} text-sky-400`} />;
    case "Cloud":
      return <Cloud className={`${className} text-slate-400`} />;
    case "Cloudy":
      return <Cloudy className={`${className} text-slate-500`} />;
    case "CloudFog":
      return <CloudFog className={`${className} text-slate-300`} />;
    case "CloudDrizzle":
      return <CloudDrizzle className={`${className} text-teal-400`} />;
    case "CloudRain":
      return <CloudRain className={`${className} text-blue-400 fill-blue-300/10`} />;
    case "CloudSnow":
      return <CloudSnow className={`${className} text-cyan-200 fill-cyan-100/10`} />;
    case "CloudLightning":
      return <CloudLightning className={`${className} text-indigo-400 fill-indigo-300/10`} />;
    default:
      return <Cloud className={`${className} text-slate-400`} />;
  }
}

// TODO: Verify usage - potential dead code (exported but not imported anywhere currently)
export function getDetailIcon(type: string, className = "w-5 h-5") {
  switch (type) {
    case "wind":
      return <Wind className={`${className} text-emerald-400`} />;
    case "humidity":
      return <Droplets className={`${className} text-blue-400`} />;
    case "temp":
      return <Thermometer className={`${className} text-rose-400`} />;
    default:
      return <AlertTriangle className={`${className} text-amber-400`} />;
  }
}
