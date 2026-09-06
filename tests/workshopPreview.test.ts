import { describe, expect, it } from 'vitest';
import {
  initialTour,
  tourReducer,
  walkDestination,
} from '@/src/game/workshop-preview/tourModel';

describe('车间样板的空间操作和入职流程', () => {
  it('只能在步行区移动，不能穿入维修车辆', () => {
    expect(walkDestination({ x: 50, y: 30 })).toEqual({ x: 50, y: 70 });
    expect(walkDestination({ x: -10, y: 99 })).toEqual({ x: 8, y: 88 });
  });
  it('未看工单不能跳过准备直接完成台架', () => {
    expect(tourReducer(initialTour, 'POWER_OFF')).toEqual(initialTour);
    expect(tourReducer(initialTour, 'PLACE')).toEqual(initialTour);
  });
  it('工单、领取、观察、断电、放置才完成；重新体验清空本次样板', () => {
    let state = initialTour;
    for (const action of [
      'ACCEPT',
      'TAKE',
      'OBSERVE',
      'POWER_OFF',
      'PLACE',
    ] as const)
      state = tourReducer(state, action);
    expect(state.step).toBe(5);
    expect(state.power).toBe(false);
    expect(state.placed).toBe(true);
    expect(tourReducer(state, 'RESET')).toEqual(initialTour);
  });
});
