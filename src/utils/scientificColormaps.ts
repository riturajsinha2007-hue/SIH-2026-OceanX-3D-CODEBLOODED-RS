import { ColormapType, OceanVariable } from '../types/ocean';

// 1. INCOIS ERDDAP Standard Ferret Rainbow (Matching official INCOIS Argo SST & VAM datasets)
export const incoisRainbowStops: [number, string][] = [
  [0.00, '#660099'], // Deep Violet / Purple
  [0.14, '#0011ee'], // Royal Blue
  [0.28, '#00d0ff'], // Bright Cyan
  [0.42, '#00dd22'], // Pure Spring Green
  [0.57, '#ffee00'], // Bright Yellow
  [0.71, '#ff7700'], // Orange
  [0.85, '#e00000'], // Red
  [1.00, '#660000'], // Deep Maroon
];

// 2. Thermal: Sequential temperature scale (cmocean thermal: perceptual linear brightness)
export const thermalStops: [number, string][] = [
  [0.00, '#041c4a'], // Abyssal cold dark navy
  [0.12, '#0c3875'], // Deep ocean blue
  [0.25, '#12619e'], // Marine cyan-blue
  [0.38, '#1e8ec2'], // Sky azure
  [0.50, '#36bca4'], // Teal transition
  [0.62, '#69d479'], // Emerald green
  [0.74, '#bce354'], // Lime yellow
  [0.85, '#f4b82d'], // Amber gold
  [0.94, '#e65c19'], // Warm orange
  [1.00, '#a81008'], // Crimson red
];

// 3. Halite: Oceanic salinity scale (cmocean halite palette with fine perceptual gradations)
export const haliteStops: [number, string][] = [
  [0.00, '#1a103c'], // 30.5 PSU - Deep Indigo (Fresh River Plumes / Northern BoB)
  [0.14, '#123970'], // 31.8 PSU - Dark Marine Blue
  [0.28, '#106494'], // 32.7 PSU - Ocean Cyan-Blue
  [0.42, '#149692'], // 33.5 PSU - Teal / Marine Turquoise
  [0.56, '#2db870'], // 34.4 PSU - Emerald Green (Equatorial / Open Ocean)
  [0.70, '#7cd04e'], // 35.2 PSU - Vibrant Lime Green (Subtropical Gyre)
  [0.82, '#d0dc3e'], // 35.9 PSU - Gold-Yellow (Arabian Sea Open Basin)
  [0.92, '#f5a623'], // 36.5 PSU - Amber Gold (Northern Arabian Sea)
  [1.00, '#fffbe6'], // 37.0+ PSU - Salt Pale White (Hyper-saline Gulfs & Evaporation Core)
];

// 4. Algae: Scientifically calibrated logarithmic Chlorophyll-a palette (cmocean algae / NASA OceanColor)
export const algaeStops: [number, string][] = [
  [0.00, '#071930'], // 0.02 mg/m³ - Deep dark indigo (Ultra-oligotrophic desert waters)
  [0.12, '#0e3e56'], // 0.05 mg/m³ - Marine dark teal
  [0.25, '#106b63'], // 0.12 mg/m³ - Deep turquoise
  [0.40, '#1b9d62'], // 0.35 mg/m³ - Rich chlorophyll green
  [0.55, '#42c852'], // 0.85 mg/m³ - Vibrant emerald green (Coastal shelf)
  [0.70, '#8ee346'], // 2.20 mg/m³ - Bright yellow-green (Productive upwelling)
  [0.82, '#e1e838'], // 5.00 mg/m³ - Golden yellow (Intense diatom bloom)
  [0.92, '#e89327'], // 10.0 mg/m³ - Amber orange (Estuarine plume)
  [1.00, '#8a1808'], // 25.0+ mg/m³ - Deep brownish red (Dense algal bloom)
];

// 5. Balance: Diverging Sea Surface Height / Sea Level Anomaly scale (cmocean balance: centered at 0.00m)
export const balanceStops: [number, string][] = [
  [0.00, '#081d58'], // -0.40 m - Deep navy (Intense cyclonic eddy / cold core)
  [0.15, '#253494'], // -0.28 m - Marine blue
  [0.28, '#225ea8'], // -0.18 m - Steel blue
  [0.40, '#41b6c4'], // -0.08 m - Sky cyan
  [0.50, '#f8f9fa'], //  0.00 m - Pure crisp white (Mean Sea Level Reference)
  [0.60, '#feb24c'], // +0.08 m - Pale warm amber
  [0.72, '#fd8d3c'], // +0.18 m - Orange
  [0.85, '#e31a1c'], // +0.28 m - Crimson
  [1.00, '#800026'], // +0.40 m - Deep garnet red (Intense anticyclonic warm core)
];

// 6. Speed: Ocean current velocity magnitude scale (cmocean tempo / speed: 0 to 1.5 m/s)
export const speedStops: [number, string][] = [
  [0.00, '#1e1b4b'], // 0.00 m/s - Calm / Slack water
  [0.20, '#0284c7'], // 0.30 m/s - Moderate drift
  [0.45, '#10b981'], // 0.65 m/s - Steady current
  [0.70, '#f59e0b'], // 1.05 m/s - Strong boundary current
  [0.85, '#ef4444'], // 1.30 m/s - Jet core (Somali Current)
  [1.00, '#c026d3'], // 1.50+ m/s - High velocity jet
];

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  const bigint = parseInt(clean, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return [r, g, b];
}

export function getStopsForColormap(colormap: ColormapType): [number, string][] {
  switch (colormap) {
    case 'incois_rainbow':
      return incoisRainbowStops;
    case 'thermal':
      return thermalStops;
    case 'halite':
      return haliteStops;
    case 'algae':
      return algaeStops;
    case 'balance':
      return balanceStops;
    case 'speed':
      return speedStops;
    default:
      return thermalStops;
  }
}

export function getColorForValue(
  val: number,
  minVal: number,
  maxVal: number,
  colormap: ColormapType,
  opacity: number = 0.85,
  isLogScale: boolean = false,
  isDiverging: boolean = false,
  referenceCenter: number = 0
): [number, number, number, number] {
  if (isNaN(val) || val === null || val === undefined) {
    return [0, 0, 0, 0]; // Transparent for land / missing data
  }

  let normalized: number;

  if (isDiverging) {
    // True diverging scale centered strictly around referenceCenter (e.g. 0.00 m)
    const center = referenceCenter;
    if (val < center) {
      const lowerSpan = center - minVal || 0.0001;
      const t = Math.max(0, (val - minVal) / lowerSpan); // 0 at minVal, 1 at center
      normalized = t * 0.5; // [0.0, 0.5]
    } else {
      const upperSpan = maxVal - center || 0.0001;
      const t = Math.min(1, (val - center) / upperSpan); // 0 at center, 1 at maxVal
      normalized = 0.5 + t * 0.5; // [0.5, 1.0]
    }
  } else if (isLogScale && minVal > 0 && maxVal > minVal) {
    // Logarithmic scale for variables spanning orders of magnitude (CHLA: 0.02 to 20 mg/m³)
    const clampedVal = Math.max(minVal, Math.min(maxVal, val));
    const logMin = Math.log10(minVal);
    const logMax = Math.log10(maxVal);
    const logVal = Math.log10(clampedVal);
    normalized = Math.max(0, Math.min(1, (logVal - logMin) / (logMax - logMin)));
  } else {
    // Linear scale (TEMP, SAL)
    const range = maxVal - minVal || 1;
    normalized = Math.max(0, Math.min(1, (val - minVal) / range));
  }

  const stops = getStopsForColormap(colormap);

  // Find surrounding color stops
  let lower = stops[0];
  let upper = stops[stops.length - 1];

  for (let i = 0; i < stops.length - 1; i++) {
    if (normalized >= stops[i][0] && normalized <= stops[i + 1][0]) {
      lower = stops[i];
      upper = stops[i + 1];
      break;
    }
  }

  const segmentRange = upper[0] - lower[0] || 0.0001;
  const factor = (normalized - lower[0]) / segmentRange;

  const [r1, g1, b1] = hexToRgb(lower[1]);
  const [r2, g2, b2] = hexToRgb(upper[1]);

  const r = Math.round(r1 + (r2 - r1) * factor);
  const g = Math.round(g1 + (g2 - g1) * factor);
  const b = Math.round(b1 + (b2 - b1) * factor);
  const a = Math.round(opacity * 255);

  return [r, g, b, a];
}

export function getColorCssGradient(colormap: ColormapType): string {
  const stops = getStopsForColormap(colormap);
  const gradStops = stops.map(([pos, hex]) => `${hex} ${Math.round(pos * 100)}%`).join(', ');
  return `linear-gradient(to right, ${gradStops})`;
}

export interface DefaultRangeResult {
  min: number;
  max: number;
  unit: string;
  isLog: boolean;
  isDiverging: boolean;
  referenceCenter: number;
}

export function getDefaultRange(variable: OceanVariable, depth: number): DefaultRangeResult {
  if (variable === 'CHLA') {
    // IRS P4 OCM / Oceansat-2 Chlorophyll-a (mg/m³) log scale calibrated per layer
    if (depth <= 10) return { min: 0.03, max: 25.0, unit: 'mg/m³', isLog: true, isDiverging: false, referenceCenter: 1.0 };
    if (depth <= 50) return { min: 0.03, max: 5.0, unit: 'mg/m³', isLog: true, isDiverging: false, referenceCenter: 0.5 };
    if (depth <= 100) return { min: 0.01, max: 0.8, unit: 'mg/m³', isLog: true, isDiverging: false, referenceCenter: 0.1 };
    if (depth <= 200) return { min: 0.005, max: 0.08, unit: 'mg/m³', isLog: true, isDiverging: false, referenceCenter: 0.02 };
    if (depth <= 500) return { min: 0.002, max: 0.02, unit: 'mg/m³', isLog: true, isDiverging: false, referenceCenter: 0.005 };
    return { min: 0.001, max: 0.01, unit: 'mg/m³', isLog: true, isDiverging: false, referenceCenter: 0.002 };
  }

  if (variable === 'SSH') {
    // Altimetry Sea Surface Height / Sea Level Anomaly (m) - Diverging around 0.00m Mean Sea Level
    return { min: -0.40, max: 0.40, unit: 'm', isLog: false, isDiverging: true, referenceCenter: 0.00 };
  }

  if (variable === 'TEMP') {
    // Standard INCOIS Argo SST & VAM temperature ranges matching Indian Ocean water masses
    if (depth <= 10) return { min: 18.0, max: 31.0, unit: '°C', isLog: false, isDiverging: false, referenceCenter: 24.5 };
    if (depth <= 50) return { min: 16.5, max: 29.5, unit: '°C', isLog: false, isDiverging: false, referenceCenter: 23.0 };
    if (depth <= 100) return { min: 13.5, max: 26.5, unit: '°C', isLog: false, isDiverging: false, referenceCenter: 20.0 };
    if (depth <= 200) return { min: 10.5, max: 18.8, unit: '°C', isLog: false, isDiverging: false, referenceCenter: 14.5 };
    if (depth <= 500) return { min: 6.5, max: 12.5, unit: '°C', isLog: false, isDiverging: false, referenceCenter: 9.5 };
    return { min: 3.5, max: 7.5, unit: '°C', isLog: false, isDiverging: false, referenceCenter: 5.5 };
  }

  // Salinity in Indian Ocean (Bay of Bengal fresh plumes to Arabian Sea High Salinity Water & intermediate cores)
  if (depth <= 10) return { min: 30.5, max: 37.2, unit: 'PSU', isLog: false, isDiverging: false, referenceCenter: 34.0 };
  if (depth <= 50) return { min: 33.2, max: 36.8, unit: 'PSU', isLog: false, isDiverging: false, referenceCenter: 35.0 };
  if (depth <= 100) return { min: 34.4, max: 36.5, unit: 'PSU', isLog: false, isDiverging: false, referenceCenter: 35.4 };
  if (depth <= 200) return { min: 34.7, max: 36.2, unit: 'PSU', isLog: false, isDiverging: false, referenceCenter: 35.4 };
  if (depth <= 500) return { min: 34.6, max: 35.8, unit: 'PSU', isLog: false, isDiverging: false, referenceCenter: 35.2 };
  return { min: 34.3, max: 35.2, unit: 'PSU', isLog: false, isDiverging: false, referenceCenter: 34.7 };
}

/**
 * Returns the scientifically recommended default colormap for a variable
 */
export function getDefaultColormapForVariable(variable: OceanVariable): ColormapType {
  switch (variable) {
    case 'TEMP':
      return 'thermal';
    case 'SAL':
      return 'halite';
    case 'CHLA':
      return 'algae';
    case 'SSH':
      return 'balance';
    default:
      return 'thermal';
  }
}

/**
 * Checks whether a variable only exists at the sea surface (e.g. satellite radiometer / altimeter)
 */
export function isSurfaceOnlyVariable(variable: OceanVariable): boolean {
  return variable === 'CHLA' || variable === 'SSH';
}

/**
 * Descriptive label for an ocean variable
 */
export function getVariableTitle(variable: OceanVariable): string {
  switch (variable) {
    case 'TEMP':
      return 'Temperature';
    case 'SAL':
      return 'Salinity';
    case 'CHLA':
      return 'Chlorophyll-a';
    case 'SSH':
      return 'Sea Surface Height';
    default:
      return variable;
  }
}

/**
 * Physical unit for an ocean variable
 */
export function getVariableUnit(variable: OceanVariable): string {
  switch (variable) {
    case 'TEMP':
      return '°C';
    case 'SAL':
      return 'PSU';
    case 'CHLA':
      return 'mg/m³';
    case 'SSH':
      return 'm';
    default:
      return '';
  }
}
