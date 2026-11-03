/**
 * tools/DesignTool/errors.ts
 *
 * 2.1.316 新增：Claude Design 调用流程与错误类型（需同意、需项目授权、作用域不足、401）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-171dhyhe.js (16)
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

//@ chunk-171dhyhe.js:44646-44783 placement
class DesignNeedsConsentError extends Error {
  consent;
  constructor(consent) {
    super("Claude Design requires consent");
    this.consent = consent;
    this.name = "DesignNeedsConsentError";
  }
}
//@ chunk-171dhyhe.js:44783-44906 placement
function parseConsentError(e) {
  if (e == null || typeof e !== "object" || e.error !== "needs_consent") return null;
  let consent = e.consent;
  return isDesignConsentName(consent) ? consent : null;
}
//@ chunk-171dhyhe.js:44906-45066 placement
class DesignNeedsProjectGrantError extends Error {
  projectId;
  constructor(projectId) {
    super("Claude Design requires a project write grant");
    this.projectId = projectId;
    this.name = "DesignNeedsProjectGrantError";
  }
}
//@ chunk-171dhyhe.js:45066-45281 placement
function parseProjectGrantError(e) {
  if (e == null || typeof e !== "object" || e.error !== "needs_project_grant") return null;
  let projectId = e.project_id;
  if (
    typeof projectId !== "string" ||
    projectId.length === 0 ||
    projectId.length > MAX_PLAN_PATH_CHARS_2 - 2 ||
    !/^[A-Za-z0-9._-]+$/.test(projectId)
  )
    return null;
  return projectId;
}
//@ chunk-171dhyhe.js:45281-46137 placement
class DesignNeedsScopesError extends TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS {
  constructor(e) {
    super(
      e?.isNonInteractiveSession === true
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
}
//@ chunk-171dhyhe.js:46137-46147 placement
/**
 * 记住已下发目录哈希的条数上限（64），超出逐出最旧的。
 */
var MAX_SERVED_CATALOG_HASHES = 64;
//@ chunk-171dhyhe.js:46147-46358 placement
function rememberCatalogHash(e, t, c) {
  e.servedCatalogHashes.delete(t);
  e.servedCatalogHashes.set(t, c);
  if (e.servedCatalogHashes.size > MAX_SERVED_CATALOG_HASHES) {
    let n = e.servedCatalogHashes.keys().next().value;
    if (n !== undefined) e.servedCatalogHashes.delete(n);
  }
}
//@ chunk-171dhyhe.js:46358-46500 placement
function firstSentence(description) {
  let trimmed = description.replace(/\s+/g, " ").trim();
  let index = trimmed.indexOf(". ");
  let n = index > 0 ? trimmed.slice(0, index + 1) : trimmed;
  return n.length > 140 ? truncateToLength(n, 140).trimEnd() + "\u2026" : n;
}
//@ chunk-171dhyhe.js:46500-48615 placement
/**
 * 执行一次 Claude Design 操作：必要时先发现目录（tools/list）、初始化 MCP 会话，再 tools/call；处理同意、项目授权、作用域不足等错误。
 */
async function callDesignOperation(e, t, c, accessToken, r, l, a) {
  try {
    let y = null;
    if (t === LIST || isUnknownDesignOperation(t)) y = await discoverDesignToolsOnce(e, accessToken, r, a);
    if (t === LIST) {
      let mapped = (y ?? []).map((s) => ({
        name: s.name,
        description: s.description,
        inputSchema: s.inputSchema,
      }));
      let b =
        jsonStringify({
          tools: mapped,
        }) ?? "";
      let D = shortHash(b);
      let full = c?.full;
      if (
        !(full !== undefined && full !== false && full !== "false" && full !== 0 && full !== "") &&
        l !== null &&
        e.servedCatalogHashes.get(l) === D
      ) {
        rememberCatalogHash(e, l, D);
        let s = {
          catalog_unchanged: true,
          catalog_hash: D,
          note:
            `The operation catalog is unchanged since the earlier "${LIST}" result in this conversation (hash ${D}) \u2014 full descriptions and argument schemas are in that result. ` +
            `If it is no longer in context, call ${CLAUDE_DESIGN_TOOL_NAME}({operation: "${LIST}", arguments: {full: true}}) for the full catalog.`,
          operations: mapped.map((g) => ({
            name: g.name,
            summary: firstSentence(g.description),
          })),
        };
        return {
          operation: t,
          content: [
            {
              type: "text",
              text: jsonStringify(s),
            },
          ],
        };
      }
      if (l !== null) rememberCatalogHash(e, l, D);
      return {
        operation: t,
        content: [
          {
            type: "text",
            text: b,
          },
        ],
      };
    }
    if (y && designHintsFor(t) === undefined)
      return {
        operation: t,
        content: [
          {
            type: "text",
            text: `Unknown Claude Design operation "${t}". Call ${CLAUDE_DESIGN_TOOL_NAME}({operation: "${LIST}"}) to see the available operations.`,
          },
        ],
        isError: true,
      };
    let v = (designSession) =>
      postDesignMcp(
        {
          jsonrpc: "2.0",
          id: 1,
          method: "tools/call",
          params: {
            name: t,
            arguments: c,
          },
        },
        accessToken,
        designSession,
        r,
        a,
      );
    let designSession = await initializeDesignSession(e, accessToken, r, a);
    let m = await v(designSession);
    if (m.status === 404 && designSession) {
      resetDesignSession(e);
      m = await v(await initializeDesignSession(e, accessToken, r, a));
    }
    if (m.status === 403) {
      let consent = parseConsentError(m.data);
      if (consent !== null) throw new DesignNeedsConsentError(consent);
      let projectId = parseProjectGrantError(m.data);
      if (projectId !== null) throw new DesignNeedsProjectGrantError(projectId);
    }
    if (m.status < 200 || m.status >= 300)
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `Claude Design ${t} failed: HTTP ${m.status} ${redactToken(jsonStringify(m.data) ?? "", accessToken)}`,
        "design_tool_http_error",
      );
    let f = m.data;
    if (f.error)
      return {
        operation: t,
        content: [
          {
            type: "text",
            text: redactToken(
              `${f.error.message}${f.error.data ? ` \u2014 ${jsonStringify(f.error.data)}` : ""}`,
              accessToken,
            ),
          },
        ],
        isError: true,
      };
    return {
      operation: t,
      content: f.result?.content ?? [],
      isError: f.result?.isError,
    };
  } catch (error) {
    if (r.aborted) throw new AbortError();
    if (
      error instanceof TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS ||
      error instanceof DesignNeedsConsentError ||
      error instanceof DesignNeedsProjectGrantError
    )
      throw error;
    if (isCancelError(error))
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `Claude Design ${t} was cancelled because a concurrent Claude Design call was interrupted mid-handshake (the first calls of a session share one initialize/discovery round-trip). Retry the operation.`,
        "design_tool_shared_handshake_cancelled",
      );
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      redactToken(errorMessage(error), accessToken),
      "design_tool_request_failed",
    );
  }
}
//@ chunk-171dhyhe.js:48615-48760 placement
function isCancelError(error) {
  if (typeof error !== "object" || error === null) return false;
  let t = error;
  return t.name === "CanceledError" || t.name === "AbortError" || t.code === "ERR_CANCELED";
}
//@ chunk-171dhyhe.js:48760-48942 placement
function discoverDesignToolsOnce(e, t, c, n) {
  if (e.discoverInFlight) return e.discoverInFlight;
  let designTools = discoverDesignTools(e, t, c, n);
  e.discoverInFlight = designTools;
  return designTools.finally(() => {
    if (e.discoverInFlight === designTools) e.discoverInFlight = null;
  });
}
//@ chunk-171dhyhe.js:48942-49325 placement
async function discoverDesignTools(e, t, c, n) {
  let r = (designSession) =>
    postDesignMcp(
      {
        jsonrpc: "2.0",
        id: 1,
        method: "tools/list",
        params: {},
      },
      t,
      designSession,
      c,
      n,
    );
  let designSession = await initializeDesignSession(e, t, c, n);
  let a = await r(designSession);
  if (a.status === 404 && designSession) {
    resetDesignSession(e);
    a = await r(await initializeDesignSession(e, t, c, n));
  }
  if (a.status < 200 || a.status >= 300 || !Array.isArray(a.data.result?.tools))
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `Claude Design discovery failed: HTTP ${a.status}`,
      "design_tool_discovery_failed",
    );
  return recordDesignTools(a.data.result.tools);
}
//@ chunk-171dhyhe.js:49325-49430 placement
function resetDesignSession(e) {
  e.cachedSessionId = null;
  e.initialized = false;
  e.initializeInFlight = null;
  e.discoverInFlight = null;
}
//@ chunk-171dhyhe.js:49430-50121 placement
async function initializeDesignSession(e, t, c, n) {
  if (e.initialized) return e.cachedSessionId;
  if (e.initializeInFlight) return e.initializeInFlight;
  let r = (async () => {
    let l = await postDesignMcp(
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
      t,
      null,
      c,
      n,
      "text",
    );
    if (l.status < 200 || l.status >= 300)
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `Claude Design initialize failed: HTTP ${l.status}`,
        "design_tool_initialize_failed",
      );
    let a = l.response.headers["mcp-session-id"];
    e.cachedSessionId = typeof a === "string" && a ? a : null;
    e.initialized = true;
    return e.cachedSessionId;
  })();
  e.initializeInFlight = r;
  try {
    return await r;
  } finally {
    if (e.initializeInFlight === r) e.initializeInFlight = null;
  }
}
//@ chunk-171dhyhe.js:50121-50416 placement
class DesignAuth401Error extends TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS {
  wasRetried;
  constructor(wasRetried = false) {
    super(
      "Claude Design authentication failed (HTTP 401). The claude.ai credential is missing or expired \u2014 run /login, or /design login for a separate design credential.",
      "design_tool_auth_401",
    );
    this.name = "DesignAuth401Error";
    this.wasRetried = wasRetried;
  }
}
//@ chunk-171dhyhe.js:50760-53132 placement
async function handleDesignAuth401(credentials, t) {
  let c = t?.isNonInteractiveSession === true;
  let n =
    t?.wasRetried === true
      ? "Claude Design authentication failed (HTTP 401): a freshly refreshed credential was also rejected \u2014 likely a server-side access problem with this account or credential rather than simple expiry."
      : "Claude Design authentication failed (HTTP 401): the credential was rejected and an automatic refresh did not produce a new one.";
  let r;
  if (isStorageV5Enabled() && credentials !== undefined) r = await getClaudeAIOAuthTokensAsync(credentials);
  else r = getClaudeAIOAuthTokens();
  let l = !!r?.accessToken && !!r.refreshToken && r.scopes?.includes("user:design:read") === true;
  if (!l && (await hasDesignOAuthToken(credentials)))
    return {
      message: `${n} The design credential (from /design login) is expired or revoked${c ? ", and /design login requires an interactive terminal \u2014 re-authenticate outside this session" : " \u2014 run /design login to re-authenticate"}.`,
      remedy: {
        kind: "auth_expired",
        provider: "claude_design",
      },
    };
  if (!l && r?.accessToken && !r.refreshToken) {
    let { source } =
      isStorageV5Enabled() && credentials !== undefined
        ? await getAuthTokenSourceAsync(credentials)
        : getAuthTokenSource();
    if (env.CLAUDE_CODE_REMOTE_SESSION_ID)
      return {
        message: `${n} This remote session's credential is injected and rotated by the session host \u2014 it usually self-heals within minutes. Retry shortly; if this persists, the host session needs attention.`,
      };
    if (
      (source === "CCR_OAUTH_TOKEN_FILE" || source === "CLAUDE_CODE_OAUTH_TOKEN_FILE_DESCRIPTOR") &&
      (!isOauthTokenFromBgSnapshot() || isHostManagedProviderAuth())
    )
      return {
        message: `${n} This session authenticates with an OAuth token injected by the CCR host, which has no refresh token \u2014 it cannot self-heal and has likely expired or been revoked. The credential comes from the host session; check or restart it there.`,
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
        message: `${n} This session authenticates with the CLAUDE_CODE_OAUTH_TOKEN environment variable, which has no refresh token \u2014 it cannot self-heal and has likely expired or been revoked. Mint a fresh token with \`claude setup-token\` and restart the session with it${c ? "" : ", or unset it and run /login"}.`,
        remedy: {
          kind: "auth_overridden",
          provider: "claude_ai",
          managed: false,
        },
      };
  }
  let remedy = authExpiredBlock();
  if (c)
    return {
      message: `${n} The claude.ai credential is expired or revoked, and /login requires an interactive terminal \u2014 re-authenticate outside this session.`,
      remedy,
    };
  return {
    message: `${n} Run /login, or /design login for a separate design credential.`,
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
