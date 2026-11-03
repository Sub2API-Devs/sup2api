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
  k,
  C,
  ManagedDocumentLinks,
  unlatchStickyBetaLatches,
  ManagedFileProtections,
  RepoTierFreeze,
  E,
  lEr,
} from "./stateSlices.js";
import {
  mergeProjectDirs,
  RuntimeModeSlice,
  SettingsSourcesSlice,
  PluginsAndChannelsSlice,
  ModelStringsSlice,
  DiagnosticsSlice,
  forkRootSessionWithProject,
  Je,
  Ve,
  xo,
  SessionRootSlot,
} from "./sessionSlices.js";
import { A, p7t } from "../utils/sessionUrl.js";
import { count } from "../utils/collections.js";
import { createSignal } from "../utils/signal.js";
import { SystemClock } from "../utils/sleep.js";
import { initialCwdKey, INITIAL_CWD_KEY, launchCwd, Fuo } from "../utils/cwd.js";
import { vLi, TLi, HostScoped } from "../utils/hostScoped.js";
import { Mr } from "../utils/agentId.js";

//@ chunk-ndmse9kj.js:60755-60848 sole-consumer
function createCaBundleSlots() {
  return { direct: { strict: null, customer: null }, proxied: { strict: null, customer: null } };
}
//@ chunk-ndmse9kj.js:60848-60955 affinity
function createDropReporterState() {
  return { rateTokens: null, rateLastRefillMs: null, featureOkLogged: !1, reportedDropReasons: new Set() };
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
  installMeter(e, n, { omitUnits: omitUnits = !1 } = {}) {
    this.#e = e;
    let r = (i) => (omitUnits ? void 0 : i);
    ((this.#t = n("claude_code.session.count", { description: "Count of CLI sessions started" })),
      (this.#n = n("claude_code.lines_of_code.count", {
        description:
          "Count of lines of code modified, with the 'type' attribute indicating whether lines were added or removed and the 'model' attribute indicating which model made the change",
      })),
      (this.#o = n("claude_code.pull_request.count", { description: "Number of pull requests created" })),
      (this.#r = n("claude_code.commit.count", { description: "Number of git commits created" })),
      (this.#s = n("claude_code.cost.usage", {
        description: "Cost of the Claude Code session",
        unit: r("USD"),
      })),
      (this.#i = n("claude_code.token.usage", { description: "Number of tokens used", unit: r("tokens") })),
      (this.#d = n("claude_code.code_edit_tool.decision", {
        description:
          "Count of code editing tool permission decisions (accept/reject) for Edit, Write, and NotebookEdit tools",
      })),
      (this.#u = n("claude_code.active_time.total", {
        description: "Total active time in seconds",
        unit: r("s"),
      })));
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
  replaceStatsStore(e) {
    this.#c = e;
  }
  loggerProvider() {
    return this.#l;
  }
  replaceLoggerProvider(e) {
    this.#l = e;
  }
  eventLogger() {
    return this.#p;
  }
  eventLoggerOwner() {
    return this.#h;
  }
  attachEventLogger(e, n) {
    if (((this.#p = e), (this.#h = e ? n : null), !e)) return;
    let o = this.#a;
    if (((this.#a = null), o)) for (let r of o) e.emit(r);
  }
  bufferPendingEvent(e) {
    if (this.#a === null || this.#a.length >= 100) return !1;
    return (this.#a.push(e), !0);
  }
  closeWindow(e) {
    ((this.#a = null), (this.#g = e));
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
  replaceMeterProvider(e) {
    this.#y = e;
  }
  tracerProvider() {
    return this.#v;
  }
  replaceTracerProvider(e) {
    this.#v = e;
  }
  cachedTelemetryResource() {
    return this.#f;
  }
  replaceCachedTelemetryResource(e) {
    this.#f = e;
  }
  cachedOtlpHttpAgentFactory(e, n) {
    return this.#m[e ? "proxied" : "direct"][n];
  }
  replaceCachedOtlpHttpAgentFactory(e, n, o) {
    this.#m[e ? "proxied" : "direct"][n] = o;
  }
  inClusterOtlpTrustRoots() {
    return this.#b;
  }
  replaceInClusterOtlpTrustRoots(e) {
    this.#b = e;
  }
  inClusterOtlpAgentFactory() {
    return this.#k;
  }
  replaceInClusterOtlpAgentFactory(e) {
    this.#k = e;
  }
  reset() {
    ((this.#e = null),
      (this.#t = null),
      (this.#n = null),
      (this.#o = null),
      (this.#r = null),
      (this.#s = null),
      (this.#i = null),
      (this.#d = null),
      (this.#u = null),
      (this.#c = null),
      (this.#l = null),
      (this.#p = null),
      (this.#h = null),
      (this.#a = []),
      (this.#g = null),
      (this.#S = createDropReporterState()),
      (this.#y = null),
      (this.#v = null),
      (this.#f = null),
      (this.#m = createCaBundleSlots()),
      (this.#b = null),
      (this.#k = null));
  }
}
//@ chunk-ndmse9kj.js:63812-66442 layout
class CredentialSlots {
  #e = void 0;
  #t = null;
  #n = void 0;
  #o = !1;
  #r = null;
  #s = null;
  #i = void 0;
  #d = void 0;
  #u = new Set();
  #c = new Map();
  #l = void 0;
  #p = null;
  #h = new Set();
  #a = null;
  #g = 0;
  #S = null;
  #y = !1;
  #v = () => !1;
  #f = null;
  #m = void 0;
  #b = null;
  #k = null;
  sessionIngressToken() {
    return this.#e;
  }
  replaceSessionIngressToken(e) {
    this.#e = e;
  }
  inferenceRequestToken() {
    return this.#t;
  }
  replaceInferenceRequestToken(e) {
    this.#t = e;
  }
  oauthTokenFromFd() {
    return this.#n;
  }
  replaceOauthTokenFromFd(e) {
    this.#n = e;
  }
  oauthTokenFromBgSnapshot() {
    return this.#o;
  }
  replaceOauthTokenFromBgSnapshot(e) {
    this.#o = e;
  }
  loginStashedInTokenSlot() {
    return this.#r;
  }
  replaceLoginStashedInTokenSlot(e) {
    this.#r = e;
  }
  oauthOrgFromBgSnapshot() {
    return this.#s;
  }
  replaceOauthOrgFromBgSnapshot(e) {
    this.#s = e;
  }
  oauthScopesFromFd() {
    return this.#i;
  }
  replaceOauthScopesFromFd(e) {
    this.#i = e;
  }
  apiKeyFromFd() {
    return this.#d;
  }
  replaceApiKeyFromFd(e) {
    this.#d = e;
  }
  descriptorAnnouncementConsumed(e) {
    return this.#u.has(e);
  }
  markDescriptorAnnouncementConsumed(e) {
    this.#u.add(e);
  }
  credentialRoad(e) {
    return this.#c.get(e);
  }
  noteCredentialRoad(e, n, o) {
    if (o !== null && !this.#c.has(e)) this.#c.set(e, n);
  }
  gatewayTokenFromDescriptor() {
    return this.#l;
  }
  replaceGatewayTokenFromDescriptor(e) {
    this.#l = e;
  }
  resetFdCredentialState() {
    ((this.#e = void 0),
      (this.#n = void 0),
      (this.#o = !1),
      (this.#r = null),
      (this.#s = null),
      (this.#i = void 0),
      (this.#d = void 0));
  }
  gatewayAuth() {
    return this.#p;
  }
  replaceGatewayAuth(e) {
    this.#p = e;
  }
  isGatewayHostHeldStrict(e) {
    return this.#h.has(e);
  }
  holdGatewayHostStrict(e) {
    this.#h.add(e);
  }
  releaseGatewayHost(e) {
    this.#h.delete(e);
  }
  gatewayServerProcess() {
    return this.#y;
  }
  replaceGatewayServerProcess(e) {
    this.#y = e;
  }
  gatewayRequiredByHostPolicy() {
    return this.#v();
  }
  replaceGatewayRequiredByHostPolicyReader(e) {
    this.#v = e;
  }
  authenticatedAccount() {
    return this.#a;
  }
  authenticatedAccountEpoch() {
    return this.#g;
  }
  stampAuthenticatedAccount(e) {
    let n = this.#a;
    if (
      e !== null &&
      n !== null &&
      e.accountUuid === n.accountUuid &&
      e.emailAddress === n.emailAddress &&
      e.organizationUuid === n.organizationUuid
    )
      return;
    ((this.#g += 1), (this.#a = e), (this.#S = null));
  }
  bearerPlan() {
    return this.#S;
  }
  replaceBearerPlan(e) {
    this.#S = e;
  }
  startupPolicySnapshot() {
    return this.#m;
  }
  replaceStartupPolicySnapshot(e) {
    this.#m = e;
  }
  gatewayRefreshInFlight() {
    return this.#f;
  }
  replaceGatewayRefreshInFlight(e) {
    this.#f = e;
  }
  sdkOAuthTokenRefreshCallback() {
    return this.#b;
  }
  replaceSdkOAuthTokenRefreshCallback(e) {
    this.#b = e;
  }
  hostAuthTokenRefreshCallback() {
    return this.#k;
  }
  replaceHostAuthTokenRefreshCallback(e) {
    this.#k = e;
  }
  resetForTests() {
    ((this.#e = null),
      (this.#t = null),
      (this.#n = null),
      (this.#o = !1),
      (this.#r = null),
      (this.#i = void 0),
      (this.#d = null),
      this.#u.clear(),
      this.#c.clear(),
      (this.#l = void 0),
      (this.#p = null),
      this.#h.clear(),
      (this.#a = null),
      (this.#g = 0),
      (this.#S = null),
      (this.#y = !1),
      (this.#v = () => !1),
      (this.#f = null),
      (this.#m = void 0),
      (this.#b = null),
      (this.#k = null));
  }
}
//@ chunk-ndmse9kj.js:66442-66825 file-local
class McpProcessWiring {
  #e = void 0;
  #t = !1;
  #n = !1;
  #o;
  directConnectServerUrl() {
    return this.#e;
  }
  replaceDirectConnectServerUrl(e) {
    this.#e = e;
  }
  connectNonBlocking() {
    return this.#t;
  }
  replaceConnectNonBlocking(e) {
    this.#t = e;
  }
  strictConfig() {
    return this.#n;
  }
  replaceStrictConfig(e) {
    this.#n = e;
  }
  registerEnsureConnectedClient(e) {
    this.#o = e;
  }
  ensureConnectedClient() {
    return this.#o;
  }
  reset() {
    ((this.#e = void 0), (this.#t = !1), (this.#n = !1));
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
  #u = !1;
  #c = !1;
  #l = !1;
  #p = !1;
  #h = !1;
  #a = !1;
  #g = !1;
  #S = !1;
  #y = !1;
  #v = new Set();
  #f = !1;
  #m = new Set();
  #b = !1;
  #k = !1;
  #R = !1;
  #x = !1;
  #C = new Map();
  #P = void 0;
  #T = void 0;
  #w = !1;
  #A = void 0;
  #L = !1;
  #M = !1;
  #O = void 0;
  #F = void 0;
  #I = new Map();
  #E = new Map();
  promptCache1hAllowlist() {
    return this.#e;
  }
  replacePromptCache1hAllowlist(e) {
    this.#e = e;
  }
  thinkingTypeOverrides() {
    return this.#t;
  }
  recordThinkingTypeOverride(e, n) {
    this.#t.set(e, n);
  }
  servedModelsByRequestedModel() {
    return this.#n;
  }
  recordServedModels(e, n) {
    this.#n.set(e, n);
  }
  effortUnsupportedModels() {
    return this.#o;
  }
  markEffortUnsupported(e) {
    this.#o.add(e);
  }
  structuredOutputsUnsupportedModels() {
    return this.#r;
  }
  markStructuredOutputsUnsupported(e) {
    this.#r.add(e);
  }
  clearStructuredOutputsUnsupported() {
    this.#r = new Set();
  }
  context1mRefusedModels() {
    return this.#s;
  }
  markContext1mRefused(e) {
    this.#s.add(e);
  }
  clearContext1mRefused() {
    this.#s = new Set();
  }
  refusedBetas(e) {
    return this.#i.get(e) ?? [];
  }
  markBetaRefused(e, n) {
    let o = this.#i.get(e);
    if (o) o.add(n);
    else this.#i.set(e, new Set([n]));
  }
  learnedEffortCaps() {
    return this.#d;
  }
  midConvCachePromotionRejected() {
    return this.#u;
  }
  markMidConvCachePromotionRejected() {
    this.#u = !0;
  }
  perTurnEffortOkEmitted() {
    return this.#c;
  }
  markPerTurnEffortOkEmitted() {
    this.#c = !0;
  }
  lateToolAdditionsOkEmitted() {
    return this.#l;
  }
  markLateToolAdditionsOkEmitted() {
    this.#l = !0;
  }
  toolResultScreeningOkEmitted() {
    return this.#p;
  }
  markToolResultScreeningOkEmitted() {
    this.#p = !0;
  }
  toolChangeHeaderRefused() {
    return this.#h;
  }
  markToolChangeHeaderRefused() {
    this.#h = !0;
  }
  promptEndMarkRefused() {
    return this.#a;
  }
  markPromptEndMarkRefused() {
    this.#a = !0;
  }
  inlineToolsRefused() {
    return this.#g;
  }
  markInlineToolsRefused() {
    this.#g = !0;
  }
  inlineToolsOkEmitted() {
    return this.#S;
  }
  markInlineToolsOkEmitted() {
    this.#S = !0;
  }
  thinkingResumptionRefused() {
    return this.#y;
  }
  markThinkingResumptionRefused() {
    this.#y = !0;
  }
  refusedBetaHeaders() {
    return this.#v;
  }
  markBetaHeaderRefused(e) {
    this.#v.add(e);
  }
  thinkingHighlightsRefused() {
    return this.#f;
  }
  markThinkingHighlightsRefused() {
    this.#f = !0;
  }
  toolChangeUnsupportedModels() {
    return this.#m;
  }
  markToolChangeUnsupportedModel(e) {
    this.#m.add(e);
  }
  internalModelFieldsRefused() {
    return this.#b;
  }
  markInternalModelFieldsRefused() {
    this.#b = !0;
  }
  internalModelFieldsRefusalAnnounced() {
    return this.#k;
  }
  markInternalModelFieldsRefusalAnnounced() {
    this.#k = !0;
  }
  thirdPartyServerClassifierRefused() {
    return this.#R;
  }
  markThirdPartyServerClassifierRefused() {
    this.#R = !0;
  }
  releaseThirdPartyServerClassifierRefusal() {
    this.#R = !1;
  }
  threadsHeldForServerClassifier() {
    return this.#x;
  }
  markThreadsHeldForServerClassifier() {
    this.#x = !0;
  }
  autoModeUnavailableResponse(e) {
    return this.#C.get(e);
  }
  autoModeUnavailableResponsesInARow(e) {
    let n = 0;
    for (let o of this.#C.values()) if (o.runKey === e) n++;
    return n;
  }
  dropAutoModeUnavailableResponsesOfOtherTurns(e, n) {
    for (let [o, r] of this.#C) if (r.runKey === e && r.turn !== void 0 && r.turn !== n) this.#C.delete(o);
  }
  noteAutoModeUnavailableResponse(e, n) {
    this.#C.set(e, n);
  }
  clearAutoModeUnavailableResponses(e) {
    for (let [n, o] of this.#C) if (o.runKey === e) this.#C.delete(n);
  }
  setAutoModeUnavailableStopNotice(e) {
    this.#P = e;
  }
  autoModeUnavailableStopNotice() {
    return this.#P;
  }
  setLocalCommandExitCode(e) {
    this.#T = e;
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
  setServerClassifierFallbackChoice(e) {
    this.#F = e;
  }
  clearServerClassifierFallbackChoice() {
    this.#F = void 0;
  }
  noteObservedGateway(e) {
    this.#O ??= e;
  }
  takeServerClassifierFallbackAnnouncement() {
    if (!this.#R || this.#w) return !1;
    return ((this.#w = !0), !0);
  }
  noteNoServerCheck(e) {
    if (this.#A !== void 0) return !1;
    return ((this.#A = e), !0);
  }
  noteNoServerCheckStoppedTurn() {
    this.#M = !0;
  }
  takeNoServerCheckStoppedTurn() {
    let e = this.#M;
    return ((this.#M = !1), e);
  }
  takeNoServerCheckAnnouncement() {
    if (this.#L || this.#A === void 0) return;
    return ((this.#L = !0), this.#A);
  }
  inferenceProfileBackingModels() {
    return this.#I;
  }
  recordInferenceProfileBackingModel(e, n) {
    this.#I.set(e, n);
  }
  foundryDeploymentCapabilities() {
    return this.#E;
  }
  reset() {
    ((this.#e = null),
      (this.#t = new Map()),
      (this.#n = new Map()),
      (this.#o = new Set()),
      (this.#r = new Set()),
      (this.#s = new Set()),
      (this.#i = new Map()),
      (this.#d = new Map()),
      (this.#u = !1),
      (this.#c = !1),
      (this.#l = !1),
      (this.#p = !1),
      (this.#h = !1),
      (this.#a = !1),
      (this.#g = !1),
      (this.#S = !1),
      (this.#y = !1),
      (this.#v = new Set()),
      (this.#f = !1),
      (this.#m = new Set()),
      (this.#b = !1),
      (this.#k = !1),
      (this.#R = !1),
      (this.#x = !1),
      this.#C.clear(),
      (this.#P = void 0),
      (this.#T = void 0),
      (this.#w = !1),
      (this.#A = void 0),
      (this.#L = !1),
      (this.#M = !1),
      (this.#O = void 0),
      (this.#F = void 0),
      (this.#I = new Map()),
      (this.#E = new Map()));
  }
}
//@ chunk-ndmse9kj.js:71171-71395 layout
class AccountCreditLatches {
  #e = !1;
  #t = !1;
  longContext1mCreditsBlocked() {
    return this.#e;
  }
  replaceLongContext1mCreditsBlocked(e) {
    this.#e = e;
  }
  usageCreditsRequired() {
    return this.#t;
  }
  replaceUsageCreditsRequired(e) {
    this.#t = e;
  }
  reset() {
    ((this.#e = !1), (this.#t = !1));
  }
}
//@ chunk-ndmse9kj.js:71395-71849 layout
class ProactivityState {
  #e = !1;
  #t = !1;
  #n = noop;
  #o = createSignal();
  selectorGate() {
    return this.#e;
  }
  selectorGateEverOn() {
    return this.#t;
  }
  replaceSelectorGate(e) {
    ((this.#e = e), (this.#t ||= e));
  }
  inheritSelectorGateEverOn() {
    this.#t = !0;
  }
  resampleSelectorGate(e) {
    let n = this.#e;
    if (((this.#e = e), (this.#t ||= e), n !== e)) this.#o.emit(e);
  }
  subscribeSelectorGateChanged(e) {
    return this.#o.subscribe(e);
  }
  replaceHostGateSubscription(e) {
    let n = this.#n;
    ((this.#n = e), n());
  }
  dropHostGateSubscription() {
    this.replaceHostGateSubscription(noop);
  }
}
//@ chunk-ndmse9kj.js:71849-71864 layout
function noop() {}
//@ chunk-ndmse9kj.js:71864-72043 layout
class BackgroundHousekeeping {
  started = !1;
  stagingReaped = !1;
  claim() {
    if (this.started) return !1;
    return ((this.started = !0), !0);
  }
  claimStagingReap() {
    if (this.stagingReaped) return !1;
    return ((this.stagingReaped = !0), !0);
  }
}
/**
 * 进程级 host 状态容器：clock、backgroundHousekeeping、launchOptions、settingsSource、extensionsConfig、modelStringsCache、diagnostics、telemetryHandles、credentialSlots、mcpProcessWiring、requestLatches、accountCreditLatches、proactivity。
 */
//@ chunk-ndmse9kj.js:72043-72768 layout
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
  constructor(e) {
    ((this.clock = e.clock),
      (this.backgroundHousekeeping = e.backgroundHousekeeping),
      (this.launchOptions = e.launchOptions),
      (this.settingsSource = e.settingsSource),
      (this.extensionsConfig = e.extensionsConfig),
      (this.modelStringsCache = e.modelStringsCache),
      (this.diagnostics = e.diagnostics),
      (this.telemetryHandles = e.telemetryHandles),
      (this.credentialSlots = e.credentialSlots),
      (this.mcpProcessWiring = e.mcpProcessWiring),
      (this.requestLatches = e.requestLatches),
      (this.accountCreditLatches = e.accountCreditLatches),
      (this.proactivity = e.proactivity));
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
/**
 * 创建 root 会话：host=新 HostState，id=CLAUDE_CODE_SESSION_ID 等给定值或新 UUID，originalCwd/projectRoot/cwd 都是启动目录。
 */
//@ chunk-ndmse9kj.js:73094-73199 layout
function createRootSession(e = initialCwdKey()) {
  return forkRootSessionWithProject({
    host: createHostState(),
    id: p7t() ?? randomUUID(),
    project: { originalCwd: e, projectRoot: e, cwd: e },
  });
}
/**
 * 进程默认 root 会话（模块加载时创建）。
 */
//@ chunk-ndmse9kj.js:73199-73213 layout
var defaultRootSession = createRootSession(INITIAL_CWD_KEY);
/**
 * getRootSession：返回当前会话（currentSession 的导出别名）。
 */
//@ chunk-ndmse9kj.js:73213-73237 facade-majority
function getRootSession() {
  return currentSession();
}
/**
 * 当前会话：异步上下文（子代理/teammate 等）里有 session 用它，否则用默认 root 会话。几乎所有状态访问器都经它取值。
 */
//@ chunk-ndmse9kj.js:73237-73273 layout
function currentSession() {
  return agentContextGetter()?.session ?? defaultRootSession;
}
/**
 * 在进程默认 root 会话的 host 上取 HostScoped 槽位的值（进程级单例状态）。
 */
//@ chunk-ndmse9kj.js:73273-73308 facade-majority
function onProcessRootHost(e) {
  return e.of(defaultRootSession.host);
}
/**
 * 异步上下文里的会话覆盖对象（无 session 字段的旧式覆盖：sessionId、originalCwd、cachedClaudeMdContent…）。
 */
//@ chunk-ndmse9kj.js:73308-73358 layout
function getAgentContext() {
  let e = agentContextGetter();
  return e?.session ? void 0 : e;
}
//@ chunk-ndmse9kj.js:73358-73377 layout
var agentContextGetter = () => {
  return;
};
/**
 * 注入“会话覆盖对象”读取器（AsyncLocalStorage 取值函数），子代理/teammate 借此让 getSessionId 等返回自己的值。
 */
//@ chunk-ndmse9kj.js:73377-73397 facade-majority
function setSessionOverridesGetter(e) {
  agentContextGetter = e;
}
//@ chunk-ndmse9kj.js:73397-73436 layout
Je((e) => Ve.of(currentSession().host).reporter?.(e));
//@ chunk-ndmse9kj.js:73436-73537 layout
vLi({
  isDiskless: () => isDiskless(),
  isDisklessProcess: () => isDisklessProcess(),
  reportBuilt: (e) => TLi.of(currentSession().host).reporter?.(e),
});
/**
 * getSessionId：覆盖对象的 sessionId，否则当前会话 id。
 */
//@ chunk-ndmse9kj.js:73537-73580 facade-majority
function getSessionId() {
  return getAgentContext()?.sessionId ?? currentSession().id;
}
/**
 * 会话状态函数 mainAgentId：优先取异步上下文覆盖对象的 sessionId；
 */
//@ chunk-ndmse9kj.js:73580-73679 facade-majority
function mainAgentId() {
  let e = getAgentContext()?.sessionId;
  if (e) return Mr(e);
  let n = currentSession();
  return n.identity.mainAgentId(n.id);
}
//@ chunk-ndmse9kj.js:73679-73801 layout
function hasSessionActivity() {
  let e = currentSession();
  return e.requestJournal.promptIndex() > 0 || e.sessionScratch.chromeAvailabilityStagesLogged().size > 0;
}
/**
 * regenerateSessionId：/clear 等场景换新会话 id；清除每会话缓存（plan slug、最后请求、拒答回退等），可把旧 id 设为 parent，发出 clear 会话切换事件。
 */
//@ chunk-ndmse9kj.js:73801-74496 facade-majority
function regenerateSessionId(e = {}) {
  let n = currentSession(),
    id = n.id;
  (n.sessionScratch.forgetPlanSlug(id), n.identity.replaceProjectDir(null));
  let r = hasSessionActivity();
  (n.requestJournal.replacePromptIndex(0),
    n.requestJournal.replaceLastPersonPrompt(null),
    n.requestJournal.replaceLastCancelledAPIMessageId(null),
    n.requestJournal.clearLastMainThreadRequest(),
    n.requestJournal.replaceLastMainRequestId(void 0, void 0),
    n.modelSelection.forgetRefusalFallbackOccurred(),
    n.sessionFlags.forgetPendingContextCompacted(),
    n.sessionScratch.replacePendingBranchLinks(),
    n.sessionScratch.replaceChromeAvailabilityStagesLogged(r));
  let i = restoreModelOnSessionTransition(),
    s = e.next ?? randomUUID();
  return (
    n.costLedger.scopeTo(s),
    n.update({ id: s, ...(e.setCurrentAsParent && { parentId: id }) }),
    emitSessionSwitch(n, "clear", i),
    n.id
  );
}
//@ chunk-ndmse9kj.js:74496-74572 layout
function emitSessionSwitch(e, n, o) {
  let of = sessionSwitchListeners.of(e);
  if (o) of.emit(e.id, n, o);
  else of.emit(e.id, n);
}
//@ chunk-ndmse9kj.js:74572-74620 layout
function emitOriginalCwdChanged(e) {
  originalCwdListeners.of(e).emit(xo(e).originalCwd);
}
/**
 * 会话状态函数 getParentSessionId：涉及当前会话的 parentId。
 */
//@ chunk-ndmse9kj.js:74620-74685 facade-majority
function getParentSessionId() {
  let e = getAgentContext();
  return e ? e.parentSessionId : currentSession().parentId;
}
/**
 * switchSession：切到给定会话 id（resume/fork），重置每会话缓存（fork 时保留最后主请求 id），可同时更新 project 目录。
 */
//@ chunk-ndmse9kj.js:74685-75381 facade-majority
function switchSession(e, n, o = null, r) {
  let i = currentSession(),
    s = r ? mergeProjectDirs(i.project, asProjectPatch(r)) : r,
    a,
    parentId = i.parentId;
  if (i.id !== e) {
    if (
      (i.sessionScratch.forgetPlanSlug(i.id),
      i.requestJournal.replaceLastCancelledAPIMessageId(null),
      i.requestJournal.replaceLastPersonPrompt(null),
      i.requestJournal.clearLastMainThreadRequest(e),
      n !== "fork")
    )
      i.requestJournal.replaceLastMainRequestId(void 0, void 0);
    (i.modelSelection.forgetRefusalFallbackOccurred(),
      i.sessionFlags.forgetPendingContextCompacted(),
      i.sessionScratch.replacePendingBranchLinks(),
      i.sessionScratch.replaceChromeAvailabilityStagesLogged(hasSessionActivity()),
      (a = restoreModelOnSessionTransition()),
      (parentId = void 0));
  }
  if (
    (i.identity.replaceProjectDir(o),
    i.update({ id: e, parentId: parentId, ...(s !== void 0 && { project: s }) }),
    emitSessionSwitch(i, n, a),
    r?.originalCwd !== void 0)
  )
    emitOriginalCwdChanged(i);
}
//@ chunk-ndmse9kj.js:75381-75858 layout
function restoreModelOnSessionTransition() {
  let e = currentSession(),
    refusalFallbackModelLatch = e.modelSelection.refusalFallbackModelLatch();
  if (
    (e.modelSelection.unlatchRefusalFallbackModel("session_transition"),
    !refusalFallbackModelLatch ||
      e.modelSelection.mainLoopModelOverride() !== refusalFallbackModelLatch.fallbackModel)
  )
    return;
  return (
    e.modelSelection.overrideMainLoopModel(refusalFallbackModelLatch.previousOverride),
    {
      appStateModel: refusalFallbackModelLatch.previousAppStateModel,
      forSessionValue: refusalFallbackModelLatch.previousModelForSession,
      overrideValue: refusalFallbackModelLatch.previousOverride,
      restoredToExplicitOverride: refusalFallbackModelLatch.previousOverride !== void 0,
      fallbackModel: refusalFallbackModelLatch.fallbackModel,
    }
  );
}
//@ chunk-ndmse9kj.js:75858-75882 layout
var sessionSwitchListeners = new SessionRootSlot(() => createSignal());
/**
 * 订阅会话切换（regenerateSessionId/switchSession 时触发，参数含原因与恢复的模型）。
 */
//@ chunk-ndmse9kj.js:75882-75928 facade-majority
function onSessionSwitch(e) {
  return sessionSwitchListeners.of(currentSession()).subscribe(e);
}
/**
 * 状态访问器：读取当前会话的 会话暂存（sessionScratch） 上的 humanAttachmentDigests()。
 */
//@ chunk-ndmse9kj.js:75928-75994 facade-majority
function humanAttachmentDigestRegistry() {
  return currentSession().sessionScratch.humanAttachmentDigests();
}
/**
 * 状态访问器：读取当前会话的 会话暂存（sessionScratch） 上的 inboundAttachmentFiles()。
 */
//@ chunk-ndmse9kj.js:75994-76060 facade-majority
function inboundAttachmentFileRegistry() {
  return currentSession().sessionScratch.inboundAttachmentFiles();
}
/**
 * 状态访问器：读取当前会话的 会话暂存（sessionScratch） 上的 filesPlacedByName()。
 */
//@ chunk-ndmse9kj.js:76060-76121 facade-majority
function filesPlacedByNameRegistry() {
  return currentSession().sessionScratch.filesPlacedByName();
}
/**
 * 状态访问器：读取当前会话的 会话暂存（sessionScratch） 上的 filesPlacedByNameRead()。
 */
//@ chunk-ndmse9kj.js:76121-76186 facade-majority
function filesPlacedByNameRead() {
  return currentSession().sessionScratch.filesPlacedByNameRead();
}
/**
 * 状态访问器：调用当前会话的 会话暂存（sessionScratch） 上的 setFilesPlacedByNameRead()。
 */
//@ chunk-ndmse9kj.js:76186-76249 facade-majority
function setFilesPlacedByNameRead(e) {
  currentSession().sessionScratch.setFilesPlacedByNameRead(e);
}
/**
 * 状态访问器：读取当前会话的 会话暂存（sessionScratch） 上的 inboundAttachmentDownloads()。
 */
//@ chunk-ndmse9kj.js:76249-76319 facade-majority
function inboundAttachmentDownloadRegistry() {
  return currentSession().sessionScratch.inboundAttachmentDownloads();
}
/**
 * 状态访问器：读取当前会话的 会话暂存（sessionScratch） 上的 arrivingInboundFiles()。
 */
//@ chunk-ndmse9kj.js:76319-76383 facade-majority
function arrivingInboundFileRegistry() {
  return currentSession().sessionScratch.arrivingInboundFiles();
}
/**
 * 会话状态函数 getSessionProjectDir：涉及当前会话的 identity.projectDir。
 */
//@ chunk-ndmse9kj.js:76383-76463 facade-majority = getSessionProjectDir (0.624)
function getSessionProjectDir() {
  let e = getAgentContext();
  return e ? e.sessionProjectDir : currentSession().identity.projectDir();
}
/**
 * 会话状态函数 getOriginalCwd：优先取异步上下文覆盖对象的 originalCwd；
 */
//@ chunk-ndmse9kj.js:76463-76522 facade-majority
function getOriginalCwd() {
  return getAgentContext()?.originalCwd ?? xo(currentSession()).originalCwd;
}
/**
 * 会话状态函数 getOriginalCwdOrNull：优先取异步上下文覆盖对象的 originalCwd；涉及当前会话的 project。
 */
//@ chunk-ndmse9kj.js:76522-76609 facade-majority
function getOriginalCwdOrNull() {
  if (getAgentContext()?.originalCwd === void 0 && currentSession().project === null) return null;
  return getOriginalCwd();
}
/**
 * 权限界面锚点目录（委托 oLt）。
 */
//@ chunk-ndmse9kj.js:76609-76636 facade-majority
function getPermissionScreenAnchor() {
  return launchCwd();
}
/**
 * 当前会话是否在 home 目录启动（originalCwd 等于主目录）。
 */
//@ chunk-ndmse9kj.js:76636-76669 facade-majority
function isHomeDirectorySession() {
  return getOriginalCwd() === homedir();
}
/**
 * 会话状态函数 getProjectRoot：优先取异步上下文覆盖对象的 projectRoot；
 */
//@ chunk-ndmse9kj.js:76669-76728 facade-majority = getProjectRoot (1)
function getProjectRoot() {
  return getAgentContext()?.projectRoot ?? xo(currentSession()).projectRoot;
}
/**
 * 会话状态函数 getProjectRootOrNull：优先取异步上下文覆盖对象的 projectRoot；涉及当前会话的 project。
 */
//@ chunk-ndmse9kj.js:76728-76815 facade-majority
function getProjectRootOrNull() {
  if (getAgentContext()?.projectRoot === void 0 && currentSession().project === null) return null;
  return getProjectRoot();
}
//@ chunk-ndmse9kj.js:76815-76839 layout
function asProjectPatch(e) {
  return e;
}
/**
 * 更新会话的 project（originalCwd/projectRoot/cwd 三者合并），originalCwd 变化时发事件。
 */
//@ chunk-ndmse9kj.js:76839-76923 facade-majority
function setSessionProject(e) {
  let n = currentSession();
  if ((n.update({ project: asProjectPatch(e) }), e.originalCwd !== void 0)) emitOriginalCwdChanged(n);
}
/**
 * setOriginalCwd：只改 originalCwd。
 */
//@ chunk-ndmse9kj.js:76923-76959 facade-majority = setOriginalCwd (0.445)
function setOriginalCwd(cwd) {
  setSessionProject({ originalCwd: cwd });
}
//@ chunk-ndmse9kj.js:76959-76983 layout
var originalCwdListeners = new SessionRootSlot(() => createSignal());
/**
 * 订阅 originalCwd 变化。
 */
//@ chunk-ndmse9kj.js:76983-77030 facade-majority
function onOriginalCwdChange(e) {
  return originalCwdListeners.of(currentSession()).subscribe(e);
}
/**
 * setProjectRoot：只改 projectRoot。
 */
//@ chunk-ndmse9kj.js:77030-77067 facade-majority = getProjectRoot (1)
function setProjectRoot(e) {
  setSessionProject({ projectRoot: e });
}
/**
 * getCwdState：当前会话 project.cwd（无 project 时抛 NoProjectDirectoryError）。
 */
//@ chunk-ndmse9kj.js:77067-77100 facade-majority
function getCwdState() {
  return xo(currentSession()).cwd;
}
/**
 * setCwdState：只改 cwd。
 */
//@ chunk-ndmse9kj.js:77100-77129 facade-majority
function setCwdState(e) {
  setSessionProject({ cwd: e });
}
/**
 * 状态访问器：调用当前会话的 费用账本（costLedger） 上的 restartClock()。
 */
//@ chunk-ndmse9kj.js:77129-77174 facade-majority
function resetStartTime() {
  currentSession().costLedger.restartClock();
}
/**
 * 状态访问器：读取当前会话的 费用账本（costLedger） 上的 sessionStartTime()。
 */
//@ chunk-ndmse9kj.js:77174-77230 facade-majority
function getSessionStartTime() {
  return currentSession().costLedger.sessionStartTime();
}
/**
 * 状态访问器：读取当前会话的 host（host） → MCP 进程接线（mcpProcessWiring） 上的 directConnectServerUrl()。
 */
//@ chunk-ndmse9kj.js:77230-77303 facade-majority = getDirectConnectServerUrl (0.7)
function getDirectConnectServerUrl() {
  return currentSession().host.mcpProcessWiring.directConnectServerUrl();
}
/**
 * 状态访问器：读取当前会话的 host（host） → MCP 进程接线（mcpProcessWiring） 上的 connectNonBlocking()。
 */
//@ chunk-ndmse9kj.js:77303-77372 facade-majority
function getMcpConnectNonBlocking() {
  return currentSession().host.mcpProcessWiring.connectNonBlocking();
}
/**
 * 状态访问器：写入当前会话的 host（host） → MCP 进程接线（mcpProcessWiring） 上的 replaceConnectNonBlocking()。
 */
//@ chunk-ndmse9kj.js:77372-77443 facade-majority
function setMcpConnectNonBlocking(e) {
  currentSession().host.mcpProcessWiring.replaceConnectNonBlocking(e);
}
/**
 * 状态访问器：读取当前会话的 会话标志（sessionFlags） 上的 teardownUnwindRequested()。
 */
//@ chunk-ndmse9kj.js:77443-77508 facade-majority
function getTeardownUnwindRequested() {
  return currentSession().sessionFlags.teardownUnwindRequested();
}
/**
 * 状态访问器：写入当前会话的 会话标志（sessionFlags） 上的 replaceTeardownUnwindRequested()。
 */
//@ chunk-ndmse9kj.js:77508-77575 facade-majority
function setTeardownUnwindRequested(e) {
  currentSession().sessionFlags.replaceTeardownUnwindRequested(e);
}
/**
 * 状态访问器：读取当前会话的 会话标志（sessionFlags） 上的 backgroundAutoModeSetupInFlight()。
 */
//@ chunk-ndmse9kj.js:77575-77648 facade-majority
function getBackgroundAutoModeSetupInFlight() {
  return currentSession().sessionFlags.backgroundAutoModeSetupInFlight();
}
/**
 * 状态访问器：写入当前会话的 会话标志（sessionFlags） 上的 replaceBackgroundAutoModeSetupInFlight()。
 */
//@ chunk-ndmse9kj.js:77648-77723 facade-majority
function setBackgroundAutoModeSetupInFlight(e) {
  currentSession().sessionFlags.replaceBackgroundAutoModeSetupInFlight(e);
}
/**
 * 状态访问器：读取当前会话的 会话标志（sessionFlags） 上的 deferredToolStubGateLatch()。
 */
//@ chunk-ndmse9kj.js:77723-77790 facade-majority
function getDeferredToolStubGateLatch() {
  return currentSession().sessionFlags.deferredToolStubGateLatch();
}
/**
 * 状态访问器：写入当前会话的 会话标志（sessionFlags） 上的 replaceDeferredToolStubGateLatch()。
 */
//@ chunk-ndmse9kj.js:77790-77859 facade-majority
function setDeferredToolStubGateLatch(e) {
  currentSession().sessionFlags.replaceDeferredToolStubGateLatch(e);
}
/**
 * 状态访问器：读取当前会话的 会话标志（sessionFlags） 上的 verifySkillRolloutGateLatch()。
 */
//@ chunk-ndmse9kj.js:77859-77928 facade-majority
function getVerifySkillRolloutGateLatch() {
  return currentSession().sessionFlags.verifySkillRolloutGateLatch();
}
/**
 * 状态访问器：写入当前会话的 会话标志（sessionFlags） 上的 replaceVerifySkillRolloutGateLatch()。
 */
//@ chunk-ndmse9kj.js:77928-77999 facade-majority
function setVerifySkillRolloutGateLatch(e) {
  currentSession().sessionFlags.replaceVerifySkillRolloutGateLatch(e);
}
/**
 * 状态访问器：读取当前会话的 会话标志（sessionFlags） 上的 commitSkillRolloutGateLatch()。
 */
//@ chunk-ndmse9kj.js:77999-78068 facade-majority
function getCommitSkillRolloutGateLatch() {
  return currentSession().sessionFlags.commitSkillRolloutGateLatch();
}
/**
 * 状态访问器：写入当前会话的 会话标志（sessionFlags） 上的 replaceCommitSkillRolloutGateLatch()。
 */
//@ chunk-ndmse9kj.js:78068-78139 facade-majority
function setCommitSkillRolloutGateLatch(e) {
  currentSession().sessionFlags.replaceCommitSkillRolloutGateLatch(e);
}
/**
 * 状态访问器：读取当前会话的 会话标志（sessionFlags） 上的 memoryToolsShapeLatch()。
 */
//@ chunk-ndmse9kj.js:78139-78202 facade-majority
function getMemoryToolsShapeLatch() {
  return currentSession().sessionFlags.memoryToolsShapeLatch();
}
/**
 * 状态访问器：写入当前会话的 会话标志（sessionFlags） 上的 replaceMemoryToolsShapeLatch()。
 */
//@ chunk-ndmse9kj.js:78202-78267 facade-majority
function setMemoryToolsShapeLatch(e) {
  currentSession().sessionFlags.replaceMemoryToolsShapeLatch(e);
}
/**
 * 压缩前记下最后一次主请求的响应（若 id 匹配），供压缩后的 context_compacted 附件使用。
 */
//@ chunk-ndmse9kj.js:78267-78467 facade-majority
function armPendingContextCompacted(e, n) {
  let o = currentSession();
  o.sessionFlags.armPendingContextCompacted(
    e,
    o.requestJournal.lastMainRequestId() === n
      ? (o.requestJournal.lastMainResponse() ?? o.sessionFlags.responseBeforeCompaction())
      : void 0,
  );
}
/**
 * 状态访问器：读取当前会话的 会话标志（sessionFlags） 上的 consumePendingContextCompacted()。
 */
//@ chunk-ndmse9kj.js:78467-78539 facade-majority
function consumePendingContextCompacted() {
  return currentSession().sessionFlags.consumePendingContextCompacted();
}
/**
 * 状态访问器：读取当前会话的 会话标志（sessionFlags） 上的 responseBeforeCompaction()。
 */
//@ chunk-ndmse9kj.js:78539-78605 facade-majority
function getResponseBeforeCompaction() {
  return currentSession().sessionFlags.responseBeforeCompaction();
}
/**
 * 状态访问器：调用当前会话的 会话标志（sessionFlags） 上的 forgetResponseBeforeCompaction()。
 */
//@ chunk-ndmse9kj.js:78605-78670 facade-majority
function forgetResponseBeforeCompaction() {
  currentSession().sessionFlags.forgetResponseBeforeCompaction();
}
/**
 * 状态访问器：调用当前会话的 会话标志（sessionFlags） 上的 forgetPendingContextCompacted()。
 */
//@ chunk-ndmse9kj.js:78670-78734 facade-majority
function clearPendingContextCompacted() {
  currentSession().sessionFlags.forgetPendingContextCompacted();
}
/**
 * 状态访问器：读取当前会话的 host（host） → MCP 进程接线（mcpProcessWiring） 上的 strictConfig()。
 */
//@ chunk-ndmse9kj.js:78734-78796 facade-majority
function getStrictMcpConfig() {
  return currentSession().host.mcpProcessWiring.strictConfig();
}
/**
 * 状态访问器：写入当前会话的 host（host） → MCP 进程接线（mcpProcessWiring） 上的 replaceStrictConfig()。
 */
//@ chunk-ndmse9kj.js:78796-78861 facade-majority
function setStrictMcpConfig(e) {
  currentSession().host.mcpProcessWiring.replaceStrictConfig(e);
}
/**
 * 状态访问器：读取当前会话的 host（host） → 启动选项（launchOptions） 上的 cliSessionConfigCarried()。
 */
//@ chunk-ndmse9kj.js:78861-78932 facade-majority
function getCliSessionConfigCarried() {
  return currentSession().host.launchOptions.cliSessionConfigCarried();
}
/**
 * 状态访问器：写入当前会话的 host（host） → 启动选项（launchOptions） 上的 replaceCliSessionConfigCarried()。
 */
//@ chunk-ndmse9kj.js:78932-79005 facade-majority
function setCliSessionConfigCarried(e) {
  currentSession().host.launchOptions.replaceCliSessionConfigCarried(e);
}
/**
 * 状态访问器：读取当前会话的 host（host） → 启动选项（launchOptions） 上的 forkRestrictedLaunchConfig()。
 */
//@ chunk-ndmse9kj.js:79005-79078 facade-majority
function getForkRestrictedLaunchConfig() {
  return currentSession().host.launchOptions.forkRestrictedLaunchConfig();
}
/**
 * 状态访问器：写入当前会话的 host（host） → 启动选项（launchOptions） 上的 replaceForkRestrictedLaunchConfig()。
 */
//@ chunk-ndmse9kj.js:79078-79154 facade-majority
function setForkRestrictedLaunchConfig(e) {
  currentSession().host.launchOptions.replaceForkRestrictedLaunchConfig(e);
}
/**
 * 状态访问器：读取当前会话的 host（host） → 启动选项（launchOptions） 上的 forkReplayLaunchConfig()。
 */
//@ chunk-ndmse9kj.js:79154-79224 facade-majority
function getForkReplayLaunchConfig() {
  return currentSession().host.launchOptions.forkReplayLaunchConfig();
}
/**
 * 状态访问器：写入当前会话的 host（host） → 启动选项（launchOptions） 上的 replaceForkReplayLaunchConfig()。
 */
//@ chunk-ndmse9kj.js:79224-79296 facade-majority
function setForkReplayLaunchConfig(e) {
  currentSession().host.launchOptions.replaceForkReplayLaunchConfig(e);
}
/**
 * 状态访问器：读取当前会话的 MCP 会话接线（mcpSessionWiring） 上的 approvedServers()。
 */
//@ chunk-ndmse9kj.js:79296-79357 facade-majority
function getSessionApprovedMcpServers() {
  return currentSession().mcpSessionWiring.approvedServers();
}
/**
 * 状态访问器：调用当前会话的 MCP 会话接线（mcpSessionWiring） 上的 approveServers()。
 */
//@ chunk-ndmse9kj.js:79357-79416 facade-majority
function addSessionApprovedMcpServers(e, n) {
  currentSession().mcpSessionWiring.approveServers(e, n);
}
/**
 * 状态访问器：调用当前会话的 费用账本（costLedger） 上的 recordApiDuration()。
 */
//@ chunk-ndmse9kj.js:79416-79472 facade-majority
function addToTotalDurationState(e, n) {
  currentSession().costLedger.recordApiDuration(e, n);
}
/**
 * 状态访问器：调用当前会话的 费用账本（costLedger） 上的 recordCost()。
 */
//@ chunk-ndmse9kj.js:79472-79525 facade-majority
function addToTotalCostState(e, n, o) {
  currentSession().costLedger.recordCost(e, n, o);
}
/**
 * 状态访问器：调用当前会话的 费用账本（costLedger） 上的 recordSpentTokens()。
 */
//@ chunk-ndmse9kj.js:79525-79577 facade-majority
function addToSpentTokens(e) {
  currentSession().costLedger.recordSpentTokens(e);
}
/**
 * 状态访问器：读取当前会话的 费用账本（costLedger） 上的 totalCostUSD()。
 */
//@ chunk-ndmse9kj.js:79577-79628 facade-majority = getTotalCostUSD (0.713)
function getTotalCostUSD() {
  return currentSession().costLedger.totalCostUSD();
}
/**
 * 状态访问器：调用当前会话的 费用账本（costLedger） 上的 recordSideQueryCost()。
 */
//@ chunk-ndmse9kj.js:79628-79682 facade-majority
function addSideQueryCostUSD(e) {
  currentSession().costLedger.recordSideQueryCost(e);
}
/**
 * 状态访问器：读取当前会话的 费用账本（costLedger） 上的 sideQueryCostUSD()。
 */
//@ chunk-ndmse9kj.js:79682-79738 facade-majority
function getSideQueryCostUSD() {
  return currentSession().costLedger.sideQueryCostUSD();
}
/**
 * 状态访问器：读取当前会话的 费用账本（costLedger） 上的 totalAPIDuration()。
 */
//@ chunk-ndmse9kj.js:79738-79793 facade-majority = getTotalAPIDuration (0.72)
function getTotalAPIDuration() {
  return currentSession().costLedger.totalAPIDuration();
}
/**
 * 状态访问器：读取当前会话的 费用账本（costLedger） 上的 totalDuration()。
 */
//@ chunk-ndmse9kj.js:79793-79846 facade-majority
function getTotalDuration() {
  return currentSession().costLedger.totalDuration();
}
/**
 * 状态访问器：读取当前会话的 费用账本（costLedger） 上的 totalAPIDurationWithoutRetries()。
 */
//@ chunk-ndmse9kj.js:79846-79916 facade-majority = getTotalAPIDurationWithoutRetries (0.72)
function getTotalAPIDurationWithoutRetries() {
  return currentSession().costLedger.totalAPIDurationWithoutRetries();
}
/**
 * 状态访问器：读取当前会话的 费用账本（costLedger） 上的 totalToolDuration()。
 */
//@ chunk-ndmse9kj.js:79916-79973 facade-majority = getTotalToolDuration (0.72)
function getTotalToolDuration() {
  return currentSession().costLedger.totalToolDuration();
}
/**
 * 状态访问器：调用当前会话的 费用账本（costLedger） 上的 recordToolDuration()。
 */
//@ chunk-ndmse9kj.js:79973-80026 facade-majority
function addToToolDuration(e) {
  currentSession().costLedger.recordToolDuration(e);
}
/**
 * 状态访问器：读取当前会话的 host（host） → 遥测句柄（telemetryHandles） 上的 statsStore()。
 */
//@ chunk-ndmse9kj.js:80026-80087 facade-majority = getStatsStore (0.729)
function getStatsStore() {
  return currentSession().host.telemetryHandles.statsStore();
}
/**
 * 状态访问器：写入当前会话的 host（host） → 遥测句柄（telemetryHandles） 上的 replaceStatsStore()。
 */
//@ chunk-ndmse9kj.js:80087-80150 facade-majority
function setStatsStore(e) {
  currentSession().host.telemetryHandles.replaceStatsStore(e);
}
/**
 * 状态访问器：调用当前会话的 用户在场（userPresence） 上的 recordInteraction()。
 */
//@ chunk-ndmse9kj.js:80150-80203 facade-majority
function updateLastInteractionTime(e) {
  currentSession().userPresence.recordInteraction(e);
}
/**
 * 状态访问器：调用当前会话的 用户在场（userPresence） 上的 flushIfDirty()。
 */
//@ chunk-ndmse9kj.js:80203-80250 facade-majority
function flushInteractionTime() {
  currentSession().userPresence.flushIfDirty();
}
/**
 * 状态访问器：调用当前会话的 用户在场（userPresence） → interactionFired 上的 subscribe()。
 */
//@ chunk-ndmse9kj.js:80250-80319 facade-majority
function onInteraction(e) {
  return currentSession().userPresence.interactionFired.subscribe(e);
}
/**
 * 状态访问器：调用当前会话的 用户在场（userPresence） 上的 resetBaseline()。
 */
//@ chunk-ndmse9kj.js:80319-80367 facade-majority
function resetInteractionBaseline() {
  currentSession().userPresence.resetBaseline();
}
/**
 * 状态访问器：调用当前会话的 费用账本（costLedger） 上的 recordLinesChanged()。
 */
//@ chunk-ndmse9kj.js:80367-80424 facade-majority
function addToTotalLinesChanged(e, n) {
  currentSession().costLedger.recordLinesChanged(e, n);
}
/**
 * 状态访问器：读取当前会话的 费用账本（costLedger） 上的 totalLinesAdded()。
 */
//@ chunk-ndmse9kj.js:80424-80479 facade-majority = getTotalLinesAdded (0.72)
function getTotalLinesAdded() {
  return currentSession().costLedger.totalLinesAdded();
}
/**
 * 状态访问器：读取当前会话的 费用账本（costLedger） 上的 totalLinesRemoved()。
 */
//@ chunk-ndmse9kj.js:80479-80536 facade-majority = getTotalLinesRemoved (0.72)
function getTotalLinesRemoved() {
  return currentSession().costLedger.totalLinesRemoved();
}
/**
 * 状态访问器：读取当前会话的 费用账本（costLedger） 上的 totalInputTokens()。
 */
//@ chunk-ndmse9kj.js:80536-80592 facade-majority
function getTotalInputTokens() {
  return currentSession().costLedger.totalInputTokens();
}
/**
 * 状态访问器：读取当前会话的 费用账本（costLedger） 上的 totalOutputTokens()。
 */
//@ chunk-ndmse9kj.js:80592-80648 facade-majority
function getTotalOutputTokens() {
  return currentSession().costLedger.totalOutputTokens();
}
/**
 * 状态访问器：读取当前会话的 费用账本（costLedger） 上的 totalCacheReadInputTokens()。
 */
//@ chunk-ndmse9kj.js:80648-80713 facade-majority
function getTotalCacheReadInputTokens() {
  return currentSession().costLedger.totalCacheReadInputTokens();
}
/**
 * 状态访问器：读取当前会话的 费用账本（costLedger） 上的 totalCacheCreationInputTokens()。
 */
//@ chunk-ndmse9kj.js:80713-80782 facade-majority
function getTotalCacheCreationInputTokens() {
  return currentSession().costLedger.totalCacheCreationInputTokens();
}
/**
 * 状态访问器：读取当前会话的 费用账本（costLedger） 上的 totalWebSearchRequests()。
 */
//@ chunk-ndmse9kj.js:80782-80844 facade-majority
function getTotalWebSearchRequests() {
  return currentSession().costLedger.totalWebSearchRequests();
}
/**
 * 状态访问器：调用当前会话的 费用账本（costLedger） 上的 markUnknownModelCost()。
 */
//@ chunk-ndmse9kj.js:80844-80897 facade-majority
function setHasUnknownModelCost() {
  currentSession().costLedger.markUnknownModelCost();
}
/**
 * 状态访问器：读取当前会话的 费用账本（costLedger） 上的 hasUnknownModelCost()。
 */
//@ chunk-ndmse9kj.js:80897-80956 facade-majority = setHasUnknownModelCost (0.72)
function hasUnknownModelCost() {
  return currentSession().costLedger.hasUnknownModelCost();
}
/**
 * 状态访问器：调用当前会话的 费用账本（costLedger） 上的 recordSafetyStop()。
 */
//@ chunk-ndmse9kj.js:80956-81005 facade-majority
function addSafetyStop() {
  currentSession().costLedger.recordSafetyStop();
}
/**
 * 状态访问器：读取当前会话的 费用账本（costLedger） 上的 safetyStops()。
 */
//@ chunk-ndmse9kj.js:81005-81056 facade-majority
function getSafetyStops() {
  return currentSession().costLedger.safetyStops();
}
/**
 * 状态访问器：读取当前会话的 请求日志（requestJournal） 上的 lastMainRequestId()。
 */
//@ chunk-ndmse9kj.js:81056-81116 facade-majority = getLastMainRequestId (0.728)
function getLastMainRequestId() {
  return currentSession().requestJournal.lastMainRequestId();
}
/**
 * 状态访问器：写入当前会话的 请求日志（requestJournal） 上的 replaceLastMainRequestId()。
 */
//@ chunk-ndmse9kj.js:81116-81183 facade-majority
function setLastMainRequestId(e, n) {
  currentSession().requestJournal.replaceLastMainRequestId(e, n);
}
/**
 * 状态访问器：写入当前会话的 请求日志（requestJournal） 上的 replaceLastMainRequestId()。
 */
//@ chunk-ndmse9kj.js:81183-81257 facade-majority
function forgetLastMainRequestId() {
  currentSession().requestJournal.replaceLastMainRequestId(void 0, void 0);
}
/**
 * 交接（hand-off）时清掉最后主请求 id 与压缩前响应。
 */
//@ chunk-ndmse9kj.js:81257-81284 facade-majority
function forgetMainChainOnHandOff() {
  (forgetLastMainRequestId(), forgetResponseBeforeCompaction());
}
/**
 * 状态访问器：读取当前会话的 请求日志（requestJournal） 上的 mainChainReleaseCount()。
 */
//@ chunk-ndmse9kj.js:81284-81349 facade-majority
function getMainChainReleaseCount() {
  return currentSession().requestJournal.mainChainReleaseCount();
}
/**
 * 状态访问器：读取当前会话的 请求日志（requestJournal） 上的 lastMainThreadCacheTtlMs()。
 */
//@ chunk-ndmse9kj.js:81349-81416 facade-majority
function getLastMainThreadCacheTtlMs() {
  return currentSession().requestJournal.lastMainThreadCacheTtlMs();
}
/**
 * 状态访问器：调用当前会话的 请求日志（requestJournal） 上的 isLastMainThreadAskLive()。
 */
//@ chunk-ndmse9kj.js:81416-81489 facade-majority
function isLastMainThreadAskLive(e, n) {
  return currentSession().requestJournal.isLastMainThreadAskLive(e, n);
}
/**
 * 状态访问器：读取当前会话的 请求日志（requestJournal） 上的 lastMainThreadRequestAt()。
 */
//@ chunk-ndmse9kj.js:81489-81555 facade-majority
function getLastMainThreadRequestAt() {
  return currentSession().requestJournal.lastMainThreadRequestAt();
}
/**
 * 状态访问器：读取当前会话的 请求日志（requestJournal） 上的 lastLiveMainThreadRequestAt()。
 */
//@ chunk-ndmse9kj.js:81555-81626 facade-majority
function getLastLiveMainThreadRequestAt() {
  return currentSession().requestJournal.lastLiveMainThreadRequestAt();
}
/**
 * 状态访问器：写入当前会话的 请求日志（requestJournal） 上的 replaceLastMainThreadCacheTtlMs()。
 */
//@ chunk-ndmse9kj.js:81626-81704 facade-majority
function setLastMainThreadCacheTtlMs(e, n, o) {
  currentSession().requestJournal.replaceLastMainThreadCacheTtlMs(e, n, o);
}
/**
 * 状态访问器：调用当前会话的 请求日志（requestJournal） 上的 adjustLastMainThreadCacheTtlMs()。
 */
//@ chunk-ndmse9kj.js:81704-81773 facade-majority
function adjustLastMainThreadCacheTtlMs(e) {
  currentSession().requestJournal.adjustLastMainThreadCacheTtlMs(e);
}
/**
 * 状态访问器：调用当前会话的 请求日志（requestJournal） 上的 recordLastMainThreadCacheRenewal()。
 */
//@ chunk-ndmse9kj.js:81773-81844 facade-majority
function recordLastMainThreadCacheRenewal(e) {
  currentSession().requestJournal.recordLastMainThreadCacheRenewal(e);
}
/**
 * 状态访问器：读取当前会话的 请求日志（requestJournal） 上的 lastMainThreadCacheRenewedAt()。
 */
//@ chunk-ndmse9kj.js:81844-81916 facade-majority
function getLastMainThreadCacheRenewedAt() {
  return currentSession().requestJournal.lastMainThreadCacheRenewedAt();
}
/**
 * 状态访问器：读取当前会话的 请求日志（requestJournal） 上的 lastMainThreadContextTokens()。
 */
//@ chunk-ndmse9kj.js:81916-81987 facade-majority
function getLastMainThreadContextTokens() {
  return currentSession().requestJournal.lastMainThreadContextTokens();
}
/**
 * 状态访问器：写入当前会话的 请求日志（requestJournal） 上的 replaceLastMainThreadContextTokens()。
 */
//@ chunk-ndmse9kj.js:81987-82060 facade-majority
function setLastMainThreadContextTokens(e) {
  currentSession().requestJournal.replaceLastMainThreadContextTokens(e);
}
/**
 * resume 种子：会话 id 已一致时立即应用到请求日志，否则暂存待切换后应用。
 */
//@ chunk-ndmse9kj.js:82060-82207 facade-majority
function stageResumeJournalSeed(e) {
  let n = currentSession();
  if (e.sessionId !== void 0 && e.sessionId === n.id) n.requestJournal.applyResumeSeed(e);
  else n.requestJournal.stageResumeSeed(e);
}
/**
 * 状态访问器：读取当前会话的 请求日志（requestJournal） 上的 lastApiCompletionTimestamp()。
 */
//@ chunk-ndmse9kj.js:82207-82276 facade-majority = getLastApiCompletionTimestamp (0.736)
function getLastApiCompletionTimestamp() {
  return currentSession().requestJournal.lastApiCompletionTimestamp();
}
/**
 * 状态访问器：写入当前会话的 请求日志（requestJournal） 上的 replaceLastApiCompletionTimestamp()。
 */
//@ chunk-ndmse9kj.js:82276-82348 facade-majority
function setLastApiCompletionTimestamp(e) {
  currentSession().requestJournal.replaceLastApiCompletionTimestamp(e);
}
/**
 * markPostCompaction：标记刚压缩并记录上下文 token；不保留缓存前缀时清掉最后主线程请求。
 */
//@ chunk-ndmse9kj.js:82348-82540 facade-majority
function markPostCompaction(e, { keepsCachedPrefix: keepsCachedPrefix = !1 } = {}) {
  let requestJournal = currentSession().requestJournal;
  if (
    (requestJournal.replacePendingPostCompaction(!0),
    requestJournal.replaceLastMainThreadContextTokens(e),
    !keepsCachedPrefix)
  )
    requestJournal.replaceLastMainThreadRequest(null, null);
}
/**
 * 读取并清除“刚压缩过”标记。
 */
//@ chunk-ndmse9kj.js:82540-82667 facade-majority = markPostCompaction (0.544)
function consumePostCompaction() {
  let e = currentSession(),
    pendingPostCompaction = e.requestJournal.pendingPostCompaction();
  return (e.requestJournal.replacePendingPostCompaction(!1), pendingPostCompaction);
}
/**
 * 状态访问器：读取当前会话的 用户在场（userPresence） 上的 lastInteractionTime()。
 */
//@ chunk-ndmse9kj.js:82667-82727 facade-majority = flushInteractionTime_inner (0.693)
function getLastInteractionTime() {
  return currentSession().userPresence.lastInteractionTime();
}
/**
 * 状态访问器：读取当前会话的 用户在场（userPresence） 上的 lastSubmitTime()。
 */
//@ chunk-ndmse9kj.js:82727-82783 facade-majority
function getLastSubmitTime() {
  return currentSession().userPresence.lastSubmitTime();
}
/**
 * 状态访问器：调用当前会话的 用户在场（userPresence） 上的 recordSubmit()。
 */
//@ chunk-ndmse9kj.js:82783-82830 facade-majority
function recordSubmitTime() {
  currentSession().userPresence.recordSubmit();
}
/**
 * 用户“活跃”的判定窗口：60 秒（通知用）。
 */
//@ chunk-ndmse9kj.js:82830-82844 facade-majority
var NOTIF_ACTIVE_THRESHOLD_MS = 60000;
/**
 * 状态访问器：调用当前会话的 用户在场（userPresence） 上的 updateTerminalFocus()。
 */
//@ chunk-ndmse9kj.js:82844-82900 facade-majority
function setTerminalFocusForState(e) {
  currentSession().userPresence.updateTerminalFocus(e);
}
/**
 * 状态访问器：读取当前会话的 用户在场（userPresence） 上的 terminalFocus()。
 */
//@ chunk-ndmse9kj.js:82900-82955 facade-majority
function getTerminalFocus() {
  return currentSession().userPresence.terminalFocus();
}
/**
 * 状态访问器：调用当前会话的 用户在场（userPresence） → terminalFocusFired 上的 subscribe()。
 */
//@ chunk-ndmse9kj.js:82955-83027 facade-majority
function onTerminalFocusChange(e) {
  return currentSession().userPresence.terminalFocusFired.subscribe(e);
}
/**
 * 用户是否活跃：终端焦点已知时用焦点，否则看 60 秒内是否有交互。
 */
//@ chunk-ndmse9kj.js:83027-83104 facade-majority
function isUserActiveForNotifications() {
  let e = getTerminalFocus();
  if (e !== void 0) return e;
  return Date.now() - getLastInteractionTime() < NOTIF_ACTIVE_THRESHOLD_MS;
}
/**
 * 状态访问器：调用当前会话的 用户在场（userPresence） 上的 markScrollActivity()。
 */
//@ chunk-ndmse9kj.js:83104-83157 facade-majority
function markScrollActivity() {
  currentSession().userPresence.markScrollActivity();
}
/**
 * 状态访问器：读取当前会话的 用户在场（userPresence） 上的 scrollDraining()。
 */
//@ chunk-ndmse9kj.js:83157-83213 facade-majority
function getIsScrollDraining() {
  return currentSession().userPresence.scrollDraining();
}
/**
 * 会话状态函数 waitForScrollIdle：涉及当前会话的 userPresence.waitForScrollIdle。
 */
//@ chunk-ndmse9kj.js:83213-83278 facade-majority
async function waitForScrollIdle() {
  return currentSession().userPresence.waitForScrollIdle();
}
/**
 * 状态访问器：读取当前会话的 费用账本（costLedger） 上的 modelUsage()。
 */
//@ chunk-ndmse9kj.js:83278-83327 facade-majority = getModelUsage (0.679)
function getModelUsage() {
  return currentSession().costLedger.modelUsage();
}
/**
 * 状态访问器：调用当前会话的 费用账本（costLedger） 上的 usageForModel()。
 */
//@ chunk-ndmse9kj.js:83327-83382 facade-majority
function getUsageForModel(e) {
  return currentSession().costLedger.usageForModel(e);
}
/**
 * 状态访问器：调用当前会话的 费用账本（costLedger） 上的 trackUsageSinceLastResult()。
 */
//@ chunk-ndmse9kj.js:83382-83440 facade-majority
function trackUsageSinceLastResult() {
  currentSession().costLedger.trackUsageSinceLastResult();
}
/**
 * 状态访问器：读取当前会话的 费用账本（costLedger） 上的 usageSinceLastResult()。
 */
//@ chunk-ndmse9kj.js:83440-83500 facade-majority
function getUsageSinceLastResult() {
  return currentSession().costLedger.usageSinceLastResult();
}
/**
 * 状态访问器：读取当前会话的 费用账本（costLedger） 上的 takeUsageSinceLastResult()。
 */
//@ chunk-ndmse9kj.js:83500-83564 facade-majority
function takeUsageSinceLastResult() {
  return currentSession().costLedger.takeUsageSinceLastResult();
}
/**
 * 状态访问器：读取当前会话的 模型选择（modelSelection） 上的 mainLoopModelOverride()。
 */
//@ chunk-ndmse9kj.js:83564-83628 facade-majority = getMainLoopModelOverride (0.717)
function getMainLoopModelOverride() {
  return currentSession().modelSelection.mainLoopModelOverride();
}
/**
 * 状态访问器：读取当前会话的 模型选择（modelSelection） 上的 initialMainLoopModel()。
 */
//@ chunk-ndmse9kj.js:83628-83691 facade-majority = getInitialMainLoopModel (0.699)
function getInitialMainLoopModel() {
  return currentSession().modelSelection.initialMainLoopModel();
}
/**
 * 状态访问器：调用当前会话的 模型选择（modelSelection） 上的 overrideMainLoopModel()。
 */
//@ chunk-ndmse9kj.js:83691-83750 facade-majority
function setMainLoopModelOverride(e) {
  currentSession().modelSelection.overrideMainLoopModel(e);
}
/**
 * 状态访问器：读取当前会话的 模型选择（modelSelection） 上的 mainLoopEffortState()。
 */
//@ chunk-ndmse9kj.js:83750-83813 facade-majority
function getMainLoopEffortState() {
  return currentSession().modelSelection.mainLoopEffortState();
}
/**
 * 状态访问器：写入当前会话的 模型选择（modelSelection） 上的 replaceMainLoopEffortState()。
 */
//@ chunk-ndmse9kj.js:83813-83878 facade-majority
function setMainLoopEffortState(e) {
  currentSession().modelSelection.replaceMainLoopEffortState(e);
}
/**
 * 状态访问器：调用当前会话的 模型选择（modelSelection） 上的 markRefusalFallbackOccurred()。
 */
//@ chunk-ndmse9kj.js:83878-83944 facade-majority
function markRefusalFallbackOccurred(e) {
  currentSession().modelSelection.markRefusalFallbackOccurred(e);
}
/**
 * 状态访问器：读取当前会话的 模型选择（modelSelection） 上的 refusalFallbackOccurred()。
 */
//@ chunk-ndmse9kj.js:83944-84010 facade-majority
function hasRefusalFallbackOccurred() {
  return currentSession().modelSelection.refusalFallbackOccurred();
}
/**
 * 状态访问器：调用当前会话的 模型选择（modelSelection） 上的 armRefusalFallbackHeader()。
 */
//@ chunk-ndmse9kj.js:84010-84073 facade-majority
function markRefusalFallbackHeaderArmed(e) {
  currentSession().modelSelection.armRefusalFallbackHeader(e);
}
/**
 * 状态访问器：读取当前会话的 模型选择（modelSelection） 上的 refusalFallbackHeaderArmed()。
 */
//@ chunk-ndmse9kj.js:84073-84143 facade-majority
function hasRefusalFallbackHeaderArmed() {
  return currentSession().modelSelection.refusalFallbackHeaderArmed();
}
/**
 * 状态访问器：调用当前会话的 模型选择（modelSelection） 上的 armSilentLaneFromServer()。
 */
//@ chunk-ndmse9kj.js:84143-84203 facade-majority
function markSilentRefusalFallbackServerArmed() {
  currentSession().modelSelection.armSilentLaneFromServer();
}
/**
 * 状态访问器：读取当前会话的 模型选择（modelSelection） 上的 silentLaneServerArmed()。
 */
//@ chunk-ndmse9kj.js:84203-84268 facade-majority
function isSilentRefusalFallbackServerArmed() {
  return currentSession().modelSelection.silentLaneServerArmed();
}
/**
 * 状态访问器：读取当前会话的 模型选择（modelSelection） 上的 refusalFallbackLatchOriginRequestId()。
 */
//@ chunk-ndmse9kj.js:84268-84347 facade-majority
function getRefusalFallbackLatchOriginRequestId() {
  return currentSession().modelSelection.refusalFallbackLatchOriginRequestId();
}
/**
 * 锁存拒答回退模型：已锁存且当前覆盖即回退模型时只更新回退模型与 effort，否则写入新锁存。
 */
//@ chunk-ndmse9kj.js:84347-84681 facade-majority
function latchRefusalFallbackModel(model) {
  let n = currentSession(),
    refusalFallbackModelLatch = n.modelSelection.refusalFallbackModelLatch();
  if (
    refusalFallbackModelLatch &&
    n.modelSelection.mainLoopModelOverride() === refusalFallbackModelLatch.fallbackModel
  ) {
    n.modelSelection.replaceRefusalFallbackModelLatch({
      ...refusalFallbackModelLatch,
      fallbackModel: model.fallbackModel,
      carriedEffort: model.carriedEffort ?? refusalFallbackModelLatch.carriedEffort,
    });
    return;
  }
  n.modelSelection.replaceRefusalFallbackModelLatch(model);
}
/**
 * 状态访问器：调用当前会话的 模型选择（modelSelection） 上的 unlatchRefusalFallbackModel()。
 */
//@ chunk-ndmse9kj.js:84681-84757 facade-majority
function clearRefusalFallbackModelLatch() {
  currentSession().modelSelection.unlatchRefusalFallbackModel("model_pick");
}
/**
 * 状态访问器：读取当前会话的 模型选择（modelSelection） 上的 refusalFallbackModelLatch()。
 */
//@ chunk-ndmse9kj.js:84757-84825 facade-majority
function getRefusalFallbackModelLatch() {
  return currentSession().modelSelection.refusalFallbackModelLatch();
}
/**
 * 清掉拒答回退锁存里携带的 effort。
 */
//@ chunk-ndmse9kj.js:84825-84979 facade-majority
function releaseRefusalFallbackCarriedEffort(e) {
  let { modelSelection: modelSelection } = currentSession(),
    refusalFallbackModelLatch = modelSelection.refusalFallbackModelLatch();
  if (refusalFallbackModelLatch !== void 0)
    modelSelection.replaceRefusalFallbackModelLatch(
      { ...refusalFallbackModelLatch, carriedEffort: void 0 },
      e,
    );
}
/**
 * 状态访问器：读取当前会话的 模型选择（modelSelection） 上的 takeCarriedEffortEnd()。
 */
//@ chunk-ndmse9kj.js:84979-85043 facade-majority
function takeRefusalFallbackCarriedEffortEnd() {
  return currentSession().modelSelection.takeCarriedEffortEnd();
}
/**
 * 改写拒答回退锁存里记录的“之前的模型覆盖”。
 */
//@ chunk-ndmse9kj.js:85043-85198 facade-majority
function rewriteRefusalFallbackPreviousOverride(e) {
  let n = currentSession(),
    refusalFallbackModelLatch = n.modelSelection.refusalFallbackModelLatch();
  if (refusalFallbackModelLatch)
    n.modelSelection.replaceRefusalFallbackModelLatch({ ...refusalFallbackModelLatch, previousOverride: e });
}
/**
 * 状态访问器：调用当前会话的 模型选择（modelSelection） 上的 forgetRefusalFallbackOccurred()。
 */
//@ chunk-ndmse9kj.js:85198-85264 facade-majority
function clearRefusalFallbackOccurred() {
  currentSession().modelSelection.forgetRefusalFallbackOccurred();
}
/**
 * 状态访问器：调用当前会话的 宿主能力（surfaceCapabilities） 上的 markSdkDialogHostActive()。
 */
//@ chunk-ndmse9kj.js:85264-85331 facade-majority
function setSdkDialogHostActive(e) {
  currentSession().surfaceCapabilities.markSdkDialogHostActive(e);
}
/**
 * 状态访问器：读取当前会话的 宿主能力（surfaceCapabilities） 上的 sdkDialogHostActive()。
 */
//@ chunk-ndmse9kj.js:85331-85398 facade-majority
function isSdkDialogHostActive() {
  return currentSession().surfaceCapabilities.sdkDialogHostActive();
}
/**
 * 状态访问器：调用当前会话的 宿主能力（surfaceCapabilities） 上的 declareDialogKinds()。
 */
//@ chunk-ndmse9kj.js:85398-85464 facade-majority
function setSdkSupportedDialogKinds(e, n) {
  currentSession().surfaceCapabilities.declareDialogKinds(e, n);
}
/**
 * 状态访问器：读取当前会话的 宿主能力（surfaceCapabilities） 上的 sdkSupportedDialogKinds()。
 */
//@ chunk-ndmse9kj.js:85464-85536 facade-majority
function getSdkSupportedDialogKinds() {
  return currentSession().surfaceCapabilities.sdkSupportedDialogKinds();
}
/**
 * SDK 宿主声明的对话类型来源（未声明为 none）。
 */
//@ chunk-ndmse9kj.js:85536-85703 facade-majority
function getSdkDialogCapabilitySource() {
  let e = currentSession();
  if (e.surfaceCapabilities.sdkSupportedDialogKinds() === void 0) return "none";
  return e.surfaceCapabilities.sdkSupportedDialogKindsSource() ?? "none";
}
/**
 * 状态访问器：调用当前会话的 宿主能力（surfaceCapabilities） 上的 declarePerTaskStopAffordance()。
 */
//@ chunk-ndmse9kj.js:85703-85775 facade-majority
function setSdkPerTaskStopAffordance(e) {
  currentSession().surfaceCapabilities.declarePerTaskStopAffordance(e);
}
/**
 * 会话状态函数 getSdkPerTaskStopAffordance：涉及当前会话的 surfaceCapabilities.sdkPerTaskStopAffordance。
 */
//@ chunk-ndmse9kj.js:85775-85853 facade-majority
function getSdkPerTaskStopAffordance() {
  return currentSession().surfaceCapabilities.sdkPerTaskStopAffordance() === !0;
}
/**
 * 状态访问器：调用当前会话的 宿主能力（surfaceCapabilities） 上的 declareRapidFollowupPreempt()。
 */
//@ chunk-ndmse9kj.js:85853-85924 facade-majority
function setSdkRapidFollowupPreempt(e) {
  currentSession().surfaceCapabilities.declareRapidFollowupPreempt(e);
}
/**
 * 会话状态函数 getSdkRapidFollowupPreempt：涉及当前会话的 surfaceCapabilities.sdkRapidFollowupPreempt。
 */
//@ chunk-ndmse9kj.js:85924-86001 facade-majority
function getSdkRapidFollowupPreempt() {
  return currentSession().surfaceCapabilities.sdkRapidFollowupPreempt() === !0;
}
/**
 * 状态访问器：调用当前会话的 宿主能力（surfaceCapabilities） 上的 declareForwardNestedSubagentToolCalls()。
 */
//@ chunk-ndmse9kj.js:86001-86082 facade-majority
function setSdkForwardNestedSubagentToolCalls(e) {
  currentSession().surfaceCapabilities.declareForwardNestedSubagentToolCalls(e);
}
/**
 * 状态访问器：调用当前会话的 宿主能力（surfaceCapabilities） 上的 declareHostRendersChromeSetupOffer()。
 */
//@ chunk-ndmse9kj.js:86082-86160 facade-majority
function setHostRendersChromeSetupOffer(e) {
  currentSession().surfaceCapabilities.declareHostRendersChromeSetupOffer(e);
}
/**
 * 会话状态函数 getHostRendersChromeSetupOffer：涉及当前会话的 surfaceCapabilities.hostRendersChromeSetupOffer。
 */
//@ chunk-ndmse9kj.js:86160-86241 facade-majority
function getHostRendersChromeSetupOffer() {
  return currentSession().surfaceCapabilities.hostRendersChromeSetupOffer() === !0;
}
/**
 * 状态访问器：读取当前会话的 host（host） → 启动选项（launchOptions） 上的 replConfigArgv()。
 */
//@ chunk-ndmse9kj.js:86241-86302 facade-majority
function getReplConfigArgv() {
  return currentSession().host.launchOptions.replConfigArgv();
}
/**
 * 状态访问器：写入当前会话的 host（host） → 启动选项（launchOptions） 上的 replaceReplConfigArgv()。
 */
//@ chunk-ndmse9kj.js:86302-86366 facade-majority
function setReplConfigArgv(e) {
  currentSession().host.launchOptions.replaceReplConfigArgv(e);
}
/**
 * 状态访问器：写入当前会话的 模型选择（modelSelection） 上的 replaceInitialMainLoopModel()。
 */
//@ chunk-ndmse9kj.js:86366-86432 facade-majority
function setInitialMainLoopModel(e) {
  currentSession().modelSelection.replaceInitialMainLoopModel(e);
}
/**
 * 状态访问器：读取当前会话的 模型选择（modelSelection） 上的 availabilityFallbackChain()。
 */
//@ chunk-ndmse9kj.js:86432-86501 facade-majority
function getAvailabilityFallbackChain() {
  return currentSession().modelSelection.availabilityFallbackChain();
}
/**
 * 状态访问器：写入当前会话的 模型选择（modelSelection） 上的 replaceAvailabilityFallbackChain()。
 */
//@ chunk-ndmse9kj.js:86501-86572 facade-majority
function setAvailabilityFallbackChain(e) {
  currentSession().modelSelection.replaceAvailabilityFallbackChain(e);
}
/**
 * 状态访问器：读取当前会话的 模型选择（modelSelection） 上的 initialModelSettingLayer()。
 */
//@ chunk-ndmse9kj.js:86572-86640 facade-majority
function getInitialModelSettingLayer() {
  return currentSession().modelSelection.initialModelSettingLayer();
}
/**
 * 状态访问器：写入当前会话的 模型选择（modelSelection） 上的 replaceInitialModelSettingLayer()。
 */
//@ chunk-ndmse9kj.js:86640-86710 facade-majority
function setInitialModelSettingLayer(e) {
  currentSession().modelSelection.replaceInitialModelSettingLayer(e);
}
/**
 * 状态访问器：读取当前会话的 模型选择（modelSelection） 上的 resolvedOrgDefault()。
 */
//@ chunk-ndmse9kj.js:86710-86772 facade-majority
function getResolvedOrgDefault() {
  return currentSession().modelSelection.resolvedOrgDefault();
}
/**
 * 状态访问器：写入当前会话的 模型选择（modelSelection） 上的 replaceResolvedOrgDefault()。
 */
//@ chunk-ndmse9kj.js:86772-86836 facade-majority
function setResolvedOrgDefault(e) {
  currentSession().modelSelection.replaceResolvedOrgDefault(e);
}
/**
 * 状态访问器：读取当前会话的 模型选择（modelSelection） 上的 initialEnvDefaultModel()。
 */
//@ chunk-ndmse9kj.js:86836-86902 facade-majority
function getInitialEnvDefaultModel() {
  return currentSession().modelSelection.initialEnvDefaultModel();
}
/**
 * 状态访问器：写入当前会话的 模型选择（modelSelection） 上的 replaceInitialEnvDefaultModel()。
 */
//@ chunk-ndmse9kj.js:86902-86970 facade-majority
function setInitialEnvDefaultModel(e) {
  currentSession().modelSelection.replaceInitialEnvDefaultModel(e);
}
/**
 * 会话状态函数 getSdkBetas：优先取异步上下文覆盖对象的 sdkBetas；涉及当前会话的 surfaceCapabilities.sdkBetas。
 */
//@ chunk-ndmse9kj.js:86970-87041 facade-majority = getSdkBetas (0.724)
function getSdkBetas() {
  return getAgentContext()?.sdkBetas ?? currentSession().surfaceCapabilities.sdkBetas();
}
/**
 * 状态访问器：写入当前会话的 宿主能力（surfaceCapabilities） 上的 replaceSdkBetas()。
 */
//@ chunk-ndmse9kj.js:87041-87100 facade-majority
function setSdkBetas(e) {
  currentSession().surfaceCapabilities.replaceSdkBetas(e);
}
/**
 * 状态访问器：读取当前会话的 host（host） → 账户额度锁存（accountCreditLatches） 上的 longContext1mCreditsBlocked()。
 */
//@ chunk-ndmse9kj.js:87100-87182 facade-majority
function isLongContext1mCreditsBlocked() {
  return currentSession().host.accountCreditLatches.longContext1mCreditsBlocked();
}
/**
 * 状态访问器：写入当前会话的 host（host） → 账户额度锁存（accountCreditLatches） 上的 replaceLongContext1mCreditsBlocked()。
 */
//@ chunk-ndmse9kj.js:87182-87266 facade-majority
function setLongContext1mCreditsBlocked(e) {
  currentSession().host.accountCreditLatches.replaceLongContext1mCreditsBlocked(e);
}
/**
 * 状态访问器：读取当前会话的 host（host） → 账户额度锁存（accountCreditLatches） 上的 usageCreditsRequired()。
 */
//@ chunk-ndmse9kj.js:87266-87341 facade-majority
function isUsageCreditsRequired() {
  return currentSession().host.accountCreditLatches.usageCreditsRequired();
}
/**
 * 状态访问器：写入当前会话的 host（host） → 账户额度锁存（accountCreditLatches） 上的 replaceUsageCreditsRequired()。
 */
//@ chunk-ndmse9kj.js:87341-87418 facade-majority
function setUsageCreditsRequired(e) {
  currentSession().host.accountCreditLatches.replaceUsageCreditsRequired(e);
}
/**
 * 状态访问器：调用当前会话的 仅额度模型同意（usageCreditsOnlyModelConsentSlots） 上的 consentSessionFallback()。
 */
//@ chunk-ndmse9kj.js:87418-87505 facade-majority
function hasUsageCreditsOnlyModelConsentSessionFallback(e) {
  return currentSession().usageCreditsOnlyModelConsentSlots.consentSessionFallback(e);
}
/**
 * 状态访问器：写入当前会话的 仅额度模型同意（usageCreditsOnlyModelConsentSlots） 上的 replaceConsentSessionFallback()。
 */
//@ chunk-ndmse9kj.js:87505-87596 facade-majority
function setUsageCreditsOnlyModelConsentSessionFallback(e, n) {
  currentSession().usageCreditsOnlyModelConsentSlots.replaceConsentSessionFallback(e, n);
}
/**
 * 状态访问器：调用当前会话的 仅额度模型同意（usageCreditsOnlyModelConsentSlots） 上的 sessionConsentKey()。
 */
//@ chunk-ndmse9kj.js:87596-87678 facade-majority
function getUsageCreditsOnlyModelSessionConsentKey(e) {
  return currentSession().usageCreditsOnlyModelConsentSlots.sessionConsentKey(e);
}
/**
 * 状态访问器：写入当前会话的 仅额度模型同意（usageCreditsOnlyModelConsentSlots） 上的 replaceSessionConsentKey()。
 */
//@ chunk-ndmse9kj.js:87678-87764 facade-majority
function setUsageCreditsOnlyModelSessionConsentKey(e, n) {
  currentSession().usageCreditsOnlyModelConsentSlots.replaceSessionConsentKey(e, n);
}
/**
 * 状态访问器：读取当前会话的 host（host） → 凭证槽（credentialSlots） 上的 sdkOAuthTokenRefreshCallback()。
 */
//@ chunk-ndmse9kj.js:87764-87842 facade-majority
function getSdkOAuthTokenRefreshCallback() {
  return currentSession().host.credentialSlots.sdkOAuthTokenRefreshCallback();
}
/**
 * 状态访问器：写入当前会话的 host（host） → 凭证槽（credentialSlots） 上的 replaceSdkOAuthTokenRefreshCallback()。
 */
//@ chunk-ndmse9kj.js:87842-87922 facade-majority
function setSdkOAuthTokenRefreshCallback(e) {
  currentSession().host.credentialSlots.replaceSdkOAuthTokenRefreshCallback(e);
}
/**
 * 状态访问器：读取当前会话的 host（host） → 凭证槽（credentialSlots） 上的 hostAuthTokenRefreshCallback()。
 */
//@ chunk-ndmse9kj.js:87922-88000 facade-majority
function getHostAuthTokenRefreshCallback() {
  return currentSession().host.credentialSlots.hostAuthTokenRefreshCallback();
}
/**
 * 状态访问器：写入当前会话的 host（host） → 凭证槽（credentialSlots） 上的 replaceHostAuthTokenRefreshCallback()。
 */
//@ chunk-ndmse9kj.js:88000-88080 facade-majority
function setHostAuthTokenRefreshCallback(e) {
  currentSession().host.credentialSlots.replaceHostAuthTokenRefreshCallback(e);
}
/**
 * 注册费用状态保存器（在默认 root 会话的账本上）。
 */
//@ chunk-ndmse9kj.js:88080-88126 facade-majority
function registerSessionCostSaver(e) {
  defaultRootSession.costLedger.registerSaver(e);
}
/**
 * 状态访问器：调用当前会话的 费用账本（costLedger） 上的 runSaver()。
 */
//@ chunk-ndmse9kj.js:88126-88182 facade-majority
function saveSessionCostsForTransition(e) {
  currentSession().costLedger.runSaver(e, defaultRootSession.costLedger);
}
/**
 * 注册费用状态的会话记录写入器。
 */
//@ chunk-ndmse9kj.js:88182-88241 facade-majority
function registerCostStateRecorder(e) {
  defaultRootSession.costLedger.registerTranscriptRecorder(e);
}
/**
 * 状态访问器：调用当前会话的 费用账本（costLedger） 上的 runTranscriptRecorder()。
 */
//@ chunk-ndmse9kj.js:88241-88314 facade-majority
function recordCostStateToTranscript(e, n) {
  currentSession().costLedger.runTranscriptRecorder(e, n, defaultRootSession.costLedger);
}
/**
 * 费用账本是否属于当前会话。
 */
//@ chunk-ndmse9kj.js:88314-88375 facade-majority
function costLedgerBelongsToCurrentSession() {
  let e = currentSession();
  return e.costLedger.belongsTo(e.id);
}
/**
 * 把费用账本归属到当前会话。
 */
//@ chunk-ndmse9kj.js:88375-88425 facade-majority
function claimCostLedgerForCurrentSession() {
  let e = currentSession();
  e.costLedger.claim(e.id);
}
/**
 * 把费用账本范围限定为当前会话。
 */
//@ chunk-ndmse9kj.js:88425-88477 facade-majority
function scopeCostLedgerToCurrentSession() {
  let e = currentSession();
  e.costLedger.scopeTo(e.id);
}
/**
 * resetCostState：清空当前会话费用账本并清 promptId。
 */
//@ chunk-ndmse9kj.js:88477-88566 facade-majority
function resetCostState() {
  let e = currentSession();
  (e.costLedger.reset(e.id), e.requestJournal.replacePromptId(null));
}
/**
 * setCostStateForRestore：resume 时恢复费用状态。
 */
//@ chunk-ndmse9kj.js:88566-88621 facade-majority
function setCostStateForRestore(e) {
  let n = currentSession();
  n.costLedger.restore(e, n.id);
}
/**
 * 状态访问器：读取当前会话的 host（host） → 启动选项（launchOptions） 上的 projectConfigRoot()。
 */
//@ chunk-ndmse9kj.js:88621-88685 facade-majority
function getProjectConfigRoot() {
  return currentSession().host.launchOptions.projectConfigRoot();
}
/**
 * 状态访问器：写入当前会话的 host（host） → 启动选项（launchOptions） 上的 replaceProjectConfigRoot()。
 */
//@ chunk-ndmse9kj.js:88685-88752 facade-majority
function setProjectConfigRoot(e) {
  currentSession().host.launchOptions.replaceProjectConfigRoot(e);
}
/**
 * 状态访问器：读取当前会话的 host（host） → 模型字符串缓存（modelStringsCache） 上的 modelStrings()。
 */
//@ chunk-ndmse9kj.js:88752-88816 facade-majority = getModelStrings (0.7)
function getModelStrings() {
  return currentSession().host.modelStringsCache.modelStrings();
}
/**
 * 状态访问器：写入当前会话的 host（host） → 模型字符串缓存（modelStringsCache） 上的 replaceModelStrings()。
 */
//@ chunk-ndmse9kj.js:88816-88882 facade-majority
function setModelStrings(e) {
  currentSession().host.modelStringsCache.replaceModelStrings(e);
}
/**
 * 状态访问器：调用当前会话的 host（host） → 模型字符串缓存（modelStringsCache） 上的 invalidate()。
 */
//@ chunk-ndmse9kj.js:88882-88937 facade-majority
function resetModelStrings() {
  currentSession().host.modelStringsCache.invalidate();
}
/**
 * 状态访问器：调用当前会话的 host（host） → 模型字符串缓存（modelStringsCache） 上的 recordAdmin3PSteeringSnapshot()。
 */
//@ chunk-ndmse9kj.js:88937-89013 facade-majority
function setAdmin3PSteeringSnapshot(e) {
  currentSession().host.modelStringsCache.recordAdmin3PSteeringSnapshot(e);
}
/**
 * 状态访问器：读取当前会话的 host（host） → 模型字符串缓存（modelStringsCache） 上的 admin3PSteeringSnapshot()。
 */
//@ chunk-ndmse9kj.js:89013-89088 facade-majority
function getAdmin3PSteeringSnapshot() {
  return currentSession().host.modelStringsCache.admin3PSteeringSnapshot();
}
/**
 * 状态访问器：调用当前会话的 host（host） → 模型字符串缓存（modelStringsCache） 上的 recordProbeRefutedDocumentDefault()。
 */
//@ chunk-ndmse9kj.js:89088-89168 facade-majority
function recordProbeRefutedDocumentDefault(e) {
  currentSession().host.modelStringsCache.recordProbeRefutedDocumentDefault(e);
}
/**
 * 状态访问器：读取当前会话的 host（host） → 模型字符串缓存（modelStringsCache） 上的 probeRefutedDocumentDefaults()。
 */
//@ chunk-ndmse9kj.js:89168-89248 facade-majority
function getProbeRefutedDocumentDefaults() {
  return currentSession().host.modelStringsCache.probeRefutedDocumentDefaults();
}
/**
 * 状态访问器：读取当前会话的 host（host） → 遥测句柄（telemetryHandles） 上的 loggerProvider()。
 */
//@ chunk-ndmse9kj.js:89248-89313 facade-majority = getLoggerProvider (0.729)
function getLoggerProvider() {
  return currentSession().host.telemetryHandles.loggerProvider();
}
/**
 * 状态访问器：写入当前会话的 host（host） → 遥测句柄（telemetryHandles） 上的 replaceLoggerProvider()。
 */
//@ chunk-ndmse9kj.js:89313-89380 facade-majority
function setLoggerProvider(e) {
  currentSession().host.telemetryHandles.replaceLoggerProvider(e);
}
/**
 * 状态访问器：读取当前会话的 host（host） → 遥测句柄（telemetryHandles） 上的 eventLogger()。
 */
//@ chunk-ndmse9kj.js:89380-89442 facade-majority = getEventLogger (0.711)
function getEventLogger() {
  return currentSession().host.telemetryHandles.eventLogger();
}
/**
 * 状态访问器：读取当前会话的 host（host） → 遥测句柄（telemetryHandles） 上的 eventLoggerOwner()。
 */
//@ chunk-ndmse9kj.js:89442-89509 facade-majority
function getEventLoggerOwner() {
  return currentSession().host.telemetryHandles.eventLoggerOwner();
}
/**
 * 状态访问器：调用当前会话的 host（host） → 遥测句柄（telemetryHandles） 上的 attachEventLogger()。
 */
//@ chunk-ndmse9kj.js:89509-89582 facade-majority
function setEventLogger(e, n = "org") {
  currentSession().host.telemetryHandles.attachEventLogger(e, n);
}
/**
 * 状态访问器：调用当前会话的 host（host） → 遥测句柄（telemetryHandles） 上的 bufferPendingEvent()。
 */
//@ chunk-ndmse9kj.js:89582-89653 facade-majority
function bufferPendingOTelEvent(e) {
  return currentSession().host.telemetryHandles.bufferPendingEvent(e);
}
/**
 * 状态访问器：调用当前会话的 host（host） → 遥测句柄（telemetryHandles） 上的 closeWindow()。
 */
//@ chunk-ndmse9kj.js:89653-89710 facade-majority
function discardPendingOTelEvents(e) {
  currentSession().host.telemetryHandles.closeWindow(e);
}
/**
 * 状态访问器：读取当前会话的 host（host） → 遥测句柄（telemetryHandles） 上的 windowCloseCause()。
 */
//@ chunk-ndmse9kj.js:89710-89777 facade-majority
function getOTelWindowCloseCause() {
  return currentSession().host.telemetryHandles.windowCloseCause();
}
/**
 * 状态访问器：读取当前会话的 host（host） → 遥测句柄（telemetryHandles） 上的 isWindowOpen()。
 */
//@ chunk-ndmse9kj.js:89777-89840 facade-majority
function isOTelInitPending() {
  return currentSession().host.telemetryHandles.isWindowOpen();
}
/**
 * 状态访问器：读取当前会话的 host（host） → 遥测句柄（telemetryHandles） 上的 hostOtel()。
 */
//@ chunk-ndmse9kj.js:89840-89899 facade-majority
function getHostOtelState() {
  return currentSession().host.telemetryHandles.hostOtel();
}
/**
 * 状态访问器：读取当前会话的 host（host） → 遥测句柄（telemetryHandles） 上的 tracerProvider()。
 */
//@ chunk-ndmse9kj.js:89899-89964 facade-majority = getTracerProvider (0.729)
function getTracerProvider() {
  return currentSession().host.telemetryHandles.tracerProvider();
}
/**
 * 状态访问器：写入当前会话的 host（host） → 遥测句柄（telemetryHandles） 上的 replaceTracerProvider()。
 */
//@ chunk-ndmse9kj.js:89964-90031 facade-majority
function setTracerProvider(e) {
  currentSession().host.telemetryHandles.replaceTracerProvider(e);
}
/**
 * 状态访问器：读取当前会话的 host（host） → 请求锁存（requestLatches） 上的 foundryDeploymentCapabilities()。
 */
//@ chunk-ndmse9kj.js:90031-90109 facade-majority
function getFoundryDeploymentCapabilities() {
  return currentSession().host.requestLatches.foundryDeploymentCapabilities();
}
/**
 * 状态访问器：读取当前会话的 host（host） → 遥测句柄（telemetryHandles） 上的 cachedTelemetryResource()。
 */
//@ chunk-ndmse9kj.js:90109-90183 facade-majority
function getCachedTelemetryResource() {
  return currentSession().host.telemetryHandles.cachedTelemetryResource();
}
/**
 * 状态访问器：写入当前会话的 host（host） → 遥测句柄（telemetryHandles） 上的 replaceCachedTelemetryResource()。
 */
//@ chunk-ndmse9kj.js:90183-90259 facade-majority
function setCachedTelemetryResource(e) {
  currentSession().host.telemetryHandles.replaceCachedTelemetryResource(e);
}
/**
 * 状态访问器：调用当前会话的 host（host） → 遥测句柄（telemetryHandles） 上的 cachedOtlpHttpAgentFactory()。
 */
//@ chunk-ndmse9kj.js:90259-90342 facade-majority
function getCachedOtlpHttpAgentFactory(e, n) {
  return currentSession().host.telemetryHandles.cachedOtlpHttpAgentFactory(e, n);
}
/**
 * 状态访问器：写入当前会话的 host（host） → 遥测句柄（telemetryHandles） 上的 replaceCachedOtlpHttpAgentFactory()。
 */
//@ chunk-ndmse9kj.js:90342-90429 facade-majority
function setCachedOtlpHttpAgentFactory(e, n, o) {
  currentSession().host.telemetryHandles.replaceCachedOtlpHttpAgentFactory(e, n, o);
}
/**
 * getIsNonInteractiveSession：!launchOptions.isInteractive()。
 */
//@ chunk-ndmse9kj.js:90429-90489 facade-majority = getIsNonInteractiveSession (0.711)
function getIsNonInteractiveSession() {
  return !currentSession().host.launchOptions.isInteractive();
}
/**
 * 状态访问器：读取当前会话的 host（host） → 启动选项（launchOptions） 上的 spareClaimState()。
 */
//@ chunk-ndmse9kj.js:90489-90552 facade-majority
function getSpareClaimState() {
  return currentSession().host.launchOptions.spareClaimState();
}
/**
 * 会话状态函数 isParkedSpare：涉及当前会话的 host.launchOptions.spareClaimState。
 */
//@ chunk-ndmse9kj.js:90552-90625 facade-majority
function isParkedSpare() {
  return currentSession().host.launchOptions.spareClaimState() === "parked";
}
/**
 * 会话状态函数 markSpareParked：涉及当前会话的 host.launchOptions。
 */
//@ chunk-ndmse9kj.js:90625-90741 facade-majority
function markSpareParked() {
  let launchOptions = currentSession().host.launchOptions;
  (launchOptions.replaceSpareClaimState("parked"), launchOptions.replaceSpareParkedAtMs(Date.now()));
}
/**
 * 会话状态函数 markSpareClaiming：涉及当前会话的 host.launchOptions。
 */
//@ chunk-ndmse9kj.js:90741-90882 facade-majority
function markSpareClaiming() {
  let launchOptions = currentSession().host.launchOptions,
    spareParkedAtMs = launchOptions.spareParkedAtMs();
  return (
    launchOptions.replaceSpareClaimState("claiming"),
    spareParkedAtMs === void 0 ? void 0 : Date.now() - spareParkedAtMs
  );
}
/**
 * 状态访问器：写入当前会话的 host（host） → 启动选项（launchOptions） 上的 replaceSpareClaimState()。
 */
//@ chunk-ndmse9kj.js:90882-90954 facade-majority
function markSpareClaimed() {
  currentSession().host.launchOptions.replaceSpareClaimState("claimed");
}
/**
 * 状态访问器：写入当前会话的 host（host） → 启动选项（launchOptions） 上的 replaceSpareClaimState()。
 */
//@ chunk-ndmse9kj.js:90954-91025 facade-majority
function markSpareClaimFailed() {
  currentSession().host.launchOptions.replaceSpareClaimState("failed");
}
/**
 * 会话状态函数 isUnclaimedSpare：涉及当前会话的 host.launchOptions.spareClaimState。
 */
//@ chunk-ndmse9kj.js:91025-91137 facade-majority
function isUnclaimedSpare() {
  let spareClaimState = currentSession().host.launchOptions.spareClaimState();
  return spareClaimState === "parked" || spareClaimState === "claiming" || spareClaimState === "failed";
}
/**
 * 状态访问器：读取当前会话的 host（host） → 启动选项（launchOptions） 上的 isInteractive()。
 */
//@ chunk-ndmse9kj.js:91137-91197 facade-majority = getIsInteractive (0.711)
function getIsInteractive() {
  return currentSession().host.launchOptions.isInteractive();
}
/**
 * 状态访问器：读取当前会话的 host（host） → 启动选项（launchOptions） 上的 isInteractivityDecided()。
 */
//@ chunk-ndmse9kj.js:91197-91267 facade-majority
function isInteractivityDecided() {
  return currentSession().host.launchOptions.isInteractivityDecided();
}
/**
 * 状态访问器：读取当前会话的 host（host） → 启动选项（launchOptions） 上的 isNoDialogLaunch()。
 */
//@ chunk-ndmse9kj.js:91267-91331 facade-majority
function isNoDialogLaunch() {
  return currentSession().host.launchOptions.isNoDialogLaunch();
}
/**
 * 状态访问器：调用当前会话的 host（host） → 启动选项（launchOptions） 上的 markNoDialogLaunch()。
 */
//@ chunk-ndmse9kj.js:91331-91390 facade-majority
function markNoDialogLaunch() {
  currentSession().host.launchOptions.markNoDialogLaunch();
}
/**
 * setIsInteractive：写 launchOptions.isInteractive；变化时让所有 HostScoped 缓存失效。
 */
//@ chunk-ndmse9kj.js:91390-91540 facade-majority = setIsInteractive (0.384)
function setIsInteractive(value) {
  let n = currentSession(),
    o = n.host.launchOptions.isInteractive() !== value;
  if ((n.host.launchOptions.replaceIsInteractive(value), o)) lEr.of(n.host).invalidateAll();
}
/**
 * 状态访问器：读取当前会话的 host（host） → 启动选项（launchOptions） 上的 printOutputFormat()。
 */
//@ chunk-ndmse9kj.js:91540-91605 facade-majority
function getPrintOutputFormat() {
  return currentSession().host.launchOptions.printOutputFormat();
}
/**
 * 状态访问器：写入当前会话的 host（host） → 启动选项（launchOptions） 上的 replacePrintOutputFormat()。
 */
//@ chunk-ndmse9kj.js:91605-91672 facade-majority
function setPrintOutputFormat(e) {
  currentSession().host.launchOptions.replacePrintOutputFormat(e);
}
/**
 * 状态访问器：读取当前会话的 host（host） → 启动选项（launchOptions） 上的 thinkingDisplayExplicit()。
 */
//@ chunk-ndmse9kj.js:91672-91743 facade-majority
function getThinkingDisplayExplicit() {
  return currentSession().host.launchOptions.thinkingDisplayExplicit();
}
/**
 * 状态访问器：写入当前会话的 host（host） → 启动选项（launchOptions） 上的 replaceThinkingDisplayExplicit()。
 */
//@ chunk-ndmse9kj.js:91743-91816 facade-majority
function setThinkingDisplayExplicit(e) {
  currentSession().host.launchOptions.replaceThinkingDisplayExplicit(e);
}
/**
 * 状态访问器：读取当前会话的 host（host） → 启动选项（launchOptions） 上的 permissionPromptToolName()。
 */
//@ chunk-ndmse9kj.js:91816-91887 facade-majority
function getPermissionPromptToolName() {
  return currentSession().host.launchOptions.permissionPromptToolName();
}
/**
 * 状态访问器：写入当前会话的 host（host） → 启动选项（launchOptions） 上的 replacePermissionPromptToolName()。
 */
//@ chunk-ndmse9kj.js:91887-91961 facade-majority
function setPermissionPromptToolName(e) {
  currentSession().host.launchOptions.replacePermissionPromptToolName(e);
}
/**
 * 状态访问器：读取当前会话的 宿主能力（surfaceCapabilities） 上的 attacherCaps()。
 */
//@ chunk-ndmse9kj.js:91961-92021 facade-majority
function getAttacherCaps() {
  return currentSession().surfaceCapabilities.attacherCaps();
}
/**
 * 状态访问器：写入当前会话的 宿主能力（surfaceCapabilities） 上的 replaceAttacherCaps()。
 */
//@ chunk-ndmse9kj.js:92021-92084 facade-majority
function setAttacherCaps(e) {
  currentSession().surfaceCapabilities.replaceAttacherCaps(e);
}
/**
 * 状态访问器：调用当前会话的 宿主能力（surfaceCapabilities） → attacherCapsChanged 上的 subscribe()。
 */
//@ chunk-ndmse9kj.js:92084-92163 facade-majority
function onAttacherCapsChange(e) {
  return currentSession().surfaceCapabilities.attacherCapsChanged.subscribe(e);
}
/**
 * 状态访问器：读取当前会话的 宿主能力（surfaceCapabilities） 上的 rvSupervisorLinkLive()。
 */
//@ chunk-ndmse9kj.js:92163-92232 facade-majority
function getRvSupervisorLinkLive() {
  return currentSession().surfaceCapabilities.rvSupervisorLinkLive();
}
/**
 * 状态访问器：写入当前会话的 宿主能力（surfaceCapabilities） 上的 replaceRvSupervisorLinkLive()。
 */
//@ chunk-ndmse9kj.js:92232-92303 facade-majority
function setRvSupervisorLinkLive(e) {
  currentSession().surfaceCapabilities.replaceRvSupervisorLinkLive(e);
}
/**
 * 状态访问器：调用当前会话的 宿主能力（surfaceCapabilities） → rvSupervisorLinkChanged 上的 subscribe()。
 */
//@ chunk-ndmse9kj.js:92303-92387 facade-majority
function onRvSupervisorLinkChange(e) {
  return currentSession().surfaceCapabilities.rvSupervisorLinkChanged.subscribe(e);
}
/**
 * 状态访问器：读取当前会话的 host（host） → 启动选项（launchOptions） 上的 hasStreamingInput()。
 */
//@ chunk-ndmse9kj.js:92387-92452 facade-majority
function getHasStreamingInput() {
  return currentSession().host.launchOptions.hasStreamingInput();
}
/**
 * 状态访问器：写入当前会话的 host（host） → 启动选项（launchOptions） 上的 replaceHasStreamingInput()。
 */
//@ chunk-ndmse9kj.js:92452-92519 facade-majority
function setHasStreamingInput(e) {
  currentSession().host.launchOptions.replaceHasStreamingInput(e);
}
/**
 * 是否为单次 -p（无流式输入、无 --sdk-url）。
 */
//@ chunk-ndmse9kj.js:92519-92577 facade-majority
function deriveSingleShotPrintSession({ hasStreamingInput: hasStreamingInput, sdkUrl: sdkUrl }) {
  return !hasStreamingInput && !sdkUrl;
}
//@ chunk-ndmse9kj.js:92577-92797 layout
function resolveOwnEventsSink(e) {
  if (e.entrypoint === "terminal") return e.ownEventsRequested ? "terminal" : "none";
  if (e.ownEventsOnly) return "evals";
  if (e.hasStreamingInput || e.sdkUrl) return "host";
  if (e.ownEventsRequested) return "evals";
  return "none";
}
/**
 * 状态访问器：写入当前会话的 host（host） → 启动选项（launchOptions） 上的 replaceSingleShotPrintSession()。
 */
//@ chunk-ndmse9kj.js:92797-92869 facade-majority
function setSingleShotPrintSession(e) {
  currentSession().host.launchOptions.replaceSingleShotPrintSession(e);
}
/**
 * 状态访问器：读取当前会话的 host（host） → 启动选项（launchOptions） 上的 singleShotPrintSession()。
 */
//@ chunk-ndmse9kj.js:92869-92938 facade-majority
function isSingleShotPrintSession() {
  return currentSession().host.launchOptions.singleShotPrintSession();
}
/**
 * 状态访问器：调用当前会话的 host（host） → 启动选项（launchOptions） 上的 markPrintInputClosed()。
 */
//@ chunk-ndmse9kj.js:92938-92999 facade-majority
function markPrintInputClosed() {
  currentSession().host.launchOptions.markPrintInputClosed();
}
/**
 * 状态访问器：读取当前会话的 host（host） → 启动选项（launchOptions） 上的 printInputClosed()。
 */
//@ chunk-ndmse9kj.js:92999-93063 facade-majority
function isPrintInputClosed() {
  return currentSession().host.launchOptions.printInputClosed();
}
/**
 * 状态访问器：读取当前会话的 host（host） → 启动选项（launchOptions） 上的 clientType()。
 */
//@ chunk-ndmse9kj.js:93063-93121 facade-majority = getClientType (0.739)
function getClientType() {
  return currentSession().host.launchOptions.clientType();
}
/**
 * 状态访问器：写入当前会话的 host（host） → 启动选项（launchOptions） 上的 replaceClientType()。
 */
//@ chunk-ndmse9kj.js:93121-93181 facade-majority
function setClientType(e) {
  currentSession().host.launchOptions.replaceClientType(e);
}
/**
 * 状态访问器：读取当前会话的 host（host） → 启动选项（launchOptions） 上的 sdkAgentProgressSummariesEnabled()。
 */
//@ chunk-ndmse9kj.js:93181-93261 facade-majority = getSdkAgentProgressSummariesEnabled (0.763)
function getSdkAgentProgressSummariesEnabled() {
  return currentSession().host.launchOptions.sdkAgentProgressSummariesEnabled();
}
/**
 * 状态访问器：写入当前会话的 host（host） → 启动选项（launchOptions） 上的 replaceSdkAgentProgressSummariesEnabled()。
 */
//@ chunk-ndmse9kj.js:93261-93343 facade-majority
function setSdkAgentProgressSummariesEnabled(e) {
  currentSession().host.launchOptions.replaceSdkAgentProgressSummariesEnabled(e);
}
/**
 * 状态访问器：读取当前会话的 host（host） → 启动选项（launchOptions） 上的 rendererMode()。
 */
//@ chunk-ndmse9kj.js:93343-93403 facade-majority
function getRendererModeForAnalytics() {
  return currentSession().host.launchOptions.rendererMode();
}
/**
 * 状态访问器：写入当前会话的 host（host） → 启动选项（launchOptions） 上的 replaceRendererMode()。
 */
//@ chunk-ndmse9kj.js:93403-93465 facade-majority
function setRendererModeForAnalytics(e) {
  currentSession().host.launchOptions.replaceRendererMode(e);
}
/**
 * 状态访问器：读取当前会话的 host（host） → 启动选项（launchOptions） 上的 strictToolResultPairing()。
 */
//@ chunk-ndmse9kj.js:93465-93536 facade-majority = getStrictToolResultPairing (0.763)
function getStrictToolResultPairing() {
  return currentSession().host.launchOptions.strictToolResultPairing();
}
/**
 * 状态访问器：读取当前会话的 host（host） → 启动选项（launchOptions） 上的 restrictedSession()。
 */
//@ chunk-ndmse9kj.js:93536-93600 facade-majority
function isRestrictedSession() {
  return currentSession().host.launchOptions.restrictedSession();
}
/**
 * 状态访问器：写入当前会话的 host（host） → 启动选项（launchOptions） 上的 replaceRestrictedSession()。
 */
//@ chunk-ndmse9kj.js:93600-93667 facade-majority
function setRestrictedSession(e) {
  currentSession().host.launchOptions.replaceRestrictedSession(e);
}
/**
 * 会话状态函数 getWorkspaceRestriction：涉及当前会话的 host.launchOptions.workspaceRestrictionState。
 */
//@ chunk-ndmse9kj.js:93667-93759 facade-majority
function getWorkspaceRestriction() {
  return currentSession().host.launchOptions.workspaceRestrictionState()?.restriction ?? null;
}
/**
 * 是否处于受限工作区。
 */
//@ chunk-ndmse9kj.js:93759-93793 facade-majority
function isWorkspaceRestricted() {
  return getWorkspaceRestriction() !== null;
}
/**
 * 会话状态函数 findRestrictedWorkspaceRoot：涉及当前会话的 host.launchOptions.restrictedWorkspaceRoots。
 */
//@ chunk-ndmse9kj.js:93793-93940 layout
function findRestrictedWorkspaceRoot(e) {
  for (let [n, o] of currentSession().host.launchOptions.restrictedWorkspaceRoots())
    if (e === n || e.startsWith(n.endsWith(sep) ? n : n + sep)) return o;
  return null;
}
/**
 * 路径是否在受限工作区根之下。
 */
//@ chunk-ndmse9kj.js:93940-93976 facade-majority
function isUnderRestrictedWorkspaceRoot(e) {
  return findRestrictedWorkspaceRoot(e) !== null;
}
/**
 * 会话状态函数 isRestrictedWorkspaceTrustKey：涉及当前会话的 host.launchOptions.restrictedWorkspaceRoots。
 */
//@ chunk-ndmse9kj.js:93976-94148 facade-majority
function isRestrictedWorkspaceTrustKey(e) {
  if (getWorkspaceRestriction()?.gateKeys.includes(e)) return !0;
  for (let n of currentSession().host.launchOptions.restrictedWorkspaceRoots().values())
    if (n.gateKeys.includes(e)) return !0;
  return !1;
}
/**
 * 状态访问器：读取当前会话的 会话标志（sessionFlags） 上的 accountMemoryLaunchMode()。
 */
//@ chunk-ndmse9kj.js:94148-94213 facade-majority
function getAccountMemoryLaunchMode() {
  return currentSession().sessionFlags.accountMemoryLaunchMode();
}
/**
 * 状态访问器：读取当前会话的 会话标志（sessionFlags） 上的 memoryToggledOff()。
 */
//@ chunk-ndmse9kj.js:94213-94270 facade-majority
function getMemoryToggledOff() {
  return currentSession().sessionFlags.memoryToggledOff();
}
/**
 * 设置“记忆已暂停”（/memory 开关），变化时通知订阅者。
 */
//@ chunk-ndmse9kj.js:94270-94403 facade-majority
function setMemoryToggledOff(e) {
  let n = currentSession();
  if (n.sessionFlags.memoryToggledOff() === e) return;
  (n.sessionFlags.replaceMemoryToggledOff(e), memoryToggleListeners.of(n).emit(e));
}
//@ chunk-ndmse9kj.js:94403-94427 layout
var memoryToggleListeners = new SessionRootSlot(() => createSignal());
/**
 * 订阅记忆暂停变化。
 */
//@ chunk-ndmse9kj.js:94427-94478 facade-majority
function onMemoryPauseChange(e, n = currentSession()) {
  return memoryToggleListeners.of(n).subscribe(e);
}
/**
 * 状态访问器：读取当前会话的 会话标志（sessionFlags） 上的 autoMemoryOffThisSession()。
 */
//@ chunk-ndmse9kj.js:94478-94544 facade-majority
function getAutoMemoryOffThisSession() {
  return currentSession().sessionFlags.autoMemoryOffThisSession();
}
/**
 * 设置本会话关闭自动记忆；账户记忆模式非 off 时同时清除命令导致的暂停。
 */
//@ chunk-ndmse9kj.js:94544-94794 facade-majority
function setAutoMemoryOffThisSession(e) {
  let n = currentSession();
  if (n.sessionFlags.autoMemoryOffThisSession() === e) return;
  if (
    (n.sessionFlags.replaceAutoMemoryOffThisSession(e), n.sessionFlags.accountMemorySessionMode() !== "off")
  )
    n.sessionFlags.replaceMemoryPausedByCommand(!1);
  autoMemoryOffListeners.of(n).emit(e);
}
//@ chunk-ndmse9kj.js:94794-94818 layout
var autoMemoryOffListeners = new SessionRootSlot(() => createSignal());
/**
 * 订阅本会话自动记忆开关变化。
 */
//@ chunk-ndmse9kj.js:94818-94869 facade-majority
function onAutoMemorySessionSwitchChange(e, n = currentSession()) {
  return autoMemoryOffListeners.of(n).subscribe(e);
}
/**
 * 状态访问器：读取当前会话的 会话标志（sessionFlags） 上的 restoredMemoryPause()。
 */
//@ chunk-ndmse9kj.js:94869-94930 facade-majority
function getRestoredMemoryPause() {
  return currentSession().sessionFlags.restoredMemoryPause();
}
/**
 * 状态访问器：写入当前会话的 会话标志（sessionFlags） 上的 replaceRestoredMemoryPause()。
 */
//@ chunk-ndmse9kj.js:94930-94993 facade-majority
function setRestoredMemoryPause(e) {
  currentSession().sessionFlags.replaceRestoredMemoryPause(e);
}
/**
 * 状态访问器：读取当前会话的 会话标志（sessionFlags） 上的 restoredAutoMemoryOff()。
 */
//@ chunk-ndmse9kj.js:94993-95056 facade-majority
function getRestoredAutoMemoryOff() {
  return currentSession().sessionFlags.restoredAutoMemoryOff();
}
/**
 * 状态访问器：写入当前会话的 会话标志（sessionFlags） 上的 replaceRestoredAutoMemoryOff()。
 */
//@ chunk-ndmse9kj.js:95056-95121 facade-majority
function setRestoredAutoMemoryOff(e) {
  currentSession().sessionFlags.replaceRestoredAutoMemoryOff(e);
}
/**
 * 会话状态函数 setWizardOperatorToolsEnabled：涉及当前会话的 host.launchOptions.replaceWizardOperatorToolsEnabled。
 */
//@ chunk-ndmse9kj.js:95121-95315 facade-majority
function setWizardOperatorToolsEnabled(e) {
  if (e === !1)
    throw Error(
      "setWizardOperatorToolsEnabled(false) is test-only: the wizard latch is one-way in production",
    );
  currentSession().host.launchOptions.replaceWizardOperatorToolsEnabled(e);
}
/**
 * 状态访问器：读取当前会话的 host（host） → 启动选项（launchOptions） 上的 wizardOperatorToolsEnabled()。
 */
//@ chunk-ndmse9kj.js:95315-95389 facade-majority
function getWizardOperatorToolsEnabled() {
  return currentSession().host.launchOptions.wizardOperatorToolsEnabled();
}
/**
 * runner 声明“嵌套仓库差异”（单向锁存，false 只用于测试）。
 */
//@ chunk-ndmse9kj.js:95389-95607 facade-majority
function setRunnerDeclaredNestedRepositoryDiff(e) {
  if (e === !1)
    throw Error(
      "setRunnerDeclaredNestedRepositoryDiff(false) is test-only: the runner's declaration is one-way in production",
    );
  currentSession().host.launchOptions.replaceRunnerDeclaredNestedRepositoryDiff(e);
}
/**
 * 状态访问器：读取当前会话的 host（host） → 启动选项（launchOptions） 上的 runnerDeclaredNestedRepositoryDiff()。
 */
//@ chunk-ndmse9kj.js:95607-95689 facade-majority
function getRunnerDeclaredNestedRepositoryDiff() {
  return currentSession().host.launchOptions.runnerDeclaredNestedRepositoryDiff();
}
/**
 * runner 声明“未检出仓库”（单向锁存）。
 */
//@ chunk-ndmse9kj.js:95689-95911 facade-majority
function setRunnerDeclaredNoRepositoryCheckedOut(e) {
  if (e === !1)
    throw Error(
      "setRunnerDeclaredNoRepositoryCheckedOut(false) is test-only: the runner's declaration is one-way in production",
    );
  currentSession().host.launchOptions.replaceRunnerDeclaredNoRepositoryCheckedOut(e);
}
/**
 * 状态访问器：读取当前会话的 host（host） → 启动选项（launchOptions） 上的 runnerDeclaredNoRepositoryCheckedOut()。
 */
//@ chunk-ndmse9kj.js:95911-95995 facade-majority
function getRunnerDeclaredNoRepositoryCheckedOut() {
  return currentSession().host.launchOptions.runnerDeclaredNoRepositoryCheckedOut();
}
/**
 * runner 声明“每会话全新机器”（单向锁存）。
 */
//@ chunk-ndmse9kj.js:95995-96217 facade-majority
function setRunnerDeclaredFreshMachinePerSession(e) {
  if (e === !1)
    throw Error(
      "setRunnerDeclaredFreshMachinePerSession(false) is test-only: the runner's declaration is one-way in production",
    );
  currentSession().host.launchOptions.replaceRunnerDeclaredFreshMachinePerSession(e);
}
/**
 * 状态访问器：读取当前会话的 host（host） → 启动选项（launchOptions） 上的 pollEventIngress()。
 */
//@ chunk-ndmse9kj.js:96217-96281 facade-majority
function getPollEventIngress() {
  return currentSession().host.launchOptions.pollEventIngress();
}
/**
 * poll_event 入口是否已接线。
 */
//@ chunk-ndmse9kj.js:96281-96318 facade-majority
function isPollEventIngressWired() {
  return getPollEventIngress() !== "none";
}
/**
 * 状态访问器：调用当前会话的 host（host） → 启动选项（launchOptions） 上的 markPollEventIngress()。
 */
//@ chunk-ndmse9kj.js:96318-96380 layout
function markPollEventIngress(e) {
  currentSession().host.launchOptions.markPollEventIngress(e);
}
/**
 * 状态访问器：调用当前会话的 host（host） → 启动选项（launchOptions） 上的 markOwnEventDeliveryRequested()。
 */
//@ chunk-ndmse9kj.js:96380-96449 layout
function markOwnEventDeliveryRequested() {
  currentSession().host.launchOptions.markOwnEventDeliveryRequested();
}
/**
 * 按本次运行的入口/输入方式决定自有事件的去向（terminal/evals/host）并记录。
 */
//@ chunk-ndmse9kj.js:96449-96558 facade-majority
function markPollEventWiringForRun(e) {
  let n = resolveOwnEventsSink(e);
  if (n !== "none" && !(n === "host" && getPollEventIngress() === "evals")) markPollEventIngress(n);
  if (e.ownEventsRequested) markOwnEventDeliveryRequested();
}
/**
 * 状态访问器：读取当前会话的 host（host） → 启动选项（launchOptions） 上的 userMsgOptIn()。
 */
//@ chunk-ndmse9kj.js:96558-96617 facade-majority = getUserMsgOptIn (0.763)
function getUserMsgOptIn() {
  return currentSession().host.launchOptions.userMsgOptIn();
}
/**
 * 状态访问器：写入当前会话的 host（host） → 启动选项（launchOptions） 上的 replaceUserMsgOptIn()。
 */
//@ chunk-ndmse9kj.js:96617-96679 facade-majority
function setUserMsgOptIn(e) {
  currentSession().host.launchOptions.replaceUserMsgOptIn(e);
}
/**
 * 状态访问器：读取当前会话的 host（host） → 启动选项（launchOptions） 上的 searchToolsOptIn()。
 */
//@ chunk-ndmse9kj.js:96679-96743 facade-majority
function getSearchToolsOptIn() {
  return currentSession().host.launchOptions.searchToolsOptIn();
}
/**
 * 状态访问器：写入当前会话的 host（host） → 启动选项（launchOptions） 上的 replaceSearchToolsOptIn()。
 */
//@ chunk-ndmse9kj.js:96743-96809 facade-majority
function setSearchToolsOptIn(e) {
  currentSession().host.launchOptions.replaceSearchToolsOptIn(e);
}
/**
 * 状态访问器：读取当前会话的 host（host） → 启动选项（launchOptions） 上的 todoToolsOptIn()。
 */
//@ chunk-ndmse9kj.js:96809-96871 facade-majority
function getTodoToolsOptIn() {
  return currentSession().host.launchOptions.todoToolsOptIn();
}
/**
 * 状态访问器：写入当前会话的 host（host） → 启动选项（launchOptions） 上的 replaceTodoToolsOptIn()。
 */
//@ chunk-ndmse9kj.js:96871-96935 facade-majority
function setTodoToolsOptIn(e) {
  currentSession().host.launchOptions.replaceTodoToolsOptIn(e);
}
/**
 * 状态访问器：读取当前会话的 host（host） → 启动选项（launchOptions） 上的 toolsOmittedByLaunchList()。
 */
//@ chunk-ndmse9kj.js:96935-97007 facade-majority
function getToolsOmittedByLaunchList() {
  return currentSession().host.launchOptions.toolsOmittedByLaunchList();
}
/**
 * 会话状态函数 setToolsOmittedByLaunchList：涉及当前会话的 host.launchOptions.replaceToolsOmittedByLaunchList。
 */
//@ chunk-ndmse9kj.js:97007-97090 facade-majority
function setToolsOmittedByLaunchList(e) {
  currentSession().host.launchOptions.replaceToolsOmittedByLaunchList(new Set(e));
}
/**
 * 状态访问器：读取当前会话的 host（host） → 启动选项（launchOptions） 上的 sessionStartType()。
 */
//@ chunk-ndmse9kj.js:97090-97154 facade-majority
function getSessionStartType() {
  return currentSession().host.launchOptions.sessionStartType();
}
/**
 * 状态访问器：写入当前会话的 host（host） → 启动选项（launchOptions） 上的 replaceSessionStartType()。
 */
//@ chunk-ndmse9kj.js:97154-97220 facade-majority
function setSessionStartType(e) {
  currentSession().host.launchOptions.replaceSessionStartType(e);
}
/**
 * 状态访问器：读取当前会话的 host（host） → 启动选项（launchOptions） 上的 questionPreviewFormat()。
 */
//@ chunk-ndmse9kj.js:97220-97289 facade-majority = getQuestionPreviewFormat (0.763)
function getQuestionPreviewFormat() {
  return currentSession().host.launchOptions.questionPreviewFormat();
}
/**
 * 状态访问器：写入当前会话的 host（host） → 启动选项（launchOptions） 上的 replaceQuestionPreviewFormat()。
 */
//@ chunk-ndmse9kj.js:97289-97360 facade-majority
function setQuestionPreviewFormat(e) {
  currentSession().host.launchOptions.replaceQuestionPreviewFormat(e);
}
/**
 * 状态访问器：读取当前会话的 host（host） → 启动选项（launchOptions） 上的 extendedQuestionsEnabled()。
 */
//@ chunk-ndmse9kj.js:97360-97432 facade-majority
function getExtendedQuestionsEnabled() {
  return currentSession().host.launchOptions.extendedQuestionsEnabled();
}
/**
 * 状态访问器：写入当前会话的 host（host） → 启动选项（launchOptions） 上的 replaceExtendedQuestionsEnabled()。
 */
//@ chunk-ndmse9kj.js:97432-97506 facade-majority
function setExtendedQuestionsEnabled(e) {
  currentSession().host.launchOptions.replaceExtendedQuestionsEnabled(e);
}
/**
 * 状态访问器：读取当前会话的 host（host） → 启动选项（launchOptions） 上的 questionOptionDescriptionsOptional()。
 */
//@ chunk-ndmse9kj.js:97506-97588 facade-majority
function getQuestionOptionDescriptionsOptional() {
  return currentSession().host.launchOptions.questionOptionDescriptionsOptional();
}
/**
 * 状态访问器：写入当前会话的 host（host） → 启动选项（launchOptions） 上的 replaceQuestionOptionDescriptionsOptional()。
 */
//@ chunk-ndmse9kj.js:97588-97672 facade-majority
function setQuestionOptionDescriptionsOptional(e) {
  currentSession().host.launchOptions.replaceQuestionOptionDescriptionsOptional(e);
}
/**
 * 状态访问器：读取当前会话的 会话暂存（sessionScratch） 上的 agentColorMap()。
 */
//@ chunk-ndmse9kj.js:97672-97729 facade-majority = getAgentColorMap (0.739)
function getAgentColorMap() {
  return currentSession().sessionScratch.agentColorMap();
}
/**
 * 状态访问器：读取当前会话的 host（host） → 设置来源（settingsSource） 上的 flagSettingsPath()。
 */
//@ chunk-ndmse9kj.js:97729-97793 facade-majority = getFlagSettingsPath (0.725)
function getFlagSettingsPath() {
  return currentSession().host.settingsSource.flagSettingsPath();
}
/**
 * 状态访问器：写入当前会话的 host（host） → 设置来源（settingsSource） 上的 replaceFlagSettingsPath()。
 */
//@ chunk-ndmse9kj.js:97793-97860 facade-majority
function setFlagSettingsPath(e) {
  currentSession().host.settingsSource.replaceFlagSettingsPath(e);
}
/**
 * 状态访问器：读取当前会话的 host（host） → 设置来源（settingsSource） 上的 flagAgentsFilePaths()。
 */
//@ chunk-ndmse9kj.js:97860-97928 facade-majority
function getFlagAgentsFilePaths() {
  return currentSession().host.settingsSource.flagAgentsFilePaths();
}
/**
 * 状态访问器：写入当前会话的 host（host） → 设置来源（settingsSource） 上的 replaceFlagAgentsFilePaths()。
 */
//@ chunk-ndmse9kj.js:97928-97998 facade-majority
function setFlagAgentsFilePaths(e) {
  currentSession().host.settingsSource.replaceFlagAgentsFilePaths(e);
}
/**
 * 状态访问器：读取当前会话的 host（host） → 设置来源（settingsSource） 上的 flagMcpConfigFilePaths()。
 */
//@ chunk-ndmse9kj.js:97998-98069 facade-majority
function getFlagMcpConfigFilePaths() {
  return currentSession().host.settingsSource.flagMcpConfigFilePaths();
}
/**
 * 状态访问器：写入当前会话的 host（host） → 设置来源（settingsSource） 上的 replaceFlagMcpConfigFilePaths()。
 */
//@ chunk-ndmse9kj.js:98069-98142 facade-majority
function setFlagMcpConfigFilePaths(e) {
  currentSession().host.settingsSource.replaceFlagMcpConfigFilePaths(e);
}
/**
 * 状态访问器：读取当前会话的 host（host） → 设置来源（settingsSource） 上的 flagSettingsExpectedContent()。
 */
//@ chunk-ndmse9kj.js:98142-98217 facade-majority
function getFlagSettingsExpectedContent() {
  return currentSession().host.settingsSource.flagSettingsExpectedContent();
}
/**
 * 状态访问器：写入当前会话的 host（host） → 设置来源（settingsSource） 上的 replaceFlagSettingsExpectedContent()。
 */
//@ chunk-ndmse9kj.js:98217-98295 facade-majority
function setFlagSettingsExpectedContent(e) {
  currentSession().host.settingsSource.replaceFlagSettingsExpectedContent(e);
}
/**
 * 状态访问器：读取当前会话的 host（host） → 设置来源（settingsSource） 上的 flagSettingsFilePinnedContent()。
 */
//@ chunk-ndmse9kj.js:98295-98372 facade-majority
function getFlagSettingsFilePinnedContent() {
  return currentSession().host.settingsSource.flagSettingsFilePinnedContent();
}
/**
 * 状态访问器：写入当前会话的 host（host） → 设置来源（settingsSource） 上的 replaceFlagSettingsFilePinnedContent()。
 */
//@ chunk-ndmse9kj.js:98372-98452 facade-majority
function setFlagSettingsFilePinnedContent(e) {
  currentSession().host.settingsSource.replaceFlagSettingsFilePinnedContent(e);
}
/**
 * 状态访问器：读取当前会话的 host（host） → 设置来源（settingsSource） 上的 flagSettingsInline()。
 */
//@ chunk-ndmse9kj.js:98452-98518 facade-majority = getFlagSettingsInline (0.719)
function getFlagSettingsInline() {
  return currentSession().host.settingsSource.flagSettingsInline();
}
/**
 * 状态访问器：写入当前会话的 host（host） → 设置来源（settingsSource） 上的 replaceFlagSettingsInline()。
 */
//@ chunk-ndmse9kj.js:98518-98586 facade-majority
function setFlagSettingsInline(e) {
  currentSession().host.settingsSource.replaceFlagSettingsInline(e);
}
/**
 * 状态访问器：读取当前会话的 host（host） → 设置来源（settingsSource） 上的 parentManagedSettings()。
 */
//@ chunk-ndmse9kj.js:98586-98656 facade-majority
function getParentManagedSettings() {
  return currentSession().host.settingsSource.parentManagedSettings();
}
/**
 * 状态访问器：写入当前会话的 host（host） → 设置来源（settingsSource） 上的 replaceParentManagedSettings()。
 */
//@ chunk-ndmse9kj.js:98656-98737 facade-majority
function setParentManagedSettings(e, n = null) {
  currentSession().host.settingsSource.replaceParentManagedSettings(e, n);
}
/**
 * 状态访问器：读取当前会话的 host（host） → 设置来源（settingsSource） 上的 parentManagedSettingsInvalid()。
 */
//@ chunk-ndmse9kj.js:98737-98814 facade-majority
function getParentManagedSettingsInvalid() {
  return currentSession().host.settingsSource.parentManagedSettingsInvalid();
}
/**
 * 状态访问器：写入当前会话的 host（host） → 设置来源（settingsSource） 上的 replaceParentManagedSettingsInvalid()。
 */
//@ chunk-ndmse9kj.js:98814-98893 facade-majority
function setParentManagedSettingsInvalid(e) {
  currentSession().host.settingsSource.replaceParentManagedSettingsInvalid(e);
}
/**
 * 状态访问器：读取当前会话的 host（host） → 设置来源（settingsSource） 上的 parentOrganizationSettings()。
 */
//@ chunk-ndmse9kj.js:98893-98968 facade-majority
function getParentOrganizationSettings() {
  return currentSession().host.settingsSource.parentOrganizationSettings();
}
/**
 * 会话状态函数 getSessionIngressToken：涉及当前会话的 host.credentialSlots.sessionIngressToken。
 */
//@ chunk-ndmse9kj.js:98968-99079 facade-majority = getSessionIngressToken (0.53)
function getSessionIngressToken() {
  let e = agentContextGetter();
  return e ? e.secrets.sessionIngressToken : currentSession().host.credentialSlots.sessionIngressToken();
}
/**
 * 会话状态函数 setSessionIngressToken：涉及当前会话的 host.credentialSlots.replaceSessionIngressToken。
 */
//@ chunk-ndmse9kj.js:99079-99202 facade-majority = setSessionIngressToken (0.411)
function setSessionIngressToken(token) {
  let n = agentContextGetter();
  if (n) n.secrets.sessionIngressToken = token;
  else currentSession().host.credentialSlots.replaceSessionIngressToken(token);
}
/**
 * 状态访问器：读取当前会话的 host（host） → 凭证槽（credentialSlots） 上的 oauthTokenFromFd()。
 */
//@ chunk-ndmse9kj.js:99202-99267 facade-majority = getOauthTokenFromFd (0.739)
function getOauthTokenFromFd() {
  return currentSession().host.credentialSlots.oauthTokenFromFd();
}
/**
 * 状态访问器：写入当前会话的 host（host） → 凭证槽（credentialSlots） 上的 replaceOauthTokenFromFd()。
 */
//@ chunk-ndmse9kj.js:99267-99334 facade-majority
function setOauthTokenFromFd(e) {
  currentSession().host.credentialSlots.replaceOauthTokenFromFd(e);
}
/**
 * 状态访问器：读取当前会话的 host（host） → 凭证槽（credentialSlots） 上的 oauthTokenFromBgSnapshot()。
 */
//@ chunk-ndmse9kj.js:99334-99407 facade-majority
function isOauthTokenFromBgSnapshot() {
  return currentSession().host.credentialSlots.oauthTokenFromBgSnapshot();
}
/**
 * 状态访问器：写入当前会话的 host（host） → 凭证槽（credentialSlots） 上的 replaceOauthTokenFromBgSnapshot()。
 */
//@ chunk-ndmse9kj.js:99407-99483 facade-majority
function setOauthTokenFromBgSnapshot(e) {
  currentSession().host.credentialSlots.replaceOauthTokenFromBgSnapshot(e);
}
/**
 * 状态访问器：读取当前会话的 host（host） → 凭证槽（credentialSlots） 上的 loginStashedInTokenSlot()。
 */
//@ chunk-ndmse9kj.js:99483-99556 facade-majority
function getLoginStashedInTokenSlot() {
  return currentSession().host.credentialSlots.loginStashedInTokenSlot();
}
/**
 * 状态访问器：写入当前会话的 host（host） → 凭证槽（credentialSlots） 上的 replaceLoginStashedInTokenSlot()。
 */
//@ chunk-ndmse9kj.js:99556-99631 facade-majority
function setLoginStashedInTokenSlot(e) {
  currentSession().host.credentialSlots.replaceLoginStashedInTokenSlot(e);
}
/**
 * 状态访问器：读取当前会话的 host（host） → 凭证槽（credentialSlots） 上的 oauthOrgFromBgSnapshot()。
 */
//@ chunk-ndmse9kj.js:99631-99703 facade-majority
function getOauthOrgFromBgSnapshot() {
  return currentSession().host.credentialSlots.oauthOrgFromBgSnapshot();
}
/**
 * 状态访问器：写入当前会话的 host（host） → 凭证槽（credentialSlots） 上的 replaceOauthOrgFromBgSnapshot()。
 */
//@ chunk-ndmse9kj.js:99703-99777 facade-majority
function setOauthOrgFromBgSnapshot(e) {
  currentSession().host.credentialSlots.replaceOauthOrgFromBgSnapshot(e);
}
/**
 * 状态访问器：读取当前会话的 host（host） → 凭证槽（credentialSlots） 上的 oauthScopesFromFd()。
 */
//@ chunk-ndmse9kj.js:99777-99844 facade-majority
function getOauthScopesFromFd() {
  return currentSession().host.credentialSlots.oauthScopesFromFd();
}
/**
 * 状态访问器：写入当前会话的 host（host） → 凭证槽（credentialSlots） 上的 replaceOauthScopesFromFd()。
 */
//@ chunk-ndmse9kj.js:99844-99913 facade-majority
function setOauthScopesFromFd(e) {
  currentSession().host.credentialSlots.replaceOauthScopesFromFd(e);
}
/**
 * 状态访问器：读取当前会话的 host（host） → 凭证槽（credentialSlots） 上的 apiKeyFromFd()。
 */
//@ chunk-ndmse9kj.js:99913-99975 facade-majority = getApiKeyFromFd (0.739)
function getApiKeyFromFd() {
  return currentSession().host.credentialSlots.apiKeyFromFd();
}
/**
 * 状态访问器：写入当前会话的 host（host） → 凭证槽（credentialSlots） 上的 replaceApiKeyFromFd()。
 */
//@ chunk-ndmse9kj.js:99975-100039 facade-majority
function setApiKeyFromFd(e) {
  currentSession().host.credentialSlots.replaceApiKeyFromFd(e);
}
/**
 * 状态访问器：调用当前会话的 host（host） → 凭证槽（credentialSlots） 上的 descriptorAnnouncementConsumed()。
 */
//@ chunk-ndmse9kj.js:100039-100121 facade-majority
function wasDescriptorAnnouncementConsumed(e) {
  return currentSession().host.credentialSlots.descriptorAnnouncementConsumed(e);
}
/**
 * 状态访问器：调用当前会话的 host（host） → 凭证槽（credentialSlots） 上的 markDescriptorAnnouncementConsumed()。
 */
//@ chunk-ndmse9kj.js:100121-100200 facade-majority
function markDescriptorAnnouncementConsumed(e) {
  currentSession().host.credentialSlots.markDescriptorAnnouncementConsumed(e);
}
/**
 * 状态访问器：调用当前会话的 host（host） → 凭证槽（credentialSlots） 上的 credentialRoad()。
 */
//@ chunk-ndmse9kj.js:100200-100266 facade-majority
function getCredentialRoad(e) {
  return currentSession().host.credentialSlots.credentialRoad(e);
}
/**
 * 状态访问器：调用当前会话的 host（host） → 凭证槽（credentialSlots） 上的 noteCredentialRoad()。
 */
//@ chunk-ndmse9kj.js:100266-100337 facade-majority
function noteCredentialRoad(e, n, o) {
  currentSession().host.credentialSlots.noteCredentialRoad(e, n, o);
}
/**
 * 状态访问器：读取当前会话的 host（host） → 凭证槽（credentialSlots） 上的 gatewayTokenFromDescriptor()。
 */
//@ chunk-ndmse9kj.js:100337-100413 facade-majority
function getGatewayTokenFromDescriptor() {
  return currentSession().host.credentialSlots.gatewayTokenFromDescriptor();
}
/**
 * 状态访问器：写入当前会话的 host（host） → 凭证槽（credentialSlots） 上的 replaceGatewayTokenFromDescriptor()。
 */
//@ chunk-ndmse9kj.js:100413-100491 facade-majority
function setGatewayTokenFromDescriptor(e) {
  currentSession().host.credentialSlots.replaceGatewayTokenFromDescriptor(e);
}
/**
 * 状态访问器：调用当前会话的 host（host） → 凭证槽（credentialSlots） 上的 resetFdCredentialState()。
 */
//@ chunk-ndmse9kj.js:100491-100556 facade-majority
function resetFdCredentialState() {
  currentSession().host.credentialSlots.resetFdCredentialState();
}
/**
 * 状态访问器：读取当前会话的 host（host） → 凭证槽（credentialSlots） 上的 gatewayAuth()。
 */
//@ chunk-ndmse9kj.js:100556-100616 facade-majority
function getGatewayAuth() {
  return currentSession().host.credentialSlots.gatewayAuth();
}
/**
 * 会话状态函数 isGatewayAuthExpired：涉及当前会话的 host.credentialSlots.gatewayAuth。
 */
//@ chunk-ndmse9kj.js:100616-100711 facade-majority
function isGatewayAuthExpired() {
  let gatewayAuth = currentSession().host.credentialSlots.gatewayAuth();
  return !!gatewayAuth && gatewayAuth.expiresAt <= Date.now();
}
/**
 * 网关认证是否已固定（非 unpinned）。
 */
//@ chunk-ndmse9kj.js:100711-100749 facade-majority
function isGatewayAuthPinned(e) {
  return !!e && !e.unpinned;
}
/**
 * 网关认证是否经宿主验证。
 */
//@ chunk-ndmse9kj.js:100749-100832 facade-majority
function isHostVerifiedGatewayAuth(e) {
  let n = e?.hostVerdict;
  return n !== void 0 && "verified" in n && n.verified;
}
/**
 * 网关是否提供托管设置（固定或经验证）。
 */
//@ chunk-ndmse9kj.js:100832-100869 facade-majority
function gatewayServesManagedSettings(e) {
  return isGatewayAuthPinned(e) || isHostVerifiedGatewayAuth(e);
}
/**
 * 状态访问器：写入当前会话的 host（host） → 凭证槽（credentialSlots） 上的 replaceGatewayServerProcess()。
 */
//@ chunk-ndmse9kj.js:100869-100941 facade-majority
function setGatewayServerProcess(e) {
  currentSession().host.credentialSlots.replaceGatewayServerProcess(e);
}
/**
 * 状态访问器：读取当前会话的 host（host） → 凭证槽（credentialSlots） 上的 gatewayServerProcess()。
 */
//@ chunk-ndmse9kj.js:100941-101011 facade-majority
function isGatewayServerProcess() {
  return currentSession().host.credentialSlots.gatewayServerProcess();
}
/**
 * 状态访问器：写入当前会话的 host（host） → 凭证槽（credentialSlots） 上的 replaceGatewayRequiredByHostPolicyReader()。
 */
//@ chunk-ndmse9kj.js:101011-101096 facade-majority
function setGatewayRequiredByHostPolicyReader(e) {
  currentSession().host.credentialSlots.replaceGatewayRequiredByHostPolicyReader(e);
}
/**
 * 状态访问器：读取当前会话的 host（host） → 凭证槽（credentialSlots） 上的 gatewayRequiredByHostPolicy()。
 */
//@ chunk-ndmse9kj.js:101096-101173 facade-majority
function isGatewayRequiredByHostPolicy() {
  return currentSession().host.credentialSlots.gatewayRequiredByHostPolicy();
}
/**
 * 状态访问器：写入当前会话的 host（host） → 凭证槽（credentialSlots） 上的 replaceGatewayAuth()。
 */
//@ chunk-ndmse9kj.js:101173-101236 facade-majority
function setGatewayAuth(e) {
  currentSession().host.credentialSlots.replaceGatewayAuth(e);
}
/**
 * 状态访问器：调用当前会话的 host（host） → 凭证槽（credentialSlots） 上的 isGatewayHostHeldStrict()。
 */
//@ chunk-ndmse9kj.js:101236-101311 facade-majority
function isGatewayHostHeldStrict(e) {
  return currentSession().host.credentialSlots.isGatewayHostHeldStrict(e);
}
/**
 * 会话状态函数 holdGatewayHostStrict：涉及当前会话的 host.credentialSlots.holdGatewayHostStrict。
 */
//@ chunk-ndmse9kj.js:101311-101395 facade-majority
function holdGatewayHostStrict(e) {
  currentSession().host.credentialSlots.holdGatewayHostStrict(e.replace(/\.$/, ""));
}
/**
 * 会话状态函数 releaseGatewayHost：涉及当前会话的 host.credentialSlots.releaseGatewayHost。
 */
//@ chunk-ndmse9kj.js:101395-101476 facade-majority
function releaseGatewayHost(e) {
  currentSession().host.credentialSlots.releaseGatewayHost(e.replace(/\.$/, ""));
}
/**
 * 状态访问器：读取当前会话的 host（host） → 凭证槽（credentialSlots） 上的 authenticatedAccount()。
 */
//@ chunk-ndmse9kj.js:101476-101546 facade-majority
function getAuthenticatedAccount() {
  return currentSession().host.credentialSlots.authenticatedAccount();
}
/**
 * 状态访问器：调用当前会话的 host（host） → 凭证槽（credentialSlots） 上的 stampAuthenticatedAccount()。
 */
//@ chunk-ndmse9kj.js:101546-101616 facade-majority
function setAuthenticatedAccount(e) {
  currentSession().host.credentialSlots.stampAuthenticatedAccount(e);
}
/**
 * 状态访问器：读取当前会话的 host（host） → 凭证槽（credentialSlots） 上的 authenticatedAccountEpoch()。
 */
//@ chunk-ndmse9kj.js:101616-101691 facade-majority
function getAuthenticatedAccountEpoch() {
  return currentSession().host.credentialSlots.authenticatedAccountEpoch();
}
/**
 * 状态访问器：读取当前会话的 host（host） → 凭证槽（credentialSlots） 上的 bearerPlan()。
 */
//@ chunk-ndmse9kj.js:101691-101751 facade-majority
function getBearerPlan() {
  return currentSession().host.credentialSlots.bearerPlan();
}
/**
 * 状态访问器：写入当前会话的 host（host） → 凭证槽（credentialSlots） 上的 replaceBearerPlan()。
 */
//@ chunk-ndmse9kj.js:101751-101813 facade-majority
function setBearerPlan(e) {
  currentSession().host.credentialSlots.replaceBearerPlan(e);
}
/**
 * 状态访问器：读取当前会话的 host（host） → 凭证槽（credentialSlots） 上的 startupPolicySnapshot()。
 */
//@ chunk-ndmse9kj.js:101813-101884 facade-majority
function getStartupPolicySnapshot() {
  return currentSession().host.credentialSlots.startupPolicySnapshot();
}
/**
 * 状态访问器：写入当前会话的 host（host） → 凭证槽（credentialSlots） 上的 replaceStartupPolicySnapshot()。
 */
//@ chunk-ndmse9kj.js:101884-101957 facade-majority
function setStartupPolicySnapshot(e) {
  currentSession().host.credentialSlots.replaceStartupPolicySnapshot(e);
}
/**
 * 状态访问器：读取当前会话的 host（host） → 凭证槽（credentialSlots） 上的 gatewayRefreshInFlight()。
 */
//@ chunk-ndmse9kj.js:101957-102029 facade-majority
function getGatewayRefreshInFlight() {
  return currentSession().host.credentialSlots.gatewayRefreshInFlight();
}
/**
 * 状态访问器：写入当前会话的 host（host） → 凭证槽（credentialSlots） 上的 replaceGatewayRefreshInFlight()。
 */
//@ chunk-ndmse9kj.js:102029-102103 facade-majority
function setGatewayRefreshInFlight(e) {
  currentSession().host.credentialSlots.replaceGatewayRefreshInFlight(e);
}
/**
 * 状态访问器：写入当前会话的 请求日志（requestJournal） 上的 replaceLastAPIRequest()。
 */
//@ chunk-ndmse9kj.js:102103-102163 facade-majority
function setLastAPIRequest(e) {
  currentSession().requestJournal.replaceLastAPIRequest(e);
}
/**
 * 状态访问器：读取当前会话的 请求日志（requestJournal） 上的 lastAPIRequest()。
 */
//@ chunk-ndmse9kj.js:102163-102221 facade-majority = setLastAPIRequest (0.736)
function getLastAPIRequest() {
  return currentSession().requestJournal.lastAPIRequest();
}
/**
 * 状态访问器：写入当前会话的 请求日志（requestJournal） 上的 replaceLastCancelledAPIMessageId()。
 */
//@ chunk-ndmse9kj.js:102221-102292 facade-majority
function setLastCancelledAPIMessageId(e) {
  currentSession().requestJournal.replaceLastCancelledAPIMessageId(e);
}
/**
 * 状态访问器：读取当前会话的 请求日志（requestJournal） 上的 lastCancelledAPIMessageId()。
 */
//@ chunk-ndmse9kj.js:102292-102361 facade-majority
function getLastCancelledAPIMessageId() {
  return currentSession().requestJournal.lastCancelledAPIMessageId();
}
/**
 * 状态访问器：写入当前会话的 请求日志（requestJournal） 上的 replaceLastAPIRequestMessages()。
 */
//@ chunk-ndmse9kj.js:102361-102429 facade-majority
function setLastAPIRequestMessages(e) {
  currentSession().requestJournal.replaceLastAPIRequestMessages(e);
}
/**
 * 状态访问器：写入当前会话的 请求日志（requestJournal） 上的 replaceLastClassifierRequests()。
 */
//@ chunk-ndmse9kj.js:102429-102497 facade-majority
function setLastClassifierRequests(e) {
  currentSession().requestJournal.replaceLastClassifierRequests(e);
}
/**
 * 状态访问器：读取当前会话的 请求日志（requestJournal） 上的 lastClassifierRequests()。
 */
//@ chunk-ndmse9kj.js:102497-102563 facade-majority = setLastClassifierRequests (0.736)
function getLastClassifierRequests() {
  return currentSession().requestJournal.lastClassifierRequests();
}
/**
 * 会话状态函数 setCachedClaudeMdContent：涉及当前会话的 sessionFlags.replaceCachedClaudeMdContent。
 */
//@ chunk-ndmse9kj.js:102563-102674 facade-majority
function setCachedClaudeMdContent(e) {
  let n = getAgentContext();
  if (n) n.cachedClaudeMdContent = e;
  else currentSession().sessionFlags.replaceCachedClaudeMdContent(e);
}
/**
 * 会话状态函数 getCachedClaudeMdContent：涉及当前会话的 sessionFlags.cachedClaudeMdContent。
 */
//@ chunk-ndmse9kj.js:102674-102773 facade-majority = setCachedClaudeMdContent (0.74)
function getCachedClaudeMdContent() {
  let e = getAgentContext();
  return e ? e.cachedClaudeMdContent : currentSession().sessionFlags.cachedClaudeMdContent();
}
/**
 * getAllowedSettingSources：受限工作区时去掉仓库目录下的设置来源。
 */
//@ chunk-ndmse9kj.js:102773-102958 facade-majority
function getAllowedSettingSources() {
  let { settingsSource: settingsSource, launchOptions: launchOptions } = currentSession().host;
  return launchOptions.workspaceRestrictionState()?.restriction
    ? settingsSource.allowedSettingSourcesWithoutRepoDirSources()
    : settingsSource.allowedSettingSources();
}
/**
 * 状态访问器：读取当前会话的 host（host） → 设置来源（settingsSource） 上的 allowedSettingSources()。
 */
//@ chunk-ndmse9kj.js:102958-103028 facade-majority = getAllowedSettingSources (0.725)
function getAllowedSettingSourcesAsConfigured() {
  return currentSession().host.settingsSource.allowedSettingSources();
}
/**
 * 状态访问器：写入当前会话的 host（host） → 设置来源（settingsSource） 上的 replaceAllowedSettingSources()。
 */
//@ chunk-ndmse9kj.js:103028-103100 facade-majority
function setAllowedSettingSources(e) {
  currentSession().host.settingsSource.replaceAllowedSettingSources(e);
}
/**
 * 会话状态函数 preferThirdPartyAuthentication：涉及当前会话的 host.launchOptions.clientType。
 */
//@ chunk-ndmse9kj.js:103100-103182 facade-majority = preferThirdPartyAuthentication (0.88)
function preferThirdPartyAuthentication() {
  return getIsNonInteractiveSession() && currentSession().host.launchOptions.clientType() !== "claude-vscode";
}
/**
 * 状态访问器：写入当前会话的 host（host） → 扩展配置（extensionsConfig） 上的 replaceInlinePlugins()。
 */
//@ chunk-ndmse9kj.js:103182-103247 facade-majority
function setInlinePlugins(e) {
  currentSession().host.extensionsConfig.replaceInlinePlugins(e);
}
/**
 * 状态访问器：读取当前会话的 host（host） → 扩展配置（extensionsConfig） 上的 inlinePlugins()。
 */
//@ chunk-ndmse9kj.js:103247-103310 facade-majority = setInlinePlugins (0.729)
function getInlinePlugins() {
  return currentSession().host.extensionsConfig.inlinePlugins();
}
/**
 * 状态访问器：写入当前会话的 host（host） → 扩展配置（extensionsConfig） 上的 replaceInlinePluginsNoMcp()。
 */
//@ chunk-ndmse9kj.js:103310-103381 facade-majority
function setInlinePluginsNoMcp(e) {
  currentSession().host.extensionsConfig.replaceInlinePluginsNoMcp(e);
}
/**
 * 状态访问器：读取当前会话的 host（host） → 扩展配置（extensionsConfig） 上的 inlinePluginsNoMcp()。
 */
//@ chunk-ndmse9kj.js:103381-103449 facade-majority
function getInlinePluginsNoMcp() {
  return currentSession().host.extensionsConfig.inlinePluginsNoMcp();
}
/**
 * 状态访问器：写入当前会话的 host（host） → 扩展配置（extensionsConfig） 上的 replaceInlinePluginUrls()。
 */
//@ chunk-ndmse9kj.js:103449-103518 facade-majority
function setInlinePluginUrls(e) {
  currentSession().host.extensionsConfig.replaceInlinePluginUrls(e);
}
/**
 * 状态访问器：读取当前会话的 host（host） → 扩展配置（extensionsConfig） 上的 inlinePluginUrls()。
 */
//@ chunk-ndmse9kj.js:103518-103585 facade-majority
function getInlinePluginUrls() {
  return currentSession().host.extensionsConfig.inlinePluginUrls();
}
/**
 * 状态访问器：写入当前会话的 host（host） → 扩展配置（extensionsConfig） 上的 replaceSyncedPluginDirs()。
 */
//@ chunk-ndmse9kj.js:103585-103662 facade-majority
function setSyncedPluginDirs(e, n, o) {
  currentSession().host.extensionsConfig.replaceSyncedPluginDirs(e, n, o);
}
/**
 * 状态访问器：调用当前会话的 host（host） → 扩展配置（extensionsConfig） 上的 syncedPluginRowId()。
 */
//@ chunk-ndmse9kj.js:103662-103732 facade-majority
function getSyncedPluginRowId(e) {
  return currentSession().host.extensionsConfig.syncedPluginRowId(e);
}
/**
 * 状态访问器：调用当前会话的 host（host） → 扩展配置（extensionsConfig） 上的 syncedPluginAttestation()。
 */
//@ chunk-ndmse9kj.js:103732-103808 facade-majority
function getSyncedPluginAttestation(e) {
  return currentSession().host.extensionsConfig.syncedPluginAttestation(e);
}
/**
 * 状态访问器：写入当前会话的 host（host） → 扩展配置（extensionsConfig） 上的 replaceAttestedOfficialPluginIds()。
 */
//@ chunk-ndmse9kj.js:103808-103886 facade-majority
function setAttestedOfficialPluginIds(e) {
  currentSession().host.extensionsConfig.replaceAttestedOfficialPluginIds(e);
}
/**
 * 状态访问器：调用当前会话的 host（host） → 扩展配置（extensionsConfig） 上的 attestedOfficialPluginMarketplace()。
 */
//@ chunk-ndmse9kj.js:103886-103972 facade-majority
function getAttestedOfficialPluginMarketplace(e) {
  return currentSession().host.extensionsConfig.attestedOfficialPluginMarketplace(e);
}
/**
 * 状态访问器：读取当前会话的 host（host） → 扩展配置（extensionsConfig） 上的 syncedPluginDirsRegistered()。
 */
//@ chunk-ndmse9kj.js:103972-104049 facade-majority
function hasRegisteredSyncedPluginDirs() {
  return currentSession().host.extensionsConfig.syncedPluginDirsRegistered();
}
/**
 * 会话状态函数 hasSyncedPluginLaneOpened：涉及当前会话的 pluginsSync.syncedLaneOpened。
 */
//@ chunk-ndmse9kj.js:104049-104104 facade-majority
function hasSyncedPluginLaneOpened() {
  return currentSession().pluginsSync.syncedLaneOpened;
}
/**
 * 会话状态函数 markSyncedPluginLaneOpened：涉及当前会话的 pluginsSync.syncedLaneOpened。
 */
//@ chunk-ndmse9kj.js:104104-104155 facade-majority
function markSyncedPluginLaneOpened() {
  currentSession().pluginsSync.syncedLaneOpened = !0;
}
/**
 * 会话状态函数 markSyncedPluginDirsLoadedHere：涉及当前会话的 pluginsSync.syncedDirsLoadedHere.add。
 */
//@ chunk-ndmse9kj.js:104155-104233 facade-majority
function markSyncedPluginDirsLoadedHere(e) {
  for (let n of e) currentSession().pluginsSync.syncedDirsLoadedHere.add(resolve(n));
}
/**
 * 会话状态函数 isSyncedPluginDirLoadedHere：涉及当前会话的 pluginsSync.syncedDirsLoadedHere.has。
 */
//@ chunk-ndmse9kj.js:104233-104303 facade-majority
function isSyncedPluginDirLoadedHere(e) {
  return currentSession().pluginsSync.syncedDirsLoadedHere.has(resolve(e));
}
/**
 * 会话状态函数 markSyncedPluginDirNewHere：涉及当前会话的 pluginsSync.dirsNewHere.add。
 */
//@ chunk-ndmse9kj.js:104303-104357 facade-majority
function markSyncedPluginDirNewHere(e) {
  currentSession().pluginsSync.dirsNewHere.add(resolve(e));
}
/**
 * 会话状态函数 setAwaitsFirstRun：涉及当前会话的 pluginsSync.awaitsFirstRun。
 */
//@ chunk-ndmse9kj.js:104357-104406 facade-majority
function setAwaitsFirstRun(e) {
  currentSession().pluginsSync.awaitsFirstRun = e;
}
/**
 * 会话状态函数 isSyncedPluginDirUnused：涉及当前会话的 pluginsSync。
 */
//@ chunk-ndmse9kj.js:104406-104496 facade-majority
function isSyncedPluginDirUnused(e) {
  let { awaitsFirstRun: awaitsFirstRun, dirsNewHere: dirsNewHere } = currentSession().pluginsSync;
  return awaitsFirstRun && dirsNewHere.has(resolve(e));
}
/**
 * 会话状态函数 getSyncedPluginReloadDebt：涉及当前会话的 pluginsSync。
 */
//@ chunk-ndmse9kj.js:104496-104533 facade-majority
function getSyncedPluginReloadDebt() {
  return currentSession().pluginsSync;
}
/**
 * 会话状态函数 getLastCompleteSyncedPluginList：涉及当前会话的 pluginsSync.lastCompleteList。
 */
//@ chunk-ndmse9kj.js:104533-104588 facade-majority
function getLastCompleteSyncedPluginList() {
  return currentSession().pluginsSync.lastCompleteList;
}
/**
 * 会话状态函数 getLastSyncedLaneLoad：涉及当前会话的 pluginsSync.lastSyncedLaneLoad。
 */
//@ chunk-ndmse9kj.js:104588-104645 facade-majority
function getLastSyncedLaneLoad() {
  return currentSession().pluginsSync.lastSyncedLaneLoad;
}
/**
 * 会话状态函数 setLastSyncedLaneLoad：涉及当前会话的 pluginsSync.lastSyncedLaneLoad。
 */
//@ chunk-ndmse9kj.js:104645-104698 facade-majority
function setLastSyncedLaneLoad(e) {
  currentSession().pluginsSync.lastSyncedLaneLoad = e;
}
/**
 * 清除同步插件目录与插件同步状态。
 */
//@ chunk-ndmse9kj.js:104698-104965 facade-majority
function clearSyncedPluginDirs() {
  (currentSession().host.extensionsConfig.clearSyncedPluginDirs(),
    (currentSession().pluginsSync.syncedLaneOpened = !1),
    currentSession().pluginsSync.syncedDirsLoadedHere.clear(),
    currentSession().pluginsSync.dirsNewHere.clear(),
    currentSession().pluginsSync.removalsDeferredHere.clear(),
    (currentSession().pluginsSync.lastSyncedLaneLoad = null));
}
/**
 * 状态访问器：读取当前会话的 host（host） → 扩展配置（extensionsConfig） 上的 syncedPluginDirs()。
 */
//@ chunk-ndmse9kj.js:104965-105031 facade-majority
function getSyncedPluginDirs() {
  return currentSession().host.extensionsConfig.syncedPluginDirs();
}
/**
 * 状态访问器：写入当前会话的 会话标志（sessionFlags） 上的 replaceAccountSkillsSyncEnabled()。
 */
//@ chunk-ndmse9kj.js:105031-105099 facade-majority
function setAccountSkillsSyncEnabled(e) {
  currentSession().sessionFlags.replaceAccountSkillsSyncEnabled(e);
}
/**
 * 状态访问器：读取当前会话的 会话标志（sessionFlags） 上的 accountSkillsSyncEnabled()。
 */
//@ chunk-ndmse9kj.js:105099-105165 facade-majority
function getAccountSkillsSyncEnabled() {
  return currentSession().sessionFlags.accountSkillsSyncEnabled();
}
/**
 * 状态访问器：写入当前会话的 会话标志（sessionFlags） 上的 replaceSkillsSyncVetoed()。
 */
//@ chunk-ndmse9kj.js:105165-105225 facade-majority
function setSkillsSyncVetoed(e) {
  currentSession().sessionFlags.replaceSkillsSyncVetoed(e);
}
/**
 * 状态访问器：读取当前会话的 会话标志（sessionFlags） 上的 skillsSyncVetoed()。
 */
//@ chunk-ndmse9kj.js:105225-105282 facade-majority
function getSkillsSyncVetoed() {
  return currentSession().sessionFlags.skillsSyncVetoed();
}
/**
 * 状态访问器：写入当前会话的 会话标志（sessionFlags） 上的 replaceAccountPluginsSyncEnabled()。
 */
//@ chunk-ndmse9kj.js:105282-105351 facade-majority
function setAccountPluginsSyncEnabled(e) {
  currentSession().sessionFlags.replaceAccountPluginsSyncEnabled(e);
}
/**
 * 状态访问器：读取当前会话的 会话标志（sessionFlags） 上的 accountPluginsSyncEnabled()。
 */
//@ chunk-ndmse9kj.js:105351-105418 facade-majority
function getAccountPluginsSyncEnabled() {
  return currentSession().sessionFlags.accountPluginsSyncEnabled();
}
/**
 * 状态访问器：写入当前会话的 会话标志（sessionFlags） 上的 replacePluginsSyncVetoed()。
 */
//@ chunk-ndmse9kj.js:105418-105479 facade-majority
function setPluginsSyncVetoed(e) {
  currentSession().sessionFlags.replacePluginsSyncVetoed(e);
}
/**
 * 状态访问器：读取当前会话的 会话标志（sessionFlags） 上的 pluginsSyncVetoed()。
 */
//@ chunk-ndmse9kj.js:105479-105537 facade-majority
function getPluginsSyncVetoed() {
  return currentSession().sessionFlags.pluginsSyncVetoed();
}
/**
 * 状态访问器：写入当前会话的 host（host） → 扩展配置（extensionsConfig） 上的 replaceChromeFlagOverride()。
 */
//@ chunk-ndmse9kj.js:105537-105608 facade-majority
function setChromeFlagOverride(e) {
  currentSession().host.extensionsConfig.replaceChromeFlagOverride(e);
}
/**
 * 状态访问器：读取当前会话的 host（host） → 扩展配置（extensionsConfig） 上的 chromeFlagOverride()。
 */
//@ chunk-ndmse9kj.js:105608-105677 facade-majority = setChromeFlagOverride (0.729)
function getChromeFlagOverride() {
  return currentSession().host.extensionsConfig.chromeFlagOverride();
}
/**
 * 状态访问器：写入当前会话的 host（host） → 扩展配置（extensionsConfig） 上的 replaceTeammateAgentId()。
 */
//@ chunk-ndmse9kj.js:105677-105745 facade-majority
function setTeammateAgentId(e) {
  currentSession().host.extensionsConfig.replaceTeammateAgentId(e);
}
/**
 * 状态访问器：读取当前会话的 host（host） → 扩展配置（extensionsConfig） 上的 teammateAgentId()。
 */
//@ chunk-ndmse9kj.js:105745-105810 facade-majority
function getTeammateAgentId() {
  return currentSession().host.extensionsConfig.teammateAgentId();
}
/**
 * 状态访问器：写入当前会话的 会话标志（sessionFlags） 上的 replaceOnboardingShownThisSession()。
 */
//@ chunk-ndmse9kj.js:105810-105880 facade-majority
function setOnboardingShownThisSession(e) {
  currentSession().sessionFlags.replaceOnboardingShownThisSession(e);
}
/**
 * 状态访问器：读取当前会话的 会话标志（sessionFlags） 上的 onboardingShownThisSession()。
 */
//@ chunk-ndmse9kj.js:105880-105948 facade-majority
function getOnboardingShownThisSession() {
  return currentSession().sessionFlags.onboardingShownThisSession();
}
/**
 * 设置是否使用 cowork 插件目录，并使 HostScoped 缓存失效。
 */
//@ chunk-ndmse9kj.js:105948-106053 facade-majority
function setUseCoworkPlugins(e) {
  let n = currentSession();
  (n.host.settingsSource.replaceUseCoworkPlugins(e), lEr.of(n.host).invalidateAll());
}
/**
 * 状态访问器：读取当前会话的 host（host） → 设置来源（settingsSource） 上的 useCoworkPlugins()。
 */
//@ chunk-ndmse9kj.js:106053-106118 facade-majority = setUseCoworkPlugins (0.732)
function getUseCoworkPlugins() {
  return currentSession().host.settingsSource.useCoworkPlugins();
}
/**
 * 状态访问器：写入当前会话的 host（host） → 启动选项（launchOptions） 上的 replaceDisableSlashCommands()。
 */
//@ chunk-ndmse9kj.js:106118-106188 facade-majority
function setDisableSlashCommands(e) {
  currentSession().host.launchOptions.replaceDisableSlashCommands(e);
}
/**
 * 状态访问器：读取当前会话的 host（host） → 启动选项（launchOptions） 上的 disableSlashCommands()。
 */
//@ chunk-ndmse9kj.js:106188-106255 facade-majority
function getDisableSlashCommands() {
  return currentSession().host.launchOptions.disableSlashCommands();
}
/**
 * 状态访问器：读取当前会话的 host（host） → 启动选项（launchOptions） 上的 disableFileMentions()。
 */
//@ chunk-ndmse9kj.js:106255-106322 facade-majority
function getDisableFileMentions() {
  return currentSession().host.launchOptions.disableFileMentions();
}
/**
 * 状态访问器：读取当前会话的 host（host） → 启动选项（launchOptions） 上的 sessionUploadsDir()。
 */
//@ chunk-ndmse9kj.js:106322-106386 facade-majority
function getSessionUploadsDirOverride() {
  return currentSession().host.launchOptions.sessionUploadsDir();
}
/**
 * 状态访问器：写入当前会话的 host（host） → 启动选项（launchOptions） 上的 replaceLocalUploadsRoot()。
 */
//@ chunk-ndmse9kj.js:106386-106452 facade-majority
function setLocalUploadsRoot(e) {
  currentSession().host.launchOptions.replaceLocalUploadsRoot(e);
}
/**
 * 状态访问器：读取当前会话的 host（host） → 启动选项（launchOptions） 上的 localUploadsRoot()。
 */
//@ chunk-ndmse9kj.js:106452-106516 facade-majority
function getLocalUploadsRoot() {
  return currentSession().host.launchOptions.localUploadsRoot();
}
/**
 * 状态访问器：写入当前会话的 host（host） → 启动选项（launchOptions） 上的 replaceSessionBypassPermissionsMode()。
 */
//@ chunk-ndmse9kj.js:106516-106594 facade-majority
function setSessionBypassPermissionsMode(e) {
  currentSession().host.launchOptions.replaceSessionBypassPermissionsMode(e);
}
/**
 * 状态访问器：读取当前会话的 host（host） → 启动选项（launchOptions） 上的 sessionBypassPermissionsMode()。
 */
//@ chunk-ndmse9kj.js:106594-106670 facade-majority = setSessionBypassPermissionsMode (0.763)
function getSessionBypassPermissionsMode() {
  return currentSession().host.launchOptions.sessionBypassPermissionsMode();
}
/**
 * 状态访问器：写入当前会话的 host（host） → 启动选项（launchOptions） 上的 replaceScheduledTasksEnabled()。
 */
//@ chunk-ndmse9kj.js:106670-106740 facade-majority
function setScheduledTasksEnabled(e) {
  currentSession().host.launchOptions.replaceScheduledTasksEnabled(e);
}
/**
 * 状态访问器：读取当前会话的 host（host） → 启动选项（launchOptions） 上的 scheduledTasksEnabled()。
 */
//@ chunk-ndmse9kj.js:106740-106809 facade-majority = setScheduledTasksEnabled (0.756)
function getScheduledTasksEnabled() {
  return currentSession().host.launchOptions.scheduledTasksEnabled();
}
/**
 * 状态访问器：调用当前会话的 host（host） → 启动选项（launchOptions） 上的 onScheduledTasksEnabled()。
 */
//@ chunk-ndmse9kj.js:106809-106882 facade-majority
function onScheduledTasksEnabled(e) {
  return currentSession().host.launchOptions.onScheduledTasksEnabled(e);
}
/**
 * 会话状态函数 getSessionCronTasks：优先取异步上下文覆盖对象的 sessionCronTasks；涉及当前会话的 sessionCron.tasks。
 */
//@ chunk-ndmse9kj.js:106882-106950 facade-majority = getSessionCronTasks (0.588)
function getSessionCronTasks() {
  return getAgentContext()?.sessionCronTasks ?? currentSession().sessionCron.tasks();
}
/**
 * 会话状态函数 addSessionCronTask：涉及当前会话的 sessionCron.schedule、sessionCron.changed.emit。
 */
//@ chunk-ndmse9kj.js:106950-107072 facade-majority
function addSessionCronTask(task) {
  let n = getAgentContext();
  if (n) n.sessionCronTasks.push(task);
  else currentSession().sessionCron.schedule(task);
  currentSession().sessionCron.changed.emit();
}
/**
 * 状态访问器：调用当前会话的 会话定时任务（sessionCron） 上的 chainStartedAt()。
 */
//@ chunk-ndmse9kj.js:107072-107129 facade-majority
function getLoopChainStartedAt(e) {
  return currentSession().sessionCron.chainStartedAt(e);
}
/**
 * 状态访问器：调用当前会话的 会话定时任务（sessionCron） 上的 recordChainStart()。
 */
//@ chunk-ndmse9kj.js:107129-107185 facade-majority
function setLoopChainStartedAt(e, n) {
  currentSession().sessionCron.recordChainStart(e, n);
}
/**
 * 状态访问器：调用当前会话的 会话定时任务（sessionCron） 上的 forgetChainStart()。
 */
//@ chunk-ndmse9kj.js:107185-107237 facade-majority
function deleteLoopChainStartedAt(e) {
  currentSession().sessionCron.forgetChainStart(e);
}
/**
 * 状态访问器：读取当前会话的 会话定时任务（sessionCron） 上的 tickInFlightPrompt()。
 */
//@ chunk-ndmse9kj.js:107237-107296 facade-majority
function getLoopTickInFlightPrompt() {
  return currentSession().sessionCron.tickInFlightPrompt();
}
/**
 * 状态访问器：读取当前会话的 会话定时任务（sessionCron） 上的 tickInFlightPlugin()。
 */
//@ chunk-ndmse9kj.js:107296-107355 facade-majority
function getLoopTickInFlightPlugin() {
  return currentSession().sessionCron.tickInFlightPlugin();
}
/**
 * 状态访问器：写入当前会话的 会话定时任务（sessionCron） 上的 replaceTickInFlightPrompt()。
 */
//@ chunk-ndmse9kj.js:107355-107420 facade-majority
function setLoopTickInFlightPrompt(e, n) {
  currentSession().sessionCron.replaceTickInFlightPrompt(e, n);
}
/**
 * 状态访问器：读取当前会话的 会话定时任务（sessionCron） 上的 consecutiveKeepalives()。
 */
//@ chunk-ndmse9kj.js:107420-107482 facade-majority
function getLoopConsecutiveKeepalives() {
  return currentSession().sessionCron.consecutiveKeepalives();
}
/**
 * 状态访问器：写入当前会话的 会话定时任务（sessionCron） 上的 replaceConsecutiveKeepalives()。
 */
//@ chunk-ndmse9kj.js:107482-107546 facade-majority
function setLoopConsecutiveKeepalives(e) {
  currentSession().sessionCron.replaceConsecutiveKeepalives(e);
}
/**
 * 状态访问器：读取当前会话的 会话定时任务（sessionCron） 上的 ended()。
 */
//@ chunk-ndmse9kj.js:107546-107592 facade-majority
function getLoopEnded() {
  return currentSession().sessionCron.ended();
}
/**
 * 状态访问器：读取当前会话的 会话定时任务（sessionCron） 上的 wakeFires()。
 */
//@ chunk-ndmse9kj.js:107592-107642 facade-majority
function getLoopWakeFires() {
  return currentSession().sessionCron.wakeFires();
}
/**
 * 状态访问器：调用当前会话的 会话定时任务（sessionCron） 上的 recordWakeFire()。
 */
//@ chunk-ndmse9kj.js:107642-107690 facade-majority
function recordLoopWakeFire() {
  currentSession().sessionCron.recordWakeFire();
}
/**
 * 状态访问器：调用当前会话的 会话定时任务（sessionCron） 上的 resetWakeFires()。
 */
//@ chunk-ndmse9kj.js:107690-107738 facade-majority
function resetLoopWakeFires() {
  currentSession().sessionCron.resetWakeFires();
}
/**
 * 会话状态函数 setLoopEnded：涉及当前会话的 sessionCron.replaceEnded、sessionCron.changed.emit。
 */
//@ chunk-ndmse9kj.js:107738-107822 facade-majority
function setLoopEnded(e) {
  if ((currentSession().sessionCron.replaceEnded(e), e)) currentSession().sessionCron.changed.emit();
}
/**
 * removeSessionCronTasks：按 id 删除会话级定时任务，返回删除数；删掉 loop 任务时触发唤醒。
 */
//@ chunk-ndmse9kj.js:107822-108262 facade-majority = removeSessionCronTasks (0.227)
function removeSessionCronTasks(e, { handOff: handOff = !1 } = {}) {
  if (e.length === 0) return 0;
  let idSet = new Set(e),
    r = getAgentContext(),
    i = r ? r.sessionCronTasks : currentSession().sessionCron.tasks(),
    remaining = i.filter((p) => !idSet.has(p.id)),
    removed = i.length - remaining.length;
  if (removed === 0) return 0;
  let l = !handOff && i.some((p) => p.kind === "loop" && idSet.has(p.id));
  if (r) ((r.sessionCronTasks.length = 0), r.sessionCronTasks.push(...remaining));
  else currentSession().sessionCron.replaceTasks(remaining);
  if (l) currentSession().sessionCron.pendingLoopWakeup.emit(void 0);
  return (currentSession().sessionCron.changed.emit(), removed);
}
/**
 * 状态访问器：调用当前会话的 会话定时任务（sessionCron） → changed 上的 subscribe()。
 */
//@ chunk-ndmse9kj.js:108262-108322 facade-majority
function onSessionCronsChange(e) {
  return currentSession().sessionCron.changed.subscribe(e);
}
/**
 * 状态访问器：调用当前会话的 会话定时任务（sessionCron） → pendingLoopWakeup 上的 subscribe()。
 */
//@ chunk-ndmse9kj.js:108322-108392 facade-majority
function onPendingLoopWakeupChange(e) {
  return currentSession().sessionCron.pendingLoopWakeup.subscribe(e);
}
/**
 * 状态访问器：调用当前会话的 会话定时任务（sessionCron） → pendingLoopWakeup 上的 emit()。
 */
//@ chunk-ndmse9kj.js:108392-108450 facade-majority
function announcePendingLoopWakeup(e) {
  currentSession().sessionCron.pendingLoopWakeup.emit(e);
}
/**
 * 状态访问器：写入当前会话的 会话标志（sessionFlags） 上的 replaceSessionTrustAccepted()。
 */
//@ chunk-ndmse9kj.js:108450-108513 facade-majority
function setSessionTrustAccepted(e) {
  currentSession().sessionFlags.replaceSessionTrustAccepted(e);
}
/**
 * 状态访问器：读取当前会话的 会话标志（sessionFlags） 上的 sessionTrustAccepted()。
 */
//@ chunk-ndmse9kj.js:108513-108575 facade-majority = setSessionTrustAccepted (0.747)
function getSessionTrustAccepted() {
  return currentSession().sessionFlags.sessionTrustAccepted();
}
/**
 * 状态访问器：写入当前会话的 会话标志（sessionFlags） 上的 replaceHomeTrustDialogAccepted()。
 */
//@ chunk-ndmse9kj.js:108575-108642 facade-majority
function setHomeTrustDialogAccepted(e) {
  currentSession().sessionFlags.replaceHomeTrustDialogAccepted(e);
}
/**
 * 状态访问器：读取当前会话的 会话标志（sessionFlags） 上的 homeTrustDialogAccepted()。
 */
//@ chunk-ndmse9kj.js:108642-108707 facade-majority
function getHomeTrustDialogAccepted() {
  return currentSession().sessionFlags.homeTrustDialogAccepted();
}
/**
 * 状态访问器：写入当前会话的 host（host） → 启动选项（launchOptions） 上的 replaceSessionPersistenceDisabled()。
 */
//@ chunk-ndmse9kj.js:108707-108783 facade-majority
function setSessionPersistenceDisabled(e) {
  currentSession().host.launchOptions.replaceSessionPersistenceDisabled(e);
}
/**
 * 状态访问器：读取当前会话的 host（host） → 启动选项（launchOptions） 上的 sessionPersistenceDisabled()。
 */
//@ chunk-ndmse9kj.js:108783-108856 facade-majority = setSessionPersistenceDisabled (0.763)
function isSessionPersistenceDisabled() {
  return currentSession().host.launchOptions.sessionPersistenceDisabled();
}
/**
 * isDiskless：当前会话是否无盘（不写本地文件）。
 */
//@ chunk-ndmse9kj.js:108856-108881 facade-majority
function isDiskless() {
  return isCcsTenant();
}
/**
 * 状态访问器：读取当前会话的 host（host） → 启动选项（launchOptions） 上的 diskless()。
 */
//@ chunk-ndmse9kj.js:108881-108936 facade-majority
function isCcsTenant() {
  return currentSession().host.launchOptions.diskless();
}
/**
 * isDisklessProcess：进程默认会话是否无盘。
 */
//@ chunk-ndmse9kj.js:108936-108989 facade-majority
function isDisklessProcess() {
  return defaultRootSession.host.launchOptions.diskless();
}
/**
 * 状态访问器：读取当前会话的 host（host） → 启动选项（launchOptions） 上的 ccrSessionUrl()。
 */
//@ chunk-ndmse9kj.js:108989-109050 facade-majority
function getCcrSessionUrl() {
  return currentSession().host.launchOptions.ccrSessionUrl();
}
/**
 * 状态访问器：读取当前会话的 host（host） → 启动选项（launchOptions） 上的 ccrDerivedSurface()。
 */
//@ chunk-ndmse9kj.js:109050-109115 facade-majority
function getCcrDerivedSurface() {
  return currentSession().host.launchOptions.ccrDerivedSurface();
}
/**
 * 状态访问器：写入当前会话的 host（host） → 启动选项（launchOptions） 上的 replaceEntrypointOnRequests()。
 */
//@ chunk-ndmse9kj.js:109115-109185 facade-majority
function setEntrypointOnRequests(e) {
  currentSession().host.launchOptions.replaceEntrypointOnRequests(e);
}
/**
 * 状态访问器：读取当前会话的 host（host） → 启动选项（launchOptions） 上的 entrypointOnRequests()。
 */
//@ chunk-ndmse9kj.js:109185-109252 facade-majority
function getEntrypointOnRequests() {
  return currentSession().host.launchOptions.entrypointOnRequests();
}
/**
 * 状态访问器：读取当前会话的 host（host） → 启动选项（launchOptions） 上的 autoCompactWindowSurface()。
 */
//@ chunk-ndmse9kj.js:109252-109324 facade-majority
function getAutoCompactWindowSurface() {
  return currentSession().host.launchOptions.autoCompactWindowSurface();
}
/**
 * 状态访问器：读取当前会话的 host（host） → 启动选项（launchOptions） 上的 coworkEnrollment()。
 */
//@ chunk-ndmse9kj.js:109324-109388 facade-majority
function getCoworkEnrollment() {
  return currentSession().host.launchOptions.coworkEnrollment();
}
/**
 * 状态访问器：读取当前会话的 host（host） → 启动选项（launchOptions） 上的 toolsMachine()。
 */
//@ chunk-ndmse9kj.js:109388-109447 facade-majority
function getToolsMachine() {
  return currentSession().host.launchOptions.toolsMachine();
}
/**
 * 工具使用的项目目录：会话目录绑定优先，否则 --project-config-root，否则项目根。
 */
//@ chunk-ndmse9kj.js:109447-109517 facade-majority
function getProjectDirForTools() {
  let e = getToolsMachine();
  return e ? (e.directory?.path ?? null) : (getProjectConfigRoot() ?? getProjectRootOrNull());
}
/**
 * 状态访问器：读取当前会话的 会话标志（sessionFlags） 上的 hasExitedPlanMode()。
 */
//@ chunk-ndmse9kj.js:109517-109576 facade-majority = hasExitedPlanModeInSession (0.747)
function hasExitedPlanModeInSession() {
  return currentSession().sessionFlags.hasExitedPlanMode();
}
/**
 * 状态访问器：写入当前会话的 会话标志（sessionFlags） 上的 replaceHasExitedPlanMode()。
 */
//@ chunk-ndmse9kj.js:109576-109636 facade-majority
function setHasExitedPlanMode(e) {
  currentSession().sessionFlags.replaceHasExitedPlanMode(e);
}
/**
 * 状态访问器：读取当前会话的 host（host） → 主动性（proactivity） 上的 selectorGate()。
 */
//@ chunk-ndmse9kj.js:109636-109694 facade-majority
function getProactivitySelectorGate() {
  return currentSession().host.proactivity.selectorGate();
}
/**
 * 状态访问器：读取当前会话的 host（host） → 主动性（proactivity） 上的 selectorGateEverOn()。
 */
//@ chunk-ndmse9kj.js:109694-109758 facade-majority
function getProactivitySelectorGateEverOn() {
  return currentSession().host.proactivity.selectorGateEverOn();
}
/**
 * 状态访问器：调用当前会话的 host（host） → 主动性（proactivity） 上的 inheritSelectorGateEverOn()。
 */
//@ chunk-ndmse9kj.js:109758-109822 facade-majority
function inheritProactivitySelectorGateEverOn() {
  currentSession().host.proactivity.inheritSelectorGateEverOn();
}
/**
 * 状态访问器：写入当前会话的 host（host） → 主动性（proactivity） 上的 replaceSelectorGate()。
 */
//@ chunk-ndmse9kj.js:109822-109882 facade-majority
function setProactivitySelectorGate(e) {
  currentSession().host.proactivity.replaceSelectorGate(e);
}
/**
 * 状态访问器：调用当前会话的 host（host） → 主动性（proactivity） 上的 resampleSelectorGate()。
 */
//@ chunk-ndmse9kj.js:109882-109943 facade-majority
function resampleProactivitySelectorGate(e) {
  currentSession().host.proactivity.resampleSelectorGate(e);
}
/**
 * 状态访问器：调用当前会话的 host（host） → 主动性（proactivity） 上的 subscribeSelectorGateChanged()。
 */
//@ chunk-ndmse9kj.js:109943-110019 facade-majority
function onProactivitySelectorGateChanged(e) {
  return currentSession().host.proactivity.subscribeSelectorGateChanged(e);
}
/**
 * 状态访问器：写入当前会话的 host（host） → 主动性（proactivity） 上的 replaceHostGateSubscription()。
 */
//@ chunk-ndmse9kj.js:110019-110087 facade-majority
function replaceProactivityHostGateSubscription(e) {
  currentSession().host.proactivity.replaceHostGateSubscription(e);
}
/**
 * 状态访问器：读取当前会话的 会话标志（sessionFlags） 上的 needsPlanModeExitAttachment()。
 */
//@ chunk-ndmse9kj.js:110087-110156 facade-majority = needsPlanModeExitAttachment (0.747)
function needsPlanModeExitAttachment() {
  return currentSession().sessionFlags.needsPlanModeExitAttachment();
}
/**
 * 状态访问器：写入当前会话的 会话标志（sessionFlags） 上的 replaceNeedsPlanModeExitAttachment()。
 */
//@ chunk-ndmse9kj.js:110156-110226 facade-majority
function setNeedsPlanModeExitAttachment(e) {
  currentSession().sessionFlags.replaceNeedsPlanModeExitAttachment(e);
}
/**
 * plan 模式进出时设置 needsPlanModeExitAttachment。
 */
//@ chunk-ndmse9kj.js:110226-110408 facade-majority
function handlePlanModeTransition(e, n) {
  if (n === "plan" && e !== "plan") currentSession().sessionFlags.replaceNeedsPlanModeExitAttachment(!1);
  if (e === "plan" && n !== "plan") currentSession().sessionFlags.replaceNeedsPlanModeExitAttachment(!0);
}
/**
 * 状态访问器：读取当前会话的 会话标志（sessionFlags） 上的 needsAutoModeExitAttachment()。
 */
//@ chunk-ndmse9kj.js:110408-110477 facade-majority = needsAutoModeExitAttachment (0.747)
function needsAutoModeExitAttachment() {
  return currentSession().sessionFlags.needsAutoModeExitAttachment();
}
/**
 * 状态访问器：写入当前会话的 会话标志（sessionFlags） 上的 replaceNeedsAutoModeExitAttachment()。
 */
//@ chunk-ndmse9kj.js:110477-110547 facade-majority
function setNeedsAutoModeExitAttachment(e) {
  currentSession().sessionFlags.replaceNeedsAutoModeExitAttachment(e);
}
/**
 * auto 模式进出时设置 needsAutoModeExitAttachment（plan↔auto 互转除外）。
 */
//@ chunk-ndmse9kj.js:110547-110782 facade-majority
function handleAutoModeTransition(e, n) {
  if ((e === "auto" && n === "plan") || (e === "plan" && n === "auto")) return;
  let o = e === "auto",
    r = n === "auto";
  if (r && !o) currentSession().sessionFlags.replaceNeedsAutoModeExitAttachment(!1);
  if (o && !r) currentSession().sessionFlags.replaceNeedsAutoModeExitAttachment(!0);
}
/**
 * 状态访问器：读取当前会话的 会话标志（sessionFlags） 上的 lspRecommendationShownThisSession()。
 */
//@ chunk-ndmse9kj.js:110782-110857 facade-majority = hasShownLspRecommendationThisSession (0.747)
function hasShownLspRecommendationThisSession() {
  return currentSession().sessionFlags.lspRecommendationShownThisSession();
}
/**
 * 状态访问器：写入当前会话的 会话标志（sessionFlags） 上的 replaceLspRecommendationShownThisSession()。
 */
//@ chunk-ndmse9kj.js:110857-110934 facade-majority
function setLspRecommendationShownThisSession(e) {
  currentSession().sessionFlags.replaceLspRecommendationShownThisSession(e);
}
/**
 * 状态访问器：写入当前会话的 host（host） → 启动选项（launchOptions） 上的 replaceInitJsonSchema()。
 */
//@ chunk-ndmse9kj.js:110934-110998 facade-majority
function setInitJsonSchema(e) {
  currentSession().host.launchOptions.replaceInitJsonSchema(e);
}
/**
 * 状态访问器：读取当前会话的 host（host） → 启动选项（launchOptions） 上的 initJsonSchema()。
 */
//@ chunk-ndmse9kj.js:110998-111060 facade-majority = setInitJsonSchema (0.763)
function getInitJsonSchema() {
  return currentSession().host.launchOptions.initJsonSchema();
}
/**
 * 状态访问器：调用当前会话的 MCP 会话接线（mcpSessionWiring） 上的 registerClientsAccessor()。
 */
//@ chunk-ndmse9kj.js:111060-111124 facade-majority
function setMcpClientsAccessor(e) {
  currentSession().mcpSessionWiring.registerClientsAccessor(e);
}
/**
 * 状态访问器：调用当前会话的 MCP 会话接线（mcpSessionWiring） 上的 acquireClientsAccessor()。
 */
//@ chunk-ndmse9kj.js:111124-111194 facade-majority
function acquireMcpClientsAccessor(e) {
  return currentSession().mcpSessionWiring.acquireClientsAccessor(e);
}
/**
 * 状态访问器：读取当前会话的 MCP 会话接线（mcpSessionWiring） 上的 clientsFromAccessor()。
 */
//@ chunk-ndmse9kj.js:111194-111258 facade-majority
function getMcpClientsFromAccessor() {
  return currentSession().mcpSessionWiring.clientsFromAccessor();
}
/**
 * 状态访问器：调用当前会话的 host（host） → MCP 进程接线（mcpProcessWiring） 上的 registerEnsureConnectedClient()。
 */
//@ chunk-ndmse9kj.js:111258-111333 facade-majority
function setEnsureConnectedClient(e) {
  currentSession().host.mcpProcessWiring.registerEnsureConnectedClient(e);
}
/**
 * 状态访问器：读取当前会话的 host（host） → MCP 进程接线（mcpProcessWiring） 上的 ensureConnectedClient()。
 */
//@ chunk-ndmse9kj.js:111333-111404 facade-majority
function getEnsureConnectedClient() {
  return currentSession().host.mcpProcessWiring.ensureConnectedClient();
}
/**
 * 状态访问器：调用当前会话的 MCP 会话接线（mcpSessionWiring） 上的 registerConnectedClientWiring()。
 */
//@ chunk-ndmse9kj.js:111404-111474 facade-majority
function setConnectedClientWiring(e) {
  currentSession().mcpSessionWiring.registerConnectedClientWiring(e);
}
/**
 * 状态访问器：读取当前会话的 MCP 会话接线（mcpSessionWiring） 上的 connectedClientWiring()。
 */
//@ chunk-ndmse9kj.js:111474-111541 facade-majority
function getConnectedClientWiring() {
  return currentSession().mcpSessionWiring.connectedClientWiring();
}
/**
 * 状态访问器：调用当前会话的 MCP 会话接线（mcpSessionWiring） 上的 registerToolsSwapper()。
 */
//@ chunk-ndmse9kj.js:111541-111602 facade-majority
function setMcpServerToolsSwapper(e) {
  currentSession().mcpSessionWiring.registerToolsSwapper(e);
}
/**
 * 状态访问器：调用当前会话的 MCP 会话接线（mcpSessionWiring） 上的 acquireToolsSwapper()。
 */
//@ chunk-ndmse9kj.js:111602-111669 facade-majority
function acquireMcpServerToolsSwapper(e) {
  return currentSession().mcpSessionWiring.acquireToolsSwapper(e);
}
/**
 * 状态访问器：调用当前会话的 MCP 会话接线（mcpSessionWiring） 上的 swapServerTools()。
 */
//@ chunk-ndmse9kj.js:111669-111740 facade-majority
function swapMcpServerTools(e, n, o) {
  return currentSession().mcpSessionWiring.swapServerTools(e, n, o);
}
/**
 * 会话状态函数 getHookHolder：涉及当前会话的 hookRegistry.holder。
 */
//@ chunk-ndmse9kj.js:111740-111791 layout
function getHookHolder() {
  return getAgentContext() ?? currentSession().hookRegistry.holder();
}
/**
 * registerHookCallbacks：把 SDK/插件注册的钩子按事件追加到 registeredHooks，并发出钩子变化信号。
 */
//@ chunk-ndmse9kj.js:111791-111988 facade-majority = registerHookCallbacks (1)
function registerHookCallbacks(hooks) {
  let n = getHookHolder();
  if (!n.registeredHooks) n.registeredHooks = {};
  for (let [o, r] of Object.entries(hooks)) {
    let eventKey = o;
    if (!n.registeredHooks[eventKey]) n.registeredHooks[eventKey] = [];
    n.registeredHooks[eventKey].push(...r);
  }
  emitHookStoresChanged();
}
/**
 * getRegisteredHooks：当前钩子持有者里注册的 SDK/插件钩子。
 */
//@ chunk-ndmse9kj.js:111988-112029 facade-majority = registerHookCallbacks (1)
function getRegisteredHooks() {
  return getHookHolder().registeredHooks;
}
/**
 * 默认 root 会话里注册的钩子。
 */
//@ chunk-ndmse9kj.js:112029-112091 facade-majority
function getRootRegisteredHooks() {
  return defaultRootSession.hookRegistry.holder().registeredHooks;
}
/**
 * clearRegisteredHooks：清空注册的钩子并发出变化信号。
 */
//@ chunk-ndmse9kj.js:112091-112177 facade-majority
function clearRegisteredHooks() {
  let e = getHookHolder();
  ((e.registeredHooks = null), (e.sdkHostOutOfReachNoted = void 0), emitHookStoresChanged());
}
/**
 * SDK 宿主不可达的提示只记一次：首次返回 true。
 */
//@ chunk-ndmse9kj.js:112177-112277 facade-majority
function takeSdkHostOutOfReachNote() {
  let e = getHookHolder();
  if (e.sdkHostOutOfReachNoted) return !1;
  return ((e.sdkHostOutOfReachNoted = !0), !0);
}
/**
 * 宿主答复了钩子后清除“不可达已提示”标记。
 */
//@ chunk-ndmse9kj.js:112277-112326 facade-majority
function noteSdkHostHookAnswered() {
  getHookHolder().sdkHostOutOfReachNoted = void 0;
}
/**
 * 当前插件钩子运行器。
 */
//@ chunk-ndmse9kj.js:112326-112368 facade-majority
function getPluginHookRunner() {
  return getHookHolder().pluginHookRunner;
}
/**
 * 当前回复闸策略。
 */
//@ chunk-ndmse9kj.js:112368-112410 facade-majority
function getReplyGatePolicy() {
  return getHookHolder().replyGatePolicy;
}
/**
 * 替换插件来源的注册钩子（保留运行器持有的插件的钩子）。
 */
//@ chunk-ndmse9kj.js:112410-112557 facade-majority
function replaceRegisteredPluginHooks(e) {
  let n = getPluginHookRunner();
  clearRegisteredPluginHooks();
  let o = {};
  for (let [r, i] of Object.entries(e))
    o[r] = i.filter((s) => !("pluginRoot" in s) || n?.holds(s.pluginId) !== !0);
  registerHookCallbacks(o);
}
//@ chunk-ndmse9kj.js:112557-112834 fingerprint = clearRegisteredPluginHooks (0.671)
function clearRegisteredPluginHooks() {
  let e = getHookHolder();
  if (!e.registeredHooks) return;
  let pluginHookRunner = e.pluginHookRunner,
    filtered = {};
  for (let [r, i] of Object.entries(e.registeredHooks)) {
    let callbackHooks = i.filter((a) => !("pluginRoot" in a) || pluginHookRunner?.holds(a.pluginId) === !0);
    if (callbackHooks.length > 0) filtered[r] = callbackHooks;
  }
  ((e.registeredHooks = Object.keys(filtered).length > 0 ? filtered : null), emitHookStoresChanged());
}
//@ chunk-ndmse9kj.js:112834-112857 layout
var hooksChangedSignal = new HostScoped(() => createSignal());
/**
 * 发出“钩子存储已变化”信号。
 */
//@ chunk-ndmse9kj.js:112857-112886 facade-majority
function emitHookStoresChanged() {
  onProcessRootHost(hooksChangedSignal).emit();
}
/**
 * 订阅钩子存储变化。
 */
//@ chunk-ndmse9kj.js:112886-112929 facade-majority
function onHookStoresChanged(e) {
  return onProcessRootHost(hooksChangedSignal).subscribe(e);
}
/**
 * 状态访问器：读取当前会话的 会话暂存（sessionScratch） 上的 planSlugCache()。
 */
//@ chunk-ndmse9kj.js:112929-112986 facade-majority = getPlanSlugCache (0.739)
function getPlanSlugCache() {
  return currentSession().sessionScratch.planSlugCache();
}
/**
 * 会话状态函数 getSessionCreatedTeams：优先取异步上下文覆盖对象的 sessionCreatedTeams；涉及当前会话的 sessionScratch.sessionCreatedTeams。
 */
//@ chunk-ndmse9kj.js:112986-113075 facade-majority = getSessionCreatedTeams (0.739)
function getSessionCreatedTeams() {
  return getAgentContext()?.sessionCreatedTeams ?? currentSession().sessionScratch.sessionCreatedTeams();
}
/**
 * 会话状态函数 getSessionSpawnedTeammatePanes：优先取异步上下文覆盖对象的 sessionSpawnedTeammatePanes；涉及当前会话的 sessionScratch.sessionSpawnedTeammatePanes。
 */
//@ chunk-ndmse9kj.js:113075-113180 facade-majority
function getSessionSpawnedTeammatePanes() {
  return (
    getAgentContext()?.sessionSpawnedTeammatePanes ??
    currentSession().sessionScratch.sessionSpawnedTeammatePanes()
  );
}
/**
 * 会话状态函数 getSurfacedHookSpawnFailures：优先取异步上下文覆盖对象的 surfacedHookSpawnFailures；涉及当前会话的 sessionScratch.surfacedHookSpawnFailures。
 */
//@ chunk-ndmse9kj.js:113180-113281 facade-majority
function getSurfacedHookSpawnFailures() {
  return (
    getAgentContext()?.surfacedHookSpawnFailures ??
    currentSession().sessionScratch.surfacedHookSpawnFailures()
  );
}
/**
 * 会话状态函数 getPendingConversationEditKinds：优先取异步上下文覆盖对象的 pendingConversationEditKinds；
 */
//@ chunk-ndmse9kj.js:113281-113386 facade-majority
function getPendingConversationEditKinds() {
  return (
    agentContextGetter()?.pendingConversationEditKinds ??
    defaultRootSession.sessionScratch.pendingConversationEditKinds()
  );
}
/**
 * 会话状态函数 getClientTruncatedAssistantIds：优先取异步上下文覆盖对象的 clientTruncatedAssistantIds；
 */
//@ chunk-ndmse9kj.js:113386-113489 facade-majority
function getClientTruncatedAssistantIds() {
  return (
    agentContextGetter()?.clientTruncatedAssistantIds ??
    defaultRootSession.sessionScratch.clientTruncatedAssistantIds()
  );
}
/**
 * 会话状态函数 getHeldStatelessReplyIds：优先取异步上下文覆盖对象的 heldStatelessReplyIds；
 */
//@ chunk-ndmse9kj.js:113489-113580 facade-majority
function getHeldStatelessReplyIds() {
  return (
    agentContextGetter()?.heldStatelessReplyIds ?? defaultRootSession.sessionScratch.heldStatelessReplyIds()
  );
}
/**
 * 会话状态函数 getUnsupportedThreadKeys：优先取异步上下文覆盖对象的 unsupportedThreadKeys；
 */
//@ chunk-ndmse9kj.js:113580-113671 facade-majority
function getUnsupportedThreadKeys() {
  return (
    agentContextGetter()?.unsupportedThreadKeys ?? defaultRootSession.sessionScratch.unsupportedThreadKeys()
  );
}
/**
 * 会话状态函数 getBareMcpServerMatchersWarned：优先取异步上下文覆盖对象的 bareMcpServerMatchersWarned；涉及当前会话的 sessionScratch.bareMcpServerMatchersWarned。
 */
//@ chunk-ndmse9kj.js:113671-113776 facade-majority
function getBareMcpServerMatchersWarned() {
  return (
    getAgentContext()?.bareMcpServerMatchersWarned ??
    currentSession().sessionScratch.bareMcpServerMatchersWarned()
  );
}
/**
 * 会话状态函数 getPendingBranchLinks：优先取异步上下文覆盖对象的 pendingBranchLinks；涉及当前会话的 sessionScratch.pendingBranchLinks。
 */
//@ chunk-ndmse9kj.js:113776-113863 facade-majority
function getPendingBranchLinks() {
  return getAgentContext()?.pendingBranchLinks ?? currentSession().sessionScratch.pendingBranchLinks();
}
/**
 * 状态访问器：读取当前会话的 会话暂存（sessionScratch） 上的 pendingPrLinks()。
 */
//@ chunk-ndmse9kj.js:113863-113921 facade-majority
function getPendingPrLinks() {
  return currentSession().sessionScratch.pendingPrLinks();
}
/**
 * 状态访问器：读取当前会话的 会话暂存（sessionScratch） 上的 policyPredicateTelemetryEmitted()。
 */
//@ chunk-ndmse9kj.js:113921-113996 facade-majority
function getPolicyPredicateTelemetryEmitted() {
  return currentSession().sessionScratch.policyPredicateTelemetryEmitted();
}
/**
 * 会话状态函数 getChromeAvailabilityStagesLogged：优先取异步上下文覆盖对象的 chromeAvailabilityStagesLogged；涉及当前会话的 sessionScratch.chromeAvailabilityStagesLogged。
 */
//@ chunk-ndmse9kj.js:113996-114107 facade-majority
function getChromeAvailabilityStagesLogged() {
  return (
    getAgentContext()?.chromeAvailabilityStagesLogged ??
    currentSession().sessionScratch.chromeAvailabilityStagesLogged()
  );
}
/**
 * 状态访问器：读取当前会话的 会话暂存（sessionScratch） 上的 chromeAvailabilityAnchorMs()。
 */
//@ chunk-ndmse9kj.js:114107-114177 facade-majority
function getChromeAvailabilityAnchorMs() {
  return currentSession().sessionScratch.chromeAvailabilityAnchorMs();
}
/**
 * 状态访问器：读取当前会话的 会话标志（sessionFlags） 上的 proposeGoalAvailabilityLogged()。
 */
//@ chunk-ndmse9kj.js:114177-114248 facade-majority
function getProposeGoalAvailabilityLogged() {
  return currentSession().sessionFlags.proposeGoalAvailabilityLogged();
}
/**
 * 状态访问器：调用当前会话的 会话标志（sessionFlags） 上的 markProposeGoalAvailabilityLogged()。
 */
//@ chunk-ndmse9kj.js:114248-114316 facade-majority
function setProposeGoalAvailabilityLogged() {
  currentSession().sessionFlags.markProposeGoalAvailabilityLogged();
}
/**
 * 状态访问器：读取当前会话的 会话标志（sessionFlags） 上的 inheritedTeamName()。
 */
//@ chunk-ndmse9kj.js:114316-114375 facade-majority
function getInheritedTeamName() {
  return currentSession().sessionFlags.inheritedTeamName();
}
/**
 * 状态访问器：写入当前会话的 会话标志（sessionFlags） 上的 replaceInheritedTeamName()。
 */
//@ chunk-ndmse9kj.js:114375-114436 facade-majority
function setInheritedTeamName(e) {
  currentSession().sessionFlags.replaceInheritedTeamName(e);
}
/**
 * 状态访问器：写入当前会话的 会话标志（sessionFlags） 上的 replaceTeleportedSessionInfo()。
 */
//@ chunk-ndmse9kj.js:114436-114564 facade-majority = setTeleportedSessionInfo (0.583)
function setTeleportedSessionInfo(info) {
  currentSession().sessionFlags.replaceTeleportedSessionInfo({
    isTeleported: !0,
    hasLoggedFirstMessage: !1,
    sessionId: info.sessionId,
  });
}
/**
 * 状态访问器：读取当前会话的 会话标志（sessionFlags） 上的 teleportedSessionInfo()。
 */
//@ chunk-ndmse9kj.js:114564-114627 facade-majority = getTeleportedSessionInfo (0.747)
function getTeleportedSessionInfo() {
  return currentSession().sessionFlags.teleportedSessionInfo();
}
/**
 * 状态访问器：调用当前会话的 会话标志（sessionFlags） 上的 markFirstTeleportMessageLogged()。
 */
//@ chunk-ndmse9kj.js:114627-114692 facade-majority
function markFirstTeleportMessageLogged() {
  currentSession().sessionFlags.markFirstTeleportMessageLogged();
}
/**
 * addInvokedSkill：记录本会话调用过的技能（压缩后重新注入用），键为 agentId:skillName。
 */
//@ chunk-ndmse9kj.js:114692-114867 facade-majority = addInvokedSkill (0.822)
function addInvokedSkill(e, n, o, r = null, i = !1, s = Date.now()) {
  let key = `${r ?? ""}:${e}`;
  currentSession().invokedSkills.record(key, {
    skillName: e,
    skillPath: n,
    content: o,
    invokedAt: s,
    agentId: r,
    ...(i && { servedByMcp: i }),
  });
}
/**
 * 状态访问器：读取当前会话的 已调用技能（invokedSkills） 上的 skills()。
 */
//@ chunk-ndmse9kj.js:114867-114916 facade-majority = getInvokedSkills (0.747)
function getInvokedSkills() {
  return currentSession().invokedSkills.skills();
}
/**
 * 更新已调用技能记录的内容。
 */
//@ chunk-ndmse9kj.js:114916-115020 facade-majority
function updateInvokedSkillContent(e, n) {
  let o = currentSession(),
    lookup = o.invokedSkills.lookup(e);
  if (lookup) o.invokedSkills.record(e, { ...lookup, content: n });
}
/**
 * 会话状态函数 getInvokedSkillsForAgent：涉及当前会话的 invokedSkills.skills。
 */
//@ chunk-ndmse9kj.js:115020-115139 facade-majority = getInvokedSkillsForAgent (0.747)
function getInvokedSkillsForAgent(agentId) {
  let normalizedId = agentId ?? null,
    filtered = new Map();
  for (let [r, i] of currentSession().invokedSkills.skills())
    if (i.agentId === normalizedId) filtered.set(r, i);
  return filtered;
}
/**
 * clearInvokedSkills：清除已调用技能，保留给定 agentId 集合的记录。
 */
//@ chunk-ndmse9kj.js:115139-115324 facade-majority
function clearInvokedSkills(e) {
  let n = currentSession();
  if (!e || e.size === 0) {
    n.invokedSkills.forgetAll();
    return;
  }
  for (let [o, r] of n.invokedSkills.skills())
    if (r.agentId === null || !e.has(r.agentId)) n.invokedSkills.forget(o);
}
/**
 * clearInvokedSkillsForAgent：清除某代理的已调用技能。
 */
//@ chunk-ndmse9kj.js:115324-115433 facade-majority = clearInvokedSkillsForAgent (0.586)
function clearInvokedSkillsForAgent(agentId) {
  let n = currentSession();
  for (let [o, r] of n.invokedSkills.skills()) if (r.agentId === agentId) n.invokedSkills.forget(o);
}
/**
 * 状态访问器：调用当前会话的 host（host） → 诊断（diagnostics） 上的 recordSlowOperation()。
 */
//@ chunk-ndmse9kj.js:115433-115497 facade-majority
function addSlowOperation(e, n) {
  currentSession().host.diagnostics.recordSlowOperation(e, n);
}
/**
 * 状态访问器：读取当前会话的 host（host） → 诊断（diagnostics） 上的 slowOperations()。
 */
//@ chunk-ndmse9kj.js:115497-115557 facade-majority = getSlowOperations (0.608)
function getSlowOperations() {
  return currentSession().host.diagnostics.slowOperations();
}
/**
 * 状态访问器：读取当前会话的 host（host） → 诊断（diagnostics） 上的 devBarAlert()。
 */
//@ chunk-ndmse9kj.js:115557-115614 facade-majority
function getDevBarAlert() {
  return currentSession().host.diagnostics.devBarAlert();
}
/**
 * 会话状态函数 getMainThreadAgentType：涉及当前会话的 hookRegistry.mainThreadAgentType。
 */
//@ chunk-ndmse9kj.js:115614-115708 facade-majority = getMainThreadAgentType (0.68)
function getMainThreadAgentType() {
  let e = getAgentContext();
  return e ? e.mainThreadAgentType : currentSession().hookRegistry.mainThreadAgentType();
}
/**
 * 会话状态函数 setMainThreadAgentType：涉及当前会话的 hookRegistry.replaceMainThreadAgentType。
 */
//@ chunk-ndmse9kj.js:115708-115815 facade-majority = setMainThreadAgentType (0.496)
function setMainThreadAgentType(agentType) {
  let n = getAgentContext();
  if (n) n.mainThreadAgentType = agentType;
  else currentSession().hookRegistry.replaceMainThreadAgentType(agentType);
}
/**
 * 会话状态函数 getMainThreadAgentHooks：涉及当前会话的 hookRegistry.mainThreadAgentHooks。
 */
//@ chunk-ndmse9kj.js:115815-115911 facade-majority
function getMainThreadAgentHooks() {
  let e = getAgentContext();
  return e ? e.mainThreadAgentHooks : currentSession().hookRegistry.mainThreadAgentHooks();
}
/**
 * 默认 root 会话的主线程代理钩子。
 */
//@ chunk-ndmse9kj.js:115911-115971 facade-majority
function getRootMainThreadAgentHooks() {
  return defaultRootSession.hookRegistry.mainThreadAgentHooks();
}
/**
 * 会话状态函数 setMainThreadAgentHooks：涉及当前会话的 hookRegistry.replaceMainThreadAgentHooks。
 */
//@ chunk-ndmse9kj.js:115971-116086 facade-majority
function setMainThreadAgentHooks(e) {
  let n = getAgentContext();
  if (n) n.mainThreadAgentHooks = e;
  else currentSession().hookRegistry.replaceMainThreadAgentHooks(e);
  emitHookStoresChanged();
}
/**
 * 状态访问器：读取当前会话的 host（host） → 扩展配置（extensionsConfig） 上的 sessionSkillAllowlist()。
 */
//@ chunk-ndmse9kj.js:116086-116157 facade-majority
function getSessionSkillAllowlist() {
  return currentSession().host.extensionsConfig.sessionSkillAllowlist();
}
/**
 * 状态访问器：写入当前会话的 host（host） → 扩展配置（extensionsConfig） 上的 replaceSessionSkillAllowlist()。
 */
//@ chunk-ndmse9kj.js:116157-116231 facade-majority
function setSessionSkillAllowlist(e) {
  currentSession().host.extensionsConfig.replaceSessionSkillAllowlist(e);
}
/**
 * 状态访问器：读取当前会话的 宿主能力（surfaceCapabilities） 上的 caps()。
 */
//@ chunk-ndmse9kj.js:116231-116283 facade-majority
function getCaps() {
  return currentSession().surfaceCapabilities.caps();
}
/**
 * 状态访问器：写入当前会话的 宿主能力（surfaceCapabilities） 上的 replaceCaps()。
 */
//@ chunk-ndmse9kj.js:116283-116338 facade-majority
function setCaps(e) {
  currentSession().surfaceCapabilities.replaceCaps(e);
}
/**
 * 会话状态函数 getIsRemoteMode：涉及当前会话的 surfaceCapabilities.caps。
 */
//@ chunk-ndmse9kj.js:116338-116411 facade-majority
function getIsRemoteMode() {
  return currentSession().surfaceCapabilities.caps().workspace === "remote";
}
/**
 * 状态访问器：调用当前会话的 宿主能力（surfaceCapabilities） 上的 markRemote()。
 */
//@ chunk-ndmse9kj.js:116411-116465 facade-majority
function setIsRemoteMode(e) {
  currentSession().surfaceCapabilities.markRemote(e);
}
/**
 * 当前会话在云端的工作目录。
 */
//@ chunk-ndmse9kj.js:116465-116543 facade-majority
function getCloudCwd() {
  let e = currentSession();
  return e.surfaceCapabilities.cloudCwdOfSession(e.id);
}
/**
 * 会话状态函数 setCloudCwd：涉及当前会话的 surfaceCapabilities.replaceCloudCwd。
 */
//@ chunk-ndmse9kj.js:116543-116639 facade-majority
function setCloudCwd(e) {
  currentSession().surfaceCapabilities.replaceCloudCwd({ sessionId: e.sessionId, cwd: Fuo(e.cwd) });
}
/**
 * 状态访问器：调用当前会话的 宿主能力（surfaceCapabilities） → cloudCwdChanged 上的 subscribe()。
 */
//@ chunk-ndmse9kj.js:116639-116715 facade-majority
function onCloudCwdChange(e) {
  return currentSession().surfaceCapabilities.cloudCwdChanged.subscribe(e);
}
/**
 * 状态访问器：读取当前会话的 提示词组装（promptAssembly） 上的 sections()。
 */
//@ chunk-ndmse9kj.js:116715-116767 facade-majority
function getSystemPromptSectionCache() {
  return currentSession().promptAssembly.sections();
}
/**
 * 状态访问器：调用当前会话的 提示词组装（promptAssembly） 上的 recordSection()。
 */
//@ chunk-ndmse9kj.js:116767-116823 facade-majority
function setSystemPromptSectionCacheEntry(e, n) {
  currentSession().promptAssembly.recordSection(e, n);
}
/**
 * 会话状态函数 clearSystemPromptSectionState：涉及当前会话的 promptAssembly.forgetAllSections。
 */
//@ chunk-ndmse9kj.js:116823-116884 facade-majority
function clearSystemPromptSectionState(e) {
  (currentSession().promptAssembly.forgetAllSections(), noteSystemPromptSectionInvalidation(e));
}
/**
 * 状态访问器：调用当前会话的 提示词组装（promptAssembly） 上的 noteInvalidation()。
 */
//@ chunk-ndmse9kj.js:116884-116938 facade-majority
function noteSystemPromptSectionInvalidation(e) {
  currentSession().promptAssembly.noteInvalidation(e);
}
/**
 * 状态访问器：读取当前会话的 提示词组装（promptAssembly） 上的 epoch()。
 */
//@ chunk-ndmse9kj.js:116938-116986 facade-majority
function getSystemPromptSectionEpoch() {
  return currentSession().promptAssembly.epoch();
}
/**
 * 状态访问器：读取当前会话的 提示词组装（promptAssembly） 上的 lastInvalidationReason()。
 */
//@ chunk-ndmse9kj.js:116986-117052 facade-majority
function getSystemPromptInvalidationReason() {
  return currentSession().promptAssembly.lastInvalidationReason();
}
/**
 * 状态访问器：读取当前会话的 会话暂存（sessionScratch） 上的 vimSharedState()。
 */
//@ chunk-ndmse9kj.js:117052-117110 facade-majority
function getVimSharedState() {
  return currentSession().sessionScratch.vimSharedState();
}
/**
 * 状态访问器：写入当前会话的 会话暂存（sessionScratch） 上的 replaceVimSharedState()。
 */
//@ chunk-ndmse9kj.js:117110-117170 facade-majority
function setVimSharedState(e) {
  currentSession().sessionScratch.replaceVimSharedState(e);
}
/**
 * 会话状态函数 getAdditionalDirectoriesForClaudeMd：涉及当前会话的 host.extensionsConfig.additionalDirectoriesForClaudeMd。
 */
//@ chunk-ndmse9kj.js:117170-117259 facade-majority = getAdditionalDirectoriesForClaudeMd (0.729)
function getAdditionalDirectoriesForClaudeMd() {
  return isDiskless() ? [] : currentSession().host.extensionsConfig.additionalDirectoriesForClaudeMd();
}
/**
 * 状态访问器：写入当前会话的 host（host） → 扩展配置（extensionsConfig） 上的 replaceAdditionalDirectoriesForClaudeMd()。
 */
//@ chunk-ndmse9kj.js:117259-117343 facade-majority
function setAdditionalDirectoriesForClaudeMd(e) {
  currentSession().host.extensionsConfig.replaceAdditionalDirectoriesForClaudeMd(e);
}
/**
 * 状态访问器：读取当前会话的 host（host） → 扩展配置（extensionsConfig） 上的 claudeMdAdditionalDirectoriesAsked()。
 */
//@ chunk-ndmse9kj.js:117343-117428 facade-majority
function getClaudeMdAdditionalDirectoriesAsked() {
  return currentSession().host.extensionsConfig.claudeMdAdditionalDirectoriesAsked();
}
/**
 * 状态访问器：调用当前会话的 host（host） → 扩展配置（extensionsConfig） 上的 askClaudeMdAdditionalDirectories()。
 */
//@ chunk-ndmse9kj.js:117428-117506 facade-majority
function setClaudeMdAdditionalDirectoriesAsked(e) {
  currentSession().host.extensionsConfig.askClaudeMdAdditionalDirectories(e);
}
/**
 * 状态访问器：读取当前会话的 host（host） → 扩展配置（extensionsConfig） 上的 allowedChannels()。
 */
//@ chunk-ndmse9kj.js:117506-117571 facade-majority = getAllowedChannels (0.729)
function getAllowedChannels() {
  return currentSession().host.extensionsConfig.allowedChannels();
}
/**
 * 状态访问器：写入当前会话的 host（host） → 扩展配置（extensionsConfig） 上的 replaceAllowedChannels()。
 */
//@ chunk-ndmse9kj.js:117571-117639 facade-majority
function setAllowedChannels(e) {
  currentSession().host.extensionsConfig.replaceAllowedChannels(e);
}
/**
 * 状态访问器：读取当前会话的 host（host） → 扩展配置（extensionsConfig） 上的 hasDevChannels()。
 */
//@ chunk-ndmse9kj.js:117639-117704 facade-majority = getHasDevChannels (0.729)
function getHasDevChannels() {
  return currentSession().host.extensionsConfig.hasDevChannels();
}
/**
 * 状态访问器：写入当前会话的 host（host） → 扩展配置（extensionsConfig） 上的 replaceHasDevChannels()。
 */
//@ chunk-ndmse9kj.js:117704-117771 facade-majority
function setHasDevChannels(e) {
  currentSession().host.extensionsConfig.replaceHasDevChannels(e);
}
/**
 * 状态访问器：读取当前会话的 host（host） → 请求锁存（requestLatches） 上的 promptCache1hAllowlist()。
 */
//@ chunk-ndmse9kj.js:117771-117842 facade-majority = getPromptCache1hAllowlist (0.75)
function getPromptCache1hAllowlist() {
  return currentSession().host.requestLatches.promptCache1hAllowlist();
}
//@ chunk-ndmse9kj.js:117842-117915 facade-majority
function setPromptCache1hAllowlist(e) {
  currentSession().host.requestLatches.replacePromptCache1hAllowlist(e);
}
//@ chunk-ndmse9kj.js:117915-117993 facade-majority
function getThinkingTypeOverride(e) {
  return currentSession().host.requestLatches.thinkingTypeOverrides().get(e);
}
//@ chunk-ndmse9kj.js:117993-118067 facade-majority
function setThinkingTypeOverride(e, n) {
  currentSession().host.requestLatches.recordThinkingTypeOverride(e, n);
}
//@ chunk-ndmse9kj.js:118067-118152 facade-majority
function getServedModelsForRequestedModel(e) {
  return currentSession().host.requestLatches.servedModelsByRequestedModel().get(e);
}
//@ chunk-ndmse9kj.js:118152-118314 facade-majority
function recordServedModel(e, n) {
  if (e === n) return;
  let requestLatches = currentSession().host.requestLatches,
    r = requestLatches.servedModelsByRequestedModel().get(e);
  if (r) r.add(n);
  else requestLatches.recordServedModels(e, new Set([n]));
}
//@ chunk-ndmse9kj.js:118314-118394 facade-majority
function isEffortMarkedUnsupported(e) {
  return currentSession().host.requestLatches.effortUnsupportedModels().has(e);
}
//@ chunk-ndmse9kj.js:118394-118459 facade-majority
function markEffortUnsupported(e) {
  currentSession().host.requestLatches.markEffortUnsupported(e);
}
//@ chunk-ndmse9kj.js:118459-118550 facade-majority
function isStructuredOutputsMarkedUnsupported(e) {
  return currentSession().host.requestLatches.structuredOutputsUnsupportedModels().has(e);
}
//@ chunk-ndmse9kj.js:118550-118626 facade-majority
function markStructuredOutputsUnsupported(e) {
  currentSession().host.requestLatches.markStructuredOutputsUnsupported(e);
}
//@ chunk-ndmse9kj.js:118626-118701 facade-majority
function clearStructuredOutputsUnsupported() {
  currentSession().host.requestLatches.clearStructuredOutputsUnsupported();
}
//@ chunk-ndmse9kj.js:118701-118780 facade-majority
function isContext1mMarkedRefused(e) {
  return currentSession().host.requestLatches.context1mRefusedModels().has(e);
}
//@ chunk-ndmse9kj.js:118780-118844 facade-majority
function markContext1mRefused(e) {
  currentSession().host.requestLatches.markContext1mRefused(e);
}
//@ chunk-ndmse9kj.js:118844-118907 facade-majority
function clearContext1mRefused() {
  currentSession().host.requestLatches.clearContext1mRefused();
}
//@ chunk-ndmse9kj.js:118907-118970 facade-majority
function getRefusedBetasForModel(e) {
  return currentSession().host.requestLatches.refusedBetas(e);
}
//@ chunk-ndmse9kj.js:118970-119033 facade-majority
function markBetaRefusedForModel(e, n) {
  currentSession().host.requestLatches.markBetaRefused(e, n);
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
function getAutoModeUnavailableResponse(e) {
  return currentSession().host.requestLatches.autoModeUnavailableResponse(e);
}
//@ chunk-ndmse9kj.js:119727-119812 facade-majority
function getAutoModeUnavailableResponsesInARow(e) {
  return currentSession().host.requestLatches.autoModeUnavailableResponsesInARow(e);
}
//@ chunk-ndmse9kj.js:119812-119904 facade-majority
function dropAutoModeUnavailableResponsesOfOtherTurns(e, n) {
  currentSession().host.requestLatches.dropAutoModeUnavailableResponsesOfOtherTurns(e, n);
}
//@ chunk-ndmse9kj.js:119904-119983 facade-majority
function noteAutoModeUnavailableResponse(e, n) {
  currentSession().host.requestLatches.noteAutoModeUnavailableResponse(e, n);
}
//@ chunk-ndmse9kj.js:119983-120060 facade-majority
function clearAutoModeUnavailableResponses(e) {
  currentSession().host.requestLatches.clearAutoModeUnavailableResponses(e);
}
//@ chunk-ndmse9kj.js:120060-120136 facade-majority
function setAutoModeUnavailableStopNotice(e) {
  currentSession().host.requestLatches.setAutoModeUnavailableStopNotice(e);
}
//@ chunk-ndmse9kj.js:120136-120214 facade-majority
function getAutoModeUnavailableStopNotice() {
  return currentSession().host.requestLatches.autoModeUnavailableStopNotice();
}
//@ chunk-ndmse9kj.js:120214-120281 facade-majority
function setLocalCommandExitCode(e) {
  currentSession().host.requestLatches.setLocalCommandExitCode(e);
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
function noteObservedGateway(e) {
  currentSession().host.requestLatches.noteObservedGateway(e);
}
//@ chunk-ndmse9kj.js:120477-120556 facade-majority
function getServerClassifierFallbackChoice() {
  return currentSession().host.requestLatches.serverClassifierFallbackChoice();
}
//@ chunk-ndmse9kj.js:120556-120633 facade-majority
function setServerClassifierFallbackChoice(e) {
  currentSession().host.requestLatches.setServerClassifierFallbackChoice(e);
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
function noteNoServerCheck(e) {
  return currentSession().host.requestLatches.noteNoServerCheck(e);
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
function markBetaHeaderRefused(e) {
  currentSession().host.requestLatches.markBetaHeaderRefused(e);
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
function isToolChangeUnsupportedModel(e) {
  return currentSession().host.requestLatches.toolChangeUnsupportedModels().has(e);
}
//@ chunk-ndmse9kj.js:122426-122500 facade-majority
function markToolChangeUnsupportedModel(e) {
  currentSession().host.requestLatches.markToolChangeUnsupportedModel(e);
}
//@ chunk-ndmse9kj.js:122500-122586 facade-majority
function getInferenceProfileBackingModelCached(e) {
  return currentSession().host.requestLatches.inferenceProfileBackingModels().get(e);
}
//@ chunk-ndmse9kj.js:122586-122668 facade-majority
function setInferenceProfileBackingModel(e, n) {
  currentSession().host.requestLatches.recordInferenceProfileBackingModel(e, n);
}
//@ chunk-ndmse9kj.js:122668-122745 facade-majority
function getStickyBetas() {
  return getAgentContext()?.stickyBetas ?? currentSession().conversationLatches.stickyBetas();
}
//@ chunk-ndmse9kj.js:122745-122839 facade-majority
function getConversationAtisLatch() {
  let e = getAgentContext();
  return e ? e.conversationAtisLatch : currentSession().conversationLatches.atisLatch();
}
//@ chunk-ndmse9kj.js:122839-122945 facade-majority
function setConversationAtisLatch(e) {
  let n = getAgentContext();
  if (n) n.conversationAtisLatch = e;
  else currentSession().conversationLatches.replaceAtisLatch(e);
}
//@ chunk-ndmse9kj.js:122945-123028 facade-majority
function getConversationToolsUsed() {
  return getAgentContext()?.conversationToolsUsed ?? currentSession().conversationLatches.toolsUsed;
}
//@ chunk-ndmse9kj.js:123028-123145 facade-majority
function clearBetaHeaderLatches() {
  let e = getAgentContext();
  if (e) e.stickyBetas = unlatchStickyBetaLatches(e.stickyBetas);
  else currentSession().conversationLatches.unlatchStickyBetas();
  clearContext1mRefused();
}
//@ chunk-ndmse9kj.js:123145-123196 facade-majority
function getPromptId() {
  return currentSession().requestJournal.promptId();
}
//@ chunk-ndmse9kj.js:123196-123250 facade-majority
function setPromptId(e) {
  currentSession().requestJournal.replacePromptId(e);
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
function notePersonPrompt(e, n, o) {
  let requestJournal = currentSession().requestJournal,
    lastPersonPrompt = requestJournal.lastPersonPrompt(),
    parse = Date.parse(n);
  if (
    lastPersonPrompt === null ||
    (!Number.isNaN(parse) && !(parse < Date.parse(lastPersonPrompt.timestamp)))
  )
    requestJournal.replaceLastPersonPrompt({ uuid: e, timestamp: n, clientPlatform: o });
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
function setReplBridgeActive(e) {
  currentSession().surfaceCapabilities.replaceReplBridgeActive(e);
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
function setMainLoopStatus(e) {
  currentSession().surfaceCapabilities.replaceMainLoopStatus(e);
}
/**
 * getSessionCounter：OTel 计数器 claude_code.session.count。
 */
//@ chunk-xdkvf45x.js:295-360 fingerprint = getSessionCounter (0.729)
function getSessionCounter() {
  return e().host.telemetryHandles.sessionCounter();
}
/**
 * getLocCounter：claude_code.lines_of_code.count。
 */
//@ chunk-xdkvf45x.js:360-421 fingerprint = getLocCounter (0.729)
function getLocCounter() {
  return e().host.telemetryHandles.locCounter();
}
/**
 * getPrCounter：claude_code.pull_request.count。
 */
//@ chunk-xdkvf45x.js:421-481 fingerprint = getPrCounter (0.729)
function getPrCounter() {
  return e().host.telemetryHandles.prCounter();
}
/**
 * getCommitCounter：claude_code.commit.count。
 */
//@ chunk-xdkvf45x.js:481-545 fingerprint = getCommitCounter (0.729)
function getCommitCounter() {
  return e().host.telemetryHandles.commitCounter();
}
/**
 * getCostCounter：claude_code.cost.usage。
 */
//@ chunk-xdkvf45x.js:545-607 fingerprint = getCostCounter (0.729)
function getCostCounter() {
  return e().host.telemetryHandles.costCounter();
}
/**
 * getTokenCounter：claude_code.token.usage。
 */
//@ chunk-xdkvf45x.js:607-670 fingerprint = getTokenCounter (0.729)
function getTokenCounter() {
  return e().host.telemetryHandles.tokenCounter();
}
/**
 * getCodeEditToolDecisionCounter：claude_code.code_edit_tool.decision。
 */
//@ chunk-xdkvf45x.js:670-748 fingerprint = getCodeEditToolDecisionCounter (0.729)
function getCodeEditToolDecisionCounter() {
  return e().host.telemetryHandles.codeEditToolDecisionCounter();
}
/**
 * getActiveTimeCounter：claude_code.active_time.total。
 */
//@ chunk-xdkvf45x.js:748-816 fingerprint = getActiveTimeCounter (0.729)
function getActiveTimeCounter() {
  return e().host.telemetryHandles.activeTimeCounter();
}
/**
 * getMeterProvider：OTel MeterProvider。
 */
//@ chunk-xdkvf45x.js:816-880 fingerprint = getMeterProvider (0.729)
function getMeterProvider() {
  return e().host.telemetryHandles.meterProvider();
}
//@ chunk-xdkvf45x.js:880-946 placement
function XYo(t) {
  e().host.telemetryHandles.replaceMeterProvider(t);
}
//@ chunk-xdkvf45x.js:946-970 placement
function e() {
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
  getDisableSlashCommands,
  getIsInteractive,
  getIsRemoteMode,
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
  getProjectRoot,
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
  getSessionProjectDir,
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
  setPrintOutputFormat,
  isParkedSpare,
  setSdkBetas,
  getMcpConnectNonBlocking,
  isDisklessProcess,
  setProjectConfigRoot,
  setInlinePluginsNoMcp,
  setInlinePluginUrls,
  isRestrictedSession,
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
  setGatewayAuth,
  holdGatewayHostStrict,
  preferThirdPartyAuthentication,
  getOauthScopesFromFd,
  isOauthTokenFromBgSnapshot,
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
  isEffortMarkedUnsupported,
  setMainLoopEffortState,
  onProactivitySelectorGateChanged,
  getToolsMachine,
  getConnectedClientWiring,
  getEnsureConnectedClient,
  setEnsureConnectedClient,
  isPrintInputClosed,
  isSingleShotPrintSession,
  getMcpClientsFromAccessor,
  filesPlacedByNameRead,
  clearRefusalFallbackModelLatch,
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
  getLastMainThreadCacheTtlMs,
  getLastMainThreadCacheRenewedAt,
  setTerminalFocusForState,
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
  getRefusalFallbackModelLatch,
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
  getMainThreadAgentHooks,
  getBareMcpServerMatchersWarned,
  getAttestedOfficialPluginMarketplace,
  getFlagSettingsFilePinnedContent,
  getSurfacedHookSpawnFailures,
  getStatsStore,
  takeSdkHostOutOfReachNote,
  isSyncedPluginDirUnused,
  handleAutoModeTransition,
  setSearchToolsOptIn,
  setTodoToolsOptIn,
  setToolsOmittedByLaunchList,
  getAllowedSettingSources,
  releaseRefusalFallbackCarriedEffort,
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
  getLastPersonPrompt,
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
  XYo,
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
  e,
  resetModelStrings,
  clearStructuredOutputsUnsupported,
  clearContext1mRefused,
  incrementPromptIndex,
  getAccountMemoryLaunchMode,
  setMcpConnectNonBlocking,
};
