'use client';
/* eslint-disable jsx-a11y/prefer-tag-over-role -- Inline SVG requires an image role; an img cannot contain interactive vector layers. */

import { useId } from 'react';

/** 12V 教学车：车架回流与供电线分层绘制，通电与连接状态独立。 */
export function TrainingVehicle({ connected, powered, xray }: { connected: boolean; powered: boolean; xray: boolean }) {
  const id = useId().replace(/:/g, '');
  const lit = connected && powered;
  const supply = 'M 330 212 V 174 H 278 H 248 H 226 H 192 V 226 H 168';
  const lampReturn = 'M 168 244 H 190 V 286';
  const chassisReturn = 'M 190 286 H 370 V 212';
  return (
    <svg viewBox="0 0 900 390" className="training-vehicle" role="img" aria-label={`12V教学车，${lit ? '通电灯亮' : connected ? '搭铁已连接，未通电' : '搭铁未连接'}，${xray ? '车架透视' : '实车外观'}`} data-powered={lit}>
      <defs>
        <linearGradient id={`${id}-paint`} x2="0.2" y2="1"><stop stopColor="#a5e4ff" /><stop offset=".35" stopColor="#399ddd" /><stop offset=".6" stopColor="#1755a2" /><stop offset="1" stopColor="#102d53" /></linearGradient>
        <linearGradient id={`${id}-glass`} x2=".6" y2="1"><stop stopColor="#d2f2ff" /><stop offset=".35" stopColor="#367690" /><stop offset="1" stopColor="#102a42" /></linearGradient>
        <linearGradient id={`${id}-beam`}><stop stopColor="#fef3c7" stopOpacity="0" /><stop offset="1" stopColor="#fef3c7" stopOpacity=".65" /></linearGradient>
        <radialGradient id={`${id}-lamp`}><stop stopColor="#fff" /><stop offset=".4" stopColor="#fef08a" stopOpacity=".7" /><stop offset="1" stopColor="#fde047" stopOpacity="0" /></radialGradient>
        <pattern id={`${id}-grid`} width="32" height="32" patternUnits="userSpaceOnUse"><path d="M 32 0 H 0 V 32" fill="none" stroke="#19304a" strokeWidth=".8" /></pattern>
      </defs>
      <rect width="900" height="390" rx="20" fill="#0b1629" />
      <rect width="900" height="390" rx="20" fill={`url(#${id}-grid)`} />
      <text x="28" y="34" fill="#7dd3fc" fontSize="12" letterSpacing="3">EV TRAINING / LOW VOLTAGE</text>
      <text x="28" y="56" fill="#94a3b8" fontSize="12">观察顺序：接好搭铁 → 合上电源 → 前灯点亮 → 查看车架回流</text>
      <ellipse cx="462" cy="336" rx="350" ry="17" fill="#020617" opacity=".8" />
      {lit && <path d="M 156 225 L 20 181 V 298 L 156 245 Z" fill={`url(#${id}-beam)`} className="vehicle-beam" data-light-beam="true" />}
      <g className="vehicle-shell" style={{ opacity: xray ? .24 : 1 }}>
        <path d="M 143 291 Q 127 278 137 246 L 160 219 L 287 192 L 376 121 Q 395 108 446 108 H 570 Q 605 109 644 147 L 689 190 L 772 213 Q 792 220 794 246 V 291 H 743 Q 738 240 692 240 Q 648 240 639 291 H 325 Q 320 240 273 240 Q 227 240 220 291 Z" fill={`url(#${id}-paint)`} stroke="#83caff" strokeWidth="2" />
        <path d="M 308 190 L 389 130 Q 399 122 444 122 H 466 V 190 Z M 480 122 H 566 Q 591 122 619 149 L 658 190 H 480 Z" fill={`url(#${id}-glass)`} stroke="#99bdd4" strokeWidth="2" />
        <path d="M 399 135 L 350 177 M 407 147 L 374 177 M 509 135 L 489 157" stroke="#cffafe" strokeWidth="4" opacity=".35" />
        <path d="M 469 195 V 281 M 662 196 L 644 273 M 324 197 L 338 278" stroke="#072c54" strokeWidth="2" fill="none" />
        <path d="M 161 224 Q 450 199 770 225" stroke="#b6eaff" strokeWidth="2" fill="none" opacity=".6" />
        <rect x="423" y="205" width="25" height="5" rx="2" fill="#cbd5e1" /><rect x="594" y="205" width="25" height="5" rx="2" fill="#cbd5e1" />
        <path d="M 335 281 H 629" stroke="#111e32" strokeWidth="10" /><path d="M 746 230 H 784 L 785 242 H 750 Z" fill="#fb7185" />
        <path d="M 334 189 L 349 177 H 366 L 364 195 Z" fill="#173a62" stroke="#7dd3fc" />
      </g>
      {[273, 692].map(x => <g key={x} transform={`translate(${x} 291)`}><circle r="46" fill="#030712" stroke="#334155" strokeWidth="3" /><circle r="32" fill="#182b42" stroke="#8595a9" strokeWidth="3" />{[0, 60, 120, 180, 240, 300].map(a => <path key={a} d="M -4 -10 L -8 -27 L 7 -27 L 3 -10 Z" transform={`rotate(${a})`} fill="#aabccc" />)}<circle r="9" fill="#334155" stroke="#e2e8f0" strokeWidth="2" /></g>)}
      <g className="vehicle-circuit" style={{ opacity: xray ? 1 : .92 }}>
        <path d="M 158 286 H 630" stroke={xray ? '#075985' : '#334155'} strokeWidth="16" strokeLinecap="round" />
        <path d={supply} fill="none" stroke="#fb7185" strokeWidth="4" strokeLinejoin="round" />
        <rect x="309" y="204" width="83" height="51" rx="7" fill="#111c30" stroke="#94a3b8" strokeWidth="2" />
        <text x="350" y="235" textAnchor="middle" fill="#e2e8f0" fontSize="13" fontWeight="bold">12V BAT</text>
        <circle cx="330" cy="212" r="5" fill="#fb7185" /><circle cx="370" cy="212" r="5" fill="#38bdf8" />
        <text x="327" y="200" fill="#fda4af" fontSize="13">+</text><text x="367" y="200" fill="#7dd3fc" fontSize="13">−</text>
        <rect x="250" y="165" width="28" height="18" rx="3" fill="#4a3113" stroke="#fbbf24" strokeWidth="2" /><path d="M 250 174 H 278" stroke="#fbbf24" strokeWidth="2" />
        <text x="263" y="154" textAnchor="middle" fill="#fcd34d" fontSize="11">熔断器 F1</text>
        <rect x="193" y="160" width="47" height="24" fill="#0b1629" />
        <circle cx="198" cy="174" r="3" fill="#6ee7b7" /><circle cx="232" cy="174" r="3" fill="#6ee7b7" />
        <path d="M 232 174 H 198" stroke="#6ee7b7" strokeWidth="3" className="circuit-switch-blade" style={{ transformOrigin: '232px 174px', transform: powered ? 'rotate(0deg)' : 'rotate(28deg)' }} />
        <text x="207" y="139" textAnchor="middle" fill="#6ee7b7" fontSize="11">电源开关</text>
        <rect x="146" y="222" width="22" height="25" rx="5" fill={lit ? '#fef3c7' : '#475569'} stroke="#e2e8f0" strokeWidth="2" />
        {lit && <ellipse cx="157" cy="235" rx="40" ry="36" fill={`url(#${id}-lamp)`} data-lamp-glow="true" />}
        <path d={lampReturn} fill="none" stroke={connected ? '#38bdf8' : '#64748b'} strokeWidth="4" strokeDasharray={connected ? undefined : '5 7'} />
        <path d="M 370 286 V 212" fill="none" stroke="#38bdf8" strokeWidth="4" />
        {[190, 370].map((x, i) => <g key={x}><circle cx={x} cy="286" r="8" fill={i === 0 && !connected ? '#0f172a' : '#0c4a6e'} stroke="#7dd3fc" strokeWidth="2" /><path d={`M ${x - 4} 286 H ${x + 4} M ${x} 282 V 290`} stroke="#cbd5e1" strokeWidth="2" /></g>)}
        {lit && xray && <g data-current-flow="true" fill="none" stroke="#fef08a" strokeWidth="3" strokeLinecap="round"><path d={supply} className="flow-tracer" /><path d={lampReturn} className="flow-tracer" /><path d={chassisReturn} className="flow-tracer" /></g>}
      </g>
      <g fontSize="11" fill="#bae6fd"><text x="159" y="315">灯负端搭铁</text><text x="348" y="315">蓄电池负极搭铁</text><text x="492" y="276">金属车架 / 回流通道</text></g>
      <rect x="475" y="70" width="393" height="26" rx="13" fill={lit ? '#064e3b' : '#1e293b'} />
      <text x="671" y="87" textAnchor="middle" fill={lit ? '#a7f3d0' : '#cbd5e1'} fontSize="12">{lit ? '闭合回路 · 前灯已亮' : connected ? '搭铁连接完成 · 等待通电' : '搭铁断开 · 前灯不亮'}</text>
      <text x="450" y="370" textAnchor="middle" fill="#94a3b8" fontSize="12">{lit && xray ? '黄色流线表示约定电流方向：正极 → 熔断器 → 开关 → 灯 → 车架 → 负极' : '低压照明教学示意 · 车身搭铁不等同于新能源汽车高压回路'}</text>
    </svg>
  );
}
