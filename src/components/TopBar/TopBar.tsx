import React from 'react';
import { VisualizationState } from '../../types/ocean';
import {
  Compass,
  Download,
  Info,
  Waves,
  ShieldCheck,
  Globe,
  Share2,
} from 'lucide-react';

interface TopBarProps {
  state: VisualizationState;
  onOpenExport: () => void;
  onOpenInfo: () => void;
  onToggleDebug?: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  state,
  onOpenExport,
  onOpenInfo,
  onToggleDebug,
}) => {
  return (
    <header
      id="top-bar"
      className="relative z-30 h-14 w-full bg-slate-900/95 backdrop-blur-xl border-b border-slate-700/60 px-4 flex items-center justify-between shadow-xl"
    >
      {/* Brand & Identity */}
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-500 text-white shadow-lg shadow-cyan-900/40">
          <Waves className="w-5 h-5" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-sm font-bold text-slate-100 tracking-wider">
              OceanX 3D
            </h1>
            <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-cyan-950 text-cyan-400 border border-cyan-800/80">
              MVP
            </span>
          </div>
          <p className="text-[10px] text-slate-400 hidden sm:block">
            Scientific Ocean Workspace • Ministry of Earth Sciences (MoES / INCOIS)
          </p>
        </div>
      </div>

      {/* Center: Live Dataset & ERDDAP Status */}
      <div className="hidden md:flex items-center gap-3 bg-slate-950/70 border border-slate-800 px-3.5 py-1.5 rounded-full shadow-inner">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-sm shadow-emerald-400" />
          <span className="text-xs font-mono font-semibold text-cyan-300">
            {state.variable === 'CHLA' ? 'incois_oceansat2_datasets' : 'incois_argo_mnt_VAM'}
          </span>
        </div>
        <span className="text-slate-600">•</span>
        <span className="text-xs font-semibold text-slate-200">
          {state.variable === 'TEMP' ? 'TEMP (°C)' : state.variable === 'SAL' ? 'SAL (PSU)' : 'CHL (mg/m³)'}
        </span>
        {state.variable !== 'CHLA' && (
          <>
            <span className="text-slate-600">•</span>
            <span className="text-xs font-mono font-bold text-amber-300">
              {state.depth}m
            </span>
          </>
        )}
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2">
        {onToggleDebug && (
          <button
            id="btn-toggle-debug-mode"
            onClick={onToggleDebug}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-mono font-semibold transition-all cursor-pointer border ${
              state.debugMode
                ? 'bg-amber-950 text-amber-300 border-amber-500 shadow-lg shadow-amber-950/50'
                : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300 border-slate-700'
            }`}
            title="Toggle Single Source of Truth Synchronization Audit Inspector"
          >
            <ShieldCheck className={`w-3.5 h-3.5 ${state.debugMode ? 'text-amber-400' : 'text-slate-400'}`} />
            <span className="hidden sm:inline">Sync Audit</span>
            <span className={`w-1.5 h-1.5 rounded-full ${state.debugMode ? 'bg-amber-400 animate-ping' : 'bg-emerald-400'}`} />
          </button>
        )}

        <button
          id="btn-open-export"
          onClick={onOpenExport}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 shadow-md transition-all cursor-pointer"
          title="Export Workspace or Dataset"
        >
          <Download className="w-3.5 h-3.5 text-cyan-400" />
          <span className="hidden sm:inline">Export</span>
        </button>

        <button
          id="btn-open-info"
          onClick={onOpenInfo}
          className="flex items-center gap-1.5 p-1.5 sm:px-3 sm:py-1.5 rounded-xl text-xs font-semibold bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-md transition-all cursor-pointer"
          title="Scientific Methodology & Provenance Guide"
        >
          <Info className="w-4 h-4 text-cyan-400" />
          <span className="hidden sm:inline">Methodology</span>
        </button>
      </div>
    </header>
  );
};
