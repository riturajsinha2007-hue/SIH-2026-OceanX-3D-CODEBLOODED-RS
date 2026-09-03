/**
 * Physical Indian Ocean Circulation & Current Velocity Engine
 * Models realistic surface and subsurface velocity fields (u: zonal, v: meridional)
 * across the Indian Ocean basin with monsoon seasonal reversal and depth decay.
 */

import { OceanCurrentVector, DepthLevel } from '../types/ocean';
import { isLandPoint, normalizeLongitude, DATASET_SPATIAL_METADATA } from './incoisDataset';

export interface MajorCurrentFeature {
  name: string;
  lat: number;
  lon: number;
  typicalSpeed: string;
  description: string;
  seasonality: string;
}

export const MAJOR_CURRENT_FEATURES: MajorCurrentFeature[] = [
  {
    name: 'Somali Current & Great Whirl',
    lat: 8.5,
    lon: 52.0,
    typicalSpeed: '1.2 – 2.0 m/s (2.3 – 3.9 kts)',
    description: 'Intense western boundary current off the Horn of Africa. Reverses completely with the monsoon, generating the mesoscale Great Whirl in boreal summer.',
    seasonality: 'Northward in Summer (SW Monsoon), Southward in Winter (NE Monsoon)',
  },
  {
    name: 'Equatorial Jet (Wyrtki Jet)',
    lat: 0.0,
    lon: 78.0,
    typicalSpeed: '0.8 – 1.3 m/s (1.6 – 2.5 kts)',
    description: 'Semiannual eastward surface jet along the equator during inter-monsoon transitions (April–May and October–November).',
    seasonality: 'Peaks during transition periods between monsoons',
  },
  {
    name: 'South Equatorial Current (SEC)',
    lat: -14.0,
    lon: 75.0,
    typicalSpeed: '0.4 – 0.7 m/s (0.8 – 1.4 kts)',
    description: 'Broad westward flowing current driven by trade winds between 10°S and 20°S, transporting Pacific water westward.',
    seasonality: 'Year-round permanent trade wind driven circulation',
  },
  {
    name: 'East India Coastal Current (EICC)',
    lat: 15.0,
    lon: 82.5,
    typicalSpeed: '0.3 – 0.8 m/s (0.6 – 1.6 kts)',
    description: 'Western boundary current of the Bay of Bengal, flowing northward before the summer monsoon and southward during winter.',
    seasonality: 'Reverses with Bay of Bengal monsoon wind forcing',
  },
  {
    name: 'West India Coastal Current (WICC)',
    lat: 14.0,
    lon: 72.5,
    typicalSpeed: '0.2 – 0.6 m/s (0.4 – 1.2 kts)',
    description: 'Eastern boundary current of the Arabian Sea, flowing southward during SW monsoon and northward during NE monsoon.',
    seasonality: 'Reverses biannually with Arabian Sea monsoonal winds',
  },
  {
    name: 'Agulhas Retroflection',
    lat: -32.0,
    lon: 36.0,
    typicalSpeed: '0.9 – 1.6 m/s (1.8 – 3.1 kts)',
    description: 'Strong southward western boundary current off southeastern Africa, retroflecting eastward back into the South Indian Ocean.',
    seasonality: 'Strong year-round western boundary jet',
  },
];

/**
 * Computes physically realistic velocity components u (zonal, East > 0)
 * and v (meridional, North > 0) in m/s at any coordinate, depth, and time.
 */
export function computeOceanCurrent(
  lat: number,
  lon: number,
  depth: DepthLevel = 5,
  dateOrIndex: string | number = 3 // month 1-12 or time index
): OceanCurrentVector {
  const normLon = normalizeLongitude(lon);
  const bounds = DATASET_SPATIAL_METADATA.SSH;

  // Strict Dataset Spatial Coverage Gate: Zero velocity outside Indian Ocean coverage
  if (
    lat < bounds.latMin ||
    lat > bounds.latMax ||
    normLon < bounds.lonMin ||
    normLon > bounds.lonMax ||
    isLandPoint(lat, normLon)
  ) {
    return {
      lat,
      lon: normLon,
      u: 0,
      v: 0,
      speed: 0,
      speedKnots: 0,
      directionDeg: 0,
      depth,
    };
  }

  // Determine month (1 to 12)
  let month = 4; // default April
  if (typeof dateOrIndex === 'string') {
    const parts = dateOrIndex.split('-');
    month = parseInt(parts[1] || '4', 10);
  } else if (typeof dateOrIndex === 'number') {
    month = (dateOrIndex % 12) + 1;
  }

  // Seasonal monsoon phase factor
  // SW Summer Monsoon: June (6) to August (8) -> positive (~1.0)
  // NE Winter Monsoon: December (12) to February (2) -> negative (~ -0.8)
  // Transitions: April-May (4-5) & Oct-Nov (10-11)
  const isSummerMonsoon = month >= 6 && month <= 9;
  const isWinterMonsoon = month === 12 || month === 1 || month === 2;
  const isWyrtkiJetSeason = month === 4 || month === 5 || month === 10 || month === 11;

  let u = 0.0;
  let v = 0.0;

  // 1. South Equatorial Current (SEC) - Band between 8°S and 24°S: Persistent Westward
  if (lat >= -24 && lat <= -8 && lon >= 45 && lon <= 115) {
    const coreDist = Math.abs(lat - (-15)) / 7.0;
    const secWeight = Math.max(0, 1 - coreDist * coreDist);
    u -= 0.55 * secWeight;
    v += 0.05 * Math.sin((lon - 60) * 0.1);
  }

  // 2. Somali Current (Horn of Africa: 2°S to 14°N, 45°E to 55°E)
  if (lat >= -2 && lat <= 14 && lon >= 45 && lon <= 55) {
    const coastalDist = Math.max(0, 1 - Math.abs(lon - (48 + lat * 0.4)) / 4.0);
    if (isSummerMonsoon) {
      // Powerful northward flow + Great Whirl anticyclone (~8-10°N)
      v += 1.5 * coastalDist;
      u += 0.35 * coastalDist;
      // Great Whirl circulation around 9°N, 53°E
      const dLat = lat - 9.0;
      const dLon = lon - 53.0;
      const r = Math.sqrt(dLat * dLat + dLon * dLon);
      if (r < 3.5) {
        const eddyStr = 0.6 * Math.exp(-(r * r) / 4.0);
        u += -dLat * eddyStr;
        v += dLon * eddyStr;
      }
    } else if (isWinterMonsoon) {
      // Reversal: Southward flow
      v -= 0.65 * coastalDist;
      u -= 0.15 * coastalDist;
    } else {
      // Transition: Moderate northward
      v += 0.35 * coastalDist;
    }
  }

  // 3. Equatorial Jets (Wyrtki Jets: 3°S to 3°N, 55°E to 95°E)
  if (lat >= -3.5 && lat <= 3.5 && lon >= 55 && lon <= 95) {
    const eqDist = Math.abs(lat) / 3.5;
    const eqWeight = Math.max(0, 1 - eqDist * eqDist);
    if (isWyrtkiJetSeason) {
      u += 1.05 * eqWeight; // Swift eastward jet
    } else if (isSummerMonsoon) {
      u -= 0.25 * eqWeight; // Southwest monsoon drift
    } else {
      u += 0.3 * eqWeight;
    }
  }

  // 4. Bay of Bengal Circulation & EICC
  if (lat >= 8 && lat <= 22 && lon >= 80 && lon <= 95) {
    // East India Coastal Current along western Bay of Bengal (~80°E - 85°E)
    if (lon <= 85) {
      const eiccWeight = Math.max(0, 1 - Math.abs(lon - 82.5) / 2.5);
      if (month >= 2 && month <= 6) {
        v += 0.55 * eiccWeight; // Northward flow
      } else {
        v -= 0.45 * eiccWeight; // Southward flow
      }
    }
    // Cyclonic/anticyclonic gyre in Bay
    const cLat = 14.5;
    const cLon = 88.0;
    const r = Math.sqrt((lat - cLat) ** 2 + (lon - cLon) ** 2);
    if (r < 6.0) {
      const gyre = 0.25 * Math.exp(-(r * r) / 12.0) * (isSummerMonsoon ? 1 : -1);
      u += -(lat - cLat) * gyre;
      v += (lon - cLon) * gyre;
    }
  }

  // 5. Arabian Sea Circulation & WICC
  if (lat >= 8 && lat <= 24 && lon >= 55 && lon <= 77) {
    // West India Coastal Current
    if (lon >= 71 && lon <= 75) {
      const wiccWeight = Math.max(0, 1 - Math.abs(lon - 73) / 2.0);
      if (isSummerMonsoon) {
        v -= 0.45 * wiccWeight; // Southward during summer
      } else {
        v += 0.35 * wiccWeight; // Northward during winter
      }
    }
    // Findlater Jet over central Arabian Sea (summer)
    if (isSummerMonsoon && lat >= 10 && lat <= 18 && lon >= 58 && lon <= 72) {
      u += 0.75;
      v += 0.45;
    }
  }

  // 6. Agulhas Current (South-Western margin: 25°S to 35°S, 30°E to 45°E)
  if (lat <= -25 && lon <= 45) {
    const agulhasWeight = Math.max(0, 1 - Math.abs(lon - 34) / 6.0);
    v -= 0.95 * agulhasWeight; // Strong southward jet
    u -= 0.25 * agulhasWeight;
    // Retroflection loop
    if (lat <= -32) {
      u += 0.65 * agulhasWeight;
    }
  }

  // 7. Sub-mesoscale Rossby waves and eddies background field
  const eddyScale = 0.12;
  const eddyU = Math.sin(lat * 0.45 + lon * 0.35 + month * 0.5) * eddyScale;
  const eddyV = Math.cos(lat * 0.38 - lon * 0.42 + month * 0.4) * eddyScale;
  u += eddyU;
  v += eddyV;

  // Depth attenuation: ocean currents decay with depth
  // Epipelagic (0-200m) holds the bulk of momentum, declining steeply below thermocline
  const depthMeters = typeof depth === 'number' ? depth : 5;
  const depthFactor = Math.exp(-depthMeters / 220); // 5m: 0.97, 50m: 0.79, 100m: 0.63, 200m: 0.40, 500m: 0.10, 1000m: 0.01

  u *= depthFactor;
  v *= depthFactor;

  // Calculate speed and direction
  const speed = Math.sqrt(u * u + v * v);
  const speedKnots = speed * 1.94384;

  // Oceanographic direction: Direction the water is FLOWING TOWARDS
  // 0° = North, 90° = East, 180° = South, 270° = West
  let directionDeg = (Math.atan2(u, v) * 180) / Math.PI;
  if (directionDeg < 0) directionDeg += 360;

  return {
    lat: Number(lat.toFixed(2)),
    lon: Number(lon.toFixed(2)),
    u: Number(u.toFixed(3)),
    v: Number(v.toFixed(3)),
    speed: Number(speed.toFixed(3)),
    speedKnots: Number(speedKnots.toFixed(2)),
    directionDeg: Number(directionDeg.toFixed(1)),
    depth: depthMeters,
  };
}

/**
 * Generates an array of regular grid current vectors across the Indian Ocean domain
 * optimized for web rendering with step size (e.g. 1.5° or 2.0° grid spacing)
 */
export function generateIndianOceanCurrentsGrid(
  depth: DepthLevel = 5,
  dateOrIndex: string | number = 4,
  gridStep: number = 2.0,
  bounds?: { latMin: number; latMax: number; lonMin: number; lonMax: number }
): OceanCurrentVector[] {
  const currentBounds = bounds ?? DATASET_SPATIAL_METADATA.SSH;
  const latMin = currentBounds.latMin;
  const latMax = currentBounds.latMax;
  const lonMin = currentBounds.lonMin;
  const lonMax = currentBounds.lonMax;

  const vectors: OceanCurrentVector[] = [];

  for (let lat = latMin; lat <= latMax; lat += gridStep) {
    for (let lon = lonMin; lon <= lonMax; lon += gridStep) {
      if (!isLandPoint(lat, lon)) {
        const vec = computeOceanCurrent(lat, lon, depth, dateOrIndex);
        if (vec.speed > 0.03) {
          vectors.push(vec);
        }
      }
    }
  }

  return vectors;
}

/**
 * Returns speed color for scientific ocean current visualization
 */
export function getCurrentColor(speed: number): string {
  // Speed in m/s:
  // 0.0 - 0.2: Deep Blue / Teal (#38BDF8)
  // 0.2 - 0.5: Emerald Green / Lime (#34D399)
  // 0.5 - 0.9: Warm Gold / Amber (#FBBF24)
  // > 0.9: Coral / Crimson (#F87171)
  if (speed < 0.2) return '#38bdf8'; // Light sky blue
  if (speed < 0.45) return '#34d399'; // Mint green
  if (speed < 0.8) return '#fbbf24'; // Warm amber gold
  if (speed < 1.2) return '#f97316'; // Orange
  return '#ef4444'; // Red (Extreme jets like Somali Current)
}
