import { describe, it, expect, vi } from 'vitest';
import {
  evaluateMeterGuard,
  executeWithMeterGuard,
  type MeterGuardInput,
  type MeterGuardResult,
} from '../src/game/instruments/meterGuard';

describe('Multimeter Safety Guard Suite (Task 4)', () => {
  interface TableTestCase {
    name: string;
    input: MeterGuardInput<string>;
    expectedAllowed: boolean;
    expectedCode?: 'OFF' | 'WRONG_MODE' | 'WRONG_JACK' | 'PROBE_MISSING' | 'LIVE_RESISTANCE' | 'DANGEROUS_BRIDGE';
  }

  const tableCases: TableTestCase[] = [
    {
      name: 'blocks when meter is turned OFF',
      input: {
        currentMode: 'OFF',
        expectedMode: 'DCV_20',
        blackJackOk: true,
        redJackOk: true,
        probesPlaced: true,
        circuitPowered: true,
        resistanceMeasurement: false,
        dangerousBridge: false,
      },
      expectedAllowed: false,
      expectedCode: 'OFF',
    },
    {
      name: 'blocks when dial mode is wrong (e.g. DCV_2 instead of DCV_20)',
      input: {
        currentMode: 'DCV_2',
        expectedMode: 'DCV_20',
        blackJackOk: true,
        redJackOk: true,
        probesPlaced: true,
        circuitPowered: true,
        resistanceMeasurement: false,
        dangerousBridge: false,
      },
      expectedAllowed: false,
      expectedCode: 'WRONG_MODE',
    },
    {
      name: 'blocks when red probe jack is wrong (e.g. plugged into A instead of V_OHM)',
      input: {
        currentMode: 'DCV_20',
        expectedMode: 'DCV_20',
        blackJackOk: true,
        redJackOk: false,
        probesPlaced: true,
        circuitPowered: true,
        resistanceMeasurement: false,
        dangerousBridge: false,
      },
      expectedAllowed: false,
      expectedCode: 'WRONG_JACK',
    },
    {
      name: 'blocks when black probe jack is not in COM',
      input: {
        currentMode: 'DCV_20',
        expectedMode: 'DCV_20',
        blackJackOk: false,
        redJackOk: true,
        probesPlaced: true,
        circuitPowered: true,
        resistanceMeasurement: false,
        dangerousBridge: false,
      },
      expectedAllowed: false,
      expectedCode: 'WRONG_JACK',
    },
    {
      name: 'blocks when probes are not placed on target test terminals',
      input: {
        currentMode: 'DCV_20',
        expectedMode: 'DCV_20',
        blackJackOk: true,
        redJackOk: true,
        probesPlaced: false,
        circuitPowered: true,
        resistanceMeasurement: false,
        dangerousBridge: false,
      },
      expectedAllowed: false,
      expectedCode: 'PROBE_MISSING',
    },
    {
      name: 'blocks resistance/continuity measurement on a live powered circuit',
      input: {
        currentMode: 'OHM_200',
        expectedMode: 'OHM_200',
        blackJackOk: true,
        redJackOk: true,
        probesPlaced: true,
        circuitPowered: true,
        resistanceMeasurement: true,
        dangerousBridge: false,
      },
      expectedAllowed: false,
      expectedCode: 'LIVE_RESISTANCE',
    },
    {
      name: 'blocks dangerous bridge across battery terminals (ammeter direct short)',
      input: {
        currentMode: 'DCA_20',
        expectedMode: 'DCA_20',
        blackJackOk: true,
        redJackOk: true,
        probesPlaced: true,
        circuitPowered: true,
        resistanceMeasurement: false,
        dangerousBridge: true,
      },
      expectedAllowed: false,
      expectedCode: 'DANGEROUS_BRIDGE',
    },
    {
      name: 'allows clean voltage measurement when all conditions are satisfied',
      input: {
        currentMode: 'DCV_20',
        expectedMode: 'DCV_20',
        blackJackOk: true,
        redJackOk: true,
        probesPlaced: true,
        circuitPowered: true,
        resistanceMeasurement: false,
        dangerousBridge: false,
      },
      expectedAllowed: true,
    },
    {
      name: 'allows clean resistance measurement when circuit is unpowered and isolated',
      input: {
        currentMode: 'OHM_200',
        expectedMode: 'OHM_200',
        blackJackOk: true,
        redJackOk: true,
        probesPlaced: true,
        circuitPowered: false,
        resistanceMeasurement: true,
        dangerousBridge: false,
      },
      expectedAllowed: true,
    },
    {
      name: 'allows any mode when expectedMode is an array of valid modes',
      input: {
        currentMode: 'CAP_F',
        expectedMode: ['CAP_F', 'OHM_20K'],
        blackJackOk: true,
        redJackOk: true,
        probesPlaced: true,
        circuitPowered: false,
        resistanceMeasurement: true,
        dangerousBridge: false,
      },
      expectedAllowed: true,
    },
  ];

  it.each(tableCases)('evaluateMeterGuard: $name', ({ input, expectedAllowed, expectedCode }) => {
    const result = evaluateMeterGuard(input);
    expect(result.allowed).toBe(expectedAllowed);
    if (!expectedAllowed) {
      const blocked = result as Extract<MeterGuardResult, { allowed: false }>;
      expect(blocked.code).toBe(expectedCode);
      expect(blocked.message).toBeTruthy();
    }
  });

  it('guarantees caller callback is NEVER executed when guard.allowed is false', () => {
    for (const tc of tableCases.filter((c) => !c.expectedAllowed)) {
      const actionSpy = vi.fn(() => 'MEASUREMENT_DONE');
      const blockedSpy = vi.fn();

      const execResult = executeWithMeterGuard(tc.input, actionSpy, blockedSpy);

      expect(execResult.allowed).toBe(false);
      expect(actionSpy).not.toHaveBeenCalled();
      expect(blockedSpy).toHaveBeenCalledTimes(1);
      expect((execResult as { guard: { code: string } }).guard.code).toBe(tc.expectedCode);
    }
  });

  it('executes caller callback and returns result when guard.allowed is true', () => {
    const actionSpy = vi.fn(() => '12.45V');
    const blockedSpy = vi.fn();

    const cleanInput: MeterGuardInput<string> = {
      currentMode: 'DCV_20',
      expectedMode: 'DCV_20',
      blackJackOk: true,
      redJackOk: true,
      probesPlaced: true,
      circuitPowered: true,
      resistanceMeasurement: false,
      dangerousBridge: false,
    };

    const execResult = executeWithMeterGuard(cleanInput, actionSpy, blockedSpy);

    expect(execResult.allowed).toBe(true);
    expect(actionSpy).toHaveBeenCalledTimes(1);
    expect(blockedSpy).not.toHaveBeenCalled();
    expect((execResult as { result: string }).result).toBe('12.45V');
  });
});
