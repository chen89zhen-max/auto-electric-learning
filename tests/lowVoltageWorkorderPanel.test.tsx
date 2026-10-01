// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { LowVoltageWorkorderPanel } from '@/src/components/course-map/LowVoltageWorkorderPanel';

afterEach(cleanup);

describe('LowVoltageWorkorderPanel', () => {
  it('提供五张公开样本练习工单，不显示无法独立评分的考核模式', () => {
    render(<LowVoltageWorkorderPanel />);
    expect(screen.getByText('五张低压故障练习工单')).toBeTruthy();
    expect(screen.getByRole('button', { name: /WO-D6-CHARGE/ })).toBeTruthy();
    expect(screen.getByText(/练习提示：/)).toBeTruthy();
    expect(screen.getByText(/本页练习记录不会保留/)).toBeTruthy();
    expect(screen.queryByRole('button', { name: '考核模式' })).toBeNull();
  });

  it('records the lamp workorder in order and only passes after diagnosis, repair and all retests', () => {
    render(<LowVoltageWorkorderPanel />);
    fireEvent.click(screen.getByRole('button', { name: /记录：熔断器输出端/ }));
    fireEvent.click(screen.getByRole('button', { name: /记录：继电器负载输出端/ }));
    fireEvent.click(screen.getByRole('button', { name: /记录：灯泡搭铁端带载压降/ }));
    fireEvent.click(screen.getByRole('button', { name: '灯泡搭铁开路／接触不良' }));
    fireEvent.click(screen.getByRole('button', { name: '修复搭铁端并防腐紧固' }));
    fireEvent.click(screen.getByLabelText('近光灯正常点亮'));
    fireEvent.click(screen.getByLabelText('远光灯正常切换'));
    fireEvent.click(screen.getByRole('button', { name: '提交功能复测' }));
    expect(screen.getByText('本次练习流程已完成')).toBeTruthy();
    expect(screen.getByText(/D2_LAMP_VARIATION_V1/)).toBeTruthy();
  });
});
