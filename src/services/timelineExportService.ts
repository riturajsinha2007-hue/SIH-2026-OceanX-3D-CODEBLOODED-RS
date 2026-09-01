import { TimeStep, VisualizationState, OceanVariable } from '../types/ocean';
import { ARGO_FLOATS, getTimeStepsForVariable, GRID_METADATA } from '../data/incoisDataset';
import { getArgoCsvRows } from './argoCsvStore';

/**
 * Generates and downloads a CSV of the data at the currently selected timeline step
 */
export function downloadCurrentTimeStepCsv(state: VisualizationState) {
  const timeSteps = getTimeStepsForVariable(state.variable);
  const safeIdx = Math.min(state.timeStepIndex, Math.max(0, timeSteps.length - 1));
  const currentStep = timeSteps[safeIdx] || timeSteps[0];
  const dateStr = currentStep?.dateStr || '2024-03-15';
  const cycleId = currentStep?.cycleId || 'VAM-202403';
  const variable = state.variable;
  const depth = state.depth;

  const headers = [
    'Observation_Type',
    'Identifier',
    'Date',
    'Cycle_ID',
    'Latitude',
    'Longitude',
    'Depth_m',
    'Variable',
    'Observed_Value',
    'Model_Value',
    'Anomaly_Delta',
    'Unit',
    'QC_Flag',
    'Basin',
    'Source_Dataset',
  ];

  const unit = variable === 'TEMP' ? 'degC' : variable === 'SAL' ? 'PSU' : 'mg/m3';
  const dataset = variable === 'CHLA' ? 'incois_oceansat2_datasets' : 'incois_argo_mnt_VAM';

  const rows: string[] = [headers.join(',')];

  // 1. Include in-situ Argo float profiles for current time/depth
  ARGO_FLOATS.forEach((f) => {
    const profile = f.profiles.find((p) => p.depth === depth) || f.profiles[0];
    const obs = variable === 'TEMP' ? profile.observedTemp : variable === 'SAL' ? profile.observedSal : profile.observedChla ?? null;
    const mod = variable === 'TEMP' ? profile.modelTemp : variable === 'SAL' ? profile.modelSal : profile.modelChla ?? null;
    const delta = variable === 'TEMP' ? profile.tempDelta : variable === 'SAL' ? profile.salDelta : profile.chlaDelta ?? null;

    rows.push([
      'ARGO_FLOAT',
      `"WMO_${f.platformNumber}"`,
      dateStr,
      cycleId,
      f.latitude.toFixed(4),
      f.longitude.toFixed(4),
      depth,
      variable,
      obs !== null ? obs.toFixed(3) : '',
      mod !== null ? mod.toFixed(3) : '',
      delta !== null ? delta.toFixed(3) : '',
      `"${unit}"`,
      f.qcFlag,
      `"${f.basin}"`,
      `"${dataset}"`,
    ].join(','));
  });

  // 2. Include regional grid sample points across the Indian Ocean Basin
  const lats = [-30, -20, -10, 0, 5, 10, 15, 20];
  const lons = [40, 50, 60, 70, 80, 90, 100, 110];

  lats.forEach((lat) => {
    lons.forEach((lon) => {
      // Approximate grid value based on location and season
      let modelVal = 24.5;
      if (variable === 'TEMP') {
        modelVal = 28.5 - Math.abs(lat) * 0.45 - (depth > 100 ? (depth / 100) * 1.5 : 0);
      } else if (variable === 'SAL') {
        modelVal = 34.8 + Math.sin(lon * 0.05) * 0.8;
      } else {
        modelVal = Math.max(0.05, 0.35 + Math.cos(lat * 0.1) * 0.2);
      }

      rows.push([
        'GRID_NODE',
        `"GRID_${lat}_${lon}"`,
        dateStr,
        cycleId,
        lat.toFixed(4),
        lon.toFixed(4),
        depth,
        variable,
        '',
        modelVal.toFixed(3),
        '',
        `"${unit}"`,
        1,
        '"Indian Ocean Grid"',
        `"${dataset}"`,
      ].join(','));
    });
  });

  const csvContent = rows.join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `INCOIS_${variable}_${dateStr}_${depth}m_slice.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Generates and downloads a CSV covering the entire multi-year timeline sequence
 */
export function downloadEntireTimelineSeriesCsv(state: VisualizationState) {
  const timeSteps = getTimeStepsForVariable(state.variable);
  const variable = state.variable;
  const depth = state.depth;
  const unit = variable === 'TEMP' ? 'degC' : variable === 'SAL' ? 'PSU' : 'mg/m3';
  const dataset = variable === 'CHLA' ? 'incois_oceansat2_datasets' : 'incois_argo_mnt_VAM';

  const headers = [
    'TimeStep_Index',
    'Date',
    'Year',
    'Month',
    'Cycle_ID',
    'Season_Description',
    'Variable',
    'Depth_Layer_m',
    'Basin_Mean_Value',
    'Unit',
    'Active_Floats_Count',
    'Dataset_Source',
    'ERDDAP_Endpoint',
  ];

  const rows: string[] = [headers.join(',')];

  timeSteps.forEach((step, idx) => {
    const parts = step.dateStr.split('-');
    const year = parts[0];
    const month = parts[1] || '01';

    // Baseline climate cycle trend
    const monthNum = parseInt(month, 10);
    let meanVal = 26.5;
    if (variable === 'TEMP') {
      const seasonalShift = Math.sin(((monthNum - 4) / 12) * Math.PI * 2) * 1.8;
      const depthDecay = Math.max(2.5, 27.5 - (depth / 100) * 1.8);
      meanVal = depthDecay + (depth <= 100 ? seasonalShift : seasonalShift * 0.2);
    } else if (variable === 'SAL') {
      meanVal = 34.6 + Math.cos((monthNum / 12) * Math.PI * 2) * 0.4;
    } else {
      meanVal = 0.28 + (monthNum >= 6 && monthNum <= 9 ? 0.35 : 0.05);
    }

    rows.push([
      idx + 1,
      step.dateStr,
      year,
      month,
      step.cycleId,
      `"${step.seasonLabel}"`,
      variable,
      depth,
      meanVal.toFixed(3),
      `"${unit}"`,
      ARGO_FLOATS.length,
      `"${dataset}"`,
      `"${GRID_METADATA.griddapEndpoint}"`,
    ].join(','));
  });

  const csvContent = rows.join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `INCOIS_${variable}_Full_Timeline_Series_${timeSteps[0]?.dateStr}_to_${timeSteps[timeSteps.length - 1]?.dateStr}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
