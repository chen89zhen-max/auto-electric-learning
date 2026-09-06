'use client';
/* eslint-disable jsx-a11y/prefer-tag-over-role -- Inline animated SVG uses the image role for its accessible name. */

/** 使用同一人物比例表现站立、倒地及模型按压；不模拟未经确认的生命体征。 */
export function TrainingPerson({ pose = 'standing', action = false }: { pose?: 'standing' | 'lying' | 'cpr'; action?: boolean }) {
  if (pose === 'standing') return (
    <svg viewBox="0 0 180 240" className="training-person standing-person" role="img" aria-label="穿着工装的见习技师">
      <ellipse cx="91" cy="227" rx="46" ry="7" fill="#0f172a" opacity=".2" />
      <g className="person-idle"><path d="M 63 139 L 60 211 H 83 L 91 157 L 98 211 H 122 L 119 139" fill="#24344e" stroke="#142238" strokeWidth="3" /><path d="M 58 207 H 84 V 220 H 49 Q 48 211 58 207 M 98 207 H 122 L 133 216 V 220 H 98 Z" fill="#0f172a" />
        <path d="M 65 79 Q 88 68 116 80 L 126 145 Q 92 155 57 145 Z" fill="#137aa0" stroke="#07516e" strokeWidth="3" /><path d="M 63 111 H 121" stroke="#fde68a" strokeWidth="8" /><rect x="96" y="87" width="15" height="15" rx="2" fill="#c0effa" /><path d="M 88 82 V 147" stroke="#0b536e" strokeWidth="2" />
        <path d="M 66 85 L 45 130 L 49 155" stroke="#137aa0" strokeWidth="18" strokeLinecap="round" /><circle cx="49" cy="158" r="9" fill="#fed7aa" />
        <g className={action ? 'person-wave' : ''} style={{ transformOrigin: '115px 86px' }}><path d="M 115 86 L 139 114 L 151 90" stroke="#137aa0" strokeWidth="17" strokeLinecap="round" /><path d="M 151 90 L 156 78" stroke="#fed7aa" strokeWidth="14" strokeLinecap="round" /></g>
        <rect x="80" y="63" width="23" height="19" rx="8" fill="#edb389" /><ellipse cx="91" cy="48" rx="25" ry="28" fill="#fed7aa" /><path d="M 66 45 Q 63 13 91 13 Q 119 13 118 45" fill="#fbbf24" stroke="#d97706" strokeWidth="2" /><path d="M 60 42 H 122" stroke="#fcd34d" strokeWidth="9" strokeLinecap="round" /><path d="M 92 16 V 35" stroke="#fef3c7" strokeWidth="5" />
        <g className="person-blink" style={{ transformOrigin: '91px 51px' }}><circle cx="82" cy="51" r="2.5" fill="#172554" /><circle cx="101" cy="51" r="2.5" fill="#172554" /></g><path d="M 83 64 Q 92 69 100 63" fill="none" stroke="#9a4c36" strokeWidth="2" />
      </g>
    </svg>
  );
  return (
    <svg viewBox="0 0 340 145" className="training-person" role="img" aria-label={pose === 'cpr' ? '按压练习模型，胸部随点击下压并回弹' : '倒地学员，等待安全评估'}>
      <ellipse cx="178" cy="117" rx="148" ry="13" fill="#020617" opacity=".45" />
      <path d="M 203 88 L 294 91 L 315 105 M 204 105 L 287 109 L 305 120" stroke="#334155" strokeWidth="19" strokeLinecap="round" /><path d="M 306 98 L 322 101 L 322 114 M 299 116 L 317 117" stroke="#111827" strokeWidth="12" strokeLinecap="round" />
      <g style={{ transform: pose === 'cpr' && action ? 'translateY(6px) scaleY(.94)' : 'none', transformOrigin: '160px 113px', transition: 'transform 140ms ease-out' }}><path d="M 93 81 Q 151 62 210 85 L 214 109 Q 157 117 91 107 Z" fill={pose === 'cpr' ? '#b98b70' : '#176b91'} stroke={pose === 'cpr' ? '#e6b99b' : '#38bdf8'} strokeWidth="2" /><path d="M 115 85 L 152 107 L 205 111" fill="none" stroke={pose === 'cpr' ? '#d6a184' : '#176b91'} strokeWidth="13" strokeLinecap="round" /></g>
      <ellipse cx="66" cy="90" rx="29" ry="24" fill="#fed7aa" /><path d="M 40 82 Q 45 57 73 66 L 84 77 L 55 74 L 42 93 Z" fill="#172554" /><path d="M 53 89 H 61 M 71 88 H 78" stroke="#6b3f30" strokeWidth="2" /><path d="M 61 102 H 74" stroke="#9a4c36" strokeWidth="2" />
      {pose === 'cpr' && <g style={{ transform: action ? 'translateY(6px)' : 'none', transition: 'transform 140ms ease-out' }}><path d="M 137 8 L 150 63 M 180 8 L 164 63" stroke="#c7d2fe" strokeWidth="15" strokeLinecap="round" /><path d="M 147 69 H 172 M 143 75 H 169" stroke="#fed7aa" strokeWidth="10" strokeLinecap="round" /><circle cx="158" cy="85" r="16" fill="none" stroke="#fda4af" strokeWidth="2" strokeDasharray="3 4" /></g>}
    </svg>
  );
}
