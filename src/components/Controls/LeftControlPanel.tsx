import React, { useState } from 'react';
import { ColormapType, DepthLevel, DiscrepancyThreshold, OceanVariable, VisualizationState, BasemapType, EdgeBlendMode } from '../../types/ocean';
import { getColorCssGradient, getDefaultRange } from '../../utils/scientificColormaps';
import {
  Thermometer,
  Droplet,
  Layers,
  ChevronLeft,
  ChevronRight,
  Sliders,
  Database,
  Radio,
  Filter,
  Sparkles,
  ExternalLink,
  Leaf,
  Blend,
  Eye,
} from 'lucide-react';

interface LeftControlPanelProps {
  state: VisualizationState;
  onChangeState: (updates: Partial<VisualizationState>) => void;
  activeFloatsCount: number;
  totalFloatsCount: number;
}

const DEPTH_LEVELS: DepthLevel[] = [5, 50, 100, 200, 500, 1000];
const COLORMAPS: { type: ColormapType; label: string }[] = [
  { type: 'incois_rainbow', label: 'INCOIS' },
  { type: 'thermal', label: 'Thermal' },
  { type: 'halite', label: 'Halite' },
];

export const LeftControlPanel: React.FC<LeftControlPanelProps> = ({
  state,
  onChangeState,
  activeFloatsCount,
  totalFloatsCount,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const defaultRange = getDefaultRange(state.variable, state.depth);

  return (
    <div
      id="left-control-panel"
      className={`relative z-30 flex flex-col h-full bg-slate-900/90 backdrop-blur-xl border-r border-slate-700/60 shadow-2xl transition-all duration-300 ${
        isCollapsed ? 'w-14' : 'w-80 md:w-88'
      }`}
    >
      {/* Panel Collapse Toggle Tab */}
      <button
        id="btn-toggle-left-panel"
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-3.5 top-6 z-40 bg-slate-800 border border-slate-600 text-slate-300 hover:text-cyan-400 p-1 rounded-full shadow-lg transition-colors cursor-pointer"
        title={isCollapsed ? 'Expand Control Panel' : 'Collapse Panel'}
      >
        {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
      </button>

      {isCollapsed ? (
        <div className="flex flex-col items-center py-6 gap-6 text-slate-400">
          <div className="p-2 rounded-xl bg-cyan-950/80 text-cyan-400 border border-cyan-800/60">
            <Layers className="w-5 h-5" />
          </div>
          <button
            onClick={() => {
              const nextVar: OceanVariable =
                state.variable === 'TEMP' ? 'SAL' : state.variable === 'SAL' ? 'CHLA' : 'TEMP';
              const nextCm: ColormapType =
                nextVar === 'TEMP' ? 'thermal' : nextVar === 'SAL' ? 'halite' : 'incois_rainbow';
              onChangeState({ variable: nextVar, colormap: nextCm });
            }}
            className={`p-2 rounded-lg transition-colors cursor-pointer ${
              state.variable === 'TEMP'
                ? 'text-amber-400 bg-amber-950/40'
                : state.variable === 'SAL'
                ? 'text-cyan-400 bg-cyan-950/40'
                : 'text-emerald-400 bg-emerald-950/40'
            }`}
            title={`Variable: ${state.variable}`}
          >
            {state.variable === 'TEMP' ? (
              <Thermometer className="w-5 h-5" />
            ) : state.variable === 'SAL' ? (
              <Droplet className="w-5 h-5" />
            ) : (
              <Leaf className="w-5 h-5" />
            )}
          </button>
          <div className="text-[10px] font-mono font-bold text-slate-300 rotate-90 my-4">
            {state.depth}m
          </div>
          <button
            onClick={() => onChangeState({ showArgo: !state.showArgo })}
            className={`p-2 rounded-lg transition-colors cursor-pointer ${
              state.showArgo ? 'text-emerald-400 bg-emerald-950/40' : 'text-slate-600'
            }`}
            title="Toggle Argo Floats"
          >
            <Radio className="w-5 h-5" />
          </button>
        </div>
      ) : (
        <div className="flex flex-col h-full overflow-y-auto custom-scrollbar p-4 space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-cyan-950/80 text-cyan-400 border border-cyan-800/60">
                <Layers className="w-4 h-4" />
              </div>
              <h2 className="text-sm font-semibold text-slate-100 tracking-wide uppercase">
                Ocean Field Controls
              </h2>
            </div>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
              INCOIS ERDDAP
            </span>
          </div>

          {/* 1. VARIABLE SELECTOR (TEMP, SAL, CHLA) */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center justify-between">
              <span>Ocean Variable</span>
              <span className="text-[11px] font-mono text-cyan-400 lowercase">
                {state.variable === 'TEMP'
                  ? 'temperature (°C)'
                  : state.variable === 'SAL'
                  ? 'salinity (PSU)'
                  : 'chlorophyll-a (mg/m³)'}
              </span>
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              <button
                id="btn-select-var-temp"
                onClick={() => onChangeState({ variable: 'TEMP' })}
                className={`flex flex-col items-center justify-center py-2 px-1.5 rounded-xl font-medium text-xs transition-all border cursor-pointer ${
                  state.variable === 'TEMP'
                    ? 'bg-amber-500/20 border-amber-500/80 text-amber-300 shadow-lg shadow-amber-950/50'
                    : 'bg-slate-800/60 border-slate-700/60 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                }`}
              >
                <Thermometer className="w-4 h-4 text-amber-400 mb-1" />
                <span className="text-[11px]">Temperature</span>
              </button>

              <button
                id="btn-select-var-sal"
                onClick={() => onChangeState({ variable: 'SAL' })}
                className={`flex flex-col items-center justify-center py-2 px-1.5 rounded-xl font-medium text-xs transition-all border cursor-pointer ${
                  state.variable === 'SAL'
                    ? 'bg-cyan-500/20 border-cyan-500/80 text-cyan-300 shadow-lg shadow-cyan-950/50'
                    : 'bg-slate-800/60 border-slate-700/60 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                }`}
              >
                <Droplet className="w-4 h-4 text-cyan-400 mb-1" />
                <span className="text-[11px]">Salinity</span>
              </button>

              <button
                id="btn-select-var-chla"
                onClick={() => onChangeState({ variable: 'CHLA' })}
                className={`flex flex-col items-center justify-center py-2 px-1.5 rounded-xl font-medium text-xs transition-all border cursor-pointer ${
                  state.variable === 'CHLA'
                    ? 'bg-emerald-500/20 border-emerald-500/80 text-emerald-300 shadow-lg shadow-emerald-950/50'
                    : 'bg-slate-800/60 border-slate-700/60 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                }`}
              >
                <Leaf className="w-4 h-4 text-emerald-400 mb-1" />
                <span className="text-[11px]">Chlorophyll</span>
              </button>
            </div>
            {state.variable === 'CHLA' ? (
              <div className="bg-emerald-950/40 border border-emerald-800/60 rounded-xl p-2.5 text-[11px] text-emerald-200/90 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-emerald-300">INCOIS Oceansat-2 (OCM-2)</span>
                  <a
                    href="https://erddap.incois.gov.in/erddap/griddap/incois_oceansat2_datasets.html"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-[10px] font-mono bg-emerald-900/80 hover:bg-emerald-800 text-emerald-200 px-2 py-0.5 rounded border border-emerald-700/60 transition-colors"
                    title="Open official INCOIS ERDDAP incois_oceansat2_datasets web interface"
                  >
                    <span>ERDDAP Portal</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                </div>
                <div className="text-[10px] text-slate-300 flex items-center justify-between">
                  <span>Dataset ID: <code className="text-emerald-400 font-mono">incois_oceansat2_datasets</code></span>
                  <span className="text-[9px] text-emerald-300 bg-emerald-900/60 px-1.5 py-0.5 rounded font-mono">2011–2020 (3,377 Days)</span>
                </div>
                <div className="text-[10px] text-slate-300">
                  Variable: <code className="text-emerald-400 font-mono">CHL</code> (mg/m³) • Optical Surface Layer
                </div>
                <div className="text-[9.5px] text-slate-400 font-mono truncate">
                  Endpoint: erddap.incois.gov.in/erddap/griddap/incois_oceansat2_datasets
                </div>
              </div>
            ) : (
              <div className="bg-slate-900/80 border border-cyan-800/60 rounded-xl p-2.5 text-[11px] text-cyan-200/90 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-cyan-300">INCOIS ARGO Monthly VAM</span>
                  <a
                    href="https://erddap.incois.gov.in/erddap/griddap/incois_argo_mnt_VAM.html"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-[10px] font-mono bg-cyan-950/80 hover:bg-cyan-900 text-cyan-200 px-2 py-0.5 rounded border border-cyan-700/60 transition-colors"
                    title="Open official INCOIS ERDDAP incois_argo_mnt_VAM web interface"
                  >
                    <span>ERDDAP Portal</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                </div>
                <div className="text-[10px] text-slate-300 flex items-center justify-between">
                  <span>Dataset ID: <code className="text-cyan-400 font-mono">incois_argo_mnt_VAM</code></span>
                  <span className="text-[9px] text-cyan-300 bg-cyan-950/80 px-1.5 py-0.5 rounded font-mono border border-cyan-800/50">2004–2026 (271 Months)</span>
                </div>
                <div className="text-[10px] text-slate-300 flex items-center justify-between">
                  <span>Variable: <code className="text-amber-400 font-mono">{state.variable}</code> ({state.variable === 'TEMP' ? '°C' : 'PSU'})</span>
                  <span className="text-slate-400 text-[10px]">24 Depths (5m–2000m)</span>
                </div>
                <div className="text-[9.5px] text-slate-400 font-mono truncate">
                  Endpoint: erddap.incois.gov.in/erddap/griddap/incois_argo_mnt_VAM
                </div>
              </div>
            )}
          </div>

          {/* 2. DEPTH CONTROLLER */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Water Column Depth
              </label>
              {state.variable === 'CHLA' ? (
                <span className="text-[11px] font-mono font-bold text-emerald-300 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/60">
                  Surface (0–5m)
                </span>
              ) : (
                <span className="text-xs font-mono font-bold text-amber-300 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800/60">
                  {state.depth} m
                </span>
              )}
            </div>

            {state.variable === 'CHLA' ? (
              /* Informational notice for Chlorophyll surface-only constraint */
              <div className="p-3 bg-slate-950/60 border border-emerald-800/40 rounded-xl space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs text-emerald-300 font-semibold">
                  <Leaf className="w-3.5 h-3.5" />
                  <span>Surface Product (0–5m Optical Layer)</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Chlorophyll-a is derived from the Oceansat-2 Ocean Colour Radiometer (OCM-2) measuring spectral optical radiance in the first optical penetration depth (0–5m). Subsurface water column controls are disabled for this surface product.
                </p>
              </div>
            ) : (
              <>
                {/* Quick depth step buttons for 3D temperature/salinity water column */}
                <div className="grid grid-cols-3 gap-1.5">
                  {DEPTH_LEVELS.map((d) => (
                    <button
                      key={d}
                      id={`btn-depth-${d}`}
                      onClick={() => onChangeState({ depth: d })}
                      className={`py-1 px-1.5 rounded-lg text-xs font-mono font-medium transition-all text-center border cursor-pointer ${
                        state.depth === d
                          ? 'bg-cyan-500/25 border-cyan-400 text-cyan-200 font-semibold shadow-md'
                          : 'bg-slate-800/70 border-slate-700/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                      }`}
                    >
                      {d}m
                    </button>
                  ))}
                </div>

                {/* Continuous Slider */}
                <div className="pt-1">
                  <input
                    id="slider-depth-control"
                    type="range"
                    min={0}
                    max={DEPTH_LEVELS.length - 1}
                    step={1}
                    value={DEPTH_LEVELS.indexOf(state.depth)}
                    onChange={(e) => {
                      const idx = parseInt(e.target.value, 10);
                      onChangeState({ depth: DEPTH_LEVELS[idx] });
                    }}
                    className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-1">
                    <span>5m (Surface)</span>
                    <span>Thermocline (100m)</span>
                    <span>1000m (Intermediate)</span>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* 3. BASEMAP LAYER */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
              Basemap Layer
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              {(['satellite', 'bathymetry'] as BasemapType[]).map((b) => (
                <button
                  key={b}
                  id={`btn-basemap-${b}`}
                  onClick={() => onChangeState({ basemap: b })}
                  className={`py-1.5 px-2 rounded-lg text-[11px] font-medium capitalize transition-all border cursor-pointer ${
                    state.basemap === b
                      ? 'bg-slate-700 border-cyan-400 text-cyan-300'
                      : 'bg-slate-800/50 border-slate-700/60 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {b.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>

          {/* 4. COLOR PALETTE & OPACITY */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Colormap Palette
              </label>
              <button
                onClick={() => setAdvancedOpen(!advancedOpen)}
                className="text-[11px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer"
              >
                <Sliders className="w-3 h-3" />
                <span>{advancedOpen ? 'Simple' : 'Scale Range'}</span>
              </button>
            </div>

            <div className="grid grid-cols-3 gap-1.5">
              {COLORMAPS.map((cm) => (
                <button
                  key={cm.type}
                  id={`btn-colormap-${cm.type}`}
                  onClick={() => onChangeState({ colormap: cm.type })}
                  className={`group relative p-1 rounded-lg border flex flex-col items-center gap-1 transition-all cursor-pointer ${
                    state.colormap === cm.type
                      ? 'border-cyan-400 bg-slate-800 shadow-md'
                      : 'border-slate-700/60 bg-slate-900/50 hover:border-slate-600'
                  }`}
                  title={cm.label}
                >
                  <div
                    className="w-full h-2.5 rounded"
                    style={{ background: getColorCssGradient(cm.type) }}
                  />
                  <span className="text-[9px] text-slate-400 group-hover:text-slate-200 truncate w-full text-center">
                    {cm.label}
                  </span>
                </button>
              ))}
            </div>

            {/* Opacity Slider */}
            <div className="space-y-1 pt-1">
              <div className="flex justify-between text-xs text-slate-400">
                <span>Layer Opacity</span>
                <span className="font-mono text-cyan-300">{Math.round(state.opacity * 100)}%</span>
              </div>
              <input
                id="slider-opacity"
                type="range"
                min={0.2}
                max={1.0}
                step={0.05}
                value={state.opacity}
                onChange={(e) => onChangeState({ opacity: parseFloat(e.target.value) })}
                className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-400"
              />
            </div>

            {/* Edge Refinement & Ground Blending Controls */}
            <div className="pt-2 border-t border-slate-800/80 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-slate-300 flex items-center gap-1.5">
                  <Blend className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Edge & Ground Blending</span>
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-950/60 text-cyan-300 border border-cyan-800/50">
                  {state.edgeBlendMode === 'soft_feather'
                    ? 'Soft Ground (90% Feather)'
                    : 'Crisp Grid'}
                </span>
              </div>

              {/* Blending Mode Pills (Soft Blend with fixed 90% shoreline feather vs Crisp) */}
              <div className="grid grid-cols-2 gap-1.5">
                {(
                  [
                    { id: 'soft_feather', label: 'Soft Blend', title: 'Smooth 90% coastal ground feathering with zero land bleed' },
                    { id: 'crisp', label: 'Crisp Grid', title: 'Sharp mathematical bounding box & coastline cut' },
                  ] as { id: EdgeBlendMode; label: string; title: string }[]
                ).map((mode) => (
                  <button
                    key={mode.id}
                    id={`btn-blend-mode-${mode.id}`}
                    onClick={() => onChangeState({ edgeBlendMode: mode.id })}
                    title={mode.title}
                    className={`py-1.5 px-2 rounded-lg text-[10px] font-medium transition-all border cursor-pointer text-center ${
                      state.edgeBlendMode === mode.id
                        ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200 font-semibold'
                        : 'bg-slate-900/60 border-slate-700/60 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {mode.label}
                  </button>
                ))}
              </div>

              {/* 4X Super-Sampling & Land Isolation Status */}
              <div className="flex items-center justify-between text-[9px] text-slate-400 bg-slate-900/50 px-2 py-1.5 rounded-lg border border-slate-800">
                <span className="flex items-center gap-1 text-slate-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                  <span>4X Spline (90% Feather)</span>
                </span>
                <span className="text-emerald-400/90 font-mono">Zero Land Bleed</span>
              </div>
            </div>

            {/* Advanced Scale Controls */}
            {advancedOpen && (
              <div className="p-2.5 bg-slate-950/60 rounded-xl border border-slate-800 space-y-2 mt-2">
                <div className="flex items-center justify-between text-xs text-slate-300">
                  <span>Color Dynamic Range</span>
                  <button
                    onClick={() =>
                      onChangeState({
                        minScaleAuto: true,
                        maxScaleAuto: true,
                        customMin: defaultRange.min,
                        customMax: defaultRange.max,
                      })
                    }
                    className="text-[10px] font-mono text-cyan-400 hover:underline cursor-pointer"
                  >
                    Reset Auto
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-0.5">Min ({defaultRange.unit})</label>
                    <input
                      type="number"
                      step={defaultRange.isLog ? 0.01 : 0.5}
                      value={state.minScaleAuto ? defaultRange.min : state.customMin}
                      onChange={(e) =>
                        onChangeState({
                          minScaleAuto: false,
                          customMin: parseFloat(e.target.value),
                        })
                      }
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200 font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-0.5">Max ({defaultRange.unit})</label>
                    <input
                      type="number"
                      step={defaultRange.isLog ? 1.0 : 0.5}
                      value={state.maxScaleAuto ? defaultRange.max : state.customMax}
                      onChange={(e) =>
                        onChangeState({
                          maxScaleAuto: false,
                          customMax: parseFloat(e.target.value),
                        })
                      }
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200 font-mono"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 5. IN-SITU OBSERVATIONS & DISCREPANCY FILTER */}
          <div className="space-y-3 pt-2 border-t border-slate-800">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Radio className="w-3.5 h-3.5 text-emerald-400" />
                <span>In-Situ Observations</span>
              </label>
              <button
                id="toggle-argo-visibility"
                onClick={() => onChangeState({ showArgo: !state.showArgo })}
                className={`px-2.5 py-0.5 rounded-full text-xs font-medium transition-all cursor-pointer ${
                  state.showArgo
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/60'
                    : 'bg-slate-800 text-slate-500 border border-slate-700'
                }`}
              >
                {state.showArgo ? 'ON' : 'OFF'}
              </button>
            </div>

            {state.showArgo && (
              <div className="space-y-2 p-2.5 bg-slate-950/50 rounded-xl border border-slate-800">
                <div className="flex items-center justify-between text-xs text-slate-300">
                  <span className="flex items-center gap-1">
                    <Filter className="w-3 h-3 text-cyan-400" />
                    <span>Discrepancy Filter</span>
                  </span>
                  <span className="font-mono text-cyan-400 text-[11px]">
                    {activeFloatsCount} / {totalFloatsCount} Floats
                  </span>
                </div>

                <div className="grid grid-cols-4 gap-1">
                  {([0, 0.5, 1.0, 2.0] as DiscrepancyThreshold[]).map((thresh) => (
                    <button
                      key={thresh}
                      id={`btn-discrepancy-${thresh}`}
                      onClick={() => onChangeState({ discrepancyThreshold: thresh })}
                      className={`py-1 px-1.5 rounded-lg text-xs font-mono transition-all border cursor-pointer ${
                        state.discrepancyThreshold === thresh
                          ? thresh >= 2.0
                            ? 'bg-red-500/25 border-red-500 text-red-200 font-semibold'
                            : 'bg-cyan-500/25 border-cyan-400 text-cyan-200 font-semibold'
                          : 'bg-slate-800/60 border-slate-700/60 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {thresh === 0 ? 'All' : `±${thresh}${state.variable === 'CHLA' ? '' : '°'}`}
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-slate-400 leading-tight">
                  Filters floats where |Observation − Model| exceeds the selected threshold at{' '}
                  <span className="text-amber-300 font-mono">{state.depth}m</span>.
                </p>
              </div>
            )}
          </div>

          {/* 6. PROVENANCE & DATASET INFO */}
          <div className="mt-auto pt-3 border-t border-slate-800 text-xs text-slate-400 space-y-1.5">
            <div className="flex items-center gap-1.5 text-slate-300 font-semibold text-[11px] uppercase tracking-wider">
              <Database className="w-3.5 h-3.5 text-cyan-400" />
              <span>Dataset Provenance</span>
            </div>
            <div className="bg-slate-950/60 p-2 rounded-lg border border-slate-800 text-[11px] font-mono space-y-1">
              <div className="flex items-center justify-between text-cyan-300">
                <span className="truncate">{state.variable === 'CHLA' ? 'incois_oceansat2_datasets' : 'incois_argo_10d_VAM'}</span>
                <a
                  href={state.variable === 'CHLA'
                    ? "https://erddap.incois.gov.in/erddap/griddap/incois_oceansat2_datasets.html"
                    : "https://erddap.incois.gov.in/erddap/griddap/incois_argo_10d_VAM.html"
                  }
                  target="_blank"
                  rel="noreferrer"
                  className="text-emerald-400 hover:text-emerald-300 inline-flex items-center gap-0.5 text-[9px]"
                >
                  <span>ERDDAP</span>
                  <ExternalLink className="w-2.5 h-2.5" />
                </a>
              </div>
              <div className="text-slate-400">
                {state.variable === 'CHLA' ? 'Variable: CHL (mg/m³) • Oceansat-2 (OCM-2)' : `Variable: ${state.variable} • Res: 0.25° × 0.25°`}
              </div>
              <div className="text-slate-500 text-[10px]">INCOIS MoES Hyderabad • Indian Ocean</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
