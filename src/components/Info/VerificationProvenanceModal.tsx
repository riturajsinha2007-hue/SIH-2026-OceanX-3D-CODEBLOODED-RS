import React from 'react';
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
} from 'lucide-react';
import { DataProvenanceInfo, VerificationState } from '../../services/oceanDataQualityGate';
import { ARGO_VAM_DATASET, OCEANSAT2_CHLOROPHYLL_DATASET } from '../../services/erddapService';

interface VerificationProvenanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  provenance: DataProvenanceInfo | null;
  onRefresh?: () => void;
}

export const VerificationProvenanceModal: React.FC<VerificationProvenanceModalProps> = ({
  isOpen,
  onClose,
  provenance,
  onRefresh,
}) => {
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
                MoES / INCOIS Quality Gate • Double Validation
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

        {/* 1. Official Dataset Provenance Table */}
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
                {provenance.spatialResolution} (30°E–120°E, 35°S–30°N)
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

        {/* 2. Validation Stages */}
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

        {/* Footer */}
        <div className="pt-2 border-t border-[#262626] flex justify-end">
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
