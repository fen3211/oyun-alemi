import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import type { UniverseScene } from './createScene';
import { sampleScroll } from './scrollModel';

gsap.registerPlugin(ScrollTrigger);

export interface ScrollController {
  scrollTo(target: Element): void;
  destroy(): void;
}

export function createScrollController(scene: UniverseScene | null): ScrollController {
  const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  const chapters = Array.from(document.querySelectorAll<HTMLElement>('.chapter'));
  let lenis: Lenis | null = null;
  let removeLenisListener: (() => void) | null = null;
  let frameId = 0;
  let lastFrameTime = 0;
  let sceneTime = 0;
  let needsRender = true;
  let destroyed = false;
  let chapterStops: number[] = [];

  const refreshChapterStops = () => {
    const maxScroll = ScrollTrigger.maxScroll(window);
    chapterStops = chapters.map((chapter, index) => {
      if (index === chapters.length - 1) return maxScroll;
      const centeredScroll = chapter.offsetTop - (window.innerHeight - chapter.offsetHeight) / 2;
      return Math.min(maxScroll, Math.max(0, centeredScroll));
    });
  };

  const getSceneProgress = () => {
    const scroll = window.scrollY;
    const lastIndex = chapterStops.length - 1;
    if (lastIndex < 1 || scroll >= chapterStops[lastIndex]) return 1;

    for (let index = 0; index < lastIndex; index += 1) {
      const start = chapterStops[index];
      const end = chapterStops[index + 1];
      if (scroll > end) continue;
      const amount = end === start ? 0 : (scroll - start) / (end - start);
      return (index + Math.min(1, Math.max(0, amount))) / lastIndex;
    }
    return 0;
  };

  const updateChapters = () => {
    const viewportCenter = window.innerHeight / 2;
    let current: HTMLElement | null = null;
    let currentDistance = Number.POSITIVE_INFINITY;

    chapters.forEach((chapter) => {
      const bounds = chapter.getBoundingClientRect();
      const visible = bounds.bottom > 0 && bounds.top < window.innerHeight;
      const distance = Math.abs((bounds.top + bounds.bottom) / 2 - viewportCenter);
      chapter.dataset.visible = String(visible);
      chapter.classList.toggle('is-visible', visible);
      if (visible && distance < currentDistance) {
        current = chapter;
        currentDistance = distance;
      }
    });

    chapters.forEach((chapter) => {
      const isCurrent = chapter === current;
      chapter.dataset.current = String(isCurrent);
      chapter.classList.toggle('is-current', isCurrent);
    });
  };

  const applyProgress = () => {
    needsRender = true;
    updateChapters();
    if (motionQuery.matches && !document.hidden) {
      cancelAnimationFrame(frameId);
      frameId = requestAnimationFrame(render);
    }
  };

  const trigger = ScrollTrigger.create({
    trigger: document.documentElement,
    start: 0,
    end: () => ScrollTrigger.maxScroll(window),
    onUpdate: applyProgress,
    onRefresh: () => {
      refreshChapterStops();
      applyProgress();
    },
  });
  refreshChapterStops();

  const lenisTick = (time: number) => {
    if (!document.hidden) lenis?.raf(time * 1000);
  };

  const stopLenis = () => {
    if (!lenis) return;
    gsap.ticker.remove(lenisTick);
    removeLenisListener?.();
    removeLenisListener = null;
    lenis.destroy();
    lenis = null;
  };

  const startLenis = () => {
    if (lenis || motionQuery.matches) return;
    lenis = new Lenis({ duration: 1.1, smoothWheel: true, autoRaf: false });
    removeLenisListener = lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(lenisTick);
  };

  function render(now: number) {
    if (destroyed || document.hidden) return;
    const delta = lastFrameTime ? Math.min((now - lastFrameTime) / 1000, 0.05) : 0;
    lastFrameTime = now;
    if (!motionQuery.matches) sceneTime += delta;
    if (!motionQuery.matches || needsRender) {
      scene?.update(sampleScroll(getSceneProgress()), sceneTime);
      needsRender = false;
    }
    if (!motionQuery.matches) frameId = requestAnimationFrame(render);
  }

  const startRendering = () => {
    cancelAnimationFrame(frameId);
    lastFrameTime = 0;
    needsRender = true;
    if (!document.hidden) frameId = requestAnimationFrame(render);
  };

  const handleResize = () => {
    scene?.resize();
    ScrollTrigger.refresh();
    needsRender = true;
    if (motionQuery.matches) startRendering();
  };

  const handleVisibility = () => {
    cancelAnimationFrame(frameId);
    if (document.hidden) {
      lenis?.stop();
      return;
    }
    lenis?.start();
    startRendering();
  };

  const handleMotionChange = () => {
    document.documentElement.classList.toggle('has-cinematic-scroll', !motionQuery.matches);
    if (motionQuery.matches) stopLenis();
    else startLenis();
    ScrollTrigger.refresh();
    startRendering();
  };

  gsap.ticker.lagSmoothing(0);
  document.documentElement.classList.toggle('has-cinematic-scroll', !motionQuery.matches);
  startLenis();
  window.addEventListener('resize', handleResize);
  document.addEventListener('visibilitychange', handleVisibility);
  motionQuery.addEventListener('change', handleMotionChange);
  applyProgress();
  startRendering();

  return {
    scrollTo(target: Element) {
      if (lenis) lenis.scrollTo(target, { duration: 1.1 });
      else target.scrollIntoView({ behavior: 'auto', block: 'start' });
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      cancelAnimationFrame(frameId);
      stopLenis();
      trigger.kill();
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('visibilitychange', handleVisibility);
      motionQuery.removeEventListener('change', handleMotionChange);
      document.documentElement.classList.remove('has-cinematic-scroll');
      chapters.forEach((chapter) => {
        delete chapter.dataset.current;
        delete chapter.dataset.visible;
        chapter.classList.remove('is-current', 'is-visible');
      });
      scene?.dispose();
    },
  };
}
