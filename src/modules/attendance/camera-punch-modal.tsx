'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import {
  Camera,
  MapPin,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  RotateCcw,
  ShieldAlert,
  Info,
} from 'lucide-react';

interface CameraPunchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  mode: 'check-in' | 'check-out';
  employeeName?: string;
}

export function CameraPunchModal({
  isOpen,
  onClose,
  onSuccess,
  mode,
  employeeName,
}: CameraPunchModalProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [stream, setStream] = useState<MediaStream | null>(null);
  const [selfieBase64, setSelfieBase64] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isCameraStarting, setIsCameraStarting] = useState(false);

  // GPS State
  const [gpsLocation, setGpsLocation] = useState<{ latitude: number; longitude: number; accuracy?: number } | null>(null);
  const [gpsAddress, setGpsAddress] = useState<string | null>(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Clean up camera stream on close
  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  };

  const startCamera = async () => {
    setIsCameraStarting(true);
    setCameraError(null);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera access is not supported by your browser.');
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user', // Front selfie camera
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
        audio: false,
      });

      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err: unknown) {
      console.error('Camera initialization error:', err);
      setCameraError(
        'Camera permission was denied or camera is unavailable. A live selfie is strictly required. File picker and gallery uploads are disabled.'
      );
    } finally {
      setIsCameraStarting(false);
    }
  };

  const captureGps = () => {
    setGpsLoading(true);
    setGpsError(null);

    if (!navigator.geolocation) {
      setGpsError('Geolocation is not supported by your browser.');
      setGpsLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGpsLocation({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        });
        setGpsAddress(`GPS Fix (±${Math.round(pos.coords.accuracy)}m)`);
        setGpsLoading(false);
      },
      (err) => {
        console.error('Geolocation error:', err);
        let msg = 'Location permission is required. Check-in cannot be recorded without GPS coordinates.';
        if (err.code === err.PERMISSION_DENIED) {
          msg = 'Location permission was denied. Please allow location access in your browser settings to proceed.';
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          msg = 'GPS signal is currently unavailable. Please check your device location settings.';
        } else if (err.code === err.TIMEOUT) {
          msg = 'GPS location timed out. Please tap Retry GPS.';
        }
        setGpsError(msg);
        setGpsLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 0,
      }
    );
  };

  useEffect(() => {
    if (isOpen) {
      setSelfieBase64(null);
      setErrorMessage('');
      setGpsLocation(null);
      setGpsError(null);

      // Request live camera and GPS simultaneously
      startCamera();
      captureGps();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen]);

  // Keep videoRef srcObject updated when stream changes
  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  const handleCaptureSelfie = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;

    const canvas = canvasRef.current || document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      setSelfieBase64(dataUrl);
      // Stop live stream after photo taken to save battery
      stopCamera();
    }
  };

  const handleRetake = () => {
    setSelfieBase64(null);
    startCamera();
  };

  const handleSubmitPunch = async () => {
    if (!gpsLocation) {
      setErrorMessage('Location permission is required. Check-in cannot be recorded without GPS coordinates.');
      return;
    }

    if (!selfieBase64) {
      setErrorMessage('Live camera selfie is required. Please capture a live selfie.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const endpoint = mode === 'check-in' ? '/api/attendance/check-in' : '/api/attendance/check-out';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          latitude: gpsLocation.latitude,
          longitude: gpsLocation.longitude,
          address: gpsAddress || `Lat: ${gpsLocation.latitude.toFixed(5)}, Lng: ${gpsLocation.longitude.toFixed(5)}`,
          selfie_base64: selfieBase64,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Attendance punch failed');
      }

      stopCamera();
      onSuccess();
    } catch (err: unknown) {
      console.error('Punch error:', err);
      setErrorMessage(err instanceof Error ? err.message : 'Punch failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isCheckIn = mode === 'check-in';

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        stopCamera();
        onClose();
      }}
      title={isCheckIn ? 'Attendance Check-in' : 'Attendance Check-out'}
      description="Live phone camera selfie & exact GPS location verification."
      maxWidth="md"
    >
      <div className="space-y-4">
        {/* Error Alert */}
        {errorMessage && (
          <div className="flex items-start gap-2 rounded-lg bg-red-50 p-3 text-xs text-red-700">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Live Camera Viewport (Strictly NO file picker) */}
        <div className="relative overflow-hidden rounded-xl border border-slate-300 bg-black aspect-4/3 flex items-center justify-center">
          {selfieBase64 ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={selfieBase64}
              alt="Live Captured Selfie"
              className="h-full w-full object-cover"
            />
          ) : (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="h-full w-full object-cover"
            />
          )}

          {/* Watermark timestamp overlay */}
          <div className="absolute top-2 left-2 rounded bg-black/60 px-2 py-1 text-[10px] font-mono text-white backdrop-blur-xs">
            {new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </div>

          {/* Live Camera Overlay Notice */}
          {!selfieBase64 && !cameraError && (
            <div className="absolute bottom-2 left-2 right-2 rounded bg-slate-900/75 p-1.5 text-center text-[10px] text-amber-300 backdrop-blur-xs">
              Live selfie only • Gallery upload blocked
            </div>
          )}

          {/* Camera Error Message */}
          {cameraError && !selfieBase64 && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/90 p-4 text-center">
              <Camera className="h-8 w-8 text-red-400 mb-2" />
              <p className="text-xs font-semibold text-white">Camera Access Required</p>
              <p className="mt-1 text-[11px] text-slate-300 max-w-xs">{cameraError}</p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={startCamera}
                className="mt-3 text-white border-slate-600 hover:bg-slate-800 text-xs"
              >
                <RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Retry Camera Access
              </Button>
            </div>
          )}
        </div>

        {/* Camera Action Buttons */}
        <div className="flex items-center justify-center gap-2">
          {selfieBase64 ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleRetake}
              className="text-xs"
            >
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Retake Selfie
            </Button>
          ) : (
            <Button
              type="button"
              size="sm"
              onClick={handleCaptureSelfie}
              disabled={!stream || isCameraStarting}
              className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold shadow-xs"
            >
              <Camera className="mr-1.5 h-4 w-4" /> Capture Live Selfie
            </Button>
          )}
        </div>

        {/* GPS Status Box */}
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-slate-700 flex items-center gap-1.5">
              <MapPin className="h-4 w-4 text-amber-600" />
              GPS Location Verification
            </span>
            {gpsLoading ? (
              <span className="inline-flex items-center gap-1 text-[11px] text-amber-700 font-medium">
                <RefreshCw className="h-3 w-3 animate-spin" /> Acquiring GPS...
              </span>
            ) : gpsLocation ? (
              <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 font-bold">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                Locked (±{Math.round(gpsLocation.accuracy || 10)}m)
              </span>
            ) : (
              <span className="text-[11px] text-red-600 font-semibold">Denied / Missing</span>
            )}
          </div>

          {gpsLocation ? (
            <div className="mt-2 text-[11px] font-mono text-slate-600 bg-white p-2 rounded border border-slate-200 flex items-center justify-between">
              <span>
                {gpsLocation.latitude.toFixed(6)}, {gpsLocation.longitude.toFixed(6)}
              </span>
              <a
                href={`https://www.google.com/maps?q=${gpsLocation.latitude},${gpsLocation.longitude}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-amber-700 underline text-[10px]"
              >
                View on Map
              </a>
            </div>
          ) : gpsError ? (
            <div className="mt-2 text-[11px] text-red-600 bg-red-50 p-2 rounded border border-red-200">
              <p>{gpsError}</p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={captureGps}
                className="mt-2 h-7 text-xs text-red-700 border-red-200 bg-white"
              >
                <RefreshCw className="mr-1 h-3 w-3" /> Retry GPS
              </Button>
            </div>
          ) : null}
        </div>

        {/* Honest Limitations Notice */}
        <div className="rounded-lg border border-slate-100 bg-slate-50/70 p-2.5 text-[11px] text-slate-500 leading-relaxed space-y-1">
          <div className="flex items-center gap-1 font-semibold text-slate-700">
            <Info className="h-3.5 w-3.5 text-slate-400" />
            Verification Notice:
          </div>
          <p>
            • GPS coordinates & live selfie are captured exclusively at punch time. Continuous background tracking is disabled.
          </p>
          <p>
            • Check-in past 10:00 AM IST is automatically marked <strong>Late</strong>.
          </p>
        </div>

        {/* Submit Punch Button */}
        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              stopCamera();
              onClose();
            }}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleSubmitPunch}
            isLoading={isSubmitting}
            disabled={!selfieBase64 || !gpsLocation}
            className={`${
              isCheckIn
                ? 'bg-emerald-600 hover:bg-emerald-700'
                : 'bg-rose-600 hover:bg-rose-700'
            } text-white font-bold shadow-xs`}
          >
            {isCheckIn ? 'Confirm Check-in' : 'Confirm Check-out'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
