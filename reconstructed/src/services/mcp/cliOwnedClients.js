/**
 * services/mcp/cliOwnedClients.ts
 *
 * 2.1.316 新增：CLI 自有 MCP 客户端
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-wztb57wq.js (17)
 * attribution: placement 17
 */
import { createSignal } from "../../utils/signal.js";
import { HostScoped } from "../../utils/hostScoped.js";
import { getRootSession } from "../../bootstrap/state.js";
import { identityId2 } from "../../types/ids.js";

//@ chunk-wztb57wq.js:333-3409 placement
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
//@ chunk-wztb57wq.js:3409-3432 placement
/**
 * 按宿主保存的 CLI 自有 MCP 客户端状态。
 */
var cliOwnedStateSlot = new HostScoped(() => new CliOwnedMcpClientState());
//@ chunk-wztb57wq.js:3432-3468 placement
/**
 * 取当前宿主的 CLI 自有状态。
 */
function getCliOwnedState() {
  return cliOwnedStateSlot.of(getRootSession().host);
}
//@ chunk-wztb57wq.js:3468-3534 placement
/**
 * 该客户端是否已登记 bearer 提供者。
 */
function hasCliOwnedAuthProvider(e) {
  return getCliOwnedState().clientAuthProviders.has(identityId2(e.client));
}
//@ chunk-wztb57wq.js:3534-4429 placement
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
//@ chunk-wztb57wq.js:4429-4532 placement
/**
 * 取 CLI 自有 MCP 客户端被扣留的 bearer 令牌拒绝信息。
 */
function withheldBearerRefusalFor(e) {
  return typeof e === "object" && e !== null
    ? getCliOwnedState().cliOwnedWithheldBearerRefusals.get(e)
    : undefined;
}
//@ chunk-wztb57wq.js:4532-4613 placement
/**
 * 判断配置对象是否属于 CLI 自有。
 */
function isCliOwnedConfig(config) {
  return typeof config === "object" && config !== null && getCliOwnedState().cliOwnedConfigs.has(config);
}
//@ chunk-wztb57wq.js:4613-4713 placement
/**
 * 取 CLI 自有 MCP 客户端对应的一方服务器 id。
 */
function firstPartyServerIdFor(config) {
  return typeof config === "object" && config !== null
    ? getCliOwnedState().cliOwnedFirstPartyServerIds.get(config)
    : undefined;
}
//@ chunk-wztb57wq.js:4713-4864 placement
/**
 * 判断 CLI 自有 MCP 客户端是否允许文件上传（有开关时按开关，无开关时非一方服务器允许）。
 */
function allowsFileUploadFor(config) {
  if (typeof config !== "object" || config === null) return true;
  let n = getCliOwnedState().cliOwnedFileUploadSwitches.get(config);
  if (n === undefined) return firstPartyServerIdFor(config) === undefined;
  return n();
}
//@ chunk-wztb57wq.js:4864-5012 placement
/**
 * 判断 MCP 配置是否由 CLI 提供 bearer 令牌（同步或异步提供者）。
 */
function hasCliOwnedBearer(e) {
  if (typeof e !== "object" || e === null) return false;
  let cliOwnedState = getCliOwnedState();
  return cliOwnedState.cliOwnedBearerProviders.has(e) || cliOwnedState.cliOwnedAsyncBearerProviders.has(e);
}
//@ chunk-wztb57wq.js:5012-5171 placement
function syncBearerTokenFor(e) {
  if (typeof e !== "object" || e === null) return null;
  let n = getCliOwnedState().cliOwnedBearerProviders.get(e);
  if (!n) return null;
  try {
    return n() || null;
  } catch {
    return null;
  }
}
//@ chunk-wztb57wq.js:5171-5349 placement
/**
 * 获取 CLI 自有 MCP 客户端的 bearer 令牌（优先异步提供者，失败返回 null）。
 */
async function resolveBearerTokenFor(e) {
  if (typeof e !== "object" || e === null) return null;
  let n = getCliOwnedState().cliOwnedAsyncBearerProviders.get(e);
  if (!n) return syncBearerTokenFor(e);
  try {
    return (await n()) || null;
  } catch {
    return null;
  }
}
//@ chunk-wztb57wq.js:5349-5475 placement
/**
 * 在 CLI 自有 MCP 客户端发请求前运行注册的钩子（出错忽略）。
 */
async function runBeforeRequestHook(e, n) {
  if (typeof e !== "object" || e === null) return;
  try {
    await getCliOwnedState().cliOwnedBeforeRequestHooks.get(e)?.(n);
  } catch {}
}
//@ chunk-wztb57wq.js:5475-5631 placement
/**
 * 取 CLI 自有 MCP 客户端的额外请求头（出错返回空对象）。
 */
function cliOwnedRequestHeaders(e, n) {
  if (typeof e !== "object" || e === null) return {};
  let r = getCliOwnedState().cliOwnedRequestHeaderProviders.get(e);
  if (!r) return {};
  try {
    return r(n);
  } catch {
    return {};
  }
}
//@ chunk-wztb57wq.js:5631-5760 placement
/**
 * 判断请求头是否是 CLI 自有 MCP 客户端声明的凭据头。
 */
function isCredentialRequestHeader(config, n) {
  return (
    typeof config === "object" &&
    config !== null &&
    (getCliOwnedState().cliOwnedCredentialRequestHeaders.get(config)?.has(n.toLowerCase()) ?? false)
  );
}
//@ chunk-wztb57wq.js:5760-5957 placement
/**
 * 询问 CLI 自有 MCP 客户端是否需要按响应重发请求（出错视为否）。
 */
async function shouldResendRequest(config, response, owned) {
  if (typeof config !== "object" || config === null) return false;
  try {
    let t = getCliOwnedState().cliOwnedResendDeciders.get(config);
    return t === undefined
      ? false
      : await t(
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
//@ chunk-wztb57wq.js:5957-6209 placement
/**
 * 把请求与响应摘要（方法、状态、头、令牌指纹）通知 CLI 自有 MCP 客户端的观察者。
 */
function notifyResponseObserver(e, n) {
  if (typeof e !== "object" || e === null) return;
  let r = getCliOwnedState().cliOwnedResponseObservers.get(e);
  if (!r) return;
  try {
    r({
      method: n.method,
      status: n.status,
      headers: n.headers,
      requestHeaders: n.requestHeaders,
      bearerFingerprint: n.bearerFingerprint,
    });
  } catch {}
}
export {
  isCliOwnedConfig,
  registerCliOwnedConfig,
  getCliOwnedState,
  hasCliOwnedBearer,
  runBeforeRequestHook,
  resolveBearerTokenFor,
  withheldBearerRefusalFor,
  cliOwnedRequestHeaders,
  isCredentialRequestHeader,
  notifyResponseObserver,
  shouldResendRequest,
  firstPartyServerIdFor,
  hasCliOwnedAuthProvider,
  allowsFileUploadFor,
};
