'use client';

import React, { useState, useRef, useEffect } from 'react';
import { CameraIcon, XMarkIcon, CheckIcon } from '@heroicons/react/24/solid';
import { isCameraSupported } from '@/lib/utils/imageToPdf';

interface CameraCaptureProps {
  onCapture: (files: File[]) => void;
  onClose: () => void;
  maxPhotos?: number;
}

export default function CameraCapture({
  onCapture,
  onClose,
  maxPhotos = 10,
}: CameraCaptureProps) {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedPhotos, setCapturedPhotos] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isVideoReady, setIsVideoReady] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!isCameraSupported()) {
      setError('Camera is not supported on this device');
      return;
    }

    startCamera();

    return () => {
      stopCamera();
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // Separate useEffect to handle video element setup when stream changes
  useEffect(() => {
    if (!stream || !videoRef.current) return;

    const video = videoRef.current;
    let isCleanedUp = false;

    // Set srcObject
    video.srcObject = stream;

    const handleLoadedMetadata = () => {
      if (isCleanedUp) return;
      
      video.play()
        .then(() => {
          if (!isCleanedUp) {
            setIsVideoReady(true);
            setError(null);
            if (timeoutRef.current) {
              clearTimeout(timeoutRef.current);
              timeoutRef.current = null;
            }
          }
        })
        .catch((playError) => {
          console.error('Error playing video:', playError);
          if (!isCleanedUp) {
            setError('Failed to start camera preview. Please try again.');
          }
        });
    };

    const handleError = (e: Event) => {
      console.error('Video error:', e);
      if (!isCleanedUp) {
        setError('Failed to load camera stream. Please try again.');
      }
    };

    // Check if video already has metadata
    if (video.readyState >= 1) {
      // Metadata already loaded
      handleLoadedMetadata();
    } else {
      // Wait for metadata to load
      video.addEventListener('loadedmetadata', handleLoadedMetadata);
    }

    video.addEventListener('error', handleError);

    // Fallback timeout - if metadata doesn't load within 5 seconds, try to play anyway
    timeoutRef.current = setTimeout(() => {
      if (!isCleanedUp && video && videoRef.current === video) {
        // Check if video is already playing or ready
        const isPlaying = !video.paused && !video.ended && video.readyState > 2;
        if (!isPlaying) {
          console.log('Fallback: Attempting to play video after timeout');
          if (video.readyState >= 1 || stream.getVideoTracks().length > 0) {
            video.play()
              .then(() => {
                if (!isCleanedUp && videoRef.current === video) {
                  setIsVideoReady(true);
                  setError(null);
                }
              })
              .catch((err) => {
                console.error('Fallback play error:', err);
                if (!isCleanedUp) {
                  setError('Camera took too long to load. Please try again or use the Browse button.');
                }
              });
          } else {
            if (!isCleanedUp) {
              setError('Camera stream not ready. Please check permissions and try again.');
            }
          }
        }
      }
    }, 5000);

    return () => {
      isCleanedUp = true;
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('error', handleError);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [stream]);

  const startCamera = async () => {
    try {
      // Stop any existing stream first
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }

      // First, check if camera is actually available
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');
      
      if (videoDevices.length === 0) {
        setError('No camera found. This may be because you\'re using a browser emulator or the camera is not available. Please use the "Browse" button to upload images instead.');
        return;
      }

      // Try with preferred constraints first (back camera on mobile)
      let constraints: MediaStreamConstraints = {
        video: {
          facingMode: 'environment', // Use back camera on mobile
          // Optimized resolution for reports - good quality but not too large
          width: { ideal: 1280, max: 1920, min: 640 },
          height: { ideal: 720, max: 1080, min: 480 },
        },
        audio: false,
      };

      let mediaStream: MediaStream | null = null;

      try {
        mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch (firstError: any) {
        // If facingMode fails (e.g., desktop), try without it
        if (firstError.name === 'OverconstrainedError' || firstError.name === 'NotFoundError') {
          console.log('Trying without facingMode constraint...');
          constraints = {
            video: {
              width: { ideal: 1280, max: 1920, min: 640 },
              height: { ideal: 720, max: 1080, min: 480 },
            },
            audio: false,
          };
          
          try {
            mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
          } catch (secondError: any) {
            // Try with minimal constraints
            console.log('Trying with minimal constraints...');
            constraints = {
              video: true,
              audio: false,
            };
            mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
          }
        } else {
          throw firstError;
        }
      }

      if (!mediaStream) {
        throw new Error('Failed to get media stream');
      }

      // Reset video ready state before setting new stream
      setIsVideoReady(false);
      setStream(mediaStream);
      // Video setup will be handled by the useEffect hook
    } catch (err: any) {
      console.error('Error accessing camera:', err);
      let errorMessage = 'Failed to access camera. Please try again.';
      
      if (err.name === 'NotAllowedError') {
        errorMessage = 'Camera permission denied. Please allow camera access in your browser settings.';
      } else if (err.name === 'NotFoundError') {
        errorMessage = 'No camera found. If you\'re using a browser emulator or simulator, please use the "Browse" button to upload images instead.';
      } else if (err.name === 'NotReadableError') {
        errorMessage = 'Camera is already in use by another application. Please close other apps using the camera.';
      } else if (err.name === 'OverconstrainedError') {
        errorMessage = 'Camera constraints not supported. Please try using the "Browse" button to upload images instead.';
      }
      
      setError(errorMessage);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) {
      setError('Camera is not ready. Please wait...');
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    if (!ctx) {
      setError('Failed to initialize canvas context');
      return;
    }

    // Check if video has valid dimensions (iPhone PWA fix - removed isVideoReady check)
    if (video.videoWidth === 0 || video.videoHeight === 0) {
      setError('Video is not ready. Please wait for camera to load.');
      return;
    }

    try {
      // Set canvas dimensions to match video
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      // Draw video frame to canvas
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Convert canvas to data URL with optimized quality (0.75 for smaller file size)
      // Quality 0.75 provides good balance for report documents
      const dataUrl = canvas.toDataURL('image/jpeg', 0.75);
      
      // Verify the data URL is valid (not empty)
      if (!dataUrl || dataUrl.length < 100) {
        setError('Failed to capture image. Please try again.');
        return;
      }

      setCapturedPhotos((prev) => [...prev, dataUrl]);
      setIsCapturing(true);
      setError(null);

      // Small delay to show capture feedback
      setTimeout(() => setIsCapturing(false), 200);
    } catch (err: any) {
      console.error('Error capturing photo:', err);
      setError('Failed to capture photo. Please try again.');
    }
  };

  const removePhoto = (index: number) => {
    setCapturedPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const handleConfirm = () => {
    if (capturedPhotos.length === 0) {
      setError('Please capture at least one photo');
      return;
    }

    try {
      // Convert data URLs to File objects
      const files: File[] = capturedPhotos.map((dataUrl, index) => {
        const blob = dataUrlToBlob(dataUrl);
        
        // Verify blob size
        if (blob.size === 0) {
          throw new Error(`Image ${index + 1} is empty`);
        }
        
        const file = new File([blob], `camera-photo-${Date.now()}-${index}.jpg`, {
          type: 'image/jpeg',
          lastModified: Date.now(),
        });
        
        // Verify file size
        if (file.size === 0) {
          throw new Error(`File ${index + 1} has 0 bytes`);
        }
        
        return file;
      });

      stopCamera();
      onCapture(files);
    } catch (err: any) {
      console.error('Error processing captured photos:', err);
      setError(err.message || 'Failed to process photos. Please try capturing again.');
    }
  };

  const dataUrlToBlob = (dataUrl: string): Blob => {
    try {
      const arr = dataUrl.split(',');
      const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
      const bstr = atob(arr[1]);
      let n = bstr.length;
      const u8arr = new Uint8Array(n);
      while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
      }
      const blob = new Blob([u8arr], { type: mime });
      
      // Verify blob size
      if (blob.size === 0) {
        throw new Error('Blob size is 0');
      }
      
      return blob;
    } catch (err) {
      console.error('Error converting data URL to blob:', err);
      throw new Error('Failed to process image');
    }
  };

  if (!isCameraSupported()) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Camera Not Available
          </h3>
          <p className="text-gray-600 mb-4">
            Camera access is not available. This may be because:
          </p>
          <ul className="text-sm text-gray-600 mb-4 list-disc list-inside space-y-1">
            <li>You're using a browser emulator or simulator</li>
            <li>Your device doesn't have a camera</li>
            <li>Camera permissions are not granted</li>
          </ul>
          <p className="text-gray-600 mb-4">
            Please use the <strong>"Browse"</strong> button to upload images from your device instead.
          </p>
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col overflow-hidden" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      {/* Header */}
      <div className="bg-black/80 text-white p-4 flex items-center justify-between z-10 flex-shrink-0">
        <button
          onClick={() => {
            stopCamera();
            onClose();
          }}
          className="p-2 hover:bg-white/20 rounded-lg transition-colors"
          aria-label="Close camera"
        >
          <XMarkIcon className="w-6 h-6" />
        </button>
        <div className="flex flex-col items-center">
          <h3 className="text-lg font-semibold">
            Capture Report Photos ({capturedPhotos.length}/{maxPhotos})
          </h3>
          <p className="text-xs text-gray-300 mt-1">
            Photos will be merged into a single PDF report
          </p>
        </div>
        <div className="w-10" /> {/* Spacer for centering */}
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-500 text-white p-4 text-center z-10">
          <p className="text-sm font-medium mb-2">{error}</p>
          <button
            onClick={onClose}
            className="text-xs underline hover:no-underline bg-white/20 px-3 py-1 rounded transition-colors"
          >
            Use Browse Instead
          </button>
        </div>
      )}

      {/* Video Preview */}
      <div className="flex-1 relative bg-black flex items-center justify-center min-h-0 overflow-hidden">
        {stream && (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-contain"
          />
        )}
        {!isVideoReady && stream && (
          <div className="absolute inset-0 flex items-center justify-center text-white">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
              <p className="text-sm">Loading camera...</p>
            </div>
          </div>
        )}

        {/* Capture Flash Effect */}
        {isCapturing && (
          <div className="absolute inset-0 bg-white opacity-50 animate-pulse" />
        )}

        {/* Hidden canvas for capturing */}
        <canvas ref={canvasRef} className="hidden" />
      </div>

      {/* Captured Photos Preview */}
      {capturedPhotos.length > 0 && (
        <div className="bg-black/80 p-4 flex-shrink-0">
          <div className="flex gap-2 overflow-x-auto pb-2">
            {capturedPhotos.map((photo, index) => (
              <div key={index} className="relative flex-shrink-0">
                <img
                  src={photo}
                  alt={`Capture ${index + 1}`}
                  className="w-20 h-20 object-cover rounded-lg border-2 border-white"
                />
                <button
                  onClick={() => removePhoto(index)}
                  className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 hover:bg-red-600"
                >
                  <XMarkIcon className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Controls - Always visible with minimum height for PWA */}
      <div className="bg-black/80 p-4 sm:p-6 flex flex-col items-center justify-center gap-4 flex-shrink-0 relative z-20" style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
        <div className="flex items-center justify-center gap-4">
          {/* Always show button if stream exists with video tracks (iPhone PWA fix - show button immediately) */}
          {capturedPhotos.length < maxPhotos && stream && stream.getVideoTracks().length > 0 && (
            <button
              onClick={capturePhoto}
              disabled={isCapturing}
              className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-lg hover:bg-gray-100 active:scale-95 transition-all disabled:opacity-50 touch-manipulation z-30 cursor-pointer"
              aria-label="Capture photo"
              style={{ 
                WebkitTapHighlightColor: 'transparent',
                touchAction: 'manipulation',
                WebkitTouchCallout: 'none',
                userSelect: 'none',
                position: 'relative',
                zIndex: 30,
                display: 'flex',
                visibility: 'visible',
                opacity: 1
              }}
            >
              <CameraIcon className="w-8 h-8 text-gray-900 pointer-events-none" />
            </button>
          )}
          {/* Show loading spinner if stream exists but no video tracks yet */}
          {stream && stream.getVideoTracks().length === 0 && (
            <div className="w-16 h-16 bg-gray-600 rounded-full flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
            </div>
          )}

          {capturedPhotos.length > 0 && (
            <button
              onClick={handleConfirm}
              className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 active:bg-indigo-800 flex items-center gap-2 font-medium shadow-lg transition-all touch-manipulation"
            >
              <CheckIcon className="w-5 h-5" />
              <span className="hidden sm:inline">Create PDF Report</span>
              <span className="sm:hidden">Create PDF</span>
              <span className="bg-white/20 px-2 py-0.5 rounded text-sm">({capturedPhotos.length})</span>
            </button>
          )}
        </div>
        {capturedPhotos.length === 0 && stream && stream.getVideoTracks().length > 0 && (
          <p className="text-xs text-gray-400 text-center px-4">
            Tap the camera button to capture photos. All photos will be combined into one PDF report.
          </p>
        )}
      </div>
    </div>
  );
}

