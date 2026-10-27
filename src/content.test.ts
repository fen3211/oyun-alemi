import { describe, expect, it } from 'vitest';
import { content } from './content';

describe('site content', () => {
  it('contains the four navigation labels in order', () => {
    expect(content.navigation.map((item) => item.label)).toEqual([
      'Басты бет',
      'Ойын туралы',
      'Мүмкіндіктер',
      'Байланыс',
    ]);
  });

  it('contains the hero title', () => {
    expect(content.hero.title).toBe('ӨЗ ОЙЫН ӘЛЕМІҢДІ АШ');
  });

  it('contains three feature titles', () => {
    expect(content.features.map((feature) => feature.title)).toEqual([
      'Жаңа әлемдерді зертте',
      'Өз жолыңды таңда',
      'Жаңа мүмкіндіктерді аш',
    ]);
  });

  it('contains the copyright', () => {
    expect(content.footer.copyright).toBe(
      '© 2026 Ойын әлемі. Барлық құқықтар қорғалған.',
    );
  });
});
