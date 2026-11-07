// Microsoft Clarity is loaded by the snippet in index.html, which defines window.clarity right away
// (queueing calls until the tag script arrives). These helpers just add section tags and the
// visitor id to the recording.

type ClarityFn = (...args: unknown[]) => void;

const clarity = (): ClarityFn | null => {
  if (typeof window === 'undefined') return null;
  const fn = (window as Window & { clarity?: ClarityFn }).clarity;
  return typeof fn === 'function' ? fn : null;
};

/** Tag the current section, for heatmap and recording filters. */
export function tagClaritySection(sectionId: string, sectionTitle: string) {
  const c = clarity();
  if (!c) return;
  c('set', 'current_section', sectionId);
  c('set', 'section_title', sectionTitle);
  c('event', `view_${sectionId}`);
}

/** Link the recording to the anonymous visitor/session ids the tracker uses. */
export function identifyClarityVisitor(visitorId: string, sessionId: string) {
  clarity()?.('identify', visitorId, sessionId, window.location.pathname, 'Visitor');
}
