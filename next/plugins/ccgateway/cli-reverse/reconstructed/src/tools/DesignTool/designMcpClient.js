/**
 * tools/DesignTool/designMcpClient.ts
 *
 * 2.1.316 新增：Claude Design MCP 客户端：向 /v1/design/mcp 发 JSON-RPC。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-ma8ytfb3.js (3)
 * attribution: placement 3
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { isFirstPartyAnthropicHost } from "../../utils/model/providers.js";
import { getOauthConfig } from "../../constants/oauth.js";
import { apiClient } from "../../services/routines/routinesApi.js";
import { getOAuthHeaders, MAX_RESULT_IMAGE_CHARS, redactToken } from "./DesignTool.js";
import {
  TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
  AbortError,
} from "../../utils/errors.js";
import { handleOAuth401ErrorImpl_2 } from "../../utils/auth.js";
import { jsonStringify, jsonParse } from "../../utils/slowOperations.js";
import { DesignAuth401Error, DesignNeedsScopesError } from "./errors.js";
import { setInteractiveHandlerHost } from "../../hooks/toolPermission/handlers/interactiveHandlerState.js";
import { isDesignGrantWatchEnabled } from "../../services/designSync/gates.js";
import { pollDesignGrantApproval } from "../../services/design/designApi.js";
import { DesignGateState } from "../../services/mcp/designPlanGate.js";
import { deferInit, beginDeferredInits } from "../../../runtime/deferred-init.js";

// This module is the first evaluated of an import cycle of 3 modules closed by ./DesignTool.js;
// the load-time work of the cycle's statements marked "deferred" waits until the cycle is complete (runtime/deferred-init.js).
beginDeferredInits("src/tools/DesignTool/DesignTool.js");
//@ chunk-ma8ytfb3.js:54284-55687 placement
/**
 * 向 api.anthropic.com/v1/design/mcp 发 JSON-RPC（带 Mcp-Session-Id、X-Anthropic-Client），解析 JSON 或 SSE 响应，策略拒绝时报错。
 */
async function postDesignMcp(
  body,
  accessToken,
  mcpSessionId,
  signal,
  oauthOptions,
  responseType,
  wasRetried = false,
) {
  if (!isFirstPartyAnthropicHost(getOauthConfig().BASE_API_URL))
    throw Error(
      "Claude Design is only reachable from api.anthropic.com; the current OAuth base URL is not on the first-party allowlist.",
    );
  let response = await apiClient.post("/v1/design/mcp", body, {
    auth: "none",
    headers: {
      ...getOAuthHeaders(accessToken),
      Accept: "application/json, text/event-stream",
      "X-Anthropic-Client": "claude-cli-design-tool",
      ...(mcpSessionId && {
        "Mcp-Session-Id": mcpSessionId,
      }),
    },
    timeout: 60000,
    maxContentLength: 16 * MAX_RESULT_IMAGE_CHARS,
    validateStatus: () => true,
    signal,
    ...(responseType && {
      responseType,
    }),
  });
  if (!response.ok)
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `Claude Design unavailable: ${response.reason}`,
      "design_tool_policy_refused",
    );
  if (response.status === 401) {
    if (!wasRetried && !signal.aborted) {
      let refreshedToken = await handleOAuth401ErrorImpl_2(accessToken, signal, oauthOptions);
      if (refreshedToken !== null && !signal.aborted)
        try {
          let retryResult = await postDesignMcp(
            body,
            refreshedToken,
            mcpSessionId,
            signal,
            oauthOptions,
            responseType,
            true,
          );
          if (typeof retryResult.data === "string") {
            if (retryResult.data.includes(refreshedToken))
              retryResult.data = redactToken(retryResult.data, refreshedToken);
          } else if (retryResult.data !== null && retryResult.data !== undefined) {
            let serializedData = jsonStringify(retryResult.data);
            if (serializedData !== undefined && serializedData.includes(refreshedToken))
              retryResult.data = jsonParse(redactToken(serializedData, refreshedToken));
          }
          return retryResult;
        } catch (error) {
          if (error instanceof Error)
            try {
              error.message = redactToken(error.message, refreshedToken);
            } catch {}
          throw error;
        }
    }
    if (!wasRetried && signal.aborted) throw new AbortError();
    throw new DesignAuth401Error(wasRetried);
  }
  if (response.status === 403) {
    let responseData = response.data;
    if (typeof responseData === "string")
      try {
        responseData = jsonParse(responseData);
      } catch {
        responseData = null;
      }
    if (
      responseData !== null &&
      typeof responseData === "object" &&
      responseData.error === "needs_design_scopes"
    )
      throw new DesignNeedsScopesError();
  }
  let contentType = response.response.headers["content-type"];
  if (typeof contentType === "string" && contentType.toLowerCase().startsWith("text/event-stream"))
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      "Claude Design returned a text/event-stream response; this client only handles JSON.",
      "design_tool_sse_unsupported",
    );
  return response;
}
//@ chunk-ma8ytfb3.js:55687-56745 placement
function designCredentialErrorMessage(designConsentKey, context) {
  let detailSuffix = designConsentKey.detail ? ` (${designConsentKey.detail})` : "";
  switch (designConsentKey.reason) {
    case "needs_design_login":
      if (context?.isNonInteractiveSession)
        return "Claude Design needs a claude.ai credential, and /design login cannot run in this non-interactive session. Ask the user to run /design login once from an interactive Claude Code session on this machine \u2014 non-interactive runs here then reuse that authorization. (CI runners and hosted sessions have no interactive session; Claude Design is not reachable from those without a stored /design login credential.)";
      return `No design-capable credential${detailSuffix}. Run /design login to authorize Claude Design.`;
    case "design_refresh_failed":
      return `Design token refresh failed${detailSuffix}. Retry shortly${context?.isNonInteractiveSession ? "" : ", or run /design login"}.`;
    case "wrong_provider":
      return "Claude Design is only available with claude.ai authentication. It is not supported through Bedrock, Vertex, or other third-party providers.";
    case "essential_traffic_only":
      return "Claude Design is disabled because nonessential network traffic is restricted.";
  }
}
//@ chunk-ma8ytfb3.js:56745-56856 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-ma8ytfb3.js:56745", () => {
  setInteractiveHandlerHost({
    isEnabled: isDesignGrantWatchEnabled,
    createObserver: (request, state, options) =>
      request.kind === "design_project_grant"
        ? pollDesignGrantApproval(state.get(DesignGateState), request.projectId, options)
        : null,
  });
});
export { designCredentialErrorMessage, postDesignMcp };
