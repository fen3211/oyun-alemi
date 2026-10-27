import {
  ACESFilmicToneMapping,
  AmbientLight,
  BufferGeometry,
  Color,
  DirectionalLight,
  EdgesGeometry,
  Float32BufferAttribute,
  FogExp2,
  Group,
  IcosahedronGeometry,
  InstancedMesh,
  LineLoop,
  LineSegments,
  Mesh,
  Object3D,
  OctahedronGeometry,
  PerspectiveCamera,
  PMREMGenerator,
  PointLight,
  Scene,
  SRGBColorSpace,
  StaticDrawUsage,
  TorusGeometry,
  Vector2,
  Vector3,
  WebGLRenderer,
} from 'three';
import type { Material } from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { createMaterials } from './materials';
import { createParticleField } from './particles';
import type { SceneState } from './scrollModel';

export interface UniverseScene {
  update(state: SceneState, time: number): void;
  resize(): void;
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

function deformGeometry<T extends BufferGeometry>(geometry: T, seed: number, amplitude: number): T {
  const position = geometry.getAttribute('position');
  for (let index = 0; index < position.count; index += 1) {
    const x = position.getX(index);
    const y = position.getY(index);
    const z = position.getZ(index);
    const length = Math.max(0.0001, Math.hypot(x, y, z));
    const nx = x / length;
    const ny = y / length;
    const nz = z / length;
    const wave = 1
      + Math.sin(nx * 4.2 + seed) * Math.cos(ny * 3.7 - seed) * amplitude
      + Math.sin(nz * 5.1 + ny * 2.4 + seed * 0.7) * amplitude * 0.45;
    position.setXYZ(index, x * wave, y * wave, z * wave);
  }
  position.needsUpdate = true;
  geometry.computeVertexNormals();
  return geometry;
}

function createShellHalf(side: number): BufferGeometry {
  const source = new IcosahedronGeometry(2.2, 2);
  const position = source.getAttribute('position');
  const vertices: number[] = [];

  for (let index = 0; index < position.count; index += 3) {
    const centerX = (position.getX(index) + position.getX(index + 1) + position.getX(index + 2)) / 3;
    if (centerX * side < -0.055) continue;

    for (let corner = 0; corner < 3; corner += 1) {
      const vertex = index + corner;
      const x = position.getX(vertex);
      const y = position.getY(vertex);
      const z = position.getZ(vertex);
      const length = Math.max(0.0001, Math.hypot(x, y, z));
      const nx = x / length;
      const ny = y / length;
      const nz = z / length;
      const wave = 1
        + Math.sin(nx * 4.6 + ny * 2.2) * Math.cos(nz * 3.8) * 0.1
        + Math.sin(ny * 6.2 + nz * 2.6) * 0.045;
      const fissure = side * Math.max(0, 1 - Math.abs(nx) * 3) * 0.11;
      vertices.push(x * wave * 0.9 + fissure, y * wave * 1.14, z * wave * 0.68);
    }
  }

  source.dispose();
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(vertices, 3));
  geometry.computeVertexNormals();
  return geometry;
}

function createWarpedTorus(radius: number, tube: number, seed: number): BufferGeometry {
  const geometry = new TorusGeometry(radius, tube, 6, 160);
  const position = geometry.getAttribute('position');
  for (let index = 0; index < position.count; index += 1) {
    const x = position.getX(index);
    const y = position.getY(index);
    const z = position.getZ(index);
    const angle = Math.atan2(y, x);
    const wave = 1 + Math.sin(angle * 3 + seed) * 0.035 + Math.cos(angle * 7 - seed) * 0.018;
    position.setXYZ(index, x * wave, y * wave, z + Math.sin(angle * 2 + seed) * 0.1);
  }
  position.needsUpdate = true;
  geometry.computeVertexNormals();
  return geometry;
}

function createOrbitGeometry(radiusX: number, radiusY: number, seed: number): BufferGeometry {
  const points: number[] = [];
  const segments = 192;
  for (let index = 0; index < segments; index += 1) {
    const angle = (index / segments) * Math.PI * 2;
    const ripple = 1 + Math.sin(angle * 5 + seed) * 0.012;
    points.push(
      Math.cos(angle) * radiusX * ripple,
      Math.sin(angle) * radiusY * ripple,
      Math.sin(angle * 3 + seed) * 0.08,
    );
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(points, 3));
  return geometry;
}

function createFractureGeometry(seed: number, branches: number): BufferGeometry {
  const random = seededRandom(seed);
  const vertices: number[] = [];
  let previousX = 0;
  let previousY = 0;
  let previousZ = 0;

  for (let branch = 0; branch < branches; branch += 1) {
    const baseAngle = (branch / branches) * Math.PI * 2 + random() * 0.35;
    previousX = Math.cos(baseAngle) * 0.12;
    previousY = Math.sin(baseAngle) * 0.12;
    previousZ = 0;
    const segments = 5 + Math.floor(random() * 4);

    for (let segment = 1; segment <= segments; segment += 1) {
      const radius = 0.12 + (segment / segments) * (1.25 + random() * 0.65);
      const angle = baseAngle + (random() - 0.5) * 0.32;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      const z = (random() - 0.5) * 0.28;
      vertices.push(previousX, previousY, previousZ, x, y, z);
      previousX = x;
      previousY = y;
      previousZ = z;
    }
  }

  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(vertices, 3));
  return geometry;
}

function distributeFragments(
  mesh: InstancedMesh,
  seed: number,
  centerZ: number,
  minimumRadius: number,
  depthSpread: number,
): void {
  const random = seededRandom(seed);
  const transform = new Object3D();
  for (let index = 0; index < mesh.count; index += 1) {
    const angle = random() * Math.PI * 2;
    const radius = minimumRadius + random() * 2.2;
    transform.position.set(
      Math.cos(angle) * radius,
      Math.sin(angle) * radius * 0.76,
      centerZ + (random() - 0.5) * depthSpread,
    );
    transform.rotation.set(random() * Math.PI, random() * Math.PI, random() * Math.PI);
    const scale = 0.35 + random() * 1.65;
    transform.scale.set(scale * 0.55, scale * (1 + random()), scale * 0.45);
    transform.updateMatrix();
    mesh.setMatrixAt(index, transform.matrix);
  }
  mesh.instanceMatrix.setUsage(StaticDrawUsage);
  mesh.instanceMatrix.needsUpdate = true;
}

export function createScene(canvas: HTMLCanvasElement): UniverseScene {
  const renderer = new WebGLRenderer({
    canvas,
    antialias: true,
    alpha: false,
    powerPreference: 'high-performance',
  });
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.86;
  renderer.setClearColor(0x08070f, 1);

  const scene = new Scene();
  const background = new Color(0x08070f);
  const atmosphericBackground = new Color(0x120b24);
  scene.background = background;
  const fog = new FogExp2(0x08070f, 0.017);
  scene.fog = fog;

  const camera = new PerspectiveCamera(46, 1, 0.08, 120);
  const pmrem = new PMREMGenerator(renderer);
  const environmentScene = new RoomEnvironment();
  const environmentTarget = pmrem.fromScene(environmentScene, 0.04);
  scene.environment = environmentTarget.texture;
  scene.environmentIntensity = 0.48;
  environmentScene.dispose();
  pmrem.dispose();

  const materials = createMaterials();
  const ownedMaterials = new Set<Material>(Object.values(materials));

  const fragmentPointerUniforms = {
    uPointer: { value: new Vector2() },
    uPointerStrength: { value: 0 },
    uAspect: { value: 1 },
  };
  const makeCursorReactiveMaterial = <T extends Material>(source: T): T => {
    const material = source.clone();
    material.onBeforeCompile = (shader) => {
      shader.uniforms.uPointer = fragmentPointerUniforms.uPointer;
      shader.uniforms.uPointerStrength = fragmentPointerUniforms.uPointerStrength;
      shader.uniforms.uAspect = fragmentPointerUniforms.uAspect;
      shader.vertexShader = shader.vertexShader
        .replace(
          '#include <common>',
          `#include <common>
          uniform vec2 uPointer;
          uniform float uPointerStrength;
          uniform float uAspect;`,
        )
        .replace(
          '#include <project_vertex>',
          `#include <project_vertex>
          {
            vec2 ndc = gl_Position.xy / max(0.001, gl_Position.w);
            vec2 delta = uPointer - ndc;
            delta.x *= uAspect;
            float distanceToPointer = length(delta);
            float force = exp(-distanceToPointer * distanceToPointer * 4.6) * uPointerStrength;
            vec2 direction = distanceToPointer > 0.0001 ? delta / distanceToPointer : vec2(0.0);
            vec2 tangent = vec2(-direction.y, direction.x);
            gl_Position.xy += (direction * -0.085 + tangent * 0.03) * force * gl_Position.w;
          }`,
        );
    };
    material.customProgramCacheKey = () => 'cursor-reactive-fragments';
    ownedMaterials.add(material);
    return material;
  };
  const fragmentMetal = makeCursorReactiveMaterial(materials.metal);
  const fragmentDarkMetal = makeCursorReactiveMaterial(materials.darkMetal);
  const ownedGeometries = new Set<BufferGeometry>();
  const ownGeometry = <T extends BufferGeometry>(geometry: T): T => {
    ownedGeometries.add(geometry);
    return geometry;
  };

  const portal = new Group();
  scene.add(portal);

  const leftShell = new Mesh(ownGeometry(createShellHalf(-1)), materials.glass);
  const rightShell = new Mesh(ownGeometry(createShellHalf(1)), materials.glass);
  leftShell.renderOrder = 2;
  rightShell.renderOrder = 2;
  portal.add(leftShell, rightShell);

  const ringAssembly = new Group();
  const outerRing = new Mesh(ownGeometry(createWarpedTorus(2.85, 0.045, 1.2)), materials.metal);
  outerRing.rotation.set(0.34, 0.18, 0.08);
  outerRing.scale.set(1, 1.09, 1);
  const middleRing = new Mesh(ownGeometry(createWarpedTorus(2.5, 0.075, 3.8)), materials.darkMetal);
  middleRing.rotation.set(0.92, -0.28, 0.45);
  middleRing.scale.set(1, 0.86, 1);
  const glassRing = new Mesh(ownGeometry(createWarpedTorus(2.18, 0.055, 5.1)), materials.glass);
  glassRing.rotation.set(-0.48, 0.62, -0.2);
  glassRing.scale.set(0.92, 1.15, 1);
  ringAssembly.add(outerRing, middleRing, glassRing);
  portal.add(ringAssembly);

  const core = new Mesh(
    ownGeometry(deformGeometry(new OctahedronGeometry(1.05, 2), 2.4, 0.16)),
    materials.core,
  );
  const hotCore = new Mesh(ownGeometry(new OctahedronGeometry(0.72, 1)), materials.hotCore);
  portal.add(core, hotCore);

  const fracture = new LineSegments(ownGeometry(createFractureGeometry(91, 13)), materials.fracture);
  const limeFracture = new LineSegments(ownGeometry(createFractureGeometry(411, 3)), materials.limeFracture);
  limeFracture.rotation.z = 0.7;
  limeFracture.scale.setScalar(0.86);
  portal.add(fracture, limeFracture);

  const portalOrbits = new Group();
  [3.2, 3.75, 4.35].forEach((radius, index) => {
    const orbit = new LineLoop(
      ownGeometry(createOrbitGeometry(radius, radius * (0.58 + index * 0.09), index * 1.7)),
      materials.orbit,
    );
    orbit.rotation.set(0.25 + index * 0.36, index * 0.24, index * 0.7);
    portalOrbits.add(orbit);
  });
  portal.add(portalOrbits);

  const mobileAtCreation = window.innerWidth < 768;
  const portalFragments = new InstancedMesh(
    ownGeometry(new OctahedronGeometry(0.11, 0)),
    fragmentMetal,
    mobileAtCreation ? 54 : 104,
  );
  distributeFragments(portalFragments, 712, 0, 3.1, 3.2);
  portal.add(portalFragments);

  const planetSystem = new Group();
  planetSystem.position.set(3.2, 0.7, -16);
  planetSystem.rotation.z = -0.18;
  const planetGeometry = ownGeometry(deformGeometry(new IcosahedronGeometry(2.45, 3), 5.6, 0.075));
  const planet = new Mesh(planetGeometry, materials.planet);
  const planetEdges = new LineSegments(ownGeometry(new EdgesGeometry(planetGeometry, 24)), materials.orbit);
  const planetRing = new Mesh(ownGeometry(createWarpedTorus(3.35, 0.022, 2.8)), materials.metal);
  planetRing.rotation.set(1.08, 0.18, 0.35);
  planetRing.scale.y = 0.82;
  const planetOrbit = new LineLoop(ownGeometry(createOrbitGeometry(4.25, 2.3, 2.2)), materials.orbit);
  planetOrbit.rotation.set(0.72, 0.3, -0.4);
  planetSystem.add(planet, planetEdges, planetRing, planetOrbit);
  scene.add(planetSystem);

  const orbitalRoutes = new Group();
  orbitalRoutes.position.set(0, 0, -26);
  for (let index = 0; index < 5; index += 1) {
    const radius = 2.7 + index * 1.35;
    const route = new LineLoop(
      ownGeometry(createOrbitGeometry(radius, radius * (0.36 + index * 0.055), index * 0.8)),
      index === 3 ? materials.limeFracture : materials.orbit,
    );
    route.rotation.set(index * 0.16, index * -0.11, index * 0.44);
    orbitalRoutes.add(route);
  }
  const routeCore = new Mesh(
    ownGeometry(deformGeometry(new OctahedronGeometry(0.65, 1), 8.2, 0.2)),
    materials.darkMetal,
  );
  orbitalRoutes.add(routeCore);
  scene.add(orbitalRoutes);

  const openingForm = new Group();
  openingForm.position.set(-1.2, 0.3, -34);
  const openingCrystal = new Mesh(
    ownGeometry(deformGeometry(new OctahedronGeometry(1.65, 2), 3.1, 0.13)),
    materials.glass,
  );
  openingCrystal.scale.set(0.85, 2.25, 0.72);
  const leftCrystal = new Mesh(
    ownGeometry(deformGeometry(new OctahedronGeometry(1.25, 1), 7.4, 0.16)),
    materials.metal,
  );
  leftCrystal.position.set(-2.1, -0.3, 0.4);
  leftCrystal.rotation.z = -0.38;
  leftCrystal.scale.set(0.58, 1.55, 0.6);
  const rightCrystal = new Mesh(
    ownGeometry(deformGeometry(new OctahedronGeometry(1.15, 1), 4.9, 0.18)),
    materials.darkMetal,
  );
  rightCrystal.position.set(1.9, 0.5, -0.2);
  rightCrystal.rotation.z = 0.46;
  rightCrystal.scale.set(0.62, 1.4, 0.55);
  const openingCore = new Mesh(ownGeometry(new OctahedronGeometry(0.85, 1)), materials.hotCore);
  openingCore.scale.set(0.3, 1.85, 0.3);
  const openingRing = new Mesh(ownGeometry(createWarpedTorus(4.15, 0.04, 7.2)), materials.metal);
  openingRing.rotation.set(0.5, -0.25, 0.18);
  openingRing.scale.y = 1.18;
  const openingFracture = new LineSegments(ownGeometry(createFractureGeometry(817, 9)), materials.fracture);
  openingFracture.scale.setScalar(2.2);
  openingForm.add(openingCrystal, leftCrystal, rightCrystal, openingCore, openingRing, openingFracture);
  scene.add(openingForm);

  const deepFragments = new InstancedMesh(
    ownGeometry(new OctahedronGeometry(0.13, 0)),
    fragmentDarkMetal,
    mobileAtCreation ? 58 : 128,
  );
  distributeFragments(deepFragments, 1221, -30, 4.1, 18);
  scene.add(deepFragments);

  const ambient = new AmbientLight(0x574473, 0.72);
  const keyLight = new DirectionalLight(0xd5e5ff, 1.8);
  keyLight.position.set(4, 6, 8);
  const violetLight = new PointLight(0x7955ff, 24, 28, 1.7);
  violetLight.position.set(-4, 2, 4);
  const limeLight = new PointLight(0xc5ff4a, 7, 14, 1.8);
  limeLight.position.set(2.5, -2.5, 0.5);
  const deepLight = new PointLight(0x8066ff, 65, 36, 1.7);
  deepLight.position.set(1, 3, -22);
  scene.add(ambient, keyLight, violetLight, limeLight, deepLight);

  const particles = createParticleField(mobileAtCreation ? 1900 : 3600);
  scene.add(particles.points);

  const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  const pointerTarget = new Vector2();
  const pointerSmooth = new Vector2();
  let pointerInside = false;
  let pointerLastMove = 0;
  let pointerStrength = 0;
  let lastSceneTime = 0;

  const handlePointerMove = (event: PointerEvent) => {
    if (event.pointerType === 'touch') return;
    pointerInside = true;
    pointerLastMove = performance.now();
    pointerTarget.set(
      (event.clientX / Math.max(1, window.innerWidth)) * 2 - 1,
      1 - (event.clientY / Math.max(1, window.innerHeight)) * 2,
    );
  };
  const handlePointerLeave = () => {
    pointerInside = false;
  };

  window.addEventListener('pointermove', handlePointerMove, { passive: true });
  document.documentElement.addEventListener('pointerleave', handlePointerLeave);

  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloomPass = new UnrealBloomPass(new Vector2(1, 1), 0.28, 0.38, 1.35);
  composer.addPass(bloomPass);
  const outputPass = new OutputPass();
  composer.addPass(outputPass);

  const cameraTargets = [
    new Vector3(0, 0, 0),
    new Vector3(2.2, 0.5, -16),
    new Vector3(-0.5, 0, -30),
    new Vector3(0, 0, 0),
    new Vector3(0, 0, 0),
    new Vector3(0, 0, 0),
  ];
  const cameraTarget = new Vector3();

  let width = 1;
  let responsiveScale = 1;
  let disposed = false;

  const resize = () => {
    if (disposed) return;
    width = Math.max(1, canvas.clientWidth || window.innerWidth);
    const height = Math.max(1, canvas.clientHeight || window.innerHeight);
    const mobile = window.innerWidth < 768;
    const pixelRatio = Math.min(window.devicePixelRatio || 1, mobile ? 1.5 : 1.75);
    responsiveScale = width < 600 ? 0.76 : width < 960 ? 0.9 : 1;
    camera.aspect = width / height;
    camera.fov = width < 600 ? 59 : width < 960 ? 52 : 46;
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(pixelRatio);
    renderer.setSize(width, height, false);
    composer.setPixelRatio(pixelRatio);
    composer.setSize(width, height);
    particles.points.material.uniforms.uPixelRatio.value = pixelRatio;
    particles.points.material.uniforms.uAspect.value = camera.aspect;
    fragmentPointerUniforms.uAspect.value = camera.aspect;
  };

  resize();

  return {
    update(state: SceneState, time: number) {
      if (disposed) return;
      const delta = lastSceneTime ? Math.min(0.05, Math.max(0, time - lastSceneTime)) : 0.016;
      lastSceneTime = time;
      camera.position.set(state.cameraX, state.cameraY, state.cameraZ);
      const chapter = Math.min(5, Math.max(0, state.chapter));
      const targetIndex = Math.min(cameraTargets.length - 2, Math.floor(chapter));
      const targetAmount = chapter - targetIndex;
      const targetEase = targetAmount * targetAmount * (3 - 2 * targetAmount);
      cameraTarget.copy(cameraTargets[targetIndex]).lerp(cameraTargets[targetIndex + 1], targetEase);
      camera.lookAt(cameraTarget);

      const breathing = 1 + Math.sin(time * 0.42) * 0.012;
      portal.scale.setScalar(state.portalScale * responsiveScale * breathing);
      const heroLift = Math.max(0, 1 - state.chapter) * 1.35;
      const possibilityFocus = Math.max(0, 1 - Math.abs(state.chapter - 4));
      portal.position.x = possibilityFocus * (width < 600 ? 0.8 : 2.2);
      portal.position.y = heroLift + possibilityFocus * (width < 600 ? 1.2 : 0);
      portal.rotation.set(
        0.08 + Math.sin(time * 0.13) * 0.025,
        state.portalRotation + time * 0.035,
        -0.06 + Math.cos(time * 0.17) * 0.018,
      );
      ringAssembly.rotation.z = time * -0.026;
      portalOrbits.rotation.z = time * 0.012;
      portalFragments.rotation.z = time * -0.018;

      leftShell.position.x = -0.035 - state.opening * 0.46;
      rightShell.position.x = 0.035 + state.opening * 0.46;
      leftShell.rotation.z = state.opening * -0.09;
      rightShell.rotation.z = state.opening * 0.09;
      leftShell.rotation.y = state.opening * -0.08;
      rightShell.rotation.y = state.opening * 0.08;

      const coreScale = 0.92 + state.opening * 0.2 + Math.sin(time * 0.8) * 0.025;
      core.scale.set(0.62 * coreScale, 1.35 * coreScale, 0.5 * coreScale);
      hotCore.scale.set(0.28 * coreScale, 0.94 * coreScale, 0.28 * coreScale);
      hotCore.rotation.y = time * -0.18;
      fracture.rotation.z = time * 0.045;
      fracture.scale.setScalar(0.9 + state.opening * 0.24);
      limeFracture.rotation.z = 0.7 - time * 0.028;
      materials.core.emissiveIntensity = 1.35 + state.atmosphere * 0.75 + Math.sin(time * 0.7) * 0.1;
      materials.fracture.opacity = 0.58 + state.opening * 0.32;

      planet.rotation.y = time * 0.035;
      planetEdges.rotation.y = planet.rotation.y;
      orbitalRoutes.rotation.z = time * 0.008;
      routeCore.rotation.y = time * 0.09;
      openingForm.rotation.y = -0.12 + Math.sin(time * 0.1) * 0.055;
      openingForm.rotation.z = Math.sin(time * 0.08) * 0.025;
      deepFragments.rotation.z = time * 0.003;

      background.setHex(0x08070f).lerp(atmosphericBackground, state.atmosphere * 0.52);
      fog.color.copy(background);
      fog.density = 0.016 + state.atmosphere * 0.005;
      violetLight.intensity = 22 + state.atmosphere * 12;
      limeLight.intensity = 6 + state.opening * 3;
      deepLight.intensity = 38 + state.atmosphere * 18;
      bloomPass.strength = 0.26 + state.atmosphere * 0.1;

      particles.update(time);

      const pointerMotion = pointerInside
        ? 0.18 + 0.82 * Math.exp(-Math.max(0, performance.now() - pointerLastMove) / 480)
        : 0;
      const targetStrength = reducedMotionQuery.matches ? 0 : pointerMotion;
      pointerStrength += (targetStrength - pointerStrength) * Math.min(1, delta * 7);
      pointerSmooth.x += (pointerTarget.x - pointerSmooth.x) * Math.min(1, delta * 6);
      pointerSmooth.y += (pointerTarget.y - pointerSmooth.y) * Math.min(1, delta * 6);
      particles.setPointer(pointerSmooth, pointerStrength);
      fragmentPointerUniforms.uPointer.value.copy(pointerSmooth);
      fragmentPointerUniforms.uPointerStrength.value = pointerStrength;

      composer.render();
    },
    resize,
    dispose() {
      if (disposed) return;
      disposed = true;
      window.removeEventListener('pointermove', handlePointerMove);
      document.documentElement.removeEventListener('pointerleave', handlePointerLeave);
      particles.dispose();
      portalFragments.dispose();
      deepFragments.dispose();
      ownedGeometries.forEach((geometry) => geometry.dispose());
      ownedMaterials.forEach((material) => material.dispose());
      environmentTarget.dispose();
      bloomPass.dispose();
      outputPass.dispose();
      composer.dispose();
      renderer.dispose();
    },
  };
}
