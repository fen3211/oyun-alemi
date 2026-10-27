export interface SceneState {
  cameraZ: number;
  cameraX: number;
  cameraY: number;
  portalScale: number;
  portalRotation: number;
  opening: number;
  atmosphere: number;
  chapter: number;
}

const keyframes: SceneState[] = [
  { cameraZ: 11, cameraX: 0, cameraY: 0, portalScale: 0.82, portalRotation: 0, opening: 0, atmosphere: 0, chapter: 0 },
  { cameraZ: -2, cameraX: -1.2, cameraY: 0.4, portalScale: 1.35, portalRotation: Math.PI * 0.5, opening: 1, atmosphere: 0.15, chapter: 1 },
  { cameraZ: -5, cameraX: 1.5, cameraY: 1, portalScale: 0.85, portalRotation: Math.PI, opening: 0.65, atmosphere: 0.3, chapter: 2 },
  { cameraZ: -8, cameraX: -0.5, cameraY: -0.5, portalScale: 1.15, portalRotation: Math.PI * 1.5, opening: 1, atmosphere: 0.5, chapter: 3 },
  { cameraZ: 12, cameraX: 0, cameraY: 0.8, portalScale: 0.9, portalRotation: Math.PI * 2, opening: 0.3, atmosphere: 0.25, chapter: 4 },
  { cameraZ: 13, cameraX: 0, cameraY: 0, portalScale: 0.8, portalRotation: Math.PI * 2.5, opening: 0, atmosphere: 0, chapter: 5 },
];

const mix = (from: number, to: number, amount: number) => from + (to - from) * amount;

export function sampleScroll(progress: number): SceneState {
  const safeProgress = Number.isNaN(progress) ? 0 : progress;
  const clamped = Math.min(1, Math.max(0, safeProgress));
  const position = clamped * (keyframes.length - 1);
  const index = Math.min(keyframes.length - 2, Math.floor(position));
  const amount = position - index;
  const eased = amount * amount * (3 - 2 * amount);
  const from = keyframes[index];
  const to = keyframes[index + 1];

  return {
    cameraZ: mix(from.cameraZ, to.cameraZ, eased),
    cameraX: mix(from.cameraX, to.cameraX, eased),
    cameraY: mix(from.cameraY, to.cameraY, eased),
    portalScale: mix(from.portalScale, to.portalScale, eased),
    portalRotation: mix(from.portalRotation, to.portalRotation, eased),
    opening: mix(from.opening, to.opening, eased),
    atmosphere: mix(from.atmosphere, to.atmosphere, eased),
    chapter: position,
  };
}
