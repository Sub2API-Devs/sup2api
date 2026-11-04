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
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-yf5m6p65.js:333-517 placement
var EMPTY_PLUGIN_LOAD_LISTS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-yf5m6p65.js:333", () => {
  EMPTY_PLUGIN_LOAD_LISTS = Object.freeze({
    open: Object.freeze([]),
    unplaced: Object.freeze([]),
    asked: Object.freeze([]),
    shownId: null,
    focusedId: null,
    focusRequest: null,
    placements: 0,
    closing: Object.freeze([]),
  });
});
//@ chunk-yf5m6p65.js:517-812 placement
/**
 * 创建插件状态存储（值、读者、挂载、折叠等）。
 */
var createPluginStateStore = () => ({
  values: createStore(new Map()),
  readers: new Map(),
  readersOf: new Map(),
  mounted: new Map(),
  folds: {
    steady: {
      stale: new Set(),
      lastAt: Number.NEGATIVE_INFINITY,
      pending: undefined,
    },
    live: {
      stale: new Set(),
      lastAt: Number.NEGATIVE_INFINITY,
      pending: undefined,
    },
  },
  staleListeners: new Set(),
  faultRuns: new Map(),
  bumps: 0,
  versionFloor: 0,
});
//@ chunk-yf5m6p65.js:812-859 placement
/**
 * emptyPluginLoadState：插件加载状态初值。
 */
var emptyPluginLoadState = () => ({
  pending: undefined,
  pausedAt: undefined,
});
//@ chunk-yf5m6p65.js:859-3981 placement
/**
 * 创建插件加载状态（加载、缓存、注册表等）。
 */
function createPluginLoadState() {
  return {
    pluginLoad: undefined,
    pluginLoadArm: undefined,
    pluginLoadCacheOnly: undefined,
    pluginLoadCacheOnlyArm: undefined,
    pluginLoadsRunning: 0,
    pluginLoadMarks: new WeakMap(),
    commands: undefined,
    skills: undefined,
    skillsV5: undefined,
    agents: undefined,
    handedIn: undefined,
    outputStyles: undefined,
    workflows: undefined,
    hookRegistration: undefined,
    organizationAsk: {
      isHeld: false,
      isWaited: false,
      isTold: false,
      startHooksWait: undefined,
      isBoundSpent: false,
      hasHeld: false,
      isCommandHeld: false,
      heldReresolve: null,
      isMarketplaceHeld: false,
      asking: null,
      answerWait: null,
    },
    admissionText: null,
    isJudgedAgainTold: false,
    hookModulesAwaitTrust: false,
    hookRegistrationInFlight: undefined,
    hookRegistrationsInFlight: new Set(),
    hooksLoadAtStartup: undefined,
    hookRegistrationOwed: false,
    hooksUnknownCause: undefined,
    hookRegistrationRanBlind: false,
    pluginsWithHooks: new Set(),
    folderReadAt: new Map(),
    hookRegistrationEpoch: 0,
    hookSwapEpoch: 0,
    hooksModulesSwitchRead: undefined,
    hooksModulesSwitchFollowing: undefined,
    hooksModulesSwitchRereading: undefined,
    hooksModulesWakeBound: "ahead",
    organizationsStatusLoad: undefined,
    unlatchedAbsentManagedIds: new Set(),
    hooksLeftOutByName: [],
    hooksLeftOutByNameChanged: createSignal(),
    hookRegistrationEnded: createSignal(),
    hookRegistrationArgs: undefined,
    hookHotReloadUnsubscribe: undefined,
    hooksModulesSwitchUnwatch: undefined,
    hookHotReloadSettingsSnapshot: undefined,
    hookHotReloadTierSnapshot: undefined,
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
    panes: createStore(EMPTY_PLUGIN_LOAD_LISTS),
    placed: createSignal(),
    pluginState: createPluginStateStore(),
    toastClock: emptyPluginLoadState(),
    hoverGroups: createStore(new Map()),
    scrollSites: new Map(),
    focusSites: new Map(),
    focusSiteDraws: createSignal(),
    mountedRasters: new Map(),
    mountedImages: new Map(),
    rasterAdmission: undefined,
    uiLogSink: null,
    pendingUiLog: [],
    armedMonitorKeys: new Set(),
    hooksPassedBy: new Map(),
    marketplaces: new Map(),
    marketplaceRefreshesInFlight: new Map(),
    marketplaceHelperMemo: new Map(),
    addDirMarketplacesMemo: undefined,
    headlessInstallPass: undefined,
    installedPluginsMigrated: false,
    installedPluginsFile: null,
    installedPluginsEpoch: 0,
    recordSpellingsCounted: false,
    recordSpellingFallbackReported: false,
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
    commandProducerDirsNeedCanonicalCandidate: false,
    commandProducerDirsWslProviderUndeterminable: false,
    commandProducerDirsChanged: createSignal(),
    denyJoinedPluginRoot: undefined,
    sandboxBringUp: undefined,
    inUseMarkerCleanup: undefined,
    vouchedManagedPluginIds: new Set(),
    hintedPluginIds: new Set(),
    seenHintPluginIds: new Set(),
    gitAvailable: undefined,
    operatorDeclaredMemo: undefined,
    marketplaceResolutionNoticesLogged: new Set(),
    marketplaceAdmissionVerdicts: new Map(),
    hiddenRegistryEntries: {
      raw: new Map(),
      v5: new Map(),
    },
    releasedRegistryEntries: {
      raw: new Set(),
      v5: new Set(),
    },
    cacheRootComparableMemo: undefined,
    provenLocalRoots: new Map(),
    wslProviderOfPluginsRootMemo: undefined,
    inlinePluginRootsComparableMemo: undefined,
  };
}
//@ chunk-yf5m6p65.js:3981-4002 placement
class PluginRegistryHolder {
  registry = createPluginLoadState();
}
//@ chunk-yf5m6p65.js:4002-4025 placement
var pluginRegistryHolder; // deferred: uses PluginRegistryHolder of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-yf5m6p65.js:4002", () => {
  pluginRegistryHolder = new HostScoped(() => new PluginRegistryHolder());
});
//@ chunk-yf5m6p65.js:4025-4060 placement
function pluginRegistryHost() {
  return pluginRegistryHolder.of(getRootSession().host);
}
//@ chunk-yf5m6p65.js:4060-4094 placement
/**
 * 取插件注册表。
 */
function getPluginRegistry() {
  return pluginRegistryHost().registry;
}
//@ chunk-yf5m6p65.js:4094-4146 placement
/**
 * isRegisteredAgent：代理是否已登记。
 */
function isRegisteredAgent(agentType) {
  return getPluginRegistry().registeredAgents.has(agentType);
}
//@ chunk-yf5m6p65.js:4146-4193 placement
/**
 * isPluginLoadCacheOnly：插件仅从缓存加载。
 */
function isPluginLoadCacheOnly() {
  return getPluginRegistry().pluginLoadCacheOnly;
}
//@ chunk-yf5m6p65.js:4193-4229 placement
/**
 * 清除插件命令缓存。
 */
function clearPluginCommands() {
  getPluginRegistry().commands = undefined;
}
//@ chunk-yf5m6p65.js:4229-4289 placement
/**
 * clearPluginSkillsCache：清除插件技能缓存。
 */
function clearPluginSkillsCache() {
  let pluginRegistry = getPluginRegistry();
  pluginRegistry.skills = undefined;
  pluginRegistry.skillsV5 = undefined;
}
//@ chunk-yf5m6p65.js:4289-4323 placement
/**
 * 清除插件代理缓存。
 */
function clearPluginAgents() {
  getPluginRegistry().agents = undefined;
}
//@ chunk-yf5m6p65.js:4363-4400 placement
/**
 * 清除插件工作流缓存。
 */
function clearPluginWorkflows() {
  getPluginRegistry().workflows = undefined;
}
export {
  getPluginRegistry,
  clearPluginAgents,
  emptyPluginLoadState,
  isPluginLoadCacheOnly,
  isRegisteredAgent,
  clearPluginCommands,
  clearPluginSkillsCache,
  clearPluginWorkflows,
  createPluginStateStore,
  EMPTY_PLUGIN_LOAD_LISTS,
};
