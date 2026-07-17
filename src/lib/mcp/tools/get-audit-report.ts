import { createClient } from "@supabase/supabase-js";
import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { z } from "zod";

function db(ctx: ToolContext) {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export default defineTool({
  name: "get_audit_report",
  title: "Get audit report detail",
  description:
    "Return the full detail of a single Ivero audit report by id: overall score, per-pillar breakdown, radar data, keyword cloud and per-engine mentions.",
  inputSchema: {
    id: z
      .string()
      .describe("Audit report id. Use `list_audit_reports` first, or omit to fetch the most recent."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ id }, ctx) => {
    if (!ctx.isAuthenticated())
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    const client = db(ctx);
    let query = client
      .from("audit_reports")
      .select(
        "id, created_at, site_url, overall_score, status_label, pillar_details, radar_data, keyword_cloud, ai_engines, source"
      )
      .eq("user_id", ctx.getUserId());
    if (id) query = query.eq("id", id);
    else query = query.order("created_at", { ascending: false });
    const { data, error } = await query.limit(1).maybeSingle();
    if (error)
      return { content: [{ type: "text", text: error.message }], isError: true };
    if (!data)
      return { content: [{ type: "text", text: "No audit report found." }] };
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      structuredContent: { report: data },
    };
  },
});
