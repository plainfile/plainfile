

const GA_ID =
  typeof import.meta.env !== 'undefined'
    ? (import.meta.env.VITE_GA_MEASUREMENT_ID as string | undefined)
    : undefined;
const CONSENT_KEY = 'cookie-consent';
const LOADED_FLAG = '__plainfileGaLoaded';

export type Consent = 'accepted' | 'declined' | null;

/**
 * Read the user's cookie consent choice from localStorage.
 */
export function getConsent(): Consent {
  try {
    return localStorage.getItem(CONSENT_KEY) as Consent;
  } catch {
    return null;
  }
}

/**
 * Persist the user's choice and initialize GA only if accepted.
 */
export function setConsent(value: Consent): void {
  try {
    if (value) {
      localStorage.setItem(CONSENT_KEY, value);
    } else {
      localStorage.removeItem(CONSENT_KEY);
    }
  } catch {
    // Ignore environments where localStorage is unavailable.
  }

  // if (value === 'accepted') {
  //   initGA();
  // }
}

/**
 * Initialize GA if the user has already accepted analytics.
 * Useful on page reload after consent was given earlier.
 */
export function loadAnalyticsIfConsented(): void {
  if (typeof window === 'undefined') {
    console.log('[analytics] window not available, skipping');
    return;
  }

  const consent = getConsent();
  console.log('[analytics] stored consent:', consent);

  if (consent === 'accepted') {
    console.log('[analytics] consent accepted, attempting GA initialization');
    initGA();
  }
}

/**
 * Dynamically inject the Google Analytics script and configure gtag.
 * Safe to call multiple times — guarded by LOADED_FLAG.
 */
function initGA(): void {
  if (typeof window === 'undefined') {
    console.log('[analytics] window not available, skipping');
    return;
  }

  if (!GA_ID) {
    console.warn(
      '[analytics] VITE_GA_MEASUREMENT_ID is not set in the build. GA will not load.'
    );
    return;
  }

  const win = window as typeof window & {
    dataLayer: unknown[];
    gtag?: (...args: unknown[]) => void;
    [LOADED_FLAG]?: boolean;
  };

  // if (win[LOADED_FLAG]) {
  //   console.log('[analytics] GA already loaded');
  //   return;
  // }

  // Use the exact standard gtag snippet order: initialize dataLayer and the
  // command queue before loading the external script.
  win.dataLayer = win.dataLayer || [];
  // function gtag(...args: unknown[]) {
  //   win.dataLayer.push(args);
  // }
  // win.gtag = gtag;
  if(typeof win.gtag != 'function') return;
  win.gtag('js', new Date());
  // Enable debug_mode so events appear in GA4 DebugView.
  win.gtag('config', GA_ID, { debug_mode: true });
  console.log('[analytics] queued config for measurement ID:', GA_ID);

  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
  script.onload = () => {
    console.log('[analytics] gtag script loaded');
    console.log('[analytics] dataLayer contents:', win.dataLayer);
  };
  script.onerror = () => console.error('[analytics] failed to load gtag script');
  document.head.appendChild(script);

  // Expose a manual helper for diagnostics.
  // (window as unknown as Record<string, unknown>).__plainfileGaDebug = {
  //   measurementId: GA_ID,
  //   dataLayer: () => win.dataLayer,
  //   sendPageView: () => gtag('event', 'page_view'),
  // };

  win[LOADED_FLAG] = true;
  console.log('[analytics] GA initialized with measurement ID:', GA_ID);
}

/**
 * Track a GA event if the user has accepted analytics.
 */
export function gaEvent(action: string, params?: Record<string, unknown>): void {
  if (getConsent() !== 'accepted') return;

  const gtag = (window as typeof window & { gtag?: (...args: unknown[]) => void }).gtag;
  if (typeof gtag === 'function') {
    gtag('event', action, params);
  }
}
