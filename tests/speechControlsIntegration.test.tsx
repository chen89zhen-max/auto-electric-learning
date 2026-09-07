// @vitest-environment jsdom
import React from 'react';
import { render, screen, fireEvent, act, cleanup } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { SpeechControls } from '@/src/components/visuals/SpeechControls';
import {
  getSpeechPreferences,
  updateSpeechPreferences,
  SPEECH_PREFERENCES_KEY,
} from '@/src/components/visuals/SpeechPreferences';

describe('Task 8: SpeechControls and Readability Integration', () => {
  const levelDirs = [
    'a02', 'a03', 'a04',
    'b01', 'b02', 'b03', 'b04',
    'c01', 'c02', 'c03',
    'd01', 'd02', 'd03', 'd04', 'd05',
    'e01', 'e02', 'e03', 'e04', 'e05', 'e06', 'e07',
  ];

  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();

    if (typeof SpeechSynthesisUtterance === 'undefined') {
      // @ts-expect-error Mocking SpeechSynthesisUtterance
      globalThis.SpeechSynthesisUtterance = class {
        text: string;
        lang = 'zh-CN';
        rate = 1;
        pitch = 1;
        volume = 1;
        voice: SpeechSynthesisVoice | null = null;
        onend: (() => void) | null = null;
        onerror: ((err: unknown) => void) | null = null;
        constructor(text: string) {
          this.text = text;
        }
      };
    }

    const mockSpeak = vi.fn();
    const mockCancel = vi.fn();
    window.speechSynthesis = {
      speak: mockSpeak,
      cancel: mockCancel,
      getVoices: () => [
        {
          name: 'Microsoft Xiaoxiao',
          lang: 'zh-CN',
          default: true,
          localService: false,
          voiceURI: 'Xiaoxiao',
        } as SpeechSynthesisVoice,
      ],
      speaking: false,
      paused: false,
      pending: false,
      onvoiceschanged: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
      pause: vi.fn(),
      resume: vi.fn(),
    } as unknown as SpeechSynthesis;
  });

  it('verifies all Experience components in a02-e07 actually mount SpeechControls and remove duplicate auto-read effects', () => {
    const levelsRoot = path.resolve(process.cwd(), 'src/levels');

    for (const lvl of levelDirs) {
      const dirPath = path.join(levelsRoot, lvl);
      const files = fs.readdirSync(dirPath);
      const expFile = files.find((f) => f.endsWith('Experience.tsx'));
      expect(expFile, `Experience component must exist in ${lvl}`).toBeDefined();

      const content = fs.readFileSync(path.join(dirPath, expFile!), 'utf-8');

      // 1. Must import SpeechControls
      expect(
        content.includes("from '@/src/components/visuals/SpeechControls'") ||
        content.includes('from "../../../components/visuals/SpeechControls"') ||
        content.includes('from "@/src/components/visuals/SpeechControls"'),
        `${lvl}/${expFile} must import SpeechControls`
      ).toBe(true);

      // 2. Must mount <SpeechControls
      expect(
        content.includes('<SpeechControls'),
        `${lvl}/${expFile} must mount <SpeechControls />`
      ).toBe(true);

      // 3. Must NOT have separate auto-speak useEffect calling speakText
      expect(
        content.includes('speakText('),
        `${lvl}/${expFile} must NOT call speakText directly in useEffect or buttons; SpeechControls handles it.`
      ).toBe(false);
    }
  });

  it('verifies Level 00, 01, A01 and BSceneFrame mount SpeechControls', () => {
    const cwd = process.cwd();
    const filesToCheck = [
      path.join(cwd, 'src/components/TutorPanel.tsx'),
      path.join(cwd, 'src/levels/level01/components/Level01Tutor.tsx'),
      path.join(cwd, 'src/levels/level02/components/Level02Tutor.tsx'),
      path.join(cwd, 'src/levels/chapterB/BSceneFrame.tsx'),
    ];

    for (const filePath of filesToCheck) {
      const content = fs.readFileSync(filePath, 'utf-8');
      expect(content.includes('<SpeechControls'), `${path.basename(filePath)} must mount <SpeechControls />`).toBe(true);
    }
  });

  it('has autoRead enabled by default: entering level and changing text automatically calls speech', async () => {
    const speakSpy = vi.spyOn(window.speechSynthesis, 'speak');

    const { rerender } = render(<SpeechControls currentText="初次进入实训工位" />);

    // Default preference check
    expect(getSpeechPreferences().autoRead).toBe(true);
    expect(speakSpy).toHaveBeenCalledTimes(1);

    // Change currentText
    rerender(<SpeechControls currentText="切换到第二步骤" />);
    expect(speakSpy).toHaveBeenCalledTimes(2);
  });

  it('does not auto-speak when autoRead is explicitly disabled', async () => {
    updateSpeechPreferences({ autoRead: false });
    const speakSpy = vi.spyOn(window.speechSynthesis, 'speak');

    const { rerender } = render(<SpeechControls currentText="步骤1：安全检查" />);
    expect(speakSpy).not.toHaveBeenCalled();

    rerender(<SpeechControls currentText="步骤2：测量搭铁端电压" />);
    expect(speakSpy).not.toHaveBeenCalled();
  });

  it('persists mute state to localStorage and blocks speech synthesis', async () => {
    render(<SpeechControls currentText="测量电路电阻" />);

    const muteBtn = screen.getByTestId('speech-mute-btn');
    fireEvent.click(muteBtn);

    // Verify localStorage has muted: true
    const stored = JSON.parse(localStorage.getItem(SPEECH_PREFERENCES_KEY) || '{}');
    expect(stored.muted).toBe(true);
    expect(getSpeechPreferences().muted).toBe(true);

    const speakSpy = vi.spyOn(window.speechSynthesis, 'speak');
    // Manual play while muted will unmute and play
    const playBtn = screen.getByTestId('speech-play-btn');
    fireEvent.click(playBtn);
    expect(speakSpy).toHaveBeenCalled();
  });

  it('shows non-blocking notification when speech synthesis is unsupported', async () => {
    const originalSynthesis = window.speechSynthesis;
    // @ts-expect-error Simulating missing synthesis
    delete window.speechSynthesis;

    render(<SpeechControls currentText="测量故障线路" />);

    const playBtn = screen.getByTestId('speech-play-btn');
    act(() => {
      fireEvent.click(playBtn);
    });

    const toast = screen.getByTestId('unsupported-speech-toast');
    expect(toast).toBeDefined();
    expect(toast.textContent).toContain('当前浏览器不支持语音合成');

    window.speechSynthesis = originalSynthesis;
  });

  it('verifies primary operation buttons in P4-P6 do NOT have text-xs', () => {
    const levelsRoot = path.resolve(process.cwd(), 'src/levels');
    const buttonViolations: string[] = [];

    for (const lvl of levelDirs) {
      const dirPath = path.join(levelsRoot, lvl);
      const files = fs.readdirSync(dirPath).filter((f) => f.endsWith('.tsx'));

      for (const file of files) {
        const content = fs.readFileSync(path.join(dirPath, file), 'utf-8');
        const lines = content.split('\n');

        lines.forEach((line, idx) => {
          if (
            line.includes('<button') ||
            line.includes('type="submit"') ||
            line.includes('onClick=')
          ) {
            const surrounding = lines.slice(Math.max(0, idx - 1), Math.min(lines.length, idx + 4)).join(' ');
            if (
              (surrounding.includes('提交') ||
                surrounding.includes('确认') ||
                surrounding.includes('下一步') ||
                surrounding.includes('开始测量') ||
                surrounding.includes('重置') ||
                surrounding.includes('开始排故')) &&
              surrounding.includes('text-xs') &&
              !surrounding.includes('text-sm') &&
              !surrounding.includes('text-base')
            ) {
              buttonViolations.push(`${lvl}/${file}:${idx + 1} -> ${surrounding.slice(0, 80)}`);
            }
          }
        });
      }
    }

    expect(buttonViolations).toEqual([]);
  });
});
