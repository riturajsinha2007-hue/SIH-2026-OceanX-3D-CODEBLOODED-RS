import { ArgoCsvRow, ArgoPlatformSummary, buildArgoCsvString } from '../data/argoCsvData';
import { ArgoFloat, DepthProfilePoint } from '../types/ocean';

// In-Memory parsed CSV rows (Single Source of Truth)
let inMemoryCsvRows: ArgoCsvRow[] = [];
let inMemoryPlatforms: ArgoPlatformSummary[] = [];
let inMemoryArgoFloats: ArgoFloat[] = [];
let isInitialized = false;

/**
 * Parses raw CSV string into strongly-typed in-memory records
 */
export function parseArgoCsv(csvContent: string): ArgoCsvRow[] {
  const lines = csvContent.trim().split('\n');
  if (lines.length <= 1) return [];

  const rows: ArgoCsvRow[] = [];
  // Skip header line
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Handle CSV comma separation respecting quotes
    const values: string[] = [];
    let insideQuote = false;
    let currentVal = '';

    for (let charIdx = 0; charIdx < line.length; charIdx++) {
      const char = line[charIdx];
      if (char === '"') {
        insideQuote = !insideQuote;
      } else if (char === ',' && !insideQuote) {
        values.push(currentVal.trim().replace(/^"|"$/g, ''));
        currentVal = '';
      } else {
        currentVal += char;
      }
    }
    values.push(currentVal.trim().replace(/^"|"$/g, ''));

    if (values.length >= 12) {
      const platform_number = values[0] || '';
      const wmo_id = values[1] || platform_number;
      const cycle_number = parseInt(values[2], 10) || 1;
      const date = values[3] || '2024-03-24';
      const latitude = parseFloat(values[4]) || 0;
      const longitude = parseFloat(values[5]) || 0;
      const basin = values[6] || 'Indian Ocean';
      const institution = values[7] || 'INCOIS / MoES India';
      const sensor_type = values[8] || 'SBE 41CP CTD';
      const depth = parseFloat(values[9]);
      const temperature = parseFloat(values[10]);
      const salinity = parseFloat(values[11]);
      const chlorophyll = values[12] && values[12] !== '' ? parseFloat(values[12]) : null;
      const model_temperature = values[13] && values[13] !== '' ? parseFloat(values[13]) : temperature;
      const model_salinity = values[14] && values[14] !== '' ? parseFloat(values[14]) : salinity;
      const model_chlorophyll = values[15] && values[15] !== '' ? parseFloat(values[15]) : chlorophyll;
      const temp_anomaly = values[16] && values[16] !== '' ? parseFloat(values[16]) : Number((temperature - model_temperature).toFixed(2));
      const sal_anomaly = values[17] && values[17] !== '' ? parseFloat(values[17]) : Number((salinity - model_salinity).toFixed(2));
      const qc_flag = parseInt(values[18], 10) || 1;

      // Only push valid finite rows
      if (isFinite(temperature) && isFinite(salinity) && isFinite(depth)) {
        rows.push({
          platform_number,
          wmo_id,
          cycle_number,
          date,
          latitude,
          longitude,
          basin,
          institution,
          sensor_type,
          depth,
          temperature,
          salinity,
          chlorophyll: chlorophyll !== null && isFinite(chlorophyll) ? chlorophyll : null,
          model_temperature,
          model_salinity,
          model_chlorophyll: model_chlorophyll !== null && isFinite(model_chlorophyll) ? model_chlorophyll : null,
          temp_anomaly,
          sal_anomaly,
          qc_flag,
          // Compatibility aliases
          platformId: platform_number,
          wmoId: wmo_id,
          cycleNumber: cycle_number,
          sensorType: sensor_type,
          modelTemperature: model_temperature,
          modelSalinity: model_salinity,
          modelChlorophyll: model_chlorophyll,
          tempAnomaly: temp_anomaly,
          salAnomaly: sal_anomaly,
          chlaAnomaly: chlorophyll !== null && model_chlorophyll !== null ? Number((chlorophyll - model_chlorophyll).toFixed(3)) : null,
          qcFlag: qc_flag,
        });
      }
    }
  }

  return rows;
}

/**
 * Initializes the in-memory CSV dataset once at application startup.
 */
export function initializeArgoCsvStore(): ArgoCsvRow[] {
  if (isInitialized && inMemoryCsvRows.length > 0) {
    return inMemoryCsvRows;
  }

  const rawCsv = buildArgoCsvString();
  inMemoryCsvRows = parseArgoCsv(rawCsv);
  isInitialized = true;

  // Build platform summaries
  const platformMap = new Map<string, ArgoPlatformSummary>();

  inMemoryCsvRows.forEach((row) => {
    const key = row.wmo_id;
    if (!platformMap.has(key)) {
      platformMap.set(key, {
        platform_number: row.platform_number,
        wmo_id: row.wmo_id,
        cycle_number: row.cycle_number,
        date: row.date,
        latitude: row.latitude,
        longitude: row.longitude,
        basin: row.basin,
        institution: row.institution,
        sensor_type: row.sensor_type,
        qc_flag: row.qc_flag,
        profile_count: 1,
        platformId: row.platform_number,
        wmoId: row.wmo_id,
        cycleNumber: row.cycle_number,
        sensorType: row.sensor_type,
        qcFlag: row.qc_flag,
        profileCount: 1,
        surfaceTemp: row.temperature,
        surfaceSal: row.salinity,
        surfaceChla: row.chlorophyll,
      });
    } else {
      const summary = platformMap.get(key)!;
      summary.profile_count++;
      summary.profileCount++;
      if (row.depth <= 5) {
        summary.surfaceTemp = row.temperature;
        summary.surfaceSal = row.salinity;
        summary.surfaceChla = row.chlorophyll;
      }
    }
  });

  inMemoryPlatforms = Array.from(platformMap.values());
  inMemoryArgoFloats = [];

  // Build ArgoFloat objects directly from the CSV rows
  inMemoryPlatforms.forEach((p) => {
    const matchingRows = inMemoryCsvRows
      .filter((r) => String(r.wmo_id).trim() === String(p.wmo_id).trim())
      .sort((a, b) => Number(a.depth) - Number(b.depth));

    const profiles: DepthProfilePoint[] = matchingRows.map((r) => ({
      depth: r.depth,
      observedTemp: r.temperature,
      observedSal: r.salinity,
      observedChla: r.chlorophyll ?? undefined,
      modelTemp: r.model_temperature,
      modelSal: r.model_salinity,
      modelChla: r.model_chlorophyll ?? undefined,
      tempDelta: r.temp_anomaly,
      salDelta: r.sal_anomaly,
      chlaDelta: r.chlaAnomaly ?? undefined,
    }));

    inMemoryArgoFloats.push({
      id: `argo-${p.wmo_id}`,
      platformNumber: p.wmo_id,
      cycleNumber: p.cycle_number,
      latitude: p.latitude,
      longitude: p.longitude,
      timestamp: `${p.date}T12:00:00Z`,
      basin: p.basin as any,
      status: 'active',
      qcFlag: p.qc_flag as 1 | 2,
      institution: p.institution,
      sensorType: p.sensor_type,
      profiles,
    });
  });

  // Debug Console outputs mandated by acceptance requirements
  console.log('CSV rows loaded:', inMemoryCsvRows.length);
  console.log('Markers created:', inMemoryPlatforms.length);

  return inMemoryCsvRows;
}

// Auto-initialize on import
initializeArgoCsvStore();

/**
 * Returns all parsed CSV rows
 */
export function getArgoCsvRows(): ArgoCsvRow[] {
  if (!isInitialized || inMemoryCsvRows.length === 0) {
    initializeArgoCsvStore();
  }
  return inMemoryCsvRows;
}

/**
 * Returns all unique platform summaries for map marker generation
 */
export function getArgoPlatforms(): ArgoPlatformSummary[] {
  if (!isInitialized || inMemoryPlatforms.length === 0) {
    initializeArgoCsvStore();
  }
  return inMemoryPlatforms;
}

/**
 * Returns all ArgoFloat entities derived 100% from CSV
 */
export function getArgoFloatsFromCsv(): ArgoFloat[] {
  if (!isInitialized || inMemoryArgoFloats.length === 0) {
    initializeArgoCsvStore();
  }
  return inMemoryArgoFloats;
}

/**
 * Normalize an identifier for robust comparison
 */
export function normalizePlatformId(id: string | null | undefined): string {
  if (!id) return '';
  return String(id).replace(/^(argo-)+/i, '').trim();
}

/**
 * Finds ALL CSV rows matching a platform ID or WMO number.
 * Sorts all records by depth ascending (5m -> 2000m).
 */
export function getRowsForPlatform(platformId: string | null | undefined): ArgoCsvRow[] {
  if (!platformId) return [];
  const cleanId = normalizePlatformId(platformId);
  if (!cleanId) return [];

  const allRows = getArgoCsvRows();
  const selectedRows = allRows
    .filter(
      (row) =>
        normalizePlatformId(row.platform_number) === cleanId ||
        normalizePlatformId(row.wmo_id) === cleanId ||
        normalizePlatformId(row.platformId) === cleanId ||
        normalizePlatformId(row.wmoId) === cleanId
    )
    .sort((a, b) => Number(a.depth) - Number(b.depth));

  // Debug Console Output required by specification
  console.log('Selected platform:', cleanId);
  console.log('Matching CSV rows:', selectedRows.length);

  return selectedRows;
}

/**
 * Finds platform metadata directly from CSV rows
 */
export function getPlatformMetadata(platformId: string | null | undefined): ArgoPlatformSummary | null {
  if (!platformId) return null;
  const cleanId = normalizePlatformId(platformId);
  if (!cleanId) return null;

  const platforms = getArgoPlatforms();
  const found = platforms.find(
    (p) =>
      normalizePlatformId(p.platform_number) === cleanId ||
      normalizePlatformId(p.wmo_id) === cleanId ||
      normalizePlatformId(p.platformId) === cleanId ||
      normalizePlatformId(p.wmoId) === cleanId
  );

  return found || null;
}

/**
 * Triggers browser download of the Argo Float CSV dataset
 */
export function downloadArgoCsv(platformId?: string) {
  let csvText: string;
  let filename = 'incois_argo_indian_ocean_profiles.csv';

  if (platformId) {
    const rows = getRowsForPlatform(platformId);
    if (rows.length === 0) return;
    const header = 'platform_number,wmo_id,cycle_number,date,latitude,longitude,basin,institution,sensor_type,depth,temperature,salinity,chlorophyll,model_temperature,model_salinity,model_chlorophyll,temp_anomaly,sal_anomaly,qc_flag';
    const lines = rows.map(
      (r) =>
        `${r.platform_number},${r.wmo_id},${r.cycle_number},${r.date},${r.latitude},${r.longitude},"${r.basin}","${r.institution}","${r.sensor_type}",${r.depth},${r.temperature},${r.salinity},${r.chlorophyll ?? ''},${r.model_temperature},${r.model_salinity},${r.model_chlorophyll ?? ''},${r.temp_anomaly},${r.sal_anomaly},${r.qc_flag}`
    );
    csvText = [header, ...lines].join('\n');
    filename = `argo_profile_${normalizePlatformId(platformId)}.csv`;
  } else {
    csvText = buildArgoCsvString();
  }

  const blob = new Blob([csvText], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
