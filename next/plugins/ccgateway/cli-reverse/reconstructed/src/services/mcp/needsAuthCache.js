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
import { objectSchema, stringSchema } from "../../../vendor/zod/v4/classic/schemas.js";
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
import { deferInit } from "../../../runtime/deferred-init.js";

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
            .then((raw) => jsonParse(raw))
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
      .then((deleteResult) => {
        if (!deleteResult.ok)
          logForDebugging(`mcp needs-auth cache delete failed: ${formatStorageError(deleteResult.error)}`, {
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
  notConnected(serverName) {
    return isArtifactPathMounted()
      ? `MCP server "${serverName}" needs to be connected in claude.ai`
      : `MCP server "${serverName}" needs to be connected in claude.ai (run /mcp to connect it)`;
  },
  signInAgain(serverName) {
    if (isHiddenReplyServer(serverName)) return APP_TOOL_ACCESS_FAILED_TEXT;
    let base = `MCP server "${serverName}" needs you to sign in again`;
    return isClaudeAiChatCowork()
      ? `${base} (${RECONNECT_IN_CLAUDE_AI_HINT})`
      : isArtifactMountUsable()
        ? base
        : `${base} (run /mcp to re-authenticate)`;
  },
  helperRejected(serverName) {
    let base = `MCP server "${serverName}" rejected the credential from its headersHelper`;
    return isArtifactMountUsable()
      ? `${base} (check the helper, then start a new task or chat)`
      : `${base} (check the helper and run /mcp to reconnect, or to authenticate if the server also uses OAuth)`;
  },
  headerRejected(serverName) {
    let base = `MCP server "${serverName}" rejected the Authorization header in its config`;
    return isArtifactMountUsable()
      ? `${base} (update it, then start a new task or chat)`
      : `${base} (update it, then run /mcp to reconnect)`;
  },
  dialNeedsAuth(serverName) {
    if (isHiddenReplyServer(serverName)) return appToolServerUnavailableText("needs_auth");
    return `MCP server "${serverName}" needs authentication`;
  },
  dialNotConnected(serverName, detail) {
    if (isHiddenReplyServer(serverName)) return appToolServerUnavailableText("failed");
    return `MCP server "${serverName}" is not connected${detail}`;
  },
  sessionCredentialRejected(serverName, status) {
    if (isHiddenReplyServer(serverName)) return APP_TOOL_ACCESS_FAILED_TEXT;
    return `MCP server "${serverName}" rejected the session credential (HTTP ${status})`;
  },
  stepUp(serverName, scope) {
    if (isHiddenReplyServer(serverName)) return APP_TOOL_ACCESS_FAILED_TEXT;
    let scopeLabel = normalizeMcpServerName(scope ?? "", undefined, "none");
    let base = `MCP server "${serverName}" needs additional permissions (scope: "${scopeLabel}")`;
    return isClaudeAiChatCowork()
      ? `${base} \u2014 ${RECONNECT_IN_CLAUDE_AI_HINT}`
      : `${base} \u2014 run /mcp to re-authenticate`;
  },
};
//@ chunk-rbwn7je9.js:3774-3978 placement
/**
 * CCR 票据的有效期（10 秒）。
 */
var MAX_ERROR_BODY_CHARS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var CCR_LAPSED_TOKEN_CODES;
var X_CCR_TICKET_MCP;
var CCR_TICKET_RE;
var CCR_TICKET_TTL_MS;
deferInit("chunk-rbwn7je9.js:3774", () => {
  MAX_ERROR_BODY_CHARS = 20;
  CCR_LAPSED_TOKEN_CODES = new Set([
    "mcp_invalid_oauth_token",
    "mcp_unauthorized_after_token_refresh",
    "mcp_oauth_token_refresh_failed",
    "mcp_oauth_no_refresh_token",
  ]);
  X_CCR_TICKET_MCP = "x-ccr-ticket-mcp";
  CCR_TICKET_RE = /^[A-Za-z0-9_-]{1,8192}$/;
  CCR_TICKET_TTL_MS = 1e4;
});
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
  noteCcrDialAnswer(connectionKey, response) {
    if (response.status === 401 && CCR_LAPSED_TOKEN_CODES.has(response.headers.get("X-Mcp-Error-Code") ?? ""))
      this.lapsedCcrSignIns.add(connectionKey);
    else this.lapsedCcrSignIns.delete(connectionKey);
  }
  attachCcrTicket(url, headers) {
    let ticket = this.ccrTickets.get(String(url));
    if (
      ticket?.authorization === headers.get("Authorization") &&
      Date.now() - ticket.arrivedAt < CCR_TICKET_TTL_MS
    )
      headers.set(X_CCR_TICKET_MCP, ticket.value);
    else headers.delete(X_CCR_TICKET_MCP);
  }
  noteCcrTicket(url, requestHeaders, response) {
    let authorization = requestHeaders.get("Authorization");
    let ticketValue = response.headers.get(X_CCR_TICKET_MCP);
    if (ticketValue === "") this.ccrTickets.delete(String(url));
    else if (authorization !== null && ticketValue !== null && CCR_TICKET_RE.test(ticketValue)) {
      let now = Date.now();
      for (let [key, existing] of this.ccrTickets)
        if (now - existing.arrivedAt >= CCR_TICKET_TTL_MS) this.ccrTickets.delete(key);
      this.ccrTickets.set(String(url), {
        authorization,
        value: ticketValue,
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
function memoizeWithExternalCache(fn, serverCacheKey, getCache, wrap) {
  function memoized(...args) {
    let cacheKey = serverCacheKey(...args);
    return getOrCompute(getCache(), cacheKey, () => {
      let value = wrap(
        () => fn(...args),
        () => getCache().get(cacheKey) === value,
        args,
      );
      return value;
    });
  }
  let cacheApi = {
    get: (key) => getCache().get(key),
    set(key, value) {
      getCache().set(key, value);
      return cacheApi;
    },
    has: (key) => getCache().has(key),
    delete: (key) => getCache().delete(key),
    clear: () => getCache().clear(),
  };
  return Object.assign(memoized, {
    cache: cacheApi,
  });
}
//@ chunk-rbwn7je9.js:5588-5829 placement = memoizeWithLRU (1)
function memoizeWithLRU(f, cacheFn, maxCacheSize) {
  function memoized(...args) {
    return getOrCompute(maxCacheSize(), cacheFn(...args), () => f(...args));
  }
  return Object.assign(memoized, {
    cache: {
      get: (key) => maxCacheSize().peek(key),
      set: (key, value) => void maxCacheSize().set(key, value),
      has: (key) => maxCacheSize().has(key),
      delete: (key) => maxCacheSize().delete(key),
      clear: () => maxCacheSize().clear(),
      size: () => maxCacheSize().size,
    },
  });
}
//@ chunk-rbwn7je9.js:5829-5915 placement
function getOrCompute(cache, key, compute) {
  let existing = cache.get(key);
  if (existing !== undefined) return existing;
  let value = compute();
  cache.set(key, value);
  return value;
}
//@ chunk-rbwn7je9.js:5915-5980 placement
/**
 * 按宿主保存的 eager raccoon 状态。
 */
var TENGU_EAGER_RACCOON; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var emptyRecordSchema;
var eagerRaccoonStates;
deferInit("chunk-rbwn7je9.js:5915", () => {
  TENGU_EAGER_RACCOON = "tengu_eager_raccoon";
  emptyRecordSchema = DoctorLazy(() => objectSchema({}));
  eagerRaccoonStates = new HostScoped(() => new Map());
});
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
function hasLapsedCcrSignIn(serverName, config) {
  return (
    isEagerRaccoonEnabled() && getConnectionCache().lapsedCcrSignIns.has(serverCacheKey(serverName, config))
  );
}
//@ chunk-rbwn7je9.js:6102-8631 placement
/**
 * 说明 claude.ai 连接器登录已失效、需要用户重新登录，并指导模型继续不依赖它的部分。
 */
function describeConnectorSignInStopped(serverName, config, mcpClientModule) {
  let shortName = normalizeServerNameShort(serverName);
  let description = `The "${shortName}" connector is installed, but its sign-in has stopped working, so its tools are unavailable. Call this tool only when the user's request needs this connector (even if they didn't name it explicitly). It tries the connection again. If the connector still needs a sign-in, the call fails, and the user may be shown a prompt to sign in again. Then tell them in one short sentence that ${shortName} needs them to sign in again, carry on with whatever does not need it, and do not call this tool again until they send another message. If the call fails for another reason, tell them that ${shortName} is not available right now. If the connection succeeds, the connector's tools become available. Do not ask the user for authorization codes, tokens, or URLs.`;
  return {
    name: buildMcpToolName(serverName, AUTHENTICATE),
    isMcp: true,
    mcpInfo: {
      serverName,
      toolName: AUTHENTICATE,
      serverType: config.type ?? "stdio",
      source: mcpServerSource(serverName, config),
      isAuthStub: true,
      serverId: connectorServerId(config),
      serverIdStamp: dynamicServerConnectorId(serverName, config),
    },
    isEnabled: () => true,
    isConcurrencySafe: () => false,
    isReadOnly: () => false,
    backgrounding: "never",
    toAutoClassifierInput: () => serverName,
    userFacingName: () => `${serverName} - authenticate (MCP)`,
    maxResultSizeChars: 1e4,
    renderToolUseMessage: () => `Check the sign-in of ${serverName}`,
    async description() {
      return description;
    },
    async prompt() {
      return description;
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
    async call(input, context) {
      let state = eagerRaccoonStates.of(context.session.host);
      let promptId = getPromptId();
      if (state.get(serverName) === promptId)
        throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          `The "${shortName}" connector was already tried in this turn.`,
          "Connector sign-in tool called twice in one turn",
        );
      state.set(serverName, promptId);
      let clientModule = mcpClientModule();
      let settled = await clientModule.peekSettledConnection(serverName, config);
      if (settled !== undefined && (settled.type !== "connected" || settled.discoveryAuthFailure))
        await clientModule.clearServerCache(serverName, config);
      let deferred = Promise.withResolvers();
      try {
        let connected = await clientModule.ensureConnectedClient(
          {
            name: serverName,
            type: "cached",
            config,
            capabilities: {},
            cacheSavedAt: 0,
          },
          {
            context: "MCP sign-in check",
            signal: context.abortController.signal,
            toolUseId: context.toolUseId,
            toolUseIdWithListingsUntil: deferred.promise,
          },
        );
        let toolsForClient = await clientModule.fetchToolsForClient(connected, context.storageV5);
        if (connected.discoveryAuthFailure)
          throw Object.assign(
            new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
              AUTH_MESSAGES.dialNeedsAuth(shortName),
              "MCP server needs authentication",
            ),
            {
              mcpErrorSource: "user_auth",
            },
          );
        if (clientModule.getToolsListErrorForResult(toolsForClient) !== undefined)
          throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
            `The "${shortName}" connector connected, but its tools could not be listed.`,
            "Connector connected but its tools could not be listed",
          );
        return {
          data: {
            message: `The "${shortName}" connector is connected again. Its tools are being added and should be available shortly.`,
          },
        };
      } finally {
        deferred.resolve();
      }
    },
    mapToolResultToToolResultBlockParam(output, toolUseId) {
      return {
        tool_use_id: toolUseId,
        type: "tool_result",
        content: output.message,
      };
    },
  };
}
//@ chunk-rbwn7je9.js:8631-8682 placement
/**
 * 加载懒模块集合。
 */
function mcpModules() {
  return require("./emitTripwireEvent.lazy.js");
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
var emptyAuthInputSchema; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var completeAuthInputSchema;
deferInit("chunk-rbwn7je9.js:8764", () => {
  emptyAuthInputSchema = DoctorLazy(() => objectSchema({}));
  completeAuthInputSchema = DoctorLazy(() =>
    objectSchema({
      callback_url: stringSchema().describe(
        "The full callback URL from the browser address bar after authorizing, e.g. http://localhost:<port>/callback?code=...&state=...",
      ),
    }),
  );
});
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
var redirectUrisByHost; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var REDIRECT_URI_TTL_MS;
deferInit("chunk-rbwn7je9.js:9014", () => {
  redirectUrisByHost = new HostScoped(() => new Map());
  REDIRECT_URI_TTL_MS = 180000;
});
//@ chunk-rbwn7je9.js:9050-9181 placement
function redirectUriOf(url) {
  try {
    let redirectUri = new URL(url).searchParams.get("redirect_uri");
    if (redirectUri) return redirectUri;
  } catch {}
  return "http://localhost:<port>/callback";
}
//@ chunk-rbwn7je9.js:9181-9294 placement
/**
 * 为需要认证的 MCP 服务器生成认证工具：非交互会话只给登录已停止的说明，否则给出开始认证与完成认证两个工具。
 */
function mcpAuthToolsFor(serverName, config) {
  if (getIsNonInteractiveSession())
    return hasLapsedCcrSignIn(serverName, config)
      ? [describeConnectorSignInStopped(serverName, config, mcpClientModule)]
      : [];
  let origin = describeMcpServerOrigin(serverName, config, {
    detail: "origin",
  });
  return [createMcpAuthTool(serverName, config, origin), COMPLETE_AUTH_TOOL(serverName, config)];
}
//@ chunk-rbwn7je9.js:9294-9369 placement
/**
 * “工具已自动可用”的说明文本。
 */
function toolsAvailableAutomaticallyText(tools) {
  let connection = tools !== undefined ? alwaysFalseFeed(tools) : alwaysFalseDefer();
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
