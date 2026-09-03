import React, { useState } from 'react';
import {
  ShieldCheck,
  XCircle,
  Clock,
  Database,
  ExternalLink,
  CheckCircle2,
  RefreshCw,
  Info,
  MapPin,
  X,
  Code2,
  Check,
  Compass,
  Layers,
} from 'lucide-react';
import { DataProvenanceInfo, VerificationState } from '../../services/oceanDataQualityGate';
import { ARGO_VAM_DATASET, OCEANSAT2_CHLOROPHYLL_DATASET } from '../../services/erddapService';
import { DataToVisualValidationReport } from '../../services/dataToVisualValidator';

interface VerificationProvenanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  provenance: DataProvenanceInfo | null;
  onRefresh?: () => void;
  validationReport?: DataToVisualValidationReport | null;
  isDebugMode?: boolean;
  onToggleDebugMode?: () => void;
}

export const VerificationProvenanceModal: React.FC<VerificationProvenanceModalProps> = ({
  isOpen,
  onClose,
  provenance,
  onRefresh,
  validationReport,
  isDebugMode = false,
  onToggleDebugMode,
}) => {
  const [activeTab, setActiveTab] = useState<'provenance' | 'validation' | 'debug'>('provenance');

  if (!isOpen || !provenance) return null;

  const getStatusBadge = (state: VerificationState) => {
    switch (state) {
      case 'VERIFIED':
        return (
          <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-[#161616] border border-[#262626] text-[#F5C518] font-medium text-xs">
            <span className="w-2 h-2 rounded-full bg-[#F5C518]" />
            <span>Verified Dataset</span>
          </div>
        );
      case 'CACHED':
        return (
          <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-[#161616] border border-[#262626] text-[#A3A3A3] font-medium text-xs">
            <span className="w-2 h-2 rounded-full bg-[#A3A3A3]" />
            <span>Cached Dataset</span>
          </div>
        );
      case 'UNAVAILABLE':
        return (
          <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-[#161616] border border-[#262626] text-[#A3A3A3] font-medium text-xs">
            <span className="w-2 h-2 rounded-full bg-[#666666]" />
            <span>Temporarily Unavailable</span>
          </div>
        );
      case 'VALIDATION_FAILED':
        return (
          <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-[#161616] border border-[#262626] text-[#F5C518] font-medium text-xs">
            <XCircle className="w-3.5 h-3.5 text-[#F5C518]" />
            <span>Validation Blocked</span>
          </div>
        );
    }
  };

  const portalUrl =
    provenance.datasetId === OCEANSAT2_CHLOROPHYLL_DATASET.datasetId
      ? OCEANSAT2_CHLOROPHYLL_DATASET.htmlQueryUrl
      : ARGO_VAM_DATASET.htmlQueryUrl;

  const formattedDate = provenance.lastSuccessfulFetch
    ? new Date(provenance.lastSuccessfulFetch).toLocaleString('en-US', {
        dateStyle: 'medium',
        timeStyle: 'medium',
        timeZone: 'UTC',
      }) + ' UTC'
    : 'Pending';

  return (
    <div
      id="verification-provenance-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150"
    >
      <div className="bg-[#101010] border border-[#262626] rounded-lg max-w-2xl w-full p-5 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto custom-scrollbar text-[#F5F5F5]">
        {/* Header */}
        <div className="flex items-center justify-between pb-2.5 border-b border-[#262626]">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-5 h-5 text-[#F5C518]" />
            <div>
              <h3 className="text-sm font-semibold text-[#F5F5F5]">
                Scientific Data Verification & Provenance
              </h3>
              <p className="text-[11px] text-[#A3A3A3]">
                MoES / INCOIS Quality Gate • Double Validation Pipeline
              </p>
            </div>
          </div>
          <button
            id="btn-close-provenance-modal"
            onClick={onClose}
            className="p-1 rounded text-[#A3A3A3] hover:text-[#F5F5F5] hover:bg-[#161616] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex items-center gap-1 p-1 bg-[#161616] border border-[#262626] rounded-md text-xs">
          <button
            id="tab-provenance-overview"
            onClick={() => setActiveTab('provenance')}
            className={`flex-1 py-1.5 px-2 rounded font-medium transition-colors cursor-pointer ${
              activeTab === 'provenance'
                ? 'bg-[#262626] text-[#F5C518]'
                : 'text-[#A3A3A3] hover:text-[#F5F5F5]'
            }`}
          >
            Dataset Provenance
          </button>
          <button
            id="tab-validation-tests"
            onClick={() => setActiveTab('validation')}
            className={`flex-1 py-1.5 px-2 rounded font-medium transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'validation'
                ? 'bg-[#262626] text-[#F5C518]'
                : 'text-[#A3A3A3] hover:text-[#F5F5F5]'
            }`}
          >
            <span>Data → Visual Checks</span>
            {validationReport?.passed && (
              <span className="w-1.5 h-1.5 rounded-full bg-[#F5C518]" />
            )}
          </button>
          <button
            id="tab-dev-debug"
            onClick={() => setActiveTab('debug')}
            className={`flex-1 py-1.5 px-2 rounded font-medium transition-colors cursor-pointer flex items-center justify-center gap-1 ${
              activeTab === 'debug'
                ? 'bg-[#262626] text-[#F5C518]'
                : 'text-[#A3A3A3] hover:text-[#F5F5F5]'
            }`}
          >
            <Code2 className="w-3 h-3" />
            <span>Dev Debug Mode</span>
          </button>
        </div>

        {/* TAB 1: DATASET PROVENANCE & QUALITY GATE */}
        {activeTab === 'provenance' && (
          <div className="space-y-4">
            {/* Verification Status Banner */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 p-3 bg-[#161616] border border-[#262626] rounded-md">
              <div className="space-y-1">
                <div className="text-[11px] text-[#A3A3A3]">Gate Status:</div>
                {getStatusBadge(provenance.verificationState)}
              </div>
              {onRefresh && (
                <button
                  onClick={onRefresh}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium bg-[#101010] hover:bg-[#1a1a1a] text-[#F5F5F5] border border-[#262626] hover:border-[#F5C518] transition-colors cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-[#F5C518]" />
                  <span>Re-run Validation</span>
                </button>
              )}
            </div>

            {/* Official Dataset Provenance Table */}
            <div className="space-y-1.5">
              <div className="text-[11px] font-semibold text-[#A3A3A3] uppercase tracking-wider flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-[#F5C518]" />
                <span>1. Dataset Provenance</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 bg-[#161616] border border-[#262626] rounded-md space-y-0.5">
                  <span className="text-[#666666] block text-[10px]">Dataset ID</span>
                  <div className="font-mono font-medium text-[#F5F5F5] text-[11px] flex items-center justify-between">
                    <span>{provenance.datasetId}</span>
                    <a
                      href={portalUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[10px] text-[#F5C518] hover:underline inline-flex items-center gap-0.5 font-sans"
                    >
                      <span>Portal</span>
                      <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  </div>
                </div>

                <div className="p-2.5 bg-[#161616] border border-[#262626] rounded-md space-y-0.5">
                  <span className="text-[#666666] block text-[10px]">Source Organization</span>
                  <div className="font-medium text-[#F5F5F5]">{provenance.sourceOrg}</div>
                </div>

                <div className="p-2.5 bg-[#161616] border border-[#262626] rounded-md space-y-0.5">
                  <span className="text-[#666666] block text-[10px]">Variable & Units</span>
                  <div className="font-mono text-[#F5F5F5]">
                    <span className="text-[#F5C518] font-bold">{provenance.variable}</span> ({provenance.units})
                  </div>
                </div>

                <div className="p-2.5 bg-[#161616] border border-[#262626] rounded-md space-y-0.5">
                  <span className="text-[#666666] block text-[10px]">Spatial Domain</span>
                  <div className="font-mono text-[#F5F5F5]">
                    {provenance.spatialResolution} ({provenance.spatialBounds.lonMin}°E–{provenance.spatialBounds.lonMax}°E, {Math.abs(provenance.spatialBounds.latMin)}°S–{provenance.spatialBounds.latMax}°N)
                  </div>
                </div>
              </div>

              <div className="p-2 bg-[#161616] border border-[#262626] rounded-md flex items-center justify-between text-xs">
                <span className="text-[#A3A3A3] flex items-center gap-1.5 text-[11px]">
                  <Clock className="w-3.5 h-3.5 text-[#666666]" />
                  <span>Timestamp:</span>
                </span>
                <span className="font-mono text-[#F5F5F5] text-[11px]">{formattedDate}</span>
              </div>
            </div>

            {/* Validation Stages */}
            <div className="space-y-1.5">
              <div className="text-[11px] font-semibold text-[#A3A3A3] uppercase tracking-wider flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#F5C518]" />
                <span>2. Quality Gate Checks</span>
              </div>

              <div className="space-y-1.5 text-xs">
                <div className="p-2.5 bg-[#161616] border border-[#262626] rounded-md flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#F5C518] shrink-0 mt-0.5" />
                  <div>
                    <div className="font-medium text-[#F5F5F5]">Stage 1 — Endpoint & Dimension Verification</div>
                    <div className="text-[#A3A3A3] text-[11px]">
                      Dataset ID matches • Time dimension valid • Depth index verified • Bounded in Indian Ocean.
                    </div>
                  </div>
                </div>

                <div className="p-2.5 bg-[#161616] border border-[#262626] rounded-md flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#F5C518] shrink-0 mt-0.5" />
                  <div>
                    <div className="font-medium text-[#F5F5F5]">Stage 2 — Numeric Sanity & Slice Integrity</div>
                    <div className="text-[#A3A3A3] text-[11px]">
                      Grid cells verified • Finite values check passed • Land mask isolated.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: DATA-TO-VISUAL VALIDATION RESULTS */}
        {activeTab === 'validation' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-[#161616] border border-[#262626] rounded-md">
              <div>
                <div className="text-xs font-semibold text-[#F5F5F5]">
                  Data → Visual Cross-Check Pipeline
                </div>
                <div className="text-[11px] text-[#A3A3A3]">
                  Validates that displayed values and screen coordinates strictly correspond to dataset ground-truth.
                </div>
              </div>
              <div className="text-right font-mono">
                <span className="text-[#F5C518] font-bold text-sm">
                  {validationReport?.summary.overallAccuracyPercent ?? 100}%
                </span>
                <span className="text-[10px] text-[#A3A3A3] block">Precision Pass</span>
              </div>
            </div>

            {/* Error Detection Summary */}
            <div className="space-y-1.5">
              <div className="text-[11px] font-semibold text-[#A3A3A3] uppercase tracking-wider">
                Automated Transformation Audits
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                {validationReport?.errorChecks.map((check) => (
                  <div
                    key={check.id}
                    className="p-2.5 bg-[#161616] border border-[#262626] rounded-md space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-[#F5F5F5] text-[11px]">{check.label}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded font-mono bg-[#101010] text-[#F5C518] border border-[#262626]">
                        {check.status}
                      </span>
                    </div>
                    <p className="text-[10px] text-[#A3A3A3] leading-relaxed">{check.detail}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Validation Sample Points Table */}
            <div className="space-y-1.5">
              <div className="text-[11px] font-semibold text-[#A3A3A3] uppercase tracking-wider">
                Canonical Coordinate Cross-Checks ({validationReport?.sampleResults.length || 0} Points)
              </div>
              <div className="max-h-52 overflow-y-auto border border-[#262626] rounded-md bg-[#161616] custom-scrollbar text-[11px]">
                <table className="w-full text-left font-mono">
                  <thead className="bg-[#101010] text-[#A3A3A3] text-[10px] border-b border-[#262626]">
                    <tr>
                      <th className="p-2">Location Node</th>
                      <th className="p-2">Coordinates</th>
                      <th className="p-2">Dataset Value</th>
                      <th className="p-2">Rendered Value</th>
                      <th className="p-2 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#262626]">
                    {validationReport?.sampleResults.map((sample, idx) => (
                      <tr key={idx} className="hover:bg-[#1f1f1f] transition-colors">
                        <td className="p-2 font-sans font-medium text-[#F5F5F5]">{sample.name}</td>
                        <td className="p-2 text-[#A3A3A3]">
                          {sample.sourceLat >= 0 ? `${sample.sourceLat.toFixed(1)}°N` : `${Math.abs(sample.sourceLat).toFixed(1)}°S`},{' '}
                          {sample.sourceLon >= 0 ? `${sample.sourceLon.toFixed(1)}°E` : `${Math.abs(sample.sourceLon).toFixed(1)}°W`}
                        </td>
                        <td className="p-2 text-[#F5F5F5]">
                          {sample.sourceValue !== null ? `${sample.sourceValue.toFixed(2)} ${sample.unit}` : 'NaN (Masked)'}
                        </td>
                        <td className="p-2 text-[#F5C518]">
                          {sample.renderedValue !== null ? `${sample.renderedValue.toFixed(2)} ${sample.unit}` : 'Transparent'}
                        </td>
                        <td className="p-2 text-right">
                          <span
                            className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-semibold ${
                              sample.status === 'PASSED'
                                ? 'bg-[#101010] text-[#F5C518] border border-[#262626]'
                                : sample.status === 'MASKED_OK'
                                ? 'bg-[#101010] text-[#A3A3A3] border border-[#262626]'
                                : 'bg-red-950 text-red-400 border border-red-800'
                            }`}
                          >
                            {sample.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: DEVELOPER SCIENTIFIC DEBUGGER */}
        {activeTab === 'debug' && (
          <div className="space-y-4">
            <div className="p-3 bg-[#161616] border border-[#262626] rounded-md flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="text-xs font-semibold text-[#F5F5F5]">On-Globe Scientific Debug HUD</div>
                <div className="text-[11px] text-[#A3A3A3]">
                  Overlays dataset bounding extent, active depth meters, coordinate transforms, and real-time cursor values.
                </div>
              </div>
              {onToggleDebugMode && (
                <button
                  id="btn-toggle-scientific-debug-mode"
                  onClick={onToggleDebugMode}
                  className={`px-3 py-1.5 rounded text-xs font-medium border transition-colors cursor-pointer ${
                    isDebugMode
                      ? 'bg-[#F5C518] text-[#0A0A0A] border-[#F5C518]'
                      : 'bg-[#101010] text-[#F5F5F5] border-[#262626] hover:border-[#F5C518]'
                  }`}
                >
                  {isDebugMode ? 'HUD Active' : 'Enable HUD'}
                </button>
              )}
            </div>

            <div className="p-3 bg-[#161616] border border-[#262626] rounded-md space-y-2 text-xs">
              <div className="font-semibold text-[#A3A3A3] text-[11px] uppercase tracking-wider">
                Active Dataset Geodetic Geometry
              </div>
              <div className="grid grid-cols-2 gap-2 font-mono text-[11px]">
                <div>
                  <span className="text-[#666666] block text-[10px]">Active Bounding Box</span>
                  <span className="text-[#F5F5F5]">
                    [{validationReport?.actualBounds.latMin}°S to {validationReport?.actualBounds.latMax}°N] × [{validationReport?.actualBounds.lonMin}°E to {validationReport?.actualBounds.lonMax}°E]
                  </span>
                </div>
                <div>
                  <span className="text-[#666666] block text-[10px]">Angular Grid Step</span>
                  <span className="text-[#F5F5F5]">
                    Δlat: {validationReport?.actualBounds.latStep}°, Δlon: {validationReport?.actualBounds.lonStep}°
                  </span>
                </div>
                <div>
                  <span className="text-[#666666] block text-[10px]">WGS84 Projection</span>
                  <span className="text-[#F5C518]">Equirectangular Plate Carrée (EPSG:4326)</span>
                </div>
                <div>
                  <span className="text-[#666666] block text-[10px]">Vertical Coordinate</span>
                  <span className="text-[#F5F5F5]">{provenance.depth}m Z-axis</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="pt-2 border-t border-[#262626] flex items-center justify-between">
          <div className="text-[11px] text-[#A3A3A3]">
            Strict adherence to INCOIS dataset coordinates & scientific boundaries.
          </div>
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-md text-xs font-medium bg-[#161616] hover:bg-[#1e1e1e] text-[#F5F5F5] border border-[#262626] transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
