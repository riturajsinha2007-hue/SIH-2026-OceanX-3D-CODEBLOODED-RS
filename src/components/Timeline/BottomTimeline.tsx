import React, { useEffect, useMemo, useState } from 'react';
import { getTimeStepsForVariable, isChlorophyllDateValid } from '../../data/incoisDataset';
import { VisualizationState } from '../../types/ocean';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Clock,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Database,
  CheckCircle2,
} from 'lucide-react';

interface BottomTimelineProps {
  state: VisualizationState;
  onChangeTimeStep: (index: number) => void;
  onTogglePlay: () => void;
  onChangeSpeed: (speed: number) => void;
}

export const BottomTimeline: React.FC<BottomTimelineProps> = ({
  state,
  onChangeTimeStep,
  onTogglePlay,
  onChangeSpeed,
}) => {
  const activeTimeSteps = useMemo(() => {
    return getTimeStepsForVariable(state.variable);
  }, [state.variable]);

  const safeIndex = Math.min(state.timeStepIndex, Math.max(0, activeTimeSteps.length - 1));
  const currentStep = activeTimeSteps[safeIndex] || activeTimeSteps[0] || {
    index: 0,
    dateStr: '2013-03-15',
    cycleId: 'OCM2-20130315',
    seasonLabel: 'Ocean Color Observation',
  };

  const isChlorophyll = state.variable === 'CHLA';
  const hasValidData = isChlorophyll ? isChlorophyllDateValid(currentStep.dateStr) : true;

  // Available mission years
  const oceansatYears = ['2011', '2012', '2013', '2014', '2015', '2016', '2017', '2018', '2019', '2020'];
  const argoYears = ['2004', '2008', '2012', '2016', '2020', '2023', '2024', '2026'];
  const currentYear = currentStep.dateStr.split('-')[0];

  // Playback timer effect
  useEffect(() => {
    if (!state.isPlaying) return;

    // Timestep animation: adjust interval based on dataset density
    const baseInterval = isChlorophyll ? 200 : 1200;
    const intervalMs = Math.max(50, Math.round(baseInterval / state.playbackSpeed));

    const timer = setInterval(() => {
      onChangeTimeStep((safeIndex + 1) % activeTimeSteps.length);
    }, intervalMs);

    return () => clearInterval(timer);
  }, [state.isPlaying, safeIndex, activeTimeSteps.length, state.playbackSpeed, onChangeTimeStep, isChlorophyll]);

  const handlePrev = (stepCount = 1) => {
    const prev = Math.max(0, safeIndex - stepCount);
    onChangeTimeStep(prev);
  };

  const handleNext = (stepCount = 1) => {
    const next = Math.min(activeTimeSteps.length - 1, safeIndex + stepCount);
    onChangeTimeStep(next);
  };

  const handleJumpToYear = (year: string) => {
    const foundIdx = activeTimeSteps.findIndex((s) => s.dateStr.startsWith(year));
    if (foundIdx !== -1) {
      onChangeTimeStep(foundIdx);
    }
  };

  const handleDateInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const targetDate = e.target.value;
    if (!targetDate) return;
    const foundIdx = activeTimeSteps.findIndex((s) => s.dateStr === targetDate);
    if (foundIdx !== -1) {
      onChangeTimeStep(foundIdx);
    } else {
      // Find closest date in dataset
      let closestIdx = 0;
      let minDiff = Infinity;
      const targetTime = new Date(targetDate).getTime();
      activeTimeSteps.forEach((s, idx) => {
        const diff = Math.abs(new Date(s.dateStr).getTime() - targetTime);
        if (diff < minDiff) {
          minDiff = diff;
          closestIdx = idx;
        }
      });
      onChangeTimeStep(closestIdx);
    }
  };

  // Generate readable tick labels for scrubber
  const timelineTicks = useMemo(() => {
    if (activeTimeSteps.length <= 16) {
      return activeTimeSteps.map((step, idx) => ({
        index: idx,
        label: step.dateStr.slice(5),
        isMajor: true,
      }));
    }

    // For multi-year datasets (Oceansat-2 3377 days or ARGO VAM 271 months), generate keyframe year ticks
    const ticks: Array<{ index: number; label: string; isMajor: boolean }> = [];
    let lastYear = '';
    activeTimeSteps.forEach((step, idx) => {
      const year = step.dateStr.split('-')[0];
      if (year !== lastYear) {
        // For ARGO VAM (22 years), show even years or milestone years to prevent crowding
        if (isChlorophyll || parseInt(year, 10) % 2 === 0 || year === '2026') {
          ticks.push({
            index: idx,
            label: year,
            isMajor: true,
          });
        }
        lastYear = year;
      }
    });
    return ticks;
  }, [isChlorophyll, activeTimeSteps]);

  return (
    <div
      id="bottom-timeline"
      className="relative z-20 w-full bg-slate-900/95 backdrop-blur-xl border-t border-slate-700/70 px-3 py-2 shadow-2xl flex flex-col gap-1.5"
    >
      {/* Top Row: Year Quick Selector + Time Metadata Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2">
          {/* Playback Controls */}
          <div className="flex items-center gap-1">
            <button
              id="btn-timeline-prev-large"
              onClick={() => handlePrev(isChlorophyll ? 30 : 12)}
              className="p-1 rounded bg-slate-800 text-slate-300 hover:text-cyan-400 hover:bg-slate-700 transition-colors border border-slate-700 cursor-pointer"
              title={isChlorophyll ? 'Rewind 1 Month (30 Days)' : 'Rewind 1 Year (12 Months)'}
            >
              <SkipBack className="w-3.5 h-3.5" />
            </button>

            <button
              id="btn-timeline-prev"
              onClick={() => handlePrev(1)}
              className="p-1 rounded bg-slate-800 text-slate-300 hover:text-cyan-400 hover:bg-slate-700 transition-colors border border-slate-700 cursor-pointer"
              title={isChlorophyll ? 'Previous Day' : 'Previous Month'}
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>

            <button
              id="btn-timeline-play-pause"
              onClick={onTogglePlay}
              className={`flex items-center justify-center px-2.5 py-1 rounded-lg font-semibold text-xs transition-all shadow cursor-pointer ${
                state.isPlaying
                  ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-950/60'
                  : 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-cyan-950/60'
              }`}
              title={state.isPlaying ? 'Pause Timeline' : 'Play 4D Ocean Animation'}
            >
              {state.isPlaying ? (
                <div className="flex items-center gap-1">
                  <Pause className="w-3.5 h-3.5 fill-current" />
                  <span className="text-[11px]">Pause</span>
                </div>
              ) : (
                <div className="flex items-center gap-1">
                  <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                  <span className="text-[11px]">Play 4D</span>
                </div>
              )}
            </button>

            <button
              id="btn-timeline-next"
              onClick={() => handleNext(1)}
              className="p-1 rounded bg-slate-800 text-slate-300 hover:text-cyan-400 hover:bg-slate-700 transition-colors border border-slate-700 cursor-pointer"
              title={isChlorophyll ? 'Next Day' : 'Next Month'}
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>

            <button
              id="btn-timeline-next-large"
              onClick={() => handleNext(isChlorophyll ? 30 : 12)}
              className="p-1 rounded bg-slate-800 text-slate-300 hover:text-cyan-400 hover:bg-slate-700 transition-colors border border-slate-700 cursor-pointer"
              title={isChlorophyll ? 'Forward 1 Month (30 Days)' : 'Forward 1 Year (12 Months)'}
            >
              <SkipForward className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Speed Multiplier Toggle */}
          <div className="flex items-center bg-slate-950/80 rounded-md p-0.5 border border-slate-800">
            {[1, 2, 5, 10].map((spd) => (
              <button
                key={spd}
                id={`btn-speed-${spd}x`}
                onClick={() => onChangeSpeed(spd)}
                className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold transition-all cursor-pointer ${
                  state.playbackSpeed === spd
                    ? 'bg-cyan-500/25 text-cyan-300 border border-cyan-500/50'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {spd}×
              </button>
            ))}
          </div>

          {/* Dynamic Year Quick Jump Bar */}
          <div className="hidden xl:flex items-center gap-1 bg-slate-950/90 rounded-lg p-0.5 border border-slate-800 ml-2">
            <span className={`text-[10px] font-mono px-1.5 ${isChlorophyll ? 'text-emerald-400' : 'text-cyan-400'}`}>
              ERDDAP Year:
            </span>
            {(isChlorophyll ? oceansatYears : argoYears).map((yr) => (
              <button
                key={yr}
                id={`btn-jump-year-${yr}`}
                onClick={() => handleJumpToYear(yr)}
                className={`px-1.5 py-0.5 rounded text-[10px] font-mono transition-colors cursor-pointer ${
                  currentYear === yr
                    ? isChlorophyll
                      ? 'bg-emerald-500 text-slate-950 font-bold shadow-sm'
                      : 'bg-cyan-500 text-slate-950 font-bold shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                {yr}
              </button>
            ))}
          </div>
        </div>

        {/* Current Date, Cycle, and ERDDAP Direct Calendar Input */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-950/80 border border-slate-800 px-2.5 py-1 rounded-lg">
            <Calendar className={`w-3.5 h-3.5 ${isChlorophyll ? 'text-emerald-400' : 'text-cyan-400'}`} />
            <span className="font-mono font-semibold text-slate-100 text-xs">{currentStep.dateStr}</span>
            <span className="text-[10px] font-mono text-slate-400">({currentStep.cycleId})</span>

            {/* Direct Native Date Picker for Full Dataset Range */}
            <input
              id="timeline-direct-datepicker"
              type="date"
              min={isChlorophyll ? '2011-02-02' : '2004-01-15'}
              max={isChlorophyll ? '2020-05-01' : '2026-07-15'}
              value={currentStep.dateStr}
              onChange={handleDateInputChange}
              className={`bg-slate-900 border text-[10px] font-mono rounded px-1.5 py-0.5 focus:outline-none cursor-pointer ml-1 ${
                isChlorophyll
                  ? 'text-emerald-300 border-emerald-700/60 focus:border-emerald-400'
                  : 'text-cyan-300 border-cyan-700/60 focus:border-cyan-400'
              }`}
              title={`Directly select any date in the ${isChlorophyll ? '2011-02-02 → 2020-05-01' : '2004-01-15 → 2026-07-15'} ERDDAP dataset range`}
            />
          </div>

          <div className="hidden sm:flex items-center gap-1.5">
            <span className="text-[11px] text-amber-300 font-medium">{currentStep.seasonLabel}</span>
          </div>

          <div className="hidden md:flex items-center gap-1 text-[10px] font-mono text-slate-400 bg-slate-950/60 px-2 py-0.5 rounded border border-slate-800">
            <Database className="w-3 h-3 text-cyan-400" />
            <span>
              {isChlorophyll
                ? `Daily Step ${safeIndex + 1} of ${activeTimeSteps.length.toLocaleString()}`
                : `Month ${safeIndex + 1} of ${activeTimeSteps.length.toLocaleString()} (2004–2026)`}
            </span>
          </div>
        </div>
      </div>

      {/* Center: Full-Resolution Scrubber Slider */}
      <div className="w-full flex flex-col justify-center space-y-0.5">
        <input
          id="timeline-scrubber-slider"
          type="range"
          min={0}
          max={Math.max(0, activeTimeSteps.length - 1)}
          step={1}
          value={safeIndex}
          onChange={(e) => onChangeTimeStep(parseInt(e.target.value, 10))}
          className={`w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer transition-all ${
            isChlorophyll
              ? 'accent-emerald-400 hover:accent-emerald-300'
              : 'accent-cyan-400 hover:accent-cyan-300'
          }`}
        />

        {/* Dynamic Keyframe Tick Markers */}
        <div className="flex justify-between text-[9px] font-mono text-slate-400 px-1 pt-0.5">
          {timelineTicks.map((tick) => (
            <span
              key={`${tick.label}-${tick.index}`}
              onClick={() => onChangeTimeStep(tick.index)}
              className={`cursor-pointer transition-colors ${
                Math.abs(safeIndex - tick.index) <= (isChlorophyll ? 180 : 6)
                  ? 'text-cyan-300 font-bold'
                  : 'hover:text-slate-200'
              }`}
            >
              {tick.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};

