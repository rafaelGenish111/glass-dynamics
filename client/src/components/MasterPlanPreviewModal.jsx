import React, { useState, useEffect } from 'react';
import { X, FileText, Download, AlertCircle, Eye, ExternalLink } from 'lucide-react';

const MasterPlanPreviewModal = ({ url, title = 'Master plan', onClose }) => {
  const [loading, setLoading] = useState(true);
  const [previewState, setPreviewState] = useState('loading'); // 'loading', 'image', 'pdf-preview', 'google-docs', 'fallback'
  const [displayUrl, setDisplayUrl] = useState(null);

  useEffect(() => {
    if (!url) return;

    setLoading(true);
    setPreviewState('loading');

    console.log("Processing URL:", url); // לוג לדיבוג

    const analyzeUrl = () => {
      const lowerUrl = url.toLowerCase();
      // בדיקה "רכה" יותר - האם המחרוזת מכילה pdf, לא רק מסתיימת בזה
      const isPdf = lowerUrl.includes('.pdf'); 
      const isCloudinary = lowerUrl.includes('cloudinary.com');
      const isRaw = lowerUrl.includes('/raw/upload/');
      
      // רשימת סיומות תמונה נפוצות
      const isImage = /\.(jpeg|jpg|gif|png|webp|svg)($|\?)/i.test(lowerUrl);

      // מקרה 1: PDF "גולמי" (Raw) או PDF שאינו מ-Cloudinary -> נשלח ל-Google Docs
      if (isPdf && (isRaw || !isCloudinary)) {
        console.log("Detected RAW PDF or External PDF -> Using Google Viewer");
        const googleDocsUrl = `https://docs.google.com/viewer?url=${encodeURIComponent(url)}&embedded=true`;
        setDisplayUrl(googleDocsUrl);
        setPreviewState('google-docs');
        return;
      }

      // מקרה 2: PDF תקין מ-Cloudinary -> ננסה להמיר לתמונה
      if (isCloudinary && isPdf && !isRaw) {
        console.log("Detected Cloudinary Image PDF -> Generating Preview");
        // החלפה חכמה של הסיומת (גם אם יש פרמטרים אחרי ה-pdf)
        let newUrl = url.replace(/(\.pdf)($|\?.*)/i, '.jpg$2');
        
        // הוספת אופטימיזציה אם חסרה
        if (!newUrl.includes('/f_auto') && newUrl.includes('/upload/')) {
            newUrl = newUrl.replace('/upload/', '/upload/f_auto,q_auto,pg_1/');
        }
        
        setDisplayUrl(newUrl);
        setPreviewState('pdf-preview');
        return;
      }

      // מקרה 3: תמונה רגילה
      if (isImage || (isCloudinary && !isPdf && !isRaw)) {
        console.log("Detected Image -> Standard Render");
        setDisplayUrl(url);
        setPreviewState('image');
        return;
      }

      // ברירת מחדל
      console.log("Unknown format -> Fallback");
      setPreviewState('fallback');
      setLoading(false);
    };

    analyzeUrl();
  }, [url]);

  const handleImageLoad = () => setLoading(false);
  
  const handleImageError = () => {
    console.warn("Image failed to load. Trying fallback...");
    // אם טעינת התמונה נכשלה, אבל זה נראה כמו PDF, ננסה את גוגל
    if (url.toLowerCase().includes('.pdf')) {
        const googleDocsUrl = `https://docs.google.com/viewer?url=${encodeURIComponent(url)}&embedded=true`;
        setDisplayUrl(googleDocsUrl);
        setPreviewState('google-docs');
        // לא מכבים loading כי ה-iframe יטען עכשיו
    } else {
        setPreviewState('fallback');
        setLoading(false);
    }
  };

  if (!url) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/95 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200" 
      onClick={onClose}
    >
      <div 
        className="bg-slate-900 w-full max-w-5xl h-[85vh] rounded-2xl border border-slate-700 shadow-2xl overflow-hidden flex flex-col" 
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900 shrink-0">
          <div className="flex items-center gap-3">
            <div className="bg-blue-500/10 p-2 rounded-lg">
              <FileText className="text-blue-400" size={20} />
            </div>
            <div>
              <h3 className="text-white font-bold text-lg">{title}</h3>
              <p className="text-slate-400 text-xs flex items-center gap-2">
                {previewState === 'google-docs' && <span className="text-green-400">● Live Viewer</span>}
                {previewState === 'pdf-preview' && 'Image Preview'}
                {previewState === 'fallback' && 'File Download'}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              download
              className="bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-lg text-sm font-medium border border-slate-700 transition-colors flex items-center gap-2"
            >
              <Download size={16} />
              <span className="hidden sm:inline">Download</span>
            </a>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 bg-black/40 relative flex flex-col">
          
          {loading && previewState !== 'google-docs' && (
            <div className="absolute inset-0 flex items-center justify-center z-10 bg-slate-900/50">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          )}

          {/* Viewer: Google Docs (Iframe) */}
          {previewState === 'google-docs' && (
             <iframe
               src={displayUrl}
               className="w-full h-full border-0 bg-white"
               title="PDF Viewer"
               onLoad={() => setLoading(false)}
             />
          )}

          {/* Viewer: Image / PDF-Image */}
          {(previewState === 'image' || previewState === 'pdf-preview') && displayUrl && (
            <div className="w-full h-full flex items-center justify-center overflow-auto p-4">
                <img 
                src={displayUrl} 
                alt="Preview" 
                className={`max-w-full max-h-full object-contain shadow-lg transition-opacity duration-300 ${loading ? 'opacity-0' : 'opacity-100'}`}
                onLoad={handleImageLoad}
                onError={handleImageError}
                />
            </div>
          )}

          {/* Viewer: Fallback */}
          {previewState === 'fallback' && (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
              <div className="w-24 h-24 bg-slate-800 rounded-full flex items-center justify-center mb-6 border border-slate-700">
                <FileText size={40} className="text-slate-500" />
              </div>
              <h4 className="text-xl text-white font-semibold mb-2">Preview Not Available</h4>
              <p className="text-slate-400 mb-6 max-w-md">
                We couldn't generate a preview for this file type. 
                Please download the file to view its contents.
              </p>
              <a 
                href={url} 
                target="_blank" 
                rel="noreferrer"
                className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-xl transition-all flex items-center gap-3 shadow-lg shadow-blue-900/20"
              >
                <Download size={18} />
                Download File
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MasterPlanPreviewModal;