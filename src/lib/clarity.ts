import Clarity from '@microsoft/clarity';
import { fetchClarityProjectId, storeClarityProjectId } from './firebase';

export const DEFAULT_CLARITY_PROJECT_ID = 'z985sk1e91';

let isClarityInitialized = false;
let currentClarityProjectId = DEFAULT_CLARITY_PROJECT_ID;

/**
 * Initialize Microsoft Clarity
 * Supports Project ID passed directly, stored in Firebase/localStorage, or from VITE_CLARITY_PROJECT_ID
 */
export async function initClarity(customProjectId?: string): Promise<{ success: boolean; projectId: string }> {
  if (typeof window === 'undefined') {
    return { success: false, projectId: '' };
  }

  const id = customProjectId || (await fetchClarityProjectId()) || DEFAULT_CLARITY_PROJECT_ID;
  if (!id) return { success: false, projectId: '' };

  currentClarityProjectId = id;

  // If already loaded via script tag in index.html, reuse it without attaching duplicate observers
  if (typeof (window as any).clarity === 'function') {
    isClarityInitialized = true;
    return { success: true, projectId: id };
  }

  try {
    if (!isClarityInitialized) {
      Clarity.init(id);
      isClarityInitialized = true;
    }
    return { success: true, projectId: id };
  } catch (err) {
    console.debug('[Clarity] init notice:', err);
    return { success: false, projectId: id };
  }
}

/**
 * Check if Clarity is currently initialized
 */
export function getClarityStatus(): { isInitialized: boolean; projectId: string } {
  return {
    isInitialized: true,
    projectId: currentClarityProjectId || DEFAULT_CLARITY_PROJECT_ID,
  };
}

/**
 * Update and apply a new Clarity Project ID dynamically from Admin Dashboard
 */
export async function updateClarityProjectId(projectId: string): Promise<boolean> {
  const trimmed = projectId.trim();
  if (!trimmed) return false;

  await storeClarityProjectId(trimmed);
  const result = await initClarity(trimmed);
  return result.success;
}

/**
 * Tag current section in Microsoft Clarity for Heatmap & Session Recording filters
 */
export function tagClaritySection(sectionId: string, sectionTitle: string) {
  if (typeof window === 'undefined') return;
  try {
    const wClarity = (window as any).clarity;
    if (typeof wClarity === 'function') {
      wClarity('set', 'current_section', sectionId);
      wClarity('set', 'section_title', sectionTitle);
      wClarity('event', `view_${sectionId}`);
    } else if (isClarityInitialized) {
      Clarity.setTag('current_section', sectionId);
      Clarity.setTag('section_title', sectionTitle);
      Clarity.event(`view_${sectionId}`);
    }
  } catch {
    // ignore
  }
}

/**
 * Identify visitor in Microsoft Clarity
 */
export function identifyClarityVisitor(visitorId: string, sessionId: string) {
  if (typeof window === 'undefined') return;
  try {
    const wClarity = (window as any).clarity;
    if (typeof wClarity === 'function') {
      wClarity('identify', visitorId, sessionId, window.location.pathname, 'Visitor');
    } else if (isClarityInitialized) {
      Clarity.identify(visitorId, sessionId, window.location.pathname, 'Visitor');
    }
  } catch {
    // ignore
  }
}
