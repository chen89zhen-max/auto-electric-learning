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
          {/* 头像圆形底板质感渐变 */}
          <radialGradient id={`${id}-chenBg`} cx="50%" cy="38%" r="62%">
            <stop offset="0%" stopColor="#f0fdf4" />
            <stop offset="55%" stopColor="#e0f2fe" />
            <stop offset="100%" stopColor="#bae6fd" />
          </radialGradient>
          {/* 大师头盔渐变（高光深邃工业蓝） */}
          <linearGradient id={`${id}-helmetGrad`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#38bdf8" />
            <stop offset="45%" stopColor="#0284c7" />
            <stop offset="100%" stopColor="#075985" />
          </linearGradient>
          {/* 大师工作服深海军蓝渐变 */}
          <linearGradient id={`${id}-uniformGrad`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#1e3a8a" />
            <stop offset="60%" stopColor="#172554" />
            <stop offset="100%" stopColor="#0f172a" />
          </linearGradient>
          {/* 师傅沉稳微暖肤色 */}
          <linearGradient id={`${id}-skinGrad`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fef3c7" />
            <stop offset="60%" stopColor="#fed7aa" />
            <stop offset="100%" stopColor="#fdba74" />
          </linearGradient>
          {/* 金色大师滚边与徽章 */}
          <linearGradient id={`${id}-goldGrad`} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#f59e0b" />
            <stop offset="50%" stopColor="#fef08a" />
            <stop offset="100%" stopColor="#d97706" />
          </linearGradient>
        </defs>

        {/* 外层圆形徽章底框与金属光泽内圈 */}
        <circle cx="50" cy="50" r="48" fill={`url(#${id}-chenBg)`} stroke="#0284c7" strokeWidth="2.5" />
        <circle cx="50" cy="50" r="46" fill="none" stroke="#ffffff" strokeWidth="1.2" opacity="0.8" />

        {/* 肩部与大师工装 */}
        <path
          d="M 16 94 C 16 74, 33 68, 50 68 C 67 68, 84 74, 84 94 Z"
          fill={`url(#${id}-uniformGrad)`}
        />
        {/* 金色大师立领滚边与高可视反光带 */}
        <path d="M 36 71 L 50 83 L 64 71" stroke={`url(#${id}-goldGrad)`} strokeWidth="3" fill="none" strokeLinecap="round" />
        <path d="M 50 83 L 50 95" stroke="#e2e8f0" strokeWidth="1.8" strokeDasharray="2 2" />

        {/* 带教大师专属胸牌 */}
        <rect x="58" y="77" width="16" height="7" rx="2" fill="#0369a1" stroke={`url(#${id}-goldGrad)`} strokeWidth="1" />
        <text x="66" y="82.2" fontSize="4.2" fill="#ffffff" textAnchor="middle" fontWeight="bold">导师</text>

        {/* 颈部与阴影 */}
        <rect x="44" y="58" width="12" height="14" rx="3" fill="#ea580c" opacity="0.35" />
        <rect x="44" y="58" width="12" height="14" rx="3" fill={`url(#${id}-skinGrad)`} />

        {/* 脸型与下颌轮廓（展现成熟稳健的师傅脸型） */}
        <path
          d="M 34 46 C 34 64, 66 64, 66 46 C 66 32, 34 32, 34 46 Z"
          fill={`url(#${id}-skinGrad)`}
        />

        {/* 露在安全帽外的成熟利落短发与鬓角 */}
        <path d="M 32 40 L 36 50 L 38 46 L 36 38 Z" fill="#1e293b" />
        <path d="M 68 40 L 64 50 L 62 46 L 64 38 Z" fill="#1e293b" />

        {/* 双耳 */}
        <circle cx="33" cy="47" r="4.2" fill={`url(#${id}-skinGrad)`} stroke="#fdba74" strokeWidth="0.8" />
        <circle cx="67" cy="47" r="4.2" fill={`url(#${id}-skinGrad)`} stroke="#fdba74" strokeWidth="0.8" />
        <path d="M 32 46 Q 34 47 33 49" stroke="#ea580c" strokeWidth="0.8" fill="none" />
        <path d="M 68 46 Q 66 47 67 49" stroke="#ea580c" strokeWidth="0.8" fill="none" />

        {/* 面部五官微表情（支持眨眼） */}
        <g className="person-blink" style={{ transformOrigin: '50px 46px' }}>
          {emotion === 'PRAISE' ? (
            // 鼓励/称赞状态：亲切弯弯的笑眼与和蔼笑纹
            <g stroke="#0f172a" strokeWidth="2.2" strokeLinecap="round" fill="none">
              <path d="M 39 45 Q 44 39 48 45" />
              <path d="M 52 45 Q 56 39 61 45" />
              {/* 舒展温和的笑眉 */}
              <path d="M 38 38 Q 43 35 48 38" stroke="#334155" strokeWidth="1.8" />
              <path d="M 52 38 Q 57 35 62 38" stroke="#334155" strokeWidth="1.8" />
            </g>
          ) : emotion === 'WARNING' ? (
            // 提醒/警示状态：专注严肃、目光如炬
            <g>
              {/* 紧蹙的剑眉 */}
              <path d="M 37 38 L 47 42" stroke="#991b1b" strokeWidth="2.4" strokeLinecap="round" />
              <path d="M 63 38 L 53 42" stroke="#991b1b" strokeWidth="2.4" strokeLinecap="round" />
              {/* 凝视双眼 */}
              <circle cx="43" cy="46" r="3.2" fill="#0f172a" />
              <circle cx="57" cy="46" r="3.2" fill="#0f172a" />
              <circle cx="42.2" cy="45.2" r="1" fill="#ffffff" />
              <circle cx="56.2" cy="45.2" r="1" fill="#ffffff" />
            </g>
          ) : emotion === 'THINKING' ? (
            // 思考状态：视线微微上扬、眉头微扬
            <g>
              <path d="M 38 37 Q 43 36 47 38" stroke="#334155" strokeWidth="1.8" strokeLinecap="round" fill="none" />
              <path d="M 53 38 Q 57 35 62 36" stroke="#334155" strokeWidth="1.8" strokeLinecap="round" fill="none" />
              <circle cx="44" cy="43" r="3" fill="#0f172a" />
              <circle cx="58" cy="43" r="3" fill="#0f172a" />
              <circle cx="45" cy="42" r="1.1" fill="#ffffff" />
              <circle cx="59" cy="42" r="1.1" fill="#ffffff" />
            </g>
          ) : (
            // 常态讲解：从容温和、专注有神的大师眼神
            <g>
              {/* 沉稳平整眉毛 */}
              <path d="M 38 39 Q 43 37 47 39" stroke="#334155" strokeWidth="2" strokeLinecap="round" fill="none" />
              <path d="M 53 39 Q 57 37 62 39" stroke="#334155" strokeWidth="2" strokeLinecap="round" fill="none" />
              {/* 睿智双眼与双层高光 */}
              <circle cx="43" cy="45.5" r="2.8" fill="#0f172a" />
              <circle cx="57" cy="45.5" r="2.8" fill="#0f172a" />
              <circle cx="42.2" cy="44.5" r="1" fill="#ffffff" />
              <circle cx="56.2" cy="44.5" r="1" fill="#ffffff" />
              <circle cx="44" cy="46.5" r="0.5" fill="#38bdf8" />
              <circle cx="58" cy="46.5" r="0.5" fill="#38bdf8" />
            </g>
          )}
        </g>

        {/* 师傅挺秀坚毅的鼻梁 */}
        <path d="M 50 44 L 51 49 L 48 50" stroke="#ea580c" strokeWidth="1.4" strokeLinecap="round" fill="none" />

        {/* 嘴部表情 */}
        {emotion === 'PRAISE' ? (
          <path d="M 43 53 Q 50 62 57 53 Z" fill="#b91c1c" stroke="#991b1b" strokeWidth="0.8" />
        ) : emotion === 'WARNING' ? (
          <path d="M 44 56 Q 50 53 56 56" stroke="#0f172a" strokeWidth="2" strokeLinecap="round" fill="none" />
        ) : emotion === 'THINKING' ? (
          <path d="M 46 55 Q 50 57 54 54" stroke="#0f172a" strokeWidth="1.8" strokeLinecap="round" fill="none" />
        ) : (
          <path d="M 44 54 Q 50 58 56 54" stroke="#0f172a" strokeWidth="1.8" strokeLinecap="round" fill="none" />
        )}

        {/* 思考状态下托腮的手 */}
        {emotion === 'THINKING' && (
          <g transform="translate(32, 54)">
            <ellipse cx="6" cy="4" rx="4.5" ry="3.5" fill={`url(#${id}-skinGrad)`} stroke="#fdba74" strokeWidth="0.8" />
            <path d="M 3 2 L 6 6" stroke="#ea580c" strokeWidth="0.8" />
          </g>
        )}

        {/* --- 大师级工程安全帽与翻折防护目镜 --- */}
        <path
          d="M 28 35 C 28 17, 40 10, 50 10 C 60 10, 72 17, 72 35 C 75 35, 77 38, 74 40 C 69 41, 31 41, 26 40 C 23 38, 25 35, 28 35 Z"
          fill={`url(#${id}-helmetGrad)`}
          stroke="#0369a1"
          strokeWidth="1.5"
        />
        {/* 头盔中心加强脊柱 */}
        <path d="M 49 10 L 51 10 L 52 35 L 48 35 Z" fill="#0284c7" />

        {/* 大师头盔金质五星/齿轮盾牌帽徽 */}
        <polygon
          points="50,16 52.5,21 58,21.5 54,25 55.5,30.5 50,27.5 44.5,30.5 46,25 42,21.5 47.5,21"
          fill={`url(#${id}-goldGrad)`}
          stroke="#b45309"
          strokeWidth="0.5"
        />

        {/* 翻折在头盔上的高级防弧光护目镜 */}
        <g opacity="0.95">
          <rect x="33" y="24" width="14" height="8.5" rx="3" fill="#38bdf8" fillOpacity="0.7" stroke="#0f172a" strokeWidth="1.5" />
          <rect x="53" y="24" width="14" height="8.5" rx="3" fill="#38bdf8" fillOpacity="0.7" stroke="#0f172a" strokeWidth="1.5" />
          <line x1="47" y1="28" x2="53" y2="28" stroke="#0f172a" strokeWidth="2" />
          <line x1="35" y1="26" x2="39" y2="30" stroke="#ffffff" strokeWidth="1" strokeLinecap="round" opacity="0.9" />
          <line x1="55" y1="26" x2="59" y2="30" stroke="#ffffff" strokeWidth="1" strokeLinecap="round" opacity="0.9" />
        </g>

        {/* 右上角浮动微表情标志 */}
        {emotion === 'WARNING' && (
          <g transform="translate(68, 5)">
            <circle cx="10" cy="10" r="10" fill="#ef4444" stroke="#ffffff" strokeWidth="1.5" className="animate-pulse" />
            <text x="10" y="14.5" fill="#fff" fontSize="12" fontWeight="black" textAnchor="middle">!</text>
          </g>
        )}
        {emotion === 'PRAISE' && (
          <g transform="translate(68, 5)">
            <circle cx="10" cy="10" r="10" fill="#10b981" stroke="#ffffff" strokeWidth="1.5" />
            <path d="M 6 10 L 9 13 L 15 7" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          </g>
        )}
        {emotion === 'THINKING' && (
          <g transform="translate(68, 5)">
            <circle cx="10" cy="10" r="10" fill="#f59e0b" stroke="#ffffff" strokeWidth="1.5" />
            <text x="10" y="14.5" fill="#fff" fontSize="12" fontWeight="black" textAnchor="middle">?</text>
          </g>
        )}
      </svg>
    </div>
  );
}

