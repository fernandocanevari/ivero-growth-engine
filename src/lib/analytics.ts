import posthog from "posthog-js";

/**
 * Ivero Analytics — PostHog EU Cloud (Frankfurt) wrapper.
 *
 * Why a wrapper:
 *  - Single source of truth for the API host (GDPR/LGPD: data stays in EU).
 *  - Lets us silence DEV (own browser) so test sessions don't pollute funnels.
 *  - Encapsulates identify/reset so callers don't need to know PostHog internals.
 *  - One-line kill switch: set `ENABLED = false` to disable everything globally.
 */

const PUBLIC_KEY = "phc_kyHRgaNd3gBskVfVTodQUVLfzqLfjPNroAEMDHj2gUvn";
const API_HOST = "https://eu.i.posthog.com";

// Master kill switch — flip to false to disable analytics across the app.
const ENABLED = true;

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
    loaded: (ph) => {
      if (isDevEnvironment()) {
        ph.opt_out_capturing();
      }
    },
  });
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
