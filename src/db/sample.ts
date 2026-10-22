import type { ImportItem } from './repo';

const DAY = 24 * 60 * 60 * 1000;
const ago = (days: number) => Date.now() - days * DAY;

/** A small starter library so new users can explore filtering and search right away. */
export const SAMPLE_BOOKMARKS: ImportItem[] = [
  { url: 'https://react.dev/learn', title: 'Quick Start – React', description: 'Official React tutorial and docs.', tags: ['react', 'frontend', 'docs'], collection: 'Learning', isFavorite: true, createdAt: ago(1), visitCount: 12, lastVisitedAt: ago(0.2) },
  { url: 'https://react.dev/reference/react/hooks', title: 'Built-in React Hooks', tags: ['react', 'docs'], collection: 'Learning', createdAt: ago(3), visitCount: 4, lastVisitedAt: ago(2) },
  { url: 'https://developer.mozilla.org/en-US/docs/Web/API/URL', title: 'URL – Web APIs | MDN', description: 'The URL interface used for parsing and validating links.', tags: ['javascript', 'docs', 'web'], collection: 'Learning', isFavorite: true, createdAt: ago(5), visitCount: 7, lastVisitedAt: ago(1) },
  { url: 'https://www.typescriptlang.org/docs/handbook/intro.html', title: 'The TypeScript Handbook', tags: ['typescript', 'docs'], collection: 'Learning', createdAt: ago(9) },
  { url: 'https://tailwindcss.com/docs', title: 'Tailwind CSS Documentation', tags: ['css', 'frontend', 'docs'], collection: 'Learning', createdAt: ago(12), visitCount: 3, lastVisitedAt: ago(6) },
  { url: 'https://dexie.org/docs/Tutorial/Getting-started', title: 'Dexie.js – Getting started', description: 'IndexedDB wrapper used by this app.', tags: ['database', 'javascript'], collection: 'Learning', createdAt: ago(2) },
  { url: 'https://github.com/jcatibog014/bookmark_manager', title: 'bookmark_manager on GitHub', tags: ['project'], collection: 'Work', isFavorite: true, createdAt: ago(0.1), visitCount: 5, lastVisitedAt: ago(0.05) },
  { url: 'https://vitest.dev/guide/', title: 'Vitest Guide', tags: ['testing', 'javascript', 'docs'], collection: 'Work', createdAt: ago(4) },
  { url: 'https://www.figma.com/community', title: 'Figma Community', description: 'UI kits and design inspiration.', tags: ['design', 'inspiration'], collection: 'Design', createdAt: ago(15), visitCount: 1, lastVisitedAt: ago(14) },
  { url: 'https://dribbble.com/shots/popular', title: 'Popular shots on Dribbble', tags: ['design', 'inspiration'], collection: 'Design', createdAt: ago(25) },
  { url: 'https://fonts.google.com/specimen/Inter', title: 'Inter – Google Fonts', tags: ['design', 'fonts'], collection: 'Design', createdAt: ago(40) },
  { url: 'https://news.ycombinator.com/', title: 'Hacker News', tags: ['news'], isFavorite: true, createdAt: ago(60), visitCount: 30, lastVisitedAt: ago(0.5) },
  { url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', title: 'A video to watch later', createdAt: ago(7) },
  { url: 'https://web.dev/learn/accessibility', title: 'Learn Accessibility – web.dev', description: 'Making sites usable for everyone.', tags: ['web', 'frontend', 'a11y'], createdAt: ago(18) },
];
