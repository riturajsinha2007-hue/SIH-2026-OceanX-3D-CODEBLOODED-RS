import React, { useState } from 'react';
import { ARGO_FLOATS } from '../../data/incoisDataset';
import { VisualizationState } from '../../types/ocean';
import { X, Download, FileText, Image as ImageIcon, Database, ExternalLink } from 'lucide-react';
import html2canvas from 'html2canvas';

interface ExportModalProps {
  state: VisualizationState;
  onClose: () => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({ state, onClose }) => {
  const [isExportingImage, setIsExportingImage] = useState(false);

  const handleExportScreenshot = async () => {
    setIsExportingImage(true);
    try {
      const root = document.getElementById('root') || document.body;
      const canvas = await html2canvas(root, {
        useCORS: true,
        backgroundColor: '#080808',
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

  return (
    <div
      id="export-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150"
    >
      <div className="bg-[#101010] border border-[#262626] rounded-lg max-w-md w-full p-5 shadow-2xl space-y-4 text-[#F5F5F5]">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-2.5 border-b border-[#262626]">
          <div className="flex items-center gap-2">
            <Download className="w-4 h-4 text-[#F5C518]" />
            <div>
              <h3 className="text-sm font-semibold text-[#F5F5F5]">
                Export Workspace
              </h3>
              <p className="text-[11px] text-[#A3A3A3]">
                Download visualizations or numerical data
              </p>
            </div>
          </div>
          <button
            id="btn-close-export-modal"
            onClick={onClose}
            className="p-1 rounded text-[#A3A3A3] hover:text-[#F5F5F5] hover:bg-[#161616] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Options */}
        <div className="space-y-2">
          {/* Option 1: Screenshot */}
          <button
            id="btn-download-screenshot"
            onClick={handleExportScreenshot}
            disabled={isExportingImage}
            className="w-full flex items-center justify-between p-3 rounded-md bg-[#161616] hover:bg-[#1e1e1e] border border-[#262626] hover:border-[#F5C518] transition-colors text-left cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <ImageIcon className="w-4 h-4 text-[#F5C518]" />
              <div>
                <div className="text-xs font-semibold text-[#F5F5F5]">
                  Workspace Screenshot (PNG)
                </div>
                <div className="text-[11px] text-[#A3A3A3]">
                  Full 3D Globe + active numerical depth layer
                </div>
              </div>
            </div>
            <span className="text-xs font-mono text-[#F5C518]">
              {isExportingImage ? 'Generating...' : 'Save PNG →'}
            </span>
          </button>

          {/* Option 2: CSV Discrepancy Table */}
          <button
            id="btn-download-csv"
            onClick={handleExportCSV}
            className="w-full flex items-center justify-between p-3 rounded-md bg-[#161616] hover:bg-[#1e1e1e] border border-[#262626] hover:border-[#F5C518] transition-colors text-left cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <FileText className="w-4 h-4 text-[#F5C518]" />
              <div>
                <div className="text-xs font-semibold text-[#F5F5F5]">
                  Argo Discrepancies Table (CSV)
                </div>
                <div className="text-[11px] text-[#A3A3A3]">
                  All float observations & collocated model values
                </div>
              </div>
            </div>
            <span className="text-xs font-mono text-[#F5C518]">
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
            className="w-full flex items-center justify-between p-3 rounded-md bg-[#161616] hover:bg-[#1e1e1e] border border-[#262626] hover:border-[#F5C518] transition-colors text-left"
          >
            <div className="flex items-center gap-3">
              <Database className="w-4 h-4 text-[#F5C518]" />
              <div>
                <div className="text-xs font-semibold text-[#F5F5F5]">
                  INCOIS ERDDAP Server
                </div>
                <div className="text-[11px] text-[#A3A3A3] font-mono">
                  {state.variable === 'CHLA' ? 'incois_oceansat2_datasets' : 'incois_argo_10d_VAM'}
                </div>
              </div>
            </div>
            <span className="text-xs font-mono text-[#F5C518] flex items-center gap-1">
              <span>Open</span>
              <ExternalLink className="w-3 h-3" />
            </span>
          </a>
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
