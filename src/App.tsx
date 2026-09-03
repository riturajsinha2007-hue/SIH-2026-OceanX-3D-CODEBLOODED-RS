import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { ARGO_FLOATS, getFloatsFilteredByDiscrepancy, sampleOceanPoint, syncTimeStepForVariable, setDynamicOceansat2TimeSteps, setDynamicArgoVamTimeSteps } from './data/incoisDataset';
import { DepthLevel, OceanVariable, PointProbeData, VisualizationState } from './types/ocean';
import { isSurfaceOnlyVariable } from './utils/scientificColormaps';
import { fetchDynamicOceansat2TimeDimension, fetchDynamicArgoVamTimeDimension } from './services/erddapService';
import { TopBar } from './components/TopBar/TopBar';
import { LeftControlPanel } from './components/Controls/LeftControlPanel';
import { OceanGlobe } from './components/OceanGlobe/OceanGlobe';
import { RightAnalysisPanel } from './components/ObservationPanel/RightAnalysisPanel';
import { BottomTimeline } from './components/Timeline/BottomTimeline';
import { ExportModal } from './components/Export/ExportModal';
import { ScientificInfoModal } from './components/Info/ScientificInfoModal';
import { ModelObservationComparisonModal } from './components/Comparison/ModelObservationComparisonModal';
import { DataPipelineModal } from './components/Pipeline/DataPipelineModal';
import { VerticalDepthHUD } from './components/Controls/VerticalDepthHUD';

export default function App() {
  const [state, setState] = useState<VisualizationState>({
    variable: 'TEMP',
    depth: 5,
    timeStepIndex: 242, // March 2024 (in 271-month series 2004-2026)
    colormap: 'thermal',
    opacity: 0.85,
    minScaleAuto: true,
    maxScaleAuto: true,
    customMin: 22.0,
    customMax: 31.5,
    basemap: 'satellite',
    viewMode: '3d_globe',
    showArgo: true,
    discrepancyThreshold: 0,
    selectedFloatId: null,
    selectedProbePoint: null,
    isPlaying: false,
    playbackSpeed: 1,
    edgeBlendMode: 'soft_feather',
    coastalFeathering: 0.90,
    boundaryFade: false,
    showCurrents: false,
    currentsOpacity: 0.85,
    currentsStyle: 'both',
    verticalExaggeration: 1,
  });

  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isInfoOpen, setIsInfoOpen] = useState(false);
  const [isComparisonOpen, setIsComparisonOpen] = useState(false);
  const [isPipelineOpen, setIsPipelineOpen] = useState(false);

  // Initialize ERDDAP live time coordinates on app launch
  useEffect(() => {
    // 1. Fetch dynamic ARGO VAM time coordinates (2004 to 2026, 271 monthly steps)
    fetchDynamicArgoVamTimeDimension().then((res) => {
      if (res && res.times && res.times.length > 0) {
        setDynamicArgoVamTimeSteps(res.times);
      }
    });

    // 2. Fetch dynamic Oceansat-2 time coordinates (2011 to 2020, 3377 daily steps)
    fetchDynamicOceansat2TimeDimension().then((res) => {
      if (res && res.times && res.times.length > 0) {
        setDynamicOceansat2TimeSteps(res.times);
      }
    });
  }, []);

  // Update state partials and automatically refresh probe point if active
  const handleUpdateState = useCallback((updates: Partial<VisualizationState>) => {
    setState((prev) => {
      const next = { ...prev, ...updates };

      // When shifting variable (e.g. to Chlorophyll, SSH, or back to Temp/Sal),
      // synchronize the timeline date to the corresponding dataset period!
      if (updates.variable && updates.variable !== prev.variable) {
        const syncedTimeIndex = syncTimeStepForVariable(prev.variable, updates.variable, prev.timeStepIndex);
        next.timeStepIndex = syncedTimeIndex;

        if (updates.variable === 'CHLA') {
          next.depth = 0; // Chlorophyll is surface layer
          if (!updates.colormap) {
            next.colormap = 'incois_rainbow';
          }
        } else if (updates.variable === 'SSH') {
          next.depth = 0; // Sea Surface Height is surface layer
          if (!updates.colormap) {
            next.colormap = 'balance';
          }
        } else {
          // Switching to TEMP or SAL: ensure depth is valid for ARGO VAM (minimum 5m)
          if (!next.depth || next.depth === 0) {
            next.depth = 5;
          }
          if (!updates.colormap) {
            next.colormap = updates.variable === 'TEMP' ? 'thermal' : 'halite';
          }
        }
      }

      // If depth is explicitly set to 0 for subsurface variables, clamp to 5m
      if (updates.depth !== undefined) {
        if (!isSurfaceOnlyVariable(next.variable) && updates.depth === 0) {
          next.depth = 5;
        }
      }

      // If depth, variable, or time step changed and a probe point is active, refresh the probe values
      if (
        (updates.depth !== undefined || updates.timeStepIndex !== undefined || updates.variable !== undefined) &&
        prev.selectedProbePoint &&
        !updates.selectedProbePoint
      ) {
        const nextDepth = updates.depth !== undefined ? updates.depth : (isSurfaceOnlyVariable(next.variable) ? 0 : prev.depth);
        const nextTime = next.timeStepIndex;
        const refreshedProbe = sampleOceanPoint(
          prev.selectedProbePoint.latitude,
          prev.selectedProbePoint.longitude,
          nextDepth,
          nextTime,
          next.variable
        );
        next.selectedProbePoint = refreshedProbe;
      }

      return next;
    });
  }, []);

  // Filtered floats according to active discrepancy threshold and depth
  const filteredFloats = useMemo(() => {
    return getFloatsFilteredByDiscrepancy(
      state.discrepancyThreshold,
      state.depth,
      state.variable
    );
  }, [state.discrepancyThreshold, state.depth, state.variable]);

  // Currently selected float object (robust against id format variations)
  const selectedFloat = useMemo(() => {
    if (!state.selectedFloatId) return null;
    const rawId = state.selectedFloatId;
    const cleanNum = rawId.replace(/^(argo-)+/, '');
    return (
      ARGO_FLOATS.find(
        (f) =>
          f.id === rawId ||
          f.id === `argo-${cleanNum}` ||
          f.platformNumber === cleanNum ||
          f.id.endsWith(cleanNum)
      ) || null
    );
  }, [state.selectedFloatId]);

  return (
    <div id="oceanx-app-root" className="relative flex flex-col h-full w-full overflow-hidden bg-[#040810] text-slate-100 font-sans antialiased">
      {/* 1. TOP NAVIGATION & STATUS BAR */}
      <TopBar
        state={state}
        onOpenExport={() => setIsExportOpen(true)}
        onOpenInfo={() => setIsInfoOpen(true)}
        onOpenComparison={() => setIsComparisonOpen(true)}
        onOpenPipeline={() => setIsPipelineOpen(true)}
        onToggleDebug={() => handleUpdateState({ debugMode: !state.debugMode })}
      />

      {/* 2. MAIN SCIENTIFIC WORKSPACE (Left Controls + Center 3D Globe + Right Analysis) */}
      <div className="relative flex-1 min-h-0 flex flex-row overflow-hidden w-full">
        {/* Left Side Controls */}
        <LeftControlPanel
          state={state}
          onChangeState={handleUpdateState}
          activeFloatsCount={filteredFloats.length}
          totalFloatsCount={ARGO_FLOATS.length}
          onOpenComparisonModal={() => setIsComparisonOpen(true)}
          onOpenPipelineModal={() => setIsPipelineOpen(true)}
        />

        {/* Center 3D Globe Viewer (Unobstructed View) */}
        <div className="relative flex-1 min-w-0 min-h-0 h-full w-full overflow-hidden bg-[#040810]">
          <OceanGlobe
            state={state}
            onSelectFloat={(id) => handleUpdateState({ selectedFloatId: id, selectedProbePoint: null })}
            onSelectProbePoint={(probe) => handleUpdateState({ selectedProbePoint: probe, selectedFloatId: null })}
            filteredFloats={filteredFloats}
          />

          {/* Vertical Depth Exploration Sounder HUD (interactive sounder on globe viewport) */}
          <div className="absolute right-4 bottom-14 z-20 pointer-events-auto">
            <VerticalDepthHUD
              depth={state.depth}
              variable={state.variable}
              onChangeDepth={(d: DepthLevel) => handleUpdateState({ depth: d })}
              verticalExaggeration={state.verticalExaggeration || 1}
              onChangeVerticalExaggeration={(ex: number) => handleUpdateState({ verticalExaggeration: ex })}
            />
          </div>
        </div>

        {/* Right Side Observation & Depth Profile Analysis Panel */}
        <RightAnalysisPanel
          selectedFloat={selectedFloat}
          selectedProbePoint={state.selectedProbePoint || null}
          onClose={() => handleUpdateState({ selectedFloatId: null })}
          onCloseProbe={() => handleUpdateState({ selectedProbePoint: null })}
          onSelectFloat={(id) => handleUpdateState({ selectedFloatId: id, selectedProbePoint: null })}
          allFloats={ARGO_FLOATS}
          state={state}
          onChangeDepth={(d: DepthLevel) => handleUpdateState({ depth: d })}
          onChangeVariable={(v: OceanVariable) =>
            handleUpdateState({
              variable: v,
              colormap: v === 'TEMP' ? 'thermal' : v === 'SAL' ? 'halite' : 'incois_rainbow',
            })
          }
          onOpenComparisonModal={() => setIsComparisonOpen(true)}
        />
      </div>

      {/* 3. BOTTOM 4D TIME ANIMATION & SCRUBBER TIMELINE */}
      <BottomTimeline
        state={state}
        onChangeTimeStep={(idx) => handleUpdateState({ timeStepIndex: idx })}
        onTogglePlay={() => handleUpdateState({ isPlaying: !state.isPlaying })}
        onChangeSpeed={(spd) => handleUpdateState({ playbackSpeed: spd })}
      />

      {/* 4. MODALS (EXPORT, METHODOLOGY, COMPARISON & PIPELINE) */}
      {isExportOpen && (
        <ExportModal
          state={state}
          onClose={() => setIsExportOpen(false)}
        />
      )}

      {isInfoOpen && (
        <ScientificInfoModal
          onClose={() => setIsInfoOpen(false)}
        />
      )}

      {isComparisonOpen && (
        <ModelObservationComparisonModal
          isOpen={isComparisonOpen}
          onClose={() => setIsComparisonOpen(false)}
          selectedFloatId={state.selectedFloatId}
          state={state}
          onChangeDepth={(d: DepthLevel) => handleUpdateState({ depth: d })}
          onChangeVariable={(v: OceanVariable) => handleUpdateState({ variable: v })}
          onSelectFloat={(id: string) => handleUpdateState({ selectedFloatId: id })}
        />
      )}

      {isPipelineOpen && (
        <DataPipelineModal
          isOpen={isPipelineOpen}
          onClose={() => setIsPipelineOpen(false)}
          state={state}
          onChangeState={handleUpdateState}
        />
      )}
    </div>
  );
}
