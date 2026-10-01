export const MAP_WIDTH = 1376;
export const MAP_HEIGHT = 768;
export const CAR_CAMERA_ELEVATION = 38;
export interface RoutePose { x: number; y: number; heading: number }
type Point = readonly [number, number];
type Cubic = readonly [Point, Point, Point, Point];

// One calibrated road, from O entrance to the single F gate exit. All map coordinates
// refer to the same 1376 × 768 drawing plane (course-map-25d-v2.png).
const START: Point = [195, 254];
const CONTROLS: readonly (readonly [Point, Point, Point])[] = [
  [[237, 278], [285, 280], [340, 264]],
  [[410, 245], [475, 221], [550, 222]],
  [[635, 213], [726, 231], [769, 258]],
  [[809, 282], [812, 315], [765, 339]],
  [[702, 371], [616, 366], [529, 371]],
  [[425, 376], [337, 393], [280, 426]],
  [[223, 456], [191, 494], [207, 530]],
  [[223, 572], [277, 598], [337, 610]],
  [[398, 622], [460, 617], [512, 600]],
  [[582, 577], [646, 522], [704, 478]],
  [[752, 447], [785, 426], [842, 432]],
  [[911, 437], [957, 460], [982, 510]],
  [[996, 549], [1032, 575], [1080, 591]],
  [[1133, 612], [1185, 634], [1220, 657]],
  [[1255, 674], [1295, 691], [1338, 712]],
];
const cubics: Cubic[] = CONTROLS.map((points, index) => [index ? CONTROLS[index - 1][2] : START, ...points]);
export const PROVING_TRACK_PATH = `M ${START.join(' ')} ` + CONTROLS.map(points => `C ${points.map(p => p.join(' ')).join(', ')}`).join(' ');

function evaluate(c: Cubic, t: number): RoutePose {
  const u = 1 - t;
  const x = u ** 3 * c[0][0] + 3 * u ** 2 * t * c[1][0] + 3 * u * t ** 2 * c[2][0] + t ** 3 * c[3][0];
  const y = u ** 3 * c[0][1] + 3 * u ** 2 * t * c[1][1] + 3 * u * t ** 2 * c[2][1] + t ** 3 * c[3][1];
  const dx = 3 * u ** 2 * (c[1][0] - c[0][0]) + 6 * u * t * (c[2][0] - c[1][0]) + 3 * t ** 2 * (c[3][0] - c[2][0]);
  const dy = 3 * u ** 2 * (c[1][1] - c[0][1]) + 6 * u * t * (c[2][1] - c[1][1]) + 3 * t ** 2 * (c[3][1] - c[2][1]);
  return { x, y, heading: Math.atan2(dy, dx) * 180 / Math.PI };
}

const samples: { distance: number; segment: number; t: number }[] = [{ distance: 0, segment: 0, t: 0 }];
let previous = evaluate(cubics[0], 0), length = 0;
for (let segment = 0; segment < cubics.length; segment++) {
  for (let step = 1; step <= 300; step++) {
    const t = step / 300, point = evaluate(cubics[segment], t);
    length += Math.hypot(point.x - previous.x, point.y - previous.y);
    samples.push({ distance: length, segment, t });
    previous = point;
  }
}
export const ROUTE_LENGTH = length;

export function getRoutePose(distance: number): RoutePose {
  const clamped = Math.max(0, Math.min(ROUTE_LENGTH, Number.isFinite(distance) ? distance : 0));
  let low = 0, high = samples.length - 1;
  while (low < high) {
    const mid = (low + high) >> 1;
    if (samples[mid].distance < clamped) low = mid + 1;
    else high = mid;
  }
  const after = samples[low], before = samples[Math.max(0, low - 1)];
  const ratio = after.distance === before.distance ? 0 : (clamped - before.distance) / (after.distance - before.distance);
  const startT = before.segment === after.segment ? before.t : 0;
  return evaluate(cubics[after.segment], startT + (after.t - startT) * ratio);
}

export function getCarSpriteIndex(screenHeading: number): number {
  const angle = screenHeading * Math.PI / 180;
  // Invert camera ground compression before selecting model yaw. No image-plane rotation.
  const groundAngle = Math.atan2(Math.sin(angle) / Math.sin(CAR_CAMERA_ELEVATION * Math.PI / 180), Math.cos(angle));
  return ((Math.round(groundAngle / (Math.PI / 8)) % 16) + 16) % 16;
}
