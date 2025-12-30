import React, { useState, useEffect, useRef } from 'react';
import { X, ExternalLink, FileText, Loader, ChevronLeft, ChevronRight } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';

// Set worker path for PDF.js - use a reliable CDN
if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
}

const isImageUrl = (url) => {
  if (!url) return false;
  // Check for image extensions in URL
  if (/\.(png|jpe?g|webp|gif|bmp|svg)(\?|#|$)/i.test(url)) return true;
  // Check if it's a Cloudinary image URL
  if (/cloudinary\.com.*\/image\/upload/i.test(url)) return true;
  // Check if it's a Cloudinary URL with image format
  if (/cloudinary\.com.*\/v\d+\/.*\.(png|jpe?g|webp|gif)/i.test(url)) return true;
  // Check if it's a Cloudinary URL (most Cloudinary URLs are images by default)
  if (/cloudinary\.com/i.test(url) && !/\.pdf/i.test(url)) return true;
  return false;
};

const isPdfUrl = (url) => {
  if (!url) return false;
  // Check for PDF extension in URL
  if (/\.(pdf)(\?|#|$)/i.test(url)) return true;
  // Check if it's a Cloudinary PDF URL (raw upload)
  if (/cloudinary\.com.*\/raw\/upload/i.test(url)) return true;
  // Check if URL contains pdf in path
  if (/cloudinary\.com.*\/.*\.pdf/i.test(url)) return true;
  // Check if it's a Cloudinary URL with format=pdf
  if (/cloudinary\.com.*[\/_]pdf/i.test(url)) return true;
  // If it's Cloudinary and not an image URL, assume it might be PDF
  if (/cloudinary\.com/i.test(url) && !/cloudinary\.com.*\/image\/upload/i.test(url)) {
    // Check if it's raw upload (likely PDF)
    if (/cloudinary\.com.*\/raw\/upload/i.test(url) || /cloudinary\.com.*\/v\d+\/.*\/.*\.(pdf|raw)/i.test(url)) {
      return true;
    }
  }
  return false;
};

const MasterPlanPreviewModal = ({ url, title = 'Master plan', onClose }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [previewType, setPreviewType] = useState('auto');
  const [pdfDoc, setPdfDoc] = useState(null);
  const [pageNum, setPageNum] = useState(1);
  const [numPages, setNumPages] = useState(0);
  const [pdfPage, setPdfPage] = useState(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    if (url) {
      console.log('MasterPlanPreviewModal - URL:', url);
      setLoading(true);
      setError(false);
      const isImage = isImageUrl(url);
      const isPdf = isPdfUrl(url);
      console.log('MasterPlanPreviewModal - Is Image:', isImage, 'Is PDF:', isPdf);
      
      if (isImage) {
        setPreviewType('image');
      } else if (isPdf) {
        setPreviewType('pdf');
        loadPdf(url);
      } else {
        setPreviewType('iframe');
      }
    }
  }, [url]);

  const loadPdf = async (pdfUrl) => {
    try {
      setLoading(true);
      setError(false);
      
      // For Cloudinary URLs, fetch the PDF as blob to avoid download
      let urlToLoad = pdfUrl;
      
      // If it's a Cloudinary URL, fetch it as blob first
      if (pdfUrl.includes('cloudinary.com')) {
        try {
          const response = await fetch(pdfUrl, {
            method: 'GET',
            mode: 'cors',
            credentials: 'omit'
          });
          
          if (!response.ok) {
            throw new Error('Failed to fetch PDF');
          }
          
          const blob = await response.blob();
          urlToLoad = URL.createObjectURL(blob);
        } catch (fetchError) {
          console.error('Error fetching PDF as blob:', fetchError);
          // Fallback to direct URL
        }
      }
      
      // Load PDF document
      const loadingTask = pdfjsLib.getDocument({
        url: urlToLoad,
        withCredentials: false,
        httpHeaders: {},
        disableAutoFetch: false,
        disableStreaming: false
      });
      
      const pdf = await loadingTask.promise;
      setPdfDoc(pdf);
      setNumPages(pdf.numPages);
      setPageNum(1);
      setLoading(false);
      setError(false);
    } catch (err) {
      console.error('Error loading PDF:', err);
      setLoading(false);
      setError(true);
    }
  };

  useEffect(() => {
    if (pdfDoc && canvasRef.current && pageNum > 0) {
      renderPage(pageNum);
    }
  }, [pdfDoc, pageNum]);

  const renderPage = async (page) => {
    if (!pdfDoc || !canvasRef.current || page < 1) return;
    
    try {
      setLoading(true);
      const pdfPage = await pdfDoc.getPage(page);
      setPdfPage(pdfPage);
      
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      
      // Calculate scale to fit container
      const container = canvas.parentElement;
      if (!container) {
        setLoading(false);
        return;
      }
      
      const containerWidth = container.clientWidth - 32; // Padding
      const containerHeight = container.clientHeight - 100; // Leave space for controls
      
      const viewport = pdfPage.getViewport({ scale: 1.0 });
      const scale = Math.min(
        containerWidth / viewport.width,
        containerHeight / viewport.height,
        2.0 // Max scale
      );
      
      const scaledViewport = pdfPage.getViewport({ scale });
      
      canvas.height = scaledViewport.height;
      canvas.width = scaledViewport.width;
      
      // Clear canvas
      context.clearRect(0, 0, canvas.width, canvas.height);
      
      const renderContext = {
        canvasContext: context,
        viewport: scaledViewport
      };
      
      await pdfPage.render(renderContext).promise;
      setLoading(false);
    } catch (err) {
      console.error('Error rendering PDF page:', err);
      setLoading(false);
      setError(true);
    }
  };

  const goToPrevPage = () => {
    if (pageNum > 1) {
      setPageNum(pageNum - 1);
    }
  };

  const goToNextPage = () => {
    if (pageNum < numPages) {
      setPageNum(pageNum + 1);
    }
  };

  if (!url) return null;

  const handleImageLoad = () => {
    setLoading(false);
    setError(false);
  };

  const handleImageError = () => {
    setLoading(false);
    setError(true);
  };

  const handleIframeLoad = () => {
    setLoading(false);
    setError(false);
  };

  const handleIframeError = () => {
    setLoading(false);
    setError(true);
  };

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center p-3 z-50" onClick={onClose}>
      <div className="bg-slate-900 w-full max-w-5xl rounded-2xl border border-slate-700 shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2 text-white font-bold">
            <FileText size={18} />
            <span>{title}</span>
            {previewType === 'pdf' && numPages > 0 && (
              <span className="text-sm text-slate-400 font-normal ml-2">
                (Page {pageNum} of {numPages})
              </span>
            )}
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

        <div className="bg-black relative min-h-[400px]">
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-900/80 z-10">
              <Loader className="animate-spin text-white" size={32} />
            </div>
          )}
          
          {error ? (
            <div className="p-8 text-slate-300 text-center min-h-[400px] flex flex-col items-center justify-center">
              <p className="mb-4">Unable to preview this file.</p>
              <a
                href={url}
                target="_blank"
                rel="noreferrer"
                className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg inline-flex items-center gap-2"
              >
                Open in new tab <ExternalLink size={16} />
              </a>
            </div>
          ) : previewType === 'image' ? (
            <div className="max-h-[80vh] overflow-auto">
              <img 
                src={url} 
                alt={title} 
                className="w-full h-auto"
                onLoad={handleImageLoad}
                onError={handleImageError}
              />
            </div>
          ) : previewType === 'pdf' ? (
            <div className="relative w-full h-[80vh] flex flex-col">
              {numPages > 1 && (
                <div className="flex items-center justify-center gap-4 p-4 bg-slate-800 border-b border-slate-700">
                  <button
                    onClick={goToPrevPage}
                    disabled={pageNum <= 1}
                    className="bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg flex items-center gap-2"
                  >
                    <ChevronLeft size={16} /> Previous
                  </button>
                  <span className="text-white text-sm">
                    Page {pageNum} of {numPages}
                  </span>
                  <button
                    onClick={goToNextPage}
                    disabled={pageNum >= numPages}
                    className="bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg flex items-center gap-2"
                  >
                    Next <ChevronRight size={16} />
                  </button>
                </div>
              )}
              <div className="flex-1 overflow-auto flex items-center justify-center p-4">
                <canvas
                  ref={canvasRef}
                  className="max-w-full h-auto shadow-lg"
                />
              </div>
            </div>
          ) : (
            <div className="relative w-full h-[80vh]">
              <iframe 
                title={title} 
                src={url}
                className="w-full h-full"
                onLoad={handleIframeLoad}
                onError={handleIframeError}
                style={{ border: 'none' }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MasterPlanPreviewModal;
