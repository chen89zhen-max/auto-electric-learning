'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useId, useReducer, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ClipboardList,
  Footprints,
  Hand,
  Maximize2,
  MessageCircle,
  RotateCcw,
  ShieldCheck,
  Toolbox,
  Wrench,
  X,
  Zap,
} from 'lucide-react';
import {
  initialTour,
  tourReducer,
  walkDestination,
  type Point,
} from './tourModel';
import './workshop-preview.css';

const stations = [
  { id: 'tools', name: '工具柜', x: 17, y: 70, markerY: 50, icon: Toolbox },
  { id: 'car', name: '维修工位', x: 48, y: 73, markerY: 52, icon: Wrench },
  { id: 'bench', name: '电工实训台', x: 78, y: 70, markerY: 47, icon: Zap },
  {
    id: 'order',
    name: '电子工单',
    x: 92,
    y: 73,
    markerY: 48,
    icon: ClipboardList,
  },
] as const;
type Station = (typeof stations)[number]['id'];
const steps = [
  '去工单台领取入职任务',
  '到工具柜领取训练器材',
  '观察车辆与举升机工位',
  '查看实训台状态并断电',
  '将训练器材放到收纳区',
  '入职体验完成',
];
const recommended: Station[] = [
  'order',
  'tools',
  'car',
  'bench',
  'bench',
  'bench',
];

function Technician({
  teacher = false,
  moving = false,
  facing = 1,
}: {
  teacher?: boolean;
  moving?: boolean;
  facing?: number;
}) {
  const id = useId().replaceAll(':', '');
  return (
    <svg
      viewBox="0 0 90 210"
      className={`wp-person-art ${moving ? 'is-walking' : ''}`}
      aria-hidden="true"
      style={{ transform: `scaleX(${facing})` }}
    >
      <defs>
        <linearGradient id={`${id}-suit`} x1="0" x2="1">
          <stop stopColor={teacher ? '#776449' : '#143948'} />
          <stop offset=".5" stopColor={teacher ? '#b49b70' : '#38758a'} />
          <stop offset="1" stopColor={teacher ? '#5d513f' : '#153c50'} />
        </linearGradient>
        <linearGradient id={`${id}-skin`}>
          <stop stopColor="#ae7859" />
          <stop offset=".5" stopColor="#dfb693" />
          <stop offset="1" stopColor="#bb8e6a" />
        </linearGradient>
      </defs>
      <g className="wp-body">
        <g className="wp-leg wp-leg-left">
          <path
            d="M29 115 L27 165 L25 196 L40 197 L47 153 L47 115Z"
            fill="#202c32"
          />
          <path
            d="M25 188 L39 190 L40 205 L17 205 Q14 199 25 194Z"
            fill="#131a1d"
          />
          <path d="M30 126 L31 171" stroke="#465057" strokeWidth="2" />
        </g>
        <g className="wp-leg wp-leg-right">
          <path
            d="M46 115 L48 158 L54 196 L69 195 L63 155 L64 115Z"
            fill="#28373e"
          />
          <path d="M54 190 L68 190 L74 201 L73 205 L52 205Z" fill="#12191e" />
          <path d="M54 127 L57 168" stroke="#4d5960" strokeWidth="2" />
        </g>
        <g className="wp-arm wp-arm-left">
          <path
            d="M28 59 Q18 62 17 86 L16 119 L25 122 L32 91 L36 65"
            fill={`url(#${id}-suit)`}
          />
          <path
            d="M16 118 L15 133 Q18 141 23 135 L25 120"
            fill={`url(#${id}-skin)`}
          />
        </g>
        <path
          d="M29 58 L39 52 L54 53 L66 62 L67 119 Q45 127 25 119Z"
          fill={`url(#${id}-suit)`}
          stroke="#142833"
          strokeWidth=".8"
        />
        <path
          d="M30 59 L42 70 L47 61 L53 69 L62 59"
          fill={teacher ? '#584b39' : '#153947'}
        />
        <path
          d="M47 66 L46 119"
          stroke="#bcc6bb"
          strokeWidth="1"
          opacity=".6"
        />
        <path d="M27 82 L66 82" stroke="#d5d2b2" strokeWidth="3" opacity=".8" />
        <path d="M31 90 L40 90 L40 101 L30 101Z" fill="#173f4e" opacity=".7" />
        <rect x="51" y="88" width="10" height="6" rx="1" fill="#dfd7bd" />
        <path d="M28 119 L65 119" stroke="#151d24" strokeWidth="4" />
        <g className="wp-arm wp-arm-right">
          <path
            d="M62 59 Q72 62 73 85 L76 118 L67 121 L60 92 L58 67"
            fill={`url(#${id}-suit)`}
          />
          <path
            d="M67 117 L69 135 Q74 142 78 133 L76 117"
            fill={`url(#${id}-skin)`}
          />
        </g>
        <path d="M39 44 L39 56 L47 62 L55 54 L53 44" fill="#b98c69" />
        <ellipse cx="46" cy="31" rx="15" ry="21" fill={`url(#${id}-skin)`} />
        <path
          d="M31 32 L30 17 Q44 0 60 17 L61 31 L56 23 L34 23Z"
          fill={teacher ? '#49433e' : '#242925'}
        />
        <path
          d="M29 20 Q41 7 61 20 L62 24 L28 24Z"
          fill={teacher ? '#696853' : '#285360'}
        />
        <path
          d="M48 24 L65 27 L63 29 L47 28Z"
          fill={teacher ? '#464938' : '#153b47'}
        />
        <path
          d="M37 33 L41 33 M51 33 L55 33"
          stroke="#40352e"
          strokeWidth="1.5"
        />
        <path
          d="M46 34 L44 41 L48 42 M42 48 L50 47"
          fill="none"
          stroke="#8d5e49"
          strokeWidth="1"
        />
        {teacher && (
          <path
            d="M36 31 H43 V37 H35Z M49 31 H57 V37 H49Z M43 33 H49"
            fill="none"
            stroke="#343c3e"
            strokeWidth="1.3"
          />
        )}
      </g>
    </svg>
  );
}

export function WorkshopPreview({ onExit }: { onExit?: () => void }) {
  const [state, dispatch] = useReducer(tourReducer, initialTour);
  const [student, setStudent] = useState<Point>({ x: 36, y: 85 });
  const [teacher, setTeacher] = useState<Point>({ x: 60, y: 74 });
  const [destination, setDestination] = useState<Point | null>(null);
  const [dialog, setDialog] = useState<Station | 'teacher' | null>('teacher');
  const [moving, setMoving] = useState(false);
  const [teacherMoving, setTeacherMoving] = useState(false);
  const [facing, setFacing] = useState(1);
  const [teacherFacing, setTeacherFacing] = useState(1);
  const [arrived, setArrived] = useState<Station | null>(null);
  const [notice, setNotice] = useState(
    '陈师傅正在等你。点击工位标记，走近后就能交谈和操作。',
  );
  const [reduced, setReduced] = useState(false);
  const travel = useRef<ReturnType<typeof setTimeout> | null>(null);
  const guideTravel = useRef<ReturnType<typeof setTimeout> | null>(null);
  const shell = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLElement>(null);
  const [duration, setDuration] = useState(1);
  const [teacherDuration, setTeacherDuration] = useState(1);
  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(media.matches);
    update();
    media.addEventListener('change', update);
    return () => {
      media.removeEventListener('change', update);
      if (travel.current) clearTimeout(travel.current);
      if (guideTravel.current) clearTimeout(guideTravel.current);
    };
  }, []);
  useEffect(() => {
    if (dialog) dialogRef.current?.focus({ preventScroll: true });
  }, [dialog]);

  function moveTo(point: Point, station?: Station) {
    if (moving) return;
    const p = walkDestination(point);
    const seconds = reduced
      ? 0.01
      : Math.max(0.65, Math.hypot(p.x - student.x, p.y - student.y) / 22);
    setDuration(seconds);
    setFacing(p.x >= student.x ? 1 : -1);
    setDialog(null);
    setArrived(null);
    setDestination(p);
    setMoving(true);
    setStudent(p);
    setNotice(
      station
        ? `正在走向${stations.find((s) => s.id === station)?.name}…`
        : '沿车间前方通道行走。',
    );
    travel.current = setTimeout(() => {
      setMoving(false);
      setDestination(null);
      setArrived(station ?? null);
      setDialog(station ?? null);
      setNotice(
        station
          ? `已到达${stations.find((s) => s.id === station)?.name}。`
          : '已到达。可以点击附近的工位或陈师傅。',
      );
    }, seconds * 1000);
  }
  function visit(id: Station) {
    const s = stations.find((item) => item.id === id)!;
    moveTo({ x: s.x, y: s.y }, id);
  }
  function guideTo(id: Station) {
    const s = stations.find((item) => item.id === id)!;
    const p = { x: Math.max(8, s.x - 7), y: s.y - 1 };
    const seconds = reduced
      ? 0.01
      : Math.max(0.8, Math.hypot(p.x - teacher.x, p.y - teacher.y) / 19);
    if (guideTravel.current) clearTimeout(guideTravel.current);
    setTeacherFacing(p.x >= teacher.x ? 1 : -1);
    setTeacherDuration(seconds);
    setTeacherMoving(true);
    setTeacher(p);
    guideTravel.current = setTimeout(
      () => setTeacherMoving(false),
      seconds * 1000,
    );
  }
  function nextAction(
    action: Parameters<typeof tourReducer>[1],
    next?: Station,
  ) {
    dispatch(action);
    if (next) {
      setDialog(null);
      guideTo(next);
      setNotice(
        `陈师傅先去${stations.find((s) => s.id === next)?.name}等你。点击标记跟过去。`,
      );
    }
  }
  function reset() {
    if (travel.current) clearTimeout(travel.current);
    if (guideTravel.current) clearTimeout(guideTravel.current);
    dispatch('RESET');
    setMoving(false);
    setTeacherMoving(false);
    setDestination(null);
    setStudent({ x: 36, y: 85 });
    setTeacher({ x: 60, y: 74 });
    setDialog('teacher');
    setArrived(null);
    setNotice('新的入职体验开始。');
  }
  const activeStation = stations.find((s) => s.id === dialog);
  return (
    <div className="wp-shell" ref={shell}>
      <header className="wp-header">
        <div className="wp-brand">
          <span className="wp-brand-icon">
            <Wrench size={22} />
          </span>
          <div>
            <span className="wp-eyebrow">汽车电工电子 · 场景体验</span>
            <h1>
              维修中心第一天<span>01 / 入职工位</span>
            </h1>
          </div>
        </div>
        <div className="wp-header-actions">
          <span className="wp-live">
            <i />
            车间已开放
          </span>
          <button type="button" onClick={reset} title="重新体验">
            <RotateCcw size={17} />
            <span>重新体验</span>
          </button>
          <button
            type="button"
            aria-label="切换全屏"
            onClick={() => {
              if (document.fullscreenElement)
                void document
                  .exitFullscreen()
                  .catch(() => setNotice('当前无法退出全屏。'));
              else
                void shell.current
                  ?.requestFullscreen()
                  .catch(() =>
                    setNotice('当前窗口不支持全屏，可放大浏览器体验。'),
                  );
            }}
          >
            <Maximize2 size={18} />
          </button>
          {onExit ? (
            <button type="button" onClick={onExit}>
              <ArrowLeft size={17} />
              原入职训练
            </button>
          ) : (
            <Link href="/">
              <ArrowLeft size={17} />
              课程大厅
            </Link>
          )}
        </div>
      </header>
      <main className="wp-main">
        <div className="wp-mission">
          <div>
            <span className="wp-mission-tag">今日工单</span>
            <strong>{steps[state.step]}</strong>
          </div>
          <span>{Math.min(state.step, 5)} / 5 项完成</span>
          <div className="wp-progress">
            <i style={{ width: `${state.step * 20}%` }} />
          </div>
        </div>
        <div className="wp-stage-wrap">
          <fieldset
            className="wp-stage"
            aria-label="汽车维修车间，点击工位标记移动，或用下方按钮选择目的地"
          >
            <Image
              unoptimized
              priority
              width={1672}
              height={941}
              className="wp-backdrop"
              src="/workshop-preview/workshop.png"
              alt="有蓝色双柱举升机、银色教学车辆、红色工具柜和电子实训台的维修车间"
              draggable={false}
            />
            <div className="wp-vignette" />
            <span
              className={`wp-world-power ${state.power ? 'on' : ''}`}
              aria-hidden="true"
            />
            {state.placed && (
              <span className="wp-world-part" aria-hidden="true">
                <i />
                <i />
                <i />
              </span>
            )}
            <div className="wp-scene-caption">
              <span>实训中心 / 1号车间</span>
              <small>上午 09:00 · 见习技师入职</small>
            </div>
            <button
              type="button"
              className="wp-floor"
              aria-label="点击前方步行区移动，方向键微调位置"
              disabled={moving}
              onClick={(e) => {
                const r =
                  e.currentTarget.parentElement!.getBoundingClientRect();
                moveTo({
                  x: ((e.clientX - r.left) / r.width) * 100,
                  y: ((e.clientY - r.top) / r.height) * 100,
                });
              }}
              onKeyDown={(e) => {
                const delta: Record<string, Point> = {
                  ArrowLeft: { x: -7, y: 0 },
                  ArrowRight: { x: 7, y: 0 },
                  ArrowUp: { x: 0, y: -4 },
                  ArrowDown: { x: 0, y: 4 },
                };
                if (delta[e.key]) {
                  e.preventDefault();
                  moveTo({
                    x: student.x + delta[e.key].x,
                    y: student.y + delta[e.key].y,
                  });
                }
              }}
            />
            {stations.map((s) => (
              <button
                key={s.id}
                type="button"
                disabled={moving}
                className={`wp-hotspot ${recommended[state.step] === s.id && state.step < 5 ? 'is-recommended' : ''}`}
                style={{ left: `${s.x}%`, top: `${s.markerY}%` }}
                onClick={() => visit(s.id)}
                aria-label={`前往${s.name}`}
              >
                <s.icon size={18} />
                <span>{s.name}</span>
                {recommended[state.step] === s.id && state.step < 5 && (
                  <small>当前目标</small>
                )}
              </button>
            ))}
            {destination && (
              <span
                className="wp-destination"
                style={{ left: `${destination.x}%`, top: `${destination.y}%` }}
              >
                <Footprints size={18} />
              </span>
            )}
            <div
              className="wp-actor wp-student"
              style={{
                left: `${student.x}%`,
                top: `${student.y}%`,
                transitionDuration: `${duration}s`,
                zIndex: Math.round(student.y),
              }}
            >
              <span className="wp-shadow" />
              <Technician moving={moving} facing={facing} />
              {state.step >= 2 && !state.placed && (
                <span className="wp-held-part" aria-hidden="true">
                  <i />
                  <i />
                  <i />
                </span>
              )}
              <span className="wp-name">
                你 <small>见习技师</small>
              </span>
            </div>
            <button
              type="button"
              className="wp-actor wp-teacher"
              disabled={moving || teacherMoving}
              style={{
                left: `${teacher.x}%`,
                top: `${teacher.y}%`,
                transitionDuration: `${teacherDuration}s`,
                zIndex: Math.round(teacher.y),
              }}
              onClick={() => {
                const p = walkDestination({
                  x: teacher.x + 7,
                  y: teacher.y + 2,
                });
                const distance = Math.hypot(
                  student.x - teacher.x,
                  student.y - teacher.y,
                );
                if (distance > 14) {
                  moveTo(p);
                  if (travel.current) {
                    clearTimeout(travel.current);
                    const seconds = reduced
                      ? 0.01
                      : Math.max(
                          0.65,
                          Math.hypot(p.x - student.x, p.y - student.y) / 22,
                        );
                    travel.current = setTimeout(() => {
                      setMoving(false);
                      setDestination(null);
                      setDialog('teacher');
                      setNotice('走近陈师傅，开始交谈。');
                    }, seconds * 1000);
                  }
                } else setDialog('teacher');
              }}
              aria-label="走近陈师傅并对话"
            >
              <span className="wp-shadow" />
              <Technician
                teacher
                moving={teacherMoving}
                facing={teacherFacing}
              />
              <span className="wp-name">
                <MessageCircle size={12} />
                陈师傅 <small>指导技师</small>
              </span>
            </button>
            <div className="wp-bag">
              <Hand size={17} />
              <span>
                {state.step >= 2
                  ? state.placed
                    ? '训练器材已归位'
                    : '携带：训练连接件'
                  : '器材袋 · 暂无器材'}
              </span>
            </div>
            <div className="wp-navigation-tip">
              <Footprints size={14} />
              点击前方地面行走 · 点击工位靠近操作
            </div>
          </fieldset>
        </div>
        <nav className="wp-dock" aria-label="快捷前往工位">
          {stations.map((s, index) => (
            <button
              type="button"
              disabled={moving}
              key={s.id}
              className={arrived === s.id ? 'selected' : ''}
              onClick={() => visit(s.id)}
            >
              <span className="wp-dock-number">0{index + 1}</span>
              <s.icon size={19} />
              <span>{s.name}</span>
              <ArrowRight size={15} />
            </button>
          ))}
        </nav>
        <output className="wp-status">
          {moving ? <Footprints size={15} /> : <ShieldCheck size={15} />}
          {notice}
        </output>
        {dialog && (
          <section
            className="wp-dialog"
            ref={dialogRef}
            tabIndex={-1}
            aria-label={`${dialog === 'teacher' ? '陈师傅' : activeStation?.name}对话与操作`}
          >
            <div className="wp-dialog-portrait">
              <Technician teacher />
              <span>陈师傅</span>
            </div>
            <div className="wp-dialog-content">
              <div className="wp-dialog-heading">
                <span>
                  {dialog === 'teacher' ? '指导技师' : activeStation?.name}
                </span>
                <button
                  type="button"
                  aria-label="收起对话"
                  onClick={() => setDialog(null)}
                >
                  <X size={19} />
                </button>
              </div>
              {dialog === 'teacher' && (
                <>
                  <h2>
                    {state.step === 5
                      ? '今天的入职准备，完成了。'
                      : '先熟悉车间，再动手操作。'}
                  </h2>
                  <p>
                    {state.step === 5
                      ? '你已经走过工单台、工具柜、车辆工位和实训台。后续课程再学习具体电路技能。'
                      : '今天先不维修车辆。我带你认识工位：先看电子工单，再领器材。遇到不确定的设备，先问清楚。'}
                  </p>
                  <button
                    type="button"
                    className="wp-primary"
                    onClick={() => {
                      setDialog(null);
                      guideTo(recommended[state.step]);
                      visit(recommended[state.step]);
                    }}
                  >
                    跟陈师傅去
                    {
                      stations.find((s) => s.id === recommended[state.step])
                        ?.name
                    }
                    <ArrowRight size={17} />
                  </button>
                </>
              )}
              {dialog === 'order' && (
                <>
                  <h2>入职工单 · WO-001</h2>
                  <p>
                    领取训练连接件，观察维修工位，再到实训台完成“先看状态、再操作”的入门练习。
                  </p>
                  <div className="wp-task-chips">
                    <span>01 领取器材</span>
                    <span>02 观察工位</span>
                    <span>03 规范归位</span>
                  </div>
                  {state.step === 0 ? (
                    <button
                      type="button"
                      className="wp-primary"
                      onClick={() => nextAction('ACCEPT', 'tools')}
                    >
                      确认工单，开始准备
                      <ArrowRight size={17} />
                    </button>
                  ) : (
                    <span className="wp-confirm">
                      <Check size={17} />
                      工单已领取
                    </span>
                  )}
                </>
              )}
              {dialog === 'tools' && (
                <>
                  <h2>每件工具，都有自己的位置。</h2>
                  <p>
                    {state.step === 0
                      ? '先到右侧工单台确认今天的任务，再领取对应器材。'
                      : '今天只领取无源训练连接件，用来熟悉选择、携带和归位操作。抽屉内的其他工具暂不使用。'}
                  </p>
                  <div
                    className={`wp-tool-card ${state.step >= 2 ? 'taken' : ''}`}
                  >
                    <span className="wp-connector">
                      <i />
                      <i />
                      <i />
                    </span>
                    <div>
                      <strong>训练连接件</strong>
                      <small>入职交互练习 · 不接电源</small>
                    </div>
                    {state.step === 1 ? (
                      <button
                        type="button"
                        className="wp-primary"
                        onClick={() => nextAction('TAKE', 'car')}
                      >
                        领取器材
                        <Hand size={17} />
                      </button>
                    ) : (
                      <span>{state.step >= 2 ? '已领取' : '等待工单'}</span>
                    )}
                  </div>
                </>
              )}
              {dialog === 'car' && (
                <>
                  <h2>先看清工位，不急着修车。</h2>
                  <p>
                    教学车辆停在举升机之间。今天只观察工位，不操作举升机，也不进入车辆下方；是否允许开展维修，由指导技师另行确认。
                  </p>
                  <div className="wp-task-chips">
                    <span>车辆静止</span>
                    <span>举升臂已降下</span>
                    <span>前方通道可通行</span>
                  </div>
                  {state.step === 2 ? (
                    <button
                      type="button"
                      className="wp-primary"
                      onClick={() => nextAction('OBSERVE', 'bench')}
                    >
                      完成观察，去实训台
                      <ArrowRight size={17} />
                    </button>
                  ) : (
                    <p className="wp-muted">
                      {state.step < 2
                        ? '请先按工单领取器材。'
                        : '工位观察已记录。'}
                    </p>
                  )}
                </>
              )}
              {dialog === 'bench' && (
                <>
                  <h2>
                    {state.step === 5
                      ? '器材已归位，准备就绪。'
                      : '操作以前，先看设备状态。'}
                  </h2>
                  <p>
                    {state.placed
                      ? '训练连接件已放入外侧收纳盘，练习台保持关闭。今天先把看工单、看状态和规范归位的习惯练好。'
                      : state.step < 3
                        ? '先完成工单、器材领取与工位观察，再操作实训台。'
                        : state.power
                          ? '台架指示灯还亮着。先关闭这个入门练习台的电源，再把无源连接件放到外侧收纳盘。此操作不涉及打开设备或检修内部。'
                          : '台架电源已关闭。现在把携带的连接件放到外侧收纳盘，完成今天的准备。'}
                  </p>
                  <div className="wp-bench-controls">
                    <span
                      className={`wp-power-light ${state.power ? 'on' : ''}`}
                    />
                    <span>
                      {state.power ? '练习台电源 · 开启' : '练习台电源 · 关闭'}
                    </span>
                    {state.step === 3 && (
                      <button
                        type="button"
                        className="wp-primary"
                        onClick={() => nextAction('POWER_OFF')}
                      >
                        关闭练习台电源
                        <Zap size={16} />
                      </button>
                    )}
                    {state.step === 4 && (
                      <button
                        type="button"
                        className="wp-primary"
                        onClick={() => {
                          nextAction('PLACE');
                          setNotice(
                            '入职体验完成：领取工单、取用器材、观察状态和规范归位。',
                          );
                        }}
                      >
                        把连接件放入收纳盘
                        <Hand size={17} />
                      </button>
                    )}
                    {state.placed && (
                      <span className="wp-confirm">
                        <Check size={18} />
                        归位完成
                      </span>
                    )}
                  </div>
                  {state.step === 5 && (
                    <div className="wp-finish">
                      <ShieldCheck size={24} />
                      <div>
                        <strong>第一天，做得有条理。</strong>
                        <small>本场景为视觉与交互样板，不计入正式成绩。</small>
                      </div>
                      <button type="button" onClick={reset}>
                        再体验一次
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </section>
        )}
        {!dialog && (
          <div className="wp-dialog-placeholder">
            <MessageCircle size={18} />
            <span>走近一个工位，陈师傅会介绍相关操作。</span>
          </div>
        )}
      </main>
      <footer className="wp-footer">
        <span>见习技师入职 / 单场景交互样板</span>
        <span>固定视角 2.5D · 点击移动 · 师徒对话</span>
      </footer>
    </div>
  );
}
