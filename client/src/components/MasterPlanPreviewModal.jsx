import React from 'react';
import { X, ExternalLink, FileText } from 'lucide-react';

const isImageUrl = (url) => {
  if (!url) return false;
  return /\.(png|jpe?g|webp|gif)(\?|#|$)/i.test(url);
};

const isPdfUrl = (url) => {
  if (!url) return false;
  return /\.(pdf)(\?|#|$)/i.test(url);
};

const MasterPlanPreviewModal = ({ url, title = 'Master plan', onClose }) => {
  if (!url) return null;

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center p-3 z-50">
      <div className="bg-slate-900 w-full max-w-5xl rounded-2xl border border-slate-700 shadow-2xl overflow-hidden">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2 text-white font-bold">
            <FileText size={18} />
            <span>{title}</span>
          </div>
          <div className="flex items-center gap-2">
            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              className="bg-slate-800 hover:bg-slate-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold border border-slate-700 inline-flex items-center gap-1"
            >
              Open <ExternalLink size={12} />
            </a>
            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-white"
              aria-label="Close"
            >
              <X />
            </button>
          </div>
        </div>

        <div className="bg-black">
          {isImageUrl(url) ? (
            <div className="max-h-[80vh] overflow-auto">
              <img src={url} alt={title} className="w-full h-auto" />
            </div>
          ) : isPdfUrl(url) ? (
            <iframe title={title} src={url} className="w-full h-[80vh]" />
          ) : (
            <div className="p-8 text-slate-300">
              Preview not supported for this file type.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MasterPlanPreviewModal;

