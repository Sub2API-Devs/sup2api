/**
 * bootstrap/state.ts
 *
 * 已有模块；g2 补充放置少量状态访问声明
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/bootstrap/state.ts
 * pieces: chunk-ndmse9kj.js (677), chunk-xdkvf45x.js (11)
 * attribution: sole-consumer 1, affinity 1, fingerprint 11, layout 30, file-local 1, facade-majority 642, placement 2
 */
import { resolve, sep } from "path";
import { randomUUID } from "crypto";
import { homedir } from "os";
import {
  deepEqualWithCycles,
  nullProtoCopy,
  ManagedDocumentLinks,
  unlatchStickyBetaLatches,
  ManagedFileProtections,
  RepoTierFreeze,
  settingsEqualIgnoringOwner,
  SETTINGS_CACHE_STORE_SLOT,
} from "./stateSlices.js";
import {
  mergeProjectDirs,
  RuntimeModeSlice,
  SettingsSourcesSlice,
  PluginsAndChannelsSlice,
  ModelStringsSlice,
  DiagnosticsSlice,
  forkRootSessionWithProject,
  setProjectDirectoryErrorHandler,
  projectDirectoryErrorReporterSlot,
  getSessionProject,
  SessionRootSlot,
} from "./sessionSlices.js";
import { SESSION_URL_HASH_SALT, remoteSessionUrlId } from "../utils/sessionUrl.js";
import { count } from "../utils/collections.js";
import { createSignal } from "../utils/signal.js";
import { SystemClock } from "../utils/sleep.js";
import { initialCwdKey, INITIAL_CWD_KEY, launchCwd, identityString } from "../utils/cwd.js";
import { setDisklessHooks, processScopedEmptyValues, HostScoped } from "../utils/hostScoped.js";
import { identityAgentId2 } from "../utils/agentId.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-ndmse9kj.js:60755-60848 sole-consumer
function createCaBundleSlots() {
  return {
    direct: {
      strict: null,
      customer: null,
    },
    proxied: {
      strict: null,
      customer: null,
    },
  };
}
//@ chunk-ndmse9kj.js:60848-60955 affinity
function createDropReporterState() {
  return {
    rateTokens: null,
    rateLastRefillMs: null,
    featureOkLogged: false,
    reportedDropReasons: new Set(),
  };
}
//@ chunk-ndmse9kj.js:60955-63812 fingerprint = setMeter (0.718)
class TelemetryHandles {
  #e = null;
  #t = null;
  #n = null;
  #o = null;
  #r = null;
  #s = null;
  #i = null;
  #d = null;
  #u = null;
  #c = null;
  #l = null;
  #p = null;
  #h = null;
  #a = [];
  #g = null;
  #S = createDropReporterState();
  #y = null;
  #v = null;
  #f = null;
  #m = createCaBundleSlots();
  #b = null;
  #k = null;
  installMeter(meter, createCounter, { omitUnits = false } = {}) {
    this.#e = meter;
    let unitOrUndefined = (unit) => (omitUnits ? undefined : unit);
    this.#t = createCounter("claude_code.session.count", {
      description: "Count of CLI sessions started",
    });
    this.#n = createCounter("claude_code.lines_of_code.count", {
      description:
        "Count of lines of code modified, with the 'type' attribute indicating whether lines were added or removed and the 'model' attribute indicating which model made the change",
    });
    this.#o = createCounter("claude_code.pull_request.count", {
      description: "Number of pull requests created",
    });
    this.#r = createCounter("claude_code.commit.count", {
      description: "Number of git commits created",
    });
    this.#s = createCounter("claude_code.cost.usage", {
      description: "Cost of the Claude Code session",
      unit: unitOrUndefined("USD"),
    });
    this.#i = createCounter("claude_code.token.usage", {
      description: "Number of tokens used",
      unit: unitOrUndefined("tokens"),
    });
    this.#d = createCounter("claude_code.code_edit_tool.decision", {
      description:
        "Count of code editing tool permission decisions (accept/reject) for Edit, Write, and NotebookEdit tools",
    });
    this.#u = createCounter("claude_code.active_time.total", {
      description: "Total active time in seconds",
      unit: unitOrUndefined("s"),
    });
  }
  meter() {
    return this.#e;
  }
  sessionCounter() {
    return this.#t;
  }
  locCounter() {
    return this.#n;
  }
  prCounter() {
    return this.#o;
  }
  commitCounter() {
    return this.#r;
  }
  costCounter() {
    return this.#s;
  }
  tokenCounter() {
    return this.#i;
  }
  codeEditToolDecisionCounter() {
    return this.#d;
  }
  activeTimeCounter() {
    return this.#u;
  }
  statsStore() {
    return this.#c;
  }
  replaceStatsStore(statsStore) {
    this.#c = statsStore;
  }
  loggerProvider() {
    return this.#l;
  }
  replaceLoggerProvider(loggerProvider) {
    this.#l = loggerProvider;
  }
  eventLogger() {
    return this.#p;
  }
  eventLoggerOwner() {
    return this.#h;
  }
  attachEventLogger(eventLogger, owner) {
    this.#p = eventLogger;
    this.#h = eventLogger ? owner : null;
    if (!eventLogger) return;
    let pendingEvents = this.#a;
    this.#a = null;
    if (pendingEvents) for (let event of pendingEvents) eventLogger.emit(event);
  }
  bufferPendingEvent(event) {
    if (this.#a === null || this.#a.length >= 100) return false;
    this.#a.push(event);
    return true;
  }
  closeWindow(cause) {
    this.#a = null;
    this.#g = cause;
  }
  windowCloseCause() {
    return this.#g;
  }
  isWindowOpen() {
    return this.#a !== null;
  }
  hostOtel() {
    return this.#S;
  }
  meterProvider() {
    return this.#y;
  }
  replaceMeterProvider(meterProvider) {
    this.#y = meterProvider;
  }
  tracerProvider() {
    return this.#v;
  }
  replaceTracerProvider(tracerProvider) {
    this.#v = tracerProvider;
  }
  cachedTelemetryResource() {
    return this.#f;
  }
  replaceCachedTelemetryResource(resource) {
    this.#f = resource;
  }
  cachedOtlpHttpAgentFactory(isProxied, factoryName) {
    return this.#m[isProxied ? "proxied" : "direct"][factoryName];
  }
  replaceCachedOtlpHttpAgentFactory(isProxied, factoryName, factory) {
    this.#m[isProxied ? "proxied" : "direct"][factoryName] = factory;
  }
  inClusterOtlpTrustRoots() {
    return this.#b;
  }
  replaceInClusterOtlpTrustRoots(trustRoots) {
    this.#b = trustRoots;
  }
  inClusterOtlpAgentFactory() {
    return this.#k;
  }
  replaceInClusterOtlpAgentFactory(factory) {
    this.#k = factory;
  }
  reset() {
    this.#e = null;
    this.#t = null;
    this.#n = null;
    this.#o = null;
    this.#r = null;
    this.#s = null;
    this.#i = null;
    this.#d = null;
    this.#u = null;
    this.#c = null;
    this.#l = null;
    this.#p = null;
    this.#h = null;
    this.#a = [];
    this.#g = null;
    this.#S = createDropReporterState();
    this.#y = null;
    this.#v = null;
    this.#f = null;
    this.#m = createCaBundleSlots();
    this.#b = null;
    this.#k = null;
  }
}
//@ chunk-ndmse9kj.js:63812-66442 layout
class CredentialSlots {
  #e = undefined;
  #t = null;
  #n = undefined;
  #o = false;
  #r = null;
  #s = null;
  #i = undefined;
  #d = undefined;
  #u = new Set();
  #c = new Map();
  #l = undefined;
  #p = null;
  #h = new Set();
  #a = null;
  #g = 0;
  #S = null;
  #y = false;
  #v = () => false;
  #f = null;
  #m = undefined;
  #b = null;
  #k = null;
  sessionIngressToken() {
    return this.#e;
  }
  replaceSessionIngressToken(token) {
    this.#e = token;
  }
  inferenceRequestToken() {
    return this.#t;
  }
  replaceInferenceRequestToken(token) {
    this.#t = token;
  }
  oauthTokenFromFd() {
    return this.#n;
  }
  replaceOauthTokenFromFd(token) {
    this.#n = token;
  }
  oauthTokenFromBgSnapshot() {
    return this.#o;
  }
  replaceOauthTokenFromBgSnapshot(isFromBgSnapshot) {
    this.#o = isFromBgSnapshot;
  }
  loginStashedInTokenSlot() {
    return this.#r;
  }
  replaceLoginStashedInTokenSlot(slot) {
    this.#r = slot;
  }
  oauthOrgFromBgSnapshot() {
    return this.#s;
  }
  replaceOauthOrgFromBgSnapshot(organization) {
    this.#s = organization;
  }
  oauthScopesFromFd() {
    return this.#i;
  }
  replaceOauthScopesFromFd(scopes) {
    this.#i = scopes;
  }
  apiKeyFromFd() {
    return this.#d;
  }
  replaceApiKeyFromFd(apiKey) {
    this.#d = apiKey;
  }
  descriptorAnnouncementConsumed(descriptorId) {
    return this.#u.has(descriptorId);
  }
  markDescriptorAnnouncementConsumed(descriptorId) {
    this.#u.add(descriptorId);
  }
  credentialRoad(roadKey) {
    return this.#c.get(roadKey);
  }
  noteCredentialRoad(roadKey, road, descriptor) {
    if (descriptor !== null && !this.#c.has(roadKey)) this.#c.set(roadKey, road);
  }
  gatewayTokenFromDescriptor() {
    return this.#l;
  }
  replaceGatewayTokenFromDescriptor(token) {
    this.#l = token;
  }
  resetFdCredentialState() {
    this.#e = undefined;
    this.#n = undefined;
    this.#o = false;
    this.#r = null;
    this.#s = null;
    this.#i = undefined;
    this.#d = undefined;
  }
  gatewayAuth() {
    return this.#p;
  }
  replaceGatewayAuth(auth) {
    this.#p = auth;
  }
  isGatewayHostHeldStrict(host) {
    return this.#h.has(host);
  }
  holdGatewayHostStrict(host) {
    this.#h.add(host);
  }
  releaseGatewayHost(host) {
    this.#h.delete(host);
  }
  gatewayServerProcess() {
    return this.#y;
  }
  replaceGatewayServerProcess(gatewayServerProcess) {
    this.#y = gatewayServerProcess;
  }
  gatewayRequiredByHostPolicy() {
    return this.#v();
  }
  replaceGatewayRequiredByHostPolicyReader(reader) {
    this.#v = reader;
  }
  authenticatedAccount() {
    return this.#a;
  }
  authenticatedAccountEpoch() {
    return this.#g;
  }
  stampAuthenticatedAccount(account) {
    let previousAccount = this.#a;
    if (
      account !== null &&
      previousAccount !== null &&
      account.accountUuid === previousAccount.accountUuid &&
      account.emailAddress === previousAccount.emailAddress &&
      account.organizationUuid === previousAccount.organizationUuid
    )
      return;
    this.#g += 1;
    this.#a = account;
    this.#S = null;
  }
  bearerPlan() {
    return this.#S;
  }
  replaceBearerPlan(plan) {
    this.#S = plan;
  }
  startupPolicySnapshot() {
    return this.#m;
  }
  replaceStartupPolicySnapshot(snapshot) {
    this.#m = snapshot;
  }
  gatewayRefreshInFlight() {
    return this.#f;
  }
  replaceGatewayRefreshInFlight(pendingRefresh) {
    this.#f = pendingRefresh;
  }
  sdkOAuthTokenRefreshCallback() {
    return this.#b;
  }
  replaceSdkOAuthTokenRefreshCallback(callback) {
    this.#b = callback;
  }
  hostAuthTokenRefreshCallback() {
    return this.#k;
  }
  replaceHostAuthTokenRefreshCallback(callback) {
    this.#k = callback;
  }
  resetForTests() {
    this.#e = null;
    this.#t = null;
    this.#n = null;
    this.#o = false;
    this.#r = null;
    this.#i = undefined;
    this.#d = null;
    this.#u.clear();
    this.#c.clear();
    this.#l = undefined;
    this.#p = null;
    this.#h.clear();
    this.#a = null;
    this.#g = 0;
    this.#S = null;
    this.#y = false;
    this.#v = () => false;
    this.#f = null;
    this.#m = undefined;
    this.#b = null;
    this.#k = null;
  }
}
//@ chunk-ndmse9kj.js:66442-66825 file-local
class McpProcessWiring {
  #e = undefined;
  #t = false;
  #n = false;
  #o;
  directConnectServerUrl() {
    return this.#e;
  }
  replaceDirectConnectServerUrl(url) {
    this.#e = url;
  }
  connectNonBlocking() {
    return this.#t;
  }
  replaceConnectNonBlocking(isNonBlocking) {
    this.#t = isNonBlocking;
  }
  strictConfig() {
    return this.#n;
  }
  replaceStrictConfig(isStrict) {
    this.#n = isStrict;
  }
  registerEnsureConnectedClient(ensureConnectedClient) {
    this.#o = ensureConnectedClient;
  }
  ensureConnectedClient() {
    return this.#o;
  }
  reset() {
    this.#e = undefined;
    this.#t = false;
    this.#n = false;
  }
}
//@ chunk-ndmse9kj.js:66825-71171 layout
class RequestLatches {
  #e = null;
  #t = new Map();
  #n = new Map();
  #o = new Set();
  #r = new Set();
  #s = new Set();
  #i = new Map();
  #d = new Map();
  #u = false;
  #c = false;
  #l = false;
  #p = false;
  #h = false;
  #a = false;
  #g = false;
  #S = false;
  #y = false;
  #v = new Set();
  #f = false;
  #m = new Set();
  #b = false;
  #k = false;
  #R = false;
  #x = false;
  #C = new Map();
  #P = undefined;
  #T = undefined;
  #w = false;
  #A = undefined;
  #L = false;
  #M = false;
  #O = undefined;
  #F = undefined;
  #I = new Map();
  #E = new Map();
  promptCache1hAllowlist() {
    return this.#e;
  }
  replacePromptCache1hAllowlist(allowlist) {
    this.#e = allowlist;
  }
  thinkingTypeOverrides() {
    return this.#t;
  }
  recordThinkingTypeOverride(model, thinkingType) {
    this.#t.set(model, thinkingType);
  }
  servedModelsByRequestedModel() {
    return this.#n;
  }
  recordServedModels(requestedModel, servedModels) {
    this.#n.set(requestedModel, servedModels);
  }
  effortUnsupportedModels() {
    return this.#o;
  }
  markEffortUnsupported(model) {
    this.#o.add(model);
  }
  structuredOutputsUnsupportedModels() {
    return this.#r;
  }
  markStructuredOutputsUnsupported(model) {
    this.#r.add(model);
  }
  clearStructuredOutputsUnsupported() {
    this.#r = new Set();
  }
  context1mRefusedModels() {
    return this.#s;
  }
  markContext1mRefused(model) {
    this.#s.add(model);
  }
  clearContext1mRefused() {
    this.#s = new Set();
  }
  refusedBetas(model) {
    return this.#i.get(model) ?? [];
  }
  markBetaRefused(model, beta) {
    let betas = this.#i.get(model);
    if (betas) betas.add(beta);
    else this.#i.set(model, new Set([beta]));
  }
  learnedEffortCaps() {
    return this.#d;
  }
  midConvCachePromotionRejected() {
    return this.#u;
  }
  markMidConvCachePromotionRejected() {
    this.#u = true;
  }
  perTurnEffortOkEmitted() {
    return this.#c;
  }
  markPerTurnEffortOkEmitted() {
    this.#c = true;
  }
  lateToolAdditionsOkEmitted() {
    return this.#l;
  }
  markLateToolAdditionsOkEmitted() {
    this.#l = true;
  }
  toolResultScreeningOkEmitted() {
    return this.#p;
  }
  markToolResultScreeningOkEmitted() {
    this.#p = true;
  }
  toolChangeHeaderRefused() {
    return this.#h;
  }
  markToolChangeHeaderRefused() {
    this.#h = true;
  }
  promptEndMarkRefused() {
    return this.#a;
  }
  markPromptEndMarkRefused() {
    this.#a = true;
  }
  inlineToolsRefused() {
    return this.#g;
  }
  markInlineToolsRefused() {
    this.#g = true;
  }
  inlineToolsOkEmitted() {
    return this.#S;
  }
  markInlineToolsOkEmitted() {
    this.#S = true;
  }
  thinkingResumptionRefused() {
    return this.#y;
  }
  markThinkingResumptionRefused() {
    this.#y = true;
  }
  refusedBetaHeaders() {
    return this.#v;
  }
  markBetaHeaderRefused(beta) {
    this.#v.add(beta);
  }
  thinkingHighlightsRefused() {
    return this.#f;
  }
  markThinkingHighlightsRefused() {
    this.#f = true;
  }
  toolChangeUnsupportedModels() {
    return this.#m;
  }
  markToolChangeUnsupportedModel(model) {
    this.#m.add(model);
  }
  internalModelFieldsRefused() {
    return this.#b;
  }
  markInternalModelFieldsRefused() {
    this.#b = true;
  }
  internalModelFieldsRefusalAnnounced() {
    return this.#k;
  }
  markInternalModelFieldsRefusalAnnounced() {
    this.#k = true;
  }
  thirdPartyServerClassifierRefused() {
    return this.#R;
  }
  markThirdPartyServerClassifierRefused() {
    this.#R = true;
  }
  releaseThirdPartyServerClassifierRefusal() {
    this.#R = false;
  }
  threadsHeldForServerClassifier() {
    return this.#x;
  }
  markThreadsHeldForServerClassifier() {
    this.#x = true;
  }
  autoModeUnavailableResponse(threadId) {
    return this.#C.get(threadId);
  }
  autoModeUnavailableResponsesInARow(runKey) {
    let count = 0;
    for (let response of this.#C.values()) if (response.runKey === runKey) count++;
    return count;
  }
  dropAutoModeUnavailableResponsesOfOtherTurns(runKey, turn) {
    for (let [threadId, response] of this.#C)
      if (response.runKey === runKey && response.turn !== undefined && response.turn !== turn)
        this.#C.delete(threadId);
  }
  noteAutoModeUnavailableResponse(threadId, response) {
    this.#C.set(threadId, response);
  }
  clearAutoModeUnavailableResponses(agentId) {
    for (let [key, skill] of this.#C) if (skill.runKey === agentId) this.#C.delete(key);
  }
  setAutoModeUnavailableStopNotice(notice) {
    this.#P = notice;
  }
  autoModeUnavailableStopNotice() {
    return this.#P;
  }
  setLocalCommandExitCode(exitCode) {
    this.#T = exitCode;
  }
  localCommandExitCode() {
    return this.#T;
  }
  observedGateway() {
    return this.#O;
  }
  serverClassifierFallbackChoice() {
    return this.#F;
  }
  setServerClassifierFallbackChoice(choice) {
    this.#F = choice;
  }
  clearServerClassifierFallbackChoice() {
    this.#F = undefined;
  }
  noteObservedGateway(gateway) {
    this.#O ??= gateway;
  }
  takeServerClassifierFallbackAnnouncement() {
    if (!this.#R || this.#w) return false;
    this.#w = true;
    return true;
  }
  noteNoServerCheck(reason) {
    if (this.#A !== undefined) return false;
    this.#A = reason;
    return true;
  }
  noteNoServerCheckStoppedTurn() {
    this.#M = true;
  }
  takeNoServerCheckStoppedTurn() {
    let stopped = this.#M;
    this.#M = false;
    return stopped;
  }
  takeNoServerCheckAnnouncement() {
    if (this.#L || this.#A === undefined) return;
    this.#L = true;
    return this.#A;
  }
  inferenceProfileBackingModels() {
    return this.#I;
  }
  recordInferenceProfileBackingModel(model, backingModel) {
    this.#I.set(model, backingModel);
  }
  foundryDeploymentCapabilities() {
    return this.#E;
  }
  reset() {
    this.#e = null;
    this.#t = new Map();
    this.#n = new Map();
    this.#o = new Set();
    this.#r = new Set();
    this.#s = new Set();
    this.#i = new Map();
    this.#d = new Map();
    this.#u = false;
    this.#c = false;
    this.#l = false;
    this.#p = false;
    this.#h = false;
    this.#a = false;
    this.#g = false;
    this.#S = false;
    this.#y = false;
    this.#v = new Set();
    this.#f = false;
    this.#m = new Set();
    this.#b = false;
    this.#k = false;
    this.#R = false;
    this.#x = false;
    this.#C.clear();
    this.#P = undefined;
    this.#T = undefined;
    this.#w = false;
    this.#A = undefined;
    this.#L = false;
    this.#M = false;
    this.#O = undefined;
    this.#F = undefined;
    this.#I = new Map();
    this.#E = new Map();
  }
}
//@ chunk-ndmse9kj.js:71171-71395 layout
class AccountCreditLatches {
  #e = false;
  #t = false;
  longContext1mCreditsBlocked() {
    return this.#e;
  }
  replaceLongContext1mCreditsBlocked(isBlocked) {
    this.#e = isBlocked;
  }
  usageCreditsRequired() {
    return this.#t;
  }
  replaceUsageCreditsRequired(areCreditsRequired) {
    this.#t = areCreditsRequired;
  }
  reset() {
    this.#e = false;
    this.#t = false;
  }
}
//@ chunk-ndmse9kj.js:71395-71849 layout
class ProactivityState {
  #e = false;
  #t = false;
  #n = noop;
  #o = createSignal();
  selectorGate() {
    return this.#e;
  }
  selectorGateEverOn() {
    return this.#t;
  }
  replaceSelectorGate(isOn) {
    this.#e = isOn;
    this.#t ||= isOn;
  }
  inheritSelectorGateEverOn() {
    this.#t = true;
  }
  resampleSelectorGate(isOn) {
    let previous = this.#e;
    this.#e = isOn;
    this.#t ||= isOn;
    if (previous !== isOn) this.#o.emit(isOn);
  }
  subscribeSelectorGateChanged(listener) {
    return this.#o.subscribe(listener);
  }
  replaceHostGateSubscription(subscription) {
    let previousSubscription = this.#n;
    this.#n = subscription;
    previousSubscription();
  }
  dropHostGateSubscription() {
    this.replaceHostGateSubscription(noop);
  }
}
//@ chunk-ndmse9kj.js:71849-71864 layout
function noop() {}
//@ chunk-ndmse9kj.js:71864-72043 layout
class BackgroundHousekeeping {
  started = false;
  stagingReaped = false;
  claim() {
    if (this.started) return false;
    this.started = true;
    return true;
  }
  claimStagingReap() {
    if (this.stagingReaped) return false;
    this.stagingReaped = true;
    return true;
  }
}
//@ chunk-ndmse9kj.js:72043-72768 layout
/**
 * 进程级 host 状态容器：clock、backgroundHousekeeping、launchOptions、settingsSource、extensionsConfig、modelStringsCache、diagnostics、telemetryHandles、credentialSlots、mcpProcessWiring、requestLatches、accountCreditLatches、proactivity。
 */
class HostState {
  clock;
  backgroundHousekeeping;
  launchOptions;
  settingsSource;
  extensionsConfig;
  modelStringsCache;
  diagnostics;
  telemetryHandles;
  credentialSlots;
  mcpProcessWiring;
  requestLatches;
  accountCreditLatches;
  proactivity;
  constructor(services) {
    this.clock = services.clock;
    this.backgroundHousekeeping = services.backgroundHousekeeping;
    this.launchOptions = services.launchOptions;
    this.settingsSource = services.settingsSource;
    this.extensionsConfig = services.extensionsConfig;
    this.modelStringsCache = services.modelStringsCache;
    this.diagnostics = services.diagnostics;
    this.telemetryHandles = services.telemetryHandles;
    this.credentialSlots = services.credentialSlots;
    this.mcpProcessWiring = services.mcpProcessWiring;
    this.requestLatches = services.requestLatches;
    this.accountCreditLatches = services.accountCreditLatches;
    this.proactivity = services.proactivity;
  }
}
//@ chunk-ndmse9kj.js:72768-73094 layout
function createHostState() {
  return new HostState({
    clock: new SystemClock(),
    backgroundHousekeeping: new BackgroundHousekeeping(),
    launchOptions: new RuntimeModeSlice(),
    settingsSource: new SettingsSourcesSlice(),
    extensionsConfig: new PluginsAndChannelsSlice(),
    modelStringsCache: new ModelStringsSlice(),
    diagnostics: new DiagnosticsSlice(),
    telemetryHandles: new TelemetryHandles(),
    credentialSlots: new CredentialSlots(),
    mcpProcessWiring: new McpProcessWiring(),
    requestLatches: new RequestLatches(),
    accountCreditLatches: new AccountCreditLatches(),
    proactivity: new ProactivityState(),
  });
}
//@ chunk-ndmse9kj.js:73094-73199 layout
/**
 * 创建 root 会话：host=新 HostState，id=CLAUDE_CODE_SESSION_ID 等给定值或新 UUID，originalCwd/projectRoot/cwd 都是启动目录。
 */
function createRootSession(cwd = initialCwdKey()) {
  return forkRootSessionWithProject({
    host: createHostState(),
    id: remoteSessionUrlId() ?? randomUUID(),
    project: {
      originalCwd: cwd,
      projectRoot: cwd,
      cwd,
    },
  });
}
//@ chunk-ndmse9kj.js:73199-73213 layout
/**
 * 进程默认 root 会话（模块加载时创建）。
 */
var defaultRootSession; // deferred: uses createRootSession of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-ndmse9kj.js:73199", () => {
  defaultRootSession = createRootSession(INITIAL_CWD_KEY);
});
//@ chunk-ndmse9kj.js:73213-73237 facade-majority
/**
 * getRootSession：返回当前会话（currentSession 的导出别名）。
 */
function getRootSession() {
  return currentSession();
}
//@ chunk-ndmse9kj.js:73237-73273 layout
/**
 * 当前会话：异步上下文（子代理/teammate 等）里有 session 用它，否则用默认 root 会话。几乎所有状态访问器都经它取值。
 */
function currentSession() {
  return agentContextGetter()?.session ?? defaultRootSession;
}
//@ chunk-ndmse9kj.js:73273-73308 facade-majority
/**
 * 在进程默认 root 会话的 host 上取 HostScoped 槽位的值（进程级单例状态）。
 */
function onProcessRootHost(slot) {
  return slot.of(defaultRootSession.host);
}
//@ chunk-ndmse9kj.js:73308-73358 layout
/**
 * 异步上下文里的会话覆盖对象（无 session 字段的旧式覆盖：sessionId、originalCwd、cachedClaudeMdContent…）。
 */
function getAgentContext() {
  let context = agentContextGetter();
  return context?.session ? undefined : context;
}
//@ chunk-ndmse9kj.js:73358-73377 layout
var agentContextGetter = () => {
  return;
};
//@ chunk-ndmse9kj.js:73377-73397 facade-majority
/**
 * 注入“会话覆盖对象”读取器（AsyncLocalStorage 取值函数），子代理/teammate 借此让 getSessionId 等返回自己的值。
 */
function setSessionOverridesGetter(getter) {
  agentContextGetter = getter;
}
//@ chunk-ndmse9kj.js:73397-73436 layout
// deferred: uses setProjectDirectoryErrorHandler (./sessionSlices.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-ndmse9kj.js:73397", () => {
  setProjectDirectoryErrorHandler((error) =>
    projectDirectoryErrorReporterSlot.of(currentSession().host).reporter?.(error),
  );
});
//@ chunk-ndmse9kj.js:73436-73537 layout
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-ndmse9kj.js:73436", () => {
  setDisklessHooks({
    isDiskless: () => isDiskless(),
    isDisklessProcess: () => isDisklessProcess(),
    reportBuilt: (report) => processScopedEmptyValues.of(currentSession().host).reporter?.(report),
  });
});
//@ chunk-ndmse9kj.js:73537-73580 facade-majority
/**
 * getSessionId：覆盖对象的 sessionId，否则当前会话 id。
 */
function getSessionId() {
  return getAgentContext()?.sessionId ?? currentSession().id;
}
//@ chunk-ndmse9kj.js:73580-73679 facade-majority
/**
 * 会话状态函数 mainAgentId：优先取异步上下文覆盖对象的 sessionId；
 */
function mainAgentId() {
  let sessionId = getAgentContext()?.sessionId;
  if (sessionId) return identityAgentId2(sessionId);
  let session = currentSession();
  return session.identity.mainAgentId(session.id);
}
//@ chunk-ndmse9kj.js:73679-73801 layout
function hasSessionActivity() {
  let session = currentSession();
  return (
    session.requestJournal.promptIndex() > 0 ||
    session.sessionScratch.chromeAvailabilityStagesLogged().size > 0
  );
}
//@ chunk-ndmse9kj.js:73801-74496 facade-majority
/**
 * regenerateSessionId：/clear 等场景换新会话 id；清除每会话缓存（plan slug、最后请求、拒答回退等），可把旧 id 设为 parent，发出 clear 会话切换事件。
 */
function regenerateSessionId(options = {}) {
  let session = currentSession();
  let id = session.id;
  session.sessionScratch.forgetPlanSlug(id);
  session.identity.replaceProjectDir(null);
  let hadActivity = hasSessionActivity();
  session.requestJournal.replacePromptIndex(0);
  session.requestJournal.replaceLastPersonPrompt(null);
  session.requestJournal.replaceLastCancelledAPIMessageId(null);
  session.requestJournal.clearLastMainThreadRequest();
  session.requestJournal.replaceLastMainRequestId(undefined, undefined);
  session.modelSelection.forgetRefusalFallbackOccurred();
  session.sessionFlags.forgetPendingContextCompacted();
  session.sessionScratch.replacePendingBranchLinks();
  session.sessionScratch.replaceChromeAvailabilityStagesLogged(hadActivity);
  let modelRestore = restoreModelOnSessionTransition();
  let nextSessionId = options.next ?? randomUUID();
  session.costLedger.scopeTo(nextSessionId);
  session.update({
    id: nextSessionId,
    ...(options.setCurrentAsParent && {
      parentId: id,
    }),
  });
  emitSessionSwitch(session, "clear", modelRestore);
  return session.id;
}
//@ chunk-ndmse9kj.js:74496-74572 layout
function emitSessionSwitch(session, reason, modelRestore) {
  let listeners = sessionSwitchListeners.of(session);
  if (modelRestore) listeners.emit(session.id, reason, modelRestore);
  else listeners.emit(session.id, reason);
}
//@ chunk-ndmse9kj.js:74572-74620 layout
function emitOriginalCwdChanged(session) {
  originalCwdListeners.of(session).emit(getSessionProject(session).originalCwd);
}
//@ chunk-ndmse9kj.js:74620-74685 facade-majority
/**
 * 会话状态函数 getParentSessionId：涉及当前会话的 parentId。
 */
function getParentSessionId() {
  let agentContext = getAgentContext();
  return agentContext ? agentContext.parentSessionId : currentSession().parentId;
}
//@ chunk-ndmse9kj.js:74685-75381 facade-majority
/**
 * switchSession：切到给定会话 id（resume/fork），重置每会话缓存（fork 时保留最后主请求 id），可同时更新 project 目录。
 */
function switchSession(sessionId, reason, projectDir = null, projectPatch) {
  let session = currentSession();
  let nextProject = projectPatch
    ? mergeProjectDirs(session.project, asProjectPatch(projectPatch))
    : projectPatch;
  let modelRestore;
  let parentId = session.parentId;
  if (session.id !== sessionId) {
    session.sessionScratch.forgetPlanSlug(session.id);
    session.requestJournal.replaceLastCancelledAPIMessageId(null);
    session.requestJournal.replaceLastPersonPrompt(null);
    session.requestJournal.clearLastMainThreadRequest(sessionId);
    if (reason !== "fork") session.requestJournal.replaceLastMainRequestId(undefined, undefined);
    session.modelSelection.forgetRefusalFallbackOccurred();
    session.sessionFlags.forgetPendingContextCompacted();
    session.sessionScratch.replacePendingBranchLinks();
    session.sessionScratch.replaceChromeAvailabilityStagesLogged(hasSessionActivity());
    modelRestore = restoreModelOnSessionTransition();
    parentId = undefined;
  }
  session.identity.replaceProjectDir(projectDir);
  session.update({
    id: sessionId,
    parentId,
    ...(nextProject !== undefined && {
      project: nextProject,
    }),
  });
  emitSessionSwitch(session, reason, modelRestore);
  if (projectPatch?.originalCwd !== undefined) emitOriginalCwdChanged(session);
}
//@ chunk-ndmse9kj.js:75381-75858 layout
function restoreModelOnSessionTransition() {
  let session = currentSession();
  let latch = session.modelSelection.refusalFallbackModelLatch();
  session.modelSelection.unlatchRefusalFallbackModel("session_transition");
  if (!latch || session.modelSelection.mainLoopModelOverride() !== latch.fallbackModel) return;
  session.modelSelection.overrideMainLoopModel(latch.previousOverride);
  return {
    appStateModel: latch.previousAppStateModel,
    forSessionValue: latch.previousModelForSession,
    overrideValue: latch.previousOverride,
    restoredToExplicitOverride: latch.previousOverride !== undefined,
    fallbackModel: latch.fallbackModel,
  };
}
//@ chunk-ndmse9kj.js:75858-75882 layout
var sessionSwitchListeners; // deferred: uses SessionRootSlot (./sessionSlices.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-ndmse9kj.js:75858", () => {
  sessionSwitchListeners = new SessionRootSlot(() => createSignal());
});
//@ chunk-ndmse9kj.js:75882-75928 facade-majority
/**
 * 订阅会话切换（regenerateSessionId/switchSession 时触发，参数含原因与恢复的模型）。
 */
function onSessionSwitch(listener) {
  return sessionSwitchListeners.of(currentSession()).subscribe(listener);
}
//@ chunk-ndmse9kj.js:75928-75994 facade-majority
/**
 * 状态访问器：读取当前会话的 会话暂存（sessionScratch） 上的 humanAttachmentDigests()。
 */
function humanAttachmentDigestRegistry() {
  return currentSession().sessionScratch.humanAttachmentDigests();
}
//@ chunk-ndmse9kj.js:75994-76060 facade-majority
/**
 * 状态访问器：读取当前会话的 会话暂存（sessionScratch） 上的 inboundAttachmentFiles()。
 */
function inboundAttachmentFileRegistry() {
  return currentSession().sessionScratch.inboundAttachmentFiles();
}
//@ chunk-ndmse9kj.js:76060-76121 facade-majority
/**
 * 状态访问器：读取当前会话的 会话暂存（sessionScratch） 上的 filesPlacedByName()。
 */
function filesPlacedByNameRegistry() {
  return currentSession().sessionScratch.filesPlacedByName();
}
//@ chunk-ndmse9kj.js:76121-76186 facade-majority
/**
 * 状态访问器：读取当前会话的 会话暂存（sessionScratch） 上的 filesPlacedByNameRead()。
 */
function filesPlacedByNameRead() {
  return currentSession().sessionScratch.filesPlacedByNameRead();
}
//@ chunk-ndmse9kj.js:76186-76249 facade-majority
/**
 * 状态访问器：调用当前会话的 会话暂存（sessionScratch） 上的 setFilesPlacedByNameRead()。
 */
function setFilesPlacedByNameRead(value) {
  currentSession().sessionScratch.setFilesPlacedByNameRead(value);
}
//@ chunk-ndmse9kj.js:76249-76319 facade-majority
/**
 * 状态访问器：读取当前会话的 会话暂存（sessionScratch） 上的 inboundAttachmentDownloads()。
 */
function inboundAttachmentDownloadRegistry() {
  return currentSession().sessionScratch.inboundAttachmentDownloads();
}
//@ chunk-ndmse9kj.js:76319-76383 facade-majority
/**
 * 状态访问器：读取当前会话的 会话暂存（sessionScratch） 上的 arrivingInboundFiles()。
 */
function arrivingInboundFileRegistry() {
  return currentSession().sessionScratch.arrivingInboundFiles();
}
//@ chunk-ndmse9kj.js:76383-76463 facade-majority = getSessionProjectDir (0.624)
/**
 * 会话状态函数 getSessionProjectDir：涉及当前会话的 identity.projectDir。
 */
function getSessionProjectDir() {
  let agentContext = getAgentContext();
  return agentContext ? agentContext.sessionProjectDir : currentSession().identity.projectDir();
}
//@ chunk-ndmse9kj.js:76463-76522 facade-majority
/**
 * 会话状态函数 getOriginalCwd：优先取异步上下文覆盖对象的 originalCwd；
 */
function getOriginalCwd() {
  return getAgentContext()?.originalCwd ?? getSessionProject(currentSession()).originalCwd;
}
//@ chunk-ndmse9kj.js:76522-76609 facade-majority
/**
 * 会话状态函数 getOriginalCwdOrNull：优先取异步上下文覆盖对象的 originalCwd；涉及当前会话的 project。
 */
function getOriginalCwdOrNull() {
  if (getAgentContext()?.originalCwd === undefined && currentSession().project === null) return null;
  return getOriginalCwd();
}
//@ chunk-ndmse9kj.js:76609-76636 facade-majority
/**
 * 权限界面锚点目录（委托 oLt）。
 */
function getPermissionScreenAnchor() {
  return launchCwd();
}
//@ chunk-ndmse9kj.js:76636-76669 facade-majority
/**
 * 当前会话是否在 home 目录启动（originalCwd 等于主目录）。
 */
function isHomeDirectorySession() {
  return getOriginalCwd() === homedir();
}
//@ chunk-ndmse9kj.js:76669-76728 facade-majority = getProjectRoot (1)
/**
 * 会话状态函数 getProjectRoot：优先取异步上下文覆盖对象的 projectRoot；
 */
function getProjectRoot() {
  return getAgentContext()?.projectRoot ?? getSessionProject(currentSession()).projectRoot;
}
//@ chunk-ndmse9kj.js:76728-76815 facade-majority
/**
 * 会话状态函数 getProjectRootOrNull：优先取异步上下文覆盖对象的 projectRoot；涉及当前会话的 project。
 */
function getProjectRootOrNull() {
  if (getAgentContext()?.projectRoot === undefined && currentSession().project === null) return null;
  return getProjectRoot();
}
//@ chunk-ndmse9kj.js:76815-76839 layout
function asProjectPatch(patch) {
  return patch;
}
//@ chunk-ndmse9kj.js:76839-76923 facade-majority
/**
 * 更新会话的 project（originalCwd/projectRoot/cwd 三者合并），originalCwd 变化时发事件。
 */
function setSessionProject(patch) {
  let session = currentSession();
  session.update({
    project: asProjectPatch(patch),
  });
  if (patch.originalCwd !== undefined) emitOriginalCwdChanged(session);
}
//@ chunk-ndmse9kj.js:76923-76959 facade-majority = setOriginalCwd (0.445)
/**
 * setOriginalCwd：只改 originalCwd。
 */
function setOriginalCwd(cwd) {
  setSessionProject({
    originalCwd: cwd,
  });
}
//@ chunk-ndmse9kj.js:76959-76983 layout
var originalCwdListeners; // deferred: uses SessionRootSlot (./sessionSlices.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-ndmse9kj.js:76959", () => {
  originalCwdListeners = new SessionRootSlot(() => createSignal());
});
//@ chunk-ndmse9kj.js:76983-77030 facade-majority
/**
 * 订阅 originalCwd 变化。
 */
function onOriginalCwdChange(listener) {
  return originalCwdListeners.of(currentSession()).subscribe(listener);
}
//@ chunk-ndmse9kj.js:77030-77067 facade-majority = getProjectRoot (1)
/**
 * setProjectRoot：只改 projectRoot。
 */
function setProjectRoot(projectRoot) {
  setSessionProject({
    projectRoot,
  });
}
//@ chunk-ndmse9kj.js:77067-77100 facade-majority
/**
 * getCwdState：当前会话 project.cwd（无 project 时抛 NoProjectDirectoryError）。
 */
function getCwdState() {
  return getSessionProject(currentSession()).cwd;
}
//@ chunk-ndmse9kj.js:77100-77129 facade-majority
/**
 * setCwdState：只改 cwd。
 */
function setCwdState(cwd) {
  setSessionProject({
    cwd,
  });
}
//@ chunk-ndmse9kj.js:77129-77174 facade-majority
/**
 * 状态访问器：调用当前会话的 费用账本（costLedger） 上的 restartClock()。
 */
function resetStartTime() {
  currentSession().costLedger.restartClock();
}
//@ chunk-ndmse9kj.js:77174-77230 facade-majority
/**
 * 状态访问器：读取当前会话的 费用账本（costLedger） 上的 sessionStartTime()。
 */
function getSessionStartTime() {
  return currentSession().costLedger.sessionStartTime();
}
//@ chunk-ndmse9kj.js:77230-77303 facade-majority = getDirectConnectServerUrl (0.7)
/**
 * 状态访问器：读取当前会话的 host（host） → MCP 进程接线（mcpProcessWiring） 上的 directConnectServerUrl()。
 */
function getDirectConnectServerUrl() {
  return currentSession().host.mcpProcessWiring.directConnectServerUrl();
}
//@ chunk-ndmse9kj.js:77303-77372 facade-majority
/**
 * 状态访问器：读取当前会话的 host（host） → MCP 进程接线（mcpProcessWiring） 上的 connectNonBlocking()。
 */
function getMcpConnectNonBlocking() {
  return currentSession().host.mcpProcessWiring.connectNonBlocking();
}
//@ chunk-ndmse9kj.js:77372-77443 facade-majority
/**
 * 状态访问器：写入当前会话的 host（host） → MCP 进程接线（mcpProcessWiring） 上的 replaceConnectNonBlocking()。
 */
function setMcpConnectNonBlocking(value) {
  currentSession().host.mcpProcessWiring.replaceConnectNonBlocking(value);
}
//@ chunk-ndmse9kj.js:77443-77508 facade-majority
/**
 * 状态访问器：读取当前会话的 会话标志（sessionFlags） 上的 teardownUnwindRequested()。
 */
function getTeardownUnwindRequested() {
  return currentSession().sessionFlags.teardownUnwindRequested();
}
//@ chunk-ndmse9kj.js:77508-77575 facade-majority
/**
 * 状态访问器：写入当前会话的 会话标志（sessionFlags） 上的 replaceTeardownUnwindRequested()。
 */
function setTeardownUnwindRequested(value) {
  currentSession().sessionFlags.replaceTeardownUnwindRequested(value);
}
//@ chunk-ndmse9kj.js:77575-77648 facade-majority
/**
 * 状态访问器：读取当前会话的 会话标志（sessionFlags） 上的 backgroundAutoModeSetupInFlight()。
 */
function getBackgroundAutoModeSetupInFlight() {
  return currentSession().sessionFlags.backgroundAutoModeSetupInFlight();
}
//@ chunk-ndmse9kj.js:77648-77723 facade-majority
/**
 * 状态访问器：写入当前会话的 会话标志（sessionFlags） 上的 replaceBackgroundAutoModeSetupInFlight()。
 */
function setBackgroundAutoModeSetupInFlight(value) {
  currentSession().sessionFlags.replaceBackgroundAutoModeSetupInFlight(value);
}
//@ chunk-ndmse9kj.js:77723-77790 facade-majority
/**
 * 状态访问器：读取当前会话的 会话标志（sessionFlags） 上的 deferredToolStubGateLatch()。
 */
function getDeferredToolStubGateLatch() {
  return currentSession().sessionFlags.deferredToolStubGateLatch();
}
//@ chunk-ndmse9kj.js:77790-77859 facade-majority
/**
 * 状态访问器：写入当前会话的 会话标志（sessionFlags） 上的 replaceDeferredToolStubGateLatch()。
 */
function setDeferredToolStubGateLatch(deferredToolStubGateLatch) {
  currentSession().sessionFlags.replaceDeferredToolStubGateLatch(deferredToolStubGateLatch);
}
//@ chunk-ndmse9kj.js:77859-77928 facade-majority
/**
 * 状态访问器：读取当前会话的 会话标志（sessionFlags） 上的 verifySkillRolloutGateLatch()。
 */
function getVerifySkillRolloutGateLatch() {
  return currentSession().sessionFlags.verifySkillRolloutGateLatch();
}
//@ chunk-ndmse9kj.js:77928-77999 facade-majority
/**
 * 状态访问器：写入当前会话的 会话标志（sessionFlags） 上的 replaceVerifySkillRolloutGateLatch()。
 */
function setVerifySkillRolloutGateLatch(value) {
  currentSession().sessionFlags.replaceVerifySkillRolloutGateLatch(value);
}
//@ chunk-ndmse9kj.js:77999-78068 facade-majority
/**
 * 状态访问器：读取当前会话的 会话标志（sessionFlags） 上的 commitSkillRolloutGateLatch()。
 */
function getCommitSkillRolloutGateLatch() {
  return currentSession().sessionFlags.commitSkillRolloutGateLatch();
}
//@ chunk-ndmse9kj.js:78068-78139 facade-majority
/**
 * 状态访问器：写入当前会话的 会话标志（sessionFlags） 上的 replaceCommitSkillRolloutGateLatch()。
 */
function setCommitSkillRolloutGateLatch(value) {
  currentSession().sessionFlags.replaceCommitSkillRolloutGateLatch(value);
}
//@ chunk-ndmse9kj.js:78139-78202 facade-majority
/**
 * 状态访问器：读取当前会话的 会话标志（sessionFlags） 上的 memoryToolsShapeLatch()。
 */
function getMemoryToolsShapeLatch() {
  return currentSession().sessionFlags.memoryToolsShapeLatch();
}
//@ chunk-ndmse9kj.js:78202-78267 facade-majority
/**
 * 状态访问器：写入当前会话的 会话标志（sessionFlags） 上的 replaceMemoryToolsShapeLatch()。
 */
function setMemoryToolsShapeLatch(value) {
  currentSession().sessionFlags.replaceMemoryToolsShapeLatch(value);
}
//@ chunk-ndmse9kj.js:78267-78467 facade-majority
/**
 * 压缩前记下最后一次主请求的响应（若 id 匹配），供压缩后的 context_compacted 附件使用。
 */
function armPendingContextCompacted(compactionKind, requestId) {
  let session = currentSession();
  session.sessionFlags.armPendingContextCompacted(
    compactionKind,
    session.requestJournal.lastMainRequestId() === requestId
      ? (session.requestJournal.lastMainResponse() ?? session.sessionFlags.responseBeforeCompaction())
      : undefined,
  );
}
//@ chunk-ndmse9kj.js:78467-78539 facade-majority
/**
 * 状态访问器：读取当前会话的 会话标志（sessionFlags） 上的 consumePendingContextCompacted()。
 */
function consumePendingContextCompacted() {
  return currentSession().sessionFlags.consumePendingContextCompacted();
}
//@ chunk-ndmse9kj.js:78539-78605 facade-majority
/**
 * 状态访问器：读取当前会话的 会话标志（sessionFlags） 上的 responseBeforeCompaction()。
 */
function getResponseBeforeCompaction() {
  return currentSession().sessionFlags.responseBeforeCompaction();
}
//@ chunk-ndmse9kj.js:78605-78670 facade-majority
/**
 * 状态访问器：调用当前会话的 会话标志（sessionFlags） 上的 forgetResponseBeforeCompaction()。
 */
function forgetResponseBeforeCompaction() {
  currentSession().sessionFlags.forgetResponseBeforeCompaction();
}
//@ chunk-ndmse9kj.js:78670-78734 facade-majority
/**
 * 状态访问器：调用当前会话的 会话标志（sessionFlags） 上的 forgetPendingContextCompacted()。
 */
function clearPendingContextCompacted() {
  currentSession().sessionFlags.forgetPendingContextCompacted();
}
//@ chunk-ndmse9kj.js:78734-78796 facade-majority
/**
 * 状态访问器：读取当前会话的 host（host） → MCP 进程接线（mcpProcessWiring） 上的 strictConfig()。
 */
function getStrictMcpConfig() {
  return currentSession().host.mcpProcessWiring.strictConfig();
}
//@ chunk-ndmse9kj.js:78796-78861 facade-majority
/**
 * 状态访问器：写入当前会话的 host（host） → MCP 进程接线（mcpProcessWiring） 上的 replaceStrictConfig()。
 */
function setStrictMcpConfig(strictMcpConfig) {
  currentSession().host.mcpProcessWiring.replaceStrictConfig(strictMcpConfig);
}
//@ chunk-ndmse9kj.js:78861-78932 facade-majority
/**
 * 状态访问器：读取当前会话的 host（host） → 启动选项（launchOptions） 上的 cliSessionConfigCarried()。
 */
function getCliSessionConfigCarried() {
  return currentSession().host.launchOptions.cliSessionConfigCarried();
}
//@ chunk-ndmse9kj.js:78932-79005 facade-majority
/**
 * 状态访问器：写入当前会话的 host（host） → 启动选项（launchOptions） 上的 replaceCliSessionConfigCarried()。
 */
function setCliSessionConfigCarried(value) {
  currentSession().host.launchOptions.replaceCliSessionConfigCarried(value);
}
//@ chunk-ndmse9kj.js:79005-79078 facade-majority
/**
 * 状态访问器：读取当前会话的 host（host） → 启动选项（launchOptions） 上的 forkRestrictedLaunchConfig()。
 */
function getForkRestrictedLaunchConfig() {
  return currentSession().host.launchOptions.forkRestrictedLaunchConfig();
}
//@ chunk-ndmse9kj.js:79078-79154 facade-majority
/**
 * 状态访问器：写入当前会话的 host（host） → 启动选项（launchOptions） 上的 replaceForkRestrictedLaunchConfig()。
 */
function setForkRestrictedLaunchConfig(value) {
  currentSession().host.launchOptions.replaceForkRestrictedLaunchConfig(value);
}
//@ chunk-ndmse9kj.js:79154-79224 facade-majority
/**
 * 状态访问器：读取当前会话的 host（host） → 启动选项（launchOptions） 上的 forkReplayLaunchConfig()。
 */
function getForkReplayLaunchConfig() {
  return currentSession().host.launchOptions.forkReplayLaunchConfig();
}
//@ chunk-ndmse9kj.js:79224-79296 facade-majority
/**
 * 状态访问器：写入当前会话的 host（host） → 启动选项（launchOptions） 上的 replaceForkReplayLaunchConfig()。
 */
function setForkReplayLaunchConfig(value) {
  currentSession().host.launchOptions.replaceForkReplayLaunchConfig(value);
}
//@ chunk-ndmse9kj.js:79296-79357 facade-majority
/**
 * 状态访问器：读取当前会话的 MCP 会话接线（mcpSessionWiring） 上的 approvedServers()。
 */
function getSessionApprovedMcpServers() {
  return currentSession().mcpSessionWiring.approvedServers();
}
//@ chunk-ndmse9kj.js:79357-79416 facade-majority
/**
 * 状态访问器：调用当前会话的 MCP 会话接线（mcpSessionWiring） 上的 approveServers()。
 */
function addSessionApprovedMcpServers(workspacePersistedTrustKey, servers) {
  currentSession().mcpSessionWiring.approveServers(workspacePersistedTrustKey, servers);
}
//@ chunk-ndmse9kj.js:79416-79472 facade-majority
/**
 * 状态访问器：调用当前会话的 费用账本（costLedger） 上的 recordApiDuration()。
 */
function addToTotalDurationState(durationMsIncludingRetries, requestId) {
  currentSession().costLedger.recordApiDuration(durationMsIncludingRetries, requestId);
}
//@ chunk-ndmse9kj.js:79472-79525 facade-majority
/**
 * 状态访问器：调用当前会话的 费用账本（costLedger） 上的 recordCost()。
 */
function addToTotalCostState(cost, modelUsage, model) {
  currentSession().costLedger.recordCost(cost, modelUsage, model);
}
//@ chunk-ndmse9kj.js:79525-79577 facade-majority
/**
 * 状态访问器：调用当前会话的 费用账本（costLedger） 上的 recordSpentTokens()。
 */
function addToSpentTokens(tokens) {
  currentSession().costLedger.recordSpentTokens(tokens);
}
//@ chunk-ndmse9kj.js:79577-79628 facade-majority = getTotalCostUSD (0.713)
/**
 * 状态访问器：读取当前会话的 费用账本（costLedger） 上的 totalCostUSD()。
 */
function getTotalCostUSD() {
  return currentSession().costLedger.totalCostUSD();
}
//@ chunk-ndmse9kj.js:79628-79682 facade-majority
/**
 * 状态访问器：调用当前会话的 费用账本（costLedger） 上的 recordSideQueryCost()。
 */
function addSideQueryCostUSD(costUsd) {
  currentSession().costLedger.recordSideQueryCost(costUsd);
}
//@ chunk-ndmse9kj.js:79682-79738 facade-majority
/**
 * 状态访问器：读取当前会话的 费用账本（costLedger） 上的 sideQueryCostUSD()。
 */
function getSideQueryCostUSD() {
  return currentSession().costLedger.sideQueryCostUSD();
}
//@ chunk-ndmse9kj.js:79738-79793 facade-majority = getTotalAPIDuration (0.72)
/**
 * 状态访问器：读取当前会话的 费用账本（costLedger） 上的 totalAPIDuration()。
 */
function getTotalAPIDuration() {
  return currentSession().costLedger.totalAPIDuration();
}
//@ chunk-ndmse9kj.js:79793-79846 facade-majority
/**
 * 状态访问器：读取当前会话的 费用账本（costLedger） 上的 totalDuration()。
 */
function getTotalDuration() {
  return currentSession().costLedger.totalDuration();
}
//@ chunk-ndmse9kj.js:79846-79916 facade-majority = getTotalAPIDurationWithoutRetries (0.72)
/**
 * 状态访问器：读取当前会话的 费用账本（costLedger） 上的 totalAPIDurationWithoutRetries()。
 */
function getTotalAPIDurationWithoutRetries() {
  return currentSession().costLedger.totalAPIDurationWithoutRetries();
}
//@ chunk-ndmse9kj.js:79916-79973 facade-majority = getTotalToolDuration (0.72)
/**
 * 状态访问器：读取当前会话的 费用账本（costLedger） 上的 totalToolDuration()。
 */
function getTotalToolDuration() {
  return currentSession().costLedger.totalToolDuration();
}
//@ chunk-ndmse9kj.js:79973-80026 facade-majority
/**
 * 状态访问器：调用当前会话的 费用账本（costLedger） 上的 recordToolDuration()。
 */
function addToToolDuration(durationMs) {
  currentSession().costLedger.recordToolDuration(durationMs);
}
//@ chunk-ndmse9kj.js:80026-80087 facade-majority = getStatsStore (0.729)
/**
 * 状态访问器：读取当前会话的 host（host） → 遥测句柄（telemetryHandles） 上的 statsStore()。
 */
function getStatsStore() {
  return currentSession().host.telemetryHandles.statsStore();
}
//@ chunk-ndmse9kj.js:80087-80150 facade-majority
/**
 * 状态访问器：写入当前会话的 host（host） → 遥测句柄（telemetryHandles） 上的 replaceStatsStore()。
 */
function setStatsStore(stats) {
  currentSession().host.telemetryHandles.replaceStatsStore(stats);
}
//@ chunk-ndmse9kj.js:80150-80203 facade-majority
/**
 * 状态访问器：调用当前会话的 用户在场（userPresence） 上的 recordInteraction()。
 */
function updateLastInteractionTime(timestamp) {
  currentSession().userPresence.recordInteraction(timestamp);
}
//@ chunk-ndmse9kj.js:80203-80250 facade-majority
/**
 * 状态访问器：调用当前会话的 用户在场（userPresence） 上的 flushIfDirty()。
 */
function flushInteractionTime() {
  currentSession().userPresence.flushIfDirty();
}
//@ chunk-ndmse9kj.js:80250-80319 facade-majority
/**
 * 状态访问器：调用当前会话的 用户在场（userPresence） → interactionFired 上的 subscribe()。
 */
function onInteraction(listener) {
  return currentSession().userPresence.interactionFired.subscribe(listener);
}
//@ chunk-ndmse9kj.js:80319-80367 facade-majority
/**
 * 状态访问器：调用当前会话的 用户在场（userPresence） 上的 resetBaseline()。
 */
function resetInteractionBaseline() {
  currentSession().userPresence.resetBaseline();
}
//@ chunk-ndmse9kj.js:80367-80424 facade-majority
/**
 * 状态访问器：调用当前会话的 费用账本（costLedger） 上的 recordLinesChanged()。
 */
function addToTotalLinesChanged(numAdditions, numRemovals) {
  currentSession().costLedger.recordLinesChanged(numAdditions, numRemovals);
}
//@ chunk-ndmse9kj.js:80424-80479 facade-majority = getTotalLinesAdded (0.72)
/**
 * 状态访问器：读取当前会话的 费用账本（costLedger） 上的 totalLinesAdded()。
 */
function getTotalLinesAdded() {
  return currentSession().costLedger.totalLinesAdded();
}
//@ chunk-ndmse9kj.js:80479-80536 facade-majority = getTotalLinesRemoved (0.72)
/**
 * 状态访问器：读取当前会话的 费用账本（costLedger） 上的 totalLinesRemoved()。
 */
function getTotalLinesRemoved() {
  return currentSession().costLedger.totalLinesRemoved();
}
//@ chunk-ndmse9kj.js:80536-80592 facade-majority
/**
 * 状态访问器：读取当前会话的 费用账本（costLedger） 上的 totalInputTokens()。
 */
function getTotalInputTokens() {
  return currentSession().costLedger.totalInputTokens();
}
//@ chunk-ndmse9kj.js:80592-80648 facade-majority
/**
 * 状态访问器：读取当前会话的 费用账本（costLedger） 上的 totalOutputTokens()。
 */
function getTotalOutputTokens() {
  return currentSession().costLedger.totalOutputTokens();
}
//@ chunk-ndmse9kj.js:80648-80713 facade-majority
/**
 * 状态访问器：读取当前会话的 费用账本（costLedger） 上的 totalCacheReadInputTokens()。
 */
function getTotalCacheReadInputTokens() {
  return currentSession().costLedger.totalCacheReadInputTokens();
}
//@ chunk-ndmse9kj.js:80713-80782 facade-majority
/**
 * 状态访问器：读取当前会话的 费用账本（costLedger） 上的 totalCacheCreationInputTokens()。
 */
function getTotalCacheCreationInputTokens() {
  return currentSession().costLedger.totalCacheCreationInputTokens();
}
//@ chunk-ndmse9kj.js:80782-80844 facade-majority
/**
 * 状态访问器：读取当前会话的 费用账本（costLedger） 上的 totalWebSearchRequests()。
 */
function getTotalWebSearchRequests() {
  return currentSession().costLedger.totalWebSearchRequests();
}
//@ chunk-ndmse9kj.js:80844-80897 facade-majority
/**
 * 状态访问器：调用当前会话的 费用账本（costLedger） 上的 markUnknownModelCost()。
 */
function setHasUnknownModelCost() {
  currentSession().costLedger.markUnknownModelCost();
}
//@ chunk-ndmse9kj.js:80897-80956 facade-majority = setHasUnknownModelCost (0.72)
/**
 * 状态访问器：读取当前会话的 费用账本（costLedger） 上的 hasUnknownModelCost()。
 */
function hasUnknownModelCost() {
  return currentSession().costLedger.hasUnknownModelCost();
}
//@ chunk-ndmse9kj.js:80956-81005 facade-majority
/**
 * 状态访问器：调用当前会话的 费用账本（costLedger） 上的 recordSafetyStop()。
 */
function addSafetyStop() {
  currentSession().costLedger.recordSafetyStop();
}
//@ chunk-ndmse9kj.js:81005-81056 facade-majority
/**
 * 状态访问器：读取当前会话的 费用账本（costLedger） 上的 safetyStops()。
 */
function getSafetyStops() {
  return currentSession().costLedger.safetyStops();
}
//@ chunk-ndmse9kj.js:81056-81116 facade-majority = getLastMainRequestId (0.728)
/**
 * 状态访问器：读取当前会话的 请求日志（requestJournal） 上的 lastMainRequestId()。
 */
function getLastMainRequestId() {
  return currentSession().requestJournal.lastMainRequestId();
}
//@ chunk-ndmse9kj.js:81116-81183 facade-majority
/**
 * 状态访问器：写入当前会话的 请求日志（requestJournal） 上的 replaceLastMainRequestId()。
 */
function setLastMainRequestId(requestId, response) {
  currentSession().requestJournal.replaceLastMainRequestId(requestId, response);
}
//@ chunk-ndmse9kj.js:81183-81257 facade-majority
/**
 * 状态访问器：写入当前会话的 请求日志（requestJournal） 上的 replaceLastMainRequestId()。
 */
function forgetLastMainRequestId() {
  currentSession().requestJournal.replaceLastMainRequestId(undefined, undefined);
}
//@ chunk-ndmse9kj.js:81257-81284 facade-majority
/**
 * 交接（hand-off）时清掉最后主请求 id 与压缩前响应。
 */
function forgetMainChainOnHandOff() {
  forgetLastMainRequestId();
  forgetResponseBeforeCompaction();
}
//@ chunk-ndmse9kj.js:81284-81349 facade-majority
/**
 * 状态访问器：读取当前会话的 请求日志（requestJournal） 上的 mainChainReleaseCount()。
 */
function getMainChainReleaseCount() {
  return currentSession().requestJournal.mainChainReleaseCount();
}
//@ chunk-ndmse9kj.js:81349-81416 facade-majority
/**
 * 状态访问器：读取当前会话的 请求日志（requestJournal） 上的 lastMainThreadCacheTtlMs()。
 */
function getLastMainThreadCacheTtlMs() {
  return currentSession().requestJournal.lastMainThreadCacheTtlMs();
}
//@ chunk-ndmse9kj.js:81416-81489 facade-majority
/**
 * 状态访问器：调用当前会话的 请求日志（requestJournal） 上的 isLastMainThreadAskLive()。
 */
function isLastMainThreadAskLive(ttlMs, model) {
  return currentSession().requestJournal.isLastMainThreadAskLive(ttlMs, model);
}
//@ chunk-ndmse9kj.js:81489-81555 facade-majority
/**
 * 状态访问器：读取当前会话的 请求日志（requestJournal） 上的 lastMainThreadRequestAt()。
 */
function getLastMainThreadRequestAt() {
  return currentSession().requestJournal.lastMainThreadRequestAt();
}
//@ chunk-ndmse9kj.js:81555-81626 facade-majority
/**
 * 状态访问器：读取当前会话的 请求日志（requestJournal） 上的 lastLiveMainThreadRequestAt()。
 */
function getLastLiveMainThreadRequestAt() {
  return currentSession().requestJournal.lastLiveMainThreadRequestAt();
}
//@ chunk-ndmse9kj.js:81626-81704 facade-majority
/**
 * 状态访问器：写入当前会话的 请求日志（requestJournal） 上的 replaceLastMainThreadCacheTtlMs()。
 */
function setLastMainThreadCacheTtlMs(ttlMs, model, askedAt) {
  currentSession().requestJournal.replaceLastMainThreadCacheTtlMs(ttlMs, model, askedAt);
}
//@ chunk-ndmse9kj.js:81704-81773 facade-majority
/**
 * 状态访问器：调用当前会话的 请求日志（requestJournal） 上的 adjustLastMainThreadCacheTtlMs()。
 */
function adjustLastMainThreadCacheTtlMs(ttlMs) {
  currentSession().requestJournal.adjustLastMainThreadCacheTtlMs(ttlMs);
}
//@ chunk-ndmse9kj.js:81773-81844 facade-majority
/**
 * 状态访问器：调用当前会话的 请求日志（requestJournal） 上的 recordLastMainThreadCacheRenewal()。
 */
function recordLastMainThreadCacheRenewal(renewedAt) {
  currentSession().requestJournal.recordLastMainThreadCacheRenewal(renewedAt);
}
//@ chunk-ndmse9kj.js:81844-81916 facade-majority
/**
 * 状态访问器：读取当前会话的 请求日志（requestJournal） 上的 lastMainThreadCacheRenewedAt()。
 */
function getLastMainThreadCacheRenewedAt() {
  return currentSession().requestJournal.lastMainThreadCacheRenewedAt();
}
//@ chunk-ndmse9kj.js:81916-81987 facade-majority
/**
 * 状态访问器：读取当前会话的 请求日志（requestJournal） 上的 lastMainThreadContextTokens()。
 */
function getLastMainThreadContextTokens() {
  return currentSession().requestJournal.lastMainThreadContextTokens();
}
//@ chunk-ndmse9kj.js:81987-82060 facade-majority
/**
 * 状态访问器：写入当前会话的 请求日志（requestJournal） 上的 replaceLastMainThreadContextTokens()。
 */
function setLastMainThreadContextTokens(contextTokens) {
  currentSession().requestJournal.replaceLastMainThreadContextTokens(contextTokens);
}
//@ chunk-ndmse9kj.js:82060-82207 facade-majority
/**
 * resume 种子：会话 id 已一致时立即应用到请求日志，否则暂存待切换后应用。
 */
function stageResumeJournalSeed(seed) {
  let session = currentSession();
  if (seed.sessionId !== undefined && seed.sessionId === session.id)
    session.requestJournal.applyResumeSeed(seed);
  else session.requestJournal.stageResumeSeed(seed);
}
//@ chunk-ndmse9kj.js:82207-82276 facade-majority = getLastApiCompletionTimestamp (0.736)
/**
 * 状态访问器：读取当前会话的 请求日志（requestJournal） 上的 lastApiCompletionTimestamp()。
 */
function getLastApiCompletionTimestamp() {
  return currentSession().requestJournal.lastApiCompletionTimestamp();
}
//@ chunk-ndmse9kj.js:82276-82348 facade-majority
/**
 * 状态访问器：写入当前会话的 请求日志（requestJournal） 上的 replaceLastApiCompletionTimestamp()。
 */
function setLastApiCompletionTimestamp(timestamp) {
  currentSession().requestJournal.replaceLastApiCompletionTimestamp(timestamp);
}
//@ chunk-ndmse9kj.js:82348-82540 facade-majority
/**
 * markPostCompaction：标记刚压缩并记录上下文 token；不保留缓存前缀时清掉最后主线程请求。
 */
function markPostCompaction(contextTokens, { keepsCachedPrefix = false } = {}) {
  let requestJournal = currentSession().requestJournal;
  requestJournal.replacePendingPostCompaction(true);
  requestJournal.replaceLastMainThreadContextTokens(contextTokens);
  if (!keepsCachedPrefix) requestJournal.replaceLastMainThreadRequest(null, null);
}
//@ chunk-ndmse9kj.js:82540-82667 facade-majority = markPostCompaction (0.544)
/**
 * 读取并清除“刚压缩过”标记。
 */
function consumePostCompaction() {
  let session = currentSession();
  let pending = session.requestJournal.pendingPostCompaction();
  session.requestJournal.replacePendingPostCompaction(false);
  return pending;
}
//@ chunk-ndmse9kj.js:82667-82727 facade-majority = flushInteractionTime_inner (0.693)
/**
 * 状态访问器：读取当前会话的 用户在场（userPresence） 上的 lastInteractionTime()。
 */
function getLastInteractionTime() {
  return currentSession().userPresence.lastInteractionTime();
}
//@ chunk-ndmse9kj.js:82727-82783 facade-majority
/**
 * 状态访问器：读取当前会话的 用户在场（userPresence） 上的 lastSubmitTime()。
 */
function getLastSubmitTime() {
  return currentSession().userPresence.lastSubmitTime();
}
//@ chunk-ndmse9kj.js:82783-82830 facade-majority
/**
 * 状态访问器：调用当前会话的 用户在场（userPresence） 上的 recordSubmit()。
 */
function recordSubmitTime() {
  currentSession().userPresence.recordSubmit();
}
//@ chunk-ndmse9kj.js:82830-82844 facade-majority
/**
 * 用户“活跃”的判定窗口：60 秒（通知用）。
 */
var NOTIF_ACTIVE_THRESHOLD_MS = 60000;
//@ chunk-ndmse9kj.js:82844-82900 facade-majority
/**
 * 状态访问器：调用当前会话的 用户在场（userPresence） 上的 updateTerminalFocus()。
 */
function setTerminalFocusForState(focused) {
  currentSession().userPresence.updateTerminalFocus(focused);
}
//@ chunk-ndmse9kj.js:82900-82955 facade-majority
/**
 * 状态访问器：读取当前会话的 用户在场（userPresence） 上的 terminalFocus()。
 */
function getTerminalFocus() {
  return currentSession().userPresence.terminalFocus();
}
//@ chunk-ndmse9kj.js:82955-83027 facade-majority
/**
 * 状态访问器：调用当前会话的 用户在场（userPresence） → terminalFocusFired 上的 subscribe()。
 */
function onTerminalFocusChange(listener) {
  return currentSession().userPresence.terminalFocusFired.subscribe(listener);
}
//@ chunk-ndmse9kj.js:83027-83104 facade-majority
/**
 * 用户是否活跃：终端焦点已知时用焦点，否则看 60 秒内是否有交互。
 */
function isUserActiveForNotifications() {
  let terminalFocus = getTerminalFocus();
  if (terminalFocus !== undefined) return terminalFocus;
  return Date.now() - getLastInteractionTime() < NOTIF_ACTIVE_THRESHOLD_MS;
}
//@ chunk-ndmse9kj.js:83104-83157 facade-majority
/**
 * 状态访问器：调用当前会话的 用户在场（userPresence） 上的 markScrollActivity()。
 */
function markScrollActivity() {
  currentSession().userPresence.markScrollActivity();
}
//@ chunk-ndmse9kj.js:83157-83213 facade-majority
/**
 * 状态访问器：读取当前会话的 用户在场（userPresence） 上的 scrollDraining()。
 */
function getIsScrollDraining() {
  return currentSession().userPresence.scrollDraining();
}
//@ chunk-ndmse9kj.js:83213-83278 facade-majority
/**
 * 会话状态函数 waitForScrollIdle：涉及当前会话的 userPresence.waitForScrollIdle。
 */
async function waitForScrollIdle() {
  return currentSession().userPresence.waitForScrollIdle();
}
//@ chunk-ndmse9kj.js:83278-83327 facade-majority = getModelUsage (0.679)
/**
 * 状态访问器：读取当前会话的 费用账本（costLedger） 上的 modelUsage()。
 */
function getModelUsage() {
  return currentSession().costLedger.modelUsage();
}
//@ chunk-ndmse9kj.js:83327-83382 facade-majority
/**
 * 状态访问器：调用当前会话的 费用账本（costLedger） 上的 usageForModel()。
 */
function getUsageForModel(model) {
  return currentSession().costLedger.usageForModel(model);
}
//@ chunk-ndmse9kj.js:83382-83440 facade-majority
/**
 * 状态访问器：调用当前会话的 费用账本（costLedger） 上的 trackUsageSinceLastResult()。
 */
function trackUsageSinceLastResult() {
  currentSession().costLedger.trackUsageSinceLastResult();
}
//@ chunk-ndmse9kj.js:83440-83500 facade-majority
/**
 * 状态访问器：读取当前会话的 费用账本（costLedger） 上的 usageSinceLastResult()。
 */
function getUsageSinceLastResult() {
  return currentSession().costLedger.usageSinceLastResult();
}
//@ chunk-ndmse9kj.js:83500-83564 facade-majority
/**
 * 状态访问器：读取当前会话的 费用账本（costLedger） 上的 takeUsageSinceLastResult()。
 */
function takeUsageSinceLastResult() {
  return currentSession().costLedger.takeUsageSinceLastResult();
}
//@ chunk-ndmse9kj.js:83564-83628 facade-majority = getMainLoopModelOverride (0.717)
/**
 * 状态访问器：读取当前会话的 模型选择（modelSelection） 上的 mainLoopModelOverride()。
 */
function getMainLoopModelOverride() {
  return currentSession().modelSelection.mainLoopModelOverride();
}
//@ chunk-ndmse9kj.js:83628-83691 facade-majority = getInitialMainLoopModel (0.699)
/**
 * 状态访问器：读取当前会话的 模型选择（modelSelection） 上的 initialMainLoopModel()。
 */
function getInitialMainLoopModel() {
  return currentSession().modelSelection.initialMainLoopModel();
}
//@ chunk-ndmse9kj.js:83691-83750 facade-majority
/**
 * 状态访问器：调用当前会话的 模型选择（modelSelection） 上的 overrideMainLoopModel()。
 */
function setMainLoopModelOverride(model) {
  currentSession().modelSelection.overrideMainLoopModel(model);
}
//@ chunk-ndmse9kj.js:83750-83813 facade-majority
/**
 * 状态访问器：读取当前会话的 模型选择（modelSelection） 上的 mainLoopEffortState()。
 */
function getMainLoopEffortState() {
  return currentSession().modelSelection.mainLoopEffortState();
}
//@ chunk-ndmse9kj.js:83813-83878 facade-majority
/**
 * 状态访问器：写入当前会话的 模型选择（modelSelection） 上的 replaceMainLoopEffortState()。
 */
function setMainLoopEffortState(effortState) {
  currentSession().modelSelection.replaceMainLoopEffortState(effortState);
}
//@ chunk-ndmse9kj.js:83878-83944 facade-majority
/**
 * 状态访问器：调用当前会话的 模型选择（modelSelection） 上的 markRefusalFallbackOccurred()。
 */
function markRefusalFallbackOccurred(reason) {
  currentSession().modelSelection.markRefusalFallbackOccurred(reason);
}
//@ chunk-ndmse9kj.js:83944-84010 facade-majority
/**
 * 状态访问器：读取当前会话的 模型选择（modelSelection） 上的 refusalFallbackOccurred()。
 */
function hasRefusalFallbackOccurred() {
  return currentSession().modelSelection.refusalFallbackOccurred();
}
//@ chunk-ndmse9kj.js:84010-84073 facade-majority
/**
 * 状态访问器：调用当前会话的 模型选择（modelSelection） 上的 armRefusalFallbackHeader()。
 */
function markRefusalFallbackHeaderArmed(armed) {
  currentSession().modelSelection.armRefusalFallbackHeader(armed);
}
//@ chunk-ndmse9kj.js:84073-84143 facade-majority
/**
 * 状态访问器：读取当前会话的 模型选择（modelSelection） 上的 refusalFallbackHeaderArmed()。
 */
function hasRefusalFallbackHeaderArmed() {
  return currentSession().modelSelection.refusalFallbackHeaderArmed();
}
//@ chunk-ndmse9kj.js:84143-84203 facade-majority
/**
 * 状态访问器：调用当前会话的 模型选择（modelSelection） 上的 armSilentLaneFromServer()。
 */
function markSilentRefusalFallbackServerArmed() {
  currentSession().modelSelection.armSilentLaneFromServer();
}
//@ chunk-ndmse9kj.js:84203-84268 facade-majority
/**
 * 状态访问器：读取当前会话的 模型选择（modelSelection） 上的 silentLaneServerArmed()。
 */
function isSilentRefusalFallbackServerArmed() {
  return currentSession().modelSelection.silentLaneServerArmed();
}
//@ chunk-ndmse9kj.js:84268-84347 facade-majority
/**
 * 状态访问器：读取当前会话的 模型选择（modelSelection） 上的 refusalFallbackLatchOriginRequestId()。
 */
function getRefusalFallbackLatchOriginRequestId() {
  return currentSession().modelSelection.refusalFallbackLatchOriginRequestId();
}
//@ chunk-ndmse9kj.js:84347-84681 facade-majority
/**
 * 锁存拒答回退模型：已锁存且当前覆盖即回退模型时只更新回退模型与 effort，否则写入新锁存。
 */
function latchRefusalFallbackModel(model) {
  let session = currentSession();
  let existingLatch = session.modelSelection.refusalFallbackModelLatch();
  if (existingLatch && session.modelSelection.mainLoopModelOverride() === existingLatch.fallbackModel) {
    session.modelSelection.replaceRefusalFallbackModelLatch({
      ...existingLatch,
      fallbackModel: model.fallbackModel,
      carriedEffort: model.carriedEffort ?? existingLatch.carriedEffort,
    });
    return;
  }
  session.modelSelection.replaceRefusalFallbackModelLatch(model);
}
//@ chunk-ndmse9kj.js:84681-84757 facade-majority
/**
 * 状态访问器：调用当前会话的 模型选择（modelSelection） 上的 unlatchRefusalFallbackModel()。
 */
function clearRefusalFallbackModelLatch() {
  currentSession().modelSelection.unlatchRefusalFallbackModel("model_pick");
}
//@ chunk-ndmse9kj.js:84757-84825 facade-majority
/**
 * 状态访问器：读取当前会话的 模型选择（modelSelection） 上的 refusalFallbackModelLatch()。
 */
function getRefusalFallbackModelLatch() {
  return currentSession().modelSelection.refusalFallbackModelLatch();
}
//@ chunk-ndmse9kj.js:84825-84979 facade-majority
/**
 * 清掉拒答回退锁存里携带的 effort。
 */
function releaseRefusalFallbackCarriedEffort(reason) {
  let { modelSelection } = currentSession();
  let latch = modelSelection.refusalFallbackModelLatch();
  if (latch !== undefined)
    modelSelection.replaceRefusalFallbackModelLatch(
      {
        ...latch,
        carriedEffort: undefined,
      },
      reason,
    );
}
//@ chunk-ndmse9kj.js:84979-85043 facade-majority
/**
 * 状态访问器：读取当前会话的 模型选择（modelSelection） 上的 takeCarriedEffortEnd()。
 */
function takeRefusalFallbackCarriedEffortEnd() {
  return currentSession().modelSelection.takeCarriedEffortEnd();
}
//@ chunk-ndmse9kj.js:85043-85198 facade-majority
/**
 * 改写拒答回退锁存里记录的“之前的模型覆盖”。
 */
function rewriteRefusalFallbackPreviousOverride(previousOverride) {
  let session = currentSession();
  let latch = session.modelSelection.refusalFallbackModelLatch();
  if (latch)
    session.modelSelection.replaceRefusalFallbackModelLatch({
      ...latch,
      previousOverride,
    });
}
//@ chunk-ndmse9kj.js:85198-85264 facade-majority
/**
 * 状态访问器：调用当前会话的 模型选择（modelSelection） 上的 forgetRefusalFallbackOccurred()。
 */
function clearRefusalFallbackOccurred() {
  currentSession().modelSelection.forgetRefusalFallbackOccurred();
}
//@ chunk-ndmse9kj.js:85264-85331 facade-majority
/**
 * 状态访问器：调用当前会话的 宿主能力（surfaceCapabilities） 上的 markSdkDialogHostActive()。
 */
function setSdkDialogHostActive(active) {
  currentSession().surfaceCapabilities.markSdkDialogHostActive(active);
}
//@ chunk-ndmse9kj.js:85331-85398 facade-majority
/**
 * 状态访问器：读取当前会话的 宿主能力（surfaceCapabilities） 上的 sdkDialogHostActive()。
 */
function isSdkDialogHostActive() {
  return currentSession().surfaceCapabilities.sdkDialogHostActive();
}
//@ chunk-ndmse9kj.js:85398-85464 facade-majority
/**
 * 状态访问器：调用当前会话的 宿主能力（surfaceCapabilities） 上的 declareDialogKinds()。
 */
function setSdkSupportedDialogKinds(dialogKinds, source) {
  currentSession().surfaceCapabilities.declareDialogKinds(dialogKinds, source);
}
//@ chunk-ndmse9kj.js:85464-85536 facade-majority
/**
 * 状态访问器：读取当前会话的 宿主能力（surfaceCapabilities） 上的 sdkSupportedDialogKinds()。
 */
function getSdkSupportedDialogKinds() {
  return currentSession().surfaceCapabilities.sdkSupportedDialogKinds();
}
//@ chunk-ndmse9kj.js:85536-85703 facade-majority
/**
 * SDK 宿主声明的对话类型来源（未声明为 none）。
 */
function getSdkDialogCapabilitySource() {
  let session = currentSession();
  if (session.surfaceCapabilities.sdkSupportedDialogKinds() === undefined) return "none";
  return session.surfaceCapabilities.sdkSupportedDialogKindsSource() ?? "none";
}
//@ chunk-ndmse9kj.js:85703-85775 facade-majority
/**
 * 状态访问器：调用当前会话的 宿主能力（surfaceCapabilities） 上的 declarePerTaskStopAffordance()。
 */
function setSdkPerTaskStopAffordance(affordance) {
  currentSession().surfaceCapabilities.declarePerTaskStopAffordance(affordance);
}
//@ chunk-ndmse9kj.js:85775-85853 facade-majority
/**
 * 会话状态函数 getSdkPerTaskStopAffordance：涉及当前会话的 surfaceCapabilities.sdkPerTaskStopAffordance。
 */
function getSdkPerTaskStopAffordance() {
  return currentSession().surfaceCapabilities.sdkPerTaskStopAffordance() === true;
}
//@ chunk-ndmse9kj.js:85853-85924 facade-majority
/**
 * 状态访问器：调用当前会话的 宿主能力（surfaceCapabilities） 上的 declareRapidFollowupPreempt()。
 */
function setSdkRapidFollowupPreempt(enabled) {
  currentSession().surfaceCapabilities.declareRapidFollowupPreempt(enabled);
}
//@ chunk-ndmse9kj.js:85924-86001 facade-majority
/**
 * 会话状态函数 getSdkRapidFollowupPreempt：涉及当前会话的 surfaceCapabilities.sdkRapidFollowupPreempt。
 */
function getSdkRapidFollowupPreempt() {
  return currentSession().surfaceCapabilities.sdkRapidFollowupPreempt() === true;
}
//@ chunk-ndmse9kj.js:86001-86082 facade-majority
/**
 * 状态访问器：调用当前会话的 宿主能力（surfaceCapabilities） 上的 declareForwardNestedSubagentToolCalls()。
 */
function setSdkForwardNestedSubagentToolCalls(enabled) {
  currentSession().surfaceCapabilities.declareForwardNestedSubagentToolCalls(enabled);
}
//@ chunk-ndmse9kj.js:86082-86160 facade-majority
/**
 * 状态访问器：调用当前会话的 宿主能力（surfaceCapabilities） 上的 declareHostRendersChromeSetupOffer()。
 */
function setHostRendersChromeSetupOffer(enabled) {
  currentSession().surfaceCapabilities.declareHostRendersChromeSetupOffer(enabled);
}
//@ chunk-ndmse9kj.js:86160-86241 facade-majority
/**
 * 会话状态函数 getHostRendersChromeSetupOffer：涉及当前会话的 surfaceCapabilities.hostRendersChromeSetupOffer。
 */
function getHostRendersChromeSetupOffer() {
  return currentSession().surfaceCapabilities.hostRendersChromeSetupOffer() === true;
}
//@ chunk-ndmse9kj.js:86241-86302 facade-majority
/**
 * 状态访问器：读取当前会话的 host（host） → 启动选项（launchOptions） 上的 replConfigArgv()。
 */
function getReplConfigArgv() {
  return currentSession().host.launchOptions.replConfigArgv();
}
//@ chunk-ndmse9kj.js:86302-86366 facade-majority
/**
 * 状态访问器：写入当前会话的 host（host） → 启动选项（launchOptions） 上的 replaceReplConfigArgv()。
 */
function setReplConfigArgv(argv) {
  currentSession().host.launchOptions.replaceReplConfigArgv(argv);
}
//@ chunk-ndmse9kj.js:86366-86432 facade-majority
/**
 * 状态访问器：写入当前会话的 模型选择（modelSelection） 上的 replaceInitialMainLoopModel()。
 */
function setInitialMainLoopModel(initialMainLoopModel) {
  currentSession().modelSelection.replaceInitialMainLoopModel(initialMainLoopModel);
}
//@ chunk-ndmse9kj.js:86432-86501 facade-majority
/**
 * 状态访问器：读取当前会话的 模型选择（modelSelection） 上的 availabilityFallbackChain()。
 */
function getAvailabilityFallbackChain() {
  return currentSession().modelSelection.availabilityFallbackChain();
}
//@ chunk-ndmse9kj.js:86501-86572 facade-majority
/**
 * 状态访问器：写入当前会话的 模型选择（modelSelection） 上的 replaceAvailabilityFallbackChain()。
 */
function setAvailabilityFallbackChain(chain) {
  currentSession().modelSelection.replaceAvailabilityFallbackChain(chain);
}
//@ chunk-ndmse9kj.js:86572-86640 facade-majority
/**
 * 状态访问器：读取当前会话的 模型选择（modelSelection） 上的 initialModelSettingLayer()。
 */
function getInitialModelSettingLayer() {
  return currentSession().modelSelection.initialModelSettingLayer();
}
//@ chunk-ndmse9kj.js:86640-86710 facade-majority
/**
 * 状态访问器：写入当前会话的 模型选择（modelSelection） 上的 replaceInitialModelSettingLayer()。
 */
function setInitialModelSettingLayer(settingLayer) {
  currentSession().modelSelection.replaceInitialModelSettingLayer(settingLayer);
}
//@ chunk-ndmse9kj.js:86710-86772 facade-majority
/**
 * 状态访问器：读取当前会话的 模型选择（modelSelection） 上的 resolvedOrgDefault()。
 */
function getResolvedOrgDefault() {
  return currentSession().modelSelection.resolvedOrgDefault();
}
//@ chunk-ndmse9kj.js:86772-86836 facade-majority
/**
 * 状态访问器：写入当前会话的 模型选择（modelSelection） 上的 replaceResolvedOrgDefault()。
 */
function setResolvedOrgDefault(model) {
  currentSession().modelSelection.replaceResolvedOrgDefault(model);
}
//@ chunk-ndmse9kj.js:86836-86902 facade-majority
/**
 * 状态访问器：读取当前会话的 模型选择（modelSelection） 上的 initialEnvDefaultModel()。
 */
function getInitialEnvDefaultModel() {
  return currentSession().modelSelection.initialEnvDefaultModel();
}
//@ chunk-ndmse9kj.js:86902-86970 facade-majority
/**
 * 状态访问器：写入当前会话的 模型选择（modelSelection） 上的 replaceInitialEnvDefaultModel()。
 */
function setInitialEnvDefaultModel(model) {
  currentSession().modelSelection.replaceInitialEnvDefaultModel(model);
}
//@ chunk-ndmse9kj.js:86970-87041 facade-majority = getSdkBetas (0.724)
/**
 * 会话状态函数 getSdkBetas：优先取异步上下文覆盖对象的 sdkBetas；涉及当前会话的 surfaceCapabilities.sdkBetas。
 */
function getSdkBetas() {
  return getAgentContext()?.sdkBetas ?? currentSession().surfaceCapabilities.sdkBetas();
}
//@ chunk-ndmse9kj.js:87041-87100 facade-majority
/**
 * 状态访问器：写入当前会话的 宿主能力（surfaceCapabilities） 上的 replaceSdkBetas()。
 */
function setSdkBetas(sdkBetas) {
  currentSession().surfaceCapabilities.replaceSdkBetas(sdkBetas);
}
//@ chunk-ndmse9kj.js:87100-87182 facade-majority
/**
 * 状态访问器：读取当前会话的 host（host） → 账户额度锁存（accountCreditLatches） 上的 longContext1mCreditsBlocked()。
 */
function isLongContext1mCreditsBlocked() {
  return currentSession().host.accountCreditLatches.longContext1mCreditsBlocked();
}
//@ chunk-ndmse9kj.js:87182-87266 facade-majority
/**
 * 状态访问器：写入当前会话的 host（host） → 账户额度锁存（accountCreditLatches） 上的 replaceLongContext1mCreditsBlocked()。
 */
function setLongContext1mCreditsBlocked(blocked) {
  currentSession().host.accountCreditLatches.replaceLongContext1mCreditsBlocked(blocked);
}
//@ chunk-ndmse9kj.js:87266-87341 facade-majority
/**
 * 状态访问器：读取当前会话的 host（host） → 账户额度锁存（accountCreditLatches） 上的 usageCreditsRequired()。
 */
function isUsageCreditsRequired() {
  return currentSession().host.accountCreditLatches.usageCreditsRequired();
}
//@ chunk-ndmse9kj.js:87341-87418 facade-majority
/**
 * 状态访问器：写入当前会话的 host（host） → 账户额度锁存（accountCreditLatches） 上的 replaceUsageCreditsRequired()。
 */
function setUsageCreditsRequired(required) {
  currentSession().host.accountCreditLatches.replaceUsageCreditsRequired(required);
}
//@ chunk-ndmse9kj.js:87418-87505 facade-majority
/**
 * 状态访问器：调用当前会话的 仅额度模型同意（usageCreditsOnlyModelConsentSlots） 上的 consentSessionFallback()。
 */
function hasUsageCreditsOnlyModelConsentSessionFallback(modelFamily) {
  return currentSession().usageCreditsOnlyModelConsentSlots.consentSessionFallback(modelFamily);
}
//@ chunk-ndmse9kj.js:87505-87596 facade-majority
/**
 * 状态访问器：写入当前会话的 仅额度模型同意（usageCreditsOnlyModelConsentSlots） 上的 replaceConsentSessionFallback()。
 */
function setUsageCreditsOnlyModelConsentSessionFallback(modelFamily, consented) {
  currentSession().usageCreditsOnlyModelConsentSlots.replaceConsentSessionFallback(modelFamily, consented);
}
//@ chunk-ndmse9kj.js:87596-87678 facade-majority
/**
 * 状态访问器：调用当前会话的 仅额度模型同意（usageCreditsOnlyModelConsentSlots） 上的 sessionConsentKey()。
 */
function getUsageCreditsOnlyModelSessionConsentKey(modelFamily) {
  return currentSession().usageCreditsOnlyModelConsentSlots.sessionConsentKey(modelFamily);
}
//@ chunk-ndmse9kj.js:87678-87764 facade-majority
/**
 * 状态访问器：写入当前会话的 仅额度模型同意（usageCreditsOnlyModelConsentSlots） 上的 replaceSessionConsentKey()。
 */
function setUsageCreditsOnlyModelSessionConsentKey(modelFamily, ownerKey) {
  currentSession().usageCreditsOnlyModelConsentSlots.replaceSessionConsentKey(modelFamily, ownerKey);
}
//@ chunk-ndmse9kj.js:87764-87842 facade-majority
/**
 * 状态访问器：读取当前会话的 host（host） → 凭证槽（credentialSlots） 上的 sdkOAuthTokenRefreshCallback()。
 */
function getSdkOAuthTokenRefreshCallback() {
  return currentSession().host.credentialSlots.sdkOAuthTokenRefreshCallback();
}
//@ chunk-ndmse9kj.js:87842-87922 facade-majority
/**
 * 状态访问器：写入当前会话的 host（host） → 凭证槽（credentialSlots） 上的 replaceSdkOAuthTokenRefreshCallback()。
 */
function setSdkOAuthTokenRefreshCallback(callback) {
  currentSession().host.credentialSlots.replaceSdkOAuthTokenRefreshCallback(callback);
}
//@ chunk-ndmse9kj.js:87922-88000 facade-majority
/**
 * 状态访问器：读取当前会话的 host（host） → 凭证槽（credentialSlots） 上的 hostAuthTokenRefreshCallback()。
 */
function getHostAuthTokenRefreshCallback() {
  return currentSession().host.credentialSlots.hostAuthTokenRefreshCallback();
}
//@ chunk-ndmse9kj.js:88000-88080 facade-majority
/**
 * 状态访问器：写入当前会话的 host（host） → 凭证槽（credentialSlots） 上的 replaceHostAuthTokenRefreshCallback()。
 */
function setHostAuthTokenRefreshCallback(callback) {
  currentSession().host.credentialSlots.replaceHostAuthTokenRefreshCallback(callback);
}
//@ chunk-ndmse9kj.js:88080-88126 facade-majority
/**
 * 注册费用状态保存器（在默认 root 会话的账本上）。
 */
function registerSessionCostSaver(saveSessionCostBeforeExit) {
  defaultRootSession.costLedger.registerSaver(saveSessionCostBeforeExit);
}
//@ chunk-ndmse9kj.js:88126-88182 facade-majority
/**
 * 状态访问器：调用当前会话的 费用账本（costLedger） 上的 runSaver()。
 */
function saveSessionCostsForTransition(storageV5) {
  currentSession().costLedger.runSaver(storageV5, defaultRootSession.costLedger);
}
//@ chunk-ndmse9kj.js:88182-88241 facade-majority
/**
 * 注册费用状态的会话记录写入器。
 */
function registerCostStateRecorder(recordCostState) {
  defaultRootSession.costLedger.registerTranscriptRecorder(recordCostState);
}
//@ chunk-ndmse9kj.js:88241-88314 facade-majority
/**
 * 状态访问器：调用当前会话的 费用账本（costLedger） 上的 runTranscriptRecorder()。
 */
function recordCostStateToTranscript(recorder, options) {
  currentSession().costLedger.runTranscriptRecorder(recorder, options, defaultRootSession.costLedger);
}
//@ chunk-ndmse9kj.js:88314-88375 facade-majority
/**
 * 费用账本是否属于当前会话。
 */
function costLedgerBelongsToCurrentSession() {
  let session = currentSession();
  return session.costLedger.belongsTo(session.id);
}
//@ chunk-ndmse9kj.js:88375-88425 facade-majority
/**
 * 把费用账本归属到当前会话。
 */
function claimCostLedgerForCurrentSession() {
  let session = currentSession();
  session.costLedger.claim(session.id);
}
//@ chunk-ndmse9kj.js:88425-88477 facade-majority
/**
 * 把费用账本范围限定为当前会话。
 */
function scopeCostLedgerToCurrentSession() {
  let session = currentSession();
  session.costLedger.scopeTo(session.id);
}
//@ chunk-ndmse9kj.js:88477-88566 facade-majority
/**
 * resetCostState：清空当前会话费用账本并清 promptId。
 */
function resetCostState() {
  let session = currentSession();
  session.costLedger.reset(session.id);
  session.requestJournal.replacePromptId(null);
}
//@ chunk-ndmse9kj.js:88566-88621 facade-majority
/**
 * setCostStateForRestore：resume 时恢复费用状态。
 */
function setCostStateForRestore(costState) {
  let session = currentSession();
  session.costLedger.restore(costState, session.id);
}
//@ chunk-ndmse9kj.js:88621-88685 facade-majority
/**
 * 状态访问器：读取当前会话的 host（host） → 启动选项（launchOptions） 上的 projectConfigRoot()。
 */
function getProjectConfigRoot() {
  return currentSession().host.launchOptions.projectConfigRoot();
}
//@ chunk-ndmse9kj.js:88685-88752 facade-majority
/**
 * 状态访问器：写入当前会话的 host（host） → 启动选项（launchOptions） 上的 replaceProjectConfigRoot()。
 */
function setProjectConfigRoot(root) {
  currentSession().host.launchOptions.replaceProjectConfigRoot(root);
}
//@ chunk-ndmse9kj.js:88752-88816 facade-majority = getModelStrings (0.7)
/**
 * 状态访问器：读取当前会话的 host（host） → 模型字符串缓存（modelStringsCache） 上的 modelStrings()。
 */
function getModelStrings() {
  return currentSession().host.modelStringsCache.modelStrings();
}
//@ chunk-ndmse9kj.js:88816-88882 facade-majority
/**
 * 状态访问器：写入当前会话的 host（host） → 模型字符串缓存（modelStringsCache） 上的 replaceModelStrings()。
 */
function setModelStrings(modelStrings) {
  currentSession().host.modelStringsCache.replaceModelStrings(modelStrings);
}
//@ chunk-ndmse9kj.js:88882-88937 facade-majority
/**
 * 状态访问器：调用当前会话的 host（host） → 模型字符串缓存（modelStringsCache） 上的 invalidate()。
 */
function resetModelStrings() {
  currentSession().host.modelStringsCache.invalidate();
}
//@ chunk-ndmse9kj.js:88937-89013 facade-majority
/**
 * 状态访问器：调用当前会话的 host（host） → 模型字符串缓存（modelStringsCache） 上的 recordAdmin3PSteeringSnapshot()。
 */
function setAdmin3PSteeringSnapshot(snapshot) {
  currentSession().host.modelStringsCache.recordAdmin3PSteeringSnapshot(snapshot);
}
//@ chunk-ndmse9kj.js:89013-89088 facade-majority
/**
 * 状态访问器：读取当前会话的 host（host） → 模型字符串缓存（modelStringsCache） 上的 admin3PSteeringSnapshot()。
 */
function getAdmin3PSteeringSnapshot() {
  return currentSession().host.modelStringsCache.admin3PSteeringSnapshot();
}
//@ chunk-ndmse9kj.js:89088-89168 facade-majority
/**
 * 状态访问器：调用当前会话的 host（host） → 模型字符串缓存（modelStringsCache） 上的 recordProbeRefutedDocumentDefault()。
 */
function recordProbeRefutedDocumentDefault(candidate) {
  currentSession().host.modelStringsCache.recordProbeRefutedDocumentDefault(candidate);
}
//@ chunk-ndmse9kj.js:89168-89248 facade-majority
/**
 * 状态访问器：读取当前会话的 host（host） → 模型字符串缓存（modelStringsCache） 上的 probeRefutedDocumentDefaults()。
 */
function getProbeRefutedDocumentDefaults() {
  return currentSession().host.modelStringsCache.probeRefutedDocumentDefaults();
}
//@ chunk-ndmse9kj.js:89248-89313 facade-majority = getLoggerProvider (0.729)
/**
 * 状态访问器：读取当前会话的 host（host） → 遥测句柄（telemetryHandles） 上的 loggerProvider()。
 */
function getLoggerProvider() {
  return currentSession().host.telemetryHandles.loggerProvider();
}
//@ chunk-ndmse9kj.js:89313-89380 facade-majority
/**
 * 状态访问器：写入当前会话的 host（host） → 遥测句柄（telemetryHandles） 上的 replaceLoggerProvider()。
 */
function setLoggerProvider(loggerProvider) {
  currentSession().host.telemetryHandles.replaceLoggerProvider(loggerProvider);
}
//@ chunk-ndmse9kj.js:89380-89442 facade-majority = getEventLogger (0.711)
/**
 * 状态访问器：读取当前会话的 host（host） → 遥测句柄（telemetryHandles） 上的 eventLogger()。
 */
function getEventLogger() {
  return currentSession().host.telemetryHandles.eventLogger();
}
//@ chunk-ndmse9kj.js:89442-89509 facade-majority
/**
 * 状态访问器：读取当前会话的 host（host） → 遥测句柄（telemetryHandles） 上的 eventLoggerOwner()。
 */
function getEventLoggerOwner() {
  return currentSession().host.telemetryHandles.eventLoggerOwner();
}
//@ chunk-ndmse9kj.js:89509-89582 facade-majority
/**
 * 状态访问器：调用当前会话的 host（host） → 遥测句柄（telemetryHandles） 上的 attachEventLogger()。
 */
function setEventLogger(eventLogger, source = "org") {
  currentSession().host.telemetryHandles.attachEventLogger(eventLogger, source);
}
//@ chunk-ndmse9kj.js:89582-89653 facade-majority
/**
 * 状态访问器：调用当前会话的 host（host） → 遥测句柄（telemetryHandles） 上的 bufferPendingEvent()。
 */
function bufferPendingOTelEvent(event) {
  return currentSession().host.telemetryHandles.bufferPendingEvent(event);
}
//@ chunk-ndmse9kj.js:89653-89710 facade-majority
/**
 * 状态访问器：调用当前会话的 host（host） → 遥测句柄（telemetryHandles） 上的 closeWindow()。
 */
function discardPendingOTelEvents(reason) {
  currentSession().host.telemetryHandles.closeWindow(reason);
}
//@ chunk-ndmse9kj.js:89710-89777 facade-majority
/**
 * 状态访问器：读取当前会话的 host（host） → 遥测句柄（telemetryHandles） 上的 windowCloseCause()。
 */
function getOTelWindowCloseCause() {
  return currentSession().host.telemetryHandles.windowCloseCause();
}
//@ chunk-ndmse9kj.js:89777-89840 facade-majority
/**
 * 状态访问器：读取当前会话的 host（host） → 遥测句柄（telemetryHandles） 上的 isWindowOpen()。
 */
function isOTelInitPending() {
  return currentSession().host.telemetryHandles.isWindowOpen();
}
//@ chunk-ndmse9kj.js:89840-89899 facade-majority
/**
 * 状态访问器：读取当前会话的 host（host） → 遥测句柄（telemetryHandles） 上的 hostOtel()。
 */
function getHostOtelState() {
  return currentSession().host.telemetryHandles.hostOtel();
}
//@ chunk-ndmse9kj.js:89899-89964 facade-majority = getTracerProvider (0.729)
/**
 * 状态访问器：读取当前会话的 host（host） → 遥测句柄（telemetryHandles） 上的 tracerProvider()。
 */
function getTracerProvider() {
  return currentSession().host.telemetryHandles.tracerProvider();
}
//@ chunk-ndmse9kj.js:89964-90031 facade-majority
/**
 * 状态访问器：写入当前会话的 host（host） → 遥测句柄（telemetryHandles） 上的 replaceTracerProvider()。
 */
function setTracerProvider(tracerProvider) {
  currentSession().host.telemetryHandles.replaceTracerProvider(tracerProvider);
}
//@ chunk-ndmse9kj.js:90031-90109 facade-majority
/**
 * 状态访问器：读取当前会话的 host（host） → 请求锁存（requestLatches） 上的 foundryDeploymentCapabilities()。
 */
function getFoundryDeploymentCapabilities() {
  return currentSession().host.requestLatches.foundryDeploymentCapabilities();
}
//@ chunk-ndmse9kj.js:90109-90183 facade-majority
/**
 * 状态访问器：读取当前会话的 host（host） → 遥测句柄（telemetryHandles） 上的 cachedTelemetryResource()。
 */
function getCachedTelemetryResource() {
  return currentSession().host.telemetryHandles.cachedTelemetryResource();
}
//@ chunk-ndmse9kj.js:90183-90259 facade-majority
/**
 * 状态访问器：写入当前会话的 host（host） → 遥测句柄（telemetryHandles） 上的 replaceCachedTelemetryResource()。
 */
function setCachedTelemetryResource(resource) {
  currentSession().host.telemetryHandles.replaceCachedTelemetryResource(resource);
}
//@ chunk-ndmse9kj.js:90259-90342 facade-majority
/**
 * 状态访问器：调用当前会话的 host（host） → 遥测句柄（telemetryHandles） 上的 cachedOtlpHttpAgentFactory()。
 */
function getCachedOtlpHttpAgentFactory(useProxy, trustProfile) {
  return currentSession().host.telemetryHandles.cachedOtlpHttpAgentFactory(useProxy, trustProfile);
}
//@ chunk-ndmse9kj.js:90342-90429 facade-majority
/**
 * 状态访问器：写入当前会话的 host（host） → 遥测句柄（telemetryHandles） 上的 replaceCachedOtlpHttpAgentFactory()。
 */
function setCachedOtlpHttpAgentFactory(useProxy, trustProfile, factory) {
  currentSession().host.telemetryHandles.replaceCachedOtlpHttpAgentFactory(useProxy, trustProfile, factory);
}
//@ chunk-ndmse9kj.js:90429-90489 facade-majority = getIsNonInteractiveSession (0.711)
/**
 * getIsNonInteractiveSession：!launchOptions.isInteractive()。
 */
function getIsNonInteractiveSession() {
  return !currentSession().host.launchOptions.isInteractive();
}
//@ chunk-ndmse9kj.js:90489-90552 facade-majority
/**
 * 状态访问器：读取当前会话的 host（host） → 启动选项（launchOptions） 上的 spareClaimState()。
 */
function getSpareClaimState() {
  return currentSession().host.launchOptions.spareClaimState();
}
//@ chunk-ndmse9kj.js:90552-90625 facade-majority
/**
 * 会话状态函数 isParkedSpare：涉及当前会话的 host.launchOptions.spareClaimState。
 */
function isParkedSpare() {
  return currentSession().host.launchOptions.spareClaimState() === "parked";
}
//@ chunk-ndmse9kj.js:90625-90741 facade-majority
/**
 * 会话状态函数 markSpareParked：涉及当前会话的 host.launchOptions。
 */
function markSpareParked() {
  let launchOptions = currentSession().host.launchOptions;
  launchOptions.replaceSpareClaimState("parked");
  launchOptions.replaceSpareParkedAtMs(Date.now());
}
//@ chunk-ndmse9kj.js:90741-90882 facade-majority
/**
 * 会话状态函数 markSpareClaiming：涉及当前会话的 host.launchOptions。
 */
function markSpareClaiming() {
  let launchOptions = currentSession().host.launchOptions;
  let parkedAtMs = launchOptions.spareParkedAtMs();
  launchOptions.replaceSpareClaimState("claiming");
  return parkedAtMs === undefined ? undefined : Date.now() - parkedAtMs;
}
//@ chunk-ndmse9kj.js:90882-90954 facade-majority
/**
 * 状态访问器：写入当前会话的 host（host） → 启动选项（launchOptions） 上的 replaceSpareClaimState()。
 */
function markSpareClaimed() {
  currentSession().host.launchOptions.replaceSpareClaimState("claimed");
}
//@ chunk-ndmse9kj.js:90954-91025 facade-majority
/**
 * 状态访问器：写入当前会话的 host（host） → 启动选项（launchOptions） 上的 replaceSpareClaimState()。
 */
function markSpareClaimFailed() {
  currentSession().host.launchOptions.replaceSpareClaimState("failed");
}
//@ chunk-ndmse9kj.js:91025-91137 facade-majority
/**
 * 会话状态函数 isUnclaimedSpare：涉及当前会话的 host.launchOptions.spareClaimState。
 */
function isUnclaimedSpare() {
  let claimState = currentSession().host.launchOptions.spareClaimState();
  return claimState === "parked" || claimState === "claiming" || claimState === "failed";
}
//@ chunk-ndmse9kj.js:91137-91197 facade-majority = getIsInteractive (0.711)
/**
 * 状态访问器：读取当前会话的 host（host） → 启动选项（launchOptions） 上的 isInteractive()。
 */
function getIsInteractive() {
  return currentSession().host.launchOptions.isInteractive();
}
//@ chunk-ndmse9kj.js:91197-91267 facade-majority
/**
 * 状态访问器：读取当前会话的 host（host） → 启动选项（launchOptions） 上的 isInteractivityDecided()。
 */
function isInteractivityDecided() {
  return currentSession().host.launchOptions.isInteractivityDecided();
}
//@ chunk-ndmse9kj.js:91267-91331 facade-majority
/**
 * 状态访问器：读取当前会话的 host（host） → 启动选项（launchOptions） 上的 isNoDialogLaunch()。
 */
function isNoDialogLaunch() {
  return currentSession().host.launchOptions.isNoDialogLaunch();
}
//@ chunk-ndmse9kj.js:91331-91390 facade-majority
/**
 * 状态访问器：调用当前会话的 host（host） → 启动选项（launchOptions） 上的 markNoDialogLaunch()。
 */
function markNoDialogLaunch() {
  currentSession().host.launchOptions.markNoDialogLaunch();
}
//@ chunk-ndmse9kj.js:91390-91540 facade-majority = setIsInteractive (0.384)
/**
 * setIsInteractive：写 launchOptions.isInteractive；变化时让所有 HostScoped 缓存失效。
 */
function setIsInteractive(value) {
  let session = currentSession();
  let changed = session.host.launchOptions.isInteractive() !== value;
  session.host.launchOptions.replaceIsInteractive(value);
  if (changed) SETTINGS_CACHE_STORE_SLOT.of(session.host).invalidateAll();
}
//@ chunk-ndmse9kj.js:91540-91605 facade-majority
/**
 * 状态访问器：读取当前会话的 host（host） → 启动选项（launchOptions） 上的 printOutputFormat()。
 */
function getPrintOutputFormat() {
  return currentSession().host.launchOptions.printOutputFormat();
}
//@ chunk-ndmse9kj.js:91605-91672 facade-majority
/**
 * 状态访问器：写入当前会话的 host（host） → 启动选项（launchOptions） 上的 replacePrintOutputFormat()。
 */
function setPrintOutputFormat(format) {
  currentSession().host.launchOptions.replacePrintOutputFormat(format);
}
//@ chunk-ndmse9kj.js:91672-91743 facade-majority
/**
 * 状态访问器：读取当前会话的 host（host） → 启动选项（launchOptions） 上的 thinkingDisplayExplicit()。
 */
function getThinkingDisplayExplicit() {
  return currentSession().host.launchOptions.thinkingDisplayExplicit();
}
//@ chunk-ndmse9kj.js:91743-91816 facade-majority
/**
 * 状态访问器：写入当前会话的 host（host） → 启动选项（launchOptions） 上的 replaceThinkingDisplayExplicit()。
 */
function setThinkingDisplayExplicit(thinkingDisplayExplicit) {
  currentSession().host.launchOptions.replaceThinkingDisplayExplicit(thinkingDisplayExplicit);
}
//@ chunk-ndmse9kj.js:91816-91887 facade-majority
/**
 * 状态访问器：读取当前会话的 host（host） → 启动选项（launchOptions） 上的 permissionPromptToolName()。
 */
function getPermissionPromptToolName() {
  return currentSession().host.launchOptions.permissionPromptToolName();
}
//@ chunk-ndmse9kj.js:91887-91961 facade-majority
/**
 * 状态访问器：写入当前会话的 host（host） → 启动选项（launchOptions） 上的 replacePermissionPromptToolName()。
 */
function setPermissionPromptToolName(toolName) {
  currentSession().host.launchOptions.replacePermissionPromptToolName(toolName);
}
//@ chunk-ndmse9kj.js:91961-92021 facade-majority
/**
 * 状态访问器：读取当前会话的 宿主能力（surfaceCapabilities） 上的 attacherCaps()。
 */
function getAttacherCaps() {
  return currentSession().surfaceCapabilities.attacherCaps();
}
//@ chunk-ndmse9kj.js:92021-92084 facade-majority
/**
 * 状态访问器：写入当前会话的 宿主能力（surfaceCapabilities） 上的 replaceAttacherCaps()。
 */
function setAttacherCaps(caps) {
  currentSession().surfaceCapabilities.replaceAttacherCaps(caps);
}
//@ chunk-ndmse9kj.js:92084-92163 facade-majority
/**
 * 状态访问器：调用当前会话的 宿主能力（surfaceCapabilities） → attacherCapsChanged 上的 subscribe()。
 */
function onAttacherCapsChange(listener) {
  return currentSession().surfaceCapabilities.attacherCapsChanged.subscribe(listener);
}
//@ chunk-ndmse9kj.js:92163-92232 facade-majority
/**
 * 状态访问器：读取当前会话的 宿主能力（surfaceCapabilities） 上的 rvSupervisorLinkLive()。
 */
function getRvSupervisorLinkLive() {
  return currentSession().surfaceCapabilities.rvSupervisorLinkLive();
}
//@ chunk-ndmse9kj.js:92232-92303 facade-majority
/**
 * 状态访问器：写入当前会话的 宿主能力（surfaceCapabilities） 上的 replaceRvSupervisorLinkLive()。
 */
function setRvSupervisorLinkLive(live) {
  currentSession().surfaceCapabilities.replaceRvSupervisorLinkLive(live);
}
//@ chunk-ndmse9kj.js:92303-92387 facade-majority
/**
 * 状态访问器：调用当前会话的 宿主能力（surfaceCapabilities） → rvSupervisorLinkChanged 上的 subscribe()。
 */
function onRvSupervisorLinkChange(listener) {
  return currentSession().surfaceCapabilities.rvSupervisorLinkChanged.subscribe(listener);
}
//@ chunk-ndmse9kj.js:92387-92452 facade-majority
/**
 * 状态访问器：读取当前会话的 host（host） → 启动选项（launchOptions） 上的 hasStreamingInput()。
 */
function getHasStreamingInput() {
  return currentSession().host.launchOptions.hasStreamingInput();
}
//@ chunk-ndmse9kj.js:92452-92519 facade-majority
/**
 * 状态访问器：写入当前会话的 host（host） → 启动选项（launchOptions） 上的 replaceHasStreamingInput()。
 */
function setHasStreamingInput(enabled) {
  currentSession().host.launchOptions.replaceHasStreamingInput(enabled);
}
//@ chunk-ndmse9kj.js:92519-92577 facade-majority
/**
 * 是否为单次 -p（无流式输入、无 --sdk-url）。
 */
function deriveSingleShotPrintSession({ hasStreamingInput, sdkUrl }) {
  return !hasStreamingInput && !sdkUrl;
}
//@ chunk-ndmse9kj.js:92577-92797 layout
function resolveOwnEventsSink(launchOptions) {
  if (launchOptions.entrypoint === "terminal") return launchOptions.ownEventsRequested ? "terminal" : "none";
  if (launchOptions.ownEventsOnly) return "evals";
  if (launchOptions.hasStreamingInput || launchOptions.sdkUrl) return "host";
  if (launchOptions.ownEventsRequested) return "evals";
  return "none";
}
//@ chunk-ndmse9kj.js:92797-92869 facade-majority
/**
 * 状态访问器：写入当前会话的 host（host） → 启动选项（launchOptions） 上的 replaceSingleShotPrintSession()。
 */
function setSingleShotPrintSession(singleShotPrintSession) {
  currentSession().host.launchOptions.replaceSingleShotPrintSession(singleShotPrintSession);
}
//@ chunk-ndmse9kj.js:92869-92938 facade-majority
/**
 * 状态访问器：读取当前会话的 host（host） → 启动选项（launchOptions） 上的 singleShotPrintSession()。
 */
function isSingleShotPrintSession() {
  return currentSession().host.launchOptions.singleShotPrintSession();
}
//@ chunk-ndmse9kj.js:92938-92999 facade-majority
/**
 * 状态访问器：调用当前会话的 host（host） → 启动选项（launchOptions） 上的 markPrintInputClosed()。
 */
function markPrintInputClosed() {
  currentSession().host.launchOptions.markPrintInputClosed();
}
//@ chunk-ndmse9kj.js:92999-93063 facade-majority
/**
 * 状态访问器：读取当前会话的 host（host） → 启动选项（launchOptions） 上的 printInputClosed()。
 */
function isPrintInputClosed() {
  return currentSession().host.launchOptions.printInputClosed();
}
//@ chunk-ndmse9kj.js:93063-93121 facade-majority = getClientType (0.739)
/**
 * 状态访问器：读取当前会话的 host（host） → 启动选项（launchOptions） 上的 clientType()。
 */
function getClientType() {
  return currentSession().host.launchOptions.clientType();
}
//@ chunk-ndmse9kj.js:93121-93181 facade-majority
/**
 * 状态访问器：写入当前会话的 host（host） → 启动选项（launchOptions） 上的 replaceClientType()。
 */
function setClientType(clientType) {
  currentSession().host.launchOptions.replaceClientType(clientType);
}
//@ chunk-ndmse9kj.js:93181-93261 facade-majority = getSdkAgentProgressSummariesEnabled (0.763)
/**
 * 状态访问器：读取当前会话的 host（host） → 启动选项（launchOptions） 上的 sdkAgentProgressSummariesEnabled()。
 */
function getSdkAgentProgressSummariesEnabled() {
  return currentSession().host.launchOptions.sdkAgentProgressSummariesEnabled();
}
//@ chunk-ndmse9kj.js:93261-93343 facade-majority
/**
 * 状态访问器：写入当前会话的 host（host） → 启动选项（launchOptions） 上的 replaceSdkAgentProgressSummariesEnabled()。
 */
function setSdkAgentProgressSummariesEnabled(enabled) {
  currentSession().host.launchOptions.replaceSdkAgentProgressSummariesEnabled(enabled);
}
//@ chunk-ndmse9kj.js:93343-93403 facade-majority
/**
 * 状态访问器：读取当前会话的 host（host） → 启动选项（launchOptions） 上的 rendererMode()。
 */
function getRendererModeForAnalytics() {
  return currentSession().host.launchOptions.rendererMode();
}
//@ chunk-ndmse9kj.js:93403-93465 facade-majority
/**
 * 状态访问器：写入当前会话的 host（host） → 启动选项（launchOptions） 上的 replaceRendererMode()。
 */
function setRendererModeForAnalytics(mode) {
  currentSession().host.launchOptions.replaceRendererMode(mode);
}
//@ chunk-ndmse9kj.js:93465-93536 facade-majority = getStrictToolResultPairing (0.763)
/**
 * 状态访问器：读取当前会话的 host（host） → 启动选项（launchOptions） 上的 strictToolResultPairing()。
 */
function getStrictToolResultPairing() {
  return currentSession().host.launchOptions.strictToolResultPairing();
}
//@ chunk-ndmse9kj.js:93536-93600 facade-majority
/**
 * 状态访问器：读取当前会话的 host（host） → 启动选项（launchOptions） 上的 restrictedSession()。
 */
function isRestrictedSession() {
  return currentSession().host.launchOptions.restrictedSession();
}
//@ chunk-ndmse9kj.js:93600-93667 facade-majority
/**
 * 状态访问器：写入当前会话的 host（host） → 启动选项（launchOptions） 上的 replaceRestrictedSession()。
 */
function setRestrictedSession(restricted) {
  currentSession().host.launchOptions.replaceRestrictedSession(restricted);
}
//@ chunk-ndmse9kj.js:93667-93759 facade-majority
/**
 * 会话状态函数 getWorkspaceRestriction：涉及当前会话的 host.launchOptions.workspaceRestrictionState。
 */
function getWorkspaceRestriction() {
  return currentSession().host.launchOptions.workspaceRestrictionState()?.restriction ?? null;
}
//@ chunk-ndmse9kj.js:93759-93793 facade-majority
/**
 * 是否处于受限工作区。
 */
function isWorkspaceRestricted() {
  return getWorkspaceRestriction() !== null;
}
//@ chunk-ndmse9kj.js:93793-93940 layout
/**
 * 会话状态函数 findRestrictedWorkspaceRoot：涉及当前会话的 host.launchOptions.restrictedWorkspaceRoots。
 */
function findRestrictedWorkspaceRoot(path) {
  for (let [workspaceRoot, restriction] of currentSession().host.launchOptions.restrictedWorkspaceRoots())
    if (
      path === workspaceRoot ||
      path.startsWith(workspaceRoot.endsWith(sep) ? workspaceRoot : workspaceRoot + sep)
    )
      return restriction;
  return null;
}
//@ chunk-ndmse9kj.js:93940-93976 facade-majority
/**
 * 路径是否在受限工作区根之下。
 */
function isUnderRestrictedWorkspaceRoot(path) {
  return findRestrictedWorkspaceRoot(path) !== null;
}
//@ chunk-ndmse9kj.js:93976-94148 facade-majority
/**
 * 会话状态函数 isRestrictedWorkspaceTrustKey：涉及当前会话的 host.launchOptions.restrictedWorkspaceRoots。
 */
function isRestrictedWorkspaceTrustKey(trustKey) {
  if (getWorkspaceRestriction()?.gateKeys.includes(trustKey)) return true;
  for (let restriction of currentSession().host.launchOptions.restrictedWorkspaceRoots().values())
    if (restriction.gateKeys.includes(trustKey)) return true;
  return false;
}
//@ chunk-ndmse9kj.js:94148-94213 facade-majority
/**
 * 状态访问器：读取当前会话的 会话标志（sessionFlags） 上的 accountMemoryLaunchMode()。
 */
function getAccountMemoryLaunchMode() {
  return currentSession().sessionFlags.accountMemoryLaunchMode();
}
//@ chunk-ndmse9kj.js:94213-94270 facade-majority
/**
 * 状态访问器：读取当前会话的 会话标志（sessionFlags） 上的 memoryToggledOff()。
 */
function getMemoryToggledOff() {
  return currentSession().sessionFlags.memoryToggledOff();
}
//@ chunk-ndmse9kj.js:94270-94403 facade-majority
/**
 * 设置“记忆已暂停”（/memory 开关），变化时通知订阅者。
 */
function setMemoryToggledOff(pausing) {
  let session = currentSession();
  if (session.sessionFlags.memoryToggledOff() === pausing) return;
  session.sessionFlags.replaceMemoryToggledOff(pausing);
  memoryToggleListeners.of(session).emit(pausing);
}
//@ chunk-ndmse9kj.js:94403-94427 layout
var memoryToggleListeners; // deferred: uses SessionRootSlot (./sessionSlices.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-ndmse9kj.js:94403", () => {
  memoryToggleListeners = new SessionRootSlot(() => createSignal());
});
//@ chunk-ndmse9kj.js:94427-94478 facade-majority
/**
 * 订阅记忆暂停变化。
 */
function onMemoryPauseChange(listener, root = currentSession()) {
  return memoryToggleListeners.of(root).subscribe(listener);
}
//@ chunk-ndmse9kj.js:94478-94544 facade-majority
/**
 * 状态访问器：读取当前会话的 会话标志（sessionFlags） 上的 autoMemoryOffThisSession()。
 */
function getAutoMemoryOffThisSession() {
  return currentSession().sessionFlags.autoMemoryOffThisSession();
}
//@ chunk-ndmse9kj.js:94544-94794 facade-majority
/**
 * 设置本会话关闭自动记忆；账户记忆模式非 off 时同时清除命令导致的暂停。
 */
function setAutoMemoryOffThisSession(off) {
  let session = currentSession();
  if (session.sessionFlags.autoMemoryOffThisSession() === off) return;
  session.sessionFlags.replaceAutoMemoryOffThisSession(off);
  if (session.sessionFlags.accountMemorySessionMode() !== "off")
    session.sessionFlags.replaceMemoryPausedByCommand(false);
  autoMemoryOffListeners.of(session).emit(off);
}
//@ chunk-ndmse9kj.js:94794-94818 layout
var autoMemoryOffListeners; // deferred: uses SessionRootSlot (./sessionSlices.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-ndmse9kj.js:94794", () => {
  autoMemoryOffListeners = new SessionRootSlot(() => createSignal());
});
//@ chunk-ndmse9kj.js:94818-94869 facade-majority
/**
 * 订阅本会话自动记忆开关变化。
 */
function onAutoMemorySessionSwitchChange(listener, root = currentSession()) {
  return autoMemoryOffListeners.of(root).subscribe(listener);
}
//@ chunk-ndmse9kj.js:94869-94930 facade-majority
/**
 * 状态访问器：读取当前会话的 会话标志（sessionFlags） 上的 restoredMemoryPause()。
 */
function getRestoredMemoryPause() {
  return currentSession().sessionFlags.restoredMemoryPause();
}
//@ chunk-ndmse9kj.js:94930-94993 facade-majority
/**
 * 状态访问器：写入当前会话的 会话标志（sessionFlags） 上的 replaceRestoredMemoryPause()。
 */
function setRestoredMemoryPause(paused) {
  currentSession().sessionFlags.replaceRestoredMemoryPause(paused);
}
//@ chunk-ndmse9kj.js:94993-95056 facade-majority
/**
 * 状态访问器：读取当前会话的 会话标志（sessionFlags） 上的 restoredAutoMemoryOff()。
 */
function getRestoredAutoMemoryOff() {
  return currentSession().sessionFlags.restoredAutoMemoryOff();
}
//@ chunk-ndmse9kj.js:95056-95121 facade-majority
/**
 * 状态访问器：写入当前会话的 会话标志（sessionFlags） 上的 replaceRestoredAutoMemoryOff()。
 */
function setRestoredAutoMemoryOff(off) {
  currentSession().sessionFlags.replaceRestoredAutoMemoryOff(off);
}
//@ chunk-ndmse9kj.js:95121-95315 facade-majority
/**
 * 会话状态函数 setWizardOperatorToolsEnabled：涉及当前会话的 host.launchOptions.replaceWizardOperatorToolsEnabled。
 */
function setWizardOperatorToolsEnabled(enabled) {
  if (enabled === false)
    throw Error(
      "setWizardOperatorToolsEnabled(false) is test-only: the wizard latch is one-way in production",
    );
  currentSession().host.launchOptions.replaceWizardOperatorToolsEnabled(enabled);
}
//@ chunk-ndmse9kj.js:95315-95389 facade-majority
/**
 * 状态访问器：读取当前会话的 host（host） → 启动选项（launchOptions） 上的 wizardOperatorToolsEnabled()。
 */
function getWizardOperatorToolsEnabled() {
  return currentSession().host.launchOptions.wizardOperatorToolsEnabled();
}
//@ chunk-ndmse9kj.js:95389-95607 facade-majority
/**
 * runner 声明“嵌套仓库差异”（单向锁存，false 只用于测试）。
 */
function setRunnerDeclaredNestedRepositoryDiff(declared) {
  if (declared === false)
    throw Error(
      "setRunnerDeclaredNestedRepositoryDiff(false) is test-only: the runner's declaration is one-way in production",
    );
  currentSession().host.launchOptions.replaceRunnerDeclaredNestedRepositoryDiff(declared);
}
//@ chunk-ndmse9kj.js:95607-95689 facade-majority
/**
 * 状态访问器：读取当前会话的 host（host） → 启动选项（launchOptions） 上的 runnerDeclaredNestedRepositoryDiff()。
 */
function getRunnerDeclaredNestedRepositoryDiff() {
  return currentSession().host.launchOptions.runnerDeclaredNestedRepositoryDiff();
}
//@ chunk-ndmse9kj.js:95689-95911 facade-majority
/**
 * runner 声明“未检出仓库”（单向锁存）。
 */
function setRunnerDeclaredNoRepositoryCheckedOut(declared) {
  if (declared === false)
    throw Error(
      "setRunnerDeclaredNoRepositoryCheckedOut(false) is test-only: the runner's declaration is one-way in production",
    );
  currentSession().host.launchOptions.replaceRunnerDeclaredNoRepositoryCheckedOut(declared);
}
//@ chunk-ndmse9kj.js:95911-95995 facade-majority
/**
 * 状态访问器：读取当前会话的 host（host） → 启动选项（launchOptions） 上的 runnerDeclaredNoRepositoryCheckedOut()。
 */
function getRunnerDeclaredNoRepositoryCheckedOut() {
  return currentSession().host.launchOptions.runnerDeclaredNoRepositoryCheckedOut();
}
//@ chunk-ndmse9kj.js:95995-96217 facade-majority
/**
 * runner 声明“每会话全新机器”（单向锁存）。
 */
function setRunnerDeclaredFreshMachinePerSession(declared) {
  if (declared === false)
    throw Error(
      "setRunnerDeclaredFreshMachinePerSession(false) is test-only: the runner's declaration is one-way in production",
    );
  currentSession().host.launchOptions.replaceRunnerDeclaredFreshMachinePerSession(declared);
}
//@ chunk-ndmse9kj.js:96217-96281 facade-majority
/**
 * 状态访问器：读取当前会话的 host（host） → 启动选项（launchOptions） 上的 pollEventIngress()。
 */
function getPollEventIngress() {
  return currentSession().host.launchOptions.pollEventIngress();
}
//@ chunk-ndmse9kj.js:96281-96318 facade-majority
/**
 * poll_event 入口是否已接线。
 */
function isPollEventIngressWired() {
  return getPollEventIngress() !== "none";
}
//@ chunk-ndmse9kj.js:96318-96380 layout
/**
 * 状态访问器：调用当前会话的 host（host） → 启动选项（launchOptions） 上的 markPollEventIngress()。
 */
function markPollEventIngress(ownEventsSink) {
  currentSession().host.launchOptions.markPollEventIngress(ownEventsSink);
}
//@ chunk-ndmse9kj.js:96380-96449 layout
/**
 * 状态访问器：调用当前会话的 host（host） → 启动选项（launchOptions） 上的 markOwnEventDeliveryRequested()。
 */
function markOwnEventDeliveryRequested() {
  currentSession().host.launchOptions.markOwnEventDeliveryRequested();
}
//@ chunk-ndmse9kj.js:96449-96558 facade-majority
/**
 * 按本次运行的入口/输入方式决定自有事件的去向（terminal/evals/host）并记录。
 */
function markPollEventWiringForRun(launchOptions) {
  let ownEventsSink = resolveOwnEventsSink(launchOptions);
  if (ownEventsSink !== "none" && !(ownEventsSink === "host" && getPollEventIngress() === "evals"))
    markPollEventIngress(ownEventsSink);
  if (launchOptions.ownEventsRequested) markOwnEventDeliveryRequested();
}
//@ chunk-ndmse9kj.js:96558-96617 facade-majority = getUserMsgOptIn (0.763)
/**
 * 状态访问器：读取当前会话的 host（host） → 启动选项（launchOptions） 上的 userMsgOptIn()。
 */
function getUserMsgOptIn() {
  return currentSession().host.launchOptions.userMsgOptIn();
}
//@ chunk-ndmse9kj.js:96617-96679 facade-majority
/**
 * 状态访问器：写入当前会话的 host（host） → 启动选项（launchOptions） 上的 replaceUserMsgOptIn()。
 */
function setUserMsgOptIn(enabled) {
  currentSession().host.launchOptions.replaceUserMsgOptIn(enabled);
}
//@ chunk-ndmse9kj.js:96679-96743 facade-majority
/**
 * 状态访问器：读取当前会话的 host（host） → 启动选项（launchOptions） 上的 searchToolsOptIn()。
 */
function getSearchToolsOptIn() {
  return currentSession().host.launchOptions.searchToolsOptIn();
}
//@ chunk-ndmse9kj.js:96743-96809 facade-majority
/**
 * 状态访问器：写入当前会话的 host（host） → 启动选项（launchOptions） 上的 replaceSearchToolsOptIn()。
 */
function setSearchToolsOptIn(enabled) {
  currentSession().host.launchOptions.replaceSearchToolsOptIn(enabled);
}
//@ chunk-ndmse9kj.js:96809-96871 facade-majority
/**
 * 状态访问器：读取当前会话的 host（host） → 启动选项（launchOptions） 上的 todoToolsOptIn()。
 */
function getTodoToolsOptIn() {
  return currentSession().host.launchOptions.todoToolsOptIn();
}
//@ chunk-ndmse9kj.js:96871-96935 facade-majority
/**
 * 状态访问器：写入当前会话的 host（host） → 启动选项（launchOptions） 上的 replaceTodoToolsOptIn()。
 */
function setTodoToolsOptIn(enabled) {
  currentSession().host.launchOptions.replaceTodoToolsOptIn(enabled);
}
//@ chunk-ndmse9kj.js:96935-97007 facade-majority
/**
 * 状态访问器：读取当前会话的 host（host） → 启动选项（launchOptions） 上的 toolsOmittedByLaunchList()。
 */
function getToolsOmittedByLaunchList() {
  return currentSession().host.launchOptions.toolsOmittedByLaunchList();
}
//@ chunk-ndmse9kj.js:97007-97090 facade-majority
/**
 * 会话状态函数 setToolsOmittedByLaunchList：涉及当前会话的 host.launchOptions.replaceToolsOmittedByLaunchList。
 */
function setToolsOmittedByLaunchList(toolNames) {
  currentSession().host.launchOptions.replaceToolsOmittedByLaunchList(new Set(toolNames));
}
//@ chunk-ndmse9kj.js:97090-97154 facade-majority
/**
 * 状态访问器：读取当前会话的 host（host） → 启动选项（launchOptions） 上的 sessionStartType()。
 */
function getSessionStartType() {
  return currentSession().host.launchOptions.sessionStartType();
}
//@ chunk-ndmse9kj.js:97154-97220 facade-majority
/**
 * 状态访问器：写入当前会话的 host（host） → 启动选项（launchOptions） 上的 replaceSessionStartType()。
 */
function setSessionStartType(startType) {
  currentSession().host.launchOptions.replaceSessionStartType(startType);
}
//@ chunk-ndmse9kj.js:97220-97289 facade-majority = getQuestionPreviewFormat (0.763)
/**
 * 状态访问器：读取当前会话的 host（host） → 启动选项（launchOptions） 上的 questionPreviewFormat()。
 */
function getQuestionPreviewFormat() {
  return currentSession().host.launchOptions.questionPreviewFormat();
}
//@ chunk-ndmse9kj.js:97289-97360 facade-majority
/**
 * 状态访问器：写入当前会话的 host（host） → 启动选项（launchOptions） 上的 replaceQuestionPreviewFormat()。
 */
function setQuestionPreviewFormat(previewFormat) {
  currentSession().host.launchOptions.replaceQuestionPreviewFormat(previewFormat);
}
//@ chunk-ndmse9kj.js:97360-97432 facade-majority
/**
 * 状态访问器：读取当前会话的 host（host） → 启动选项（launchOptions） 上的 extendedQuestionsEnabled()。
 */
function getExtendedQuestionsEnabled() {
  return currentSession().host.launchOptions.extendedQuestionsEnabled();
}
//@ chunk-ndmse9kj.js:97432-97506 facade-majority
/**
 * 状态访问器：写入当前会话的 host（host） → 启动选项（launchOptions） 上的 replaceExtendedQuestionsEnabled()。
 */
function setExtendedQuestionsEnabled(enabled) {
  currentSession().host.launchOptions.replaceExtendedQuestionsEnabled(enabled);
}
//@ chunk-ndmse9kj.js:97506-97588 facade-majority
/**
 * 状态访问器：读取当前会话的 host（host） → 启动选项（launchOptions） 上的 questionOptionDescriptionsOptional()。
 */
function getQuestionOptionDescriptionsOptional() {
  return currentSession().host.launchOptions.questionOptionDescriptionsOptional();
}
//@ chunk-ndmse9kj.js:97588-97672 facade-majority
/**
 * 状态访问器：写入当前会话的 host（host） → 启动选项（launchOptions） 上的 replaceQuestionOptionDescriptionsOptional()。
 */
function setQuestionOptionDescriptionsOptional(optional) {
  currentSession().host.launchOptions.replaceQuestionOptionDescriptionsOptional(optional);
}
//@ chunk-ndmse9kj.js:97672-97729 facade-majority = getAgentColorMap (0.739)
/**
 * 状态访问器：读取当前会话的 会话暂存（sessionScratch） 上的 agentColorMap()。
 */
function getAgentColorMap() {
  return currentSession().sessionScratch.agentColorMap();
}
//@ chunk-ndmse9kj.js:97729-97793 facade-majority = getFlagSettingsPath (0.725)
/**
 * 状态访问器：读取当前会话的 host（host） → 设置来源（settingsSource） 上的 flagSettingsPath()。
 */
function getFlagSettingsPath() {
  return currentSession().host.settingsSource.flagSettingsPath();
}
//@ chunk-ndmse9kj.js:97793-97860 facade-majority
/**
 * 状态访问器：写入当前会话的 host（host） → 设置来源（settingsSource） 上的 replaceFlagSettingsPath()。
 */
function setFlagSettingsPath(settingsPath) {
  currentSession().host.settingsSource.replaceFlagSettingsPath(settingsPath);
}
//@ chunk-ndmse9kj.js:97860-97928 facade-majority
/**
 * 状态访问器：读取当前会话的 host（host） → 设置来源（settingsSource） 上的 flagAgentsFilePaths()。
 */
function getFlagAgentsFilePaths() {
  return currentSession().host.settingsSource.flagAgentsFilePaths();
}
//@ chunk-ndmse9kj.js:97928-97998 facade-majority
/**
 * 状态访问器：写入当前会话的 host（host） → 设置来源（settingsSource） 上的 replaceFlagAgentsFilePaths()。
 */
function setFlagAgentsFilePaths(paths) {
  currentSession().host.settingsSource.replaceFlagAgentsFilePaths(paths);
}
//@ chunk-ndmse9kj.js:97998-98069 facade-majority
/**
 * 状态访问器：读取当前会话的 host（host） → 设置来源（settingsSource） 上的 flagMcpConfigFilePaths()。
 */
function getFlagMcpConfigFilePaths() {
  return currentSession().host.settingsSource.flagMcpConfigFilePaths();
}
//@ chunk-ndmse9kj.js:98069-98142 facade-majority
/**
 * 状态访问器：写入当前会话的 host（host） → 设置来源（settingsSource） 上的 replaceFlagMcpConfigFilePaths()。
 */
function setFlagMcpConfigFilePaths(paths) {
  currentSession().host.settingsSource.replaceFlagMcpConfigFilePaths(paths);
}
//@ chunk-ndmse9kj.js:98142-98217 facade-majority
/**
 * 状态访问器：读取当前会话的 host（host） → 设置来源（settingsSource） 上的 flagSettingsExpectedContent()。
 */
function getFlagSettingsExpectedContent() {
  return currentSession().host.settingsSource.flagSettingsExpectedContent();
}
//@ chunk-ndmse9kj.js:98217-98295 facade-majority
/**
 * 状态访问器：写入当前会话的 host（host） → 设置来源（settingsSource） 上的 replaceFlagSettingsExpectedContent()。
 */
function setFlagSettingsExpectedContent(content) {
  currentSession().host.settingsSource.replaceFlagSettingsExpectedContent(content);
}
//@ chunk-ndmse9kj.js:98295-98372 facade-majority
/**
 * 状态访问器：读取当前会话的 host（host） → 设置来源（settingsSource） 上的 flagSettingsFilePinnedContent()。
 */
function getFlagSettingsFilePinnedContent() {
  return currentSession().host.settingsSource.flagSettingsFilePinnedContent();
}
//@ chunk-ndmse9kj.js:98372-98452 facade-majority
/**
 * 状态访问器：写入当前会话的 host（host） → 设置来源（settingsSource） 上的 replaceFlagSettingsFilePinnedContent()。
 */
function setFlagSettingsFilePinnedContent(content) {
  currentSession().host.settingsSource.replaceFlagSettingsFilePinnedContent(content);
}
//@ chunk-ndmse9kj.js:98452-98518 facade-majority = getFlagSettingsInline (0.719)
/**
 * 状态访问器：读取当前会话的 host（host） → 设置来源（settingsSource） 上的 flagSettingsInline()。
 */
function getFlagSettingsInline() {
  return currentSession().host.settingsSource.flagSettingsInline();
}
//@ chunk-ndmse9kj.js:98518-98586 facade-majority
/**
 * 状态访问器：写入当前会话的 host（host） → 设置来源（settingsSource） 上的 replaceFlagSettingsInline()。
 */
function setFlagSettingsInline(settings) {
  currentSession().host.settingsSource.replaceFlagSettingsInline(settings);
}
//@ chunk-ndmse9kj.js:98586-98656 facade-majority
/**
 * 状态访问器：读取当前会话的 host（host） → 设置来源（settingsSource） 上的 parentManagedSettings()。
 */
function getParentManagedSettings() {
  return currentSession().host.settingsSource.parentManagedSettings();
}
//@ chunk-ndmse9kj.js:98656-98737 facade-majority
/**
 * 状态访问器：写入当前会话的 host（host） → 设置来源（settingsSource） 上的 replaceParentManagedSettings()。
 */
function setParentManagedSettings(tier, organization = null) {
  currentSession().host.settingsSource.replaceParentManagedSettings(tier, organization);
}
//@ chunk-ndmse9kj.js:98737-98814 facade-majority
/**
 * 状态访问器：读取当前会话的 host（host） → 设置来源（settingsSource） 上的 parentManagedSettingsInvalid()。
 */
function getParentManagedSettingsInvalid() {
  return currentSession().host.settingsSource.parentManagedSettingsInvalid();
}
//@ chunk-ndmse9kj.js:98814-98893 facade-majority
/**
 * 状态访问器：写入当前会话的 host（host） → 设置来源（settingsSource） 上的 replaceParentManagedSettingsInvalid()。
 */
function setParentManagedSettingsInvalid(invalid) {
  currentSession().host.settingsSource.replaceParentManagedSettingsInvalid(invalid);
}
//@ chunk-ndmse9kj.js:98893-98968 facade-majority
/**
 * 状态访问器：读取当前会话的 host（host） → 设置来源（settingsSource） 上的 parentOrganizationSettings()。
 */
function getParentOrganizationSettings() {
  return currentSession().host.settingsSource.parentOrganizationSettings();
}
//@ chunk-ndmse9kj.js:98968-99079 facade-majority = getSessionIngressToken (0.53)
/**
 * 会话状态函数 getSessionIngressToken：涉及当前会话的 host.credentialSlots.sessionIngressToken。
 */
function getSessionIngressToken() {
  let context = agentContextGetter();
  return context
    ? context.secrets.sessionIngressToken
    : currentSession().host.credentialSlots.sessionIngressToken();
}
//@ chunk-ndmse9kj.js:99079-99202 facade-majority = setSessionIngressToken (0.411)
/**
 * 会话状态函数 setSessionIngressToken：涉及当前会话的 host.credentialSlots.replaceSessionIngressToken。
 */
function setSessionIngressToken(token) {
  let context = agentContextGetter();
  if (context) context.secrets.sessionIngressToken = token;
  else currentSession().host.credentialSlots.replaceSessionIngressToken(token);
}
//@ chunk-ndmse9kj.js:99202-99267 facade-majority = getOauthTokenFromFd (0.739)
/**
 * 状态访问器：读取当前会话的 host（host） → 凭证槽（credentialSlots） 上的 oauthTokenFromFd()。
 */
function getOauthTokenFromFd() {
  return currentSession().host.credentialSlots.oauthTokenFromFd();
}
//@ chunk-ndmse9kj.js:99267-99334 facade-majority
/**
 * 状态访问器：写入当前会话的 host（host） → 凭证槽（credentialSlots） 上的 replaceOauthTokenFromFd()。
 */
function setOauthTokenFromFd(token) {
  currentSession().host.credentialSlots.replaceOauthTokenFromFd(token);
}
//@ chunk-ndmse9kj.js:99334-99407 facade-majority
/**
 * 状态访问器：读取当前会话的 host（host） → 凭证槽（credentialSlots） 上的 oauthTokenFromBgSnapshot()。
 */
function isOauthTokenFromBgSnapshot() {
  return currentSession().host.credentialSlots.oauthTokenFromBgSnapshot();
}
//@ chunk-ndmse9kj.js:99407-99483 facade-majority
/**
 * 状态访问器：写入当前会话的 host（host） → 凭证槽（credentialSlots） 上的 replaceOauthTokenFromBgSnapshot()。
 */
function setOauthTokenFromBgSnapshot(token) {
  currentSession().host.credentialSlots.replaceOauthTokenFromBgSnapshot(token);
}
//@ chunk-ndmse9kj.js:99483-99556 facade-majority
/**
 * 状态访问器：读取当前会话的 host（host） → 凭证槽（credentialSlots） 上的 loginStashedInTokenSlot()。
 */
function getLoginStashedInTokenSlot() {
  return currentSession().host.credentialSlots.loginStashedInTokenSlot();
}
//@ chunk-ndmse9kj.js:99556-99631 facade-majority
/**
 * 状态访问器：写入当前会话的 host（host） → 凭证槽（credentialSlots） 上的 replaceLoginStashedInTokenSlot()。
 */
function setLoginStashedInTokenSlot(value) {
  currentSession().host.credentialSlots.replaceLoginStashedInTokenSlot(value);
}
//@ chunk-ndmse9kj.js:99631-99703 facade-majority
/**
 * 状态访问器：读取当前会话的 host（host） → 凭证槽（credentialSlots） 上的 oauthOrgFromBgSnapshot()。
 */
function getOauthOrgFromBgSnapshot() {
  return currentSession().host.credentialSlots.oauthOrgFromBgSnapshot();
}
//@ chunk-ndmse9kj.js:99703-99777 facade-majority
/**
 * 状态访问器：写入当前会话的 host（host） → 凭证槽（credentialSlots） 上的 replaceOauthOrgFromBgSnapshot()。
 */
function setOauthOrgFromBgSnapshot(org) {
  currentSession().host.credentialSlots.replaceOauthOrgFromBgSnapshot(org);
}
//@ chunk-ndmse9kj.js:99777-99844 facade-majority
/**
 * 状态访问器：读取当前会话的 host（host） → 凭证槽（credentialSlots） 上的 oauthScopesFromFd()。
 */
function getOauthScopesFromFd() {
  return currentSession().host.credentialSlots.oauthScopesFromFd();
}
//@ chunk-ndmse9kj.js:99844-99913 facade-majority
/**
 * 状态访问器：写入当前会话的 host（host） → 凭证槽（credentialSlots） 上的 replaceOauthScopesFromFd()。
 */
function setOauthScopesFromFd(scopes) {
  currentSession().host.credentialSlots.replaceOauthScopesFromFd(scopes);
}
//@ chunk-ndmse9kj.js:99913-99975 facade-majority = getApiKeyFromFd (0.739)
/**
 * 状态访问器：读取当前会话的 host（host） → 凭证槽（credentialSlots） 上的 apiKeyFromFd()。
 */
function getApiKeyFromFd() {
  return currentSession().host.credentialSlots.apiKeyFromFd();
}
//@ chunk-ndmse9kj.js:99975-100039 facade-majority
/**
 * 状态访问器：写入当前会话的 host（host） → 凭证槽（credentialSlots） 上的 replaceApiKeyFromFd()。
 */
function setApiKeyFromFd(apiKey) {
  currentSession().host.credentialSlots.replaceApiKeyFromFd(apiKey);
}
//@ chunk-ndmse9kj.js:100039-100121 facade-majority
/**
 * 状态访问器：调用当前会话的 host（host） → 凭证槽（credentialSlots） 上的 descriptorAnnouncementConsumed()。
 */
function wasDescriptorAnnouncementConsumed(key) {
  return currentSession().host.credentialSlots.descriptorAnnouncementConsumed(key);
}
//@ chunk-ndmse9kj.js:100121-100200 facade-majority
/**
 * 状态访问器：调用当前会话的 host（host） → 凭证槽（credentialSlots） 上的 markDescriptorAnnouncementConsumed()。
 */
function markDescriptorAnnouncementConsumed(envVar) {
  currentSession().host.credentialSlots.markDescriptorAnnouncementConsumed(envVar);
}
//@ chunk-ndmse9kj.js:100200-100266 facade-majority
/**
 * 状态访问器：调用当前会话的 host（host） → 凭证槽（credentialSlots） 上的 credentialRoad()。
 */
function getCredentialRoad(envVar) {
  return currentSession().host.credentialSlots.credentialRoad(envVar);
}
//@ chunk-ndmse9kj.js:100266-100337 facade-majority
/**
 * 状态访问器：调用当前会话的 host（host） → 凭证槽（credentialSlots） 上的 noteCredentialRoad()。
 */
function noteCredentialRoad(envVar, road, details) {
  currentSession().host.credentialSlots.noteCredentialRoad(envVar, road, details);
}
//@ chunk-ndmse9kj.js:100337-100413 facade-majority
/**
 * 状态访问器：读取当前会话的 host（host） → 凭证槽（credentialSlots） 上的 gatewayTokenFromDescriptor()。
 */
function getGatewayTokenFromDescriptor() {
  return currentSession().host.credentialSlots.gatewayTokenFromDescriptor();
}
//@ chunk-ndmse9kj.js:100413-100491 facade-majority
/**
 * 状态访问器：写入当前会话的 host（host） → 凭证槽（credentialSlots） 上的 replaceGatewayTokenFromDescriptor()。
 */
function setGatewayTokenFromDescriptor(credentialDescriptor) {
  currentSession().host.credentialSlots.replaceGatewayTokenFromDescriptor(credentialDescriptor);
}
//@ chunk-ndmse9kj.js:100491-100556 facade-majority
/**
 * 状态访问器：调用当前会话的 host（host） → 凭证槽（credentialSlots） 上的 resetFdCredentialState()。
 */
function resetFdCredentialState() {
  currentSession().host.credentialSlots.resetFdCredentialState();
}
//@ chunk-ndmse9kj.js:100556-100616 facade-majority
/**
 * 状态访问器：读取当前会话的 host（host） → 凭证槽（credentialSlots） 上的 gatewayAuth()。
 */
function getGatewayAuth() {
  return currentSession().host.credentialSlots.gatewayAuth();
}
//@ chunk-ndmse9kj.js:100616-100711 facade-majority
/**
 * 会话状态函数 isGatewayAuthExpired：涉及当前会话的 host.credentialSlots.gatewayAuth。
 */
function isGatewayAuthExpired() {
  let auth = currentSession().host.credentialSlots.gatewayAuth();
  return !!auth && auth.expiresAt <= Date.now();
}
//@ chunk-ndmse9kj.js:100711-100749 facade-majority
/**
 * 网关认证是否已固定（非 unpinned）。
 */
function isGatewayAuthPinned(auth) {
  return !!auth && !auth.unpinned;
}
//@ chunk-ndmse9kj.js:100749-100832 facade-majority
/**
 * 网关认证是否经宿主验证。
 */
function isHostVerifiedGatewayAuth(gatewayAuth) {
  let hostVerdict = gatewayAuth?.hostVerdict;
  return hostVerdict !== undefined && "verified" in hostVerdict && hostVerdict.verified;
}
//@ chunk-ndmse9kj.js:100832-100869 facade-majority
/**
 * 网关是否提供托管设置（固定或经验证）。
 */
function gatewayServesManagedSettings(gatewayAuth) {
  return isGatewayAuthPinned(gatewayAuth) || isHostVerifiedGatewayAuth(gatewayAuth);
}
//@ chunk-ndmse9kj.js:100869-100941 facade-majority
/**
 * 状态访问器：写入当前会话的 host（host） → 凭证槽（credentialSlots） 上的 replaceGatewayServerProcess()。
 */
function setGatewayServerProcess(gatewayServerProcess) {
  currentSession().host.credentialSlots.replaceGatewayServerProcess(gatewayServerProcess);
}
//@ chunk-ndmse9kj.js:100941-101011 facade-majority
/**
 * 状态访问器：读取当前会话的 host（host） → 凭证槽（credentialSlots） 上的 gatewayServerProcess()。
 */
function isGatewayServerProcess() {
  return currentSession().host.credentialSlots.gatewayServerProcess();
}
//@ chunk-ndmse9kj.js:101011-101096 facade-majority
/**
 * 状态访问器：写入当前会话的 host（host） → 凭证槽（credentialSlots） 上的 replaceGatewayRequiredByHostPolicyReader()。
 */
function setGatewayRequiredByHostPolicyReader(withoutHostManagedProviderVars) {
  currentSession().host.credentialSlots.replaceGatewayRequiredByHostPolicyReader(
    withoutHostManagedProviderVars,
  );
}
//@ chunk-ndmse9kj.js:101096-101173 facade-majority
/**
 * 状态访问器：读取当前会话的 host（host） → 凭证槽（credentialSlots） 上的 gatewayRequiredByHostPolicy()。
 */
function isGatewayRequiredByHostPolicy() {
  return currentSession().host.credentialSlots.gatewayRequiredByHostPolicy();
}
//@ chunk-ndmse9kj.js:101173-101236 facade-majority
/**
 * 状态访问器：写入当前会话的 host（host） → 凭证槽（credentialSlots） 上的 replaceGatewayAuth()。
 */
function setGatewayAuth(auth) {
  currentSession().host.credentialSlots.replaceGatewayAuth(auth);
}
//@ chunk-ndmse9kj.js:101236-101311 facade-majority
/**
 * 状态访问器：调用当前会话的 host（host） → 凭证槽（credentialSlots） 上的 isGatewayHostHeldStrict()。
 */
function isGatewayHostHeldStrict(host) {
  return currentSession().host.credentialSlots.isGatewayHostHeldStrict(host);
}
//@ chunk-ndmse9kj.js:101311-101395 facade-majority
/**
 * 会话状态函数 holdGatewayHostStrict：涉及当前会话的 host.credentialSlots.holdGatewayHostStrict。
 */
function holdGatewayHostStrict(host) {
  currentSession().host.credentialSlots.holdGatewayHostStrict(host.replace(/\.$/, ""));
}
//@ chunk-ndmse9kj.js:101395-101476 facade-majority
/**
 * 会话状态函数 releaseGatewayHost：涉及当前会话的 host.credentialSlots.releaseGatewayHost。
 */
function releaseGatewayHost(host) {
  currentSession().host.credentialSlots.releaseGatewayHost(host.replace(/\.$/, ""));
}
//@ chunk-ndmse9kj.js:101476-101546 facade-majority
/**
 * 状态访问器：读取当前会话的 host（host） → 凭证槽（credentialSlots） 上的 authenticatedAccount()。
 */
function getAuthenticatedAccount() {
  return currentSession().host.credentialSlots.authenticatedAccount();
}
//@ chunk-ndmse9kj.js:101546-101616 facade-majority
/**
 * 状态访问器：调用当前会话的 host（host） → 凭证槽（credentialSlots） 上的 stampAuthenticatedAccount()。
 */
function setAuthenticatedAccount(account) {
  currentSession().host.credentialSlots.stampAuthenticatedAccount(account);
}
//@ chunk-ndmse9kj.js:101616-101691 facade-majority
/**
 * 状态访问器：读取当前会话的 host（host） → 凭证槽（credentialSlots） 上的 authenticatedAccountEpoch()。
 */
function getAuthenticatedAccountEpoch() {
  return currentSession().host.credentialSlots.authenticatedAccountEpoch();
}
//@ chunk-ndmse9kj.js:101691-101751 facade-majority
/**
 * 状态访问器：读取当前会话的 host（host） → 凭证槽（credentialSlots） 上的 bearerPlan()。
 */
function getBearerPlan() {
  return currentSession().host.credentialSlots.bearerPlan();
}
//@ chunk-ndmse9kj.js:101751-101813 facade-majority
/**
 * 状态访问器：写入当前会话的 host（host） → 凭证槽（credentialSlots） 上的 replaceBearerPlan()。
 */
function setBearerPlan(plan) {
  currentSession().host.credentialSlots.replaceBearerPlan(plan);
}
//@ chunk-ndmse9kj.js:101813-101884 facade-majority
/**
 * 状态访问器：读取当前会话的 host（host） → 凭证槽（credentialSlots） 上的 startupPolicySnapshot()。
 */
function getStartupPolicySnapshot() {
  return currentSession().host.credentialSlots.startupPolicySnapshot();
}
//@ chunk-ndmse9kj.js:101884-101957 facade-majority
/**
 * 状态访问器：写入当前会话的 host（host） → 凭证槽（credentialSlots） 上的 replaceStartupPolicySnapshot()。
 */
function setStartupPolicySnapshot(snapshot) {
  currentSession().host.credentialSlots.replaceStartupPolicySnapshot(snapshot);
}
//@ chunk-ndmse9kj.js:101957-102029 facade-majority
/**
 * 状态访问器：读取当前会话的 host（host） → 凭证槽（credentialSlots） 上的 gatewayRefreshInFlight()。
 */
function getGatewayRefreshInFlight() {
  return currentSession().host.credentialSlots.gatewayRefreshInFlight();
}
//@ chunk-ndmse9kj.js:102029-102103 facade-majority
/**
 * 状态访问器：写入当前会话的 host（host） → 凭证槽（credentialSlots） 上的 replaceGatewayRefreshInFlight()。
 */
function setGatewayRefreshInFlight(inFlight) {
  currentSession().host.credentialSlots.replaceGatewayRefreshInFlight(inFlight);
}
//@ chunk-ndmse9kj.js:102103-102163 facade-majority
/**
 * 状态访问器：写入当前会话的 请求日志（requestJournal） 上的 replaceLastAPIRequest()。
 */
function setLastAPIRequest(request) {
  currentSession().requestJournal.replaceLastAPIRequest(request);
}
//@ chunk-ndmse9kj.js:102163-102221 facade-majority = setLastAPIRequest (0.736)
/**
 * 状态访问器：读取当前会话的 请求日志（requestJournal） 上的 lastAPIRequest()。
 */
function getLastAPIRequest() {
  return currentSession().requestJournal.lastAPIRequest();
}
//@ chunk-ndmse9kj.js:102221-102292 facade-majority
/**
 * 状态访问器：写入当前会话的 请求日志（requestJournal） 上的 replaceLastCancelledAPIMessageId()。
 */
function setLastCancelledAPIMessageId(inFlightMessageId) {
  currentSession().requestJournal.replaceLastCancelledAPIMessageId(inFlightMessageId);
}
//@ chunk-ndmse9kj.js:102292-102361 facade-majority
/**
 * 状态访问器：读取当前会话的 请求日志（requestJournal） 上的 lastCancelledAPIMessageId()。
 */
function getLastCancelledAPIMessageId() {
  return currentSession().requestJournal.lastCancelledAPIMessageId();
}
//@ chunk-ndmse9kj.js:102361-102429 facade-majority
/**
 * 状态访问器：写入当前会话的 请求日志（requestJournal） 上的 replaceLastAPIRequestMessages()。
 */
function setLastAPIRequestMessages(messages) {
  currentSession().requestJournal.replaceLastAPIRequestMessages(messages);
}
//@ chunk-ndmse9kj.js:102429-102497 facade-majority
/**
 * 状态访问器：写入当前会话的 请求日志（requestJournal） 上的 replaceLastClassifierRequests()。
 */
function setLastClassifierRequests(requests) {
  currentSession().requestJournal.replaceLastClassifierRequests(requests);
}
//@ chunk-ndmse9kj.js:102497-102563 facade-majority = setLastClassifierRequests (0.736)
/**
 * 状态访问器：读取当前会话的 请求日志（requestJournal） 上的 lastClassifierRequests()。
 */
function getLastClassifierRequests() {
  return currentSession().requestJournal.lastClassifierRequests();
}
//@ chunk-ndmse9kj.js:102563-102674 facade-majority
/**
 * 会话状态函数 setCachedClaudeMdContent：涉及当前会话的 sessionFlags.replaceCachedClaudeMdContent。
 */
function setCachedClaudeMdContent(claudeMd) {
  let agentContext = getAgentContext();
  if (agentContext) agentContext.cachedClaudeMdContent = claudeMd;
  else currentSession().sessionFlags.replaceCachedClaudeMdContent(claudeMd);
}
//@ chunk-ndmse9kj.js:102674-102773 facade-majority = setCachedClaudeMdContent (0.74)
/**
 * 会话状态函数 getCachedClaudeMdContent：涉及当前会话的 sessionFlags.cachedClaudeMdContent。
 */
function getCachedClaudeMdContent() {
  let agentContext = getAgentContext();
  return agentContext
    ? agentContext.cachedClaudeMdContent
    : currentSession().sessionFlags.cachedClaudeMdContent();
}
//@ chunk-ndmse9kj.js:102773-102958 facade-majority
/**
 * getAllowedSettingSources：受限工作区时去掉仓库目录下的设置来源。
 */
function getAllowedSettingSources() {
  let { settingsSource, launchOptions } = currentSession().host;
  return launchOptions.workspaceRestrictionState()?.restriction
    ? settingsSource.allowedSettingSourcesWithoutRepoDirSources()
    : settingsSource.allowedSettingSources();
}
//@ chunk-ndmse9kj.js:102958-103028 facade-majority = getAllowedSettingSources (0.725)
/**
 * 状态访问器：读取当前会话的 host（host） → 设置来源（settingsSource） 上的 allowedSettingSources()。
 */
function getAllowedSettingSourcesAsConfigured() {
  return currentSession().host.settingsSource.allowedSettingSources();
}
//@ chunk-ndmse9kj.js:103028-103100 facade-majority
/**
 * 状态访问器：写入当前会话的 host（host） → 设置来源（settingsSource） 上的 replaceAllowedSettingSources()。
 */
function setAllowedSettingSources(sources) {
  currentSession().host.settingsSource.replaceAllowedSettingSources(sources);
}
//@ chunk-ndmse9kj.js:103100-103182 facade-majority = preferThirdPartyAuthentication (0.88)
/**
 * 会话状态函数 preferThirdPartyAuthentication：涉及当前会话的 host.launchOptions.clientType。
 */
function preferThirdPartyAuthentication() {
  return getIsNonInteractiveSession() && currentSession().host.launchOptions.clientType() !== "claude-vscode";
}
//@ chunk-ndmse9kj.js:103182-103247 facade-majority
/**
 * 状态访问器：写入当前会话的 host（host） → 扩展配置（extensionsConfig） 上的 replaceInlinePlugins()。
 */
function setInlinePlugins(plugins) {
  currentSession().host.extensionsConfig.replaceInlinePlugins(plugins);
}
//@ chunk-ndmse9kj.js:103247-103310 facade-majority = setInlinePlugins (0.729)
/**
 * 状态访问器：读取当前会话的 host（host） → 扩展配置（extensionsConfig） 上的 inlinePlugins()。
 */
function getInlinePlugins() {
  return currentSession().host.extensionsConfig.inlinePlugins();
}
//@ chunk-ndmse9kj.js:103310-103381 facade-majority
/**
 * 状态访问器：写入当前会话的 host（host） → 扩展配置（extensionsConfig） 上的 replaceInlinePluginsNoMcp()。
 */
function setInlinePluginsNoMcp(plugins) {
  currentSession().host.extensionsConfig.replaceInlinePluginsNoMcp(plugins);
}
//@ chunk-ndmse9kj.js:103381-103449 facade-majority
/**
 * 状态访问器：读取当前会话的 host（host） → 扩展配置（extensionsConfig） 上的 inlinePluginsNoMcp()。
 */
function getInlinePluginsNoMcp() {
  return currentSession().host.extensionsConfig.inlinePluginsNoMcp();
}
//@ chunk-ndmse9kj.js:103449-103518 facade-majority
/**
 * 状态访问器：写入当前会话的 host（host） → 扩展配置（extensionsConfig） 上的 replaceInlinePluginUrls()。
 */
function setInlinePluginUrls(urls) {
  currentSession().host.extensionsConfig.replaceInlinePluginUrls(urls);
}
//@ chunk-ndmse9kj.js:103518-103585 facade-majority
/**
 * 状态访问器：读取当前会话的 host（host） → 扩展配置（extensionsConfig） 上的 inlinePluginUrls()。
 */
function getInlinePluginUrls() {
  return currentSession().host.extensionsConfig.inlinePluginUrls();
}
//@ chunk-ndmse9kj.js:103585-103662 facade-majority
/**
 * 状态访问器：写入当前会话的 host（host） → 扩展配置（extensionsConfig） 上的 replaceSyncedPluginDirs()。
 */
function setSyncedPluginDirs(dirs, accountId, rowId) {
  currentSession().host.extensionsConfig.replaceSyncedPluginDirs(dirs, accountId, rowId);
}
//@ chunk-ndmse9kj.js:103662-103732 facade-majority
/**
 * 状态访问器：调用当前会话的 host（host） → 扩展配置（extensionsConfig） 上的 syncedPluginRowId()。
 */
function getSyncedPluginRowId(dir) {
  return currentSession().host.extensionsConfig.syncedPluginRowId(dir);
}
//@ chunk-ndmse9kj.js:103732-103808 facade-majority
/**
 * 状态访问器：调用当前会话的 host（host） → 扩展配置（extensionsConfig） 上的 syncedPluginAttestation()。
 */
function getSyncedPluginAttestation(dir) {
  return currentSession().host.extensionsConfig.syncedPluginAttestation(dir);
}
//@ chunk-ndmse9kj.js:103808-103886 facade-majority
/**
 * 状态访问器：写入当前会话的 host（host） → 扩展配置（extensionsConfig） 上的 replaceAttestedOfficialPluginIds()。
 */
function setAttestedOfficialPluginIds(officialAttestations) {
  currentSession().host.extensionsConfig.replaceAttestedOfficialPluginIds(officialAttestations);
}
//@ chunk-ndmse9kj.js:103886-103972 facade-majority
/**
 * 状态访问器：调用当前会话的 host（host） → 扩展配置（extensionsConfig） 上的 attestedOfficialPluginMarketplace()。
 */
function getAttestedOfficialPluginMarketplace(rowId) {
  return currentSession().host.extensionsConfig.attestedOfficialPluginMarketplace(rowId);
}
//@ chunk-ndmse9kj.js:103972-104049 facade-majority
/**
 * 状态访问器：读取当前会话的 host（host） → 扩展配置（extensionsConfig） 上的 syncedPluginDirsRegistered()。
 */
function hasRegisteredSyncedPluginDirs() {
  return currentSession().host.extensionsConfig.syncedPluginDirsRegistered();
}
//@ chunk-ndmse9kj.js:104049-104104 facade-majority
/**
 * 会话状态函数 hasSyncedPluginLaneOpened：涉及当前会话的 pluginsSync.syncedLaneOpened。
 */
function hasSyncedPluginLaneOpened() {
  return currentSession().pluginsSync.syncedLaneOpened;
}
//@ chunk-ndmse9kj.js:104104-104155 facade-majority
/**
 * 会话状态函数 markSyncedPluginLaneOpened：涉及当前会话的 pluginsSync.syncedLaneOpened。
 */
function markSyncedPluginLaneOpened() {
  currentSession().pluginsSync.syncedLaneOpened = true;
}
//@ chunk-ndmse9kj.js:104155-104233 facade-majority
/**
 * 会话状态函数 markSyncedPluginDirsLoadedHere：涉及当前会话的 pluginsSync.syncedDirsLoadedHere.add。
 */
function markSyncedPluginDirsLoadedHere(dirs) {
  for (let dir of dirs) currentSession().pluginsSync.syncedDirsLoadedHere.add(resolve(dir));
}
//@ chunk-ndmse9kj.js:104233-104303 facade-majority
/**
 * 会话状态函数 isSyncedPluginDirLoadedHere：涉及当前会话的 pluginsSync.syncedDirsLoadedHere.has。
 */
function isSyncedPluginDirLoadedHere(dir) {
  return currentSession().pluginsSync.syncedDirsLoadedHere.has(resolve(dir));
}
//@ chunk-ndmse9kj.js:104303-104357 facade-majority
/**
 * 会话状态函数 markSyncedPluginDirNewHere：涉及当前会话的 pluginsSync.dirsNewHere.add。
 */
function markSyncedPluginDirNewHere(dir) {
  currentSession().pluginsSync.dirsNewHere.add(resolve(dir));
}
//@ chunk-ndmse9kj.js:104357-104406 facade-majority
/**
 * 会话状态函数 setAwaitsFirstRun：涉及当前会话的 pluginsSync.awaitsFirstRun。
 */
function setAwaitsFirstRun(awaitsFirstRun) {
  currentSession().pluginsSync.awaitsFirstRun = awaitsFirstRun;
}
//@ chunk-ndmse9kj.js:104406-104496 facade-majority
/**
 * 会话状态函数 isSyncedPluginDirUnused：涉及当前会话的 pluginsSync。
 */
function isSyncedPluginDirUnused(pluginRoot) {
  let { awaitsFirstRun, dirsNewHere } = currentSession().pluginsSync;
  return awaitsFirstRun && dirsNewHere.has(resolve(pluginRoot));
}
//@ chunk-ndmse9kj.js:104496-104533 facade-majority
/**
 * 会话状态函数 getSyncedPluginReloadDebt：涉及当前会话的 pluginsSync。
 */
function getSyncedPluginReloadDebt() {
  return currentSession().pluginsSync;
}
//@ chunk-ndmse9kj.js:104533-104588 facade-majority
/**
 * 会话状态函数 getLastCompleteSyncedPluginList：涉及当前会话的 pluginsSync.lastCompleteList。
 */
function getLastCompleteSyncedPluginList() {
  return currentSession().pluginsSync.lastCompleteList;
}
//@ chunk-ndmse9kj.js:104588-104645 facade-majority
/**
 * 会话状态函数 getLastSyncedLaneLoad：涉及当前会话的 pluginsSync.lastSyncedLaneLoad。
 */
function getLastSyncedLaneLoad() {
  return currentSession().pluginsSync.lastSyncedLaneLoad;
}
//@ chunk-ndmse9kj.js:104645-104698 facade-majority
/**
 * 会话状态函数 setLastSyncedLaneLoad：涉及当前会话的 pluginsSync.lastSyncedLaneLoad。
 */
function setLastSyncedLaneLoad(lastSyncedLaneLoad) {
  currentSession().pluginsSync.lastSyncedLaneLoad = lastSyncedLaneLoad;
}
//@ chunk-ndmse9kj.js:104698-104965 facade-majority
/**
 * 清除同步插件目录与插件同步状态。
 */
function clearSyncedPluginDirs() {
  currentSession().host.extensionsConfig.clearSyncedPluginDirs();
  currentSession().pluginsSync.syncedLaneOpened = false;
  currentSession().pluginsSync.syncedDirsLoadedHere.clear();
  currentSession().pluginsSync.dirsNewHere.clear();
  currentSession().pluginsSync.removalsDeferredHere.clear();
  currentSession().pluginsSync.lastSyncedLaneLoad = null;
}
//@ chunk-ndmse9kj.js:104965-105031 facade-majority
/**
 * 状态访问器：读取当前会话的 host（host） → 扩展配置（extensionsConfig） 上的 syncedPluginDirs()。
 */
function getSyncedPluginDirs() {
  return currentSession().host.extensionsConfig.syncedPluginDirs();
}
//@ chunk-ndmse9kj.js:105031-105099 facade-majority
/**
 * 状态访问器：写入当前会话的 会话标志（sessionFlags） 上的 replaceAccountSkillsSyncEnabled()。
 */
function setAccountSkillsSyncEnabled(enabled) {
  currentSession().sessionFlags.replaceAccountSkillsSyncEnabled(enabled);
}
//@ chunk-ndmse9kj.js:105099-105165 facade-majority
/**
 * 状态访问器：读取当前会话的 会话标志（sessionFlags） 上的 accountSkillsSyncEnabled()。
 */
function getAccountSkillsSyncEnabled() {
  return currentSession().sessionFlags.accountSkillsSyncEnabled();
}
//@ chunk-ndmse9kj.js:105165-105225 facade-majority
/**
 * 状态访问器：写入当前会话的 会话标志（sessionFlags） 上的 replaceSkillsSyncVetoed()。
 */
function setSkillsSyncVetoed(vetoed) {
  currentSession().sessionFlags.replaceSkillsSyncVetoed(vetoed);
}
//@ chunk-ndmse9kj.js:105225-105282 facade-majority
/**
 * 状态访问器：读取当前会话的 会话标志（sessionFlags） 上的 skillsSyncVetoed()。
 */
function getSkillsSyncVetoed() {
  return currentSession().sessionFlags.skillsSyncVetoed();
}
//@ chunk-ndmse9kj.js:105282-105351 facade-majority
/**
 * 状态访问器：写入当前会话的 会话标志（sessionFlags） 上的 replaceAccountPluginsSyncEnabled()。
 */
function setAccountPluginsSyncEnabled(enabled) {
  currentSession().sessionFlags.replaceAccountPluginsSyncEnabled(enabled);
}
//@ chunk-ndmse9kj.js:105351-105418 facade-majority
/**
 * 状态访问器：读取当前会话的 会话标志（sessionFlags） 上的 accountPluginsSyncEnabled()。
 */
function getAccountPluginsSyncEnabled() {
  return currentSession().sessionFlags.accountPluginsSyncEnabled();
}
//@ chunk-ndmse9kj.js:105418-105479 facade-majority
/**
 * 状态访问器：写入当前会话的 会话标志（sessionFlags） 上的 replacePluginsSyncVetoed()。
 */
function setPluginsSyncVetoed(vetoed) {
  currentSession().sessionFlags.replacePluginsSyncVetoed(vetoed);
}
//@ chunk-ndmse9kj.js:105479-105537 facade-majority
/**
 * 状态访问器：读取当前会话的 会话标志（sessionFlags） 上的 pluginsSyncVetoed()。
 */
function getPluginsSyncVetoed() {
  return currentSession().sessionFlags.pluginsSyncVetoed();
}
//@ chunk-ndmse9kj.js:105537-105608 facade-majority
/**
 * 状态访问器：写入当前会话的 host（host） → 扩展配置（extensionsConfig） 上的 replaceChromeFlagOverride()。
 */
function setChromeFlagOverride(chrome) {
  currentSession().host.extensionsConfig.replaceChromeFlagOverride(chrome);
}
//@ chunk-ndmse9kj.js:105608-105677 facade-majority = setChromeFlagOverride (0.729)
/**
 * 状态访问器：读取当前会话的 host（host） → 扩展配置（extensionsConfig） 上的 chromeFlagOverride()。
 */
function getChromeFlagOverride() {
  return currentSession().host.extensionsConfig.chromeFlagOverride();
}
//@ chunk-ndmse9kj.js:105677-105745 facade-majority
/**
 * 状态访问器：写入当前会话的 host（host） → 扩展配置（extensionsConfig） 上的 replaceTeammateAgentId()。
 */
function setTeammateAgentId(agentId) {
  currentSession().host.extensionsConfig.replaceTeammateAgentId(agentId);
}
//@ chunk-ndmse9kj.js:105745-105810 facade-majority
/**
 * 状态访问器：读取当前会话的 host（host） → 扩展配置（extensionsConfig） 上的 teammateAgentId()。
 */
function getTeammateAgentId() {
  return currentSession().host.extensionsConfig.teammateAgentId();
}
//@ chunk-ndmse9kj.js:105810-105880 facade-majority
/**
 * 状态访问器：写入当前会话的 会话标志（sessionFlags） 上的 replaceOnboardingShownThisSession()。
 */
function setOnboardingShownThisSession(shown) {
  currentSession().sessionFlags.replaceOnboardingShownThisSession(shown);
}
//@ chunk-ndmse9kj.js:105880-105948 facade-majority
/**
 * 状态访问器：读取当前会话的 会话标志（sessionFlags） 上的 onboardingShownThisSession()。
 */
function getOnboardingShownThisSession() {
  return currentSession().sessionFlags.onboardingShownThisSession();
}
//@ chunk-ndmse9kj.js:105948-106053 facade-majority
/**
 * 设置是否使用 cowork 插件目录，并使 HostScoped 缓存失效。
 */
function setUseCoworkPlugins(enabled) {
  let session = currentSession();
  session.host.settingsSource.replaceUseCoworkPlugins(enabled);
  SETTINGS_CACHE_STORE_SLOT.of(session.host).invalidateAll();
}
//@ chunk-ndmse9kj.js:106053-106118 facade-majority = setUseCoworkPlugins (0.732)
/**
 * 状态访问器：读取当前会话的 host（host） → 设置来源（settingsSource） 上的 useCoworkPlugins()。
 */
function getUseCoworkPlugins() {
  return currentSession().host.settingsSource.useCoworkPlugins();
}
//@ chunk-ndmse9kj.js:106118-106188 facade-majority
/**
 * 状态访问器：写入当前会话的 host（host） → 启动选项（launchOptions） 上的 replaceDisableSlashCommands()。
 */
function setDisableSlashCommands(disableSlashCommands) {
  currentSession().host.launchOptions.replaceDisableSlashCommands(disableSlashCommands);
}
//@ chunk-ndmse9kj.js:106188-106255 facade-majority
/**
 * 状态访问器：读取当前会话的 host（host） → 启动选项（launchOptions） 上的 disableSlashCommands()。
 */
function getDisableSlashCommands() {
  return currentSession().host.launchOptions.disableSlashCommands();
}
//@ chunk-ndmse9kj.js:106255-106322 facade-majority
/**
 * 状态访问器：读取当前会话的 host（host） → 启动选项（launchOptions） 上的 disableFileMentions()。
 */
function getDisableFileMentions() {
  return currentSession().host.launchOptions.disableFileMentions();
}
//@ chunk-ndmse9kj.js:106322-106386 facade-majority
/**
 * 状态访问器：读取当前会话的 host（host） → 启动选项（launchOptions） 上的 sessionUploadsDir()。
 */
function getSessionUploadsDirOverride() {
  return currentSession().host.launchOptions.sessionUploadsDir();
}
//@ chunk-ndmse9kj.js:106386-106452 facade-majority
/**
 * 状态访问器：写入当前会话的 host（host） → 启动选项（launchOptions） 上的 replaceLocalUploadsRoot()。
 */
function setLocalUploadsRoot(attachmentsRoot) {
  currentSession().host.launchOptions.replaceLocalUploadsRoot(attachmentsRoot);
}
//@ chunk-ndmse9kj.js:106452-106516 facade-majority
/**
 * 状态访问器：读取当前会话的 host（host） → 启动选项（launchOptions） 上的 localUploadsRoot()。
 */
function getLocalUploadsRoot() {
  return currentSession().host.launchOptions.localUploadsRoot();
}
//@ chunk-ndmse9kj.js:106516-106594 facade-majority
/**
 * 状态访问器：写入当前会话的 host（host） → 启动选项（launchOptions） 上的 replaceSessionBypassPermissionsMode()。
 */
function setSessionBypassPermissionsMode(enabled) {
  currentSession().host.launchOptions.replaceSessionBypassPermissionsMode(enabled);
}
//@ chunk-ndmse9kj.js:106594-106670 facade-majority = setSessionBypassPermissionsMode (0.763)
/**
 * 状态访问器：读取当前会话的 host（host） → 启动选项（launchOptions） 上的 sessionBypassPermissionsMode()。
 */
function getSessionBypassPermissionsMode() {
  return currentSession().host.launchOptions.sessionBypassPermissionsMode();
}
//@ chunk-ndmse9kj.js:106670-106740 facade-majority
/**
 * 状态访问器：写入当前会话的 host（host） → 启动选项（launchOptions） 上的 replaceScheduledTasksEnabled()。
 */
function setScheduledTasksEnabled(enabled) {
  currentSession().host.launchOptions.replaceScheduledTasksEnabled(enabled);
}
//@ chunk-ndmse9kj.js:106740-106809 facade-majority = setScheduledTasksEnabled (0.756)
/**
 * 状态访问器：读取当前会话的 host（host） → 启动选项（launchOptions） 上的 scheduledTasksEnabled()。
 */
function getScheduledTasksEnabled() {
  return currentSession().host.launchOptions.scheduledTasksEnabled();
}
//@ chunk-ndmse9kj.js:106809-106882 facade-majority
/**
 * 状态访问器：调用当前会话的 host（host） → 启动选项（launchOptions） 上的 onScheduledTasksEnabled()。
 */
function onScheduledTasksEnabled(listener) {
  return currentSession().host.launchOptions.onScheduledTasksEnabled(listener);
}
//@ chunk-ndmse9kj.js:106882-106950 facade-majority = getSessionCronTasks (0.588)
/**
 * 会话状态函数 getSessionCronTasks：优先取异步上下文覆盖对象的 sessionCronTasks；涉及当前会话的 sessionCron.tasks。
 */
function getSessionCronTasks() {
  return getAgentContext()?.sessionCronTasks ?? currentSession().sessionCron.tasks();
}
//@ chunk-ndmse9kj.js:106950-107072 facade-majority
/**
 * 会话状态函数 addSessionCronTask：涉及当前会话的 sessionCron.schedule、sessionCron.changed.emit。
 */
function addSessionCronTask(task) {
  let agentContext = getAgentContext();
  if (agentContext) agentContext.sessionCronTasks.push(task);
  else currentSession().sessionCron.schedule(task);
  currentSession().sessionCron.changed.emit();
}
//@ chunk-ndmse9kj.js:107072-107129 facade-majority
/**
 * 状态访问器：调用当前会话的 会话定时任务（sessionCron） 上的 chainStartedAt()。
 */
function getLoopChainStartedAt(chainId) {
  return currentSession().sessionCron.chainStartedAt(chainId);
}
//@ chunk-ndmse9kj.js:107129-107185 facade-majority
/**
 * 状态访问器：调用当前会话的 会话定时任务（sessionCron） 上的 recordChainStart()。
 */
function setLoopChainStartedAt(chainId, startedAt) {
  currentSession().sessionCron.recordChainStart(chainId, startedAt);
}
//@ chunk-ndmse9kj.js:107185-107237 facade-majority
/**
 * 状态访问器：调用当前会话的 会话定时任务（sessionCron） 上的 forgetChainStart()。
 */
function deleteLoopChainStartedAt(prompt) {
  currentSession().sessionCron.forgetChainStart(prompt);
}
//@ chunk-ndmse9kj.js:107237-107296 facade-majority
/**
 * 状态访问器：读取当前会话的 会话定时任务（sessionCron） 上的 tickInFlightPrompt()。
 */
function getLoopTickInFlightPrompt() {
  return currentSession().sessionCron.tickInFlightPrompt();
}
//@ chunk-ndmse9kj.js:107296-107355 facade-majority
/**
 * 状态访问器：读取当前会话的 会话定时任务（sessionCron） 上的 tickInFlightPlugin()。
 */
function getLoopTickInFlightPlugin() {
  return currentSession().sessionCron.tickInFlightPlugin();
}
//@ chunk-ndmse9kj.js:107355-107420 facade-majority
/**
 * 状态访问器：写入当前会话的 会话定时任务（sessionCron） 上的 replaceTickInFlightPrompt()。
 */
function setLoopTickInFlightPrompt(prompt, plugin) {
  currentSession().sessionCron.replaceTickInFlightPrompt(prompt, plugin);
}
//@ chunk-ndmse9kj.js:107420-107482 facade-majority
/**
 * 状态访问器：读取当前会话的 会话定时任务（sessionCron） 上的 consecutiveKeepalives()。
 */
function getLoopConsecutiveKeepalives() {
  return currentSession().sessionCron.consecutiveKeepalives();
}
//@ chunk-ndmse9kj.js:107482-107546 facade-majority
/**
 * 状态访问器：写入当前会话的 会话定时任务（sessionCron） 上的 replaceConsecutiveKeepalives()。
 */
function setLoopConsecutiveKeepalives(count) {
  currentSession().sessionCron.replaceConsecutiveKeepalives(count);
}
//@ chunk-ndmse9kj.js:107546-107592 facade-majority
/**
 * 状态访问器：读取当前会话的 会话定时任务（sessionCron） 上的 ended()。
 */
function getLoopEnded() {
  return currentSession().sessionCron.ended();
}
//@ chunk-ndmse9kj.js:107592-107642 facade-majority
/**
 * 状态访问器：读取当前会话的 会话定时任务（sessionCron） 上的 wakeFires()。
 */
function getLoopWakeFires() {
  return currentSession().sessionCron.wakeFires();
}
//@ chunk-ndmse9kj.js:107642-107690 facade-majority
/**
 * 状态访问器：调用当前会话的 会话定时任务（sessionCron） 上的 recordWakeFire()。
 */
function recordLoopWakeFire() {
  currentSession().sessionCron.recordWakeFire();
}
//@ chunk-ndmse9kj.js:107690-107738 facade-majority
/**
 * 状态访问器：调用当前会话的 会话定时任务（sessionCron） 上的 resetWakeFires()。
 */
function resetLoopWakeFires() {
  currentSession().sessionCron.resetWakeFires();
}
//@ chunk-ndmse9kj.js:107738-107822 facade-majority
/**
 * 会话状态函数 setLoopEnded：涉及当前会话的 sessionCron.replaceEnded、sessionCron.changed.emit。
 */
function setLoopEnded(ended) {
  currentSession().sessionCron.replaceEnded(ended);
  if (ended) currentSession().sessionCron.changed.emit();
}
//@ chunk-ndmse9kj.js:107822-108262 facade-majority = removeSessionCronTasks (0.227)
/**
 * removeSessionCronTasks：按 id 删除会话级定时任务，返回删除数；删掉 loop 任务时触发唤醒。
 */
function removeSessionCronTasks(ids, { handOff = false } = {}) {
  if (ids.length === 0) return 0;
  let idSet = new Set(ids);
  let agentContext = getAgentContext();
  let tasks = agentContext ? agentContext.sessionCronTasks : currentSession().sessionCron.tasks();
  let remaining = tasks.filter((t) => !idSet.has(t.id));
  let removed = tasks.length - remaining.length;
  if (removed === 0) return 0;
  let removedLoopTasks = !handOff && tasks.some((task) => task.kind === "loop" && idSet.has(task.id));
  if (agentContext) {
    agentContext.sessionCronTasks.length = 0;
    agentContext.sessionCronTasks.push(...remaining);
  } else currentSession().sessionCron.replaceTasks(remaining);
  if (removedLoopTasks) currentSession().sessionCron.pendingLoopWakeup.emit(undefined);
  currentSession().sessionCron.changed.emit();
  return removed;
}
//@ chunk-ndmse9kj.js:108262-108322 facade-majority
/**
 * 状态访问器：调用当前会话的 会话定时任务（sessionCron） → changed 上的 subscribe()。
 */
function onSessionCronsChange(listener) {
  return currentSession().sessionCron.changed.subscribe(listener);
}
//@ chunk-ndmse9kj.js:108322-108392 facade-majority
/**
 * 状态访问器：调用当前会话的 会话定时任务（sessionCron） → pendingLoopWakeup 上的 subscribe()。
 */
function onPendingLoopWakeupChange(listener) {
  return currentSession().sessionCron.pendingLoopWakeup.subscribe(listener);
}
//@ chunk-ndmse9kj.js:108392-108450 facade-majority
/**
 * 状态访问器：调用当前会话的 会话定时任务（sessionCron） → pendingLoopWakeup 上的 emit()。
 */
function announcePendingLoopWakeup(payload) {
  currentSession().sessionCron.pendingLoopWakeup.emit(payload);
}
//@ chunk-ndmse9kj.js:108450-108513 facade-majority
/**
 * 状态访问器：写入当前会话的 会话标志（sessionFlags） 上的 replaceSessionTrustAccepted()。
 */
function setSessionTrustAccepted(accepted) {
  currentSession().sessionFlags.replaceSessionTrustAccepted(accepted);
}
//@ chunk-ndmse9kj.js:108513-108575 facade-majority = setSessionTrustAccepted (0.747)
/**
 * 状态访问器：读取当前会话的 会话标志（sessionFlags） 上的 sessionTrustAccepted()。
 */
function getSessionTrustAccepted() {
  return currentSession().sessionFlags.sessionTrustAccepted();
}
//@ chunk-ndmse9kj.js:108575-108642 facade-majority
/**
 * 状态访问器：写入当前会话的 会话标志（sessionFlags） 上的 replaceHomeTrustDialogAccepted()。
 */
function setHomeTrustDialogAccepted(accepted) {
  currentSession().sessionFlags.replaceHomeTrustDialogAccepted(accepted);
}
//@ chunk-ndmse9kj.js:108642-108707 facade-majority
/**
 * 状态访问器：读取当前会话的 会话标志（sessionFlags） 上的 homeTrustDialogAccepted()。
 */
function getHomeTrustDialogAccepted() {
  return currentSession().sessionFlags.homeTrustDialogAccepted();
}
//@ chunk-ndmse9kj.js:108707-108783 facade-majority
/**
 * 状态访问器：写入当前会话的 host（host） → 启动选项（launchOptions） 上的 replaceSessionPersistenceDisabled()。
 */
function setSessionPersistenceDisabled(disabled) {
  currentSession().host.launchOptions.replaceSessionPersistenceDisabled(disabled);
}
//@ chunk-ndmse9kj.js:108783-108856 facade-majority = setSessionPersistenceDisabled (0.763)
/**
 * 状态访问器：读取当前会话的 host（host） → 启动选项（launchOptions） 上的 sessionPersistenceDisabled()。
 */
function isSessionPersistenceDisabled() {
  return currentSession().host.launchOptions.sessionPersistenceDisabled();
}
//@ chunk-ndmse9kj.js:108856-108881 facade-majority
/**
 * isDiskless：当前会话是否无盘（不写本地文件）。
 */
function isDiskless() {
  return isCcsTenant();
}
//@ chunk-ndmse9kj.js:108881-108936 facade-majority
/**
 * 状态访问器：读取当前会话的 host（host） → 启动选项（launchOptions） 上的 diskless()。
 */
function isCcsTenant() {
  return currentSession().host.launchOptions.diskless();
}
//@ chunk-ndmse9kj.js:108936-108989 facade-majority
/**
 * isDisklessProcess：进程默认会话是否无盘。
 */
function isDisklessProcess() {
  return defaultRootSession.host.launchOptions.diskless();
}
//@ chunk-ndmse9kj.js:108989-109050 facade-majority
/**
 * 状态访问器：读取当前会话的 host（host） → 启动选项（launchOptions） 上的 ccrSessionUrl()。
 */
function getCcrSessionUrl() {
  return currentSession().host.launchOptions.ccrSessionUrl();
}
//@ chunk-ndmse9kj.js:109050-109115 facade-majority
/**
 * 状态访问器：读取当前会话的 host（host） → 启动选项（launchOptions） 上的 ccrDerivedSurface()。
 */
function getCcrDerivedSurface() {
  return currentSession().host.launchOptions.ccrDerivedSurface();
}
//@ chunk-ndmse9kj.js:109115-109185 facade-majority
/**
 * 状态访问器：写入当前会话的 host（host） → 启动选项（launchOptions） 上的 replaceEntrypointOnRequests()。
 */
function setEntrypointOnRequests(enabled) {
  currentSession().host.launchOptions.replaceEntrypointOnRequests(enabled);
}
//@ chunk-ndmse9kj.js:109185-109252 facade-majority
/**
 * 状态访问器：读取当前会话的 host（host） → 启动选项（launchOptions） 上的 entrypointOnRequests()。
 */
function getEntrypointOnRequests() {
  return currentSession().host.launchOptions.entrypointOnRequests();
}
//@ chunk-ndmse9kj.js:109252-109324 facade-majority
/**
 * 状态访问器：读取当前会话的 host（host） → 启动选项（launchOptions） 上的 autoCompactWindowSurface()。
 */
function getAutoCompactWindowSurface() {
  return currentSession().host.launchOptions.autoCompactWindowSurface();
}
//@ chunk-ndmse9kj.js:109324-109388 facade-majority
/**
 * 状态访问器：读取当前会话的 host（host） → 启动选项（launchOptions） 上的 coworkEnrollment()。
 */
function getCoworkEnrollment() {
  return currentSession().host.launchOptions.coworkEnrollment();
}
//@ chunk-ndmse9kj.js:109388-109447 facade-majority
/**
 * 状态访问器：读取当前会话的 host（host） → 启动选项（launchOptions） 上的 toolsMachine()。
 */
function getToolsMachine() {
  return currentSession().host.launchOptions.toolsMachine();
}
//@ chunk-ndmse9kj.js:109447-109517 facade-majority
/**
 * 工具使用的项目目录：会话目录绑定优先，否则 --project-config-root，否则项目根。
 */
function getProjectDirForTools() {
  let toolsMachine = getToolsMachine();
  return toolsMachine
    ? (toolsMachine.directory?.path ?? null)
    : (getProjectConfigRoot() ?? getProjectRootOrNull());
}
//@ chunk-ndmse9kj.js:109517-109576 facade-majority = hasExitedPlanModeInSession (0.747)
/**
 * 状态访问器：读取当前会话的 会话标志（sessionFlags） 上的 hasExitedPlanMode()。
 */
function hasExitedPlanModeInSession() {
  return currentSession().sessionFlags.hasExitedPlanMode();
}
//@ chunk-ndmse9kj.js:109576-109636 facade-majority
/**
 * 状态访问器：写入当前会话的 会话标志（sessionFlags） 上的 replaceHasExitedPlanMode()。
 */
function setHasExitedPlanMode(exited) {
  currentSession().sessionFlags.replaceHasExitedPlanMode(exited);
}
//@ chunk-ndmse9kj.js:109636-109694 facade-majority
/**
 * 状态访问器：读取当前会话的 host（host） → 主动性（proactivity） 上的 selectorGate()。
 */
function getProactivitySelectorGate() {
  return currentSession().host.proactivity.selectorGate();
}
//@ chunk-ndmse9kj.js:109694-109758 facade-majority
/**
 * 状态访问器：读取当前会话的 host（host） → 主动性（proactivity） 上的 selectorGateEverOn()。
 */
function getProactivitySelectorGateEverOn() {
  return currentSession().host.proactivity.selectorGateEverOn();
}
//@ chunk-ndmse9kj.js:109758-109822 facade-majority
/**
 * 状态访问器：调用当前会话的 host（host） → 主动性（proactivity） 上的 inheritSelectorGateEverOn()。
 */
function inheritProactivitySelectorGateEverOn() {
  currentSession().host.proactivity.inheritSelectorGateEverOn();
}
//@ chunk-ndmse9kj.js:109822-109882 facade-majority
/**
 * 状态访问器：写入当前会话的 host（host） → 主动性（proactivity） 上的 replaceSelectorGate()。
 */
function setProactivitySelectorGate(gate) {
  currentSession().host.proactivity.replaceSelectorGate(gate);
}
//@ chunk-ndmse9kj.js:109882-109943 facade-majority
/**
 * 状态访问器：调用当前会话的 host（host） → 主动性（proactivity） 上的 resampleSelectorGate()。
 */
function resampleProactivitySelectorGate(gate) {
  currentSession().host.proactivity.resampleSelectorGate(gate);
}
//@ chunk-ndmse9kj.js:109943-110019 facade-majority
/**
 * 状态访问器：调用当前会话的 host（host） → 主动性（proactivity） 上的 subscribeSelectorGateChanged()。
 */
function onProactivitySelectorGateChanged(listener) {
  return currentSession().host.proactivity.subscribeSelectorGateChanged(listener);
}
//@ chunk-ndmse9kj.js:110019-110087 facade-majority
/**
 * 状态访问器：写入当前会话的 host（host） → 主动性（proactivity） 上的 replaceHostGateSubscription()。
 */
function replaceProactivityHostGateSubscription(subscription) {
  currentSession().host.proactivity.replaceHostGateSubscription(subscription);
}
//@ chunk-ndmse9kj.js:110087-110156 facade-majority = needsPlanModeExitAttachment (0.747)
/**
 * 状态访问器：读取当前会话的 会话标志（sessionFlags） 上的 needsPlanModeExitAttachment()。
 */
function needsPlanModeExitAttachment() {
  return currentSession().sessionFlags.needsPlanModeExitAttachment();
}
//@ chunk-ndmse9kj.js:110156-110226 facade-majority
/**
 * 状态访问器：写入当前会话的 会话标志（sessionFlags） 上的 replaceNeedsPlanModeExitAttachment()。
 */
function setNeedsPlanModeExitAttachment(needed) {
  currentSession().sessionFlags.replaceNeedsPlanModeExitAttachment(needed);
}
//@ chunk-ndmse9kj.js:110226-110408 facade-majority
/**
 * plan 模式进出时设置 needsPlanModeExitAttachment。
 */
function handlePlanModeTransition(fromMode, toMode) {
  if (toMode === "plan" && fromMode !== "plan")
    currentSession().sessionFlags.replaceNeedsPlanModeExitAttachment(false);
  if (fromMode === "plan" && toMode !== "plan")
    currentSession().sessionFlags.replaceNeedsPlanModeExitAttachment(true);
}
//@ chunk-ndmse9kj.js:110408-110477 facade-majority = needsAutoModeExitAttachment (0.747)
/**
 * 状态访问器：读取当前会话的 会话标志（sessionFlags） 上的 needsAutoModeExitAttachment()。
 */
function needsAutoModeExitAttachment() {
  return currentSession().sessionFlags.needsAutoModeExitAttachment();
}
//@ chunk-ndmse9kj.js:110477-110547 facade-majority
/**
 * 状态访问器：写入当前会话的 会话标志（sessionFlags） 上的 replaceNeedsAutoModeExitAttachment()。
 */
function setNeedsAutoModeExitAttachment(needed) {
  currentSession().sessionFlags.replaceNeedsAutoModeExitAttachment(needed);
}
//@ chunk-ndmse9kj.js:110547-110782 facade-majority
/**
 * auto 模式进出时设置 needsAutoModeExitAttachment（plan↔auto 互转除外）。
 */
function handleAutoModeTransition(fromMode, toMode) {
  if ((fromMode === "auto" && toMode === "plan") || (fromMode === "plan" && toMode === "auto")) return;
  let fromIsAuto = fromMode === "auto";
  let toIsAuto = toMode === "auto";
  if (toIsAuto && !fromIsAuto) currentSession().sessionFlags.replaceNeedsAutoModeExitAttachment(false);
  if (fromIsAuto && !toIsAuto) currentSession().sessionFlags.replaceNeedsAutoModeExitAttachment(true);
}
//@ chunk-ndmse9kj.js:110782-110857 facade-majority = hasShownLspRecommendationThisSession (0.747)
/**
 * 状态访问器：读取当前会话的 会话标志（sessionFlags） 上的 lspRecommendationShownThisSession()。
 */
function hasShownLspRecommendationThisSession() {
  return currentSession().sessionFlags.lspRecommendationShownThisSession();
}
//@ chunk-ndmse9kj.js:110857-110934 facade-majority
/**
 * 状态访问器：写入当前会话的 会话标志（sessionFlags） 上的 replaceLspRecommendationShownThisSession()。
 */
function setLspRecommendationShownThisSession(shown) {
  currentSession().sessionFlags.replaceLspRecommendationShownThisSession(shown);
}
//@ chunk-ndmse9kj.js:110934-110998 facade-majority
/**
 * 状态访问器：写入当前会话的 host（host） → 启动选项（launchOptions） 上的 replaceInitJsonSchema()。
 */
function setInitJsonSchema(jsonSchema) {
  currentSession().host.launchOptions.replaceInitJsonSchema(jsonSchema);
}
//@ chunk-ndmse9kj.js:110998-111060 facade-majority = setInitJsonSchema (0.763)
/**
 * 状态访问器：读取当前会话的 host（host） → 启动选项（launchOptions） 上的 initJsonSchema()。
 */
function getInitJsonSchema() {
  return currentSession().host.launchOptions.initJsonSchema();
}
//@ chunk-ndmse9kj.js:111060-111124 facade-majority
/**
 * 状态访问器：调用当前会话的 MCP 会话接线（mcpSessionWiring） 上的 registerClientsAccessor()。
 */
function setMcpClientsAccessor(accessor) {
  currentSession().mcpSessionWiring.registerClientsAccessor(accessor);
}
//@ chunk-ndmse9kj.js:111124-111194 facade-majority
/**
 * 状态访问器：调用当前会话的 MCP 会话接线（mcpSessionWiring） 上的 acquireClientsAccessor()。
 */
function acquireMcpClientsAccessor(owner) {
  return currentSession().mcpSessionWiring.acquireClientsAccessor(owner);
}
//@ chunk-ndmse9kj.js:111194-111258 facade-majority
/**
 * 状态访问器：读取当前会话的 MCP 会话接线（mcpSessionWiring） 上的 clientsFromAccessor()。
 */
function getMcpClientsFromAccessor() {
  return currentSession().mcpSessionWiring.clientsFromAccessor();
}
//@ chunk-ndmse9kj.js:111258-111333 facade-majority
/**
 * 状态访问器：调用当前会话的 host（host） → MCP 进程接线（mcpProcessWiring） 上的 registerEnsureConnectedClient()。
 */
function setEnsureConnectedClient(ensureConnectedClient) {
  currentSession().host.mcpProcessWiring.registerEnsureConnectedClient(ensureConnectedClient);
}
//@ chunk-ndmse9kj.js:111333-111404 facade-majority
/**
 * 状态访问器：读取当前会话的 host（host） → MCP 进程接线（mcpProcessWiring） 上的 ensureConnectedClient()。
 */
function getEnsureConnectedClient() {
  return currentSession().host.mcpProcessWiring.ensureConnectedClient();
}
//@ chunk-ndmse9kj.js:111404-111474 facade-majority
/**
 * 状态访问器：调用当前会话的 MCP 会话接线（mcpSessionWiring） 上的 registerConnectedClientWiring()。
 */
function setConnectedClientWiring(wiring) {
  currentSession().mcpSessionWiring.registerConnectedClientWiring(wiring);
}
//@ chunk-ndmse9kj.js:111474-111541 facade-majority
/**
 * 状态访问器：读取当前会话的 MCP 会话接线（mcpSessionWiring） 上的 connectedClientWiring()。
 */
function getConnectedClientWiring() {
  return currentSession().mcpSessionWiring.connectedClientWiring();
}
//@ chunk-ndmse9kj.js:111541-111602 facade-majority
/**
 * 状态访问器：调用当前会话的 MCP 会话接线（mcpSessionWiring） 上的 registerToolsSwapper()。
 */
function setMcpServerToolsSwapper(commitReconnect) {
  currentSession().mcpSessionWiring.registerToolsSwapper(commitReconnect);
}
//@ chunk-ndmse9kj.js:111602-111669 facade-majority
/**
 * 状态访问器：调用当前会话的 MCP 会话接线（mcpSessionWiring） 上的 acquireToolsSwapper()。
 */
function acquireMcpServerToolsSwapper(owner) {
  return currentSession().mcpSessionWiring.acquireToolsSwapper(owner);
}
//@ chunk-ndmse9kj.js:111669-111740 facade-majority
/**
 * 状态访问器：调用当前会话的 MCP 会话接线（mcpSessionWiring） 上的 swapServerTools()。
 */
function swapMcpServerTools(owner, serverName, config) {
  return currentSession().mcpSessionWiring.swapServerTools(owner, serverName, config);
}
//@ chunk-ndmse9kj.js:111740-111791 layout
/**
 * 会话状态函数 getHookHolder：涉及当前会话的 hookRegistry.holder。
 */
function getHookHolder() {
  return getAgentContext() ?? currentSession().hookRegistry.holder();
}
//@ chunk-ndmse9kj.js:111791-111988 facade-majority = registerHookCallbacks (1)
/**
 * registerHookCallbacks：把 SDK/插件注册的钩子按事件追加到 registeredHooks，并发出钩子变化信号。
 */
function registerHookCallbacks(hooks) {
  let hookHolder = getHookHolder();
  if (!hookHolder.registeredHooks) hookHolder.registeredHooks = {};
  for (let [event, matchers] of Object.entries(hooks)) {
    let eventKey = event;
    if (!hookHolder.registeredHooks[eventKey]) hookHolder.registeredHooks[eventKey] = [];
    hookHolder.registeredHooks[eventKey].push(...matchers);
  }
  emitHookStoresChanged();
}
//@ chunk-ndmse9kj.js:111988-112029 facade-majority = registerHookCallbacks (1)
/**
 * getRegisteredHooks：当前钩子持有者里注册的 SDK/插件钩子。
 */
function getRegisteredHooks() {
  return getHookHolder().registeredHooks;
}
//@ chunk-ndmse9kj.js:112029-112091 facade-majority
/**
 * 默认 root 会话里注册的钩子。
 */
function getRootRegisteredHooks() {
  return defaultRootSession.hookRegistry.holder().registeredHooks;
}
//@ chunk-ndmse9kj.js:112091-112177 facade-majority
/**
 * clearRegisteredHooks：清空注册的钩子并发出变化信号。
 */
function clearRegisteredHooks() {
  let hookHolder = getHookHolder();
  hookHolder.registeredHooks = null;
  hookHolder.sdkHostOutOfReachNoted = undefined;
  emitHookStoresChanged();
}
//@ chunk-ndmse9kj.js:112177-112277 facade-majority
/**
 * SDK 宿主不可达的提示只记一次：首次返回 true。
 */
function takeSdkHostOutOfReachNote() {
  let hookHolder = getHookHolder();
  if (hookHolder.sdkHostOutOfReachNoted) return false;
  hookHolder.sdkHostOutOfReachNoted = true;
  return true;
}
//@ chunk-ndmse9kj.js:112277-112326 facade-majority
/**
 * 宿主答复了钩子后清除“不可达已提示”标记。
 */
function noteSdkHostHookAnswered() {
  getHookHolder().sdkHostOutOfReachNoted = undefined;
}
//@ chunk-ndmse9kj.js:112326-112368 facade-majority
/**
 * 当前插件钩子运行器。
 */
function getPluginHookRunner() {
  return getHookHolder().pluginHookRunner;
}
//@ chunk-ndmse9kj.js:112368-112410 facade-majority
/**
 * 当前回复闸策略。
 */
function getReplyGatePolicy() {
  return getHookHolder().replyGatePolicy;
}
//@ chunk-ndmse9kj.js:112410-112557 facade-majority
/**
 * 替换插件来源的注册钩子（保留运行器持有的插件的钩子）。
 */
function replaceRegisteredPluginHooks(hooksByKey) {
  let pluginHookRunner = getPluginHookRunner();
  clearRegisteredPluginHooks();
  let keptHooks = {};
  for (let [key, value] of Object.entries(hooksByKey))
    keptHooks[key] = value.filter(
      (hook) => !("pluginRoot" in hook) || pluginHookRunner?.holds(hook.pluginId) !== true,
    );
  registerHookCallbacks(keptHooks);
}
//@ chunk-ndmse9kj.js:112557-112834 fingerprint = clearRegisteredPluginHooks (0.671)
function clearRegisteredPluginHooks() {
  let hookHolder = getHookHolder();
  if (!hookHolder.registeredHooks) return;
  let pluginHookRunner = hookHolder.pluginHookRunner;
  let filtered = {};
  for (let [event, matchers] of Object.entries(hookHolder.registeredHooks)) {
    let callbackHooks = matchers.filter(
      (m) => !("pluginRoot" in m) || pluginHookRunner?.holds(m.pluginId) === true,
    );
    if (callbackHooks.length > 0) filtered[event] = callbackHooks;
  }
  hookHolder.registeredHooks = Object.keys(filtered).length > 0 ? filtered : null;
  emitHookStoresChanged();
}
//@ chunk-ndmse9kj.js:112834-112857 layout
var hooksChangedSignal; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-ndmse9kj.js:112834", () => {
  hooksChangedSignal = new HostScoped(() => createSignal());
});
//@ chunk-ndmse9kj.js:112857-112886 facade-majority
/**
 * 发出“钩子存储已变化”信号。
 */
function emitHookStoresChanged() {
  onProcessRootHost(hooksChangedSignal).emit();
}
//@ chunk-ndmse9kj.js:112886-112929 facade-majority
/**
 * 订阅钩子存储变化。
 */
function onHookStoresChanged(recheckMcpCgroupRelease) {
  return onProcessRootHost(hooksChangedSignal).subscribe(recheckMcpCgroupRelease);
}
//@ chunk-ndmse9kj.js:112929-112986 facade-majority = getPlanSlugCache (0.739)
/**
 * 状态访问器：读取当前会话的 会话暂存（sessionScratch） 上的 planSlugCache()。
 */
function getPlanSlugCache() {
  return currentSession().sessionScratch.planSlugCache();
}
//@ chunk-ndmse9kj.js:112986-113075 facade-majority = getSessionCreatedTeams (0.739)
/**
 * 会话状态函数 getSessionCreatedTeams：优先取异步上下文覆盖对象的 sessionCreatedTeams；涉及当前会话的 sessionScratch.sessionCreatedTeams。
 */
function getSessionCreatedTeams() {
  return getAgentContext()?.sessionCreatedTeams ?? currentSession().sessionScratch.sessionCreatedTeams();
}
//@ chunk-ndmse9kj.js:113075-113180 facade-majority
/**
 * 会话状态函数 getSessionSpawnedTeammatePanes：优先取异步上下文覆盖对象的 sessionSpawnedTeammatePanes；涉及当前会话的 sessionScratch.sessionSpawnedTeammatePanes。
 */
function getSessionSpawnedTeammatePanes() {
  return (
    getAgentContext()?.sessionSpawnedTeammatePanes ??
    currentSession().sessionScratch.sessionSpawnedTeammatePanes()
  );
}
//@ chunk-ndmse9kj.js:113180-113281 facade-majority
/**
 * 会话状态函数 getSurfacedHookSpawnFailures：优先取异步上下文覆盖对象的 surfacedHookSpawnFailures；涉及当前会话的 sessionScratch.surfacedHookSpawnFailures。
 */
function getSurfacedHookSpawnFailures() {
  return (
    getAgentContext()?.surfacedHookSpawnFailures ??
    currentSession().sessionScratch.surfacedHookSpawnFailures()
  );
}
//@ chunk-ndmse9kj.js:113281-113386 facade-majority
/**
 * 会话状态函数 getPendingConversationEditKinds：优先取异步上下文覆盖对象的 pendingConversationEditKinds；
 */
function getPendingConversationEditKinds() {
  return (
    agentContextGetter()?.pendingConversationEditKinds ??
    defaultRootSession.sessionScratch.pendingConversationEditKinds()
  );
}
//@ chunk-ndmse9kj.js:113386-113489 facade-majority
/**
 * 会话状态函数 getClientTruncatedAssistantIds：优先取异步上下文覆盖对象的 clientTruncatedAssistantIds；
 */
function getClientTruncatedAssistantIds() {
  return (
    agentContextGetter()?.clientTruncatedAssistantIds ??
    defaultRootSession.sessionScratch.clientTruncatedAssistantIds()
  );
}
//@ chunk-ndmse9kj.js:113489-113580 facade-majority
/**
 * 会话状态函数 getHeldStatelessReplyIds：优先取异步上下文覆盖对象的 heldStatelessReplyIds；
 */
function getHeldStatelessReplyIds() {
  return (
    agentContextGetter()?.heldStatelessReplyIds ?? defaultRootSession.sessionScratch.heldStatelessReplyIds()
  );
}
//@ chunk-ndmse9kj.js:113580-113671 facade-majority
/**
 * 会话状态函数 getUnsupportedThreadKeys：优先取异步上下文覆盖对象的 unsupportedThreadKeys；
 */
function getUnsupportedThreadKeys() {
  return (
    agentContextGetter()?.unsupportedThreadKeys ?? defaultRootSession.sessionScratch.unsupportedThreadKeys()
  );
}
//@ chunk-ndmse9kj.js:113671-113776 facade-majority
/**
 * 会话状态函数 getBareMcpServerMatchersWarned：优先取异步上下文覆盖对象的 bareMcpServerMatchersWarned；涉及当前会话的 sessionScratch.bareMcpServerMatchersWarned。
 */
function getBareMcpServerMatchersWarned() {
  return (
    getAgentContext()?.bareMcpServerMatchersWarned ??
    currentSession().sessionScratch.bareMcpServerMatchersWarned()
  );
}
//@ chunk-ndmse9kj.js:113776-113863 facade-majority
/**
 * 会话状态函数 getPendingBranchLinks：优先取异步上下文覆盖对象的 pendingBranchLinks；涉及当前会话的 sessionScratch.pendingBranchLinks。
 */
function getPendingBranchLinks() {
  return getAgentContext()?.pendingBranchLinks ?? currentSession().sessionScratch.pendingBranchLinks();
}
//@ chunk-ndmse9kj.js:113863-113921 facade-majority
/**
 * 状态访问器：读取当前会话的 会话暂存（sessionScratch） 上的 pendingPrLinks()。
 */
function getPendingPrLinks() {
  return currentSession().sessionScratch.pendingPrLinks();
}
//@ chunk-ndmse9kj.js:113921-113996 facade-majority
/**
 * 状态访问器：读取当前会话的 会话暂存（sessionScratch） 上的 policyPredicateTelemetryEmitted()。
 */
function getPolicyPredicateTelemetryEmitted() {
  return currentSession().sessionScratch.policyPredicateTelemetryEmitted();
}
//@ chunk-ndmse9kj.js:113996-114107 facade-majority
/**
 * 会话状态函数 getChromeAvailabilityStagesLogged：优先取异步上下文覆盖对象的 chromeAvailabilityStagesLogged；涉及当前会话的 sessionScratch.chromeAvailabilityStagesLogged。
 */
function getChromeAvailabilityStagesLogged() {
  return (
    getAgentContext()?.chromeAvailabilityStagesLogged ??
    currentSession().sessionScratch.chromeAvailabilityStagesLogged()
  );
}
//@ chunk-ndmse9kj.js:114107-114177 facade-majority
/**
 * 状态访问器：读取当前会话的 会话暂存（sessionScratch） 上的 chromeAvailabilityAnchorMs()。
 */
function getChromeAvailabilityAnchorMs() {
  return currentSession().sessionScratch.chromeAvailabilityAnchorMs();
}
//@ chunk-ndmse9kj.js:114177-114248 facade-majority
/**
 * 状态访问器：读取当前会话的 会话标志（sessionFlags） 上的 proposeGoalAvailabilityLogged()。
 */
function getProposeGoalAvailabilityLogged() {
  return currentSession().sessionFlags.proposeGoalAvailabilityLogged();
}
//@ chunk-ndmse9kj.js:114248-114316 facade-majority
/**
 * 状态访问器：调用当前会话的 会话标志（sessionFlags） 上的 markProposeGoalAvailabilityLogged()。
 */
function setProposeGoalAvailabilityLogged() {
  currentSession().sessionFlags.markProposeGoalAvailabilityLogged();
}
//@ chunk-ndmse9kj.js:114316-114375 facade-majority
/**
 * 状态访问器：读取当前会话的 会话标志（sessionFlags） 上的 inheritedTeamName()。
 */
function getInheritedTeamName() {
  return currentSession().sessionFlags.inheritedTeamName();
}
//@ chunk-ndmse9kj.js:114375-114436 facade-majority
/**
 * 状态访问器：写入当前会话的 会话标志（sessionFlags） 上的 replaceInheritedTeamName()。
 */
function setInheritedTeamName(teamName) {
  currentSession().sessionFlags.replaceInheritedTeamName(teamName);
}
//@ chunk-ndmse9kj.js:114436-114564 facade-majority = setTeleportedSessionInfo (0.583)
/**
 * 状态访问器：写入当前会话的 会话标志（sessionFlags） 上的 replaceTeleportedSessionInfo()。
 */
function setTeleportedSessionInfo(info) {
  currentSession().sessionFlags.replaceTeleportedSessionInfo({
    isTeleported: true,
    hasLoggedFirstMessage: false,
    sessionId: info.sessionId,
  });
}
//@ chunk-ndmse9kj.js:114564-114627 facade-majority = getTeleportedSessionInfo (0.747)
/**
 * 状态访问器：读取当前会话的 会话标志（sessionFlags） 上的 teleportedSessionInfo()。
 */
function getTeleportedSessionInfo() {
  return currentSession().sessionFlags.teleportedSessionInfo();
}
//@ chunk-ndmse9kj.js:114627-114692 facade-majority
/**
 * 状态访问器：调用当前会话的 会话标志（sessionFlags） 上的 markFirstTeleportMessageLogged()。
 */
function markFirstTeleportMessageLogged() {
  currentSession().sessionFlags.markFirstTeleportMessageLogged();
}
//@ chunk-ndmse9kj.js:114692-114867 facade-majority = addInvokedSkill (0.822)
/**
 * addInvokedSkill：记录本会话调用过的技能（压缩后重新注入用），键为 agentId:skillName。
 */
function addInvokedSkill(
  skillName,
  skillPath,
  content,
  agentId = null,
  servedByMcp = false,
  invokedAt = Date.now(),
) {
  let key = `${agentId ?? ""}:${skillName}`;
  currentSession().invokedSkills.record(key, {
    skillName,
    skillPath,
    content,
    invokedAt,
    agentId,
    ...(servedByMcp && {
      servedByMcp,
    }),
  });
}
//@ chunk-ndmse9kj.js:114867-114916 facade-majority = getInvokedSkills (0.747)
/**
 * 状态访问器：读取当前会话的 已调用技能（invokedSkills） 上的 skills()。
 */
function getInvokedSkills() {
  return currentSession().invokedSkills.skills();
}
//@ chunk-ndmse9kj.js:114916-115020 facade-majority
/**
 * 更新已调用技能记录的内容。
 */
function updateInvokedSkillContent(key, content) {
  let session = currentSession();
  let existing = session.invokedSkills.lookup(key);
  if (existing)
    session.invokedSkills.record(key, {
      ...existing,
      content,
    });
}
//@ chunk-ndmse9kj.js:115020-115139 facade-majority = getInvokedSkillsForAgent (0.747)
/**
 * 会话状态函数 getInvokedSkillsForAgent：涉及当前会话的 invokedSkills.skills。
 */
function getInvokedSkillsForAgent(agentId) {
  let normalizedId = agentId ?? null;
  let filtered = new Map();
  for (let [key, skill] of currentSession().invokedSkills.skills())
    if (skill.agentId === normalizedId) filtered.set(key, skill);
  return filtered;
}
//@ chunk-ndmse9kj.js:115139-115324 facade-majority
/**
 * clearInvokedSkills：清除已调用技能，保留给定 agentId 集合的记录。
 */
function clearInvokedSkills(preservedAgentIds) {
  let session = currentSession();
  if (!preservedAgentIds || preservedAgentIds.size === 0) {
    session.invokedSkills.forgetAll();
    return;
  }
  for (let [key, skill] of session.invokedSkills.skills())
    if (skill.agentId === null || !preservedAgentIds.has(skill.agentId)) session.invokedSkills.forget(key);
}
//@ chunk-ndmse9kj.js:115324-115433 facade-majority = clearInvokedSkillsForAgent (0.586)
/**
 * clearInvokedSkillsForAgent：清除某代理的已调用技能。
 */
function clearInvokedSkillsForAgent(agentId) {
  let session = currentSession();
  for (let [key, skill] of session.invokedSkills.skills())
    if (skill.agentId === agentId) session.invokedSkills.forget(key);
}
//@ chunk-ndmse9kj.js:115433-115497 facade-majority
/**
 * 状态访问器：调用当前会话的 host（host） → 诊断（diagnostics） 上的 recordSlowOperation()。
 */
function addSlowOperation(operationName, durationMs) {
  currentSession().host.diagnostics.recordSlowOperation(operationName, durationMs);
}
//@ chunk-ndmse9kj.js:115497-115557 facade-majority = getSlowOperations (0.608)
/**
 * 状态访问器：读取当前会话的 host（host） → 诊断（diagnostics） 上的 slowOperations()。
 */
function getSlowOperations() {
  return currentSession().host.diagnostics.slowOperations();
}
//@ chunk-ndmse9kj.js:115557-115614 facade-majority
/**
 * 状态访问器：读取当前会话的 host（host） → 诊断（diagnostics） 上的 devBarAlert()。
 */
function getDevBarAlert() {
  return currentSession().host.diagnostics.devBarAlert();
}
//@ chunk-ndmse9kj.js:115614-115708 facade-majority = getMainThreadAgentType (0.68)
/**
 * 会话状态函数 getMainThreadAgentType：涉及当前会话的 hookRegistry.mainThreadAgentType。
 */
function getMainThreadAgentType() {
  let agentContext = getAgentContext();
  return agentContext
    ? agentContext.mainThreadAgentType
    : currentSession().hookRegistry.mainThreadAgentType();
}
//@ chunk-ndmse9kj.js:115708-115815 facade-majority = setMainThreadAgentType (0.496)
/**
 * 会话状态函数 setMainThreadAgentType：涉及当前会话的 hookRegistry.replaceMainThreadAgentType。
 */
function setMainThreadAgentType(agentType) {
  let agentContext = getAgentContext();
  if (agentContext) agentContext.mainThreadAgentType = agentType;
  else currentSession().hookRegistry.replaceMainThreadAgentType(agentType);
}
//@ chunk-ndmse9kj.js:115815-115911 facade-majority
/**
 * 会话状态函数 getMainThreadAgentHooks：涉及当前会话的 hookRegistry.mainThreadAgentHooks。
 */
function getMainThreadAgentHooks() {
  let agentContext = getAgentContext();
  return agentContext
    ? agentContext.mainThreadAgentHooks
    : currentSession().hookRegistry.mainThreadAgentHooks();
}
//@ chunk-ndmse9kj.js:115911-115971 facade-majority
/**
 * 默认 root 会话的主线程代理钩子。
 */
function getRootMainThreadAgentHooks() {
  return defaultRootSession.hookRegistry.mainThreadAgentHooks();
}
//@ chunk-ndmse9kj.js:115971-116086 facade-majority
/**
 * 会话状态函数 setMainThreadAgentHooks：涉及当前会话的 hookRegistry.replaceMainThreadAgentHooks。
 */
function setMainThreadAgentHooks(hooks) {
  let agentContext = getAgentContext();
  if (agentContext) agentContext.mainThreadAgentHooks = hooks;
  else currentSession().hookRegistry.replaceMainThreadAgentHooks(hooks);
  emitHookStoresChanged();
}
//@ chunk-ndmse9kj.js:116086-116157 facade-majority
/**
 * 状态访问器：读取当前会话的 host（host） → 扩展配置（extensionsConfig） 上的 sessionSkillAllowlist()。
 */
function getSessionSkillAllowlist() {
  return currentSession().host.extensionsConfig.sessionSkillAllowlist();
}
//@ chunk-ndmse9kj.js:116157-116231 facade-majority
/**
 * 状态访问器：写入当前会话的 host（host） → 扩展配置（extensionsConfig） 上的 replaceSessionSkillAllowlist()。
 */
function setSessionSkillAllowlist(skills) {
  currentSession().host.extensionsConfig.replaceSessionSkillAllowlist(skills);
}
//@ chunk-ndmse9kj.js:116231-116283 facade-majority
/**
 * 状态访问器：读取当前会话的 宿主能力（surfaceCapabilities） 上的 caps()。
 */
function getCaps() {
  return currentSession().surfaceCapabilities.caps();
}
//@ chunk-ndmse9kj.js:116283-116338 facade-majority
/**
 * 状态访问器：写入当前会话的 宿主能力（surfaceCapabilities） 上的 replaceCaps()。
 */
function setCaps(caps) {
  currentSession().surfaceCapabilities.replaceCaps(caps);
}
//@ chunk-ndmse9kj.js:116338-116411 facade-majority
/**
 * 会话状态函数 getIsRemoteMode：涉及当前会话的 surfaceCapabilities.caps。
 */
function getIsRemoteMode() {
  return currentSession().surfaceCapabilities.caps().workspace === "remote";
}
//@ chunk-ndmse9kj.js:116411-116465 facade-majority
/**
 * 状态访问器：调用当前会话的 宿主能力（surfaceCapabilities） 上的 markRemote()。
 */
function setIsRemoteMode(isRemoteMode) {
  currentSession().surfaceCapabilities.markRemote(isRemoteMode);
}
//@ chunk-ndmse9kj.js:116465-116543 facade-majority
/**
 * 当前会话在云端的工作目录。
 */
function getCloudCwd() {
  let session = currentSession();
  return session.surfaceCapabilities.cloudCwdOfSession(session.id);
}
//@ chunk-ndmse9kj.js:116543-116639 facade-majority
/**
 * 会话状态函数 setCloudCwd：涉及当前会话的 surfaceCapabilities.replaceCloudCwd。
 */
function setCloudCwd(update) {
  currentSession().surfaceCapabilities.replaceCloudCwd({
    sessionId: update.sessionId,
    cwd: identityString(update.cwd),
  });
}
//@ chunk-ndmse9kj.js:116639-116715 facade-majority
/**
 * 状态访问器：调用当前会话的 宿主能力（surfaceCapabilities） → cloudCwdChanged 上的 subscribe()。
 */
function onCloudCwdChange(listener) {
  return currentSession().surfaceCapabilities.cloudCwdChanged.subscribe(listener);
}
//@ chunk-ndmse9kj.js:116715-116767 facade-majority
/**
 * 状态访问器：读取当前会话的 提示词组装（promptAssembly） 上的 sections()。
 */
function getSystemPromptSectionCache() {
  return currentSession().promptAssembly.sections();
}
//@ chunk-ndmse9kj.js:116767-116823 facade-majority
/**
 * 状态访问器：调用当前会话的 提示词组装（promptAssembly） 上的 recordSection()。
 */
function setSystemPromptSectionCacheEntry(name, promptSection) {
  currentSession().promptAssembly.recordSection(name, promptSection);
}
//@ chunk-ndmse9kj.js:116823-116884 facade-majority
/**
 * 会话状态函数 clearSystemPromptSectionState：涉及当前会话的 promptAssembly.forgetAllSections。
 */
function clearSystemPromptSectionState(reason) {
  currentSession().promptAssembly.forgetAllSections();
  noteSystemPromptSectionInvalidation(reason);
}
//@ chunk-ndmse9kj.js:116884-116938 facade-majority
/**
 * 状态访问器：调用当前会话的 提示词组装（promptAssembly） 上的 noteInvalidation()。
 */
function noteSystemPromptSectionInvalidation(reason) {
  currentSession().promptAssembly.noteInvalidation(reason);
}
//@ chunk-ndmse9kj.js:116938-116986 facade-majority
/**
 * 状态访问器：读取当前会话的 提示词组装（promptAssembly） 上的 epoch()。
 */
function getSystemPromptSectionEpoch() {
  return currentSession().promptAssembly.epoch();
}
//@ chunk-ndmse9kj.js:116986-117052 facade-majority
/**
 * 状态访问器：读取当前会话的 提示词组装（promptAssembly） 上的 lastInvalidationReason()。
 */
function getSystemPromptInvalidationReason() {
  return currentSession().promptAssembly.lastInvalidationReason();
}
//@ chunk-ndmse9kj.js:117052-117110 facade-majority
/**
 * 状态访问器：读取当前会话的 会话暂存（sessionScratch） 上的 vimSharedState()。
 */
function getVimSharedState() {
  return currentSession().sessionScratch.vimSharedState();
}
//@ chunk-ndmse9kj.js:117110-117170 facade-majority
/**
 * 状态访问器：写入当前会话的 会话暂存（sessionScratch） 上的 replaceVimSharedState()。
 */
function setVimSharedState(initialPersistentState) {
  currentSession().sessionScratch.replaceVimSharedState(initialPersistentState);
}
//@ chunk-ndmse9kj.js:117170-117259 facade-majority = getAdditionalDirectoriesForClaudeMd (0.729)
/**
 * 会话状态函数 getAdditionalDirectoriesForClaudeMd：涉及当前会话的 host.extensionsConfig.additionalDirectoriesForClaudeMd。
 */
function getAdditionalDirectoriesForClaudeMd() {
  return isDiskless() ? [] : currentSession().host.extensionsConfig.additionalDirectoriesForClaudeMd();
}
//@ chunk-ndmse9kj.js:117259-117343 facade-majority
/**
 * 状态访问器：写入当前会话的 host（host） → 扩展配置（extensionsConfig） 上的 replaceAdditionalDirectoriesForClaudeMd()。
 */
function setAdditionalDirectoriesForClaudeMd(dirs) {
  currentSession().host.extensionsConfig.replaceAdditionalDirectoriesForClaudeMd(dirs);
}
//@ chunk-ndmse9kj.js:117343-117428 facade-majority
/**
 * 状态访问器：读取当前会话的 host（host） → 扩展配置（extensionsConfig） 上的 claudeMdAdditionalDirectoriesAsked()。
 */
function getClaudeMdAdditionalDirectoriesAsked() {
  return currentSession().host.extensionsConfig.claudeMdAdditionalDirectoriesAsked();
}
//@ chunk-ndmse9kj.js:117428-117506 facade-majority
/**
 * 状态访问器：调用当前会话的 host（host） → 扩展配置（extensionsConfig） 上的 askClaudeMdAdditionalDirectories()。
 */
function setClaudeMdAdditionalDirectoriesAsked(addedDirectories) {
  currentSession().host.extensionsConfig.askClaudeMdAdditionalDirectories(addedDirectories);
}
//@ chunk-ndmse9kj.js:117506-117571 facade-majority = getAllowedChannels (0.729)
/**
 * 状态访问器：读取当前会话的 host（host） → 扩展配置（extensionsConfig） 上的 allowedChannels()。
 */
function getAllowedChannels() {
  return currentSession().host.extensionsConfig.allowedChannels();
}
//@ chunk-ndmse9kj.js:117571-117639 facade-majority
/**
 * 状态访问器：写入当前会话的 host（host） → 扩展配置（extensionsConfig） 上的 replaceAllowedChannels()。
 */
function setAllowedChannels(channels) {
  currentSession().host.extensionsConfig.replaceAllowedChannels(channels);
}
//@ chunk-ndmse9kj.js:117639-117704 facade-majority = getHasDevChannels (0.729)
/**
 * 状态访问器：读取当前会话的 host（host） → 扩展配置（extensionsConfig） 上的 hasDevChannels()。
 */
function getHasDevChannels() {
  return currentSession().host.extensionsConfig.hasDevChannels();
}
//@ chunk-ndmse9kj.js:117704-117771 facade-majority
/**
 * 状态访问器：写入当前会话的 host（host） → 扩展配置（extensionsConfig） 上的 replaceHasDevChannels()。
 */
function setHasDevChannels(hasDevChannels) {
  currentSession().host.extensionsConfig.replaceHasDevChannels(hasDevChannels);
}
//@ chunk-ndmse9kj.js:117771-117842 facade-majority = getPromptCache1hAllowlist (0.75)
/**
 * 状态访问器：读取当前会话的 host（host） → 请求锁存（requestLatches） 上的 promptCache1hAllowlist()。
 */
function getPromptCache1hAllowlist() {
  return currentSession().host.requestLatches.promptCache1hAllowlist();
}
//@ chunk-ndmse9kj.js:117842-117915 facade-majority
function setPromptCache1hAllowlist(allowlist) {
  currentSession().host.requestLatches.replacePromptCache1hAllowlist(allowlist);
}
//@ chunk-ndmse9kj.js:117915-117993 facade-majority
function getThinkingTypeOverride(model) {
  return currentSession().host.requestLatches.thinkingTypeOverrides().get(model);
}
//@ chunk-ndmse9kj.js:117993-118067 facade-majority
function setThinkingTypeOverride(model, thinkingType) {
  currentSession().host.requestLatches.recordThinkingTypeOverride(model, thinkingType);
}
//@ chunk-ndmse9kj.js:118067-118152 facade-majority
function getServedModelsForRequestedModel(requestedModel) {
  return currentSession().host.requestLatches.servedModelsByRequestedModel().get(requestedModel);
}
//@ chunk-ndmse9kj.js:118152-118314 facade-majority
function recordServedModel(requestedModel, model) {
  if (requestedModel === model) return;
  let requestLatches = currentSession().host.requestLatches;
  let servedModels = requestLatches.servedModelsByRequestedModel().get(requestedModel);
  if (servedModels) servedModels.add(model);
  else requestLatches.recordServedModels(requestedModel, new Set([model]));
}
//@ chunk-ndmse9kj.js:118314-118394 facade-majority
function isEffortMarkedUnsupported(model) {
  return currentSession().host.requestLatches.effortUnsupportedModels().has(model);
}
//@ chunk-ndmse9kj.js:118394-118459 facade-majority
function markEffortUnsupported(model) {
  currentSession().host.requestLatches.markEffortUnsupported(model);
}
//@ chunk-ndmse9kj.js:118459-118550 facade-majority
function isStructuredOutputsMarkedUnsupported(model) {
  return currentSession().host.requestLatches.structuredOutputsUnsupportedModels().has(model);
}
//@ chunk-ndmse9kj.js:118550-118626 facade-majority
function markStructuredOutputsUnsupported(model) {
  currentSession().host.requestLatches.markStructuredOutputsUnsupported(model);
}
//@ chunk-ndmse9kj.js:118626-118701 facade-majority
function clearStructuredOutputsUnsupported() {
  currentSession().host.requestLatches.clearStructuredOutputsUnsupported();
}
//@ chunk-ndmse9kj.js:118701-118780 facade-majority
function isContext1mMarkedRefused(model) {
  return currentSession().host.requestLatches.context1mRefusedModels().has(model);
}
//@ chunk-ndmse9kj.js:118780-118844 facade-majority
function markContext1mRefused(model) {
  currentSession().host.requestLatches.markContext1mRefused(model);
}
//@ chunk-ndmse9kj.js:118844-118907 facade-majority
function clearContext1mRefused() {
  currentSession().host.requestLatches.clearContext1mRefused();
}
//@ chunk-ndmse9kj.js:118907-118970 facade-majority
function getRefusedBetasForModel(modelId) {
  return currentSession().host.requestLatches.refusedBetas(modelId);
}
//@ chunk-ndmse9kj.js:118970-119033 facade-majority
function markBetaRefusedForModel(model, betaName) {
  currentSession().host.requestLatches.markBetaRefused(model, betaName);
}
//@ chunk-ndmse9kj.js:119033-119099 facade-majority
function getLearnedEffortCaps() {
  return currentSession().host.requestLatches.learnedEffortCaps();
}
//@ chunk-ndmse9kj.js:119099-119177 facade-majority
function isMidConvCachePromotionRejected() {
  return currentSession().host.requestLatches.midConvCachePromotionRejected();
}
//@ chunk-ndmse9kj.js:119177-119252 facade-majority
function markMidConvCachePromotionRejected() {
  currentSession().host.requestLatches.markMidConvCachePromotionRejected();
}
//@ chunk-ndmse9kj.js:119252-119333 facade-majority
function isThirdPartyServerClassifierRefused() {
  return currentSession().host.requestLatches.thirdPartyServerClassifierRefused();
}
//@ chunk-ndmse9kj.js:119333-119412 facade-majority
function markThirdPartyServerClassifierRefused() {
  currentSession().host.requestLatches.markThirdPartyServerClassifierRefused();
}
//@ chunk-ndmse9kj.js:119412-119494 facade-majority
function releaseThirdPartyServerClassifierRefusal() {
  currentSession().host.requestLatches.releaseThirdPartyServerClassifierRefusal();
}
//@ chunk-ndmse9kj.js:119494-119573 facade-majority
function isThreadsHeldForServerClassifier() {
  return currentSession().host.requestLatches.threadsHeldForServerClassifier();
}
//@ chunk-ndmse9kj.js:119573-119649 facade-majority
function markThreadsHeldForServerClassifier() {
  currentSession().host.requestLatches.markThreadsHeldForServerClassifier();
}
//@ chunk-ndmse9kj.js:119649-119727 facade-majority
function getAutoModeUnavailableResponse(toolUseId) {
  return currentSession().host.requestLatches.autoModeUnavailableResponse(toolUseId);
}
//@ chunk-ndmse9kj.js:119727-119812 facade-majority
function getAutoModeUnavailableResponsesInARow(runKey) {
  return currentSession().host.requestLatches.autoModeUnavailableResponsesInARow(runKey);
}
//@ chunk-ndmse9kj.js:119812-119904 facade-majority
function dropAutoModeUnavailableResponsesOfOtherTurns(runKey, turn) {
  currentSession().host.requestLatches.dropAutoModeUnavailableResponsesOfOtherTurns(runKey, turn);
}
//@ chunk-ndmse9kj.js:119904-119983 facade-majority
function noteAutoModeUnavailableResponse(toolUseId, response) {
  currentSession().host.requestLatches.noteAutoModeUnavailableResponse(toolUseId, response);
}
//@ chunk-ndmse9kj.js:119983-120060 facade-majority
function clearAutoModeUnavailableResponses(toolUseId) {
  currentSession().host.requestLatches.clearAutoModeUnavailableResponses(toolUseId);
}
//@ chunk-ndmse9kj.js:120060-120136 facade-majority
function setAutoModeUnavailableStopNotice(notice) {
  currentSession().host.requestLatches.setAutoModeUnavailableStopNotice(notice);
}
//@ chunk-ndmse9kj.js:120136-120214 facade-majority
function getAutoModeUnavailableStopNotice() {
  return currentSession().host.requestLatches.autoModeUnavailableStopNotice();
}
//@ chunk-ndmse9kj.js:120214-120281 facade-majority
function setLocalCommandExitCode(exitCode) {
  currentSession().host.requestLatches.setLocalCommandExitCode(exitCode);
}
//@ chunk-ndmse9kj.js:120281-120350 facade-majority
function getLocalCommandExitCode() {
  return currentSession().host.requestLatches.localCommandExitCode();
}
//@ chunk-ndmse9kj.js:120350-120414 facade-majority
function getObservedGateway() {
  return currentSession().host.requestLatches.observedGateway();
}
//@ chunk-ndmse9kj.js:120414-120477 facade-majority
function noteObservedGateway(gateway) {
  currentSession().host.requestLatches.noteObservedGateway(gateway);
}
//@ chunk-ndmse9kj.js:120477-120556 facade-majority
function getServerClassifierFallbackChoice() {
  return currentSession().host.requestLatches.serverClassifierFallbackChoice();
}
//@ chunk-ndmse9kj.js:120556-120633 facade-majority
function setServerClassifierFallbackChoice(choice) {
  currentSession().host.requestLatches.setServerClassifierFallbackChoice(choice);
}
//@ chunk-ndmse9kj.js:120633-120710 facade-majority
function clearServerClassifierFallbackChoice() {
  currentSession().host.requestLatches.clearServerClassifierFallbackChoice();
}
//@ chunk-ndmse9kj.js:120710-120799 facade-majority
function takeServerClassifierFallbackAnnouncement() {
  return currentSession().host.requestLatches.takeServerClassifierFallbackAnnouncement();
}
//@ chunk-ndmse9kj.js:120799-120867 facade-majority
function noteNoServerCheck(reason) {
  return currentSession().host.requestLatches.noteNoServerCheck(reason);
}
//@ chunk-ndmse9kj.js:120867-120937 facade-majority
function noteNoServerCheckStoppedTurn() {
  currentSession().host.requestLatches.noteNoServerCheckStoppedTurn();
}
//@ chunk-ndmse9kj.js:120937-121014 facade-majority
function takeNoServerCheckStoppedTurn() {
  return currentSession().host.requestLatches.takeNoServerCheckStoppedTurn();
}
//@ chunk-ndmse9kj.js:121014-121092 facade-majority
function takeNoServerCheckAnnouncement() {
  return currentSession().host.requestLatches.takeNoServerCheckAnnouncement();
}
//@ chunk-ndmse9kj.js:121092-121163 facade-majority
function isPerTurnEffortOkEmitted() {
  return currentSession().host.requestLatches.perTurnEffortOkEmitted();
}
//@ chunk-ndmse9kj.js:121163-121231 facade-majority
function markPerTurnEffortOkEmitted() {
  currentSession().host.requestLatches.markPerTurnEffortOkEmitted();
}
//@ chunk-ndmse9kj.js:121231-121306 facade-majority
function isLateToolAdditionsOkEmitted() {
  return currentSession().host.requestLatches.lateToolAdditionsOkEmitted();
}
//@ chunk-ndmse9kj.js:121306-121378 facade-majority
function markLateToolAdditionsOkEmitted() {
  currentSession().host.requestLatches.markLateToolAdditionsOkEmitted();
}
//@ chunk-ndmse9kj.js:121378-121450 facade-majority
function isToolChangeHeaderRefused() {
  return currentSession().host.requestLatches.toolChangeHeaderRefused();
}
//@ chunk-ndmse9kj.js:121450-121519 facade-majority
function markToolChangeHeaderRefused() {
  currentSession().host.requestLatches.markToolChangeHeaderRefused();
}
//@ chunk-ndmse9kj.js:121519-121588 facade-majority
function isPromptEndMarkRefused() {
  return currentSession().host.requestLatches.promptEndMarkRefused();
}
//@ chunk-ndmse9kj.js:121588-121654 facade-majority
function markPromptEndMarkRefused() {
  currentSession().host.requestLatches.markPromptEndMarkRefused();
}
//@ chunk-ndmse9kj.js:121654-121721 facade-majority
function isInlineToolsRefused() {
  return currentSession().host.requestLatches.inlineToolsRefused();
}
//@ chunk-ndmse9kj.js:121721-121785 facade-majority
function markInlineToolsRefused() {
  currentSession().host.requestLatches.markInlineToolsRefused();
}
//@ chunk-ndmse9kj.js:121785-121854 facade-majority
function isInlineToolsOkEmitted() {
  return currentSession().host.requestLatches.inlineToolsOkEmitted();
}
//@ chunk-ndmse9kj.js:121854-121920 facade-majority
function markInlineToolsOkEmitted() {
  currentSession().host.requestLatches.markInlineToolsOkEmitted();
}
//@ chunk-ndmse9kj.js:121920-121994 facade-majority
function isThinkingResumptionRefused() {
  return currentSession().host.requestLatches.thinkingResumptionRefused();
}
//@ chunk-ndmse9kj.js:121994-122065 facade-majority
function markThinkingResumptionRefused() {
  currentSession().host.requestLatches.markThinkingResumptionRefused();
}
//@ chunk-ndmse9kj.js:122065-122132 facade-majority
function getRefusedBetaHeaders() {
  return currentSession().host.requestLatches.refusedBetaHeaders();
}
//@ chunk-ndmse9kj.js:122132-122197 facade-majority
function markBetaHeaderRefused(headerName) {
  currentSession().host.requestLatches.markBetaHeaderRefused(headerName);
}
//@ chunk-ndmse9kj.js:122197-122271 facade-majority
function isThinkingHighlightsRefused() {
  return currentSession().host.requestLatches.thinkingHighlightsRefused();
}
//@ chunk-ndmse9kj.js:122271-122342 facade-majority
function markThinkingHighlightsRefused() {
  currentSession().host.requestLatches.markThinkingHighlightsRefused();
}
//@ chunk-ndmse9kj.js:122342-122426 facade-majority
function isToolChangeUnsupportedModel(canonicalName) {
  return currentSession().host.requestLatches.toolChangeUnsupportedModels().has(canonicalName);
}
//@ chunk-ndmse9kj.js:122426-122500 facade-majority
function markToolChangeUnsupportedModel(canonicalName) {
  currentSession().host.requestLatches.markToolChangeUnsupportedModel(canonicalName);
}
//@ chunk-ndmse9kj.js:122500-122586 facade-majority
function getInferenceProfileBackingModelCached(profileId) {
  return currentSession().host.requestLatches.inferenceProfileBackingModels().get(profileId);
}
//@ chunk-ndmse9kj.js:122586-122668 facade-majority
function setInferenceProfileBackingModel(profileId, backingModel) {
  currentSession().host.requestLatches.recordInferenceProfileBackingModel(profileId, backingModel);
}
//@ chunk-ndmse9kj.js:122668-122745 facade-majority
function getStickyBetas() {
  return getAgentContext()?.stickyBetas ?? currentSession().conversationLatches.stickyBetas();
}
//@ chunk-ndmse9kj.js:122745-122839 facade-majority
function getConversationAtisLatch() {
  let agentContext = getAgentContext();
  return agentContext ? agentContext.conversationAtisLatch : currentSession().conversationLatches.atisLatch();
}
//@ chunk-ndmse9kj.js:122839-122945 facade-majority
function setConversationAtisLatch(latch) {
  let agentContext = getAgentContext();
  if (agentContext) agentContext.conversationAtisLatch = latch;
  else currentSession().conversationLatches.replaceAtisLatch(latch);
}
//@ chunk-ndmse9kj.js:122945-123028 facade-majority
function getConversationToolsUsed() {
  return getAgentContext()?.conversationToolsUsed ?? currentSession().conversationLatches.toolsUsed;
}
//@ chunk-ndmse9kj.js:123028-123145 facade-majority
function clearBetaHeaderLatches() {
  let agentContext = getAgentContext();
  if (agentContext) agentContext.stickyBetas = unlatchStickyBetaLatches(agentContext.stickyBetas);
  else currentSession().conversationLatches.unlatchStickyBetas();
  clearContext1mRefused();
}
//@ chunk-ndmse9kj.js:123145-123196 facade-majority
function getPromptId() {
  return currentSession().requestJournal.promptId();
}
//@ chunk-ndmse9kj.js:123196-123250 facade-majority
function setPromptId(promptId) {
  currentSession().requestJournal.replacePromptId(promptId);
}
//@ chunk-ndmse9kj.js:123250-123314 facade-majority
function incrementPromptIndex() {
  return currentSession().requestJournal.incrementPromptIndex();
}
//@ chunk-ndmse9kj.js:123314-123368 facade-majority
function getPromptIndex() {
  return currentSession().requestJournal.promptIndex();
}
//@ chunk-ndmse9kj.js:123368-123577 facade-majority
function notePersonPrompt(uuid, timestamp, clientPlatform) {
  let requestJournal = currentSession().requestJournal;
  let existing = requestJournal.lastPersonPrompt();
  let timestamp_2 = Date.parse(timestamp);
  if (existing === null || (!Number.isNaN(timestamp_2) && !(timestamp_2 < Date.parse(existing.timestamp))))
    requestJournal.replaceLastPersonPrompt({
      uuid,
      timestamp,
      clientPlatform,
    });
}
//@ chunk-ndmse9kj.js:123577-123637 facade-majority
function getLastPersonPrompt() {
  return currentSession().requestJournal.lastPersonPrompt();
}
//@ chunk-ndmse9kj.js:123637-123701 facade-majority
function isReplBridgeActive() {
  return currentSession().surfaceCapabilities.replBridgeActive();
}
//@ chunk-ndmse9kj.js:123701-123768 facade-majority
function setReplBridgeActive(active) {
  currentSession().surfaceCapabilities.replaceReplBridgeActive(active);
}
//@ chunk-ndmse9kj.js:123768-123829 facade-majority
function getMainLoopBusy() {
  return currentSession().surfaceCapabilities.mainLoopBusy();
}
//@ chunk-ndmse9kj.js:123829-123894 facade-majority
function getMainQueryRunning() {
  return currentSession().surfaceCapabilities.mainQueryRunning();
}
//@ chunk-ndmse9kj.js:123894-123959 facade-majority
function setMainLoopStatus(status) {
  currentSession().surfaceCapabilities.replaceMainLoopStatus(status);
}
//@ chunk-xdkvf45x.js:295-360 fingerprint = getSessionCounter (0.729)
/**
 * getSessionCounter：OTel 计数器 claude_code.session.count。
 */
function getSessionCounter() {
  return rootSession().host.telemetryHandles.sessionCounter();
}
//@ chunk-xdkvf45x.js:360-421 fingerprint = getLocCounter (0.729)
/**
 * getLocCounter：claude_code.lines_of_code.count。
 */
function getLocCounter() {
  return rootSession().host.telemetryHandles.locCounter();
}
//@ chunk-xdkvf45x.js:421-481 fingerprint = getPrCounter (0.729)
/**
 * getPrCounter：claude_code.pull_request.count。
 */
function getPrCounter() {
  return rootSession().host.telemetryHandles.prCounter();
}
//@ chunk-xdkvf45x.js:481-545 fingerprint = getCommitCounter (0.729)
/**
 * getCommitCounter：claude_code.commit.count。
 */
function getCommitCounter() {
  return rootSession().host.telemetryHandles.commitCounter();
}
//@ chunk-xdkvf45x.js:545-607 fingerprint = getCostCounter (0.729)
/**
 * getCostCounter：claude_code.cost.usage。
 */
function getCostCounter() {
  return rootSession().host.telemetryHandles.costCounter();
}
//@ chunk-xdkvf45x.js:607-670 fingerprint = getTokenCounter (0.729)
/**
 * getTokenCounter：claude_code.token.usage。
 */
function getTokenCounter() {
  return rootSession().host.telemetryHandles.tokenCounter();
}
//@ chunk-xdkvf45x.js:670-748 fingerprint = getCodeEditToolDecisionCounter (0.729)
/**
 * getCodeEditToolDecisionCounter：claude_code.code_edit_tool.decision。
 */
function getCodeEditToolDecisionCounter() {
  return rootSession().host.telemetryHandles.codeEditToolDecisionCounter();
}
//@ chunk-xdkvf45x.js:748-816 fingerprint = getActiveTimeCounter (0.729)
/**
 * getActiveTimeCounter：claude_code.active_time.total。
 */
function getActiveTimeCounter() {
  return rootSession().host.telemetryHandles.activeTimeCounter();
}
//@ chunk-xdkvf45x.js:816-880 fingerprint = getMeterProvider (0.729)
/**
 * getMeterProvider：OTel MeterProvider。
 */
function getMeterProvider() {
  return rootSession().host.telemetryHandles.meterProvider();
}
//@ chunk-xdkvf45x.js:880-946 placement
/**
 * 替换当前会话宿主的 OTel MeterProvider（遥测类访问器的写入口）。
 */
function replaceMeterProvider(meterProvider) {
  rootSession().host.telemetryHandles.replaceMeterProvider(meterProvider);
}
//@ chunk-xdkvf45x.js:946-970 placement
function rootSession() {
  return getRootSession();
}
export {
  getMainLoopEffortState,
  getSessionSkillAllowlist,
  getIsNonInteractiveSession,
  isCcsTenant,
  getCcrDerivedSurface,
  getEntrypointOnRequests,
  getSystemPromptSectionCache,
  getSystemPromptSectionEpoch,
  getSdkBetas,
  isDiskless,
  getSessionId,
  markScrollActivity,
  getGatewayAuth,
  getProjectRoot,
  getProjectRootOrNull,
  isLongContext1mCreditsBlocked,
  getServedModelsForRequestedModel,
  getStrictToolResultPairing,
  setMainThreadAgentHooks,
  getOriginalCwd,
  switchSession,
  setMainThreadAgentType,
  getMainLoopModelOverride,
  setMainLoopModelOverride,
  latchRefusalFallbackModel,
  getInitialMainLoopModel,
  markRefusalFallbackHeaderArmed,
  setOriginalCwd,
  getIsInteractive,
  getIsRemoteMode,
  getDisableSlashCommands,
  getRootSession,
  setTeleportedSessionInfo,
  getAttacherCaps,
  getAllowedChannels,
  getPermissionPromptToolName,
  isSdkDialogHostActive,
  getServerClassifierFallbackChoice,
  isThirdPartyServerClassifierRefused,
  markThirdPartyServerClassifierRefused,
  noteNoServerCheck,
  noteNoServerCheckStoppedTurn,
  getTotalInputTokens,
  getTotalOutputTokens,
  getTotalCacheReadInputTokens,
  getTotalCacheCreationInputTokens,
  onAttacherCapsChange,
  isSessionPersistenceDisabled,
  getProjectConfigRoot,
  getAdditionalDirectoriesForClaudeMd,
  mainAgentId,
  clearInvokedSkillsForAgent,
  getPolicyPredicateTelemetryEmitted,
  getOriginalCwdOrNull,
  getStrictMcpConfig,
  setUsageCreditsRequired,
  getStickyBetas,
  getThinkingDisplayExplicit,
  getSdkAgentProgressSummariesEnabled,
  onProcessRootHost,
  isRestrictedWorkspaceTrustKey,
  getSessionTrustAccepted,
  getSessionProjectDir,
  getConversationAtisLatch,
  getConversationToolsUsed,
  getPromptId,
  getPlanSlugCache,
  registerCostStateRecorder,
  setConversationAtisLatch,
  getRestoredMemoryPause,
  setRestoredMemoryPause,
  setMemoryToggledOff,
  getRestoredAutoMemoryOff,
  setRestoredAutoMemoryOff,
  setAutoMemoryOffThisSession,
  getAuthenticatedAccountEpoch,
  setAdditionalDirectoriesForClaudeMd,
  getInvokedSkills,
  addInvokedSkill,
  getLastInteractionTime,
  getMainThreadAgentType,
  getSessionCronTasks,
  addSessionCronTask,
  setScheduledTasksEnabled,
  getLoopTickInFlightPrompt,
  getInlinePlugins,
  setInlinePlugins,
  getLastCancelledAPIMessageId,
  getPromptIndex,
  setThinkingDisplayExplicit,
  isThinkingHighlightsRefused,
  isHomeDirectorySession,
  getInlinePluginsNoMcp,
  setFlagSettingsExpectedContent,
  setFlagSettingsFilePinnedContent,
  setFlagSettingsPath,
  setParentManagedSettingsInvalid,
  setParentManagedSettings,
  setAllowedSettingSources,
  setFlagSettingsInline,
  getFlagSettingsInline,
  setRestrictedSession,
  getAllowedSettingSourcesAsConfigured,
  getExtendedQuestionsEnabled,
  setPrintOutputFormat,
  isParkedSpare,
  setSdkBetas,
  getMcpConnectNonBlocking,
  isDisklessProcess,
  setProjectConfigRoot,
  setInlinePluginsNoMcp,
  setInlinePluginUrls,
  isRestrictedSession,
  setIsInteractive,
  setSessionStartType,
  setClientType,
  setQuestionPreviewFormat,
  setExtendedQuestionsEnabled,
  setQuestionOptionDescriptionsOptional,
  setSdkAgentProgressSummariesEnabled,
  setGatewayServerProcess,
  setOnboardingShownThisSession,
  getUserMsgOptIn,
  setIsRemoteMode,
  isOauthTokenFromBgSnapshot,
  setGatewayAuth,
  holdGatewayHostStrict,
  preferThirdPartyAuthentication,
  getOauthScopesFromFd,
  getLoginStashedInTokenSlot,
  getOauthTokenFromFd,
  getSdkOAuthTokenRefreshCallback,
  setAuthenticatedAccount,
  setOauthTokenFromFd,
  setOauthScopesFromFd,
  setLoginStashedInTokenSlot,
  getAuthenticatedAccount,
  NOTIF_ACTIVE_THRESHOLD_MS,
  getFlagAgentsFilePaths,
  getFlagMcpConfigFilePaths,
  getFlagSettingsPath,
  getReplConfigArgv,
  getCaps,
  getForkReplayLaunchConfig,
  getMemoryToggledOff,
  getAutoMemoryOffThisSession,
  forgetMainChainOnHandOff,
  clearRefusalFallbackModelLatch,
  updateLastInteractionTime,
  getForkRestrictedLaunchConfig,
  getTeammateAgentId,
  isWorkspaceRestricted,
  setReplBridgeActive,
  setRendererModeForAnalytics,
  getSessionBypassPermissionsMode,
  setCloudCwd,
  setCwdState,
  getOnboardingShownThisSession,
  setCaps,
  getParentSessionId,
  removeSessionCronTasks,
  resetCostState,
  onSessionSwitch,
  hasRefusalFallbackOccurred,
  hasRefusalFallbackHeaderArmed,
  setLastMainThreadContextTokens,
  clearPendingContextCompacted,
  clearRefusalFallbackOccurred,
  onSessionCronsChange,
  getLastApiCompletionTimestamp,
  getRefusalFallbackModelLatch,
  releaseRefusalFallbackCarriedEffort,
  isEffortMarkedUnsupported,
  setMainLoopEffortState,
  onProactivitySelectorGateChanged,
  getMcpClientsFromAccessor,
  getToolsMachine,
  getConnectedClientWiring,
  getEnsureConnectedClient,
  setEnsureConnectedClient,
  isPrintInputClosed,
  isSingleShotPrintSession,
  filesPlacedByNameRead,
  isReplBridgeActive,
  getTotalCostUSD,
  getTotalDuration,
  getTotalAPIDuration,
  getTotalLinesAdded,
  getTotalLinesRemoved,
  setHasStreamingInput,
  setSingleShotPrintSession,
  deriveSingleShotPrintSession,
  takeUsageSinceLastResult,
  trackUsageSinceLastResult,
  setSdkOAuthTokenRefreshCallback,
  setHostAuthTokenRefreshCallback,
  claimCostLedgerForCurrentSession,
  getLocalCommandExitCode,
  getSdkPerTaskStopAffordance,
  noteSystemPromptSectionInvalidation,
  setConnectedClientWiring,
  setMcpClientsAccessor,
  setMcpServerToolsSwapper,
  getInitJsonSchema,
  getHostRendersChromeSetupOffer,
  getHasStreamingInput,
  setAwaitsFirstRun,
  getSpareClaimState,
  getModelUsage,
  getSafetyStops,
  isUnclaimedSpare,
  markSpareClaimFailed,
  getSyncedPluginReloadDebt,
  markPrintInputClosed,
  setSdkPerTaskStopAffordance,
  setSdkRapidFollowupPreempt,
  setSdkForwardNestedSubagentToolCalls,
  setSessionSkillAllowlist,
  setInitJsonSchema,
  setAllowedChannels,
  onMemoryPauseChange,
  onAutoMemorySessionSwitchChange,
  getLastAPIRequest,
  setHasUnknownModelCost,
  getInferenceProfileBackingModelCached,
  flushInteractionTime,
  getTerminalFocus,
  handlePlanModeTransition,
  setNeedsAutoModeExitAttachment,
  setHasExitedPlanMode,
  setNeedsPlanModeExitAttachment,
  setMainLoopStatus,
  swapMcpServerTools,
  setAutoModeUnavailableStopNotice,
  setLocalCommandExitCode,
  getAutoModeUnavailableStopNotice,
  setLastCancelledAPIMessageId,
  onInteraction,
  recordSubmitTime,
  getRendererModeForAnalytics,
  getClientType,
  getChromeFlagOverride,
  getIsScrollDraining,
  setTerminalFocusForState,
  getLastMainThreadCacheTtlMs,
  getLastMainThreadCacheRenewedAt,
  hasShownLspRecommendationThisSession,
  setLspRecommendationShownThisSession,
  getLoopWakeFires,
  recordLoopWakeFire,
  getLastMainThreadContextTokens,
  isPromptEndMarkRefused,
  isStructuredOutputsMarkedUnsupported,
  markStructuredOutputsUnsupported,
  getLearnedEffortCaps,
  getPrintOutputFormat,
  getPromptCache1hAllowlist,
  setPromptCache1hAllowlist,
  isLastMainThreadAskLive,
  adjustLastMainThreadCacheTtlMs,
  getRefusedBetasForModel,
  markBetaRefusedForModel,
  getResponseBeforeCompaction,
  setLastMainThreadCacheTtlMs,
  getMainChainReleaseCount,
  releaseThirdPartyServerClassifierRefusal,
  getThinkingTypeOverride,
  isMidConvCachePromotionRejected,
  markPromptEndMarkRefused,
  markMidConvCachePromotionRejected,
  isPerTurnEffortOkEmitted,
  markPerTurnEffortOkEmitted,
  isLateToolAdditionsOkEmitted,
  markLateToolAdditionsOkEmitted,
  isInlineToolsOkEmitted,
  markInlineToolsOkEmitted,
  markEffortUnsupported,
  markThinkingHighlightsRefused,
  markThinkingResumptionRefused,
  markBetaHeaderRefused,
  consumePendingContextCompacted,
  setThinkingTypeOverride,
  recordServedModel,
  forgetResponseBeforeCompaction,
  setLastMainRequestId,
  takeRefusalFallbackCarriedEffortEnd,
  setUserMsgOptIn,
  setProjectRoot,
  setFlagAgentsFilePaths,
  setDisableSlashCommands,
  setTeammateAgentId,
  setSessionBypassPermissionsMode,
  setFlagMcpConfigFilePaths,
  setChromeFlagOverride,
  setStrictMcpConfig,
  setCliSessionConfigCarried,
  setForkRestrictedLaunchConfig,
  setForkReplayLaunchConfig,
  setPermissionPromptToolName,
  setReplConfigArgv,
  setSessionTrustAccepted,
  hasSyncedPluginLaneOpened,
  clearSyncedPluginDirs,
  setSessionPersistenceDisabled,
  markSpareParked,
  getSkillsSyncVetoed,
  getPluginsSyncVetoed,
  getFlagSettingsExpectedContent,
  getSyncedPluginDirs,
  getProposeGoalAvailabilityLogged,
  setProposeGoalAvailabilityLogged,
  isGatewayServerProcess,
  isGatewayRequiredByHostPolicy,
  getCcrSessionUrl,
  getSessionApprovedMcpServers,
  setHomeTrustDialogAccepted,
  setCachedClaudeMdContent,
  setHasDevChannels,
  isOTelInitPending,
  getMeterProvider,
  setStatsStore,
  addSessionApprovedMcpServers,
  getHomeTrustDialogAccepted,
  isPollEventIngressWired,
  getPollEventIngress,
  markPollEventWiringForRun,
  saveSessionCostsForTransition,
  regenerateSessionId,
  getSessionUploadsDirOverride,
  inboundAttachmentDownloadRegistry,
  getLocalUploadsRoot,
  inboundAttachmentFileRegistry,
  setGatewayRequiredByHostPolicyReader,
  getPrCounter,
  getCachedClaudeMdContent,
  setLastClassifierRequests,
  getLastClassifierRequests,
  getParentManagedSettingsInvalid,
  emitHookStoresChanged,
  getCwdState,
  getCloudCwd,
  onCloudCwdChange,
  hasRegisteredSyncedPluginDirs,
  getPermissionScreenAnchor,
  wasDescriptorAnnouncementConsumed,
  getSdkDialogCapabilitySource,
  markRefusalFallbackOccurred,
  isGatewayAuthPinned,
  setEntrypointOnRequests,
  getPluginHookRunner,
  getInvokedSkillsForAgent,
  setPromptId,
  notePersonPrompt,
  onPendingLoopWakeupChange,
  getActiveTimeCounter,
  markSyncedPluginDirsLoadedHere,
  markSyncedPluginLaneOpened,
  getSyncedPluginRowId,
  getInlinePluginUrls,
  getSyncedPluginAttestation,
  setAttestedOfficialPluginIds,
  setLastSyncedLaneLoad,
  setInitialMainLoopModel,
  setInitialModelSettingLayer,
  setResolvedOrgDefault,
  setInitialEnvDefaultModel,
  getInitialModelSettingLayer,
  getAccountPluginsSyncEnabled,
  inheritProactivitySelectorGateEverOn,
  setProactivitySelectorGate,
  resampleProactivitySelectorGate,
  replaceProactivityHostGateSubscription,
  getRegisteredHooks,
  getWorkspaceRestriction,
  getClaudeMdAdditionalDirectoriesAsked,
  getCliSessionConfigCarried,
  getBackgroundAutoModeSetupInFlight,
  setBackgroundAutoModeSetupInFlight,
  setLoopTickInFlightPrompt,
  getLoopTickInFlightPlugin,
  resetLoopWakeFires,
  isSyncedPluginDirUnused,
  getMainThreadAgentHooks,
  getBareMcpServerMatchersWarned,
  getAttestedOfficialPluginMarketplace,
  getFlagSettingsFilePinnedContent,
  getSurfacedHookSpawnFailures,
  getStatsStore,
  takeSdkHostOutOfReachNote,
  getAllowedSettingSources,
  handleAutoModeTransition,
  setSearchToolsOptIn,
  setTodoToolsOptIn,
  setToolsOmittedByLaunchList,
  isHostVerifiedGatewayAuth,
  setAdmin3PSteeringSnapshot,
  recordProbeRefutedDocumentDefault,
  isUserActiveForNotifications,
  getRunnerDeclaredNestedRepositoryDiff,
  getRunnerDeclaredNoRepositoryCheckedOut,
  getParentManagedSettings,
  getParentOrganizationSettings,
  getUseCoworkPlugins,
  getVimSharedState,
  setVimSharedState,
  getOauthOrgFromBgSnapshot,
  onTerminalFocusChange,
  setSessionIngressToken,
  filesPlacedByNameRegistry,
  getInheritedTeamName,
  setInheritedTeamName,
  getSessionCreatedTeams,
  onOriginalCwdChange,
  getLastPersonPrompt,
  noteSdkHostHookAnswered,
  getSessionStartTime,
  addToTotalLinesChanged,
  getLocCounter,
  getBearerPlan,
  getSearchToolsOptIn,
  clearInvokedSkills,
  markSpareClaiming,
  resetStartTime,
  markSpareClaimed,
  getCredentialRoad,
  getMemoryToolsShapeLatch,
  setMemoryToolsShapeLatch,
  noteCredentialRoad,
  markDescriptorAnnouncementConsumed,
  setGatewayTokenFromDescriptor,
  setOauthTokenFromBgSnapshot,
  setOauthOrgFromBgSnapshot,
  getGatewayTokenFromDescriptor,
  getApiKeyFromFd,
  setApiKeyFromFd,
  registerHookCallbacks,
  getDirectConnectServerUrl,
  setStartupPolicySnapshot,
  getStartupPolicySnapshot,
  getHostAuthTokenRefreshCallback,
  setLongContext1mCreditsBlocked,
  announcePendingLoopWakeup,
  resetInteractionBaseline,
  isUnderRestrictedWorkspaceRoot,
  getLastMainThreadRequestAt,
  getTracerProvider,
  getCachedTelemetryResource,
  setCachedTelemetryResource,
  setTracerProvider,
  setLoggerProvider,
  setEventLogger,
  getCachedOtlpHttpAgentFactory,
  replaceMeterProvider,
  getLoggerProvider,
  setCachedOtlpHttpAgentFactory,
  isToolChangeHeaderRefused,
  isInlineToolsRefused,
  markToolChangeHeaderRefused,
  markInlineToolsRefused,
  markToolChangeUnsupportedModel,
  getToolsOmittedByLaunchList,
  getQuestionPreviewFormat,
  getQuestionOptionDescriptionsOptional,
  getEventLogger,
  setBearerPlan,
  setInferenceProfileBackingModel,
  isContext1mMarkedRefused,
  markContext1mRefused,
  isToolChangeUnsupportedModel,
  getRefusedBetaHeaders,
  getModelStrings,
  setModelStrings,
  releaseGatewayHost,
  rootSession,
  getSessionCounter,
  getSessionStartType,
  discardPendingOTelEvents,
  getAdmin3PSteeringSnapshot,
  getResolvedOrgDefault,
  getProbeRefutedDocumentDefaults,
  getInitialEnvDefaultModel,
  getGatewayRefreshInFlight,
  setGatewayRefreshInFlight,
  getCommitSkillRolloutGateLatch,
  setCommitSkillRolloutGateLatch,
  getVerifySkillRolloutGateLatch,
  setVerifySkillRolloutGateLatch,
  markPostCompaction,
  armPendingContextCompacted,
  getLastMainRequestId,
  updateInvokedSkillContent,
  getHasDevChannels,
  setFilesPlacedByNameRead,
  setWizardOperatorToolsEnabled,
  getWizardOperatorToolsEnabled,
  setLoopEnded,
  getLoopConsecutiveKeepalives,
  getLoopEnded,
  setLoopConsecutiveKeepalives,
  deleteLoopChainStartedAt,
  getLoopChainStartedAt,
  setLoopChainStartedAt,
  setLastAPIRequest,
  setLastAPIRequestMessages,
  getSessionIngressToken,
  getCodeEditToolDecisionCounter,
  addToToolDuration,
  getReplyGatePolicy,
  getDisableFileMentions,
  hasExitedPlanModeInSession,
  needsPlanModeExitAttachment,
  needsAutoModeExitAttachment,
  isGatewayAuthExpired,
  getCoworkEnrollment,
  getRefusalFallbackLatchOriginRequestId,
  getLastSyncedLaneLoad,
  waitForScrollIdle,
  getSessionSpawnedTeammatePanes,
  replaceRegisteredPluginHooks,
  setUseCoworkPlugins,
  isInteractivityDecided,
  isNoDialogLaunch,
  clearSystemPromptSectionState,
  clearBetaHeaderLatches,
  setSystemPromptSectionCacheEntry,
  recordLastMainThreadCacheRenewal,
  forgetLastMainRequestId,
  setAccountSkillsSyncEnabled,
  setSkillsSyncVetoed,
  getAccountSkillsSyncEnabled,
  markSyncedPluginDirNewHere,
  setSyncedPluginDirs,
  isSyncedPluginDirLoadedHere,
  getProjectDirForTools,
  getLastCompleteSyncedPluginList,
  getAutoCompactWindowSurface,
  registerSessionCostSaver,
  costLedgerBelongsToCurrentSession,
  getTotalAPIDurationWithoutRetries,
  getTotalToolDuration,
  hasUnknownModelCost,
  scopeCostLedgerToCurrentSession,
  setCostStateForRestore,
  recordCostStateToTranscript,
  getTotalWebSearchRequests,
  getUsageForModel,
  addToTotalCostState,
  getUsageSinceLastResult,
  addToSpentTokens,
  getCostCounter,
  getTokenCounter,
  getAutoModeUnavailableResponse,
  getAutoModeUnavailableResponsesInARow,
  clearAutoModeUnavailableResponses,
  dropAutoModeUnavailableResponsesOfOtherTurns,
  noteAutoModeUnavailableResponse,
  isThreadsHeldForServerClassifier,
  markThreadsHeldForServerClassifier,
  takeNoServerCheckAnnouncement,
  takeNoServerCheckStoppedTurn,
  takeServerClassifierFallbackAnnouncement,
  getObservedGateway,
  clearServerClassifierFallbackChoice,
  setServerClassifierFallbackChoice,
  getSdkSupportedDialogKinds,
  addSafetyStop,
  getTeleportedSessionInfo,
  markFirstTeleportMessageLogged,
  consumePostCompaction,
  setLastApiCompletionTimestamp,
  noteObservedGateway,
  addToTotalDurationState,
  stageResumeJournalSeed,
  getLastLiveMainThreadRequestAt,
  isThinkingResumptionRefused,
  getDeferredToolStubGateLatch,
  setDeferredToolStubGateLatch,
  getUnsupportedThreadKeys,
  getClientTruncatedAssistantIds,
  getHeldStatelessReplyIds,
  addSideQueryCostUSD,
  getTodoToolsOptIn,
  getMainLoopBusy,
  getLastSubmitTime,
  humanAttachmentDigestRegistry,
  setAccountPluginsSyncEnabled,
  setPluginsSyncVetoed,
  setRvSupervisorLinkLive,
  setAttacherCaps,
  getMainQueryRunning,
  getPendingConversationEditKinds,
  getProactivitySelectorGate,
  getProactivitySelectorGateEverOn,
  getAgentColorMap,
  acquireMcpClientsAccessor,
  acquireMcpServerToolsSwapper,
  getScheduledTasksEnabled,
  onScheduledTasksEnabled,
  isGatewayHostHeldStrict,
  isUsageCreditsRequired,
  hasUsageCreditsOnlyModelConsentSessionFallback,
  getUsageCreditsOnlyModelSessionConsentKey,
  setUsageCreditsOnlyModelConsentSessionFallback,
  setUsageCreditsOnlyModelSessionConsentKey,
  setAvailabilityFallbackChain,
  getAvailabilityFallbackChain,
  markSilentRefusalFallbackServerArmed,
  isSilentRefusalFallbackServerArmed,
  getFoundryDeploymentCapabilities,
  getRvSupervisorLinkLive,
  onRvSupervisorLinkChange,
  getChromeAvailabilityAnchorMs,
  getChromeAvailabilityStagesLogged,
  setHostRendersChromeSetupOffer,
  gatewayServesManagedSettings,
  currentSession,
  getAgentContext,
  defaultRootSession,
  agentContextGetter,
  getHookHolder,
  getRootRegisteredHooks,
  getRootMainThreadAgentHooks,
  bufferPendingOTelEvent,
  onHookStoresChanged,
  clearRegisteredHooks,
  getPendingBranchLinks,
  getCommitCounter,
  getPendingPrLinks,
  arrivingInboundFileRegistry,
  setSessionProject,
  resetFdCredentialState,
  getSdkRapidFollowupPreempt,
  setLocalUploadsRoot,
  setTeardownUnwindRequested,
  getTeardownUnwindRequested,
  getSideQueryCostUSD,
  setSdkDialogHostActive,
  setSdkSupportedDialogKinds,
  getHostOtelState,
  getEventLoggerOwner,
  getOTelWindowCloseCause,
  rewriteRefusalFallbackPreviousOverride,
  setClaudeMdAdditionalDirectoriesAsked,
  resetModelStrings,
  clearStructuredOutputsUnsupported,
  clearContext1mRefused,
  incrementPromptIndex,
  getAccountMemoryLaunchMode,
  setMcpConnectNonBlocking,
  addSlowOperation,
  getDevBarAlert,
  getSlowOperations,
  getSystemPromptInvalidationReason,
  markNoDialogLaunch,
  setRunnerDeclaredFreshMachinePerSession,
  setRunnerDeclaredNestedRepositoryDiff,
  setRunnerDeclaredNoRepositoryCheckedOut,
  setSessionOverridesGetter,
};
