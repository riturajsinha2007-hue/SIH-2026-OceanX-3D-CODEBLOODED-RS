import React, { useMemo } from 'react';
import { getTimeStepsForVariable, isChlorophyllDateValid } from '../../data/incoisDataset';
import { VisualizationState } from '../../types/ocean';
import {
  getColorCssGradient,
  getDefaultRange,
  getVariableTitle,
  isSurfaceOnlyVariable,
} from '../../utils/scientificColormaps';
import { AlertCircle, Compass, Wind } from 'lucide-react';

interface ScientificLegendProps {
  state: VisualizationState;
  className?: string;
}

export const ScientificLegend: React.FC<ScientificLegendProps> = ({ state, className = '' }) => {
  const defaultRange = getDefaultRange(state.variable, state.depth);
  const minVal = state.minScaleAuto ? defaultRange.min : state.customMin;
  const maxVal = state.maxScaleAuto ? defaultRange.max : state.customMax;

  const activeTimeSteps = useMemo(() => {
    return getTimeStepsForVariable(state.variable);
  }, [state.variable]);

  const safeIndex = Math.min(state.timeStepIndex, Math.max(0, activeTimeSteps.length - 1));
  const currentStep = activeTimeSteps[safeIndex] || activeTimeSteps[0];
  const isChlorophyll = state.variable === 'CHLA';
  const isSsh = state.variable === 'SSH';
  const isSurfaceOnly = isSurfaceOnlyVariable(state.variable);
  const hasValidData = isChlorophyll ? isChlorophyllDateValid(currentStep.dateStr) : true;

  const gradient = useMemo(() => {
    return getColorCssGradient(state.colormap);
  }, [state.colormap]);

  const varTitle = getVariableTitle(state.variable);

  // Generate 5 tick marks for linear or diverging scales
  const ticks = useMemo(() => {
    if (defaultRange.isDiverging) {
      const center = defaultRange.referenceCenter ?? 0;
      return [
        { label: `${minVal.toFixed(2)}`, pos: '0%' },
        { label: `${((minVal + center) / 2).toFixed(2)}`, pos: '25%' },
        { label: `${center.toFixed(2)} (MSL)`, pos: '50%', isCenter: true },
        { label: `${((center + maxVal) / 2).toFixed(2)}`, pos: '75%' },
        { label: `+${maxVal.toFixed(2)}`, pos: '100%' },
      ];
    }

    if (defaultRange.isLog) {
      return [
        { label: '0.03', pos: '0%' },
        { label: '0.1', pos: '20%' },
        { label: '0.3', pos: '40%' },
        { label: '1.0', pos: '60%' },
        { label: '3.0', pos: '80%' },
        { label: '25.0', pos: '100%' },
      ];
    }

    const count = 5;
    const items = [];
    for (let i = 0; i < count; i++) {
      const frac = i / (count - 1);
      const val = minVal + frac * (maxVal - minVal);
      const formatted = state.variable === 'SAL' ? val.toFixed(1) : val.toFixed(0);
      items.push({ label: formatted, pos: `${Math.round(frac * 100)}%` });
    }
    return items;
  }, [minVal, maxVal, defaultRange, state.variable]);

  const datasetLabel = useMemo(() => {
    if (state.variable === 'CHLA') return 'incois_oceansat2_datasets';
    if (state.variable === 'SSH') return 'incois_altimetry_ssh';
    return 'incois_argo_mnt_VAM';
  }, [state.variable]);

  return (
    <div
      id="scientific-color-legend"
      className={`bg-[#101010]/95 backdrop-blur-md border border-[#262626] p-3 rounded-lg shadow-2xl w-full text-xs select-none ${className}`}
    >
      {/* Title, Unit & Depth Indicator */}
      <div className="flex items-center justify-between pb-1.5 border-b border-[#262626]">
        <div className="font-semibold text-[#F5F5F5] flex items-center gap-1.5 truncate">
          <span>{varTitle}</span>
          <span className="font-normal text-[#A3A3A3]">({defaultRange.unit})</span>
        </div>
        <span className="font-mono text-[#F5C518] text-[11px] shrink-0 ml-1 px-1.5 py-0.5 rounded bg-[#161616] border border-[#262626]">
          {isSurfaceOnly ? 'Surface (0–5 m)' : `at ${state.depth} m`}
        </span>
      </div>

      {/* Scale Type Tagline */}
      <div className="flex items-center justify-between pt-1 text-[10px] text-[#A3A3A3]">
        <span>
          {defaultRange.isLog
            ? 'Logarithmic Scale (cmocean algae)'
            : defaultRange.isDiverging
            ? 'Diverging Scale (centered at 0.00m)'
            : state.variable === 'TEMP'
            ? 'Sequential Thermal Scale (cmocean thermal)'
            : 'Sequential Halite Scale (cmocean halite)'}
        </span>
        <span className="text-[9px] font-mono text-[#737373]">
          {state.colormap}
        </span>
      </div>

      {/* Color Gradient Bar */}
      <div className="my-2 space-y-1 relative">
        <div
          className="w-full h-3.5 rounded border border-[#262626] relative overflow-hidden"
          style={{ background: gradient }}
        >
          {/* Diverging Center Marker */}
          {defaultRange.isDiverging && (
            <div
              className="absolute top-0 bottom-0 w-[1.5px] bg-[#101010] shadow-[0_0_2px_#fff]"
              style={{ left: '50%', transform: 'translateX(-50%)' }}
              title="Zero reference point (0.00m MSL)"
            />
          )}
        </div>

        {/* Dynamic Numerical Ticks */}
        <div className="flex justify-between font-mono text-[9.5px] text-[#A3A3A3] px-0.5 pt-0.5">
          {ticks.map((t, idx) => (
            <span
              key={idx}
              className={t.isCenter ? 'font-bold text-[#F5C518]' : ''}
            >
              {t.label}
            </span>
          ))}
        </div>
      </div>

      {/* Ocean Currents Vector Velocity Sub-Legend (when currents layer is enabled) */}
      {state.showCurrents && (
        <div className="mt-2 pt-2 border-t border-[#1f1f1f] space-y-1">
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-[#F5F5F5] font-medium flex items-center gap-1">
              <Wind className="w-3 h-3 text-[#38bdf8]" />
              <span>Current Speed (m/s)</span>
            </span>
            <span className="text-[9px] font-mono text-[#A3A3A3]">0.0 – 1.5 m/s</span>
          </div>
          <div
            className="w-full h-2 rounded border border-[#262626]"
            style={{
              background: 'linear-gradient(to right, #1e1b4b, #0284c7, #10b981, #f59e0b, #ef4444, #c026d3)',
            }}
          />
          <div className="flex justify-between text-[8.5px] font-mono text-[#737373] px-0.5">
            <span>0.0 (Slack)</span>
            <span>0.5 (Drift)</span>
            <span>1.0 (Strong)</span>
            <span>1.5+ (Somali Jet)</span>
          </div>
        </div>
      )}

      {/* Missing Data & Land Mask Notation */}
      <div className="pt-2 mt-1 border-t border-[#262626] flex items-center justify-between text-[10px] text-[#A3A3A3]">
        <div className="flex items-center gap-1.5">
          <div
            className="w-3 h-3 rounded-sm border border-[#404040] bg-[#141414]"
            style={{
              backgroundImage: 'repeating-linear-gradient(45deg, #1f1f1f, #1f1f1f 2px, #0e0e0e 2px, #0e0e0e 5px)',
            }}
          />
          <span className="text-[10px] text-[#888888]">Land / Masked NaN</span>
        </div>
        <span className="text-[9.5px] text-[#666666]">Sub-pixel anti-aliased</span>
      </div>

      {/* Dataset Provenance Telemetry */}
      <div className="pt-1.5 border-t border-[#262626] space-y-0.5 text-[10px] text-[#A3A3A3] font-mono">
        <div className="flex justify-between items-center">
          <span className="text-[#666666]">Dataset:</span>
          <span className="text-[#F5F5F5] truncate max-w-[170px]" title={datasetLabel}>
            {datasetLabel}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-[#666666]">Timestamp:</span>
          {hasValidData ? (
            <span className="text-[#F5F5F5]">{currentStep.dateStr}</span>
          ) : (
            <span className="text-[#F5C518] font-sans flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              <span>Unavailable</span>
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
