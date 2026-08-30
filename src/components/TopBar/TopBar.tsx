import React from 'react';
import { VisualizationState } from '../../types/ocean';
import {
  Download,
  Info,
  Waves,
  ShieldCheck,
  Search,
  HelpCircle,
  Bell,
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
      className="relative z-30 h-13 w-full bg-[#101010] border-b border-[#262626] px-4 flex items-center justify-between shadow-sm select-none"
    >
      {/* Left: Brand & Main Navigation Tabs */}
      <div className="flex items-center gap-6">
        {/* Brand & Identity */}
        <div className="flex items-center gap-2.5">
          <div className="flex items-center justify-center w-7 h-7 rounded-md bg-[#161616] text-[#F5C518] border border-[#262626]">
            <Waves className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-semibold text-[#F5F5F5] tracking-tight">
                OceanX 3D
              </h1>
            </div>
            <p className="text-[10px] text-[#A3A3A3] leading-none">
              Scientific Ocean Workspace
            </p>
          </div>
        </div>

        {/* Navigation Tabs (Explore, Compare, Datasets, About) */}
        <nav className="hidden lg:flex items-center gap-1 text-xs">
          <button
            className="px-3 py-1.5 font-medium text-[#F5F5F5] border-b-2 border-[#F5C518] transition-colors cursor-pointer"
          >
            Explore
          </button>
          <button
            onClick={onOpenInfo}
            className="px-3 py-1.5 text-[#A3A3A3] hover:text-[#F5F5F5] transition-colors cursor-pointer"
          >
            Compare
          </button>
          <button
            onClick={onOpenInfo}
            className="px-3 py-1.5 text-[#A3A3A3] hover:text-[#F5F5F5] transition-colors cursor-pointer"
          >
            Datasets
          </button>
          <button
            onClick={onOpenInfo}
            className="px-3 py-1.5 text-[#A3A3A3] hover:text-[#F5F5F5] transition-colors cursor-pointer"
          >
            About
          </button>
        </nav>
      </div>

      {/* Center/Right: Quick Search Bar */}
      <div className="hidden md:flex items-center flex-1 max-w-xs mx-4">
        <div className="relative w-full">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#666666]" />
          <input
            type="text"
            readOnly
            onClick={onOpenInfo}
            placeholder="Search location, float, dataset..."
            className="w-full h-7.5 pl-8 pr-7 bg-[#161616] border border-[#262626] rounded-md text-xs text-[#F5F5F5] placeholder-[#666666] focus:outline-none focus:border-[#F5C518] cursor-pointer"
          />
          <kbd className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-mono text-[#666666] bg-[#101010] px-1 rounded border border-[#262626]">
            /
          </kbd>
        </div>
      </div>

      {/* Right: Actions & Modals */}
      <div className="flex items-center gap-2">
        {onToggleDebug && (
          <button
            id="btn-toggle-debug-mode"
            onClick={onToggleDebug}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-mono transition-colors cursor-pointer border ${
              state.debugMode
                ? 'bg-[#161616] text-[#F5C518] border-[#F5C518]'
                : 'bg-[#161616] hover:bg-[#1e1e1e] text-[#A3A3A3] hover:text-[#F5F5F5] border-[#262626]'
            }`}
            title="Toggle Single Source of Truth Synchronization Audit Inspector"
          >
            <ShieldCheck className={`w-3.5 h-3.5 ${state.debugMode ? 'text-[#F5C518]' : 'text-[#A3A3A3]'}`} />
            <span className="hidden sm:inline">Audit</span>
          </button>
        )}

        <button
          id="btn-open-export"
          onClick={onOpenExport}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs bg-[#161616] hover:bg-[#1e1e1e] text-[#A3A3A3] hover:text-[#F5F5F5] border border-[#262626] transition-colors cursor-pointer"
          title="Export Workspace or Dataset"
        >
          <Download className="w-3.5 h-3.5 text-[#F5C518]" />
          <span className="hidden sm:inline">Export</span>
        </button>

        <button
          id="btn-open-info"
          onClick={onOpenInfo}
          className="p-1.5 rounded-md text-[#A3A3A3] hover:text-[#F5F5F5] hover:bg-[#161616] border border-transparent hover:border-[#262626] transition-colors cursor-pointer"
          title="Scientific Methodology & Provenance Guide"
        >
          <HelpCircle className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
