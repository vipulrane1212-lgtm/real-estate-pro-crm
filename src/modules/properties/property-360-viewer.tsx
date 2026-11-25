'use client';

import React, { useRef, useState, useEffect } from 'react';
import { Compass, Maximize2, RotateCcw, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Property360ViewerProps {
  imageUrl?: string | null;
  propertyTitle?: string;
}

export function Property360Viewer({ imageUrl, propertyTitle }: Property360ViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [bgPositionX, setBgPositionX] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const handlePointerEnd = () => setIsDragging(false);
    window.addEventListener('pointerup', handlePointerEnd);
    window.addEventListener('pointercancel', handlePointerEnd);
    return () => {
      window.removeEventListener('pointerup', handlePointerEnd);
      window.removeEventListener('pointercancel', handlePointerEnd);
    };
  }, []);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture?.(e.pointerId);
    setIsDragging(true);
    setStartX(e.clientX - bgPositionX);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    const x = e.clientX - startX;
    setBgPositionX(x);
  };

  const resetView = () => {
    setBgPositionX(0);
  };

  if (!imageUrl) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 sm:p-8 text-center">
        <Compass className="h-8 w-8 text-slate-400" />
        <h4 className="mt-2 text-xs font-semibold text-slate-700">No 360° Panorama Linked</h4>
        <p className="mt-1 max-w-xs text-[11px] text-slate-500">
          Provide an equirectangular 360° image URL in property edit to enable virtual pan tour.
        </p>
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden rounded-xl border border-slate-200 bg-slate-900 shadow-inner select-none ${isFullscreen ? 'fixed inset-2 sm:inset-4 z-50 rounded-2xl border-4 border-amber-500' : 'h-56 sm:h-72 w-full'}`}>
      <div
        ref={containerRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={() => setIsDragging(false)}
        onPointerCancel={() => setIsDragging(false)}
        style={{
          backgroundImage: `url(${imageUrl})`,
          backgroundPosition: `${bgPositionX}px center`,
          backgroundRepeat: 'repeat-x',
          backgroundSize: 'auto 100%',
        }}
        className="h-full w-full touch-none cursor-grab active:cursor-grabbing transition-none"
      />

      {/* Floating 360 Overlay Controls */}
      <div className="absolute top-3 left-3 flex items-center gap-2 rounded-full bg-slate-900/80 px-3 py-1 text-xs font-medium text-amber-400 backdrop-blur-xs border border-amber-400/30">
        <Compass className="h-3.5 w-3.5 animate-spin" style={{ animationDuration: '6s' }} />
        <span>360° Tour • Drag or swipe</span>
      </div>

      <div className="absolute bottom-3 right-3 flex items-center gap-2">
        <button
          onClick={resetView}
          className="rounded-lg bg-slate-900/80 p-2 text-slate-300 hover:text-white backdrop-blur-xs transition-colors"
          title="Reset View"
        >
          <RotateCcw className="h-4 w-4" />
        </button>
        <button
          onClick={() => setIsFullscreen(prev => !prev)}
          className="rounded-lg bg-slate-900/80 p-2 text-slate-300 hover:text-white backdrop-blur-xs transition-colors"
          title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
        >
          <Maximize2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
