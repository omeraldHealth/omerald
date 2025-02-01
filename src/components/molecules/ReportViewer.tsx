'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  MagnifyingGlassPlusIcon,
  MagnifyingGlassMinusIcon,
  ArrowsPointingOutIcon,
  ArrowsPointingInIcon,
  ArrowDownTrayIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';

interface ReportViewerProps {
  files: string[];
  fileTypes: ('pdf' | 'image' | 'unknown')[];
  onClose?: () => void;
  initialIndex?: number;
}

// Helper function to detect file type from URL
const detectFileType = (url: string): 'pdf' | 'image' | 'unknown' => {
  if (!url) return 'unknown';
  
  const urlLower = url.toLowerCase();
  
  // Check for PDF - support various PDF indicators
  if (
    urlLower.includes('.pdf') || 
    urlLower.includes('application/pdf') ||
    urlLower.includes('content-type=application/pdf') ||
    urlLower.match(/\.pdf(\?|$|#)/i)
  ) {
    return 'pdf';
  }
  
  // Check for images - comprehensive list of image formats
  const imageExtensions = [
    '.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg', 
    '.tiff', '.tif', '.ico', '.heic', '.heif', '.avif', '.jfif'
  ];
  
  // Check file extension in URL (before query params)
  const urlWithoutQuery = urlLower.split('?')[0].split('#')[0];
  if (imageExtensions.some(ext => urlWithoutQuery.endsWith(ext))) {
    return 'image';
  }
  
  // Check content type hints in URL (for AWS signed URLs)
  if (urlLower.includes('content-type=image/') || urlLower.includes('response-content-type=image/')) {
    return 'image';
  }
  if (urlLower.includes('content-type=application/pdf') || urlLower.includes('response-content-type=application/pdf')) {
    return 'pdf';
  }
  
  // Check for image/ prefix in URL
  if (urlLower.includes('image/')) return 'image';
  
  return 'unknown';
};

export default function ReportViewer({
  files,
  fileTypes,
  onClose,
  initialIndex = 0,
}: ReportViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [pdfLoadError, setPdfLoadError] = useState(false);
  const [imageLoadError, setImageLoadError] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const pdfIframeRef = useRef<HTMLIFrameElement>(null);
  const contentAreaRef = useRef<HTMLDivElement>(null);
  const lastClickTimeRef = useRef<number>(0);

  const currentFile = files[currentIndex];
  // Better file type detection with fallback
  const detectedType = detectFileType(currentFile);
  const currentFileType = fileTypes[currentIndex] || detectedType;

  // Reset zoom, position, and errors when file changes
  useEffect(() => {
    setZoom(1);
    setPosition({ x: 0, y: 0 });
    setPdfLoadError(false);
    setImageLoadError(false);
  }, [currentIndex]);

  // Handle fullscreen
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);
    
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
    };
  }, []);

  const toggleFullscreen = useCallback(async () => {
    if (!containerRef.current) return;

    try {
      if (!document.fullscreenElement) {
        // Try different fullscreen methods for browser compatibility
        if (containerRef.current.requestFullscreen) {
          await containerRef.current.requestFullscreen();
        } else if ((containerRef.current as any).webkitRequestFullscreen) {
          await (containerRef.current as any).webkitRequestFullscreen();
        } else if ((containerRef.current as any).mozRequestFullScreen) {
          await (containerRef.current as any).mozRequestFullScreen();
        } else if ((containerRef.current as any).msRequestFullscreen) {
          await (containerRef.current as any).msRequestFullscreen();
        }
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if ((document as any).webkitExitFullscreen) {
          await (document as any).webkitExitFullscreen();
        } else if ((document as any).mozCancelFullScreen) {
          await (document as any).mozCancelFullScreen();
        } else if ((document as any).msExitFullscreen) {
          await (document as any).msExitFullscreen();
        }
      }
    } catch (err) {
      console.error('Error attempting to toggle fullscreen:', err);
    }
  }, []);

  // Handle click-to-maximize on content area
  const handleContentClick = useCallback((e: React.MouseEvent) => {
    // Don't trigger if clicking on controls or dragging
    if (isDragging) return;
    
    // Check if click is on the content area itself (not on child elements with their own handlers)
    const target = e.target as HTMLElement;
    if (target.tagName === 'BUTTON' || target.closest('button')) return;
    
    const currentTime = Date.now();
    const timeSinceLastClick = currentTime - lastClickTimeRef.current;
    
    // Double click detection (within 300ms)
    if (timeSinceLastClick < 300) {
      toggleFullscreen();
      lastClickTimeRef.current = 0;
    } else {
      lastClickTimeRef.current = currentTime;
    }
  }, [isDragging, toggleFullscreen]);

  const handleZoomIn = () => {
    setZoom((prev) => Math.min(prev + 0.25, 5));
  };

  const handleZoomOut = () => {
    setZoom((prev) => Math.max(prev - 0.25, 0.5));
  };

  const handleResetZoom = () => {
    setZoom(1);
    setPosition({ x: 0, y: 0 });
  };

  const handleDownload = () => {
    if (!currentFile) return;
    const link = document.createElement('a');
    link.href = currentFile;
    link.download = `report-${currentIndex + 1}`;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleNext = () => {
    if (currentIndex < files.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  // Image drag handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (currentFileType !== 'image' || zoom <= 1) return;
    e.preventDefault();
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || currentFileType !== 'image' || zoom <= 1) return;
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Handle PDF iframe load error
  const handlePdfError = () => {
    setPdfLoadError(true);
  };

  // Handle image load error
  const handleImageError = useCallback(() => {
    console.error('Image failed to load:', currentFile);
    setImageLoadError(true);
  }, [currentFile]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        if (currentIndex > 0) {
          setCurrentIndex(currentIndex - 1);
        }
      }
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        if (currentIndex < files.length - 1) {
          setCurrentIndex(currentIndex + 1);
        }
      }
      if (e.key === '+' || e.key === '=') {
        e.preventDefault();
        if (currentFileType === 'image') {
          setZoom((prev) => Math.min(prev + 0.25, 5));
        }
      }
      if (e.key === '-') {
        e.preventDefault();
        if (currentFileType === 'image') {
          setZoom((prev) => Math.max(prev - 0.25, 0.5));
        }
      }
      if (e.key === '0') {
        e.preventDefault();
        if (currentFileType === 'image') {
          setZoom(1);
          setPosition({ x: 0, y: 0 });
        }
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        if (onClose) onClose();
      }
      if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        toggleFullscreen();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [currentIndex, files.length, currentFileType, onClose, toggleFullscreen]);

  if (!currentFile) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-900 text-white">
        <p>No file available</p>
      </div>
    );
  }

  // Generate Google Docs Viewer URL as fallback for PDFs
  const getGoogleDocsViewerUrl = (url: string) => {
    return `https://docs.google.com/viewer?url=${encodeURIComponent(url)}&embedded=true`;
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full bg-gray-900 flex flex-col"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onClick={(e) => {
        // Prevent clicks from bubbling to parent backdrop
        e.stopPropagation();
      }}
    >
      {/* Header Controls */}
      <div className="absolute top-0 left-0 right-0 z-20 bg-black/80 backdrop-blur-sm text-white p-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">
            File {currentIndex + 1} of {files.length}
          </span>
          {currentFileType === 'pdf' && (
            <span className="px-2 py-1 bg-blue-600 rounded text-xs">PDF</span>
          )}
          {currentFileType === 'image' && (
            <span className="px-2 py-1 bg-green-600 rounded text-xs">Image</span>
          )}
          {currentFileType === 'unknown' && (
            <span className="px-2 py-1 bg-gray-600 rounded text-xs">File</span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Navigation */}
          {files.length > 1 && (
            <>
              <button
                onClick={handlePrevious}
                disabled={currentIndex === 0}
                className="p-2 hover:bg-white/20 rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                title="Previous (←)"
              >
                <ChevronLeftIcon className="w-5 h-5" />
              </button>
              <button
                onClick={handleNext}
                disabled={currentIndex === files.length - 1}
                className="p-2 hover:bg-white/20 rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                title="Next (→)"
              >
                <ChevronRightIcon className="w-5 h-5" />
              </button>
            </>
          )}

          {/* Zoom Controls (for images) */}
          {currentFileType === 'image' && (
            <>
              <div className="w-px h-6 bg-white/30 mx-1" />
              <button
                onClick={handleZoomOut}
                className="p-2 hover:bg-white/20 rounded transition-colors"
                title="Zoom Out (-)"
              >
                <MagnifyingGlassMinusIcon className="w-5 h-5" />
              </button>
              <span className="text-sm min-w-[3rem] text-center">
                {Math.round(zoom * 100)}%
              </span>
              <button
                onClick={handleZoomIn}
                className="p-2 hover:bg-white/20 rounded transition-colors"
                title="Zoom In (+)"
              >
                <MagnifyingGlassPlusIcon className="w-5 h-5" />
              </button>
              <button
                onClick={handleResetZoom}
                className="px-3 py-1 text-xs hover:bg-white/20 rounded transition-colors"
                title="Reset Zoom (0)"
              >
                Reset
              </button>
            </>
          )}

          {/* Fullscreen */}
          <div className="w-px h-6 bg-white/30 mx-1" />
          <button
            onClick={toggleFullscreen}
            className="p-2 hover:bg-white/20 rounded transition-colors"
            title="Toggle Fullscreen (F or Double-click)"
          >
            {isFullscreen ? (
              <ArrowsPointingInIcon className="w-5 h-5" />
            ) : (
              <ArrowsPointingOutIcon className="w-5 h-5" />
            )}
          </button>

          {/* Download */}
          <button
            onClick={handleDownload}
            className="p-2 hover:bg-white/20 rounded transition-colors"
            title="Download"
          >
            <ArrowDownTrayIcon className="w-5 h-5" />
          </button>

          {/* Close */}
          {onClose && (
            <>
              <div className="w-px h-6 bg-white/30 mx-1" />
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/20 rounded transition-colors"
                title="Close (Esc)"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Content Area */}
      <div 
        ref={contentAreaRef}
        className="flex-1 overflow-hidden relative mt-12 cursor-pointer"
        onClick={handleContentClick}
        title="Double-click to maximize"
      >
        {currentFileType === 'image' ? (
          <div
            className="w-full h-full flex items-center justify-center overflow-hidden"
            onMouseDown={handleMouseDown}
            style={{ cursor: zoom > 1 ? (isDragging ? 'grabbing' : 'grab') : 'pointer' }}
          >
            {imageLoadError ? (
              <div className="w-full h-full flex items-center justify-center bg-gray-800">
                <div className="text-center text-white max-w-md px-4">
                  <p className="text-lg mb-2">Failed to load image</p>
                  <p className="text-sm text-gray-400 mb-4 break-all">{currentFile}</p>
                  <div className="flex flex-col gap-2 items-center">
                    <a
                      href={currentFile}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-white transition-colors"
                      onClick={(e) => e.stopPropagation()}
                    >
                      Open in new tab
                    </a>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setImageLoadError(false);
                        // Force reload
                        if (imageRef.current) {
                          const img = imageRef.current;
                          const src = img.src;
                          img.src = '';
                          setTimeout(() => {
                            img.src = src;
                          }, 100);
                        }
                      }}
                      className="px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded text-white transition-colors text-sm"
                    >
                      Retry
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <img
                ref={imageRef}
                src={currentFile}
                alt={`Report file ${currentIndex + 1}`}
                className="max-w-full max-h-full object-contain select-none"
                style={{
                  transform: `translate(${position.x}px, ${position.y}px) scale(${zoom})`,
                  transition: isDragging ? 'none' : 'transform 0.1s ease-out',
                }}
                draggable={false}
                onError={(e) => {
                  const imgElement = e.target as HTMLImageElement;
                  console.error('Image load error:', {
                    url: currentFile,
                    attemptedSrc: imgElement?.src,
                    naturalWidth: imgElement?.naturalWidth,
                    naturalHeight: imgElement?.naturalHeight,
                    complete: imgElement?.complete,
                    error: e,
                  });
                  handleImageError();
                }}
                onLoad={() => {
                  // Reset error state on successful load
                  console.log('Image loaded successfully:', currentFile);
                  setImageLoadError(false);
                }}
                // Don't set crossOrigin - signed URLs handle CORS via query params
                // Next.js Image component (used in thumbnails) handles this automatically
                // Regular img tags work fine without crossOrigin for signed URLs
                loading="eager"
              />
            )}
          </div>
        ) : currentFileType === 'pdf' ? (
          <div className="w-full h-full relative">
            {pdfLoadError ? (
              <div className="w-full h-full flex items-center justify-center bg-gray-800">
                <div className="text-center text-white">
                  <p className="text-lg mb-4">PDF failed to load in viewer</p>
                  <div className="flex flex-col gap-2 items-center">
                    <a
                      href={currentFile}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-white transition-colors"
                      onClick={(e) => e.stopPropagation()}
                    >
                      Open in new tab
                    </a>
                    <a
                      href={currentFile}
                      download
                      className="px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded text-white transition-colors"
                      onClick={(e) => e.stopPropagation()}
                    >
                      Download PDF
                    </a>
                  </div>
                </div>
              </div>
            ) : (
              <>
                {/* Primary iframe method */}
                <iframe
                  ref={pdfIframeRef}
                  src={`${currentFile}#toolbar=0`}
                  className="w-full h-full border-0"
                  title={`PDF Report ${currentIndex + 1}`}
                  onError={handlePdfError}
                  onLoad={() => {
                    // Reset error state on successful load
                    setPdfLoadError(false);
                  }}
                  allow="fullscreen"
                  style={{ minHeight: '100%' }}
                />
                {/* Fallback: Try Google Docs Viewer if direct load fails after timeout */}
                {pdfLoadError && (
                  <iframe
                    src={getGoogleDocsViewerUrl(currentFile)}
                    className="w-full h-full border-0 absolute inset-0"
                    title={`PDF Report ${currentIndex + 1} (Google Viewer)`}
                    onError={() => {
                      console.error('Google Docs Viewer also failed to load PDF');
                    }}
                  />
                )}
              </>
            )}
          </div>
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-800">
            <div className="text-center text-white">
              <p className="text-lg mb-4">File type not recognized</p>
              <div className="flex flex-col gap-2 items-center">
                <a
                  href={currentFile}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-white transition-colors"
                  onClick={(e) => e.stopPropagation()}
                >
                  Open in new tab
                </a>
                <a
                  href={currentFile}
                  download
                  className="px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded text-white transition-colors"
                  onClick={(e) => e.stopPropagation()}
                >
                  Download file
                </a>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="absolute bottom-0 left-0 right-0 z-20 bg-black/80 backdrop-blur-sm text-white p-2 text-xs text-center">
        <p>
          {currentFileType === 'image' && 'Click and drag to pan • '}
          Double-click to maximize • Use arrow keys to navigate • Press F for fullscreen • Press Esc to close
        </p>
      </div>
    </div>
  );
}

