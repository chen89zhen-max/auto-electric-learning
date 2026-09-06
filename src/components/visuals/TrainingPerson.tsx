'use client';
/* eslint-disable jsx-a11y/prefer-tag-over-role -- Inline animated SVG uses the image role for its accessible name. */

import { useId } from 'react';

export interface TrainingPersonProps {
  pose?: 'standing' | 'lying' | 'cpr';
  action?: boolean;
  className?: string;
}

/**
 * 现代工业矢量风汽车实训角色组件
 * 支持三种姿态：
 * 1. standing: 见习电工技师小张（身着现代安全工装、安全帽与防护镜、工具插袋、呼吸/挥手互动）
 * 2. lying: 2号工位事故倒地学员（自然解剖侧仰卧、闭目微倾、立体双腿与鞋底花纹、车间地面柔和投影）
 * 3. cpr: 心肺复苏实训模型（双手垂直交叉扣掌、胸骨下半段靶心、按压下陷5~6cm与回弹冲击波动效）
 */
export function TrainingPerson({ pose = 'standing', action = false, className = '' }: TrainingPersonProps) {
  const uid = useId().replace(/:/g, '');

  // --------------------------------------------------------------------------
  // 1. 站姿（见习电工小张）：现代职业教育青年技师真实形象
  // --------------------------------------------------------------------------
  if (pose === 'standing') {
    return (
      <svg
        viewBox="0 0 160 260"
        className={`training-person standing-person ${className}`}
        role="img"
        aria-label="穿着现代电工工装的见习技师小张"
      >
        <ellipse cx="80" cy="248" rx="44" ry="7" fill="#020617" opacity="0.35" />
        <ellipse cx="80" cy="248" rx="26" ry="4" fill="#020617" opacity="0.45" />

        <g className={`person-idle ${action ? 'person-wave' : ''}`}>
          <image
            href="/characters/technician_standing.png"
            x="36"
            y="6"
            width="88"
            height="242"
            preserveAspectRatio="xMidYMid meet"
          />
        </g>
      </svg>
    );
  }

  // --------------------------------------------------------------------------
  // 2. 倒地姿态（2号工位触电事故学员小张）：生动自然的真实人体侧卧姿态
  // --------------------------------------------------------------------------
  if (pose === 'lying') {
    return (
      <svg
        viewBox="0 0 420 140"
        className={`training-person lying-person ${className}`}
        role="img"
        aria-label="倒地学员小张，身旁脱落带电导线，等待安全切断评估"
      >
        <defs>
          <radialGradient id={`${uid}-ground-shadow`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#020617" stopOpacity="0.8" />
            <stop offset="55%" stopColor="#020617" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#020617" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* 地面大范围弥散柔和阴影 */}
        <ellipse cx="210" cy="112" rx="195" ry="18" fill={`url(#${uid}-ground-shadow)`} />
        <ellipse cx="205" cy="114" rx="140" ry="10" fill="#020617" opacity="0.45" />

        {/* 散落在身旁的实训安全帽 */}
        <g transform="translate(12, 78) rotate(-16)">
          <path
            d="M 10 16 C 10 5, 36 5, 36 16 C 40 16, 41 18, 39 20 C 35 21, 12 21, 8 20 C 6 18, 7 16, 10 16 Z"
            fill="#f59e0b"
            stroke="#b45309"
            strokeWidth="1.2"
          />
          <path d="M 22 6 L 25 6 L 25 16 L 22 16 Z" fill="#d97706" />
          <circle cx="23" cy="12" r="2.5" fill="#0f172a" />
          <rect x="15" y="12" width="7" height="4.5" rx="1.5" fill="#38bdf8" fillOpacity="0.75" stroke="#0f172a" strokeWidth="0.8" />
          <rect x="25" y="12" width="7" height="4.5" rx="1.5" fill="#38bdf8" fillOpacity="0.75" stroke="#0f172a" strokeWidth="0.8" />
        </g>

        {/* 真实生动的学员倒地高清形象 */}
        <image
          href="/characters/technician_lying.png"
          x="20"
          y="12"
          width="390"
          height="100"
          preserveAspectRatio="xMidYMid meet"
        />
      </svg>
    );
  }

  // --------------------------------------------------------------------------
  // 3. CPR 急救按压模型：专业胸部解剖定位与双手交叉扣掌垂直按压动效
  // --------------------------------------------------------------------------
  return (
    <svg
      viewBox="0 0 380 160"
      className={`training-person cpr-person ${className}`}
      role="img"
      aria-label={action ? '心肺复苏模型正在下压 5~6cm 并充分回弹' : '心肺复苏按压模型，等待垂直掌根按压'}
    >
      <defs>
        {/* 仿真人胸腔皮肤渐变 */}
        <linearGradient id={`${uid}-cpr-chest`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#fed7aa" />
          <stop offset="40%" stopColor="#fed7aa" />
          <stop offset="80%" stopColor="#fba36e" />
          <stop offset="100%" stopColor="#ea580c" />
        </linearGradient>
        {/* 施救者医务/工装袖口 */}
        <linearGradient id={`${uid}-rescuer-sleeve`} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#0284c7" />
          <stop offset="100%" stopColor="#0369a1" />
        </linearGradient>
        {/* 施救者双手皮肤 */}
        <linearGradient id={`${uid}-rescuer-hand`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#fef3c7" />
          <stop offset="100%" stopColor="#fdba74" />
        </linearGradient>
      </defs>

      {/* 地面柔和背景投影 */}
      <ellipse cx="190" cy="135" rx="150" ry="16" fill="#020617" opacity="0.4" />

      {/* --- 患者/急救模拟人仰卧躯干 --- */}
      {/* 躯干轮廓（受按压时胸骨处微下沉） */}
      <g
        style={{
          transform: action ? 'translateY(5px) scaleY(0.96)' : 'none',
          transformOrigin: '190px 130px',
          transition: 'transform 120ms cubic-bezier(0.2, 0.8, 0.3, 1)',
        }}
      >
        {/* 躯干垫底与胸廓剖面 */}
        <path
          d="M 60 115 C 80 82, 140 76, 190 76 C 240 76, 300 82, 320 115 L 315 132 C 280 138, 100 138, 65 132 Z"
          fill={`url(#${uid}-cpr-chest)`}
          stroke="#d97706"
          strokeWidth="1.5"
        />

        {/* 模拟人衣物解开状态（展现标准急救要求：解开上衣、露出胸部） */}
        <path d="M 60 115 Q 110 88 125 125" stroke="#0284c7" strokeWidth="8" fill="none" strokeLinecap="round" />
        <path d="M 320 115 Q 270 88 255 125" stroke="#0284c7" strokeWidth="8" fill="none" strokeLinecap="round" />

        {/* 锁骨线条 */}
        <path d="M 135 84 Q 160 88 185 86" stroke="#d97706" strokeWidth="1.5" strokeLinecap="round" fill="none" opacity="0.7" />
        <path d="M 245 84 Q 220 88 195 86" stroke="#d97706" strokeWidth="1.5" strokeLinecap="round" fill="none" opacity="0.7" />

        {/* 两乳头连线辅助定位虚线 */}
        <line x1="140" y1="96" x2="240" y2="96" stroke="#0284c7" strokeWidth="1.5" strokeDasharray="3 3" opacity="0.6" />
        <circle cx="140" cy="96" r="3" fill="#ea580c" opacity="0.6" />
        <circle cx="240" cy="96" r="3" fill="#ea580c" opacity="0.6" />

        {/* 胸骨体轮廓 */}
        <rect x="184" y="85" width="12" height="34" rx="5" fill="#fed7aa" stroke="#d97706" strokeWidth="1" opacity="0.8" />

        {/* 标准胸外心脏按压靶心（胸骨下半段） */}
        <g transform="translate(190, 102)">
          {/* 外圈呼吸光环 */}
          <circle cx="0" cy="0" r="16" fill="none" stroke="#10b981" strokeWidth="2" strokeDasharray="4 3" opacity="0.85" />
          {/* 内圈实线靶心 */}
          <circle cx="0" cy="0" r="10" fill="#10b981" fillOpacity={action ? '0.35' : '0.15'} stroke="#059669" strokeWidth="2" />
          {/* 十字准星标线 */}
          <line x1="-13" y1="0" x2="13" y2="0" stroke="#047857" strokeWidth="1.5" />
          <line x1="0" y1="-13" x2="0" y2="13" stroke="#047857" strokeWidth="1.5" />
          <circle cx="0" cy="0" r="3" fill="#047857" />
        </g>

        {/* 按压靶位规范文字标注 */}
        <text x="190" y="128" fontSize="8" fill="#047857" fontWeight="bold" textAnchor="middle" letterSpacing="0.5">
          按压靶心 · 胸骨下半段 (两乳头连线中点)
        </text>

        {/* 按压瞬间扩散的冲击波反馈动效 */}
        {action && (
          <g transform="translate(190, 102)">
            <circle cx="0" cy="0" r="24" fill="none" stroke="#34d399" strokeWidth="2" opacity="0.8" className="animate-ping" />
            <circle cx="0" cy="0" r="34" fill="none" stroke="#6ee7b7" strokeWidth="1.5" opacity="0.5" />
          </g>
        )}
      </g>

      {/* --- 施救者双手与双臂（自上方垂直垂直向下、十指交叉相扣掌根着力） --- */}
      <g
        style={{
          transform: action ? 'translateY(7px)' : 'none',
          transition: 'transform 120ms cubic-bezier(0.2, 0.8, 0.3, 1)',
        }}
      >
        {/* 左臂（垂直下压） */}
        <path
          d="M 166 2 L 172 65 L 184 65 L 180 2 Z"
          fill={`url(#${uid}-rescuer-sleeve)`}
          stroke="#0f172a"
          strokeWidth="1.5"
        />
        {/* 右臂（垂直下压） */}
        <path
          d="M 200 2 L 196 65 L 208 65 L 214 2 Z"
          fill={`url(#${uid}-rescuer-sleeve)`}
          stroke="#0f172a"
          strokeWidth="1.5"
        />

        {/* 施救者袖口与腕部 */}
        <rect x="170" y="62" width="16" height="6" rx="2" fill="#0f172a" />
        <rect x="194" y="62" width="16" height="6" rx="2" fill="#0f172a" />

        {/* 手腕外露皮肤 */}
        <path d="M 173 68 L 178 78 L 187 78 L 183 68 Z" fill={`url(#${uid}-rescuer-hand)`} />
        <path d="M 197 68 L 193 78 L 202 78 L 207 68 Z" fill={`url(#${uid}-rescuer-hand)`} />

        {/* 十指交叉重叠扣合的双手专业解剖结构 */}
        {/* 下方支撑手（掌根稳贴靶心） */}
        <ellipse cx="190" cy="98" rx="14" ry="7" fill={`url(#${uid}-rescuer-hand)`} stroke="#ea580c" strokeWidth="1.2" />

        {/* 上方扣压手与交叉手指 */}
        <path
          d="M 178 78 Q 190 74 202 78 L 204 88 Q 190 94 176 88 Z"
          fill={`url(#${uid}-rescuer-hand)`}
          stroke="#ea580c"
          strokeWidth="1.2"
        />
        {/* 交叉扣紧的指节线（手指翘起不贴肋骨，标准CPR手法） */}
        <path d="M 180 84 Q 185 91 190 84 Q 195 91 200 84" stroke="#c2410c" strokeWidth="2" fill="none" strokeLinecap="round" />
        <path d="M 183 88 Q 188 94 193 88 Q 198 94 202 88" stroke="#c2410c" strokeWidth="2" fill="none" strokeLinecap="round" />

        {/* 下压深度动态指示浮标 */}
        <g transform="translate(260, 40)">
          <rect x="0" y="0" width="70" height="42" rx="6" fill="#0f172a" fillOpacity="0.9" stroke="#334155" strokeWidth="1" />
          <text x="35" y="14" fontSize="8" fill="#94a3b8" textAnchor="middle" fontWeight="bold">标准下压深度</text>
          <text x="35" y="27" fontSize="11" fill={action ? '#34d399' : '#38bdf8'} textAnchor="middle" fontWeight="black" fontFamily="monospace">
            {action ? '▼ 5.4 cm' : '0.0 cm'}
          </text>
          <rect x="8" y="32" width="54" height="4" rx="2" fill="#1e293b" />
          <rect
            x="8"
            y="32"
            width={action ? '48' : '6'}
            height="4"
            rx="2"
            fill={action ? '#10b981' : '#38bdf8'}
            style={{ transition: 'width 120ms ease' }}
          />
        </g>
      </g>
    </svg>
  );
}

