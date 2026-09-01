import React, { useState } from 'react';
import { ARGO_FLOATS } from '../../data/incoisDataset';
import { VisualizationState } from '../../types/ocean';
import { X, Download, FileText, Image as ImageIcon, CheckCircle, Database, ExternalLink } from 'lucide-react';
import html2canvas from 'html2canvas';

interface ExportModalProps {
  state: VisualizationState;
  onClose: () => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({ state, onClose }) => {
  const [isExportingImage, setIsExportingImage] = useState(false);
  const [copiedNotification, setCopiedNotification] = useState<string | null>(null);

  const handleExportScreenshot = async () => {
    setIsExportingImage(true);
    try {
      const root = document.getElementById('root') || document.body;
      const canvas = await html2canvas(root, {
        useCORS: true,
        backgroundColor: '#040810',
        logging: false,
      });

      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `OceanX_3D_${state.variable}_${state.depth}m_${Date.now()}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Screenshot export error:', err);
    } finally {
      setIsExportingImage(false);
    }
  };

  const handleExportCSV = () => {
    const headers = [
      'WMO_ID',
      'Cycle',
      'Latitude',
      'Longitude',
      'Basin',
      'Depth_m',
      'Observed_Temp_C',
      'Model_Temp_C',
      'Temp_Delta_C',
      'Observed_Sal_PSU',
      'Model_Sal_PSU',
      'Sal_Delta_PSU',
      'QC_Flag',
    ];

    const rows: string[] = [];
    rows.push(headers.join(','));

    ARGO_FLOATS.forEach((f) => {
      f.profiles.forEach((p) => {
        rows.push(
          [
            f.platformNumber,
            f.cycleNumber,
            f.latitude,
            f.longitude,
            `"${f.basin}"`,
            p.depth,
            p.observedTemp,
            p.modelTemp,
            p.tempDelta,
            p.observedSal,
            p.modelSal,
            p.salDelta,
            f.qcFlag,
          ].join(',')
        );
      });
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + rows.join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `INCOIS_OceanX_Argo_Discrepancies_${state.depth}m.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportJSON = () => {
    const payload = {
      project: 'OceanX 3D Scientific Workspace',
      organization: 'Ministry of Earth Sciences (MoES) / INCOIS',
      exportTimestamp: new Date().toISOString(),
      activeLayer: {
        variable: state.variable,
        depth_m: state.depth,
        colormap: state.colormap,
      },
      erddapEndpoints: {
        chlorophyll: 'https://erddap.incois.gov.in/erddap/griddap/incois_oceansat2_datasets.html',
        argoVAM: 'https://erddap.incois.gov.in/erddap/griddap/incois_argo_10d_VAM.html',
      },
      floats: ARGO_FLOATS,
    };

    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(payload, null, 2));
    const link = document.createElement('a');
    link.setAttribute('href', dataStr);
    link.setAttribute('download', `OceanX_3D_Discrepancy_Dataset.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div
      id="export-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-150"
    >
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/40">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100">
                Export Scientific Workspace
              </h3>
              <p className="text-xs text-slate-400">
                Download high-res visualizations or numerical datasets
              </p>
            </div>
          </div>
          <button
            id="btn-close-export-modal"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Options */}
        <div className="space-y-3">
          {/* Option 1: Screenshot */}
          <button
            id="btn-download-screenshot"
            onClick={handleExportScreenshot}
            disabled={isExportingImage}
            className="w-full flex items-center justify-between p-3.5 rounded-xl bg-slate-950/60 hover:bg-slate-800 border border-slate-800 hover:border-cyan-500/50 transition-all text-left group cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30">
                <ImageIcon className="w-4 h-4" />
              </div>
              <div>
                <div className="text-sm font-semibold text-slate-200 group-hover:text-amber-300">
                  Workspace Screenshot (PNG)
                </div>
                <div className="text-xs text-slate-400">
                  Full 3D Globe + active numerical depth layer
                </div>
              </div>
            </div>
            <span className="text-xs font-mono text-cyan-400 group-hover:translate-x-0.5 transition-transform">
              {isExportingImage ? 'Generating...' : 'Save PNG →'}
            </span>
          </button>

          {/* Option 2: CSV Discrepancy Table */}
          <button
            id="btn-download-csv"
            onClick={handleExportCSV}
            className="w-full flex items-center justify-between p-3.5 rounded-xl bg-slate-950/60 hover:bg-slate-800 border border-slate-800 hover:border-cyan-500/50 transition-all text-left group cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                <FileText className="w-4 h-4" />
              </div>
              <div>
                <div className="text-sm font-semibold text-slate-200 group-hover:text-emerald-300">
                  Argo Discrepancies Table (CSV)
                </div>
                <div className="text-xs text-slate-400">
                  All float observations & collocated model values
                </div>
              </div>
            </div>
            <span className="text-xs font-mono text-cyan-400 group-hover:translate-x-0.5 transition-transform">
              Save CSV →
            </span>
          </button>

          {/* Option 3: INCOIS ERDDAP Direct Griddap Access */}
          <a
            href={state.variable === 'CHLA'
              ? "https://erddap.incois.gov.in/erddap/griddap/incois_oceansat2_datasets.html"
              : "https://erddap.incois.gov.in/erddap/griddap/incois_argo_10d_VAM.html"
            }
            target="_blank"
            rel="noreferrer"
            className="w-full flex items-center justify-between p-3.5 rounded-xl bg-slate-950/60 hover:bg-slate-800 border border-slate-800 hover:border-emerald-500/50 transition-all text-left group"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                <Database className="w-4 h-4" />
              </div>
              <div>
                <div className="text-sm font-semibold text-slate-200 group-hover:text-emerald-300">
                  INCOIS ERDDAP NetCDF / Grid Server
                </div>
                <div className="text-xs text-slate-400 font-mono">
                  {state.variable === 'CHLA' ? 'incois_oceansat2_datasets.nc' : 'incois_argo_10d_VAM.nc'}
                </div>
              </div>
            </div>
            <span className="text-xs font-mono text-emerald-400 group-hover:translate-x-0.5 transition-transform flex items-center gap-1">
              <span>Open Server</span>
              <ExternalLink className="w-3 h-3" />
            </span>
          </a>
        </div>

        {/* Footer */}
        <div className="pt-2 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
