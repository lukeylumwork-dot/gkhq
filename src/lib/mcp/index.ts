import { auth, defineMcp } from "@lovable.dev/mcp-js";
import whoamiTool from "./tools/whoami";
import listMatchReportsTool from "./tools/list-match-reports";

// The OAuth issuer MUST be the direct Supabase host — the .lovable.cloud proxy
// is rejected on RFC 8414 issuer mismatch. VITE_SUPABASE_PROJECT_ID is inlined
// by Vite at build time; the fallback keeps the string well-formed during the
// throwaway manifest-extract eval.
const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "gkhq-mcp",
  title: "Mentor Hub",
  version: "0.1.0",
  instructions:
    "Tools for Mentor Hub, a goalkeeper performance management platform. Use `whoami` to confirm the signed-in mentor, and `list_match_reports` to browse recent match reports the caller is allowed to see. All reads respect the app's per-user access controls.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [whoamiTool, listMatchReportsTool],
});
