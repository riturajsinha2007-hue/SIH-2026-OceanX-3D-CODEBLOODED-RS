import React, { useState, useMemo } from 'react';
import { ColormapType, DepthLevel, DiscrepancyThreshold, OceanVariable, VisualizationState, BasemapType, EdgeBlendMode } from '../../types/ocean';
import { getColorCssGradient, getDefaultRange } from '../../utils/scientificColormaps';
import { ARGO_FLOATS } from '../../data/incoisDataset';
import {
  Thermometer,
  Droplet,
  Layers,
  ChevronLeft,
  ChevronRight,
  Sliders,
  Radio,
  Filter,
  ExternalLink,
  Leaf,
  Blend,
  Search,
  Navigation,
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
  const [floatSearch, setFloatSearch] = useState('');

  const defaultRange = getDefaultRange(state.variable, state.depth);

  const filteredFloatList = useMemo(() => {
    if (!floatSearch.trim()) return ARGO_FLOATS;
    const q = floatSearch.toLowerCase();
    return ARGO_FLOATS.filter(
      (f) =>
        f.platformNumber.toLowerCase().includes(q) ||
        f.basin.toLowerCase().includes(q) ||
        `argo ${f.platformNumber}`.toLowerCase().includes(q)
    );
  }, [floatSearch]);

  return (
    <div
      id="left-control-panel"
      className={`relative z-30 flex flex-col h-full shrink-0 bg-[#101010] border-r border-[#262626] shadow-xl transition-all duration-200 select-none ${
        isCollapsed ? 'w-12' : 'w-72 md:w-80 max-w-[85vw]'
      }`}
    >
      {/* Panel Collapse Toggle Tab */}
      <button
        id="btn-toggle-left-panel"
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-3 top-5 z-40 bg-[#161616] border border-[#262626] text-[#A3A3A3] hover:text-[#F5C518] p-1 rounded-full shadow-md transition-colors cursor-pointer"
        title={isCollapsed ? 'Expand Control Panel' : 'Collapse Panel'}
      >
        {isCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
      </button>

      {isCollapsed ? (
        <div className="flex flex-col items-center py-4 gap-4 text-[#A3A3A3]">
          <div className="p-1.5 rounded-md bg-[#161616] text-[#F5C518] border border-[#262626]">
            <Layers className="w-4 h-4" />
          </div>
          <button
            onClick={() => {
              const nextVar: OceanVariable =
                state.variable === 'TEMP' ? 'SAL' : state.variable === 'SAL' ? 'CHLA' : 'TEMP';
              const nextCm: ColormapType =
                nextVar === 'TEMP' ? 'thermal' : nextVar === 'SAL' ? 'halite' : 'incois_rainbow';
              onChangeState({ variable: nextVar, colormap: nextCm });
            }}
            className={`p-1.5 rounded-md transition-colors cursor-pointer border ${
              state.variable === 'TEMP'
                ? 'text-[#F5C518] bg-[#161616] border-[#F5C518]'
                : state.variable === 'SAL'
                ? 'text-[#F5C518] bg-[#161616] border-[#F5C518]'
                : 'text-[#F5C518] bg-[#161616] border-[#F5C518]'
            }`}
            title={`Variable: ${state.variable}`}
          >
            {state.variable === 'TEMP' ? (
              <Thermometer className="w-4 h-4" />
            ) : state.variable === 'SAL' ? (
              <Droplet className="w-4 h-4" />
            ) : (
              <Leaf className="w-4 h-4" />
            )}
          </button>
          <div className="text-[10px] font-mono text-[#F5C518] rotate-90 my-2">
            {state.depth}m
          </div>
          <button
            onClick={() => onChangeState({ showArgo: !state.showArgo })}
            className={`p-1.5 rounded-md transition-colors cursor-pointer border ${
              state.showArgo ? 'text-[#F5C518] bg-[#161616] border-[#262626]' : 'text-[#666666] border-transparent'
            }`}
            title="Toggle Argo Floats"
          >
            <Radio className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div className="flex flex-col h-full overflow-y-auto custom-scrollbar p-3.5 space-y-3.5 text-[#F5F5F5]">
          {/* Header */}
          <div className="flex items-center justify-between pb-2 border-b border-[#262626]">
            <h2 className="text-[11px] font-semibold text-[#A3A3A3] tracking-wider uppercase">
              Data Controls
            </h2>
            <div className="flex items-center gap-1.5 text-[10px] font-mono text-[#F5C518]">
              <span>✓</span>
              <span className="text-[#A3A3A3]">Verified</span>
            </div>
          </div>

          {/* 1. VARIABLE SELECTOR (TEMP, SAL, CHLA) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-medium text-[#A3A3A3]">
                Variable
              </label>
              <span className="text-[10px] font-mono text-[#666666]">
                {state.variable === 'TEMP'
                  ? 'temperature (°C)'
                  : state.variable === 'SAL'
                  ? 'salinity (PSU)'
                  : 'chlorophyll (mg/m³)'}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              <button
                id="btn-select-var-temp"
                onClick={() => onChangeState({ variable: 'TEMP' })}
                className={`flex flex-col items-center justify-center py-2 px-1 rounded-md text-xs transition-colors border cursor-pointer ${
                  state.variable === 'TEMP'
                    ? 'bg-[#161616] border-[#F5C518] text-[#F5F5F5]'
                    : 'bg-[#161616] border-[#262626] text-[#A3A3A3] hover:border-[#404040] hover:text-[#F5F5F5]'
                }`}
              >
                <Thermometer className={`w-3.5 h-3.5 mb-1 ${state.variable === 'TEMP' ? 'text-[#F5C518]' : 'text-[#A3A3A3]'}`} />
                <span className="text-[11px]">Temperature</span>
              </button>

              <button
                id="btn-select-var-sal"
                onClick={() => onChangeState({ variable: 'SAL' })}
                className={`flex flex-col items-center justify-center py-2 px-1 rounded-md text-xs transition-colors border cursor-pointer ${
                  state.variable === 'SAL'
                    ? 'bg-[#161616] border-[#F5C518] text-[#F5F5F5]'
                    : 'bg-[#161616] border-[#262626] text-[#A3A3A3] hover:border-[#404040] hover:text-[#F5F5F5]'
                }`}
              >
                <Droplet className={`w-3.5 h-3.5 mb-1 ${state.variable === 'SAL' ? 'text-[#F5C518]' : 'text-[#A3A3A3]'}`} />
                <span className="text-[11px]">Salinity</span>
              </button>

              <button
                id="btn-select-var-chla"
                onClick={() => onChangeState({ variable: 'CHLA' })}
                className={`flex flex-col items-center justify-center py-2 px-1 rounded-md text-xs transition-colors border cursor-pointer ${
                  state.variable === 'CHLA'
                    ? 'bg-[#161616] border-[#F5C518] text-[#F5F5F5]'
                    : 'bg-[#161616] border-[#262626] text-[#A3A3A3] hover:border-[#404040] hover:text-[#F5F5F5]'
                }`}
              >
                <Leaf className={`w-3.5 h-3.5 mb-1 ${state.variable === 'CHLA' ? 'text-[#F5C518]' : 'text-[#A3A3A3]'}`} />
                <span className="text-[11px]">Chlorophyll</span>
              </button>
            </div>
          </div>

          {/* 2. DEPTH CONTROLLER */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-medium text-[#A3A3A3] uppercase tracking-wider">
                Water Column Depth
              </label>
              <span className="text-[10px] font-mono text-[#F5C518]">
                {state.variable === 'CHLA' ? 'Surface (0–5 m)' : `Surface (${state.depth} m)`}
              </span>
            </div>

            {state.variable === 'CHLA' ? (
              <div className="p-2.5 bg-[#161616] border border-[#262626] rounded-md text-[10px] text-[#A3A3A3] leading-relaxed">
                Chlorophyll-a is an optical surface radiometric product (0–5m). Subsurface vertical layers are constrained to the surface euphotic zone.
              </div>
            ) : (
              <>
                <div className="grid grid-cols-3 gap-1.5">
                  {DEPTH_LEVELS.map((d) => (
                    <button
                      key={d}
                      id={`btn-depth-${d}`}
                      onClick={() => onChangeState({ depth: d })}
                      className={`py-1 px-1.5 rounded-md text-xs font-mono transition-colors text-center border cursor-pointer ${
                        state.depth === d
                          ? 'bg-[#161616] border-[#F5C518] text-[#F5C518] font-medium'
                          : 'bg-[#161616] border-[#262626] text-[#A3A3A3] hover:border-[#404040] hover:text-[#F5F5F5]'
                      }`}
                    >
                      {d} m
                    </button>
                  ))}
                </div>

                {/* Continuous Slider */}
                <div className="pt-1 space-y-1">
                  <div className="flex justify-between text-[9px] text-[#666666] font-mono">
                    <span>0 m</span>
                    <span>2000 m</span>
                  </div>
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
                    className="w-full h-1 bg-[#262626] rounded appearance-none cursor-pointer accent-[#F5C518]"
                  />
                  <div className="flex justify-between text-[9px] text-[#666666]">
                    <span>Surface</span>
                    <span>Thermocline (100 m)</span>
                    <span>1000 m (Intermediate)</span>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* 3. BASEMAP LAYER */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-medium text-[#A3A3A3] uppercase tracking-wider">
              Basemap Layer
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              {(['satellite', 'bathymetry'] as BasemapType[]).map((b) => (
                <button
                  key={b}
                  id={`btn-basemap-${b}`}
                  onClick={() => onChangeState({ basemap: b })}
                  className={`py-1.5 px-2 rounded-md text-xs font-medium capitalize transition-colors border cursor-pointer ${
                    state.basemap === b
                      ? 'bg-[#161616] border-[#F5C518] text-[#F5F5F5]'
                      : 'bg-[#161616] border-[#262626] text-[#A3A3A3] hover:border-[#404040] hover:text-[#F5F5F5]'
                  }`}
                >
                  {b.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>

          {/* 4. COLOR PALETTE & OPACITY */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-medium text-[#A3A3A3] uppercase tracking-wider">
                Colormap Palette
              </label>
              <button
                onClick={() => setAdvancedOpen(!advancedOpen)}
                className="text-[10px] text-[#A3A3A3] hover:text-[#F5C518] flex items-center gap-1 cursor-pointer transition-colors"
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
                  className={`group relative p-1 rounded-md border flex flex-col items-center gap-1 transition-colors cursor-pointer ${
                    state.colormap === cm.type
                      ? 'border-[#F5C518] bg-[#161616]'
                      : 'border-[#262626] bg-[#161616] hover:border-[#404040]'
                  }`}
                  title={cm.label}
                >
                  <div
                    className="w-full h-2 rounded"
                    style={{ background: getColorCssGradient(cm.type) }}
                  />
                  <span className="text-[9px] text-[#A3A3A3] group-hover:text-[#F5F5F5] truncate w-full text-center">
                    {cm.label}
                  </span>
                </button>
              ))}
            </div>

            {/* Opacity Slider */}
            <div className="space-y-1 pt-1">
              <div className="flex justify-between text-[10px] text-[#A3A3A3]">
                <span>Layer Opacity</span>
                <span className="font-mono text-[#F5C518]">{Math.round(state.opacity * 100)}%</span>
              </div>
              <input
                id="slider-opacity"
                type="range"
                min={0.2}
                max={1.0}
                step={0.05}
                value={state.opacity}
                onChange={(e) => onChangeState({ opacity: parseFloat(e.target.value) })}
                className="w-full h-1 bg-[#262626] rounded appearance-none cursor-pointer accent-[#F5C518]"
              />
            </div>

            {/* Edge Refinement & Ground Blending Controls */}
            <div className="pt-2 border-t border-[#262626] space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium text-[#A3A3A3] flex items-center gap-1.5">
                  <Blend className="w-3.5 h-3.5 text-[#A3A3A3]" />
                  <span>Edge & Ground Blending</span>
                </span>
                <span className="text-[10px] font-mono text-[#F5C518]">
                  {state.edgeBlendMode === 'soft_feather' ? 'Soft Blend (90% Feather)' : 'Crisp Grid'}
                </span>
              </div>

              {/* Blending Mode Pills */}
              <div className="grid grid-cols-2 gap-1.5">
                {(
                  [
                    { id: 'soft_feather', label: 'Soft Blend', title: 'Smooth coastal ground feathering with zero land bleed' },
                    { id: 'crisp', label: 'Crisp Grid', title: 'Sharp mathematical bounding box' },
                  ] as { id: EdgeBlendMode; label: string; title: string }[]
                ).map((mode) => (
                  <button
                    key={mode.id}
                    id={`btn-blend-mode-${mode.id}`}
                    onClick={() => onChangeState({ edgeBlendMode: mode.id })}
                    title={mode.title}
                    className={`py-1 px-2 rounded-md text-[10px] font-medium transition-colors border cursor-pointer text-center ${
                      state.edgeBlendMode === mode.id
                        ? 'bg-[#161616] border-[#F5C518] text-[#F5F5F5]'
                        : 'bg-[#161616] border-[#262626] text-[#A3A3A3] hover:border-[#404040] hover:text-[#F5F5F5]'
                    }`}
                  >
                    {mode.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Advanced Scale Controls */}
            {advancedOpen && (
              <div className="p-2.5 bg-[#161616] rounded-md border border-[#262626] space-y-2 mt-2">
                <div className="flex items-center justify-between text-xs text-[#A3A3A3]">
                  <span>Scale Dynamic Range</span>
                  <button
                    onClick={() =>
                      onChangeState({
                        minScaleAuto: true,
                        maxScaleAuto: true,
                        customMin: defaultRange.min,
                        customMax: defaultRange.max,
                      })
                    }
                    className="text-[10px] font-mono text-[#F5C518] hover:underline cursor-pointer"
                  >
                    Reset Auto
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <label className="text-[10px] text-[#666666] block mb-0.5">Min ({defaultRange.unit})</label>
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
                      className="w-full bg-[#101010] border border-[#262626] rounded px-2 py-1 text-[#F5F5F5] font-mono text-xs focus:outline-none focus:border-[#F5C518]"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-[#666666] block mb-0.5">Max ({defaultRange.unit})</label>
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
                      className="w-full bg-[#101010] border border-[#262626] rounded px-2 py-1 text-[#F5F5F5] font-mono text-xs focus:outline-none focus:border-[#F5C518]"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 5. IN-SITU OBSERVATIONS & DISCREPANCY FILTER */}
          <div className="space-y-2 pt-2 border-t border-[#262626]">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-medium text-[#A3A3A3] uppercase tracking-wider flex items-center gap-1.5">
                <Radio className="w-3.5 h-3.5 text-[#F5C518]" />
                <span>In-Situ Observations</span>
              </label>
              <button
                id="toggle-argo-visibility"
                onClick={() => onChangeState({ showArgo: !state.showArgo })}
                className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-colors cursor-pointer border ${
                  state.showArgo
                    ? 'bg-[#F5C518] text-[#080808] border-[#F5C518]'
                    : 'bg-[#161616] text-[#666666] border-[#262626]'
                }`}
              >
                {state.showArgo ? 'ON' : 'OFF'}
              </button>
            </div>

            {state.showArgo && (
              <div className="space-y-2 p-2.5 bg-[#161616] rounded-md border border-[#262626]">
                <div className="flex items-center justify-between text-xs text-[#A3A3A3]">
                  <span className="flex items-center gap-1">
                    <Filter className="w-3 h-3 text-[#A3A3A3]" />
                    <span>Discrepancy Filter</span>
                  </span>
                  <span className="font-mono text-[#F5C518] text-[10px]">
                    {activeFloatsCount} / {totalFloatsCount} Floats
                  </span>
                </div>

                <div className="grid grid-cols-4 gap-1">
                  {([0, 0.5, 1.0, 2.0] as DiscrepancyThreshold[]).map((thresh) => (
                    <button
                      key={thresh}
                      id={`btn-discrepancy-${thresh}`}
                      onClick={() => onChangeState({ discrepancyThreshold: thresh })}
                      className={`py-1 px-1 rounded-md text-xs font-mono transition-colors border cursor-pointer text-center ${
                        state.discrepancyThreshold === thresh
                          ? 'bg-[#101010] border-[#F5C518] text-[#F5C518] font-medium'
                          : 'bg-[#101010] border-[#262626] text-[#A3A3A3] hover:border-[#404040] hover:text-[#F5F5F5]'
                      }`}
                    >
                      {thresh === 0 ? 'All' : `> ${thresh}${state.variable === 'CHLA' ? '' : '°C'}`}
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-[#666666] leading-tight">
                  Filters floats where |Observation − Model| exceeds the selected threshold.
                </p>

                {/* Argo Float Platform Directory */}
                <div className="pt-2 border-t border-[#262626] space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-medium text-[#A3A3A3] flex items-center gap-1">
                      <Navigation className="w-3 h-3 text-[#F5C518]" />
                      <span>Argo Float Directory</span>
                    </span>
                    <span className="text-[10px] font-mono text-[#666666]">
                      {filteredFloatList.length} platforms
                    </span>
                  </div>

                  {/* Search Input */}
                  <div className="relative">
                    <Search className="w-3 h-3 text-[#666666] absolute left-2 top-2" />
                    <input
                      id="input-search-argo-floats"
                      type="text"
                      placeholder="Search WMO ID or Basin..."
                      value={floatSearch}
                      onChange={(e) => setFloatSearch(e.target.value)}
                      className="w-full bg-[#101010] border border-[#262626] rounded-md pl-6 pr-2 py-1 text-[11px] text-[#F5F5F5] placeholder-[#666666] focus:outline-none focus:border-[#F5C518]"
                    />
                  </div>

                  {/* Scrollable list of all float platforms */}
                  <div className="max-h-36 overflow-y-auto custom-scrollbar space-y-1 pr-0.5">
                    {filteredFloatList.map((f) => {
                      const isSelected =
                        state.selectedFloatId === f.id ||
                        state.selectedFloatId === f.platformNumber ||
                        state.selectedFloatId === `argo-${f.platformNumber}`;
                      const profile = f.profiles.find((p) => p.depth === state.depth) || f.profiles[0];
                      const delta =
                        state.variable === 'TEMP'
                          ? profile.tempDelta
                          : state.variable === 'SAL'
                          ? profile.salDelta
                          : profile.chlaDelta || 0;

                      return (
                        <button
                          key={f.id}
                          id={`btn-select-float-${f.platformNumber}`}
                          onClick={() => {
                            onChangeState({
                              selectedFloatId: isSelected ? null : f.id,
                              selectedProbePoint: null,
                            });
                          }}
                          className={`w-full text-left px-2 py-1.5 rounded-md text-xs transition-colors flex items-center justify-between border cursor-pointer ${
                            isSelected
                              ? 'bg-[#101010] border-[#F5C518] text-[#F5F5F5]'
                              : 'bg-[#101010] border-[#262626] text-[#A3A3A3] hover:border-[#404040] hover:text-[#F5F5F5]'
                          }`}
                        >
                          <div className="flex items-center gap-1.5 truncate">
                            <div
                              className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                                isSelected
                                  ? 'bg-[#F5C518]'
                                  : 'bg-[#666666]'
                              }`}
                            />
                            <span className="font-mono font-medium truncate text-[#F5F5F5]">
                              Argo {f.platformNumber}
                            </span>
                            <span className="text-[10px] text-[#666666] truncate">({f.basin})</span>
                          </div>
                          <span
                            className={`text-[10px] font-mono shrink-0 ml-1 ${
                              isSelected ? 'text-[#F5C518]' : 'text-[#666666]'
                            }`}
                          >
                            {delta > 0 ? `+${delta.toFixed(1)}` : delta.toFixed(1)}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 6. PROVENANCE & DATASET INFO */}
          <div className="mt-auto pt-2 border-t border-[#262626] text-xs text-[#A3A3A3] space-y-1">
            <div className="flex items-center justify-between text-[11px] font-medium uppercase tracking-wider text-[#A3A3A3]">
              <span>Dataset Provenance</span>
              <a
                href={state.variable === 'CHLA'
                  ? "https://erddap.incois.gov.in/erddap/griddap/incois_oceansat2_datasets.html"
                  : "https://erddap.incois.gov.in/erddap/griddap/incois_argo_mnt_VAM.html"
                }
                target="_blank"
                rel="noreferrer"
                className="text-[#F5C518] hover:underline inline-flex items-center gap-0.5 text-[9px] lowercase font-mono"
              >
                <span>erddap</span>
                <ExternalLink className="w-2.5 h-2.5" />
              </a>
            </div>
            <div className="bg-[#161616] p-2 rounded-md border border-[#262626] text-[10px] font-mono space-y-0.5">
              <div className="text-[#F5C518] truncate">
                {state.variable === 'CHLA' ? 'incois_oceansat2_datasets' : 'incois_argo_mnt_VAM'}
              </div>
              <div className="text-[#666666] text-[9.5px]">
                {state.variable === 'CHLA' ? 'Variable: CHL (mg/m³) • Res: 0.25°' : `Variable: ${state.variable} • Res: 0.25° × 0.25°`}
              </div>
              <div className="text-[#666666] text-[9px]">INCOIS MoES Hyderabad • Indian Ocean</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
