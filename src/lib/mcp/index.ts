import { auth, defineMcp } from "@lovable.dev/mcp-js";
import getBrandProfile from "./tools/get-brand-profile";
import listAuditReports from "./tools/list-audit-reports";
import getAuditReport from "./tools/get-audit-report";
import listCompetitors from "./tools/list-competitors";

// Issuer MUST be the direct supabase.co host, built from the project ref
// (never SUPABASE_URL — which may be a proxy on managed setups).
const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "ivero-mcp",
  title: "Ivero — AI Influence Auditor",
  version: "0.1.0",
  instructions:
    "Ivero audits how AI assistants (ChatGPT, Gemini, Google AI Mode, Claude) mention a brand. Use these read-only tools to fetch the signed-in user's brand profile, competitors and audit reports (overall score, per-pillar breakdown, keyword cloud, per-engine mentions).",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [getBrandProfile, listAuditReports, getAuditReport, listCompetitors],
});
