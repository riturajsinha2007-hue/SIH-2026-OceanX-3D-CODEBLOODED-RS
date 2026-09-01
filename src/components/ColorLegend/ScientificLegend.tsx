import React, { useMemo } from 'react';
import { getTimeStepsForVariable, isChlorophyllDateValid } from '../../data/incoisDataset';
import { VisualizationState } from '../../types/ocean';
import { getColorCssGradient, getDefaultRange } from '../../utils/scientificColormaps';
import { Database, ExternalLink, AlertCircle } from 'lucide-react';

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

  const varTitle =
    state.variable === 'TEMP'
      ? 'INCOIS ARGO Monthly VAM Temperature'
      : state.variable === 'SAL'
      ? 'INCOIS ARGO Monthly VAM Salinity'
      : 'INCOIS Oceansat-2 (OCM-2) Chlorophyll-a';

  const datasetId = isChlorophyll ? 'incois_oceansat2_datasets' : 'incois_argo_10d_VAM';
  const variableId = isChlorophyll ? 'CHL' : state.variable;

  return (
    <div
      id="scientific-color-legend"
      className={`bg-slate-950/80 backdrop-blur-md border border-slate-800/90 p-3 rounded-xl shadow-lg w-full text-xs select-none ${className}`}
    >
      {/* Title & Unit */}
      <div className="flex items-center justify-between pb-1.5 border-b border-slate-800">
        <div className="font-semibold text-slate-100 flex items-center gap-1.5 truncate">
          <div
            className={`w-2.5 h-2.5 rounded-full shrink-0 ${
              state.variable === 'TEMP'
                ? 'bg-amber-400'
                : state.variable === 'SAL'
                ? 'bg-cyan-400'
                : 'bg-emerald-400'
            }`}
          />
          <span className="truncate">{varTitle}</span>
        </div>
        <span className="font-mono text-cyan-300 font-bold shrink-0 ml-1">
          ({defaultRange.unit})
        </span>
      </div>

      {/* Color Gradient Bar */}
      <div className="my-2 space-y-1">
        <div
          className="w-full h-3.5 rounded-md border border-slate-700/80 shadow-inner"
          style={{ background: gradient }}
        />
        {defaultRange.isLog ? (
          /* Chlorophyll Logarithmic Ticks */
          <div className="flex justify-between font-mono text-[10px] text-slate-300 font-semibold px-0.5">
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
          <div className="flex justify-between font-mono text-[11px] text-slate-300 font-semibold px-0.5">
            <span>{minVal.toFixed(1)} {defaultRange.unit}</span>
            <span className="text-slate-400 text-[10px]">
              {((minVal + maxVal) / 2).toFixed(1)}
            </span>
            <span>{maxVal.toFixed(1)} {defaultRange.unit}</span>
          </div>
        )}
      </div>

      {/* Dataset Provenance Telemetry */}
      <div className="pt-1.5 border-t border-slate-800/80 space-y-0.5 text-[10px] text-slate-400 font-mono">
        <div className="flex justify-between items-center">
          <span className="text-slate-500">Dataset / Var:</span>
          <span className="text-cyan-300 font-semibold truncate max-w-[160px]">
            {datasetId} → {variableId}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-slate-500">Vertical Layer:</span>
          <span className={isChlorophyll ? "text-emerald-300 font-bold" : "text-amber-300 font-bold"}>
            {isChlorophyll ? 'Surface (0–5m Optical Layer)' : `${state.depth} m Depth`}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-slate-500">Timeline Step:</span>
          {hasValidData ? (
            <span className="text-slate-200">{currentStep.dateStr}</span>
          ) : (
            <span className="text-rose-400 font-sans flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              <span>No data for date</span>
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
