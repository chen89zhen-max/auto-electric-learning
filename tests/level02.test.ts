import { describe, expect, it } from 'vitest';
import {
  level02Reducer,
  Level02State,
  REFLECTION_TARGET_SEQUENCE,
} from '@/src/stores/level02Store';
import {
  markLevelComplete,
  resetUserProgress,
} from '@/src/stores/userProgressStore';

function createInitialState(): Level02State {
  let state = level02Reducer(undefined as unknown as Level02State, { type: 'RESTART' });
  state = level02Reducer(state, { type: 'ACCEPT_WORK_ORDER' });
  state = level02Reducer(state, { type: 'EXPLORE_COMPONENT', componentId: 'BAT1' });
  state = level02Reducer(state, { type: 'EXPLORE_COMPONENT', componentId: 'F1' });
  state = level02Reducer(state, { type: 'EXPLORE_COMPONENT', componentId: 'S1' });
  state = level02Reducer(state, { type: 'EXPLORE_COMPONENT', componentId: 'L1' });
  return state;
}

function createPoweredLampState(): Level02State {
  let state = createInitialState();
  state = level02Reducer(state, { type: 'PROCEED_TO_WIRING' });
  state = level02Reducer(state, { type: 'CONNECT_WIRE', from: 'BAT_POS', to: 'FUSE_T1' });
  state = level02Reducer(state, { type: 'CONNECT_WIRE', from: 'FUSE_T2', to: 'SW_T1' });
  state = level02Reducer(state, { type: 'CONNECT_WIRE', from: 'SW_T2', to: 'LAMP_T1' });
  state = level02Reducer(state, { type: 'CONNECT_WIRE', from: 'LAMP_T2', to: 'BAT_NEG' });
  state = level02Reducer(state, { type: 'TOGGLE_SWITCH' });
  state = level02Reducer(state, { type: 'POWER_ON' });
  return state;
}

describe('Sprint 2: 《点亮第一盏检修灯》 综合修正任务书 29 项全量自动化测试', () => {
  it('断路实验后进入开关实验应恢复实际回路，反复开合都能正确亮灭', () => {
    let state = createPoweredLampState();
    state = level02Reducer(state, { type: 'PROCEED_TO_OPEN_CIRCUIT' });
    state = level02Reducer(state, { type: 'DISCONNECT_EXPERIMENTAL_WIRE', wireIndex: 1 });
    expect(state.isLampLit).toBe(false);
    state = level02Reducer(state, { type: 'SELECT_OPEN_CIRCUIT_EXPLANATION', choice: '回路断开' });
    state = level02Reducer(state, { type: 'PROCEED_TO_SWITCH_EXP' });
    for (let i = 0; i < 3; i++) {
      state = level02Reducer(state, { type: 'TOGGLE_SWITCH' });
      expect(state.isLampLit).toBe(false);
      state = level02Reducer(state, { type: 'TOGGLE_SWITCH' });
      expect(state.isLampLit).toBe(true);
      expect(state.analysis.loadPowered).toBe(true);
    }
  });
  // 1. 初始状态为工单，当前活动关卡未受污染
  it('1. initialStateIsWorkOrder: 初始状态为工单', () => {
    const state = level02Reducer(undefined as unknown as Level02State, { type: 'RESTART' });
    expect(state.currentStage).toBe('WORK_ORDER');
    expect(state.isWorkOrderOpen).toBe(false);
  });

  // 2. 正负极直连，点击通电被阻断，状态仍为断电，记录短路尝试
  it('2. powerOnBlocksDirectShortCircuit: 正负极直连送电被阻断', () => {
    let state = createInitialState();
    state = level02Reducer(state, { type: 'PROCEED_TO_WIRING' });
    state = level02Reducer(state, { type: 'CONNECT_WIRE', from: 'BAT_POS', to: 'BAT_NEG' });
    expect(state.wires.length).toBe(1);

    state = level02Reducer(state, { type: 'POWER_ON' });
    expect(state.isPowerOn).toBe(false);
    expect(state.isLampLit).toBe(false);
    expect(state.feedback).toContain('短路危险');
    expect(state.tutorMood).toBe('WARNING');
    expect(state.metrics.shortCircuitAttempts).toBe(1);
    expect(state.eventLog.some((e) => e.action === 'SHORT_CIRCUIT_ATTEMPT')).toBe(true);
  });

  // 3. 多段短路：BAT+ -> F1 -> SW1 -> BAT-，点击通电被阻断
  it('3. powerOnBlocksMultiSegmentShortCircuit: 多段跳线短路送电被阻断', () => {
    let state = createInitialState();
    state = level02Reducer(state, { type: 'PROCEED_TO_WIRING' });
    state = level02Reducer(state, { type: 'CONNECT_WIRE', from: 'BAT_POS', to: 'FUSE_T1' });
    state = level02Reducer(state, { type: 'CONNECT_WIRE', from: 'FUSE_T2', to: 'SW_T1' });
    state = level02Reducer(state, { type: 'CONNECT_WIRE', from: 'SW_T2', to: 'BAT_NEG' });
    state = level02Reducer(state, { type: 'TOGGLE_SWITCH' }); // closed

    state = level02Reducer(state, { type: 'POWER_ON' });
    expect(state.isPowerOn).toBe(false);
    expect(state.isLampLit).toBe(false);
    expect(state.feedback).toContain('短路危险');
    expect(state.metrics.shortCircuitAttempts).toBe(1);
  });

  // 4. 负载旁路短路：BAT+ -> L1 -> BAT-，同时有一根线并联在 L1 两端
  it('4. powerOnBlocksLoadBypassShortCircuit: 负载旁路并联短接被阻断', () => {
    let state = createInitialState();
    state = level02Reducer(state, { type: 'PROCEED_TO_WIRING' });
    state = level02Reducer(state, { type: 'CONNECT_WIRE', from: 'BAT_POS', to: 'LAMP_T1' });
    state = level02Reducer(state, { type: 'CONNECT_WIRE', from: 'LAMP_T2', to: 'BAT_NEG' });
    state = level02Reducer(state, { type: 'CONNECT_WIRE', from: 'LAMP_T1', to: 'LAMP_T2' }); // bypass

    state = level02Reducer(state, { type: 'POWER_ON' });
    expect(state.isPowerOn).toBe(false);
    expect(state.isLampLit).toBe(false);
    expect(state.feedback).toContain('短路危险');
  });

  // 5. 尝试连接不存在的端子，被安全/拓扑层拦截
  it('5. rejectsInvalidTerminals: 尝试连接未定义端子被拦截', () => {
    let state = createInitialState();
    state = level02Reducer(state, { type: 'PROCEED_TO_WIRING' });
    state = level02Reducer(state, { type: 'CONNECT_WIRE', from: 'NON_EXISTENT', to: 'BAT_POS' });

    expect(state.feedback).toContain('非法端子');
    expect(state.wires.length).toBe(0);
    expect(state.metrics.invalidTerminalAttempts).toBe(1);
  });

  // 6. 同端子自环被拦截
  it('6. preventsSelfLoopConnections: 同端子自环被拦截', () => {
    let state = createInitialState();
    state = level02Reducer(state, { type: 'PROCEED_TO_WIRING' });
    state = level02Reducer(state, { type: 'CONNECT_WIRE', from: 'BAT_POS', to: 'BAT_POS' });

    expect(state.feedback).toContain('同一端子无法自连');
    expect(state.wires.length).toBe(0);
  });

  // 7. 通电状态下尝试接线或拆线被安全引擎拦截
  it('7. blocksHotWiring: 通电状态下尝试插拔导线被拦截', () => {
    let state = createPoweredLampState();
    expect(state.isPowerOn).toBe(true);

    // Try connecting while power on
    state = level02Reducer(state, { type: 'CONNECT_WIRE', from: 'BAT_POS', to: 'SW_T1' });
    expect(state.feedback).toContain('带电接线违规');
    expect(state.metrics.hotWiringAttempts).toBe(1);

    // Try disconnecting while power on
    state = level02Reducer(state, { type: 'DISCONNECT_WIRE', from: 'BAT_POS', to: 'FUSE_T1' });
    expect(state.feedback).toContain('带电拔线违规');
    expect(state.metrics.hotWiringAttempts).toBe(2);
  });

  // 8. 断电状态下接线正常添加
  it('8. allowsSafeWiringWhenPoweredOff: 断电状态下安全接线', () => {
    let state = createInitialState();
    state = level02Reducer(state, { type: 'PROCEED_TO_WIRING' });
    state = level02Reducer(state, { type: 'CONNECT_WIRE', from: 'BAT_POS', to: 'FUSE_T1' });

    expect(state.wires.length).toBe(1);
    expect(state.wires[0]).toEqual({ from: 'BAT_POS', to: 'FUSE_T1' });
  });

  // 9. 正极-灯-负极直连，通电点亮并提示“怎么关掉”
  it('9. directBatteryLampPromptsSwitch: 电池灯泡直连点亮并提示缺少开关', () => {
    let state = createInitialState();
    state = level02Reducer(state, { type: 'PROCEED_TO_WIRING' });
    state = level02Reducer(state, { type: 'CONNECT_WIRE', from: 'BAT_POS', to: 'LAMP_T1' });
    state = level02Reducer(state, { type: 'CONNECT_WIRE', from: 'LAMP_T2', to: 'BAT_NEG' });
    state = level02Reducer(state, { type: 'POWER_ON' });

    expect(state.isLampLit).toBe(true);
    expect(state.tutorMessage).toContain('灯能亮，但是现在怎么把它关掉');
  });

  // 10. 电池-开关-灯回路点亮但提示缺少保护元件
  it('10. missingFusePromptsProtection: 缺少熔断器点亮但提示保护问题', () => {
    let state = createInitialState();
    state = level02Reducer(state, { type: 'PROCEED_TO_WIRING' });
    state = level02Reducer(state, { type: 'CONNECT_WIRE', from: 'BAT_POS', to: 'SW_T1' });
    state = level02Reducer(state, { type: 'CONNECT_WIRE', from: 'SW_T2', to: 'LAMP_T1' });
    state = level02Reducer(state, { type: 'CONNECT_WIRE', from: 'LAMP_T2', to: 'BAT_NEG' });
    state = level02Reducer(state, { type: 'TOGGLE_SWITCH' }); // closed
    state = level02Reducer(state, { type: 'POWER_ON' });

    expect(state.isLampLit).toBe(true);
    expect(state.tutorMessage).toContain('谁来保护它');
  });

  // 11. 电池-熔断器-开关-灯-电池完整回路通电点亮，达成标准回路目标
  it('11. standardCircuitPowersLamp: 标准闭合回路正常点亮', () => {
    const state = createPoweredLampState();
    expect(state.isLampLit).toBe(true);
    expect(state.completedObjectives).toContain('OBJ_STANDARD_CIRCUIT');
    expect(state.tutorMood).toBe('PRAISE');
  });

  // 12. 开关切换同步改变回路导通状态与灯泡亮灭
  it('12. switchToggleControlsCircuit: 操作开关控制通断', () => {
    let state = createPoweredLampState();
    expect(state.isLampLit).toBe(true);

    state = level02Reducer(state, { type: 'TOGGLE_SWITCH' });
    expect(state.isSwitchClosed).toBe(false);
    expect(state.isLampLit).toBe(false);

    state = level02Reducer(state, { type: 'TOGGLE_SWITCH' });
    expect(state.isSwitchClosed).toBe(true);
    expect(state.isLampLit).toBe(true);
  });

  // 13. 未点亮过检修灯时，禁止进入断路实验阶段
  it('13. openCircuitRequiresPrerequisite: 未点亮过灯禁止进入断路实验', () => {
    let state = createInitialState();
    state = level02Reducer(state, { type: 'PROCEED_TO_OPEN_CIRCUIT' });
    expect(state.currentStage).toBe('COMPONENT_EXPLORE');
    expect(state.feedback).toContain('请先在实验台上成功接线');
  });

  // 13b. 先点击通电测试、再闭合开关S1（学生自然操作顺序），灯亮且成功记录OBJ_LAMP_LIT并可顺利进入第二阶段断路实验
  it('13b. powerOnThenToggleSwitchAllowsProceed: 先通电再合闸可正常推进阶段', () => {
    let state = createInitialState();
    state = level02Reducer(state, { type: 'PROCEED_TO_WIRING' });
    state = level02Reducer(state, { type: 'CONNECT_WIRE', from: 'BAT_POS', to: 'FUSE_T1' });
    state = level02Reducer(state, { type: 'CONNECT_WIRE', from: 'FUSE_T2', to: 'SW_T1' });
    state = level02Reducer(state, { type: 'CONNECT_WIRE', from: 'SW_T2', to: 'LAMP_T1' });
    state = level02Reducer(state, { type: 'CONNECT_WIRE', from: 'LAMP_T2', to: 'BAT_NEG' });

    // Step 1: User clicks "通电测试" while switch is open
    state = level02Reducer(state, { type: 'POWER_ON' });
    expect(state.isPowerOn).toBe(true);
    expect(state.isSwitchClosed).toBe(false);
    expect(state.isLampLit).toBe(false);

    // Step 2: User clicks "闭合开关 S1"
    state = level02Reducer(state, { type: 'TOGGLE_SWITCH' });
    expect(state.isSwitchClosed).toBe(true);
    expect(state.isLampLit).toBe(true);
    expect(state.completedObjectives).toContain('OBJ_LAMP_LIT');
    expect(state.completedObjectives).toContain('OBJ_STANDARD_CIRCUIT');

    // Step 3: User clicks "进入第二阶段：断路探究"
    state = level02Reducer(state, { type: 'PROCEED_TO_OPEN_CIRCUIT' });
    expect(state.currentStage).toBe('OPEN_CIRCUIT_EXPERIMENT');
    expect(state.isLampLit).toBe(true);
  });

  // 14. 断路实验点击拔线真正从拓扑/状态移除导线，灯熄灭，记录断口
  it('14. openCircuitActuallyRemovesWire: 断路实验真实移除导线', () => {
    let state = createPoweredLampState();
    state = level02Reducer(state, { type: 'PROCEED_TO_OPEN_CIRCUIT' });
    expect(state.currentStage).toBe('OPEN_CIRCUIT_EXPERIMENT');
    expect(state.isLampLit).toBe(true);

    const initialWiresCount = state.wires.length;
    state = level02Reducer(state, { type: 'DISCONNECT_EXPERIMENTAL_WIRE', wireIndex: 1 });

    expect(state.wires.length).toBe(initialWiresCount - 1);
    expect(state.isLampLit).toBe(false);
    expect(state.disconnectedWireId).not.toBeNull();
    expect(state.eventLog.some((e) => e.action === 'OPEN_CIRCUIT_DISCONNECT')).toBe(true);
  });

  // 15. 选错原因给出启发反馈并记入错误，选对解锁闭合回路概念
  it('15. openCircuitDiagnosisFeedback: 断路诊断选择与反馈', () => {
    let state = createPoweredLampState();
    state = level02Reducer(state, { type: 'PROCEED_TO_OPEN_CIRCUIT' });
    state = level02Reducer(state, { type: 'DISCONNECT_EXPERIMENTAL_WIRE', wireIndex: 1 });

    // Wrong choice
    state = level02Reducer(state, { type: 'SELECT_OPEN_CIRCUIT_EXPLANATION', choice: '没有电源了' });
    expect(state.closedCircuitUnlocked).toBe(false);
    expect(state.metrics.openCircuitDiagnosisErrors).toBe(1);

    // Correct choice
    state = level02Reducer(state, { type: 'SELECT_OPEN_CIRCUIT_EXPLANATION', choice: '回路断开' });
    expect(state.closedCircuitUnlocked).toBe(true);
    expect(state.completedObjectives).toContain('OBJ_CLOSED_CIRCUIT_CONCEPT');
  });

  // 16. 未解锁闭合回路概念禁止进入开关实验
  it('16. switchExperimentRequiresPrerequisite: 前置条件校验进入开关实验', () => {
    let state = createInitialState();
    state = level02Reducer(state, { type: 'PROCEED_TO_SWITCH_EXP' });
    expect(state.currentStage).toBe('COMPONENT_EXPLORE');

    // Unlock and proceed
    state = { ...state, closedCircuitUnlocked: true };
    state = level02Reducer(state, { type: 'PROCEED_TO_SWITCH_EXP' });
    expect(state.currentStage).toBe('SWITCH_EXPERIMENT');
  });

  // 17. 实物/原理图端子映射双向高亮
  it('17. schematicMappingHighlights: 原理图与实物映射高亮', () => {
    let state = createInitialState();
    state = { ...state, closedCircuitUnlocked: true, switchObserved: true };
    state = level02Reducer(state, { type: 'PROCEED_TO_MAPPING' });
    expect(state.currentStage).toBe('SCHEMATIC_MAPPING');

    state = level02Reducer(state, { type: 'HIGHLIGHT_COMPONENT', componentId: 'L1' });
    expect(state.activeHighlightId).toBe('L1');
    expect(state.mappedComponents).toContain('L1');
  });

  // 17b. 统一实训步骤 4：开关控制与原理图双向映射融合完成，可直接推进至搭铁挑战
  it('17b. unifiedStep4AllowsDirectProgressionToChassis: 实训步骤4融合开关控制与符号映射并可直接进入搭铁挑战', () => {
    let state = createInitialState();
    state = { ...state, closedCircuitUnlocked: true };
    state = level02Reducer(state, { type: 'PROCEED_TO_SWITCH_EXP' });
    expect(state.currentStage).toBe('SWITCH_EXPERIMENT');
    expect(state.isLampLit).toBe(true);

    // 1. 操作开关控制通断
    state = level02Reducer(state, { type: 'TOGGLE_SWITCH' });
    expect(state.isSwitchClosed).toBe(false);
    expect(state.isLampLit).toBe(false);
    expect(state.switchObserved).toBe(true);

    state = level02Reducer(state, { type: 'TOGGLE_SWITCH' });
    expect(state.isSwitchClosed).toBe(true);
    expect(state.isLampLit).toBe(true);

    // 2. 在同一步骤中点击各元件完成映射高亮与记录
    ['BAT1', 'F1', 'S1', 'L1'].forEach((compId) => {
      state = level02Reducer(state, { type: 'HIGHLIGHT_COMPONENT', componentId: compId });
      expect(state.activeHighlightId).toBe(compId);
    });
    expect(state.mappedComponents).toEqual(expect.arrayContaining(['BAT1', 'F1', 'S1', 'L1']));

    // 3. 无需重复的中间界面，直接推进至实车车身搭铁挑战
    state = level02Reducer(state, { type: 'PROCEED_TO_CHASSIS' });
    expect(state.currentStage).toBe('CHASSIS_GROUND_CHALLENGE');
    expect(state.chassisGroundConnected).toBe(false);
  });

  // 18. 未完成前序基础实验禁止进入车身搭铁挑战
  it('18. chassisGroundRequiresPrerequisite: 前置条件校验进入搭铁挑战', () => {
    let state = createInitialState();
    state = level02Reducer(state, { type: 'PROCEED_TO_CHASSIS' });
    expect(state.currentStage).toBe('COMPONENT_EXPLORE');

    state = { ...state, closedCircuitUnlocked: true, switchObserved: true };
    state = level02Reducer(state, { type: 'PROCEED_TO_CHASSIS' });
    expect(state.currentStage).toBe('CHASSIS_GROUND_CHALLENGE');
    expect(state.isPowerOn).toBe(false);
    expect(state.isLampLit).toBe(false);
  });

  // 19. 带电尝试接搭铁被安全规则拦截
  it('19. chassisGroundRequiresPowerOffFirst: 带电接搭铁被拦截', () => {
    let state = createInitialState();
    state = { ...state, closedCircuitUnlocked: true, switchObserved: true, isPowerOn: true };
    state = level02Reducer(state, { type: 'PROCEED_TO_CHASSIS' });
    state.isPowerOn = true;

    state = level02Reducer(state, { type: 'CONNECT_CHASSIS_WIRE' });
    expect(state.feedback).toContain('带电作业违规');
    expect(state.metrics.hotWiringAttempts).toBe(1);
  });

  // 20. 接入搭铁线后不自动亮灯，保持断电状态
  it('20. chassisGroundConnectDoesNotAutoPower: 接搭铁保持断电', () => {
    let state = createInitialState();
    state = { ...state, closedCircuitUnlocked: true, switchObserved: true };
    state = level02Reducer(state, { type: 'PROCEED_TO_CHASSIS' });

    state = level02Reducer(state, { type: 'CONNECT_CHASSIS_WIRE' });
    expect(state.chassisGroundConnected).toBe(true);
    expect(state.isPowerOn).toBe(false);
    expect(state.isLampLit).toBe(false);
  });

  // 21. 接入搭铁线后主动送电，检修灯通过车身回流点亮
  it('21. chassisGroundActivePowerOnLightsLamp: 主动送电点亮搭铁灯', () => {
    let state = createInitialState();
    state = { ...state, closedCircuitUnlocked: true, switchObserved: true };
    state = level02Reducer(state, { type: 'PROCEED_TO_CHASSIS' });
    state = level02Reducer(state, { type: 'CONNECT_CHASSIS_WIRE' });

    state = level02Reducer(state, { type: 'POWER_ON' });
    expect(state.isPowerOn).toBe(true);
    expect(state.isLampLit).toBe(true);
    expect(state.completedObjectives).toContain('OBJ_CHASSIS_GROUND');
    expect(state.metrics.chassisGroundCompleted).toBe(true);
  });

  // 22. 车身透视与实车外观切换正常
  it('22. chassisXrayToggles: 透视切换正常', () => {
    let state = createInitialState();
    state = { ...state, currentStage: 'CHASSIS_GROUND_CHALLENGE' };

    state = level02Reducer(state, { type: 'TOGGLE_CHASSIS_XRAY' });
    expect(state.chassisXrayView).toBe(true);

    state = level02Reducer(state, { type: 'TOGGLE_CHASSIS_XRAY' });
    expect(state.chassisXrayView).toBe(false);
  });

  // 23. 未完成搭铁挑战禁止进入迁移测试
  it('23. transferRequiresPrerequisite: 前置条件校验进入迁移挑战', () => {
    let state = createInitialState();
    state = level02Reducer(state, { type: 'PROCEED_TO_TRANSFER' });
    expect(state.currentStage).toBe('COMPONENT_EXPLORE');

    state = { ...state, chassisGroundConnected: true, completedObjectives: ['OBJ_CHASSIS_GROUND'] };
    state = level02Reducer(state, { type: 'PROCEED_TO_TRANSFER' });
    expect(state.currentStage).toBe('TRANSFER_CHALLENGE');
  });

  // 24. 迁移挑战缺少熔断器或缺少开关时通电验证不通过，指出缺失元件
  it('24. transferBlocksIncompleteCircuit: 迁移挑战残缺拓扑通电验证拦截', () => {
    let state = createInitialState();
    state = { ...state, chassisGroundConnected: true, completedObjectives: ['OBJ_CHASSIS_GROUND'] };
    state = level02Reducer(state, { type: 'PROCEED_TO_TRANSFER' });

    // Bypass fuse and switch: BAT_POS -> LAMP_T1 -> LAMP_T2 -> BAT_NEG
    state = level02Reducer(state, { type: 'CONNECT_TRANSFER_WIRE', from: 'BAT_POS', to: 'LAMP_T1' });
    state = level02Reducer(state, { type: 'CONNECT_TRANSFER_WIRE', from: 'LAMP_T2', to: 'BAT_NEG' });

    state = level02Reducer(state, { type: 'CHECK_TRANSFER' });
    expect(state.transferSuccess).toBe(false);
    expect(state.feedback).toContain('缺少');
    expect(state.metrics.transferCheckErrors).toBe(1);
  });

  // 25. 迁移挑战存在短路时通电验证不通过
  it('25. transferBlocksShortCircuit: 迁移挑战短路不通过', () => {
    let state = createInitialState();
    state = { ...state, chassisGroundConnected: true, completedObjectives: ['OBJ_CHASSIS_GROUND'] };
    state = level02Reducer(state, { type: 'PROCEED_TO_TRANSFER' });

    state = level02Reducer(state, { type: 'CONNECT_TRANSFER_WIRE', from: 'BAT_POS', to: 'BAT_NEG' });
    state = level02Reducer(state, { type: 'CHECK_TRANSFER' });

    expect(state.transferSuccess).toBe(false);
    expect(state.feedback).toContain('短路');
  });

  // 26. 打乱布局下正确连接完整回路后通电验证通过
  it('26. transferPassesStandardTopology: 空间打乱下完整标准回路验证通过', () => {
    let state = createInitialState();
    state = { ...state, chassisGroundConnected: true, completedObjectives: ['OBJ_CHASSIS_GROUND'] };
    state = level02Reducer(state, { type: 'PROCEED_TO_TRANSFER' });

    state = level02Reducer(state, { type: 'CONNECT_TRANSFER_WIRE', from: 'BAT_POS', to: 'FUSE_T1' });
    state = level02Reducer(state, { type: 'CONNECT_TRANSFER_WIRE', from: 'FUSE_T2', to: 'SW_T1' });
    state = level02Reducer(state, { type: 'CONNECT_TRANSFER_WIRE', from: 'SW_T2', to: 'LAMP_T1' });
    state = level02Reducer(state, { type: 'CONNECT_TRANSFER_WIRE', from: 'LAMP_T2', to: 'BAT_NEG' });

    state = level02Reducer(state, { type: 'CHECK_TRANSFER' });
    expect(state.transferSuccess).toBe(true);
    expect(state.completedObjectives).toContain('OBJ_TRANSFER_PASSED');
  });

  // 27. 未通过迁移挑战禁止进入结课反思
  it('27. reflectionRequiresPrerequisite: 前置条件校验进入结课反思', () => {
    let state = createInitialState();
    state = level02Reducer(state, { type: 'PROCEED_TO_REFLECTION' });
    expect(state.currentStage).toBe('COMPONENT_EXPLORE');

    state = { ...state, transferSuccess: true };
    state = level02Reducer(state, { type: 'PROCEED_TO_REFLECTION' });
    expect(state.currentStage).toBe('REFLECTION');
  });

  // 28. 结课反思6块乱序，局部正确或顺序错误不予通过，记录重试次数；6块完全正确后通关并生成能力报告
  it('28. reflectionRequiresAllSixBlocksCorrect: 严格校验6块回路顺序并生成能力报告', () => {
    let state = createInitialState();
    state = { ...state, transferSuccess: true };
    state = level02Reducer(state, { type: 'PROCEED_TO_REFLECTION' });
    expect(state.reflectionBlocks.length).toBe(6);

    // Submit with initial shuffled order (incorrect)
    state = level02Reducer(state, { type: 'SUBMIT_REFLECTION' });
    expect(state.reflectionSubmitted).toBe(false);
    expect(state.currentStage).toBe('REFLECTION');
    expect(state.reflectionAttempts).toBe(1);
    expect(state.reflectionError).not.toBeNull();
    expect(state.metrics.reflectionErrors).toBe(1);

    // Correct full 6-block order
    state = { ...state, reflectionBlocks: [...REFLECTION_TARGET_SEQUENCE] };
    state = level02Reducer(state, { type: 'SUBMIT_REFLECTION' });

    expect(state.reflectionSubmitted).toBe(true);
    expect(state.currentStage).toBe('COMPLETE');
    expect(state.completedObjectives).toContain('OBJ_REFLECTION_COMPLETE');
    expect(state.abilityReport).not.toBeNull();
    expect(state.abilityReport?.dimensions.length).toBe(5);
  });

  // 29. 通关 Sprint 2 记录成绩与通关状态，不解锁未开发的 Sprint 3
  it('29. levelCompleteDoesNotLeakToSprint3: 通关 Level 02 不解锁未开发的 Level 03', () => {
    resetUserProgress();
    // Complete Level 00 then Level 01 then Level 02
    markLevelComplete('LEVEL_00', 100);
    markLevelComplete('LEVEL_01', 100);
    const progress = markLevelComplete('LEVEL_02', 100);

    expect(progress.levels.LEVEL_02.status).toBe('completed');
    expect(progress.levels.LEVEL_03.status).toBe('locked');
    expect(progress.currentActiveLevel).toBe('LEVEL_02');
  });

  // 30. 必须学习全部4个物料后才允许进入接线环节
  it('30. proceedToWiringRequiresAllFourComponentsExplored: 必须学习全部4个物料才能进入接线', () => {
    let state = level02Reducer(undefined as unknown as Level02State, { type: 'RESTART' });
    state = level02Reducer(state, { type: 'ACCEPT_WORK_ORDER' });
    expect(state.currentStage).toBe('COMPONENT_EXPLORE');

    // 未探索任何物料，点击进入接线被阻断
    state = level02Reducer(state, { type: 'PROCEED_TO_WIRING' });
    expect(state.currentStage).toBe('COMPONENT_EXPLORE');
    expect(state.tutorMood).toBe('WARNING');
    expect(state.feedback).toContain('请先在工作台上逐个点击4种物料');

    // 只探索了3个物料，依然被阻断
    state = level02Reducer(state, { type: 'EXPLORE_COMPONENT', componentId: 'BAT1' });
    state = level02Reducer(state, { type: 'EXPLORE_COMPONENT', componentId: 'F1' });
    state = level02Reducer(state, { type: 'EXPLORE_COMPONENT', componentId: 'S1' });
    state = level02Reducer(state, { type: 'PROCEED_TO_WIRING' });
    expect(state.currentStage).toBe('COMPONENT_EXPLORE');
    expect(state.tutorMood).toBe('WARNING');

    // 探索完第4个物料，允许进入接线
    state = level02Reducer(state, { type: 'EXPLORE_COMPONENT', componentId: 'L1' });
    expect(state.completedObjectives).toContain('OBJ_EXPLORE');

    state = level02Reducer(state, { type: 'PROCEED_TO_WIRING' });
    expect(state.currentStage).toBe('BUILD_DOUBLE_WIRE_CIRCUIT');
  });
});
