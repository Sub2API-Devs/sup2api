/**
 * services/mcp/cliOwnedClients.ts
 *
 * 2.1.316 新增：CLI 自有 MCP 客户端
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-cdyva2jv.js (17)
 * attribution: placement 17
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { createSignal } from "../../utils/signal.js";
import { HostScoped } from "../../utils/hostScoped.js";
import { getRootSession } from "../../bootstrap/state.js";
import { identityId2 } from "../../types/ids.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-cdyva2jv.js:333-3434 placement
class CliOwnedMcpClientState {
  reconnect = null;
  toggle = null;
  isDisabled = null;
  dialBlockCause = null;
  policyColdStartWaiter = null;
  skippedDynamicServers = [];
  subagentBroughtOwnArtifactsServer = false;
  cliOwnedConfigs = new WeakSet();
  cliOwnedFirstPartyServerIds = new WeakMap();
  cliOwnedFileUploadSwitches = new WeakMap();
  cliOwnedBearerProviders = new WeakMap();
  cliOwnedAsyncBearerProviders = new WeakMap();
  cliOwnedResponseObservers = new WeakMap();
  cliOwnedRequestHeaderProviders = new WeakMap();
  cliOwnedBeforeRequestHooks = new WeakMap();
  cliOwnedCredentialRequestHeaders = new WeakMap();
  cliOwnedWithheldBearerRefusals = new WeakMap();
  cliOwnedResendDeciders = new WeakMap();
  ccrInjectedConfigs = new WeakSet();
  ccrLaunchMcpUrls = new Map();
  ccrMetaEntries = new WeakSet();
  ownToolContainerConfigs = new WeakSet();
  ownReplyServerConfigs = new WeakSet();
  clientAuthProviders = new WeakMap();
  clientFirstPartyBearers = new WeakMap();
  clientTasksDeclaredBeforeServerList = new WeakMap();
  firstToolsListReports = new WeakMap();
  toolsListAhead = new WeakMap();
  stepUpReauthFlights = new Map();
  stepUpReauthExhausted = new Map();
  identityEpoch = 0;
  identityBaseline = undefined;
  identitySeedAttempted = false;
  identityChangedThisProcess = false;
  identityTrippedHandler = null;
  identityTripUnowned = false;
  headlessMcpTeardown = null;
  headlessConnectorMountInFlight = undefined;
  transientRetryPasses = new Map();
  awaitsNextTurnRedial = null;
  searchRedial = null;
  searchRedialFailures = new Map();
  authCacheRead = null;
  authCacheWriteChain = Promise.resolve();
  rejectedStoredTokens = new Map();
  connectsToRedialWithoutToken = new WeakMap();
  tokenlessRejections = new Map();
  savedAccessTokens = new Map();
  discoverVerdictsRead = null;
  discoverVerdictsWriteChain = Promise.resolve();
  firstPartyDesignConsentAsks = new Map();
  claudeAiConfigsFetch = null;
  claudeAiConnectorIdIndex = undefined;
  claudeAiConnectorListStatus = "pending";
  claudeAiConnectorListGeneration = 0;
  claudeAiConnectorListFetchSeq = 0;
  claudeAiConnectorListSettledSeq = 0;
  claudeAiConfigsFetchTransientFailures = new WeakSet();
  pendingCrossOrgNotice = undefined;
  claudeAiConnectedThisSession = new Set();
  needsAuthNoticedThisSession = new Set();
  pendingScopeExpansionNotice = undefined;
  scopeExpansionDisclosed = false;
  officialUrls = undefined;
  listableUrlLookedUp = false;
  officialUrlsFetchAwaitsLookup = false;
  officialUrlsFetch = undefined;
  urlsRegistryCannotList = new Set();
  vscodeClient = null;
  stopVscodePolicyGatesRefresh = null;
  notificationErrorHookedClients = new WeakSet();
  toolRefreshSequences = new WeakMap();
  droppedToolsSeqByConnection = new WeakMap();
  toolsListErrorByResult = new WeakMap();
  discoveryFetchErrors = new WeakMap();
  rawToolsByResult = new WeakMap();
  rawCommandsByResult = new WeakMap();
  rawResourcesByResult = new WeakMap();
  rawFetchedAtByResult = new WeakMap();
  persistedDiscoveryRounds = new WeakSet();
  toolListingMemos = new WeakMap();
  toolListingVerdicts = new WeakMap();
  listChangedRefetchHandlers = new WeakMap();
  burnedListingDiscoverPriors = new Set();
  skillsFunnelSeen = new Set();
  skillsFetcher = null;
  discoveryCacheStore = null;
  connectionCache = null;
  cachedFirstDialArmsRan = new WeakSet();
  supersededDials = new WeakSet();
  swrRefreshDialsInFlight = new WeakSet();
  reauthDecisionSinkForTest = undefined;
  holdStaleReauthEntryForTest = false;
  stdioProbeTimeoutMsForTest = undefined;
  oauthCallbackListeners = new Map();
  oauthCallbackSubmitters = new Map();
  activeOAuthFlows = new Map();
  authLost = createSignal();
  reauthReconnect = createSignal();
  cachedAdopt = createSignal();
  cachedDialFailed = createSignal();
}
//@ chunk-cdyva2jv.js:3434-3457 placement
/**
 * 按宿主保存的 CLI 自有 MCP 客户端状态。
 */
var cliOwnedStateSlot; // deferred: uses CliOwnedMcpClientState of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-cdyva2jv.js:3434", () => {
  cliOwnedStateSlot = new HostScoped(() => new CliOwnedMcpClientState());
});
//@ chunk-cdyva2jv.js:3457-3493 placement
/**
 * 取当前宿主的 CLI 自有状态。
 */
function getCliOwnedState() {
  return cliOwnedStateSlot.of(getRootSession().host);
}
//@ chunk-cdyva2jv.js:3493-3559 placement
/**
 * 该客户端是否已登记 bearer 提供者。
 */
function hasCliOwnedAuthProvider(connection) {
  return getCliOwnedState().clientAuthProviders.has(identityId2(connection.client));
}
//@ chunk-cdyva2jv.js:3559-4455 placement
/**
 * 把一个 MCP 服务器配置对象登记为 CLI 自有：按需记录一方服务器 id 与文件上传开关、同步/异步 bearer 提供者、响应观察者、请求头提供者、请求前钩子、凭据请求头集合、重发判定与扣留 bearer 的拒绝文案（都按配置对象做键）。
 */
function registerCliOwnedConfig(config, options) {
  let state = getCliOwnedState();
  state.cliOwnedConfigs.add(config);
  if (options?.firstPartyServer !== undefined) {
    state.cliOwnedFirstPartyServerIds.set(config, options.firstPartyServer.id);
    state.cliOwnedFileUploadSwitches.set(config, options.firstPartyServer.allowsFileUpload);
  }
  if (options?.getBearerToken) state.cliOwnedBearerProviders.set(config, options.getBearerToken);
  if (options?.resolveBearerToken) state.cliOwnedAsyncBearerProviders.set(config, options.resolveBearerToken);
  if (options?.onResponse) state.cliOwnedResponseObservers.set(config, options.onResponse);
  if (options?.requestHeaders) state.cliOwnedRequestHeaderProviders.set(config, options.requestHeaders);
  if (options?.beforeRequest) state.cliOwnedBeforeRequestHooks.set(config, options.beforeRequest);
  if (options?.credentialRequestHeaders)
    state.cliOwnedCredentialRequestHeaders.set(
      config,
      new Set(
        options.credentialRequestHeaders.map((credentialRequestHeader) =>
          credentialRequestHeader.toLowerCase(),
        ),
      ),
    );
  if (options?.resendAfter) state.cliOwnedResendDeciders.set(config, options.resendAfter);
  if (options?.withheldBearerRefusal !== undefined)
    state.cliOwnedWithheldBearerRefusals.set(config, options.withheldBearerRefusal);
  return config;
}
//@ chunk-cdyva2jv.js:4455-4558 placement
/**
 * 取 CLI 自有 MCP 客户端被扣留的 bearer 令牌拒绝信息。
 */
function withheldBearerRefusalFor(config) {
  return typeof config === "object" && config !== null
    ? getCliOwnedState().cliOwnedWithheldBearerRefusals.get(config)
    : undefined;
}
//@ chunk-cdyva2jv.js:4558-4639 placement
/**
 * 判断配置对象是否属于 CLI 自有。
 */
function isCliOwnedConfig(config) {
  return typeof config === "object" && config !== null && getCliOwnedState().cliOwnedConfigs.has(config);
}
//@ chunk-cdyva2jv.js:4639-4739 placement
/**
 * 取 CLI 自有 MCP 客户端对应的一方服务器 id。
 */
function firstPartyServerIdFor(config) {
  return typeof config === "object" && config !== null
    ? getCliOwnedState().cliOwnedFirstPartyServerIds.get(config)
    : undefined;
}
//@ chunk-cdyva2jv.js:4739-4890 placement
/**
 * 判断 CLI 自有 MCP 客户端是否允许文件上传（有开关时按开关，无开关时非一方服务器允许）。
 */
function allowsFileUploadFor(config) {
  if (typeof config !== "object" || config === null) return true;
  let uploadSwitch = getCliOwnedState().cliOwnedFileUploadSwitches.get(config);
  if (uploadSwitch === undefined) return firstPartyServerIdFor(config) === undefined;
  return uploadSwitch();
}
//@ chunk-cdyva2jv.js:4890-5038 placement
/**
 * 判断 MCP 配置是否由 CLI 提供 bearer 令牌（同步或异步提供者）。
 */
function hasCliOwnedBearer(config) {
  if (typeof config !== "object" || config === null) return false;
  let cliOwnedState = getCliOwnedState();
  return (
    cliOwnedState.cliOwnedBearerProviders.has(config) ||
    cliOwnedState.cliOwnedAsyncBearerProviders.has(config)
  );
}
//@ chunk-cdyva2jv.js:5038-5197 placement
function syncBearerTokenFor(config) {
  if (typeof config !== "object" || config === null) return null;
  let provider = getCliOwnedState().cliOwnedBearerProviders.get(config);
  if (!provider) return null;
  try {
    return provider() || null;
  } catch {
    return null;
  }
}
//@ chunk-cdyva2jv.js:5197-5375 placement
/**
 * 获取 CLI 自有 MCP 客户端的 bearer 令牌（优先异步提供者，失败返回 null）。
 */
async function resolveBearerTokenFor(config) {
  if (typeof config !== "object" || config === null) return null;
  let asyncProvider = getCliOwnedState().cliOwnedAsyncBearerProviders.get(config);
  if (!asyncProvider) return syncBearerTokenFor(config);
  try {
    return (await asyncProvider()) || null;
  } catch {
    return null;
  }
}
//@ chunk-cdyva2jv.js:5375-5501 placement
/**
 * 在 CLI 自有 MCP 客户端发请求前运行注册的钩子（出错忽略）。
 */
async function runBeforeRequestHook(config, requestInfo) {
  if (typeof config !== "object" || config === null) return;
  try {
    await getCliOwnedState().cliOwnedBeforeRequestHooks.get(config)?.(requestInfo);
  } catch {}
}
//@ chunk-cdyva2jv.js:5501-5657 placement
/**
 * 取 CLI 自有 MCP 客户端的额外请求头（出错返回空对象）。
 */
function cliOwnedRequestHeaders(config, requestInfo) {
  if (typeof config !== "object" || config === null) return {};
  let provider = getCliOwnedState().cliOwnedRequestHeaderProviders.get(config);
  if (!provider) return {};
  try {
    return provider(requestInfo);
  } catch {
    return {};
  }
}
//@ chunk-cdyva2jv.js:5657-5786 placement
/**
 * 判断请求头是否是 CLI 自有 MCP 客户端声明的凭据头。
 */
function isCredentialRequestHeader(config, headerName) {
  return (
    typeof config === "object" &&
    config !== null &&
    (getCliOwnedState().cliOwnedCredentialRequestHeaders.get(config)?.has(headerName.toLowerCase()) ?? false)
  );
}
//@ chunk-cdyva2jv.js:5786-5983 placement
/**
 * 询问 CLI 自有 MCP 客户端是否需要按响应重发请求（出错视为否）。
 */
async function shouldResendRequest(config, response, owned) {
  if (typeof config !== "object" || config === null) return false;
  try {
    let decider = getCliOwnedState().cliOwnedResendDeciders.get(config);
    return decider === undefined
      ? false
      : await decider(
          {
            status: response.status,
            headers: response.headers,
          },
          owned,
        );
  } catch {
    return false;
  }
}
//@ chunk-cdyva2jv.js:5983-6235 placement
/**
 * 把请求与响应摘要（方法、状态、头、令牌指纹）通知 CLI 自有 MCP 客户端的观察者。
 */
function notifyResponseObserver(config, observation) {
  if (typeof config !== "object" || config === null) return;
  let observer = getCliOwnedState().cliOwnedResponseObservers.get(config);
  if (!observer) return;
  try {
    observer({
      method: observation.method,
      status: observation.status,
      headers: observation.headers,
      requestHeaders: observation.requestHeaders,
      bearerFingerprint: observation.bearerFingerprint,
    });
  } catch {}
}
export {
  getCliOwnedState,
  firstPartyServerIdFor,
  isCliOwnedConfig,
  registerCliOwnedConfig,
  runBeforeRequestHook,
  resolveBearerTokenFor,
  withheldBearerRefusalFor,
  cliOwnedRequestHeaders,
  isCredentialRequestHeader,
  notifyResponseObserver,
  shouldResendRequest,
  hasCliOwnedBearer,
  hasCliOwnedAuthProvider,
  allowsFileUploadFor,
};
