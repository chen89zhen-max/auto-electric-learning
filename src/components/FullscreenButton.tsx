'use client';

import React, { useSyncExternalStore } from 'react';
import { Maximize2, Minimize2 } from 'lucide-react';

interface FullscreenButtonProps {
  className?: string;
  showText?: boolean;
}

interface VendorDocument extends Document {
  webkitFullscreenEnabled?: boolean;
  mozFullScreenEnabled?: boolean;
  msFullscreenEnabled?: boolean;
  webkitFullscreenElement?: Element | null;
  mozFullScreenElement?: Element | null;
  msFullscreenElement?: Element | null;
}

interface VendorElement extends HTMLElement {
  webkitRequestFullscreen?: () => Promise<void>;
  mozRequestFullScreen?: () => Promise<void>;
  msRequestFullscreen?: () => Promise<void>;
}

interface VendorDocumentExit extends Document {
  webkitExitFullscreen?: () => Promise<void>;
  mozCancelFullScreen?: () => Promise<void>;
  msExitFullscreen?: () => Promise<void>;
}

function getIsFullscreen(): boolean {
  if (typeof document === 'undefined') return false;
  const doc = document as VendorDocument;
  return Boolean(
    doc.fullscreenElement ||
    doc.webkitFullscreenElement ||
    doc.mozFullScreenElement ||
    doc.msFullscreenElement
  );
}

function subscribeFullscreen(callback: () => void): () => void {
  if (typeof document === 'undefined') return () => {};
  document.addEventListener('fullscreenchange', callback);
  document.addEventListener('webkitfullscreenchange', callback);
  document.addEventListener('mozfullscreenchange', callback);
  document.addEventListener('MSFullscreenChange', callback);
  return () => {
    document.removeEventListener('fullscreenchange', callback);
    document.removeEventListener('webkitfullscreenchange', callback);
    document.removeEventListener('mozfullscreenchange', callback);
    document.removeEventListener('MSFullscreenChange', callback);
  };
}

export function FullscreenButton({ className = '', showText = true }: FullscreenButtonProps) {
  const isFullscreen = useSyncExternalStore(subscribeFullscreen, getIsFullscreen, () => false);

  const toggleFullscreen = async () => {
    if (typeof document === 'undefined') return;
    try {
      const doc = document as VendorDocumentExit;
      const el = document.documentElement as VendorElement;

      if (!isFullscreen) {
        if (el.requestFullscreen) {
          await el.requestFullscreen();
        } else if (el.webkitRequestFullscreen) {
          await el.webkitRequestFullscreen();
        } else if (el.mozRequestFullScreen) {
          await el.mozRequestFullScreen();
        } else if (el.msRequestFullscreen) {
          await el.msRequestFullscreen();
        }
      } else {
        if (doc.exitFullscreen) {
          await doc.exitFullscreen();
        } else if (doc.webkitExitFullscreen) {
          await doc.webkitExitFullscreen();
        } else if (doc.mozCancelFullScreen) {
          await doc.mozCancelFullScreen();
        } else if (doc.msExitFullscreen) {
          await doc.msExitFullscreen();
        }
      }
    } catch (err) {
      console.warn('Fullscreen toggle request was blocked or failed:', err);
    }
  };

  return (
    <button
      type="button"
      onClick={toggleFullscreen}
      className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg border transition-all cursor-pointer shadow-xs ${
        isFullscreen
          ? 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100 ring-2 ring-amber-400/30'
          : 'bg-slate-100 text-slate-700 hover:text-slate-900 hover:bg-slate-200 border-slate-300'
      } ${className}`}
      title={isFullscreen ? '退出全屏模式 (Esc)' : '开启全屏模式 (获得最大垂直操作空间，避免浏览器栏遮挡)'}
    >
      {isFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
      {showText && (
        <span>{isFullscreen ? '退出全屏' : '全屏模式'}</span>
      )}
    </button>
  );
}
