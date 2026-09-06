'use client';

import { useId } from 'react';

export type MasterChenEmotion = 'NORMAL' | 'WARNING' | 'PRAISE' | 'THINKING';

interface MasterChenAvatarProps {
  emotion?: MasterChenEmotion;
  size?: number;
  className?: string;
}

export function MasterChenAvatar({ emotion = 'NORMAL', size = 64, className = '' }: MasterChenAvatarProps) {
  const id = useId().replace(/:/g, '');
  const labels = { NORMAL: '讲解', WARNING: '提醒', PRAISE: '鼓励', THINKING: '思考' };
  return (
    <div
      className={`relative inline-flex items-center justify-center shrink-0 select-none ${className}`}
      style={{ width: size, height: size }}
      aria-label={`带教技师陈师傅：${labels[emotion]}`}
    >
      <svg
        viewBox="0 0 100 100"
        width={size}
        height={size}
        className={`chen-avatar chen-${emotion.toLowerCase()} w-full h-full drop-shadow-md`}
      >
        <defs>
          {/* Avatar Background Gradient */}
          <radialGradient id={`${id}-chenBg`} cx="50%" cy="40%" r="60%">
            <stop offset="0%" stopColor="#eaf5f7" />
            <stop offset="100%" stopColor="#c3dde3" />
          </radialGradient>
          {/* Helmet Gradient */}
          <linearGradient id={`${id}-helmetGrad`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#38bdf8" />
            <stop offset="60%" stopColor="#0284c7" />
            <stop offset="100%" stopColor="#0369a1" />
          </linearGradient>
          {/* Uniform Gradient */}
          <linearGradient id={`${id}-uniformGrad`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#1e3a8a" />
            <stop offset="100%" stopColor="#172554" />
          </linearGradient>
          {/* Skin Gradient */}
          <linearGradient id={`${id}-skinGrad`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#fde047" stopOpacity="0.3" />
            <stop offset="0%" stopColor="#fed7aa" />
            <stop offset="100%" stopColor="#fdba74" />
          </linearGradient>
        </defs>

        {/* Outer Circular Badge */}
        <circle cx="50" cy="50" r="48" fill={`url(#${id}-chenBg)`} stroke="#087f8c" strokeWidth="2.5" />

        {/* Shoulders & Uniform */}
        <path
          d="M20 92 C20 74, 34 68, 50 68 C66 68, 80 74, 80 92 Z"
          fill={`url(#${id}-uniformGrad)`}
        />
        {/* Uniform Collar & High-Vis Stripe */}
        <path d="M38 70 L50 82 L62 70" stroke="#f59e0b" strokeWidth="3.5" fill="none" strokeLinecap="round" />
        <path d="M50 82 L50 94" stroke="#e2e8f0" strokeWidth="2" strokeDasharray="2,2" />
        {/* Technician Chest Badge */}
        <rect x="58" y="77" width="14" height="6" rx="2" fill="#087f8c" />
        <text x="65" y="81.5" fontSize="3.5" fill="#fff" textAnchor="middle" fontWeight="bold">技师</text>

        {/* Neck */}
        <rect x="44" y="60" width="12" height="12" rx="3" fill="#fbcfe8" fillOpacity="0.4" />
        <rect x="44" y="60" width="12" height="12" rx="3" fill={`url(#${id}-skinGrad)`} />

        {/* Face */}
        <ellipse cx="50" cy="48" rx="17" ry="19" fill={`url(#${id}-skinGrad)`} />
        {/* Ears */}
        <circle cx="32" cy="48" r="4" fill={`url(#${id}-skinGrad)`} />
        <circle cx="68" cy="48" r="4" fill={`url(#${id}-skinGrad)`} />

        <g className="person-blink" style={{ transformOrigin: '50px 46px' }}>
        {/* Eyes according to emotion */}
        {emotion === 'PRAISE' ? (
          // Happy smiling eyes ^ ^
          <g stroke="#1e293b" strokeWidth="2.2" strokeLinecap="round" fill="none">
            <path d="M40 45 Q44 40 48 45" />
            <path d="M52 45 Q56 40 60 45" />
          </g>
        ) : emotion === 'WARNING' ? (
          // Serious alert eyes
          <g fill="#1e293b">
            <circle cx="43" cy="46" r="3" />
            <circle cx="57" cy="46" r="3" />
            <path d="M38 39 L47 43" stroke="#991b1b" strokeWidth="2.2" strokeLinecap="round" />
            <path d="M62 39 L53 43" stroke="#991b1b" strokeWidth="2.2" strokeLinecap="round" />
          </g>
        ) : emotion === 'THINKING' ? (
          // Looking up / thoughtful eyes
          <g fill="#1e293b">
            <circle cx="45" cy="43" r="2.8" />
            <circle cx="59" cy="43" r="2.8" />
            <path d="M40 39 Q44 38 48 40" stroke="#334155" strokeWidth="1.8" strokeLinecap="round" fill="none" />
            <path d="M52 40 Q56 38 60 39" stroke="#334155" strokeWidth="1.8" strokeLinecap="round" fill="none" />
          </g>
        ) : (
          // Normal friendly confident eyes
          <g fill="#1e293b">
            <circle cx="43" cy="46" r="2.5" />
            <circle cx="57" cy="46" r="2.5" />
            <circle cx="44" cy="45" r="0.8" fill="#fff" />
            <circle cx="58" cy="45" r="0.8" fill="#fff" />
            <path d="M39 41 Q44 39 47 41" stroke="#334155" strokeWidth="1.8" strokeLinecap="round" fill="none" />
            <path d="M53 41 Q56 39 61 41" stroke="#334155" strokeWidth="1.8" strokeLinecap="round" fill="none" />
          </g>
        )}

        </g>
        {/* Nose */}
        <path d="M50 47 Q52 51 48 52" stroke="#ea580c" strokeWidth="1.4" strokeLinecap="round" fill="none" />

        {/* Mouth according to emotion */}
        {emotion === 'PRAISE' ? (
          <path d="M43 54 Q50 63 57 54 Z" fill="#b91c1c" />
        ) : emotion === 'WARNING' ? (
          <path d="M44 57 Q50 54 56 57" stroke="#1e293b" strokeWidth="2" strokeLinecap="round" fill="none" />
        ) : emotion === 'THINKING' ? (
          <path d="M46 56 Q50 58 54 55" stroke="#1e293b" strokeWidth="1.8" strokeLinecap="round" fill="none" />
        ) : (
          <path d="M44 55 Q50 60 56 55" stroke="#1e293b" strokeWidth="2" strokeLinecap="round" fill="none" />
        )}

        {/* Hardhat / Safety Helmet */}
        <path
          d="M29 36 C29 20, 40 12, 50 12 C60 12, 71 20, 71 36 C73 36, 75 38, 73 40 C68 41, 32 41, 27 40 C25 38, 27 36, 29 36 Z"
          fill={`url(#${id}-helmetGrad)`}
        />
        {/* Helmet Ridge & Front Badge */}
        <path d="M49 12 L51 12 L52 35 L48 35 Z" fill="#0284c7" />
        {/* Safety Goggles perched on helmet */}
        <g opacity="0.95">
          <rect x="34" y="24" width="13" height="8" rx="3" fill="#38bdf8" fillOpacity="0.75" stroke="#0f172a" strokeWidth="1.5" />
          <rect x="53" y="24" width="13" height="8" rx="3" fill="#38bdf8" fillOpacity="0.75" stroke="#0f172a" strokeWidth="1.5" />
          <line x1="47" y1="28" x2="53" y2="28" stroke="#0f172a" strokeWidth="2" />
          <path d="M30 28 L34 28" stroke="#0f172a" strokeWidth="2" />
          <path d="M66 28 L70 28" stroke="#0f172a" strokeWidth="2" />
        </g>

        {/* Emotion Floating Badges (Top Right) */}
        {emotion === 'WARNING' && (
          <g transform="translate(68, 6)">
            <circle cx="10" cy="10" r="10" fill="#ef4444" className="animate-pulse" />
            <text x="10" y="14" fill="#fff" fontSize="12" fontWeight="bold" textAnchor="middle">!</text>
          </g>
        )}
        {emotion === 'PRAISE' && (
          <g transform="translate(68, 6)">
            <circle cx="10" cy="10" r="10" fill="#10b981" />
            <path d="M6 10 L9 13 L15 7" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          </g>
        )}
        {emotion === 'THINKING' && (
          <g transform="translate(68, 6)">
            <circle cx="10" cy="10" r="10" fill="#f59e0b" />
            <text x="10" y="14" fill="#fff" fontSize="11" fontWeight="bold" textAnchor="middle">?</text>
          </g>
        )}
      </svg>
    </div>
  );
}
