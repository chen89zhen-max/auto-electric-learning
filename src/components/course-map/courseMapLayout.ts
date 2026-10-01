import type { ChapterId } from '@/src/courses/registry';
import { getRoutePose, MAP_HEIGHT, MAP_WIDTH, ROUTE_LENGTH } from './courseMapGeometry';
export { PROVING_TRACK_PATH } from './courseMapGeometry';

export interface ChapterLayoutConfig {
  x: number;
  y: number;
  svgX: number;
  svgY: number;
  doorX: number;
  doorY: number;
  windowPolygon: string;
  systemLabel: string;
  accent: 'green' | 'cyan' | 'amber' | 'blue' | 'violet';
}
function building(labelX: number, labelY: number, doorX: number, doorY: number,
  windowPolygon: string, systemLabel: string, accent: ChapterLayoutConfig['accent']): ChapterLayoutConfig {
  return { x: labelX / MAP_WIDTH * 100, y: labelY / MAP_HEIGHT * 100,
    svgX: labelX, svgY: labelY, doorX, doorY, windowPolygon, systemLabel, accent };
}
// Roof labels and facade windows are individually calibrated to the backdrop.
export const COURSE_MAP_LAYOUT: Record<ChapterId, ChapterLayoutConfig> = {
  chapter_o: building(176, 151, 204, 247, '77,199 177,238 273,204 273,243 175,271 77,233', '安全准入入口', 'green'),
  chapter_a: building(455, 109, 463, 195, '380,153 545,135 547,189 383,202', '12V基础回路实训室', 'cyan'),
  chapter_b: building(754, 126, 728, 213, '666,158 743,190 838,174 838,213 744,235 666,199', '负载控制与电路规律室', 'amber'),
  chapter_c: building(100, 319, 174, 389, '55,334 128,361 232,328 234,369 129,404 55,379', '故障诊断与压降分析室', 'blue'),
  chapter_d: building(465, 469, 444, 528, '333,454 421,484 516,449 517,490 423,538 334,502', '继电器电机与电磁实验室', 'cyan'),
  chapter_e: building(850, 555, 855, 574, '789,504 860,530 934,510 933,548 863,581 789,552', '传感器与电子控制实训室', 'violet'),
  chapter_f: building(1247, 519, 1220, 657, '', '综合交付终点', 'blue'),
};
export interface LevelCheckpointLayout {
  levelId: string;
  chapterId: ChapterId;
  distance: number;
  xPct: number;
  yPct: number;
  svgX: number;
  svgY: number;
  headingDeg: number;
  label: string;
}
// Only route distance is authored; position, percentages and heading are derived.
const stops: readonly [string, ChapterId, number][] = [
  ['O00', 'chapter_o', .012], ['O01', 'chapter_o', .043],
  ['A01', 'chapter_a', .076], ['A02', 'chapter_a', .107], ['A03', 'chapter_a', .138], ['A04', 'chapter_a', .169],
  ['B01', 'chapter_b', .201], ['B02', 'chapter_b', .233], ['B03', 'chapter_b', .265],
  ['B04', 'chapter_b', .297], ['B05', 'chapter_b', .329], ['B06', 'chapter_b', .361],
  ['C01', 'chapter_c', .398], ['C02', 'chapter_c', .435], ['C03', 'chapter_c', .472],
  ['D01', 'chapter_d', .506], ['D02', 'chapter_d', .540], ['D03', 'chapter_d', .574],
  ['D04', 'chapter_d', .608], ['D05', 'chapter_d', .642],
  ['E01', 'chapter_e', .676], ['E02', 'chapter_e', .710], ['E03', 'chapter_e', .744],
  ['E04', 'chapter_e', .778], ['E05', 'chapter_e', .812], ['E06', 'chapter_e', .846], ['E07', 'chapter_e', .880],
  ['F01', 'chapter_f', .914],
];
export const LEVEL_CHECKPOINTS_LAYOUT: LevelCheckpointLayout[] = stops.map(([levelId, chapterId, fraction]) => {
  const distance = ROUTE_LENGTH * fraction, pose = getRoutePose(distance);
  return { levelId, chapterId, distance, xPct: pose.x / MAP_WIDTH * 100, yPct: pose.y / MAP_HEIGHT * 100,
    svgX: pose.x, svgY: pose.y, headingDeg: pose.heading, label: levelId };
});
