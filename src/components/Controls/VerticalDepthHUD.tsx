/**
 * Vertical Depth Exploration HUD
 * Interactive vertical depth slider and sounder enabling seamless exploration
 * from the ocean surface down through the thermocline into abyssal layers (5m to 2000m).
 */

import React, { useState, useEffect, useRef } from 'react';
import { DepthLevel, OceanVariable } from '../../types/ocean';
import { ALL_STANDARD_DEPTHS } from '../../data/incoisDataset';
import { isSurfaceOnlyVariable } from '../../utils/scientificColormaps';
import {
  Layers,
  ChevronUp,
  ChevronDown,
  Play,
  Pause,
  Anchor,
  Compass,
  ArrowDown,
  Maximize2,
} from 'lucide-react';

interface VerticalDepthHUDProps {
  depth: DepthLevel;
  variable: OceanVariable;
  onChangeDepth: (depth: DepthLevel) => void;
  verticalExaggeration?: number;
  onChangeVerticalExaggeration?: (exaggeration: number) => void;
}

export const VerticalDepthHUD: React.FC<VerticalDepthHUDProps> = ({
  depth,
  variable,
  onChangeDepth,
  verticalExaggeration = 1,
  onChangeVerticalExaggeration,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const playIntervalRef = useRef<any>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  const currentIndex = ALL_STANDARD_DEPTHS.indexOf(depth);
  const safeIndex = currentIndex !== -1 ? currentIndex : 0;

  // Handle auto-depth scanning cycle
  useEffect(() => {
    if (isPlaying) {
      playIntervalRef.current = setInterval(() => {
        onChangeDepth((prevDepth: DepthLevel) => {
          const idx = ALL_STANDARD_DEPTHS.indexOf(prevDepth);
          const nextIdx = (idx + 1) % ALL_STANDARD_DEPTHS.length;
          return ALL_STANDARD_DEPTHS[nextIdx];
        });
      }, 1400);
    } else {
      if (playIntervalRef.current) {
        clearInterval(playIntervalRef.current);
      }
    }
    return () => {
      if (playIntervalRef.current) {
        clearInterval(playIntervalRef.current);
      }
    };
  }, [isPlaying, onChangeDepth]);

  // Stepping handlers
  const stepUp = () => {
    if (safeIndex > 0) {
      onChangeDepth(ALL_STANDARD_DEPTHS[safeIndex - 1]);
    }
  };

  const stepDown = () => {
    if (safeIndex < ALL_STANDARD_DEPTHS.length - 1) {
      onChangeDepth(ALL_STANDARD_DEPTHS[safeIndex + 1]);
    }
  };

  // Determine oceanographic zone name
  const getZoneInfo = (d: number) => {
    if (d <= 200) {
      return {
        name: 'Epipelagic (Sunlight Zone)',
        color: '#F5C518',
        desc: 'High light penetration, primary production & active mixing layer',
      };
    } else if (d <= 1000) {
      return {
        name: 'Mesopelagic (Twilight Zone)',
        color: '#38bdf8',
        desc: 'Rapid temperature drops through main thermocline',
      };
    } else {
      return {
        name: 'Bathypelagic (Midnight Zone)',
        color: '#818cf8',
        desc: 'Constant cold abyssal waters (1.5–3.0°C)',
      };
    }
  };

  const currentZone = getZoneInfo(depth);

  if (isSurfaceOnlyVariable(variable)) {
    const isSsh = variable === 'SSH';
    return (
      <div
        id="vertical-depth-hud"
        className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 bg-[#101010]/95 backdrop-blur-md border border-[#262626] rounded-full px-4 py-2 flex items-center gap-3 shadow-2xl text-xs select-none max-w-lg"
      >
        <span className={`w-2 h-2 rounded-full animate-pulse ${isSsh ? 'bg-[#38bdf8]' : 'bg-[#34d399]'}`} />
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[#F5F5F5] font-medium">
            {isSsh ? 'Radar Altimetry Sea Surface Height' : 'Oceansat-2 Radiometric Chlorophyll-a'}
          </span>
          <span className="text-[#666666]">·</span>
          <span className="text-[#A3A3A3]">Fixed Depth:</span>
          <span className="font-mono font-bold text-[#F5C518]">0m (Surface)</span>
          <span className="text-[10px] text-[#888888] bg-[#1a1a1a] px-2 py-0.5 rounded border border-[#2e2e2e]">
            Subsurface depth controls locked (Surface Sensor Product)
          </span>
        </div>
      </div>
    );
  }

  return (
    <div
      id="vertical-depth-hud"
      className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center select-none"
    >
      <div className="bg-[#101010]/92 backdrop-blur-md border border-[#262626] rounded-xl p-2.5 shadow-2xl flex flex-col gap-2 max-w-xl w-[92vw] sm:w-[500px] text-[#F5F5F5]">
        {/* Top Control Bar */}
        <div className="flex items-center justify-between text-xs">
          {/* Depth Label & Zone */}
          <div className="flex items-center gap-2">
            <div className="p-1 rounded bg-[#161616] border border-[#262626] text-[#F5C518]">
              <Layers className="w-3.5 h-3.5" />
            </div>
            <div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-[10px] text-[#A3A3A3] uppercase tracking-wider">Depth:</span>
                <span className="font-mono font-bold text-sm text-[#F5C518]">{depth} m</span>
                <span className="text-[10px] text-[#666666]">({safeIndex + 1}/{ALL_STANDARD_DEPTHS.length} levels)</span>
              </div>
              <div className="text-[10px] flex items-center gap-1" style={{ color: currentZone.color }}>
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: currentZone.color }} />
                <span>{currentZone.name}</span>
              </div>
            </div>
          </div>

          {/* Player & Step Buttons */}
          <div className="flex items-center gap-1 bg-[#161616] p-1 rounded-lg border border-[#262626]">
            <button
              onClick={stepUp}
              disabled={safeIndex === 0}
              className="p-1 rounded text-[#A3A3A3] hover:text-[#F5F5F5] disabled:opacity-30 disabled:hover:text-[#A3A3A3] transition-colors cursor-pointer"
              title="Step Shallower (Up)"
            >
              <ChevronUp className="w-4 h-4" />
            </button>

            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className={`p-1 rounded transition-colors cursor-pointer ${
                isPlaying
                  ? 'bg-[#F5C518] text-[#101010]'
                  : 'text-[#A3A3A3] hover:text-[#F5F5F5] hover:bg-[#202020]'
              }`}
              title={isPlaying ? 'Pause Depth Scan' : 'Auto-Scan Water Column'}
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </button>

            <button
              onClick={stepDown}
              disabled={safeIndex === ALL_STANDARD_DEPTHS.length - 1}
              className="p-1 rounded text-[#A3A3A3] hover:text-[#F5F5F5] disabled:opacity-30 disabled:hover:text-[#A3A3A3] transition-colors cursor-pointer"
              title="Step Deeper (Down)"
            >
              <ChevronDown className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Interactive Continuous Depth Scrubbing Slider */}
        <div className="space-y-1">
          <input
            id="interactive-depth-slider"
            type="range"
            min={0}
            max={ALL_STANDARD_DEPTHS.length - 1}
            step={1}
            value={safeIndex}
            onChange={(e) => {
              const idx = parseInt(e.target.value, 10);
              onChangeDepth(ALL_STANDARD_DEPTHS[idx]);
            }}
            className="w-full h-1.5 bg-[#202020] rounded-lg appearance-none cursor-pointer accent-[#F5C518]"
          />

          {/* Visual Stratification Markers */}
          <div className="flex justify-between text-[9px] font-mono text-[#666666] px-0.5">
            <span
              onClick={() => onChangeDepth(5)}
              className="hover:text-[#F5C518] cursor-pointer"
            >
              5m (Surface)
            </span>
            <span
              onClick={() => onChangeDepth(100)}
              className="hover:text-[#F5C518] cursor-pointer"
            >
              100m (Thermocline)
            </span>
            <span
              onClick={() => onChangeDepth(500)}
              className="hover:text-[#F5C518] cursor-pointer"
            >
              500m
            </span>
            <span
              onClick={() => onChangeDepth(1000)}
              className="hover:text-[#F5C518] cursor-pointer"
            >
              1000m (Intermediate)
            </span>
            <span
              onClick={() => onChangeDepth(2000)}
              className="hover:text-[#F5C518] cursor-pointer"
            >
              2000m (Abyssal)
            </span>
          </div>
        </div>

        {/* Quick Stratification Jump Pills */}
        <div className="flex items-center justify-between pt-0.5 border-t border-[#1f1f1f] text-[10px]">
          <div className="flex items-center gap-1 overflow-x-auto py-0.5 custom-scrollbar">
            {[
              { label: 'Surface', d: 5 },
              { label: 'Mixed Layer', d: 30 },
              { label: 'Thermocline', d: 100 },
              { label: 'Sub-thermocline', d: 200 },
              { label: 'Deep (500m)', d: 500 },
              { label: 'Abyssal (1000m)', d: 100 },
              { label: 'Floor (2000m)', d: 2000 },
            ].map((p) => (
              <button
                key={p.label}
                onClick={() => onChangeDepth(p.d as DepthLevel)}
                className={`px-1.5 py-0.5 rounded font-mono transition-colors cursor-pointer whitespace-nowrap ${
                  depth === p.d
                    ? 'bg-[#161616] text-[#F5C518] border border-[#F5C518]'
                    : 'bg-[#161616] text-[#A3A3A3] border border-[#262626] hover:text-[#F5F5F5]'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* 3D Vertical Exaggeration Quick Adjustment */}
          {onChangeVerticalExaggeration && (
            <div className="hidden sm:flex items-center gap-1 pl-2 shrink-0 border-l border-[#262626]">
              <span className="text-[10px] text-[#A3A3A3]">3D Z-Scale:</span>
              {[1, 10, 25, 50].map((scale) => (
                <button
                  key={scale}
                  onClick={() => onChangeVerticalExaggeration(scale)}
                  className={`px-1 py-0.2 rounded font-mono text-[9px] transition-colors cursor-pointer ${
                    verticalExaggeration === scale
                      ? 'bg-[#F5C518] text-[#101010] font-bold'
                      : 'text-[#A3A3A3] hover:text-[#F5F5F5]'
                  }`}
                  title={`${scale}x Vertical Exaggeration`}
                >
                  {scale}x
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
