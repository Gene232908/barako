// The loading screen and its dismissal live inline in index.html so they work before any app code
// loads. Prerendered production pages lift it as soon as the HTML is parsed; this call covers dev,
// where the page is rendered by the app.
export const dismissPreloader = () => {
  if (typeof window === 'undefined') return;
  (window as Window & { __plDismiss?: () => void }).__plDismiss?.();
};
