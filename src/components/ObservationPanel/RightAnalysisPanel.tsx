import React, { useState, useMemo } from 'react';
import { ArgoFloat, DepthLevel, OceanVariable, PointProbeData, VisualizationState } from '../../types/ocean';
import { ScientificLegend } from '../ColorLegend/ScientificLegend';
import {
  getRowsForPlatform,
  getPlatformMetadata,
  downloadArgoCsv,
  normalizePlatformId,
} from '../../services/argoCsvStore';
import {
  X,
  MapPin,
  Activity,
  Calendar,
  Layers,
  Database,
  ExternalLink,
  Target,
  Copy,
  Check,
  Thermometer,
  Waves,
  Sparkles,
  ArrowRight,
  Download,
  AlertCircle,
  CheckCircle2,
  Bug,
  FileText,
  Eye,
  Sliders,
  ChevronDown,
  Info,
  Compass,
} from 'lucide-react';

interface RightAnalysisPanelProps {
  selectedFloat: ArgoFloat | null;
  selectedProbePoint: PointProbeData | null;
  onClose: () => void;
  onCloseProbe: () => void;
  onSelectFloat: (floatId: string) => void;
  allFloats: ArgoFloat[];
  state: VisualizationState;
  onChangeDepth: (depth: DepthLevel) => void;
  onChangeVariable: (variable: OceanVariable) => void;
}

type ModelCompareMode = 'both' | 'observed' | 'model';

const STANDARD_DEPTHS: DepthLevel[] = [5, 50, 100, 200, 500, 1000, 2000];

export const RightAnalysisPanel: React.FC<RightAnalysisPanelProps> = ({
  selectedFloat,
  selectedProbePoint,
  onClose,
  onCloseProbe,
  onSelectFloat,
  allFloats,
  state,
  onChangeDepth,
  onChangeVariable,
}) => {
  const [profileVar, setProfileVar] = useState<OceanVariable>(state.variable);
  const [compareMode, setCompareMode] = useState<ModelCompareMode>('both');
  const [hoveredDepth, setHoveredDepth] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);

  // Synchronize profileVar when global variable changes
  React.useEffect(() => {
    setProfileVar(state.variable);
  }, [state.variable]);

  const activePlatformId = useMemo(() => {
    return normalizePlatformId(state.selectedFloatId || selectedFloat?.platformNumber || selectedFloat?.id);
  }, [state.selectedFloatId, selectedFloat]);

  // Retrieve matching CSV records locally (Single Source of Truth, 24 depth measurements)
  const matchingCsvRows = useMemo(() => {
    if (!activePlatformId) return [];
    return getRowsForPlatform(activePlatformId);
  }, [activePlatformId]);

  // Platform metadata directly from parsed CSV
  const platformMeta = useMemo(() => {
    if (!activePlatformId) return null;
    return getPlatformMetadata(activePlatformId);
  }, [activePlatformId]);

  // Current row at selected depth
  const currentDepthRow = useMemo(() => {
    if (matchingCsvRows.length === 0) return null;
    return matchingCsvRows.find((r) => r.depth === state.depth) || matchingCsvRows[0];
  }, [matchingCsvRows, state.depth]);

  // Row under hover inspection in graph (or fallback to active selected depth)
  const inspectedRow = useMemo(() => {
    if (matchingCsvRows.length === 0) return null;
    if (hoveredDepth !== null) {
      return matchingCsvRows.find((r) => r.depth === hoveredDepth) || currentDepthRow;
    }
    return currentDepthRow;
  }, [matchingCsvRows, hoveredDepth, currentDepthRow]);

  const unit = profileVar === 'TEMP' ? '°C' : profileVar === 'SAL' ? 'PSU' : 'mg/m³';

  // Strict finite formatting utility: NEVER prints NaN or undefined
  const formatVal = (val: number | null | undefined, unitSuffix: string): string => {
    if (typeof val === 'number' && isFinite(val) && !isNaN(val)) {
      return `${val.toFixed(2)}${unitSuffix}`;
    }
    return 'Data unavailable';
  };

  const formatDelta = (val: number | null | undefined, unitSuffix: string): string => {
    if (typeof val === 'number' && isFinite(val) && !isNaN(val)) {
      return `${val > 0 ? '+' : ''}${val.toFixed(2)}${unitSuffix}`;
    }
    return 'Data unavailable';
  };

  // SVG Chart Dimensions & Configuration
  const chartWidth = 310;
  const chartHeight = 290;
  const padding = { top: 28, right: 24, bottom: 36, left: 54 };

  // Calculate profile scales & non-linear depth mapping (Inverted Y-axis: 0m/5m at top down to 2000m at bottom)
  const chartScales = useMemo(() => {
    if (matchingCsvRows.length === 0) return null;

    const validObsValues: number[] = [];
    const validModValues: number[] = [];

    matchingCsvRows.forEach((r) => {
      const obs = profileVar === 'TEMP' ? r.temperature : profileVar === 'SAL' ? r.salinity : r.chlorophyll;
      const mod = profileVar === 'TEMP' ? r.modelTemperature : profileVar === 'SAL' ? r.modelSalinity : r.modelChlorophyll;
      if (typeof obs === 'number' && isFinite(obs)) validObsValues.push(obs);
      if (typeof mod === 'number' && isFinite(mod)) validModValues.push(mod);
    });

    const allValues = [...validObsValues, ...validModValues];
    if (allValues.length === 0) return null;

    const isLog = profileVar === 'CHLA';
    let minVal: number;
    let maxVal: number;

    if (isLog) {
      minVal = 0.02;
      maxVal = Math.max(6.0, Math.ceil(Math.max(...allValues)));
    } else if (profileVar === 'TEMP') {
      minVal = Math.floor(Math.min(...allValues) - 1.0);
      maxVal = Math.ceil(Math.max(...allValues) + 1.0);
    } else {
      // Salinity
      minVal = Math.floor((Math.min(...allValues) - 0.3) * 10) / 10;
      maxVal = Math.ceil((Math.max(...allValues) + 0.3) * 10) / 10;
    }

    const depths = matchingCsvRows.map((p) => p.depth);

    // Inverted depth: Ocean depth increases downward
    // Depth index mapping with nice optical spacing for ocean vertical soundings
    const depthToY = (d: number) => {
      const idx = depths.indexOf(d);
      if (idx !== -1) {
        return (
          padding.top +
          (idx / Math.max(1, depths.length - 1)) * (chartHeight - padding.top - padding.bottom)
        );
      }
      // Proportional fallback
      const minD = depths[0] || 5;
      const maxD = depths[depths.length - 1] || 2000;
      const ratio = Math.max(0, Math.min(1, (d - minD) / (maxD - minD)));
      return padding.top + ratio * (chartHeight - padding.top - padding.bottom);
    };

    const valToX = (v: number) => {
      if (isLog) {
        const logMin = Math.log10(minVal);
        const logMax = Math.log10(maxVal);
        const logVal = Math.log10(Math.max(minVal, v));
        const factor = (logVal - logMin) / (logMax - logMin);
        return padding.left + factor * (chartWidth - padding.left - padding.right);
      }
      const range = maxVal - minVal || 1;
      return (
        padding.left +
        ((v - minVal) / range) * (chartWidth - padding.left - padding.right)
      );
    };

    return { minVal, maxVal, depthToY, valToX, depths, isLog };
  }, [matchingCsvRows, profileVar]);

  // Overall Basin Statistics when no float is selected
  const basinStats = useMemo(() => {
    let highDiscrepancyCount = 0;
    let totalDelta = 0;

    allFloats.forEach((f) => {
      const p = f.profiles.find((pr) => pr.depth === state.depth) || f.profiles[0];
      if (p) {
        const delta =
          state.variable === 'TEMP'
            ? Math.abs(p.tempDelta)
            : state.variable === 'SAL'
            ? Math.abs(p.salDelta)
            : Math.abs(p.chlaDelta || 0);
        if (isFinite(delta)) {
          totalDelta += delta;
          if (delta >= (state.variable === 'CHLA' ? 0.5 : 1.0)) highDiscrepancyCount++;
        }
      }
    });

    const avgDelta = (totalDelta / (allFloats.length || 1)).toFixed(2);
    return { highDiscrepancyCount, avgDelta };
  }, [allFloats, state.depth, state.variable]);

  // Line Colors per Variable according to scientific requirements:
  // Temperature: Cyan / Blue line
  // Salinity: Turquoise line
  // Chlorophyll: Green line
  const varLineColor = profileVar === 'TEMP' ? '#06b6d4' : profileVar === 'SAL' ? '#14b8a6' : '#22c55e';
  const varModelLineColor = profileVar === 'TEMP' ? '#38bdf8' : profileVar === 'SAL' ? '#2dd4bf' : '#4ade80';

  // Copy point data to clipboard
  const handleCopyProbeData = () => {
    if (!selectedProbePoint) return;
    const text = `INCOIS Point Ocean Sounding\nBasin: ${selectedProbePoint.basin}\nCoordinates: ${selectedProbePoint.latitude.toFixed(4)}°N, ${selectedProbePoint.longitude.toFixed(4)}°E\nDepth Layer: ${state.depth}m\nTemperature: ${selectedProbePoint.currentValue.temp.toFixed(2)} °C\nSalinity: ${selectedProbePoint.currentValue.sal.toFixed(2)} PSU\nChlorophyll-a: ${selectedProbePoint.currentValue.chla.toFixed(3)} mg/m³`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      id="right-analysis-panel"
      className="relative z-30 flex flex-col h-full w-84 md:w-98 bg-slate-900/95 backdrop-blur-xl border-l border-slate-700/60 shadow-2xl overflow-y-auto custom-scrollbar"
    >
      {/* 0. DOCKED ACTIVE VARIABLE & COLORBAR LEGEND */}
      <div className="p-3.5 pb-2.5 border-b border-slate-800/80 bg-slate-950/50 shrink-0">
        <ScientificLegend state={state} />
      </div>

      {/* DEBUG MODE INSPECTOR HUD */}
      {state.debugMode && (
        <div
          id="state-sync-debug-overlay"
          className="m-3 p-3 bg-amber-950/80 border border-amber-500/80 rounded-xl text-xs space-y-1.5 shadow-xl animate-fade-in"
        >
          <div className="flex items-center justify-between border-b border-amber-700/60 pb-1.5">
            <div className="flex items-center gap-1.5 text-amber-300 font-bold font-mono">
              <Bug className="w-3.5 h-3.5 text-amber-400" />
              <span>CSV SINGLE SOURCE OF TRUTH</span>
            </div>
            <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono text-[10px] border border-emerald-500/40">
              LOCAL IN-MEMORY
            </span>
          </div>

          <div className="font-mono text-[11px] text-amber-200/90 space-y-1">
            <div className="flex justify-between">
              <span className="text-amber-400/80">Selected Platform:</span>
              <span className="text-slate-100 font-semibold">{activePlatformId || 'None'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-amber-400/80">Matching CSV Rows:</span>
              <span className="text-cyan-300 font-semibold">{matchingCsvRows.length} rows</span>
            </div>
            <div className="flex justify-between">
              <span className="text-amber-400/80">Active Depth:</span>
              <span className="text-amber-300 font-semibold">{state.depth}m</span>
            </div>
            <div className="flex justify-between">
              <span className="text-amber-400/80">Active Variable:</span>
              <span className="text-emerald-300 font-semibold">{profileVar}</span>
            </div>
          </div>
        </div>
      )}

      {/* 1. ARGO IN-SITU FLOAT VIEW (FROM CSV DATA) */}
      {activePlatformId ? (
        matchingCsvRows.length > 0 && platformMeta ? (
          <div className="flex flex-col p-4 space-y-4">
            {/* Header with Close & CSV Download */}
            <div className="flex items-start justify-between pb-3 border-b border-slate-800">
              <div>
                <div className="flex items-center gap-1.5 text-xs font-mono text-cyan-400 font-semibold">
                  <MapPin className="w-3.5 h-3.5 text-cyan-400" />
                  <span>IN-SITU SOUNDING PLATFORM</span>
                </div>
                <h2 className="text-base font-bold text-slate-100 flex items-center gap-2 mt-0.5">
                  <span>Argo WMO #{platformMeta.wmoId}</span>
                  <span className="px-2 py-0.5 text-[10px] font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded-full flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                    <span>QC Flag #{currentDepthRow?.qcFlag || 1}</span>
                  </span>
                </h2>
              </div>
              <div className="flex items-center gap-1">
                <button
                  id="btn-download-float-csv"
                  onClick={() => downloadArgoCsv(platformMeta.wmoId)}
                  title="Download Float Sounding CSV"
                  className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-300 hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                </button>
                <button
                  id="btn-close-analysis-panel"
                  onClick={onClose}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Float Metadata Grid */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-slate-950/70 p-2.5 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-400 block font-medium">Basin Sector</span>
                <span className="font-semibold text-slate-200 truncate block">{platformMeta.basin}</span>
              </div>
              <div className="bg-slate-950/70 p-2.5 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-400 block font-medium">Cycle / Platform</span>
                <span className="font-mono font-semibold text-cyan-300">
                  Cycle #{platformMeta.cycleNumber}
                </span>
              </div>
              <div className="bg-slate-950/70 p-2.5 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-400 block font-medium">Coordinates</span>
                <span className="font-mono text-slate-200 text-[11px]">
                  {platformMeta.latitude.toFixed(2)}°N, {platformMeta.longitude.toFixed(2)}°E
                </span>
              </div>
              <div className="bg-slate-950/70 p-2.5 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-400 block font-medium">Sounding Date</span>
                <span className="font-mono text-slate-300 text-[11px]">
                  {platformMeta.date}
                </span>
              </div>
            </div>

            {/* Quick Depth Layer Selector */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
                <span className="flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-amber-400" />
                  <span>Sounding Depth Layer</span>
                </span>
                <span className="font-mono text-amber-300 font-bold">{state.depth}m</span>
              </div>
              <div className="flex items-center gap-1 overflow-x-auto pb-1 custom-scrollbar">
                {STANDARD_DEPTHS.map((d) => {
                  const isAct = state.depth === d;
                  return (
                    <button
                      key={`depth-btn-${d}`}
                      id={`depth-select-${d}`}
                      onClick={() => onChangeDepth(d)}
                      className={`px-2.5 py-1 text-xs font-mono rounded-lg border transition-all cursor-pointer whitespace-nowrap ${
                        isAct
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/60 font-bold shadow-sm'
                          : 'bg-slate-950/60 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-slate-200'
                      }`}
                    >
                      {d}m
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Observed vs Model Values Card at Selected Depth */}
            <div className="p-3 rounded-xl bg-gradient-to-br from-slate-950/90 to-slate-900 border border-slate-700/80 shadow-lg space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-cyan-400" />
                  <span>In-Situ Sounding ({inspectedRow ? inspectedRow.depth : state.depth}m)</span>
                </span>
                <span className="text-[10px] font-mono text-slate-400">
                  Δ = Obs − Model
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-slate-950/80 p-2 rounded-lg border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">Observed</span>
                  <span className="font-mono font-bold text-emerald-400 text-sm">
                    {profileVar === 'TEMP'
                      ? formatVal(inspectedRow?.temperature, '°C')
                      : profileVar === 'SAL'
                      ? formatVal(inspectedRow?.salinity, 'PSU')
                      : formatVal(inspectedRow?.chlorophyll, 'mg/m³')}
                  </span>
                </div>
                <div className="bg-slate-950/80 p-2 rounded-lg border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">INCOIS Model</span>
                  <span className="font-mono font-bold text-cyan-400 text-sm">
                    {profileVar === 'TEMP'
                      ? formatVal(inspectedRow?.modelTemperature, '°C')
                      : profileVar === 'SAL'
                      ? formatVal(inspectedRow?.modelSalinity, 'PSU')
                      : formatVal(inspectedRow?.modelChlorophyll, 'mg/m³')}
                  </span>
                </div>
                <div className="bg-slate-950/80 p-2 rounded-lg border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">Anomaly Δ</span>
                  <span
                    className={`font-mono font-bold text-sm ${
                      profileVar === 'TEMP'
                        ? Math.abs(inspectedRow?.tempAnomaly || 0) >= 1.0
                          ? 'text-red-400'
                          : 'text-emerald-400'
                        : profileVar === 'SAL'
                        ? Math.abs(inspectedRow?.salAnomaly || 0) >= 1.0
                          ? 'text-red-400'
                          : 'text-emerald-400'
                        : Math.abs(inspectedRow?.chlaAnomaly || 0) >= 0.5
                        ? 'text-red-400'
                        : 'text-emerald-400'
                    }`}
                  >
                    {profileVar === 'TEMP'
                      ? formatDelta(inspectedRow?.tempAnomaly, '°C')
                      : profileVar === 'SAL'
                      ? formatDelta(inspectedRow?.salAnomaly, 'PSU')
                      : formatDelta(inspectedRow?.chlaAnomaly, 'mg/m³')}
                  </span>
                </div>
              </div>

              {/* Sensor & Institution citation */}
              <div className="text-[10px] text-slate-500 font-mono flex items-center justify-between pt-1 border-t border-slate-800/80">
                <span className="truncate max-w-[180px]">{platformMeta.sensorType}</span>
                <span className="text-slate-400 truncate max-w-[140px]">{platformMeta.institution}</span>
              </div>
            </div>

            {/* DEDICATED ANOMALY INFORMATION DISPLAY CARDS */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
                <span className="flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Observation Anomaly Diagnostics</span>
                </span>
                <span className="text-[10px] font-mono text-slate-400">Layer {state.depth}m</span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {/* Temperature Anomaly Card */}
                <div className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800 flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-slate-400 font-medium flex items-center gap-1">
                      <Thermometer className="w-3 h-3 text-cyan-400" />
                      <span>Temp Anomaly</span>
                    </span>
                    <span
                      className={`text-[10px] font-mono px-1.5 py-0.2 rounded ${
                        Math.abs(currentDepthRow?.tempAnomaly || 0) >= 1.0
                          ? 'bg-red-500/20 text-red-300 border border-red-500/40'
                          : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      }`}
                    >
                      {Math.abs(currentDepthRow?.tempAnomaly || 0) >= 1.0 ? 'High' : 'Normal'}
                    </span>
                  </div>
                  <div className="mt-1.5 flex items-baseline justify-between">
                    <span className="font-mono text-sm font-bold text-slate-100">
                      {formatDelta(currentDepthRow?.tempAnomaly, '°C')}
                    </span>
                    <span className="text-[10px] font-mono text-slate-500">
                      Obs: {formatVal(currentDepthRow?.temperature, '°C')}
                    </span>
                  </div>
                </div>

                {/* Salinity Anomaly Card */}
                <div className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800 flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-slate-400 font-medium flex items-center gap-1">
                      <Waves className="w-3 h-3 text-teal-400" />
                      <span>Sal Anomaly</span>
                    </span>
                    <span
                      className={`text-[10px] font-mono px-1.5 py-0.2 rounded ${
                        Math.abs(currentDepthRow?.salAnomaly || 0) >= 0.8
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                          : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      }`}
                    >
                      {Math.abs(currentDepthRow?.salAnomaly || 0) >= 0.8 ? 'High' : 'Normal'}
                    </span>
                  </div>
                  <div className="mt-1.5 flex items-baseline justify-between">
                    <span className="font-mono text-sm font-bold text-slate-100">
                      {formatDelta(currentDepthRow?.salAnomaly, ' PSU')}
                    </span>
                    <span className="text-[10px] font-mono text-slate-500">
                      Obs: {formatVal(currentDepthRow?.salinity, ' PSU')}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* VERTICAL PROFILE GRAPH (SCIENTIFIC SOUNDING CURVE) */}
            <div className="p-3 bg-slate-950/70 rounded-xl border border-slate-800 space-y-3">
              {/* Header & Controls: Variable Tabs & Model Comparison Toggle */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Vertical Profile Curve</span>
                  </span>

                  {/* Variable Tabs: Temperature, Salinity, Chlorophyll */}
                  <div className="flex items-center gap-1 bg-slate-900 p-0.5 rounded-lg border border-slate-800 text-[10px]">
                    <button
                      id="btn-profile-temp"
                      onClick={() => {
                        setProfileVar('TEMP');
                        onChangeVariable('TEMP');
                      }}
                      className={`px-2 py-0.5 rounded font-medium transition-colors cursor-pointer ${
                        profileVar === 'TEMP'
                          ? 'bg-cyan-500 text-slate-950 font-bold'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      Temp
                    </button>
                    <button
                      id="btn-profile-sal"
                      onClick={() => {
                        setProfileVar('SAL');
                        onChangeVariable('SAL');
                      }}
                      className={`px-2 py-0.5 rounded font-medium transition-colors cursor-pointer ${
                        profileVar === 'SAL'
                          ? 'bg-teal-500 text-slate-950 font-bold'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      Salinity
                    </button>
                    <button
                      id="btn-profile-chla"
                      onClick={() => {
                        setProfileVar('CHLA');
                        onChangeVariable('CHLA');
                      }}
                      className={`px-2 py-0.5 rounded font-medium transition-colors cursor-pointer ${
                        profileVar === 'CHLA'
                          ? 'bg-emerald-500 text-slate-950 font-bold'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      Chl-a
                    </button>
                  </div>
                </div>

                {/* Model Comparison Toggle: [Both] [Observed] [Model] */}
                <div className="flex items-center justify-between text-[11px] bg-slate-900/80 p-1 rounded-lg border border-slate-800">
                  <span className="text-slate-400 text-[10px] pl-1 font-medium">Comparison:</span>
                  <div className="flex items-center gap-1">
                    <button
                      id="btn-compare-both"
                      onClick={() => setCompareMode('both')}
                      className={`px-2 py-0.5 rounded text-[10px] font-mono transition-colors cursor-pointer ${
                        compareMode === 'both'
                          ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      Obs + Model
                    </button>
                    <button
                      id="btn-compare-obs"
                      onClick={() => setCompareMode('observed')}
                      className={`px-2 py-0.5 rounded text-[10px] font-mono transition-colors cursor-pointer ${
                        compareMode === 'observed'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      Observed
                    </button>
                    <button
                      id="btn-compare-model"
                      onClick={() => setCompareMode('model')}
                      className={`px-2 py-0.5 rounded text-[10px] font-mono transition-colors cursor-pointer ${
                        compareMode === 'model'
                          ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40 font-bold'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      Model
                    </button>
                  </div>
                </div>
              </div>

              {/* Inverted Depth SVG Profile Chart */}
              {chartScales && (
                <div className="flex flex-col items-center">
                  <div className="relative">
                    <svg
                      width={chartWidth}
                      height={chartHeight}
                      className="overflow-visible select-none"
                      onMouseLeave={() => setHoveredDepth(null)}
                    >
                      {/* Depth Axis Title */}
                      <text
                        x={10}
                        y={padding.top - 12}
                        className="text-[9px] font-mono fill-slate-400 font-bold"
                      >
                        Depth (m) ↓
                      </text>

                      {/* Variable Unit Title */}
                      <text
                        x={chartWidth - padding.right}
                        y={padding.top - 12}
                        textAnchor="end"
                        className="text-[9px] font-mono fill-slate-400 font-bold"
                      >
                        {profileVar} ({unit}) →
                      </text>

                      {/* Value Ticks along top/bottom */}
                      {(() => {
                        const stepCount = 4;
                        const ticks: number[] = [];
                        for (let i = 0; i <= stepCount; i++) {
                          const val = chartScales.minVal + (i / stepCount) * (chartScales.maxVal - chartScales.minVal);
                          ticks.push(val);
                        }
                        return ticks.map((t, idx) => {
                          const x = chartScales.valToX(t);
                          return (
                            <g key={`val-tick-${idx}`}>
                              <line
                                x1={x}
                                y1={padding.top}
                                x2={x}
                                y2={chartHeight - padding.bottom}
                                stroke="#1e293b"
                                strokeDasharray="2,2"
                                strokeWidth="0.8"
                              />
                              <text
                                x={x}
                                y={chartHeight - padding.bottom + 14}
                                textAnchor="middle"
                                className="text-[8px] font-mono fill-slate-500"
                              >
                                {t.toFixed(profileVar === 'SAL' ? 1 : 0)}
                              </text>
                            </g>
                          );
                        });
                      })()}

                      {/* Standard Depth Grid Lines (Inverted: 0m at top down to 2000m at bottom) */}
                      {chartScales.depths.map((d) => {
                        const y = chartScales.depthToY(d);
                        const isActiveDepth = d === state.depth;
                        const isHovered = d === hoveredDepth;
                        return (
                          <g key={`grid-d-${d}`}>
                            <line
                              x1={padding.left}
                              y1={y}
                              x2={chartWidth - padding.right}
                              y2={y}
                              stroke={isActiveDepth ? '#f59e0b' : isHovered ? '#64748b' : '#334155'}
                              strokeDasharray={isActiveDepth ? '4,2' : '2,2'}
                              strokeWidth={isActiveDepth ? 1.6 : 0.8}
                              opacity={isActiveDepth ? 0.9 : 0.35}
                            />
                            <text
                              x={padding.left - 6}
                              y={y + 3.5}
                              textAnchor="end"
                              className={`text-[9px] font-mono cursor-pointer transition-colors ${
                                isActiveDepth
                                  ? 'fill-amber-400 font-bold'
                                  : isHovered
                                  ? 'fill-cyan-300 font-semibold'
                                  : 'fill-slate-500 hover:fill-slate-300'
                              }`}
                              onClick={() => onChangeDepth(d)}
                              onMouseEnter={() => setHoveredDepth(d)}
                            >
                              {d}m
                            </text>
                          </g>
                        );
                      })}

                      {/* INCOIS Model Curve (Dashed Line) */}
                      {(compareMode === 'both' || compareMode === 'model') &&
                        (() => {
                          const validMod = matchingCsvRows.filter((r) => {
                            const v = profileVar === 'TEMP' ? r.modelTemperature : profileVar === 'SAL' ? r.modelSalinity : r.modelChlorophyll;
                            return typeof v === 'number' && isFinite(v);
                          });
                          if (validMod.length < 2) return null;
                          const pathD = validMod
                            .map((r, i) => {
                              const v = profileVar === 'TEMP' ? r.modelTemperature : profileVar === 'SAL' ? r.modelSalinity : r.modelChlorophyll!;
                              const x = chartScales.valToX(v);
                              const y = chartScales.depthToY(r.depth);
                              return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
                            })
                            .join(' ');
                          return (
                            <path
                              d={pathD}
                              fill="none"
                              stroke={varModelLineColor}
                              strokeWidth="1.8"
                              strokeDasharray="4,3"
                              opacity={compareMode === 'both' ? 0.75 : 1.0}
                            />
                          );
                        })()}

                      {/* Observed Curve (Solid Line per Variable Color) */}
                      {(compareMode === 'both' || compareMode === 'observed') &&
                        (() => {
                          const validObs = matchingCsvRows.filter((r) => {
                            const v = profileVar === 'TEMP' ? r.temperature : profileVar === 'SAL' ? r.salinity : r.chlorophyll;
                            return typeof v === 'number' && isFinite(v);
                          });
                          if (validObs.length < 2) return null;
                          const pathD = validObs
                            .map((r, i) => {
                              const v = profileVar === 'TEMP' ? r.temperature : profileVar === 'SAL' ? r.salinity : r.chlorophyll!;
                              const x = chartScales.valToX(v);
                              const y = chartScales.depthToY(r.depth);
                              return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
                            })
                            .join(' ');
                          return (
                            <path
                              d={pathD}
                              fill="none"
                              stroke={varLineColor}
                              strokeWidth="2.4"
                            />
                          );
                        })()}

                      {/* Interactive Depth Points */}
                      {matchingCsvRows.map((r) => {
                        const y = chartScales.depthToY(r.depth);
                        const isActive = r.depth === state.depth;
                        const isHovered = r.depth === hoveredDepth;
                        const obs = profileVar === 'TEMP' ? r.temperature : profileVar === 'SAL' ? r.salinity : r.chlorophyll;
                        const mod = profileVar === 'TEMP' ? r.modelTemperature : profileVar === 'SAL' ? r.modelSalinity : r.modelChlorophyll;

                        return (
                          <g
                            key={`pt-${r.depth}`}
                            className="cursor-pointer group"
                            onClick={() => onChangeDepth(r.depth)}
                            onMouseEnter={() => setHoveredDepth(r.depth)}
                          >
                            {/* Hit-area transparent bar for seamless hover */}
                            <rect
                              x={padding.left}
                              y={y - 5}
                              width={chartWidth - padding.left - padding.right}
                              height={10}
                              fill="transparent"
                            />

                            {/* Model Point Circle */}
                            {(compareMode === 'both' || compareMode === 'model') &&
                              typeof mod === 'number' &&
                              isFinite(mod) && (
                                <circle
                                  cx={chartScales.valToX(mod)}
                                  cy={y}
                                  r={isActive || isHovered ? 4.5 : 3}
                                  fill={varModelLineColor}
                                  stroke="#0f172a"
                                  strokeWidth="1.2"
                                />
                              )}

                            {/* Observed Point Circle */}
                            {(compareMode === 'both' || compareMode === 'observed') &&
                              typeof obs === 'number' &&
                              isFinite(obs) && (
                                <circle
                                  cx={chartScales.valToX(obs)}
                                  cy={y}
                                  r={isActive ? 5.5 : isHovered ? 5 : 3.5}
                                  fill={varLineColor}
                                  stroke="#0f172a"
                                  strokeWidth="1.5"
                                />
                              )}

                            {/* Active Depth Ring */}
                            {isActive && (
                              <circle
                                cx={
                                  typeof obs === 'number' && isFinite(obs)
                                    ? chartScales.valToX(obs)
                                    : chartScales.valToX(mod || 0)
                                }
                                cy={y}
                                r={8}
                                fill="none"
                                stroke="#f59e0b"
                                strokeWidth="1.8"
                                className="animate-pulse"
                              />
                            )}
                          </g>
                        );
                      })}
                    </svg>
                  </div>

                  {/* Chart Legend */}
                  <div className="flex items-center justify-center gap-3.5 mt-2.5 text-[10px] text-slate-400">
                    {(compareMode === 'both' || compareMode === 'observed') && (
                      <div className="flex items-center gap-1.5">
                        <div
                          className="w-3.5 h-1.5 rounded-full"
                          style={{ backgroundColor: varLineColor }}
                        />
                        <span className="text-slate-300 font-medium">Observed (In-Situ)</span>
                      </div>
                    )}
                    {(compareMode === 'both' || compareMode === 'model') && (
                      <div className="flex items-center gap-1.5">
                        <div
                          className="w-3.5 h-0.5 border-t-2 border-dashed"
                          style={{ borderColor: varModelLineColor }}
                        />
                        <span className="text-slate-300 font-medium">INCOIS Model</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full border border-amber-400 bg-amber-400/20" />
                      <span>{state.depth}m Layer</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* NO MATCHING DATA FOR CLICKED PLATFORM */
          <div className="flex flex-col p-4 space-y-4">
            <div className="flex items-start justify-between pb-3 border-b border-slate-800">
              <h2 className="text-base font-bold text-slate-100">
                Argo Platform #{activePlatformId}
              </h2>
              <button
                onClick={onClose}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 rounded-xl bg-amber-950/40 border border-amber-800/60 text-amber-200 text-xs flex flex-col gap-2">
              <div className="flex items-center gap-2 font-semibold text-amber-300">
                <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                <span>No profile data available for this platform.</span>
              </div>
              <p className="text-[11px] text-amber-300/80 leading-relaxed">
                The requested platform identifier does not contain matching vertical sounding records in the loaded CSV dataset.
              </p>
            </div>
          </div>
        )
      ) : selectedProbePoint ? (
        /* 2. ARBITRARY OCEAN GRID NODE PROBE VIEW */
        <div className="flex flex-col p-4 space-y-4">
          <div className="flex items-start justify-between pb-3 border-b border-slate-800">
            <div>
              <div className="flex items-center gap-1.5 text-xs font-mono text-cyan-400 font-semibold">
                <Target className="w-3.5 h-3.5" />
                <span>4D OCEAN POINT PROBE</span>
              </div>
              <h2 className="text-base font-bold text-slate-100 mt-0.5">
                {selectedProbePoint.isLand ? 'Continental Landmass' : selectedProbePoint.basin}
              </h2>
            </div>
            <button
              id="btn-close-probe-panel"
              onClick={onCloseProbe}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800">
              <span className="text-[10px] text-slate-400 block font-medium">Coordinates</span>
              <span className="font-mono text-slate-200 text-[11px]">
                {selectedProbePoint.latitude.toFixed(3)}°N, {selectedProbePoint.longitude.toFixed(3)}°E
              </span>
            </div>
            <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800">
              <span className="text-[10px] text-slate-400 block font-medium">Inspection Depth</span>
              <span className="font-mono text-amber-300 font-semibold">
                {state.depth}m Layer
              </span>
            </div>
          </div>

          {/* Model Value Display */}
          <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
            <span className="text-xs font-semibold text-slate-300 block">
              Collocated Model Parameter
            </span>
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-900 border border-slate-800">
              <span className="text-xs text-slate-400">
                {profileVar === 'TEMP' ? 'Temperature' : profileVar === 'SAL' ? 'Salinity' : 'Chlorophyll-a'}
              </span>
              <span className="font-mono font-bold text-cyan-300 text-sm">
                {profileVar === 'TEMP'
                  ? formatVal(selectedProbePoint.currentValue.temp, '°C')
                  : profileVar === 'SAL'
                  ? formatVal(selectedProbePoint.currentValue.sal, 'PSU')
                  : formatVal(selectedProbePoint.currentValue.chla, 'mg/m³')}
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <button
              onClick={handleCopyProbeData}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-cyan-400" />}
              <span>{copied ? 'Copied' : 'Copy Sounding'}</span>
            </button>
          </div>
        </div>
      ) : (
        /* 3. DEFAULT BASIN-WIDE OVERVIEW */
        <div className="flex flex-col p-4 space-y-4">
          <div>
            <span className="text-xs font-mono text-cyan-400 font-semibold block uppercase">
              INCOIS Indian Ocean Array
            </span>
            <h2 className="text-base font-bold text-slate-100 mt-0.5">
              Observational Array Overview
            </h2>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-400 block">Active Floats</span>
              <span className="text-lg font-mono font-bold text-emerald-400">
                {allFloats.length}
              </span>
              <span className="text-[10px] text-slate-500 block mt-0.5">MoES / INCOIS Network</span>
            </div>
            <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-400 block">High Anomaly Floats</span>
              <span className="text-lg font-mono font-bold text-amber-400">
                {basinStats.highDiscrepancyCount}
              </span>
              <span className="text-[10px] text-slate-500 block mt-0.5">|Δ| &gt; {state.variable === 'CHLA' ? '0.5' : '1.0'}</span>
            </div>
          </div>

          <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 text-xs text-slate-400 space-y-1.5">
            <div className="flex items-center gap-1.5 text-slate-300 font-semibold">
              <MapPin className="w-3.5 h-3.5 text-cyan-400" />
              <span>Interactive In-Situ Soundings</span>
            </div>
            <p className="text-[11px] leading-relaxed">
              Click any Argo float marker on the 3D globe or click on the ocean surface to inspect vertical sounding curves, CTD profiles, and compare live in-situ observations against INCOIS numerical model fields.
            </p>
          </div>

          <button
            onClick={() => downloadArgoCsv()}
            className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 transition-all cursor-pointer shadow-md"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download Full Argo Dataset (CSV)</span>
          </button>
        </div>
      )}
    </div>
  );
};
