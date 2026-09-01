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
  Layers,
  Copy,
  Check,
  Download,
  AlertCircle,
  Bug,
  Sliders,
  ExternalLink,
  ChevronRight,
  ChevronLeft,
  Eye,
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

  // Retrieve matching CSV records locally
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

  // Strict finite formatting utility
  const formatVal = (val: number | null | undefined, unitSuffix: string): string => {
    if (typeof val === 'number' && isFinite(val) && !isNaN(val)) {
      return `${val.toFixed(1)}${unitSuffix}`;
    }
    return '—';
  };

  const formatDelta = (val: number | null | undefined, unitSuffix: string): string => {
    if (typeof val === 'number' && isFinite(val) && !isNaN(val)) {
      return `${val > 0 ? '+' : ''}${val.toFixed(1)}${unitSuffix}`;
    }
    return '—';
  };

  // SVG Chart Dimensions & Configuration
  const chartWidth = 280;
  const chartHeight = 260;
  const padding = { top: 20, right: 18, bottom: 28, left: 45 };

  // Calculate profile scales & non-linear depth mapping
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
      minVal = Math.floor((Math.min(...allValues) - 0.3) * 10) / 10;
      maxVal = Math.ceil((Math.max(...allValues) + 0.3) * 10) / 10;
    }

    const depths = matchingCsvRows.map((p) => p.depth);

    const depthToY = (d: number) => {
      const idx = depths.indexOf(d);
      if (idx !== -1) {
        return (
          padding.top +
          (idx / Math.max(1, depths.length - 1)) * (chartHeight - padding.top - padding.bottom)
        );
      }
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

  // Minimal Palette Line Colors
  // Observed Curve: Warm Yellow/Gold #F5C518
  // Model Curve: Refined Gray #737373
  const varLineColor = '#F5C518';
  const varModelLineColor = '#737373';

  // Copy point data to clipboard
  const handleCopyProbeData = () => {
    if (!selectedProbePoint) return;
    const text = `OceanX 3D Sounding\nBasin: ${selectedProbePoint.basin}\nCoordinates: ${selectedProbePoint.latitude.toFixed(4)}°N, ${selectedProbePoint.longitude.toFixed(4)}°E\nDepth Layer: ${state.depth}m\nTemperature: ${selectedProbePoint.currentValue.temp.toFixed(2)} °C\nSalinity: ${selectedProbePoint.currentValue.sal.toFixed(2)} PSU\nChlorophyll-a: ${selectedProbePoint.currentValue.chla.toFixed(3)} mg/m³`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const [isCollapsed, setIsCollapsed] = useState(false);

  if (isCollapsed) {
    return (
      <div
        id="right-analysis-panel-collapsed"
        className="relative z-30 flex flex-col items-center justify-between h-full w-12 shrink-0 bg-[#101010] border-l border-[#262626] py-3 shadow-xl select-none text-[#A3A3A3]"
      >
        <div className="flex flex-col items-center gap-4">
          <button
            onClick={() => setIsCollapsed(false)}
            className="p-2 rounded-md hover:bg-[#161616] text-[#A3A3A3] hover:text-[#F5C518] border border-transparent hover:border-[#262626] transition-colors cursor-pointer"
            title="Expand Observation & Analysis Panel"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div
            className="text-[10px] font-semibold text-[#F5F5F5] uppercase tracking-wider -rotate-90 origin-center my-8 whitespace-nowrap cursor-pointer hover:text-[#F5C518] transition-colors"
            onClick={() => setIsCollapsed(false)}
          >
            Analysis & Legend
          </div>
        </div>

        <button
          onClick={() => setIsCollapsed(false)}
          className="p-2 rounded-md hover:bg-[#161616] text-[#A3A3A3] hover:text-[#F5F5F5] border border-transparent hover:border-[#262626] transition-colors cursor-pointer"
          title="Open Legend & Depth Profile"
        >
          <Activity className="w-4 h-4 text-[#F5C518]" />
        </button>
      </div>
    );
  }

  return (
    <div
      id="right-analysis-panel"
      className="relative z-30 flex flex-col h-full w-76 sm:w-80 lg:w-84 xl:w-88 shrink-0 bg-[#101010] border-l border-[#262626] shadow-xl overflow-y-auto custom-scrollbar select-none text-[#F5F5F5]"
    >
      {/* 0. DOCKED ACTIVE VARIABLE & COLORBAR LEGEND WITH COLLAPSE TOGGLE */}
      <div className="p-3 pb-2 border-b border-[#262626] bg-[#101010] shrink-0">
        <div className="flex items-center justify-between pb-1.5">
          <span className="text-[10px] font-mono text-[#A3A3A3] uppercase tracking-wider">
            Observation & Analysis
          </span>
          <button
            onClick={() => setIsCollapsed(true)}
            className="p-1 rounded hover:bg-[#161616] text-[#A3A3A3] hover:text-[#F5F5F5] transition-colors cursor-pointer"
            title="Collapse Analysis Panel"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
        <ScientificLegend state={state} />
      </div>

      {/* DEBUG MODE INSPECTOR HUD */}
      {state.debugMode && (
        <div
          id="state-sync-debug-overlay"
          className="m-3 p-3 bg-[#161616] border border-[#F5C518] rounded-md text-xs space-y-1.5 shadow-xl"
        >
          <div className="flex items-center justify-between border-b border-[#262626] pb-1.5">
            <div className="flex items-center gap-1.5 text-[#F5C518] font-bold font-mono">
              <Bug className="w-3.5 h-3.5" />
              <span>CSV SINGLE SOURCE OF TRUTH</span>
            </div>
            <span className="px-1.5 py-0.5 rounded bg-[#101010] text-[#A3A3A3] font-mono text-[10px] border border-[#262626]">
              LOCAL
            </span>
          </div>

          <div className="font-mono text-[11px] text-[#A3A3A3] space-y-1">
            <div className="flex justify-between">
              <span>Platform:</span>
              <span className="text-[#F5F5F5] font-semibold">{activePlatformId || 'None'}</span>
            </div>
            <div className="flex justify-between">
              <span>CSV Records:</span>
              <span className="text-[#F5C518] font-semibold">{matchingCsvRows.length} rows</span>
            </div>
            <div className="flex justify-between">
              <span>Active Depth:</span>
              <span className="text-[#F5F5F5] font-semibold">{state.depth}m</span>
            </div>
          </div>
        </div>
      )}

      {/* 1. ARGO IN-SITU FLOAT VIEW (MATCHING REFERENCE IMAGE) */}
      {activePlatformId ? (
        matchingCsvRows.length > 0 && platformMeta ? (
          <div className="flex flex-col p-3.5 space-y-3.5">
            {/* Header: Selected Observation & Active Badge */}
            <div className="flex items-center justify-between pb-2 border-b border-[#262626]">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-semibold text-[#A3A3A3] uppercase tracking-wider">
                  Selected Observation
                </span>
                <span className="text-[10px] font-medium text-[#F5C518] bg-[#161616] border border-[#262626] px-1.5 py-0.2 rounded">
                  Active
                </span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  id="btn-download-float-csv"
                  onClick={() => downloadArgoCsv(platformMeta.wmoId)}
                  title="Download Float Sounding CSV"
                  className="p-1 rounded text-[#A3A3A3] hover:text-[#F5F5F5] hover:bg-[#161616] transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                </button>
                <button
                  id="btn-close-analysis-panel"
                  onClick={onClose}
                  className="p-1 rounded text-[#A3A3A3] hover:text-[#F5F5F5] hover:bg-[#161616] transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Float Title */}
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-[#F5C518] shrink-0" />
              <h2 className="text-sm font-semibold text-[#F5F5F5]">
                Argo Float {platformMeta.wmoId}
              </h2>
            </div>

            {/* Metadata Rows (Clean key-value pairs matching reference) */}
            <div className="space-y-1.5 text-xs text-[#A3A3A3]">
              <div className="flex justify-between py-0.5 border-b border-[#1f1f1f]">
                <span>Location</span>
                <span className="font-mono text-[#F5F5F5]">
                  {platformMeta.latitude.toFixed(2)}° N, {platformMeta.longitude.toFixed(2)}° E
                </span>
              </div>
              <div className="flex justify-between py-0.5 border-b border-[#1f1f1f]">
                <span>Date / Time</span>
                <span className="font-mono text-[#F5F5F5]">
                  {platformMeta.date}, 08:30 UTC
                </span>
              </div>
              <div className="flex justify-between py-0.5 border-b border-[#1f1f1f]">
                <span>Max Depth</span>
                <span className="font-mono text-[#F5F5F5]">2000 m</span>
              </div>
              <div className="flex justify-between py-0.5 border-b border-[#1f1f1f]">
                <span>Platform Type</span>
                <span className="text-[#F5F5F5]">{platformMeta.sensorType || 'Argo Profiling Float'}</span>
              </div>
              <div className="flex justify-between py-0.5">
                <span>Data Source</span>
                <span className="text-[#F5F5F5] truncate max-w-[150px]">{platformMeta.institution}</span>
              </div>
            </div>

            {/* Depth Selector Pills */}
            <div className="space-y-1 pt-1">
              <div className="flex items-center justify-between text-xs text-[#A3A3A3]">
                <span className="flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-[#F5C518]" />
                  <span>Observation Depth</span>
                </span>
                <span className="font-mono text-[#F5C518] font-medium">{state.depth} m</span>
              </div>
              <div className="flex items-center gap-1 overflow-x-auto pb-1 custom-scrollbar">
                {STANDARD_DEPTHS.map((d) => {
                  const isAct = state.depth === d;
                  return (
                    <button
                      key={`depth-btn-${d}`}
                      id={`depth-select-${d}`}
                      onClick={() => onChangeDepth(d)}
                      className={`px-2 py-0.5 text-xs font-mono rounded border transition-colors cursor-pointer whitespace-nowrap ${
                        isAct
                          ? 'bg-[#161616] text-[#F5C518] border-[#F5C518] font-medium'
                          : 'bg-[#161616] text-[#A3A3A3] border-[#262626] hover:border-[#404040] hover:text-[#F5F5F5]'
                      }`}
                    >
                      {d}m
                    </button>
                  );
                })}
              </div>
            </div>

            {/* VERTICAL PROFILE GRAPH (SCIENTIFIC SOUNDING CURVE) */}
            <div className="p-3 bg-[#161616] rounded-md border border-[#262626] space-y-2.5">
              {/* Header & Controls: Variable Tabs & Comparison Mode */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-[#A3A3A3] uppercase tracking-wider">
                    {profileVar === 'TEMP'
                      ? 'Temperature Profile (°C)'
                      : profileVar === 'SAL'
                      ? 'Salinity Profile (PSU)'
                      : 'Chlorophyll Profile (mg/m³)'}
                  </span>

                  {/* Variable Tabs */}
                  <div className="flex items-center gap-1 text-[10px]">
                    <button
                      id="btn-profile-temp"
                      onClick={() => {
                        setProfileVar('TEMP');
                        onChangeVariable('TEMP');
                      }}
                      className={`px-1.5 py-0.5 rounded border transition-colors cursor-pointer ${
                        profileVar === 'TEMP'
                          ? 'bg-[#101010] text-[#F5C518] border-[#F5C518]'
                          : 'bg-[#101010] text-[#A3A3A3] border-[#262626] hover:text-[#F5F5F5]'
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
                      className={`px-1.5 py-0.5 rounded border transition-colors cursor-pointer ${
                        profileVar === 'SAL'
                          ? 'bg-[#101010] text-[#F5C518] border-[#F5C518]'
                          : 'bg-[#101010] text-[#A3A3A3] border-[#262626] hover:text-[#F5F5F5]'
                      }`}
                    >
                      Sal
                    </button>
                    <button
                      id="btn-profile-chla"
                      onClick={() => {
                        setProfileVar('CHLA');
                        onChangeVariable('CHLA');
                      }}
                      className={`px-1.5 py-0.5 rounded border transition-colors cursor-pointer ${
                        profileVar === 'CHLA'
                          ? 'bg-[#101010] text-[#F5C518] border-[#F5C518]'
                          : 'bg-[#101010] text-[#A3A3A3] border-[#262626] hover:text-[#F5F5F5]'
                      }`}
                    >
                      Chl
                    </button>
                  </div>
                </div>

                {/* Comparison Mode Selector */}
                <div className="flex items-center justify-between text-[10px] bg-[#101010] p-1 rounded border border-[#262626]">
                  <span className="text-[#666666] pl-1">Series:</span>
                  <div className="flex items-center gap-1">
                    <button
                      id="btn-compare-both"
                      onClick={() => setCompareMode('both')}
                      className={`px-1.5 py-0.5 rounded font-mono transition-colors cursor-pointer ${
                        compareMode === 'both'
                          ? 'bg-[#161616] text-[#F5C518] border border-[#F5C518]'
                          : 'text-[#A3A3A3] hover:text-[#F5F5F5]'
                      }`}
                    >
                      Obs + Model
                    </button>
                    <button
                      id="btn-compare-obs"
                      onClick={() => setCompareMode('observed')}
                      className={`px-1.5 py-0.5 rounded font-mono transition-colors cursor-pointer ${
                        compareMode === 'observed'
                          ? 'bg-[#161616] text-[#F5C518] border border-[#F5C518]'
                          : 'text-[#A3A3A3] hover:text-[#F5F5F5]'
                      }`}
                    >
                      Argo
                    </button>
                    <button
                      id="btn-compare-model"
                      onClick={() => setCompareMode('model')}
                      className={`px-1.5 py-0.5 rounded font-mono transition-colors cursor-pointer ${
                        compareMode === 'model'
                          ? 'bg-[#161616] text-[#F5C518] border border-[#F5C518]'
                          : 'text-[#A3A3A3] hover:text-[#F5F5F5]'
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
                        y={padding.top - 8}
                        className="text-[9px] font-mono fill-[#A3A3A3]"
                      >
                        Depth (m)
                      </text>

                      {/* Variable Unit Title */}
                      <text
                        x={chartWidth - padding.right}
                        y={padding.top - 8}
                        textAnchor="end"
                        className="text-[9px] font-mono fill-[#A3A3A3]"
                      >
                        {unit}
                      </text>

                      {/* Value Ticks */}
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
                                stroke="#262626"
                                strokeDasharray="2,2"
                                strokeWidth="0.8"
                              />
                              <text
                                x={x}
                                y={chartHeight - padding.bottom + 12}
                                textAnchor="middle"
                                className="text-[8px] font-mono fill-[#666666]"
                              >
                                {t.toFixed(profileVar === 'SAL' ? 1 : 0)}
                              </text>
                            </g>
                          );
                        });
                      })()}

                      {/* Depth Grid Lines (0m down to 2000m) */}
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
                              stroke={isActiveDepth ? '#F5C518' : '#262626'}
                              strokeDasharray={isActiveDepth ? '4,2' : '2,2'}
                              strokeWidth={isActiveDepth ? 1.4 : 0.8}
                              opacity={isActiveDepth ? 0.9 : 0.4}
                            />
                            <text
                              x={padding.left - 6}
                              y={y + 3}
                              textAnchor="end"
                              className={`text-[8.5px] font-mono cursor-pointer transition-colors ${
                                isActiveDepth
                                  ? 'fill-[#F5C518] font-bold'
                                  : isHovered
                                  ? 'fill-[#F5F5F5]'
                                  : 'fill-[#666666] hover:fill-[#A3A3A3]'
                              }`}
                              onClick={() => onChangeDepth(d)}
                              onMouseEnter={() => setHoveredDepth(d)}
                            >
                              {d}
                            </text>
                          </g>
                        );
                      })}

                      {/* INCOIS Model Curve (Gray Dashed Line) */}
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
                              strokeWidth="1.6"
                              strokeDasharray="4,3"
                              opacity={0.8}
                            />
                          );
                        })()}

                      {/* Observed Curve (Warm Yellow Line) */}
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
                              strokeWidth="2.2"
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
                            className="cursor-pointer"
                            onClick={() => onChangeDepth(r.depth)}
                            onMouseEnter={() => setHoveredDepth(r.depth)}
                          >
                            <rect
                              x={padding.left}
                              y={y - 5}
                              width={chartWidth - padding.left - padding.right}
                              height={10}
                              fill="transparent"
                            />

                            {/* Model Point */}
                            {(compareMode === 'both' || compareMode === 'model') &&
                              typeof mod === 'number' &&
                              isFinite(mod) && (
                                <circle
                                  cx={chartScales.valToX(mod)}
                                  cy={y}
                                  r={isActive || isHovered ? 4 : 2.5}
                                  fill="#737373"
                                  stroke="#101010"
                                  strokeWidth="1"
                                />
                              )}

                            {/* Observed Point */}
                            {(compareMode === 'both' || compareMode === 'observed') &&
                              typeof obs === 'number' &&
                              isFinite(obs) && (
                                <circle
                                  cx={chartScales.valToX(obs)}
                                  cy={y}
                                  r={isActive ? 4.5 : isHovered ? 4 : 3}
                                  fill="#F5C518"
                                  stroke="#101010"
                                  strokeWidth="1.2"
                                />
                              )}

                            {/* Active Ring */}
                            {isActive && (
                              <circle
                                cx={
                                  typeof obs === 'number' && isFinite(obs)
                                    ? chartScales.valToX(obs)
                                    : chartScales.valToX(mod || 0)
                                }
                                cy={y}
                                r={7}
                                fill="none"
                                stroke="#F5C518"
                                strokeWidth="1.4"
                              />
                            )}
                          </g>
                        );
                      })}
                    </svg>
                  </div>

                  {/* Chart Legend */}
                  <div className="flex items-center justify-center gap-4 mt-2 text-[10px] text-[#A3A3A3]">
                    {(compareMode === 'both' || compareMode === 'observed') && (
                      <div className="flex items-center gap-1.5">
                        <div className="w-3 h-1 rounded-full bg-[#F5C518]" />
                        <span className="text-[#F5F5F5]">Argo Observation</span>
                      </div>
                    )}
                    {(compareMode === 'both' || compareMode === 'model') && (
                      <div className="flex items-center gap-1.5">
                        <div className="w-3 h-0.5 border-t border-dashed border-[#737373]" />
                        <span className="text-[#A3A3A3]">Model (Collocated)</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* MODEL vs OBSERVATION STATS CARD (MATCHING REFERENCE IMAGE) */}
            <div className="p-3 rounded-md bg-[#161616] border border-[#262626] space-y-2">
              <div className="text-[11px] font-semibold text-[#A3A3A3] uppercase tracking-wider">
                Model vs Observation at {inspectedRow ? inspectedRow.depth : state.depth} m
              </div>

              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-[#101010] p-2 rounded border border-[#262626]">
                  <span className="text-[10px] text-[#A3A3A3] block">Model ({unit})</span>
                  <span className="font-mono font-bold text-[#F5F5F5] text-sm">
                    {profileVar === 'TEMP'
                      ? formatVal(inspectedRow?.modelTemperature, '')
                      : profileVar === 'SAL'
                      ? formatVal(inspectedRow?.modelSalinity, '')
                      : formatVal(inspectedRow?.modelChlorophyll, '')}
                  </span>
                </div>
                <div className="bg-[#101010] p-2 rounded border border-[#262626]">
                  <span className="text-[10px] text-[#A3A3A3] block">Observation ({unit})</span>
                  <span className="font-mono font-bold text-[#F5F5F5] text-sm">
                    {profileVar === 'TEMP'
                      ? formatVal(inspectedRow?.temperature, '')
                      : profileVar === 'SAL'
                      ? formatVal(inspectedRow?.salinity, '')
                      : formatVal(inspectedRow?.chlorophyll, '')}
                  </span>
                </div>
                <div className="bg-[#101010] p-2 rounded border border-[#262626]">
                  <span className="text-[10px] text-[#A3A3A3] block">Difference ({unit})</span>
                  <span className="font-mono font-bold text-[#F5C518] text-sm">
                    {profileVar === 'TEMP'
                      ? formatDelta(inspectedRow?.tempAnomaly, '')
                      : profileVar === 'SAL'
                      ? formatDelta(inspectedRow?.salAnomaly, '')
                      : formatDelta(inspectedRow?.chlaAnomaly, '')}
                  </span>
                </div>
              </div>
            </div>

            {/* Action Button: View Profile Details */}
            <button
              onClick={() => downloadArgoCsv(platformMeta.wmoId)}
              className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-md text-xs font-medium bg-[#161616] hover:bg-[#1e1e1e] text-[#F5F5F5] border border-[#262626] hover:border-[#F5C518] transition-colors cursor-pointer"
            >
              <span>Download Sounding CSV</span>
              <ExternalLink className="w-3.5 h-3.5 text-[#F5C518]" />
            </button>
          </div>
        ) : (
          /* NO MATCHING DATA */
          <div className="flex flex-col p-4 space-y-4">
            <div className="flex items-start justify-between pb-3 border-b border-[#262626]">
              <h2 className="text-sm font-semibold text-[#F5F5F5]">
                Argo Platform #{activePlatformId}
              </h2>
              <button
                onClick={onClose}
                className="p-1 rounded text-[#A3A3A3] hover:text-[#F5F5F5] transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-3 rounded-md bg-[#161616] border border-[#262626] text-xs text-[#A3A3A3] space-y-1">
              <div className="flex items-center gap-2 text-[#F5C518]">
                <AlertCircle className="w-4 h-4" />
                <span>No profile data available for this platform.</span>
              </div>
              <p className="text-[11px] text-[#666666]">
                The platform identifier does not contain matching vertical records in the loaded dataset.
              </p>
            </div>
          </div>
        )
      ) : selectedProbePoint ? (
        /* 2. ARBITRARY OCEAN GRID NODE PROBE VIEW */
        <div className="flex flex-col p-3.5 space-y-3.5">
          <div className="flex items-start justify-between pb-2 border-b border-[#262626]">
            <div>
              <span className="text-[11px] font-semibold text-[#A3A3A3] uppercase tracking-wider">
                Ocean Point Probe
              </span>
              <h2 className="text-sm font-semibold text-[#F5F5F5] mt-0.5">
                {selectedProbePoint.isLand ? 'Continental Landmass' : selectedProbePoint.basin}
              </h2>
            </div>
            <button
              id="btn-close-probe-panel"
              onClick={onCloseProbe}
              className="p-1 rounded text-[#A3A3A3] hover:text-[#F5F5F5] hover:bg-[#161616] transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-[#161616] p-2.5 rounded border border-[#262626]">
              <span className="text-[10px] text-[#666666] block">Coordinates</span>
              <span className="font-mono text-[#F5F5F5] text-[11px]">
                {selectedProbePoint.latitude.toFixed(2)}°N, {selectedProbePoint.longitude.toFixed(2)}°E
              </span>
            </div>
            <div className="bg-[#161616] p-2.5 rounded border border-[#262626]">
              <span className="text-[10px] text-[#666666] block">Depth Layer</span>
              <span className="font-mono text-[#F5C518] text-[11px]">
                {state.depth} m
              </span>
            </div>
          </div>

          {/* Model Value Display */}
          <div className="p-3 rounded-md bg-[#161616] border border-[#262626] space-y-2">
            <span className="text-xs font-medium text-[#A3A3A3] block">
              Collocated Model Parameter
            </span>
            <div className="flex items-center justify-between p-2 rounded bg-[#101010] border border-[#262626]">
              <span className="text-xs text-[#A3A3A3]">
                {profileVar === 'TEMP' ? 'Temperature' : profileVar === 'SAL' ? 'Salinity' : 'Chlorophyll-a'}
              </span>
              <span className="font-mono font-bold text-[#F5C518] text-sm">
                {profileVar === 'TEMP'
                  ? formatVal(selectedProbePoint.currentValue.temp, ' °C')
                  : profileVar === 'SAL'
                  ? formatVal(selectedProbePoint.currentValue.sal, ' PSU')
                  : formatVal(selectedProbePoint.currentValue.chla, ' mg/m³')}
              </span>
            </div>
          </div>

          {/* Action Button */}
          <button
            onClick={handleCopyProbeData}
            className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-md text-xs font-medium bg-[#161616] hover:bg-[#1e1e1e] text-[#F5F5F5] border border-[#262626] hover:border-[#F5C518] transition-colors cursor-pointer"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-[#F5C518]" /> : <Copy className="w-3.5 h-3.5 text-[#A3A3A3]" />}
            <span>{copied ? 'Copied to Clipboard' : 'Copy Sounding Coordinates'}</span>
          </button>
        </div>
      ) : (
        /* 3. DEFAULT BASIN-WIDE OVERVIEW */
        <div className="flex flex-col p-3.5 space-y-3.5">
          <div>
            <span className="text-[11px] font-semibold text-[#A3A3A3] uppercase tracking-wider block">
              Observational Array
            </span>
            <h2 className="text-sm font-semibold text-[#F5F5F5] mt-0.5">
              Indian Ocean In-Situ Network
            </h2>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-[#161616] p-2.5 rounded-md border border-[#262626]">
              <span className="text-[10px] text-[#666666] block">Active Floats</span>
              <span className="text-lg font-mono font-semibold text-[#F5F5F5]">
                {allFloats.length}
              </span>
              <span className="text-[10px] text-[#A3A3A3] block mt-0.5">INCOIS Array</span>
            </div>
            <div className="bg-[#161616] p-2.5 rounded-md border border-[#262626]">
              <span className="text-[10px] text-[#666666] block">High Anomaly Floats</span>
              <span className="text-lg font-mono font-semibold text-[#F5C518]">
                {basinStats.highDiscrepancyCount}
              </span>
              <span className="text-[10px] text-[#A3A3A3] block mt-0.5">|Δ| &gt; {state.variable === 'CHLA' ? '0.5' : '1.0'}</span>
            </div>
          </div>

          <div className="p-3 bg-[#161616] rounded-md border border-[#262626] text-xs text-[#A3A3A3] space-y-1">
            <div className="flex items-center gap-1.5 text-[#F5F5F5] font-medium">
              <MapPin className="w-3.5 h-3.5 text-[#F5C518]" />
              <span>Interactive Float Soundings</span>
            </div>
            <p className="text-[11px] text-[#666666] leading-relaxed">
              Click any Argo float marker on the 3D globe or select a platform below to inspect vertical soundings and compare live in-situ observations against numerical models.
            </p>
          </div>

          {/* List of all Argo Floats for quick selection */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[#A3A3A3] font-medium">All Argo Floats ({allFloats.length})</span>
              <span className="text-[10px] text-[#666666] font-mono">Select to inspect</span>
            </div>
            <div className="grid grid-cols-1 gap-1 max-h-48 overflow-y-auto custom-scrollbar pr-0.5">
              {allFloats.map((fl) => {
                const profile = fl.profiles.find((p) => p.depth === state.depth) || fl.profiles[0];
                const delta =
                  state.variable === 'TEMP'
                    ? profile.tempDelta
                    : state.variable === 'SAL'
                    ? profile.salDelta
                    : profile.chlaDelta || 0;

                return (
                  <button
                    key={fl.id}
                    id={`btn-overview-select-float-${fl.platformNumber}`}
                    onClick={() => onSelectFloat(fl.id)}
                    className="w-full text-left p-2 rounded bg-[#161616] hover:bg-[#1f1f1f] border border-[#262626] hover:border-[#404040] transition-colors flex items-center justify-between group cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#666666] group-hover:bg-[#F5C518]" />
                      <div>
                        <span className="font-mono font-medium text-[#F5F5F5] text-xs">
                          Argo {fl.platformNumber}
                        </span>
                        <span className="text-[10px] text-[#666666] ml-1.5">
                          {fl.basin}
                        </span>
                      </div>
                    </div>
                    <span
                      className={`text-[10px] font-mono ${
                        Math.abs(delta) > 1.0 ? 'text-[#F5C518]' : 'text-[#666666]'
                      }`}
                    >
                      Δ {delta > 0 ? `+${delta.toFixed(1)}` : delta.toFixed(1)}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <button
            onClick={() => downloadArgoCsv()}
            className="flex items-center justify-center gap-2 py-2 px-3 rounded-md text-xs font-medium bg-[#161616] hover:bg-[#1e1e1e] text-[#F5F5F5] border border-[#262626] hover:border-[#F5C518] transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-[#F5C518]" />
            <span>Download Full Argo Dataset (CSV)</span>
          </button>
        </div>
      )}
    </div>
  );
};
