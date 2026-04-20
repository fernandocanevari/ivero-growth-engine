import posthog from "posthog-js";

/**
 * Ivero Analytics — PostHog EU Cloud (Frankfurt) wrapper.
 *
 * Why a wrapper:
 *  - Single source of truth for the API host (GDPR/LGPD: data stays in EU).
 *  - DEV (localhost / lovable preview) is silenced so QA doesn't pollute funnels.
 *  - PROD starts opted-OUT and only opts-in after explicit user consent (LGPD).
 *  - One-line kill switch: set `ENABLED = false` to disable everything globally.
 */

const PUBLIC_KEY = "phc_kyHRgaNd3gBskVfVTodQUVLfzqLfjPNroAEMDHj2gUvn";
const API_HOST = "https://eu.i.posthog.com";

// Master kill switch — flip to false to disable analytics across the app.
const ENABLED = true;

// localStorage key for storing the user's consent choice.
export const CONSENT_STORAGE_KEY = "ivero_cookie_consent";
export type ConsentStatus = "granted" | "denied" | "unknown";

// In Lovable preview & local dev, PostHog runs but opts out of capture so we
// don't inflate metrics with our own QA traffic. Production users still tracked.
const isDevEnvironment = (): boolean => {
  if (typeof window === "undefined") return true;
  const host = window.location.hostname;
  return (
    host === "localhost" ||
    host === "127.0.0.1" ||
    host.endsWith(".lovable.app") || // preview/sandbox previews
    host.endsWith(".lovableproject.com")
  );
};

let initialized = false;

export function getConsentStatus(): ConsentStatus {
  if (typeof window === "undefined") return "unknown";
  try {
    const v = window.localStorage.getItem(CONSENT_STORAGE_KEY);
    if (v === "granted" || v === "denied") return v;
    return "unknown";
  } catch {
    return "unknown";
  }
}

export function initAnalytics(): void {
  if (!ENABLED || initialized || typeof window === "undefined") return;
  initialized = true;

  posthog.init(PUBLIC_KEY, {
    api_host: API_HOST,
    autocapture: false, // we send explicit events only — cleaner funnels
    capture_pageview: true, // automatic SPA pageviews
    capture_pageleave: true,
    persistence: "localStorage+cookie",
    respect_dnt: true, // honor Do Not Track for LGPD compliance
    disable_session_recording: true, // off until we explicitly want it
    // Start opted-OUT in production until the user grants consent (LGPD principle:
    // collect data only AFTER explicit consent). Once they accept the banner,
    // setConsent('granted') flips the switch.
    opt_out_capturing_by_default: true,
    loaded: (ph) => {
      // DEV: always silenced regardless of consent — we don't pollute metrics from QA.
      if (isDevEnvironment()) {
        ph.opt_out_capturing();
        return;
      }
      // PROD: respect previously stored consent decision.
      const status = getConsentStatus();
      if (status === "granted") {
        ph.opt_in_capturing();
      } else {
        ph.opt_out_capturing();
      }
    },
  });
}

/**
 * Update the consent decision — called from the cookie banner.
 * Persists to localStorage and immediately flips PostHog's capture state.
 * In DEV, we still keep capture off (QA traffic should never count).
 */
export function setConsent(status: "granted" | "denied"): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(CONSENT_STORAGE_KEY, status);
  } catch {
    /* ignore storage errors (private mode, quota, etc.) */
  }
  if (!ENABLED || !initialized) return;
  if (isDevEnvironment()) {
    posthog.opt_out_capturing();
    return;
  }
  if (status === "granted") {
    posthog.opt_in_capturing();
  } else {
    posthog.opt_out_capturing();
    // Best-effort: clear any PII PostHog may have buffered before consent.
    try { posthog.reset(); } catch { /* ignore */ }
  }
}

type EventProps = Record<string, string | number | boolean | null | undefined>;

export function track(event: string, properties?: EventProps): void {
  if (!ENABLED || !initialized) return;
  try {
    posthog.capture(event, properties);
  } catch (err) {
    // Never let analytics break the app
    console.warn("[analytics] track failed:", err);
  }
}

/**
 * Identify a user by EMAIL before they have an auth.users.id.
 * Useful for connecting Hero form → Preview gate → Signup events
 * to a single person in PostHog before the Supabase user is created.
 */
export function identifyLead(email: string, traits?: EventProps): void {
  if (!ENABLED || !initialized || !email) return;
  try {
    posthog.identify(email.toLowerCase(), { email, ...traits });
  } catch (err) {
    console.warn("[analytics] identifyLead failed:", err);
  }
}

/**
 * Identify a user by their Supabase auth.users.id after signup.
 * Aliases the previous lead identity (email) to the new user_id so the
 * full pre-signup → post-signup journey is stitched into one PostHog person.
 */
export function identifyUser(userId: string, traits?: EventProps): void {
  if (!ENABLED || !initialized || !userId) return;
  try {
    if (traits?.email && typeof traits.email === "string") {
      posthog.alias(userId, traits.email.toLowerCase());
    }
    posthog.identify(userId, traits);
  } catch (err) {
    console.warn("[analytics] identifyUser failed:", err);
  }
}

/**
 * Clear identity on logout so the next person on this device isn't
 * tracked as the previous user.
 */
export function resetIdentity(): void {
  if (!ENABLED || !initialized) return;
  try {
    posthog.reset();
  } catch (err) {
    console.warn("[analytics] resetIdentity failed:", err);
  }
}
