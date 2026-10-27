import { describe, expect, it } from 'vitest';
import { sampleScroll } from './scrollModel';

const start = {
  cameraZ: 11,
  cameraX: 0,
  cameraY: 0,
  portalScale: 0.82,
  portalRotation: 0,
  opening: 0,
  atmosphere: 0,
  chapter: 0,
};

const end = {
  cameraZ: 13,
  cameraX: 0,
  cameraY: 0,
  portalScale: 0.8,
  portalRotation: Math.PI * 2.5,
  opening: 0,
  atmosphere: 0,
  chapter: 5,
};

describe('sampleScroll', () => {
  it('returns the hero and retreat states at the endpoints', () => {
    expect(sampleScroll(0)).toEqual(start);
    expect(sampleScroll(1)).toEqual(end);
  });

  it('interpolates the midpoint between feature two and three', () => {
    expect(sampleScroll(0.5)).toEqual({
      cameraZ: -6.5,
      cameraX: 0.5,
      cameraY: 0.25,
      portalScale: 1,
      portalRotation: Math.PI * 1.25,
      opening: 0.825,
      atmosphere: 0.4,
      chapter: 2.5,
    });
  });

  it('uses smoothstep interpolation between keyframes', () => {
    expect(sampleScroll(0.05).cameraZ).toBe(8.96875);
  });

  it('clamps out-of-range progress', () => {
    expect(sampleScroll(-10)).toEqual(start);
    expect(sampleScroll(10)).toEqual(end);
  });

  it('treats NaN progress as zero', () => {
    expect(sampleScroll(Number.NaN)).toEqual(start);
  });

  it('returns finite values throughout the timeline', () => {
    for (let progress = -0.1; progress <= 1.1; progress += 0.005) {
      expect(Object.values(sampleScroll(progress)).every(Number.isFinite)).toBe(true);
    }
  });

  it('approaches and crosses the portal during the initial chapter', () => {
    let previous = sampleScroll(0).cameraZ;
    for (let progress = 0.01; progress <= 0.2; progress += 0.01) {
      const current = sampleScroll(progress).cameraZ;
      expect(current).toBeLessThan(previous);
      previous = current;
    }
    expect(sampleScroll(0.2).cameraZ).toBeLessThan(0);
    expect(sampleScroll(0.2).opening).toBe(1);
  });

  it('derives continuous chapters from progress', () => {
    for (let chapter = 0; chapter < 5; chapter += 1) {
      expect(sampleScroll(chapter / 5).chapter).toBe(chapter);
      expect(sampleScroll((chapter + 1) / 5 - 0.0001).chapter).toBeCloseTo(chapter + 0.9995);
    }
    expect(sampleScroll(1).chapter).toBe(5);
  });
});
