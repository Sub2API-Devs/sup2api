/**
 * tools/DesignTool/errors.ts
 *
 * 2.1.316 新增：Claude Design 调用流程与错误类型（需同意、需项目授权、作用域不足、401）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-ma8ytfb3.js (16)
 * attribution: placement 16
 */
import { isDesignConsentName, hasDesignOAuthToken } from "../../services/design/designApi.js";
import { MAX_PLAN_PATH_CHARS_2 } from "../../services/mcp/designPlanGate.js";
import {
  TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
  AbortError,
  errorMessage,
} from "../../utils/errors.js";
import { tagObject, authExpiredBlock } from "../../services/policyLimits/capabilityBlocks.js";
import { truncateToLength } from "../../utils/stringUtils.js";
import { LIST, CLAUDE_DESIGN_TOOL_NAME } from "../ClaudeDesignTool/constants.js";
import { isUnknownDesignOperation, designHintsFor, redactToken, recordDesignTools } from "./DesignTool.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import { shortHash } from "../../utils/shortHash.js";
import { postDesignMcp } from "./designMcpClient.js";
import { isStorageV5Enabled } from "../../utils/hoverRest.js";
import {
  getClaudeAIOAuthTokensAsync,
  getClaudeAIOAuthTokens,
  getAuthTokenSourceAsync,
  getAuthTokenSource,
  isHostManagedProviderAuth,
} from "../../utils/auth.js";
import { env } from "../../utils/env.js";
import { isOauthTokenFromBgSnapshot } from "../../bootstrap/state.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-ma8ytfb3.js:45794-45931 placement
class DesignNeedsConsentError extends Error {
  consent;
  constructor(consent) {
    super("Claude Design requires consent");
    this.consent = consent;
    this.name = "DesignNeedsConsentError";
  }
}
//@ chunk-ma8ytfb3.js:45931-46054 placement
function parseConsentError(body) {
  if (body == null || typeof body !== "object" || body.error !== "needs_consent") return null;
  let consent = body.consent;
  return isDesignConsentName(consent) ? consent : null;
}
//@ chunk-ma8ytfb3.js:46054-46214 placement
class DesignNeedsProjectGrantError extends Error {
  projectId;
  constructor(projectId) {
    super("Claude Design requires a project write grant");
    this.projectId = projectId;
    this.name = "DesignNeedsProjectGrantError";
  }
}
//@ chunk-ma8ytfb3.js:46214-46429 placement
function parseProjectGrantError(body) {
  if (body == null || typeof body !== "object" || body.error !== "needs_project_grant") return null;
  let projectId = body.project_id;
  if (
    typeof projectId !== "string" ||
    projectId.length === 0 ||
    projectId.length > MAX_PLAN_PATH_CHARS_2 - 2 ||
    !/^[A-Za-z0-9._-]+$/.test(projectId)
  )
    return null;
  return projectId;
}
//@ chunk-ma8ytfb3.js:46429-47285 placement
let DesignNeedsScopesError; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-ma8ytfb3.js:46429", () => {
  DesignNeedsScopesError = class DesignNeedsScopesError extends (
    TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS
  ) {
    constructor(options) {
      super(
        options?.isNonInteractiveSession === true
          ? "Claude Design rejected this session's claude.ai credential (HTTP 403): it does not carry Claude Design access, and /design login cannot run in this non-interactive session. Ask the user to run /design login once from an interactive Claude Code session on this machine \u2014 non-interactive runs here then reuse that authorization. (CI runners and hosted sessions have no interactive session; Claude Design is not reachable from those without a stored /design login credential.)"
          : "Claude Design rejected this session's claude.ai credential (HTTP 403): it does not carry Claude Design access. Run /design login to authorize Claude Design, then retry.",
        "design_tool_needs_design_scopes",
      );
      this.name = "DesignNeedsScopesError";
      tagObject(this, {
        kind: "auth_missing_scope",
        provider: "claude_design",
      });
    }
  };
});
//@ chunk-ma8ytfb3.js:47285-47295 placement
/**
 * 记住已下发目录哈希的条数上限（64），超出逐出最旧的。
 */
var MAX_SERVED_CATALOG_HASHES = 64;
//@ chunk-ma8ytfb3.js:47295-47506 placement
function rememberCatalogHash(state, agentId, hash) {
  state.servedCatalogHashes.delete(agentId);
  state.servedCatalogHashes.set(agentId, hash);
  if (state.servedCatalogHashes.size > MAX_SERVED_CATALOG_HASHES) {
    let oldestAgentId = state.servedCatalogHashes.keys().next().value;
    if (oldestAgentId !== undefined) state.servedCatalogHashes.delete(oldestAgentId);
  }
}
//@ chunk-ma8ytfb3.js:47506-47647 placement
function firstSentence(description) {
  let trimmed = description.replace(/\s+/g, " ").trim();
  let index = trimmed.indexOf(". ");
  let firstClause = index > 0 ? trimmed.slice(0, index + 1) : trimmed;
  return firstClause.length > 140 ? truncateToLength(firstClause, 140).trimEnd() + "\u2026" : firstClause;
}
//@ chunk-ma8ytfb3.js:47647-49764 placement
/**
 * 执行一次 Claude Design 操作：必要时先发现目录（tools/list）、初始化 MCP 会话，再 tools/call；处理同意、项目授权、作用域不足等错误。
 */
async function callDesignOperation(state, operation, args, accessToken, signal, agentId, credentials) {
  try {
    let discoveredTools = null;
    if (operation === LIST || isUnknownDesignOperation(operation))
      discoveredTools = await discoverDesignToolsOnce(state, accessToken, signal, credentials);
    if (operation === LIST) {
      let mapped = (discoveredTools ?? []).map((tool) => ({
        name: tool.name,
        description: tool.description,
        inputSchema: tool.inputSchema,
      }));
      let catalogJson =
        jsonStringify({
          tools: mapped,
        }) ?? "";
      let catalogHash = shortHash(catalogJson);
      let full = args?.full;
      if (
        !(full !== undefined && full !== false && full !== "false" && full !== 0 && full !== "") &&
        agentId !== null &&
        state.servedCatalogHashes.get(agentId) === catalogHash
      ) {
        rememberCatalogHash(state, agentId, catalogHash);
        let unchangedResult = {
          catalog_unchanged: true,
          catalog_hash: catalogHash,
          note:
            `The operation catalog is unchanged since the earlier "${LIST}" result in this conversation (hash ${catalogHash}) \u2014 full descriptions and argument schemas are in that result. ` +
            `If it is no longer in context, call ${CLAUDE_DESIGN_TOOL_NAME}({operation: "${LIST}", arguments: {full: true}}) for the full catalog.`,
          operations: mapped.map((tool) => ({
            name: tool.name,
            summary: firstSentence(tool.description),
          })),
        };
        return {
          operation,
          content: [
            {
              type: "text",
              text: jsonStringify(unchangedResult),
            },
          ],
        };
      }
      if (agentId !== null) rememberCatalogHash(state, agentId, catalogHash);
      return {
        operation,
        content: [
          {
            type: "text",
            text: catalogJson,
          },
        ],
      };
    }
    if (discoveredTools && designHintsFor(operation) === undefined)
      return {
        operation,
        content: [
          {
            type: "text",
            text: `Unknown Claude Design operation "${operation}". Call ${CLAUDE_DESIGN_TOOL_NAME}({operation: "${LIST}"}) to see the available operations.`,
          },
        ],
        isError: true,
      };
    let callTool = (designSession) =>
      postDesignMcp(
        {
          jsonrpc: "2.0",
          id: 1,
          method: "tools/call",
          params: {
            name: operation,
            arguments: args,
          },
        },
        accessToken,
        designSession,
        signal,
        credentials,
      );
    let designSession = await initializeDesignSession(state, accessToken, signal, credentials);
    let response = await callTool(designSession);
    if (response.status === 404 && designSession) {
      resetDesignSession(state);
      response = await callTool(await initializeDesignSession(state, accessToken, signal, credentials));
    }
    if (response.status === 403) {
      let consent = parseConsentError(response.data);
      if (consent !== null) throw new DesignNeedsConsentError(consent);
      let projectId = parseProjectGrantError(response.data);
      if (projectId !== null) throw new DesignNeedsProjectGrantError(projectId);
    }
    if (response.status < 200 || response.status >= 300)
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `Claude Design ${operation} failed: HTTP ${response.status} ${redactToken(jsonStringify(response.data) ?? "", accessToken)}`,
        "design_tool_http_error",
      );
    let responseData = response.data;
    if (responseData.error)
      return {
        operation,
        content: [
          {
            type: "text",
            text: redactToken(
              `${responseData.error.message}${responseData.error.data ? ` \u2014 ${jsonStringify(responseData.error.data)}` : ""}`,
              accessToken,
            ),
          },
        ],
        isError: true,
      };
    return {
      operation,
      content: responseData.result?.content ?? [],
      isError: responseData.result?.isError,
    };
  } catch (error) {
    if (signal.aborted) throw new AbortError();
    if (
      error instanceof TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS ||
      error instanceof DesignNeedsConsentError ||
      error instanceof DesignNeedsProjectGrantError
    )
      throw error;
    if (isCancelError(error))
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `Claude Design ${operation} was cancelled because a concurrent Claude Design call was interrupted mid-handshake (the first calls of a session share one initialize/discovery round-trip). Retry the operation.`,
        "design_tool_shared_handshake_cancelled",
      );
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      redactToken(errorMessage(error), accessToken),
      "design_tool_request_failed",
    );
  }
}
//@ chunk-ma8ytfb3.js:49764-49909 placement
function isCancelError(error) {
  if (typeof error !== "object" || error === null) return false;
  let errorObject = error;
  return (
    errorObject.name === "CanceledError" ||
    errorObject.name === "AbortError" ||
    errorObject.code === "ERR_CANCELED"
  );
}
//@ chunk-ma8ytfb3.js:49909-50091 placement
function discoverDesignToolsOnce(state, accessToken, signal, credentials) {
  if (state.discoverInFlight) return state.discoverInFlight;
  let designTools = discoverDesignTools(state, accessToken, signal, credentials);
  state.discoverInFlight = designTools;
  return designTools.finally(() => {
    if (state.discoverInFlight === designTools) state.discoverInFlight = null;
  });
}
//@ chunk-ma8ytfb3.js:50091-50476 placement
async function discoverDesignTools(state, accessToken, signal, credentials) {
  let listTools = (designSession) =>
    postDesignMcp(
      {
        jsonrpc: "2.0",
        id: 1,
        method: "tools/list",
        params: {},
      },
      accessToken,
      designSession,
      signal,
      credentials,
    );
  let designSession = await initializeDesignSession(state, accessToken, signal, credentials);
  let response = await listTools(designSession);
  if (response.status === 404 && designSession) {
    resetDesignSession(state);
    response = await listTools(await initializeDesignSession(state, accessToken, signal, credentials));
  }
  if (response.status < 200 || response.status >= 300 || !Array.isArray(response.data.result?.tools))
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `Claude Design discovery failed: HTTP ${response.status}`,
      "design_tool_discovery_failed",
    );
  return recordDesignTools(response.data.result.tools);
}
//@ chunk-ma8ytfb3.js:50476-50581 placement
function resetDesignSession(state) {
  state.cachedSessionId = null;
  state.initialized = false;
  state.initializeInFlight = null;
  state.discoverInFlight = null;
}
//@ chunk-ma8ytfb3.js:50581-51273 placement
async function initializeDesignSession(state, accessToken, signal, credentials) {
  if (state.initialized) return state.cachedSessionId;
  if (state.initializeInFlight) return state.initializeInFlight;
  let initializePromise = (async () => {
    let response = await postDesignMcp(
      {
        jsonrpc: "2.0",
        id: 0,
        method: "initialize",
        params: {
          protocolVersion: "2025-03-26",
          capabilities: {},
          clientInfo: {
            name: "claude-cli-design-tool",
            version: "1",
          },
        },
      },
      accessToken,
      null,
      signal,
      credentials,
      "text",
    );
    if (response.status < 200 || response.status >= 300)
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `Claude Design initialize failed: HTTP ${response.status}`,
        "design_tool_initialize_failed",
      );
    let sessionIdHeader = response.response.headers["mcp-session-id"];
    state.cachedSessionId = typeof sessionIdHeader === "string" && sessionIdHeader ? sessionIdHeader : null;
    state.initialized = true;
    return state.cachedSessionId;
  })();
  state.initializeInFlight = initializePromise;
  try {
    return await initializePromise;
  } finally {
    if (state.initializeInFlight === initializePromise) state.initializeInFlight = null;
  }
}
//@ chunk-ma8ytfb3.js:51273-51568 placement
let DesignAuth401Error; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-ma8ytfb3.js:51273", () => {
  DesignAuth401Error = class DesignAuth401Error extends (
    TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS
  ) {
    wasRetried;
    constructor(wasRetried = false) {
      super(
        "Claude Design authentication failed (HTTP 401). The claude.ai credential is missing or expired \u2014 run /login, or /design login for a separate design credential.",
        "design_tool_auth_401",
      );
      this.name = "DesignAuth401Error";
      this.wasRetried = wasRetried;
    }
  };
});
//@ chunk-ma8ytfb3.js:51912-54284 placement
async function handleDesignAuth401(credentials, options) {
  let isNonInteractive = options?.isNonInteractiveSession === true;
  let failureText =
    options?.wasRetried === true
      ? "Claude Design authentication failed (HTTP 401): a freshly refreshed credential was also rejected \u2014 likely a server-side access problem with this account or credential rather than simple expiry."
      : "Claude Design authentication failed (HTTP 401): the credential was rejected and an automatic refresh did not produce a new one.";
  let oauthTokens;
  if (isStorageV5Enabled() && credentials !== undefined)
    oauthTokens = await getClaudeAIOAuthTokensAsync(credentials);
  else oauthTokens = getClaudeAIOAuthTokens();
  let hasDesignScope =
    !!oauthTokens?.accessToken &&
    !!oauthTokens.refreshToken &&
    oauthTokens.scopes?.includes("user:design:read") === true;
  if (!hasDesignScope && (await hasDesignOAuthToken(credentials)))
    return {
      message: `${failureText} The design credential (from /design login) is expired or revoked${isNonInteractive ? ", and /design login requires an interactive terminal \u2014 re-authenticate outside this session" : " \u2014 run /design login to re-authenticate"}.`,
      remedy: {
        kind: "auth_expired",
        provider: "claude_design",
      },
    };
  if (!hasDesignScope && oauthTokens?.accessToken && !oauthTokens.refreshToken) {
    let { source } =
      isStorageV5Enabled() && credentials !== undefined
        ? await getAuthTokenSourceAsync(credentials)
        : getAuthTokenSource();
    if (env.CLAUDE_CODE_REMOTE_SESSION_ID)
      return {
        message: `${failureText} This remote session's credential is injected and rotated by the session host \u2014 it usually self-heals within minutes. Retry shortly; if this persists, the host session needs attention.`,
      };
    if (
      (source === "CCR_OAUTH_TOKEN_FILE" || source === "CLAUDE_CODE_OAUTH_TOKEN_FILE_DESCRIPTOR") &&
      (!isOauthTokenFromBgSnapshot() || isHostManagedProviderAuth())
    )
      return {
        message: `${failureText} This session authenticates with an OAuth token injected by the CCR host, which has no refresh token \u2014 it cannot self-heal and has likely expired or been revoked. The credential comes from the host session; check or restart it there.`,
        remedy: {
          kind: "auth_overridden",
          provider: "claude_ai",
          managed: true,
        },
      };
    if (
      source === "CLAUDE_CODE_OAUTH_TOKEN" ||
      (source === "ANTHROPIC_AUTH_TOKEN" && Boolean(env.CLAUDE_CODE_OAUTH_TOKEN))
    )
      return {
        message: `${failureText} This session authenticates with the CLAUDE_CODE_OAUTH_TOKEN environment variable, which has no refresh token \u2014 it cannot self-heal and has likely expired or been revoked. Mint a fresh token with \`claude setup-token\` and restart the session with it${isNonInteractive ? "" : ", or unset it and run /login"}.`,
        remedy: {
          kind: "auth_overridden",
          provider: "claude_ai",
          managed: false,
        },
      };
  }
  let remedy = authExpiredBlock();
  if (isNonInteractive)
    return {
      message: `${failureText} The claude.ai credential is expired or revoked, and /login requires an interactive terminal \u2014 re-authenticate outside this session.`,
      remedy,
    };
  return {
    message: `${failureText} Run /login, or /design login for a separate design credential.`,
    remedy,
  };
}
export {
  callDesignOperation,
  DesignAuth401Error,
  handleDesignAuth401,
  DesignNeedsScopesError,
  DesignNeedsProjectGrantError,
  DesignNeedsConsentError,
};
