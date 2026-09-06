import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { SafetyRuleEngine } from '@/src/safety/SafetyRuleEngine';
import { createLevel01InitialState, level01Reducer } from '@/src/stores/level01Store';
import firstAidConfig from '@/src/levels/level01/firstAidConfig.json';

describe('P0 Baseline & Safety Teaching Refactor', () => {
  describe('1. ShockSimulationLab completion conditions & wording', () => {
    it('does not require touching live conductor to advance', () => {
      const source = readFileSync(
        resolve(__dirname, '../src/levels/level01/components/ShockSimulationLab.tsx'),
        'utf-8'
      );

      // Verify completion conditions are NOT dependent on touching live phase or touching both phases
      expect(source).not.toContain('const isExp0Done = exp0TouchedLive');
      expect(source).not.toContain('const isExp2Done = exp2TouchedBoth');

      // Verify no absolute 0mA or 0V safety guarantees
      expect(source).not.toContain('0 mA (安全隔离)');
      expect(source).not.toContain('0 mA (绝缘胶垫阻断对地回路 · 安全)');
      expect(source).not.toContain('ΔU = 0V (双脚等电位 · 安全脱险!)');
    });

    it('displays professional safety warnings against touching live conductors', () => {
      const source = readFileSync(
        resolve(__dirname, '../src/levels/level01/components/ShockSimulationLab.tsx'),
        'utf-8'
      );

      expect(source).toContain('严禁主动接触任何带电裸露导体');
      expect(source).toContain('严格停电、验电、挂锁挂牌');
    });
  });

  describe('2. E-STOP distinction & Isolation confirmation', () => {
    it('clearly distinguishes emergency stop from electrical isolation confirmation', () => {
      const sceneSource = readFileSync(
        resolve(__dirname, '../src/levels/level01/scenes/AccidentScene.tsx'),
        'utf-8'
      );

      // Verify E-STOP does not claim danger is fully eliminated without isolation verification
      expect(sceneSource).not.toContain('危险已排除，可安全施救');
      expect(sceneSource).toContain('急停');
      expect(sceneSource).toContain('彻底隔离');
    });

    it('evaluates safety rules before allowing person contact', () => {
      const engine = new SafetyRuleEngine();
      const blockedDecision = engine.evaluate({
        levelId: 'LEVEL_01',
        stage: 'ACCIDENT_DISCOVERY',
        powerState: 'ON',
        personContactRisk: true,
        operation: 'TOUCH_PERSON',
      });
      expect(blockedDecision.allowed).toBe(false);
      expect(blockedDecision.ruleId).toBe('SHOCK_DIRECT_CONTACT');

      let state = createLevel01InitialState(false, 1000);
      state = level01Reducer(state, { type: 'ACCEPT_WORK_ORDER' });
      state = level01Reducer(state, { type: 'TOUCH_PERSON' });
      expect(state.currentStage).toBe('ACCIDENT_DISCOVERY');
      expect(state.metrics.directContactAttempts).toBe(1);
    });
  });

  describe('3. Professional review status & release gates', () => {
    it('marks first aid configuration as pending professional review', () => {
      expect(firstAidConfig.reviewStatus).toBe('PENDING_PROFESSIONAL_REVIEW');
      expect(firstAidConfig.disclaimer).toBeTruthy();
    });

    it('renders review status notice in FirstAidScene and FireScene', () => {
      const firstAidSource = readFileSync(
        resolve(__dirname, '../src/levels/level01/scenes/FirstAidScene.tsx'),
        'utf-8'
      );
      expect(firstAidSource).toContain('教学与实操审定提示');
      expect(firstAidSource).toContain('PENDING_PROFESSIONAL_REVIEW');

      const fireSource = readFileSync(
        resolve(__dirname, '../src/levels/level01/scenes/FireScene.tsx'),
        'utf-8'
      );
      expect(fireSource).toContain('电气火情实训审定提示');
    });
  });

  describe('4. Lobby growth titles and wording compliance', () => {
    it('uses growth titles instead of qualification certification claims', () => {
      const lobbySource = readFileSync(
        resolve(__dirname, '../src/components/CourseMapLobby.tsx'),
        'utf-8'
      );

      // No qualification certification claims
      expect(lobbySource).not.toContain('技师认证Ⅰ');
      expect(lobbySource).not.toContain('技师认证Ⅱ');
      expect(lobbySource).not.toContain('技师认证 ·');
      expect(lobbySource).not.toContain('已认证');
      expect(lobbySource).not.toContain('符合中职汽车专业教学大纲标准');

      // Uses growth titles
      expect(lobbySource).toContain('见习学员');
      expect(lobbySource).toContain('安全实训学员');
      expect(lobbySource).toContain('回路搭建能手');
      expect(lobbySource).toContain('已完成');
      expect(lobbySource).toContain('课堂互动与技能训练平台');
    });

    it('does not display technician certification in GameShell topbar', () => {
      const shellSource = readFileSync(
        resolve(__dirname, '../src/app/GameShell.tsx'),
        'utf-8'
      );

      expect(shellSource).not.toContain('见习技师入职认证');
      expect(shellSource).not.toContain('见习技师 ·');
    });
  });
});
