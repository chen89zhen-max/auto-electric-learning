// @vitest-environment jsdom
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { LEVEL_CHECKPOINTS_LAYOUT } from '@/src/components/course-map/courseMapLayout';
import { VehicleElectricalMap } from '@/src/components/course-map/VehicleElectricalMap';
import type { CourseMapChapterModel } from '@/src/components/course-map/courseMapModel';

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

const chapters: CourseMapChapterModel[] = [{
  id: 'chapter_o', letter: 'O', num: '序章', title: '来到实训中心', description: '安全准入',
  state: 'current', completedCount: 0, totalCount: 2,
  levels: [{
    id: 'O00', chapterId: 'chapter_o', num: 'O00', title: '安全实训', subtitle: '安全准入',
    description: '实训安全', category: '安全', duration: '1课时', isElective: false,
    state: 'current', prerequisiteName: '', missingPrerequisiteNames: [], recommendedPriorLevelNames: [], attemptCount: 0,
  }, {
    id: 'O01', chapterId: 'chapter_o', num: 'O01', title: '应急处置', subtitle: '安全准入',
    description: '应急处置', category: '安全', duration: '1课时', isElective: false,
    state: 'available', prerequisiteName: 'O00', missingPrerequisiteNames: [], recommendedPriorLevelNames: [], attemptCount: 0,
  }],
}];

function renderReturningToNextLevel(reducedMotion: boolean) {
  vi.stubGlobal('matchMedia', () => ({ matches: reducedMotion, addEventListener: () => undefined, removeEventListener: () => undefined }));
  return render(<VehicleElectricalMap
    chapters={chapters}
    selectedChapterId="chapter_o"
    activeLevelId="O01"
    driveFromLevelId="O00"
    onSelectChapter={() => undefined}
    onPreviewChapter={() => undefined}
  />);
}

describe('U9 course-map integration', () => {
  it('offers keyboard-accessible checkpoint previews without moving the learning car', () => {
    const select = vi.fn();
    render(<VehicleElectricalMap chapters={chapters} selectedChapterId="chapter_o" activeLevelId="O00"
      onSelectChapter={() => undefined} onPreviewChapter={() => undefined} onSelectLevel={select} />);
    const checkpoint = screen.getByRole('button', { name: /O01.*应急处置/ });
    const car = screen.getByRole('button', { name: '查看仰望 U9 三维模型' });
    const originalPosition = car.style.left;
    checkpoint.focus();
    expect(document.activeElement).toBe(checkpoint);
    fireEvent.click(checkpoint);
    expect(select).toHaveBeenCalledWith(chapters[0].levels[1]);
    expect(car.style.left).toBe(originalPosition);
  });
  it('opens and closes the on-demand 3D viewer from the map car', () => {
    render(<VehicleElectricalMap
      chapters={chapters}
      selectedChapterId="chapter_o"
      activeLevelId="O00"
      onSelectChapter={() => undefined}
      onPreviewChapter={() => undefined}
    />);

    expect(screen.queryByRole('dialog', { name: '仰望 U9 三维模型' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: '查看仰望 U9 三维模型' }));
    expect(screen.getByRole('dialog', { name: '仰望 U9 三维模型' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '关闭三维模型' }));
    expect(screen.queryByRole('dialog', { name: '仰望 U9 三维模型' })).toBeNull();
  });

  it('drives from the completed checkpoint to the next one, then stops', () => {
    vi.useFakeTimers();
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => window.setTimeout(() => callback(performance.now()), 16));
    vi.stubGlobal('cancelAnimationFrame', (id: number) => window.clearTimeout(id));
    renderReturningToNextLevel(false);
    const car = screen.getByRole('button', { name: '查看仰望 U9 三维模型' });
    expect(car.getAttribute('data-motion')).toBe('driving');
    expect(car.style.left).toBe(`${LEVEL_CHECKPOINTS_LAYOUT[0].xPct}%`);
    act(() => { vi.advanceTimersByTime(5000); });
    expect(car.getAttribute('data-motion')).toBe('parked');
    expect(car.style.left).toBe(`${LEVEL_CHECKPOINTS_LAYOUT[1].xPct}%`);
  });

  it('moves directly to the target when reduced motion is requested', () => {
    renderReturningToNextLevel(true);
    const car = screen.getByRole('button', { name: '查看仰望 U9 三维模型' });
    expect(car.getAttribute('data-motion')).toBe('parked');
    expect(car.style.left).toBe(`${LEVEL_CHECKPOINTS_LAYOUT[1].xPct}%`);
  });
});
