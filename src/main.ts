import './styles.css';
import { content } from './content';
import { createScene } from './scene/createScene';
import type { UniverseScene } from './scene/createScene';
import { createScrollController } from './scene/scrollController';

const setText = (selector: string, text: string) => {
  document.querySelectorAll<HTMLElement>(selector).forEach((element) => {
    element.textContent = text;
  });
};

setText('[data-content="headerCta"]', content.headerCta);
setText('[data-content="hero.eyebrow"]', content.hero.eyebrow);
setText('[data-content="hero.title"]', content.hero.title);
setText('[data-content="hero.description"]', content.hero.description);
setText('[data-content="hero.primary"]', content.hero.primary);
setText('[data-content="hero.secondary"]', content.hero.secondary);
setText('[data-content="about.eyebrow"]', content.about.eyebrow);
setText('[data-content="about.title"]', content.about.title);
setText('[data-content="about.description"]', content.about.description);
setText('[data-content="footer.phrase"]', content.footer.phrase);
setText('[data-content="footer.copyright"]', content.footer.copyright);

const navigationList = document.querySelector<HTMLUListElement>('.site-nav__list');

content.navigation.forEach((item) => {
  const listItem = document.createElement('li');
  const link = document.createElement('a');
  link.href = item.href;
  link.textContent = item.label;
  listItem.append(link);
  navigationList?.append(listItem);
});

document.querySelectorAll<HTMLElement>('[data-feature]').forEach((chapter) => {
  const index = Number(chapter.dataset.feature);
  const feature = content.features[index];
  if (!feature) return;

  chapter.querySelector('[data-feature-number]')!.textContent = feature.number;
  chapter.querySelector('[data-feature-title]')!.textContent = feature.title;
  chapter.querySelector('[data-feature-description]')!.textContent = feature.description;
});

const menuButton = document.querySelector<HTMLButtonElement>('.menu-toggle');
const navigation = document.querySelector<HTMLElement>('.site-nav');

const closeMenu = () => {
  menuButton?.setAttribute('aria-expanded', 'false');
  menuButton?.setAttribute('aria-label', 'Мәзірді ашу');
  navigation?.classList.remove('is-open');
};

const handleMenuButtonClick = () => {
  const isOpen = menuButton?.getAttribute('aria-expanded') === 'true';
  menuButton?.setAttribute('aria-expanded', String(!isOpen));
  menuButton?.setAttribute('aria-label', isOpen ? 'Мәзірді ашу' : 'Мәзірді жабу');
  navigation?.classList.toggle('is-open', !isOpen);
};

const handleNavigationClick = (event: MouseEvent) => {
  if (event.target instanceof HTMLAnchorElement) closeMenu();
};

const handleDocumentKeydown = (event: KeyboardEvent) => {
  if (event.key !== 'Escape' || menuButton?.getAttribute('aria-expanded') !== 'true') return;
  closeMenu();
  menuButton?.focus();
};

menuButton?.addEventListener('click', handleMenuButtonClick);
navigation?.addEventListener('click', handleNavigationClick);
document.addEventListener('keydown', handleDocumentKeydown);

let scene: UniverseScene | null = null;
const canvas = document.querySelector<HTMLCanvasElement>('#universe');

if (canvas) {
  try {
    scene = createScene(canvas);
  } catch {
    canvas.hidden = true;
    document.body.classList.add('webgl-fallback');
  }
} else {
  document.body.classList.add('webgl-fallback');
}

const scrollController = createScrollController(scene);

const handleDocumentClick = (event: MouseEvent) => {
  if (!(event.target instanceof Element)) return;
  const anchor = event.target.closest<HTMLAnchorElement>('a[href^="#"]');
  if (!anchor || anchor.classList.contains('skip-link')) return;
  const target = document.getElementById(anchor.hash.slice(1));
  if (!target) return;
  event.preventDefault();
  closeMenu();
  scrollController.scrollTo(target);
};

document.addEventListener('click', handleDocumentClick);

const cleanup = () => {
  menuButton?.removeEventListener('click', handleMenuButtonClick);
  navigation?.removeEventListener('click', handleNavigationClick);
  document.removeEventListener('keydown', handleDocumentKeydown);
  document.removeEventListener('click', handleDocumentClick);
  scrollController.destroy();
};

import.meta.hot?.dispose(cleanup);
