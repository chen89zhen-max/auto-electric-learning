import type { AttemptEvidenceEnvelopeV2, C7EvidenceLevelId } from '@/src/types/attemptEvidence';

export interface EvidenceField {
  label: string;
  value: string;
}

export interface EvidenceSection {
  title: string;
  fields: EvidenceField[];
}

function toText(val: unknown): string {
  if (typeof val === 'string') return val;
  if (typeof val === 'number' || typeof val === 'boolean') return String(val);
  return '';
}

function formatA03(steps: Record<string, Record<string, unknown>>): EvidenceSection[] {
  const fields: EvidenceField[] = [];

  const colorCalc = steps.COLOR_CODE_CALC;
  if (colorCalc) {
    const name = toText(colorCalc.resistorName || colorCalc.resistorId);
    const nominal = colorCalc.nominal !== undefined ? `${toText(colorCalc.nominal)}Ω` : '';
    const tolerance = colorCalc.tolerance !== undefined ? `±${toText(colorCalc.tolerance)}%` : '';
    const span =
      colorCalc.min !== undefined && colorCalc.max !== undefined
        ? ` (范围: ${toText(colorCalc.min)}Ω ~ ${toText(colorCalc.max)}Ω)`
        : '';
    fields.push({
      label: '色环识别与计算',
      value: `${name} [标称: ${nominal} ${tolerance}]${span}`,
    });
  }

  const sample = steps.SAMPLE_MEASUREMENT;
  if (sample) {
    const valA = sample.sampleA !== undefined ? `A: ${toText(sample.sampleA)}Ω` : '';
    const valB = sample.sampleB !== undefined ? `B: ${toText(sample.sampleB)}Ω` : '';
    const valC = sample.sampleC !== undefined ? `C: ${toText(sample.sampleC)}` : '';
    const pass = sample.v04Passed !== undefined ? `考核: ${sample.v04Passed ? '合格' : '未合格'}` : '';
    fields.push({
      label: '实测采样与判定',
      value: [valA, valB, valC, pass].filter(Boolean).join(', '),
    });
  }

  const pot = steps.POTENTIOMETER_TEST;
  if (pot) {
    const total = pot.totalResistance !== undefined ? `总阻值: ${toText(pot.totalResistance)}Ω` : '';
    const points = Array.isArray(pot.recordedPoints)
      ? `测点: [${pot.recordedPoints.map(toText).join(', ')}]`
      : '';
    const pass =
      pot.v04PotentiometerPassed !== undefined
        ? `判定: ${pot.v04PotentiometerPassed ? '合格' : '未合格'}`
        : '';
    fields.push({
      label: '电位器连续性测试',
      value: [total, points, pass].filter(Boolean).join(', '),
    });
  }

  const ntc = steps.TRANSFER_NTC;
  if (ntc) {
    const choice = ntc.choice ? `判定选择: ${toText(ntc.choice)}` : '';
    const coolant = ntc.coolantTemp !== undefined ? `冷却水温: ${toText(ntc.coolantTemp)}℃` : '';
    const pass = ntc.passed !== undefined ? `结果: ${ntc.passed ? '通过' : '未通过'}` : '';
    fields.push({
      label: '水温传感器综合诊断',
      value: [choice, coolant, pass].filter(Boolean).join(', '),
    });

    const sensitive = ntc.sensitiveResistors as
      | {
          points?: Record<string, Array<{ condition: number; resistance: number }>>;
          trends?: Record<string, string>;
        }
      | undefined;

    if (sensitive?.points) {
      const sensorKeys = Object.keys(sensitive.points).sort();
      for (const sensor of sensorKeys) {
        const pList = sensitive.points[sensor] || [];
        const sortedPoints = [...pList].sort((a, b) => a.condition - b.condition);
        const pStrs = sortedPoints.map((p) => `工况 ${toText(p.condition)} -> ${toText(p.resistance)}Ω`);
        const trend = sensitive.trends?.[sensor] ? `趋势: ${toText(sensitive.trends[sensor])}` : '';
        fields.push({
          label: `${sensor} 敏感电阻测点`,
          value: [...pStrs, trend].filter(Boolean).join('; '),
        });
      }
    }
  }

  const evalStep = steps.INDEPENDENT_EVAL;
  if (evalStep) {
    const choice = evalStep.choice ? `评估选项: ${toText(evalStep.choice)}` : '';
    const measured = evalStep.measured !== undefined ? `测量值: ${toText(evalStep.measured)}Ω` : '';
    const pass = evalStep.passed !== undefined ? `评估结果: ${evalStep.passed ? '通过' : '未通过'}` : '';
    fields.push({
      label: '独立诊断评估',
      value: [choice, measured, pass].filter(Boolean).join(', '),
    });
  }

  return [
    {
      title: '敏感电阻测点与趋势',
      fields,
    },
  ];
}

function formatD02(steps: Record<string, Record<string, unknown>>): EvidenceSection[] {
  const fields: EvidenceField[] = [];

  const lorentz = steps.LORENTZ_FORCE_AND_LEFT_HAND_RULE;
  if (lorentz) {
    fields.push({
      label: '洛伦兹力与左手定则',
      value: `分析选择: ${toText(lorentz.choice) || '无'}`,
    });
  }

  const commutator = steps.COMMUTATOR_AND_CONTINUOUS_ROTATION;
  if (commutator) {
    const choice = commutator.choice ? `换向器认知: ${toText(commutator.choice)}` : '';
    const motor = commutator.inductionMotor as
      | {
          parts?: unknown[];
          observedSpeeds?: unknown[];
          slipPercent?: unknown;
          mechanism?: unknown;
          verified?: unknown;
        }
      | undefined;

    const motorDetails: string[] = [];
    if (motor?.parts && Array.isArray(motor.parts)) {
      motorDetails.push(`组成部件: [${motor.parts.map(toText).join(', ')}]`);
    }
    if (motor?.observedSpeeds && Array.isArray(motor.observedSpeeds)) {
      motorDetails.push(`观测转速: [${motor.observedSpeeds.map(toText).join(', ')} rpm]`);
    }
    if (motor?.slipPercent !== undefined) {
      motorDetails.push(`转差率: ${toText(motor.slipPercent)}%`);
    }
    if (motor?.mechanism) {
      motorDetails.push(`旋转机理: ${toText(motor.mechanism)}`);
    }
    if (motor?.verified !== undefined) {
      motorDetails.push(`转差判定: ${motor.verified ? '正确' : '错误'}`);
    }

    fields.push({
      label: '异步感应电机观察与转差分析',
      value: [choice, ...motorDetails].filter(Boolean).join('; '),
    });
  }

  const hbridge = steps.H_BRIDGE_RELAY_DUAL_DIRECTION_CONTROL;
  if (hbridge) {
    fields.push({
      label: 'H桥继电器双向控制',
      value: `控制方案: ${toText(hbridge.choice) || '无'}`,
    });
  }

  const fault = steps.BLIND_DC_MOTOR_FAULT_ISOLATION;
  if (fault) {
    const caseId = fault.caseId ? `案例: ${toText(fault.caseId)}` : '';
    const choice = fault.choice ? `故障诊断: ${toText(fault.choice)}` : '';
    fields.push({
      label: '盲测直流电机故障隔离',
      value: [caseId, choice].filter(Boolean).join(', '),
    });
  }

  const repair = steps.ENGINEERING_REPAIR_AND_COMMISSIONING;
  if (repair) {
    const rep = repair.repaired !== undefined ? `修复状态: ${repair.repaired ? '已修复' : '未修复'}` : '';
    const cur = repair.current !== undefined ? `调试工作电流: ${toText(repair.current)}A` : '';
    const sig = repair.signed !== undefined ? `签字交付: ${repair.signed ? '已签署' : '未签署'}` : '';
    fields.push({
      label: '工程修复与实车调试',
      value: [rep, cur, sig].filter(Boolean).join(', '),
    });
  }

  return [
    {
      title: '异步电机观察与转差判断',
      fields,
    },
  ];
}

function formatE03(steps: Record<string, Record<string, unknown>>): EvidenceSection[] {
  const fields: EvidenceField[] = [];

  const step1 = steps.RECTIFIER_TOPOLOGY_COGNITION;
  if (step1) {
    const choice = step1.s1Choice ? `选择: ${toText(step1.s1Choice)}` : '';
    const topo = step1.s1Topology ? `拓扑类型: ${toText(step1.s1Topology)}` : '';
    const tp = step1.threePhase as
      | {
          observedAngles?: unknown[];
          pair?: unknown;
          pulses?: unknown;
          verified?: unknown;
        }
      | undefined;

    const tpDetails: string[] = [];
    if (tp?.pair) tpDetails.push(`线对: ${toText(tp.pair)}`);
    if (tp?.observedAngles && Array.isArray(tp.observedAngles)) {
      tpDetails.push(`导通角: [${tp.observedAngles.map(toText).join(', ')}°]`);
    }
    if (tp?.pulses !== undefined) tpDetails.push(`脉冲数: ${toText(tp.pulses)}`);
    if (tp?.verified !== undefined) tpDetails.push(`验证: ${tp.verified ? '通过' : '未通过'}`);

    fields.push({
      label: '阶段1: 整流拓扑与三相导通观察',
      value: [choice, topo, ...tpDetails].filter(Boolean).join(', '),
    });
  }

  const step2 = steps.BRIDGE_WIRING_AND_MULTIMETER_TEST;
  if (step2) {
    const choice = step2.s2Choice ? `选择: ${toText(step2.s2Choice)}` : '';
    const arm = step2.s2SelectedArm ? `桥臂二极管: ${toText(step2.s2SelectedArm)}` : '';
    fields.push({
      label: '阶段2: 桥式接线与万用表二极管档测量',
      value: [choice, arm].filter(Boolean).join(', '),
    });
  }

  const step3 = steps.FILTER_CAPACITOR_AND_VOLTAGE_CALC;
  if (step3) {
    const choice = step3.s3Choice ? `选择: ${toText(step3.s3Choice)}` : '';
    const cap = step3.s3HasCapacitor !== undefined ? `电容: ${step3.s3HasCapacitor ? '接入' : '未接入'}` : '';
    const reg = step3.regulation ? `调节方式: ${toText(step3.regulation)}` : '';
    const scope = step3.modelScope ? `模型范围: ${toText(step3.modelScope)}` : '';
    const fo = step3.filteredOutput as { uDc?: unknown; rippleVpp?: unknown } | number | undefined;
    let v = '';
    if (typeof fo === 'number') {
      v = `滤波输出计算值: ${toText(fo)}V`;
    } else if (fo && typeof fo === 'object') {
      const uDcStr =
        fo.uDc !== undefined
          ? `滤波输出计算值: ${typeof fo.uDc === 'number' ? fo.uDc.toFixed(2) : toText(fo.uDc)}V`
          : '';
      const ripStr =
        fo.rippleVpp !== undefined
          ? `纹波: ${typeof fo.rippleVpp === 'number' ? fo.rippleVpp.toFixed(2) : toText(fo.rippleVpp)}V`
          : '';
      v = [uDcStr, ripStr].filter(Boolean).join(', ');
    }
    fields.push({
      label: '阶段3: 滤波电容效应与电压计算',
      value: [choice, cap, reg, scope, v].filter(Boolean).join(', '),
    });
  }

  const step4 = steps.BLIND_RECTIFIER_FAULT_DIAGNOSIS;
  if (step4) {
    const diagnoses = step4.s4Diagnoses as Record<string, unknown> | undefined;
    let diagStr = '无诊断记录';
    if (diagnoses && typeof diagnoses === 'object') {
      diagStr = Object.keys(diagnoses)
        .sort()
        .map((k) => `${k}: ${toText(diagnoses[k])}`)
        .join('; ');
    }
    fields.push({
      label: '阶段4: 盲测整流电路故障排查',
      value: diagStr,
    });
  }

  const step5 = steps.ENGINEERING_REPAIR_AND_DELIVERY;
  if (step5) {
    const rep = step5.s5Repaired !== undefined ? `整流板修复: ${step5.s5Repaired ? '完成' : '未完成'}` : '';
    const run =
      step5.s5EngineRunning !== undefined
        ? `发电机运转: ${step5.s5EngineRunning ? '正常发电' : '异常'}`
        : '';
    fields.push({
      label: '阶段5: 工程修复与发动机运转交付',
      value: [rep, run].filter(Boolean).join(', '),
    });
  }

  return [
    {
      title: '整流滤波五阶段记录',
      fields,
    },
  ];
}

function formatE05(steps: Record<string, Record<string, unknown>>): EvidenceSection[] {
  const fields: EvidenceField[] = [];

  const step1 = steps.LOGIC_GATE_SYMBOLS_AND_TRUTH_TABLE ?? steps.GATE_READINGS;
  if (step1) {
    const s1Choice = step1.s1Choice ? `理论选择: ${toText(step1.s1Choice)}` : '';
    const s1Gate = step1.s1Gate ? `基准门: ${toText(step1.s1Gate)}` : '';
    const s1Summary = [s1Choice, s1Gate].filter(Boolean).join(', ') || '已完成符号与真值判读';
    fields.push({
      label: '阶段1: 五种逻辑门符号判读',
      value: s1Summary,
    });

    const readings = (step1.gateReadings ?? steps.GATE_READINGS?.gateReadings) as
      | Record<string, { gate?: unknown; a?: unknown; b?: unknown; output?: unknown }>
      | undefined;

    if (readings && typeof readings === 'object') {
      const keys = Object.keys(readings).sort();
      const readingStrs = keys.map((key) => {
        const r = readings[key];
        const inStr = `A=${r.a ? '1' : '0'}${r.gate === 'NOT' ? '' : `, B=${r.b ? '1' : '0'}`}`;
        return `${toText(r.gate)}(${inStr}) -> 输出 ${r.output ? '1' : '0'}`;
      });
      fields.push({
        label: '14组逻辑门真值表实测记录',
        value: readingStrs.join('; '),
      });
    }
  }

  const step2 = steps.EXPERIMENT_BOX_TRUTH_VERIFICATION;
  if (step2) {
    const s2Choice = step2.s2Choice ? `实测确认选择: ${toText(step2.s2Choice)}` : '';
    const rows = step2.s2VerifiedRows as Record<string, unknown> | undefined;
    let rowStr = '';
    if (rows && typeof rows === 'object') {
      const rowKeys = ['00', '01', '10', '11'];
      rowStr = '74HC08实测真值: ' + rowKeys.map((k) => `${k}->${rows[k] ? '1' : '0'}`).join(', ');
    }
    fields.push({
      label: '阶段2: 试验箱74HC08真值全组合实测',
      value: [s2Choice, rowStr].filter(Boolean).join('; ') || '已完成实测验证',
    });
  }

  const step3 = steps.VEHICLE_SAFETY_INTERLOCK_LOGIC ?? steps.INTERLOCK_LOGIC;
  if (step3) {
    const s3Choice = step3.s3Choice
      ? `联锁逻辑设计选择: ${toText(step3.s3Choice)}`
      : step3.selectedGate
        ? `所选逻辑门: ${toText(step3.selectedGate)}`
        : '';
    const alarm =
      step3.s3AlarmTriggered !== undefined
        ? `报警状态: ${step3.s3AlarmTriggered ? '已触发报警' : '未触发报警'}`
        : step3.passed !== undefined
          ? `互锁验证: ${step3.passed ? '符合设计' : '未通过'}`
          : '';
    fields.push({
      label: '阶段3: 实车安全带联锁逻辑分析',
      value: [s3Choice, alarm].filter(Boolean).join(', ') || '已完成联锁设计',
    });
  }

  const step4 = steps.BLIND_LOGIC_IC_FAULT_DIAGNOSIS;
  if (step4) {
    const diagnoses = step4.s4Diagnoses as Record<string, unknown> | undefined;
    const DIAG_NAMES: Record<string, string> = {
      GOOD: '原装良好 (GOOD)',
      VCC_DISCONNECTED: 'VCC虚焊脱焊 (VCC_DISCONNECTED)',
      INPUT_FLOATING: '输入引脚悬空 (INPUT_FLOATING)',
      OUTPUT_SHORT_GND: '输出端击穿接地 (OUTPUT_SHORT_GND)',
    };
    let diagStr = '';
    if (diagnoses && typeof diagnoses === 'object') {
      diagStr = Object.keys(diagnoses)
        .sort()
        .map((k) => `${k}: ${DIAG_NAMES[String(diagnoses[k])] ?? toText(diagnoses[k])}`)
        .join(', ');
    }
    fields.push({
      label: '阶段4: 数字逻辑芯片盲测故障排查',
      value: diagStr || '已完成四组逻辑芯片排查',
    });
  }

  const step5 = steps.ENGINEERING_REPAIR_AND_DELIVERY ?? steps.EQUIPMENT_DELIVERY;
  if (step5) {
    const rep = step5.s5Repaired !== undefined ? `修复状态: ${step5.s5Repaired ? '已修复' : '未修复'}` : '';
    const buckle = step5.s5BuckleState
      ? `锁扣状态: ${
          step5.s5BuckleState === 'BUCKLED' || step5.s5BuckleState === 'LATCHED'
            ? '已扣紧(静音)'
            : '未扣紧(报警)'
        }`
      : '';
    const signed =
      step5.signatureConfirmed !== undefined
        ? step5.signatureConfirmed
          ? '已签字确认'
          : '未签字'
        : '';
    fields.push({
      label: '阶段5: 实车安全联锁修复与交付工单',
      value: [rep, buckle, signed].filter(Boolean).join(', ') || '已完成交付验收',
    });
  }

  return [
    {
      title: '逻辑门真值表与联锁判断',
      fields,
    },
  ];
}

export function formatAttemptEvidence(
  levelId: C7EvidenceLevelId,
  envelope: AttemptEvidenceEnvelopeV2
): EvidenceSection[] {
  const steps = envelope.processEvidence?.steps ?? {};
  switch (levelId) {
    case 'A03':
      return formatA03(steps);
    case 'D02':
      return formatD02(steps);
    case 'E03':
      return formatE03(steps);
    case 'E05':
      return formatE05(steps);
    default:
      return [];
  }
}
