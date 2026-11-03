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
import { isDisklessWithoutState } from "../orgMemory/memoryStores.js";
import { getCliOwnedState } from "./cliOwnedClients.js";
import { isStorageV5Enabled } from "../../utils/hoverRest.js";
import { findMissingPlugins } from "../../utils/plugins/pluginStartupCheck.js";
import { getFileReader } from "../../utils/fileStore.js";
import { jsonParse } from "../../utils/slowOperations.js";
import { logForDebugging } from "../../utils/debug.js";
import { formatStorageError } from "../../utils/storage/storageErrors.js";
import { isArtifactPathMounted, isArtifactMountUsable } from "../artifacts/artifactMount.js";
import {
  isHiddenReplyServer,
  APP_TOOL_ACCESS_FAILED_TEXT,
  appToolServerUnavailableText,
} from "./appToolServerErrors.js";
import {
  isClaudeAiChatCowork,
  isClaudeAiChatOrigin,
  isCcsCoworkSurface,
} from "../../utils/entrypointKinds.js";
import { normalizeMcpServerName, normalizeServerNameShort, AUTHENTICATE } from "../api/deferredToolsState.js";
import { LRUCache } from "../../../vendor/lru-cache/dist/esm/index.min.js";
import { retainCacheKey } from "../../utils/memoize.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { u, string } from "../../../vendor/zod/v4/classic/schemas.js";
import { HostScoped } from "../../utils/hostScoped.js";
import { isToolSearchEnabledOptimistic } from "../../utils/toolSearch.js";
import { alwaysFalseDefer, alwaysFalseFeed } from "../../tools/RefreshMcpToolsTool/RefreshMcpToolsTool.js";
import { getFeatureValue_SESSION_PINNED } from "../analytics/growthbook.js";
import { serverCacheKey } from "./client.js";
import { buildMcpToolName } from "./mcpStringUtils.js";
import { mcpServerSource } from "./fileReference/fileReferencePolicy.js";
import { connectorServerId } from "./claudeai.js";
import { dynamicServerConnectorId } from "./mcpToolDecoration.js";
import { TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS } from "../../utils/errors.js";
import { env } from "../../utils/env.js";
import { describeMcpServerOrigin } from "./mcpServerOrigin.js";
import { createMcpAuthTool, COMPLETE_AUTH_TOOL } from "../../tools/McpAuthTool/McpAuthTool.js";

//@ chunk-rbwn7je9.js:1490-1676 placement
/**
 * 返回 MCP needs-auth 缓存文件路径（无盘会话不可用）。
 */
function needsAuthCachePath() {
  if (isDiskless())
    throw Error(
      "Cannot use the MCP needs-auth cache file in a diskless session: only a storage backend can hold the cache",
    );
  return join(getClaudeConfigDir(), "mcp-needs-auth-cache.json");
}
//@ chunk-rbwn7je9.js:1676-1731 placement
/**
 * needs-auth 缓存的存储空间。
 */
function needsAuthCacheSpace() {
  return STORAGE_SPACES.state("mcp-needs-auth-cache");
}
//@ chunk-rbwn7je9.js:1731-1925 placement
/**
 * 读取 MCP needs-auth 缓存（每会话只读一次，存储 V5 或文件，失败为空对象）。
 */
function readNeedsAuthCache(enabledPlugins) {
  if (isDisklessWithoutState(enabledPlugins)) return Promise.resolve({});
  let cliOwnedState = getCliOwnedState();
  if (!cliOwnedState.authCacheRead)
    cliOwnedState.authCacheRead =
      isStorageV5Enabled() && enabledPlugins !== undefined
        ? findMissingPlugins(enabledPlugins)
        : getFileReader()
            .read(needsAuthCachePath())
            .then((n) => jsonParse(n))
            .catch(() => ({}));
  return cliOwnedState.authCacheRead;
}
//@ chunk-rbwn7je9.js:2104-2143 placement
/**
 * 清空已读取的认证缓存。
 */
function clearAuthCacheRead() {
  getCliOwnedState().authCacheRead = null;
}
//@ chunk-rbwn7je9.js:2143-2381 placement
function deleteNeedsAuthCache(storageV5) {
  getCliOwnedState().authCacheRead = null;
  if (isStorageV5Enabled() && storageV5 !== undefined) {
    storageV5
      .delete(needsAuthCacheSpace())
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
//@ chunk-rbwn7je9.js:2381-3774 placement
/**
 * 认证相关给用户/模型的提示文案表。
 */
var RECONNECT_IN_CLAUDE_AI_HINT = "the user can reconnect it in their claude.ai connector settings";
var AUTH_MESSAGES = {
  notConnected(e) {
    return isArtifactPathMounted()
      ? `MCP server "${e}" needs to be connected in claude.ai`
      : `MCP server "${e}" needs to be connected in claude.ai (run /mcp to connect it)`;
  },
  signInAgain(e) {
    if (isHiddenReplyServer(e)) return APP_TOOL_ACCESS_FAILED_TEXT;
    let r = `MCP server "${e}" needs you to sign in again`;
    return isClaudeAiChatCowork()
      ? `${r} (${RECONNECT_IN_CLAUDE_AI_HINT})`
      : isArtifactMountUsable()
        ? r
        : `${r} (run /mcp to re-authenticate)`;
  },
  helperRejected(e) {
    let r = `MCP server "${e}" rejected the credential from its headersHelper`;
    return isArtifactMountUsable()
      ? `${r} (check the helper, then start a new task or chat)`
      : `${r} (check the helper and run /mcp to reconnect, or to authenticate if the server also uses OAuth)`;
  },
  headerRejected(e) {
    let r = `MCP server "${e}" rejected the Authorization header in its config`;
    return isArtifactMountUsable()
      ? `${r} (update it, then start a new task or chat)`
      : `${r} (update it, then run /mcp to reconnect)`;
  },
  dialNeedsAuth(e) {
    if (isHiddenReplyServer(e)) return appToolServerUnavailableText("needs_auth");
    return `MCP server "${e}" needs authentication`;
  },
  dialNotConnected(e, r) {
    if (isHiddenReplyServer(e)) return appToolServerUnavailableText("failed");
    return `MCP server "${e}" is not connected${r}`;
  },
  sessionCredentialRejected(e, r) {
    if (isHiddenReplyServer(e)) return APP_TOOL_ACCESS_FAILED_TEXT;
    return `MCP server "${e}" rejected the session credential (HTTP ${r})`;
  },
  stepUp(e, r) {
    if (isHiddenReplyServer(e)) return APP_TOOL_ACCESS_FAILED_TEXT;
    let n = normalizeMcpServerName(r ?? "", undefined, "none");
    let a = `MCP server "${e}" needs additional permissions (scope: "${n}")`;
    return isClaudeAiChatCowork()
      ? `${a} \u2014 ${RECONNECT_IN_CLAUDE_AI_HINT}`
      : `${a} \u2014 run /mcp to re-authenticate`;
  },
};
//@ chunk-rbwn7je9.js:3774-3978 placement
/**
 * CCR 票据的有效期（10 秒）。
 */
var MAX_ERROR_BODY_CHARS = 20;
var CCR_LAPSED_TOKEN_CODES = new Set([
  "mcp_invalid_oauth_token",
  "mcp_unauthorized_after_token_refresh",
  "mcp_oauth_token_refresh_failed",
  "mcp_oauth_no_refresh_token",
]);
var X_CCR_TICKET_MCP = "x-ccr-ticket-mcp";
var CCR_TICKET_RE = /^[A-Za-z0-9_-]{1,8192}$/;
var CCR_TICKET_TTL_MS = 1e4;
//@ chunk-rbwn7je9.js:3978-5037 placement
class McpAuthError {
  connections = new Map();
  toolLists = new LRUCache({
    max: MAX_ERROR_BODY_CHARS,
  });
  resourceLists = new LRUCache({
    max: MAX_ERROR_BODY_CHARS,
  });
  resourceTemplateLists = new LRUCache({
    max: MAX_ERROR_BODY_CHARS,
  });
  commandLists = new LRUCache({
    max: MAX_ERROR_BODY_CHARS,
  });
  reauthInFlight = new Map();
  settledCachedDialFailures = new Map();
  refusedCachedRows = new Set();
  lapsedCcrSignIns = new Set();
  ccrTickets = new Map();
  liveClients = new Set();
  noteCcrDialAnswer(e, r) {
    if (r.status === 401 && CCR_LAPSED_TOKEN_CODES.has(r.headers.get("X-Mcp-Error-Code") ?? ""))
      this.lapsedCcrSignIns.add(e);
    else this.lapsedCcrSignIns.delete(e);
  }
  attachCcrTicket(e, r) {
    let n = this.ccrTickets.get(String(e));
    if (n?.authorization === r.get("Authorization") && Date.now() - n.arrivedAt < CCR_TICKET_TTL_MS)
      r.set(X_CCR_TICKET_MCP, n.value);
    else r.delete(X_CCR_TICKET_MCP);
  }
  noteCcrTicket(e, r, n) {
    let a = r.get("Authorization");
    let h = n.headers.get(X_CCR_TICKET_MCP);
    if (h === "") this.ccrTickets.delete(String(e));
    else if (a !== null && h !== null && CCR_TICKET_RE.test(h)) {
      let now = Date.now();
      for (let [s, l] of this.ccrTickets)
        if (now - l.arrivedAt >= CCR_TICKET_TTL_MS) this.ccrTickets.delete(s);
      this.ccrTickets.set(String(e), {
        authorization: a,
        value: h,
        arrivedAt: now,
      });
    }
  }
  forgetListings() {
    this.toolLists.clear();
    this.resourceLists.clear();
    this.resourceTemplateLists.clear();
    this.commandLists.clear();
  }
}
//@ chunk-rbwn7je9.js:5037-5300 placement
/**
 * 获取（必要时创建）MCP 连接缓存，并为其中几个映射启用调试追踪。
 */
function getConnectionCache() {
  let cliOwnedState = getCliOwnedState();
  if (cliOwnedState.connectionCache === null) {
    cliOwnedState.connectionCache = new McpAuthError();
    retainCacheKey(cliOwnedState.connectionCache.connections);
    retainCacheKey(cliOwnedState.connectionCache.settledCachedDialFailures);
    retainCacheKey(cliOwnedState.connectionCache.refusedCachedRows);
    retainCacheKey(cliOwnedState.connectionCache.lapsedCcrSignIns);
  }
  return cliOwnedState.connectionCache;
}
//@ chunk-rbwn7je9.js:5300-5588 placement
/**
 * 用外部提供的缓存对函数做记忆化，并暴露 get/set/has/delete/clear 接口。
 */
function memoizeWithExternalCache(e, serverCacheKey, n, a) {
  function h(...s) {
    let l = serverCacheKey(...s);
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
      n().set(s, l);
      return c;
    },
    has: (s) => n().has(s),
    delete: (s) => n().delete(s),
    clear: () => n().clear(),
  };
  return Object.assign(h, {
    cache: c,
  });
}
//@ chunk-rbwn7je9.js:5588-5829 placement = memoizeWithLRU (1)
function memoizeWithLRU(f, cacheFn, maxCacheSize) {
  function a(...args) {
    return getOrCompute(maxCacheSize(), cacheFn(...args), () => f(...args));
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
  if (a !== undefined) return a;
  let h = n();
  e.set(r, h);
  return h;
}
//@ chunk-rbwn7je9.js:5915-5980 placement
/**
 * 按宿主保存的 eager raccoon 状态。
 */
var TENGU_EAGER_RACCOON = "tengu_eager_raccoon";
var emptyRecordSchema = DoctorLazy(() => u({}));
var eagerRaccoonStates = new HostScoped(() => new Map());
//@ chunk-rbwn7je9.js:5980-6036 placement
/**
 * eager raccoon 是否可用。
 */
function isEagerRaccoonEnabled() {
  return (
    isClaudeAiChatOrigin() &&
    isCcsCoworkSurface() &&
    isToolSearchEnabledOptimistic() &&
    !alwaysFalseDefer() &&
    getFeatureValue_SESSION_PINNED(TENGU_EAGER_RACCOON, false)
  );
}
//@ chunk-rbwn7je9.js:6036-6102 placement
/**
 * 该服务器是否出现过 CCR 登录失效。
 */
function hasLapsedCcrSignIn(name, config) {
  return isEagerRaccoonEnabled() && getConnectionCache().lapsedCcrSignIns.has(serverCacheKey(name, config));
}
//@ chunk-rbwn7je9.js:6102-8631 placement
/**
 * 说明 claude.ai 连接器登录已失效、需要用户重新登录，并指导模型继续不依赖它的部分。
 */
function describeConnectorSignInStopped(e, r, mcpClientModule) {
  let a = normalizeServerNameShort(e);
  let h = `The "${a}" connector is installed, but its sign-in has stopped working, so its tools are unavailable. Call this tool only when the user's request needs this connector (even if they didn't name it explicitly). It tries the connection again. If the connector still needs a sign-in, the call fails, and the user may be shown a prompt to sign in again. Then tell them in one short sentence that ${a} needs them to sign in again, carry on with whatever does not need it, and do not call this tool again until they send another message. If the call fails for another reason, tell them that ${a} is not available right now. If the connection succeeds, the connector's tools become available. Do not ask the user for authorization codes, tokens, or URLs.`;
  return {
    name: buildMcpToolName(e, AUTHENTICATE),
    isMcp: true,
    mcpInfo: {
      serverName: e,
      toolName: AUTHENTICATE,
      serverType: r.type ?? "stdio",
      source: mcpServerSource(e, r),
      isAuthStub: true,
      serverId: connectorServerId(r),
      serverIdStamp: dynamicServerConnectorId(e, r),
    },
    isEnabled: () => true,
    isConcurrencySafe: () => false,
    isReadOnly: () => false,
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
      return emptyRecordSchema();
    },
    async checkPermissions(updatedInput) {
      return {
        behavior: "allow",
        updatedInput,
      };
    },
    async call(c, s) {
      let l = eagerRaccoonStates.of(s.session.host);
      let promptId = getPromptId();
      if (l.get(e) === promptId)
        throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          `The "${a}" connector was already tried in this turn.`,
          "Connector sign-in tool called twice in one turn",
        );
      l.set(e, promptId);
      let f = mcpClientModule();
      let g = await f.peekSettledConnection(e, r);
      if (g !== undefined && (g.type !== "connected" || g.discoveryAuthFailure))
        await f.clearServerCache(e, r);
      let deferred = Promise.withResolvers();
      try {
        let M = await f.ensureConnectedClient(
          {
            name: e,
            type: "cached",
            config: r,
            capabilities: {},
            cacheSavedAt: 0,
          },
          {
            context: "MCP sign-in check",
            signal: s.abortController.signal,
            toolUseId: s.toolUseId,
            toolUseIdWithListingsUntil: deferred.promise,
          },
        );
        let toolsForClient = await f.fetchToolsForClient(M, s.storageV5);
        if (M.discoveryAuthFailure)
          throw Object.assign(
            new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
              AUTH_MESSAGES.dialNeedsAuth(a),
              "MCP server needs authentication",
            ),
            {
              mcpErrorSource: "user_auth",
            },
          );
        if (f.getToolsListErrorForResult(toolsForClient) !== undefined)
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
        deferred.resolve();
      }
    },
    mapToolResultToToolResultBlockParam(c, toolUseId) {
      return {
        tool_use_id: toolUseId,
        type: "tool_result",
        content: c.message,
      };
    },
  };
}
//@ chunk-rbwn7je9.js:8631-8682 placement
/**
 * 加载懒模块集合。
 */
function mcpModules() {
  return require("./chunk-asne9cp8.js");
}
//@ chunk-rbwn7je9.js:8682-8722 placement
/**
 * 取 MCP 认证模块。
 */
function mcpAuthModule() {
  return mcpModules().mcpAuthModule();
}
//@ chunk-rbwn7je9.js:8722-8764 placement
/**
 * 取 MCP 客户端模块。
 */
function mcpClientModule() {
  return mcpModules().mcpClientModule();
}
//@ chunk-rbwn7je9.js:8764-8955 placement
var emptyAuthInputSchema = DoctorLazy(() => u({}));
var completeAuthInputSchema = DoctorLazy(() =>
  u({
    callback_url: string().describe(
      "The full callback URL from the browser address bar after authorizing, e.g. http://localhost:<port>/callback?code=...&state=...",
    ),
  }),
);
//@ chunk-rbwn7je9.js:8955-9014 placement
/**
 * 是否处于远程/SSH 环境。
 */
function isRemoteEnvironment() {
  return env.isSSH() || env.CLAUDE_CODE_REMOTE || getIsRemoteMode();
}
//@ chunk-rbwn7je9.js:9014-9050 placement
/**
 * 回调地址缓存的有效期（180 秒）。
 */
var redirectUrisByHost = new HostScoped(() => new Map());
var REDIRECT_URI_TTL_MS = 180000;
//@ chunk-rbwn7je9.js:9050-9181 placement
function redirectUriOf(e) {
  try {
    let r = new URL(e).searchParams.get("redirect_uri");
    if (r) return r;
  } catch {}
  return "http://localhost:<port>/callback";
}
//@ chunk-rbwn7je9.js:9181-9294 placement
/**
 * 为需要认证的 MCP 服务器生成认证工具：非交互会话只给登录已停止的说明，否则给出开始认证与完成认证两个工具。
 */
function mcpAuthToolsFor(e, r) {
  if (getIsNonInteractiveSession())
    return hasLapsedCcrSignIn(e, r) ? [describeConnectorSignInStopped(e, r, mcpClientModule)] : [];
  let n = describeMcpServerOrigin(e, r, {
    detail: "origin",
  });
  return [createMcpAuthTool(e, r, n), COMPLETE_AUTH_TOOL(e, r)];
}
//@ chunk-rbwn7je9.js:9294-9369 placement
/**
 * “工具已自动可用”的说明文本。
 */
function toolsAvailableAutomaticallyText(tools) {
  let r = tools !== undefined ? alwaysFalseFeed(tools) : alwaysFalseDefer();
  return "available automatically";
}
//@ chunk-rbwn7je9.js:9369-9435 placement
/**
 * “工具现在应该可用了”的说明文本。
 */
function toolsAvailableNowText(tools) {
  return "The server's tools should now be available.";
}
export {
  readNeedsAuthCache,
  needsAuthCacheSpace,
  needsAuthCachePath,
  clearAuthCacheRead,
  getConnectionCache,
  memoizeWithExternalCache,
  AUTH_MESSAGES,
  memoizeWithLRU,
  hasLapsedCcrSignIn,
  mcpAuthToolsFor,
  deleteNeedsAuthCache,
  toolsAvailableAutomaticallyText,
  emptyAuthInputSchema,
  redirectUrisByHost,
  mcpAuthModule,
  REDIRECT_URI_TTL_MS,
  mcpClientModule,
  redirectUriOf,
  isRemoteEnvironment,
  toolsAvailableNowText,
  completeAuthInputSchema,
};
