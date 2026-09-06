'use client';
/* eslint-disable jsx-a11y/prefer-tag-over-role -- SVG terminals and probe handles expose keyboard-operable button semantics. */

import React, { useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Check,
  CheckCircle2,
  CircleDot,
  Gauge,
  GripVertical,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Multimeter,
  type MultimeterDialMode,
} from '@/src/game/instruments/Multimeter';
import { DCSolver } from '@/src/circuit/solver/DCSolver';
import {
  A02_STAGE_CONTENT,
  A02_TERMINAL_LABELS,
  createA02Progress,
  findClosestA02Terminal,
  isA02StepComplete,
  recordA02Measurement,
  type A02MeasurementKey,
  type A02Progress,
  type A02Step,
  type A02TerminalId,
} from '../a02Training';

export type { A02Step } from '../a02Training';

interface A02VoltageSceneProps {
  currentStep: A02Step;
  onStepComplete: (step: A02Step, evidence: Record<string, unknown>) => void;
  onAdvanceStep: () => void;
}

type ProbeColor = 'red' | 'black';
type Point = { x: number; y: number };

interface TerminalPosition extends Point {
  id: A02TerminalId;
  labelX: number;
  labelY: number;
}

const TERMINAL_TO_NODE: Record<A02TerminalId, string> = {
  BAT_POS: 'N_BAT_POS',
  BAT_NEG: '0',
  SW_IN: 'N_SW_IN',
  SW_OUT: 'N_LAMP_POS',
  LAMP_POS: 'N_LAMP_POS',
  LAMP_NEG: 'N_LAMP_NEG',
  CHASSIS_GND: '0',
};

const TERMINALS: readonly TerminalPosition[] = [
  { id: 'BAT_POS', x: 58, y: 82, labelX: 58, labelY: 58 },
  { id: 'BAT_NEG', x: 58, y: 214, labelX: 58, labelY: 241 },
  { id: 'SW_IN', x: 185, y: 82, labelX: 178, labelY: 57 },
  { id: 'SW_OUT', x: 258, y: 82, labelX: 266, labelY: 57 },
  { id: 'LAMP_POS', x: 378, y: 82, labelX: 388, labelY: 57 },
  { id: 'LAMP_NEG', x: 378, y: 191, labelX: 394, labelY: 216 },
  { id: 'CHASSIS_GND', x: 246, y: 214, labelX: 246, labelY: 242 },
];

const TERMINAL_MAP = new Map(
  TERMINALS.map((terminal) => [terminal.id, terminal]),
);
const PROBE_DOCKS: Record<ProbeColor, Point> = {
  red: { x: 438, y: 254 },
  black: { x: 474, y: 254 },
};

const RECORD_LABELS: Record<A02MeasurementKey, string> = {
  batteryForward: '正向电压约 12V',
  batteryReverse: '反向电压约 −12V',
  switchOpen: '断开的开关两端约 12V',
  lampClosed: '工作中的检修灯两端约 12V',
  faultLamp: '灯端工作电压约 10.91V',
  supplyDrop: '供电侧接点压降约 0.91V',
  groundDrop: '搭铁侧接点压降约 0.18V',
};

const STEP_RECORDS: Record<A02Step, readonly A02MeasurementKey[]> = {
  BATTERY_PROBING: ['batteryForward', 'batteryReverse'],
  SWITCH_AND_LOAD: ['switchOpen', 'lampClosed'],
  CONTACT_RESISTANCE_DROP: ['faultLamp', 'supplyDrop', 'groundDrop'],
  TRANSFER_DIAGNOSIS: [],
};

const MODE_LABELS: Partial<Record<MultimeterDialMode, string>> = {
  OFF: '关机',
  DC_V: '直流电压 V⎓',
  RESISTANCE: '电阻 Ω',
  DC_A: '直流电流 A⎓',
};

function getTerminalPoint(id: A02TerminalId | null, fallback: Point): Point {
  return id ? (TERMINAL_MAP.get(id) ?? fallback) : fallback;
}

export function A02VoltageScene({
  currentStep,
  onStepComplete,
  onAdvanceStep,
}: A02VoltageSceneProps) {
  const [dial, setDial] = useState<MultimeterDialMode>('OFF');
  const [redJack, setRedJack] = useState<'V_OHM' | 'A_10A'>('V_OHM');
  const [redProbe, setRedProbe] = useState<A02TerminalId | null>(null);
  const [blackProbe, setBlackProbe] = useState<A02TerminalId | null>(null);
  const [activeProbe, setActiveProbe] = useState<ProbeColor | null>(null);
  const [draggingProbe, setDraggingProbe] = useState<ProbeColor | null>(null);
  const [dragPoint, setDragPoint] = useState<Point | null>(null);
  const [isSwitchClosed, setIsSwitchClosed] = useState(true);
  const [progress, setProgress] = useState<A02Progress>(() =>
    createA02Progress(),
  );
  const [recordFeedback, setRecordFeedback] = useState(
    '请按上方顺序完成操作，再记录测量结果。',
  );
  const [transferAnswer, setTransferAnswer] = useState<string | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const dragOriginRef = useRef<Point | null>(null);
  const completedStepsRef = useRef(new Set<A02Step>());
  const stageContent = A02_STAGE_CONTENT[currentStep];

  const simulation = useMemo(() => {
    const solver = new DCSolver('0');
    solver.addVoltageSource({
      id: 'BAT',
      nodePos: 'N_BAT_POS',
      nodeNeg: '0',
      voltage: 12,
    });
    const hasFault =
      currentStep === 'CONTACT_RESISTANCE_DROP' ||
      currentStep === 'TRANSFER_DIAGNOSIS';
    solver.addResistor({
      id: 'R_SUPPLY',
      nodeA: 'N_BAT_POS',
      nodeB: 'N_SW_IN',
      resistance: hasFault ? 0.5 : 1e-4,
    });
    solver.addSwitch({
      id: 'SW1',
      nodeA: 'N_SW_IN',
      nodeB: 'N_LAMP_POS',
      closed: isSwitchClosed,
    });
    solver.addResistor({
      id: 'R_LAMP',
      nodeA: 'N_LAMP_POS',
      nodeB: 'N_LAMP_NEG',
      resistance: 6,
    });
    solver.addResistor({
      id: 'R_GROUND',
      nodeA: 'N_LAMP_NEG',
      nodeB: '0',
      resistance: hasFault ? 0.1 : 1e-4,
    });
    return solver.solve();
  }, [currentStep, isSwitchClosed]);

  const dmmResult = useMemo(() => {
    const dmm = new Multimeter();
    dmm.setDial(dial);
    dmm.setRedProbeJack(redJack);
    dmm.setBlackProbeJack('COM');
    dmm.attachRedProbe(redProbe);
    dmm.attachBlackProbe(blackProbe);
    return dmm.measure({
      nodeVoltages: simulation.nodeVoltages,
      redNode: redProbe ? TERMINAL_TO_NODE[redProbe] : undefined,
      blackNode: blackProbe ? TERMINAL_TO_NODE[blackProbe] : undefined,
      isCircuitPowered: true,
    });
  }, [blackProbe, dial, redJack, redProbe, simulation]);

  const stepReady =
    currentStep === 'TRANSFER_DIAGNOSIS'
      ? transferAnswer === 'SUPPLY_OXIDIZED'
      : isA02StepComplete(currentStep, progress);

  const connectProbe = (probe: ProbeColor, terminal: A02TerminalId) => {
    if (probe === 'red') setRedProbe(terminal);
    else setBlackProbe(terminal);
    setActiveProbe(null);
    setRecordFeedback(
      `${probe === 'red' ? '红' : '黑'}表笔已接到“${A02_TERMINAL_LABELS[terminal]}”。`,
    );
  };

  const handleTerminalClick = (terminal: A02TerminalId) => {
    if (!activeProbe) {
      setRecordFeedback('请先点击红表笔或黑表笔，再点击要测量的接点。');
      return;
    }
    connectProbe(activeProbe, terminal);
  };

  const toSvgPoint = (clientX: number, clientY: number): Point | null => {
    const svg = svgRef.current;
    const matrix = svg?.getScreenCTM();
    if (!svg || !matrix) return null;
    const point = svg.createSVGPoint();
    point.x = clientX;
    point.y = clientY;
    const transformed = point.matrixTransform(matrix.inverse());
    return { x: transformed.x, y: transformed.y };
  };

  const handleProbePointerDown = (
    probe: ProbeColor,
    event: React.PointerEvent<SVGGElement>,
  ) => {
    event.preventDefault();
    const point = toSvgPoint(event.clientX, event.clientY);
    dragOriginRef.current = point;
    setDraggingProbe(probe);
    setDragPoint(point);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handleProbePointerMove = (event: React.PointerEvent<SVGGElement>) => {
    if (!draggingProbe) return;
    const point = toSvgPoint(event.clientX, event.clientY);
    if (point) setDragPoint(point);
  };

  const handleProbePointerUp = (
    probe: ProbeColor,
    event: React.PointerEvent<SVGGElement>,
  ) => {
    const point = toSvgPoint(event.clientX, event.clientY);
    const origin = dragOriginRef.current;
    const moved =
      point && origin
        ? Math.hypot(point.x - origin.x, point.y - origin.y) > 5
        : false;
    const terminal = point
      ? findClosestA02Terminal(point, TERMINALS, 30)
      : null;
    if (moved && terminal) connectProbe(probe, terminal);
    else if (moved)
      setRecordFeedback('没有放到测点上，请拖到发光的圆形接点附近再松手。');
    else setActiveProbe((selected) => (selected === probe ? null : probe));
    setDraggingProbe(null);
    setDragPoint(null);
    dragOriginRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId))
      event.currentTarget.releasePointerCapture(event.pointerId);
  };

  const handleRecordMeasurement = () => {
    const result = recordA02Measurement(progress, {
      step: currentStep,
      dial,
      redJack,
      redProbe,
      blackProbe,
      switchClosed: isSwitchClosed,
      status: dmmResult.status,
      measuredValue: dmmResult.measuredValue,
    });
    if (!result.recordedKey) {
      if (dial !== 'DC_V')
        setRecordFeedback('未记录：请先把功能旋钮拨到“直流电压”。');
      else if (redJack !== 'V_OHM')
        setRecordFeedback('未记录：测电压时，红表笔必须插在 VΩ 孔。');
      else if (!redProbe || !blackProbe)
        setRecordFeedback('未记录：两支表笔都要接到电路测点。');
      else
        setRecordFeedback(
          '未记录：当前开关状态或表笔位置不符合本步要求，请按操作顺序核对。',
        );
      return;
    }
    setProgress(result.progress);
    setRecordFeedback(`已记录：${RECORD_LABELS[result.recordedKey]}。`);
    if (result.stepComplete && !completedStepsRef.current.has(currentStep)) {
      completedStepsRef.current.add(currentStep);
      onStepComplete(currentStep, {
        completedMeasurements: STEP_RECORDS[currentStep],
        measuredValue: dmmResult.measuredValue,
        dial,
        redJack,
      });
    }
  };

  const handleTransferSelect = (answer: string) => {
    setTransferAnswer(answer);
    if (answer === 'SUPPLY_OXIDIZED') {
      setRecordFeedback(
        '判断正确：异常压降集中在供电侧氧化接点，应清洁、紧固并复测。',
      );
      if (!completedStepsRef.current.has('TRANSFER_DIAGNOSIS')) {
        completedStepsRef.current.add('TRANSFER_DIAGNOSIS');
        onStepComplete('TRANSFER_DIAGNOSIS', {
          selectedResolution: answer,
          supportingEvidence: {
            supplyDrop: 0.91,
            groundDrop: 0.18,
            lampVoltage: 10.91,
          },
        });
      }
    } else {
      setRecordFeedback(
        '证据不支持直接更换部件。请比较供电侧与搭铁侧的压降大小。',
      );
    }
  };

  const handleAdvance = () => {
    setActiveProbe(null);
    setDraggingProbe(null);
    setDragPoint(null);
    setRecordFeedback('请按上方顺序完成操作，再记录测量结果。');
    onAdvanceStep();
  };

  const displayedRedPoint =
    draggingProbe === 'red' && dragPoint
      ? dragPoint
      : getTerminalPoint(redProbe, PROBE_DOCKS.red);
  const displayedBlackPoint =
    draggingProbe === 'black' && dragPoint
      ? dragPoint
      : getTerminalPoint(blackProbe, PROBE_DOCKS.black);
  const hasFault =
    currentStep === 'CONTACT_RESISTANCE_DROP' ||
    currentStep === 'TRANSFER_DIAGNOSIS';

  const renderProbe = (
    probe: ProbeColor,
    point: Point,
    connected: A02TerminalId | null,
  ) => {
    const isRed = probe === 'red';
    const selected = activeProbe === probe || draggingProbe === probe;
    return (
      <g
        role="button"
        tabIndex={0}
        aria-label={`${isRed ? '红' : '黑'}表笔${connected ? `，当前接在${A02_TERMINAL_LABELS[connected]}` : '，当前未连接'}`}
        aria-pressed={activeProbe === probe}
        className="cursor-grab outline-none active:cursor-grabbing"
        style={{
          touchAction: 'none',
          pointerEvents: activeProbe && activeProbe !== probe ? 'none' : 'auto',
        }}
        onPointerDown={(event) => handleProbePointerDown(probe, event)}
        onPointerMove={handleProbePointerMove}
        onPointerUp={(event) => handleProbePointerUp(probe, event)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            setActiveProbe((active) => (active === probe ? null : probe));
          }
        }}
      >
        {selected && (
          <circle
            cx={point.x}
            cy={point.y}
            r="18"
            fill="none"
            stroke="#fbbf24"
            strokeWidth="3"
            strokeDasharray="4 4"
          />
        )}
        <circle
          cx={point.x}
          cy={point.y}
          r="12"
          fill={isRed ? '#dc2626' : '#111827'}
          stroke="#fff"
          strokeWidth="3"
        />
        <rect
          x={point.x - 4}
          y={point.y - 19}
          width="8"
          height="14"
          rx="4"
          fill={isRed ? '#f87171' : '#64748b'}
        />
      </g>
    );
  };

  return (
    <div className="a02-scene flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 text-slate-800 shadow-sm">
      <section
        className="rounded-xl border-2 border-blue-200 bg-blue-50 p-4"
        aria-label="本步操作指令"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-black text-blue-950">
              {stageContent.title}
            </h2>
            <p className="mt-1 text-base font-semibold leading-7 text-blue-800">
              本步要做什么：{stageContent.objective}
            </p>
          </div>
          {stepReady && (
            <Button
              onClick={handleAdvance}
              className="min-h-11 bg-emerald-600 px-5 text-base font-bold text-white hover:bg-emerald-700"
            >
              {currentStep === 'TRANSFER_DIAGNOSIS'
                ? '完成 A02 实训'
                : '进入下一步'}
              <ArrowRight size={18} />
            </Button>
          )}
        </div>
        <ol className="mt-3 grid gap-2 text-sm font-semibold leading-6 text-slate-800 md:grid-cols-3">
          {stageContent.actions.map((action, index) => (
            <li
              key={action}
              className="flex gap-2 rounded-lg border border-blue-100 bg-white/90 p-3"
            >
              <span className="grid size-6 shrink-0 place-items-center rounded-full bg-blue-700 text-sm font-black text-white">
                {index + 1}
              </span>
              <span>{action}</span>
            </li>
          ))}
        </ol>
        <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-900">
          完成标志：{stageContent.completion}
        </p>
      </section>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <section
          className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 xl:col-span-7"
          aria-label="12伏检修灯测量电路"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-black text-slate-900">
                12V 检修灯工作电路
              </h3>
              <p className="mt-1 text-sm text-slate-600">
                点击一支表笔后点测点，或直接把表笔拖到圆形测点。
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => {
                setIsSwitchClosed((closed) => !closed);
                setRecordFeedback(
                  `开关已切换为${isSwitchClosed ? '断开' : '闭合'}状态。`,
                );
              }}
              className={`min-h-11 px-4 text-base font-bold ${isSwitchClosed ? 'border-emerald-300 bg-emerald-50 text-emerald-800' : 'border-amber-300 bg-amber-50 text-amber-900'}`}
            >
              <CircleDot size={18} />
              开关：{isSwitchClosed ? '已闭合' : '已断开'}
            </Button>
          </div>

          <div className="relative min-h-[310px] overflow-hidden rounded-xl border border-slate-700 bg-slate-950">
            <svg
              ref={svgRef}
              className="h-full min-h-[310px] w-full select-none"
              viewBox="0 0 500 280"
              aria-label="可连接表笔的电路图"
            >
              <path
                d="M58 82 H185"
                stroke={hasFault ? '#f59e0b' : '#38bdf8'}
                strokeWidth="4"
                fill="none"
              />
              <path
                d="M258 82 H378"
                stroke="#38bdf8"
                strokeWidth="4"
                fill="none"
              />
              <path
                d="M378 191 H246 L58 214"
                stroke="#64748b"
                strokeWidth="4"
                fill="none"
              />

              <g>
                <rect
                  x="24"
                  y="82"
                  width="68"
                  height="132"
                  rx="10"
                  fill="#1e293b"
                  stroke="#3b82f6"
                  strokeWidth="3"
                />
                <text
                  x="58"
                  y="139"
                  fill="#bfdbfe"
                  fontSize="15"
                  fontWeight="bold"
                  textAnchor="middle"
                >
                  12V
                </text>
                <text
                  x="58"
                  y="160"
                  fill="#bfdbfe"
                  fontSize="14"
                  fontWeight="bold"
                  textAnchor="middle"
                >
                  蓄电池
                </text>
                <text
                  x="58"
                  y="101"
                  fill="#fecaca"
                  fontSize="18"
                  fontWeight="bold"
                  textAnchor="middle"
                >
                  ＋
                </text>
                <text
                  x="58"
                  y="204"
                  fill="#bae6fd"
                  fontSize="18"
                  fontWeight="bold"
                  textAnchor="middle"
                >
                  －
                </text>
              </g>

              {hasFault && (
                <g>
                  <rect
                    x="103"
                    y="64"
                    width="60"
                    height="36"
                    rx="6"
                    fill="#78350f"
                    stroke="#f59e0b"
                    strokeWidth="2"
                  />
                  <text
                    x="133"
                    y="79"
                    fill="#fef3c7"
                    fontSize="13"
                    fontWeight="bold"
                    textAnchor="middle"
                  >
                    氧化接点
                  </text>
                  <text
                    x="133"
                    y="95"
                    fill="#fde68a"
                    fontSize="13"
                    fontWeight="bold"
                    textAnchor="middle"
                  >
                    0.5Ω
                  </text>
                </g>
              )}

              <g>
                <rect
                  x="175"
                  y="70"
                  width="93"
                  height="58"
                  rx="9"
                  fill="#1e293b"
                  stroke="#94a3b8"
                  strokeWidth="2"
                />
                <text
                  x="221"
                  y="111"
                  fill="#e2e8f0"
                  fontSize="15"
                  fontWeight="bold"
                  textAnchor="middle"
                >
                  控制开关
                </text>
                <circle cx="185" cy="82" r="5" fill="#e2e8f0" />
                <circle cx="258" cy="82" r="5" fill="#e2e8f0" />
                <line
                  x1="185"
                  y1="82"
                  x2={isSwitchClosed ? 258 : 238}
                  y2={isSwitchClosed ? 82 : 62}
                  stroke="#38bdf8"
                  strokeWidth="4"
                />
                <text
                  x="221"
                  y="124"
                  fill={isSwitchClosed ? '#86efac' : '#fde68a'}
                  fontSize="13"
                  textAnchor="middle"
                >
                  {isSwitchClosed ? '闭合' : '断开'}
                </text>
              </g>

              <g>
                <rect
                  x="350"
                  y="70"
                  width="86"
                  height="121"
                  rx="12"
                  fill="#1e293b"
                  stroke="#eab308"
                  strokeWidth="3"
                />
                <circle
                  cx="393"
                  cy="128"
                  r="28"
                  fill={isSwitchClosed ? '#facc15' : '#475569'}
                  opacity={isSwitchClosed ? (hasFault ? 0.7 : 1) : 0.25}
                />
                <text
                  x="393"
                  y="133"
                  fill="#0f172a"
                  fontSize="14"
                  fontWeight="bold"
                  textAnchor="middle"
                >
                  {isSwitchClosed ? '亮灯' : '熄灭'}
                </text>
                <text
                  x="393"
                  y="176"
                  fill="#fde68a"
                  fontSize="14"
                  fontWeight="bold"
                  textAnchor="middle"
                >
                  检修灯 6Ω
                </text>
              </g>

              {hasFault && (
                <g>
                  <rect
                    x="272"
                    y="196"
                    width="66"
                    height="36"
                    rx="6"
                    fill="#78350f"
                    stroke="#f59e0b"
                    strokeWidth="2"
                  />
                  <text
                    x="305"
                    y="211"
                    fill="#fef3c7"
                    fontSize="13"
                    fontWeight="bold"
                    textAnchor="middle"
                  >
                    搭铁接点
                  </text>
                  <text
                    x="305"
                    y="227"
                    fill="#fde68a"
                    fontSize="13"
                    fontWeight="bold"
                    textAnchor="middle"
                  >
                    0.1Ω
                  </text>
                </g>
              )}

              <path
                d={`M ${PROBE_DOCKS.red.x} ${PROBE_DOCKS.red.y} Q 420 250 ${displayedRedPoint.x} ${displayedRedPoint.y}`}
                fill="none"
                stroke="#ef4444"
                strokeWidth="4"
                strokeLinecap="round"
              />
              <path
                d={`M ${PROBE_DOCKS.black.x} ${PROBE_DOCKS.black.y} Q 450 265 ${displayedBlackPoint.x} ${displayedBlackPoint.y}`}
                fill="none"
                stroke="#334155"
                strokeWidth="5"
                strokeLinecap="round"
              />

              {TERMINALS.map((terminal) => {
                const occupied =
                  redProbe === terminal.id || blackProbe === terminal.id;
                return (
                  <g
                    key={terminal.id}
                    role="button"
                    tabIndex={0}
                    aria-label={`测点：${A02_TERMINAL_LABELS[terminal.id]}`}
                    className="cursor-pointer outline-none"
                    onClick={() => handleTerminalClick(terminal.id)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        handleTerminalClick(terminal.id);
                      }
                    }}
                  >
                    <circle
                      cx={terminal.x}
                      cy={terminal.y}
                      r="17"
                      fill="transparent"
                      stroke={activeProbe ? '#fbbf24' : 'transparent'}
                      strokeWidth="2"
                      strokeDasharray="4 3"
                    />
                    <circle
                      cx={terminal.x}
                      cy={terminal.y}
                      r="9"
                      fill={occupied ? '#fbbf24' : '#0f172a'}
                      stroke="#f8fafc"
                      strokeWidth="3"
                    />
                    <text
                      x={terminal.labelX}
                      y={terminal.labelY}
                      fill="#e2e8f0"
                      fontSize="13"
                      fontWeight="bold"
                      textAnchor="middle"
                      className="pointer-events-none"
                    >
                      {A02_TERMINAL_LABELS[terminal.id]}
                    </text>
                  </g>
                );
              })}

              {renderProbe('red', displayedRedPoint, redProbe)}
              {renderProbe('black', displayedBlackPoint, blackProbe)}
              <text
                x="456"
                y="276"
                fill="#cbd5e1"
                fontSize="13"
                fontWeight="bold"
                textAnchor="middle"
              >
                表笔停放处
              </text>
            </svg>
          </div>

          <div className="grid gap-2 text-sm sm:grid-cols-2">
            <button
              type="button"
              onClick={() => setActiveProbe('red')}
              className={`flex min-h-12 items-center gap-2 rounded-lg border-2 px-3 text-left font-bold ${activeProbe === 'red' ? 'border-amber-400 bg-amber-50' : 'border-red-200 bg-red-50 text-red-900'}`}
            >
              <GripVertical size={18} className="text-red-600" />
              红表笔：
              {redProbe
                ? A02_TERMINAL_LABELS[redProbe]
                : '未连接，点击后选择测点'}
            </button>
            <button
              type="button"
              onClick={() => setActiveProbe('black')}
              className={`flex min-h-12 items-center gap-2 rounded-lg border-2 px-3 text-left font-bold ${activeProbe === 'black' ? 'border-amber-400 bg-amber-50' : 'border-slate-300 bg-slate-100 text-slate-900'}`}
            >
              <GripVertical size={18} className="text-slate-800" />
              黑表笔：
              {blackProbe
                ? A02_TERMINAL_LABELS[blackProbe]
                : '未连接，点击后选择测点'}
            </button>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p
              className="text-sm font-semibold text-slate-700"
              aria-live="polite"
            >
              {recordFeedback}
            </p>
            <Button
              variant="outline"
              onClick={() => {
                setRedProbe(null);
                setBlackProbe(null);
                setActiveProbe(null);
                setRecordFeedback('两支表笔已拔下，请重新连接。');
              }}
              className="min-h-10 text-sm font-bold"
            >
              拔下两支表笔
            </Button>
          </div>
        </section>

        <section
          className="flex flex-col gap-3 rounded-xl border-2 border-amber-300 bg-amber-50 p-4 xl:col-span-5"
          aria-label="数字万用表"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="flex items-center gap-2 text-base font-black text-amber-950">
              <Gauge size={20} />
              数字万用表
            </h3>
            <span className="rounded-full bg-amber-200 px-3 py-1 text-sm font-bold text-amber-950">
              安全等级 CAT III 600V
            </span>
          </div>
          <div className="flex h-32 flex-col justify-between rounded-xl border-4 border-slate-700 bg-emerald-950 p-4 font-mono text-emerald-300 shadow-inner">
            <div className="flex justify-between text-sm opacity-80">
              <span>自动量程 · 直流</span>
              <span>输入电阻 10MΩ</span>
            </div>
            <output className="text-right text-4xl font-black tracking-widest">
              {dial === 'OFF' ? '— — — —' : dmmResult.displayText || '0.00 V'}
            </output>
            <div className="flex justify-between text-sm opacity-80">
              <span>测量值</span>
              <span>{dmmResult.unit}</span>
            </div>
          </div>

          {dmmResult.warningMessage && (
            <div className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-100 p-3 text-sm font-bold leading-6 text-amber-950">
              <AlertTriangle size={20} className="mt-0.5 shrink-0" />
              {dmmResult.warningMessage}
            </div>
          )}

          <div>
            <p className="mb-2 text-sm font-black text-slate-800">
              第一项：选择功能挡位
            </p>
            <div className="grid grid-cols-2 gap-2">
              {(
                ['OFF', 'DC_V', 'RESISTANCE', 'DC_A'] as MultimeterDialMode[]
              ).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setDial(mode)}
                  className={`min-h-12 rounded-lg border px-2 text-sm font-bold ${dial === mode ? 'border-amber-700 bg-amber-600 text-white' : 'border-slate-300 bg-white text-slate-800 hover:bg-slate-50'}`}
                >
                  {MODE_LABELS[mode]}
                </button>
              ))}
            </div>
          </div>

          <fieldset>
            <legend className="mb-2 text-sm font-black text-slate-800">
              第二项：确认红表笔插孔
            </legend>
            <div className="grid grid-cols-2 gap-2">
              <label
                className={`flex min-h-12 cursor-pointer items-center gap-2 rounded-lg border p-3 text-sm font-bold ${redJack === 'V_OHM' ? 'border-emerald-500 bg-emerald-50 text-emerald-900' : 'border-slate-300 bg-white'}`}
              >
                <input
                  type="radio"
                  name="redJack"
                  checked={redJack === 'V_OHM'}
                  onChange={() => setRedJack('V_OHM')}
                />
                VΩ 孔（测电压）
              </label>
              <label
                className={`flex min-h-12 cursor-pointer items-center gap-2 rounded-lg border p-3 text-sm font-bold ${redJack === 'A_10A' ? 'border-red-500 bg-red-50 text-red-900' : 'border-slate-300 bg-white'}`}
              >
                <input
                  type="radio"
                  name="redJack"
                  checked={redJack === 'A_10A'}
                  onChange={() => setRedJack('A_10A')}
                />
                10A 孔（测电流）
              </label>
            </div>
          </fieldset>

          {currentStep !== 'TRANSFER_DIAGNOSIS' ? (
            <>
              <Button
                onClick={handleRecordMeasurement}
                className="min-h-12 w-full bg-blue-700 text-base font-black text-white hover:bg-blue-800"
              >
                <CheckCircle2 size={20} />
                记录本次测量
              </Button>
              <div className="rounded-xl border border-slate-200 bg-white p-3">
                <h4 className="flex items-center gap-2 text-sm font-black text-slate-900">
                  <Sparkles size={17} className="text-amber-500" />
                  本步测量记录
                </h4>
                <div className="mt-2 grid gap-2">
                  {STEP_RECORDS[currentStep].map((key) => (
                    <div
                      key={key}
                      className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold ${progress[key] ? 'bg-emerald-50 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}
                    >
                      <span
                        className={`grid size-6 shrink-0 place-items-center rounded-full ${progress[key] ? 'bg-emerald-600 text-white' : 'border border-slate-300 bg-white'}`}
                      >
                        {progress[key] && <Check size={16} />}
                      </span>
                      {RECORD_LABELS[key]}
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <h4 className="text-base font-black text-slate-900">
                根据三项数据选择维修措施
              </h4>
              <p className="mt-2 rounded-lg bg-slate-100 p-3 text-sm font-semibold leading-6 text-slate-700">
                灯端 10.91V；供电侧接点压降 0.91V；搭铁侧接点压降 0.18V。
              </p>
              <div className="mt-3 grid gap-2 text-sm">
                {[
                  ['CHANGE_BATTERY', '直接更换蓄电池'],
                  ['SUPPLY_OXIDIZED', '清洁并紧固供电侧氧化接点，随后复测'],
                  ['CHANGE_LAMP', '直接更换检修灯'],
                ].map(([value, label]) => (
                  <label
                    key={value}
                    className={`flex min-h-12 cursor-pointer items-center gap-2 rounded-lg border p-3 font-bold ${transferAnswer === value ? 'border-blue-500 bg-blue-50 text-blue-950' : 'border-slate-300'}`}
                  >
                    <input
                      type="radio"
                      name="transfer"
                      checked={transferAnswer === value}
                      onChange={() => handleTransferSelect(value)}
                    />
                    {label}
                  </label>
                ))}
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
