import React from 'react';
import type { LevelHardwareInfo } from './courseLevelHardware';

interface HardwareBenchIllustrationProps {
  hardware: LevelHardwareInfo;
  className?: string;
}

export function HardwareBenchIllustration({
  hardware,
  className = '',
}: HardwareBenchIllustrationProps) {
  const type = hardware.benchIllustrationType;

  return (
    <div
      className={`relative w-full h-36 bg-slate-950/80 rounded-xl border border-slate-800 p-2 overflow-hidden flex items-center justify-center ${className}`}
      aria-label={`${hardware.hardwareName} 实物与测量接线示意`}
    >
      {/* Background cyber grid */}
      <div
        className="absolute inset-0 opacity-15 pointer-events-none"
        style={{
          backgroundImage:
            'linear-gradient(to right, #22d3ee 1px, transparent 1px), linear-gradient(to bottom, #22d3ee 1px, transparent 1px)',
          backgroundSize: '16px 16px',
        }}
      />

      <svg
        viewBox="0 0 320 120"
        className="w-full h-full max-h-32"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="hwNeonCyan" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#22d3ee" />
            <stop offset="100%" stopColor="#0891b2" />
          </linearGradient>
          <linearGradient id="hwNeonAmber" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#fbbf24" />
            <stop offset="100%" stopColor="#d97706" />
          </linearGradient>
          <linearGradient id="hwNeonGreen" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#34d399" />
            <stop offset="100%" stopColor="#059669" />
          </linearGradient>
        </defs>

        {/* 1. 安全与准入 (O00, O01) */}
        {type === 'safety_kit' && (
          <g>
            <rect x="25" y="30" width="70" height="60" rx="8" fill="#1e293b" stroke="#34d399" strokeWidth="2" />
            <path d="M 45 30 L 45 20 C 45 15, 75 15, 75 20 L 75 30" fill="none" stroke="#34d399" strokeWidth="2" />
            <circle cx="60" cy="55" r="12" fill="#065f46" stroke="#34d399" strokeWidth="1.5" />
            <path d="M 60 48 L 60 58 M 60 62 L 60 64" stroke="#34d399" strokeWidth="2" strokeLinecap="round" />
            <text x="60" y="80" fill="#94a3b8" fontSize="9" textAnchor="middle">绝缘防护箱</text>

            <line x1="105" y1="60" x2="150" y2="60" stroke="#38bdf8" strokeDasharray="3 3" strokeWidth="2" />

            <g transform="translate(160, 25)">
              <rect x="0" y="0" width="130" height="70" rx="6" fill="#0f172a" stroke="#38bdf8" strokeWidth="1.5" />
              <text x="65" y="20" fill="#38bdf8" fontSize="10" textAnchor="middle" fontWeight="bold">高压验电与隔离</text>
              <rect x="15" y="30" width="100" height="14" rx="3" fill="#1e293b" stroke="#475569" />
              <text x="65" y="41" fill="#34d399" fontSize="9" textAnchor="middle">1000V 绝缘合格</text>
              <text x="65" y="60" fill="#94a3b8" fontSize="8" textAnchor="middle">五步断电验电规程</text>
            </g>
          </g>
        )}

        {/* 2. 12V蓄电池与基本回路 (A01) */}
        {type === 'battery_12v' && (
          <g>
            <rect x="20" y="35" width="75" height="52" rx="5" fill="#1e293b" stroke="#38bdf8" strokeWidth="2" />
            <rect x="32" y="29" width="12" height="6" rx="1" fill="#f43f5e" />
            <rect x="68" y="29" width="12" height="6" rx="1" fill="#38bdf8" />
            <text x="38" y="26" fill="#f43f5e" fontSize="10" textAnchor="middle" fontWeight="bold">+</text>
            <text x="74" y="26" fill="#38bdf8" fontSize="10" textAnchor="middle" fontWeight="bold">-</text>
            <text x="57" y="62" fill="#e2e8f0" fontSize="11" textAnchor="middle" fontWeight="bold">12V蓄电池</text>
            <text x="57" y="76" fill="#38bdf8" fontSize="8" textAnchor="middle">60Ah 低压供电</text>

            <path d="M 38 29 L 38 15 L 170 15 L 170 40" fill="none" stroke="#f43f5e" strokeWidth="2" />
            <path d="M 74 29 L 74 15 L 95 15 L 95 105 L 245 105 L 245 80" fill="none" stroke="#38bdf8" strokeWidth="2" />

            <g transform="translate(160, 40)">
              <rect x="0" y="0" width="90" height="40" rx="4" fill="#0f172a" stroke="#fbbf24" strokeWidth="1.5" />
              <circle cx="45" cy="20" r="12" fill="#78350f" stroke="#fbbf24" strokeWidth="1.5" />
              <text x="45" y="24" fill="#fbbf24" fontSize="10" textAnchor="middle" fontWeight="bold">车灯 21W</text>
            </g>
            {/* 车身搭铁符号 */}
            <g transform="translate(245, 80)">
              <line x1="0" y1="0" x2="0" y2="10" stroke="#38bdf8" strokeWidth="2" />
              <line x1="-10" y1="10" x2="10" y2="10" stroke="#38bdf8" strokeWidth="2" />
              <line x1="-6" y1="14" x2="6" y2="14" stroke="#38bdf8" strokeWidth="1.5" />
              <line x1="-2" y1="18" x2="2" y2="18" stroke="#38bdf8" strokeWidth="1" />
            </g>
          </g>
        )}

        {/* 3. 万用表与搭铁测量 (A02, C01) */}
        {(type === 'multimeter_probe' || type === 'voltage_drop') && (
          <g>
            <g transform="translate(20, 20)">
              <rect x="0" y="0" width="70" height="80" rx="8" fill="#1e293b" stroke="#fbbf24" strokeWidth="2" />
              <rect x="8" y="10" width="54" height="24" rx="3" fill="#022c22" stroke="#10b981" />
              <text x="35" y="27" fill="#34d399" fontSize="12" textAnchor="middle" fontFamily="monospace" fontWeight="bold">
                {type === 'voltage_drop' ? '0.04 V' : '12.60 V'}
              </text>
              <circle cx="35" cy="54" r="14" fill="#0f172a" stroke="#94a3b8" />
              <line x1="35" y1="54" x2="35" y2="44" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round" />
              <text x="35" y="75" fill="#94a3b8" fontSize="8" textAnchor="middle">VC890D</text>
            </g>

            {/* 表笔连线 */}
            <path d="M 45 80 C 45 105, 120 100, 140 70" fill="none" stroke="#f43f5e" strokeWidth="2" />
            <path d="M 25 80 C 25 110, 120 115, 140 45" fill="none" stroke="#000" strokeWidth="2" />

            <g transform="translate(145, 25)">
              <rect x="0" y="0" width="150" height="70" rx="6" fill="#0f172a" stroke="#38bdf8" strokeWidth="1.5" />
              <text x="75" y="20" fill="#38bdf8" fontSize="10" textAnchor="middle" fontWeight="bold">
                {type === 'voltage_drop' ? '带载回路压降精准测量' : '车身搭铁电位与接触电阻'}
              </text>
              <line x1="20" y1="40" x2="130" y2="40" stroke="#f59e0b" strokeWidth="3" />
              <circle cx="20" cy="40" r="5" fill="#f43f5e" />
              <circle cx="130" cy="40" r="5" fill="#38bdf8" />
              <text x="75" y="58" fill="#94a3b8" fontSize="9" textAnchor="middle">
                {type === 'voltage_drop' ? '实测回路损耗 < 0.2V 合格' : '红表笔测搭铁 · 黑表笔接蓄电池负极'}
              </text>
            </g>
          </g>
        )}

        {/* 4. 色环电阻 (A03) */}
        {type === 'resistor_color' && (
          <g>
            <g transform="translate(30, 45)">
              <line x1="0" y1="20" x2="40" y2="20" stroke="#cbd5e1" strokeWidth="3" />
              <rect x="40" y="5" width="80" height="30" rx="10" fill="#fed7aa" stroke="#d97706" strokeWidth="2" />
              {/* 4色环 */}
              <rect x="55" y="5" width="6" height="30" fill="#b45309" />
              <rect x="70" y="5" width="6" height="30" fill="#000" />
              <rect x="85" y="5" width="6" height="30" fill="#dc2626" />
              <rect x="100" y="5" width="6" height="30" fill="#facc15" />
              <line x1="120" y1="20" x2="160" y2="20" stroke="#cbd5e1" strokeWidth="3" />
              <text x="80" y="52" fill="#fde68a" fontSize="10" textAnchor="middle" fontWeight="bold">1 kΩ ±5%</text>
            </g>

            <g transform="translate(205, 25)">
              <rect x="0" y="0" width="100" height="70" rx="6" fill="#0f172a" stroke="#10b981" strokeWidth="1.5" />
              <text x="50" y="20" fill="#10b981" fontSize="10" textAnchor="middle" fontWeight="bold">万用表Ω档校准</text>
              <rect x="15" y="30" width="70" height="18" rx="3" fill="#022c22" />
              <text x="50" y="43" fill="#34d399" fontSize="11" textAnchor="middle" fontFamily="monospace">0.998 kΩ</text>
              <text x="50" y="60" fill="#94a3b8" fontSize="8" textAnchor="middle">误差符合工业标称</text>
            </g>
          </g>
        )}

        {/* 5. 电流测量 (A04) */}
        {type === 'current_meter' && (
          <g>
            <circle cx="60" cy="60" r="32" fill="#1e293b" stroke="#38bdf8" strokeWidth="2" />
            <text x="60" y="55" fill="#38bdf8" fontSize="18" textAnchor="middle" fontWeight="bold">A</text>
            <text x="60" y="75" fill="#94a3b8" fontSize="9" textAnchor="middle">0~20A 串联</text>

            <path d="M 92 60 L 140 60" stroke="#f43f5e" strokeWidth="3" />
            <text x="116" y="50" fill="#f43f5e" fontSize="9" textAnchor="middle">I = 1.75A</text>

            <g transform="translate(145, 30)">
              <rect x="0" y="0" width="150" height="60" rx="6" fill="#0f172a" stroke="#fbbf24" strokeWidth="1.5" />
              <text x="75" y="20" fill="#fbbf24" fontSize="10" textAnchor="middle" fontWeight="bold">断路串联接入规范</text>
              <text x="75" y="38" fill="#e2e8f0" fontSize="9" textAnchor="middle">⚠️ 严禁并联测量防止短路</text>
              <text x="75" y="52" fill="#34d399" fontSize="8" textAnchor="middle">熔断丝保护插孔安全接入</text>
            </g>
          </g>
        )}

        {/* 6. 欧姆定律稳压电源与内阻实训台 (B01, B05) */}
        {(type === 'ohm_regulator' || type === 'internal_res') && (
          <g>
            {/* 6.1 台式双路稳压直流电源 (真实感白色金属机箱) */}
            <g transform="translate(10, 18)">
              <rect x="0" y="0" width="85" height="82" rx="4" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="1.5" />
              <rect x="4" y="4" width="77" height="30" rx="3" fill="#0f172a" />
              {/* 红光双数显屏 */}
              <rect x="8" y="8" width="32" height="15" rx="2" fill="#450a0a" />
              <text x="24" y="20" fill="#ef4444" fontSize="10" textAnchor="middle" fontFamily="monospace" fontWeight="bold">12.3</text>
              <rect x="45" y="8" width="32" height="15" rx="2" fill="#450a0a" />
              <text x="61" y="20" fill="#ef4444" fontSize="10" textAnchor="middle" fontFamily="monospace" fontWeight="bold">2.40</text>
              <text x="24" y="30" fill="#991b1b" fontSize="7" textAnchor="middle">VOLTS</text>
              <text x="61" y="30" fill="#991b1b" fontSize="7" textAnchor="middle">AMPS</text>
              {/* 旋钮与接线柱 */}
              <circle cx="20" cy="46" r="6" fill="#334155" stroke="#64748b" />
              <circle cx="65" cy="46" r="6" fill="#334155" stroke="#64748b" />
              <circle cx="18" cy="68" r="4.5" fill="#dc2626" />
              <circle cx="42.5" cy="68" r="4.5" fill="#16a34a" />
              <circle cx="67" cy="68" r="4.5" fill="#1e293b" />
              <text x="42.5" y="80" fill="#475569" fontSize="6.5" textAnchor="middle" fontWeight="bold">直流稳压电源</text>
            </g>

            {/* 6.2 黄色数字万用表 (真实感外壳与表笔) */}
            <g transform="translate(105, 18)">
              <rect x="0" y="0" width="55" height="82" rx="6" fill="#facc15" stroke="#ca8a04" strokeWidth="1.5" />
              <rect x="5" y="6" width="45" height="22" rx="3" fill="#cbd5e1" stroke="#475569" />
              <text x="27.5" y="22" fill="#0f172a" fontSize="11" textAnchor="middle" fontFamily="monospace" fontWeight="bold">12.36</text>
              {/* 档位大旋钮 */}
              <circle cx="27.5" cy="45" r="11" fill="#1e293b" stroke="#334155" />
              <line x1="27.5" y1="45" x2="27.5" y2="36" stroke="#facc15" strokeWidth="2" strokeLinecap="round" />
              {/* 表笔插孔 */}
              <circle cx="18" cy="68" r="3.5" fill="#dc2626" />
              <circle cx="37" cy="68" r="3.5" fill="#0f172a" />
              <text x="27.5" y="80" fill="#713f12" fontSize="6.5" textAnchor="middle" fontWeight="bold">VC890D</text>
            </g>

            {/* 6.3 点亮发热的发光灯泡负载与接线板 */}
            <g transform="translate(170, 20)">
              {/* 木纹/绝缘接线底板 */}
              <rect x="0" y="10" width="140" height="70" rx="5" fill="#1e293b" stroke="#475569" strokeWidth="1.5" />
              <text x="70" y="24" fill="#38bdf8" fontSize="10" textAnchor="middle" fontWeight="bold">
                {type === 'internal_res' ? '闭合欧姆定律 E=U+Ir 实验' : '欧姆定律伏安特性实验台'}
              </text>
              {/* 发热灯泡与强光晕 */}
              <g transform="translate(45, 50)">
                <circle cx="0" cy="0" r="22" fill="#f59e0b" fillOpacity="0.25" />
                <circle cx="0" cy="0" r="14" fill="#fef08a" fillOpacity="0.75" />
                <circle cx="0" cy="0" r="8" fill="#ffffff" />
                <path d="M -3 3 L 0 -4 L 3 3" stroke="#b45309" strokeWidth="1.5" fill="none" />
                <rect x="-6" y="8" width="12" height="7" fill="#94a3b8" />
                <text x="0" y="24" fill="#fde047" fontSize="7.5" textAnchor="middle" fontWeight="bold">21W带载</text>
              </g>
              {/* 导线连接 */}
              <path d="M 45 42 C 45 32, 90 35, 95 48" stroke="#f43f5e" strokeWidth="2" fill="none" />
              <path d="M 45 58 C 45 68, 90 65, 95 52" stroke="#0f172a" strokeWidth="2" fill="none" />
              <g transform="translate(100, 40)">
                <rect x="0" y="0" width="34" height="20" rx="3" fill="#0f172a" stroke="#fbbf24" strokeWidth="1" />
                <text x="17" y="13" fill="#fbbf24" fontSize="8" textAnchor="middle" fontWeight="bold">内阻r</text>
              </g>
              <text x="70" y="74" fill="#94a3b8" fontSize="8" textAnchor="middle">
                {type === 'internal_res' ? '带载大电流导致端电压跌落' : '伏安特性严格符合线性欧姆定律'}
              </text>
            </g>
          </g>
        )}

        {/* 7. 汽车继电器与执行机构 (D01, D02, D03) */}
        {(type === 'car_relay' || type === 'dc_motor' || type === 'alternator') && (
          <g>
            <g transform="translate(25, 20)">
              <rect x="0" y="0" width="80" height="75" rx="6" fill="#1e293b" stroke="#38bdf8" strokeWidth="2" />
              <text x="40" y="20" fill="#38bdf8" fontSize="10" textAnchor="middle" fontWeight="bold">
                {type === 'car_relay' ? '汽车5脚继电器' : type === 'dc_motor' ? '直流电机模型' : '交流发电机'}
              </text>
              {type === 'car_relay' && (
                <>
                  <rect x="15" y="30" width="50" height="24" rx="3" fill="#0f172a" stroke="#475569" />
                  <text x="40" y="46" fill="#fbbf24" fontSize="9" textAnchor="middle">JD1914 40A</text>
                  <text x="20" y="68" fill="#94a3b8" fontSize="7">85 86</text>
                  <text x="52" y="68" fill="#94a3b8" fontSize="7">30 87</text>
                </>
              )}
              {type === 'dc_motor' && (
                <>
                  <circle cx="40" cy="45" r="16" fill="#0f172a" stroke="#10b981" strokeWidth="2" />
                  <text x="40" y="49" fill="#10b981" fontSize="12" textAnchor="middle" fontWeight="bold">M</text>
                </>
              )}
              {type === 'alternator' && (
                <>
                  <circle cx="40" cy="45" r="16" fill="#0f172a" stroke="#a855f7" strokeWidth="2" />
                  <text x="40" y="49" fill="#a855f7" fontSize="12" textAnchor="middle" fontWeight="bold">G~</text>
                </>
              )}
            </g>

            <path d="M 105 55 L 150 55" stroke="#38bdf8" strokeWidth="2" />

            <g transform="translate(155, 20)">
              <rect x="0" y="0" width="145" height="75" rx="6" fill="#0f172a" stroke="#10b981" strokeWidth="1.5" />
              <text x="72" y="20" fill="#10b981" fontSize="10" textAnchor="middle" fontWeight="bold">
                {type === 'car_relay' ? '小电流控制高功率回路' : type === 'dc_motor' ? '通电导体磁场安培力' : '电磁感应交流输出'}
              </text>
              <text x="72" y="42" fill="#e2e8f0" fontSize="9" textAnchor="middle">
                {type === 'car_relay' ? '85/86线圈吸合 ➔ 30/87导通' : type === 'dc_motor' ? '左手定则 · 电刷自动换向' : '三相定子绕组 + 6管全波整流'}
              </text>
              <text x="72" y="60" fill="#94a3b8" fontSize="8" textAnchor="middle">
                {type === 'car_relay' ? '有效消除触点电弧烧蚀' : type === 'dc_motor' ? '正反转双向调速驱动' : '车用发电机电压调节器控制'}
              </text>
            </g>
          </g>
        )}

        {/* 8. 电子器件与传感器 (E01, E02, E04, E06, E07) */}
        {(type === 'diode_module' ||
          type === 'speed_sensor' ||
          type === 'transistor_drive' ||
          type === 'logic_gates' ||
          type === 'pcb_assembly' ||
          type === 'capacitor_pack' ||
          type === 'bridge_rectifier' ||
          type === 'series_parallel' ||
          type === 'kirchhoff_box' ||
          type === 'power_bulb' ||
          type === 'voltage_divider' ||
          type === 'fault_matrix' ||
          type === 'delivery_terminal' ||
          type === 'inductance_coil' ||
          type === 'transformer' ||
          type === 'vehicle_bench') && (
          <g>
            <g transform="translate(25, 22)">
              <rect x="0" y="0" width="85" height="72" rx="6" fill="#1e293b" stroke="#a855f7" strokeWidth="2" />
              <text x="42" y="22" fill="#a855f7" fontSize="10" textAnchor="middle" fontWeight="bold">
                {type === 'speed_sensor'
                  ? '轮速传感器'
                  : type === 'diode_module'
                  ? '整流二极管'
                  : type === 'transistor_drive'
                  ? '功率三极管'
                  : type === 'pcb_assembly'
                  ? 'PCB装配板'
                  : type === 'vehicle_bench'
                  ? '整车实训台'
                  : '汽车电工专用箱'}
              </text>
              <rect x="15" y="32" width="55" height="24" rx="3" fill="#0f172a" stroke="#6b21a8" />
              <text x="42" y="48" fill="#c084fc" fontSize="9" textAnchor="middle">
                {type === 'speed_sensor'
                  ? '60-2 齿圈'
                  : type === 'diode_module'
                  ? '1N5408'
                  : type === 'transistor_drive'
                  ? 'TIP122'
                  : type === 'vehicle_bench'
                  ? '施工建设中'
                  : '标准模块'}
              </text>
            </g>

            <path d="M 110 58 L 145 58" stroke="#a855f7" strokeWidth="2" strokeDasharray="3 3" />

            <g transform="translate(150, 22)">
              <rect x="0" y="0" width="155" height="72" rx="6" fill="#0f172a" stroke="#38bdf8" strokeWidth="1.5" />
              <text x="77" y="20" fill="#38bdf8" fontSize="10" textAnchor="middle" fontWeight="bold">
                {hardware.diagramTitle.slice(0, 14)}
              </text>
              <text x="77" y="40" fill="#e2e8f0" fontSize="9" textAnchor="middle">
                {hardware.circuitType}
              </text>
              <text x="77" y="58" fill="#94a3b8" fontSize="8" textAnchor="middle">
                {hardware.trainingTargets[0]}
              </text>
            </g>
          </g>
        )}
      </svg>
    </div>
  );
}
