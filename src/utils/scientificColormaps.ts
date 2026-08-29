import { ColormapType, OceanVariable } from '../types/ocean';

// 1. INCOIS ERDDAP Standard Ferret Rainbow (Matching official INCOIS Argo SST & VAM datasets)
const incoisRainbowStops: [number, string][] = [
  [0.00, '#660099'], // Deep Violet / Purple (18°C)
  [0.14, '#0011ee'], // Royal Blue (20°C)
  [0.28, '#00d0ff'], // Bright Cyan (21°C)
  [0.42, '#00dd22'], // Pure Spring Green (24°C)
  [0.57, '#ffee00'], // Bright Yellow (25.5°C)
  [0.71, '#ff7700'], // Orange (27°C)
  [0.85, '#e00000'], // Red (29°C)
  [1.00, '#660000'], // Deep Maroon (30°C+)
];

// 2. Thermal: Smooth cmocean temperature ramp
const thermalStops: [number, string][] = [
  [0.00, '#041c4a'],
  [0.12, '#0c3875'],
  [0.25, '#12619e'],
  [0.38, '#1e8ec2'],
  [0.50, '#36bca4'],
  [0.62, '#69d479'],
  [0.74, '#bce354'],
  [0.85, '#f4b82d'],
  [0.94, '#e65c19'],
  [1.00, '#a81008'],
];

// 3. Halite: Oceanic salinity ramp (cmocean halite palette with fine perceptual gradations)
const haliteStops: [number, string][] = [
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

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  const bigint = parseInt(clean, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return [r, g, b];
}

export function getColorForValue(
  val: number,
  minVal: number,
  maxVal: number,
  colormap: ColormapType,
  opacity: number = 0.85,
  isLogScale: boolean = false
): [number, number, number, number] {
  if (isNaN(val) || val === null || val === undefined) {
    return [0, 0, 0, 0]; // Transparent for land
  }

  let normalized: number;
  if (isLogScale && minVal > 0 && maxVal > minVal) {
    const logMin = Math.log10(minVal);
    const logMax = Math.log10(maxVal);
    const logVal = Math.log10(Math.max(minVal, Math.min(maxVal, val)));
    normalized = Math.max(0, Math.min(1, (logVal - logMin) / (logMax - logMin)));
  } else {
    const range = maxVal - minVal || 1;
    normalized = Math.max(0, Math.min(1, (val - minVal) / range));
  }

  let stops = incoisRainbowStops;
  if (colormap === 'incois_rainbow') stops = incoisRainbowStops;
  else if (colormap === 'thermal') stops = thermalStops;
  else if (colormap === 'halite') stops = haliteStops;

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
  let stops = incoisRainbowStops;
  if (colormap === 'incois_rainbow') stops = incoisRainbowStops;
  else if (colormap === 'thermal') stops = thermalStops;
  else if (colormap === 'halite') stops = haliteStops;

  const gradStops = stops.map(([pos, hex]) => `${hex} ${Math.round(pos * 100)}%`).join(', ');
  return `linear-gradient(to right, ${gradStops})`;
}

export function getDefaultRange(variable: OceanVariable, depth: number): { min: number; max: number; unit: string; isLog: boolean } {
  if (variable === 'CHLA') {
    // IRS P4 OCM Chlorophyll-a (mg/m³) log scale calibrated per layer
    if (depth <= 10) return { min: 0.03, max: 25.0, unit: 'mg/m³', isLog: true };
    if (depth <= 50) return { min: 0.03, max: 5.0, unit: 'mg/m³', isLog: true };
    if (depth <= 100) return { min: 0.01, max: 0.8, unit: 'mg/m³', isLog: true };
    if (depth <= 200) return { min: 0.005, max: 0.08, unit: 'mg/m³', isLog: true };
    if (depth <= 500) return { min: 0.002, max: 0.02, unit: 'mg/m³', isLog: true };
    return { min: 0.001, max: 0.01, unit: 'mg/m³', isLog: true };
  }

  if (variable === 'TEMP') {
    // Standard INCOIS Argo SST & VAM temperature ranges matching Indian Ocean water masses
    if (depth <= 10) return { min: 18.0, max: 31.0, unit: '°C', isLog: false };
    if (depth <= 50) return { min: 16.5, max: 29.5, unit: '°C', isLog: false };
    if (depth <= 100) return { min: 13.5, max: 26.5, unit: '°C', isLog: false };
    if (depth <= 200) return { min: 10.5, max: 18.8, unit: '°C', isLog: false };
    if (depth <= 500) return { min: 6.5, max: 12.5, unit: '°C', isLog: false };
    return { min: 3.5, max: 7.5, unit: '°C', isLog: false };
  }

  // Salinity in Indian Ocean (Bay of Bengal fresh plumes to Arabian Sea High Salinity Water & intermediate cores)
  if (depth <= 10) return { min: 30.5, max: 37.2, unit: 'PSU', isLog: false };
  if (depth <= 50) return { min: 33.2, max: 36.8, unit: 'PSU', isLog: false };
  if (depth <= 100) return { min: 34.4, max: 36.5, unit: 'PSU', isLog: false };
  if (depth <= 200) return { min: 34.7, max: 36.2, unit: 'PSU', isLog: false };
  if (depth <= 500) return { min: 34.6, max: 35.8, unit: 'PSU', isLog: false };
  return { min: 34.3, max: 35.2, unit: 'PSU', isLog: false };
}
