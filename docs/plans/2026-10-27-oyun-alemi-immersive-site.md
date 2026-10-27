# Ойын әлемі Immersive Site Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use galyarder-framework:subagent-driven-development (recommended) or galyarder-framework:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a responsive Kazakh single-page site with a continuous cinematic Three.js scene controlled by scrolling.

**Architecture:** Semantic HTML carries all content and controls. A fixed WebGL canvas renders the persistent scene; GSAP ScrollTrigger maps page progress to camera, object and atmosphere states. Lenis provides smooth scrolling unless reduced motion is requested.

**Tech Stack:** Vite, TypeScript, Three.js, GSAP ScrollTrigger, Lenis, Vitest, Playwright.

---

### Task 1: Application shell and design system

**Files:** `package.json`, `index.html`, `src/main.ts`, `src/styles.css`, `src/content.ts`, `src/content.test.ts`.

- [ ] Create the Vite TypeScript project and install `three`, `gsap`, `lenis`; install development dependencies `vite`, `typescript`, `vitest`, `@playwright/test` and `@types/three`.
- [ ] Write a failing content test asserting all four navigation labels, hero text, three feature titles and footer copyright are present and no Russian or English UI labels are used.
- [ ] Run `rtk npm test -- src/content.test.ts`; expect failure because `src/content.ts` is absent.
- [ ] Implement exported `navigation`, `hero`, `features` and `footer` constants using the exact Kazakh copy from the approved specification.
- [ ] Build semantic header, main, six scroll chapters and footer in `index.html`; use buttons/links with accessible names and a compact mobile menu.
- [ ] Implement color, typography, spacing, responsive layout, focus states and reduced-motion rules in `src/styles.css`.
- [ ] Run `rtk npm test -- src/content.test.ts` and `rtk npm run build`; expect PASS and a successful production build.

### Task 2: Deterministic scroll model

**Files:** `src/scene/scrollModel.ts`, `src/scene/scrollModel.test.ts`.

- [ ] Write failing tests for `sampleScroll(0)`, `sampleScroll(0.5)`, `sampleScroll(1)` and clamping values outside the range.
- [ ] Define the return contract:

```ts
export interface SceneState {
  cameraZ: number;
  portalScale: number;
  portalRotation: number;
  opening: number;
  chapter: number;
}
export function sampleScroll(progress: number): SceneState;
```

- [ ] Run `rtk npm test -- src/scene/scrollModel.test.ts`; expect failure because the module is absent.
- [ ] Implement continuous interpolation across six chapters: camera approaches and crosses the portal, geometry opens, then the camera retreats for the footer. Clamp progress with `Math.min(1, Math.max(0, progress))`.
- [ ] Re-run the test; expect PASS. Mutate one endpoint temporarily and confirm the relevant assertion fails, then restore it.

### Task 3: Three.js cinematic scene

**Files:** `src/scene/createScene.ts`, `src/scene/materials.ts`, `src/scene/particles.ts`.

- [ ] Create a fixed full-viewport renderer with antialiasing, capped device pixel ratio, dark clear color and resize handling.
- [ ] Build the portal from layered torus geometry, an irregular crystalline shell and an inner energy core; use physical transmission, iridescence, emissive violet light and restrained lime accents.
- [ ] Add deterministic seeded particles distributed in depth, orbital lines, fog and colored rim lights.
- [ ] Add `EffectComposer`, `RenderPass` and restrained `UnrealBloomPass`; avoid full-screen neon washout.
- [ ] Expose `update(state: SceneState, time: number)`, `resize()` and `dispose()` from the scene interface. Apply `SceneState` without reading scroll directly inside mesh code.
- [ ] Pause animation while the document is hidden and dispose geometries, materials, composer and renderer on teardown.

### Task 4: Scroll choreography and interactions

**Files:** `src/main.ts`, `src/scene/scrollController.ts`, `src/styles.css`.

- [ ] Register ScrollTrigger and create a normalized progress value across the full page.
- [ ] Connect Lenis to ScrollTrigger and GSAP's ticker; disable Lenis when `prefers-reduced-motion: reduce` matches.
- [ ] Feed `sampleScroll(progress)` into `scene.update()` and synchronize HTML chapter opacity/transform states.
- [ ] Implement mobile navigation, anchor scrolling and CTA targets without adding unsupported game actions.
- [ ] Provide a static gradient fallback and keep all HTML readable if WebGL initialization fails.

### Task 5: Browser verification and polish

**Files:** `tests/site.spec.ts`, `playwright.config.ts`.

- [ ] Add Playwright checks for Kazakh content, navigation, CTA anchors, absence of horizontal overflow and readable content with reduced motion.
- [ ] Run the production server and test desktop `1440×900` and mobile `390×844` in Chromium.
- [ ] Capture screenshots at progress `0`, each of the three feature chapters and the footer; inspect portal framing, text collisions, bloom intensity and particle depth.
- [ ] Check browser console for errors and verify the canvas resizes correctly.
- [ ] Run `rtk npm test`, `rtk npm run build` and `rtk npx playwright test`; all must pass before completion.
