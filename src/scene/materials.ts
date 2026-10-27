import {
  AdditiveBlending,
  DoubleSide,
  LineBasicMaterial,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
} from 'three';

export interface UniverseMaterials {
  glass: MeshPhysicalMaterial;
  metal: MeshPhysicalMaterial;
  darkMetal: MeshPhysicalMaterial;
  planet: MeshPhysicalMaterial;
  core: MeshStandardMaterial;
  hotCore: MeshBasicMaterial;
  orbit: LineBasicMaterial;
  fracture: LineBasicMaterial;
  limeFracture: LineBasicMaterial;
}

export function createMaterials(): UniverseMaterials {
  const glass = new MeshPhysicalMaterial({
    color: 0x76659c,
    metalness: 0.08,
    roughness: 0.14,
    transmission: 0.82,
    thickness: 1.15,
    ior: 1.48,
    attenuationColor: 0x352060,
    attenuationDistance: 2.4,
    iridescence: 0.9,
    iridescenceIOR: 1.72,
    iridescenceThicknessRange: [180, 520],
    clearcoat: 1,
    clearcoatRoughness: 0.12,
    transparent: true,
    opacity: 0.82,
    side: DoubleSide,
    depthWrite: false,
    flatShading: true,
    envMapIntensity: 0.85,
  });

  const metal = new MeshPhysicalMaterial({
    color: 0x75659c,
    metalness: 0.96,
    roughness: 0.19,
    iridescence: 1,
    iridescenceIOR: 1.9,
    iridescenceThicknessRange: [240, 680],
    clearcoat: 0.75,
    clearcoatRoughness: 0.18,
    envMapIntensity: 1.15,
  });

  const darkMetal = new MeshPhysicalMaterial({
    color: 0x171220,
    metalness: 0.92,
    roughness: 0.3,
    iridescence: 0.7,
    iridescenceIOR: 1.6,
    iridescenceThicknessRange: [120, 410],
    clearcoat: 0.45,
    envMapIntensity: 0.7,
  });

  const planet = new MeshPhysicalMaterial({
    color: 0x171322,
    emissive: 0x0d071a,
    emissiveIntensity: 0.45,
    metalness: 0.84,
    roughness: 0.34,
    iridescence: 0.85,
    iridescenceIOR: 1.75,
    iridescenceThicknessRange: [180, 560],
    clearcoat: 0.5,
    flatShading: true,
    envMapIntensity: 0.75,
  });

  const core = new MeshStandardMaterial({
    color: 0x291550,
    emissive: 0x7955ff,
    emissiveIntensity: 2.6,
    metalness: 0.35,
    roughness: 0.24,
    flatShading: true,
  });

  const hotCore = new MeshBasicMaterial({
    color: 0xd7c8ff,
    transparent: true,
    opacity: 0.72,
    blending: AdditiveBlending,
    depthWrite: false,
  });
  hotCore.color.setRGB(1.15, 0.82, 1.85);

  const orbit = new LineBasicMaterial({
    color: 0x8b78b5,
    transparent: true,
    opacity: 0.26,
    blending: AdditiveBlending,
    depthWrite: false,
  });

  const fracture = new LineBasicMaterial({
    color: 0x9d7cff,
    transparent: true,
    opacity: 0.82,
    blending: AdditiveBlending,
    depthWrite: false,
  });
  fracture.color.setRGB(1.4, 0.75, 3.2);

  const limeFracture = new LineBasicMaterial({
    color: 0xc5ff4a,
    transparent: true,
    opacity: 0.72,
    blending: AdditiveBlending,
    depthWrite: false,
  });
  limeFracture.color.setRGB(1.25, 2.1, 0.35);

  return { glass, metal, darkMetal, planet, core, hotCore, orbit, fracture, limeFracture };
}
