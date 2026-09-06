'use client';

interface WorkshopBackgroundProps {
  stationNumber?: number;
  className?: string;
}

export function WorkshopBackground({ stationNumber = 1, className = '' }: WorkshopBackgroundProps) {
  return (
    <div className={`absolute inset-0 pointer-events-none overflow-hidden select-none opacity-35 ${className}`} aria-hidden="true">
      <svg
        viewBox="0 0 1000 600"
        preserveAspectRatio="xMidYMid slice"
        className="w-full h-full"
      >
        <defs>
          {/* Wall gradient */}
          <linearGradient id="wallGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#dbeafe" />
            <stop offset="60%" stopColor="#e2e8f0" />
            <stop offset="100%" stopColor="#cbd5e1" />
          </linearGradient>
          {/* Floor gradient */}
          <linearGradient id="floorGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#94a3b8" />
            <stop offset="100%" stopColor="#64748b" />
          </linearGradient>
          {/* EV Car Blue Metallic */}
          <linearGradient id="carPaint" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#0284c7" />
            <stop offset="50%" stopColor="#38bdf8" />
            <stop offset="100%" stopColor="#0369a1" />
          </linearGradient>
          {/* Hazard stripe pattern */}
          <pattern id="hazardStripes" width="20" height="20" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
            <line x1="0" y1="0" x2="0" y2="20" stroke="#f59e0b" strokeWidth="10" />
            <line x1="10" y1="0" x2="10" y2="20" stroke="#1e293b" strokeWidth="10" />
          </pattern>
        </defs>

        {/* Back Wall */}
        <rect x="0" y="0" width="1000" height="420" fill="url(#wallGrad)" />
        {/* Overhead LED Shop Lights */}
        <rect x="150" y="20" width="220" height="12" rx="4" fill="#ffffff" stroke="#94a3b8" strokeWidth="2" filter="drop-shadow(0 0 8px #ffffff)" />
        <rect x="550" y="20" width="220" height="12" rx="4" fill="#ffffff" stroke="#94a3b8" strokeWidth="2" filter="drop-shadow(0 0 8px #ffffff)" />

        {/* Shop Slogan & Bay Sign */}
        <rect x="420" y="45" width="160" height="34" rx="6" fill="#087f8c" />
        <text x="500" y="68" fill="#ffffff" fontSize="15" fontWeight="bold" textAnchor="middle" letterSpacing="2">
          {stationNumber}号工位 · 实训区
        </text>

        {/* Pegboard Tool Wall (Left) */}
        <rect x="40" y="100" width="160" height="240" rx="8" fill="#475569" />
        <line x1="55" y1="130" x2="185" y2="130" stroke="#334155" strokeWidth="4" />
        {/* Hanging Wrenches & Multimeter */}
        <rect x="65" y="140" width="8" height="60" rx="2" fill="#cbd5e1" />
        <rect x="85" y="140" width="10" height="75" rx="2" fill="#cbd5e1" />
        <rect x="105" y="140" width="12" height="90" rx="2" fill="#cbd5e1" />
        <rect x="135" y="145" width="40" height="60" rx="6" fill="#f59e0b" />
        <rect x="142" y="152" width="26" height="20" rx="2" fill="#1e293b" />
        {/* Rolling Tool Cart */}
        <rect x="35" y="320" width="170" height="90" rx="6" fill="#dc2626" />
        <line x1="45" y1="350" x2="195" y2="350" stroke="#991b1b" strokeWidth="4" />
        <line x1="45" y1="380" x2="195" y2="380" stroke="#991b1b" strokeWidth="4" />

        {/* Two-Post Vehicle Lift (Center/Right) */}
        <rect x="420" y="110" width="24" height="310" rx="4" fill="#334155" />
        <rect x="820" y="110" width="24" height="310" rx="4" fill="#334155" />
        <line x1="420" y1="120" x2="844" y2="120" stroke="#475569" strokeWidth="8" />

        {/* EV Car on the Lift (The iconic vehicle accompanying task 2 through 9!) */}
        <g transform="translate(450, 180)">
          {/* Car Body Silhouette */}
          <path
            d="M 20,80 Q 40,40 100,25 Q 160,10 240,10 Q 290,10 330,45 L 350,80 Q 360,95 340,105 L 20,105 Q 10,95 20,80 Z"
            fill="url(#carPaint)"
            stroke="#0369a1"
            strokeWidth="3"
          />
          {/* Windows / Cockpit */}
          <path
            d="M 110,32 Q 160,20 235,20 Q 275,20 300,45 L 125,45 Z"
            fill="#0f172a"
            fillOpacity="0.8"
          />
          {/* Headlight (The Left Front Headlight of Task 9!) */}
          <path d="M 335,65 Q 355,70 348,82 Z" fill="#fef08a" stroke="#eab308" strokeWidth="2" />
          {/* Taillight */}
          <rect x="18" y="70" width="10" height="15" rx="3" fill="#ef4444" />
          {/* Wheels */}
          <circle cx="80" cy="105" r="28" fill="#1e293b" stroke="#64748b" strokeWidth="6" />
          <circle cx="80" cy="105" r="14" fill="#cbd5e1" />
          <circle cx="280" cy="105" r="28" fill="#1e293b" stroke="#64748b" strokeWidth="6" />
          <circle cx="280" cy="105" r="14" fill="#cbd5e1" />
          {/* Lift Arms */}
          <rect x="-10" y="102" width="370" height="10" rx="3" fill="#eab308" />
        </g>

        {/* Workshop Epoxy Floor */}
        <polygon points="0,420 1000,420 1000,600 0,600" fill="url(#floorGrad)" />
        {/* Safety Zone Boundary Hazard Stripe */}
        <rect x="0" y="420" width="1000" height="16" fill="url(#hazardStripes)" />
        {/* Floor Line Markings */}
        <line x1="260" y1="436" x2="260" y2="600" stroke="#cbd5e1" strokeWidth="4" strokeDasharray="12,12" />
        <line x1="900" y1="436" x2="900" y2="600" stroke="#cbd5e1" strokeWidth="4" strokeDasharray="12,12" />
      </svg>
    </div>
  );
}
