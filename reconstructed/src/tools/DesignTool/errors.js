/**
 * tools/DesignTool/errors.ts
 *
 * 2.1.316 新增：Claude Design 调用流程与错误类型（需同意、需项目授权、作用域不足、401）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-171dhyhe.js (15)
 * attribution: placement 15
 */
import { Dan } from "../../services/design/designApi.js";
import { MAX_PLAN_PATH_CHARS } from "../../services/mcp/designPlanGate.js";
import {
  TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
  AbortError,
  errorMessage,
} from "../../utils/errors.js";
import { tagObject } from "../../services/policyLimits/capabilityBlocks.js";
import { truncateToLength } from "../../utils/stringUtils.js";
import { LIST, CLAUDE_DESIGN_TOOL_NAME } from "../ClaudeDesignTool/constants.js";
import { isUnknownDesignOperation, designHintsFor, redactToken, recordDesignTools } from "./DesignTool.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import { gn } from "../../utils/shortHash.js";
import { postDesignMcp } from "./designMcpClient.js";

//@ chunk-171dhyhe.js:44646-44783 placement
class DesignNeedsConsentError extends Error {
  consent;
  constructor(e) {
    super("Claude Design requires consent");
    this.consent = e;
    this.name = "DesignNeedsConsentError";
  }
}
//@ chunk-171dhyhe.js:44783-44906 placement
function parseConsentError(e) {
  if (e == null || typeof e !== "object" || e.error !== "needs_consent") return null;
  let consent = e.consent;
  return Dan(consent) ? consent : null;
}
//@ chunk-171dhyhe.js:44906-45066 placement
class DesignNeedsProjectGrantError extends Error {
  projectId;
  constructor(e) {
    super("Claude Design requires a project write grant");
    this.projectId = e;
    this.name = "DesignNeedsProjectGrantError";
  }
}
//@ chunk-171dhyhe.js:45066-45281 placement
function parseProjectGrantError(e) {
  if (e == null || typeof e !== "object" || e.error !== "needs_project_grant") return null;
  let project_id = e.project_id;
  if (
    typeof project_id !== "string" ||
    project_id.length === 0 ||
    project_id.length > MAX_PLAN_PATH_CHARS - 2 ||
    !/^[A-Za-z0-9._-]+$/.test(project_id)
  )
    return null;
  return project_id;
}
//@ chunk-171dhyhe.js:45281-46137 placement
class DesignNeedsScopesError extends TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS {
  constructor(e) {
    super(
      e?.isNonInteractiveSession === !0
        ? "Claude Design rejected this session's claude.ai credential (HTTP 403): it does not carry Claude Design access, and /design login cannot run in this non-interactive session. Ask the user to run /design login once from an interactive Claude Code session on this machine \u2014 non-interactive runs here then reuse that authorization. (CI runners and hosted sessions have no interactive session; Claude Design is not reachable from those without a stored /design login credential.)"
        : "Claude Design rejected this session's claude.ai credential (HTTP 403): it does not carry Claude Design access. Run /design login to authorize Claude Design, then retry.",
      "design_tool_needs_design_scopes",
    );
    ((this.name = "DesignNeedsScopesError"),
      tagObject(this, { kind: "auth_missing_scope", provider: "claude_design" }));
  }
}
//@ chunk-171dhyhe.js:46137-46147 placement
var Le = 64;
//@ chunk-171dhyhe.js:46147-46358 placement
function rememberCatalogHash(e, t, c) {
  if ((e.servedCatalogHashes.delete(t), e.servedCatalogHashes.set(t, c), e.servedCatalogHashes.size > Le)) {
    let n = e.servedCatalogHashes.keys().next().value;
    if (n !== void 0) e.servedCatalogHashes.delete(n);
  }
}
//@ chunk-171dhyhe.js:46358-46500 placement
function firstSentence(e) {
  let trimmed = e.replace(/\s+/g, " ").trim(),
    index = trimmed.indexOf(". "),
    n = index > 0 ? trimmed.slice(0, index + 1) : trimmed;
  return n.length > 140 ? truncateToLength(n, 140).trimEnd() + "\u2026" : n;
}
/**
 * 执行一次 Claude Design 操作：必要时先发现目录（tools/list）、初始化 MCP 会话，再 tools/call；处理同意、项目授权、作用域不足等错误。
 */
//@ chunk-171dhyhe.js:46500-48615 placement
async function callDesignOperation(e, t, c, n, r, l, a) {
  try {
    let y = null;
    if (t === LIST || isUnknownDesignOperation(t)) y = await discoverDesignToolsOnce(e, n, r, a);
    if (t === LIST) {
      let mapped = (y ?? []).map((s) => ({
          name: s.name,
          description: s.description,
          inputSchema: s.inputSchema,
        })),
        b = jsonStringify({ tools: mapped }) ?? "",
        D = gn(b),
        j = c?.full;
      if (
        !(j !== void 0 && j !== !1 && j !== "false" && j !== 0 && j !== "") &&
        l !== null &&
        e.servedCatalogHashes.get(l) === D
      ) {
        rememberCatalogHash(e, l, D);
        let s = {
          catalog_unchanged: !0,
          catalog_hash: D,
          note:
            `The operation catalog is unchanged since the earlier "${LIST}" result in this conversation (hash ${D}) \u2014 full descriptions and argument schemas are in that result. ` +
            `If it is no longer in context, call ${CLAUDE_DESIGN_TOOL_NAME}({operation: "${LIST}", arguments: {full: true}}) for the full catalog.`,
          operations: mapped.map((g) => ({ name: g.name, summary: firstSentence(g.description) })),
        };
        return { operation: t, content: [{ type: "text", text: jsonStringify(s) }] };
      }
      if (l !== null) rememberCatalogHash(e, l, D);
      return { operation: t, content: [{ type: "text", text: b }] };
    }
    if (y && designHintsFor(t) === void 0)
      return {
        operation: t,
        content: [
          {
            type: "text",
            text: `Unknown Claude Design operation "${t}". Call ${CLAUDE_DESIGN_TOOL_NAME}({operation: "${LIST}"}) to see the available operations.`,
          },
        ],
        isError: !0,
      };
    let v = (w) =>
        postDesignMcp(
          { jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: t, arguments: c } },
          n,
          w,
          r,
          a,
        ),
      h = await initializeDesignSession(e, n, r, a),
      m = await v(h);
    if (m.status === 404 && h)
      (resetDesignSession(e), (m = await v(await initializeDesignSession(e, n, r, a))));
    if (m.status === 403) {
      let w = parseConsentError(m.data);
      if (w !== null) throw new DesignNeedsConsentError(w);
      let b = parseProjectGrantError(m.data);
      if (b !== null) throw new DesignNeedsProjectGrantError(b);
    }
    if (m.status < 200 || m.status >= 300)
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `Claude Design ${t} failed: HTTP ${m.status} ${redactToken(jsonStringify(m.data) ?? "", n)}`,
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
              n,
            ),
          },
        ],
        isError: !0,
      };
    return { operation: t, content: f.result?.content ?? [], isError: f.result?.isError };
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
      redactToken(errorMessage(error), n),
      "design_tool_request_failed",
    );
  }
}
//@ chunk-171dhyhe.js:48615-48760 placement
function isCancelError(e) {
  if (typeof e !== "object" || e === null) return !1;
  let t = e;
  return t.name === "CanceledError" || t.name === "AbortError" || t.code === "ERR_CANCELED";
}
//@ chunk-171dhyhe.js:48760-48942 placement
function discoverDesignToolsOnce(e, t, c, n) {
  if (e.discoverInFlight) return e.discoverInFlight;
  let r = discoverDesignTools(e, t, c, n);
  return (
    (e.discoverInFlight = r),
    r.finally(() => {
      if (e.discoverInFlight === r) e.discoverInFlight = null;
    })
  );
}
//@ chunk-171dhyhe.js:48942-49325 placement
async function discoverDesignTools(e, t, c, n) {
  let r = (y) => postDesignMcp({ jsonrpc: "2.0", id: 1, method: "tools/list", params: {} }, t, y, c, n),
    l = await initializeDesignSession(e, t, c, n),
    a = await r(l);
  if (a.status === 404 && l)
    (resetDesignSession(e), (a = await r(await initializeDesignSession(e, t, c, n))));
  if (a.status < 200 || a.status >= 300 || !Array.isArray(a.data.result?.tools))
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `Claude Design discovery failed: HTTP ${a.status}`,
      "design_tool_discovery_failed",
    );
  return recordDesignTools(a.data.result.tools);
}
//@ chunk-171dhyhe.js:49325-49430 placement
function resetDesignSession(e) {
  ((e.cachedSessionId = null),
    (e.initialized = !1),
    (e.initializeInFlight = null),
    (e.discoverInFlight = null));
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
          clientInfo: { name: "claude-cli-design-tool", version: "1" },
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
    return (
      (e.cachedSessionId = typeof a === "string" && a ? a : null),
      (e.initialized = !0),
      e.cachedSessionId
    );
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
  constructor(e = !1) {
    super(
      "Claude Design authentication failed (HTTP 401). The claude.ai credential is missing or expired \u2014 run /login, or /design login for a separate design credential.",
      "design_tool_auth_401",
    );
    ((this.name = "DesignAuth401Error"), (this.wasRetried = e));
  }
}

export {
  callDesignOperation,
  DesignAuth401Error,
  DesignNeedsScopesError,
  DesignNeedsProjectGrantError,
  DesignNeedsConsentError,
};
