/**
 * services/mcp/needsAuthCache.ts
 *
 * 2.1.316 新增：MCP needs-auth 缓存文件与认证失败提示（claude.ai 连接器需重新连接、headersHelper 被拒、令牌刷新失败）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-rbwn7je9.js (26)
 * attribution: placement 26
 */
import { join } from "path";
import {
  isDiskless,
  getPromptId,
  getIsRemoteMode,
  getIsNonInteractiveSession,
} from "../../bootstrap/state.js";
import { getClaudeConfigDir } from "../../utils/envUtils.js";
import { STORAGE_SPACES } from "../../utils/storage/storageSpaces.js";
import { Yie } from "../orgMemory/memoryStores.js";
import { ht } from "./cliOwnedClients.js";
import { isStorageV5Enabled } from "../../utils/hoverRest.js";
import { findMissingPlugins } from "../../utils/plugins/pluginStartupCheck.js";
import { getFileReader } from "../../utils/fileStore.js";
import { jsonParse } from "../../utils/slowOperations.js";
import { logForDebugging } from "../../utils/debug.js";
import { formatStorageError } from "../../utils/storage/storageErrors.js";
import { Xpr, Y3t } from "../artifacts/artifactMount.js";
import { b2, APP_TOOL_ACCESS_FAILED_TEXT, appToolServerUnavailableText } from "./appToolServerErrors.js";
import {
  isClaudeAiChatCowork,
  isClaudeAiChatOrigin,
  isCcsCoworkSurface,
} from "../../utils/entrypointKinds.js";
import { normalizeMcpServerName, uo, AUTHENTICATE } from "../api/deferredToolsState.js";
import { Dc } from "../../../vendor/lru-cache/dist/esm/index.min.js";
import { aV } from "../../utils/memoize.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { u, o } from "../../../vendor/zod/v4/classic/schemas.js";
import { HostScoped } from "../../utils/hostScoped.js";
import { isToolSearchEnabledOptimistic } from "../../utils/toolSearch.js";
import { TYt, f4 } from "../../tools/RefreshMcpToolsTool/RefreshMcpToolsTool.js";
import { getFeatureValue_SESSION_PINNED } from "../analytics/growthbook.js";
import { ir } from "./client.js";
import { buildMcpToolName } from "./mcpStringUtils.js";
import { mcpServerSource } from "./fileReference/fileReferencePolicy.js";
import { gH } from "./claudeai.js";
import { dynamicServerConnectorId } from "./mcpToolDecoration.js";
import { TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS } from "../../utils/errors.js";
import { env } from "../../utils/env.js";
import { describeMcpServerOrigin } from "./mcpServerOrigin.js";
import { createMcpAuthTool, COMPLETE_AUTH_TOOL } from "../../tools/McpAuthTool/McpAuthTool.js";

/**
 * 返回 MCP needs-auth 缓存文件路径（无盘会话不可用）。
 */
//@ chunk-rbwn7je9.js:1490-1676 placement
function needsAuthCachePath() {
  if (isDiskless())
    throw Error(
      "Cannot use the MCP needs-auth cache file in a diskless session: only a storage backend can hold the cache",
    );
  return join(getClaudeConfigDir(), "mcp-needs-auth-cache.json");
}
//@ chunk-rbwn7je9.js:1676-1731 placement
function _Bt() {
  return STORAGE_SPACES.state("mcp-needs-auth-cache");
}
/**
 * 读取 MCP needs-auth 缓存（每会话只读一次，存储 V5 或文件，失败为空对象）。
 */
//@ chunk-rbwn7je9.js:1731-1925 placement
function readNeedsAuthCache(e) {
  if (Yie(e)) return Promise.resolve({});
  let r = ht();
  if (!r.authCacheRead)
    r.authCacheRead =
      isStorageV5Enabled() && e !== void 0
        ? findMissingPlugins(e)
        : getFileReader()
            .read(needsAuthCachePath())
            .then((n) => jsonParse(n))
            .catch(() => ({}));
  return r.authCacheRead;
}
//@ chunk-rbwn7je9.js:2104-2143 placement
function bBt() {
  ht().authCacheRead = null;
}
//@ chunk-rbwn7je9.js:2143-2381 placement
function deleteNeedsAuthCache(e) {
  if (((ht().authCacheRead = null), isStorageV5Enabled() && e !== void 0)) {
    e.delete(_Bt())
      .then((r) => {
        if (!r.ok)
          logForDebugging(`mcp needs-auth cache delete failed: ${formatStorageError(r.error)}`, {
            level: "error",
          });
      })
      .catch(() => {});
    return;
  }
  if (isDiskless()) return;
  getFileReader()
    .delete(needsAuthCachePath())
    .catch(() => {});
}
/**
 * MCP 认证失败的提示文本（claude.ai 连接器、需重新登录、headersHelper/Authorization 被拒、缺权限）。
 */
//@ chunk-rbwn7je9.js:2381-3774 placement
var RECONNECT_IN_CLAUDE_AI_HINT = "the user can reconnect it in their claude.ai connector settings",
  fW = {
    notConnected(e) {
      return Xpr()
        ? `MCP server "${e}" needs to be connected in claude.ai`
        : `MCP server "${e}" needs to be connected in claude.ai (run /mcp to connect it)`;
    },
    signInAgain(e) {
      if (b2(e)) return APP_TOOL_ACCESS_FAILED_TEXT;
      let r = `MCP server "${e}" needs you to sign in again`;
      return isClaudeAiChatCowork()
        ? `${r} (${RECONNECT_IN_CLAUDE_AI_HINT})`
        : Y3t()
          ? r
          : `${r} (run /mcp to re-authenticate)`;
    },
    helperRejected(e) {
      let r = `MCP server "${e}" rejected the credential from its headersHelper`;
      return Y3t()
        ? `${r} (check the helper, then start a new task or chat)`
        : `${r} (check the helper and run /mcp to reconnect, or to authenticate if the server also uses OAuth)`;
    },
    headerRejected(e) {
      let r = `MCP server "${e}" rejected the Authorization header in its config`;
      return Y3t()
        ? `${r} (update it, then start a new task or chat)`
        : `${r} (update it, then run /mcp to reconnect)`;
    },
    dialNeedsAuth(e) {
      if (b2(e)) return appToolServerUnavailableText("needs_auth");
      return `MCP server "${e}" needs authentication`;
    },
    dialNotConnected(e, r) {
      if (b2(e)) return appToolServerUnavailableText("failed");
      return `MCP server "${e}" is not connected${r}`;
    },
    sessionCredentialRejected(e, r) {
      if (b2(e)) return APP_TOOL_ACCESS_FAILED_TEXT;
      return `MCP server "${e}" rejected the session credential (HTTP ${r})`;
    },
    stepUp(e, r) {
      if (b2(e)) return APP_TOOL_ACCESS_FAILED_TEXT;
      let n = normalizeMcpServerName(r ?? "", void 0, "none"),
        a = `MCP server "${e}" needs additional permissions (scope: "${n}")`;
      return isClaudeAiChatCowork()
        ? `${a} \u2014 ${RECONNECT_IN_CLAUDE_AI_HINT}`
        : `${a} \u2014 run /mcp to re-authenticate`;
    },
  };
//@ chunk-rbwn7je9.js:3774-3978 placement
var MAX_ERROR_BODY_CHARS = 20,
  K = new Set([
    "mcp_invalid_oauth_token",
    "mcp_unauthorized_after_token_refresh",
    "mcp_oauth_token_refresh_failed",
    "mcp_oauth_no_refresh_token",
  ]),
  X_CCR_TICKET_MCP = "x-ccr-ticket-mcp",
  Z = /^[A-Za-z0-9_-]{1,8192}$/,
  D = 1e4;
//@ chunk-rbwn7je9.js:3978-5037 placement
class McpAuthError {
  connections = new Map();
  toolLists = new Dc({ max: MAX_ERROR_BODY_CHARS });
  resourceLists = new Dc({ max: MAX_ERROR_BODY_CHARS });
  resourceTemplateLists = new Dc({ max: MAX_ERROR_BODY_CHARS });
  commandLists = new Dc({ max: MAX_ERROR_BODY_CHARS });
  reauthInFlight = new Map();
  settledCachedDialFailures = new Map();
  refusedCachedRows = new Set();
  lapsedCcrSignIns = new Set();
  ccrTickets = new Map();
  liveClients = new Set();
  noteCcrDialAnswer(e, r) {
    if (r.status === 401 && K.has(r.headers.get("X-Mcp-Error-Code") ?? "")) this.lapsedCcrSignIns.add(e);
    else this.lapsedCcrSignIns.delete(e);
  }
  attachCcrTicket(e, r) {
    let n = this.ccrTickets.get(String(e));
    if (n?.authorization === r.get("Authorization") && Date.now() - n.arrivedAt < D)
      r.set(X_CCR_TICKET_MCP, n.value);
    else r.delete(X_CCR_TICKET_MCP);
  }
  noteCcrTicket(e, r, n) {
    let a = r.get("Authorization"),
      h = n.headers.get(X_CCR_TICKET_MCP);
    if (h === "") this.ccrTickets.delete(String(e));
    else if (a !== null && h !== null && Z.test(h)) {
      let now = Date.now();
      for (let [s, l] of this.ccrTickets) if (now - l.arrivedAt >= D) this.ccrTickets.delete(s);
      this.ccrTickets.set(String(e), { authorization: a, value: h, arrivedAt: now });
    }
  }
  forgetListings() {
    (this.toolLists.clear(),
      this.resourceLists.clear(),
      this.resourceTemplateLists.clear(),
      this.commandLists.clear());
  }
}
/**
 * 获取（必要时创建）MCP 连接缓存，并为其中几个映射启用调试追踪。
 */
//@ chunk-rbwn7je9.js:5037-5300 placement
function getConnectionCache() {
  let e = ht();
  if (e.connectionCache === null)
    ((e.connectionCache = new McpAuthError()),
      aV(e.connectionCache.connections),
      aV(e.connectionCache.settledCachedDialFailures),
      aV(e.connectionCache.refusedCachedRows),
      aV(e.connectionCache.lapsedCcrSignIns));
  return e.connectionCache;
}
/**
 * 用外部提供的缓存对函数做记忆化，并暴露 get/set/has/delete/clear 接口。
 */
//@ chunk-rbwn7je9.js:5300-5588 placement
function memoizeWithExternalCache(e, r, n, a) {
  function h(...s) {
    let l = r(...s);
    return getOrCompute(n(), l, () => {
      let m = a(
        () => e(...s),
        () => n().get(l) === m,
        s,
      );
      return m;
    });
  }
  let c = {
    get: (s) => n().get(s),
    set(s, l) {
      return (n().set(s, l), c);
    },
    has: (s) => n().has(s),
    delete: (s) => n().delete(s),
    clear: () => n().clear(),
  };
  return Object.assign(h, { cache: c });
}
//@ chunk-rbwn7je9.js:5588-5829 placement = memoizeWithLRU (1)
function memoizeWithLRU(f, cacheFn, maxCacheSize) {
  function a(...c) {
    return getOrCompute(maxCacheSize(), cacheFn(...c), () => f(...c));
  }
  return Object.assign(a, {
    cache: {
      get: (key) => maxCacheSize().peek(key),
      set: (c, s) => void maxCacheSize().set(c, s),
      has: (key) => maxCacheSize().has(key),
      delete: (key) => maxCacheSize().delete(key),
      clear: () => maxCacheSize().clear(),
      size: () => maxCacheSize().size,
    },
  });
}
//@ chunk-rbwn7je9.js:5829-5915 placement
function getOrCompute(e, r, n) {
  let a = e.get(r);
  if (a !== void 0) return a;
  let h = n();
  return (e.set(r, h), h);
}
//@ chunk-rbwn7je9.js:5915-5980 placement
var TENGU_EAGER_RACCOON = "tengu_eager_raccoon",
  N = DoctorLazy(() => u({})),
  ee = new HostScoped(() => new Map());
//@ chunk-rbwn7je9.js:5980-6036 placement
function oe() {
  return (
    isClaudeAiChatOrigin() &&
    isCcsCoworkSurface() &&
    isToolSearchEnabledOptimistic() &&
    !TYt() &&
    getFeatureValue_SESSION_PINNED(TENGU_EAGER_RACCOON, !1)
  );
}
//@ chunk-rbwn7je9.js:6036-6102 placement
function yBt(e, r) {
  return oe() && getConnectionCache().lapsedCcrSignIns.has(ir(e, r));
}
/**
 * 说明 claude.ai 连接器登录已失效、需要用户重新登录，并指导模型继续不依赖它的部分。
 */
//@ chunk-rbwn7je9.js:6102-8631 placement
function describeConnectorSignInStopped(e, r, n) {
  let a = uo(e),
    h = `The "${a}" connector is installed, but its sign-in has stopped working, so its tools are unavailable. Call this tool only when the user's request needs this connector (even if they didn't name it explicitly). It tries the connection again. If the connector still needs a sign-in, the call fails, and the user may be shown a prompt to sign in again. Then tell them in one short sentence that ${a} needs them to sign in again, carry on with whatever does not need it, and do not call this tool again until they send another message. If the call fails for another reason, tell them that ${a} is not available right now. If the connection succeeds, the connector's tools become available. Do not ask the user for authorization codes, tokens, or URLs.`;
  return {
    name: buildMcpToolName(e, AUTHENTICATE),
    isMcp: !0,
    mcpInfo: {
      serverName: e,
      toolName: AUTHENTICATE,
      serverType: r.type ?? "stdio",
      source: mcpServerSource(e, r),
      isAuthStub: !0,
      serverId: gH(r),
      serverIdStamp: dynamicServerConnectorId(e, r),
    },
    isEnabled: () => !0,
    isConcurrencySafe: () => !1,
    isReadOnly: () => !1,
    backgrounding: "never",
    toAutoClassifierInput: () => e,
    userFacingName: () => `${e} - authenticate (MCP)`,
    maxResultSizeChars: 1e4,
    renderToolUseMessage: () => `Check the sign-in of ${e}`,
    async description() {
      return h;
    },
    async prompt() {
      return h;
    },
    get inputSchema() {
      return N();
    },
    async checkPermissions(c) {
      return { behavior: "allow", updatedInput: c };
    },
    async call(c, s) {
      let of = ee.of(s.session.host),
        m = getPromptId();
      if (of.get(e) === m)
        throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          `The "${a}" connector was already tried in this turn.`,
          "Connector sign-in tool called twice in one turn",
        );
      of.set(e, m);
      let f = n(),
        peekSettledConnection = await f.peekSettledConnection(e, r);
      if (
        peekSettledConnection !== void 0 &&
        (peekSettledConnection.type !== "connected" || peekSettledConnection.discoveryAuthFailure)
      )
        await f.clearServerCache(e, r);
      let withResolvers = Promise.withResolvers();
      try {
        let ensureConnectedClient = await f.ensureConnectedClient(
            { name: e, type: "cached", config: r, capabilities: {}, cacheSavedAt: 0 },
            {
              context: "MCP sign-in check",
              signal: s.abortController.signal,
              toolUseId: s.toolUseId,
              toolUseIdWithListingsUntil: withResolvers.promise,
            },
          ),
          toolsForClient = await f.fetchToolsForClient(ensureConnectedClient, s.storageV5);
        if (ensureConnectedClient.discoveryAuthFailure)
          throw Object.assign(
            new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
              fW.dialNeedsAuth(a),
              "MCP server needs authentication",
            ),
            { mcpErrorSource: "user_auth" },
          );
        if (f.getToolsListErrorForResult(toolsForClient) !== void 0)
          throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
            `The "${a}" connector connected, but its tools could not be listed.`,
            "Connector connected but its tools could not be listed",
          );
        return {
          data: {
            message: `The "${a}" connector is connected again. Its tools are being added and should be available shortly.`,
          },
        };
      } finally {
        withResolvers.resolve();
      }
    },
    mapToolResultToToolResultBlockParam(c, s) {
      return { tool_use_id: s, type: "tool_result", content: c.message };
    },
  };
}
//@ chunk-rbwn7je9.js:8631-8682 placement
function j() {
  return require("./chunk-asne9cp8.js");
}
//@ chunk-rbwn7je9.js:8682-8722 placement
function b() {
  return j().mcpAuthModule();
}
//@ chunk-rbwn7je9.js:8722-8764 placement
function T() {
  return j().mcpClientModule();
}
//@ chunk-rbwn7je9.js:8764-8955 placement
var emptyAuthInputSchema = DoctorLazy(() => u({})),
  completeAuthInputSchema = DoctorLazy(() =>
    u({
      callback_url: o().describe(
        "The full callback URL from the browser address bar after authorizing, e.g. http://localhost:<port>/callback?code=...&state=...",
      ),
    }),
  );
//@ chunk-rbwn7je9.js:8955-9014 placement
function ae() {
  return env.isSSH() || env.CLAUDE_CODE_REMOTE || getIsRemoteMode();
}
//@ chunk-rbwn7je9.js:9014-9050 placement
var ce = new HostScoped(() => new Map()),
  le = 180000;
//@ chunk-rbwn7je9.js:9050-9181 placement
function redirectUriOf(e) {
  try {
    let r = new URL(e).searchParams.get("redirect_uri");
    if (r) return r;
  } catch {}
  return "http://localhost:<port>/callback";
}
/**
 * 为需要认证的 MCP 服务器生成认证工具：非交互会话只给登录已停止的说明，否则给出开始认证与完成认证两个工具。
 */
//@ chunk-rbwn7je9.js:9181-9294 placement
function mcpAuthToolsFor(e, r) {
  if (getIsNonInteractiveSession()) return yBt(e, r) ? [describeConnectorSignInStopped(e, r, T)] : [];
  let n = describeMcpServerOrigin(e, r, { detail: "origin" });
  return [createMcpAuthTool(e, r, n), COMPLETE_AUTH_TOOL(e, r)];
}
//@ chunk-rbwn7je9.js:9294-9369 placement
function H(e) {
  let r = e !== void 0 ? f4(e) : TYt();
  return "available automatically";
}
//@ chunk-rbwn7je9.js:9369-9435 placement
function B(e) {
  return "The server's tools should now be available.";
}

export {
  readNeedsAuthCache,
  _Bt,
  needsAuthCachePath,
  bBt,
  getConnectionCache,
  memoizeWithExternalCache,
  fW,
  memoizeWithLRU,
  yBt,
  mcpAuthToolsFor,
  deleteNeedsAuthCache,
  H,
  emptyAuthInputSchema,
  ce,
  b,
  le,
  T,
  redirectUriOf,
  ae,
  B,
  completeAuthInputSchema,
};
