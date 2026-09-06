'use client';

import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import { CircuitTopologyEngine } from '@/src/circuit/CircuitTopologyEngine';
import { CircuitAnalysis } from '@/src/circuit/CircuitTypes';
import { validateLevel02StandardCircuit } from '@/src/circuit/Level02Validator';
import { safetyRuleEngine } from '@/src/safety/SafetyRuleEngine';
import { abilityTracker, Level02AbilityMetrics, AbilityReportData } from '@/src/abilities/AbilityTracker';
import type { GameEvent, EventAction } from '@/src/core/types';
import { playSound } from '@/src/components/visuals/SoundEffects';

export type Level02Stage =
  | 'WORK_ORDER'
  | 'COMPONENT_EXPLORE'
  | 'BUILD_DOUBLE_WIRE_CIRCUIT'
  | 'OPEN_CIRCUIT_EXPERIMENT'
  | 'SWITCH_EXPERIMENT'
  | 'SCHEMATIC_MAPPING'
  | 'CHASSIS_GROUND_CHALLENGE'
  | 'TRANSFER_CHALLENGE'
  | 'REFLECTION'
  | 'COMPLETE';

export interface WireConnection {
  from: string;
  to: string;
}

// The following experiments share a fixed diagram and matching physical circuit.
const standardExperimentWires = (): WireConnection[] => [
  { from: 'BAT_POS', to: 'FUSE_T1' },
  { from: 'FUSE_T2', to: 'SW_T1' },
  { from: 'SW_T2', to: 'LAMP_T1' },
  { from: 'LAMP_T2', to: 'BAT_NEG' },
];

export const REFLECTION_TARGET_SEQUENCE = [
  '蓄电池正极',
  '熔断器',
  '开关',
  '检修灯',
  '车身金属',
  '蓄电池负极',
];

export const INITIAL_REFLECTION_BLOCKS = [
  '检修灯',
  '蓄电池负极',
  '蓄电池正极',
  '车身金属',
  '开关',
  '熔断器',
];

export interface Level02State {
  currentStage: Level02Stage;
  completedObjectives: string[];
  isWorkOrderOpen: boolean;
  workOrderRead: boolean;

  // Component exploration
  exploredComponents: string[];

  // Wiring & Engine
  wires: WireConnection[];
  isPowerOn: boolean;
  isSwitchClosed: boolean;
  isLampLit: boolean;
  showCurrentPath: boolean;

  // Circuit Analysis from CircuitTopologyEngine
  analysis: CircuitAnalysis;

  // Open Circuit Experiment
  disconnectedWireId: string | null;
  openCircuitExplanationSelected: string | null;
  closedCircuitUnlocked: boolean;

  // Switch Experiment
  switchObserved: boolean;

  // Schematic Mapping
  activeHighlightId: string | null;
  mappedComponents: string[];

  // Chassis Ground
  chassisGroundConnected: boolean;
  chassisXrayView: boolean;

  // Transfer Challenge (Shuffled layout)
  transferWires: WireConnection[];
  transferSuccess: boolean;

  // Reflection (6-block complete loop sequence)
  reflectionBlocks: string[];
  reflectionSubmitted: boolean;
  reflectionAttempts: number;
  reflectionError: string | null;

  // Ability Metrics
  metrics: Level02AbilityMetrics;
  abilityReport: AbilityReportData | null;

  // Common UI State
  feedback: string;
  tutorMood: 'NORMAL' | 'PRAISE' | 'WARNING' | 'THINKING';
  tutorMessage: string;
  score: number;
  eventLog: GameEvent[];
}

export type Level02Action =
  | { type: 'OPEN_WORK_ORDER' }
  | { type: 'CLOSE_WORK_ORDER' }
  | { type: 'ACCEPT_WORK_ORDER' }
  | { type: 'EXPLORE_COMPONENT'; componentId: string }
  | { type: 'PROCEED_TO_WIRING' }
  | { type: 'CONNECT_WIRE'; from: string; to: string }
  | { type: 'DISCONNECT_WIRE'; from: string; to: string }
  | { type: 'RESET_WIRING' }
  | { type: 'POWER_ON' }
  | { type: 'POWER_OFF' }
  | { type: 'TOGGLE_SWITCH' }
  | { type: 'TOGGLE_CURRENT_PATH' }
  | { type: 'PROCEED_TO_OPEN_CIRCUIT' }
  | { type: 'DISCONNECT_EXPERIMENTAL_WIRE'; wireIndex: number }
  | { type: 'SELECT_OPEN_CIRCUIT_EXPLANATION'; choice: string }
  | { type: 'PROCEED_TO_SWITCH_EXP' }
  | { type: 'PROCEED_TO_MAPPING' }
  | { type: 'HIGHLIGHT_COMPONENT'; componentId: string | null }
  | { type: 'PROCEED_TO_CHASSIS' }
  | { type: 'CONNECT_CHASSIS_WIRE' }
  | { type: 'TOGGLE_CHASSIS_XRAY' }
  | { type: 'PROCEED_TO_TRANSFER' }
  | { type: 'CONNECT_TRANSFER_WIRE'; from: string; to: string }
  | { type: 'RESET_TRANSFER_WIRING' }
  | { type: 'CHECK_TRANSFER' }
  | { type: 'PROCEED_TO_REFLECTION' }
  | { type: 'MOVE_REFLECTION_BLOCK'; fromIndex: number; toIndex: number }
  | { type: 'SWAP_REFLECTION_BLOCKS'; fromIndex: number; toIndex: number }
  | { type: 'SUBMIT_REFLECTION' }
  | { type: 'RESTART' }
  | { type: 'REQUEST_HINT' };

const engine = new CircuitTopologyEngine();

function evaluateGraph(
  wires: WireConnection[],
  isSwitchClosed: boolean,
  _isPowerOn?: boolean
): CircuitAnalysis {
  engine.clearAllConnections();
  wires.forEach((w) => engine.connect(w.from, w.to));
  engine.setSwitchState(isSwitchClosed ? 'CLOSED' : 'OPEN');
  engine.setFuseState('NORMAL');

  const analysis = engine.analyze();
  return analysis;
}

const initialAnalysis: CircuitAnalysis = {
  closedPaths: [],
  loadPowered: false,
  isSwitchOpen: true,
  isFuseBlown: false,
  hasOpenCircuit: true,
  hasShortCircuitRisk: false,
  missingReturnPath: false,
  directBatteryConnected: false,
  missingFuse: true,
  usesChassisGround: false,
  pathComponents: [],
};

const initialMetrics: Level02AbilityMetrics = {
  hotWiringAttempts: 0,
  shortCircuitAttempts: 0,
  invalidTerminalAttempts: 0,
  openCircuitDiagnosisErrors: 0,
  chassisGroundCompleted: false,
  transferCheckErrors: 0,
  reflectionErrors: 0,
  helpRequests: 0,
};

const initialState: Level02State = {
  currentStage: 'WORK_ORDER',
  completedObjectives: [],
  isWorkOrderOpen: true,
  workOrderRead: false,
  exploredComponents: [],
  wires: [],
  isPowerOn: false,
  isSwitchClosed: false,
  isLampLit: false,
  showCurrentPath: false,
  analysis: initialAnalysis,
  disconnectedWireId: null,
  openCircuitExplanationSelected: null,
  closedCircuitUnlocked: false,
  switchObserved: false,
  activeHighlightId: null,
  mappedComponents: [],
  chassisGroundConnected: false,
  chassisXrayView: false,
  transferWires: [],
  transferSuccess: false,
  reflectionBlocks: [...INITIAL_REFLECTION_BLOCKS],
  reflectionSubmitted: false,
  reflectionAttempts: 0,
  reflectionError: null,
  metrics: initialMetrics,
  abilityReport: null,
  feedback: '',
  tutorMood: 'NORMAL',
  tutorMessage: '陈师傅：“欢迎来到实训台！今天我们动手点亮你的第一盏新能源汽车检修灯。”',
  score: 100,
  eventLog: [],
};

function createEvent(
  state: Level02State,
  action: EventAction,
  payload: Record<string, unknown> = {},
  stage = state.currentStage
): GameEvent {
  return {
    timestamp: new Date().toISOString(),
    sessionId: 'level02-session',
    levelId: 'LEVEL_02',
    stage,
    action,
    payload,
  };
}

export function level02Reducer(state: Level02State, action: Level02Action): Level02State {
  switch (action.type) {
    case 'OPEN_WORK_ORDER':
      playSound('click');
      return {
        ...state,
        isWorkOrderOpen: true,
        eventLog: [...state.eventLog, createEvent(state, 'WORK_ORDER_OPEN')],
      };

    case 'CLOSE_WORK_ORDER':
      playSound('click');
      return {
        ...state,
        isWorkOrderOpen: false,
      };

    case 'ACCEPT_WORK_ORDER':
      playSound('success');
      return {
        ...state,
        isWorkOrderOpen: false,
        workOrderRead: true,
        currentStage: 'COMPONENT_EXPLORE',
        feedback: '工单已确认签署。请点击桌面上的元器件进行入职安全检查。',
        tutorMood: 'PRAISE',
        tutorMessage: '“很好！正式动手前，先逐个认识工作台上的四个核心元件。”',
        completedObjectives: [...new Set([...state.completedObjectives, 'OBJ_SIGN_WORK_ORDER'])],
        eventLog: [...state.eventLog, createEvent(state, 'WORK_ORDER_ACCEPTED')],
      };

    case 'EXPLORE_COMPONENT': {
      playSound('click');
      const updated = [...new Set([...state.exploredComponents, action.componentId])];
      const msgs: Record<string, string> = {
        BAT1: '“给电路提供电能。”',
        L1: '“工作以后把电能转换成光。”',
        S1: '“可以控制线路通断。”',
        F1: '“用于线路保护。”',
      };
      const tutorText = msgs[action.componentId] || '元器件已检查。';
      const allDone = ['BAT1', 'L1', 'S1', 'F1'].every((id) => updated.includes(id));

      return {
        ...state,
        exploredComponents: updated,
        feedback: tutorText,
        tutorMood: 'NORMAL',
        tutorMessage: tutorText,
        completedObjectives: allDone
          ? [...new Set([...state.completedObjectives, 'OBJ_EXPLORE'])]
          : state.completedObjectives,
        eventLog: [...state.eventLog, createEvent(state, 'COMPONENT_EXPLORED', { componentId: action.componentId })],
      };
    }

    case 'PROCEED_TO_WIRING': {
      playSound('click');
      const allDone = ['BAT1', 'L1', 'S1', 'F1'].every((id) =>
        state.exploredComponents.includes(id)
      );
      if (!allDone) {
        return {
          ...state,
          feedback: '请先在工作台上逐个点击4种物料，认识它们的作用后再开始接线。',
          tutorMood: 'WARNING',
          tutorMessage: '“先逐个认识工作台上的四个核心元件，弄清作用后再动手接线。”',
        };
      }
      return {
        ...state,
        currentStage: 'BUILD_DOUBLE_WIRE_CIRCUIT',
        feedback: '请使用导线连接端子，尝试让灯亮起来。',
        tutorMood: 'NORMAL',
        tutorMessage: '放手去接线吧！按照你的直觉，把能够让灯工作的线路接出来。',
        eventLog: [...state.eventLog, createEvent(state, 'STAGE_TRANSITION' as EventAction, { stage: 'BUILD_DOUBLE_WIRE_CIRCUIT' })],
      };
    }

    case 'CONNECT_WIRE': {
      // 1. Validate terminals existence in graph
      const graph = engine.getGraph();
      const fromValid = graph.terminals.has(action.from);
      const toValid = graph.terminals.has(action.to);

      if (!fromValid || !toValid) {
        playSound('zap');
        const decision = safetyRuleEngine.evaluate({
          levelId: 'LEVEL_02',
          stage: state.currentStage,
          operation: 'CONNECT_WIRE',
          terminalValid: false,
        });
        return {
          ...state,
          metrics: {
            ...state.metrics,
            invalidTerminalAttempts: state.metrics.invalidTerminalAttempts + 1,
          },
          feedback: '⚠【非法端子】无法连接未定义的端子！',
          tutorMood: 'WARNING',
          tutorMessage: '“端子定义有误，无法插入导线。请在标准插接端子间连接。”',
          eventLog: [...state.eventLog, createEvent(state, 'INVALID_TERMINAL_ATTEMPT', { from: action.from, to: action.to, ruleId: decision.ruleId })],
        };
      }

      // 2. Reject self-loop
      if (action.from === action.to) {
        return {
          ...state,
          feedback: '同一端子无法自连。',
        };
      }

      // 3. Safety Rule Engine check: Hot wiring
      const hotWireDecision = safetyRuleEngine.evaluate({
        levelId: 'LEVEL_02',
        stage: state.currentStage,
        operation: 'CONNECT_WIRE',
        powerState: state.isPowerOn ? 'ON' : 'OFF',
        terminalValid: true,
      });

      if (!hotWireDecision.allowed) {
        playSound('zap');
        return {
          ...state,
          metrics: {
            ...state.metrics,
            hotWiringAttempts: state.metrics.hotWiringAttempts + 1,
          },
          feedback: '⚠【带电接线违规】通电状态下禁止插拔导线！请先关闭开关或切断电源。',
          tutorMood: 'WARNING',
          tutorMessage: '“先断开电源，再改变线路连接！安全规则贯穿始终。”',
          eventLog: [...state.eventLog, createEvent(state, 'HOT_WIRING_ATTEMPT', { ruleId: hotWireDecision.ruleId })],
        };
      }

      const exists = state.wires.some(
        (w) =>
          (w.from === action.from && w.to === action.to) ||
          (w.from === action.to && w.to === action.from)
      );
      if (exists) return state;

      playSound('click');
      const newWires = [...state.wires, { from: action.from, to: action.to }];
      const analysis = evaluateGraph(newWires, state.isSwitchClosed, state.isPowerOn);
      const isLit = state.isPowerOn && analysis.loadPowered;
      const nextCompleted = new Set(state.completedObjectives);
      if (isLit) {
        nextCompleted.add('OBJ_LAMP_LIT');
        if (!analysis.missingFuse && !analysis.directBatteryConnected) {
          nextCompleted.add('OBJ_STANDARD_CIRCUIT');
        }
      }

      return {
        ...state,
        wires: newWires,
        analysis,
        isLampLit: isLit,
        completedObjectives: [...nextCompleted],
        eventLog: [...state.eventLog, createEvent(state, 'WIRE_CONNECTED', { from: action.from, to: action.to })],
      };
    }

    case 'DISCONNECT_WIRE': {
      const decision = safetyRuleEngine.evaluate({
        levelId: 'LEVEL_02',
        stage: state.currentStage,
        operation: 'DISCONNECT_WIRE',
        powerState: state.isPowerOn ? 'ON' : 'OFF',
      });

      if (!decision.allowed) {
        playSound('zap');
        return {
          ...state,
          metrics: {
            ...state.metrics,
            hotWiringAttempts: state.metrics.hotWiringAttempts + 1,
          },
          feedback: '⚠【带电拔线违规】通电状态下严禁拔掉导线！请先切断电源。',
          tutorMood: 'WARNING',
          tutorMessage: '“先断开电源，再改变线路连接。”',
          eventLog: [...state.eventLog, createEvent(state, 'HOT_WIRING_ATTEMPT', { ruleId: decision.ruleId })],
        };
      }

      playSound('click');
      const newWires = state.wires.filter(
        (w) =>
          !(
            (w.from === action.from && w.to === action.to) ||
            (w.from === action.to && w.to === action.from)
          )
      );
      const analysis = evaluateGraph(newWires, state.isSwitchClosed, state.isPowerOn);

      return {
        ...state,
        wires: newWires,
        analysis,
        isLampLit: false,
        eventLog: [...state.eventLog, createEvent(state, 'WIRE_DISCONNECTED', { from: action.from, to: action.to })],
      };
    }

    case 'RESET_WIRING':
      if (state.isPowerOn) {
        return {
          ...state,
          metrics: {
            ...state.metrics,
            hotWiringAttempts: state.metrics.hotWiringAttempts + 1,
          },
          feedback: '⚠ 请先断开电源再清空导线。',
          tutorMood: 'WARNING',
          tutorMessage: '“先断开电源，再改变线路连接。”',
        };
      }
      playSound('click');
      return {
        ...state,
        wires: [],
        analysis: initialAnalysis,
        isLampLit: false,
        isPowerOn: false,
        showCurrentPath: false,
        eventLog: [...state.eventLog, createEvent(state, 'RESET_WIRING')],
      };

    case 'POWER_ON': {
      // 1. In CHASSIS_GROUND_CHALLENGE stage:
      if (state.currentStage === 'CHASSIS_GROUND_CHALLENGE') {
        if (!state.chassisGroundConnected) {
          return {
            ...state,
            feedback: '尚未连接车身搭铁线，回路未形成。',
            tutorMood: 'NORMAL',
            tutorMessage: '“先把灯负端固定在车身搭铁点上，再合上电源。”',
          };
        }

        playSound('success');
        const updatedMetrics = { ...state.metrics, chassisGroundCompleted: true };
        return {
          ...state,
          isPowerOn: true,
          isLampLit: true,
          showCurrentPath: true,
          metrics: updatedMetrics,
          feedback: '通电成功！车身代替负极导线传导电流，检修灯正常发光！',
          tutorMood: 'PRAISE',
          tutorMessage: '“灯亮了！点击‘查看完整回路’，让车身半透明，看看电流流经哪里！”',
          completedObjectives: [...new Set([...state.completedObjectives, 'OBJ_CHASSIS_GROUND', 'OBJ_LAMP_LIT'])],
          eventLog: [...state.eventLog, createEvent(state, 'POWER_ON', { mode: 'CHASSIS_GROUND' })],
        };
      }

      // 2. In Double Wire Workbench Stage:
      // Pre-evaluate topology to detect short circuits
      const preAnalysis = evaluateGraph(state.wires, state.isSwitchClosed, false);

      const decision = safetyRuleEngine.evaluate({
        levelId: 'LEVEL_02',
        stage: state.currentStage,
        operation: 'POWER_ON',
        powerState: 'OFF',
        hasShortCircuitRisk: preAnalysis.hasShortCircuitRisk,
      });

      if (!decision.allowed) {
        playSound('zap');
        return {
          ...state,
          isPowerOn: false,
          isLampLit: false,
          metrics: {
            ...state.metrics,
            shortCircuitAttempts: state.metrics.shortCircuitAttempts + 1,
          },
          feedback: '⚠【短路危险】检测到电源短路风险！已紧急阻断送电！请排查绕过负载的短接导线。',
          tutorMood: 'WARNING',
          tutorMessage: '“慢着！正负极之间没有经过有效用电负载，直接送电会烧毁熔断器甚至引发线束起火！先断电检查接线。”',
          eventLog: [...state.eventLog, createEvent(state, 'SHORT_CIRCUIT_ATTEMPT', { ruleId: decision.ruleId, consequence: decision.consequence })],
        };
      }

      playSound('e-stop');
      const analysis = evaluateGraph(state.wires, state.isSwitchClosed, true);

      // Situation A: Missing return path
      if (analysis.missingReturnPath) {
        playSound('spray');
        return {
          ...state,
          isPowerOn: true,
          isLampLit: false,
          analysis,
          feedback: '通电后检修灯未亮。电从电源出来了，但没有形成完整通路。',
          tutorMood: 'THINKING',
          tutorMessage: '“电从电源出来以后，还能不能回到电源？”',
          eventLog: [...state.eventLog, createEvent(state, 'POWER_ON', { status: 'MISSING_RETURN_PATH' })],
        };
      }

      // Situation B: Directly connected battery and lamp (No switch)
      if (analysis.directBatteryConnected && analysis.loadPowered) {
        playSound('success');
        return {
          ...state,
          isPowerOn: true,
          isLampLit: true,
          analysis,
          feedback: '灯亮了！但电路中没有控制开关。',
          tutorMood: 'THINKING',
          tutorMessage: '“灯能亮，但是现在怎么把它关掉？”',
          completedObjectives: [...new Set([...state.completedObjectives, 'OBJ_LAMP_LIT'])],
          eventLog: [...state.eventLog, createEvent(state, 'POWER_ON', { status: 'DIRECT_BATTERY_LAMP' })],
        };
      }

      // Situation C: Missing Fuse
      if (analysis.missingFuse && analysis.loadPowered) {
        playSound('success');
        return {
          ...state,
          isPowerOn: true,
          isLampLit: true,
          analysis,
          feedback: '灯已点亮，但供电侧缺少线路保护元件。',
          tutorMood: 'THINKING',
          tutorMessage: '“电路已经能工作了，但如果线路意外短接，谁来保护它？”',
          completedObjectives: [...new Set([...state.completedObjectives, 'OBJ_LAMP_LIT'])],
          eventLog: [...state.eventLog, createEvent(state, 'POWER_ON', { status: 'MISSING_FUSE' })],
        };
      }

      // Standard Complete Circuit (Battery -> Fuse -> Switch -> Lamp -> Battery)
      if (analysis.loadPowered) {
        playSound('success');
        return {
          ...state,
          isPowerOn: true,
          isLampLit: true,
          analysis,
          feedback: '闭合回路形成！检修灯正常发光！',
          tutorMood: 'PRAISE',
          tutorMessage: '“非常漂亮！电源、熔断器、开关、灯和导线构成了一条完整的闭合回路！”',
          completedObjectives: [
            ...new Set([...state.completedObjectives, 'OBJ_LAMP_LIT', 'OBJ_STANDARD_CIRCUIT']),
          ],
          eventLog: [...state.eventLog, createEvent(state, 'POWER_ON', { status: 'STANDARD_CLOSED_CIRCUIT' })],
        };
      }

      // Switch is open
      if (analysis.isSwitchOpen) {
        return {
          ...state,
          isPowerOn: true,
          isLampLit: false,
          analysis,
          feedback: '电源已接通，但开关 S1 目前处于断开位置。',
          tutorMood: 'NORMAL',
          tutorMessage: '“线路已接好，试着闭合开关 S1。”',
          eventLog: [...state.eventLog, createEvent(state, 'POWER_ON', { status: 'SWITCH_OPEN' })],
        };
      }

      return {
        ...state,
        isPowerOn: true,
        isLampLit: false,
        analysis,
        feedback: '通电后灯未亮，请检查线路是否完整连通。',
        tutorMood: 'THINKING',
        tutorMessage: '“仔细观察：从正极出发，能否经过灯泡一路回到负极？”',
        eventLog: [...state.eventLog, createEvent(state, 'POWER_ON', { status: 'OPEN_CIRCUIT' })],
      };
    }

    case 'POWER_OFF':
      playSound('click');
      return {
        ...state,
        isPowerOn: false,
        isLampLit: false,
        showCurrentPath: false,
        feedback: '电源已断开。',
        tutorMood: 'NORMAL',
        tutorMessage: '“断电后可以安全调整线路。”',
        eventLog: [...state.eventLog, createEvent(state, 'POWER_OFF')],
      };

    case 'TOGGLE_SWITCH': {
      playSound('click');
      const nextSw = !state.isSwitchClosed;
      const analysis = evaluateGraph(state.wires, nextSw, state.isPowerOn);
      const isLit = state.isPowerOn && analysis.loadPowered;

      if (isLit) playSound('success');

      const nextCompletedObjectives = new Set([...state.completedObjectives, 'OBJ_SWITCH_CONTROL']);
      if (isLit) {
        nextCompletedObjectives.add('OBJ_LAMP_LIT');
        if (!analysis.missingFuse && !analysis.directBatteryConnected) {
          nextCompletedObjectives.add('OBJ_STANDARD_CIRCUIT');
        }
      }

      return {
        ...state,
        isSwitchClosed: nextSw,
        analysis,
        isLampLit: isLit,
        switchObserved: true,
        feedback: nextSw
          ? isLit
            ? '开关已闭合 (CLOSED)，回路接通，检修灯正常发光！'
            : '开关已闭合，但线路尚不完整。'
          : '开关已断开 (OPEN)，切断回路，灯灭。',
        tutorMood: isLit ? 'PRAISE' : 'NORMAL',
        tutorMessage: nextSw
          ? isLit
            ? '“非常漂亮！闭合开关接通回路，检修灯成功发光！”'
            : '“开关改变了什么？改变了回路是否连通！”'
          : '“开关断开，回路中断，这就是控制通断的原理。”',
        completedObjectives: [...nextCompletedObjectives],
        eventLog: [...state.eventLog, createEvent(state, 'SWITCH_TOGGLED', { closed: nextSw })],
      };
    }

    case 'TOGGLE_CURRENT_PATH': {
      playSound('click');
      const nextShow = !state.showCurrentPath;
      return {
        ...state,
        showCurrentPath: nextShow,
        feedback: nextShow
          ? '约定电流方向：从电源正极流出，经熔断器、开关、灯泡回到负极。'
          : '已关闭电流路径指示。',
        tutorMood: 'NORMAL',
        tutorMessage: '“电路分析中通常把电流方向表示为从电源正极流向负极。”',
        eventLog: [...state.eventLog, createEvent(state, 'CURRENT_PATH_VIEWED' as EventAction)],
      };
    }

    // Transition Guard: Proceed to open circuit requires lamp lit at least once
    case 'PROCEED_TO_OPEN_CIRCUIT': {
      const hasLitLamp = state.isLampLit || state.completedObjectives.includes('OBJ_LAMP_LIT');
      if (!hasLitLamp) {
        return {
          ...state,
          feedback: '请先在实验台上成功接线并点亮一次检修灯，再进行断路排故实验。',
          tutorMood: 'WARNING',
          tutorMessage: '“先按照要求点亮检修灯，再探究断路规律。”',
        };
      }

      playSound('click');
      const currentWires = standardExperimentWires();
      const analysis = evaluateGraph(currentWires, true, true);

      return {
        ...state,
        currentStage: 'OPEN_CIRCUIT_EXPERIMENT',
        wires: currentWires,
        analysis,
        isPowerOn: true,
        isSwitchClosed: true,
        isLampLit: analysis.loadPowered,
        completedObjectives: [...new Set([...state.completedObjectives, 'OBJ_LAMP_LIT'])],
        disconnectedWireId: null,
        openCircuitExplanationSelected: null,
        feedback: '陈师傅：“现在拔掉任意一根导线看看。”',
        tutorMood: 'NORMAL',
        tutorMessage: '“仔细观察：拔掉任何一根导线，灯会发生什么？”',
        eventLog: [...state.eventLog, createEvent(state, 'STAGE_TRANSITION' as EventAction, { stage: 'OPEN_CIRCUIT_EXPERIMENT' })],
      };
    }

    case 'DISCONNECT_EXPERIMENTAL_WIRE': {
      playSound('spray');
      // Real physical disconnection: actually remove the wire from state and graph!
      const targetIdx = action.wireIndex < state.wires.length ? action.wireIndex : Math.max(0, state.wires.length - 1);
      const removedWire = state.wires[targetIdx];
      const remainingWires = state.wires.filter((_, idx) => idx !== targetIdx);

      const analysis = evaluateGraph(remainingWires, state.isSwitchClosed, state.isPowerOn);

      const wireLabel = removedWire ? `${removedWire.from} -> ${removedWire.to}` : `wire-${action.wireIndex}`;

      return {
        ...state,
        wires: remainingWires,
        analysis,
        disconnectedWireId: wireLabel,
        isLampLit: false,
        showCurrentPath: false,
        feedback: '导线已拔开，回路中断，检修灯瞬间熄灭！',
        tutorMood: 'THINKING',
        tutorMessage: '“为什么电源还在，灯却不亮了？”',
        eventLog: [...state.eventLog, createEvent(state, 'OPEN_CIRCUIT_DISCONNECT', { disconnectedWire: wireLabel })],
      };
    }

    case 'SELECT_OPEN_CIRCUIT_EXPLANATION': {
      const correct = action.choice === '回路断开';
      playSound(correct ? 'success' : 'spray');

      const updatedMetrics = {
        ...state.metrics,
        openCircuitDiagnosisErrors: correct
          ? state.metrics.openCircuitDiagnosisErrors
          : state.metrics.openCircuitDiagnosisErrors + 1,
      };

      return {
        ...state,
        metrics: updatedMetrics,
        openCircuitExplanationSelected: action.choice,
        closedCircuitUnlocked: correct,
        feedback: correct
          ? '【知识解锁：闭合回路】电路只有形成完整的闭合路径，负载才可能正常工作！'
          : '再仔细想想：电池电量依然充足，灯泡本身也没损坏，究竟哪改变了？',
        tutorMood: correct ? 'PRAISE' : 'THINKING',
        tutorMessage: correct
          ? '“对！不是电池没电，也不是灯坏了，而是回路断开了！记住：现象先于术语。”'
          : '“电源还在，灯也是好的。断开的是电荷回流的路径。”',
        completedObjectives: correct
          ? [...new Set([...state.completedObjectives, 'OBJ_CLOSED_CIRCUIT_CONCEPT'])]
          : state.completedObjectives,
        eventLog: [...state.eventLog, createEvent(state, 'OPEN_CIRCUIT_DIAGNOSED', { choice: action.choice, correct })],
      };
    }

    // Transition Guard: Proceed to switch experiment requires closedCircuitUnlocked
    case 'PROCEED_TO_SWITCH_EXP': {
      if (!state.closedCircuitUnlocked) {
        return {
          ...state,
          feedback: '请先完成断路原因分析并解锁闭合回路概念。',
          tutorMood: 'WARNING',
        };
      }
      playSound('click');
      const wires = standardExperimentWires();
      const analysis = evaluateGraph(wires, true, true);
      return {
        ...state,
        currentStage: 'SWITCH_EXPERIMENT',
        wires,
        analysis,
        disconnectedWireId: null,
        isPowerOn: true,
        isSwitchClosed: true,
        isLampLit: analysis.loadPowered,
        feedback: '已恢复标准闭合回路。操作开关体验通断控制，点击元件认识标准电路图符号。',
        tutorMood: 'NORMAL',
        tutorMessage: '“操作开关 S1，仔细看右边电路图上的刀闸联动；点击元件建立实物与符号对应。”',
        eventLog: [...state.eventLog, createEvent(state, 'STAGE_TRANSITION' as EventAction, { stage: 'SWITCH_EXPERIMENT' })],
      };
    }

    // Transition Guard: Proceed to mapping requires switch observed
    case 'PROCEED_TO_MAPPING': {
      if (!state.switchObserved) {
        return {
          ...state,
          feedback: '请先在开关实验中操作并观察开关控制效果。',
          tutorMood: 'WARNING',
        };
      }
      playSound('click');
      return {
        ...state,
        currentStage: 'SCHEMATIC_MAPPING',
        activeHighlightId: null,
        feedback: '点击左侧实物或右侧电路图符号，观察两者双向高亮对应。',
        tutorMood: 'NORMAL',
        tutorMessage: '“点击实物里的灯，看看原理图上哪亮了；点击开关，看看对应的电气符号。”',
        eventLog: [...state.eventLog, createEvent(state, 'STAGE_TRANSITION' as EventAction, { stage: 'SCHEMATIC_MAPPING' })],
      };
    }

    case 'HIGHLIGHT_COMPONENT': {
      playSound('click');
      const updatedMapped = action.componentId
        ? [...new Set([...state.mappedComponents, action.componentId])]
        : state.mappedComponents;
      return {
        ...state,
        activeHighlightId: action.componentId,
        mappedComponents: updatedMapped,
        eventLog: [...state.eventLog, createEvent(state, 'COMPONENT_EXPLORED', { highlightId: action.componentId })],
      };
    }

    // Transition Guard: Proceed to chassis requires closedCircuitUnlocked & switchObserved
    case 'PROCEED_TO_CHASSIS': {
      if (!state.closedCircuitUnlocked || !state.switchObserved) {
        return {
          ...state,
          feedback: '请先操作开关 S1 观察通断效果，再进入实车搭铁挑战。',
          tutorMood: 'WARNING',
          tutorMessage: '“先操作一次开关 S1 体验通断控制，并认识右侧电路图符号。”',
        };
      }
      playSound('click');
      return {
        ...state,
        currentStage: 'CHASSIS_GROUND_CHALLENGE',
        chassisGroundConnected: false,
        chassisXrayView: false,
        isPowerOn: false,
        isLampLit: false,
        feedback: '场景已切换到蓝色教学展车前部！陈师傅提出挑战：减少一根回路线！',
        tutorMood: 'NORMAL',
        tutorMessage: '“汽车里如果每一个灯都拉两根长导线回电池，整辆车会被线束塞满。试着把灯负端接在车身上！”',
        eventLog: [...state.eventLog, createEvent(state, 'STAGE_TRANSITION' as EventAction, { stage: 'CHASSIS_GROUND_CHALLENGE' })],
      };
    }

    case 'CONNECT_CHASSIS_WIRE': {
      // Safety Rule Engine check: cannot connect chassis while powered
      const decision = safetyRuleEngine.evaluate({
        levelId: 'LEVEL_02',
        stage: state.currentStage,
        operation: 'CONNECT_CHASSIS',
        powerState: state.isPowerOn ? 'ON' : 'OFF',
      });

      if (!decision.allowed) {
        playSound('zap');
        return {
          ...state,
          metrics: {
            ...state.metrics,
            hotWiringAttempts: state.metrics.hotWiringAttempts + 1,
          },
          feedback: '⚠【带电作业违规】通电状态下禁止操作车身搭铁！请先切断电源。',
          tutorMood: 'WARNING',
          eventLog: [...state.eventLog, createEvent(state, 'HOT_WIRING_ATTEMPT', { ruleId: decision.ruleId })],
        };
      }

      playSound('click');
      // Connect chassis wire: keep power OFF until explicitly powered on!
      return {
        ...state,
        chassisGroundConnected: true,
        isPowerOn: false,
        isLampLit: false,
        showCurrentPath: false,
        feedback: '车身搭铁线已连接！车身代替负极导线。现在请闭合电源总开关进行通电测试。',
        tutorMood: 'NORMAL',
        tutorMessage: '“搭铁线接好了。记住规范：接好线之后，再合上电源开关进行通电测试！”',
        eventLog: [...state.eventLog, createEvent(state, 'CHASSIS_GROUND_CONNECTED')],
      };
    }

    case 'TOGGLE_CHASSIS_XRAY':
      playSound('click');
      return {
        ...state,
        chassisXrayView: !state.chassisXrayView,
        tutorMood: 'NORMAL',
        tutorMessage: '“车身不是电流的终点，它代替了回流导线，把电流送回蓄电池负极！”',
        eventLog: [...state.eventLog, createEvent(state, 'CURRENT_PATH_VIEWED' as EventAction, { view: 'CHASSIS_XRAY' })],
      };

    // Transition Guard: Proceed to transfer requires chassis ground completed
    case 'PROCEED_TO_TRANSFER': {
      if (!state.chassisGroundConnected || !state.completedObjectives.includes('OBJ_CHASSIS_GROUND')) {
        return {
          ...state,
          feedback: '请先完成实车搭铁挑战并成功通电点亮检修灯。',
          tutorMood: 'WARNING',
        };
      }
      playSound('click');
      return {
        ...state,
        currentStage: 'TRANSFER_CHALLENGE',
        transferWires: [],
        transferSuccess: false,
        feedback: '空间拓扑混淆挑战：元件位置已全部打乱！请根据原理图正确接线。',
        tutorMood: 'NORMAL',
        tutorMessage: '“现在元件全换了位置。不看顺序提示，按照电气连接关系接亮检修灯！”',
        eventLog: [...state.eventLog, createEvent(state, 'STAGE_TRANSITION' as EventAction, { stage: 'TRANSFER_CHALLENGE' })],
      };
    }

    case 'CONNECT_TRANSFER_WIRE': {
      if (action.from === action.to) return state;
      const exists = state.transferWires.some(
        (w) =>
          (w.from === action.from && w.to === action.to) ||
          (w.from === action.to && w.to === action.from)
      );
      if (exists) return state;

      playSound('click');
      const newWires = [...state.transferWires, { from: action.from, to: action.to }];

      return {
        ...state,
        transferWires: newWires,
        transferSuccess: false,
        eventLog: [...state.eventLog, createEvent(state, 'TRANSFER_WIRE_CONNECTED', { from: action.from, to: action.to })],
      };
    }

    case 'RESET_TRANSFER_WIRING':
      playSound('click');
      return {
        ...state,
        transferWires: [],
        transferSuccess: false,
        eventLog: [...state.eventLog, createEvent(state, 'RESET_WIRING', { stage: 'TRANSFER' })],
      };

    case 'CHECK_TRANSFER': {
      const analysis = evaluateGraph(state.transferWires, true, true);
      const validation = validateLevel02StandardCircuit(analysis, engine.getGraph());

      if (!validation.valid) {
        playSound('spray');
        const updatedMetrics = {
          ...state.metrics,
          transferCheckErrors: state.metrics.transferCheckErrors + 1,
        };
        return {
          ...state,
          metrics: updatedMetrics,
          transferSuccess: false,
          feedback: validation.message,
          tutorMood: 'THINKING',
          tutorMessage: `“${validation.message}”`,
          eventLog: [...state.eventLog, createEvent(state, 'TRANSFER_CHECK_FAIL', { reason: validation.message })],
        };
      }

      playSound('success');
      return {
        ...state,
        transferSuccess: true,
        feedback: '恭喜！不论元件摆在何处，你都能依据电气拓扑关系正确接通回路！',
        tutorMood: 'PRAISE',
        tutorMessage: '“太棒了！你没有死记‘从左拖到右’，而是真正掌握了电路的拓扑本质！”',
        completedObjectives: [...new Set([...state.completedObjectives, 'OBJ_TRANSFER_PASSED'])],
        eventLog: [...state.eventLog, createEvent(state, 'TRANSFER_CHALLENGE_SUCCESS')],
      };
    }

    // Transition Guard: Proceed to reflection requires transfer challenge passed
    case 'PROCEED_TO_REFLECTION': {
      if (!state.transferSuccess) {
        return {
          ...state,
          feedback: '请先完成空间拓扑混淆测试并通电验证通过。',
          tutorMood: 'WARNING',
        };
      }
      playSound('click');
      return {
        ...state,
        currentStage: 'REFLECTION',
        feedback: '陈师傅发问：“为什么车身搭铁后，只用一根供电线，灯仍然能亮？”',
        tutorMood: 'THINKING',
        tutorMessage: '“为什么车身搭铁后，只用一根供电线，灯仍然能亮？”',
        eventLog: [...state.eventLog, createEvent(state, 'STAGE_TRANSITION' as EventAction, { stage: 'REFLECTION' })],
      };
    }

    case 'MOVE_REFLECTION_BLOCK': {
      const updated = [...state.reflectionBlocks];
      const [removed] = updated.splice(action.fromIndex, 1);
      updated.splice(action.toIndex, 0, removed);
      return {
        ...state,
        reflectionBlocks: updated,
        reflectionError: null,
      };
    }

    case 'SWAP_REFLECTION_BLOCKS': {
      const updated = [...state.reflectionBlocks];
      const temp = updated[action.fromIndex];
      updated[action.fromIndex] = updated[action.toIndex];
      updated[action.toIndex] = temp;
      return {
        ...state,
        reflectionBlocks: updated,
        reflectionError: null,
      };
    }

    case 'SUBMIT_REFLECTION': {
      // Exact strict comparison of all 6 blocks!
      // Must be: 蓄电池正极 -> 熔断器 -> 开关 -> 检修灯 -> 车身金属 -> 蓄电池负极
      const isCorrect =
        state.reflectionBlocks.length === 6 &&
        REFLECTION_TARGET_SEQUENCE.every((block, idx) => state.reflectionBlocks[idx] === block);

      if (!isCorrect) {
        playSound('spray');
        const mismatchIdx = state.reflectionBlocks.findIndex(
          (b, idx) => b !== REFLECTION_TARGET_SEQUENCE[idx]
        );
        const updatedAttempts = state.reflectionAttempts + 1;
        const updatedMetrics = {
          ...state.metrics,
          reflectionErrors: state.metrics.reflectionErrors + 1,
        };

        const errorMsg = `排序未完全正确（第 ${mismatchIdx + 1} 项顺序有误）。请思考从蓄电池正极出发，先经过保护元件（熔断器），再经控制元件（开关），经过用电负载（检修灯），再经车身金属搭铁回流至蓄电池负极。`;

        return {
          ...state,
          metrics: updatedMetrics,
          reflectionAttempts: updatedAttempts,
          reflectionSubmitted: false,
          reflectionError: errorMsg,
          currentStage: 'REFLECTION',
          feedback: `排序未完全正确（已尝试 ${updatedAttempts} 次）。`,
          tutorMood: 'THINKING',
          tutorMessage: '“仔细理清电流流动顺序：从正极出发，先保护，再控制，经负载，最后通过车身搭铁回到负极。”',
          eventLog: [...state.eventLog, createEvent(state, 'REFLECTION_SUBMIT', { success: false, attempts: updatedAttempts })],
        };
      }

      playSound('success');
      const report = abilityTracker.generateLevel02(state.metrics);

      return {
        ...state,
        reflectionSubmitted: true,
        reflectionError: null,
        currentStage: 'COMPLETE',
        abilityReport: report,
        feedback: '【专业总结】车身作为回流路径，使电路仍然形成完整闭合回路！能力评测报告已生成。',
        tutorMood: 'PRAISE',
        tutorMessage: '“对！车身把电送回了电池。车身作为回流路径，使电路仍然形成完整闭合回路。”',
        completedObjectives: [...new Set([...state.completedObjectives, 'OBJ_REFLECTION_COMPLETE'])],
        eventLog: [...state.eventLog, createEvent(state, 'REFLECTION_SUBMIT', { success: true, attempts: state.reflectionAttempts + 1 })],
      };
    }

    case 'REQUEST_HINT': {
      playSound('click');
      const updatedMetrics = {
        ...state.metrics,
        helpRequests: state.metrics.helpRequests + 1,
      };
      const hints: Record<Level02Stage, string> = {
        WORK_ORDER: '请点击下方“签署工单”按钮。',
        COMPONENT_EXPLORE: '点击蓄电池、熔断器、开关、灯泡，听听陈师傅的一句话介绍。',
        BUILD_DOUBLE_WIRE_CIRCUIT: '从电池正极接熔断器，熔断器接开关，开关接灯泡，灯泡接回负极，然后闭合开关通电！',
        OPEN_CIRCUIT_EXPERIMENT: '点击断开任意一根导线，观察灯泡变化，并选择原因。',
        SWITCH_EXPERIMENT: '反复操作开关，观察右侧电路图开关符号的开闭联动。',
        SCHEMATIC_MAPPING: '点击实物中的灯或开关，观察原理图上的对应符号高亮。',
        CHASSIS_GROUND_CHALLENGE: '点击将灯负极连接到车身搭铁螺栓，然后闭合总开关通电。',
        TRANSFER_CHALLENGE: '不要管元件在哪里，按照电路图的逻辑关系完成连线：BAT+ → F1 → S1 → L1 → BAT-。',
        REFLECTION: '将概念块按电流路径排序：正极 → 熔断器 → 开关 → 检修灯 → 车身金属 → 负极。',
        COMPLETE: '任务已顺利完成，点击返回任务大厅。',
      };
      return {
        ...state,
        metrics: updatedMetrics,
        feedback: hints[state.currentStage],
        tutorMood: 'THINKING',
        tutorMessage: `“${hints[state.currentStage]}”`,
        eventLog: [...state.eventLog, createEvent(state, 'HELP_REQUESTED' as EventAction, { stage: state.currentStage })],
      };
    }

    case 'RESTART':
      playSound('click');
      return { ...initialState, isWorkOrderOpen: false, workOrderRead: true };

    default:
      return state;
  }
}

interface Level02ContextType {
  state: Level02State;
  dispatch: React.Dispatch<Level02Action>;
}

const Level02Context = createContext<Level02ContextType | null>(null);

export function Level02StoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(level02Reducer, initialState);
  return (
    <Level02Context.Provider value={{ state, dispatch }}>
      {children}
    </Level02Context.Provider>
  );
}

export function useLevel02Store(): Level02ContextType {
  const ctx = useContext(Level02Context);
  if (!ctx) {
    throw new Error('useLevel02Store must be used within Level02StoreProvider');
  }
  return ctx;
}
