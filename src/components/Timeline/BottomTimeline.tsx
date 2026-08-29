import React, { useEffect, useMemo, useState, useRef } from 'react';
import { getTimeStepsForVariable } from '../../data/incoisDataset';
import { VisualizationState } from '../../types/ocean';
import {
  downloadCurrentTimeStepCsv,
  downloadEntireTimelineSeriesCsv,
} from '../../services/timelineExportService';
import { downloadArgoCsv } from '../../services/argoCsvStore';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Download,
  FileSpreadsheet,
  ChevronUp,
  Layers,
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
  const [isDownloadMenuOpen, setIsDownloadMenuOpen] = useState(false);
  const downloadMenuRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (downloadMenuRef.current && !downloadMenuRef.current.contains(event.target as Node)) {
        setIsDownloadMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const activeTimeSteps = useMemo(() => {
    return getTimeStepsForVariable(state.variable);
  }, [state.variable]);

  const safeIndex = Math.min(state.timeStepIndex, Math.max(0, activeTimeSteps.length - 1));
  const currentStep = activeTimeSteps[safeIndex] || activeTimeSteps[0] || {
    index: 0,
    dateStr: '2025-05-15',
    cycleId: 'ARGO-20250515',
    seasonLabel: 'Pre-Monsoon Season',
  };

  const isChlorophyll = state.variable === 'CHLA';

  // Playback timer effect
  useEffect(() => {
    if (!state.isPlaying) return;

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

  const handleDateInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const targetDate = e.target.value;
    if (!targetDate) return;
    const foundIdx = activeTimeSteps.findIndex((s) => s.dateStr === targetDate);
    if (foundIdx !== -1) {
      onChangeTimeStep(foundIdx);
    } else {
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

    const ticks: Array<{ index: number; label: string; isMajor: boolean }> = [];
    let lastYear = '';
    activeTimeSteps.forEach((step, idx) => {
      const year = step.dateStr.split('-')[0];
      if (year !== lastYear) {
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
      className="relative z-20 w-full bg-[#101010] border-t border-[#262626] px-4 py-2 shadow-sm flex flex-col gap-1.5 select-none"
    >
      {/* Top Row: Playback Controls + Quick Presets + Date Information */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-3">
          {/* Playback Controls */}
          <div className="flex items-center gap-1">
            <button
              id="btn-timeline-prev-large"
              onClick={() => handlePrev(isChlorophyll ? 30 : 12)}
              className="p-1.5 rounded bg-[#161616] text-[#A3A3A3] hover:text-[#F5F5F5] hover:border-[#404040] transition-colors border border-[#262626] cursor-pointer"
              title={isChlorophyll ? 'Rewind 1 Month (30 Days)' : 'Rewind 1 Year (12 Months)'}
            >
              <SkipBack className="w-3.5 h-3.5" />
            </button>

            <button
              id="btn-timeline-prev"
              onClick={() => handlePrev(1)}
              className="p-1.5 rounded bg-[#161616] text-[#A3A3A3] hover:text-[#F5F5F5] hover:border-[#404040] transition-colors border border-[#262626] cursor-pointer"
              title={isChlorophyll ? 'Previous Day' : 'Previous Month'}
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>

            <button
              id="btn-timeline-play-pause"
              onClick={onTogglePlay}
              className={`flex items-center justify-center px-3 py-1.5 rounded font-medium text-xs transition-colors cursor-pointer border ${
                state.isPlaying
                  ? 'bg-[#F5C518] text-[#080808] border-[#F5C518]'
                  : 'bg-[#161616] hover:bg-[#1f1f1f] text-[#F5F5F5] border-[#262626] hover:border-[#F5C518]'
              }`}
              title={state.isPlaying ? 'Pause Timeline' : 'Play 4D Ocean Animation'}
            >
              {state.isPlaying ? (
                <div className="flex items-center gap-1.5">
                  <Pause className="w-3.5 h-3.5 fill-current" />
                  <span>Pause</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5">
                  <Play className="w-3.5 h-3.5 fill-current ml-0.5 text-[#F5C518]" />
                  <span>Play</span>
                </div>
              )}
            </button>

            <button
              id="btn-timeline-next"
              onClick={() => handleNext(1)}
              className="p-1.5 rounded bg-[#161616] text-[#A3A3A3] hover:text-[#F5F5F5] hover:border-[#404040] transition-colors border border-[#262626] cursor-pointer"
              title={isChlorophyll ? 'Next Day' : 'Next Month'}
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>

            <button
              id="btn-timeline-next-large"
              onClick={() => handleNext(isChlorophyll ? 30 : 12)}
              className="p-1.5 rounded bg-[#161616] text-[#A3A3A3] hover:text-[#F5F5F5] hover:border-[#404040] transition-colors border border-[#262626] cursor-pointer"
              title={isChlorophyll ? 'Forward 1 Month (30 Days)' : 'Forward 1 Year (12 Months)'}
            >
              <SkipForward className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Speed Multiplier Toggle */}
          <div className="flex items-center bg-[#161616] rounded p-0.5 border border-[#262626]">
            {[1, 2, 5, 10].map((spd) => (
              <button
                key={spd}
                id={`btn-speed-${spd}x`}
                onClick={() => onChangeSpeed(spd)}
                className={`px-1.5 py-0.5 rounded text-[10px] font-mono transition-colors cursor-pointer ${
                  state.playbackSpeed === spd
                    ? 'bg-[#101010] text-[#F5C518] border border-[#F5C518] font-medium'
                    : 'text-[#A3A3A3] hover:text-[#F5F5F5]'
                }`}
              >
                {spd}x
              </button>
            ))}
          </div>

          {/* Timeline Range Indicator */}
          <div className="hidden lg:flex items-center gap-1.5 text-xs text-[#A3A3A3] border-l border-[#262626] pl-3">
            <span className="text-[11px] font-semibold text-[#A3A3A3] uppercase tracking-wider">
              Time Timeline
            </span>
          </div>
        </div>

        {/* Current Date, Native Date Picker, and CSV Export Popover */}
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-2 bg-[#161616] border border-[#262626] px-2.5 py-1 rounded">
            <Calendar className="w-3.5 h-3.5 text-[#F5C518]" />
            <span className="font-mono font-medium text-[#F5F5F5] text-xs">{currentStep.dateStr}</span>

            {/* Direct Native Date Picker */}
            <input
              id="timeline-direct-datepicker"
              type="date"
              min={isChlorophyll ? '2011-02-02' : '2004-01-15'}
              max={isChlorophyll ? '2020-05-01' : '2026-07-15'}
              value={currentStep.dateStr}
              onChange={handleDateInputChange}
              className="bg-[#101010] border border-[#262626] text-[10px] font-mono text-[#F5F5F5] rounded px-1 py-0.5 focus:outline-none focus:border-[#F5C518] cursor-pointer ml-1"
              title="Select specific date"
            />
          </div>

          {/* Download Timeline Data Button & Dropdown */}
          <div className="relative" ref={downloadMenuRef}>
            <div className="flex items-center rounded bg-[#161616] border border-[#262626] hover:border-[#404040] overflow-hidden">
              <button
                id="btn-download-current-step"
                onClick={() => downloadCurrentTimeStepCsv(state)}
                title="Download CSV for current active timeline step and depth layer"
                className="px-2.5 py-1 text-xs font-medium text-[#F5F5F5] hover:text-[#F5C518] transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-[#F5C518]" />
                <span className="hidden sm:inline">CSV Slice</span>
              </button>

              <button
                id="btn-toggle-download-menu"
                onClick={() => setIsDownloadMenuOpen(!isDownloadMenuOpen)}
                title="View All Timeline Export Options"
                className="px-1.5 py-1 border-l border-[#262626] hover:bg-[#1f1f1f] text-[#A3A3A3] hover:text-[#F5F5F5] transition-colors cursor-pointer"
              >
                <ChevronUp className={`w-3.5 h-3.5 transition-transform ${isDownloadMenuOpen ? 'rotate-180' : ''}`} />
              </button>
            </div>

            {/* Export Dropdown Popover */}
            {isDownloadMenuOpen && (
              <div
                id="timeline-export-dropdown"
                className="absolute bottom-full right-0 mb-2 w-72 bg-[#161616] border border-[#262626] rounded-md p-2.5 shadow-2xl z-50 text-xs space-y-2"
              >
                <div className="flex items-center justify-between border-b border-[#262626] pb-1.5">
                  <div className="flex items-center gap-1.5 text-[#F5F5F5] font-semibold">
                    <FileSpreadsheet className="w-4 h-4 text-[#F5C518]" />
                    <span>Download Data</span>
                  </div>
                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-[#101010] text-[#A3A3A3] border border-[#262626]">
                    CSV
                  </span>
                </div>

                <div className="space-y-1">
                  {/* Option 1: Current Date & Depth */}
                  <button
                    id="btn-export-step-csv"
                    onClick={() => {
                      downloadCurrentTimeStepCsv(state);
                      setIsDownloadMenuOpen(false);
                    }}
                    className="w-full text-left p-2 rounded bg-[#101010] hover:bg-[#1a1a1a] border border-[#262626] hover:border-[#F5C518] transition-colors flex items-start gap-2 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5 text-[#F5C518] mt-0.5 shrink-0" />
                    <div>
                      <div className="font-medium text-[#F5F5F5]">
                        Current Time Slice ({currentStep.dateStr})
                      </div>
                      <div className="text-[10px] text-[#666666]">
                        Gridded points + in-situ floats for {state.variable} at {state.depth}m.
                      </div>
                    </div>
                  </button>

                  {/* Option 2: Entire Multi-Year Series */}
                  <button
                    id="btn-export-entire-timeline-csv"
                    onClick={() => {
                      downloadEntireTimelineSeriesCsv(state);
                      setIsDownloadMenuOpen(false);
                    }}
                    className="w-full text-left p-2 rounded bg-[#101010] hover:bg-[#1a1a1a] border border-[#262626] hover:border-[#F5C518] transition-colors flex items-start gap-2 cursor-pointer"
                  >
                    <Calendar className="w-3.5 h-3.5 text-[#F5C518] mt-0.5 shrink-0" />
                    <div>
                      <div className="font-medium text-[#F5F5F5]">
                        Entire Timeline Series ({isChlorophyll ? '2011–2020' : '2004–2026'})
                      </div>
                      <div className="text-[10px] text-[#666666]">
                        All {activeTimeSteps.length} temporal records.
                      </div>
                    </div>
                  </button>

                  {/* Option 3: Full Argo Float In-Situ Array */}
                  <button
                    id="btn-export-argo-array-csv"
                    onClick={() => {
                      downloadArgoCsv();
                      setIsDownloadMenuOpen(false);
                    }}
                    className="w-full text-left p-2 rounded bg-[#101010] hover:bg-[#1a1a1a] border border-[#262626] hover:border-[#F5C518] transition-colors flex items-start gap-2 cursor-pointer"
                  >
                    <Layers className="w-3.5 h-3.5 text-[#F5C518] mt-0.5 shrink-0" />
                    <div>
                      <div className="font-medium text-[#F5F5F5]">
                        Full Argo Float Array (CSV)
                      </div>
                      <div className="text-[10px] text-[#666666]">
                        25 WMO platforms with full 5m to 2000m profiles.
                      </div>
                    </div>
                  </button>
                </div>
              </div>
            )}
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
          className="w-full h-1.5 bg-[#262626] rounded appearance-none cursor-pointer accent-[#F5C518]"
        />

        {/* Keyframe Tick Markers */}
        <div className="flex justify-between text-[9px] font-mono text-[#666666] px-1 pt-0.5">
          {timelineTicks.map((tick) => (
            <span
              key={`${tick.label}-${tick.index}`}
              onClick={() => onChangeTimeStep(tick.index)}
              className={`cursor-pointer transition-colors ${
                Math.abs(safeIndex - tick.index) <= (isChlorophyll ? 180 : 6)
                  ? 'text-[#F5C518] font-bold border-b border-[#F5C518]'
                  : 'hover:text-[#A3A3A3]'
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
