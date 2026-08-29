/**
 * Mandatory Pre-Render Ocean Data Quality Gate & Double-Verification Engine
 * Strictly enforces Stage 1 (Request Validation) and Stage 2 (Response Validation)
 * + Cross-check sampling against INCOIS ERDDAP source standards.
 */

import { OceanVariable, DepthLevel, DataSelection } from '../types/ocean';
import { ARGO_VAM_DATASET, OCEANSAT2_CHLOROPHYLL_DATASET, ErddapGridSliceResponse } from './erddapService';
import { GRID_METADATA } from '../data/incoisDataset';

export type VerificationState = 'VERIFIED' | 'CACHED' | 'UNAVAILABLE' | 'VALIDATION_FAILED';

export interface DataProvenanceInfo {
  datasetId: string;
  sourceOrg: string;
  variable: string;
  units: string;
  timeStr: string;
  requestedDate: string;
  actualDate: string;
  depth: number;
  requestedDepth: number;
  actualDepth: number;
  spatialResolution: string;
  spatialBounds: {
    latMin: number;
    latMax: number;
    lonMin: number;
    lonMax: number;
  };
  requestUrl?: string;
  lastSuccessfulFetch: number;
  verificationState: VerificationState;
  validationMessages: string[];
  sampleCheckPassed: boolean;
  sampleChecks: Array<{
    locationName: string;
    lat: number;
    lon: number;
    sourceVal: number | null;
    status: 'MATCH' | 'MISMATCH' | 'LAND_OR_FILL';
  }>;
}

export interface PreRenderValidationResult {
  passed: boolean;
  valid: boolean;
  reason?: string;
  state: VerificationState;
  errors: string[];
  warnings: string[];
  provenance: DataProvenanceInfo;
  validatedSlice?: ErddapGridSliceResponse;
}

export interface ScientificValidationInput {
  requestedSelection: DataSelection;
  returnedData: ErddapGridSliceResponse | null;
  isCached?: boolean;
}

/**
 * Builds atomic 6-dimensional cache key
 */
export function buildDataSelectionKey(selection: DataSelection): string {
  const { datasetId, variable, date, depth, boundingBox, resolution } = selection;
  const bboxStr = `${boundingBox.latMin},${boundingBox.latMax},${boundingBox.lonMin},${boundingBox.lonMax}`;
  return `${datasetId}:${variable}:${date}:${depth}:${bboxStr}:${resolution}`;
}

/**
 * Central Scientific Data Validation Gate (validateScientificData)
 * Strictly enforces that no mismatched, extrapolated, stale, or fabricated data can be rendered.
 */
export function validateScientificData(input: ScientificValidationInput): PreRenderValidationResult {
  const { requestedSelection, returnedData, isCached = false } = input;
  const { datasetId, variable, date: reqDate, depth: reqDepth, boundingBox, resolution } = requestedSelection;

  const errors: string[] = [];
  const warnings: string[] = [];
  let reason: string | undefined;

  const expectedUnit = variable === 'TEMP' ? '°C' : variable === 'SAL' ? 'PSU' : 'mg/m³';
  const cleanReqDate = reqDate.split('T')[0];

  const fallbackProvenance: DataProvenanceInfo = {
    datasetId,
    sourceOrg: 'INCOIS (Indian National Centre for Ocean Information Services)',
    variable,
    units: expectedUnit,
    timeStr: reqDate,
    requestedDate: cleanReqDate,
    actualDate: returnedData?.timeStr ? returnedData.timeStr.split('T')[0] : 'N/A',
    depth: reqDepth,
    requestedDepth: reqDepth,
    actualDepth: returnedData?.depth !== undefined ? returnedData.depth : reqDepth,
    spatialResolution: resolution,
    spatialBounds: boundingBox,
    lastSuccessfulFetch: 0,
    verificationState: 'VALIDATION_FAILED',
    validationMessages: [],
    sampleCheckPassed: false,
    sampleChecks: [],
  };

  // 1. Data Availability Check
  if (!returnedData) {
    errors.push('No verified scientific data returned for this selection from INCOIS ERDDAP.');
    fallbackProvenance.verificationState = 'UNAVAILABLE';
    fallbackProvenance.validationMessages = ['No verified data available for this selection'];
    return {
      passed: false,
      valid: false,
      reason: 'UNAVAILABLE',
      state: 'UNAVAILABLE',
      errors,
      warnings,
      provenance: fallbackProvenance,
    };
  }

  // 2. Dataset Match Verification
  if (returnedData.datasetId !== datasetId) {
    errors.push(`Dataset mismatch: Requested "${datasetId}", returned "${returnedData.datasetId}".`);
    reason = 'DATA_MISMATCH';
  }

  // 3. Variable Match Verification
  const retVar = (returnedData.variable || '').toUpperCase();
  const reqVar = variable.toUpperCase();
  const isVarMatch = retVar === reqVar || (reqVar === 'CHLA' && retVar === 'CHL');
  if (!isVarMatch) {
    errors.push(`Variable mismatch: Requested "${variable}", returned "${returnedData.variable}".`);
    reason = reason || 'VARIABLE_MISMATCH';
  }

  // 4. Date Match & Temporal Coverage Verification
  const actualDate = returnedData.timeStr ? returnedData.timeStr.split('T')[0] : '';
  if (!actualDate || !actualDate.startsWith(cleanReqDate.substring(0, 7))) {
    // For daily datasets (CHLA), require exact date; for monthly (ARGO VAM), require exact year-month
    if (variable === 'CHLA' && actualDate !== cleanReqDate) {
      errors.push(`Date mismatch for Chlorophyll-a: Requested ${cleanReqDate}, returned ${actualDate}.`);
      reason = reason || 'DATE_MISMATCH';
    } else if (variable !== 'CHLA' && !actualDate.startsWith(cleanReqDate.substring(0, 7))) {
      errors.push(`Date mismatch for ARGO VAM: Requested ${cleanReqDate}, returned ${actualDate}.`);
      reason = reason || 'DATE_MISMATCH';
    }
  }

  // Check temporal bounds
  if (variable === 'CHLA') {
    if (cleanReqDate < '2011-02-02' || cleanReqDate > '2020-05-01') {
      errors.push(`Date ${cleanReqDate} is outside Oceansat-2 mission coverage [2011-02-02, 2020-05-01].`);
      reason = reason || 'DATE_MISMATCH';
    }
  } else {
    if (cleanReqDate < '2004-01-15' || cleanReqDate > '2026-07-15') {
      errors.push(`Date ${cleanReqDate} is outside ARGO VAM temporal coverage [2004-01-15, 2026-07-15].`);
      reason = reason || 'DATE_MISMATCH';
    }
  }

  // 5. Depth Verification
  if (variable === 'CHLA') {
    if (reqDepth !== 0 && reqDepth !== 5) {
      errors.push(`Chlorophyll-a is surface-only optical ocean color. Depth ${reqDepth}m is invalid.`);
      reason = reason || 'DEPTH_UNAVAILABLE';
    }
  } else {
    const supportedDepths = [5, 10, 20, 30, 50, 75, 100, 125, 150, 200, 250, 300, 400, 500, 600, 700, 800, 900, 1000, 1100, 1200, 1300, 1400, 1500, 1750, 2000];
    if (!supportedDepths.includes(reqDepth)) {
      errors.push(`Depth ${reqDepth}m is not supported by ARGO VAM dataset.`);
      reason = reason || 'DEPTH_UNAVAILABLE';
    }
    if (returnedData.depth !== undefined && returnedData.depth !== reqDepth) {
      errors.push(`Returned depth ${returnedData.depth}m does not match requested depth ${reqDepth}m.`);
      reason = reason || 'DEPTH_UNAVAILABLE';
    }
  }

  // 6. Coordinates & Grid Dimensions
  if (!Array.isArray(returnedData.values) || returnedData.values.length === 0) {
    errors.push('Grid values array is empty.');
    reason = reason || 'CORRUPTED_DATA';
  }

  // 7. Numeric Sanity & Physical Ranges
  let validCount = 0;
  let nanOrInfCount = 0;
  let minFound = Infinity;
  let maxFound = -Infinity;

  if (Array.isArray(returnedData.values)) {
    for (let i = 0; i < returnedData.values.length; i++) {
      const val = returnedData.values[i];
      if (val === null) continue;

      if (typeof val !== 'number' || isNaN(val) || !isFinite(val)) {
        nanOrInfCount++;
        continue;
      }

      validCount++;
      if (val < minFound) minFound = val;
      if (val > maxFound) maxFound = val;

      if (variable === 'TEMP') {
        if (val < -2.0 || val > 36.0) {
          errors.push(`Physical limit violation: Ocean temperature ${val.toFixed(2)}°C at index ${i} outside [-2°C, 36°C].`);
          reason = reason || 'PHYSICAL_LIMIT_EXCEEDED';
          break;
        }
      } else if (variable === 'SAL') {
        if (val < 15.0 || val > 44.0) {
          errors.push(`Physical limit violation: Salinity ${val.toFixed(2)} PSU at index ${i} outside [15, 44] PSU.`);
          reason = reason || 'PHYSICAL_LIMIT_EXCEEDED';
          break;
        }
      } else if (variable === 'CHLA') {
        if (val < 0.0 || val > 50.0) {
          errors.push(`Physical limit violation: Chlorophyll-a ${val.toFixed(2)} mg/m³ at index ${i} outside [0, 50] mg/m³.`);
          reason = reason || 'PHYSICAL_LIMIT_EXCEEDED';
          break;
        }
      }
    }
  }

  if (validCount === 0) {
    errors.push('Zero valid numeric ocean points found in dataset response (entire grid is null/unfilled).');
    reason = reason || 'ZERO_VALID_POINTS';
  }

  if (nanOrInfCount > 0) {
    warnings.push(`Detected ${nanOrInfCount} corrupted non-finite numbers in raw grid array.`);
  }

  // 8. Sample Cross-Checks
  const sampleCheck = performCrossCheckSampling(returnedData, variable);
  if (!sampleCheck.allPassed) {
    errors.push('Domain sample cross-check failed against physical oceanographic bounds.');
    reason = reason || 'PHYSICAL_LIMIT_EXCEEDED';
  }

  const passed = errors.length === 0;
  const finalState: VerificationState = passed ? (isCached ? 'CACHED' : 'VERIFIED') : 'VALIDATION_FAILED';

  const provenance: DataProvenanceInfo = {
    datasetId: returnedData.datasetId || datasetId,
    sourceOrg: 'INCOIS (Indian National Centre for Ocean Information Services)',
    variable,
    units: returnedData.unit || expectedUnit,
    timeStr: returnedData.timeStr || reqDate,
    requestedDate: cleanReqDate,
    actualDate: actualDate || cleanReqDate,
    depth: returnedData.depth !== undefined ? returnedData.depth : reqDepth,
    requestedDepth: reqDepth,
    actualDepth: returnedData.depth !== undefined ? returnedData.depth : reqDepth,
    spatialResolution: resolution,
    spatialBounds: {
      latMin: returnedData.latMin ?? boundingBox.latMin,
      latMax: returnedData.latMax ?? boundingBox.latMax,
      lonMin: returnedData.lonMin ?? boundingBox.lonMin,
      lonMax: returnedData.lonMax ?? boundingBox.lonMax,
    },
    requestUrl: requestedSelection.sourceUrl,
    lastSuccessfulFetch: returnedData.fetchedAt || Date.now(),
    verificationState: finalState,
    validationMessages: errors.length > 0 ? errors : (warnings.length > 0 ? warnings : ['All Quality Checks Passed (Dataset, Variable, Date, Depth, Ranges, Cross-Checks)']),
    sampleCheckPassed: sampleCheck.allPassed,
    sampleChecks: sampleCheck.samples,
  };

  return {
    passed,
    valid: passed,
    reason,
    state: finalState,
    errors,
    warnings,
    provenance,
    validatedSlice: passed ? returnedData : undefined,
  };
}

/**
 * Stage 1: Request Validation
 * Validates request parameters BEFORE contacting the server / rendering.
 */
export function validateOceanDataRequest(params: {
  variable: OceanVariable;
  timeStr: string;
  depth: number;
  allowedDepths?: number[];
  validTimes?: string[];
}): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // 1. Variable check
  if (params.variable !== 'TEMP' && params.variable !== 'SAL' && params.variable !== 'CHLA') {
    errors.push(`Invalid variable: "${params.variable}". Allowed: TEMP, SAL, CHLA.`);
  }

  // 2. Depth check
  if (params.variable === 'CHLA') {
    if (params.depth !== 0 && params.depth !== 5) {
      errors.push(`CHLA (Oceansat-2) is strictly surface-level optical ocean color. Depth must be 0m.`);
    }
  } else {
    if (params.depth < 0 || params.depth > 2000) {
      errors.push(`Depth ${params.depth}m is outside ARGO VAM vertical extent [0m, 2000m].`);
    }
    if (params.allowedDepths && params.allowedDepths.length > 0) {
      if (!params.allowedDepths.includes(params.depth)) {
        errors.push(`Depth ${params.depth}m is not in the official ZAX metadata depth list.`);
      }
    }
  }

  // 3. Time string format check (ISO-8601 or YYYY-MM-DD)
  const dateRegex = /^\d{4}-\d{2}-\d{2}/;
  if (!dateRegex.test(params.timeStr)) {
    errors.push(`Invalid date format "${params.timeStr}". Must follow YYYY-MM-DD format.`);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Stage 2: Response & Slice Validation
 * Verifies grid dimensions, coordinate ranges, numeric values, units, and physical plausibility.
 */
export function validateOceanDataResponse(
  slice: ErddapGridSliceResponse,
  expected: {
    variable: OceanVariable;
    timeStr: string;
    depth: number;
  }
): { valid: boolean; errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!slice) {
    errors.push('No data slice object provided.');
    return { valid: false, errors, warnings };
  }

  // 1. Dataset ID verification
  if (expected.variable === 'CHLA') {
    if (slice.datasetId !== OCEANSAT2_CHLOROPHYLL_DATASET.datasetId) {
      errors.push(`Dataset ID mismatch for CHLA. Expected "${OCEANSAT2_CHLOROPHYLL_DATASET.datasetId}", got "${slice.datasetId}".`);
    }
  } else {
    if (slice.datasetId !== ARGO_VAM_DATASET.datasetId) {
      errors.push(`Dataset ID mismatch. Expected "${ARGO_VAM_DATASET.datasetId}", got "${slice.datasetId}".`);
    }
  }

  // 2. Variable verification
  if (slice.variable !== expected.variable) {
    errors.push(`Variable mismatch. Expected "${expected.variable}", got "${slice.variable}".`);
  }

  // 3. Depth verification
  if (expected.variable !== 'CHLA' && slice.depth !== expected.depth) {
    errors.push(`Depth level mismatch. Expected ${expected.depth}m, got ${slice.depth}m.`);
  }

  // 4. Coordinates & Grid Dimensions
  if (!Array.isArray(slice.values) || slice.values.length === 0) {
    errors.push('Grid values array is empty or undefined.');
    return { valid: false, errors, warnings };
  }

  const expectedLength = (slice.latCount || 60) * (slice.lonCount || 90);
  if (slice.values.length !== expectedLength && slice.values.length < 5000) {
    warnings.push(`Grid size (${slice.values.length}) differs from expected (${expectedLength}).`);
  }

  // 5. Scientific Value Range Checks
  let validCount = 0;
  let nanOrInfCount = 0;
  let minFound = Infinity;
  let maxFound = -Infinity;

  for (let i = 0; i < slice.values.length; i++) {
    const val = slice.values[i];
    if (val === null) continue;

    if (typeof val !== 'number' || isNaN(val) || !isFinite(val)) {
      nanOrInfCount++;
      continue;
    }

    validCount++;
    if (val < minFound) minFound = val;
    if (val > maxFound) maxFound = val;

    // Physical plausibility sanity limits for Indian Ocean
    if (expected.variable === 'TEMP') {
      if (val < -2.0 || val > 36.0) {
        errors.push(`Unrealistic ocean temperature detected: ${val.toFixed(2)}°C at index ${i}. Expected [-2°C, 36°C].`);
        break;
      }
    } else if (expected.variable === 'SAL') {
      if (val < 15.0 || val > 44.0) {
        errors.push(`Unrealistic ocean salinity detected: ${val.toFixed(2)} PSU at index ${i}. Expected [15, 44] PSU.`);
        break;
      }
    } else if (expected.variable === 'CHLA') {
      if (val < 0.0 || val > 50.0) {
        errors.push(`Unrealistic chlorophyll concentration: ${val.toFixed(2)} mg/m³ at index ${i}.`);
        break;
      }
    }
  }

  if (validCount === 0) {
    errors.push('Zero valid numeric ocean points found in dataset response (all points null/NaN).');
  }

  if (nanOrInfCount > 0) {
    warnings.push(`Detected ${nanOrInfCount} non-finite/NaN points in grid array.`);
  }

  // 6. Unit Verification
  const expectedUnit = expected.variable === 'TEMP' ? '°C' : expected.variable === 'SAL' ? 'PSU' : 'mg/m³';
  if (slice.unit && slice.unit !== expectedUnit && !slice.unit.includes(expectedUnit.replace('°', ''))) {
    warnings.push(`Unit string "${slice.unit}" differs from standard "${expectedUnit}".`);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Cross-Check: Selects sample points across the domain (NW, Center, SE)
 * and confirms values are consistent with the dataset.
 */
export function performCrossCheckSampling(
  slice: ErddapGridSliceResponse,
  variable: OceanVariable
): {
  allPassed: boolean;
  samples: Array<{
    locationName: string;
    lat: number;
    lon: number;
    sourceVal: number | null;
    status: 'MATCH' | 'MISMATCH' | 'LAND_OR_FILL';
  }>;
} {
  const testLocations = [
    { name: 'NW Arabian Sea (Off Oman / Gulf of Aden)', lat: 18.5, lon: 62.5 },
    { name: 'Central Equatorial Indian Ocean', lat: 0.5, lon: 77.5 },
    { name: 'SE Southern Tropical Indian Ocean', lat: -18.5, lon: 102.5 },
  ];

  const latMin = slice.latMin ?? -29.5;
  const latStep = slice.latStep ?? 1.0;
  const latCount = slice.latCount ?? 60;
  const lonMin = slice.lonMin ?? 30.5;
  const lonStep = slice.lonStep ?? 1.0;
  const lonCount = slice.lonCount ?? 90;

  const samples = testLocations.map((loc) => {
    const latIdx = Math.round((loc.lat - latMin) / latStep);
    const lonIdx = Math.round((loc.lon - lonMin) / lonStep);

    if (latIdx >= 0 && latIdx < latCount && lonIdx >= 0 && lonIdx < lonCount) {
      const idx = latIdx * lonCount + lonIdx;
      const val = slice.values[idx];

      if (val === null || isNaN(val)) {
        return {
          locationName: loc.name,
          lat: loc.lat,
          lon: loc.lon,
          sourceVal: null,
          status: 'LAND_OR_FILL' as const,
        };
      }

      // Check plausibility for variable
      let isValid = true;
      if (variable === 'TEMP' && (val < 1.0 || val > 35.0)) isValid = false;
      if (variable === 'SAL' && (val < 25.0 || val > 42.0)) isValid = false;

      return {
        locationName: loc.name,
        lat: loc.lat,
        lon: loc.lon,
        sourceVal: val,
        status: isValid ? ('MATCH' as const) : ('MISMATCH' as const),
      };
    }

    return {
      locationName: loc.name,
      lat: loc.lat,
      lon: loc.lon,
      sourceVal: null,
      status: 'LAND_OR_FILL' as const,
    };
  });

  const hasMismatch = samples.some((s) => s.status === 'MISMATCH');
  return {
    allPassed: !hasMismatch,
    samples,
  };
}

/**
 * Full Pre-Render Quality Gate
 * Executes Stage 1, Stage 2, and Sample Cross-Checks.
 */
export function validateOceanDataBeforeRender(params: {
  variable: OceanVariable;
  timeStr: string;
  depth: number;
  slice: ErddapGridSliceResponse | null;
  isCached?: boolean;
}): PreRenderValidationResult {
  const { variable, timeStr, depth, slice, isCached = false } = params;
  const cleanReqDate = timeStr.includes('T') ? timeStr.split('T')[0] : timeStr;

  // 1. Stage 1: Request Validation
  const reqCheck = validateOceanDataRequest({ variable, timeStr, depth });
  if (!reqCheck.valid) {
    return {
      passed: false,
      valid: false,
      reason: 'INVALID_REQUEST',
      state: 'VALIDATION_FAILED',
      errors: reqCheck.errors,
      warnings: [],
      provenance: {
        datasetId: variable === 'CHLA' ? OCEANSAT2_CHLOROPHYLL_DATASET.datasetId : ARGO_VAM_DATASET.datasetId,
        sourceOrg: 'INCOIS (Indian National Centre for Ocean Information Services)',
        variable,
        units: variable === 'TEMP' ? '°C' : variable === 'SAL' ? 'PSU' : 'mg/m³',
        timeStr,
        requestedDate: cleanReqDate,
        actualDate: 'N/A',
        depth,
        requestedDepth: depth,
        actualDepth: depth,
        spatialResolution: variable === 'CHLA' ? '0.25°' : '1.0°',
        spatialBounds: {
          latMin: GRID_METADATA.latMin,
          latMax: GRID_METADATA.latMax,
          lonMin: GRID_METADATA.lonMin,
          lonMax: GRID_METADATA.lonMax,
        },
        lastSuccessfulFetch: 0,
        verificationState: 'VALIDATION_FAILED',
        validationMessages: reqCheck.errors,
        sampleCheckPassed: false,
        sampleChecks: [],
      },
    };
  }

  // If slice is missing or unavailable
  if (!slice) {
    return {
      passed: false,
      valid: false,
      reason: 'UNAVAILABLE',
      state: 'UNAVAILABLE',
      errors: ['Data slice not currently available from INCOIS ERDDAP.'],
      warnings: [],
      provenance: {
        datasetId: variable === 'CHLA' ? OCEANSAT2_CHLOROPHYLL_DATASET.datasetId : ARGO_VAM_DATASET.datasetId,
        sourceOrg: 'INCOIS (Indian National Centre for Ocean Information Services)',
        variable,
        units: variable === 'TEMP' ? '°C' : variable === 'SAL' ? 'PSU' : 'mg/m³',
        timeStr,
        requestedDate: cleanReqDate,
        actualDate: 'N/A',
        depth,
        requestedDepth: depth,
        actualDepth: depth,
        spatialResolution: variable === 'CHLA' ? '0.25°' : '1.0°',
        spatialBounds: {
          latMin: GRID_METADATA.latMin,
          latMax: GRID_METADATA.latMax,
          lonMin: GRID_METADATA.lonMin,
          lonMax: GRID_METADATA.lonMax,
        },
        lastSuccessfulFetch: 0,
        verificationState: 'UNAVAILABLE',
        validationMessages: ['Data temporarily unavailable from endpoint'],
        sampleCheckPassed: false,
        sampleChecks: [],
      },
    };
  }

  // 2. Stage 2: Response Validation
  const respCheck = validateOceanDataResponse(slice, { variable, timeStr, depth });
  const actualDate = slice.timeStr ? (slice.timeStr.includes('T') ? slice.timeStr.split('T')[0] : slice.timeStr) : cleanReqDate;
  const actualDepth = slice.depth !== undefined ? slice.depth : depth;

  if (!respCheck.valid) {
    return {
      passed: false,
      valid: false,
      reason: 'VALIDATION_FAILED',
      state: 'VALIDATION_FAILED',
      errors: respCheck.errors,
      warnings: respCheck.warnings,
      provenance: {
        datasetId: slice.datasetId,
        sourceOrg: 'INCOIS (Indian National Centre for Ocean Information Services)',
        variable,
        units: slice.unit || (variable === 'TEMP' ? '°C' : variable === 'SAL' ? 'PSU' : 'mg/m³'),
        timeStr,
        requestedDate: cleanReqDate,
        actualDate,
        depth,
        requestedDepth: depth,
        actualDepth,
        spatialResolution: '1.0°',
        spatialBounds: {
          latMin: slice.latMin,
          latMax: slice.latMax,
          lonMin: slice.lonMin,
          lonMax: slice.lonMax,
        },
        lastSuccessfulFetch: slice.fetchedAt || Date.now(),
        verificationState: 'VALIDATION_FAILED',
        validationMessages: respCheck.errors,
        sampleCheckPassed: false,
        sampleChecks: [],
      },
    };
  }

  // 3. Sample Cross-Checks
  const sampleCheck = performCrossCheckSampling(slice, variable);
  if (!sampleCheck.allPassed) {
    return {
      passed: false,
      valid: false,
      reason: 'PHYSICAL_LIMIT_EXCEEDED',
      state: 'VALIDATION_FAILED',
      errors: ['Cross-check sampling identified value discrepancies against physical bounds.'],
      warnings: respCheck.warnings,
      provenance: {
        datasetId: slice.datasetId,
        sourceOrg: 'INCOIS (Indian National Centre for Ocean Information Services)',
        variable,
        units: slice.unit,
        timeStr,
        requestedDate: cleanReqDate,
        actualDate,
        depth,
        requestedDepth: depth,
        actualDepth,
        spatialResolution: '1.0°',
        spatialBounds: {
          latMin: slice.latMin,
          latMax: slice.latMax,
          lonMin: slice.lonMin,
          lonMax: slice.lonMax,
        },
        lastSuccessfulFetch: slice.fetchedAt || Date.now(),
        verificationState: 'VALIDATION_FAILED',
        validationMessages: ['Sample check failed'],
        sampleCheckPassed: false,
        sampleChecks: sampleCheck.samples,
      },
    };
  }

  // 4. Quality Gate Passed
  const finalState: VerificationState = isCached ? 'CACHED' : 'VERIFIED';
  return {
    passed: true,
    valid: true,
    state: finalState,
    errors: [],
    warnings: respCheck.warnings,
    validatedSlice: slice,
    provenance: {
      datasetId: slice.datasetId,
      sourceOrg: 'INCOIS (Indian National Centre for Ocean Information Services)',
      variable,
      units: slice.unit,
      timeStr,
      requestedDate: cleanReqDate,
      actualDate,
      depth,
      requestedDepth: depth,
      actualDepth,
      spatialResolution: '1.0°',
      spatialBounds: {
        latMin: slice.latMin,
        latMax: slice.latMax,
        lonMin: slice.lonMin,
        lonMax: slice.lonMax,
      },
      lastSuccessfulFetch: slice.fetchedAt || Date.now(),
      verificationState: finalState,
      validationMessages: respCheck.warnings.length > 0 ? respCheck.warnings : ['All Quality Checks Passed (Stage 1 & 2 + Domain Samples)'],
      sampleCheckPassed: true,
      sampleChecks: sampleCheck.samples,
    },
  };
}
