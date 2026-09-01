import React from 'react';
import { X, Layers, Activity, Database, Waves, Leaf, ExternalLink } from 'lucide-react';

interface ScientificInfoModalProps {
  onClose: () => void;
}

export const ScientificInfoModal: React.FC<ScientificInfoModalProps> = ({ onClose }) => {
  return (
    <div
      id="scientific-info-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-150"
    >
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto custom-scrollbar">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/40">
              <Waves className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100">
                OceanX 3D — Scientific Architecture & Methodology
              </h3>
              <p className="text-xs text-slate-400">
                MoES / INCOIS Ocean Workspace • IRS OCM Satellite & Argo In-Situ
              </p>
            </div>
          </div>
          <button
            id="btn-close-info-modal"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content sections */}
        <div className="space-y-4 text-xs text-slate-300 leading-relaxed">
          {/* Section 1: Scientific Pipeline */}
          <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800 space-y-2">
            <div className="flex items-center gap-2 text-cyan-400 font-semibold text-xs">
              <Layers className="w-4 h-4" />
              <span>1. Numerical Ocean Field & Depth-Slice Raster Pipeline</span>
            </div>
            <p className="text-slate-400">
              OceanX 3D ingests multidimensional ocean model fields and satellite ocean color products from the INCOIS ERDDAP services, rendered using an edge-feathered raster engine that seamlessly blends coastal boundaries and outer bounding margins into the terrain basemap:
            </p>
            <ul className="list-disc list-inside space-y-1 text-slate-400 pl-1">
              <li>
                <a
                  href="https://erddap.incois.gov.in/erddap/griddap/incois_argo_10d_VAM.html"
                  target="_blank"
                  rel="noreferrer"
                  className="font-mono text-cyan-300 hover:underline inline-flex items-center gap-1"
                >
                  <span>incois_argo_10d_VAM</span>
                  <ExternalLink className="w-2.5 h-2.5" />
                </a>
                : Multi-depth temperature & salinity fields across standard oceanographic vertical levels (5m, 50m, 100m, 200m, 500m, 1000m).
              </li>
              <li>
                <a
                  href="https://erddap.incois.gov.in/erddap/griddap/incois_oceansat2_datasets.html"
                  target="_blank"
                  rel="noreferrer"
                  className="font-mono text-emerald-300 hover:underline inline-flex items-center gap-1"
                >
                  <span>incois_oceansat2_datasets</span>
                  <ExternalLink className="w-2.5 h-2.5" />
                </a>
                : INCOIS Oceansat-2 (OCM-2) Ocean Color Monitor data (CHL variable: 0.03 – 30.0 mg/m³ log scale).
              </li>
            </ul>
          </div>

          {/* Section 2: Chlorophyll-a Satellite ERDDAP Dataset */}
          <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800 space-y-2">
            <div className="flex items-center gap-2 text-emerald-400 font-semibold text-xs">
              <Leaf className="w-4 h-4" />
              <span>2. Oceansat-2 (OCM-2) Ocean Color & Chlorophyll-a Products</span>
            </div>
            <p className="text-slate-400">
              Oceansat-2 (OCM-2) provides high-resolution chlorophyll-a concentration estimations across the Indian coastal zones and open ocean. High biological productivity is observed along the Western Continental Shelf during southwest monsoon upwelling and near the river plume mouths in the northern Bay of Bengal. Chlorophyll is a surface product characterizing the first optical penetration layer (0–5m).
            </p>
          </div>

          {/* Section 3: Collocation & Discrepancy */}
          <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800 space-y-2">
            <div className="flex items-center gap-2 text-amber-400 font-semibold text-xs">
              <Activity className="w-4 h-4" />
              <span>3. In-Situ Observation & Collocation Matching Engine</span>
            </div>
            <p className="text-slate-400">
              Autonomous In-Situ Argo floats (<span className="font-mono text-emerald-300">Indian_ARGO_Floats</span>) provide real-time CTD + BGC profiles. Each float is spatiotemporally collocated with the corresponding model grid cell using 4D bilinear and depth-level interpolation.
            </p>
            <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800 font-mono text-[11px] text-amber-300">
              Discrepancy Formula: Δ = In-Situ Observation − INCOIS Model Field
            </div>
            <p className="text-[11px] text-slate-400 italic">
              <strong>Scientific Terminology Note:</strong> We use the term <em>"Model-Observation Discrepancy"</em> rather than "error", as a divergence highlights localized sub-mesoscale eddies, internal waves, or barrier-layer stratification requiring oceanographic investigation.
            </p>
          </div>

          {/* Section 4: Point Sounding & CTD Sampling */}
          <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800 space-y-2">
            <div className="flex items-center gap-2 text-cyan-400 font-semibold text-xs">
              <Activity className="w-4 h-4" />
              <span>4. Interactive Point Ocean Sounding & CTD Profiling</span>
            </div>
            <p className="text-slate-400">
              Users can click anywhere on the observable 3D globe to probe continuous ocean properties (Temperature, Salinity, Chlorophyll-a). The system interpolates the spatiotemporal grid, reconstructs full vertical CTD water column sounding curves from 5m down to 1000m, and identifies the closest deployed Argo float for immediate ground-truth validation.
            </p>
          </div>

          {/* Section 5: Indian Ocean Dynamics */}
          <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800 space-y-2">
            <div className="flex items-center gap-2 text-blue-400 font-semibold text-xs">
              <Database className="w-4 h-4" />
              <span>5. Basin-Scale Physical Oceanography</span>
            </div>
            <ul className="list-disc list-inside space-y-1 text-slate-400 pl-1">
              <li>
                <strong className="text-slate-200">Arabian Sea:</strong> High surface salinity (36.2 – 36.8 PSU) driven by net evaporation, with Red Sea outflow water at intermediate depths.
              </li>
              <li>
                <strong className="text-slate-200">Bay of Bengal:</strong> Low salinity lens (31.0 – 33.5 PSU) formed by perennial river discharge (Ganga-Brahmaputra), generating strong barrier layers.
              </li>
              <li>
                <strong className="text-slate-200">Thermocline & Biological Bloom:</strong> Sharp temperature gradient between 50m and 150m with chlorophyll blooms near coastal upwelling zones.
              </li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-2 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-cyan-600 hover:bg-cyan-500 text-white transition-colors cursor-pointer"
          >
            Understood
          </button>
        </div>
      </div>
    </div>
  );
};
