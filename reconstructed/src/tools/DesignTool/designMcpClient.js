/**
 * tools/DesignTool/designMcpClient.ts
 *
 * 2.1.316 新增：Claude Design MCP 客户端：向 /v1/design/mcp 发 JSON-RPC。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-171dhyhe.js (3)
 * attribution: placement 3
 */
import { isFirstPartyAnthropicHost } from "../../utils/model/providers.js";
import { getOauthConfig } from "../../constants/oauth.js";
import { apiClient } from "../../services/routines/routinesApi.js";
import { getOAuthHeaders, ae, redactToken } from "./DesignTool.js";
import {
  TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
  AbortError,
} from "../../utils/errors.js";
import { handleOAuth401ErrorImpl_2 } from "../../utils/auth.js";
import { jsonStringify, jsonParse } from "../../utils/slowOperations.js";
import { DesignAuth401Error, DesignNeedsScopesError } from "./errors.js";
import { setInteractiveHandlerHost } from "../../hooks/toolPermission/handlers/interactiveHandlerState.js";
import { h$s } from "../../services/designSync/gates.js";
import { pollDesignGrantApproval } from "../../services/design/designApi.js";
import { DesignGateState } from "../../services/mcp/designPlanGate.js";

/**
 * 向 api.anthropic.com/v1/design/mcp 发 JSON-RPC（带 Mcp-Session-Id、X-Anthropic-Client），解析 JSON 或 SSE 响应，策略拒绝时报错。
 */
//@ chunk-171dhyhe.js:53132-54535 placement
async function postDesignMcp(e, t, c, n, r, l, a = !1) {
  if (!isFirstPartyAnthropicHost(getOauthConfig().BASE_API_URL))
    throw Error(
      "Claude Design is only reachable from api.anthropic.com; the current OAuth base URL is not on the first-party allowlist.",
    );
  let post = await apiClient.post("/v1/design/mcp", e, {
    auth: "none",
    headers: {
      ...getOAuthHeaders(t),
      Accept: "application/json, text/event-stream",
      "X-Anthropic-Client": "claude-cli-design-tool",
      ...(c && { "Mcp-Session-Id": c }),
    },
    timeout: 60000,
    maxContentLength: 16 * ae,
    validateStatus: () => !0,
    signal: n,
    ...(l && { responseType: l }),
  });
  if (!post.ok)
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `Claude Design unavailable: ${post.reason}`,
      "design_tool_policy_refused",
    );
  if (post.status === 401) {
    if (!a && !n.aborted) {
      let h = await handleOAuth401ErrorImpl_2(t, n, r);
      if (h !== null && !n.aborted)
        try {
          let m = await postDesignMcp(e, h, c, n, r, l, !0);
          if (typeof m.data === "string") {
            if (m.data.includes(h)) m.data = redactToken(m.data, h);
          } else if (m.data !== null && m.data !== void 0) {
            let f = jsonStringify(m.data);
            if (f !== void 0 && f.includes(h)) m.data = jsonParse(redactToken(f, h));
          }
          return m;
        } catch (error) {
          if (error instanceof Error)
            try {
              error.message = redactToken(error.message, h);
            } catch {}
          throw error;
        }
    }
    if (!a && n.aborted) throw new AbortError();
    throw new DesignAuth401Error(a);
  }
  if (post.status === 403) {
    let h = post.data;
    if (typeof h === "string")
      try {
        h = jsonParse(h);
      } catch {
        h = null;
      }
    if (h !== null && typeof h === "object" && h.error === "needs_design_scopes")
      throw new DesignNeedsScopesError();
  }
  let v = post.response.headers["content-type"];
  if (typeof v === "string" && v.toLowerCase().startsWith("text/event-stream"))
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      "Claude Design returned a text/event-stream response; this client only handles JSON.",
      "design_tool_sse_unsupported",
    );
  return post;
}
//@ chunk-171dhyhe.js:54535-55593 placement
function designCredentialErrorMessage(e, t) {
  let c = e.detail ? ` (${e.detail})` : "";
  switch (e.reason) {
    case "needs_design_login":
      if (t?.isNonInteractiveSession)
        return "Claude Design needs a claude.ai credential, and /design login cannot run in this non-interactive session. Ask the user to run /design login once from an interactive Claude Code session on this machine \u2014 non-interactive runs here then reuse that authorization. (CI runners and hosted sessions have no interactive session; Claude Design is not reachable from those without a stored /design login credential.)";
      return `No design-capable credential${c}. Run /design login to authorize Claude Design.`;
    case "design_refresh_failed":
      return `Design token refresh failed${c}. Retry shortly${t?.isNonInteractiveSession ? "" : ", or run /design login"}.`;
    case "wrong_provider":
      return "Claude Design is only available with claude.ai authentication. It is not supported through Bedrock, Vertex, or other third-party providers.";
    case "essential_traffic_only":
      return "Claude Design is disabled because nonessential network traffic is restricted.";
  }
}
//@ chunk-171dhyhe.js:55593-55704 placement
setInteractiveHandlerHost({
  isEnabled: h$s,
  createObserver: (e, t, c) =>
    e.kind === "design_project_grant"
      ? pollDesignGrantApproval(t.get(DesignGateState), e.projectId, c)
      : null,
});

export { designCredentialErrorMessage, postDesignMcp };
