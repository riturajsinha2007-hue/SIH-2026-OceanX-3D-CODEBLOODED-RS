import React from 'react';
import { X, Layers, Activity, Database, Waves, Leaf, ExternalLink } from 'lucide-react';

interface ScientificInfoModalProps {
  onClose: () => void;
}

export const ScientificInfoModal: React.FC<ScientificInfoModalProps> = ({ onClose }) => {
  return (
    <div
      id="scientific-info-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150"
    >
      <div className="bg-[#101010] border border-[#262626] rounded-lg max-w-2xl w-full p-5 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto custom-scrollbar text-[#F5F5F5]">
        {/* Header */}
        <div className="flex items-center justify-between pb-2.5 border-b border-[#262626]">
          <div className="flex items-center gap-2.5">
            <Waves className="w-4 h-4 text-[#F5C518]" />
            <div>
              <h3 className="text-sm font-semibold text-[#F5F5F5]">
                OceanX 3D — Scientific Architecture & Methodology
              </h3>
              <p className="text-[11px] text-[#A3A3A3]">
                MoES / INCOIS Ocean Workspace • IRS OCM Satellite & Argo In-Situ
              </p>
            </div>
          </div>
          <button
            id="btn-close-info-modal"
            onClick={onClose}
            className="p-1 rounded text-[#A3A3A3] hover:text-[#F5F5F5] hover:bg-[#161616] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content sections */}
        <div className="space-y-3 text-xs text-[#A3A3A3] leading-relaxed">
          {/* Section 1: Scientific Pipeline */}
          <div className="bg-[#161616] p-3.5 rounded-md border border-[#262626] space-y-2">
            <div className="flex items-center gap-2 text-[#F5F5F5] font-semibold text-xs">
              <Layers className="w-3.5 h-3.5 text-[#F5C518]" />
              <span>1. Numerical Ocean Field & Depth-Slice Raster Pipeline</span>
            </div>
            <p>
              OceanX 3D ingests multidimensional ocean model fields and satellite ocean color products from the INCOIS ERDDAP services, rendered using an edge-feathered raster engine that seamlessly blends coastal boundaries into the basemap:
            </p>
            <ul className="list-disc list-inside space-y-1 pl-1 text-[11px]">
              <li>
                <a
                  href="https://erddap.incois.gov.in/erddap/griddap/incois_argo_mnt_VAM.html"
                  target="_blank"
                  rel="noreferrer"
                  className="font-mono text-[#F5C518] hover:underline inline-flex items-center gap-1"
                >
                  <span>incois_argo_mnt_VAM</span>
                  <ExternalLink className="w-2.5 h-2.5" />
                </a>
                : Multi-depth temperature & salinity fields across standard oceanographic vertical levels (5m, 50m, 100m, 200m, 500m, 1000m, 2000m).
              </li>
              <li>
                <a
                  href="https://erddap.incois.gov.in/erddap/griddap/incois_oceansat2_datasets.html"
                  target="_blank"
                  rel="noreferrer"
                  className="font-mono text-[#F5C518] hover:underline inline-flex items-center gap-1"
                >
                  <span>incois_oceansat2_datasets</span>
                  <ExternalLink className="w-2.5 h-2.5" />
                </a>
                : INCOIS Oceansat-2 (OCM-2) Ocean Color Monitor data (CHL variable: 0.03 – 30.0 mg/m³ log scale).
              </li>
            </ul>
          </div>

          {/* Section 2: Chlorophyll-a Satellite ERDDAP Dataset */}
          <div className="bg-[#161616] p-3.5 rounded-md border border-[#262626] space-y-1.5">
            <div className="flex items-center gap-2 text-[#F5F5F5] font-semibold text-xs">
              <Leaf className="w-3.5 h-3.5 text-[#F5C518]" />
              <span>2. Oceansat-2 (OCM-2) Ocean Color & Chlorophyll-a Products</span>
            </div>
            <p className="text-[11px]">
              Oceansat-2 (OCM-2) provides high-resolution chlorophyll-a concentration estimations across the Indian coastal zones and open ocean. High biological productivity is observed along the Western Continental Shelf during southwest monsoon upwelling and near the river plume mouths in the northern Bay of Bengal.
            </p>
          </div>

          {/* Section 3: Collocation & Discrepancy */}
          <div className="bg-[#161616] p-3.5 rounded-md border border-[#262626] space-y-1.5">
            <div className="flex items-center gap-2 text-[#F5F5F5] font-semibold text-xs">
              <Activity className="w-3.5 h-3.5 text-[#F5C518]" />
              <span>3. In-Situ Observation & Collocation Matching Engine</span>
            </div>
            <p className="text-[11px]">
              Autonomous In-Situ Argo floats provide real-time CTD + BGC profiles. Each float is spatiotemporally collocated with the corresponding model grid cell using 4D interpolation.
            </p>
            <div className="bg-[#101010] p-2 rounded border border-[#262626] font-mono text-[11px] text-[#F5C518]">
              Discrepancy Formula: Δ = In-Situ Observation − INCOIS Model Field
            </div>
          </div>

          {/* Section 4: Point Sounding & CTD Sampling */}
          <div className="bg-[#161616] p-3.5 rounded-md border border-[#262626] space-y-1.5">
            <div className="flex items-center gap-2 text-[#F5F5F5] font-semibold text-xs">
              <Database className="w-3.5 h-3.5 text-[#F5C518]" />
              <span>4. Interactive Point Ocean Sounding & CTD Profiling</span>
            </div>
            <p className="text-[11px]">
              Users can click anywhere on the observable 3D globe to probe continuous ocean properties (Temperature, Salinity, Chlorophyll-a) and inspect collocated vertical profiles from 5m down to 2000m.
            </p>
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
