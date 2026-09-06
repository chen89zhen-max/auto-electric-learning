'use client';

import React from 'react';
import { useLevel02Store } from '@/src/stores/level02Store';
import { ComponentInspectionScene } from './ComponentInspectionScene';
import { WorkbenchWiringScene } from './WorkbenchWiringScene';
import { OpenCircuitScene } from './OpenCircuitScene';
import { SwitchAndMappingScene } from './SwitchAndMappingScene';
import { CarChassisGroundScene } from './CarChassisGroundScene';
import { TransferChallengeScene } from './TransferChallengeScene';
import { Level02ReportScene } from './Level02ReportScene';

export function Level02Scene({ onReturnLobby }: { onReturnLobby: () => void }) {
  const { state } = useLevel02Store();

  switch (state.currentStage) {
    case 'WORK_ORDER':
    case 'COMPONENT_EXPLORE':
      return <ComponentInspectionScene />;

    case 'BUILD_DOUBLE_WIRE_CIRCUIT':
      return <WorkbenchWiringScene />;

    case 'OPEN_CIRCUIT_EXPERIMENT':
      return <OpenCircuitScene />;

    case 'SWITCH_EXPERIMENT':
    case 'SCHEMATIC_MAPPING':
      return <SwitchAndMappingScene />;

    case 'CHASSIS_GROUND_CHALLENGE':
      return <CarChassisGroundScene />;

    case 'TRANSFER_CHALLENGE':
      return <TransferChallengeScene />;

    case 'REFLECTION':
    case 'COMPLETE':
      return <Level02ReportScene onReturnLobby={onReturnLobby} />;

    default:
      return <ComponentInspectionScene />;
  }
}
