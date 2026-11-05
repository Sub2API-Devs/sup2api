/**
 * bootstrap/state.ts
 *
 * 已有模块；g2 补充放置少量状态访问声明
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/bootstrap/state.ts
 * pieces: chunk-5ythzcas.js (704), chunk-f798ahhj.js (11)
 * attribution: sole-consumer 1, affinity 1, fingerprint 11, layout 31, file-local 1, facade-majority 668, placement 2
 */
import { resolve, sep } from "path";
import { randomUUID } from "crypto";
import { homedir } from "os";
import {
  deepEqualWithCycles,
  nullProtoCopy,
  unlatchStickyBetaLatches,
  ManagedDocumentLinks,
  ManagedFileProtections,
  RepoTierFreeze,
  settingsEqualIgnoringOwner,
  SessionObservers,
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
import { SESSION_URL_HASH_SALT, sessionUrlIdForNewSession } from "../utils/sessionUrl.js";
import { createSignal } from "../utils/signal.js";
import { SystemClock } from "../utils/sleep.js";
import { initialCwdKey, INITIAL_CWD_KEY, launchCwd, identityString } from "../utils/cwd.js";
import { setDisklessHooks, processScopedEmptyValues, HostScoped } from "../utils/hostScoped.js";
import { identityAgentId2 } from "../utils/agentId.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-5ythzcas.js:65945-66038 sole-consumer
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
//@ chunk-5ythzcas.js:66038-66145 affinity
function createDropReporterState() {
  return {
    rateTokens: null,
    rateLastRefillMs: null,
    featureOkLogged: false,
    reportedDropReasons: new Set(),
  };
}
//@ chunk-5ythzcas.js:66145-69002 fingerprint (2.1.88 match: setMeter, 0.717)
class TelemetryHandles {
  #e = null;
  #t = null;
  #n = null;
  #s = null;
  #o = null;
  #i = null;
  #r = null;
  #d = null;
  #u = null;
  #c = null;
  #l = null;
  #h = null;
  #p = null;
  #a = [];
  #f = null;
  #v = createDropReporterState();
  #S = null;
  #y = null;
  #g = null;
  #m = createCaBundleSlots();
  #b = null;
  #C = null;
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
    this.#s = createCounter("claude_code.pull_request.count", {
      description: "Number of pull requests created",
    });
    this.#o = createCounter("claude_code.commit.count", {
      description: "Number of git commits created",
    });
    this.#i = createCounter("claude_code.cost.usage", {
      description: "Cost of the Claude Code session",
      unit: unitOrUndefined("USD"),
    });
    this.#r = createCounter("claude_code.token.usage", {
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
    return this.#s;
  }
  commitCounter() {
    return this.#o;
  }
  costCounter() {
    return this.#i;
  }
  tokenCounter() {
    return this.#r;
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
    return this.#h;
  }
  eventLoggerOwner() {
    return this.#p;
  }
  attachEventLogger(eventLogger, owner) {
    this.#h = eventLogger;
    this.#p = eventLogger ? owner : null;
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
    this.#f = cause;
  }
  windowCloseCause() {
    return this.#f;
  }
  isWindowOpen() {
    return this.#a !== null;
  }
  hostOtel() {
    return this.#v;
  }
  meterProvider() {
    return this.#S;
  }
  replaceMeterProvider(meterProvider) {
    this.#S = meterProvider;
  }
  tracerProvider() {
    return this.#y;
  }
  replaceTracerProvider(tracerProvider) {
    this.#y = tracerProvider;
  }
  cachedTelemetryResource() {
    return this.#g;
  }
  replaceCachedTelemetryResource(resource) {
    this.#g = resource;
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
    return this.#C;
  }
  replaceInClusterOtlpAgentFactory(factory) {
    this.#C = factory;
  }
  reset() {
    this.#e = null;
    this.#t = null;
    this.#n = null;
    this.#s = null;
    this.#o = null;
    this.#i = null;
    this.#r = null;
    this.#d = null;
    this.#u = null;
    this.#c = null;
    this.#l = null;
    this.#h = null;
    this.#p = null;
    this.#a = [];
    this.#f = null;
    this.#v = createDropReporterState();
    this.#S = null;
    this.#y = null;
    this.#g = null;
    this.#m = createCaBundleSlots();
    this.#b = null;
    this.#C = null;
  }
}
//@ chunk-5ythzcas.js:69002-69130 layout
function isSameAccount(next, current) {
  return (
    next.accountUuid === current.accountUuid &&
    next.emailAddress === current.emailAddress &&
    next.organizationUuid === current.organizationUuid
  );
}
//@ chunk-5ythzcas.js:69130-72681 layout
class CredentialSlots {
  #e = undefined;
  #t = null;
  #n = undefined;
  #s = false;
  #o = null;
  #i = null;
  #r = undefined;
  #d = undefined;
  #u = new Set();
  #c = new Map();
  #l = undefined;
  #h = null;
  #p = new Set();
  #a = null;
  #f = 0;
  #v = null;
  #S = null;
  #y = null;
  #g = false;
  #m = [];
  #b = "single";
  #C = null;
  #x = false;
  #R = false;
  #w = () => false;
  #k = null;
  #P = undefined;
  #M = null;
  #T = null;
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
    return this.#s;
  }
  replaceOauthTokenFromBgSnapshot(isFromBgSnapshot) {
    this.#s = isFromBgSnapshot;
  }
  loginStashedInTokenSlot() {
    return this.#o;
  }
  replaceLoginStashedInTokenSlot(slot) {
    this.#o = slot;
  }
  oauthOrgFromBgSnapshot() {
    return this.#i;
  }
  replaceOauthOrgFromBgSnapshot(organization) {
    this.#i = organization;
  }
  oauthScopesFromFd() {
    return this.#r;
  }
  replaceOauthScopesFromFd(scopes) {
    this.#r = scopes;
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
    this.#s = false;
    this.#o = null;
    this.#i = null;
    this.#r = undefined;
    this.#d = undefined;
  }
  gatewayAuth() {
    return this.#h;
  }
  replaceGatewayAuth(auth) {
    this.#h = auth;
  }
  isGatewayHostHeldStrict(host) {
    return this.#p.has(host);
  }
  holdGatewayHostStrict(host) {
    this.#p.add(host);
  }
  releaseGatewayHost(host) {
    this.#p.delete(host);
  }
  gatewayServerProcess() {
    return this.#R;
  }
  replaceGatewayServerProcess(gatewayServerProcess) {
    this.#R = gatewayServerProcess;
  }
  gatewayRequiredByHostPolicy() {
    return this.#w();
  }
  replaceGatewayRequiredByHostPolicyReader(reader) {
    this.#w = reader;
  }
  authenticatedAccount() {
    return this.#a;
  }
  authenticatedAccountEpoch() {
    return this.#f;
  }
  stampAuthenticatedAccount(account) {
    let current = this.#a;
    if (account !== null && current !== null && isSameAccount(account, current)) {
      if (account.seatTier !== current.seatTier) this.#a = account;
      return;
    }
    this.#f += 1;
    this.#a = account;
    this.#v = null;
    let sameAsPrior = account !== null && this.#y !== null && isSameAccount(account, this.#y);
    this.#y = null;
    this.#g = false;
    this.#x = false;
    if (!sameAsPrior) {
      this.#S = null;
      this.#m = [];
      this.#b = "single";
      this.#C = null;
    }
  }
  dropAuthenticatedAccountForNewToken(newToken) {
    let prior = this.#a ?? this.#y;
    let awaitsAccount = !newToken || (this.#a === null && this.#g);
    let useCaseId = this.#S;
    let useCaseChoices = this.#m;
    let useCaseMode = this.#b;
    let useCaseRefusal = this.#C;
    this.stampAuthenticatedAccount(null);
    this.#y = prior;
    this.#g = awaitsAccount;
    this.#S = useCaseId;
    this.#m = useCaseChoices;
    this.#b = useCaseMode;
    this.#C = useCaseRefusal;
    this.#x = true;
  }
  tokenAdoptedSinceStamp() {
    return this.#x;
  }
  programUseCaseOwner() {
    return this.#g ? null : this.#y;
  }
  programUseCaseAwaitsAccount() {
    return this.#g;
  }
  bearerPlan() {
    return this.#v;
  }
  replaceBearerPlan(plan) {
    this.#v = plan;
  }
  programUseCaseId() {
    return this.#S;
  }
  replaceProgramUseCaseId(id) {
    this.#S = id;
  }
  programUseCaseChoices() {
    return this.#m;
  }
  replaceProgramUseCaseChoices(choices) {
    this.#m = choices;
  }
  programUseCaseChoiceMode() {
    return this.#b;
  }
  replaceProgramUseCaseChoiceMode(mode) {
    this.#b = mode;
  }
  programUseCaseRefusal() {
    return this.#C;
  }
  replaceProgramUseCaseRefusal(refusal) {
    this.#C = refusal;
  }
  startupPolicySnapshot() {
    return this.#P;
  }
  replaceStartupPolicySnapshot(snapshot) {
    this.#P = snapshot;
  }
  gatewayRefreshInFlight() {
    return this.#k;
  }
  replaceGatewayRefreshInFlight(pendingRefresh) {
    this.#k = pendingRefresh;
  }
  sdkOAuthTokenRefreshCallback() {
    return this.#M;
  }
  replaceSdkOAuthTokenRefreshCallback(callback) {
    this.#M = callback;
  }
  hostAuthTokenRefreshCallback() {
    return this.#T;
  }
  replaceHostAuthTokenRefreshCallback(callback) {
    this.#T = callback;
  }
  resetForTests() {
    this.#e = null;
    this.#t = null;
    this.#n = null;
    this.#s = false;
    this.#o = null;
    this.#r = undefined;
    this.#d = null;
    this.#u.clear();
    this.#c.clear();
    this.#l = undefined;
    this.#h = null;
    this.#p.clear();
    this.#a = null;
    this.#f = 0;
    this.#v = null;
    this.#y = null;
    this.#g = false;
    this.#S = null;
    this.#m = [];
    this.#b = "single";
    this.#C = null;
    this.#x = false;
    this.#R = false;
    this.#w = () => false;
    this.#k = null;
    this.#P = undefined;
    this.#M = null;
    this.#T = null;
  }
}
//@ chunk-5ythzcas.js:72681-73064 file-local
class McpProcessWiring {
  #e = undefined;
  #t = false;
  #n = false;
  #s;
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
    this.#s = ensureConnectedClient;
  }
  ensureConnectedClient() {
    return this.#s;
  }
  reset() {
    this.#e = undefined;
    this.#t = false;
    this.#n = false;
  }
}
//@ chunk-5ythzcas.js:73064-77568 layout
class RequestLatches {
  #e = null;
  #t = new Map();
  #n = new Map();
  #s = new Set();
  #o = new Set();
  #i = new Set();
  #r = new Map();
  #d = new Map();
  #u = false;
  #c = false;
  #l = false;
  #h = false;
  #p = false;
  #a = false;
  #f = false;
  #v = false;
  #S = false;
  #y = false;
  #g = new Set();
  #m = false;
  #b = new Set();
  #C = false;
  #x = false;
  #R = false;
  #w = false;
  #k = new Map();
  #P = undefined;
  #M = undefined;
  #T = false;
  #A = undefined;
  #L = false;
  #O = false;
  #F = undefined;
  #I = undefined;
  #E = new Map();
  #D = new Map();
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
    return this.#s;
  }
  markEffortUnsupported(model) {
    this.#s.add(model);
  }
  structuredOutputsUnsupportedModels() {
    return this.#o;
  }
  markStructuredOutputsUnsupported(model) {
    this.#o.add(model);
  }
  clearStructuredOutputsUnsupported() {
    this.#o = new Set();
  }
  context1mRefusedModels() {
    return this.#i;
  }
  markContext1mRefused(model) {
    this.#i.add(model);
  }
  clearContext1mRefused() {
    this.#i = new Set();
  }
  refusedBetas(model) {
    return this.#r.get(model) ?? [];
  }
  markBetaRefused(model, beta) {
    let betas = this.#r.get(model);
    if (betas) betas.add(beta);
    else this.#r.set(model, new Set([beta]));
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
  toolProvenanceServerUrlRefused() {
    return this.#c;
  }
  markToolProvenanceServerUrlRefused() {
    this.#c = true;
  }
  perTurnEffortOkEmitted() {
    return this.#l;
  }
  markPerTurnEffortOkEmitted() {
    this.#l = true;
  }
  lateToolAdditionsOkEmitted() {
    return this.#h;
  }
  markLateToolAdditionsOkEmitted() {
    this.#h = true;
  }
  toolResultScreeningOkEmitted() {
    return this.#p;
  }
  markToolResultScreeningOkEmitted() {
    this.#p = true;
  }
  toolChangeHeaderRefused() {
    return this.#a;
  }
  markToolChangeHeaderRefused() {
    this.#a = true;
  }
  promptEndMarkRefused() {
    return this.#f;
  }
  markPromptEndMarkRefused() {
    this.#f = true;
  }
  inlineToolsRefused() {
    return this.#v;
  }
  markInlineToolsRefused() {
    this.#v = true;
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
    return this.#g;
  }
  markBetaHeaderRefused(beta) {
    this.#g.add(beta);
  }
  unmarkBetaHeaderRefused(beta) {
    this.#g.delete(beta);
  }
  thinkingHighlightsRefused() {
    return this.#m;
  }
  markThinkingHighlightsRefused() {
    this.#m = true;
  }
  toolChangeUnsupportedModels() {
    return this.#b;
  }
  markToolChangeUnsupportedModel(model) {
    this.#b.add(model);
  }
  internalModelFieldsRefused() {
    return this.#C;
  }
  markInternalModelFieldsRefused() {
    this.#C = true;
  }
  internalModelFieldsRefusalAnnounced() {
    return this.#x;
  }
  markInternalModelFieldsRefusalAnnounced() {
    this.#x = true;
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
    return this.#w;
  }
  markThreadsHeldForServerClassifier() {
    this.#w = true;
  }
  autoModeUnavailableResponse(threadId) {
    return this.#k.get(threadId);
  }
  autoModeUnavailableResponsesInARow(runKey) {
    let count = 0;
    for (let response of this.#k.values()) if (response.runKey === runKey) count++;
    return count;
  }
  dropAutoModeUnavailableResponsesOfOtherTurns(runKey, turn) {
    for (let [threadId, response] of this.#k)
      if (response.runKey === runKey && response.turn !== undefined && response.turn !== turn)
        this.#k.delete(threadId);
  }
  noteAutoModeUnavailableResponse(threadId, response) {
    this.#k.set(threadId, response);
  }
  clearAutoModeUnavailableResponses(agentId) {
    for (let [key, skill] of this.#k) if (skill.runKey === agentId) this.#k.delete(key);
  }
  setAutoModeUnavailableStopNotice(notice) {
    this.#P = notice;
  }
  autoModeUnavailableStopNotice() {
    return this.#P;
  }
  setLocalCommandExitCode(exitCode) {
    this.#M = exitCode;
  }
  localCommandExitCode() {
    return this.#M;
  }
  observedGateway() {
    return this.#F;
  }
  serverClassifierFallbackChoice() {
    return this.#I;
  }
  setServerClassifierFallbackChoice(choice) {
    this.#I = choice;
  }
  clearServerClassifierFallbackChoice() {
    this.#I = undefined;
  }
  noteObservedGateway(gateway) {
    this.#F ??= gateway;
  }
  takeServerClassifierFallbackAnnouncement() {
    if (!this.#R || this.#T) return false;
    this.#T = true;
    return true;
  }
  noteNoServerCheck(reason) {
    if (this.#A !== undefined) return false;
    this.#A = reason;
    return true;
  }
  noteNoServerCheckStoppedTurn() {
    this.#O = true;
  }
  takeNoServerCheckStoppedTurn() {
    let stopped = this.#O;
    this.#O = false;
    return stopped;
  }
  takeNoServerCheckAnnouncement() {
    if (this.#L || this.#A === undefined) return;
    this.#L = true;
    return this.#A;
  }
  inferenceProfileBackingModels() {
    return this.#E;
  }
  recordInferenceProfileBackingModel(model, backingModel) {
    this.#E.set(model, backingModel);
  }
  foundryDeploymentCapabilities() {
    return this.#D;
  }
  reset() {
    this.#e = null;
    this.#t = new Map();
    this.#n = new Map();
    this.#s = new Set();
    this.#o = new Set();
    this.#i = new Set();
    this.#r = new Map();
    this.#d = new Map();
    this.#u = false;
    this.#c = false;
    this.#l = false;
    this.#h = false;
    this.#p = false;
    this.#a = false;
    this.#f = false;
    this.#v = false;
    this.#S = false;
    this.#y = false;
    this.#g = new Set();
    this.#m = false;
    this.#b = new Set();
    this.#C = false;
    this.#x = false;
    this.#R = false;
    this.#w = false;
    this.#k.clear();
    this.#P = undefined;
    this.#M = undefined;
    this.#T = false;
    this.#A = undefined;
    this.#L = false;
    this.#O = false;
    this.#F = undefined;
    this.#I = undefined;
    this.#E = new Map();
    this.#D = new Map();
  }
}
//@ chunk-5ythzcas.js:77568-77792 layout
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
//@ chunk-5ythzcas.js:77792-78246 layout
class ProactivityState {
  #e = false;
  #t = false;
  #n = noop;
  #s = createSignal();
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
    if (previous !== isOn) this.#s.emit(isOn);
  }
  subscribeSelectorGateChanged(listener) {
    return this.#s.subscribe(listener);
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
//@ chunk-5ythzcas.js:78246-78261 layout
function noop() {}
//@ chunk-5ythzcas.js:78261-78440 layout
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
//@ chunk-5ythzcas.js:78440-79165 layout
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
//@ chunk-5ythzcas.js:79165-79491 layout
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
//@ chunk-5ythzcas.js:79491-79596 layout
/**
 * 创建 root 会话：host=新 HostState，id=CLAUDE_CODE_SESSION_ID 等给定值或新 UUID，originalCwd/projectRoot/cwd 都是启动目录。
 */
function createRootSession(cwd = initialCwdKey()) {
  return forkRootSessionWithProject({
    host: createHostState(),
    id: sessionUrlIdForNewSession() ?? randomUUID(),
    project: {
      originalCwd: cwd,
      projectRoot: cwd,
      cwd,
    },
  });
}
//@ chunk-5ythzcas.js:79596-79610 layout
/**
 * 进程默认 root 会话（模块加载时创建）。
 */
var defaultRootSession; // deferred: uses createRootSession of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-5ythzcas.js:79596", () => {
  defaultRootSession = createRootSession(INITIAL_CWD_KEY);
});
//@ chunk-5ythzcas.js:79610-79634 facade-majority
/**
 * getRootSession：返回当前会话（currentSession 的导出别名）。
 */
function getRootSession() {
  return currentSession();
}
//@ chunk-5ythzcas.js:79634-79670 layout
/**
 * 当前会话：异步上下文（子代理/teammate 等）里有 session 用它，否则用默认 root 会话。几乎所有状态访问器都经它取值。
 */
function currentSession() {
  return agentContextGetter()?.session ?? defaultRootSession;
}
//@ chunk-5ythzcas.js:79670-79705 facade-majority
/**
 * 在进程默认 root 会话的 host 上取 HostScoped 槽位的值（进程级单例状态）。
 */
function onProcessRootHost(slot) {
  return slot.of(defaultRootSession.host);
}
//@ chunk-5ythzcas.js:79705-79755 layout
/**
 * 异步上下文里的会话覆盖对象（无 session 字段的旧式覆盖：sessionId、originalCwd、cachedClaudeMdContent…）。
 */
function getAgentContext() {
  let context = agentContextGetter();
  return context?.session ? undefined : context;
}
//@ chunk-5ythzcas.js:79755-79774 layout
var agentContextGetter = () => {
  return;
};
//@ chunk-5ythzcas.js:79774-79794 facade-majority
/**
 * 注入“会话覆盖对象”读取器（AsyncLocalStorage 取值函数），子代理/teammate 借此让 getSessionId 等返回自己的值。
 */
function setSessionOverridesGetter(getter) {
  agentContextGetter = getter;
}
//@ chunk-5ythzcas.js:79794-79833 layout
// deferred: uses setProjectDirectoryErrorHandler (./sessionSlices.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-5ythzcas.js:79794", () => {
  setProjectDirectoryErrorHandler((error) =>
    projectDirectoryErrorReporterSlot.of(currentSession().host).reporter?.(error),
  );
});
//@ chunk-5ythzcas.js:79833-79934 layout
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-5ythzcas.js:79833", () => {
  setDisklessHooks({
    isDiskless: () => isDiskless(),
    isDisklessProcess: () => isDisklessProcess(),
    reportBuilt: (report) => processScopedEmptyValues.of(currentSession().host).reporter?.(report),
  });
});
//@ chunk-5ythzcas.js:79934-79977 facade-majority
/**
 * getSessionId：覆盖对象的 sessionId，否则当前会话 id。
 */
function getSessionId() {
  return getAgentContext()?.sessionId ?? currentSession().id;
}
//@ chunk-5ythzcas.js:79977-80076 facade-majority
/**
 * 会话状态函数 mainAgentId：优先取异步上下文覆盖对象的 sessionId；
 */
function mainAgentId() {
  let sessionId = getAgentContext()?.sessionId;
  if (sessionId) return identityAgentId2(sessionId);
  let session = currentSession();
  return session.identity.mainAgentId(session.id);
}
//@ chunk-5ythzcas.js:80076-80198 layout
function hasSessionActivity() {
  let session = currentSession();
  return (
    session.requestJournal.promptIndex() > 0 ||
    session.sessionScratch.chromeAvailabilityStagesLogged().size > 0
  );
}
//@ chunk-5ythzcas.js:80198-80893 facade-majority
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
//@ chunk-5ythzcas.js:80893-80969 layout
function emitSessionSwitch(session, reason, modelRestore) {
  let listeners = sessionSwitchListeners.of(session);
  if (modelRestore) listeners.emit(session.id, reason, modelRestore);
  else listeners.emit(session.id, reason);
}
//@ chunk-5ythzcas.js:80969-81017 layout
function emitOriginalCwdChanged(session) {
  originalCwdListeners.of(session).emit(getSessionProject(session).originalCwd);
}
//@ chunk-5ythzcas.js:81017-81082 facade-majority
/**
 * 会话状态函数 getParentSessionId：涉及当前会话的 parentId。
 */
function getParentSessionId() {
  let agentContext = getAgentContext();
  return agentContext ? agentContext.parentSessionId : currentSession().parentId;
}
//@ chunk-5ythzcas.js:81082-81778 facade-majority
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
//@ chunk-5ythzcas.js:81778-82255 layout
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
//@ chunk-5ythzcas.js:82255-82279 layout
var sessionSwitchListeners; // deferred: uses SessionRootSlot (./sessionSlices.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-5ythzcas.js:82255", () => {
  sessionSwitchListeners = new SessionRootSlot(() => createSignal());
});
//@ chunk-5ythzcas.js:82279-82325 facade-majority
/**
 * 订阅会话切换（regenerateSessionId/switchSession 时触发，参数含原因与恢复的模型）。
 */
function onSessionSwitch(listener) {
  return sessionSwitchListeners.of(currentSession()).subscribe(listener);
}
//@ chunk-5ythzcas.js:82325-82391 facade-majority
/**
 * 状态访问器：读取当前会话的 会话暂存（sessionScratch） 上的 humanAttachmentDigests()。
 */
function humanAttachmentDigestRegistry() {
  return currentSession().sessionScratch.humanAttachmentDigests();
}
//@ chunk-5ythzcas.js:82391-82457 facade-majority
/**
 * 状态访问器：读取当前会话的 会话暂存（sessionScratch） 上的 inboundAttachmentFiles()。
 */
function inboundAttachmentFileRegistry() {
  return currentSession().sessionScratch.inboundAttachmentFiles();
}
//@ chunk-5ythzcas.js:82457-82518 facade-majority
/**
 * 状态访问器：读取当前会话的 会话暂存（sessionScratch） 上的 filesPlacedByName()。
 */
function filesPlacedByNameRegistry() {
  return currentSession().sessionScratch.filesPlacedByName();
}
//@ chunk-5ythzcas.js:82518-82583 facade-majority
/**
 * 状态访问器：读取当前会话的 会话暂存（sessionScratch） 上的 filesPlacedByNameRead()。
 */
function filesPlacedByNameRead() {
  return currentSession().sessionScratch.filesPlacedByNameRead();
}
//@ chunk-5ythzcas.js:82583-82646 facade-majority
/**
 * 状态访问器：调用当前会话的 会话暂存（sessionScratch） 上的 setFilesPlacedByNameRead()。
 */
function setFilesPlacedByNameRead(value) {
  currentSession().sessionScratch.setFilesPlacedByNameRead(value);
}
//@ chunk-5ythzcas.js:82646-82716 facade-majority
/**
 * 状态访问器：读取当前会话的 会话暂存（sessionScratch） 上的 inboundAttachmentDownloads()。
 */
function inboundAttachmentDownloadRegistry() {
  return currentSession().sessionScratch.inboundAttachmentDownloads();
}
//@ chunk-5ythzcas.js:82716-82780 facade-majority
/**
 * 状态访问器：读取当前会话的 会话暂存（sessionScratch） 上的 arrivingInboundFiles()。
 */
function arrivingInboundFileRegistry() {
  return currentSession().sessionScratch.arrivingInboundFiles();
}
//@ chunk-5ythzcas.js:82780-82860 facade-majority (2.1.88 match: getSessionProjectDir, 0.624)
/**
 * 会话状态函数 getSessionProjectDir：涉及当前会话的 identity.projectDir。
 */
function getSessionProjectDir() {
  let agentContext = getAgentContext();
  return agentContext ? agentContext.sessionProjectDir : currentSession().identity.projectDir();
}
//@ chunk-5ythzcas.js:82860-82919 facade-majority
/**
 * 会话状态函数 getOriginalCwd：优先取异步上下文覆盖对象的 originalCwd；
 */
function getOriginalCwd() {
  return getAgentContext()?.originalCwd ?? getSessionProject(currentSession()).originalCwd;
}
//@ chunk-5ythzcas.js:82919-83006 facade-majority
/**
 * 会话状态函数 getOriginalCwdOrNull：优先取异步上下文覆盖对象的 originalCwd；涉及当前会话的 project。
 */
function getOriginalCwdOrNull() {
  if (getAgentContext()?.originalCwd === undefined && currentSession().project === null) return null;
  return getOriginalCwd();
}
//@ chunk-5ythzcas.js:83006-83034 facade-majority
/**
 * 权限界面锚点目录（委托 oLt）。
 */
function getPermissionScreenAnchor() {
  return launchCwd();
}
//@ chunk-5ythzcas.js:83034-83067 facade-majority
/**
 * 当前会话是否在 home 目录启动（originalCwd 等于主目录）。
 */
function isHomeDirectorySession() {
  return getOriginalCwd() === homedir();
}
//@ chunk-5ythzcas.js:83067-83126 facade-majority (2.1.88 match: getProjectRoot, 1)
/**
 * 会话状态函数 getProjectRoot：优先取异步上下文覆盖对象的 projectRoot；
 */
function getProjectRoot() {
  return getAgentContext()?.projectRoot ?? getSessionProject(currentSession()).projectRoot;
}
//@ chunk-5ythzcas.js:83126-83213 facade-majority
/**
 * 会话状态函数 getProjectRootOrNull：优先取异步上下文覆盖对象的 projectRoot；涉及当前会话的 project。
 */
function getProjectRootOrNull() {
  if (getAgentContext()?.projectRoot === undefined && currentSession().project === null) return null;
  return getProjectRoot();
}
//@ chunk-5ythzcas.js:83213-83237 layout
function asProjectPatch(patch) {
  return patch;
}
//@ chunk-5ythzcas.js:83237-83321 facade-majority
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
//@ chunk-5ythzcas.js:83321-83357 facade-majority (2.1.88 match: setOriginalCwd, 0.445)
/**
 * setOriginalCwd：只改 originalCwd。
 */
function setOriginalCwd(cwd) {
  setSessionProject({
    originalCwd: cwd,
  });
}
//@ chunk-5ythzcas.js:83357-83381 layout
var originalCwdListeners; // deferred: uses SessionRootSlot (./sessionSlices.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-5ythzcas.js:83357", () => {
  originalCwdListeners = new SessionRootSlot(() => createSignal());
});
//@ chunk-5ythzcas.js:83381-83428 facade-majority
/**
 * 订阅 originalCwd 变化。
 */
function onOriginalCwdChange(listener) {
  return originalCwdListeners.of(currentSession()).subscribe(listener);
}
//@ chunk-5ythzcas.js:83428-83465 facade-majority (2.1.88 match: getProjectRoot, 1)
/**
 * setProjectRoot：只改 projectRoot。
 */
function setProjectRoot(projectRoot) {
  setSessionProject({
    projectRoot,
  });
}
//@ chunk-5ythzcas.js:83465-83498 facade-majority
/**
 * getCwdState：当前会话 project.cwd（无 project 时抛 NoProjectDirectoryError）。
 */
function getCwdState() {
  return getSessionProject(currentSession()).cwd;
}
//@ chunk-5ythzcas.js:83498-83527 facade-majority
/**
 * setCwdState：只改 cwd。
 */
function setCwdState(cwd) {
  setSessionProject({
    cwd,
  });
}
//@ chunk-5ythzcas.js:83527-83572 facade-majority
/**
 * 状态访问器：调用当前会话的 费用账本（costLedger） 上的 restartClock()。
 */
function resetStartTime() {
  currentSession().costLedger.restartClock();
}
//@ chunk-5ythzcas.js:83572-83628 facade-majority
/**
 * 状态访问器：读取当前会话的 费用账本（costLedger） 上的 sessionStartTime()。
 */
function getSessionStartTime() {
  return currentSession().costLedger.sessionStartTime();
}
//@ chunk-5ythzcas.js:83628-83701 facade-majority (2.1.88 match: getDirectConnectServerUrl, 0.7)
/**
 * 状态访问器：读取当前会话的 host（host） → MCP 进程接线（mcpProcessWiring） 上的 directConnectServerUrl()。
 */
function getDirectConnectServerUrl() {
  return currentSession().host.mcpProcessWiring.directConnectServerUrl();
}
//@ chunk-5ythzcas.js:83701-83770 facade-majority
/**
 * 状态访问器：读取当前会话的 host（host） → MCP 进程接线（mcpProcessWiring） 上的 connectNonBlocking()。
 */
function getMcpConnectNonBlocking() {
  return currentSession().host.mcpProcessWiring.connectNonBlocking();
}
//@ chunk-5ythzcas.js:83770-83841 facade-majority
/**
 * 状态访问器：写入当前会话的 host（host） → MCP 进程接线（mcpProcessWiring） 上的 replaceConnectNonBlocking()。
 */
function setMcpConnectNonBlocking(value) {
  currentSession().host.mcpProcessWiring.replaceConnectNonBlocking(value);
}
//@ chunk-5ythzcas.js:83841-83906 facade-majority
/**
 * 状态访问器：读取当前会话的 会话标志（sessionFlags） 上的 teardownUnwindRequested()。
 */
function getTeardownUnwindRequested() {
  return currentSession().sessionFlags.teardownUnwindRequested();
}
//@ chunk-5ythzcas.js:83906-83973 facade-majority
/**
 * 状态访问器：写入当前会话的 会话标志（sessionFlags） 上的 replaceTeardownUnwindRequested()。
 */
function setTeardownUnwindRequested(value) {
  currentSession().sessionFlags.replaceTeardownUnwindRequested(value);
}
//@ chunk-5ythzcas.js:83973-84046 facade-majority
/**
 * 状态访问器：读取当前会话的 会话标志（sessionFlags） 上的 backgroundAutoModeSetupInFlight()。
 */
function getBackgroundAutoModeSetupInFlight() {
  return currentSession().sessionFlags.backgroundAutoModeSetupInFlight();
}
//@ chunk-5ythzcas.js:84046-84121 facade-majority
/**
 * 状态访问器：写入当前会话的 会话标志（sessionFlags） 上的 replaceBackgroundAutoModeSetupInFlight()。
 */
function setBackgroundAutoModeSetupInFlight(value) {
  currentSession().sessionFlags.replaceBackgroundAutoModeSetupInFlight(value);
}
//@ chunk-5ythzcas.js:84121-84188 facade-majority
/**
 * 状态访问器：读取当前会话的 会话标志（sessionFlags） 上的 deferredToolStubGateLatch()。
 */
function getDeferredToolStubGateLatch() {
  return currentSession().sessionFlags.deferredToolStubGateLatch();
}
//@ chunk-5ythzcas.js:84188-84257 facade-majority
/**
 * 状态访问器：写入当前会话的 会话标志（sessionFlags） 上的 replaceDeferredToolStubGateLatch()。
 */
function setDeferredToolStubGateLatch(deferredToolStubGateLatch) {
  currentSession().sessionFlags.replaceDeferredToolStubGateLatch(deferredToolStubGateLatch);
}
//@ chunk-5ythzcas.js:84257-84326 facade-majority
/**
 * 状态访问器：读取当前会话的 会话标志（sessionFlags） 上的 verifySkillRolloutGateLatch()。
 */
function getVerifySkillRolloutGateLatch() {
  return currentSession().sessionFlags.verifySkillRolloutGateLatch();
}
//@ chunk-5ythzcas.js:84326-84397 facade-majority
/**
 * 状态访问器：写入当前会话的 会话标志（sessionFlags） 上的 replaceVerifySkillRolloutGateLatch()。
 */
function setVerifySkillRolloutGateLatch(value) {
  currentSession().sessionFlags.replaceVerifySkillRolloutGateLatch(value);
}
//@ chunk-5ythzcas.js:84397-84466 facade-majority
/**
 * 状态访问器：读取当前会话的 会话标志（sessionFlags） 上的 commitSkillRolloutGateLatch()。
 */
function getCommitSkillRolloutGateLatch() {
  return currentSession().sessionFlags.commitSkillRolloutGateLatch();
}
//@ chunk-5ythzcas.js:84466-84537 facade-majority
/**
 * 状态访问器：写入当前会话的 会话标志（sessionFlags） 上的 replaceCommitSkillRolloutGateLatch()。
 */
function setCommitSkillRolloutGateLatch(value) {
  currentSession().sessionFlags.replaceCommitSkillRolloutGateLatch(value);
}
//@ chunk-5ythzcas.js:84537-84600 facade-majority
/**
 * 状态访问器：读取当前会话的 会话标志（sessionFlags） 上的 memoryToolsShapeLatch()。
 */
function getMemoryToolsShapeLatch() {
  return currentSession().sessionFlags.memoryToolsShapeLatch();
}
//@ chunk-5ythzcas.js:84600-84665 facade-majority
/**
 * 状态访问器：写入当前会话的 会话标志（sessionFlags） 上的 replaceMemoryToolsShapeLatch()。
 */
function setMemoryToolsShapeLatch(value) {
  currentSession().sessionFlags.replaceMemoryToolsShapeLatch(value);
}
//@ chunk-5ythzcas.js:84665-84865 facade-majority
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
//@ chunk-5ythzcas.js:84865-84937 facade-majority
/**
 * 状态访问器：读取当前会话的 会话标志（sessionFlags） 上的 consumePendingContextCompacted()。
 */
function consumePendingContextCompacted() {
  return currentSession().sessionFlags.consumePendingContextCompacted();
}
//@ chunk-5ythzcas.js:84937-85003 facade-majority
/**
 * 状态访问器：读取当前会话的 会话标志（sessionFlags） 上的 responseBeforeCompaction()。
 */
function getResponseBeforeCompaction() {
  return currentSession().sessionFlags.responseBeforeCompaction();
}
//@ chunk-5ythzcas.js:85003-85068 facade-majority
/**
 * 状态访问器：调用当前会话的 会话标志（sessionFlags） 上的 forgetResponseBeforeCompaction()。
 */
function forgetResponseBeforeCompaction() {
  currentSession().sessionFlags.forgetResponseBeforeCompaction();
}
//@ chunk-5ythzcas.js:85068-85132 facade-majority
/**
 * 状态访问器：调用当前会话的 会话标志（sessionFlags） 上的 forgetPendingContextCompacted()。
 */
function clearPendingContextCompacted() {
  currentSession().sessionFlags.forgetPendingContextCompacted();
}
//@ chunk-5ythzcas.js:85132-85194 facade-majority
/**
 * 状态访问器：读取当前会话的 host（host） → MCP 进程接线（mcpProcessWiring） 上的 strictConfig()。
 */
function getStrictMcpConfig() {
  return currentSession().host.mcpProcessWiring.strictConfig();
}
//@ chunk-5ythzcas.js:85194-85259 facade-majority
/**
 * 状态访问器：写入当前会话的 host（host） → MCP 进程接线（mcpProcessWiring） 上的 replaceStrictConfig()。
 */
function setStrictMcpConfig(strictMcpConfig) {
  currentSession().host.mcpProcessWiring.replaceStrictConfig(strictMcpConfig);
}
//@ chunk-5ythzcas.js:85259-85330 facade-majority
/**
 * 状态访问器：读取当前会话的 host（host） → 启动选项（launchOptions） 上的 cliSessionConfigCarried()。
 */
function getCliSessionConfigCarried() {
  return currentSession().host.launchOptions.cliSessionConfigCarried();
}
//@ chunk-5ythzcas.js:85330-85403 facade-majority
/**
 * 状态访问器：写入当前会话的 host（host） → 启动选项（launchOptions） 上的 replaceCliSessionConfigCarried()。
 */
function setCliSessionConfigCarried(value) {
  currentSession().host.launchOptions.replaceCliSessionConfigCarried(value);
}
//@ chunk-5ythzcas.js:85403-85478 facade-majority
function getCliConfigBeyondSessionState() {
  return currentSession().host.launchOptions.cliConfigBeyondSessionState();
}
//@ chunk-5ythzcas.js:85478-85555 facade-majority
function setCliConfigBeyondSessionState(cliConfig) {
  currentSession().host.launchOptions.replaceCliConfigBeyondSessionState(cliConfig);
}
//@ chunk-5ythzcas.js:85555-85628 facade-majority
/**
 * 状态访问器：读取当前会话的 host（host） → 启动选项（launchOptions） 上的 forkRestrictedLaunchConfig()。
 */
function getForkRestrictedLaunchConfig() {
  return currentSession().host.launchOptions.forkRestrictedLaunchConfig();
}
//@ chunk-5ythzcas.js:85628-85704 facade-majority
/**
 * 状态访问器：写入当前会话的 host（host） → 启动选项（launchOptions） 上的 replaceForkRestrictedLaunchConfig()。
 */
function setForkRestrictedLaunchConfig(value) {
  currentSession().host.launchOptions.replaceForkRestrictedLaunchConfig(value);
}
//@ chunk-5ythzcas.js:85704-85774 facade-majority
/**
 * 状态访问器：读取当前会话的 host（host） → 启动选项（launchOptions） 上的 forkReplayLaunchConfig()。
 */
function getForkReplayLaunchConfig() {
  return currentSession().host.launchOptions.forkReplayLaunchConfig();
}
//@ chunk-5ythzcas.js:85774-85846 facade-majority
/**
 * 状态访问器：写入当前会话的 host（host） → 启动选项（launchOptions） 上的 replaceForkReplayLaunchConfig()。
 */
function setForkReplayLaunchConfig(value) {
  currentSession().host.launchOptions.replaceForkReplayLaunchConfig(value);
}
//@ chunk-5ythzcas.js:85846-85907 facade-majority
/**
 * 状态访问器：读取当前会话的 MCP 会话接线（mcpSessionWiring） 上的 approvedServers()。
 */
function getSessionApprovedMcpServers() {
  return currentSession().mcpSessionWiring.approvedServers();
}
//@ chunk-5ythzcas.js:85907-85966 facade-majority
/**
 * 状态访问器：调用当前会话的 MCP 会话接线（mcpSessionWiring） 上的 approveServers()。
 */
function addSessionApprovedMcpServers(workspacePersistedTrustKey, servers) {
  currentSession().mcpSessionWiring.approveServers(workspacePersistedTrustKey, servers);
}
//@ chunk-5ythzcas.js:85966-86022 facade-majority
/**
 * 状态访问器：调用当前会话的 费用账本（costLedger） 上的 recordApiDuration()。
 */
function addToTotalDurationState(durationMsIncludingRetries, requestId) {
  currentSession().costLedger.recordApiDuration(durationMsIncludingRetries, requestId);
}
//@ chunk-5ythzcas.js:86022-86075 facade-majority
/**
 * 状态访问器：调用当前会话的 费用账本（costLedger） 上的 recordCost()。
 */
function addToTotalCostState(cost, modelUsage, model) {
  currentSession().costLedger.recordCost(cost, modelUsage, model);
}
//@ chunk-5ythzcas.js:86075-86127 facade-majority
/**
 * 状态访问器：调用当前会话的 费用账本（costLedger） 上的 recordSpentTokens()。
 */
function addToSpentTokens(tokens) {
  currentSession().costLedger.recordSpentTokens(tokens);
}
//@ chunk-5ythzcas.js:86127-86178 facade-majority (2.1.88 match: getTotalCostUSD, 0.713)
/**
 * 状态访问器：读取当前会话的 费用账本（costLedger） 上的 totalCostUSD()。
 */
function getTotalCostUSD() {
  return currentSession().costLedger.totalCostUSD();
}
//@ chunk-5ythzcas.js:86178-86232 facade-majority
/**
 * 状态访问器：调用当前会话的 费用账本（costLedger） 上的 recordSideQueryCost()。
 */
function addSideQueryCostUSD(costUsd) {
  currentSession().costLedger.recordSideQueryCost(costUsd);
}
//@ chunk-5ythzcas.js:86232-86288 facade-majority
/**
 * 状态访问器：读取当前会话的 费用账本（costLedger） 上的 sideQueryCostUSD()。
 */
function getSideQueryCostUSD() {
  return currentSession().costLedger.sideQueryCostUSD();
}
//@ chunk-5ythzcas.js:86288-86343 facade-majority (2.1.88 match: getTotalAPIDuration, 0.72)
/**
 * 状态访问器：读取当前会话的 费用账本（costLedger） 上的 totalAPIDuration()。
 */
function getTotalAPIDuration() {
  return currentSession().costLedger.totalAPIDuration();
}
//@ chunk-5ythzcas.js:86343-86396 facade-majority
/**
 * 状态访问器：读取当前会话的 费用账本（costLedger） 上的 totalDuration()。
 */
function getTotalDuration() {
  return currentSession().costLedger.totalDuration();
}
//@ chunk-5ythzcas.js:86396-86466 facade-majority (2.1.88 match: getTotalAPIDurationWithoutRetries, 0.72)
/**
 * 状态访问器：读取当前会话的 费用账本（costLedger） 上的 totalAPIDurationWithoutRetries()。
 */
function getTotalAPIDurationWithoutRetries() {
  return currentSession().costLedger.totalAPIDurationWithoutRetries();
}
//@ chunk-5ythzcas.js:86466-86523 facade-majority (2.1.88 match: getTotalToolDuration, 0.72)
/**
 * 状态访问器：读取当前会话的 费用账本（costLedger） 上的 totalToolDuration()。
 */
function getTotalToolDuration() {
  return currentSession().costLedger.totalToolDuration();
}
//@ chunk-5ythzcas.js:86523-86576 facade-majority
/**
 * 状态访问器：调用当前会话的 费用账本（costLedger） 上的 recordToolDuration()。
 */
function addToToolDuration(durationMs) {
  currentSession().costLedger.recordToolDuration(durationMs);
}
//@ chunk-5ythzcas.js:86576-86637 facade-majority (2.1.88 match: getStatsStore, 0.729)
/**
 * 状态访问器：读取当前会话的 host（host） → 遥测句柄（telemetryHandles） 上的 statsStore()。
 */
function getStatsStore() {
  return currentSession().host.telemetryHandles.statsStore();
}
//@ chunk-5ythzcas.js:86637-86700 facade-majority
/**
 * 状态访问器：写入当前会话的 host（host） → 遥测句柄（telemetryHandles） 上的 replaceStatsStore()。
 */
function setStatsStore(stats) {
  currentSession().host.telemetryHandles.replaceStatsStore(stats);
}
//@ chunk-5ythzcas.js:86700-86753 facade-majority
/**
 * 状态访问器：调用当前会话的 用户在场（userPresence） 上的 recordInteraction()。
 */
function updateLastInteractionTime(timestamp) {
  currentSession().userPresence.recordInteraction(timestamp);
}
//@ chunk-5ythzcas.js:86753-86800 facade-majority
/**
 * 状态访问器：调用当前会话的 用户在场（userPresence） 上的 flushIfDirty()。
 */
function flushInteractionTime() {
  currentSession().userPresence.flushIfDirty();
}
//@ chunk-5ythzcas.js:86800-86869 facade-majority
/**
 * 状态访问器：调用当前会话的 用户在场（userPresence） → interactionFired 上的 subscribe()。
 */
function onInteraction(listener) {
  return currentSession().userPresence.interactionFired.subscribe(listener);
}
//@ chunk-5ythzcas.js:86869-86917 facade-majority
/**
 * 状态访问器：调用当前会话的 用户在场（userPresence） 上的 resetBaseline()。
 */
function resetInteractionBaseline() {
  currentSession().userPresence.resetBaseline();
}
//@ chunk-5ythzcas.js:86917-86974 facade-majority
/**
 * 状态访问器：调用当前会话的 费用账本（costLedger） 上的 recordLinesChanged()。
 */
function addToTotalLinesChanged(numAdditions, numRemovals) {
  currentSession().costLedger.recordLinesChanged(numAdditions, numRemovals);
}
//@ chunk-5ythzcas.js:86974-87029 facade-majority (2.1.88 match: getTotalLinesAdded, 0.72)
/**
 * 状态访问器：读取当前会话的 费用账本（costLedger） 上的 totalLinesAdded()。
 */
function getTotalLinesAdded() {
  return currentSession().costLedger.totalLinesAdded();
}
//@ chunk-5ythzcas.js:87029-87086 facade-majority (2.1.88 match: getTotalLinesRemoved, 0.72)
/**
 * 状态访问器：读取当前会话的 费用账本（costLedger） 上的 totalLinesRemoved()。
 */
function getTotalLinesRemoved() {
  return currentSession().costLedger.totalLinesRemoved();
}
//@ chunk-5ythzcas.js:87086-87142 facade-majority
/**
 * 状态访问器：读取当前会话的 费用账本（costLedger） 上的 totalInputTokens()。
 */
function getTotalInputTokens() {
  return currentSession().costLedger.totalInputTokens();
}
//@ chunk-5ythzcas.js:87142-87198 facade-majority
/**
 * 状态访问器：读取当前会话的 费用账本（costLedger） 上的 totalOutputTokens()。
 */
function getTotalOutputTokens() {
  return currentSession().costLedger.totalOutputTokens();
}
//@ chunk-5ythzcas.js:87198-87263 facade-majority
/**
 * 状态访问器：读取当前会话的 费用账本（costLedger） 上的 totalCacheReadInputTokens()。
 */
function getTotalCacheReadInputTokens() {
  return currentSession().costLedger.totalCacheReadInputTokens();
}
//@ chunk-5ythzcas.js:87263-87332 facade-majority
/**
 * 状态访问器：读取当前会话的 费用账本（costLedger） 上的 totalCacheCreationInputTokens()。
 */
function getTotalCacheCreationInputTokens() {
  return currentSession().costLedger.totalCacheCreationInputTokens();
}
//@ chunk-5ythzcas.js:87332-87394 facade-majority
/**
 * 状态访问器：读取当前会话的 费用账本（costLedger） 上的 totalWebSearchRequests()。
 */
function getTotalWebSearchRequests() {
  return currentSession().costLedger.totalWebSearchRequests();
}
//@ chunk-5ythzcas.js:87394-87447 facade-majority
/**
 * 状态访问器：调用当前会话的 费用账本（costLedger） 上的 markUnknownModelCost()。
 */
function setHasUnknownModelCost() {
  currentSession().costLedger.markUnknownModelCost();
}
//@ chunk-5ythzcas.js:87447-87506 facade-majority (2.1.88 match: setHasUnknownModelCost, 0.72)
/**
 * 状态访问器：读取当前会话的 费用账本（costLedger） 上的 hasUnknownModelCost()。
 */
function hasUnknownModelCost() {
  return currentSession().costLedger.hasUnknownModelCost();
}
//@ chunk-5ythzcas.js:87506-87555 facade-majority
/**
 * 状态访问器：调用当前会话的 费用账本（costLedger） 上的 recordSafetyStop()。
 */
function addSafetyStop() {
  currentSession().costLedger.recordSafetyStop();
}
//@ chunk-5ythzcas.js:87555-87605 facade-majority
/**
 * 状态访问器：读取当前会话的 费用账本（costLedger） 上的 safetyStops()。
 */
function getSafetyStops() {
  return currentSession().costLedger.safetyStops();
}
//@ chunk-5ythzcas.js:87605-87665 facade-majority (2.1.88 match: getLastMainRequestId, 0.728)
/**
 * 状态访问器：读取当前会话的 请求日志（requestJournal） 上的 lastMainRequestId()。
 */
function getLastMainRequestId() {
  return currentSession().requestJournal.lastMainRequestId();
}
//@ chunk-5ythzcas.js:87665-87732 facade-majority
/**
 * 状态访问器：写入当前会话的 请求日志（requestJournal） 上的 replaceLastMainRequestId()。
 */
function setLastMainRequestId(requestId, response) {
  currentSession().requestJournal.replaceLastMainRequestId(requestId, response);
}
//@ chunk-5ythzcas.js:87732-87806 facade-majority
/**
 * 状态访问器：写入当前会话的 请求日志（requestJournal） 上的 replaceLastMainRequestId()。
 */
function forgetLastMainRequestId() {
  currentSession().requestJournal.replaceLastMainRequestId(undefined, undefined);
}
//@ chunk-5ythzcas.js:87806-87833 facade-majority
/**
 * 交接（hand-off）时清掉最后主请求 id 与压缩前响应。
 */
function forgetMainChainOnHandOff() {
  forgetLastMainRequestId();
  forgetResponseBeforeCompaction();
}
//@ chunk-5ythzcas.js:87833-87898 facade-majority
/**
 * 状态访问器：读取当前会话的 请求日志（requestJournal） 上的 mainChainReleaseCount()。
 */
function getMainChainReleaseCount() {
  return currentSession().requestJournal.mainChainReleaseCount();
}
//@ chunk-5ythzcas.js:87898-87965 facade-majority
/**
 * 状态访问器：读取当前会话的 请求日志（requestJournal） 上的 lastMainThreadCacheTtlMs()。
 */
function getLastMainThreadCacheTtlMs() {
  return currentSession().requestJournal.lastMainThreadCacheTtlMs();
}
//@ chunk-5ythzcas.js:87965-88038 facade-majority
/**
 * 状态访问器：调用当前会话的 请求日志（requestJournal） 上的 isLastMainThreadAskLive()。
 */
function isLastMainThreadAskLive(ttlMs, model) {
  return currentSession().requestJournal.isLastMainThreadAskLive(ttlMs, model);
}
//@ chunk-5ythzcas.js:88038-88104 facade-majority
/**
 * 状态访问器：读取当前会话的 请求日志（requestJournal） 上的 lastMainThreadRequestAt()。
 */
function getLastMainThreadRequestAt() {
  return currentSession().requestJournal.lastMainThreadRequestAt();
}
//@ chunk-5ythzcas.js:88104-88175 facade-majority
/**
 * 状态访问器：读取当前会话的 请求日志（requestJournal） 上的 lastLiveMainThreadRequestAt()。
 */
function getLastLiveMainThreadRequestAt() {
  return currentSession().requestJournal.lastLiveMainThreadRequestAt();
}
//@ chunk-5ythzcas.js:88175-88253 facade-majority
/**
 * 状态访问器：写入当前会话的 请求日志（requestJournal） 上的 replaceLastMainThreadCacheTtlMs()。
 */
function setLastMainThreadCacheTtlMs(ttlMs, a, askedAt) {
  currentSession().requestJournal.replaceLastMainThreadCacheTtlMs(ttlMs, a, askedAt);
}
//@ chunk-5ythzcas.js:88253-88322 facade-majority
/**
 * 状态访问器：调用当前会话的 请求日志（requestJournal） 上的 adjustLastMainThreadCacheTtlMs()。
 */
function adjustLastMainThreadCacheTtlMs(ttlMs) {
  currentSession().requestJournal.adjustLastMainThreadCacheTtlMs(ttlMs);
}
//@ chunk-5ythzcas.js:88322-88393 facade-majority
/**
 * 状态访问器：调用当前会话的 请求日志（requestJournal） 上的 recordLastMainThreadCacheRenewal()。
 */
function recordLastMainThreadCacheRenewal(renewedAt) {
  currentSession().requestJournal.recordLastMainThreadCacheRenewal(renewedAt);
}
//@ chunk-5ythzcas.js:88393-88465 facade-majority
/**
 * 状态访问器：读取当前会话的 请求日志（requestJournal） 上的 lastMainThreadCacheRenewedAt()。
 */
function getLastMainThreadCacheRenewedAt() {
  return currentSession().requestJournal.lastMainThreadCacheRenewedAt();
}
//@ chunk-5ythzcas.js:88465-88536 facade-majority
/**
 * 状态访问器：读取当前会话的 请求日志（requestJournal） 上的 lastMainThreadContextTokens()。
 */
function getLastMainThreadContextTokens() {
  return currentSession().requestJournal.lastMainThreadContextTokens();
}
//@ chunk-5ythzcas.js:88536-88609 facade-majority
/**
 * 状态访问器：写入当前会话的 请求日志（requestJournal） 上的 replaceLastMainThreadContextTokens()。
 */
function setLastMainThreadContextTokens(contextTokens) {
  currentSession().requestJournal.replaceLastMainThreadContextTokens(contextTokens);
}
//@ chunk-5ythzcas.js:88609-88756 facade-majority
/**
 * resume 种子：会话 id 已一致时立即应用到请求日志，否则暂存待切换后应用。
 */
function stageResumeJournalSeed(seed) {
  let session = currentSession();
  if (seed.sessionId !== undefined && seed.sessionId === session.id)
    session.requestJournal.applyResumeSeed(seed);
  else session.requestJournal.stageResumeSeed(seed);
}
//@ chunk-5ythzcas.js:88756-88826 facade-majority (2.1.88 match: getLastApiCompletionTimestamp, 0.736)
/**
 * 状态访问器：读取当前会话的 请求日志（requestJournal） 上的 lastApiCompletionTimestamp()。
 */
function getLastApiCompletionTimestamp() {
  return currentSession().requestJournal.lastApiCompletionTimestamp();
}
//@ chunk-5ythzcas.js:88826-88898 facade-majority
/**
 * 状态访问器：写入当前会话的 请求日志（requestJournal） 上的 replaceLastApiCompletionTimestamp()。
 */
function setLastApiCompletionTimestamp(timestamp) {
  currentSession().requestJournal.replaceLastApiCompletionTimestamp(timestamp);
}
//@ chunk-5ythzcas.js:88898-89090 facade-majority
/**
 * markPostCompaction：标记刚压缩并记录上下文 token；不保留缓存前缀时清掉最后主线程请求。
 */
function markPostCompaction(contextTokens, { keepsCachedPrefix = false } = {}) {
  let requestJournal = currentSession().requestJournal;
  requestJournal.replacePendingPostCompaction(true);
  requestJournal.replaceLastMainThreadContextTokens(contextTokens);
  if (!keepsCachedPrefix) requestJournal.replaceLastMainThreadRequest(null, null);
}
//@ chunk-5ythzcas.js:89090-89217 facade-majority (2.1.88 match: markPostCompaction, 0.543)
/**
 * 读取并清除“刚压缩过”标记。
 */
function consumePostCompaction() {
  let session = currentSession();
  let pending = session.requestJournal.pendingPostCompaction();
  session.requestJournal.replacePendingPostCompaction(false);
  return pending;
}
//@ chunk-5ythzcas.js:89217-89277 facade-majority (2.1.88 match: flushInteractionTime_inner, 0.693)
/**
 * 状态访问器：读取当前会话的 用户在场（userPresence） 上的 lastInteractionTime()。
 */
function getLastInteractionTime() {
  return currentSession().userPresence.lastInteractionTime();
}
//@ chunk-5ythzcas.js:89277-89333 facade-majority
/**
 * 状态访问器：读取当前会话的 用户在场（userPresence） 上的 lastSubmitTime()。
 */
function getLastSubmitTime() {
  return currentSession().userPresence.lastSubmitTime();
}
//@ chunk-5ythzcas.js:89333-89380 facade-majority
/**
 * 状态访问器：调用当前会话的 用户在场（userPresence） 上的 recordSubmit()。
 */
function recordSubmitTime() {
  currentSession().userPresence.recordSubmit();
}
//@ chunk-5ythzcas.js:89380-89394 facade-majority
/**
 * 用户“活跃”的判定窗口：60 秒（通知用）。
 */
var NOTIF_ACTIVE_THRESHOLD_MS = 60000;
//@ chunk-5ythzcas.js:89394-89450 facade-majority
/**
 * 状态访问器：调用当前会话的 用户在场（userPresence） 上的 updateTerminalFocus()。
 */
function setTerminalFocusForState(focused) {
  currentSession().userPresence.updateTerminalFocus(focused);
}
//@ chunk-5ythzcas.js:89450-89505 facade-majority
/**
 * 状态访问器：读取当前会话的 用户在场（userPresence） 上的 terminalFocus()。
 */
function getTerminalFocus() {
  return currentSession().userPresence.terminalFocus();
}
//@ chunk-5ythzcas.js:89505-89577 facade-majority
/**
 * 状态访问器：调用当前会话的 用户在场（userPresence） → terminalFocusFired 上的 subscribe()。
 */
function onTerminalFocusChange(listener) {
  return currentSession().userPresence.terminalFocusFired.subscribe(listener);
}
//@ chunk-5ythzcas.js:89577-89654 facade-majority
/**
 * 用户是否活跃：终端焦点已知时用焦点，否则看 60 秒内是否有交互。
 */
function isUserActiveForNotifications() {
  let terminalFocus = getTerminalFocus();
  if (terminalFocus !== undefined) return terminalFocus;
  return Date.now() - getLastInteractionTime() < NOTIF_ACTIVE_THRESHOLD_MS;
}
//@ chunk-5ythzcas.js:89654-89707 facade-majority
/**
 * 状态访问器：调用当前会话的 用户在场（userPresence） 上的 markScrollActivity()。
 */
function markScrollActivity() {
  currentSession().userPresence.markScrollActivity();
}
//@ chunk-5ythzcas.js:89707-89763 facade-majority
/**
 * 状态访问器：读取当前会话的 用户在场（userPresence） 上的 scrollDraining()。
 */
function getIsScrollDraining() {
  return currentSession().userPresence.scrollDraining();
}
//@ chunk-5ythzcas.js:89763-89828 facade-majority
/**
 * 会话状态函数 waitForScrollIdle：涉及当前会话的 userPresence.waitForScrollIdle。
 */
async function waitForScrollIdle() {
  return currentSession().userPresence.waitForScrollIdle();
}
//@ chunk-5ythzcas.js:89828-89877 facade-majority (2.1.88 match: getModelUsage, 0.678)
/**
 * 状态访问器：读取当前会话的 费用账本（costLedger） 上的 modelUsage()。
 */
function getModelUsage() {
  return currentSession().costLedger.modelUsage();
}
//@ chunk-5ythzcas.js:89877-89932 facade-majority
/**
 * 状态访问器：调用当前会话的 费用账本（costLedger） 上的 usageForModel()。
 */
function getUsageForModel(model) {
  return currentSession().costLedger.usageForModel(model);
}
//@ chunk-5ythzcas.js:89932-89990 facade-majority
/**
 * 状态访问器：调用当前会话的 费用账本（costLedger） 上的 trackUsageSinceLastResult()。
 */
function trackUsageSinceLastResult() {
  currentSession().costLedger.trackUsageSinceLastResult();
}
//@ chunk-5ythzcas.js:89990-90050 facade-majority
/**
 * 状态访问器：读取当前会话的 费用账本（costLedger） 上的 usageSinceLastResult()。
 */
function getUsageSinceLastResult() {
  return currentSession().costLedger.usageSinceLastResult();
}
//@ chunk-5ythzcas.js:90050-90114 facade-majority
/**
 * 状态访问器：读取当前会话的 费用账本（costLedger） 上的 takeUsageSinceLastResult()。
 */
function takeUsageSinceLastResult() {
  return currentSession().costLedger.takeUsageSinceLastResult();
}
//@ chunk-5ythzcas.js:90114-90178 facade-majority (2.1.88 match: getMainLoopModelOverride, 0.717)
/**
 * 状态访问器：读取当前会话的 模型选择（modelSelection） 上的 mainLoopModelOverride()。
 */
function getMainLoopModelOverride() {
  return currentSession().modelSelection.mainLoopModelOverride();
}
//@ chunk-5ythzcas.js:90178-90241 facade-majority (2.1.88 match: getInitialMainLoopModel, 0.702)
/**
 * 状态访问器：读取当前会话的 模型选择（modelSelection） 上的 initialMainLoopModel()。
 */
function getInitialMainLoopModel() {
  return currentSession().modelSelection.initialMainLoopModel();
}
//@ chunk-5ythzcas.js:90241-90300 facade-majority
/**
 * 状态访问器：调用当前会话的 模型选择（modelSelection） 上的 overrideMainLoopModel()。
 */
function setMainLoopModelOverride(model) {
  currentSession().modelSelection.overrideMainLoopModel(model);
}
//@ chunk-5ythzcas.js:90300-90363 facade-majority
/**
 * 状态访问器：读取当前会话的 模型选择（modelSelection） 上的 mainLoopEffortState()。
 */
function getMainLoopEffortState() {
  return currentSession().modelSelection.mainLoopEffortState();
}
//@ chunk-5ythzcas.js:90363-90428 facade-majority
/**
 * 状态访问器：写入当前会话的 模型选择（modelSelection） 上的 replaceMainLoopEffortState()。
 */
function setMainLoopEffortState(effortState) {
  currentSession().modelSelection.replaceMainLoopEffortState(effortState);
}
//@ chunk-5ythzcas.js:90428-90494 facade-majority
/**
 * 状态访问器：调用当前会话的 模型选择（modelSelection） 上的 markRefusalFallbackOccurred()。
 */
function markRefusalFallbackOccurred(reason) {
  currentSession().modelSelection.markRefusalFallbackOccurred(reason);
}
//@ chunk-5ythzcas.js:90494-90560 facade-majority
/**
 * 状态访问器：读取当前会话的 模型选择（modelSelection） 上的 refusalFallbackOccurred()。
 */
function hasRefusalFallbackOccurred() {
  return currentSession().modelSelection.refusalFallbackOccurred();
}
//@ chunk-5ythzcas.js:90560-90623 facade-majority
/**
 * 状态访问器：调用当前会话的 模型选择（modelSelection） 上的 armRefusalFallbackHeader()。
 */
function markRefusalFallbackHeaderArmed(armed) {
  currentSession().modelSelection.armRefusalFallbackHeader(armed);
}
//@ chunk-5ythzcas.js:90623-90693 facade-majority
/**
 * 状态访问器：读取当前会话的 模型选择（modelSelection） 上的 refusalFallbackHeaderArmed()。
 */
function hasRefusalFallbackHeaderArmed() {
  return currentSession().modelSelection.refusalFallbackHeaderArmed();
}
//@ chunk-5ythzcas.js:90693-90753 facade-majority
/**
 * 状态访问器：调用当前会话的 模型选择（modelSelection） 上的 armSilentLaneFromServer()。
 */
function markSilentRefusalFallbackServerArmed() {
  currentSession().modelSelection.armSilentLaneFromServer();
}
//@ chunk-5ythzcas.js:90753-90818 facade-majority
/**
 * 状态访问器：读取当前会话的 模型选择（modelSelection） 上的 silentLaneServerArmed()。
 */
function isSilentRefusalFallbackServerArmed() {
  return currentSession().modelSelection.silentLaneServerArmed();
}
//@ chunk-5ythzcas.js:90818-90897 facade-majority
/**
 * 状态访问器：读取当前会话的 模型选择（modelSelection） 上的 refusalFallbackLatchOriginRequestId()。
 */
function getRefusalFallbackLatchOriginRequestId() {
  return currentSession().modelSelection.refusalFallbackLatchOriginRequestId();
}
//@ chunk-5ythzcas.js:90897-91231 facade-majority
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
//@ chunk-5ythzcas.js:91231-91307 facade-majority
/**
 * 状态访问器：调用当前会话的 模型选择（modelSelection） 上的 unlatchRefusalFallbackModel()。
 */
function clearRefusalFallbackModelLatch() {
  currentSession().modelSelection.unlatchRefusalFallbackModel("model_pick");
}
//@ chunk-5ythzcas.js:91307-91375 facade-majority
/**
 * 状态访问器：读取当前会话的 模型选择（modelSelection） 上的 refusalFallbackModelLatch()。
 */
function getRefusalFallbackModelLatch() {
  return currentSession().modelSelection.refusalFallbackModelLatch();
}
//@ chunk-5ythzcas.js:91375-91529 facade-majority
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
//@ chunk-5ythzcas.js:91529-91593 facade-majority
/**
 * 状态访问器：读取当前会话的 模型选择（modelSelection） 上的 takeCarriedEffortEnd()。
 */
function takeRefusalFallbackCarriedEffortEnd() {
  return currentSession().modelSelection.takeCarriedEffortEnd();
}
//@ chunk-5ythzcas.js:91593-91748 facade-majority
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
//@ chunk-5ythzcas.js:91748-91814 facade-majority
/**
 * 状态访问器：调用当前会话的 模型选择（modelSelection） 上的 forgetRefusalFallbackOccurred()。
 */
function clearRefusalFallbackOccurred() {
  currentSession().modelSelection.forgetRefusalFallbackOccurred();
}
//@ chunk-5ythzcas.js:91814-91881 facade-majority
/**
 * 状态访问器：调用当前会话的 宿主能力（surfaceCapabilities） 上的 markSdkDialogHostActive()。
 */
function setSdkDialogHostActive(active) {
  currentSession().surfaceCapabilities.markSdkDialogHostActive(active);
}
//@ chunk-5ythzcas.js:91881-91948 facade-majority
/**
 * 状态访问器：读取当前会话的 宿主能力（surfaceCapabilities） 上的 sdkDialogHostActive()。
 */
function isSdkDialogHostActive() {
  return currentSession().surfaceCapabilities.sdkDialogHostActive();
}
//@ chunk-5ythzcas.js:91948-92014 facade-majority
/**
 * 状态访问器：调用当前会话的 宿主能力（surfaceCapabilities） 上的 declareDialogKinds()。
 */
function setSdkSupportedDialogKinds(dialogKinds, source) {
  currentSession().surfaceCapabilities.declareDialogKinds(dialogKinds, source);
}
//@ chunk-5ythzcas.js:92014-92086 facade-majority
/**
 * 状态访问器：读取当前会话的 宿主能力（surfaceCapabilities） 上的 sdkSupportedDialogKinds()。
 */
function getSdkSupportedDialogKinds() {
  return currentSession().surfaceCapabilities.sdkSupportedDialogKinds();
}
//@ chunk-5ythzcas.js:92086-92253 facade-majority
/**
 * SDK 宿主声明的对话类型来源（未声明为 none）。
 */
function getSdkDialogCapabilitySource() {
  let session = currentSession();
  if (session.surfaceCapabilities.sdkSupportedDialogKinds() === undefined) return "none";
  return session.surfaceCapabilities.sdkSupportedDialogKindsSource() ?? "none";
}
//@ chunk-5ythzcas.js:92253-92325 facade-majority
/**
 * 状态访问器：调用当前会话的 宿主能力（surfaceCapabilities） 上的 declarePerTaskStopAffordance()。
 */
function setSdkPerTaskStopAffordance(affordance) {
  currentSession().surfaceCapabilities.declarePerTaskStopAffordance(affordance);
}
//@ chunk-5ythzcas.js:92325-92403 facade-majority
/**
 * 会话状态函数 getSdkPerTaskStopAffordance：涉及当前会话的 surfaceCapabilities.sdkPerTaskStopAffordance。
 */
function getSdkPerTaskStopAffordance() {
  return currentSession().surfaceCapabilities.sdkPerTaskStopAffordance() === true;
}
//@ chunk-5ythzcas.js:92403-92474 facade-majority
/**
 * 状态访问器：调用当前会话的 宿主能力（surfaceCapabilities） 上的 declareRapidFollowupPreempt()。
 */
function setSdkRapidFollowupPreempt(enabled) {
  currentSession().surfaceCapabilities.declareRapidFollowupPreempt(enabled);
}
//@ chunk-5ythzcas.js:92474-92551 facade-majority
/**
 * 会话状态函数 getSdkRapidFollowupPreempt：涉及当前会话的 surfaceCapabilities.sdkRapidFollowupPreempt。
 */
function getSdkRapidFollowupPreempt() {
  return currentSession().surfaceCapabilities.sdkRapidFollowupPreempt() === true;
}
//@ chunk-5ythzcas.js:92551-92632 facade-majority
/**
 * 状态访问器：调用当前会话的 宿主能力（surfaceCapabilities） 上的 declareForwardNestedSubagentToolCalls()。
 */
function setSdkForwardNestedSubagentToolCalls(enabled) {
  currentSession().surfaceCapabilities.declareForwardNestedSubagentToolCalls(enabled);
}
//@ chunk-5ythzcas.js:92632-92710 facade-majority
/**
 * 状态访问器：调用当前会话的 宿主能力（surfaceCapabilities） 上的 declareHostRendersChromeSetupOffer()。
 */
function setHostRendersChromeSetupOffer(enabled) {
  currentSession().surfaceCapabilities.declareHostRendersChromeSetupOffer(enabled);
}
//@ chunk-5ythzcas.js:92710-92791 facade-majority
/**
 * 会话状态函数 getHostRendersChromeSetupOffer：涉及当前会话的 surfaceCapabilities.hostRendersChromeSetupOffer。
 */
function getHostRendersChromeSetupOffer() {
  return currentSession().surfaceCapabilities.hostRendersChromeSetupOffer() === true;
}
//@ chunk-5ythzcas.js:92791-92852 facade-majority
/**
 * 状态访问器：读取当前会话的 host（host） → 启动选项（launchOptions） 上的 replConfigArgv()。
 */
function getReplConfigArgv() {
  return currentSession().host.launchOptions.replConfigArgv();
}
//@ chunk-5ythzcas.js:92852-92916 facade-majority
/**
 * 状态访问器：写入当前会话的 host（host） → 启动选项（launchOptions） 上的 replaceReplConfigArgv()。
 */
function setReplConfigArgv(argv) {
  currentSession().host.launchOptions.replaceReplConfigArgv(argv);
}
//@ chunk-5ythzcas.js:92916-92982 facade-majority
/**
 * 状态访问器：写入当前会话的 模型选择（modelSelection） 上的 replaceInitialMainLoopModel()。
 */
function setInitialMainLoopModel(initialMainLoopModel) {
  currentSession().modelSelection.replaceInitialMainLoopModel(initialMainLoopModel);
}
//@ chunk-5ythzcas.js:92982-93051 facade-majority
/**
 * 状态访问器：读取当前会话的 模型选择（modelSelection） 上的 availabilityFallbackChain()。
 */
function getAvailabilityFallbackChain() {
  return currentSession().modelSelection.availabilityFallbackChain();
}
//@ chunk-5ythzcas.js:93051-93122 facade-majority
/**
 * 状态访问器：写入当前会话的 模型选择（modelSelection） 上的 replaceAvailabilityFallbackChain()。
 */
function setAvailabilityFallbackChain(chain) {
  currentSession().modelSelection.replaceAvailabilityFallbackChain(chain);
}
//@ chunk-5ythzcas.js:93122-93190 facade-majority
/**
 * 状态访问器：读取当前会话的 模型选择（modelSelection） 上的 initialModelSettingLayer()。
 */
function getInitialModelSettingLayer() {
  return currentSession().modelSelection.initialModelSettingLayer();
}
//@ chunk-5ythzcas.js:93190-93260 facade-majority
/**
 * 状态访问器：写入当前会话的 模型选择（modelSelection） 上的 replaceInitialModelSettingLayer()。
 */
function setInitialModelSettingLayer(settingLayer) {
  currentSession().modelSelection.replaceInitialModelSettingLayer(settingLayer);
}
//@ chunk-5ythzcas.js:93260-93322 facade-majority
/**
 * 状态访问器：读取当前会话的 模型选择（modelSelection） 上的 resolvedOrgDefault()。
 */
function getResolvedOrgDefault() {
  return currentSession().modelSelection.resolvedOrgDefault();
}
//@ chunk-5ythzcas.js:93322-93386 facade-majority
/**
 * 状态访问器：写入当前会话的 模型选择（modelSelection） 上的 replaceResolvedOrgDefault()。
 */
function setResolvedOrgDefault(model) {
  currentSession().modelSelection.replaceResolvedOrgDefault(model);
}
//@ chunk-5ythzcas.js:93386-93452 facade-majority
/**
 * 状态访问器：读取当前会话的 模型选择（modelSelection） 上的 initialEnvDefaultModel()。
 */
function getInitialEnvDefaultModel() {
  return currentSession().modelSelection.initialEnvDefaultModel();
}
//@ chunk-5ythzcas.js:93452-93520 facade-majority
/**
 * 状态访问器：写入当前会话的 模型选择（modelSelection） 上的 replaceInitialEnvDefaultModel()。
 */
function setInitialEnvDefaultModel(model) {
  currentSession().modelSelection.replaceInitialEnvDefaultModel(model);
}
//@ chunk-5ythzcas.js:93520-93591 facade-majority (2.1.88 match: getSdkBetas, 0.724)
/**
 * 会话状态函数 getSdkBetas：优先取异步上下文覆盖对象的 sdkBetas；涉及当前会话的 surfaceCapabilities.sdkBetas。
 */
function getSdkBetas() {
  return getAgentContext()?.sdkBetas ?? currentSession().surfaceCapabilities.sdkBetas();
}
//@ chunk-5ythzcas.js:93591-93650 facade-majority
/**
 * 状态访问器：写入当前会话的 宿主能力（surfaceCapabilities） 上的 replaceSdkBetas()。
 */
function setSdkBetas(sdkBetas) {
  currentSession().surfaceCapabilities.replaceSdkBetas(sdkBetas);
}
//@ chunk-5ythzcas.js:93650-93732 facade-majority
/**
 * 状态访问器：读取当前会话的 host（host） → 账户额度锁存（accountCreditLatches） 上的 longContext1mCreditsBlocked()。
 */
function isLongContext1mCreditsBlocked() {
  return currentSession().host.accountCreditLatches.longContext1mCreditsBlocked();
}
//@ chunk-5ythzcas.js:93732-93816 facade-majority
/**
 * 状态访问器：写入当前会话的 host（host） → 账户额度锁存（accountCreditLatches） 上的 replaceLongContext1mCreditsBlocked()。
 */
function setLongContext1mCreditsBlocked(blocked) {
  currentSession().host.accountCreditLatches.replaceLongContext1mCreditsBlocked(blocked);
}
//@ chunk-5ythzcas.js:93816-93891 facade-majority
/**
 * 状态访问器：读取当前会话的 host（host） → 账户额度锁存（accountCreditLatches） 上的 usageCreditsRequired()。
 */
function isUsageCreditsRequired() {
  return currentSession().host.accountCreditLatches.usageCreditsRequired();
}
//@ chunk-5ythzcas.js:93891-93968 facade-majority
/**
 * 状态访问器：写入当前会话的 host（host） → 账户额度锁存（accountCreditLatches） 上的 replaceUsageCreditsRequired()。
 */
function setUsageCreditsRequired(required) {
  currentSession().host.accountCreditLatches.replaceUsageCreditsRequired(required);
}
//@ chunk-5ythzcas.js:93968-94055 facade-majority
/**
 * 状态访问器：调用当前会话的 仅额度模型同意（usageCreditsOnlyModelConsentSlots） 上的 consentSessionFallback()。
 */
function hasUsageCreditsOnlyModelConsentSessionFallback(modelFamily) {
  return currentSession().usageCreditsOnlyModelConsentSlots.consentSessionFallback(modelFamily);
}
//@ chunk-5ythzcas.js:94055-94146 facade-majority
/**
 * 状态访问器：写入当前会话的 仅额度模型同意（usageCreditsOnlyModelConsentSlots） 上的 replaceConsentSessionFallback()。
 */
function setUsageCreditsOnlyModelConsentSessionFallback(modelFamily, consented) {
  currentSession().usageCreditsOnlyModelConsentSlots.replaceConsentSessionFallback(modelFamily, consented);
}
//@ chunk-5ythzcas.js:94146-94228 facade-majority
/**
 * 状态访问器：调用当前会话的 仅额度模型同意（usageCreditsOnlyModelConsentSlots） 上的 sessionConsentKey()。
 */
function getUsageCreditsOnlyModelSessionConsentKey(modelFamily) {
  return currentSession().usageCreditsOnlyModelConsentSlots.sessionConsentKey(modelFamily);
}
//@ chunk-5ythzcas.js:94228-94314 facade-majority
/**
 * 状态访问器：写入当前会话的 仅额度模型同意（usageCreditsOnlyModelConsentSlots） 上的 replaceSessionConsentKey()。
 */
function setUsageCreditsOnlyModelSessionConsentKey(modelFamily, ownerKey) {
  currentSession().usageCreditsOnlyModelConsentSlots.replaceSessionConsentKey(modelFamily, ownerKey);
}
//@ chunk-5ythzcas.js:94314-94392 facade-majority
/**
 * 状态访问器：读取当前会话的 host（host） → 凭证槽（credentialSlots） 上的 sdkOAuthTokenRefreshCallback()。
 */
function getSdkOAuthTokenRefreshCallback() {
  return currentSession().host.credentialSlots.sdkOAuthTokenRefreshCallback();
}
//@ chunk-5ythzcas.js:94392-94472 facade-majority
/**
 * 状态访问器：写入当前会话的 host（host） → 凭证槽（credentialSlots） 上的 replaceSdkOAuthTokenRefreshCallback()。
 */
function setSdkOAuthTokenRefreshCallback(callback) {
  currentSession().host.credentialSlots.replaceSdkOAuthTokenRefreshCallback(callback);
}
//@ chunk-5ythzcas.js:94472-94550 facade-majority
/**
 * 状态访问器：读取当前会话的 host（host） → 凭证槽（credentialSlots） 上的 hostAuthTokenRefreshCallback()。
 */
function getHostAuthTokenRefreshCallback() {
  return currentSession().host.credentialSlots.hostAuthTokenRefreshCallback();
}
//@ chunk-5ythzcas.js:94550-94630 facade-majority
/**
 * 状态访问器：写入当前会话的 host（host） → 凭证槽（credentialSlots） 上的 replaceHostAuthTokenRefreshCallback()。
 */
function setHostAuthTokenRefreshCallback(callback) {
  currentSession().host.credentialSlots.replaceHostAuthTokenRefreshCallback(callback);
}
//@ chunk-5ythzcas.js:94630-94676 facade-majority
/**
 * 注册费用状态保存器（在默认 root 会话的账本上）。
 */
function registerSessionCostSaver(saveSessionCostBeforeExit) {
  defaultRootSession.costLedger.registerSaver(saveSessionCostBeforeExit);
}
//@ chunk-5ythzcas.js:94676-94732 facade-majority
/**
 * 状态访问器：调用当前会话的 费用账本（costLedger） 上的 runSaver()。
 */
function saveSessionCostsForTransition(storageV5) {
  currentSession().costLedger.runSaver(storageV5, defaultRootSession.costLedger);
}
//@ chunk-5ythzcas.js:94732-94791 facade-majority
/**
 * 注册费用状态的会话记录写入器。
 */
function registerCostStateRecorder(recordCostState) {
  defaultRootSession.costLedger.registerTranscriptRecorder(recordCostState);
}
//@ chunk-5ythzcas.js:94791-94864 facade-majority
/**
 * 状态访问器：调用当前会话的 费用账本（costLedger） 上的 runTranscriptRecorder()。
 */
function recordCostStateToTranscript(recorder, options) {
  currentSession().costLedger.runTranscriptRecorder(recorder, options, defaultRootSession.costLedger);
}
//@ chunk-5ythzcas.js:94864-94925 facade-majority
/**
 * 费用账本是否属于当前会话。
 */
function costLedgerBelongsToCurrentSession() {
  let session = currentSession();
  return session.costLedger.belongsTo(session.id);
}
//@ chunk-5ythzcas.js:94925-94975 facade-majority
/**
 * 把费用账本归属到当前会话。
 */
function claimCostLedgerForCurrentSession() {
  let session = currentSession();
  session.costLedger.claim(session.id);
}
//@ chunk-5ythzcas.js:94975-95027 facade-majority
/**
 * 把费用账本范围限定为当前会话。
 */
function scopeCostLedgerToCurrentSession() {
  let session = currentSession();
  session.costLedger.scopeTo(session.id);
}
//@ chunk-5ythzcas.js:95027-95116 facade-majority
/**
 * resetCostState：清空当前会话费用账本并清 promptId。
 */
function resetCostState() {
  let session = currentSession();
  session.costLedger.reset(session.id);
  session.requestJournal.replacePromptId(null);
}
//@ chunk-5ythzcas.js:95116-95171 facade-majority
/**
 * setCostStateForRestore：resume 时恢复费用状态。
 */
function setCostStateForRestore(costState) {
  let session = currentSession();
  session.costLedger.restore(costState, session.id);
}
//@ chunk-5ythzcas.js:95171-95235 facade-majority
/**
 * 状态访问器：读取当前会话的 host（host） → 启动选项（launchOptions） 上的 projectConfigRoot()。
 */
function getProjectConfigRoot() {
  return currentSession().host.launchOptions.projectConfigRoot();
}
//@ chunk-5ythzcas.js:95235-95302 facade-majority
/**
 * 状态访问器：写入当前会话的 host（host） → 启动选项（launchOptions） 上的 replaceProjectConfigRoot()。
 */
function setProjectConfigRoot(root) {
  currentSession().host.launchOptions.replaceProjectConfigRoot(root);
}
//@ chunk-5ythzcas.js:95302-95366 facade-majority (2.1.88 match: getModelStrings, 0.7)
/**
 * 状态访问器：读取当前会话的 host（host） → 模型字符串缓存（modelStringsCache） 上的 modelStrings()。
 */
function getModelStrings() {
  return currentSession().host.modelStringsCache.modelStrings();
}
//@ chunk-5ythzcas.js:95366-95432 facade-majority
/**
 * 状态访问器：写入当前会话的 host（host） → 模型字符串缓存（modelStringsCache） 上的 replaceModelStrings()。
 */
function setModelStrings(modelStrings) {
  currentSession().host.modelStringsCache.replaceModelStrings(modelStrings);
}
//@ chunk-5ythzcas.js:95432-95487 facade-majority
/**
 * 状态访问器：调用当前会话的 host（host） → 模型字符串缓存（modelStringsCache） 上的 invalidate()。
 */
function resetModelStrings() {
  currentSession().host.modelStringsCache.invalidate();
}
//@ chunk-5ythzcas.js:95487-95563 facade-majority
/**
 * 状态访问器：调用当前会话的 host（host） → 模型字符串缓存（modelStringsCache） 上的 recordAdmin3PSteeringSnapshot()。
 */
function setAdmin3PSteeringSnapshot(snapshot) {
  currentSession().host.modelStringsCache.recordAdmin3PSteeringSnapshot(snapshot);
}
//@ chunk-5ythzcas.js:95563-95638 facade-majority
/**
 * 状态访问器：读取当前会话的 host（host） → 模型字符串缓存（modelStringsCache） 上的 admin3PSteeringSnapshot()。
 */
function getAdmin3PSteeringSnapshot() {
  return currentSession().host.modelStringsCache.admin3PSteeringSnapshot();
}
//@ chunk-5ythzcas.js:95638-95718 facade-majority
/**
 * 状态访问器：调用当前会话的 host（host） → 模型字符串缓存（modelStringsCache） 上的 recordProbeRefutedDocumentDefault()。
 */
function recordProbeRefutedDocumentDefault(candidate) {
  currentSession().host.modelStringsCache.recordProbeRefutedDocumentDefault(candidate);
}
//@ chunk-5ythzcas.js:95718-95798 facade-majority
/**
 * 状态访问器：读取当前会话的 host（host） → 模型字符串缓存（modelStringsCache） 上的 probeRefutedDocumentDefaults()。
 */
function getProbeRefutedDocumentDefaults() {
  return currentSession().host.modelStringsCache.probeRefutedDocumentDefaults();
}
//@ chunk-5ythzcas.js:95798-95863 facade-majority (2.1.88 match: getLoggerProvider, 0.729)
/**
 * 状态访问器：读取当前会话的 host（host） → 遥测句柄（telemetryHandles） 上的 loggerProvider()。
 */
function getLoggerProvider() {
  return currentSession().host.telemetryHandles.loggerProvider();
}
//@ chunk-5ythzcas.js:95863-95930 facade-majority
/**
 * 状态访问器：写入当前会话的 host（host） → 遥测句柄（telemetryHandles） 上的 replaceLoggerProvider()。
 */
function setLoggerProvider(loggerProvider) {
  currentSession().host.telemetryHandles.replaceLoggerProvider(loggerProvider);
}
//@ chunk-5ythzcas.js:95930-95992 facade-majority (2.1.88 match: getEventLogger, 0.711)
/**
 * 状态访问器：读取当前会话的 host（host） → 遥测句柄（telemetryHandles） 上的 eventLogger()。
 */
function getEventLogger() {
  return currentSession().host.telemetryHandles.eventLogger();
}
//@ chunk-5ythzcas.js:95992-96059 facade-majority
/**
 * 状态访问器：读取当前会话的 host（host） → 遥测句柄（telemetryHandles） 上的 eventLoggerOwner()。
 */
function getEventLoggerOwner() {
  return currentSession().host.telemetryHandles.eventLoggerOwner();
}
//@ chunk-5ythzcas.js:96059-96132 facade-majority
/**
 * 状态访问器：调用当前会话的 host（host） → 遥测句柄（telemetryHandles） 上的 attachEventLogger()。
 */
function setEventLogger(eventLogger, source = "org") {
  currentSession().host.telemetryHandles.attachEventLogger(eventLogger, source);
}
//@ chunk-5ythzcas.js:96132-96203 facade-majority
/**
 * 状态访问器：调用当前会话的 host（host） → 遥测句柄（telemetryHandles） 上的 bufferPendingEvent()。
 */
function bufferPendingOTelEvent(event) {
  return currentSession().host.telemetryHandles.bufferPendingEvent(event);
}
//@ chunk-5ythzcas.js:96203-96260 facade-majority
/**
 * 状态访问器：调用当前会话的 host（host） → 遥测句柄（telemetryHandles） 上的 closeWindow()。
 */
function discardPendingOTelEvents(reason) {
  currentSession().host.telemetryHandles.closeWindow(reason);
}
//@ chunk-5ythzcas.js:96260-96327 facade-majority
/**
 * 状态访问器：读取当前会话的 host（host） → 遥测句柄（telemetryHandles） 上的 windowCloseCause()。
 */
function getOTelWindowCloseCause() {
  return currentSession().host.telemetryHandles.windowCloseCause();
}
//@ chunk-5ythzcas.js:96327-96390 facade-majority
/**
 * 状态访问器：读取当前会话的 host（host） → 遥测句柄（telemetryHandles） 上的 isWindowOpen()。
 */
function isOTelInitPending() {
  return currentSession().host.telemetryHandles.isWindowOpen();
}
//@ chunk-5ythzcas.js:96390-96449 facade-majority
/**
 * 状态访问器：读取当前会话的 host（host） → 遥测句柄（telemetryHandles） 上的 hostOtel()。
 */
function getHostOtelState() {
  return currentSession().host.telemetryHandles.hostOtel();
}
//@ chunk-5ythzcas.js:96449-96514 facade-majority (2.1.88 match: getTracerProvider, 0.729)
/**
 * 状态访问器：读取当前会话的 host（host） → 遥测句柄（telemetryHandles） 上的 tracerProvider()。
 */
function getTracerProvider() {
  return currentSession().host.telemetryHandles.tracerProvider();
}
//@ chunk-5ythzcas.js:96514-96581 facade-majority
/**
 * 状态访问器：写入当前会话的 host（host） → 遥测句柄（telemetryHandles） 上的 replaceTracerProvider()。
 */
function setTracerProvider(tracerProvider) {
  currentSession().host.telemetryHandles.replaceTracerProvider(tracerProvider);
}
//@ chunk-5ythzcas.js:96581-96659 facade-majority
/**
 * 状态访问器：读取当前会话的 host（host） → 请求锁存（requestLatches） 上的 foundryDeploymentCapabilities()。
 */
function getFoundryDeploymentCapabilities() {
  return currentSession().host.requestLatches.foundryDeploymentCapabilities();
}
//@ chunk-5ythzcas.js:96659-96733 facade-majority
/**
 * 状态访问器：读取当前会话的 host（host） → 遥测句柄（telemetryHandles） 上的 cachedTelemetryResource()。
 */
function getCachedTelemetryResource() {
  return currentSession().host.telemetryHandles.cachedTelemetryResource();
}
//@ chunk-5ythzcas.js:96733-96809 facade-majority
/**
 * 状态访问器：写入当前会话的 host（host） → 遥测句柄（telemetryHandles） 上的 replaceCachedTelemetryResource()。
 */
function setCachedTelemetryResource(resource) {
  currentSession().host.telemetryHandles.replaceCachedTelemetryResource(resource);
}
//@ chunk-5ythzcas.js:96809-96892 facade-majority
/**
 * 状态访问器：调用当前会话的 host（host） → 遥测句柄（telemetryHandles） 上的 cachedOtlpHttpAgentFactory()。
 */
function getCachedOtlpHttpAgentFactory(useProxy, trustProfile) {
  return currentSession().host.telemetryHandles.cachedOtlpHttpAgentFactory(useProxy, trustProfile);
}
//@ chunk-5ythzcas.js:96892-96979 facade-majority
/**
 * 状态访问器：写入当前会话的 host（host） → 遥测句柄（telemetryHandles） 上的 replaceCachedOtlpHttpAgentFactory()。
 */
function setCachedOtlpHttpAgentFactory(useProxy, trustProfile, factory) {
  currentSession().host.telemetryHandles.replaceCachedOtlpHttpAgentFactory(useProxy, trustProfile, factory);
}
//@ chunk-5ythzcas.js:96979-97039 facade-majority (2.1.88 match: getIsNonInteractiveSession, 0.713)
/**
 * getIsNonInteractiveSession：!launchOptions.isInteractive()。
 */
function getIsNonInteractiveSession() {
  return !currentSession().host.launchOptions.isInteractive();
}
//@ chunk-5ythzcas.js:97039-97102 facade-majority
/**
 * 状态访问器：读取当前会话的 host（host） → 启动选项（launchOptions） 上的 spareClaimState()。
 */
function getSpareClaimState() {
  return currentSession().host.launchOptions.spareClaimState();
}
//@ chunk-5ythzcas.js:97102-97175 facade-majority
/**
 * 会话状态函数 isParkedSpare：涉及当前会话的 host.launchOptions.spareClaimState。
 */
function isParkedSpare() {
  return currentSession().host.launchOptions.spareClaimState() === "parked";
}
//@ chunk-5ythzcas.js:97175-97291 facade-majority
/**
 * 会话状态函数 markSpareParked：涉及当前会话的 host.launchOptions。
 */
function markSpareParked() {
  let launchOptions = currentSession().host.launchOptions;
  launchOptions.replaceSpareClaimState("parked");
  launchOptions.replaceSpareParkedAtMs(Date.now());
}
//@ chunk-5ythzcas.js:97291-97432 facade-majority
/**
 * 会话状态函数 markSpareClaiming：涉及当前会话的 host.launchOptions。
 */
function markSpareClaiming() {
  let launchOptions = currentSession().host.launchOptions;
  let parkedAtMs = launchOptions.spareParkedAtMs();
  launchOptions.replaceSpareClaimState("claiming");
  return parkedAtMs === undefined ? undefined : Date.now() - parkedAtMs;
}
//@ chunk-5ythzcas.js:97432-97504 facade-majority
/**
 * 状态访问器：写入当前会话的 host（host） → 启动选项（launchOptions） 上的 replaceSpareClaimState()。
 */
function markSpareClaimed() {
  currentSession().host.launchOptions.replaceSpareClaimState("claimed");
}
//@ chunk-5ythzcas.js:97504-97575 facade-majority
/**
 * 状态访问器：写入当前会话的 host（host） → 启动选项（launchOptions） 上的 replaceSpareClaimState()。
 */
function markSpareClaimFailed() {
  currentSession().host.launchOptions.replaceSpareClaimState("failed");
}
//@ chunk-5ythzcas.js:97575-97687 facade-majority
/**
 * 会话状态函数 isUnclaimedSpare：涉及当前会话的 host.launchOptions.spareClaimState。
 */
function isUnclaimedSpare() {
  let claimState = currentSession().host.launchOptions.spareClaimState();
  return claimState === "parked" || claimState === "claiming" || claimState === "failed";
}
//@ chunk-5ythzcas.js:97687-97747 facade-majority (2.1.88 match: getIsInteractive, 0.713)
/**
 * 状态访问器：读取当前会话的 host（host） → 启动选项（launchOptions） 上的 isInteractive()。
 */
function getIsInteractive() {
  return currentSession().host.launchOptions.isInteractive();
}
//@ chunk-5ythzcas.js:97747-97817 facade-majority
/**
 * 状态访问器：读取当前会话的 host（host） → 启动选项（launchOptions） 上的 isInteractivityDecided()。
 */
function isInteractivityDecided() {
  return currentSession().host.launchOptions.isInteractivityDecided();
}
//@ chunk-5ythzcas.js:97817-97881 facade-majority
/**
 * 状态访问器：读取当前会话的 host（host） → 启动选项（launchOptions） 上的 isNoDialogLaunch()。
 */
function isNoDialogLaunch() {
  return currentSession().host.launchOptions.isNoDialogLaunch();
}
//@ chunk-5ythzcas.js:97881-97940 facade-majority
/**
 * 状态访问器：调用当前会话的 host（host） → 启动选项（launchOptions） 上的 markNoDialogLaunch()。
 */
function markNoDialogLaunch() {
  currentSession().host.launchOptions.markNoDialogLaunch();
}
//@ chunk-5ythzcas.js:97940-98090 facade-majority (2.1.88 match: setIsInteractive, 0.385)
/**
 * setIsInteractive：写 launchOptions.isInteractive；变化时让所有 HostScoped 缓存失效。
 */
function setIsInteractive(value) {
  let session = currentSession();
  let changed = session.host.launchOptions.isInteractive() !== value;
  session.host.launchOptions.replaceIsInteractive(value);
  if (changed) SETTINGS_CACHE_STORE_SLOT.of(session.host).invalidateAll();
}
//@ chunk-5ythzcas.js:98090-98154 facade-majority
/**
 * 状态访问器：读取当前会话的 host（host） → 启动选项（launchOptions） 上的 printOutputFormat()。
 */
function getPrintOutputFormat() {
  return currentSession().host.launchOptions.printOutputFormat();
}
//@ chunk-5ythzcas.js:98154-98221 facade-majority
/**
 * 状态访问器：写入当前会话的 host（host） → 启动选项（launchOptions） 上的 replacePrintOutputFormat()。
 */
function setPrintOutputFormat(format) {
  currentSession().host.launchOptions.replacePrintOutputFormat(format);
}
//@ chunk-5ythzcas.js:98221-98292 facade-majority
/**
 * 状态访问器：读取当前会话的 host（host） → 启动选项（launchOptions） 上的 thinkingDisplayExplicit()。
 */
function getThinkingDisplayExplicit() {
  return currentSession().host.launchOptions.thinkingDisplayExplicit();
}
//@ chunk-5ythzcas.js:98292-98365 facade-majority
/**
 * 状态访问器：写入当前会话的 host（host） → 启动选项（launchOptions） 上的 replaceThinkingDisplayExplicit()。
 */
function setThinkingDisplayExplicit(thinkingDisplayExplicit) {
  currentSession().host.launchOptions.replaceThinkingDisplayExplicit(thinkingDisplayExplicit);
}
//@ chunk-5ythzcas.js:98365-98436 facade-majority
/**
 * 状态访问器：读取当前会话的 host（host） → 启动选项（launchOptions） 上的 permissionPromptToolName()。
 */
function getPermissionPromptToolName() {
  return currentSession().host.launchOptions.permissionPromptToolName();
}
//@ chunk-5ythzcas.js:98436-98510 facade-majority
/**
 * 状态访问器：写入当前会话的 host（host） → 启动选项（launchOptions） 上的 replacePermissionPromptToolName()。
 */
function setPermissionPromptToolName(toolName) {
  currentSession().host.launchOptions.replacePermissionPromptToolName(toolName);
}
//@ chunk-5ythzcas.js:98510-98570 facade-majority
/**
 * 状态访问器：读取当前会话的 宿主能力（surfaceCapabilities） 上的 attacherCaps()。
 */
function getAttacherCaps() {
  return currentSession().surfaceCapabilities.attacherCaps();
}
//@ chunk-5ythzcas.js:98570-98633 facade-majority
/**
 * 状态访问器：写入当前会话的 宿主能力（surfaceCapabilities） 上的 replaceAttacherCaps()。
 */
function setAttacherCaps(caps) {
  currentSession().surfaceCapabilities.replaceAttacherCaps(caps);
}
//@ chunk-5ythzcas.js:98633-98712 facade-majority
/**
 * 状态访问器：调用当前会话的 宿主能力（surfaceCapabilities） → attacherCapsChanged 上的 subscribe()。
 */
function onAttacherCapsChange(listener) {
  return currentSession().surfaceCapabilities.attacherCapsChanged.subscribe(listener);
}
//@ chunk-5ythzcas.js:98712-98781 facade-majority
/**
 * 状态访问器：读取当前会话的 宿主能力（surfaceCapabilities） 上的 rvSupervisorLinkLive()。
 */
function getRvSupervisorLinkLive() {
  return currentSession().surfaceCapabilities.rvSupervisorLinkLive();
}
//@ chunk-5ythzcas.js:98781-98852 facade-majority
/**
 * 状态访问器：写入当前会话的 宿主能力（surfaceCapabilities） 上的 replaceRvSupervisorLinkLive()。
 */
function setRvSupervisorLinkLive(live) {
  currentSession().surfaceCapabilities.replaceRvSupervisorLinkLive(live);
}
//@ chunk-5ythzcas.js:98852-98936 facade-majority
/**
 * 状态访问器：调用当前会话的 宿主能力（surfaceCapabilities） → rvSupervisorLinkChanged 上的 subscribe()。
 */
function onRvSupervisorLinkChange(listener) {
  return currentSession().surfaceCapabilities.rvSupervisorLinkChanged.subscribe(listener);
}
//@ chunk-5ythzcas.js:98936-99001 facade-majority
/**
 * 状态访问器：读取当前会话的 host（host） → 启动选项（launchOptions） 上的 hasStreamingInput()。
 */
function getHasStreamingInput() {
  return currentSession().host.launchOptions.hasStreamingInput();
}
//@ chunk-5ythzcas.js:99001-99068 facade-majority
/**
 * 状态访问器：写入当前会话的 host（host） → 启动选项（launchOptions） 上的 replaceHasStreamingInput()。
 */
function setHasStreamingInput(enabled) {
  currentSession().host.launchOptions.replaceHasStreamingInput(enabled);
}
//@ chunk-5ythzcas.js:99068-99126 facade-majority
/**
 * 是否为单次 -p（无流式输入、无 --sdk-url）。
 */
function deriveSingleShotPrintSession({ hasStreamingInput, sdkUrl }) {
  return !hasStreamingInput && !sdkUrl;
}
//@ chunk-5ythzcas.js:99126-99346 layout
function resolveOwnEventsSink(launchOptions) {
  if (launchOptions.entrypoint === "terminal") return launchOptions.ownEventsRequested ? "terminal" : "none";
  if (launchOptions.ownEventsOnly) return "evals";
  if (launchOptions.hasStreamingInput || launchOptions.sdkUrl) return "host";
  if (launchOptions.ownEventsRequested) return "evals";
  return "none";
}
//@ chunk-5ythzcas.js:99346-99418 facade-majority
/**
 * 状态访问器：写入当前会话的 host（host） → 启动选项（launchOptions） 上的 replaceSingleShotPrintSession()。
 */
function setSingleShotPrintSession(singleShotPrintSession) {
  currentSession().host.launchOptions.replaceSingleShotPrintSession(singleShotPrintSession);
}
//@ chunk-5ythzcas.js:99418-99487 facade-majority
/**
 * 状态访问器：读取当前会话的 host（host） → 启动选项（launchOptions） 上的 singleShotPrintSession()。
 */
function isSingleShotPrintSession() {
  return currentSession().host.launchOptions.singleShotPrintSession();
}
//@ chunk-5ythzcas.js:99487-99548 facade-majority
/**
 * 状态访问器：调用当前会话的 host（host） → 启动选项（launchOptions） 上的 markPrintInputClosed()。
 */
function markPrintInputClosed() {
  currentSession().host.launchOptions.markPrintInputClosed();
}
//@ chunk-5ythzcas.js:99548-99612 facade-majority
/**
 * 状态访问器：读取当前会话的 host（host） → 启动选项（launchOptions） 上的 printInputClosed()。
 */
function isPrintInputClosed() {
  return currentSession().host.launchOptions.printInputClosed();
}
//@ chunk-5ythzcas.js:99612-99670 facade-majority (2.1.88 match: getClientType, 0.741)
/**
 * 状态访问器：读取当前会话的 host（host） → 启动选项（launchOptions） 上的 clientType()。
 */
function getClientType() {
  return currentSession().host.launchOptions.clientType();
}
//@ chunk-5ythzcas.js:99670-99730 facade-majority
/**
 * 状态访问器：写入当前会话的 host（host） → 启动选项（launchOptions） 上的 replaceClientType()。
 */
function setClientType(clientType) {
  currentSession().host.launchOptions.replaceClientType(clientType);
}
//@ chunk-5ythzcas.js:99730-99810 facade-majority (2.1.88 match: getSdkAgentProgressSummariesEnabled, 0.764)
/**
 * 状态访问器：读取当前会话的 host（host） → 启动选项（launchOptions） 上的 sdkAgentProgressSummariesEnabled()。
 */
function getSdkAgentProgressSummariesEnabled() {
  return currentSession().host.launchOptions.sdkAgentProgressSummariesEnabled();
}
//@ chunk-5ythzcas.js:99810-99892 facade-majority
/**
 * 状态访问器：写入当前会话的 host（host） → 启动选项（launchOptions） 上的 replaceSdkAgentProgressSummariesEnabled()。
 */
function setSdkAgentProgressSummariesEnabled(enabled) {
  currentSession().host.launchOptions.replaceSdkAgentProgressSummariesEnabled(enabled);
}
//@ chunk-5ythzcas.js:99892-99952 facade-majority
/**
 * 状态访问器：读取当前会话的 host（host） → 启动选项（launchOptions） 上的 rendererMode()。
 */
function getRendererModeForAnalytics() {
  return currentSession().host.launchOptions.rendererMode();
}
//@ chunk-5ythzcas.js:99952-100014 facade-majority
/**
 * 状态访问器：写入当前会话的 host（host） → 启动选项（launchOptions） 上的 replaceRendererMode()。
 */
function setRendererModeForAnalytics(mode) {
  currentSession().host.launchOptions.replaceRendererMode(mode);
}
//@ chunk-5ythzcas.js:100014-100085 facade-majority (2.1.88 match: getStrictToolResultPairing, 0.764)
/**
 * 状态访问器：读取当前会话的 host（host） → 启动选项（launchOptions） 上的 strictToolResultPairing()。
 */
function getStrictToolResultPairing() {
  return currentSession().host.launchOptions.strictToolResultPairing();
}
//@ chunk-5ythzcas.js:100085-100149 facade-majority
/**
 * 状态访问器：读取当前会话的 host（host） → 启动选项（launchOptions） 上的 restrictedSession()。
 */
function isRestrictedSession() {
  return currentSession().host.launchOptions.restrictedSession();
}
//@ chunk-5ythzcas.js:100149-100216 facade-majority
/**
 * 状态访问器：写入当前会话的 host（host） → 启动选项（launchOptions） 上的 replaceRestrictedSession()。
 */
function setRestrictedSession(restricted) {
  currentSession().host.launchOptions.replaceRestrictedSession(restricted);
}
//@ chunk-5ythzcas.js:100216-100308 facade-majority
/**
 * 会话状态函数 getWorkspaceRestriction：涉及当前会话的 host.launchOptions.workspaceRestrictionState。
 */
function getWorkspaceRestriction() {
  return currentSession().host.launchOptions.workspaceRestrictionState()?.restriction ?? null;
}
//@ chunk-5ythzcas.js:100308-100342 facade-majority
/**
 * 是否处于受限工作区。
 */
function isWorkspaceRestricted() {
  return getWorkspaceRestriction() !== null;
}
//@ chunk-5ythzcas.js:100342-100489 layout
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
//@ chunk-5ythzcas.js:100489-100525 facade-majority
/**
 * 路径是否在受限工作区根之下。
 */
function isUnderRestrictedWorkspaceRoot(path) {
  return findRestrictedWorkspaceRoot(path) !== null;
}
//@ chunk-5ythzcas.js:100525-100697 facade-majority
/**
 * 会话状态函数 isRestrictedWorkspaceTrustKey：涉及当前会话的 host.launchOptions.restrictedWorkspaceRoots。
 */
function isRestrictedWorkspaceTrustKey(trustKey) {
  if (getWorkspaceRestriction()?.gateKeys.includes(trustKey)) return true;
  for (let restriction of currentSession().host.launchOptions.restrictedWorkspaceRoots().values())
    if (restriction.gateKeys.includes(trustKey)) return true;
  return false;
}
//@ chunk-5ythzcas.js:100697-100762 facade-majority
/**
 * 状态访问器：读取当前会话的 会话标志（sessionFlags） 上的 accountMemoryLaunchMode()。
 */
function getAccountMemoryLaunchMode() {
  return currentSession().sessionFlags.accountMemoryLaunchMode();
}
//@ chunk-5ythzcas.js:100762-100819 facade-majority
/**
 * 状态访问器：读取当前会话的 会话标志（sessionFlags） 上的 memoryToggledOff()。
 */
function getMemoryToggledOff() {
  return currentSession().sessionFlags.memoryToggledOff();
}
//@ chunk-5ythzcas.js:100819-100952 facade-majority
/**
 * 设置“记忆已暂停”（/memory 开关），变化时通知订阅者。
 */
function setMemoryToggledOff(pausing) {
  let session = currentSession();
  if (session.sessionFlags.memoryToggledOff() === pausing) return;
  session.sessionFlags.replaceMemoryToggledOff(pausing);
  memoryToggleListeners.of(session).emit(pausing);
}
//@ chunk-5ythzcas.js:100952-100976 layout
var memoryToggleListeners; // deferred: uses SessionRootSlot (./sessionSlices.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-5ythzcas.js:100952", () => {
  memoryToggleListeners = new SessionRootSlot(() => createSignal());
});
//@ chunk-5ythzcas.js:100976-101027 facade-majority
/**
 * 订阅记忆暂停变化。
 */
function onMemoryPauseChange(listener, root = currentSession()) {
  return memoryToggleListeners.of(root).subscribe(listener);
}
//@ chunk-5ythzcas.js:101027-101093 facade-majority
/**
 * 状态访问器：读取当前会话的 会话标志（sessionFlags） 上的 autoMemoryOffThisSession()。
 */
function getAutoMemoryOffThisSession() {
  return currentSession().sessionFlags.autoMemoryOffThisSession();
}
//@ chunk-5ythzcas.js:101093-101343 facade-majority
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
//@ chunk-5ythzcas.js:101343-101367 layout
var autoMemoryOffListeners; // deferred: uses SessionRootSlot (./sessionSlices.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-5ythzcas.js:101343", () => {
  autoMemoryOffListeners = new SessionRootSlot(() => createSignal());
});
//@ chunk-5ythzcas.js:101367-101418 facade-majority
/**
 * 订阅本会话自动记忆开关变化。
 */
function onAutoMemorySessionSwitchChange(listener, root = currentSession()) {
  return autoMemoryOffListeners.of(root).subscribe(listener);
}
//@ chunk-5ythzcas.js:101418-101479 facade-majority
/**
 * 状态访问器：读取当前会话的 会话标志（sessionFlags） 上的 restoredMemoryPause()。
 */
function getRestoredMemoryPause() {
  return currentSession().sessionFlags.restoredMemoryPause();
}
//@ chunk-5ythzcas.js:101479-101542 facade-majority
/**
 * 状态访问器：写入当前会话的 会话标志（sessionFlags） 上的 replaceRestoredMemoryPause()。
 */
function setRestoredMemoryPause(paused) {
  currentSession().sessionFlags.replaceRestoredMemoryPause(paused);
}
//@ chunk-5ythzcas.js:101542-101605 facade-majority
/**
 * 状态访问器：读取当前会话的 会话标志（sessionFlags） 上的 restoredAutoMemoryOff()。
 */
function getRestoredAutoMemoryOff() {
  return currentSession().sessionFlags.restoredAutoMemoryOff();
}
//@ chunk-5ythzcas.js:101605-101670 facade-majority
/**
 * 状态访问器：写入当前会话的 会话标志（sessionFlags） 上的 replaceRestoredAutoMemoryOff()。
 */
function setRestoredAutoMemoryOff(off) {
  currentSession().sessionFlags.replaceRestoredAutoMemoryOff(off);
}
//@ chunk-5ythzcas.js:101670-101864 facade-majority
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
//@ chunk-5ythzcas.js:101864-101938 facade-majority
/**
 * 状态访问器：读取当前会话的 host（host） → 启动选项（launchOptions） 上的 wizardOperatorToolsEnabled()。
 */
function getWizardOperatorToolsEnabled() {
  return currentSession().host.launchOptions.wizardOperatorToolsEnabled();
}
//@ chunk-5ythzcas.js:101938-102156 facade-majority
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
//@ chunk-5ythzcas.js:102156-102238 facade-majority
/**
 * 状态访问器：读取当前会话的 host（host） → 启动选项（launchOptions） 上的 runnerDeclaredNestedRepositoryDiff()。
 */
function getRunnerDeclaredNestedRepositoryDiff() {
  return currentSession().host.launchOptions.runnerDeclaredNestedRepositoryDiff();
}
//@ chunk-5ythzcas.js:102238-102460 facade-majority
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
//@ chunk-5ythzcas.js:102460-102544 facade-majority
/**
 * 状态访问器：读取当前会话的 host（host） → 启动选项（launchOptions） 上的 runnerDeclaredNoRepositoryCheckedOut()。
 */
function getRunnerDeclaredNoRepositoryCheckedOut() {
  return currentSession().host.launchOptions.runnerDeclaredNoRepositoryCheckedOut();
}
//@ chunk-5ythzcas.js:102544-102766 facade-majority
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
//@ chunk-5ythzcas.js:102766-102830 facade-majority
/**
 * 状态访问器：读取当前会话的 host（host） → 启动选项（launchOptions） 上的 pollEventIngress()。
 */
function getPollEventIngress() {
  return currentSession().host.launchOptions.pollEventIngress();
}
//@ chunk-5ythzcas.js:102830-102867 facade-majority
/**
 * poll_event 入口是否已接线。
 */
function isPollEventIngressWired() {
  return getPollEventIngress() !== "none";
}
//@ chunk-5ythzcas.js:102867-102929 layout
/**
 * 状态访问器：调用当前会话的 host（host） → 启动选项（launchOptions） 上的 markPollEventIngress()。
 */
function markPollEventIngress(ownEventsSink) {
  currentSession().host.launchOptions.markPollEventIngress(ownEventsSink);
}
//@ chunk-5ythzcas.js:102929-103002 facade-majority
function isOwnEventDeliveryRequested() {
  return currentSession().host.launchOptions.ownEventDeliveryRequested();
}
//@ chunk-5ythzcas.js:103002-103071 layout
/**
 * 状态访问器：调用当前会话的 host（host） → 启动选项（launchOptions） 上的 markOwnEventDeliveryRequested()。
 */
function markOwnEventDeliveryRequested() {
  currentSession().host.launchOptions.markOwnEventDeliveryRequested();
}
//@ chunk-5ythzcas.js:103071-103141 facade-majority
function setOwnEventDeliveryHeld(held) {
  currentSession().host.launchOptions.replaceOwnEventDeliveryHeld(held);
}
//@ chunk-5ythzcas.js:103141-103250 facade-majority
/**
 * 按本次运行的入口/输入方式决定自有事件的去向（terminal/evals/host）并记录。
 */
function markPollEventWiringForRun(launchOptions) {
  let ownEventsSink = resolveOwnEventsSink(launchOptions);
  if (ownEventsSink !== "none" && !(ownEventsSink === "host" && getPollEventIngress() === "evals"))
    markPollEventIngress(ownEventsSink);
  if (launchOptions.ownEventsRequested) markOwnEventDeliveryRequested();
}
//@ chunk-5ythzcas.js:103250-103309 facade-majority (2.1.88 match: getUserMsgOptIn, 0.764)
/**
 * 状态访问器：读取当前会话的 host（host） → 启动选项（launchOptions） 上的 userMsgOptIn()。
 */
function getUserMsgOptIn() {
  return currentSession().host.launchOptions.userMsgOptIn();
}
//@ chunk-5ythzcas.js:103309-103371 facade-majority
/**
 * 状态访问器：写入当前会话的 host（host） → 启动选项（launchOptions） 上的 replaceUserMsgOptIn()。
 */
function setUserMsgOptIn(enabled) {
  currentSession().host.launchOptions.replaceUserMsgOptIn(enabled);
}
//@ chunk-5ythzcas.js:103371-103435 facade-majority
/**
 * 状态访问器：读取当前会话的 host（host） → 启动选项（launchOptions） 上的 searchToolsOptIn()。
 */
function getSearchToolsOptIn() {
  return currentSession().host.launchOptions.searchToolsOptIn();
}
//@ chunk-5ythzcas.js:103435-103501 facade-majority
/**
 * 状态访问器：写入当前会话的 host（host） → 启动选项（launchOptions） 上的 replaceSearchToolsOptIn()。
 */
function setSearchToolsOptIn(enabled) {
  currentSession().host.launchOptions.replaceSearchToolsOptIn(enabled);
}
//@ chunk-5ythzcas.js:103501-103563 facade-majority
/**
 * 状态访问器：读取当前会话的 host（host） → 启动选项（launchOptions） 上的 todoToolsOptIn()。
 */
function getTodoToolsOptIn() {
  return currentSession().host.launchOptions.todoToolsOptIn();
}
//@ chunk-5ythzcas.js:103563-103627 facade-majority
/**
 * 状态访问器：写入当前会话的 host（host） → 启动选项（launchOptions） 上的 replaceTodoToolsOptIn()。
 */
function setTodoToolsOptIn(enabled) {
  currentSession().host.launchOptions.replaceTodoToolsOptIn(enabled);
}
//@ chunk-5ythzcas.js:103627-103699 facade-majority
/**
 * 状态访问器：读取当前会话的 host（host） → 启动选项（launchOptions） 上的 toolsOmittedByLaunchList()。
 */
function getToolsOmittedByLaunchList() {
  return currentSession().host.launchOptions.toolsOmittedByLaunchList();
}
//@ chunk-5ythzcas.js:103699-103782 facade-majority
/**
 * 会话状态函数 setToolsOmittedByLaunchList：涉及当前会话的 host.launchOptions.replaceToolsOmittedByLaunchList。
 */
function setToolsOmittedByLaunchList(toolNames) {
  currentSession().host.launchOptions.replaceToolsOmittedByLaunchList(new Set(toolNames));
}
//@ chunk-5ythzcas.js:103782-103846 facade-majority
/**
 * 状态访问器：读取当前会话的 host（host） → 启动选项（launchOptions） 上的 sessionStartType()。
 */
function getSessionStartType() {
  return currentSession().host.launchOptions.sessionStartType();
}
//@ chunk-5ythzcas.js:103846-103912 facade-majority
/**
 * 状态访问器：写入当前会话的 host（host） → 启动选项（launchOptions） 上的 replaceSessionStartType()。
 */
function setSessionStartType(startType) {
  currentSession().host.launchOptions.replaceSessionStartType(startType);
}
//@ chunk-5ythzcas.js:103912-103981 facade-majority (2.1.88 match: getQuestionPreviewFormat, 0.764)
/**
 * 状态访问器：读取当前会话的 host（host） → 启动选项（launchOptions） 上的 questionPreviewFormat()。
 */
function getQuestionPreviewFormat() {
  return currentSession().host.launchOptions.questionPreviewFormat();
}
//@ chunk-5ythzcas.js:103981-104052 facade-majority
/**
 * 状态访问器：写入当前会话的 host（host） → 启动选项（launchOptions） 上的 replaceQuestionPreviewFormat()。
 */
function setQuestionPreviewFormat(previewFormat) {
  currentSession().host.launchOptions.replaceQuestionPreviewFormat(previewFormat);
}
//@ chunk-5ythzcas.js:104052-104124 facade-majority
/**
 * 状态访问器：读取当前会话的 host（host） → 启动选项（launchOptions） 上的 extendedQuestionsEnabled()。
 */
function getExtendedQuestionsEnabled() {
  return currentSession().host.launchOptions.extendedQuestionsEnabled();
}
//@ chunk-5ythzcas.js:104124-104198 facade-majority
/**
 * 状态访问器：写入当前会话的 host（host） → 启动选项（launchOptions） 上的 replaceExtendedQuestionsEnabled()。
 */
function setExtendedQuestionsEnabled(enabled) {
  currentSession().host.launchOptions.replaceExtendedQuestionsEnabled(enabled);
}
//@ chunk-5ythzcas.js:104198-104280 facade-majority
/**
 * 状态访问器：读取当前会话的 host（host） → 启动选项（launchOptions） 上的 questionOptionDescriptionsOptional()。
 */
function getQuestionOptionDescriptionsOptional() {
  return currentSession().host.launchOptions.questionOptionDescriptionsOptional();
}
//@ chunk-5ythzcas.js:104280-104364 facade-majority
/**
 * 状态访问器：写入当前会话的 host（host） → 启动选项（launchOptions） 上的 replaceQuestionOptionDescriptionsOptional()。
 */
function setQuestionOptionDescriptionsOptional(optional) {
  currentSession().host.launchOptions.replaceQuestionOptionDescriptionsOptional(optional);
}
//@ chunk-5ythzcas.js:104364-104421 facade-majority (2.1.88 match: getAgentColorMap, 0.739)
/**
 * 状态访问器：读取当前会话的 会话暂存（sessionScratch） 上的 agentColorMap()。
 */
function getAgentColorMap() {
  return currentSession().sessionScratch.agentColorMap();
}
//@ chunk-5ythzcas.js:104421-104485 facade-majority (2.1.88 match: getFlagSettingsPath, 0.727)
/**
 * 状态访问器：读取当前会话的 host（host） → 设置来源（settingsSource） 上的 flagSettingsPath()。
 */
function getFlagSettingsPath() {
  return currentSession().host.settingsSource.flagSettingsPath();
}
//@ chunk-5ythzcas.js:104485-104552 facade-majority
/**
 * 状态访问器：写入当前会话的 host（host） → 设置来源（settingsSource） 上的 replaceFlagSettingsPath()。
 */
function setFlagSettingsPath(settingsPath) {
  currentSession().host.settingsSource.replaceFlagSettingsPath(settingsPath);
}
//@ chunk-5ythzcas.js:104552-104620 facade-majority
/**
 * 状态访问器：读取当前会话的 host（host） → 设置来源（settingsSource） 上的 flagAgentsFilePaths()。
 */
function getFlagAgentsFilePaths() {
  return currentSession().host.settingsSource.flagAgentsFilePaths();
}
//@ chunk-5ythzcas.js:104620-104690 facade-majority
/**
 * 状态访问器：写入当前会话的 host（host） → 设置来源（settingsSource） 上的 replaceFlagAgentsFilePaths()。
 */
function setFlagAgentsFilePaths(paths) {
  currentSession().host.settingsSource.replaceFlagAgentsFilePaths(paths);
}
//@ chunk-5ythzcas.js:104690-104761 facade-majority
/**
 * 状态访问器：读取当前会话的 host（host） → 设置来源（settingsSource） 上的 flagMcpConfigFilePaths()。
 */
function getFlagMcpConfigFilePaths() {
  return currentSession().host.settingsSource.flagMcpConfigFilePaths();
}
//@ chunk-5ythzcas.js:104761-104834 facade-majority
/**
 * 状态访问器：写入当前会话的 host（host） → 设置来源（settingsSource） 上的 replaceFlagMcpConfigFilePaths()。
 */
function setFlagMcpConfigFilePaths(paths) {
  currentSession().host.settingsSource.replaceFlagMcpConfigFilePaths(paths);
}
//@ chunk-5ythzcas.js:104834-104909 facade-majority
/**
 * 状态访问器：读取当前会话的 host（host） → 设置来源（settingsSource） 上的 flagSettingsExpectedContent()。
 */
function getFlagSettingsExpectedContent() {
  return currentSession().host.settingsSource.flagSettingsExpectedContent();
}
//@ chunk-5ythzcas.js:104909-104987 facade-majority
/**
 * 状态访问器：写入当前会话的 host（host） → 设置来源（settingsSource） 上的 replaceFlagSettingsExpectedContent()。
 */
function setFlagSettingsExpectedContent(content) {
  currentSession().host.settingsSource.replaceFlagSettingsExpectedContent(content);
}
//@ chunk-5ythzcas.js:104987-105064 facade-majority
/**
 * 状态访问器：读取当前会话的 host（host） → 设置来源（settingsSource） 上的 flagSettingsFilePinnedContent()。
 */
function getFlagSettingsFilePinnedContent() {
  return currentSession().host.settingsSource.flagSettingsFilePinnedContent();
}
//@ chunk-5ythzcas.js:105064-105144 facade-majority
/**
 * 状态访问器：写入当前会话的 host（host） → 设置来源（settingsSource） 上的 replaceFlagSettingsFilePinnedContent()。
 */
function setFlagSettingsFilePinnedContent(content) {
  currentSession().host.settingsSource.replaceFlagSettingsFilePinnedContent(content);
}
//@ chunk-5ythzcas.js:105144-105210 facade-majority (2.1.88 match: getFlagSettingsInline, 0.722)
/**
 * 状态访问器：读取当前会话的 host（host） → 设置来源（settingsSource） 上的 flagSettingsInline()。
 */
function getFlagSettingsInline() {
  return currentSession().host.settingsSource.flagSettingsInline();
}
//@ chunk-5ythzcas.js:105210-105278 facade-majority
/**
 * 状态访问器：写入当前会话的 host（host） → 设置来源（settingsSource） 上的 replaceFlagSettingsInline()。
 */
function setFlagSettingsInline(settings) {
  currentSession().host.settingsSource.replaceFlagSettingsInline(settings);
}
//@ chunk-5ythzcas.js:105278-105348 facade-majority
/**
 * 状态访问器：读取当前会话的 host（host） → 设置来源（settingsSource） 上的 parentManagedSettings()。
 */
function getParentManagedSettings() {
  return currentSession().host.settingsSource.parentManagedSettings();
}
//@ chunk-5ythzcas.js:105348-105429 facade-majority
/**
 * 状态访问器：写入当前会话的 host（host） → 设置来源（settingsSource） 上的 replaceParentManagedSettings()。
 */
function setParentManagedSettings(tier, organization = null) {
  currentSession().host.settingsSource.replaceParentManagedSettings(tier, organization);
}
//@ chunk-5ythzcas.js:105429-105505 facade-majority
/**
 * 状态访问器：读取当前会话的 host（host） → 设置来源（settingsSource） 上的 parentManagedSettingsInvalid()。
 */
function getParentManagedSettingsInvalid() {
  return currentSession().host.settingsSource.parentManagedSettingsInvalid();
}
//@ chunk-5ythzcas.js:105505-105584 facade-majority
/**
 * 状态访问器：写入当前会话的 host（host） → 设置来源（settingsSource） 上的 replaceParentManagedSettingsInvalid()。
 */
function setParentManagedSettingsInvalid(invalid) {
  currentSession().host.settingsSource.replaceParentManagedSettingsInvalid(invalid);
}
//@ chunk-5ythzcas.js:105584-105659 facade-majority
/**
 * 状态访问器：读取当前会话的 host（host） → 设置来源（settingsSource） 上的 parentOrganizationSettings()。
 */
function getParentOrganizationSettings() {
  return currentSession().host.settingsSource.parentOrganizationSettings();
}
//@ chunk-5ythzcas.js:105659-105770 facade-majority (2.1.88 match: getSessionIngressToken, 0.534)
/**
 * 会话状态函数 getSessionIngressToken：涉及当前会话的 host.credentialSlots.sessionIngressToken。
 */
function getSessionIngressToken() {
  let context = agentContextGetter();
  return context
    ? context.secrets.sessionIngressToken
    : currentSession().host.credentialSlots.sessionIngressToken();
}
//@ chunk-5ythzcas.js:105770-105893 facade-majority (2.1.88 match: setSessionIngressToken, 0.413)
/**
 * 会话状态函数 setSessionIngressToken：涉及当前会话的 host.credentialSlots.replaceSessionIngressToken。
 */
function setSessionIngressToken(token) {
  let context = agentContextGetter();
  if (context) context.secrets.sessionIngressToken = token;
  else currentSession().host.credentialSlots.replaceSessionIngressToken(token);
}
//@ chunk-5ythzcas.js:105893-105958 facade-majority (2.1.88 match: getOauthTokenFromFd, 0.745)
/**
 * 状态访问器：读取当前会话的 host（host） → 凭证槽（credentialSlots） 上的 oauthTokenFromFd()。
 */
function getOauthTokenFromFd() {
  return currentSession().host.credentialSlots.oauthTokenFromFd();
}
//@ chunk-5ythzcas.js:105958-106025 facade-majority
/**
 * 状态访问器：写入当前会话的 host（host） → 凭证槽（credentialSlots） 上的 replaceOauthTokenFromFd()。
 */
function setOauthTokenFromFd(token) {
  currentSession().host.credentialSlots.replaceOauthTokenFromFd(token);
}
//@ chunk-5ythzcas.js:106025-106098 facade-majority
/**
 * 状态访问器：读取当前会话的 host（host） → 凭证槽（credentialSlots） 上的 oauthTokenFromBgSnapshot()。
 */
function isOauthTokenFromBgSnapshot() {
  return currentSession().host.credentialSlots.oauthTokenFromBgSnapshot();
}
//@ chunk-5ythzcas.js:106098-106174 facade-majority
/**
 * 状态访问器：写入当前会话的 host（host） → 凭证槽（credentialSlots） 上的 replaceOauthTokenFromBgSnapshot()。
 */
function setOauthTokenFromBgSnapshot(token) {
  currentSession().host.credentialSlots.replaceOauthTokenFromBgSnapshot(token);
}
//@ chunk-5ythzcas.js:106174-106247 facade-majority
/**
 * 状态访问器：读取当前会话的 host（host） → 凭证槽（credentialSlots） 上的 loginStashedInTokenSlot()。
 */
function getLoginStashedInTokenSlot() {
  return currentSession().host.credentialSlots.loginStashedInTokenSlot();
}
//@ chunk-5ythzcas.js:106247-106322 facade-majority
/**
 * 状态访问器：写入当前会话的 host（host） → 凭证槽（credentialSlots） 上的 replaceLoginStashedInTokenSlot()。
 */
function setLoginStashedInTokenSlot(value) {
  currentSession().host.credentialSlots.replaceLoginStashedInTokenSlot(value);
}
//@ chunk-5ythzcas.js:106322-106394 facade-majority
/**
 * 状态访问器：读取当前会话的 host（host） → 凭证槽（credentialSlots） 上的 oauthOrgFromBgSnapshot()。
 */
function getOauthOrgFromBgSnapshot() {
  return currentSession().host.credentialSlots.oauthOrgFromBgSnapshot();
}
//@ chunk-5ythzcas.js:106394-106468 facade-majority
/**
 * 状态访问器：写入当前会话的 host（host） → 凭证槽（credentialSlots） 上的 replaceOauthOrgFromBgSnapshot()。
 */
function setOauthOrgFromBgSnapshot(org) {
  currentSession().host.credentialSlots.replaceOauthOrgFromBgSnapshot(org);
}
//@ chunk-5ythzcas.js:106468-106535 facade-majority
/**
 * 状态访问器：读取当前会话的 host（host） → 凭证槽（credentialSlots） 上的 oauthScopesFromFd()。
 */
function getOauthScopesFromFd() {
  return currentSession().host.credentialSlots.oauthScopesFromFd();
}
//@ chunk-5ythzcas.js:106535-106604 facade-majority
/**
 * 状态访问器：写入当前会话的 host（host） → 凭证槽（credentialSlots） 上的 replaceOauthScopesFromFd()。
 */
function setOauthScopesFromFd(scopes) {
  currentSession().host.credentialSlots.replaceOauthScopesFromFd(scopes);
}
//@ chunk-5ythzcas.js:106604-106666 facade-majority (2.1.88 match: getApiKeyFromFd, 0.745)
/**
 * 状态访问器：读取当前会话的 host（host） → 凭证槽（credentialSlots） 上的 apiKeyFromFd()。
 */
function getApiKeyFromFd() {
  return currentSession().host.credentialSlots.apiKeyFromFd();
}
//@ chunk-5ythzcas.js:106666-106730 facade-majority
/**
 * 状态访问器：写入当前会话的 host（host） → 凭证槽（credentialSlots） 上的 replaceApiKeyFromFd()。
 */
function setApiKeyFromFd(apiKey) {
  currentSession().host.credentialSlots.replaceApiKeyFromFd(apiKey);
}
//@ chunk-5ythzcas.js:106730-106812 facade-majority
/**
 * 状态访问器：调用当前会话的 host（host） → 凭证槽（credentialSlots） 上的 descriptorAnnouncementConsumed()。
 */
function wasDescriptorAnnouncementConsumed(key) {
  return currentSession().host.credentialSlots.descriptorAnnouncementConsumed(key);
}
//@ chunk-5ythzcas.js:106812-106891 facade-majority
/**
 * 状态访问器：调用当前会话的 host（host） → 凭证槽（credentialSlots） 上的 markDescriptorAnnouncementConsumed()。
 */
function markDescriptorAnnouncementConsumed(envVar) {
  currentSession().host.credentialSlots.markDescriptorAnnouncementConsumed(envVar);
}
//@ chunk-5ythzcas.js:106891-106957 facade-majority
/**
 * 状态访问器：调用当前会话的 host（host） → 凭证槽（credentialSlots） 上的 credentialRoad()。
 */
function getCredentialRoad(envVar) {
  return currentSession().host.credentialSlots.credentialRoad(envVar);
}
//@ chunk-5ythzcas.js:106957-107028 facade-majority
/**
 * 状态访问器：调用当前会话的 host（host） → 凭证槽（credentialSlots） 上的 noteCredentialRoad()。
 */
function noteCredentialRoad(envVar, road, details) {
  currentSession().host.credentialSlots.noteCredentialRoad(envVar, road, details);
}
//@ chunk-5ythzcas.js:107028-107104 facade-majority
/**
 * 状态访问器：读取当前会话的 host（host） → 凭证槽（credentialSlots） 上的 gatewayTokenFromDescriptor()。
 */
function getGatewayTokenFromDescriptor() {
  return currentSession().host.credentialSlots.gatewayTokenFromDescriptor();
}
//@ chunk-5ythzcas.js:107104-107182 facade-majority
/**
 * 状态访问器：写入当前会话的 host（host） → 凭证槽（credentialSlots） 上的 replaceGatewayTokenFromDescriptor()。
 */
function setGatewayTokenFromDescriptor(credentialDescriptor) {
  currentSession().host.credentialSlots.replaceGatewayTokenFromDescriptor(credentialDescriptor);
}
//@ chunk-5ythzcas.js:107182-107247 facade-majority
/**
 * 状态访问器：调用当前会话的 host（host） → 凭证槽（credentialSlots） 上的 resetFdCredentialState()。
 */
function resetFdCredentialState() {
  currentSession().host.credentialSlots.resetFdCredentialState();
}
//@ chunk-5ythzcas.js:107247-107307 facade-majority
/**
 * 状态访问器：读取当前会话的 host（host） → 凭证槽（credentialSlots） 上的 gatewayAuth()。
 */
function getGatewayAuth() {
  return currentSession().host.credentialSlots.gatewayAuth();
}
//@ chunk-5ythzcas.js:107307-107402 facade-majority
/**
 * 会话状态函数 isGatewayAuthExpired：涉及当前会话的 host.credentialSlots.gatewayAuth。
 */
function isGatewayAuthExpired() {
  let auth = currentSession().host.credentialSlots.gatewayAuth();
  return !!auth && auth.expiresAt <= Date.now();
}
//@ chunk-5ythzcas.js:107402-107440 facade-majority
/**
 * 网关认证是否已固定（非 unpinned）。
 */
function isGatewayAuthPinned(auth) {
  return !!auth && !auth.unpinned;
}
//@ chunk-5ythzcas.js:107440-107523 facade-majority
/**
 * 网关认证是否经宿主验证。
 */
function isHostVerifiedGatewayAuth(gatewayAuth) {
  let hostVerdict = gatewayAuth?.hostVerdict;
  return hostVerdict !== undefined && "verified" in hostVerdict && hostVerdict.verified;
}
//@ chunk-5ythzcas.js:107523-107560 facade-majority
/**
 * 网关是否提供托管设置（固定或经验证）。
 */
function gatewayServesManagedSettings(gatewayAuth) {
  return isGatewayAuthPinned(gatewayAuth) || isHostVerifiedGatewayAuth(gatewayAuth);
}
//@ chunk-5ythzcas.js:107560-107632 facade-majority
/**
 * 状态访问器：写入当前会话的 host（host） → 凭证槽（credentialSlots） 上的 replaceGatewayServerProcess()。
 */
function setGatewayServerProcess(gatewayServerProcess) {
  currentSession().host.credentialSlots.replaceGatewayServerProcess(gatewayServerProcess);
}
//@ chunk-5ythzcas.js:107632-107702 facade-majority
/**
 * 状态访问器：读取当前会话的 host（host） → 凭证槽（credentialSlots） 上的 gatewayServerProcess()。
 */
function isGatewayServerProcess() {
  return currentSession().host.credentialSlots.gatewayServerProcess();
}
//@ chunk-5ythzcas.js:107702-107787 facade-majority
/**
 * 状态访问器：写入当前会话的 host（host） → 凭证槽（credentialSlots） 上的 replaceGatewayRequiredByHostPolicyReader()。
 */
function setGatewayRequiredByHostPolicyReader(withoutHostManagedProviderVars) {
  currentSession().host.credentialSlots.replaceGatewayRequiredByHostPolicyReader(
    withoutHostManagedProviderVars,
  );
}
//@ chunk-5ythzcas.js:107787-107864 facade-majority
/**
 * 状态访问器：读取当前会话的 host（host） → 凭证槽（credentialSlots） 上的 gatewayRequiredByHostPolicy()。
 */
function isGatewayRequiredByHostPolicy() {
  return currentSession().host.credentialSlots.gatewayRequiredByHostPolicy();
}
//@ chunk-5ythzcas.js:107864-107927 facade-majority
/**
 * 状态访问器：写入当前会话的 host（host） → 凭证槽（credentialSlots） 上的 replaceGatewayAuth()。
 */
function setGatewayAuth(auth) {
  currentSession().host.credentialSlots.replaceGatewayAuth(auth);
}
//@ chunk-5ythzcas.js:107927-108002 facade-majority
/**
 * 状态访问器：调用当前会话的 host（host） → 凭证槽（credentialSlots） 上的 isGatewayHostHeldStrict()。
 */
function isGatewayHostHeldStrict(host) {
  return currentSession().host.credentialSlots.isGatewayHostHeldStrict(host);
}
//@ chunk-5ythzcas.js:108002-108086 facade-majority
/**
 * 会话状态函数 holdGatewayHostStrict：涉及当前会话的 host.credentialSlots.holdGatewayHostStrict。
 */
function holdGatewayHostStrict(host) {
  currentSession().host.credentialSlots.holdGatewayHostStrict(host.replace(/\.$/, ""));
}
//@ chunk-5ythzcas.js:108086-108167 facade-majority
/**
 * 会话状态函数 releaseGatewayHost：涉及当前会话的 host.credentialSlots.releaseGatewayHost。
 */
function releaseGatewayHost(host) {
  currentSession().host.credentialSlots.releaseGatewayHost(host.replace(/\.$/, ""));
}
//@ chunk-5ythzcas.js:108167-108237 facade-majority
/**
 * 状态访问器：读取当前会话的 host（host） → 凭证槽（credentialSlots） 上的 authenticatedAccount()。
 */
function getAuthenticatedAccount() {
  return currentSession().host.credentialSlots.authenticatedAccount();
}
//@ chunk-5ythzcas.js:108237-108307 facade-majority
/**
 * 状态访问器：调用当前会话的 host（host） → 凭证槽（credentialSlots） 上的 stampAuthenticatedAccount()。
 */
function setAuthenticatedAccount(account) {
  currentSession().host.credentialSlots.stampAuthenticatedAccount(account);
}
//@ chunk-5ythzcas.js:108307-108387 facade-majority
function dropAuthenticatedAccountForNewToken(newToken) {
  currentSession().host.credentialSlots.dropAuthenticatedAccountForNewToken(newToken);
}
//@ chunk-5ythzcas.js:108387-108456 facade-majority
function getProgramUseCaseOwner() {
  return currentSession().host.credentialSlots.programUseCaseOwner();
}
//@ chunk-5ythzcas.js:108456-108528 facade-majority
function tokenAdoptedSinceStamp() {
  return currentSession().host.credentialSlots.tokenAdoptedSinceStamp();
}
//@ chunk-5ythzcas.js:108528-108605 facade-majority
function programUseCaseAwaitsAccount() {
  return currentSession().host.credentialSlots.programUseCaseAwaitsAccount();
}
//@ chunk-5ythzcas.js:108605-108680 facade-majority
/**
 * 状态访问器：读取当前会话的 host（host） → 凭证槽（credentialSlots） 上的 authenticatedAccountEpoch()。
 */
function getAuthenticatedAccountEpoch() {
  return currentSession().host.credentialSlots.authenticatedAccountEpoch();
}
//@ chunk-5ythzcas.js:108680-108740 facade-majority
/**
 * 状态访问器：读取当前会话的 host（host） → 凭证槽（credentialSlots） 上的 bearerPlan()。
 */
function getBearerPlan() {
  return currentSession().host.credentialSlots.bearerPlan();
}
//@ chunk-5ythzcas.js:108740-108802 facade-majority
/**
 * 状态访问器：写入当前会话的 host（host） → 凭证槽（credentialSlots） 上的 replaceBearerPlan()。
 */
function setBearerPlan(plan) {
  currentSession().host.credentialSlots.replaceBearerPlan(plan);
}
//@ chunk-5ythzcas.js:108802-108868 facade-majority
function getProgramUseCaseId() {
  return currentSession().host.credentialSlots.programUseCaseId();
}
//@ chunk-5ythzcas.js:108868-108936 facade-majority
function setProgramUseCaseId(id) {
  currentSession().host.credentialSlots.replaceProgramUseCaseId(id);
}
//@ chunk-5ythzcas.js:108936-109006 facade-majority
function getProgramUseCaseChoices() {
  return currentSession().host.credentialSlots.programUseCaseChoices();
}
//@ chunk-5ythzcas.js:109006-109079 facade-majority
function setProgramUseCaseChoices(offered) {
  currentSession().host.credentialSlots.replaceProgramUseCaseChoices(offered);
}
//@ chunk-5ythzcas.js:109079-109153 facade-majority
function getProgramUseCaseChoiceMode() {
  return currentSession().host.credentialSlots.programUseCaseChoiceMode();
}
//@ chunk-5ythzcas.js:109153-109229 facade-majority
function setProgramUseCaseChoiceMode(mode) {
  currentSession().host.credentialSlots.replaceProgramUseCaseChoiceMode(mode);
}
//@ chunk-5ythzcas.js:109229-109300 facade-majority
function getProgramUseCaseRefusal() {
  return currentSession().host.credentialSlots.programUseCaseRefusal();
}
//@ chunk-5ythzcas.js:109300-109373 facade-majority
function setProgramUseCaseRefusal(refusal) {
  currentSession().host.credentialSlots.replaceProgramUseCaseRefusal(refusal);
}
//@ chunk-5ythzcas.js:109373-109444 facade-majority
/**
 * 状态访问器：读取当前会话的 host（host） → 凭证槽（credentialSlots） 上的 startupPolicySnapshot()。
 */
function getStartupPolicySnapshot() {
  return currentSession().host.credentialSlots.startupPolicySnapshot();
}
//@ chunk-5ythzcas.js:109444-109517 facade-majority
/**
 * 状态访问器：写入当前会话的 host（host） → 凭证槽（credentialSlots） 上的 replaceStartupPolicySnapshot()。
 */
function setStartupPolicySnapshot(snapshot) {
  currentSession().host.credentialSlots.replaceStartupPolicySnapshot(snapshot);
}
//@ chunk-5ythzcas.js:109517-109589 facade-majority
/**
 * 状态访问器：读取当前会话的 host（host） → 凭证槽（credentialSlots） 上的 gatewayRefreshInFlight()。
 */
function getGatewayRefreshInFlight() {
  return currentSession().host.credentialSlots.gatewayRefreshInFlight();
}
//@ chunk-5ythzcas.js:109589-109663 facade-majority
/**
 * 状态访问器：写入当前会话的 host（host） → 凭证槽（credentialSlots） 上的 replaceGatewayRefreshInFlight()。
 */
function setGatewayRefreshInFlight(inFlight) {
  currentSession().host.credentialSlots.replaceGatewayRefreshInFlight(inFlight);
}
//@ chunk-5ythzcas.js:109663-109723 facade-majority
/**
 * 状态访问器：写入当前会话的 请求日志（requestJournal） 上的 replaceLastAPIRequest()。
 */
function setLastAPIRequest(request) {
  currentSession().requestJournal.replaceLastAPIRequest(request);
}
//@ chunk-5ythzcas.js:109723-109781 facade-majority (2.1.88 match: setLastAPIRequest, 0.736)
/**
 * 状态访问器：读取当前会话的 请求日志（requestJournal） 上的 lastAPIRequest()。
 */
function getLastAPIRequest() {
  return currentSession().requestJournal.lastAPIRequest();
}
//@ chunk-5ythzcas.js:109781-109852 facade-majority
/**
 * 状态访问器：写入当前会话的 请求日志（requestJournal） 上的 replaceLastCancelledAPIMessageId()。
 */
function setLastCancelledAPIMessageId(inFlightMessageId) {
  currentSession().requestJournal.replaceLastCancelledAPIMessageId(inFlightMessageId);
}
//@ chunk-5ythzcas.js:109852-109921 facade-majority
/**
 * 状态访问器：读取当前会话的 请求日志（requestJournal） 上的 lastCancelledAPIMessageId()。
 */
function getLastCancelledAPIMessageId() {
  return currentSession().requestJournal.lastCancelledAPIMessageId();
}
//@ chunk-5ythzcas.js:109921-109989 facade-majority
/**
 * 状态访问器：写入当前会话的 请求日志（requestJournal） 上的 replaceLastAPIRequestMessages()。
 */
function setLastAPIRequestMessages(messages) {
  currentSession().requestJournal.replaceLastAPIRequestMessages(messages);
}
//@ chunk-5ythzcas.js:109989-110057 facade-majority
/**
 * 状态访问器：写入当前会话的 请求日志（requestJournal） 上的 replaceLastClassifierRequests()。
 */
function setLastClassifierRequests(requests) {
  currentSession().requestJournal.replaceLastClassifierRequests(requests);
}
//@ chunk-5ythzcas.js:110057-110123 facade-majority (2.1.88 match: setLastClassifierRequests, 0.736)
/**
 * 状态访问器：读取当前会话的 请求日志（requestJournal） 上的 lastClassifierRequests()。
 */
function getLastClassifierRequests() {
  return currentSession().requestJournal.lastClassifierRequests();
}
//@ chunk-5ythzcas.js:110123-110234 facade-majority
/**
 * 会话状态函数 setCachedClaudeMdContent：涉及当前会话的 sessionFlags.replaceCachedClaudeMdContent。
 */
function setCachedClaudeMdContent(claudeMd) {
  let agentContext = getAgentContext();
  if (agentContext) agentContext.cachedClaudeMdContent = claudeMd;
  else currentSession().sessionFlags.replaceCachedClaudeMdContent(claudeMd);
}
//@ chunk-5ythzcas.js:110234-110333 facade-majority (2.1.88 match: setCachedClaudeMdContent, 0.74)
/**
 * 会话状态函数 getCachedClaudeMdContent：涉及当前会话的 sessionFlags.cachedClaudeMdContent。
 */
function getCachedClaudeMdContent() {
  let agentContext = getAgentContext();
  return agentContext
    ? agentContext.cachedClaudeMdContent
    : currentSession().sessionFlags.cachedClaudeMdContent();
}
//@ chunk-5ythzcas.js:110333-110518 facade-majority
/**
 * getAllowedSettingSources：受限工作区时去掉仓库目录下的设置来源。
 */
function getAllowedSettingSources() {
  let { settingsSource, launchOptions } = currentSession().host;
  return launchOptions.workspaceRestrictionState()?.restriction
    ? settingsSource.allowedSettingSourcesWithoutRepoDirSources()
    : settingsSource.allowedSettingSources();
}
//@ chunk-5ythzcas.js:110518-110588 facade-majority (2.1.88 match: getAllowedSettingSources, 0.727)
/**
 * 状态访问器：读取当前会话的 host（host） → 设置来源（settingsSource） 上的 allowedSettingSources()。
 */
function getAllowedSettingSourcesAsConfigured() {
  return currentSession().host.settingsSource.allowedSettingSources();
}
//@ chunk-5ythzcas.js:110588-110660 facade-majority
/**
 * 状态访问器：写入当前会话的 host（host） → 设置来源（settingsSource） 上的 replaceAllowedSettingSources()。
 */
function setAllowedSettingSources(sources) {
  currentSession().host.settingsSource.replaceAllowedSettingSources(sources);
}
//@ chunk-5ythzcas.js:110660-110742 facade-majority (2.1.88 match: preferThirdPartyAuthentication, 0.881)
/**
 * 会话状态函数 preferThirdPartyAuthentication：涉及当前会话的 host.launchOptions.clientType。
 */
function preferThirdPartyAuthentication() {
  return getIsNonInteractiveSession() && currentSession().host.launchOptions.clientType() !== "claude-vscode";
}
//@ chunk-5ythzcas.js:110742-110807 facade-majority
/**
 * 状态访问器：写入当前会话的 host（host） → 扩展配置（extensionsConfig） 上的 replaceInlinePlugins()。
 */
function setInlinePlugins(plugins) {
  currentSession().host.extensionsConfig.replaceInlinePlugins(plugins);
}
//@ chunk-5ythzcas.js:110807-110870 facade-majority (2.1.88 match: setInlinePlugins, 0.728)
/**
 * 状态访问器：读取当前会话的 host（host） → 扩展配置（extensionsConfig） 上的 inlinePlugins()。
 */
function getInlinePlugins() {
  return currentSession().host.extensionsConfig.inlinePlugins();
}
//@ chunk-5ythzcas.js:110870-110941 facade-majority
/**
 * 状态访问器：写入当前会话的 host（host） → 扩展配置（extensionsConfig） 上的 replaceInlinePluginsNoMcp()。
 */
function setInlinePluginsNoMcp(plugins) {
  currentSession().host.extensionsConfig.replaceInlinePluginsNoMcp(plugins);
}
//@ chunk-5ythzcas.js:110941-111009 facade-majority
/**
 * 状态访问器：读取当前会话的 host（host） → 扩展配置（extensionsConfig） 上的 inlinePluginsNoMcp()。
 */
function getInlinePluginsNoMcp() {
  return currentSession().host.extensionsConfig.inlinePluginsNoMcp();
}
//@ chunk-5ythzcas.js:111009-111078 facade-majority
/**
 * 状态访问器：写入当前会话的 host（host） → 扩展配置（extensionsConfig） 上的 replaceInlinePluginUrls()。
 */
function setInlinePluginUrls(urls) {
  currentSession().host.extensionsConfig.replaceInlinePluginUrls(urls);
}
//@ chunk-5ythzcas.js:111078-111145 facade-majority
/**
 * 状态访问器：读取当前会话的 host（host） → 扩展配置（extensionsConfig） 上的 inlinePluginUrls()。
 */
function getInlinePluginUrls() {
  return currentSession().host.extensionsConfig.inlinePluginUrls();
}
//@ chunk-5ythzcas.js:111145-111222 facade-majority
/**
 * 状态访问器：写入当前会话的 host（host） → 扩展配置（extensionsConfig） 上的 replaceSyncedPluginDirs()。
 */
function setSyncedPluginDirs(dirs, accountId, rowId) {
  currentSession().host.extensionsConfig.replaceSyncedPluginDirs(dirs, accountId, rowId);
}
//@ chunk-5ythzcas.js:111222-111292 facade-majority
/**
 * 状态访问器：调用当前会话的 host（host） → 扩展配置（extensionsConfig） 上的 syncedPluginRowId()。
 */
function getSyncedPluginRowId(dir) {
  return currentSession().host.extensionsConfig.syncedPluginRowId(dir);
}
//@ chunk-5ythzcas.js:111292-111368 facade-majority
/**
 * 状态访问器：调用当前会话的 host（host） → 扩展配置（extensionsConfig） 上的 syncedPluginAttestation()。
 */
function getSyncedPluginAttestation(dir) {
  return currentSession().host.extensionsConfig.syncedPluginAttestation(dir);
}
//@ chunk-5ythzcas.js:111368-111446 facade-majority
/**
 * 状态访问器：写入当前会话的 host（host） → 扩展配置（extensionsConfig） 上的 replaceAttestedOfficialPluginIds()。
 */
function setAttestedOfficialPluginIds(officialAttestations) {
  currentSession().host.extensionsConfig.replaceAttestedOfficialPluginIds(officialAttestations);
}
//@ chunk-5ythzcas.js:111446-111532 facade-majority
/**
 * 状态访问器：调用当前会话的 host（host） → 扩展配置（extensionsConfig） 上的 attestedOfficialPluginMarketplace()。
 */
function getAttestedOfficialPluginMarketplace(rowId) {
  return currentSession().host.extensionsConfig.attestedOfficialPluginMarketplace(rowId);
}
//@ chunk-5ythzcas.js:111532-111609 facade-majority
/**
 * 状态访问器：读取当前会话的 host（host） → 扩展配置（extensionsConfig） 上的 syncedPluginDirsRegistered()。
 */
function hasRegisteredSyncedPluginDirs() {
  return currentSession().host.extensionsConfig.syncedPluginDirsRegistered();
}
//@ chunk-5ythzcas.js:111609-111664 facade-majority
/**
 * 会话状态函数 hasSyncedPluginLaneOpened：涉及当前会话的 pluginsSync.syncedLaneOpened。
 */
function hasSyncedPluginLaneOpened() {
  return currentSession().pluginsSync.syncedLaneOpened;
}
//@ chunk-5ythzcas.js:111664-111715 facade-majority
/**
 * 会话状态函数 markSyncedPluginLaneOpened：涉及当前会话的 pluginsSync.syncedLaneOpened。
 */
function markSyncedPluginLaneOpened() {
  currentSession().pluginsSync.syncedLaneOpened = true;
}
//@ chunk-5ythzcas.js:111715-111793 facade-majority
/**
 * 会话状态函数 markSyncedPluginDirsLoadedHere：涉及当前会话的 pluginsSync.syncedDirsLoadedHere.add。
 */
function markSyncedPluginDirsLoadedHere(dirs) {
  for (let dir of dirs) currentSession().pluginsSync.syncedDirsLoadedHere.add(resolve(dir));
}
//@ chunk-5ythzcas.js:111793-111863 facade-majority
/**
 * 会话状态函数 isSyncedPluginDirLoadedHere：涉及当前会话的 pluginsSync.syncedDirsLoadedHere.has。
 */
function isSyncedPluginDirLoadedHere(dir) {
  return currentSession().pluginsSync.syncedDirsLoadedHere.has(resolve(dir));
}
//@ chunk-5ythzcas.js:111863-111917 facade-majority
/**
 * 会话状态函数 markSyncedPluginDirNewHere：涉及当前会话的 pluginsSync.dirsNewHere.add。
 */
function markSyncedPluginDirNewHere(dir) {
  currentSession().pluginsSync.dirsNewHere.add(resolve(dir));
}
//@ chunk-5ythzcas.js:111917-111966 facade-majority
/**
 * 会话状态函数 setAwaitsFirstRun：涉及当前会话的 pluginsSync.awaitsFirstRun。
 */
function setAwaitsFirstRun(awaitsFirstRun) {
  currentSession().pluginsSync.awaitsFirstRun = awaitsFirstRun;
}
//@ chunk-5ythzcas.js:111966-112056 facade-majority
/**
 * 会话状态函数 isSyncedPluginDirUnused：涉及当前会话的 pluginsSync。
 */
function isSyncedPluginDirUnused(pluginRoot) {
  let { awaitsFirstRun, dirsNewHere } = currentSession().pluginsSync;
  return awaitsFirstRun && dirsNewHere.has(resolve(pluginRoot));
}
//@ chunk-5ythzcas.js:112056-112093 facade-majority
/**
 * 会话状态函数 getSyncedPluginReloadDebt：涉及当前会话的 pluginsSync。
 */
function getSyncedPluginReloadDebt() {
  return currentSession().pluginsSync;
}
//@ chunk-5ythzcas.js:112093-112148 facade-majority
/**
 * 会话状态函数 getLastCompleteSyncedPluginList：涉及当前会话的 pluginsSync.lastCompleteList。
 */
function getLastCompleteSyncedPluginList() {
  return currentSession().pluginsSync.lastCompleteList;
}
//@ chunk-5ythzcas.js:112148-112205 facade-majority
/**
 * 会话状态函数 getLastSyncedLaneLoad：涉及当前会话的 pluginsSync.lastSyncedLaneLoad。
 */
function getLastSyncedLaneLoad() {
  return currentSession().pluginsSync.lastSyncedLaneLoad;
}
//@ chunk-5ythzcas.js:112205-112258 facade-majority
/**
 * 会话状态函数 setLastSyncedLaneLoad：涉及当前会话的 pluginsSync.lastSyncedLaneLoad。
 */
function setLastSyncedLaneLoad(lastSyncedLaneLoad) {
  currentSession().pluginsSync.lastSyncedLaneLoad = lastSyncedLaneLoad;
}
//@ chunk-5ythzcas.js:112258-112525 facade-majority
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
//@ chunk-5ythzcas.js:112525-112591 facade-majority
/**
 * 状态访问器：读取当前会话的 host（host） → 扩展配置（extensionsConfig） 上的 syncedPluginDirs()。
 */
function getSyncedPluginDirs() {
  return currentSession().host.extensionsConfig.syncedPluginDirs();
}
//@ chunk-5ythzcas.js:112591-112659 facade-majority
/**
 * 状态访问器：写入当前会话的 会话标志（sessionFlags） 上的 replaceAccountSkillsSyncEnabled()。
 */
function setAccountSkillsSyncEnabled(enabled) {
  currentSession().sessionFlags.replaceAccountSkillsSyncEnabled(enabled);
}
//@ chunk-5ythzcas.js:112659-112725 facade-majority
/**
 * 状态访问器：读取当前会话的 会话标志（sessionFlags） 上的 accountSkillsSyncEnabled()。
 */
function getAccountSkillsSyncEnabled() {
  return currentSession().sessionFlags.accountSkillsSyncEnabled();
}
//@ chunk-5ythzcas.js:112725-112785 facade-majority
/**
 * 状态访问器：写入当前会话的 会话标志（sessionFlags） 上的 replaceSkillsSyncVetoed()。
 */
function setSkillsSyncVetoed(vetoed) {
  currentSession().sessionFlags.replaceSkillsSyncVetoed(vetoed);
}
//@ chunk-5ythzcas.js:112785-112842 facade-majority
/**
 * 状态访问器：读取当前会话的 会话标志（sessionFlags） 上的 skillsSyncVetoed()。
 */
function getSkillsSyncVetoed() {
  return currentSession().sessionFlags.skillsSyncVetoed();
}
//@ chunk-5ythzcas.js:112842-112911 facade-majority
/**
 * 状态访问器：写入当前会话的 会话标志（sessionFlags） 上的 replaceAccountPluginsSyncEnabled()。
 */
function setAccountPluginsSyncEnabled(enabled) {
  currentSession().sessionFlags.replaceAccountPluginsSyncEnabled(enabled);
}
//@ chunk-5ythzcas.js:112911-112978 facade-majority
/**
 * 状态访问器：读取当前会话的 会话标志（sessionFlags） 上的 accountPluginsSyncEnabled()。
 */
function getAccountPluginsSyncEnabled() {
  return currentSession().sessionFlags.accountPluginsSyncEnabled();
}
//@ chunk-5ythzcas.js:112978-113039 facade-majority
/**
 * 状态访问器：写入当前会话的 会话标志（sessionFlags） 上的 replacePluginsSyncVetoed()。
 */
function setPluginsSyncVetoed(vetoed) {
  currentSession().sessionFlags.replacePluginsSyncVetoed(vetoed);
}
//@ chunk-5ythzcas.js:113039-113097 facade-majority
/**
 * 状态访问器：读取当前会话的 会话标志（sessionFlags） 上的 pluginsSyncVetoed()。
 */
function getPluginsSyncVetoed() {
  return currentSession().sessionFlags.pluginsSyncVetoed();
}
//@ chunk-5ythzcas.js:113097-113168 facade-majority
/**
 * 状态访问器：写入当前会话的 host（host） → 扩展配置（extensionsConfig） 上的 replaceChromeFlagOverride()。
 */
function setChromeFlagOverride(chrome) {
  currentSession().host.extensionsConfig.replaceChromeFlagOverride(chrome);
}
//@ chunk-5ythzcas.js:113168-113237 facade-majority (2.1.88 match: setChromeFlagOverride, 0.728)
/**
 * 状态访问器：读取当前会话的 host（host） → 扩展配置（extensionsConfig） 上的 chromeFlagOverride()。
 */
function getChromeFlagOverride() {
  return currentSession().host.extensionsConfig.chromeFlagOverride();
}
//@ chunk-5ythzcas.js:113237-113305 facade-majority
/**
 * 状态访问器：写入当前会话的 host（host） → 扩展配置（extensionsConfig） 上的 replaceTeammateAgentId()。
 */
function setTeammateAgentId(agentId) {
  currentSession().host.extensionsConfig.replaceTeammateAgentId(agentId);
}
//@ chunk-5ythzcas.js:113305-113370 facade-majority
/**
 * 状态访问器：读取当前会话的 host（host） → 扩展配置（extensionsConfig） 上的 teammateAgentId()。
 */
function getTeammateAgentId() {
  return currentSession().host.extensionsConfig.teammateAgentId();
}
//@ chunk-5ythzcas.js:113370-113440 facade-majority
/**
 * 状态访问器：写入当前会话的 会话标志（sessionFlags） 上的 replaceOnboardingShownThisSession()。
 */
function setOnboardingShownThisSession(shown) {
  currentSession().sessionFlags.replaceOnboardingShownThisSession(shown);
}
//@ chunk-5ythzcas.js:113440-113508 facade-majority
/**
 * 状态访问器：读取当前会话的 会话标志（sessionFlags） 上的 onboardingShownThisSession()。
 */
function getOnboardingShownThisSession() {
  return currentSession().sessionFlags.onboardingShownThisSession();
}
//@ chunk-5ythzcas.js:113508-113613 facade-majority
/**
 * 设置是否使用 cowork 插件目录，并使 HostScoped 缓存失效。
 */
function setUseCoworkPlugins(enabled) {
  let session = currentSession();
  session.host.settingsSource.replaceUseCoworkPlugins(enabled);
  SETTINGS_CACHE_STORE_SLOT.of(session.host).invalidateAll();
}
//@ chunk-5ythzcas.js:113613-113678 facade-majority (2.1.88 match: setUseCoworkPlugins, 0.735)
/**
 * 状态访问器：读取当前会话的 host（host） → 设置来源（settingsSource） 上的 useCoworkPlugins()。
 */
function getUseCoworkPlugins() {
  return currentSession().host.settingsSource.useCoworkPlugins();
}
//@ chunk-5ythzcas.js:113678-113748 facade-majority
/**
 * 状态访问器：写入当前会话的 host（host） → 启动选项（launchOptions） 上的 replaceDisableSlashCommands()。
 */
function setDisableSlashCommands(disableSlashCommands) {
  currentSession().host.launchOptions.replaceDisableSlashCommands(disableSlashCommands);
}
//@ chunk-5ythzcas.js:113748-113815 facade-majority
/**
 * 状态访问器：读取当前会话的 host（host） → 启动选项（launchOptions） 上的 disableSlashCommands()。
 */
function getDisableSlashCommands() {
  return currentSession().host.launchOptions.disableSlashCommands();
}
//@ chunk-5ythzcas.js:113815-113882 facade-majority
/**
 * 状态访问器：读取当前会话的 host（host） → 启动选项（launchOptions） 上的 disableFileMentions()。
 */
function getDisableFileMentions() {
  return currentSession().host.launchOptions.disableFileMentions();
}
//@ chunk-5ythzcas.js:113882-113946 facade-majority
/**
 * 状态访问器：读取当前会话的 host（host） → 启动选项（launchOptions） 上的 sessionUploadsDir()。
 */
function getSessionUploadsDirOverride() {
  return currentSession().host.launchOptions.sessionUploadsDir();
}
//@ chunk-5ythzcas.js:113946-114012 facade-majority
/**
 * 状态访问器：写入当前会话的 host（host） → 启动选项（launchOptions） 上的 replaceLocalUploadsRoot()。
 */
function setLocalUploadsRoot(attachmentsRoot) {
  currentSession().host.launchOptions.replaceLocalUploadsRoot(attachmentsRoot);
}
//@ chunk-5ythzcas.js:114012-114076 facade-majority
/**
 * 状态访问器：读取当前会话的 host（host） → 启动选项（launchOptions） 上的 localUploadsRoot()。
 */
function getLocalUploadsRoot() {
  return currentSession().host.launchOptions.localUploadsRoot();
}
//@ chunk-5ythzcas.js:114076-114154 facade-majority
/**
 * 状态访问器：写入当前会话的 host（host） → 启动选项（launchOptions） 上的 replaceSessionBypassPermissionsMode()。
 */
function setSessionBypassPermissionsMode(enabled) {
  currentSession().host.launchOptions.replaceSessionBypassPermissionsMode(enabled);
}
//@ chunk-5ythzcas.js:114154-114230 facade-majority (2.1.88 match: setSessionBypassPermissionsMode, 0.764)
/**
 * 状态访问器：读取当前会话的 host（host） → 启动选项（launchOptions） 上的 sessionBypassPermissionsMode()。
 */
function getSessionBypassPermissionsMode() {
  return currentSession().host.launchOptions.sessionBypassPermissionsMode();
}
//@ chunk-5ythzcas.js:114230-114300 facade-majority
/**
 * 状态访问器：写入当前会话的 host（host） → 启动选项（launchOptions） 上的 replaceScheduledTasksEnabled()。
 */
function setScheduledTasksEnabled(enabled) {
  currentSession().host.launchOptions.replaceScheduledTasksEnabled(enabled);
}
//@ chunk-5ythzcas.js:114300-114369 facade-majority (2.1.88 match: setScheduledTasksEnabled, 0.757)
/**
 * 状态访问器：读取当前会话的 host（host） → 启动选项（launchOptions） 上的 scheduledTasksEnabled()。
 */
function getScheduledTasksEnabled() {
  return currentSession().host.launchOptions.scheduledTasksEnabled();
}
//@ chunk-5ythzcas.js:114369-114442 facade-majority
/**
 * 状态访问器：调用当前会话的 host（host） → 启动选项（launchOptions） 上的 onScheduledTasksEnabled()。
 */
function onScheduledTasksEnabled(listener) {
  return currentSession().host.launchOptions.onScheduledTasksEnabled(listener);
}
//@ chunk-5ythzcas.js:114442-114510 facade-majority (2.1.88 match: getSessionCronTasks, 0.588)
/**
 * 会话状态函数 getSessionCronTasks：优先取异步上下文覆盖对象的 sessionCronTasks；涉及当前会话的 sessionCron.tasks。
 */
function getSessionCronTasks() {
  return getAgentContext()?.sessionCronTasks ?? currentSession().sessionCron.tasks();
}
//@ chunk-5ythzcas.js:114510-114632 facade-majority
/**
 * 会话状态函数 addSessionCronTask：涉及当前会话的 sessionCron.schedule、sessionCron.changed.emit。
 */
function addSessionCronTask(task) {
  let agentContext = getAgentContext();
  if (agentContext) agentContext.sessionCronTasks.push(task);
  else currentSession().sessionCron.schedule(task);
  currentSession().sessionCron.changed.emit();
}
//@ chunk-5ythzcas.js:114632-114689 facade-majority
/**
 * 状态访问器：调用当前会话的 会话定时任务（sessionCron） 上的 chainStartedAt()。
 */
function getLoopChainStartedAt(chainId) {
  return currentSession().sessionCron.chainStartedAt(chainId);
}
//@ chunk-5ythzcas.js:114689-114745 facade-majority
/**
 * 状态访问器：调用当前会话的 会话定时任务（sessionCron） 上的 recordChainStart()。
 */
function setLoopChainStartedAt(chainId, startedAt) {
  currentSession().sessionCron.recordChainStart(chainId, startedAt);
}
//@ chunk-5ythzcas.js:114745-114797 facade-majority
/**
 * 状态访问器：调用当前会话的 会话定时任务（sessionCron） 上的 forgetChainStart()。
 */
function deleteLoopChainStartedAt(prompt) {
  currentSession().sessionCron.forgetChainStart(prompt);
}
//@ chunk-5ythzcas.js:114797-114856 facade-majority
/**
 * 状态访问器：读取当前会话的 会话定时任务（sessionCron） 上的 tickInFlightPrompt()。
 */
function getLoopTickInFlightPrompt() {
  return currentSession().sessionCron.tickInFlightPrompt();
}
//@ chunk-5ythzcas.js:114856-114915 facade-majority
/**
 * 状态访问器：读取当前会话的 会话定时任务（sessionCron） 上的 tickInFlightPlugin()。
 */
function getLoopTickInFlightPlugin() {
  return currentSession().sessionCron.tickInFlightPlugin();
}
//@ chunk-5ythzcas.js:114915-114980 facade-majority
/**
 * 状态访问器：写入当前会话的 会话定时任务（sessionCron） 上的 replaceTickInFlightPrompt()。
 */
function setLoopTickInFlightPrompt(prompt, plugin) {
  currentSession().sessionCron.replaceTickInFlightPrompt(prompt, plugin);
}
//@ chunk-5ythzcas.js:114980-115042 facade-majority
/**
 * 状态访问器：读取当前会话的 会话定时任务（sessionCron） 上的 consecutiveKeepalives()。
 */
function getLoopConsecutiveKeepalives() {
  return currentSession().sessionCron.consecutiveKeepalives();
}
//@ chunk-5ythzcas.js:115042-115106 facade-majority
/**
 * 状态访问器：写入当前会话的 会话定时任务（sessionCron） 上的 replaceConsecutiveKeepalives()。
 */
function setLoopConsecutiveKeepalives(count) {
  currentSession().sessionCron.replaceConsecutiveKeepalives(count);
}
//@ chunk-5ythzcas.js:115106-115152 facade-majority
/**
 * 状态访问器：读取当前会话的 会话定时任务（sessionCron） 上的 ended()。
 */
function getLoopEnded() {
  return currentSession().sessionCron.ended();
}
//@ chunk-5ythzcas.js:115152-115202 facade-majority
/**
 * 状态访问器：读取当前会话的 会话定时任务（sessionCron） 上的 wakeFires()。
 */
function getLoopWakeFires() {
  return currentSession().sessionCron.wakeFires();
}
//@ chunk-5ythzcas.js:115202-115250 facade-majority
/**
 * 状态访问器：调用当前会话的 会话定时任务（sessionCron） 上的 recordWakeFire()。
 */
function recordLoopWakeFire() {
  currentSession().sessionCron.recordWakeFire();
}
//@ chunk-5ythzcas.js:115250-115298 facade-majority
/**
 * 状态访问器：调用当前会话的 会话定时任务（sessionCron） 上的 resetWakeFires()。
 */
function resetLoopWakeFires() {
  currentSession().sessionCron.resetWakeFires();
}
//@ chunk-5ythzcas.js:115298-115382 facade-majority
/**
 * 会话状态函数 setLoopEnded：涉及当前会话的 sessionCron.replaceEnded、sessionCron.changed.emit。
 */
function setLoopEnded(ended) {
  currentSession().sessionCron.replaceEnded(ended);
  if (ended) currentSession().sessionCron.changed.emit();
}
//@ chunk-5ythzcas.js:115382-115823 facade-majority (2.1.88 match: removeSessionCronTasks, 0.227)
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
//@ chunk-5ythzcas.js:115823-115883 facade-majority
/**
 * 状态访问器：调用当前会话的 会话定时任务（sessionCron） → changed 上的 subscribe()。
 */
function onSessionCronsChange(listener) {
  return currentSession().sessionCron.changed.subscribe(listener);
}
//@ chunk-5ythzcas.js:115883-115953 facade-majority
/**
 * 状态访问器：调用当前会话的 会话定时任务（sessionCron） → pendingLoopWakeup 上的 subscribe()。
 */
function onPendingLoopWakeupChange(listener) {
  return currentSession().sessionCron.pendingLoopWakeup.subscribe(listener);
}
//@ chunk-5ythzcas.js:115953-116011 facade-majority
/**
 * 状态访问器：调用当前会话的 会话定时任务（sessionCron） → pendingLoopWakeup 上的 emit()。
 */
function announcePendingLoopWakeup(payload) {
  currentSession().sessionCron.pendingLoopWakeup.emit(payload);
}
//@ chunk-5ythzcas.js:116011-116074 facade-majority
/**
 * 状态访问器：写入当前会话的 会话标志（sessionFlags） 上的 replaceSessionTrustAccepted()。
 */
function setSessionTrustAccepted(accepted) {
  currentSession().sessionFlags.replaceSessionTrustAccepted(accepted);
}
//@ chunk-5ythzcas.js:116074-116136 facade-majority (2.1.88 match: setSessionTrustAccepted, 0.747)
/**
 * 状态访问器：读取当前会话的 会话标志（sessionFlags） 上的 sessionTrustAccepted()。
 */
function getSessionTrustAccepted() {
  return currentSession().sessionFlags.sessionTrustAccepted();
}
//@ chunk-5ythzcas.js:116136-116203 facade-majority
/**
 * 状态访问器：写入当前会话的 会话标志（sessionFlags） 上的 replaceHomeTrustDialogAccepted()。
 */
function setHomeTrustDialogAccepted(accepted) {
  currentSession().sessionFlags.replaceHomeTrustDialogAccepted(accepted);
}
//@ chunk-5ythzcas.js:116203-116268 facade-majority
/**
 * 状态访问器：读取当前会话的 会话标志（sessionFlags） 上的 homeTrustDialogAccepted()。
 */
function getHomeTrustDialogAccepted() {
  return currentSession().sessionFlags.homeTrustDialogAccepted();
}
//@ chunk-5ythzcas.js:116268-116344 facade-majority
/**
 * 状态访问器：写入当前会话的 host（host） → 启动选项（launchOptions） 上的 replaceSessionPersistenceDisabled()。
 */
function setSessionPersistenceDisabled(disabled) {
  currentSession().host.launchOptions.replaceSessionPersistenceDisabled(disabled);
}
//@ chunk-5ythzcas.js:116344-116417 facade-majority (2.1.88 match: setSessionPersistenceDisabled, 0.764)
/**
 * 状态访问器：读取当前会话的 host（host） → 启动选项（launchOptions） 上的 sessionPersistenceDisabled()。
 */
function isSessionPersistenceDisabled() {
  return currentSession().host.launchOptions.sessionPersistenceDisabled();
}
//@ chunk-5ythzcas.js:116417-116442 facade-majority
/**
 * isDiskless：当前会话是否无盘（不写本地文件）。
 */
function isDiskless() {
  return isCcsTenant();
}
//@ chunk-5ythzcas.js:116442-116497 facade-majority
/**
 * 状态访问器：读取当前会话的 host（host） → 启动选项（launchOptions） 上的 diskless()。
 */
function isCcsTenant() {
  return currentSession().host.launchOptions.diskless();
}
//@ chunk-5ythzcas.js:116497-116550 facade-majority
/**
 * isDisklessProcess：进程默认会话是否无盘。
 */
function isDisklessProcess() {
  return defaultRootSession.host.launchOptions.diskless();
}
//@ chunk-5ythzcas.js:116550-116611 facade-majority
/**
 * 状态访问器：读取当前会话的 host（host） → 启动选项（launchOptions） 上的 ccrSessionUrl()。
 */
function getCcrSessionUrl() {
  return currentSession().host.launchOptions.ccrSessionUrl();
}
//@ chunk-5ythzcas.js:116611-116676 facade-majority
/**
 * 状态访问器：读取当前会话的 host（host） → 启动选项（launchOptions） 上的 ccrDerivedSurface()。
 */
function getCcrDerivedSurface() {
  return currentSession().host.launchOptions.ccrDerivedSurface();
}
//@ chunk-5ythzcas.js:116676-116739 facade-majority
function setWrapUpOfferedAtLaunch(at) {
  currentSession().host.launchOptions.replaceWrapUpOffered(at);
}
//@ chunk-5ythzcas.js:116739-116800 facade-majority
function getWrapUpOfferedAtLaunch() {
  return currentSession().host.launchOptions.wrapUpOffered();
}
//@ chunk-5ythzcas.js:116800-116870 facade-majority
/**
 * 状态访问器：写入当前会话的 host（host） → 启动选项（launchOptions） 上的 replaceEntrypointOnRequests()。
 */
function setEntrypointOnRequests(enabled) {
  currentSession().host.launchOptions.replaceEntrypointOnRequests(enabled);
}
//@ chunk-5ythzcas.js:116870-116938 facade-majority
/**
 * 状态访问器：读取当前会话的 host（host） → 启动选项（launchOptions） 上的 entrypointOnRequests()。
 */
function getEntrypointOnRequests() {
  return currentSession().host.launchOptions.entrypointOnRequests();
}
//@ chunk-5ythzcas.js:116938-117010 facade-majority
/**
 * 状态访问器：读取当前会话的 host（host） → 启动选项（launchOptions） 上的 autoCompactWindowSurface()。
 */
function getAutoCompactWindowSurface() {
  return currentSession().host.launchOptions.autoCompactWindowSurface();
}
//@ chunk-5ythzcas.js:117010-117074 facade-majority
/**
 * 状态访问器：读取当前会话的 host（host） → 启动选项（launchOptions） 上的 coworkEnrollment()。
 */
function getCoworkEnrollment() {
  return currentSession().host.launchOptions.coworkEnrollment();
}
//@ chunk-5ythzcas.js:117074-117139 facade-majority
function isCcrSessionLimited() {
  return currentSession().host.launchOptions.ccrSessionLimited();
}
//@ chunk-5ythzcas.js:117139-117198 facade-majority
/**
 * 状态访问器：读取当前会话的 host（host） → 启动选项（launchOptions） 上的 toolsMachine()。
 */
function getToolsMachine() {
  return currentSession().host.launchOptions.toolsMachine();
}
//@ chunk-5ythzcas.js:117198-117268 facade-majority
/**
 * 工具使用的项目目录：会话目录绑定优先，否则 --project-config-root，否则项目根。
 */
function getProjectDirForTools() {
  let toolsMachine = getToolsMachine();
  return toolsMachine
    ? (toolsMachine.directory?.path ?? null)
    : (getProjectConfigRoot() ?? getProjectRootOrNull());
}
//@ chunk-5ythzcas.js:117268-117327 facade-majority (2.1.88 match: hasExitedPlanModeInSession, 0.747)
/**
 * 状态访问器：读取当前会话的 会话标志（sessionFlags） 上的 hasExitedPlanMode()。
 */
function hasExitedPlanModeInSession() {
  return currentSession().sessionFlags.hasExitedPlanMode();
}
//@ chunk-5ythzcas.js:117327-117387 facade-majority
/**
 * 状态访问器：写入当前会话的 会话标志（sessionFlags） 上的 replaceHasExitedPlanMode()。
 */
function setHasExitedPlanMode(exited) {
  currentSession().sessionFlags.replaceHasExitedPlanMode(exited);
}
//@ chunk-5ythzcas.js:117387-117445 facade-majority
/**
 * 状态访问器：读取当前会话的 host（host） → 主动性（proactivity） 上的 selectorGate()。
 */
function getProactivitySelectorGate() {
  return currentSession().host.proactivity.selectorGate();
}
//@ chunk-5ythzcas.js:117445-117509 facade-majority
/**
 * 状态访问器：读取当前会话的 host（host） → 主动性（proactivity） 上的 selectorGateEverOn()。
 */
function getProactivitySelectorGateEverOn() {
  return currentSession().host.proactivity.selectorGateEverOn();
}
//@ chunk-5ythzcas.js:117509-117573 facade-majority
/**
 * 状态访问器：调用当前会话的 host（host） → 主动性（proactivity） 上的 inheritSelectorGateEverOn()。
 */
function inheritProactivitySelectorGateEverOn() {
  currentSession().host.proactivity.inheritSelectorGateEverOn();
}
//@ chunk-5ythzcas.js:117573-117633 facade-majority
/**
 * 状态访问器：写入当前会话的 host（host） → 主动性（proactivity） 上的 replaceSelectorGate()。
 */
function setProactivitySelectorGate(gate) {
  currentSession().host.proactivity.replaceSelectorGate(gate);
}
//@ chunk-5ythzcas.js:117633-117694 facade-majority
/**
 * 状态访问器：调用当前会话的 host（host） → 主动性（proactivity） 上的 resampleSelectorGate()。
 */
function resampleProactivitySelectorGate(gate) {
  currentSession().host.proactivity.resampleSelectorGate(gate);
}
//@ chunk-5ythzcas.js:117694-117770 facade-majority
/**
 * 状态访问器：调用当前会话的 host（host） → 主动性（proactivity） 上的 subscribeSelectorGateChanged()。
 */
function onProactivitySelectorGateChanged(listener) {
  return currentSession().host.proactivity.subscribeSelectorGateChanged(listener);
}
//@ chunk-5ythzcas.js:117770-117838 facade-majority
/**
 * 状态访问器：写入当前会话的 host（host） → 主动性（proactivity） 上的 replaceHostGateSubscription()。
 */
function replaceProactivityHostGateSubscription(subscription) {
  currentSession().host.proactivity.replaceHostGateSubscription(subscription);
}
//@ chunk-5ythzcas.js:117838-117907 facade-majority (2.1.88 match: needsPlanModeExitAttachment, 0.747)
/**
 * 状态访问器：读取当前会话的 会话标志（sessionFlags） 上的 needsPlanModeExitAttachment()。
 */
function needsPlanModeExitAttachment() {
  return currentSession().sessionFlags.needsPlanModeExitAttachment();
}
//@ chunk-5ythzcas.js:117907-117977 facade-majority
/**
 * 状态访问器：写入当前会话的 会话标志（sessionFlags） 上的 replaceNeedsPlanModeExitAttachment()。
 */
function setNeedsPlanModeExitAttachment(needed) {
  currentSession().sessionFlags.replaceNeedsPlanModeExitAttachment(needed);
}
//@ chunk-5ythzcas.js:117977-118159 facade-majority
/**
 * plan 模式进出时设置 needsPlanModeExitAttachment。
 */
function handlePlanModeTransition(fromMode, toMode) {
  if (toMode === "plan" && fromMode !== "plan")
    currentSession().sessionFlags.replaceNeedsPlanModeExitAttachment(false);
  if (fromMode === "plan" && toMode !== "plan")
    currentSession().sessionFlags.replaceNeedsPlanModeExitAttachment(true);
}
//@ chunk-5ythzcas.js:118159-118228 facade-majority (2.1.88 match: needsAutoModeExitAttachment, 0.747)
/**
 * 状态访问器：读取当前会话的 会话标志（sessionFlags） 上的 needsAutoModeExitAttachment()。
 */
function needsAutoModeExitAttachment() {
  return currentSession().sessionFlags.needsAutoModeExitAttachment();
}
//@ chunk-5ythzcas.js:118228-118298 facade-majority
/**
 * 状态访问器：写入当前会话的 会话标志（sessionFlags） 上的 replaceNeedsAutoModeExitAttachment()。
 */
function setNeedsAutoModeExitAttachment(needed) {
  currentSession().sessionFlags.replaceNeedsAutoModeExitAttachment(needed);
}
//@ chunk-5ythzcas.js:118298-118533 facade-majority
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
//@ chunk-5ythzcas.js:118533-118608 facade-majority (2.1.88 match: hasShownLspRecommendationThisSession, 0.747)
/**
 * 状态访问器：读取当前会话的 会话标志（sessionFlags） 上的 lspRecommendationShownThisSession()。
 */
function hasShownLspRecommendationThisSession() {
  return currentSession().sessionFlags.lspRecommendationShownThisSession();
}
//@ chunk-5ythzcas.js:118608-118685 facade-majority
/**
 * 状态访问器：写入当前会话的 会话标志（sessionFlags） 上的 replaceLspRecommendationShownThisSession()。
 */
function setLspRecommendationShownThisSession(shown) {
  currentSession().sessionFlags.replaceLspRecommendationShownThisSession(shown);
}
//@ chunk-5ythzcas.js:118685-118749 facade-majority
/**
 * 状态访问器：写入当前会话的 host（host） → 启动选项（launchOptions） 上的 replaceInitJsonSchema()。
 */
function setInitJsonSchema(jsonSchema) {
  currentSession().host.launchOptions.replaceInitJsonSchema(jsonSchema);
}
//@ chunk-5ythzcas.js:118749-118811 facade-majority (2.1.88 match: setInitJsonSchema, 0.764)
/**
 * 状态访问器：读取当前会话的 host（host） → 启动选项（launchOptions） 上的 initJsonSchema()。
 */
function getInitJsonSchema() {
  return currentSession().host.launchOptions.initJsonSchema();
}
//@ chunk-5ythzcas.js:118811-118875 facade-majority
/**
 * 状态访问器：调用当前会话的 MCP 会话接线（mcpSessionWiring） 上的 registerClientsAccessor()。
 */
function setMcpClientsAccessor(accessor) {
  currentSession().mcpSessionWiring.registerClientsAccessor(accessor);
}
//@ chunk-5ythzcas.js:118875-118945 facade-majority
/**
 * 状态访问器：调用当前会话的 MCP 会话接线（mcpSessionWiring） 上的 acquireClientsAccessor()。
 */
function acquireMcpClientsAccessor(owner) {
  return currentSession().mcpSessionWiring.acquireClientsAccessor(owner);
}
//@ chunk-5ythzcas.js:118945-119009 facade-majority
/**
 * 状态访问器：读取当前会话的 MCP 会话接线（mcpSessionWiring） 上的 clientsFromAccessor()。
 */
function getMcpClientsFromAccessor() {
  return currentSession().mcpSessionWiring.clientsFromAccessor();
}
//@ chunk-5ythzcas.js:119009-119082 facade-majority
function getMcpClientsFromAccessorOrTenant() {
  return currentSession().mcpSessionWiring.clientsFromAccessorOrTenant();
}
//@ chunk-5ythzcas.js:119082-119157 facade-majority
/**
 * 状态访问器：调用当前会话的 host（host） → MCP 进程接线（mcpProcessWiring） 上的 registerEnsureConnectedClient()。
 */
function setEnsureConnectedClient(ensureConnectedClient) {
  currentSession().host.mcpProcessWiring.registerEnsureConnectedClient(ensureConnectedClient);
}
//@ chunk-5ythzcas.js:119157-119229 facade-majority
/**
 * 状态访问器：读取当前会话的 host（host） → MCP 进程接线（mcpProcessWiring） 上的 ensureConnectedClient()。
 */
function getEnsureConnectedClient() {
  return currentSession().host.mcpProcessWiring.ensureConnectedClient();
}
//@ chunk-5ythzcas.js:119229-119299 facade-majority
/**
 * 状态访问器：调用当前会话的 MCP 会话接线（mcpSessionWiring） 上的 registerConnectedClientWiring()。
 */
function setConnectedClientWiring(wiring) {
  currentSession().mcpSessionWiring.registerConnectedClientWiring(wiring);
}
//@ chunk-5ythzcas.js:119299-119366 facade-majority
/**
 * 状态访问器：读取当前会话的 MCP 会话接线（mcpSessionWiring） 上的 connectedClientWiring()。
 */
function getConnectedClientWiring() {
  return currentSession().mcpSessionWiring.connectedClientWiring();
}
//@ chunk-5ythzcas.js:119366-119427 facade-majority
/**
 * 状态访问器：调用当前会话的 MCP 会话接线（mcpSessionWiring） 上的 registerToolsSwapper()。
 */
function setMcpServerToolsSwapper(commitReconnect) {
  currentSession().mcpSessionWiring.registerToolsSwapper(commitReconnect);
}
//@ chunk-5ythzcas.js:119427-119494 facade-majority
/**
 * 状态访问器：调用当前会话的 MCP 会话接线（mcpSessionWiring） 上的 acquireToolsSwapper()。
 */
function acquireMcpServerToolsSwapper(owner) {
  return currentSession().mcpSessionWiring.acquireToolsSwapper(owner);
}
//@ chunk-5ythzcas.js:119494-119565 facade-majority
/**
 * 状态访问器：调用当前会话的 MCP 会话接线（mcpSessionWiring） 上的 swapServerTools()。
 */
function swapMcpServerTools(owner, serverName, config) {
  return currentSession().mcpSessionWiring.swapServerTools(owner, serverName, config);
}
//@ chunk-5ythzcas.js:119565-119616 layout
/**
 * 会话状态函数 getHookHolder：涉及当前会话的 hookRegistry.holder。
 */
function getHookHolder() {
  return getAgentContext() ?? currentSession().hookRegistry.holder();
}
//@ chunk-5ythzcas.js:119616-119813 facade-majority (2.1.88 match: registerHookCallbacks, 1)
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
//@ chunk-5ythzcas.js:119813-119854 facade-majority (2.1.88 match: registerHookCallbacks, 1)
/**
 * getRegisteredHooks：当前钩子持有者里注册的 SDK/插件钩子。
 */
function getRegisteredHooks() {
  return getHookHolder().registeredHooks;
}
//@ chunk-5ythzcas.js:119854-119916 facade-majority
/**
 * 默认 root 会话里注册的钩子。
 */
function getRootRegisteredHooks() {
  return defaultRootSession.hookRegistry.holder().registeredHooks;
}
//@ chunk-5ythzcas.js:119916-120002 facade-majority
/**
 * clearRegisteredHooks：清空注册的钩子并发出变化信号。
 */
function clearRegisteredHooks() {
  let hookHolder = getHookHolder();
  hookHolder.registeredHooks = null;
  hookHolder.sdkHostOutOfReachNoted = undefined;
  emitHookStoresChanged();
}
//@ chunk-5ythzcas.js:120002-120102 facade-majority
/**
 * SDK 宿主不可达的提示只记一次：首次返回 true。
 */
function takeSdkHostOutOfReachNote() {
  let hookHolder = getHookHolder();
  if (hookHolder.sdkHostOutOfReachNoted) return false;
  hookHolder.sdkHostOutOfReachNoted = true;
  return true;
}
//@ chunk-5ythzcas.js:120102-120151 facade-majority
/**
 * 宿主答复了钩子后清除“不可达已提示”标记。
 */
function noteSdkHostHookAnswered() {
  getHookHolder().sdkHostOutOfReachNoted = undefined;
}
//@ chunk-5ythzcas.js:120151-120193 facade-majority
/**
 * 当前插件钩子运行器。
 */
function getPluginHookRunner() {
  return getHookHolder().pluginHookRunner;
}
//@ chunk-5ythzcas.js:120193-120286 facade-majority
function setReplyGatePolicy(replyGatePolicy, accepted) {
  let hookHolder = getHookHolder();
  hookHolder.replyGatePolicy = replyGatePolicy;
  hookHolder.launchReplyGatePolicyOutcome = accepted && "accepted";
}
//@ chunk-5ythzcas.js:120286-120328 facade-majority
/**
 * 当前回复闸策略。
 */
function getReplyGatePolicy() {
  return getHookHolder().replyGatePolicy;
}
//@ chunk-5ythzcas.js:120328-120386 facade-majority
function setLaunchReplyGatePolicyRefused() {
  getHookHolder().launchReplyGatePolicyOutcome = "refused";
}
//@ chunk-5ythzcas.js:120386-120441 facade-majority
function getLaunchReplyGatePolicyOutcome() {
  return getHookHolder().launchReplyGatePolicyOutcome;
}
//@ chunk-5ythzcas.js:120441-120588 facade-majority
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
//@ chunk-5ythzcas.js:120588-120865 fingerprint (2.1.88 match: clearRegisteredPluginHooks, 0.67)
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
//@ chunk-5ythzcas.js:120865-120888 layout
var hooksChangedSignal; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-5ythzcas.js:120865", () => {
  hooksChangedSignal = new HostScoped(() => createSignal());
});
//@ chunk-5ythzcas.js:120888-120917 facade-majority
/**
 * 发出“钩子存储已变化”信号。
 */
function emitHookStoresChanged() {
  onProcessRootHost(hooksChangedSignal).emit();
}
//@ chunk-5ythzcas.js:120917-120960 facade-majority
/**
 * 订阅钩子存储变化。
 */
function onHookStoresChanged(recheckMcpCgroupRelease) {
  return onProcessRootHost(hooksChangedSignal).subscribe(recheckMcpCgroupRelease);
}
//@ chunk-5ythzcas.js:120960-121017 facade-majority (2.1.88 match: getPlanSlugCache, 0.739)
/**
 * 状态访问器：读取当前会话的 会话暂存（sessionScratch） 上的 planSlugCache()。
 */
function getPlanSlugCache() {
  return currentSession().sessionScratch.planSlugCache();
}
//@ chunk-5ythzcas.js:121017-121106 facade-majority (2.1.88 match: getSessionCreatedTeams, 0.739)
/**
 * 会话状态函数 getSessionCreatedTeams：优先取异步上下文覆盖对象的 sessionCreatedTeams；涉及当前会话的 sessionScratch.sessionCreatedTeams。
 */
function getSessionCreatedTeams() {
  return getAgentContext()?.sessionCreatedTeams ?? currentSession().sessionScratch.sessionCreatedTeams();
}
//@ chunk-5ythzcas.js:121106-121211 facade-majority
/**
 * 会话状态函数 getSessionSpawnedTeammatePanes：优先取异步上下文覆盖对象的 sessionSpawnedTeammatePanes；涉及当前会话的 sessionScratch.sessionSpawnedTeammatePanes。
 */
function getSessionSpawnedTeammatePanes() {
  return (
    getAgentContext()?.sessionSpawnedTeammatePanes ??
    currentSession().sessionScratch.sessionSpawnedTeammatePanes()
  );
}
//@ chunk-5ythzcas.js:121211-121312 facade-majority
/**
 * 会话状态函数 getSurfacedHookSpawnFailures：优先取异步上下文覆盖对象的 surfacedHookSpawnFailures；涉及当前会话的 sessionScratch.surfacedHookSpawnFailures。
 */
function getSurfacedHookSpawnFailures() {
  return (
    getAgentContext()?.surfacedHookSpawnFailures ??
    currentSession().sessionScratch.surfacedHookSpawnFailures()
  );
}
//@ chunk-5ythzcas.js:121312-121417 facade-majority
/**
 * 会话状态函数 getPendingConversationEditKinds：优先取异步上下文覆盖对象的 pendingConversationEditKinds；
 */
function getPendingConversationEditKinds() {
  return (
    agentContextGetter()?.pendingConversationEditKinds ??
    defaultRootSession.sessionScratch.pendingConversationEditKinds()
  );
}
//@ chunk-5ythzcas.js:121417-121520 facade-majority
/**
 * 会话状态函数 getClientTruncatedAssistantIds：优先取异步上下文覆盖对象的 clientTruncatedAssistantIds；
 */
function getClientTruncatedAssistantIds() {
  return (
    agentContextGetter()?.clientTruncatedAssistantIds ??
    defaultRootSession.sessionScratch.clientTruncatedAssistantIds()
  );
}
//@ chunk-5ythzcas.js:121520-121611 facade-majority
/**
 * 会话状态函数 getHeldStatelessReplyIds：优先取异步上下文覆盖对象的 heldStatelessReplyIds；
 */
function getHeldStatelessReplyIds() {
  return (
    agentContextGetter()?.heldStatelessReplyIds ?? defaultRootSession.sessionScratch.heldStatelessReplyIds()
  );
}
//@ chunk-5ythzcas.js:121611-121702 facade-majority
/**
 * 会话状态函数 getUnsupportedThreadKeys：优先取异步上下文覆盖对象的 unsupportedThreadKeys；
 */
function getUnsupportedThreadKeys() {
  return (
    agentContextGetter()?.unsupportedThreadKeys ?? defaultRootSession.sessionScratch.unsupportedThreadKeys()
  );
}
//@ chunk-5ythzcas.js:121702-121807 facade-majority
/**
 * 会话状态函数 getBareMcpServerMatchersWarned：优先取异步上下文覆盖对象的 bareMcpServerMatchersWarned；涉及当前会话的 sessionScratch.bareMcpServerMatchersWarned。
 */
function getBareMcpServerMatchersWarned() {
  return (
    getAgentContext()?.bareMcpServerMatchersWarned ??
    currentSession().sessionScratch.bareMcpServerMatchersWarned()
  );
}
//@ chunk-5ythzcas.js:121807-121894 facade-majority
/**
 * 会话状态函数 getPendingBranchLinks：优先取异步上下文覆盖对象的 pendingBranchLinks；涉及当前会话的 sessionScratch.pendingBranchLinks。
 */
function getPendingBranchLinks() {
  return getAgentContext()?.pendingBranchLinks ?? currentSession().sessionScratch.pendingBranchLinks();
}
//@ chunk-5ythzcas.js:121894-121952 facade-majority
/**
 * 状态访问器：读取当前会话的 会话暂存（sessionScratch） 上的 pendingPrLinks()。
 */
function getPendingPrLinks() {
  return currentSession().sessionScratch.pendingPrLinks();
}
//@ chunk-5ythzcas.js:121952-122027 facade-majority
/**
 * 状态访问器：读取当前会话的 会话暂存（sessionScratch） 上的 policyPredicateTelemetryEmitted()。
 */
function getPolicyPredicateTelemetryEmitted() {
  return currentSession().sessionScratch.policyPredicateTelemetryEmitted();
}
//@ chunk-5ythzcas.js:122027-122138 facade-majority
/**
 * 会话状态函数 getChromeAvailabilityStagesLogged：优先取异步上下文覆盖对象的 chromeAvailabilityStagesLogged；涉及当前会话的 sessionScratch.chromeAvailabilityStagesLogged。
 */
function getChromeAvailabilityStagesLogged() {
  return (
    getAgentContext()?.chromeAvailabilityStagesLogged ??
    currentSession().sessionScratch.chromeAvailabilityStagesLogged()
  );
}
//@ chunk-5ythzcas.js:122138-122208 facade-majority
/**
 * 状态访问器：读取当前会话的 会话暂存（sessionScratch） 上的 chromeAvailabilityAnchorMs()。
 */
function getChromeAvailabilityAnchorMs() {
  return currentSession().sessionScratch.chromeAvailabilityAnchorMs();
}
//@ chunk-5ythzcas.js:122208-122279 facade-majority
/**
 * 状态访问器：读取当前会话的 会话标志（sessionFlags） 上的 proposeGoalAvailabilityLogged()。
 */
function getProposeGoalAvailabilityLogged() {
  return currentSession().sessionFlags.proposeGoalAvailabilityLogged();
}
//@ chunk-5ythzcas.js:122279-122347 facade-majority
/**
 * 状态访问器：调用当前会话的 会话标志（sessionFlags） 上的 markProposeGoalAvailabilityLogged()。
 */
function setProposeGoalAvailabilityLogged() {
  currentSession().sessionFlags.markProposeGoalAvailabilityLogged();
}
//@ chunk-5ythzcas.js:122347-122406 facade-majority
/**
 * 状态访问器：读取当前会话的 会话标志（sessionFlags） 上的 inheritedTeamName()。
 */
function getInheritedTeamName() {
  return currentSession().sessionFlags.inheritedTeamName();
}
//@ chunk-5ythzcas.js:122406-122467 facade-majority
/**
 * 状态访问器：写入当前会话的 会话标志（sessionFlags） 上的 replaceInheritedTeamName()。
 */
function setInheritedTeamName(teamName) {
  currentSession().sessionFlags.replaceInheritedTeamName(teamName);
}
//@ chunk-5ythzcas.js:122467-122595 facade-majority (2.1.88 match: setTeleportedSessionInfo, 0.583)
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
//@ chunk-5ythzcas.js:122595-122658 facade-majority (2.1.88 match: getTeleportedSessionInfo, 0.747)
/**
 * 状态访问器：读取当前会话的 会话标志（sessionFlags） 上的 teleportedSessionInfo()。
 */
function getTeleportedSessionInfo() {
  return currentSession().sessionFlags.teleportedSessionInfo();
}
//@ chunk-5ythzcas.js:122658-122723 facade-majority
/**
 * 状态访问器：调用当前会话的 会话标志（sessionFlags） 上的 markFirstTeleportMessageLogged()。
 */
function markFirstTeleportMessageLogged() {
  currentSession().sessionFlags.markFirstTeleportMessageLogged();
}
//@ chunk-5ythzcas.js:122723-122898 facade-majority (2.1.88 match: addInvokedSkill, 0.823)
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
//@ chunk-5ythzcas.js:122898-122947 facade-majority (2.1.88 match: getInvokedSkills, 0.747)
/**
 * 状态访问器：读取当前会话的 已调用技能（invokedSkills） 上的 skills()。
 */
function getInvokedSkills() {
  return currentSession().invokedSkills.skills();
}
//@ chunk-5ythzcas.js:122947-123051 facade-majority
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
//@ chunk-5ythzcas.js:123051-123170 facade-majority (2.1.88 match: getInvokedSkillsForAgent, 0.747)
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
//@ chunk-5ythzcas.js:123170-123355 facade-majority
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
//@ chunk-5ythzcas.js:123355-123464 facade-majority (2.1.88 match: clearInvokedSkillsForAgent, 0.587)
/**
 * clearInvokedSkillsForAgent：清除某代理的已调用技能。
 */
function clearInvokedSkillsForAgent(agentId) {
  let session = currentSession();
  for (let [key, skill] of session.invokedSkills.skills())
    if (skill.agentId === agentId) session.invokedSkills.forget(key);
}
//@ chunk-5ythzcas.js:123464-123528 facade-majority
/**
 * 状态访问器：调用当前会话的 host（host） → 诊断（diagnostics） 上的 recordSlowOperation()。
 */
function addSlowOperation(operationName, durationMs) {
  currentSession().host.diagnostics.recordSlowOperation(operationName, durationMs);
}
//@ chunk-5ythzcas.js:123528-123588 facade-majority (2.1.88 match: getSlowOperations, 0.608)
/**
 * 状态访问器：读取当前会话的 host（host） → 诊断（diagnostics） 上的 slowOperations()。
 */
function getSlowOperations() {
  return currentSession().host.diagnostics.slowOperations();
}
//@ chunk-5ythzcas.js:123588-123645 facade-majority
/**
 * 状态访问器：读取当前会话的 host（host） → 诊断（diagnostics） 上的 devBarAlert()。
 */
function getDevBarAlert() {
  return currentSession().host.diagnostics.devBarAlert();
}
//@ chunk-5ythzcas.js:123645-123739 facade-majority (2.1.88 match: getMainThreadAgentType, 0.68)
/**
 * 会话状态函数 getMainThreadAgentType：涉及当前会话的 hookRegistry.mainThreadAgentType。
 */
function getMainThreadAgentType() {
  let agentContext = getAgentContext();
  return agentContext
    ? agentContext.mainThreadAgentType
    : currentSession().hookRegistry.mainThreadAgentType();
}
//@ chunk-5ythzcas.js:123739-123846 facade-majority (2.1.88 match: setMainThreadAgentType, 0.496)
/**
 * 会话状态函数 setMainThreadAgentType：涉及当前会话的 hookRegistry.replaceMainThreadAgentType。
 */
function setMainThreadAgentType(agentType) {
  let agentContext = getAgentContext();
  if (agentContext) agentContext.mainThreadAgentType = agentType;
  else currentSession().hookRegistry.replaceMainThreadAgentType(agentType);
}
//@ chunk-5ythzcas.js:123846-123942 facade-majority
/**
 * 会话状态函数 getMainThreadAgentHooks：涉及当前会话的 hookRegistry.mainThreadAgentHooks。
 */
function getMainThreadAgentHooks() {
  let agentContext = getAgentContext();
  return agentContext
    ? agentContext.mainThreadAgentHooks
    : currentSession().hookRegistry.mainThreadAgentHooks();
}
//@ chunk-5ythzcas.js:123942-124002 facade-majority
/**
 * 默认 root 会话的主线程代理钩子。
 */
function getRootMainThreadAgentHooks() {
  return defaultRootSession.hookRegistry.mainThreadAgentHooks();
}
//@ chunk-5ythzcas.js:124002-124117 facade-majority
/**
 * 会话状态函数 setMainThreadAgentHooks：涉及当前会话的 hookRegistry.replaceMainThreadAgentHooks。
 */
function setMainThreadAgentHooks(hooks) {
  let agentContext = getAgentContext();
  if (agentContext) agentContext.mainThreadAgentHooks = hooks;
  else currentSession().hookRegistry.replaceMainThreadAgentHooks(hooks);
  emitHookStoresChanged();
}
//@ chunk-5ythzcas.js:124117-124188 facade-majority
/**
 * 状态访问器：读取当前会话的 host（host） → 扩展配置（extensionsConfig） 上的 sessionSkillAllowlist()。
 */
function getSessionSkillAllowlist() {
  return currentSession().host.extensionsConfig.sessionSkillAllowlist();
}
//@ chunk-5ythzcas.js:124188-124262 facade-majority
/**
 * 状态访问器：写入当前会话的 host（host） → 扩展配置（extensionsConfig） 上的 replaceSessionSkillAllowlist()。
 */
function setSessionSkillAllowlist(skills) {
  currentSession().host.extensionsConfig.replaceSessionSkillAllowlist(skills);
}
//@ chunk-5ythzcas.js:124262-124314 facade-majority
/**
 * 状态访问器：读取当前会话的 宿主能力（surfaceCapabilities） 上的 caps()。
 */
function getCaps() {
  return currentSession().surfaceCapabilities.caps();
}
//@ chunk-5ythzcas.js:124314-124369 facade-majority
/**
 * 状态访问器：写入当前会话的 宿主能力（surfaceCapabilities） 上的 replaceCaps()。
 */
function setCaps(caps) {
  currentSession().surfaceCapabilities.replaceCaps(caps);
}
//@ chunk-5ythzcas.js:124369-124442 facade-majority
/**
 * 会话状态函数 getIsRemoteMode：涉及当前会话的 surfaceCapabilities.caps。
 */
function getIsRemoteMode() {
  return currentSession().surfaceCapabilities.caps().workspace === "remote";
}
//@ chunk-5ythzcas.js:124442-124496 facade-majority
/**
 * 状态访问器：调用当前会话的 宿主能力（surfaceCapabilities） 上的 markRemote()。
 */
function setIsRemoteMode(isRemoteMode) {
  currentSession().surfaceCapabilities.markRemote(isRemoteMode);
}
//@ chunk-5ythzcas.js:124496-124574 facade-majority
/**
 * 当前会话在云端的工作目录。
 */
function getCloudCwd() {
  let session = currentSession();
  return session.surfaceCapabilities.cloudCwdOfSession(session.id);
}
//@ chunk-5ythzcas.js:124574-124670 facade-majority
/**
 * 会话状态函数 setCloudCwd：涉及当前会话的 surfaceCapabilities.replaceCloudCwd。
 */
function setCloudCwd(update) {
  currentSession().surfaceCapabilities.replaceCloudCwd({
    sessionId: update.sessionId,
    cwd: identityString(update.cwd),
  });
}
//@ chunk-5ythzcas.js:124670-124746 facade-majority
/**
 * 状态访问器：调用当前会话的 宿主能力（surfaceCapabilities） → cloudCwdChanged 上的 subscribe()。
 */
function onCloudCwdChange(listener) {
  return currentSession().surfaceCapabilities.cloudCwdChanged.subscribe(listener);
}
//@ chunk-5ythzcas.js:124746-124798 facade-majority
/**
 * 状态访问器：读取当前会话的 提示词组装（promptAssembly） 上的 sections()。
 */
function getSystemPromptSectionCache() {
  return currentSession().promptAssembly.sections();
}
//@ chunk-5ythzcas.js:124798-124854 facade-majority
/**
 * 状态访问器：调用当前会话的 提示词组装（promptAssembly） 上的 recordSection()。
 */
function setSystemPromptSectionCacheEntry(name, promptSection) {
  currentSession().promptAssembly.recordSection(name, promptSection);
}
//@ chunk-5ythzcas.js:124854-124915 facade-majority
/**
 * 会话状态函数 clearSystemPromptSectionState：涉及当前会话的 promptAssembly.forgetAllSections。
 */
function clearSystemPromptSectionState(reason) {
  currentSession().promptAssembly.forgetAllSections();
  noteSystemPromptSectionInvalidation(reason);
}
//@ chunk-5ythzcas.js:124915-124969 facade-majority
/**
 * 状态访问器：调用当前会话的 提示词组装（promptAssembly） 上的 noteInvalidation()。
 */
function noteSystemPromptSectionInvalidation(reason) {
  currentSession().promptAssembly.noteInvalidation(reason);
}
//@ chunk-5ythzcas.js:124969-125017 facade-majority
/**
 * 状态访问器：读取当前会话的 提示词组装（promptAssembly） 上的 epoch()。
 */
function getSystemPromptSectionEpoch() {
  return currentSession().promptAssembly.epoch();
}
//@ chunk-5ythzcas.js:125017-125083 facade-majority
/**
 * 状态访问器：读取当前会话的 提示词组装（promptAssembly） 上的 lastInvalidationReason()。
 */
function getSystemPromptInvalidationReason() {
  return currentSession().promptAssembly.lastInvalidationReason();
}
//@ chunk-5ythzcas.js:125083-125141 facade-majority
/**
 * 状态访问器：读取当前会话的 会话暂存（sessionScratch） 上的 vimSharedState()。
 */
function getVimSharedState() {
  return currentSession().sessionScratch.vimSharedState();
}
//@ chunk-5ythzcas.js:125141-125201 facade-majority
/**
 * 状态访问器：写入当前会话的 会话暂存（sessionScratch） 上的 replaceVimSharedState()。
 */
function setVimSharedState(initialPersistentState) {
  currentSession().sessionScratch.replaceVimSharedState(initialPersistentState);
}
//@ chunk-5ythzcas.js:125201-125290 facade-majority (2.1.88 match: getAdditionalDirectoriesForClaudeMd, 0.728)
/**
 * 会话状态函数 getAdditionalDirectoriesForClaudeMd：涉及当前会话的 host.extensionsConfig.additionalDirectoriesForClaudeMd。
 */
function getAdditionalDirectoriesForClaudeMd() {
  return isDiskless() ? [] : currentSession().host.extensionsConfig.additionalDirectoriesForClaudeMd();
}
//@ chunk-5ythzcas.js:125290-125374 facade-majority
/**
 * 状态访问器：写入当前会话的 host（host） → 扩展配置（extensionsConfig） 上的 replaceAdditionalDirectoriesForClaudeMd()。
 */
function setAdditionalDirectoriesForClaudeMd(dirs) {
  currentSession().host.extensionsConfig.replaceAdditionalDirectoriesForClaudeMd(dirs);
}
//@ chunk-5ythzcas.js:125374-125459 facade-majority
/**
 * 状态访问器：读取当前会话的 host（host） → 扩展配置（extensionsConfig） 上的 claudeMdAdditionalDirectoriesAsked()。
 */
function getClaudeMdAdditionalDirectoriesAsked() {
  return currentSession().host.extensionsConfig.claudeMdAdditionalDirectoriesAsked();
}
//@ chunk-5ythzcas.js:125459-125537 facade-majority
/**
 * 状态访问器：调用当前会话的 host（host） → 扩展配置（extensionsConfig） 上的 askClaudeMdAdditionalDirectories()。
 */
function setClaudeMdAdditionalDirectoriesAsked(addedDirectories) {
  currentSession().host.extensionsConfig.askClaudeMdAdditionalDirectories(addedDirectories);
}
//@ chunk-5ythzcas.js:125537-125602 facade-majority (2.1.88 match: getAllowedChannels, 0.728)
/**
 * 状态访问器：读取当前会话的 host（host） → 扩展配置（extensionsConfig） 上的 allowedChannels()。
 */
function getAllowedChannels() {
  return currentSession().host.extensionsConfig.allowedChannels();
}
//@ chunk-5ythzcas.js:125602-125670 facade-majority
/**
 * 状态访问器：写入当前会话的 host（host） → 扩展配置（extensionsConfig） 上的 replaceAllowedChannels()。
 */
function setAllowedChannels(channels) {
  currentSession().host.extensionsConfig.replaceAllowedChannels(channels);
}
//@ chunk-5ythzcas.js:125670-125735 facade-majority (2.1.88 match: getHasDevChannels, 0.728)
/**
 * 状态访问器：读取当前会话的 host（host） → 扩展配置（extensionsConfig） 上的 hasDevChannels()。
 */
function getHasDevChannels() {
  return currentSession().host.extensionsConfig.hasDevChannels();
}
//@ chunk-5ythzcas.js:125735-125802 facade-majority
/**
 * 状态访问器：写入当前会话的 host（host） → 扩展配置（extensionsConfig） 上的 replaceHasDevChannels()。
 */
function setHasDevChannels(hasDevChannels) {
  currentSession().host.extensionsConfig.replaceHasDevChannels(hasDevChannels);
}
//@ chunk-5ythzcas.js:125802-125873 facade-majority (2.1.88 match: getPromptCache1hAllowlist, 0.75)
/**
 * 状态访问器：读取当前会话的 host（host） → 请求锁存（requestLatches） 上的 promptCache1hAllowlist()。
 */
function getPromptCache1hAllowlist() {
  return currentSession().host.requestLatches.promptCache1hAllowlist();
}
//@ chunk-5ythzcas.js:125873-125946 facade-majority
function setPromptCache1hAllowlist(allowlist) {
  currentSession().host.requestLatches.replacePromptCache1hAllowlist(allowlist);
}
//@ chunk-5ythzcas.js:125946-126024 facade-majority
function getThinkingTypeOverride(model) {
  return currentSession().host.requestLatches.thinkingTypeOverrides().get(model);
}
//@ chunk-5ythzcas.js:126024-126098 facade-majority
function setThinkingTypeOverride(model, thinkingType) {
  currentSession().host.requestLatches.recordThinkingTypeOverride(model, thinkingType);
}
//@ chunk-5ythzcas.js:126098-126183 facade-majority
function getServedModelsForRequestedModel(requestedModel) {
  return currentSession().host.requestLatches.servedModelsByRequestedModel().get(requestedModel);
}
//@ chunk-5ythzcas.js:126183-126345 facade-majority
function recordServedModel(requestedModel, model) {
  if (requestedModel === model) return;
  let requestLatches = currentSession().host.requestLatches;
  let servedModels = requestLatches.servedModelsByRequestedModel().get(requestedModel);
  if (servedModels) servedModels.add(model);
  else requestLatches.recordServedModels(requestedModel, new Set([model]));
}
//@ chunk-5ythzcas.js:126345-126425 facade-majority
function isEffortMarkedUnsupported(model) {
  return currentSession().host.requestLatches.effortUnsupportedModels().has(model);
}
//@ chunk-5ythzcas.js:126425-126490 facade-majority
function markEffortUnsupported(model) {
  currentSession().host.requestLatches.markEffortUnsupported(model);
}
//@ chunk-5ythzcas.js:126490-126581 facade-majority
function isStructuredOutputsMarkedUnsupported(model) {
  return currentSession().host.requestLatches.structuredOutputsUnsupportedModels().has(model);
}
//@ chunk-5ythzcas.js:126581-126657 facade-majority
function markStructuredOutputsUnsupported(model) {
  currentSession().host.requestLatches.markStructuredOutputsUnsupported(model);
}
//@ chunk-5ythzcas.js:126657-126732 facade-majority
function clearStructuredOutputsUnsupported() {
  currentSession().host.requestLatches.clearStructuredOutputsUnsupported();
}
//@ chunk-5ythzcas.js:126732-126811 facade-majority
function isContext1mMarkedRefused(model) {
  return currentSession().host.requestLatches.context1mRefusedModels().has(model);
}
//@ chunk-5ythzcas.js:126811-126875 facade-majority
function markContext1mRefused(model) {
  currentSession().host.requestLatches.markContext1mRefused(model);
}
//@ chunk-5ythzcas.js:126875-126938 facade-majority
function clearContext1mRefused() {
  currentSession().host.requestLatches.clearContext1mRefused();
}
//@ chunk-5ythzcas.js:126938-127001 facade-majority
function getRefusedBetasForModel(modelId) {
  return currentSession().host.requestLatches.refusedBetas(modelId);
}
//@ chunk-5ythzcas.js:127001-127064 facade-majority
function markBetaRefusedForModel(model, betaName) {
  currentSession().host.requestLatches.markBetaRefused(model, betaName);
}
//@ chunk-5ythzcas.js:127064-127130 facade-majority
function getLearnedEffortCaps() {
  return currentSession().host.requestLatches.learnedEffortCaps();
}
//@ chunk-5ythzcas.js:127130-127208 facade-majority
function isMidConvCachePromotionRejected() {
  return currentSession().host.requestLatches.midConvCachePromotionRejected();
}
//@ chunk-5ythzcas.js:127208-127283 facade-majority
function markMidConvCachePromotionRejected() {
  currentSession().host.requestLatches.markMidConvCachePromotionRejected();
}
//@ chunk-5ythzcas.js:127283-127362 facade-majority
function isToolProvenanceServerUrlRefused() {
  return currentSession().host.requestLatches.toolProvenanceServerUrlRefused();
}
//@ chunk-5ythzcas.js:127362-127438 facade-majority
function markToolProvenanceServerUrlRefused() {
  currentSession().host.requestLatches.markToolProvenanceServerUrlRefused();
}
//@ chunk-5ythzcas.js:127438-127519 facade-majority
function isThirdPartyServerClassifierRefused() {
  return currentSession().host.requestLatches.thirdPartyServerClassifierRefused();
}
//@ chunk-5ythzcas.js:127519-127598 facade-majority
function markThirdPartyServerClassifierRefused() {
  currentSession().host.requestLatches.markThirdPartyServerClassifierRefused();
}
//@ chunk-5ythzcas.js:127598-127680 facade-majority
function releaseThirdPartyServerClassifierRefusal() {
  currentSession().host.requestLatches.releaseThirdPartyServerClassifierRefusal();
}
//@ chunk-5ythzcas.js:127680-127759 facade-majority
function isThreadsHeldForServerClassifier() {
  return currentSession().host.requestLatches.threadsHeldForServerClassifier();
}
//@ chunk-5ythzcas.js:127759-127835 facade-majority
function markThreadsHeldForServerClassifier() {
  currentSession().host.requestLatches.markThreadsHeldForServerClassifier();
}
//@ chunk-5ythzcas.js:127835-127913 facade-majority
function getAutoModeUnavailableResponse(toolUseId) {
  return currentSession().host.requestLatches.autoModeUnavailableResponse(toolUseId);
}
//@ chunk-5ythzcas.js:127913-127998 facade-majority
function getAutoModeUnavailableResponsesInARow(runKey) {
  return currentSession().host.requestLatches.autoModeUnavailableResponsesInARow(runKey);
}
//@ chunk-5ythzcas.js:127998-128090 facade-majority
function dropAutoModeUnavailableResponsesOfOtherTurns(runKey, turn) {
  currentSession().host.requestLatches.dropAutoModeUnavailableResponsesOfOtherTurns(runKey, turn);
}
//@ chunk-5ythzcas.js:128090-128169 facade-majority
function noteAutoModeUnavailableResponse(toolUseId, response) {
  currentSession().host.requestLatches.noteAutoModeUnavailableResponse(toolUseId, response);
}
//@ chunk-5ythzcas.js:128169-128246 facade-majority
function clearAutoModeUnavailableResponses(toolUseId) {
  currentSession().host.requestLatches.clearAutoModeUnavailableResponses(toolUseId);
}
//@ chunk-5ythzcas.js:128246-128322 facade-majority
function setAutoModeUnavailableStopNotice(notice) {
  currentSession().host.requestLatches.setAutoModeUnavailableStopNotice(notice);
}
//@ chunk-5ythzcas.js:128322-128400 facade-majority
function getAutoModeUnavailableStopNotice() {
  return currentSession().host.requestLatches.autoModeUnavailableStopNotice();
}
//@ chunk-5ythzcas.js:128400-128467 facade-majority
function setLocalCommandExitCode(exitCode) {
  currentSession().host.requestLatches.setLocalCommandExitCode(exitCode);
}
//@ chunk-5ythzcas.js:128467-128536 facade-majority
function getLocalCommandExitCode() {
  return currentSession().host.requestLatches.localCommandExitCode();
}
//@ chunk-5ythzcas.js:128536-128600 facade-majority
function getObservedGateway() {
  return currentSession().host.requestLatches.observedGateway();
}
//@ chunk-5ythzcas.js:128600-128663 facade-majority
function noteObservedGateway(gateway) {
  currentSession().host.requestLatches.noteObservedGateway(gateway);
}
//@ chunk-5ythzcas.js:128663-128742 facade-majority
function getServerClassifierFallbackChoice() {
  return currentSession().host.requestLatches.serverClassifierFallbackChoice();
}
//@ chunk-5ythzcas.js:128742-128819 facade-majority
function setServerClassifierFallbackChoice(choice) {
  currentSession().host.requestLatches.setServerClassifierFallbackChoice(choice);
}
//@ chunk-5ythzcas.js:128819-128896 facade-majority
function clearServerClassifierFallbackChoice() {
  currentSession().host.requestLatches.clearServerClassifierFallbackChoice();
}
//@ chunk-5ythzcas.js:128896-128985 facade-majority
function takeServerClassifierFallbackAnnouncement() {
  return currentSession().host.requestLatches.takeServerClassifierFallbackAnnouncement();
}
//@ chunk-5ythzcas.js:128985-129053 facade-majority
function noteNoServerCheck(reason) {
  return currentSession().host.requestLatches.noteNoServerCheck(reason);
}
//@ chunk-5ythzcas.js:129053-129123 facade-majority
function noteNoServerCheckStoppedTurn() {
  currentSession().host.requestLatches.noteNoServerCheckStoppedTurn();
}
//@ chunk-5ythzcas.js:129123-129200 facade-majority
function takeNoServerCheckStoppedTurn() {
  return currentSession().host.requestLatches.takeNoServerCheckStoppedTurn();
}
//@ chunk-5ythzcas.js:129200-129278 facade-majority
function takeNoServerCheckAnnouncement() {
  return currentSession().host.requestLatches.takeNoServerCheckAnnouncement();
}
//@ chunk-5ythzcas.js:129278-129349 facade-majority
function isPerTurnEffortOkEmitted() {
  return currentSession().host.requestLatches.perTurnEffortOkEmitted();
}
//@ chunk-5ythzcas.js:129349-129417 facade-majority
function markPerTurnEffortOkEmitted() {
  currentSession().host.requestLatches.markPerTurnEffortOkEmitted();
}
//@ chunk-5ythzcas.js:129417-129492 facade-majority
function isLateToolAdditionsOkEmitted() {
  return currentSession().host.requestLatches.lateToolAdditionsOkEmitted();
}
//@ chunk-5ythzcas.js:129492-129564 facade-majority
function markLateToolAdditionsOkEmitted() {
  currentSession().host.requestLatches.markLateToolAdditionsOkEmitted();
}
//@ chunk-5ythzcas.js:129564-129636 facade-majority
function isToolChangeHeaderRefused() {
  return currentSession().host.requestLatches.toolChangeHeaderRefused();
}
//@ chunk-5ythzcas.js:129636-129705 facade-majority
function markToolChangeHeaderRefused() {
  currentSession().host.requestLatches.markToolChangeHeaderRefused();
}
//@ chunk-5ythzcas.js:129705-129774 facade-majority
function isPromptEndMarkRefused() {
  return currentSession().host.requestLatches.promptEndMarkRefused();
}
//@ chunk-5ythzcas.js:129774-129840 facade-majority
function markPromptEndMarkRefused() {
  currentSession().host.requestLatches.markPromptEndMarkRefused();
}
//@ chunk-5ythzcas.js:129840-129907 facade-majority
function isInlineToolsRefused() {
  return currentSession().host.requestLatches.inlineToolsRefused();
}
//@ chunk-5ythzcas.js:129907-129971 facade-majority
function markInlineToolsRefused() {
  currentSession().host.requestLatches.markInlineToolsRefused();
}
//@ chunk-5ythzcas.js:129971-130040 facade-majority
function isInlineToolsOkEmitted() {
  return currentSession().host.requestLatches.inlineToolsOkEmitted();
}
//@ chunk-5ythzcas.js:130040-130106 facade-majority
function markInlineToolsOkEmitted() {
  currentSession().host.requestLatches.markInlineToolsOkEmitted();
}
//@ chunk-5ythzcas.js:130106-130180 facade-majority
function isThinkingResumptionRefused() {
  return currentSession().host.requestLatches.thinkingResumptionRefused();
}
//@ chunk-5ythzcas.js:130180-130251 facade-majority
function markThinkingResumptionRefused() {
  currentSession().host.requestLatches.markThinkingResumptionRefused();
}
//@ chunk-5ythzcas.js:130251-130318 facade-majority
function getRefusedBetaHeaders() {
  return currentSession().host.requestLatches.refusedBetaHeaders();
}
//@ chunk-5ythzcas.js:130318-130383 facade-majority
function markBetaHeaderRefused(headerName) {
  currentSession().host.requestLatches.markBetaHeaderRefused(headerName);
}
//@ chunk-5ythzcas.js:130383-130450 facade-majority
function unmarkBetaHeaderRefused(beta) {
  currentSession().host.requestLatches.unmarkBetaHeaderRefused(beta);
}
//@ chunk-5ythzcas.js:130450-130524 facade-majority
function isThinkingHighlightsRefused() {
  return currentSession().host.requestLatches.thinkingHighlightsRefused();
}
//@ chunk-5ythzcas.js:130524-130595 facade-majority
function markThinkingHighlightsRefused() {
  currentSession().host.requestLatches.markThinkingHighlightsRefused();
}
//@ chunk-5ythzcas.js:130595-130679 facade-majority
function isToolChangeUnsupportedModel(canonicalName) {
  return currentSession().host.requestLatches.toolChangeUnsupportedModels().has(canonicalName);
}
//@ chunk-5ythzcas.js:130679-130753 facade-majority
function markToolChangeUnsupportedModel(canonicalName) {
  currentSession().host.requestLatches.markToolChangeUnsupportedModel(canonicalName);
}
//@ chunk-5ythzcas.js:130753-130839 facade-majority
function getInferenceProfileBackingModelCached(profileId) {
  return currentSession().host.requestLatches.inferenceProfileBackingModels().get(profileId);
}
//@ chunk-5ythzcas.js:130839-130921 facade-majority
function setInferenceProfileBackingModel(profileId, backingModel) {
  currentSession().host.requestLatches.recordInferenceProfileBackingModel(profileId, backingModel);
}
//@ chunk-5ythzcas.js:130921-130998 facade-majority
function getStickyBetas() {
  return getAgentContext()?.stickyBetas ?? currentSession().conversationLatches.stickyBetas();
}
//@ chunk-5ythzcas.js:130998-131092 facade-majority
function getConversationAtisLatch() {
  let agentContext = getAgentContext();
  return agentContext ? agentContext.conversationAtisLatch : currentSession().conversationLatches.atisLatch();
}
//@ chunk-5ythzcas.js:131092-131198 facade-majority
function setConversationAtisLatch(latch) {
  let agentContext = getAgentContext();
  if (agentContext) agentContext.conversationAtisLatch = latch;
  else currentSession().conversationLatches.replaceAtisLatch(latch);
}
//@ chunk-5ythzcas.js:131198-131281 facade-majority
function getConversationToolsUsed() {
  return getAgentContext()?.conversationToolsUsed ?? currentSession().conversationLatches.toolsUsed;
}
//@ chunk-5ythzcas.js:131281-131398 facade-majority
function clearBetaHeaderLatches() {
  let agentContext = getAgentContext();
  if (agentContext) agentContext.stickyBetas = unlatchStickyBetaLatches(agentContext.stickyBetas);
  else currentSession().conversationLatches.unlatchStickyBetas();
  clearContext1mRefused();
}
//@ chunk-5ythzcas.js:131398-131449 facade-majority
function getPromptId() {
  return currentSession().requestJournal.promptId();
}
//@ chunk-5ythzcas.js:131449-131503 facade-majority
function setPromptId(promptId) {
  currentSession().requestJournal.replacePromptId(promptId);
}
//@ chunk-5ythzcas.js:131503-131567 facade-majority
function incrementPromptIndex() {
  return currentSession().requestJournal.incrementPromptIndex();
}
//@ chunk-5ythzcas.js:131567-131621 facade-majority
function getPromptIndex() {
  return currentSession().requestJournal.promptIndex();
}
//@ chunk-5ythzcas.js:131621-131830 facade-majority
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
//@ chunk-5ythzcas.js:131830-131890 facade-majority
function getLastPersonPrompt() {
  return currentSession().requestJournal.lastPersonPrompt();
}
//@ chunk-5ythzcas.js:131890-131954 facade-majority
function isReplBridgeActive() {
  return currentSession().surfaceCapabilities.replBridgeActive();
}
//@ chunk-5ythzcas.js:131954-132021 facade-majority
function setReplBridgeActive(active) {
  currentSession().surfaceCapabilities.replaceReplBridgeActive(active);
}
//@ chunk-5ythzcas.js:132021-132082 facade-majority
function getMainLoopBusy() {
  return currentSession().surfaceCapabilities.mainLoopBusy();
}
//@ chunk-5ythzcas.js:132082-132147 facade-majority
function getMainQueryRunning() {
  return currentSession().surfaceCapabilities.mainQueryRunning();
}
//@ chunk-5ythzcas.js:132147-132212 facade-majority
function setMainLoopStatus(status) {
  currentSession().surfaceCapabilities.replaceMainLoopStatus(status);
}
//@ chunk-f798ahhj.js:295-360 fingerprint (2.1.88 match: getSessionCounter, 0.729)
/**
 * getSessionCounter：OTel 计数器 claude_code.session.count。
 */
function getSessionCounter() {
  return rootSession().host.telemetryHandles.sessionCounter();
}
//@ chunk-f798ahhj.js:360-421 fingerprint (2.1.88 match: getLocCounter, 0.729)
/**
 * getLocCounter：claude_code.lines_of_code.count。
 */
function getLocCounter() {
  return rootSession().host.telemetryHandles.locCounter();
}
//@ chunk-f798ahhj.js:421-481 fingerprint (2.1.88 match: getPrCounter, 0.729)
/**
 * getPrCounter：claude_code.pull_request.count。
 */
function getPrCounter() {
  return rootSession().host.telemetryHandles.prCounter();
}
//@ chunk-f798ahhj.js:481-545 fingerprint (2.1.88 match: getCommitCounter, 0.729)
/**
 * getCommitCounter：claude_code.commit.count。
 */
function getCommitCounter() {
  return rootSession().host.telemetryHandles.commitCounter();
}
//@ chunk-f798ahhj.js:545-607 fingerprint (2.1.88 match: getCostCounter, 0.729)
/**
 * getCostCounter：claude_code.cost.usage。
 */
function getCostCounter() {
  return rootSession().host.telemetryHandles.costCounter();
}
//@ chunk-f798ahhj.js:607-670 fingerprint (2.1.88 match: getTokenCounter, 0.729)
/**
 * getTokenCounter：claude_code.token.usage。
 */
function getTokenCounter() {
  return rootSession().host.telemetryHandles.tokenCounter();
}
//@ chunk-f798ahhj.js:670-748 fingerprint (2.1.88 match: getCodeEditToolDecisionCounter, 0.729)
/**
 * getCodeEditToolDecisionCounter：claude_code.code_edit_tool.decision。
 */
function getCodeEditToolDecisionCounter() {
  return rootSession().host.telemetryHandles.codeEditToolDecisionCounter();
}
//@ chunk-f798ahhj.js:748-816 fingerprint (2.1.88 match: getActiveTimeCounter, 0.729)
/**
 * getActiveTimeCounter：claude_code.active_time.total。
 */
function getActiveTimeCounter() {
  return rootSession().host.telemetryHandles.activeTimeCounter();
}
//@ chunk-f798ahhj.js:816-880 fingerprint (2.1.88 match: getMeterProvider, 0.729)
/**
 * getMeterProvider：OTel MeterProvider。
 */
function getMeterProvider() {
  return rootSession().host.telemetryHandles.meterProvider();
}
//@ chunk-f798ahhj.js:880-946 placement
/**
 * 替换当前会话宿主的 OTel MeterProvider（遥测类访问器的写入口）。
 */
function replaceMeterProvider(meterProvider) {
  rootSession().host.telemetryHandles.replaceMeterProvider(meterProvider);
}
//@ chunk-f798ahhj.js:946-970 placement
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
  getRootSession,
  getOriginalCwdOrNull,
  getAllowedChannels,
  getPermissionPromptToolName,
  getSessionId,
  isSdkDialogHostActive,
  getServerClassifierFallbackChoice,
  isDiskless,
  isThirdPartyServerClassifierRefused,
  markThirdPartyServerClassifierRefused,
  noteNoServerCheck,
  noteNoServerCheckStoppedTurn,
  getTotalInputTokens,
  getTotalOutputTokens,
  getTotalCacheReadInputTokens,
  getTotalCacheCreationInputTokens,
  isCcrSessionLimited,
  getIsRemoteMode,
  isDisklessProcess,
  onProcessRootHost,
  onAttacherCapsChange,
  getAttacherCaps,
  mainAgentId,
  getSdkAgentProgressSummariesEnabled,
  getSessionStartTime,
  getOriginalCwd,
  getMcpClientsFromAccessorOrTenant,
  getParentSessionId,
  getPromptId,
  getRendererModeForAnalytics,
  getIsInteractive,
  getClientType,
  getLastMainThreadContextTokens,
  getStickyBetas,
  isPromptEndMarkRefused,
  isStructuredOutputsMarkedUnsupported,
  markStructuredOutputsUnsupported,
  getLearnedEffortCaps,
  onSessionSwitch,
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
  isThinkingHighlightsRefused,
  getThinkingTypeOverride,
  getThinkingDisplayExplicit,
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
  markBetaHeaderRefused,
  markThinkingResumptionRefused,
  hasRefusalFallbackOccurred,
  getRefusalFallbackModelLatch,
  consumePendingContextCompacted,
  setThinkingTypeOverride,
  recordServedModel,
  forgetResponseBeforeCompaction,
  setLastMainRequestId,
  setLastMainThreadContextTokens,
  takeRefusalFallbackCarriedEffortEnd,
  isToolChangeHeaderRefused,
  isInlineToolsRefused,
  markToolChangeHeaderRefused,
  markInlineToolsRefused,
  markToolChangeUnsupportedModel,
  getToolsOmittedByLaunchList,
  getSessionProjectDir,
  isSessionPersistenceDisabled,
  getConversationAtisLatch,
  getConversationToolsUsed,
  getPlanSlugCache,
  registerCostStateRecorder,
  switchSession,
  setConversationAtisLatch,
  getRestoredMemoryPause,
  setRestoredMemoryPause,
  setMemoryToggledOff,
  getRestoredAutoMemoryOff,
  setRestoredAutoMemoryOff,
  setAutoMemoryOffThisSession,
  setCwdState,
  getCwdState,
  getCloudCwd,
  onCloudCwdChange,
  getProjectConfigRoot,
  setFlagSettingsInline,
  getFlagSettingsInline,
  getMcpConnectNonBlocking,
  setHasStreamingInput,
  setSingleShotPrintSession,
  deriveSingleShotPrintSession,
  takeUsageSinceLastResult,
  trackUsageSinceLastResult,
  setSdkOAuthTokenRefreshCallback,
  setHostAuthTokenRefreshCallback,
  getMainThreadAgentType,
  getMcpClientsFromAccessor,
  claimCostLedgerForCurrentSession,
  getLocalCommandExitCode,
  getSdkPerTaskStopAffordance,
  isParkedSpare,
  setMainLoopModelOverride,
  getMainLoopModelOverride,
  noteSystemPromptSectionInvalidation,
  isSingleShotPrintSession,
  isPrintInputClosed,
  setConnectedClientWiring,
  setMcpClientsAccessor,
  setMcpServerToolsSwapper,
  setReplBridgeActive,
  getInitJsonSchema,
  isReplBridgeActive,
  getHostRendersChromeSetupOffer,
  getHasStreamingInput,
  setAwaitsFirstRun,
  getStrictMcpConfig,
  getSyncedPluginReloadDebt,
  getSpareClaimState,
  getTotalCostUSD,
  getTotalAPIDuration,
  getModelUsage,
  getSafetyStops,
  getSessionCronTasks,
  getAdditionalDirectoriesForClaudeMd,
  setAdditionalDirectoriesForClaudeMd,
  getProjectRoot,
  isUnclaimedSpare,
  setSdkAgentProgressSummariesEnabled,
  markSpareClaimFailed,
  markPrintInputClosed,
  setMainThreadAgentType,
  setSdkPerTaskStopAffordance,
  setSdkRapidFollowupPreempt,
  setSdkForwardNestedSubagentToolCalls,
  setSessionSkillAllowlist,
  clearSystemPromptSectionState,
  setInitJsonSchema,
  setAllowedChannels,
  isRestrictedSession,
  getAllowedSettingSourcesAsConfigured,
  getAllowedSettingSources,
  setSessionTrustAccepted,
  getSessionApprovedMcpServers,
  setHomeTrustDialogAccepted,
  setHasDevChannels,
  isOTelInitPending,
  getMeterProvider,
  setStatsStore,
  handlePlanModeTransition,
  getToolsMachine,
  getConnectedClientWiring,
  getEnsureConnectedClient,
  setEnsureConnectedClient,
  getTeammateAgentId,
  getInlinePlugins,
  getInlinePluginsNoMcp,
  noteSdkHostHookAnswered,
  noteCredentialRoad,
  markDescriptorAnnouncementConsumed,
  setGatewayTokenFromDescriptor,
  setOauthTokenFromFd,
  setOauthTokenFromBgSnapshot,
  setOauthOrgFromBgSnapshot,
  setOauthScopesFromFd,
  wasDescriptorAnnouncementConsumed,
  getOauthTokenFromFd,
  getGatewayTokenFromDescriptor,
  getApiKeyFromFd,
  setApiKeyFromFd,
  setIsRemoteMode,
  getProjectRootOrNull,
  isLongContext1mCreditsBlocked,
  getServedModelsForRequestedModel,
  getStrictToolResultPairing,
  isOauthTokenFromBgSnapshot,
  getOauthOrgFromBgSnapshot,
  setSdkDialogHostActive,
  setSdkSupportedDialogKinds,
  getSdkSupportedDialogKinds,
  getLastPersonPrompt,
  setHostRendersChromeSetupOffer,
  getGatewayAuth,
  getSdkRapidFollowupPreempt,
  getInferenceProfileBackingModelCached,
  onProactivitySelectorGateChanged,
  swapMcpServerTools,
  getLaunchReplyGatePolicyOutcome,
  setAutoModeUnavailableStopNotice,
  setLocalCommandExitCode,
  getAutoModeUnavailableStopNotice,
  setLocalUploadsRoot,
  setTeardownUnwindRequested,
  getTeardownUnwindRequested,
  getSideQueryCostUSD,
  markSyncedPluginDirsLoadedHere,
  markSyncedPluginLaneOpened,
  hasRegisteredSyncedPluginDirs,
  getSyncedPluginRowId,
  getInlinePluginUrls,
  getSyncedPluginAttestation,
  setAttestedOfficialPluginIds,
  setLastSyncedLaneLoad,
  getSyncedPluginDirs,
  filesPlacedByNameRegistry,
  getDisableFileMentions,
  getSessionUploadsDirOverride,
  getLastInteractionTime,
  setThinkingDisplayExplicit,
  getRegisteredHooks,
  clearRegisteredHooks,
  registerHookCallbacks,
  getHostOtelState,
  getEventLoggerOwner,
  getEventLogger,
  getOTelWindowCloseCause,
  rewriteRefusalFallbackPreviousOverride,
  setInlinePlugins,
  setInlinePluginsNoMcp,
  setFlagSettingsExpectedContent,
  setFlagSettingsFilePinnedContent,
  setFlagSettingsPath,
  setParentManagedSettingsInvalid,
  setParentManagedSettings,
  setAllowedSettingSources,
  setRestrictedSession,
  getExtendedQuestionsEnabled,
  setReplyGatePolicy,
  setLaunchReplyGatePolicyRefused,
  setPrintOutputFormat,
  setSdkBetas,
  setProjectConfigRoot,
  setInlinePluginUrls,
  setIsInteractive,
  setSessionStartType,
  setClientType,
  setQuestionPreviewFormat,
  setExtendedQuestionsEnabled,
  setQuestionOptionDescriptionsOptional,
  setGatewayServerProcess,
  setOnboardingShownThisSession,
  getUserMsgOptIn,
  setOriginalCwd,
  setTeleportedSessionInfo,
  setScheduledTasksEnabled,
  getLocalUploadsRoot,
  inboundAttachmentDownloadRegistry,
  inboundAttachmentFileRegistry,
  getMainQueryRunning,
  getSessionIngressToken,
  setSessionIngressToken,
  isHomeDirectorySession,
  setLoopTickInFlightPrompt,
  recordLoopWakeFire,
  getLoopTickInFlightPrompt,
  getLoopTickInFlightPlugin,
  resetLoopWakeFires,
  getFlagAgentsFilePaths,
  getFlagMcpConfigFilePaths,
  getFlagSettingsPath,
  getParentManagedSettingsInvalid,
  releaseRefusalFallbackCarriedEffort,
  handleAutoModeTransition,
  setHasExitedPlanMode,
  setNeedsAutoModeExitAttachment,
  setSearchToolsOptIn,
  setTodoToolsOptIn,
  setToolsOmittedByLaunchList,
  getDisableSlashCommands,
  getLastSyncedLaneLoad,
  getLastCompleteSyncedPluginList,
  isGatewayAuthPinned,
  getSkillsSyncVetoed,
  notePersonPrompt,
  hasExitedPlanModeInSession,
  setNeedsPlanModeExitAttachment,
  needsPlanModeExitAttachment,
  needsAutoModeExitAttachment,
  getRootRegisteredHooks,
  getRootMainThreadAgentHooks,
  updateLastInteractionTime,
  getTotalDuration,
  flushInteractionTime,
  setMainLoopEffortState,
  setSkillsSyncVetoed,
  setAccountSkillsSyncEnabled,
  getProactivitySelectorGate,
  getProactivitySelectorGateEverOn,
  setMainThreadAgentHooks,
  latchRefusalFallbackModel,
  getInitialMainLoopModel,
  markRefusalFallbackHeaderArmed,
  getPrCounter,
  getPollEventIngress,
  getLastMainThreadCacheTtlMs,
  isGatewayHostHeldStrict,
  getFlagSettingsExpectedContent,
  getReplConfigArgv,
  getChromeFlagOverride,
  setReplConfigArgv,
  onInteraction,
  getLoggerProvider,
  getProgramUseCaseChoices,
  getProgramUseCaseChoiceMode,
  getTracerProvider,
  getCachedTelemetryResource,
  setCachedTelemetryResource,
  setTracerProvider,
  setLoggerProvider,
  setEventLogger,
  getCachedOtlpHttpAgentFactory,
  replaceMeterProvider,
  setCachedOtlpHttpAgentFactory,
  setRendererModeForAnalytics,
  getBearerPlan,
  getInheritedTeamName,
  setInheritedTeamName,
  getSessionCreatedTeams,
  onOriginalCwdChange,
  setSessionPersistenceDisabled,
  getPermissionScreenAnchor,
  getLastMainRequestId,
  getFlagSettingsFilePinnedContent,
  onPendingLoopWakeupChange,
  getPendingConversationEditKinds,
  isEffortMarkedUnsupported,
  getSessionTrustAccepted,
  getParentManagedSettings,
  getParentOrganizationSettings,
  getUseCoworkPlugins,
  isWorkspaceRestricted,
  getHomeTrustDialogAccepted,
  isGatewayServerProcess,
  isGatewayRequiredByHostPolicy,
  setGatewayAuth,
  holdGatewayHostStrict,
  preferThirdPartyAuthentication,
  getOauthScopesFromFd,
  getLoginStashedInTokenSlot,
  getSdkOAuthTokenRefreshCallback,
  dropAuthenticatedAccountForNewToken,
  setLoginStashedInTokenSlot,
  getAuthenticatedAccount,
  getCaps,
  getForkRestrictedLaunchConfig,
  getForkReplayLaunchConfig,
  clearBetaHeaderLatches,
  getAuthenticatedAccountEpoch,
  setSystemPromptSectionCacheEntry,
  clearInvokedSkillsForAgent,
  setLongContext1mCreditsBlocked,
  setUsageCreditsRequired,
  getSearchToolsOptIn,
  getLastMainThreadRequestAt,
  recordLastMainThreadCacheRenewal,
  forgetLastMainRequestId,
  getIsScrollDraining,
  getUnsupportedThreadKeys,
  isThreadsHeldForServerClassifier,
  getClientTruncatedAssistantIds,
  getHeldStatelessReplyIds,
  hasRefusalFallbackHeaderArmed,
  replaceRegisteredPluginHooks,
  getSessionBypassPermissionsMode,
  getAccountSkillsSyncEnabled,
  getPluginsSyncVetoed,
  getAccountPluginsSyncEnabled,
  hasSyncedPluginLaneOpened,
  markSyncedPluginDirNewHere,
  setSyncedPluginDirs,
  isSyncedPluginDirLoadedHere,
  getPluginHookRunner,
  isSyncedPluginDirUnused,
  getMainThreadAgentHooks,
  getBareMcpServerMatchersWarned,
  getAttestedOfficialPluginMarketplace,
  getSurfacedHookSpawnFailures,
  getStatsStore,
  takeSdkHostOutOfReachNote,
  getProjectDirForTools,
  emitHookStoresChanged,
  getAutoCompactWindowSurface,
  registerSessionCostSaver,
  costLedgerBelongsToCurrentSession,
  getTotalAPIDurationWithoutRetries,
  getTotalToolDuration,
  getTotalLinesAdded,
  getTotalLinesRemoved,
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
  getCodeEditToolDecisionCounter,
  getPolicyPredicateTelemetryEmitted,
  takeNoServerCheckAnnouncement,
  takeNoServerCheckStoppedTurn,
  takeServerClassifierFallbackAnnouncement,
  getObservedGateway,
  clearServerClassifierFallbackChoice,
  setServerClassifierFallbackChoice,
  getCachedClaudeMdContent,
  setLastClassifierRequests,
  getLastClassifierRequests,
  getWorkspaceRestriction,
  getClaudeMdAdditionalDirectoriesAsked,
  getMemoryToggledOff,
  getAutoMemoryOffThisSession,
  setCachedClaudeMdContent,
  onMemoryPauseChange,
  onAutoMemorySessionSwitchChange,
  getPromptIndex,
  getLastMainThreadCacheRenewedAt,
  addSafetyStop,
  getTeleportedSessionInfo,
  markFirstTeleportMessageLogged,
  consumePostCompaction,
  getLastApiCompletionTimestamp,
  setLastApiCompletionTimestamp,
  noteObservedGateway,
  addToTotalDurationState,
  getHostAuthTokenRefreshCallback,
  markPostCompaction,
  armPendingContextCompacted,
  getInvokedSkillsForAgent,
  updateInvokedSkillContent,
  getQuestionPreviewFormat,
  getQuestionOptionDescriptionsOptional,
  addInvokedSkill,
  stageResumeJournalSeed,
  getLastLiveMainThreadRequestAt,
  getInvokedSkills,
  setHasUnknownModelCost,
  getMainLoopBusy,
  isThinkingResumptionRefused,
  getDeferredToolStubGateLatch,
  setDeferredToolStubGateLatch,
  isToolProvenanceServerUrlRefused,
  markToolProvenanceServerUrlRefused,
  isUnderRestrictedWorkspaceRoot,
  addSessionCronTask,
  removeSessionCronTasks,
  addSideQueryCostUSD,
  setWizardOperatorToolsEnabled,
  getWizardOperatorToolsEnabled,
  getTodoToolsOptIn,
  getReplyGatePolicy,
  waitForScrollIdle,
  addToToolDuration,
  forgetMainChainOnHandOff,
  getLastSubmitTime,
  setPromptId,
  currentSession,
  getAgentContext,
  getHookHolder,
  defaultRootSession,
  agentContextGetter,
  setUseCoworkPlugins,
  gatewayServesManagedSettings,
  getLoopWakeFires,
  getScheduledTasksEnabled,
  onScheduledTasksEnabled,
  acquireMcpClientsAccessor,
  acquireMcpServerToolsSwapper,
  setGatewayRequiredByHostPolicyReader,
  onHookStoresChanged,
  getPendingBranchLinks,
  getCommitCounter,
  getPendingPrLinks,
  arrivingInboundFileRegistry,
  isContext1mMarkedRefused,
  markContext1mRefused,
  isToolChangeUnsupportedModel,
  getRefusedBetaHeaders,
  isGatewayAuthExpired,
  getCoworkEnrollment,
  getRefusalFallbackLatchOriginRequestId,
  programUseCaseAwaitsAccount,
  getProgramUseCaseId,
  setProgramUseCaseId,
  setProgramUseCaseRefusal,
  getProgramUseCaseRefusal,
  tokenAdoptedSinceStamp,
  setEntrypointOnRequests,
  setStartupPolicySnapshot,
  getStartupPolicySnapshot,
  getVimSharedState,
  setVimSharedState,
  getCliConfigBeyondSessionState,
  isOwnEventDeliveryRequested,
  isPollEventIngressWired,
  markPollEventWiringForRun,
  setOwnEventDeliveryHeld,
  getBackgroundAutoModeSetupInFlight,
  setBackgroundAutoModeSetupInFlight,
  setAuthenticatedAccount,
  setBearerPlan,
  unmarkBetaHeaderRefused,
  bufferPendingOTelEvent,
  isHostVerifiedGatewayAuth,
  getMemoryToolsShapeLatch,
  setMemoryToolsShapeLatch,
  clearInvokedSkills,
  setProjectRoot,
  resetInteractionBaseline,
  getCliSessionConfigCarried,
  getProposeGoalAvailabilityLogged,
  setProposeGoalAvailabilityLogged,
  setResolvedOrgDefault,
  setUserMsgOptIn,
  setFlagAgentsFilePaths,
  setDisableSlashCommands,
  setTeammateAgentId,
  setSessionBypassPermissionsMode,
  setFlagMcpConfigFilePaths,
  setChromeFlagOverride,
  setStrictMcpConfig,
  setCliSessionConfigCarried,
  setCliConfigBeyondSessionState,
  setForkRestrictedLaunchConfig,
  setForkReplayLaunchConfig,
  setPermissionPromptToolName,
  clearSyncedPluginDirs,
  markSpareParked,
  isRestrictedWorkspaceTrustKey,
  markScrollActivity,
  NOTIF_ACTIVE_THRESHOLD_MS,
  clearRefusalFallbackModelLatch,
  setCloudCwd,
  getOnboardingShownThisSession,
  setCaps,
  resetCostState,
  clearPendingContextCompacted,
  clearRefusalFallbackOccurred,
  onSessionCronsChange,
  filesPlacedByNameRead,
  getLastAPIRequest,
  getLastCancelledAPIMessageId,
  getTerminalFocus,
  setLastCancelledAPIMessageId,
  setMainLoopStatus,
  recordSubmitTime,
  setTerminalFocusForState,
  hasShownLspRecommendationThisSession,
  setLspRecommendationShownThisSession,
  markSpareClaiming,
  resetStartTime,
  markSpareClaimed,
  setInferenceProfileBackingModel,
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
  addSessionApprovedMcpServers,
  humanAttachmentDigestRegistry,
  getChromeAvailabilityStagesLogged,
  getWrapUpOfferedAtLaunch,
  isUserActiveForNotifications,
  setFilesPlacedByNameRead,
  getCcrSessionUrl,
  setWrapUpOfferedAtLaunch,
  setInitialMainLoopModel,
  setInitialModelSettingLayer,
  setInitialEnvDefaultModel,
  getInitialModelSettingLayer,
  inheritProactivitySelectorGateEverOn,
  setProactivitySelectorGate,
  resampleProactivitySelectorGate,
  replaceProactivityHostGateSubscription,
  getHasDevChannels,
  getCredentialRoad,
  setAdmin3PSteeringSnapshot,
  recordProbeRefutedDocumentDefault,
  getChromeAvailabilityAnchorMs,
  onTerminalFocusChange,
  announcePendingLoopWakeup,
  setLastAPIRequest,
  setLastAPIRequestMessages,
  addToTotalLinesChanged,
  getLocCounter,
  setMcpConnectNonBlocking,
  getAutoModeUnavailableResponse,
  getAutoModeUnavailableResponsesInARow,
  clearAutoModeUnavailableResponses,
  dropAutoModeUnavailableResponsesOfOtherTurns,
  noteAutoModeUnavailableResponse,
  markThreadsHeldForServerClassifier,
  getSdkDialogCapabilitySource,
  markRefusalFallbackOccurred,
  getAgentColorMap,
  incrementPromptIndex,
  setAccountPluginsSyncEnabled,
  setPluginsSyncVetoed,
  getActiveTimeCounter,
  getSessionSpawnedTeammatePanes,
  getRvSupervisorLinkLive,
  onRvSupervisorLinkChange,
  getAccountMemoryLaunchMode,
  getLoopEnded,
  getDirectConnectServerUrl,
  setSessionProject,
  resetFdCredentialState,
  setLoopEnded,
  getLoopConsecutiveKeepalives,
  setLoopConsecutiveKeepalives,
  deleteLoopChainStartedAt,
  getLoopChainStartedAt,
  setLoopChainStartedAt,
  saveSessionCostsForTransition,
  regenerateSessionId,
  isUsageCreditsRequired,
  hasUsageCreditsOnlyModelConsentSessionFallback,
  getUsageCreditsOnlyModelSessionConsentKey,
  setUsageCreditsOnlyModelConsentSessionFallback,
  setUsageCreditsOnlyModelSessionConsentKey,
  setAvailabilityFallbackChain,
  getAvailabilityFallbackChain,
  getProgramUseCaseOwner,
  setProgramUseCaseChoices,
  setProgramUseCaseChoiceMode,
  markSilentRefusalFallbackServerArmed,
  isSilentRefusalFallbackServerArmed,
  getFoundryDeploymentCapabilities,
  getRunnerDeclaredNestedRepositoryDiff,
  getRunnerDeclaredNoRepositoryCheckedOut,
  setRvSupervisorLinkLive,
  setAttacherCaps,
  setClaudeMdAdditionalDirectoriesAsked,
  resetModelStrings,
  clearStructuredOutputsUnsupported,
  clearContext1mRefused,
  isInteractivityDecided,
  isNoDialogLaunch,
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
