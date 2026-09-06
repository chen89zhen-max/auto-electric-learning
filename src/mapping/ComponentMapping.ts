export interface ComponentMapEntry {
  sceneObjectId: string;
  componentId: string;
  schematicSymbolId: string;
  name: string;
  briefExplanation: string;
}

export const Level02ComponentMappings: ComponentMapEntry[] = [
  {
    sceneObjectId: 'obj-battery',
    componentId: 'BAT1',
    schematicSymbolId: 'sym-battery',
    name: '12V蓄电池',
    briefExplanation: '给电路提供电能。',
  },
  {
    sceneObjectId: 'obj-fuse',
    componentId: 'F1',
    schematicSymbolId: 'sym-fuse',
    name: '10A熔断器',
    briefExplanation: '用于线路保护。',
  },
  {
    sceneObjectId: 'obj-switch',
    componentId: 'S1',
    schematicSymbolId: 'sym-switch',
    name: '检修灯开关',
    briefExplanation: '可以控制线路通断。',
  },
  {
    sceneObjectId: 'obj-lamp',
    componentId: 'L1',
    schematicSymbolId: 'sym-lamp',
    name: '12V检修灯',
    briefExplanation: '工作以后把电能转换成光。',
  },
  {
    sceneObjectId: 'obj-ground',
    componentId: 'GND_CHASSIS',
    schematicSymbolId: 'sym-ground',
    name: '车身搭铁',
    briefExplanation: '利用金属车身作为电流返回电源的路径。',
  },
];

export class ComponentMappingManager {
  static getBySceneObjectId(sceneObjectId: string): ComponentMapEntry | undefined {
    return Level02ComponentMappings.find((m) => m.sceneObjectId === sceneObjectId);
  }

  static getByComponentId(componentId: string): ComponentMapEntry | undefined {
    return Level02ComponentMappings.find((m) => m.componentId === componentId);
  }

  static getBySchematicSymbolId(symbolId: string): ComponentMapEntry | undefined {
    return Level02ComponentMappings.find((m) => m.schematicSymbolId === symbolId);
  }
}
