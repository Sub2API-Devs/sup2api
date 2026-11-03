/**
 * utils/plugins/pluginLoadState.ts
 *
 * 2.1.316 新增：创建插件加载状态（加载、缓存、注册表等）；清除插件工作流缓存等。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-yf5m6p65.js (14)
 * attribution: placement 14
 */
import { createStore } from "../../state/store.js";
import { createSignal } from "../signal.js";
import { HostScoped } from "../hostScoped.js";
import { getRootSession } from "../../bootstrap/state.js";

//@ chunk-yf5m6p65.js:333-517 placement
var freeze = Object.freeze({
  open: Object.freeze([]),
  unplaced: Object.freeze([]),
  asked: Object.freeze([]),
  shownId: null,
  focusedId: null,
  focusRequest: null,
  placements: 0,
  closing: Object.freeze([]),
});
/**
 * 创建插件状态存储（值、读者、挂载、折叠等）。
 */
//@ chunk-yf5m6p65.js:517-812 placement
var createPluginStateStore = () => ({
  values: createStore(new Map()),
  readers: new Map(),
  readersOf: new Map(),
  mounted: new Map(),
  folds: {
    steady: { stale: new Set(), lastAt: Number.NEGATIVE_INFINITY, pending: void 0 },
    live: { stale: new Set(), lastAt: Number.NEGATIVE_INFINITY, pending: void 0 },
  },
  staleListeners: new Set(),
  faultRuns: new Map(),
  bumps: 0,
  versionFloor: 0,
});
//@ chunk-yf5m6p65.js:812-859 placement
var Ios = () => ({ pending: void 0, pausedAt: void 0 });
/**
 * 创建插件加载状态（加载、缓存、注册表等）。
 */
//@ chunk-yf5m6p65.js:859-3981 placement
function createPluginLoadState() {
  return {
    pluginLoad: void 0,
    pluginLoadArm: void 0,
    pluginLoadCacheOnly: void 0,
    pluginLoadCacheOnlyArm: void 0,
    pluginLoadsRunning: 0,
    pluginLoadMarks: new WeakMap(),
    commands: void 0,
    skills: void 0,
    skillsV5: void 0,
    agents: void 0,
    handedIn: void 0,
    outputStyles: void 0,
    workflows: void 0,
    hookRegistration: void 0,
    organizationAsk: {
      isHeld: !1,
      isWaited: !1,
      isTold: !1,
      startHooksWait: void 0,
      isBoundSpent: !1,
      hasHeld: !1,
      isCommandHeld: !1,
      heldReresolve: null,
      isMarketplaceHeld: !1,
      asking: null,
      answerWait: null,
    },
    admissionText: null,
    isJudgedAgainTold: !1,
    hookModulesAwaitTrust: !1,
    hookRegistrationInFlight: void 0,
    hookRegistrationsInFlight: new Set(),
    hooksLoadAtStartup: void 0,
    hookRegistrationOwed: !1,
    hooksUnknownCause: void 0,
    hookRegistrationRanBlind: !1,
    pluginsWithHooks: new Set(),
    folderReadAt: new Map(),
    hookRegistrationEpoch: 0,
    hookSwapEpoch: 0,
    hooksModulesSwitchRead: void 0,
    hooksModulesSwitchFollowing: void 0,
    hooksModulesSwitchRereading: void 0,
    hooksModulesWakeBound: "ahead",
    organizationsStatusLoad: void 0,
    unlatchedAbsentManagedIds: new Set(),
    hooksLeftOutByName: [],
    hooksLeftOutByNameChanged: createSignal(),
    hookRegistrationEnded: createSignal(),
    hookRegistrationArgs: void 0,
    hookHotReloadUnsubscribe: void 0,
    hooksModulesSwitchUnwatch: void 0,
    hookHotReloadSettingsSnapshot: void 0,
    hookHotReloadTierSnapshot: void 0,
    hooksRespawns: new Set(),
    appendsInFlight: new Set(),
    loadedModules: [],
    moduleSeats: new Map(),
    notices: createStore(new Map()),
    openCalls: new Map(),
    withheldCalls: new Set(),
    withheldWatches: new Map(),
    spawnProvenance: new Map(),
    unnamedSteered: new Set(),
    registeredAgents: new Map(),
    renderVersions: createStore(new Map()),
    panes: createStore(freeze),
    placed: createSignal(),
    pluginState: createPluginStateStore(),
    toastClock: Ios(),
    hoverGroups: createStore(new Map()),
    scrollSites: new Map(),
    focusSites: new Map(),
    focusSiteDraws: createSignal(),
    mountedRasters: new Map(),
    mountedImages: new Map(),
    rasterAdmission: void 0,
    uiLogSink: null,
    pendingUiLog: [],
    armedMonitorKeys: new Set(),
    hooksPassedBy: new Map(),
    marketplaces: new Map(),
    marketplaceRefreshesInFlight: new Map(),
    marketplaceHelperMemo: new Map(),
    addDirMarketplacesMemo: void 0,
    headlessInstallPass: void 0,
    installedPluginsMigrated: !1,
    installedPluginsFile: null,
    installedPluginsEpoch: 0,
    recordSpellingsCounted: !1,
    recordSpellingFallbackReported: !1,
    installedPluginsSnapshot: null,
    optionValues: new Map(),
    flaggedPlugins: null,
    orphanedVersionGlobExclusions: null,
    recentActivity: [],
    pluginActivityFeatures: new Map(),
    autoUpdateListener: null,
    commandSourceReresolve: null,
    pendingAutoUpdateNotification: null,
    ownInUseMarkerPaths: new Set(),
    ownInUseMarkerHandles: new Map(),
    commandProducerDirsDenied: new Set(),
    commandProducerDirsScannedAt: 0,
    commandProducerDirsComparable: null,
    commandProducerDirsNeedCanonicalCandidate: !1,
    commandProducerDirsWslProviderUndeterminable: !1,
    commandProducerDirsChanged: createSignal(),
    denyJoinedPluginRoot: void 0,
    sandboxBringUp: void 0,
    inUseMarkerCleanup: void 0,
    vouchedManagedPluginIds: new Set(),
    hintedPluginIds: new Set(),
    seenHintPluginIds: new Set(),
    gitAvailable: void 0,
    operatorDeclaredMemo: void 0,
    marketplaceResolutionNoticesLogged: new Set(),
    marketplaceAdmissionVerdicts: new Map(),
    hiddenRegistryEntries: { raw: new Map(), v5: new Map() },
    releasedRegistryEntries: { raw: new Set(), v5: new Set() },
    cacheRootComparableMemo: void 0,
    provenLocalRoots: new Map(),
    wslProviderOfPluginsRootMemo: void 0,
    inlinePluginRootsComparableMemo: void 0,
  };
}
//@ chunk-yf5m6p65.js:3981-4002 placement
class n {
  registry = createPluginLoadState();
}
//@ chunk-yf5m6p65.js:4002-4025 placement
var a = new HostScoped(() => new n());
//@ chunk-yf5m6p65.js:4025-4060 placement
function r() {
  return a.of(getRootSession().host);
}
/**
 * 取插件注册表。
 */
//@ chunk-yf5m6p65.js:4060-4094 placement
function getPluginRegistry() {
  return r().registry;
}
//@ chunk-yf5m6p65.js:4094-4146 placement
function zSi(e) {
  return getPluginRegistry().registeredAgents.has(e);
}
//@ chunk-yf5m6p65.js:4146-4193 placement
function ypr() {
  return getPluginRegistry().pluginLoadCacheOnly;
}
/**
 * 清除插件命令缓存。
 */
//@ chunk-yf5m6p65.js:4193-4229 placement
function clearPluginCommands() {
  getPluginRegistry().commands = void 0;
}
//@ chunk-yf5m6p65.js:4229-4289 placement
function oto() {
  let e = getPluginRegistry();
  ((e.skills = void 0), (e.skillsV5 = void 0));
}
/**
 * 清除插件代理缓存。
 */
//@ chunk-yf5m6p65.js:4289-4323 placement
function clearPluginAgents() {
  getPluginRegistry().agents = void 0;
}
/**
 * 清除插件工作流缓存。
 */
//@ chunk-yf5m6p65.js:4363-4400 placement
function clearPluginWorkflows() {
  getPluginRegistry().workflows = void 0;
}

export {
  getPluginRegistry,
  clearPluginAgents,
  Ios,
  ypr,
  zSi,
  clearPluginCommands,
  oto,
  clearPluginWorkflows,
  createPluginStateStore,
  freeze,
};
