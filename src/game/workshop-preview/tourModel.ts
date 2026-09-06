export type Point = { x: number; y: number };
export type TourAction =
  | 'ACCEPT'
  | 'TAKE'
  | 'OBSERVE'
  | 'POWER_OFF'
  | 'PLACE'
  | 'RESET';
export const initialTour = { step: 0, power: true, placed: false };
export function walkDestination(p: Point): Point {
  return {
    x: Math.min(94, Math.max(8, p.x)),
    y: Math.min(88, Math.max(70, p.y)),
  };
}
export function tourReducer(
  state: typeof initialTour,
  action: TourAction,
): typeof initialTour {
  if (action === 'RESET') return initialTour;
  const sequence: TourAction[] = [
    'ACCEPT',
    'TAKE',
    'OBSERVE',
    'POWER_OFF',
    'PLACE',
  ];
  if (sequence[state.step] !== action) return state;
  return {
    step: state.step + 1,
    power: action === 'POWER_OFF' ? false : state.power,
    placed: action === 'PLACE' || state.placed,
  };
}
