/**
 * services/mcp/needsAuthCache.ts
 *
 * 2.1.316 新增：MCP needs-auth 缓存文件与认证失败提示（claude.ai 连接器需重新连接、headersHelper 被拒、令牌刷新失败）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-k8ag9amq.js (30)
 * attribution: placement 26, layout 4
 */
import { join } from "path";
import {
  isDiskless,
  getPromptId,
  getIsRemoteMode,
  getIsNonInteractiveSession,
} from "../../bootstrap/state.js";
import { getClaudeConfigDir } from "../../utils/markdownConfigLoader.js";
import { STORAGE_SPACES } from "../../utils/storage/storageSpaces.js";
import { isDisklessWithoutState } from "../orgMemory/memoryStores.js";
import { getCliOwnedState } from "./cliOwnedClients.js";
import { isStorageV5Enabled } from "../../utils/hoverRest.js";
import { getFileReader } from "../../utils/fileStore.js";
import { jsonParse } from "../../utils/slowOperations.js";
import { logForDebugging } from "../../utils/debug.js";
import { formatStorageError } from "../../utils/storage/storageErrors.js";
import {
  isClaudeAiChatCowork,
  isClaudeAiChatRemote,
  isCcsCoworkSurface,
} from "../../utils/entrypointKinds.js";
import { isCcrSessionScopedMcpUrl } from "./ccrMcpUrls.js";
import { isArtifactPathMounted, isArtifactMountUsable } from "../artifacts/artifactMount.js";
import {
  isHiddenReplyServer,
  APP_TOOL_ACCESS_FAILED_TEXT,
  appToolServerUnavailableText,
} from "./appToolServerErrors.js";
import { normalizeMcpServerName, normalizeServerNameShort, AUTHENTICATE } from "../api/deferredToolsState.js";
import { LRUCache } from "../../../vendor/lru-cache/dist/esm/index.min.js";
import { retainCacheKey } from "../../utils/memoize.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { objectSchema, stringSchema } from "../../../vendor/zod/v4/classic/schemas.js";
import { HostScoped } from "../../utils/hostScoped.js";
import { getFeatureValue_SESSION_PINNED } from "../analytics/growthbook.js";
import { isToolSearchEnabledOptimistic } from "../../utils/toolSearch.js";
import {
  isCodeModeOnlyToolsEnabled,
  willHideCodeModeOnlyTools,
} from "../../tools/RefreshMcpToolsTool/RefreshMcpToolsTool.js";
import { serverCacheKey } from "./client.js";
import { buildMcpToolName } from "./mcpStringUtils.js";
import { mcpServerSource } from "./fileReference/fileReferencePolicy.js";
import { connectorServerId } from "./claudeai.js";
import { dynamicServerConnectorId } from "./mcpToolDecoration.js";
import { TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS } from "../../utils/errors.js";
import { env } from "../../utils/env.js";
import { describeMcpServerOrigin } from "./mcpServerOrigin.js";
import { createMcpAuthTool, COMPLETE_AUTH_TOOL } from "../../tools/McpAuthTool/McpAuthTool.js";
import { codeModeAccepted } from "../../utils/codeMode/accepted.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-k8ag9amq.js:1595-1781 placement (2.1.88 match: getMcpAuthCachePath, 0.644)
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
//@ chunk-k8ag9amq.js:1781-1836 placement
/**
 * needs-auth 缓存的存储空间。
 */
function needsAuthCacheSpace() {
  return STORAGE_SPACES.state("mcp-needs-auth-cache");
}
//@ chunk-k8ag9amq.js:1836-2029 placement
/**
 * 读取 MCP needs-auth 缓存（每会话只读一次，存储 V5 或文件，失败为空对象）。
 */
function readNeedsAuthCache(storageV5) {
  if (isDisklessWithoutState(storageV5)) return Promise.resolve({});
  let cliOwnedState = getCliOwnedState();
  if (!cliOwnedState.authCacheRead)
    cliOwnedState.authCacheRead =
      isStorageV5Enabled() && storageV5 !== undefined
        ? readAuthCacheV5(storageV5)
        : getFileReader()
            .read(needsAuthCachePath())
            .then((raw) => jsonParse(raw))
            .catch(() => ({}));
  return cliOwnedState.authCacheRead;
}
//@ chunk-k8ag9amq.js:2029-2208 layout
/**
 * 经存储层读取一个 JSON 文件（失败返回空对象）。名字配错，见 lead 建议。
 */
async function readAuthCacheV5(storageV5) {
  try {
    let storageV5_2 = await storageV5.read([needsAuthCacheSpace()]);
    if (!storageV5_2.ok) return {};
    let item = storageV5_2.value.items[0];
    if (!item.found) return {};
    return jsonParse(Buffer.from(item.value).toString("utf8"));
  } catch {
    return {};
  }
}
//@ chunk-k8ag9amq.js:2208-2247 placement
/**
 * 清空已读取的认证缓存。
 */
function clearAuthCacheRead() {
  getCliOwnedState().authCacheRead = null;
}
//@ chunk-k8ag9amq.js:2247-2485 placement
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
//@ chunk-k8ag9amq.js:2485-2723 layout
var RECONNECT_IN_SETTINGS_HINT = "the user can reconnect it in their claude.ai connector settings";
var SIGN_IN_CARD_HINT =
  "the chat may now show the user a sign-in card for it; ask them to sign in there or in their claude.ai connector settings, and retry only after they say they have";
//@ chunk-k8ag9amq.js:2723-2772 layout (2.1.88 match: getServerUrl, 1)
function getServerUrl(config) {
  return isClaudeAiChatCowork() && "url" in config && isCcrSessionScopedMcpUrl(config.url);
}
//@ chunk-k8ag9amq.js:2772-4136 placement
/**
 * 认证相关给用户/模型的提示文案表。
 */
var AUTH_MESSAGES = {
  notConnected(serverName) {
    return isArtifactPathMounted()
      ? `MCP server "${serverName}" needs to be connected in claude.ai`
      : `MCP server "${serverName}" needs to be connected in claude.ai (run /mcp to connect it)`;
  },
  signInAgain(serverName, config) {
    if (isHiddenReplyServer(serverName)) return APP_TOOL_ACCESS_FAILED_TEXT;
    let base = `MCP server "${serverName}" needs you to sign in again`;
    return isClaudeAiChatCowork()
      ? `${base} (${getServerUrl(config) ? SIGN_IN_CARD_HINT : RECONNECT_IN_SETTINGS_HINT})`
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
  dialNeedsAuth(serverName, config) {
    if (isHiddenReplyServer(serverName)) return appToolServerUnavailableText("needs_auth");
    let message = `MCP server "${serverName}" needs authentication`;
    return getServerUrl(config) ? `${message} (${SIGN_IN_CARD_HINT})` : message;
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
      ? `${base} \u2014 ${RECONNECT_IN_SETTINGS_HINT}`
      : `${base} \u2014 run /mcp to re-authenticate`;
  },
};
//@ chunk-k8ag9amq.js:4136-4285 placement
/**
 * CCR 票据的有效期（10 秒）。
 */
var MAX_ERROR_BODY_CHARS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var CCR_LAPSED_TOKEN_CODES;
deferInit("chunk-k8ag9amq.js:4136", () => {
  MAX_ERROR_BODY_CHARS = 20;
  CCR_LAPSED_TOKEN_CODES = new Set([
    "mcp_invalid_oauth_token",
    "mcp_unauthorized_after_token_refresh",
    "mcp_oauth_token_refresh_failed",
    "mcp_oauth_no_refresh_token",
  ]);
});
//@ chunk-k8ag9amq.js:4285-5118 placement
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
  urlsOnDrainingHosts = new Set();
  liveClients = new Set();
  noteCcrDialAnswer(connectionKey, response) {
    if (response.status === 401 && CCR_LAPSED_TOKEN_CODES.has(response.headers.get("X-Mcp-Error-Code") ?? ""))
      this.lapsedCcrSignIns.add(connectionKey);
    else this.lapsedCcrSignIns.delete(connectionKey);
  }
  lapsedSignInKey(signInKey) {
    return this.lapsedCcrSignIns.has(signInKey) ? signInKey : undefined;
  }
  restoreLapsed(key, lapsedKey) {
    if (key === lapsedKey) this.lapsedCcrSignIns.add(lapsedKey);
  }
  noteHostDraining(key, existing) {
    if (existing.headers.get("x-ccr-tool-container-host-draining") === "1")
      this.urlsOnDrainingHosts.add(String(key));
  }
  forgetListings() {
    this.toolLists.clear();
    this.resourceLists.clear();
    this.resourceTemplateLists.clear();
    this.commandLists.clear();
  }
}
//@ chunk-k8ag9amq.js:5118-5423 placement
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
    retainCacheKey(cliOwnedState.connectionCache.urlsOnDrainingHosts);
  }
  return cliOwnedState.connectionCache;
}
//@ chunk-k8ag9amq.js:5423-5711 placement
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
//@ chunk-k8ag9amq.js:5711-5952 placement (2.1.88 match: memoizeWithLRU, 1)
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
//@ chunk-k8ag9amq.js:5952-6038 placement
function getOrCompute(cache, key, compute) {
  let existing = cache.get(key);
  if (existing !== undefined) return existing;
  let value = compute();
  cache.set(key, value);
  return value;
}
//@ chunk-k8ag9amq.js:6038-6129 placement
/**
 * 按宿主保存的 eager raccoon 状态。
 */
var TENGU_EAGER_RACCOON; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var TENGU_PATIENT_RACCOON;
var emptyRecordSchema;
var eagerRaccoonStates;
deferInit("chunk-k8ag9amq.js:6038", () => {
  TENGU_EAGER_RACCOON = "tengu_eager_raccoon";
  TENGU_PATIENT_RACCOON = "tengu_patient_raccoon";
  emptyRecordSchema = DoctorLazy(() => objectSchema({}));
  eagerRaccoonStates = new HostScoped(() => new Map());
});
//@ chunk-k8ag9amq.js:6129-6184 layout
function isCachedAuthStaleButUsable() {
  return (
    isClaudeAiChatRemote() &&
    getFeatureValue_SESSION_PINNED(TENGU_EAGER_RACCOON, false) &&
    (isCcsCoworkSurface() || getFeatureValue_SESSION_PINNED(TENGU_PATIENT_RACCOON, false))
  );
}
//@ chunk-k8ag9amq.js:6184-6224 placement
/**
 * eager raccoon 是否可用。
 */
function isEagerRaccoonEnabled() {
  return isCachedAuthStaleButUsable() && isToolSearchEnabledOptimistic() && !isCodeModeOnlyToolsEnabled();
}
//@ chunk-k8ag9amq.js:6224-6290 placement
/**
 * 该服务器是否出现过 CCR 登录失效。
 */
function hasLapsedCcrSignIn(serverName, config) {
  return (
    isEagerRaccoonEnabled() && getConnectionCache().lapsedCcrSignIns.has(serverCacheKey(serverName, config))
  );
}
//@ chunk-k8ag9amq.js:6290-8954 placement
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
              AUTH_MESSAGES.dialNeedsAuth(shortName, config),
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
      } catch (error) {
        let notConnected = AUTH_MESSAGES.dialNotConnected(serverName, "");
        if (error instanceof Error && error.message.startsWith(notConnected))
          error.message = AUTH_MESSAGES.dialNotConnected(shortName, "");
        throw error;
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
//@ chunk-k8ag9amq.js:8954-9005 placement
/**
 * 加载懒模块集合。
 */
function mcpModules() {
  return require("./emitTripwireEvent.lazy.js");
}
//@ chunk-k8ag9amq.js:9005-9045 placement
/**
 * 取 MCP 认证模块。
 */
function mcpAuthModule() {
  return mcpModules().mcpAuthModule();
}
//@ chunk-k8ag9amq.js:9045-9087 placement
/**
 * 取 MCP 客户端模块。
 */
function mcpClientModule() {
  return mcpModules().mcpClientModule();
}
//@ chunk-k8ag9amq.js:9087-9278 placement
var emptyAuthInputSchema; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var completeAuthInputSchema;
deferInit("chunk-k8ag9amq.js:9087", () => {
  emptyAuthInputSchema = DoctorLazy(() => objectSchema({}));
  completeAuthInputSchema = DoctorLazy(() =>
    objectSchema({
      callback_url: stringSchema().describe(
        "The full callback URL from the browser address bar after authorizing, e.g. http://localhost:<port>/callback?code=...&state=...",
      ),
    }),
  );
});
//@ chunk-k8ag9amq.js:9278-9337 placement
/**
 * 是否处于远程/SSH 环境。
 */
function isRemoteEnvironment() {
  return env.isSSH() || env.CLAUDE_CODE_REMOTE || getIsRemoteMode();
}
//@ chunk-k8ag9amq.js:9337-9373 placement
/**
 * 回调地址缓存的有效期（180 秒）。
 */
var redirectUrisByHost; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var REDIRECT_URI_TTL_MS;
deferInit("chunk-k8ag9amq.js:9337", () => {
  redirectUrisByHost = new HostScoped(() => new Map());
  REDIRECT_URI_TTL_MS = 180000;
});
//@ chunk-k8ag9amq.js:9373-9504 placement
function redirectUriOf(url) {
  try {
    let redirectUri = new URL(url).searchParams.get("redirect_uri");
    if (redirectUri) return redirectUri;
  } catch {}
  return "http://localhost:<port>/callback";
}
//@ chunk-k8ag9amq.js:9504-9617 placement
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
//@ chunk-k8ag9amq.js:9617-9836 placement
/**
 * “工具已自动可用”的说明文本。
 */
function toolsAvailableAutomaticallyText(tools) {
  let connection = tools !== undefined ? willHideCodeModeOnlyTools(tools) : isCodeModeOnlyToolsEnabled();
  return codeModeAccepted() && connection
    ? "callable inside the REPL environment (this surface routes MCP tools through the REPL rather than advertising them as top-level tools)"
    : "available automatically";
}
//@ chunk-k8ag9amq.js:9836-10079 placement
/**
 * “工具现在应该可用了”的说明文本。
 */
function toolsAvailableNowText(tools) {
  return codeModeAccepted() && willHideCodeModeOnlyTools(tools)
    ? "The server's tools are now callable inside the REPL environment (this surface routes MCP tools through the REPL rather than advertising them as top-level tools)."
    : "The server's tools should now be available.";
}
export {
  mcpAuthToolsFor,
  hasLapsedCcrSignIn,
  isCachedAuthStaleButUsable,
  deleteNeedsAuthCache,
  readNeedsAuthCache,
  getConnectionCache,
  needsAuthCacheSpace,
  needsAuthCachePath,
  clearAuthCacheRead,
  memoizeWithExternalCache,
  AUTH_MESSAGES,
  memoizeWithLRU,
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
