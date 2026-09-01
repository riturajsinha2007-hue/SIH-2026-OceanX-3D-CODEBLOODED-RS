import React, { useMemo } from 'react';
import { getTimeStepsForVariable, isChlorophyllDateValid } from '../../data/incoisDataset';
import { VisualizationState } from '../../types/ocean';
import { getColorCssGradient, getDefaultRange } from '../../utils/scientificColormaps';
import { AlertCircle } from 'lucide-react';

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

  const safeIndex = Math.min(state.timeStepIndex, activeTimeSteps.length - 1);
  const currentStep = activeTimeSteps[safeIndex] || activeTimeSteps[0];
  const isChlorophyll = state.variable === 'CHLA';
  const hasValidData = isChlorophyll ? isChlorophyllDateValid(currentStep.dateStr) : true;

  const gradient = useMemo(() => {
    return getColorCssGradient(state.colormap);
  }, [state.colormap]);

  const varName =
    state.variable === 'TEMP'
      ? 'Temperature'
      : state.variable === 'SAL'
      ? 'Salinity'
      : 'Chlorophyll-a';

  return (
    <div
      id="scientific-color-legend"
      className={`bg-[#101010] border border-[#262626] p-3 rounded-md shadow-lg w-full text-xs select-none ${className}`}
    >
      {/* Title & Unit */}
      <div className="flex items-center justify-between pb-1.5 border-b border-[#262626]">
        <div className="font-semibold text-[#F5F5F5] flex items-center gap-1.5 truncate">
          <span>{varName}</span>
          <span className="font-normal text-[#A3A3A3]">({defaultRange.unit})</span>
        </div>
        <span className="font-mono text-[#F5C518] text-[11px] shrink-0 ml-1">
          {isChlorophyll ? 'Surface (0–5 m)' : `at ${state.depth} m`}
        </span>
      </div>

      {/* Color Gradient Bar */}
      <div className="my-2 space-y-1">
        <div
          className="w-full h-3 rounded border border-[#262626]"
          style={{ background: gradient }}
        />
        {defaultRange.isLog ? (
          /* Chlorophyll Logarithmic Ticks */
          <div className="flex justify-between font-mono text-[9.5px] text-[#A3A3A3] px-0.5">
            <span>0.03</span>
            <span>0.1</span>
            <span>0.3</span>
            <span>1.0</span>
            <span>3.0</span>
            <span>10.0</span>
            <span>30</span>
          </div>
        ) : (
          /* Linear Temperature/Salinity Ticks */
          <div className="flex justify-between font-mono text-[10px] text-[#A3A3A3] px-0.5">
            <span>{minVal.toFixed(0)}</span>
            <span>{((minVal * 3 + maxVal) / 4).toFixed(0)}</span>
            <span>{((minVal + maxVal) / 2).toFixed(0)}</span>
            <span>{((minVal + maxVal * 3) / 4).toFixed(0)}</span>
            <span>{maxVal.toFixed(0)}</span>
          </div>
        )}
      </div>

      {/* Dataset Provenance Telemetry */}
      <div className="pt-1.5 border-t border-[#262626] space-y-0.5 text-[10px] text-[#A3A3A3] font-mono">
        <div className="flex justify-between items-center">
          <span className="text-[#666666]">Dataset:</span>
          <span className="text-[#F5F5F5] truncate max-w-[160px]">
            {isChlorophyll ? 'incois_oceansat2_datasets' : 'incois_argo_mnt_VAM'}
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
