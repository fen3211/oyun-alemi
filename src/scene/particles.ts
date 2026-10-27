import {
  AdditiveBlending,
  BufferGeometry,
  Color,
  Float32BufferAttribute,
  Points,
  ShaderMaterial,
  Vector2,
} from 'three';

export interface ParticleField {
  points: Points<BufferGeometry, ShaderMaterial>;
  update(time: number): void;
  setPointer(pointer: Vector2, strength: number): void;
  dispose(): void;
}

function seededRandom(seed: number) {
  let value = seed >>> 0;
  return () => {
    value += 0x6d2b79f5;
    let result = value;
    result = Math.imul(result ^ (result >>> 15), result | 1);
    result ^= result + Math.imul(result ^ (result >>> 7), result | 61);
    return ((result ^ (result >>> 14)) >>> 0) / 4294967296;
  };
}

export function createParticleField(count: number): ParticleField {
  const random = seededRandom(0x0a1e51);
  const positions: number[] = [];
  const colors: number[] = [];
  const sizes: number[] = [];
  const phases: number[] = [];
  const color = new Color();

  for (let index = 0; index < count; index += 1) {
    const region = random();
    const angle = random() * Math.PI * 2;
    const radius = 2.4 + Math.pow(random(), 1.65) * 10;
    let x = Math.cos(angle) * radius;
    let y = Math.sin(angle) * radius * 0.68;
    let z = 12 - random() * 64;

    if (region < 0.24) {
      z = (random() - 0.5) * 9;
    } else if (region < 0.45) {
      x += 3.5;
      y += 0.8;
      z = -16 + (random() - 0.5) * 8;
    } else if (region < 0.66) {
      z = -26 + (random() - 0.5) * 7;
    } else if (region < 0.86) {
      x -= 1.5;
      z = -34 + (random() - 0.5) * 8;
    } else {
      const wideRadius = 8 + random() * 15;
      x = Math.cos(angle) * wideRadius;
      y = Math.sin(angle) * wideRadius * 0.72;
    }

    positions.push(x, y, z);

    const tint = random();
    if (tint < 0.018) {
      color.setHex(0xc5ff4a).multiplyScalar(1.35);
      sizes.push(1.2 + random() * 1.7);
    } else if (tint < 0.22) {
      color.setHex(0xbfd8ff).multiplyScalar(0.45 + random() * 0.65);
      sizes.push(0.65 + random() * 1.5);
    } else {
      color.setHex(0x7955ff).multiplyScalar(0.2 + random() * 0.55);
      sizes.push(0.55 + random() * 1.35);
    }

    colors.push(color.r, color.g, color.b);
    phases.push(random() * Math.PI * 2);
  }

  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new Float32BufferAttribute(colors, 3));
  geometry.setAttribute('aSize', new Float32BufferAttribute(sizes, 1));
  geometry.setAttribute('aPhase', new Float32BufferAttribute(phases, 1));
  geometry.computeBoundingSphere();

  const material = new ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uPixelRatio: { value: 1 },
      uPointer: { value: new Vector2(0, 0) },
      uPointerStrength: { value: 0 },
      uAspect: { value: 1 },
    },
    vertexShader: `
      attribute float aSize;
      attribute float aPhase;
      attribute vec3 color;
      uniform float uTime;
      uniform float uPixelRatio;
      uniform vec2 uPointer;
      uniform float uPointerStrength;
      uniform float uAspect;
      varying vec3 vColor;
      varying float vFade;
      varying float vCursor;

      void main() {
        vec3 displaced = position;
        displaced.x += sin(uTime * 0.11 + aPhase) * 0.075;
        displaced.y += cos(uTime * 0.08 + aPhase * 1.7) * 0.065;
        vec4 viewPosition = modelViewMatrix * vec4(displaced, 1.0);
        float depth = max(0.1, -viewPosition.z);
        vec4 clipPosition = projectionMatrix * viewPosition;

        vec2 ndc = clipPosition.xy / max(0.001, clipPosition.w);
        vec2 delta = uPointer - ndc;
        delta.x *= uAspect;
        float distanceToPointer = length(delta);
        vec2 direction = distanceToPointer > 0.0001 ? delta / distanceToPointer : vec2(0.0);
        float force = exp(-distanceToPointer * distanceToPointer * 3.2) * uPointerStrength;
        vec2 tangent = vec2(-direction.y, direction.x);
        vec2 pull = direction * 0.1 + tangent * 0.055;
        clipPosition.xy += pull * force * clipPosition.w;

        gl_Position = clipPosition;
        gl_PointSize = clamp(
          aSize * uPixelRatio * (42.0 / depth) * (1.0 + force * 0.9),
          0.65,
          6.8
        );
        vColor = color;
        vFade = 0.28 + 0.72 * (1.0 - smoothstep(12.0, 72.0, depth));
        vCursor = force;
      }
    `,
    fragmentShader: `
      varying vec3 vColor;
      varying float vFade;
      varying float vCursor;

      void main() {
        float distanceToCenter = length(gl_PointCoord - 0.5);
        float alpha = (1.0 - smoothstep(0.08, 0.5, distanceToCenter)) * vFade;
        alpha += vCursor * 0.28 * (1.0 - smoothstep(0.0, 0.5, distanceToCenter));
        if (alpha < 0.015) discard;
        gl_FragColor = vec4(vColor, alpha * 0.72);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
  });

  const points = new Points(geometry, material);
  points.frustumCulled = false;

  return {
    points,
    update(time: number) {
      material.uniforms.uTime.value = time;
    },
    setPointer(pointer: Vector2, strength: number) {
      material.uniforms.uPointer.value.copy(pointer);
      material.uniforms.uPointerStrength.value = strength;
    },
    dispose() {
      geometry.dispose();
      material.dispose();
    },
  };
}
