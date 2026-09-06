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
  // 1. 站姿（见习电工小张）：现代职业教育青年技师形象
  // --------------------------------------------------------------------------
  if (pose === 'standing') {
    return (
      <svg
        viewBox="0 0 160 260"
        className={`training-person standing-person ${className}`}
        role="img"
        aria-label="穿着现代电工工装的见习技师小张"
      >
        <defs>
          {/* 安全帽渐变 */}
          <linearGradient id={`${uid}-helmet`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fef08a" />
            <stop offset="35%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#d97706" />
          </linearGradient>
          {/* 皮肤质感渐变 */}
          <linearGradient id={`${uid}-skin`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#fef3c7" />
            <stop offset="60%" stopColor="#fed7aa" />
            <stop offset="100%" stopColor="#fdba74" />
          </linearGradient>
          {/* 阴影皮肤 */}
          <linearGradient id={`${uid}-skin-shadow`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#fdba74" />
            <stop offset="100%" stopColor="#ea580c" />
          </linearGradient>
          {/* 工作夹克海蓝色渐变 */}
          <linearGradient id={`${uid}-jacket`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0284c7" />
            <stop offset="60%" stopColor="#0369a1" />
            <stop offset="100%" stopColor="#075985" />
          </linearGradient>
          {/* 工装裤深深蓝灰渐变 */}
          <linearGradient id={`${uid}-pants`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#334155" />
            <stop offset="50%" stopColor="#1e293b" />
            <stop offset="100%" stopColor="#0f172a" />
          </linearGradient>
          {/* 安全工作鞋橡胶底 */}
          <linearGradient id={`${uid}-boot`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#475569" />
            <stop offset="40%" stopColor="#1e293b" />
            <stop offset="100%" stopColor="#090d16" />
          </linearGradient>
          {/* 荧光高可视反光条 */}
          <linearGradient id={`${uid}-reflector`} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#f59e0b" />
            <stop offset="30%" stopColor="#fef08a" />
            <stop offset="50%" stopColor="#ffffff" />
            <stop offset="70%" stopColor="#fef08a" />
            <stop offset="100%" stopColor="#f59e0b" />
          </linearGradient>
          {/* 护目镜高光渐变 */}
          <linearGradient id={`${uid}-goggle`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#0284c7" stopOpacity="0.65" />
          </linearGradient>
        </defs>

        {/* 地面柔和双层接触阴影 */}
        <ellipse cx="80" cy="248" rx="46" ry="8" fill="#020617" opacity="0.25" />
        <ellipse cx="80" cy="248" rx="28" ry="4.5" fill="#020617" opacity="0.35" />

        {/* 呼吸骨骼群组 */}
        <g className="person-idle">
          {/* --- 下半身：工装长裤与重型防刺穿安全靴 --- */}
          {/* 左腿裤管 */}
          <path
            d="M 54 138 L 47 218 L 73 218 L 76 138 Z"
            fill={`url(#${uid}-pants)`}
            stroke="#0f172a"
            strokeWidth="1.5"
          />
          {/* 右腿裤管 */}
          <path
            d="M 84 138 L 87 218 L 113 218 L 106 138 Z"
            fill={`url(#${uid}-pants)`}
            stroke="#0f172a"
            strokeWidth="1.5"
          />
          {/* 裤裆与臀部收口 */}
          <path d="M 52 136 Q 80 146 108 136 L 106 142 Q 80 152 54 142 Z" fill="#0f172a" />
          {/* 膝盖立体防磨加固护块 */}
          <rect x="50" y="166" width="22" height="24" rx="4" fill="#1e293b" stroke="#475569" strokeWidth="1" />
          <rect x="88" y="166" width="22" height="24" rx="4" fill="#1e293b" stroke="#475569" strokeWidth="1" />
          <line x1="52" y1="178" x2="70" y2="178" stroke="#334155" strokeWidth="1" />
          <line x1="90" y1="178" x2="108" y2="178" stroke="#334155" strokeWidth="1" />

          {/* 左脚安全靴 */}
          <g>
            <path
              d="M 44 218 L 41 234 Q 40 242 54 242 L 75 242 Q 77 236 75 218 Z"
              fill={`url(#${uid}-boot)`}
              stroke="#0f172a"
              strokeWidth="1.5"
            />
            {/* 靴头加固与金黄延条线 */}
            <path d="M 40 238 Q 48 243 75 243" stroke="#eab308" strokeWidth="1.5" fill="none" />
            {/* 防滑凹凸齿纹 */}
            <path d="M 42 243 L 74 243 L 73 246 L 43 246 Z" fill="#020617" />
          </g>

          {/* 右脚安全靴 */}
          <g>
            <path
              d="M 85 218 Q 83 236 85 242 L 106 242 Q 120 242 119 234 L 116 218 Z"
              fill={`url(#${uid}-boot)`}
              stroke="#0f172a"
              strokeWidth="1.5"
            />
            {/* 靴头加固与金黄延条线 */}
            <path d="M 85 243 Q 112 243 120 238" stroke="#eab308" strokeWidth="1.5" fill="none" />
            {/* 防滑齿纹 */}
            <path d="M 87 243 L 118 243 L 117 246 L 86 246 Z" fill="#020617" />
          </g>

          {/* --- 上半身：现代电工工装夹克 --- */}
          {/* 夹克躯干主轮廓 */}
          <path
            d="M 46 80 Q 80 72 114 80 L 119 138 Q 80 144 41 138 Z"
            fill={`url(#${uid}-jacket)`}
            stroke="#075985"
            strokeWidth="1.5"
          />

          {/* 胸前荧光高可视反光条（横贯胸部） */}
          <path d="M 44 104 Q 80 108 116 104 L 117 112 Q 80 116 43 112 Z" fill={`url(#${uid}-reflector)`} />
          {/* 反光条银色高光中线 */}
          <path d="M 44 108 Q 80 112 116 108" stroke="#ffffff" strokeWidth="1.5" fill="none" />

          {/* 夹克中央金属拉链与门襟 */}
          <line x1="80" y1="76" x2="80" y2="139" stroke="#0f172a" strokeWidth="2.5" />
          <line x1="80" y1="76" x2="80" y2="139" stroke="#cbd5e1" strokeWidth="1" strokeDasharray="3 2" />
          <rect x="78" y="92" width="4" height="6" rx="1" fill="#e2e8f0" />

          {/* 左胸电工工牌（实训学员） */}
          <rect x="52" y="86" width="20" height="12" rx="2" fill="#0284c7" stroke="#38bdf8" strokeWidth="1" />
          <rect x="54" y="88" width="16" height="3" rx="0.5" fill="#f8fafc" />
          <text x="62" y="96" fontSize="5" fill="#ffffff" fontWeight="bold" textAnchor="middle">实训生</text>

          {/* 右胸电工测电笔插袋与红黑表笔探头 */}
          <rect x="88" y="87" width="18" height="14" rx="2" fill="#075985" stroke="#0284c7" strokeWidth="1" />
          {/* 红色绝缘探针 */}
          <line x1="93" y1="81" x2="93" y2="90" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" />
          <circle cx="93" cy="80" r="1.5" fill="#fca5a5" />
          {/* 黑色绝缘探针 */}
          <line x1="99" y1="82" x2="99" y2="90" stroke="#1e293b" strokeWidth="2.5" strokeLinecap="round" />
          <circle cx="99" cy="81" r="1.5" fill="#94a3b8" />

          {/* 工装皮带与合金卡扣 */}
          <rect x="42" y="133" width="76" height="7" rx="1.5" fill="#0f172a" />
          <rect x="73" y="132" width="14" height="9" rx="2" fill="#d97706" stroke="#fde047" strokeWidth="1" />
          <rect x="76" y="134" width="8" height="5" rx="1" fill="#0f172a" />

          {/* --- 左手手臂与绝缘手套（自然下垂略带微弯） --- */}
          <g>
            {/* 袖子 */}
            <path
              d="M 46 80 Q 32 105 34 130 L 46 132 Q 43 105 53 82 Z"
              fill={`url(#${uid}-jacket)`}
              stroke="#075985"
              strokeWidth="1.5"
            />
            {/* 袖口反光环 */}
            <path d="M 33 125 L 45 127" stroke="#f59e0b" strokeWidth="3" />
            <path d="M 33 125 L 45 127" stroke="#ffffff" strokeWidth="1" />
            {/* 绝缘电工手套与手腕护套 */}
            <rect x="33" y="131" width="13" height="5" rx="1.5" fill="#0f172a" />
            <path
              d="M 33 135 Q 28 145 34 153 Q 40 156 44 151 Q 48 145 45 135 Z"
              fill="#1e293b"
              stroke="#0f172a"
              strokeWidth="1.2"
            />
            {/* 手套防滑蓝条纹 */}
            <path d="M 35 143 Q 39 146 43 143" stroke="#38bdf8" strokeWidth="1.5" fill="none" />
          </g>

          {/* --- 右手手臂与互动动作（挥手/举起） --- */}
          <g
            className={action ? 'person-wave' : ''}
            style={{ transformOrigin: '112px 84px', transition: 'transform 200ms ease' }}
          >
            {/* 袖子 */}
            <path
              d="M 114 80 Q 130 102 126 128 L 114 130 Q 116 104 107 82 Z"
              fill={`url(#${uid}-jacket)`}
              stroke="#075985"
              strokeWidth="1.5"
            />
            {/* 袖口反光环 */}
            <path d="M 115 124 L 127 122" stroke="#f59e0b" strokeWidth="3" />
            <path d="M 115 124 L 127 122" stroke="#ffffff" strokeWidth="1" />
            {/* 绝缘电工手套 */}
            <rect x="114" y="129" width="13" height="5" rx="1.5" fill="#0f172a" />
            <path
              d="M 115 133 Q 112 145 116 152 Q 123 156 127 149 Q 131 143 127 133 Z"
              fill="#1e293b"
              stroke="#0f172a"
              strokeWidth="1.2"
            />
            <path d="M 117 141 Q 121 144 125 141" stroke="#38bdf8" strokeWidth="1.5" fill="none" />
          </g>

          {/* --- 头部与面部结构 --- */}
          {/* 领口与脖颈 */}
          <path d="M 70 66 L 70 78 Q 80 82 90 78 L 90 66 Z" fill={`url(#${uid}-skin-shadow)`} />
          {/* 工装立领折页 */}
          <path d="M 64 72 L 72 79 L 80 75 L 88 79 L 96 72 Q 80 66 64 72 Z" fill="#0369a1" stroke="#0f172a" strokeWidth="1" />

          {/* 脸蛋轮廓 */}
          <path
            d="M 62 45 C 62 66, 98 66, 98 45 C 98 32, 62 32, 62 45 Z"
            fill={`url(#${uid}-skin)`}
          />
          {/* 双耳 */}
          <ellipse cx="61" cy="46" rx="3.5" ry="5.5" fill={`url(#${uid}-skin)`} stroke="#fdba74" strokeWidth="1" />
          <ellipse cx="99" cy="46" rx="3.5" ry="5.5" fill={`url(#${uid}-skin)`} stroke="#fdba74" strokeWidth="1" />

          {/* 青年活力发丝（从安全帽下沿自然露出的发缕） */}
          <path
            d="M 59 36 Q 66 38 68 44 Q 72 38 78 43 Q 83 38 88 44 Q 93 39 101 36 Q 100 48 97 52 Q 95 46 92 48 Q 68 48 63 52 Z"
            fill="#1e293b"
          />

          {/* 五官：自信清澈的动漫风格眼神 */}
          <g className="person-blink" style={{ transformOrigin: '80px 45px' }}>
            {/* 眉毛 */}
            <path d="M 67 39 Q 72 37 76 39" stroke="#0f172a" strokeWidth="1.8" strokeLinecap="round" fill="none" />
            <path d="M 84 39 Q 88 37 93 39" stroke="#0f172a" strokeWidth="1.8" strokeLinecap="round" fill="none" />

            {/* 左眼 */}
            <ellipse cx="72" cy="44" rx="3.2" ry="3.8" fill="#0f172a" />
            <ellipse cx="72" cy="44" rx="2" ry="2.5" fill="#0284c7" />
            <circle cx="71" cy="42.8" r="1.1" fill="#ffffff" />
            <circle cx="73" cy="45.2" r="0.5" fill="#ffffff" />

            {/* 右眼 */}
            <ellipse cx="88" cy="44" rx="3.2" ry="3.8" fill="#0f172a" />
            <ellipse cx="88" cy="44" rx="2" ry="2.5" fill="#0284c7" />
            <circle cx="87" cy="42.8" r="1.1" fill="#ffffff" />
            <circle cx="89" cy="45.2" r="0.5" fill="#ffffff" />
          </g>

          {/* 挺秀鼻尖 */}
          <path d="M 80 44 L 81 48 L 78 49" stroke="#ea580c" strokeWidth="1.2" strokeLinecap="round" fill="none" />
          {/* 自信微笑嘴唇 */}
          <path d="M 75 52 Q 80 56 85 52" stroke="#9a3412" strokeWidth="1.6" strokeLinecap="round" fill="none" />
          {/* 面颊自然红润印 */}
          <ellipse cx="67" cy="49" rx="3" ry="1.5" fill="#f43f5e" opacity="0.25" />
          <ellipse cx="93" cy="49" rx="3" ry="1.5" fill="#f43f5e" opacity="0.25" />

          {/* --- 现代汽车实训安全帽与翻折防护目镜 --- */}
          {/* 安全帽主体（黄色高亮流线型） */}
          <path
            d="M 54 36 C 54 18, 106 18, 106 36 C 111 36, 112 40, 108 41 C 104 42, 56 42, 52 41 C 48 40, 49 36, 54 36 Z"
            fill={`url(#${uid}-helmet)`}
            stroke="#b45309"
            strokeWidth="1.5"
          />
          {/* 安全帽中央抗冲击加强脊柱肋条 */}
          <path d="M 78 19 L 82 19 L 83 37 L 77 37 Z" fill="#d97706" />
          {/* 帽徽：新能源高压电闪电/齿轮图标 */}
          <circle cx="80" cy="29" r="4.5" fill="#0f172a" stroke="#ffffff" strokeWidth="0.8" />
          <path d="M 80 26.5 L 78.5 29 L 80 29 L 79.5 31.5 L 82 28.5 L 80.5 28.5 Z" fill="#fbbf24" />

          {/* 翻折在安全帽上的专业防弧光护目镜 */}
          <g>
            <rect x="62" y="29" width="15" height="9" rx="3" fill={`url(#${uid}-goggle)`} stroke="#0f172a" strokeWidth="1.5" />
            <rect x="83" y="29" width="15" height="9" rx="3" fill={`url(#${uid}-goggle)`} stroke="#0f172a" strokeWidth="1.5" />
            <line x1="77" y1="33" x2="83" y2="33" stroke="#0f172a" strokeWidth="2" />
            {/* 护目镜镜带 */}
            <path d="M 56 34 L 62 34" stroke="#0f172a" strokeWidth="2" />
            <path d="M 98 34 L 104 34" stroke="#0f172a" strokeWidth="2" />
            {/* 镜片高光折射 */}
            <line x1="64" y1="31" x2="68" y2="36" stroke="#ffffff" strokeWidth="1" strokeLinecap="round" opacity="0.8" />
            <line x1="85" y1="31" x2="89" y2="36" stroke="#ffffff" strokeWidth="1" strokeLinecap="round" opacity="0.8" />
          </g>
        </g>
      </svg>
    );
  }

  // --------------------------------------------------------------------------
  // 2. 倒地姿态（2号工位触电事故学员小张）：生动自然的侧仰卧人体解剖结构
  // --------------------------------------------------------------------------
  if (pose === 'lying') {
    return (
      <svg
        viewBox="0 0 380 160"
        className={`training-person lying-person ${className}`}
        role="img"
        aria-label="倒地学员小张，身旁脱落带电导线，等待安全切断评估"
      >
        <defs>
          {/* 地面大范围弥散柔和阴影 */}
          <radialGradient id={`${uid}-ground-shadow`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#020617" stopOpacity="0.65" />
            <stop offset="60%" stopColor="#020617" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#020617" stopOpacity="0" />
          </radialGradient>
          {/* 倒地身体工装渐变 */}
          <linearGradient id={`${uid}-lying-jacket`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#0369a1" />
            <stop offset="50%" stopColor="#0284c7" />
            <stop offset="100%" stopColor="#0c4a6e" />
          </linearGradient>
          {/* 裤子腿部明暗 */}
          <linearGradient id={`${uid}-lying-pants`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#334155" />
            <stop offset="60%" stopColor="#1e293b" />
            <stop offset="100%" stopColor="#090d16" />
          </linearGradient>
          {/* 皮肤微暖 */}
          <linearGradient id={`${uid}-lying-skin`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fef3c7" />
            <stop offset="70%" stopColor="#fed7aa" />
            <stop offset="100%" stopColor="#fba36e" />
          </linearGradient>
        </defs>

        {/* --- 地面真实接触阴影组 --- */}
        {/* 全身主接触漫反射阴影 */}
        <ellipse cx="205" cy="126" rx="160" ry="18" fill={`url(#${uid}-ground-shadow)`} />
        {/* 躯干重力点深阴影 */}
        <ellipse cx="160" cy="128" rx="80" ry="9" fill="#020617" opacity="0.45" />
        {/* 双脚着地点深阴影 */}
        <ellipse cx="320" cy="132" rx="45" ry="7" fill="#020617" opacity="0.4" />
        {/* 头部着地点深阴影 */}
        <ellipse cx="78" cy="125" rx="35" ry="7" fill="#020617" opacity="0.35" />

        {/* --- 散落在一旁的安全帽（增强真实事故撞击感） --- */}
        <g transform="translate(30, 96) rotate(-18)">
          <path
            d="M 12 18 C 12 6, 42 6, 42 18 C 46 18, 48 20, 45 22 C 40 23, 14 23, 10 22 C 8 20, 9 18, 12 18 Z"
            fill="#f59e0b"
            stroke="#b45309"
            strokeWidth="1.2"
          />
          <path d="M 25 7 L 29 7 L 29 18 L 25 18 Z" fill="#d97706" />
          <circle cx="27" cy="13" r="3" fill="#0f172a" />
          <rect x="18" y="14" width="8" height="5" rx="1.5" fill="#38bdf8" fillOpacity="0.75" stroke="#0f172a" strokeWidth="1" />
          <rect x="29" y="14" width="8" height="5" rx="1.5" fill="#38bdf8" fillOpacity="0.75" stroke="#0f172a" strokeWidth="1" />
        </g>

        {/* --- 下半身：双腿呈现富有空间纵深与层次的解剖侧卧 --- */}
        {/* 远端右腿（稍伸直平放于地面后方） */}
        <g>
          <path
            d="M 215 96 L 310 106 L 332 115 L 305 125 L 210 114 Z"
            fill={`url(#${uid}-lying-pants)`}
            stroke="#0f172a"
            strokeWidth="1.2"
          />
          {/* 远端安全靴（横卧） */}
          <path
            d="M 324 109 L 345 112 Q 352 115 350 122 L 330 124 Z"
            fill="#1e293b"
            stroke="#0f172a"
            strokeWidth="1.2"
          />
          <path d="M 328 122 L 350 120" stroke="#eab308" strokeWidth="1.5" />
        </g>

        {/* 近端左腿（膝盖自然微屈向前，形成极佳的三维立体折角） */}
        <g>
          {/* 大腿 */}
          <path
            d="M 198 102 Q 235 90 262 98 L 260 118 Q 230 120 195 120 Z"
            fill={`url(#${uid}-lying-pants)`}
            stroke="#0f172a"
            strokeWidth="1.4"
          />
          {/* 膝盖加固防磨块 */}
          <rect
            x="248"
            y="94"
            width="22"
            height="26"
            rx="4"
            transform="rotate(15 259 107)"
            fill="#1e293b"
            stroke="#475569"
            strokeWidth="1"
          />
          {/* 小腿连带脚腕自然斜搭向地面 */}
          <path
            d="M 260 102 L 320 116 L 318 132 L 256 122 Z"
            fill={`url(#${uid}-lying-pants)`}
            stroke="#0f172a"
            strokeWidth="1.4"
          />
          {/* 近端厚重防刺穿安全靴（展现厚实耐磨大底与立体靴头） */}
          <path
            d="M 315 116 L 344 121 Q 352 125 348 133 L 322 135 L 314 128 Z"
            fill="#0f172a"
            stroke="#020617"
            strokeWidth="1.5"
          />
          {/* 黄色安全延条缝线 */}
          <path d="M 318 132 Q 338 133 348 129" stroke="#eab308" strokeWidth="1.5" fill="none" />
          {/* 防滑大底齿纹 */}
          <path d="M 320 135 L 346 133 L 344 137 L 318 137 Z" fill="#020617" />
        </g>

        {/* --- 躯干：工装夹克、反光条、拉链与折痕 --- */}
        <g>
          {/* 夹克主体（展现胸腔与腹部的自然起伏） */}
          <path
            d="M 102 78 C 135 68, 185 75, 214 96 L 210 122 C 160 128, 125 125, 96 114 Z"
            fill={`url(#${uid}-lying-jacket)`}
            stroke="#075985"
            strokeWidth="1.5"
          />
          {/* 沿胸廓曲面环绕的高可视反光带 */}
          <path
            d="M 125 78 Q 165 88 198 100 L 194 109 Q 162 98 122 88 Z"
            fill="#f59e0b"
          />
          <path
            d="M 124 82 Q 164 92 196 104"
            stroke="#ffffff"
            strokeWidth="2"
            fill="none"
          />
          {/* 门襟与拉链 */}
          <path d="M 108 86 Q 155 98 206 112" stroke="#0f172a" strokeWidth="2.5" fill="none" />
          <path d="M 108 86 Q 155 98 206 112" stroke="#cbd5e1" strokeWidth="1" strokeDasharray="3 2" fill="none" />
          {/* 实训学员胸牌 */}
          <rect x="135" y="74" width="16" height="8" rx="1.5" transform="rotate(12 143 78)" fill="#0284c7" stroke="#38bdf8" strokeWidth="0.8" />
          {/* 腰带与金属扣 */}
          <path d="M 198 102 L 212 108 L 208 120 L 194 114 Z" fill="#0f172a" />
          <rect x="200" y="106" width="6" height="9" rx="1" transform="rotate(18 203 110)" fill="#d97706" />
        </g>

        {/* --- 手臂与绝缘手套 --- */}
        {/* 近端左臂（自然屈肘横搭在腰腹部） */}
        <g>
          {/* 大臂 */}
          <path d="M 120 86 Q 142 98 152 110 L 142 118 Q 130 106 112 94 Z" fill="#0369a1" stroke="#075985" strokeWidth="1.2" />
          {/* 小臂 */}
          <path d="M 150 110 L 180 112 L 180 122 L 144 120 Z" fill="#0369a1" stroke="#075985" strokeWidth="1.2" />
          <path d="M 172 109 L 172 121" stroke="#f59e0b" strokeWidth="3" />
          {/* 戴着绝缘手套的手自然搭在腹部 */}
          <path
            d="M 180 112 Q 192 112 195 118 Q 192 124 182 124 Z"
            fill="#1e293b"
            stroke="#0f172a"
            strokeWidth="1.2"
          />
          <path d="M 184 116 Q 188 118 191 116" stroke="#38bdf8" strokeWidth="1" fill="none" />
        </g>

        {/* 远端右臂（从肩部自然外展垂落触地，手心略向上虚握） */}
        <g>
          <path d="M 104 90 Q 94 105 88 118 L 98 124 Q 106 110 114 96 Z" fill="#0284c7" stroke="#075985" strokeWidth="1.2" />
          {/* 袖口反光条 */}
          <path d="M 90 116 L 98 122" stroke="#f59e0b" strokeWidth="2.5" />
          {/* 触地手套（掌心向上、手指放松虚微屈） */}
          <path
            d="M 88 120 Q 78 124 74 130 Q 75 136 84 135 Q 92 134 94 124 Z"
            fill="#1e293b"
            stroke="#0f172a"
            strokeWidth="1.2"
          />
          <path d="M 78 128 Q 83 132 88 128" stroke="#38bdf8" strokeWidth="1" fill="none" />
        </g>

        {/* --- 颈部、头部与生动面容（自然侧倾安详闭目） --- */}
        {/* 脖颈与领口 */}
        <path d="M 96 86 L 86 92 L 92 104 L 102 96 Z" fill={`url(#${uid}-lying-skin)`} />
        <path d="M 94 84 L 102 96 L 90 98 Z" fill="#075985" />

        {/* 面部轮廓（头部自然侧枕在地面） */}
        <g transform="translate(76, 94) rotate(-8)">
          {/* 散落在地面的立体发丝 */}
          <path
            d="M -16 6 Q -18 -18 4 -22 Q 18 -20 22 -6 Q 24 10 12 18 Q -4 20 -16 6 Z"
            fill="#1e293b"
          />
          <path d="M -18 8 Q -24 0 -14 -10 Q 0 -22 18 -16" stroke="#0f172a" strokeWidth="2" fill="none" />

          {/* 脸蛋侧颜轮廓 */}
          <path
            d="M -8 -8 C -6 -18, 18 -14, 18 2 C 18 16, 2 20, -6 12 C -12 6, -10 2, -8 -8 Z"
            fill={`url(#${uid}-lying-skin)`}
            stroke="#fdba74"
            strokeWidth="0.8"
          />

          {/* 耳朵 */}
          <ellipse cx="6" cy="4" rx="4" ry="5.5" fill={`url(#${uid}-lying-skin)`} stroke="#fdba74" strokeWidth="0.8" />
          <path d="M 5 2 Q 8 4 6 7" stroke="#ea580c" strokeWidth="0.8" fill="none" />

          {/* 散落在额前的几缕蓬松碎发 */}
          <path d="M -7 -14 Q -2 -6 -6 0 Q 3 -10 8 -4 Q 12 -12 15 -6" stroke="#1e293b" strokeWidth="2" fill="none" strokeLinecap="round" />

          {/* 触电晕厥中平静闭合的双眼（柔美修长的睫毛线） */}
          <g>
            {/* 眉毛 */}
            <path d="M -5 -6 Q -1 -8 3 -5" stroke="#334155" strokeWidth="1.5" strokeLinecap="round" fill="none" />
            <path d="M 7 -6 Q 11 -7 15 -4" stroke="#334155" strokeWidth="1.5" strokeLinecap="round" fill="none" />
            {/* 闭合的睫毛曲线 */}
            <path d="M -4 -1 Q 0 3 4 0" stroke="#0f172a" strokeWidth="1.8" strokeLinecap="round" fill="none" />
            <path d="M 8 -1 Q 12 3 16 0" stroke="#0f172a" strokeWidth="1.8" strokeLinecap="round" fill="none" />
          </g>

          {/* 秀气微挺的鼻梁 */}
          <path d="M 3 0 L 2 5 L 0 6" stroke="#ea580c" strokeWidth="1.1" strokeLinecap="round" fill="none" />
          {/* 微抿微张的嘴唇 */}
          <path d="M -1 10 Q 3 12 7 9" stroke="#9a3412" strokeWidth="1.4" strokeLinecap="round" fill="none" />
          {/* 脸颊微弱红润 */}
          <ellipse cx="2" cy="7" rx="3.5" ry="2" fill="#f43f5e" opacity="0.2" />
        </g>
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

