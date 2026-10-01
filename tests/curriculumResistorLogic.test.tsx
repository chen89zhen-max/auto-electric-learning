// @vitest-environment jsdom
import React from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { A03ResistanceScene } from '../src/levels/a03/scenes/A03ResistanceScene';
import { E05LogicGatesScene } from '../src/levels/e05/E05LogicGatesScene';
const recordWrongMock = vi.fn();
vi.mock('../src/components/visuals/SoundEffects', () => ({ sounds: new Proxy({}, { get: () => vi.fn() }) }));
vi.mock('../src/assessment/useLevelAssessment', () => ({
  useLevelAssessment: () => ({
    requestHint: vi.fn(),
    recordWrong: recordWrongMock,
    recordMeterBlocked: vi.fn(),
  }),
}));

afterEach(() => {
  cleanup();
  recordWrongMock.mockClear();
});

it('A03 cannot pass from the NTC answer alone', () => {
  const done = vi.fn();
  render(<A03ResistanceScene currentStep="TRANSFER_NTC" onStepComplete={done} onAdvanceStep={vi.fn()} />);
  fireEvent.click(screen.getByLabelText(/A. 性能良好/));
  fireEvent.click(screen.getByText('提交实车维修诊断结论'));
  expect(done).not.toHaveBeenCalled();
  expect(screen.queryByText('查看能力报告')).toBeNull();
});

it('E05 cannot pass by answering only the basic gate question', () => {
  const done = vi.fn();
  render(<E05LogicGatesScene currentStep="LOGIC_GATE_SYMBOLS_AND_TRUTH_TABLE" onStepComplete={done} onAdvanceStep={vi.fn()} />);
  fireEvent.click(screen.getByText(/与门只有当所有输入全为1时输出才为1；/));
  fireEvent.click(screen.getByText('提交认知判定'));
  expect(done).not.toHaveBeenCalled();
});

it('A03 requires real comparisons and correct trends; reset clears evidence and retry succeeds', () => {
  const done = vi.fn();
  const process = vi.fn();
  render(<A03ResistanceScene currentStep="TRANSFER_NTC" onStepComplete={done} onAdvanceStep={vi.fn()} onProcessEvent={process} />);

  // 1. 万用表未在电阻挡时点击记录，只记 1 次 meterGuardBlocks，不产生测点，不完成
  fireEvent.click(screen.getByText('记录 NTC 测点'));
  expect(process).toHaveBeenCalledWith('meterGuardBlocks');
  expect(process).toHaveBeenCalledTimes(1);
  process.mockClear();

  // 拨至电阻挡
  fireEvent.click(screen.getByText('敏感电阻实验：电阻挡'));

  // 2. 跨度不足40（如仅测20℃或跨度不足）：提交只提示补操作，不记 wrongAttempts
  fireEvent.change(screen.getByLabelText('NTC温度'), { target: { value: 20 } });
  fireEvent.click(screen.getByText('记录 NTC 测点'));
  fireEvent.change(screen.getByLabelText('NTC温度'), { target: { value: 50 } });
  fireEvent.click(screen.getByText('记录 NTC 测点')); // 跨度 30 < 40
  fireEvent.click(screen.getByLabelText(/A. 性能良好/));
  fireEvent.click(screen.getByText('提交实车维修诊断结论'));
  expect(done).not.toHaveBeenCalled();
  expect(process).not.toHaveBeenCalled(); // 跨度不足不记 wrongAttempts

  const collect = () => {
    for (const temp of [20, 80]) {
      fireEvent.change(screen.getByLabelText('NTC温度'), { target: { value: temp } });
      fireEvent.click(screen.getByText('记录 NTC 测点'));
    }
    for (const kind of ['光敏电阻', '力敏电阻']) {
      for (const value of [0, 100]) {
        fireEvent.change(screen.getByLabelText(`${kind}条件`), { target: { value } });
        fireEvent.click(screen.getByText(`记录 ${kind} 测点`));
      }
      fireEvent.change(screen.getByLabelText(`${kind}趋势`), { target: { value: 'decrease' } });
    }
  };

  // 3. 清空记录后旧门槛立即失效
  collect();
  fireEvent.click(screen.getByText('清空敏感电阻记录'));
  fireEvent.click(screen.getByLabelText(/A. 性能良好/));
  fireEvent.click(screen.getByText('提交实车维修诊断结论'));
  expect(done).not.toHaveBeenCalled();
  expect(process).not.toHaveBeenCalled();

  // 4. LDR/FSR 趋势选错提交：只记 1 次 wrongAttempts，不完成
  collect();
  fireEvent.change(screen.getByLabelText('力敏电阻趋势'), { target: { value: 'increase' } });
  fireEvent.click(screen.getByText('提交实车维修诊断结论'));
  expect(done).not.toHaveBeenCalled();
  expect(process).toHaveBeenCalledWith('wrongAttempts');
  expect(process).toHaveBeenCalledTimes(1);
  process.mockClear();

  // 改正趋势但未重新提交不能推进
  fireEvent.change(screen.getByLabelText('力敏电阻趋势'), { target: { value: 'decrease' } });
  expect(screen.queryByText('查看能力报告')).toBeNull();

  // 选择错误诊断项提交：记 1 次 wrongAttempts
  fireEvent.click(screen.getByLabelText(/B. 存在故障/));
  fireEvent.click(screen.getByText('提交实车维修诊断结论'));
  expect(done).not.toHaveBeenCalled();
  expect(process).toHaveBeenCalledWith('wrongAttempts');
  expect(process).toHaveBeenCalledTimes(1);

  // 改回正确选项并提交
  fireEvent.click(screen.getByLabelText(/A. 性能良好/));
  fireEvent.click(screen.getByText('提交实车维修诊断结论'));
  expect(done).toHaveBeenCalledTimes(1);

  // 验证提交证据包含三组真实测点与趋势
  const evidence = done.mock.calls[0][1].sensitiveResistors;
  expect(evidence.points.NTC).toEqual([{ condition: 20, resistance: 2500 }, { condition: 80, resistance: 306 }]);
  expect(evidence.points.LDR[1].resistance).toBeLessThan(evidence.points.LDR[0].resistance);
  expect(evidence.points.FSR).toHaveLength(2);
  expect(evidence.trends.NTC).toBe('decrease');
  expect(evidence.trends.LDR).toBe('decrease');
  expect(evidence.trends.FSR).toBe('decrease');

  // 重复点击不重复发完成事件
  fireEvent.click(screen.getByText('提交实车维修诊断结论'));
  expect(done).toHaveBeenCalledTimes(1);
  expect(screen.getByText('查看能力报告')).toBeTruthy();
});

it('E05 validates independent NAND/NOR evidence, rejects wrong outputs and resets safely', () => {
  recordWrongMock.mockClear();
  vi.spyOn(window, 'alert').mockImplementation(() => {});
  const done = vi.fn();
  render(<E05LogicGatesScene currentStep="LOGIC_GATE_SYMBOLS_AND_TRUTH_TABLE" onStepComplete={done} onAdvanceStep={vi.fn()} />);

  // 1. 错误判读输出只记 1 次 cognition 错误，不写入 gateReadings
  fireEvent.click(screen.getByText('判读输出 0 并记录'));
  expect(screen.getByRole('status').textContent).toContain('有误');
  expect(recordWrongMock).toHaveBeenCalledWith('cognition');
  expect(recordWrongMock).toHaveBeenCalledTimes(1);
  recordWrongMock.mockClear();

  // 2. 同一门同一输入重复正确记录只覆盖同一键，不增加虚假完成项
  fireEvent.click(screen.getByText('判读输出 1 并记录')); // AND:11 -> 1
  fireEvent.click(screen.getByText('判读输出 1 并记录')); // duplicate
  expect(screen.getByText('当前输入与输出已验证并记录。')).toBeTruthy();

  const collect = (gate: string, rows: string[]) => {
    fireEvent.click(screen.getByRole('button', { name: gate }));
    for (const row of rows) {
      for (const [i, label] of ['A', 'B'].entries()) {
        if (gate === 'NOT' && i === 1) continue;
        const button = screen.getByRole('button', { name: new RegExp(`输入端 ${label}:`) });
        if (button.textContent?.includes('高电平') !== (row[i] === '1')) fireEvent.click(button);
      }
      const a = row[0] === '1', b = row[1] === '1';
      const output = gate === 'AND' ? a && b : gate === 'OR' ? a || b : gate === 'NOT' ? !a : gate === 'NAND' ? !(a && b) : !(a || b);
      fireEvent.click(screen.getByText(`判读输出 ${Number(output)} 并记录`));
    }
  };

  // 3. 缺少任一 NAND 或 NOR 必验项时不能提交；点击“清空五种门记录”立即撤销全部门槛
  fireEvent.click(screen.getByText(/与门只有当所有输入全为1时输出才为1；/));
  collect('AND', ['01', '10', '11']);
  collect('OR', ['00', '01', '10']);
  collect('NOT', ['0', '1']);
  expect((screen.getByRole('button', { name: '提交认知判定' }) as HTMLButtonElement).disabled).toBe(true);

  collect('NAND', ['01', '10', '11']);
  expect((screen.getByRole('button', { name: '提交认知判定' }) as HTMLButtonElement).disabled).toBe(true);

  collect('NOR', ['00', '01', '10']);
  expect((screen.getByRole('button', { name: '提交认知判定' }) as HTMLButtonElement).disabled).toBe(false);

  // 清空记录后立即撤销门槛
  fireEvent.click(screen.getByText('清空五种门记录'));
  expect((screen.getByRole('button', { name: '提交认知判定' }) as HTMLButtonElement).disabled).toBe(true);

  // 重新补齐五种门 14 项
  for (const gate of ['AND', 'OR', 'NOT', 'NAND', 'NOR']) {
    collect(gate, gate === 'NOT' ? ['0', '1'] : gate === 'AND' || gate === 'NAND' ? ['01', '10', '11'] : ['00', '01', '10']);
  }
  expect((screen.getByRole('button', { name: '提交认知判定' }) as HTMLButtonElement).disabled).toBe(false);

  // 4. 14 项齐备但认知选择错误（选 B）时只记 1 次错误、不完成
  fireEvent.click(screen.getByText(/与门只要有一个输入为1输出就是1/));
  fireEvent.click(screen.getByRole('button', { name: '提交认知判定' }));
  expect(recordWrongMock).toHaveBeenCalledWith('cognition');
  expect(recordWrongMock).toHaveBeenCalledTimes(1);
  expect(done).not.toHaveBeenCalled();

  // 改选正确 A 后需主动重新提交
  fireEvent.click(screen.getByText(/与门只有当所有输入全为1时输出才为1；/));
  expect(done).not.toHaveBeenCalled();

  // 5. 成功提交与证据核验
  fireEvent.click(screen.getByRole('button', { name: '提交认知判定' }));
  expect(done).toHaveBeenCalledTimes(1);
  const evidence = done.mock.calls[0][1];
  expect(Object.keys(evidence.gateReadings)).toHaveLength(14);
  expect(evidence.gateReadings['NAND:11'].output).toBe(false);
  expect(evidence.gateReadings['NOR:00'].output).toBe(true);

  // 成功后控件锁定且完成事件只发一次
  expect((screen.getByRole('button', { name: '判读输出 0 并记录' }) as HTMLButtonElement).disabled).toBe(true);
  expect(screen.queryByRole('button', { name: '提交认知判定' })).toBeNull();
  expect(done).toHaveBeenCalledTimes(1);
});

