export const isDesktopApp = () =>
  typeof window !== 'undefined' && Boolean(window.desktopApp?.storage && window.desktopApp?.backup);

export const isWebDemo = () => !isDesktopApp();

export const getRuntimeLabel = () => (isDesktopApp() ? 'desktop' : 'web-demo');
