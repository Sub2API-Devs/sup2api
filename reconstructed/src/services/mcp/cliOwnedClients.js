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
import { oa } from "../../types/ids.js";

//@ chunk-wztb57wq.js:333-3409 placement
class CliOwnedMcpClientState {
  reconnect = null;
  toggle = null;
  isDisabled = null;
  dialBlockCause = null;
  policyColdStartWaiter = null;
  skippedDynamicServers = [];
  subagentBroughtOwnArtifactsServer = !1;
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
  identityBaseline = void 0;
  identitySeedAttempted = !1;
  identityChangedThisProcess = !1;
  identityTrippedHandler = null;
  identityTripUnowned = !1;
  headlessMcpTeardown = null;
  headlessConnectorMountInFlight = void 0;
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
  claudeAiConnectorIdIndex = void 0;
  claudeAiConnectorListStatus = "pending";
  claudeAiConnectorListGeneration = 0;
  claudeAiConnectorListFetchSeq = 0;
  claudeAiConnectorListSettledSeq = 0;
  claudeAiConfigsFetchTransientFailures = new WeakSet();
  pendingCrossOrgNotice = void 0;
  claudeAiConnectedThisSession = new Set();
  needsAuthNoticedThisSession = new Set();
  pendingScopeExpansionNotice = void 0;
  scopeExpansionDisclosed = !1;
  officialUrls = void 0;
  listableUrlLookedUp = !1;
  officialUrlsFetchAwaitsLookup = !1;
  officialUrlsFetch = void 0;
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
  reauthDecisionSinkForTest = void 0;
  holdStaleReauthEntryForTest = !1;
  stdioProbeTimeoutMsForTest = void 0;
  oauthCallbackListeners = new Map();
  oauthCallbackSubmitters = new Map();
  activeOAuthFlows = new Map();
  authLost = createSignal();
  reauthReconnect = createSignal();
  cachedAdopt = createSignal();
  cachedDialFailed = createSignal();
}
//@ chunk-wztb57wq.js:3409-3432 placement
var s = new HostScoped(() => new CliOwnedMcpClientState());
//@ chunk-wztb57wq.js:3432-3468 placement
function ht() {
  return s.of(getRootSession().host);
}
//@ chunk-wztb57wq.js:3468-3534 placement
function byr(e) {
  return ht().clientAuthProviders.has(oa(e.client));
}
/**
 * 把一个 MCP 服务器配置对象登记为 CLI 自有：按需记录一方服务器 id 与文件上传开关、同步/异步 bearer 提供者、响应观察者、请求头提供者、请求前钩子、凭据请求头集合、重发判定与扣留 bearer 的拒绝文案（都按配置对象做键）。
 */
//@ chunk-wztb57wq.js:3534-4429 placement
function registerCliOwnedConfig(config, options) {
  let state = ht();
  if ((state.cliOwnedConfigs.add(config), options?.firstPartyServer !== void 0))
    (state.cliOwnedFirstPartyServerIds.set(config, options.firstPartyServer.id),
      state.cliOwnedFileUploadSwitches.set(config, options.firstPartyServer.allowsFileUpload));
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
  if (options?.withheldBearerRefusal !== void 0)
    state.cliOwnedWithheldBearerRefusals.set(config, options.withheldBearerRefusal);
  return config;
}
/**
 * 取 CLI 自有 MCP 客户端被扣留的 bearer 令牌拒绝信息。
 */
//@ chunk-wztb57wq.js:4429-4532 placement
function withheldBearerRefusalFor(e) {
  return typeof e === "object" && e !== null ? ht().cliOwnedWithheldBearerRefusals.get(e) : void 0;
}
//@ chunk-wztb57wq.js:4532-4613 placement
function Zl(e) {
  return typeof e === "object" && e !== null && ht().cliOwnedConfigs.has(e);
}
/**
 * 取 CLI 自有 MCP 客户端对应的一方服务器 id。
 */
//@ chunk-wztb57wq.js:4613-4713 placement
function firstPartyServerIdFor(e) {
  return typeof e === "object" && e !== null ? ht().cliOwnedFirstPartyServerIds.get(e) : void 0;
}
/**
 * 判断 CLI 自有 MCP 客户端是否允许文件上传（有开关时按开关，无开关时非一方服务器允许）。
 */
//@ chunk-wztb57wq.js:4713-4864 placement
function allowsFileUploadFor(e) {
  if (typeof e !== "object" || e === null) return !0;
  let n = ht().cliOwnedFileUploadSwitches.get(e);
  if (n === void 0) return firstPartyServerIdFor(e) === void 0;
  return n();
}
/**
 * 判断 MCP 配置是否由 CLI 提供 bearer 令牌（同步或异步提供者）。
 */
//@ chunk-wztb57wq.js:4864-5012 placement
function hasCliOwnedBearer(e) {
  if (typeof e !== "object" || e === null) return !1;
  let n = ht();
  return n.cliOwnedBearerProviders.has(e) || n.cliOwnedAsyncBearerProviders.has(e);
}
//@ chunk-wztb57wq.js:5012-5171 placement
function syncBearerTokenFor(e) {
  if (typeof e !== "object" || e === null) return null;
  let n = ht().cliOwnedBearerProviders.get(e);
  if (!n) return null;
  try {
    return n() || null;
  } catch {
    return null;
  }
}
/**
 * 获取 CLI 自有 MCP 客户端的 bearer 令牌（优先异步提供者，失败返回 null）。
 */
//@ chunk-wztb57wq.js:5171-5349 placement
async function resolveBearerTokenFor(e) {
  if (typeof e !== "object" || e === null) return null;
  let n = ht().cliOwnedAsyncBearerProviders.get(e);
  if (!n) return syncBearerTokenFor(e);
  try {
    return (await n()) || null;
  } catch {
    return null;
  }
}
/**
 * 在 CLI 自有 MCP 客户端发请求前运行注册的钩子（出错忽略）。
 */
//@ chunk-wztb57wq.js:5349-5475 placement
async function runBeforeRequestHook(e, n) {
  if (typeof e !== "object" || e === null) return;
  try {
    await ht().cliOwnedBeforeRequestHooks.get(e)?.(n);
  } catch {}
}
/**
 * 取 CLI 自有 MCP 客户端的额外请求头（出错返回空对象）。
 */
//@ chunk-wztb57wq.js:5475-5631 placement
function cliOwnedRequestHeaders(e, n) {
  if (typeof e !== "object" || e === null) return {};
  let r = ht().cliOwnedRequestHeaderProviders.get(e);
  if (!r) return {};
  try {
    return r(n);
  } catch {
    return {};
  }
}
/**
 * 判断请求头是否是 CLI 自有 MCP 客户端声明的凭据头。
 */
//@ chunk-wztb57wq.js:5631-5760 placement
function isCredentialRequestHeader(e, n) {
  return (
    typeof e === "object" &&
    e !== null &&
    (ht().cliOwnedCredentialRequestHeaders.get(e)?.has(n.toLowerCase()) ?? !1)
  );
}
/**
 * 询问 CLI 自有 MCP 客户端是否需要按响应重发请求（出错视为否）。
 */
//@ chunk-wztb57wq.js:5760-5957 placement
async function shouldResendRequest(e, n, r) {
  if (typeof e !== "object" || e === null) return !1;
  try {
    let t = ht().cliOwnedResendDeciders.get(e);
    return t === void 0 ? !1 : await t({ status: n.status, headers: n.headers }, r);
  } catch {
    return !1;
  }
}
/**
 * 把请求与响应摘要（方法、状态、头、令牌指纹）通知 CLI 自有 MCP 客户端的观察者。
 */
//@ chunk-wztb57wq.js:5957-6209 placement
function notifyResponseObserver(e, n) {
  if (typeof e !== "object" || e === null) return;
  let r = ht().cliOwnedResponseObservers.get(e);
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
  Zl,
  registerCliOwnedConfig,
  ht,
  hasCliOwnedBearer,
  runBeforeRequestHook,
  resolveBearerTokenFor,
  withheldBearerRefusalFor,
  cliOwnedRequestHeaders,
  isCredentialRequestHeader,
  notifyResponseObserver,
  shouldResendRequest,
  firstPartyServerIdFor,
  byr,
  allowsFileUploadFor,
};
